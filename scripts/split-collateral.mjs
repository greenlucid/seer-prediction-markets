#!/usr/bin/env node
// Split collateral into equal outcome tokens for a Seer market.
//
// Usage:
//   node split-collateral.mjs --market 0x... --amount 100 [--chain base]
//
// Prerequisites: Max approve collateral to Router once (see TRADING.md Setup section)
// Note: --amount is in COLLATERAL token (sDAI on Gnosis/Mainnet, sUSDS on Base/Optimism).
// Use convert-collateral.mjs first to convert native/underlying tokens to collateral if needed.
//
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { parseEther } from "viem";
import { getClients } from "./lib/client.mjs";
import { SPLIT_POSITION_ABI } from "./lib/abis.mjs";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
requireArgs(args, ["market", "amount"]);

const chainName = getChainFromArgs(args);
const { walletClient, publicClient, chainConfig } = getClients(chainName);

const amount = parseEther(args.amount);
const collateralToken = chainConfig.collateral.address;

console.log(`Splitting ${args.amount} ${chainConfig.collateral.symbol} into outcome tokens for market ${args.market}...`);

const hash = await walletClient.writeContract({
  address: chainConfig.contracts.GNOSIS_ROUTER,
  abi: SPLIT_POSITION_ABI,
  functionName: "splitPosition",
  args: [collateralToken, args.market, amount],
});
console.log(`Tx: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`Done. Block ${receipt.blockNumber}. You now hold equal amounts of all outcome tokens.`);
