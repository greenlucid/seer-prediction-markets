# Liquidity Provision Strategy

---

## ⚠️ LP Risk Warning

**Liquidity provision on outcome tokens is NOT passive income.**

Unlike traditional AMM LP (Uniswap, Curve), prediction market LP has unique risks:

- **Impermanent loss is guaranteed** as prices move toward 0 or 1 at resolution
- **Time decay** accelerates as the opening date approaches
- **Binary outcomes** mean prices don't mean-revert like normal assets
- **Active management required** - you must monitor news and withdraw before major events

**Key principle:** If you're not willing to check your positions daily and withdraw on short notice, don't provide liquidity. Trade instead.

See [TRADING.md](TRADING.md) for directional strategies.

---

## Setup (One-Time Per Chain)

**Before providing liquidity, approve collateral to Router:**

```bash
node approve-router.mjs [--chain base]
```

See [TRADING.md](TRADING.md) for details.

---

## What is Liquidity Provision?

### The basics

**Liquidity providers (LPs):**
- Deposit both outcome tokens (e.g., YES + NO) into concentrated liquidity pools
- Earn swap fees when traders buy/sell
- Accept impermanent loss risk as prices move

**Traders:**
- Buy one outcome token (e.g., YES)
- Pay swap fees to LPs
- Profit if their outcome wins

**Example:**
- You add 50 YES + 50 NO as liquidity to a pool
- Traders swap, paying 0.3% fees
- You earn fees but your position becomes imbalanced as prices move

---

### Why provide both-sided liquidity?

There are a few distinct reasons you'd LP on multiple (or all) outcomes:

1. **Offload the side you don't want.** You believe outcome A is most likely, so you provide liquidity on outcomes B, C, etc. — the ones you *don't* want to hold. Traders buy those tokens from your pools. You withdraw later and keep your preferred outcome tokens. This is a directional play disguised as LP.

2. **Price discovery.** You don't know the real odds and it would be valuable to find out. By providing liquidity on all sides, you sacrifice some capital to IL so that better-informed traders reveal a more accurate probability through their trades. Useful when you created the market and need signal before taking a position.

3. **Fee farming on volatile markets.** If you expect high trading volume and price swings, you can profit from swap fees alone. The more volatile the market, the more swaps happen through your range. **Tip:** Do this on Gnosis or Base where gas is cheap — not on Mainnet or Optimism where gas eats your fee profits.

4. **Seer airdrop farming.** Seer distributes SEER tokens daily to LPs and outcome token holders. You can also deposit LP NFTs into farming contracts for extra rewards. See [AIRDROP-FARMING.md](AIRDROP-FARMING.md) for the full breakdown.

---

### When to provide liquidity (vs trading)

| **Provide Liquidity if:**                  | **Trade instead if:**                       |
|---------------------------------------------|---------------------------------------------|
| You're neutral on the outcome               | You have a directional view (YES or NO)     |
| You can monitor daily and withdraw quickly  | You want set-and-forget exposure            |
| You want fee revenue                        | You want simple profit/loss                 |
| Market is early (weeks/months to resolution)| Resolution is imminent (days/hours away)    |
| You understand impermanent loss             | You don't want to manage risk actively      |

**Rule of thumb:** LP early, trade late. Provide liquidity when the market is new and resolution is distant. Switch to directional trading as the event approaches.

---

## Probability Modeling for LP Ranges

When adding liquidity, **do not use arbitrary wide ranges**. Instead, model the probability distribution for each outcome.

### The two-step process

1. **Initial odds**: Your best estimate of the true probability based on research
2. **Defensible range**: The uncertainty bounds based on available information

**Example: "Will OpenAI release GPT-5 before 2026-07-01?"**

**Step 1: Research and estimate**
- Current evidence: No official announcement, but GPT-4.5 was released 18 months after GPT-4
- Timeline: 6 months until deadline
- Probability estimate: 30% YES, 70% NO

**Step 2: Define defensible range**
- **YES range:** Could plausibly be as low as 15% (if OpenAI delays) or as high as 40% (if leaks/announcements emerge)
- **NO range:** Inverse of YES, so 60% to 85%

