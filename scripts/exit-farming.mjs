#!/usr/bin/env node
// Exit farming, claim SEER rewards, and withdraw LP NFT back to your wallet.
// Gnosis chain only (Algebra/SwaprV3 farming).
//
// Usage:
//   node exit-farming.mjs --token-id 12345
//   node exit-farming.mjs --token-id 12345 --no-withdraw
//   node exit-farming.mjs --token-id 12345 --pool 0x...
//
// Flags:
//   --token-id <n>    LP NFT token ID (required)
//   --pool <addr>     Pool address (auto-detected if omitted)
//   --no-withdraw     Exit farming and claim but leave NFT in FarmingCenter
//   --chain <name>    Chain name (default: gnosis, must be gnosis)

import { encodeFunctionData } from "viem";
import { parseArgs, requireArgs, getChainFromArgs } from "./lib/args.mjs";
import { getClients } from "./lib/client.mjs";
import { getChainConfig } from "./config/chains.mjs";
import { POSITION_MANAGER_ABI, POOL_FACTORY_ABI } from "./lib/abis.mjs";
import {
  FARMING_CENTER_ABI, MAX_UINT128,
  getActiveIncentives, getDepositInfo, buildIncentiveKey,
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
const noWithdraw = "no-withdraw" in args;

// Resolve pool address
let poolAddress = args.pool;
if (!poolAddress) {
  // Try subgraph first (NFT is in FarmingCenter so on-chain positions() might not work from our account)
  console.log("Looking up deposit info from subgraph...");
  const deposit = await getDepositInfo(tokenId);
  if (deposit && deposit.pool) {
    poolAddress = deposit.pool;
    if (!deposit.onFarmingCenter) {
      console.error("This NFT is not deposited in the FarmingCenter.");
      process.exit(1);
    }
    if (!deposit.eternalFarming) {
      console.log("Warning: NFT is in FarmingCenter but not in eternal farming. Will just withdraw.");
    }
  } else {
    // Fallback: read position on-chain
    console.log("Reading LP position on-chain...");
    const position = await publicClient.readContract({
      address: nftManager,
      abi: POSITION_MANAGER_ABI,
      functionName: "positions",
      args: [tokenId],
    });
    const token0 = position[2];
    const token1 = position[3];
    poolAddress = await publicClient.readContract({
      address: chainConfig.dex.algebraFactory,
      abi: POOL_FACTORY_ABI,
      functionName: "poolByPair",
      args: [token0, token1],
    });
  }
  console.log(`Pool: ${poolAddress}`);
}

// Find incentive to build the key
console.log("Looking up farming incentives...");
const incentives = await getActiveIncentives(poolAddress);

if (incentives.length === 0) {
  // Might be an ended incentive — try all (including ended) from subgraph
  console.log("No active incentives. Checking all incentives (may be ended)...");
  // We need to query without the active filter for this case
  const { queryFarmingSubgraph } = await import("./lib/farming.mjs");
  const data = await queryFarmingSubgraph(`
    query ($pool: String!) {
      eternalFarmings(where: { pool: $pool }, first: 10, orderBy: startTime, orderDirection: desc) {
        id pool rewardToken bonusRewardToken reward rewardRate startTime endTime
      }
    }
  `, { pool: poolAddress.toLowerCase() });

  if (!data.eternalFarmings?.length) {
    console.error("No farming incentives found for this pool at all.");
    process.exit(1);
  }
  incentives.push(data.eternalFarmings[0]);
}

const farming = incentives[0];
const incentiveKey = buildIncentiveKey(farming);

// Exit farming + claim rewards via multicall
console.log("\nExiting farming and claiming rewards...");
const exitData = encodeFunctionData({
  abi: FARMING_CENTER_ABI,
  functionName: "exitFarming",
  args: [incentiveKey, tokenId, false],
});
const claimData = encodeFunctionData({
  abi: FARMING_CENTER_ABI,
  functionName: "claimReward",
  args: [farming.rewardToken, account.address, 0n, MAX_UINT128],
});

const exitHash = await walletClient.writeContract({
  address: farmingCenter,
  abi: FARMING_CENTER_ABI,
  functionName: "multicall",
  args: [[exitData, claimData]],
});
const exitReceipt = await publicClient.waitForTransactionReceipt({ hash: exitHash });
console.log(`Exited farming and claimed rewards. Tx: ${exitHash} (block ${exitReceipt.blockNumber})`);

// Withdraw NFT back to wallet
if (!noWithdraw) {
  console.log("\nWithdrawing NFT back to wallet...");
  const withdrawHash = await walletClient.writeContract({
    address: farmingCenter,
    abi: FARMING_CENTER_ABI,
    functionName: "withdrawToken",
    args: [tokenId, account.address, "0x0000000000000000000000000000000000000000000000000000000000000000"],
  });
  const withdrawReceipt = await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
  console.log(`NFT #${tokenId} withdrawn to ${account.address}. Tx: ${withdrawHash} (block ${withdrawReceipt.blockNumber})`);
  console.log("\nNext steps:");
  console.log(`  Remove liquidity: node withdraw-liquidity.mjs --token-id ${args["token-id"]}`);
  console.log(`  Re-enter farming: node enter-farming.mjs --token-id ${args["token-id"]}`);
} else {
  console.log("\nNFT remains in FarmingCenter (--no-withdraw).");
  console.log(`  Re-enter farming: node enter-farming.mjs --token-id ${args["token-id"]}`);
  console.log(`  Withdraw NFT later: node exit-farming.mjs --token-id ${args["token-id"]}`);
}
