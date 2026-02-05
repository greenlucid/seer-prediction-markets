#!/usr/bin/env node
// Wrap/unwrap collateral tokens from their underlying assets.
// Gnosis: xDAI ↔ sDAI (xDAI is both native and underlying)
// Mainnet: DAI ↔ sDAI
// Base/Optimism: USDS ↔ sUSDS
//
// Usage:
//   node convert-collateral.mjs --direction deposit --amount 100 [--chain base]
//   node convert-collateral.mjs --direction redeem --amount 100 [--chain base]
//
// Note: You must have the underlying token (DAI/USDS) in your wallet.
// Native token (ETH) is only used for gas fees, never as input.
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { parseEther } from "viem";
import { getClients } from "./lib/client.mjs";
import { SDAI_ADAPTER_ABI, ERC20_APPROVE_ABI } from "./lib/abis.mjs";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";

// ERC4626 vault ABI
const ERC4626_ABI = [
  { name: "deposit", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }],
    outputs: [{ name: "shares", type: "uint256" }] },
  { name: "redeem", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "shares", type: "uint256" }, { name: "receiver", type: "address" }, { name: "owner", type: "address" }],
    outputs: [{ name: "assets", type: "uint256" }] },
  { name: "asset", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "symbol", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "string" }] },
];

const ERC20_SYMBOL_ABI = [
  { name: "symbol", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "string" }] },
];

// Helper: Get underlying asset address and symbol for ERC4626 vault
async function getUnderlyingInfo(vaultAddress, publicClient) {
  const underlyingAddress = await publicClient.readContract({
    address: vaultAddress,
    abi: ERC4626_ABI,
    functionName: "asset",
  });

  const underlyingSymbol = await publicClient.readContract({
    address: underlyingAddress,
    abi: ERC20_SYMBOL_ABI,
    functionName: "symbol",
  });

  return { address: underlyingAddress, symbol: underlyingSymbol };
}

const args = parseArgs();
requireArgs(args, ["direction", "amount"]);

const chainName = getChainFromArgs(args);
const { account, walletClient, publicClient, chainConfig } = getClients(chainName);
const amount = parseEther(args.amount);

if (args.direction === "deposit") {
  // Underlying → Collateral

  if (chainConfig.collateral.adapter) {
    // Gnosis path: xDAI → sDAI via adapter
    // xDAI is both the native token and the underlying
    console.log(`Converting ${args.amount} xDAI → ${chainConfig.collateral.symbol}...`);
    const hash = await walletClient.writeContract({
      address: chainConfig.collateral.adapter,
      abi: SDAI_ADAPTER_ABI,
      functionName: "depositXDAI",
      args: [account.address],
      value: amount,
    });
    console.log(`Tx: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
  } else {
    // Other chains: DAI/USDS → sDAI/sUSDS via ERC4626 vault
    const { address: underlyingAddress, symbol: underlyingSymbol } = await getUnderlyingInfo(
      chainConfig.collateral.address,
      publicClient
    );

    console.log(`Converting ${args.amount} ${underlyingSymbol} → ${chainConfig.collateral.symbol}...`);
    console.log(`Underlying token: ${underlyingAddress}`);

    // Approve underlying to vault
    console.log(`Approving ${underlyingSymbol} to vault...`);
    const approveHash = await walletClient.writeContract({
      address: underlyingAddress,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [chainConfig.collateral.address, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Deposit to vault
    console.log(`Depositing to ${chainConfig.collateral.symbol} vault...`);
    const depositHash = await walletClient.writeContract({
      address: chainConfig.collateral.address,
      abi: ERC4626_ABI,
      functionName: "deposit",
      args: [amount, account.address],
    });
    console.log(`Tx: ${depositHash}`);
    await publicClient.waitForTransactionReceipt({ hash: depositHash });
  }

  console.log(`Done. ${chainConfig.collateral.symbol} received.`);

} else if (args.direction === "redeem") {
  // Collateral → Underlying

  if (chainConfig.collateral.adapter) {
    // Gnosis path: sDAI → xDAI via adapter
    console.log(`Converting ${args.amount} ${chainConfig.collateral.symbol} → xDAI...`);

    console.log(`Approving ${chainConfig.collateral.symbol} to adapter...`);
    let hash = await walletClient.writeContract({
      address: chainConfig.collateral.address,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [chainConfig.collateral.adapter, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    hash = await walletClient.writeContract({
      address: chainConfig.collateral.adapter,
      abi: SDAI_ADAPTER_ABI,
      functionName: "redeemXDAI",
      args: [amount, account.address],
    });
    console.log(`Tx: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("Done. xDAI received.");
  } else {
    // Other chains: sDAI/sUSDS → DAI/USDS via ERC4626 vault
    const { address: underlyingAddress, symbol: underlyingSymbol } = await getUnderlyingInfo(
      chainConfig.collateral.address,
      publicClient
    );

    console.log(`Converting ${args.amount} ${chainConfig.collateral.symbol} → ${underlyingSymbol}...`);
    console.log(`Underlying token: ${underlyingAddress}`);

    // Redeem from vault
    console.log(`Redeeming ${chainConfig.collateral.symbol} from vault...`);
    const redeemHash = await walletClient.writeContract({
      address: chainConfig.collateral.address,
      abi: ERC4626_ABI,
      functionName: "redeem",
      args: [amount, account.address, account.address],
    });
    console.log(`Tx: ${redeemHash}`);
    await publicClient.waitForTransactionReceipt({ hash: redeemHash });
    console.log(`Done. ${underlyingSymbol} received.`);
  }

} else {
  console.error("--direction must be deposit or redeem");
  process.exit(1);
}
