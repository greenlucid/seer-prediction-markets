#!/usr/bin/env node
// Deposit an LP NFT into the FarmingCenter and enter eternal farming.
// Gnosis chain only (Algebra/SwaprV3 farming).
//
// Usage:
//   node enter-farming.mjs --token-id 12345
//   node enter-farming.mjs --token-id 12345 --pool 0x...
//   node enter-farming.mjs --token-id 12345 --chain gnosis
//
// Flags:
//   --token-id <n>    LP NFT token ID (required)
//   --pool <addr>     Pool address (auto-detected from position if omitted)
//   --chain <name>    Chain name (default: gnosis, must be gnosis)

import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";
import { getClients } from "./lib/client.mjs";
import { getChainConfig } from "./config/chains.mjs";
import { POSITION_MANAGER_ABI, POOL_FACTORY_ABI } from "./lib/abis.mjs";
import {
  FARMING_CENTER_ABI, NFT_SAFE_TRANSFER_ABI,
  getActiveIncentives, buildIncentiveKey,
} from "./lib/farming.mjs";

const args = parseArgs();
requireArgs(args, ["token-id"]);

const chainName = getChainFromArgs(args) || "gnosis";
const chainConfig = getChainConfig(chainName);

if (!chainConfig.farming) {
  console.error(`Farming is only available on Gnosis. Chain "${chainName}" does not support farming.`);
  process.exit(1);
}

const { account, walletClient, publicClient } = getClients(chainName);
const tokenId = BigInt(args["token-id"]);
const farmingCenter = chainConfig.farming.farmingCenter;
const nftManager = chainConfig.dex.nonfungiblePositionManager;

// Resolve pool address
let poolAddress = args.pool;
if (!poolAddress) {
  console.log(`Reading LP position #${tokenId} on-chain...`);
  const position = await publicClient.readContract({
    address: nftManager,
    abi: POSITION_MANAGER_ABI,
    functionName: "positions",
    args: [tokenId],
  });

  const token0 = position[2];
  const token1 = position[3];
  const liquidity = position[6];

  if (liquidity === 0n) {
    console.error("Position has zero liquidity. Nothing to farm.");
    process.exit(1);
  }

  poolAddress = await publicClient.readContract({
    address: chainConfig.dex.algebraFactory,
    abi: POOL_FACTORY_ABI,
    functionName: "poolByPair",
    args: [token0, token1],
  });

  console.log(`Pool: ${poolAddress}`);
}

// Find active incentive for this pool
console.log("Looking up active farming incentives...");
const incentives = await getActiveIncentives(poolAddress);

if (incentives.length === 0) {
  console.error("No active farming incentives found for this pool.");
  process.exit(1);
}

const farming = incentives[0];
if (incentives.length > 1) {
  console.log(`Warning: ${incentives.length} active incentives found, using first one.`);
}

const rewardPerDay = Number(BigInt(farming.rewardRate) * 86400n) / 1e18;
console.log(`Incentive: ${rewardPerDay.toFixed(1)} SEER/day`);

// Step 1: Transfer NFT to FarmingCenter
console.log(`\nDepositing LP NFT #${tokenId} to FarmingCenter...`);
const depositHash = await walletClient.writeContract({
  address: nftManager,
  abi: NFT_SAFE_TRANSFER_ABI,
  functionName: "safeTransferFrom",
  args: [account.address, farmingCenter, tokenId],
});
const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
console.log(`Deposited. Tx: ${depositHash} (block ${depositReceipt.blockNumber})`);

// Step 2: Enter farming
console.log("Entering farming...");
const incentiveKey = buildIncentiveKey(farming);
const enterHash = await walletClient.writeContract({
  address: farmingCenter,
  abi: FARMING_CENTER_ABI,
  functionName: "enterFarming",
  args: [incentiveKey, tokenId, 0n, false],
});
const enterReceipt = await publicClient.waitForTransactionReceipt({ hash: enterHash });
console.log(`Entered farming! Tx: ${enterHash} (block ${enterReceipt.blockNumber})`);

console.log(`\nLP NFT #${tokenId} is now farming ${rewardPerDay.toFixed(1)} SEER/day.`);
console.log("To exit: node exit-farming.mjs --token-id", args["token-id"]);
