#!/usr/bin/env node
// Add concentrated liquidity for an outcome token / collateral pair on DEX.
// Supports SwaprV3 (Algebra) on Gnosis and Uniswap V3 on other chains.
//
// Usage:
//   node add-liquidity.mjs --outcome-token 0x... --budget-native 0.5 --prob-low 0.2 --prob-high 0.8
//   node add-liquidity.mjs --outcome-token 0x... --budget-collateral 0.4 --prob-low 0.2 --prob-high 0.8
//
// --budget-native is total native token value for this pool, OR --budget-collateral is total collateral value (recommended).
// Script computes exact outcome token vs collateral amounts.
// --dry-run: print computed amounts and exit without transacting.
// Optional: --init-prob (default: midpoint of range), --tick-spacing 60, --chain <name>
//
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { parseEther, formatEther } from "viem";
import { getClients } from "./lib/client.mjs";
import { ERC20_APPROVE_ABI, ALGEBRA_MINT_POSITION_ABI, UNISWAP_V3_MINT_POSITION_ABI, ERC4626_CONVERT_ABI } from "./lib/abis.mjs";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";
import { addLpPosition } from "./lib/lp-store.mjs";

const args = parseArgs();
requireArgs(args, ["outcome-token", "prob-low", "prob-high"]);

const chainName = getChainFromArgs(args);

if (!args["budget-native"] && !args["budget-collateral"]) {
  console.error("Error: Must provide either --budget-native (native token value) or --budget-collateral (collateral value)");
  process.exit(1);
}
if (args["budget-native"] && args["budget-collateral"]) {
  console.error("Error: Cannot provide both --budget-native and --budget-collateral");
  process.exit(1);
}

const { getPublicClient } = await import("./lib/client.mjs");
const pubClient = getPublicClient(chainName);
const chainConfig = (await import("./config/chains.mjs")).getChainConfig(chainName);

const outcomeToken = args["outcome-token"];
const probLow = parseFloat(args["prob-low"]);
const probHigh = parseFloat(args["prob-high"]);
const initProb = parseFloat(args["init-prob"] || String((probLow + probHigh) / 2));
const tickSpacing = parseInt(args["tick-spacing"] || "60");

const collateralToken = chainConfig.collateral.address;
const outcomeIsToken0 = outcomeToken.toLowerCase() < collateralToken.toLowerCase();
const [token0, token1] = outcomeIsToken0 ? [outcomeToken, collateralToken] : [collateralToken, outcomeToken];

// Query collateral exchange rate (how much native token per 1 collateral share)
// Collateral must be ERC4626 compliant
let collateralRate;
try {
  const collateralToNative = await pubClient.readContract({
    address: collateralToken,
    abi: ERC4626_CONVERT_ABI,
    functionName: "convertToAssets",
    args: [parseEther("1")],
  });
  collateralRate = parseFloat(formatEther(collateralToNative));
} catch (err) {
  console.error(`Error: Failed to query collateral exchange rate. Collateral token must implement ERC4626 convertToAssets.`);
  console.error(`Collateral address: ${collateralToken}`);
  console.error(`Details: ${err.message}`);
  process.exit(1);
}

// Calculate budget in native token terms
const nativeName = chainConfig.viemChain.nativeCurrency?.symbol || "native";
let budget;
if (args["budget-native"]) {
  budget = parseFloat(args["budget-native"]);
  console.log(`Budget: ${budget} ${nativeName} (using --budget-native)`);
} else {
  const budgetCollateral = parseFloat(args["budget-collateral"]);
  budget = budgetCollateral * collateralRate;
  console.log(`Budget: ${budgetCollateral} ${chainConfig.collateral.symbol} = ${budget.toFixed(6)} ${nativeName} equivalent (using --budget-collateral, rate ${collateralRate.toFixed(4)})`);
}

const nearestTick = (tick, spacing) => Math.round(tick / spacing) * spacing;

let tickLower, tickUpper;
if (outcomeIsToken0) {
  tickLower = nearestTick(Math.log(probLow) / Math.log(1.0001), tickSpacing);
  tickUpper = nearestTick(Math.log(probHigh) / Math.log(1.0001), tickSpacing);
} else {
  tickLower = nearestTick(Math.log(1 / probHigh) / Math.log(1.0001), tickSpacing);
  tickUpper = nearestTick(Math.log(1 / probLow) / Math.log(1.0001), tickSpacing);
}

