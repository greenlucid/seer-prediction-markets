# Advanced Market Creation

## Market Types Overview

| Type | Use Case | Example |
|------|----------|---------|
| **Scalar** | Single continuous numeric outcome within bounds | "What will ETH price be on 2027-01-01?" (bounds: $1000-$20000) |
| **Multi-Scalar** | Multiple numeric outcomes that sum/allocate | "How many seats will each party win?" (Labour/Conservative/LibDem, sum to 650) |
| **Conditional** | Outcome depends on parent market resolving | "If Trump wins 2028, will he pardon X?" (parent: Trump wins, child: pardon decision) |

---

## Scalar Markets (Continuous Numeric Outcomes)

### When to use scalar

**Use scalar for:**
- Price predictions ("ETH price on 2027-01-01?")
- Continuous metrics ("Global CO2 PPM on 2030-01-01?")
- Counts with wide range ("How many Oscar nominations will Dune 3 receive?")

**Don't use scalar for:**
- Binary outcomes (use categorical instead)
- Discrete choices (use categorical with multiple outcomes)
- Multiple independent numbers (use multi-scalar)

---

### How scalar markets work

Scalar markets have:
1. **Lower bound** - minimum possible value
2. **Upper bound** - maximum possible value
3. **Two outcome tokens** - LOW and HIGH

**Payout logic:**
- answer ≤ lowerBound → LOW 100%, HIGH 0%
- answer ≥ upperBound → LOW 0%, HIGH 100%
- between → proportional split

**Example:** ETH price market with bounds $1000-$20000

| Actual Price | LOW payout | HIGH payout |
|--------------|------------|-------------|
| $500         | 100%       | 0%          |
| $1000        | 100%       | 0%          |
| $5000        | ~79%       | ~21%        |
| $10500       | ~50%       | ~50%        |
| $15000       | ~26%       | ~74%        |
| $20000       | 0%         | 100%        |
| $25000       | 0%         | 100%        |

**Formula:**
```
highShare = (actualValue - lowerBound) / (upperBound - lowerBound)
lowShare = 1 - highShare
```

---

### Creating a scalar market

**Template:**
```bash
node create-market.mjs --type scalar \
  --name "What will [metric] be at [time] according to [source]?" \
  --outcomes "Low,High" \
  --tokens "LOW,HIGH" \
  --category [category] \
  --opening-time YYYY-MM-DD \
  --min-bond 10 \
  --lower-bound [min-value] \
  --upper-bound [max-value]
```

**Example: ETH price prediction**
```bash
node create-market.mjs --type scalar \
  --name "What will ETH/USD price be on Binance at 2027-01-01 00:00 UTC?" \
  --outcomes "Low,High" \
  --tokens "LOW,HIGH" \
  --category crypto \
  --opening-time 2027-01-02 \
  --min-bond 10 \
  --lower-bound 1000 \
  --upper-bound 20000
```

**Example: Climate metric**
```bash
node create-market.mjs --type scalar \
  --name "What will global atmospheric CO2 concentration (PPM) be on 2030-01-01 per NOAA?" \
  --outcomes "Low,High" \
  --tokens "LOW,HIGH" \
  --category science \
  --opening-time 2030-01-15 \
  --min-bond 5 \
  --lower-bound 400 \
  --upper-bound 450
```

**Choosing bounds:**
- **Too narrow:** Answer falls outside bounds → no useful price discovery
- **Too wide:** Most answers cluster near middle → little differentiation
- **Just right:** Captures 95% of plausible outcomes, leaves room for surprises

**Rule of thumb:** Set bounds at 2-3 standard deviations from your best estimate.

---

### Trading scalar markets

Unlike categorical markets (where you buy YES or NO), scalar markets require understanding the payout curve.

**Example strategy:** You think ETH will be $12000 (60% between $1000-$20000 bounds).
- Current HIGH price: 0.4 sDAI (market implies 40% probability of high outcomes)
- Your belief: Should be 0.6 sDAI (60%)
- **Action:** Buy HIGH tokens (underpriced by your model)

If ETH resolves to $12000:
- HIGH payout: ~58% of collateral
- LOW payout: ~42% of collateral

See [TRADING.md](TRADING.md) for execution.

---

## Multi-Scalar Markets (Multiple Numeric Outcomes)

### When to use multi-scalar

**Use for:**
- Allocations that sum to a total ("How many seats will each party win?" → sums to 650)
- Distributions across categories ("What % of votes will each candidate get?" → sums to 100%)
- Portfolio allocations ("Allocate $1M across these 5 investments")

