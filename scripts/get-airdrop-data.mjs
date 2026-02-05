#!/usr/bin/env node
// Check your SEER airdrop allocation.
// No PRIVATE_KEY needed if --address is provided.
//
// Usage:
//   node get-airdrop-data.mjs                    # uses PRIVATE_KEY
//   node get-airdrop-data.mjs --address 0x...    # check any address
//   node get-airdrop-data.mjs --raw              # full JSON output

import { parseArgs } from "./lib/args.mjs";
import { privateKeyToAccount } from "viem/accounts";

const SEER_API = "https://app.seer.pm/.netlify/functions";

const args = parseArgs();

let address = args.address;
if (!address) {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("Provide --address or set PRIVATE_KEY env var");
    process.exit(1);
  }
  address = privateKeyToAccount(pk).address;
}

const res = await fetch(`${SEER_API}/get-airdrop-data-by-user`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ address }),
});

if (!res.ok) {
  console.error(`API error: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (text) console.error(text);
  process.exit(1);
}

const data = await res.json();

if ("raw" in args) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

const fmt = (n) => n == null ? "N/A" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

console.log(`SEER Airdrop Allocation for ${address}\n`);
console.log(`  Total allocation:        ${fmt(data.totalAllocation)} SEER`);
console.log(`  This week:               ${fmt(data.currentWeekAllocation)} SEER`);
console.log(`  Monthly estimate:        ${fmt(data.monthlyEstimate)} SEER`);
console.log();
console.log(`  Breakdown:`);
console.log(`    Outcome token holding: ${fmt(data.outcomeTokenHoldingAllocation)} SEER`);
console.log(`    PoH bonus:             ${fmt(data.pohUserAllocation)} SEER`);
console.log(`    Monthly PoH estimate:  ${fmt(data.monthlyEstimatePoH)} SEER`);
console.log();
console.log(`  SER LP balances:`);
console.log(`    Mainnet:               ${fmt(data.serLppMainnet)}`);
console.log(`    Gnosis:                ${fmt(data.serLppGnosis)}`);
