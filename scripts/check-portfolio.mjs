#!/usr/bin/env node
// Full portfolio overview: balances, outcome positions, LP positions, with estimated values.
//
// Usage:
//   node check-portfolio.mjs                    # all chains
//   node check-portfolio.mjs --chain gnosis     # single chain
//   node check-portfolio.mjs --raw              # JSON output
//
// Env: PRIVATE_KEY (required)

import { formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getPublicClient } from "./lib/client.mjs";
import { getChainConfig } from "./config/chains.mjs";
import { readLpPositions } from "./lib/lp-store.mjs";
import { parseArgs } from "./lib/args.mjs";
import {
  POSITION_MANAGER_ABI,
  POOL_STATE_ABI,
  UNISWAP_V3_POOL_STATE_ABI,
  POOL_FACTORY_ABI,
  UNISWAP_V3_FACTORY_ABI,
} from "./lib/abis.mjs";

const args = parseArgs();
const SEER_API = "https://app.seer.pm/.netlify/functions";

const CHAIN_IDS = {
  gnosis: "100",
  base: "8453",
  optimism: "10",
  mainnet: "1",
};


const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "asset", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "address" }] },
];

const pk = process.env.PRIVATE_KEY;
if (!pk) { console.error("PRIVATE_KEY env var required"); process.exit(1); }
const account = privateKeyToAccount(pk).address;

const chains = args.chain ? [args.chain] : Object.keys(CHAIN_IDS);

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Uniswap V3 liquidity → amounts
// ─────────────────────────────────────────────────────────────────────────────
function getAmountsForLiquidity(liquidity, tickLower, tickUpper, currentTick) {
  const L = Number(liquidity);
  const sqrtP = Math.sqrt(1.0001 ** currentTick);
  const sqrtPa = Math.sqrt(1.0001 ** tickLower);
  const sqrtPb = Math.sqrt(1.0001 ** tickUpper);

  let amount0, amount1;
  if (currentTick < tickLower) {
    amount0 = L * (1 / sqrtPa - 1 / sqrtPb);
    amount1 = 0;
  } else if (currentTick >= tickUpper) {
    amount0 = 0;
    amount1 = L * (sqrtPb - sqrtPa);
  } else {
    amount0 = L * (1 / sqrtP - 1 / sqrtPb);
    amount1 = L * (sqrtP - sqrtPa);
  }
  return { amount0, amount1 };
}