**Don't use for:**
- Independent numbers that don't sum (use separate scalar markets)
- Binary or discrete choices (use categorical)

---

### How multi-scalar works

Each outcome is answered with a numeric value. Payouts are proportional to the reported values.

**Example:** UK election seats (650 total)

| Outcome | Reported Value | Payout % |
|---------|----------------|----------|
| Labour  | 350            | 350/650 = 53.8% |
| Conservative | 180       | 180/650 = 27.7% |
| LibDem  | 70             | 70/650 = 10.8% |
| Other   | 50             | 50/650 = 7.7% |

---

### Creating a multi-scalar market

**Template:**
```bash
node create-market.mjs --type multi-scalar \
  --outcomes "[Outcome1],[Outcome2],[Outcome3]" \
  --tokens "[TOKEN1],[TOKEN2],[TOKEN3]" \
  --question-start "How many [units] will " \
  --question-end " [achieve/win/get]?" \
  --outcome-type [type] \
  --category [category] \
  --opening-time YYYY-MM-DD \
  --min-bond 10 \
  --upper-bound [total-sum]
```

**Example: UK election**
```bash
node create-market.mjs --type multi-scalar \
  --outcomes "Labour,Conservative,LibDem,Other" \
  --tokens "LAB,CON,LIBDEM,OTHER" \
  --question-start "How many seats will " \
  --question-end " win in the 2029 UK general election?" \
  --outcome-type party \
  --category politics \
  --opening-time 2029-07-15 \
  --min-bond 10 \
  --upper-bound 650
```

**Example: Market share allocation**
```bash
node create-market.mjs --type multi-scalar \
  --outcomes "Apple,Samsung,Google,Huawei,Other" \
  --tokens "AAPL,SMSNG,GOOG,HUAW,OTHER" \
  --question-start "What % global smartphone market share will " \
  --question-end " have in Q4 2027 per IDC?" \
  --outcome-type company \
  --category technology \
  --opening-time 2028-01-15 \
  --min-bond 5 \
  --upper-bound 100
```

---

### Trading multi-scalar markets

Multi-scalar tokens pay out proportionally. If you think Labour will win more seats than the market implies:

- Current LAB price: 0.45 sDAI (market implies 45% of seats)
- Your belief: Labour will win 55% of seats
- **Action:** Buy LAB tokens (underpriced by 10 percentage points)

See [TRADING.md](TRADING.md) for execution.

---

## Conditional Markets (Parent/Child Collateral)

### What are conditional markets?

A conditional market uses an outcome token from another market (the "parent") as collateral. The child market only pays out if the parent outcome wins.

**Structure:**
- **Parent market:** "Will Trump win the 2028 election?" (YES/NO)
- **Child market:** "If Trump wins, will he pardon Ross Ulbricht?" (YES/NO)
  - Collateral: YES tokens from parent market
  - Payout: Only if Trump wins (parent YES resolves)

**Use cases:**
- **Conditional predictions:** "If X happens, will Y follow?"
- **Risk hedging:** Hedge specific scenarios within broader outcomes
- **Nested decisions:** Decision trees with dependencies

---

### How conditional markets work

**Payout logic:**
1. Parent market resolves
2. If parent outcome used as collateral LOSES → child tokens worthless
3. If parent outcome WINS → child market pays out normally

**Example:**
- Parent: "Will Trump win 2028?" (YES/NO)
- Child: "If Trump wins, will he pardon Ulbricht?" (collateralized by parent YES)
  - If Trump loses (parent NO wins) → child YES and child NO both worthless
  - If Trump wins (parent YES wins) → child pays out 1:1 for correct answer

---

### Creating a conditional market

**Step 1: Create parent market**
```bash
node create-market.mjs --type categorical \
  --name "Will Trump win the 2028 US presidential election?" \
  --outcomes "Yes,No" \
  --tokens "YES,NO" \
  --category politics \
  --opening-time 2028-11-10 \
  --min-bond 10
```

Save the parent market address (e.g., `0xPARENT123...`).

**Step 2: Create child market**
```bash
node create-market.mjs --type categorical \
  --name "If Trump wins 2028, will he pardon Ross Ulbricht before 2030-01-01?" \
  --outcomes "Yes,No" \
  --tokens "YES,NO" \
  --category politics \
  --opening-time 2030-01-02 \
  --min-bond 5 \
  --parent-market 0xPARENT123... \
  --parent-outcome 0
```

**Parameters:**
- `--parent-market`: Address of the parent market
- `--parent-outcome`: Index of the outcome to use as collateral (0 = first outcome, 1 = second, etc.)