**Parameters:**
```bash
# YES pool
--prob-low 0.15 --prob-high 0.40

# NO pool
--prob-low 0.60 --prob-high 0.85
```

---

### Why tight ranges matter

| Range Width | Capital Efficiency | Risk | Best For |
|-------------|-------------------|------|----------|
| 10-20% spread | Excellent | High concentration | Strong conviction, active management |
| 20-30% spread | Good | Balanced | Moderate conviction, regular monitoring |
| 30-50% spread | Poor | Lower risk but less fees | Uncertain outcomes, passive approach |
| 50%+ spread | Terrible | Wasted capital | **Don't do this** |

**Bad:** `--prob-low 0.2 --prob-high 0.8` (60% spread, no thought, wastes capital)
**Good:** `--prob-low 0.15 --prob-high 0.4` (25% spread, researched uncertainty, concentrated liquidity)

**Why tight ranges are better:**
- More fee revenue (traders interact with your liquidity more often)
- Better price discovery (tighter spreads for traders)
- Clearer signal of your conviction

**Trade-off:** Tighter ranges = higher impermanent loss if price moves outside your range.

---

## Complete LP Workflow

### 1. Create market or find existing

**Create your own:**
```bash
node create-market.mjs --type categorical \
  --name "Will OpenAI release GPT-5 before 2026-07-01 00:00 UTC?" \
  --outcomes "Yes,No" \
  --tokens "YES,NO" \
  --category technology \
  --min-bond 5
```

Save the market address and outcome token addresses.

**OR find existing market:**
```bash
node read-market.mjs --market 0x...
```

---

### 2. Model probability ranges

Research the question:
- What's the base rate for similar events?
- What evidence exists?
- What could shift the odds significantly?

Determine:
1. Initial probability for each outcome
2. Plausible range based on uncertainty