// Compute exact token amounts from concentrated liquidity math
const sqrtP = Math.sqrt(outcomeIsToken0 ? initProb : 1 / initProb);
const sqrtPa = Math.sqrt(1.0001 ** tickLower);
const sqrtPb = Math.sqrt(1.0001 ** tickUpper);

// Per unit of liquidity L:
// amount0 = L * (sqrtPb - sqrtP) / (sqrtP * sqrtPb)
// amount1 = L * (sqrtP - sqrtPa)
const a0PerL = (sqrtPb - sqrtP) / (sqrtP * sqrtPb);
const a1PerL = sqrtP - sqrtPa;

// token0/token1 → outcome/collateral mapping
let outcomePerL, collateralPerL;
if (outcomeIsToken0) {
  outcomePerL = a0PerL;
  collateralPerL = a1PerL;
} else {
  collateralPerL = a0PerL;
  outcomePerL = a1PerL;
}

// budget (in native) = outcomeNeeded + (collateralNeeded * collateralRate)
// outcomeNeeded = L * outcomePerL, collateralNeeded = L * collateralPerL
// L = budget / (outcomePerL + collateralPerL * collateralRate)
const L = budget / (outcomePerL + collateralPerL * collateralRate);
const outcomeNeeded = L * outcomePerL;
const collateralNeeded = L * collateralPerL;

const amount0 = outcomeIsToken0 ? parseEther(outcomeNeeded.toFixed(18)) : parseEther(collateralNeeded.toFixed(18));
const amount1 = outcomeIsToken0 ? parseEther(collateralNeeded.toFixed(18)) : parseEther(outcomeNeeded.toFixed(18));

console.log(`${chainConfig.collateral.symbol} rate: ${collateralRate.toFixed(4)} ${nativeName} per ${chainConfig.collateral.symbol}`);
console.log(`Budget: ${budget} ${nativeName} → need ${outcomeNeeded.toFixed(6)} outcome tokens + ${collateralNeeded.toFixed(6)} ${chainConfig.collateral.symbol} (worth ${(collateralNeeded * collateralRate).toFixed(6)} ${nativeName})`);

if (args["dry-run"] !== undefined) {
  process.exit(0);
}

const sqrtPriceX96 = BigInt(Math.floor(sqrtP * 2 ** 96));

const { account, walletClient, publicClient } = getClients(chainName);

console.log(`Creating/initializing pool if needed...`);
let hash;
let poolAddress;

if (chainConfig.dex.type === "swaprv3") {
  // Algebra (SwaprV3) - no fee parameter
  const CREATE_AND_INIT_ABI = [{ name: "createAndInitializePoolIfNecessary", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "token0", type: "address" }, { name: "token1", type: "address" },
      { name: "sqrtPriceX96", type: "uint160" }],
    outputs: [{ name: "pool", type: "address" }] }];

  // Simulate to get pool address
  const { result } = await publicClient.simulateContract({
    address: chainConfig.dex.nonfungiblePositionManager,
    abi: CREATE_AND_INIT_ABI,
    functionName: "createAndInitializePoolIfNecessary",
    args: [token0, token1, sqrtPriceX96],
    account: account.address,
  });
  poolAddress = result;

  hash = await walletClient.writeContract({
    address: chainConfig.dex.nonfungiblePositionManager, abi: CREATE_AND_INIT_ABI,
    functionName: "createAndInitializePoolIfNecessary",
    args: [token0, token1, sqrtPriceX96],
  });
} else if (chainConfig.dex.type === "uniswapv3") {
  // Uniswap V3 - requires fee parameter
  const CREATE_AND_INIT_ABI = [{ name: "createAndInitializePoolIfNecessary", type: "function", stateMutability: "payable",
    inputs: [{ name: "token0", type: "address" }, { name: "token1", type: "address" },
      { name: "fee", type: "uint24" }, { name: "sqrtPriceX96", type: "uint160" }],
    outputs: [{ name: "pool", type: "address" }] }];

  // Simulate to get pool address
  const { result } = await publicClient.simulateContract({
    address: chainConfig.dex.nonfungiblePositionManager,
    abi: CREATE_AND_INIT_ABI,
    functionName: "createAndInitializePoolIfNecessary",
    args: [token0, token1, chainConfig.dex.fee, sqrtPriceX96],
    account: account.address,
  });
  poolAddress = result;

  hash = await walletClient.writeContract({
    address: chainConfig.dex.nonfungiblePositionManager, abi: CREATE_AND_INIT_ABI,
    functionName: "createAndInitializePoolIfNecessary",
    args: [token0, token1, chainConfig.dex.fee, sqrtPriceX96],
  });
}

