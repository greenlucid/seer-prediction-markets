#!/usr/bin/env node
// Show tracked LP positions from the local tracker file.
//
// Usage:
//   node get-lp-positions.mjs                  # active positions only
//   node get-lp-positions.mjs --all            # include withdrawn
//   node get-lp-positions.mjs --chain gnosis   # filter by chain
//   node get-lp-positions.mjs --raw            # full JSON
//   node get-lp-positions.mjs --live           # query on-chain for current liquidity
//
// Reads: ~/.openclaw/workspace/memory/lp-positions.json
// No PRIVATE_KEY needed (read-only). --live needs RPC access only.

import { parseArgs } from "./lib/args.mjs";
import { readLpPositions, getLpFilePath } from "./lib/lp-store.mjs";

const args = parseArgs();
const data = readLpPositions();

let positions = data.positions || [];

// Filter by chain
if (args.chain) {
  positions = positions.filter((p) => p.chain === args.chain);
}

// Filter out withdrawn unless --all
if (args.all === undefined) {
  positions = positions.filter((p) => p.withdrawnAt === null);
}

if (args.raw !== undefined) {
  console.log(JSON.stringify(positions, null, 2));
  process.exit(0);
}

if (positions.length === 0) {
  const total = data.positions?.length || 0;
  if (total > 0 && args.all === undefined) {
    console.log(`No active LP positions. (${total} withdrawn — use --all to show)`);
  } else {
    console.log(`No LP positions tracked.`);
    console.log(`File: ${getLpFilePath()}`);
  }
  process.exit(0);
}

// --live: query on-chain for current liquidity
let liveData = {};
if (args.live !== undefined) {
  const { getPublicClient } = await import("./lib/client.mjs");
  const { POSITION_MANAGER_ABI } = await import("./lib/abis.mjs");
  const { getChainConfig } = await import("./config/chains.mjs");

  // Group by chain to reuse clients
  const byChain = {};
  for (const p of positions) {
    if (p.withdrawnAt !== null) continue;
    (byChain[p.chain] ||= []).push(p);
  }

  for (const [chain, chainPositions] of Object.entries(byChain)) {
    const chainConfig = getChainConfig(chain);
    const client = getPublicClient(chain);
    for (const p of chainPositions) {
      try {
        const pos = await client.readContract({
          address: chainConfig.dex.nonfungiblePositionManager,
          abi: POSITION_MANAGER_ABI,
          functionName: "positions",
          args: [BigInt(p.tokenId)],
        });
        liveData[`${p.chain}:${p.tokenId}`] = { liquidity: pos[6] };
      } catch (err) {
        liveData[`${p.chain}:${p.tokenId}`] = { error: err.message };
      }
    }
  }
}

// Display
const activeCount = positions.filter((p) => p.withdrawnAt === null).length;
const withdrawnCount = positions.length - activeCount;
let header = `${activeCount} active LP position(s)`;
if (withdrawnCount > 0) header += ` + ${withdrawnCount} withdrawn`;
console.log(header + "\n");

for (const p of positions) {
  const withdrawn = p.withdrawnAt !== null;
  const tag = withdrawn ? " (withdrawn)" : "";
  console.log(`  #${p.tokenId} [${p.chain}/${p.dexType}]${tag}`);

  if (p.outcomeName && p.marketName) {
    console.log(`  ${p.outcomeName} — ${p.marketName}`);
  } else if (p.marketName) {
    console.log(`  ${p.marketName}`);
  }

  if (p.market) console.log(`  Market: ${p.market}`);
  console.log(`  Range: ${(p.probLow * 100).toFixed(1)}% – ${(p.probHigh * 100).toFixed(1)}%`);
  console.log(`  Tokens: ${p.token0} / ${p.token1}`);

  // Live liquidity
  const live = liveData[`${p.chain}:${p.tokenId}`];
  if (live) {
    if (live.error) {
      console.log(`  On-chain: error (${live.error})`);
    } else {
      console.log(`  On-chain liquidity: ${live.liquidity}`);
    }
  }

  const date = p.createdAt ? p.createdAt.split("T")[0] : "unknown";
  if (withdrawn) {
    console.log(`  Added: ${date} | Withdrawn: ${p.withdrawnAt.split("T")[0]}`);
  } else {
    console.log(`  Added: ${date}`);
  }
  console.log();
}
