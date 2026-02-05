#!/usr/bin/env node
// Search for markets on Seer using the public API.
// No PRIVATE_KEY needed (read-only), except --mine.
//
// Usage:
//   node search-markets.mjs --query "bitcoin"
//   node search-markets.mjs --query "election" --status open
//   node search-markets.mjs --query "trump" --chain gnosis --limit 5
//   node search-markets.mjs --status open --sort liquidity --order desc --limit 10
//   node search-markets.mjs --category politics --status open
//   node search-markets.mjs --creator 0x...
//
// Flags:
//   --query <text>      Search by market name (case-insensitive substring)
//   --chain <name>      Filter by chain: gnosis (default all), base, optimism, mainnet
//   --status <status>   Filter by status: open, closed, not_open, answer_not_final, in_dispute, pending_execution
//   --category <name>   Filter by category (e.g. politics, sports, crypto, misc)
//   --creator <addr>    Filter by creator address
//   --mine              Show markets created by your wallet (uses PRIVATE_KEY env var)
//   --verified          Only show verified markets
//   --rewards           Only show markets with active SEER farming incentives
//   --sort <field>      Sort by: liquidity (default), date, opening
//   --order <dir>       Sort direction: desc (default), asc
//   --limit <n>         Max results (default 10)
//   --page <n>          Page number (default 1)
//   --id <addr>         Look up a specific market by address
//   --raw               Output full JSON response instead of summary

import { parseArgs } from "./lib/args.mjs";
import { privateKeyToAccount } from "viem/accounts";

const SEER_API = "https://app.seer.pm/.netlify/functions";

const CHAIN_IDS = {
  gnosis: "100",
  base: "8453",
  optimism: "10",
  mainnet: "1",
};

const SORT_MAP = {
  liquidity: "liquidityUSD",
  date: "creationDate",
  opening: "openingTs",
};

const args = parseArgs();

// Build request body
const body = {};

if (args.query) {
  body.marketName = args.query;
}

if (args.chain) {
  const chainId = CHAIN_IDS[args.chain];
  if (!chainId) {
    console.error(`Unknown chain: ${args.chain}. Valid: ${Object.keys(CHAIN_IDS).join(", ")}`);
    process.exit(1);
  }
  body.chainsList = [chainId];
}

if (args.status) {
  body.marketStatusList = [args.status];
}

if (args.category) {
  body.categoryList = [args.category];
}

if ("mine" in args) {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("--mine requires PRIVATE_KEY env var");
    process.exit(1);
  }
  body.creator = privateKeyToAccount(pk).address;
} else if (args.creator) {
  body.creator = args.creator;
}

if ("verified" in args) {
  body.verificationStatusList = ["verified"];
}

if ("rewards" in args) {
  body.showMarketsWithRewards = true;
}

if (args.sort) {
  body.orderBy = SORT_MAP[args.sort] || args.sort;
}

body.orderDirection = args.order || "desc";
body.limit = parseInt(args.limit || "10", 10);
body.page = parseInt(args.page || "1", 10);

if (args.id) {
  body.marketName = ""; // clear search when looking up by ID
  body.marketIds = [args.id.toLowerCase()];
  body.limit = 1;
}

// Call the API
const res = await fetch(`${SEER_API}/markets-search`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`API error: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (text) console.error(text);
  process.exit(1);
}

const data = await res.json();

if (args.raw) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

// Pretty print results
const chainName = (chainId) => {
  for (const [name, id] of Object.entries(CHAIN_IDS)) {
    if (String(chainId) === id) return name;
  }
  return `chain-${chainId}`;
};

const pct = (n) => n == null || isNaN(n) ? "N/A" : `${n.toFixed(1)}%`;

console.log(`Found ${data.count} market(s) (showing ${data.markets.length}, page ${body.page}/${data.pages || 1})\n`);

for (const m of data.markets) {
  const chain = chainName(m.chainId);
  const outcomes = m.outcomes?.filter(o => o !== "Invalid") || [];
  const odds = m.odds?.slice(0, outcomes.length) || [];
  const oddsStr = outcomes.map((o, i) => `${o}: ${pct(odds[i])}`).join("  |  ");

  console.log(`  ${m.marketName}`);
  console.log(`  ${chain} | ${m.id}`);
  console.log(`  https://app.seer.pm/markets/${CHAIN_IDS[chain] || m.chainId}/${m.id}`);
  console.log(`  Odds: ${oddsStr}`);
  const liqLine = `  Liquidity: $${(m.liquidityUSD || 0).toFixed(2)} | Status: ${m.payoutReported ? "resolved" : m.openingTs > Date.now() / 1000 ? "not_open" : "open"}`;
  console.log(m.incentive > 0 ? `${liqLine} | Rewards: ${m.incentive.toFixed(1)} SEER/day` : liqLine);
  if (m.verification?.status) console.log(`  Verification: ${m.verification.status}`);
  if (m.openingTs) console.log(`  Opens: ${new Date(m.openingTs * 1000).toISOString().split("T")[0]}`);
  console.log();
}
