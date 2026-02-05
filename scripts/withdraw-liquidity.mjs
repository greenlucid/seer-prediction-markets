#!/usr/bin/env node
// Withdraw concentrated liquidity from a DEX position.
// Supports SwaprV3 (Algebra) on Gnosis and Uniswap V3 on other chains.
//
// Usage:
//   node withdraw-liquidity.mjs --token-id 12345 [--chain base]
//   node withdraw-liquidity.mjs --list [--chain base]   # list all positions for wallet
//
// Withdraws 100% of liquidity, collects tokens, and burns the empty NFT.
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { formatEther } from "viem";
import { getClients } from "./lib/client.mjs";
import { POSITION_MANAGER_ABI } from "./lib/abis.mjs";
import { parseArgs, getChainFromArgs } from "./lib/args.mjs";
import { markWithdrawn } from "./lib/lp-store.mjs";

const args = parseArgs();
const chainName = getChainFromArgs(args);
const { account, walletClient, publicClient, chainConfig } = getClients(chainName);
const MAX_UINT128 = (1n << 128n) - 1n;

if (args.list !== undefined) {
  const count = await publicClient.readContract({
    address: chainConfig.dex.nonfungiblePositionManager, abi: POSITION_MANAGER_ABI,
    functionName: "balanceOf", args: [account.address],
  });
  console.log(`Positions owned: ${count}`);
  for (let i = 0n; i < count; i++) {
    const tokenId = await publicClient.readContract({
      address: chainConfig.dex.nonfungiblePositionManager, abi: POSITION_MANAGER_ABI,
      functionName: "tokenOfOwnerByIndex", args: [account.address, i],
    });
    const pos = await publicClient.readContract({
      address: chainConfig.dex.nonfungiblePositionManager, abi: POSITION_MANAGER_ABI,
      functionName: "positions", args: [tokenId],
    });
    console.log(`  #${tokenId}: token0=${pos[2]} token1=${pos[3]} liquidity=${pos[6]} ticks=[${pos[4]},${pos[5]}]`);
  }
  process.exit(0);
}

if (!args["token-id"]) {
  console.error("Pass --token-id <id> or --list");
  process.exit(1);
}

const tokenId = BigInt(args["token-id"]);

const pos = await publicClient.readContract({
  address: chainConfig.dex.nonfungiblePositionManager, abi: POSITION_MANAGER_ABI,
  functionName: "positions", args: [tokenId],
});
const liquidity = pos[6];
if (liquidity === 0n) {
  console.log("Position has zero liquidity, nothing to withdraw.");
  process.exit(0);
}

console.log(`Withdrawing all liquidity (${liquidity}) from position #${tokenId}...`);

let hash = await walletClient.writeContract({
  address: chainConfig.dex.nonfungiblePositionManager, abi: POSITION_MANAGER_ABI,
  functionName: "decreaseLiquidity",
  args: [{ tokenId, liquidity, amount0Min: 0n, amount1Min: 0n,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600) }],
});
await publicClient.waitForTransactionReceipt({ hash });

console.log(`Collecting tokens...`);
hash = await walletClient.writeContract({
  address: chainConfig.dex.nonfungiblePositionManager, abi: POSITION_MANAGER_ABI,
  functionName: "collect",
  args: [{ tokenId, recipient: account.address, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });

console.log(`Burning empty position NFT...`);
hash = await walletClient.writeContract({
  address: chainConfig.dex.nonfungiblePositionManager, abi: POSITION_MANAGER_ABI,
  functionName: "burn", args: [tokenId],
});
await publicClient.waitForTransactionReceipt({ hash });

console.log(`Position #${tokenId} fully withdrawn and burned.`);

// Update LP tracker
try {
  const { found } = markWithdrawn(tokenId, chainName || "gnosis");
  if (found) console.log(`LP tracker updated.`);
} catch (err) {
  console.error(`Warning: Failed to update LP tracker: ${err.message}`);
}
