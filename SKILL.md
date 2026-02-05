---
name: seer-prediction-markets
description: "Create, trade, resolve, monitor and provide liquidity in prediction markets on Seer (seer.pm) across multiple chains (Gnosis, Base, Optimism, Mainnet). Use when interacting with prediction markets, conditional tokens, and Reality.eth oracles."
---

# Seer Prediction Markets Skill

> **Setup**: All scripts need `PRIVATE_KEY` env var (except read-only ones). Optional `RPC_URL` (defaults to chain-specific public RPC), `CHAIN` (defaults to `gnosis`).
>
> **⚠️ Run scripts sequentially.** Parallel transactions will fail with nonce collisions.
>
> **⚠️ Do NOT create batch/automation scripts.** Use existing scripts one at a time. Be patient, work through tasks step-by-step rather than trying to automate everything into a single script. This skill is comprehensive and should have everything you need.
>
> **⚠️ Do NOT edit skill files.** If you find bugs, issues, or missing functionality in these scripts/docs, report them to the user instead of fixing them yourself. Say what's broken and let them decide how to handle it.

---

## What is Seer?

Seer is a decentralized prediction market platform deployed on multiple chains. It combines:
- **Conditional Tokens** (Gnosis) - outcome tokens that represent predictions
- **Reality.eth** - decentralized oracle for resolving questions with bonded challenge mechanism
- **DEX integration** - SwaprV3 (Gnosis) or Uniswap V3 (other chains) for trading

**Core concept:** Create a market → Trade on outcomes → Oracle resolves → Winners redeem 1:1 for collateral.

---

## Multi-Chain Support

Seer is deployed on 4 chains. Use `--chain <name>` flag or `CHAIN` env var (defaults to `gnosis`).

| Chain | Collateral (Yield-Bearing) | Underlying Asset | Native Token (Gas) | DEX |
|-------|---------------------------|------------------|-------------------|-----|
| `gnosis` (default) | sDAI | xDAI | xDAI | SwaprV3 (Algebra) |
| `base` | sUSDS | USDS | ETH | Uniswap V3 |
| `optimism` | sUSDS | USDS | ETH | Uniswap V3 |
| `mainnet` | sDAI | DAI | ETH | Uniswap V3 |

**Token hierarchy:**
- **Collateral**: Yield-bearing wrapper (sDAI/sUSDS earns ~5% APY)
  - sDAI wraps and yields DAI (or xDAI on Gnosis)
  - sUSDS wraps and yields USDS
- **Underlying**: The base stablecoin (DAI/USDS/xDAI)
- **Native token**: Only used for gas fees (ETH/xDAI)

**Usage:** Add `--chain base` to any script, or `export CHAIN=base`

**Getting collateral:**
- Use `convert-collateral.mjs` to wrap/unwrap collateral tokens
- `gnosis`: xDAI ↔ sDAI (xDAI is the underlying)
- `mainnet`: DAI ↔ sDAI
- `base`/`optimism`: USDS ↔ sUSDS
- Requires underlying token in wallet (acquire via DEX, bridge, or faucet)

**Sharing markets with humans:**

Humans always need a Seer link to interact with a market, construct the URL:
```
https://app.seer.pm/markets/<chain-id>/<market-address>
```

Chain IDs: `100` (Gnosis), `8453` (Base), `10` (Optimism), `1` (Mainnet)

Example: `https://app.seer.pm/markets/100/0xabc...`

See [DISCOVERING-MARKETS.md](DISCOVERING-MARKETS.md) for programmatic market discovery via APIs.

---

## Key Concepts

### Market types

| Question Type | Market Type | Create Function | Notes |
|---|---|---|---|
| Will X happen? | **Categorical** | `createCategoricalMarket` | `marketName` = the question, outcomes = options |
| What number? | **Scalar** | `createScalarMarket` | `lowerBound`, `upperBound`, outcomes = ["Low","High"] |
| How to split value across options? | **Multi-Scalar** | `createMultiScalarMarket` | `questionStart`/`questionEnd`/`outcomeType` build per-outcome questions |

See [CREATING-MARKETS-BASIC.md](CREATING-MARKETS-BASIC.md) for categorical markets and [CREATING-MARKETS-ADVANCED.md](CREATING-MARKETS-ADVANCED.md) for scalar/multi-scalar/conditional.

---

### Resolution flow

1. `openingTime` passes
2. Anyone submits an answer on Reality.eth with a bond in native token
3. Anyone can challenge with a 2x bond (different answer)
4. Bond-doubling continues until timeout (~3.5 days) with no challenge → answer finalizes
5. Call `RealityProxy.resolve()` to report payouts on-chain
6. Redeem winning tokens for collateral

See [MONITORING-MARKETS.md](MONITORING-MARKETS.md) for detailed workflow.

---

## Setup

**Dependencies:** Install viem globally:
```bash
npm install -g viem
```

**Contract addresses:** See `scripts/config/chains.mjs` for all Seer contracts across all supported chains.

**Wallet setup:** Checks if you have a wallet configured, and helps you create one if you don't.
```bash
node setup.mjs
```

**Funding:** If balances are zero (e.g. freshly generated wallet), ask the human which chain they want to use and request they send the chain's stablecoin + native token for gas to the wallet address:
- `gnosis`: xDAI (stablecoin + gas)
- `mainnet`: DAI + ETH (gas)
- `base`: USDS + ETH (gas)
- `optimism`: USDS + ETH (gas)

---

## Useful Links

- Seer App: https://seer.pm
- Seer Docs: https://seer-3.gitbook.io/seer-documentation
- Seer GitHub: https://github.com/seer-pm/demo
- Reality.eth: https://reality.eth.limo
- Gnosis Scan: https://gnosisscan.io

---

## Documentation Index

| Guide | Purpose |
|-------|---------|
| [TRADING.md](TRADING.md) | Buy/sell outcome tokens, manage positions, redeem winners |
| [CREATING-MARKETS-BASIC.md](CREATING-MARKETS-BASIC.md) | Create yes/no and multiple-choice markets |
| [CREATING-MARKETS-ADVANCED.md](CREATING-MARKETS-ADVANCED.md) | Scalar, multi-scalar, and conditional markets |
| [LIQUIDITY-PROVISION.md](LIQUIDITY-PROVISION.md) | Concentrated liquidity, probability modeling, risk management |
| [MONITORING-MARKETS.md](MONITORING-MARKETS.md) | Portfolio tracking, answering questions, resolution workflow |
| [DISCOVERING-MARKETS.md](DISCOVERING-MARKETS.md) | Browse markets via API, share markets with humans |
| [abridged-resolution-policy.md](abridged-resolution-policy.md) | Avoid INVALID markets, resolution rules |

All scripts are in `scripts/`. See the relevant guide for usage.