**Document your reasoning** — you can verify your positions later with `get-positions.mjs` (see [step 7](#7-monitor-and-manage)).

---

### 3. Dry-run to calculate token amounts

Run dry-run for each outcome to see exact amounts needed:

```bash
# YES pool (15-40% range)
node add-liquidity.mjs --outcome-token 0x<YES-token> \
  --budget-sdai 0.5 \
  --prob-low 0.15 \
  --prob-high 0.40 \
  --dry-run

# NO pool (60-85% range)
node add-liquidity.mjs --outcome-token 0x<NO-token> \
  --budget-sdai 0.5 \
  --prob-low 0.60 \
  --prob-high 0.85 \
  --dry-run
```

**Output example:**
```
Budget: 0.5 sDAI = 0.61 xDAI equivalent
Needed: 0.35 outcome tokens + 0.26 sDAI
```

**Add up totals across all outcomes:**
- Total outcome tokens needed: 0.35 (YES) + 0.35 (NO) = 0.7
- Total sDAI needed: 0.26 (YES) + 0.26 (NO) = 0.52

---

### 4. Acquire tokens

**Step 4a: Split collateral into outcome tokens**
```bash
# Get 0.7 YES + 0.7 NO
node split-collateral.mjs --market 0x... --amount 0.7
```

**Step 4b: Convert xDAI to sDAI**
```bash
# Get sDAI for liquidity pools
node convert-sdai.mjs --direction deposit --amount 0.55
```

**Why sDAI?** sDAI earns ~5% APY from Gnosis staking. Keep funds in sDAI unless you need xDAI for gas.

---

### 5. Add liquidity

Add liquidity to each outcome's pool:

```bash
# YES pool
node add-liquidity.mjs --outcome-token 0x<YES-token> \
  --market 0x<market-address> \
  --budget-sdai 0.5 \
  --prob-low 0.15 \
  --prob-high 0.40

# NO pool
node add-liquidity.mjs --outcome-token 0x<NO-token> \
  --market 0x<market-address> \
  --budget-sdai 0.5 \
  --prob-low 0.60 \
  --prob-high 0.85
```

**Output:**
```
Position token ID: 123
Actual outcome token used: 0.34
Actual sDAI used: 0.25
LP position minted. Block 12345.
Position saved to LP tracker.
```

Position IDs and market context are auto-saved to the LP tracker (`~/.openclaw/workspace/memory/lp-positions.json`). Pass `--market` to record market name and outcome name automatically.

---

### 6. Cleanup complete sets

Concentrated liquidity rarely uses exact amounts. You'll have leftover tokens.

**Merge all complete sets:**
```bash
node merge-redeem.mjs --mode merge --market 0x... --amount max
```

**Output:**
```
Balances: [0.36, 0.35]
Min balance (max mergeable): 0.35
Merging 0.35 complete sets back to sDAI...
```

**Result:**
- 0.35 complete sets → 0.35 sDAI
- Leftover: 0.01 YES (can't merge without matching NO)

Keep leftover sDAI (earns yield). If remainders > 30% of budget, adjust ranges and retry.

---

### 7. Monitor and manage

**Check your positions anytime:**
```bash
node get-positions.mjs        # ERC20 outcome token balances (API)
node get-lp-positions.mjs     # LP NFT positions (local tracker)
node get-lp-positions.mjs --live  # LP positions with on-chain liquidity check
```

**Set up HEARTBEAT:** See [MONITORING-MARKETS.md](MONITORING-MARKETS.md#heartbeat-integration).

**Regular monitoring:** See [Risk Management](#risk-management-for-lps) below.

---

## Risk Management for LPs

### When to withdraw immediately

Withdraw liquidity if **any** of these conditions are met:

1. **Opening time approaching** (< 1 week away)
   - Prices accelerate toward 0 or 1
   - Impermanent loss compounds rapidly
   - **Action:** Withdraw, merge complete sets, decide whether to trade or exit

2. **Major news breaks** (odds shift > 20%)
   - Example: "Will OpenAI release GPT-5?" → Sam Altman announces release date
   - Your probability model is invalidated
   - **Action:** Withdraw, reassess, decide whether to re-add with new ranges

3. **One outcome crosses 80%** probability
   - Market is pricing in near-certainty
   - Your LP position is becoming one-sided (mostly holding the losing token)
   - **Action:** Withdraw before impermanent loss eats all profits

4. **Market resolves INVALID** risk emerges
   - Example: Question has ambiguity you didn't notice
   - Reality.eth might resolve INVALID → all tokens worthless
   - **Action:** Withdraw and exit

---

### Impermanent loss explained

**What is impermanent loss (IL)?**

IL occurs when the price ratio of your deposited assets changes. In prediction markets, IL is **permanent** because prices converge to 0 or 1 at resolution.

**Example:**

| Event | YES Price | Your Position | Value |
|-------|-----------|---------------|-------|
| **Add liquidity** | 0.50 | 50 YES + 50 NO | 50 sDAI |
| **Trade flows in** (YES underpriced) | 0.40 | 60 YES + 42 NO | 46 sDAI (loss of fees + IL) |
| **News breaks** (YES likely) | 0.80 | 30 YES + 58 NO | 48 sDAI |
| **Resolution** (YES wins) | 1.00 | 20 YES + 60 NO | 20 sDAI (huge IL) |

**Compare to holding:**
- If you held 50 YES + 50 NO (no LP), final value = 50 sDAI
- LP final value = 20 sDAI (IL ate 30 sDAI)

**But you earned fees:**
- Swap fees collected: 5 sDAI
- Net loss: 25 sDAI

**Lesson:** IL can outweigh fees in prediction markets. Withdraw before prices hit extremes (0.2 or 0.8+).

---

### Rebalancing strategy

If new information emerges but the market is still weeks away from resolution:

**Step 1: Withdraw liquidity**
```bash
node withdraw-liquidity.mjs --token-id 123
```

**Step 2: Merge complete sets**
```bash
node merge-redeem.mjs --mode merge --market 0x... --amount max
```

**Step 3: Reassess probability**
- New YES odds: 60% (was 30%)
- New defensible range: 50-70% (was 15-40%)

**Step 4: Choose strategy**

| Strategy | When to Use | Action |
|----------|-------------|--------|
| **Exit** | Lost conviction, resolution imminent | Sell remaining imbalanced tokens, convert sDAI to xDAI |
| **Conservative** | Uncertainty increased | Re-add with smaller budget, tighter range |
| **Double down** | Conviction strengthened | Re-add with larger budget |
| **Shift range** | Probability changed but conviction same | Re-add with new `--prob-low` / `--prob-high` |

**Step 5: Re-add liquidity** (if not exiting)
```bash
node add-liquidity.mjs --outcome-token 0x<YES-token> \
  --market 0x<market-address> \
  --budget-sdai 0.4 \
  --prob-low 0.50 \
  --prob-high 0.70
```

New positions are auto-saved to the LP tracker. Verify with `node get-lp-positions.mjs`.

---

## Scripts Reference

### add-liquidity.mjs (concentrated LP)

**Add liquidity with sDAI budget (recommended):**
```bash
node add-liquidity.mjs --outcome-token 0x... \
  --budget-sdai 0.5 \
  --prob-low 0.15 \
  --prob-high 0.40
```

**Add liquidity with xDAI budget:**
```bash
node add-liquidity.mjs --outcome-token 0x... \
  --budget-xdai 0.6 \
  --prob-low 0.15 \
  --prob-high 0.40
```

**Dry-run (calculate amounts without transacting):**
```bash
node add-liquidity.mjs --outcome-token 0x... \
  --budget-sdai 0.5 \
  --prob-low 0.15 \
  --prob-high 0.40 \
  --dry-run
```

**Parameters:**
- `--outcome-token`: Address of the outcome token (e.g., YES or NO)
- `--market` (optional): Market address — enables auto-tracking with market name + outcome name
- `--budget-sdai` OR `--budget-xdai`: Total value for this pool (choose one)
- `--prob-low`: Lower bound of probability range (0-1)
- `--prob-high`: Upper bound of probability range (0-1)
- `--dry-run` (optional): Print amounts without executing transactions
- `--init-prob` (optional): Initial pool price (defaults to midpoint of range)
- `--tick-spacing` (optional): Tick spacing for Algebra pools (default: 60)

**Output:**
```
Position token ID: 123
Actual outcome token used: 0.34
Actual sDAI used: 0.25
LP position minted. Block 12345.
Position saved to LP tracker.
```

**Note:** Concentrated liquidity rarely uses exact amounts. After adding liquidity to all outcomes, merge remaining complete sets back to sDAI with `merge-redeem.mjs --mode merge --amount max`.

---

### withdraw-liquidity.mjs

**List all LP positions:**
```bash
node withdraw-liquidity.mjs --list
```

**Withdraw specific position:**
```bash
node withdraw-liquidity.mjs --token-id 12345
```

Fully exits an LP position: decreases liquidity to zero, collects tokens, and burns the NFT position.

**After withdrawing:** Always merge complete sets back to sDAI:
```bash
node merge-redeem.mjs --mode merge --market 0x... --amount max
```

---

### get-lp-positions.mjs

**Show tracked LP positions:**
```bash
node get-lp-positions.mjs             # active positions
node get-lp-positions.mjs --all       # include withdrawn
node get-lp-positions.mjs --live      # with on-chain liquidity check
node get-lp-positions.mjs --raw       # full JSON
```

Reads from `~/.openclaw/workspace/memory/lp-positions.json` (auto-populated by `add-liquidity.mjs`).

---

### get-positions.mjs

**Check your holdings via the API:**
```bash
node get-positions.mjs
```

Shows all your ERC20 outcome token positions across all chains — market name, status, outcome, balance. Does **not** show LP positions (use `get-lp-positions.mjs` for that).

See [MONITORING-MARKETS.md](MONITORING-MARKETS.md) for full monitoring guide.

---

## Next Steps

- **Airdrop & farming:** [AIRDROP-FARMING.md](AIRDROP-FARMING.md)
- **Monitor your positions:** [MONITORING-MARKETS.md](MONITORING-MARKETS.md)
- **Understand resolution:** [abridged-resolution-policy.md](abridged-resolution-policy.md)
- **Learn to trade:** [TRADING.md](TRADING.md)
- **Create markets:** [CREATING-MARKETS-BASIC.md](CREATING-MARKETS-BASIC.md)
