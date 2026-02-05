// Farming ABIs and helpers for Algebra eternal farming (Gnosis only).

export const FARMING_CENTER_ABI = [
  { name: "enterFarming", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "key", type: "tuple", components: [
        { name: "rewardToken", type: "address" }, { name: "bonusRewardToken", type: "address" },
        { name: "pool", type: "address" }, { name: "startTime", type: "uint256" },
        { name: "endTime", type: "uint256" }
      ]},
      { name: "tokenId", type: "uint256" },
      { name: "tokensLocked", type: "uint256" },
      { name: "isLimit", type: "bool" }
    ], outputs: [] },
  { name: "exitFarming", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "key", type: "tuple", components: [
        { name: "rewardToken", type: "address" }, { name: "bonusRewardToken", type: "address" },
        { name: "pool", type: "address" }, { name: "startTime", type: "uint256" },
        { name: "endTime", type: "uint256" }
      ]},
      { name: "tokenId", type: "uint256" },
      { name: "isLimit", type: "bool" }
    ], outputs: [] },
  { name: "withdrawToken", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "to", type: "address" },
      { name: "data", type: "bytes" }
    ], outputs: [] },
  { name: "multicall", type: "function", stateMutability: "payable",
    inputs: [{ name: "data", type: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]" }] },
  { name: "claimReward", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "rewardToken", type: "address" },
      { name: "to", type: "address" },
      { name: "amountRequestedIncentive", type: "uint256" },
      { name: "amountRequestedEternal", type: "uint256" }
    ],
    outputs: [{ name: "reward", type: "uint256" }] },
];

export const NFT_SAFE_TRANSFER_ABI = [
  { name: "safeTransferFrom", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" }
    ], outputs: [] },
];

export const MAX_UINT128 = 0xffffffffffffffffffffffffffffffffn;

const SUBGRAPH_PROXY = "https://app.seer.pm/subgraph";

// Query the Algebra farming subgraph via Seer's proxy (no API key needed).
export async function queryFarmingSubgraph(query, variables = {}) {
  const url = `${SUBGRAPH_PROXY}?_subgraph=algebrafarming&_chainId=100`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Farming subgraph error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Farming subgraph query error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

// Fetch active eternal farmings for a given pool address.
// Returns array of { id, pool, rewardToken, bonusRewardToken, reward, rewardRate, startTime, endTime }.
export async function getActiveIncentives(poolAddress) {
  const data = await queryFarmingSubgraph(`
    query ($pool: String!) {
      eternalFarmings(where: { pool: $pool }, first: 100) {
        id pool rewardToken bonusRewardToken reward rewardRate startTime endTime
      }
    }
  `, { pool: poolAddress.toLowerCase() });

  const now = Math.floor(Date.now() / 1000);
  return (data.eternalFarmings || []).filter(f => {
    if (f.rewardRate === "0" || BigInt(f.rewardRate) === 0n) return false;
    const rewardSeconds = BigInt(f.reward) / BigInt(f.rewardRate);
    const realEnd = BigInt(f.startTime) + rewardSeconds;
    const endTime = BigInt(f.endTime) > realEnd ? realEnd : BigInt(f.endTime);
    return Number(endTime) > now;
  });
}

// Get deposit info for a token ID from the farming subgraph.
// Returns { id, owner, pool, limitFarming, eternalFarming, onFarmingCenter } or null.
export async function getDepositInfo(tokenId) {
  const data = await queryFarmingSubgraph(`
    query ($id: ID!) {
      deposit(id: $id) {
        id owner pool limitFarming eternalFarming onFarmingCenter
      }
    }
  `, { id: String(tokenId) });
  return data.deposit || null;
}

// Build incentive key struct for contract calls.
export function buildIncentiveKey(farming) {
  return {
    rewardToken: farming.rewardToken,
    bonusRewardToken: farming.bonusRewardToken,
    pool: farming.pool,
    startTime: BigInt(farming.startTime),
    endTime: BigInt(farming.endTime),
  };
}
