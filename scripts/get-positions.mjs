#!/usr/bin/env node
// Show your token positions across Seer markets via the API.
//
// Usage:
//   node get-positions.mjs                   # all chains
//   node get-positions.mjs --chain gnosis    # one chain
//   node get-positions.mjs --raw             # full JSON
//
// Env: PRIVATE_KEY (required)

import { parseArgs } from "./lib/args.mjs";
import { privateKeyToAccount } from "viem/accounts";

const SEER_API = "https://app.seer.pm/.netlify/functions";

const CHAIN_IDS = {
  gnosis: "100",
  base: "8453",
  optimism: "10",
  mainnet: "1",
};

const args = parseArgs();

const pk = process.env.PRIVATE_KEY;
if (!pk) {
  console.error("PRIVATE_KEY env var required");
  process.exit(1);
}
const account = privateKeyToAccount(pk).address;
const chains = args.chain ? [args.chain] : Object.keys(CHAIN_IDS);

let allPositions = [];
for (const chain of chains) {
  const chainId = CHAIN_IDS[chain];
  if (!chainId) {
    console.error(`Unknown chain: ${chain}. Valid: ${Object.keys(CHAIN_IDS).join(", ")}`);
    continue;
  }
  const res = await fetch(`${SEER_API}/get-portfolio?account=${account}&chainId=${chainId}`);
  if (!res.ok) {
    console.error(`Error fetching ${chain} portfolio: ${res.status}`);
    continue;
  }
  const positions = await res.json();
  allPositions.push(...positions.map(p => ({ ...p, chain })));
}

if (args.raw) {
  console.log(JSON.stringify(allPositions, null, 2));
  process.exit(0);
}

// Group by market
const byMarket = {};
for (const p of allPositions) {
  if (p.isInvalidOutcome) continue;
  const key = p.marketId;
  if (!byMarket[key]) byMarket[key] = { ...p, holdings: [] };
  byMarket[key].holdings.push({ outcome: p.outcome, balance: p.tokenBalance, tokenId: p.tokenId });
}

const markets = Object.values(byMarket);
console.log(`${account}\n${markets.length} market(s) with positions\n`);

for (const m of markets) {
  const holdingsStr = m.holdings.map(h => `${h.outcome}: ${h.balance.toFixed(4)}`).join("  |  ");
  console.log(`  ${m.marketName}`);
  console.log(`  ${m.chain} | ${m.marketId}`);
  console.log(`  Status: ${m.marketStatus} | Holdings: ${holdingsStr}`);
  if (m.redeemedPrice > 0) console.log(`  Redeemable at: ${m.redeemedPrice}`);
  console.log();
}
