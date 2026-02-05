# Trading on Seer

Take positions by buying/selling outcome tokens. Winners redeem 1:1 for collateral after resolution.

---

## Setup (One-Time Per Chain)

**Approve collateral to Router (checks current approval, auto-approves if needed):**

```bash
node approve-router.mjs [--chain base]
```

Script checks if approval is below 1M tokens and automatically max approves if needed. Run once per chain you want to trade on.

---

## Long vs Short

### Long A (bet A wins)

**Path 1: Buy A directly**
```bash
node swap.mjs --mode buy --outcome-token 0x<A-token> --amount-in 10
```

**Path 2: Mint complete set, sell all other outcomes**
```bash
# Get 10 of each outcome
node split-collateral.mjs --market 0x... --amount 10

# Sell all outcomes except A
node swap.mjs --mode sell --outcome-token 0x<B-token> --amount-in 10
# Repeat for C, D, E... if multi-outcome market
```

---

### Short A (bet A loses)

**Path 1: Mint complete set, sell A**
```bash
node split-collateral.mjs --market 0x... --amount 10
node swap.mjs --mode sell --outcome-token 0x<A-token> --amount-in 10
```

**Path 2: Buy all other outcomes**
```bash
node swap.mjs --mode buy --outcome-token 0x<B-token> --amount-in 5
# Repeat for C, D, E... if multi-outcome market
```

---

### Which path to use

| Situation | Best Path | Why |
|-----------|-----------|-----|
| Low liquidity | Path 2 (mint+sell) | Lower slippage |
| High liquidity | Path 1 (direct) | Simpler |
| Large trades | Path 2 (mint+sell) | Minimize price impact |

---

## Reading Markets

```bash
node read-market.mjs --market 0x...
```

Shows:
- Outcome token addresses (needed for swap.mjs)
- Resolution status
- Question ID

---

## Closing Positions

### Exit before resolution

```bash
# Sell your Long position
node swap.mjs --mode sell --outcome-token 0x<A-token> --amount-in 10
```

### Redeem after resolution (winners only)

```bash
node merge-redeem.mjs --mode redeem --market 0x... --outcome-index 0 --amount 10
```

**Outcome indices:**
- `0` = first outcome (usually YES)
- `1` = second outcome (usually NO)
- `2+` = additional outcomes in multi-outcome markets

Losing tokens are worthless after resolution.

---

## Risk

- **INVALID markets = total loss** → read [abridged-resolution-policy.md](abridged-resolution-policy.md) before trading
- **Check liquidity** → large trades have slippage
- **Redeem winners** → delay = lost sDAI yield (~5% APY)

---

## Scripts

### swap.mjs

Buy or sell outcome tokens via SwaprV3.

**Buy:**
```bash
node swap.mjs --mode buy --outcome-token 0x... --amount-in 10
```

**Sell:**
```bash
node swap.mjs --mode sell --outcome-token 0x... --amount-in 5
```

**Parameters:**
- `--mode`: `buy` or `sell`
- `--outcome-token`: Token address (get from `read-market.mjs`)
- `--amount-in`: Amount to spend (buy) or sell (sell)

---

### split-collateral.mjs

Mint complete sets (equal amounts of all outcomes).

```bash
node split-collateral.mjs --market 0x... --amount 10
```

Converts 10 sDAI → 10 of each outcome token.

**Use for:**
- Path 2 strategies (mint + sell others)
- Getting neutral positions before providing liquidity

---

### merge-redeem.mjs

**Merge complete sets back to sDAI:**
```bash
node merge-redeem.mjs --mode merge --market 0x... --amount 10

# Auto-merge all complete sets:
node merge-redeem.mjs --mode merge --market 0x... --amount max
```

**Redeem winners after resolution:**
```bash
node merge-redeem.mjs --mode redeem --market 0x... --outcome-index 0 --amount 10
```

---

### Portfolio tracking

See [MONITORING-MARKETS.md](MONITORING-MARKETS.md) for portfolio tracking and balance checking.

---

## Next Steps

- **Monitor positions:** [MONITORING-MARKETS.md](MONITORING-MARKETS.md)
- **Understand resolution:** [abridged-resolution-policy.md](abridged-resolution-policy.md)
- **Explore LP strategies:** [LIQUIDITY-PROVISION.md](LIQUIDITY-PROVISION.md)