// sqrtPriceX96 → price (token1/token0)
function sqrtPriceX96ToPrice(sqrtPriceX96) {
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  return sqrtPrice * sqrtPrice;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Balances
// ─────────────────────────────────────────────────────────────────────────────
async function getBalances(chainName) {
  const chainConfig = getChainConfig(chainName);
  const client = getPublicClient(chainName);

  const calls = [
    // Native balance (handled separately, not via multicall for native)
  ];

  // Collateral balance
  calls.push({
    address: chainConfig.collateral.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account],
  });

  // Underlying: for gnosis, native IS underlying. For others, query.
  let underlyingAddress = null;
  if (chainName === "mainnet") {
    underlyingAddress = "0x6B175474E89094C44Da98b954EesdeB131e560"; // DAI
  } else if (chainName === "base" || chainName === "optimism") {
    // Query sUSDS.asset() to get USDS address
    try {
      underlyingAddress = await client.readContract({
        address: chainConfig.collateral.address,
        abi: ERC20_ABI,
        functionName: "asset",
      });
    } catch (e) {
      // Ignore if not ERC4626
    }
  }

  if (underlyingAddress && underlyingAddress !== chainConfig.collateral.address) {
    calls.push({
      address: underlyingAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account],
    });
  }

  const [nativeBalance, multicallResults] = await Promise.all([
    client.getBalance({ address: account }),
    client.multicall({ contracts: calls }),
  ]);

  const collateralBalance = multicallResults[0].status === "success" ? multicallResults[0].result : 0n;
  const underlyingBalance = multicallResults[1]?.status === "success" ? multicallResults[1].result : 0n;

  return {
    chain: chainName,
    native: { symbol: chainConfig.viemChain.nativeCurrency?.symbol || "ETH", balance: nativeBalance },
    collateral: { symbol: chainConfig.collateral.symbol, balance: collateralBalance },
    underlying: underlyingAddress ? { address: underlyingAddress, balance: underlyingBalance } : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Outcome positions (via Seer API)
// ─────────────────────────────────────────────────────────────────────────────
async function getOutcomePositions(chainName) {
  const chainId = CHAIN_IDS[chainName];
  const res = await fetch(`${SEER_API}/get-portfolio?account=${account}&chainId=${chainId}`);
  if (!res.ok) return [];
  const positions = await res.json();

  // Filter out invalid outcomes and zero balances
  return positions
    .filter(p => !p.isInvalidOutcome && p.tokenBalance > 0.0001)
    .map(p => ({
      chain: chainName,
      marketId: p.marketId,
      marketName: p.marketName,
      outcome: p.outcome,
      tokenAddress: p.tokenId,
      balance: p.tokenBalance,
      marketStatus: p.marketStatus,
    }));
}

// Get pool price for an outcome token
async function getOutcomePrice(chainName, outcomeToken) {
  const chainConfig = getChainConfig(chainName);
  const client = getPublicClient(chainName);
  const collateral = chainConfig.collateral.address;

  // Determine token ordering
  const outcomeIsToken0 = outcomeToken.toLowerCase() < collateral.toLowerCase();
  const [token0, token1] = outcomeIsToken0
    ? [outcomeToken, collateral]
    : [collateral, outcomeToken];

  // Get pool address
  let poolAddress;
  try {
    if (chainConfig.dex.type === "swaprv3") {
      poolAddress = await client.readContract({
        address: chainConfig.dex.algebraFactory,
        abi: POOL_FACTORY_ABI,
        functionName: "poolByPair",
        args: [token0, token1],
      });
    } else {
      poolAddress = await client.readContract({
        address: chainConfig.dex.factory,
        abi: UNISWAP_V3_FACTORY_ABI,
        functionName: "getPool",
        args: [token0, token1, chainConfig.dex.fee],
      });
    }
  } catch (e) {
    return null;
  }

  if (!poolAddress || poolAddress === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  // Get current price from pool
  try {
    const poolAbi = chainConfig.dex.type === "swaprv3" ? POOL_STATE_ABI : UNISWAP_V3_POOL_STATE_ABI;
    const fnName = chainConfig.dex.type === "swaprv3" ? "globalState" : "slot0";
    const state = await client.readContract({
      address: poolAddress,
      abi: poolAbi,
      functionName: fnName,
    });

    const sqrtPriceX96 = state[0]; // First return value is sqrtPriceX96/price
    const price = sqrtPriceX96ToPrice(sqrtPriceX96);

    // price is token1/token0
    // If outcome is token0, price = collateral/outcome, so outcomePrice = price
    // If outcome is token1, price = outcome/collateral, so outcomePrice = 1/price
    return outcomeIsToken0 ? price : 1 / price;
  } catch (e) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: LP positions
// ─────────────────────────────────────────────────────────────────────────────
async function getLpPositionValues(chainName, lpPositions) {
  if (lpPositions.length === 0) return [];

  const chainConfig = getChainConfig(chainName);
  const client = getPublicClient(chainName);

  const results = [];

  for (const lp of lpPositions) {
    try {
      // Get position data from on-chain
      const posData = await client.readContract({
        address: chainConfig.dex.nonfungiblePositionManager,
        abi: POSITION_MANAGER_ABI,
        functionName: "positions",
        args: [BigInt(lp.tokenId)],
      });

      const [, , token0, token1, tickLower, tickUpper, liquidity] = posData;

      if (liquidity === 0n) {
        results.push({ ...lp, liquidity: 0n, amount0: 0, amount1: 0, value: 0 });
        continue;
      }

      // Get pool address: use stored, or lookup from factory
      let poolAddress = lp.poolAddress;
      if (!poolAddress) {
        try {
          if (chainConfig.dex.type === "swaprv3") {
            poolAddress = await client.readContract({
              address: chainConfig.dex.algebraFactory,
              abi: POOL_FACTORY_ABI,
              functionName: "poolByPair",
              args: [token0, token1],
            });
          } else {
            poolAddress = await client.readContract({
              address: chainConfig.dex.factory,
              abi: UNISWAP_V3_FACTORY_ABI,
              functionName: "getPool",
              args: [token0, token1, chainConfig.dex.fee],
            });
          }
        } catch {
          // Pool lookup failed - show position with liquidity only
          results.push({
            ...lp,
            liquidity,
            tickLower: Number(tickLower),
            tickUpper: Number(tickUpper),
            noPoolData: true,
            value: 0,
          });
          continue;
        }
      }

      // Get current tick from pool
      const poolAbi = chainConfig.dex.type === "swaprv3" ? POOL_STATE_ABI : UNISWAP_V3_POOL_STATE_ABI;
      const fnName = chainConfig.dex.type === "swaprv3" ? "globalState" : "slot0";
      const state = await client.readContract({
        address: poolAddress,
        abi: poolAbi,
        functionName: fnName,
      });

      const currentTick = Number(state[1]);

      // Calculate amounts
      const { amount0, amount1 } = getAmountsForLiquidity(
        liquidity,
        Number(tickLower),
        Number(tickUpper),
        currentTick
      );

      // Determine which is outcome vs collateral
      const collateralAddr = chainConfig.collateral.address.toLowerCase();
      const isToken0Collateral = token0.toLowerCase() === collateralAddr;

      // amounts are in wei-scale floats from liquidity math, convert to tokens
      const WEI = 1e18;
      const outcomeAmount = (isToken0Collateral ? amount1 : amount0) / WEI;
      const collateralAmount = (isToken0Collateral ? amount0 : amount1) / WEI;
      const outcomeToken = isToken0Collateral ? token1 : token0;

      // Get outcome price for valuation
      const outcomePrice = await getOutcomePrice(chainName, outcomeToken);
      const outcomeValue = outcomePrice ? outcomeAmount * outcomePrice : 0;
      const totalValue = outcomeValue + collateralAmount;

      results.push({
        ...lp,
        liquidity,
        tickLower: Number(tickLower),
        tickUpper: Number(tickUpper),
        currentTick,
        outcomeAmount,
        collateralAmount,
        outcomePrice,
        value: totalValue,
      });
    } catch (e) {
      results.push({ ...lp, error: e.message, value: 0 });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
const portfolio = {
  address: account,
  balances: [],
  positions: [],
  lpPositions: [],
  totals: { stables: 0, positions: 0, lp: 0, total: 0 },
};

// Load LP positions from tracker
const lpData = readLpPositions();
const activeLps = (lpData.positions || []).filter(p => p.withdrawnAt === null);

for (const chainName of chains) {
  // Balances
  try {
    const bal = await getBalances(chainName);
    portfolio.balances.push(bal);

    // Add to stables total (collateral + underlying, and native if it's a stablecoin like xDAI)
    const collateralVal = Number(formatEther(bal.collateral.balance));
    const underlyingVal = bal.underlying ? Number(formatEther(bal.underlying.balance)) : 0;
    const nativeVal = chainName === "gnosis" ? Number(formatEther(bal.native.balance)) : 0;
    portfolio.totals.stables += collateralVal + underlyingVal + nativeVal;
  } catch (e) {
    console.error(`Error fetching balances for ${chainName}: ${e.message}`);
  }

  // Outcome positions
  try {
    const positions = await getOutcomePositions(chainName);
    for (const pos of positions) {
      const price = await getOutcomePrice(chainName, pos.tokenAddress);
      pos.price = price;
      pos.value = price ? pos.balance * price : null;
      portfolio.positions.push(pos);
      if (pos.value) portfolio.totals.positions += pos.value;
    }
  } catch (e) {
    console.error(`Error fetching positions for ${chainName}: ${e.message}`);
  }

  // LP positions
  const chainLps = activeLps.filter(lp => lp.chain === chainName);
  if (chainLps.length > 0) {
    try {
      const lpValues = await getLpPositionValues(chainName, chainLps);
      portfolio.lpPositions.push(...lpValues);
      for (const lp of lpValues) {
        portfolio.totals.lp += lp.value || 0;
      }
    } catch (e) {
      console.error(`Error fetching LP positions for ${chainName}: ${e.message}`);
    }
  }
}

portfolio.totals.total = portfolio.totals.stables + portfolio.totals.positions + portfolio.totals.lp;

// ─────────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────────
if (args.raw !== undefined) {
  console.log(JSON.stringify(portfolio, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2));
  process.exit(0);
}

// Aggregate by market+outcome: combine token balance + LP holdings
const marketData = {};
let totalLpCollateral = 0;

// Add outcome positions to markets
for (const p of portfolio.positions) {
  const key = p.marketName || p.marketId;
  if (!marketData[key]) {
    marketData[key] = { name: p.marketName, chain: p.chain, marketId: p.marketId, outcomes: {}, totalValue: 0 };
  }
  const oKey = p.outcome;
  if (!marketData[key].outcomes[oKey]) {
    marketData[key].outcomes[oKey] = { name: oKey, balance: 0, lpHoldings: 0, price: p.price, value: 0 };
  }
  marketData[key].outcomes[oKey].balance += p.balance;
  marketData[key].outcomes[oKey].value += p.value || 0;
  marketData[key].totalValue += p.value || 0;
}

// Add LP positions - merge outcome tokens into outcomes, track collateral separately
for (const lp of portfolio.lpPositions) {
  const key = lp.marketName || lp.market;
  if (!marketData[key]) {
    marketData[key] = { name: lp.marketName, chain: lp.chain, marketId: lp.market, outcomes: {}, totalValue: 0 };
  }
  const oKey = lp.outcomeName || "?";
  if (!marketData[key].outcomes[oKey]) {
    marketData[key].outcomes[oKey] = { name: oKey, balance: 0, lpHoldings: 0, price: lp.outcomePrice, value: 0 };
  }
  // Add LP outcome tokens to the outcome
  marketData[key].outcomes[oKey].lpHoldings += lp.outcomeAmount || 0;
  const lpOutcomeValue = (lp.outcomeAmount || 0) * (lp.outcomePrice || 0);
  marketData[key].outcomes[oKey].value += lpOutcomeValue;
  marketData[key].totalValue += lpOutcomeValue;
  // Track LP collateral separately (adds to stables)
  totalLpCollateral += lp.collateralAmount || 0;
}

// Recalculate totals
const totalStables = portfolio.totals.stables + totalLpCollateral;
const totalMarkets = Object.values(marketData).reduce((s, m) => s + m.totalValue, 0);
const grandTotal = totalStables + totalMarkets;

// Print
console.log(`\n=== Portfolio: $${grandTotal.toFixed(2)} ===\n`);

// Stables (balance + LP collateral)
const nonZeroBalances = portfolio.balances.filter(b =>
  b.native.balance > 0n || b.collateral.balance > 0n || (b.underlying?.balance || 0n) > 0n
);
if (nonZeroBalances.length > 0 || totalLpCollateral > 0) {
  console.log(`--- Stables: $${totalStables.toFixed(2)} ---`);
  for (const bal of nonZeroBalances) {
    const parts = [];
    if (bal.native.balance > 0n) parts.push(`${Number(formatEther(bal.native.balance)).toFixed(2)} ${bal.native.symbol}`);
    if (bal.collateral.balance > 0n) parts.push(`${Number(formatEther(bal.collateral.balance)).toFixed(2)} ${bal.collateral.symbol}`);
    if (bal.underlying?.balance > 0n) parts.push(`${Number(formatEther(bal.underlying.balance)).toFixed(2)} underlying`);
    console.log(`${bal.chain}: ${parts.join(", ")}`);
  }
  if (totalLpCollateral > 0.001) {
    console.log(`LP collateral: ${totalLpCollateral.toFixed(2)}`);
  }
  console.log();
}

// Markets - combined view
const markets = Object.values(marketData).sort((a, b) => b.totalValue - a.totalValue);
if (markets.length > 0) {
  console.log(`--- Markets: $${totalMarkets.toFixed(2)} ---`);

  for (const m of markets) {
    const shortName = m.name.length > 60 ? m.name.slice(0, 57) + "..." : m.name;
    console.log(`"${shortName}" [${m.chain}]`);

    // Each outcome on its own line, combining balance + LP
    for (const o of Object.values(m.outcomes)) {
      const total = o.balance + o.lpHoldings;
      const price = o.price ? `${(o.price * 100).toFixed(0)}¢` : "?";
      const value = total * (o.price || 0);
      console.log(`  ${o.name} ${total.toFixed(2)} @ ${price} = $${value.toFixed(2)}`);
    }
  }
  console.log();
}