---

### Trading conditional markets

**Conditional hedge strategy:**

You think Trump will win (60% confident) AND will pardon Ulbricht (80% confident if he wins).

**Approach 1: Direct exposure**
1. Buy parent YES (Trump wins)
2. Split parent YES → child YES + child NO
3. Sell child NO (Trump wins but no pardon)
4. Hold: Parent YES + Child YES = "Trump wins AND pardons"

**Approach 2: Hedged exposure**
1. Buy child YES directly
2. If Trump loses, you lose everything
3. If Trump wins and pardons, you win 1:1

**Risk:** Child markets are illiquid initially. Price discovery happens after parent resolves.

See [TRADING.md](TRADING.md) for execution.

---

## Answer Encoding Formats

When markets resolve, answers are encoded as `bytes32` values for Reality.eth.

| Market Type | Answer Format | Example |
|-------------|---------------|---------|
| Categorical | Outcome index (0, 1, 2, ...) | `0x0000000000000000000000000000000000000000000000000000000000000000` (index 0) |
| Scalar | Numeric value | `0x0000000000000000000000000000000000000000000000000000000000002710` (10000 decimal) |
| Multi-Scalar | Each outcome answered separately | Labour: 350, Conservative: 180, LibDem: 70, Other: 50 |
| Invalid | Special value | `0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff` |
| Answered Too Soon | Special value | `0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe` |

**You don't need to encode manually** - the `answer-question.mjs` script handles encoding. Just provide the index or numeric value.

See [MONITORING-MARKETS.md](MONITORING-MARKETS.md#answering-realityeth-questions) for how to answer.

---

## Edge Cases and Resolution Scenarios

### Scalar market edge cases

**Q: What if the answer falls outside bounds?**
A: Values beyond bounds are clamped:
- Below lower bound → treated as lower bound (LOW 100%, HIGH 0%)
- Above upper bound → treated as upper bound (LOW 0%, HIGH 100%)

**Q: What if the source doesn't report the exact time?**
A: Use the closest available data point and specify in the question. Example: "ETH price at 00:00 UTC per Binance daily close (23:59:59 UTC snapshot)."

---

### Multi-scalar edge cases

**Q: What if values don't sum to upper bound?**
A: Payouts are still proportional. If upper bound is 650 but only 600 seats filled, payouts scale to reported values.

**Q: Can one outcome be 0?**
A: Yes. If a party wins 0 seats, that token gets 0% payout.

---

### Conditional market edge cases

**Q: What if parent resolves INVALID?**
A: Child market should also resolve INVALID (all tokens worthless). Check Reality.eth answer carefully.

**Q: What if parent takes months to resolve?**
A: Child market liquidity will be low until parent resolves. Price discovery happens after parent outcome is known.

**Q: Can I nest conditionals multiple levels?**
A: Yes, but liquidity will be extremely thin. Not recommended beyond 2 levels.

---

## Scripts Reference

### create-market.mjs (scalar)

```bash
node create-market.mjs --type scalar \
  --name "[Question with source and time]" \
  --outcomes "Low,High" \
  --tokens "LOW,HIGH" \
  --category [category] \
  --opening-time YYYY-MM-DD \
  --min-bond [amount] \
  --lower-bound [min] \
  --upper-bound [max]
```

---

### create-market.mjs (multi-scalar)

```bash
node create-market.mjs --type multi-scalar \
  --outcomes "[Outcome1],[Outcome2],[Outcome3]" \
  --tokens "[TOKEN1],[TOKEN2],[TOKEN3]" \
  --question-start "How many X will " \
  --question-end " achieve?" \
  --outcome-type [type] \
  --category [category] \
  --opening-time YYYY-MM-DD \
  --min-bond [amount] \
  --upper-bound [total]
```

---

### create-market.mjs (conditional)

```bash
node create-market.mjs --type categorical \
  --name "If [parent outcome], will [child question]?" \
  --outcomes "Yes,No" \
  --tokens "YES,NO" \
  --category [category] \
  --opening-time YYYY-MM-DD \
  --min-bond [amount] \
  --parent-market 0x... \
  --parent-outcome [index]
```

---

## Next Steps

- **Monitor and resolve markets:** [MONITORING-MARKETS.md](MONITORING-MARKETS.md)
- **Trade on scalar/conditional markets:** [TRADING.md](TRADING.md)
- **Provide liquidity:** [LIQUIDITY-PROVISION.md](LIQUIDITY-PROVISION.md)
- **Review resolution policy:** [abridged-resolution-policy.md](abridged-resolution-policy.md)
