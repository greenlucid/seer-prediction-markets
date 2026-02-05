import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainConfig } from "../config/chains.mjs";

export function getClients(chainName = null) {
  const chainConfig = getChainConfig(chainName);
  const rpcUrl = process.env.RPC_URL || chainConfig.rpcUrl;

  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error("PRIVATE_KEY env var required");

  const account = privateKeyToAccount(pk);
  const walletClient = createWalletClient({
    account,
    chain: chainConfig.viemChain,
    transport: http(rpcUrl),
  });
  const publicClient = createPublicClient({
    chain: chainConfig.viemChain,
    transport: http(rpcUrl),
  });

  return { account, walletClient, publicClient, chainConfig };
}

export function getPublicClient(chainName = null) {
  const chainConfig = getChainConfig(chainName);
  const rpcUrl = process.env.RPC_URL || chainConfig.rpcUrl;

  return createPublicClient({
    chain: chainConfig.viemChain,
    transport: http(rpcUrl),
  });
}
