#!/usr/bin/env node
// Check wallet balances (native token + collateral).
//
// Usage:
//   node check-balance.mjs [--chain base]
//   node check-balance.mjs --address 0x... [--chain base]   # check any address (no PRIVATE_KEY needed)
//
// Env: PRIVATE_KEY (optional if --address given), RPC_URL (optional), CHAIN (optional)

import { formatEther } from "viem";
import { getPublicClient } from "./lib/client.mjs";
import { getChainConfig } from "./config/chains.mjs";
import { parseArgs, getChainFromArgs } from "./lib/args.mjs";

const args = parseArgs();
const chainName = getChainFromArgs(args);
const chainConfig = getChainConfig(chainName);

let address = args.address;

if (!address) {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.error("Provide --address or set PRIVATE_KEY"); process.exit(1); }
  const { privateKeyToAccount } = await import("viem/accounts");
  address = privateKeyToAccount(pk).address;
}

const publicClient = getPublicClient(chainName);

// If --token is provided, show only that token balance
if (args.token) {
  const balance = await publicClient.readContract({
    address: args.token,
    abi: [{ name: "balanceOf", type: "function", stateMutability: "view",
      inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }],
    functionName: "balanceOf",
    args: [address],
  });
  console.log(`Address: ${address}`);
  console.log(`Token:   ${args.token}`);
  console.log(`Balance: ${formatEther(balance)}`);
} else {
  // Default: show native token and collateral balances
  const [nativeBalance, collateralBalance] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: chainConfig.collateral.address,
      abi: [{ name: "balanceOf", type: "function", stateMutability: "view",
        inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }],
      functionName: "balanceOf",
      args: [address],
    }),
  ]);

  const nativeName = chainConfig.viemChain.nativeCurrency?.symbol || "Native";
  console.log(`Address:    ${address}`);
  console.log(`Chain:      ${chainConfig.name}`);
  console.log(`${nativeName}:       ${formatEther(nativeBalance)}`);
  console.log(`${chainConfig.collateral.symbol}:      ${formatEther(collateralBalance)}`);
}
