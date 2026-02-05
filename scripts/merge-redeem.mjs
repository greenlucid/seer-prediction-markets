#!/usr/bin/env node
// Merge outcome tokens back to collateral, or redeem winning tokens after resolution.
//
// Usage (merge — you hold all outcome tokens):
//   node merge-redeem.mjs --mode merge --market 0x... --amount 50 [--chain base]
//   node merge-redeem.mjs --mode merge --market 0x... --amount max [--chain base]  # auto-calculates min(balances)
//
// Usage (redeem — market resolved, you hold winning tokens):
//   node merge-redeem.mjs --mode redeem --market 0x... --outcome-index 0 --amount 50 [--chain base]
//
// Prerequisites: Max approve outcome tokens to Router once (see TRADING.md Setup section)
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { parseEther, formatEther } from "viem";
import { getClients } from "./lib/client.mjs";
import { MERGE_POSITIONS_ABI, REDEEM_POSITIONS_ABI, MARKET_VIEW_ABI } from "./lib/abis.mjs";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
requireArgs(args, ["mode", "market"]);

const chainName = getChainFromArgs(args);
const { account, walletClient, publicClient, chainConfig } = getClients(chainName);

const collateralToken = chainConfig.collateral.address;

const ERC20_BALANCE_ABI = [{ name: "balanceOf", type: "function", stateMutability: "view",
  inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }];

if (args.mode === "merge") {
  requireArgs(args, ["amount"]);

  console.log(`Fetching market outcome tokens...`);
  const marketData = await publicClient.readContract({
    address: chainConfig.contracts.MARKET_VIEW, abi: MARKET_VIEW_ABI, functionName: "getMarket",
    args: [chainConfig.contracts.MARKET_FACTORY, args.market],
  });
  const wrappedTokens = marketData.wrappedTokens;

  let amount;
  if (args.amount === "max") {
    console.log(`Querying balances of ${wrappedTokens.length} outcome tokens...`);
    const balances = [];
    for (const token of wrappedTokens) {
      const balance = await publicClient.readContract({
        address: token, abi: ERC20_BALANCE_ABI, functionName: "balanceOf",
        args: [account.address],
      });
      balances.push(balance);
    }

    // Find minimum balance (max mergeable complete sets)
    amount = balances.reduce((min, bal) => bal < min ? bal : min, balances[0]);

    const balanceStrs = balances.map(b => formatEther(b));
    console.log(`Balances: [${balanceStrs.join(", ")}]`);
    console.log(`Min balance (max mergeable): ${formatEther(amount)}`);

    if (amount === 0n) {
      console.log("No complete sets to merge (at least one outcome has 0 balance).");
      process.exit(0);
    }
  } else {
    amount = parseEther(args.amount);
  }

  console.log(`Merging ${formatEther(amount)} complete sets back to ${chainConfig.collateral.symbol}...`);
  const hash = await walletClient.writeContract({
    address: chainConfig.contracts.GNOSIS_ROUTER, abi: MERGE_POSITIONS_ABI, functionName: "mergePositions",
    args: [collateralToken, args.market, amount],
  });
  console.log(`Tx: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("Done.");
} else if (args.mode === "redeem") {
  requireArgs(args, ["outcome-index", "amount"]);
  const idx = BigInt(args["outcome-index"]);
  const amount = parseEther(args.amount);
  console.log(`Redeeming ${args.amount} of outcome ${idx} for ${chainConfig.collateral.symbol}...`);
  const hash = await walletClient.writeContract({
    address: chainConfig.contracts.GNOSIS_ROUTER, abi: REDEEM_POSITIONS_ABI, functionName: "redeemPositions",
    args: [collateralToken, args.market, [idx], [amount]],
  });
  console.log(`Tx: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("Done.");
} else {
  console.error("--mode must be merge or redeem");
  process.exit(1);
}
