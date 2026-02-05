#!/usr/bin/env node
// Read market data from a Seer market address.
//
// Usage:
//   node read-market.mjs --market 0x... [--chain base]
//
// Env: RPC_URL (optional), CHAIN (optional). No PRIVATE_KEY needed (read-only).

import { getPublicClient } from "./lib/client.mjs";
import { getChainConfig } from "./config/chains.mjs";
import { MARKET_VIEW_ABI } from "./lib/abis.mjs";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
requireArgs(args, ["market"]);

const chainName = getChainFromArgs(args);
const publicClient = getPublicClient(chainName);
const chainConfig = getChainConfig(chainName);

const info = await publicClient.readContract({
  address: chainConfig.contracts.MARKET_VIEW,
  abi: MARKET_VIEW_ABI,
  functionName: "getMarket",
  args: [chainConfig.contracts.MARKET_FACTORY, args.market],
});

const serialize = (v) => typeof v === "bigint" ? v.toString() : v;

console.log(JSON.stringify({
  id: info.id,
  marketName: info.marketName,
  outcomes: info.outcomes,
  wrappedTokens: info.wrappedTokens,
  collateralToken: info.collateralToken,
  collateralToken1: info.collateralToken1,
  collateralToken2: info.collateralToken2,
  lowerBound: serialize(info.lowerBound),
  upperBound: serialize(info.upperBound),
  conditionId: info.conditionId,
  questionId: info.questionId,
  questionsIds: info.questionsIds,
  encodedQuestions: info.encodedQuestions,
  payoutReported: info.payoutReported,
  payoutNumerators: info.payoutNumerators?.map(serialize),
  outcomesSupply: serialize(info.outcomesSupply),
  parentMarket: info.parentMarket,
  parentOutcome: serialize(info.parentOutcome),
  parentCollectionId: info.parentCollectionId,
  questions: info.questions?.map(q => ({
    arbitrator: q.arbitrator,
    opening_ts: q.opening_ts,
    timeout: q.timeout,
    finalize_ts: q.finalize_ts,
    is_pending_arbitration: q.is_pending_arbitration,
    best_answer: q.best_answer,
    bond: serialize(q.bond),
    min_bond: serialize(q.min_bond),
  })),
}, null, 2));
