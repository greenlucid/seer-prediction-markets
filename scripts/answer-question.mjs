#!/usr/bin/env node
// Submit an answer to a Reality.eth question (for market resolution).
//
// Usage (categorical — answer by outcome index):
//   node answer-question.mjs --question-id 0x... --answer-index 0 --bond 10 [--chain base]
//
// Usage (scalar — answer with a numeric value):
//   node answer-question.mjs --question-id 0x... --answer-value 5000 --bond 10 [--chain base]
//
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { parseEther, pad, toHex } from "viem";
import { getClients } from "./lib/client.mjs";
import { SUBMIT_ANSWER_ABI } from "./lib/abis.mjs";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
requireArgs(args, ["question-id", "bond"]);

let answer;
if ("answer-index" in args) {
  const answerIndex = args["answer-index"];
  // Handle special keywords
  if (answerIndex === "INVALID") {
    answer = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  } else if (answerIndex === "ANSWERED_TOO_SOON") {
    answer = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe";
  } else {
    answer = pad(toHex(parseInt(answerIndex)), { size: 32 });
  }
} else if ("answer-value" in args) {
  answer = pad(toHex(parseInt(args["answer-value"])), { size: 32 });
} else {
  console.error("Provide --answer-index (categorical) or --answer-value (scalar)");
  process.exit(1);
}

const chainName = getChainFromArgs(args);
const { walletClient, publicClient, chainConfig } = getClients(chainName);
const nativeName = chainConfig.viemChain.nativeCurrency?.symbol || "native token";

console.log(`Submitting answer ${answer} with ${args.bond} ${nativeName} bond...`);
const hash = await walletClient.writeContract({
  address: chainConfig.contracts.REALITY_ETH,
  abi: SUBMIT_ANSWER_ABI,
  functionName: "submitAnswer",
  args: [args["question-id"], answer, 0n],
  value: parseEther(args.bond),
});
console.log(`Tx: ${hash}`);
await publicClient.waitForTransactionReceipt({ hash });
console.log("Answer submitted. Timeout starts now (~3.5 days).");
