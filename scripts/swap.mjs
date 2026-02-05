#!/usr/bin/env node
// Buy or sell outcome tokens via DEX (SwaprV3/Algebra on Gnosis, Uniswap V3 on other chains).
// Hardcoded 1% slippage tolerance.
//
// Usage (buy outcome tokens with collateral):
//   node swap.mjs --mode buy --outcome-token 0x... --amount-in 10 [--chain base]
//
// Usage (sell outcome tokens for collateral):
//   node swap.mjs --mode sell --outcome-token 0x... --amount-in 5 [--chain base]
//
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { parseEther, formatEther } from "viem";
import { getClients } from "./lib/client.mjs";
import { ERC20_APPROVE_ABI, SWAPR_V3_SWAP_ABI, POOL_STATE_ABI, UNISWAP_V3_SWAP_ABI, UNISWAP_V3_POOL_STATE_ABI, UNISWAP_V3_FACTORY_ABI } from "./lib/abis.mjs";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
requireArgs(args, ["mode", "outcome-token", "amount-in"]);

const chainName = getChainFromArgs(args);
const { account, walletClient, publicClient, chainConfig } = getClients(chainName);

const outcomeToken = args["outcome-token"];
const amountIn = parseEther(args["amount-in"]);
// Hardcode 1% slippage tolerance
const minAmountOut = (amountIn * 99n) / 100n;

// Determine token ordering (same pattern as add-liquidity.mjs)
const outcomeIsToken0 = outcomeToken.toLowerCase() < chainConfig.collateral.address.toLowerCase();
const [token0, token1] = outcomeIsToken0 ? [outcomeToken, chainConfig.collateral.address] : [chainConfig.collateral.address, outcomeToken];

// Determine tokenIn and tokenOut based on mode
let tokenIn, tokenOut, approveToken;
if (args.mode === "buy") {
  // Buy outcome tokens: collateral → outcome token
  tokenIn = chainConfig.collateral.address;
  tokenOut = outcomeToken;
  approveToken = chainConfig.collateral.address;
  console.log(`Buying ${args["outcome-token"]} with ${args["amount-in"]} ${chainConfig.collateral.symbol}...`);
} else if (args.mode === "sell") {
  // Sell outcome tokens: outcome token → collateral
  tokenIn = outcomeToken;
  tokenOut = chainConfig.collateral.address;
  approveToken = outcomeToken;
  console.log(`Selling ${args["amount-in"]} ${args["outcome-token"]} for ${chainConfig.collateral.symbol}...`);
} else {
  console.error("--mode must be buy or sell");
  process.exit(1);
}

// Get pool address based on DEX type
let poolAddress;
let currentTick, currentPrice;

