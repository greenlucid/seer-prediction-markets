#!/usr/bin/env node
// Create a Seer prediction market across all supported chains.
//
// Usage:
//   node create-market.mjs --type categorical --name "Will ETH hit 10k?" --outcomes "Yes,No" --tokens "YES,NO" \
//     --category cryptocurrency --opening-time 2026-06-01 --min-bond 5 [--chain base]
//
//   node create-market.mjs --type scalar --name "ETH price Jan 2027?" --outcomes "Low,High" --tokens "LOW,HIGH" \
//     --category cryptocurrency --opening-time 2027-01-02 --min-bond 5 --lower-bound 1000 --upper-bound 20000
//
//   node create-market.mjs --type multi-scalar --outcomes "Labour,Conservative,LibDem" --tokens "LAB,CON,LIBDEM" \
//     --question-start "How many seats will " --question-end " win in 2028?" --outcome-type party \
//     --category politics --opening-time 2028-07-01 --min-bond 5 --upper-bound 650
//
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional, defaults to gnosis)
//
// Optional: --parent-market <address> --parent-outcome <index> for conditional markets

import { parseEther, zeroAddress, decodeEventLog } from "viem";
import { getClients } from "./lib/client.mjs";
import { createMarketAbi } from "./lib/abis.mjs";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
requireArgs(args, ["type", "outcomes", "tokens", "category", "min-bond"]);

const type = args.type; // categorical | scalar | multi-scalar
const fnName = {
  categorical: "createCategoricalMarket",
  scalar: "createScalarMarket",
  "multi-scalar": "createMultiScalarMarket",
}[type];
if (!fnName) { console.error("--type must be categorical, scalar, or multi-scalar"); process.exit(1); }

const outcomes = args.outcomes.split(",");
const tokenNames = args.tokens.split(",");
const openingTime = args["opening-time"]
  ? Math.floor(new Date(args["opening-time"]).getTime() / 1000)
  : Math.floor(Date.now() / 1000);

if (type !== "multi-scalar") requireArgs(args, ["name"]);

const params = {
  marketName: args.name || "",
  outcomes,
  questionStart: args["question-start"] || "",
  questionEnd: args["question-end"] || "",
  outcomeType: args["outcome-type"] || "",
  parentOutcome: BigInt(args["parent-outcome"] || 0),
  parentMarket: args["parent-market"] || zeroAddress,
  category: args.category,
  lang: args.lang || "en",
  lowerBound: BigInt(args["lower-bound"] || 0),
  upperBound: BigInt(args["upper-bound"] || 0),
  minBond: parseEther(args["min-bond"]),
  openingTime,
  tokenNames,
};

const chainName = getChainFromArgs(args);
const { walletClient, publicClient, chainConfig } = getClients(chainName);

console.log(`Creating ${type} market via ${fnName}...`);
const hash = await walletClient.writeContract({
  address: chainConfig.contracts.MARKET_FACTORY,
  abi: createMarketAbi(fnName),
  functionName: fnName,
  args: [params],
});
console.log(`Tx: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });

const NEW_MARKET_ABI = [{ name: "NewMarket", type: "event",
  inputs: [
    { name: "market", type: "address", indexed: true },
    { name: "marketName", type: "string", indexed: false },
    { name: "parentMarket", type: "address", indexed: false },
    { name: "conditionId", type: "bytes32", indexed: false },
    { name: "questionId", type: "bytes32", indexed: false },
    { name: "questionsIds", type: "bytes32[]", indexed: false },
  ]}];

for (const log of receipt.logs) {
  try {
    const event = decodeEventLog({ abi: NEW_MARKET_ABI, data: log.data, topics: log.topics });
    if (event.eventName === "NewMarket") {
      console.log(`Market address: ${event.args.market}`);
      console.log(`Condition ID: ${event.args.conditionId}`);
      console.log(`Question IDs: ${event.args.questionsIds.join(", ")}`);
      break;
    }
  } catch {}
}
console.log(`Confirmed in block ${receipt.blockNumber}.`);
