#!/usr/bin/env node
// Wallet setup for Seer prediction market scripts.
//
// Usage:
//   node setup.mjs              # check if wallet is configured, show address + balances
//   node setup.mjs --generate   # generate a new random wallet, save to ~/.openclaw/.env
//
// If PRIVATE_KEY is not set, prints instructions for the human to either
// provide an existing key or run --generate to create one.
// The private key is NEVER printed to stdout.

import { existsSync, readFileSync, appendFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { parseArgs } from "./lib/args.mjs";
import { getChainConfig } from "./config/chains.mjs";
import { createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const args = parseArgs();
const ENV_DIR = join(homedir(), ".openclaw");
const ENV_FILE = join(ENV_DIR, ".env");

// --- Generate mode ---
if ("generate" in args) {
  // Check if key already exists in env or file
  if (process.env.PRIVATE_KEY) {
    const existing = privateKeyToAccount(process.env.PRIVATE_KEY);
    console.error(`Wallet already configured: ${existing.address}`);
    console.error("Not generating a new key. Remove PRIVATE_KEY from env first if you want a fresh wallet.");
    process.exit(1);
  }

  if (existsSync(ENV_FILE)) {
    const contents = readFileSync(ENV_FILE, "utf8");
    if (contents.includes("PRIVATE_KEY=")) {
      console.error(`PRIVATE_KEY already exists in ${ENV_FILE}`);
      console.error("Remove it manually first if you want to generate a new one.");
      process.exit(1);
    }
  }

  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);

  // Write directly to env file — never print the key
  mkdirSync(ENV_DIR, { recursive: true });
  appendFileSync(ENV_FILE, `\nPRIVATE_KEY=${pk}\n`);

  console.log(`New wallet generated and saved to ${ENV_FILE}`);
  console.log();
  console.log(`  Address: ${account.address}`);
  console.log();
  console.log("Send funds to this address to get started:");
  console.log("  gnosis:   xDAI (gas) + sDAI (collateral)");
  console.log("  base:     ETH (gas) + sUSDS (collateral)");
  console.log("  optimism: ETH (gas) + sUSDS (collateral)");
  console.log("  mainnet:  ETH (gas) + sDAI (collateral)");
  console.log();
  console.log("Then restart so the env var is loaded.");
  process.exit(0);
}

// --- Check mode ---
let pk = process.env.PRIVATE_KEY;

// Also check the file directly in case env wasn't loaded yet
if (!pk && existsSync(ENV_FILE)) {
  const match = readFileSync(ENV_FILE, "utf8").match(/^PRIVATE_KEY=(0x[0-9a-fA-F]+)/m);
  if (match) {
    pk = match[1];
    console.log(`(PRIVATE_KEY found in ${ENV_FILE} but not in env — restart to load it)\n`);
  }
}

if (!pk) {
  console.log("No PRIVATE_KEY found.\n");
  console.log("Options:");
  console.log("  1. If the human has an existing key:");
  console.log(`     They should add PRIVATE_KEY=0x... to ${ENV_FILE}`);
  console.log();
  console.log("  2. To generate a new wallet automatically:");
  console.log("     node setup.mjs --generate");
  console.log();
  console.log("Then restart so the env var is loaded.");
  process.exit(1);
}

const account = privateKeyToAccount(pk);
const chains = ["gnosis", "base", "optimism", "mainnet"];

console.log(`Wallet: ${account.address}\n`);

for (const chain of chains) {
  const config = getChainConfig(chain);
  const client = createPublicClient({
    chain: config.viemChain,
    transport: http(config.rpcUrl),
  });

  try {
    const [nativeBalance, collateralBalance] = await Promise.all([
      client.getBalance({ address: account.address }),
      client.readContract({
        address: config.collateral.address,
        abi: [{ name: "balanceOf", type: "function", stateMutability: "view",
          inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }],
        functionName: "balanceOf",
        args: [account.address],
      }),
    ]);

    const native = formatEther(nativeBalance);
    const collateral = formatEther(collateralBalance);
    const gasOk = nativeBalance > 0n;
    const fundedOk = collateralBalance > 0n;

    console.log(`  ${chain}:`);
    console.log(`    Native:     ${Number(native).toFixed(4)} ${chain === "gnosis" ? "xDAI" : "ETH"} ${gasOk ? "" : "(needs gas!)"}`);
    console.log(`    Collateral: ${Number(collateral).toFixed(4)} ${config.collateral.symbol} ${fundedOk ? "" : "(no funds)"}`);
  } catch (e) {
    console.log(`  ${chain}: RPC error (${e.message.slice(0, 60)})`);
  }
}

console.log();
console.log("If balances are zero, send funds to the address above.");
console.log("Then run: node approve-router.mjs [--chain <name>]");
