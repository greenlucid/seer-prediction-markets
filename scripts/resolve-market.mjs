#!/usr/bin/env node
// Resolve a Seer market after Reality.eth question has finalized.
//
// Usage:
//   node resolve-market.mjs --market 0x... [--chain base]
//
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { getClients } from "./lib/client.mjs";
import { RESOLVE_ABI } from "./lib/abis.mjs";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
requireArgs(args, ["market"]);

const chainName = getChainFromArgs(args);
const { walletClient, publicClient, chainConfig } = getClients(chainName);

console.log(`Resolving market ${args.market}...`);
const hash = await walletClient.writeContract({
  address: chainConfig.contracts.REALITY_PROXY,
  abi: RESOLVE_ABI,
  functionName: "resolve",
  args: [args.market],
});
console.log(`Tx: ${hash}`);
await publicClient.waitForTransactionReceipt({ hash });
console.log("Market resolved.");