await publicClient.waitForTransactionReceipt({ hash });
console.log(`Pool: ${poolAddress}`);

console.log(`Approving tokens to position manager...`);
hash = await walletClient.writeContract({ address: outcomeToken, abi: ERC20_APPROVE_ABI, functionName: "approve",
  args: [chainConfig.dex.nonfungiblePositionManager, amount0 > amount1 ? amount0 : amount1] });
await publicClient.waitForTransactionReceipt({ hash });

hash = await walletClient.writeContract({ address: collateralToken, abi: ERC20_APPROVE_ABI, functionName: "approve",
  args: [chainConfig.dex.nonfungiblePositionManager, amount0 > amount1 ? amount0 : amount1] });
await publicClient.waitForTransactionReceipt({ hash });

console.log(`Minting LP position: token0=${token0}, token1=${token1}, ticks=[${tickLower}, ${tickUpper}]...`);

let mintParams, mintAbi;
if (chainConfig.dex.type === "swaprv3") {
  // Algebra - no fee parameter
  mintParams = {
    token0, token1, tickLower, tickUpper,
    amount0Desired: amount0, amount1Desired: amount1,
    amount0Min: 0n, amount1Min: 0n,
    recipient: account.address,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
  };
  mintAbi = ALGEBRA_MINT_POSITION_ABI;
} else if (chainConfig.dex.type === "uniswapv3") {
  // Uniswap V3 - includes fee parameter
  mintParams = {
    token0, token1,
    fee: chainConfig.dex.fee,
    tickLower, tickUpper,
    amount0Desired: amount0, amount1Desired: amount1,
    amount0Min: 0n, amount1Min: 0n,
    recipient: account.address,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
  };
  mintAbi = UNISWAP_V3_MINT_POSITION_ABI;
}

// Simulate first to get expected return values
const { result } = await publicClient.simulateContract({
  address: chainConfig.dex.nonfungiblePositionManager,
  abi: mintAbi,
  functionName: "mint",
  args: [mintParams],
  account: account.address,
});

const [tokenId, , actualAmount0, actualAmount1] = result;

hash = await walletClient.writeContract({
  address: chainConfig.dex.nonfungiblePositionManager,
  abi: mintAbi,
  functionName: "mint",
  args: [mintParams],
  gas: 1_000_000n,
});
console.log(`Tx: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });

console.log(`Position token ID: ${tokenId}`);
const [label0, label1] = outcomeIsToken0 ? ["outcome token", chainConfig.collateral.symbol] : [chainConfig.collateral.symbol, "outcome token"];
console.log(`Actual ${label0} used: ${formatEther(actualAmount0)}`);
console.log(`Actual ${label1} used: ${formatEther(actualAmount1)}`);
console.log(`LP position minted. Block ${receipt.blockNumber}.`);

// Persist LP position to local tracker
try {
  let marketName = null;
  let outcomeName = null;
  const marketAddr = args.market || null;

  if (marketAddr) {
    try {
      const SEER_API = "https://app.seer.pm/.netlify/functions";
      const chainId = String(chainConfig.viemChain.id);
      const apiRes = await fetch(`${SEER_API}/markets-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketIds: [marketAddr.toLowerCase()], chainsList: [chainId], limit: 1 }),
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const m = apiData.markets?.[0];
        if (m) {
          marketName = m.marketName || null;
          const idx = m.wrappedTokens?.findIndex(
            (t) => t.toLowerCase() === outcomeToken.toLowerCase()
          );
          if (idx >= 0 && m.outcomes?.[idx]) {
            outcomeName = m.outcomes[idx];
          }
        }
      }
    } catch (apiErr) {
      console.error(`Warning: Could not look up market details: ${apiErr.message}`);
    }
  } else {
    console.log(`Tip: Pass --market 0x... for full position tracking (market name + outcome name).`);
  }

  const entry = {
    tokenId: String(tokenId),
    chain: chainName || "gnosis",
    dexType: chainConfig.dex.type,
    poolAddress,
    token0,
    token1,
    probLow,
    probHigh,
    market: marketAddr,
    marketName,
    outcomeName,
    createdAt: new Date().toISOString(),
    withdrawnAt: null,
  };
  addLpPosition(entry);
  console.log(`Position saved to LP tracker.`);
} catch (err) {
  console.error(`Warning: Failed to save position to tracker: ${err.message}`);
}
