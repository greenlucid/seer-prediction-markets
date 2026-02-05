#!/usr/bin/env node
// Check status of all markets and LP positions in your portfolio.
//
// Usage:
//   node check-portfolio.mjs [--chain base]                    # reads portfolio.json in current dir
//   node check-portfolio.mjs --file path/to.json [--chain base]   # reads from custom path
//
// Portfolio format:
// {
//   "markets": [
//     {
//       "address": "0x...", "question": "...", "positionIds": [123, 124],
//       "myOdds": {...}, "ranges": {...}, "reviewTriggers": [...], "nextReview": "2026-02-01"
//     }
//   ]
// }
//
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { formatEther } from "viem";
import { readFileSync } from "fs";
import { getClients } from "./lib/client.mjs";
import { MARKET_VIEW_ABI, POSITION_MANAGER_ABI } from "./lib/abis.mjs";
import { parseArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
const portfolioPath = args.file || "portfolio.json";

let portfolio;
try {
  portfolio = JSON.parse(readFileSync(portfolioPath, "utf-8"));
} catch (err) {
  console.error(`Could not read ${portfolioPath}: ${err.message}`);
  process.exit(1);
}

if (!portfolio.markets || !Array.isArray(portfolio.markets)) {
  console.error("Portfolio must have a 'markets' array");
  process.exit(1);
}

const chainName = getChainFromArgs(args);
const { account, publicClient, chainConfig } = getClients(chainName);

const ERC20_BALANCE_ABI = [{ name: "balanceOf", type: "function", stateMutability: "view",
  inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }];

// Read collateral balance once
const collateralBalance = await publicClient.readContract({
  address: chainConfig.collateral.address,
  abi: ERC20_BALANCE_ABI,
  functionName: "balanceOf",
  args: [account.address],
});

console.log(`\n=== Portfolio Status ===`);
console.log(`Wallet: ${account.address}`);
console.log(`${chainConfig.collateral.symbol} held: ${formatEther(collateralBalance)}\n`);

for (const market of portfolio.markets) {
  console.log(`---`);
  console.log(`Question: ${market.question}`);
  console.log(`Market: ${market.address}`);

  // Read market data
  const info = await publicClient.readContract({
    address: chainConfig.contracts.MARKET_VIEW,
    abi: MARKET_VIEW_ABI,
    functionName: "getMarket",
    args: [chainConfig.contracts.MARKET_FACTORY, market.address],
  });

  const now = Math.floor(Date.now() / 1000);
  const question = info.questions?.[0];
  const openingTs = question?.opening_ts || 0;
  const finalizeTs = question?.finalize_ts || 0;

  let status = "active";
  if (info.payoutReported) status = "resolved";
  else if (finalizeTs > 0 && finalizeTs <= now) status = "finalized, awaiting resolve";
  else if (openingTs > 0 && openingTs > now) status = "not yet open";

  console.log(`Status: ${status}`);
  if (openingTs > 0) console.log(`Opens: ${new Date(openingTs * 1000).toISOString().split("T")[0]}`);
  if (info.payoutReported) {
    console.log(`Payout: ${info.payoutNumerators.map((n, i) => `${info.outcomes[i]}=${n.toString()}`).join(", ")}`);
  }

  // Check outcome token balances
  console.log(`Outcome tokens held:`);
  for (let i = 0; i < info.wrappedTokens.length; i++) {
    const balance = await publicClient.readContract({
      address: info.wrappedTokens[i], abi: ERC20_BALANCE_ABI, functionName: "balanceOf", args: [account.address],
    });
    if (balance > 0n) {
      console.log(`  ${info.outcomes[i]}: ${formatEther(balance)}`);
    }
  }

  // Check LP positions
  if (market.positionIds && market.positionIds.length > 0) {
    console.log(`LP positions:`);
    for (const tokenId of market.positionIds) {
      try {
        const pos = await publicClient.readContract({
          address: chainConfig.dex.nonfungiblePositionManager,
          abi: POSITION_MANAGER_ABI,
          functionName: "positions",
          args: [BigInt(tokenId)],
        });
        const [, , token0, token1, tickLower, tickUpper, liquidity] = pos;
        if (liquidity > 0n) {
          // Determine which token is which (outcome vs sDAI)
          const token0IsOutcome = info.wrappedTokens.some(t => t.toLowerCase() === token0.toLowerCase());
          const outcomeToken = token0IsOutcome ? token0 : token1;
          const outcomeName = info.outcomes[info.wrappedTokens.findIndex(t => t.toLowerCase() === outcomeToken.toLowerCase())];
          console.log(`  #${tokenId}: ${outcomeName}/${chainConfig.collateral.symbol}, liquidity=${liquidity.toString()}, ticks=[${tickLower},${tickUpper}]`);
        } else {
          console.log(`  #${tokenId}: (empty, liquidity=0)`);
        }
      } catch (err) {
        console.log(`  #${tokenId}: (error reading position: ${err.message})`);
      }
    }
  }

  // Show next review
  if (market.nextReview) {
    const nextReview = new Date(market.nextReview);
    const isPast = nextReview <= new Date();
    console.log(`Next review: ${market.nextReview}${isPast ? " (OVERDUE)" : ""}`);
  }
  if (market.reviewTriggers && market.reviewTriggers.length > 0) {
    console.log(`Review triggers: ${market.reviewTriggers.join(", ")}`);
  }

  console.log();
}

console.log(`=== End of Portfolio ===\n`);
