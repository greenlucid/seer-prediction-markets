#!/usr/bin/env node
// Check collateral approval to Router and Position Manager, auto-approve max if below 1M tokens.
//
// Usage:
//   node approve-router.mjs [--chain base]
//
// Env: PRIVATE_KEY (required), RPC_URL (optional), CHAIN (optional)

import { formatEther } from "viem";
import { getClients } from "./lib/client.mjs";
import { ERC20_APPROVE_ABI } from "./lib/abis.mjs";
import { parseArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
const chainName = getChainFromArgs(args);
const { account, walletClient, publicClient, chainConfig } = getClients(chainName);

const collateralToken = chainConfig.collateral.address;
const router = chainConfig.contracts.GNOSIS_ROUTER;
const positionManager = chainConfig.dex.nonfungiblePositionManager;

const ALLOWANCE_ABI = [{ name: "allowance", type: "function", stateMutability: "view",
  inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
  outputs: [{ type: "uint256" }] }];

const threshold = 1_000_000n * 10n**18n; // 1M tokens
const maxApproval = 2n**256n - 1n; // max uint256

// Check and approve Router
const routerAllowance = await publicClient.readContract({
  address: collateralToken,
  abi: ALLOWANCE_ABI,
  functionName: "allowance",
  args: [account.address, router],
});

console.log(`Router approval: ${formatEther(routerAllowance)} ${chainConfig.collateral.symbol}`);

if (routerAllowance < threshold) {
  console.log(`Below 1M, approving max to Router...`);
  const hash = await walletClient.writeContract({
    address: collateralToken,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [router, maxApproval],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Done. Tx: ${hash}`);
} else {
  console.log("Router approval sufficient.");
}

// Check and approve Position Manager (for LP)
const pmAllowance = await publicClient.readContract({
  address: collateralToken,
  abi: ALLOWANCE_ABI,
  functionName: "allowance",
  args: [account.address, positionManager],
});

console.log(`Position Manager approval: ${formatEther(pmAllowance)} ${chainConfig.collateral.symbol}`);

if (pmAllowance < threshold) {
  console.log(`Below 1M, approving max to Position Manager...`);
  const hash = await walletClient.writeContract({
    address: collateralToken,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [positionManager, maxApproval],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Done. Tx: ${hash}`);
} else {
  console.log("Position Manager approval sufficient.");
}