if (chainConfig.dex.type === "swaprv3") {
  // Algebra-based (SwaprV3) - use computeAddress
  const COMPUTE_ADDRESS_ABI = [
    { name: "computeAddress", type: "function", stateMutability: "view",
      inputs: [{ name: "token0", type: "address" }, { name: "token1", type: "address" }],
      outputs: [{ name: "pool", type: "address" }] }
  ];

  try {
    poolAddress = await publicClient.readContract({
      address: chainConfig.dex.algebraFactory,
      abi: COMPUTE_ADDRESS_ABI,
      functionName: "computeAddress",
      args: [token0, token1]
    });
  } catch (err) {
    console.error(`Failed to compute pool address for ${outcomeToken} / ${chainConfig.collateral.symbol} pair.`);
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  if (!poolAddress || poolAddress === "0x0000000000000000000000000000000000000000") {
    console.error(`No pool exists for ${outcomeToken} / ${chainConfig.collateral.symbol} pair. Create liquidity first.`);
    process.exit(1);
  }

  console.log(`Pool address: ${poolAddress}`);

  // Get current pool state (Algebra globalState)
  const globalState = await publicClient.readContract({
    address: poolAddress,
    abi: POOL_STATE_ABI,
    functionName: "globalState"
  });
  [currentPrice, currentTick] = globalState;

} else if (chainConfig.dex.type === "uniswapv3") {
  // Uniswap V3 - use getPool with fee tier from chain config
  const fee = chainConfig.dex.fee;

  try {
    poolAddress = await publicClient.readContract({
      address: chainConfig.dex.factory,
      abi: UNISWAP_V3_FACTORY_ABI,
      functionName: "getPool",
      args: [token0, token1, fee]
    });
  } catch (err) {
    console.error(`Failed to get pool address for ${outcomeToken} / ${chainConfig.collateral.symbol} pair.`);
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  if (!poolAddress || poolAddress === "0x0000000000000000000000000000000000000000") {
    console.error(`No pool exists for ${outcomeToken} / ${chainConfig.collateral.symbol} pair (fee ${fee}). Create liquidity first.`);
    process.exit(1);
  }

  console.log(`Pool address: ${poolAddress} (fee tier: ${fee})`);

  // Get current pool state (Uniswap V3 slot0)
  const slot0 = await publicClient.readContract({
    address: poolAddress,
    abi: UNISWAP_V3_POOL_STATE_ABI,
    functionName: "slot0"
  });
  [currentPrice, currentTick] = slot0;

} else {
  console.error(`Unsupported DEX type: ${chainConfig.dex.type}`);
  process.exit(1);
}

console.log(`Current tick: ${currentTick}, price: ${currentPrice}`);

// Approve tokenIn to router
console.log(`Approving ${formatEther(amountIn)} ${approveToken === chainConfig.collateral.address ? chainConfig.collateral.symbol : "outcome tokens"} to router...`);
const approveHash = await walletClient.writeContract({
  address: approveToken,
  abi: ERC20_APPROVE_ABI,
  functionName: "approve",
  args: [chainConfig.dex.router, amountIn]
});
await publicClient.waitForTransactionReceipt({ hash: approveHash });

// Execute swap based on DEX type
console.log(`Swapping...`);
let swapHash;

if (chainConfig.dex.type === "swaprv3") {
  // Algebra-based swap (no fee parameter)
  const swapParams = {
    tokenIn,
    tokenOut,
    recipient: account.address,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
    amountIn,
    amountOutMinimum: minAmountOut,
    sqrtPriceLimitX96: 0n
  };

  swapHash = await walletClient.writeContract({
    address: chainConfig.dex.router,
    abi: SWAPR_V3_SWAP_ABI,
    functionName: "exactInputSingle",
    args: [swapParams]
  });

} else if (chainConfig.dex.type === "uniswapv3") {
  // Uniswap V3 swap (includes fee parameter)
  const swapParams = {
    tokenIn,
    tokenOut,
    fee: chainConfig.dex.fee,
    recipient: account.address,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
    amountIn,
    amountOutMinimum: minAmountOut,
    sqrtPriceLimitX96: 0n
  };

  swapHash = await walletClient.writeContract({
    address: chainConfig.dex.router,
    abi: UNISWAP_V3_SWAP_ABI,
    functionName: "exactInputSingle",
    args: [swapParams]
  });
}

console.log(`Tx: ${swapHash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });

// Parse logs to get actual amountOut (optional: parse Transfer events)
console.log(`Swap completed. Block ${receipt.blockNumber}.`);
console.log(`Minimum received: ${formatEther(minAmountOut)} ${tokenOut === chainConfig.collateral.address ? chainConfig.collateral.symbol : "outcome tokens"}`);

// Calculate execution price
const executionPrice = parseFloat(formatEther(amountIn)) / parseFloat(formatEther(minAmountOut));
console.log(`Execution price: ${executionPrice.toFixed(6)} (${tokenIn === chainConfig.collateral.address ? chainConfig.collateral.symbol : "outcome"} per ${tokenOut === chainConfig.collateral.address ? chainConfig.collateral.symbol : "outcome"})`);
