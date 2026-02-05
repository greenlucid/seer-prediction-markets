# Creating Markets: Basic Guide

## Why Create Prediction Markets?

Prediction markets aggregate information through financial incentives. Poor question design = disputes, invalid resolution, and financial loss.

---

## Writing Objective, Resolvable Questions

Before creating a market, think carefully about what you want to predict. A poorly-worded question leads to disputes, ambiguity, and potential financial loss. This is an art: Seer doesn't allow separate policies or terms, so everything must fit in the question itself. No length limit, but don't abuse it.

### Pre-creation checklist

Ask yourself:

- ✅ **Does a similar market already exist?** (Search first — see [DISCOVERING-MARKETS.md](DISCOVERING-MARKETS.md))
- ✅ **What exactly am I trying to predict?** (Specific event, outcome, or metric)
- ✅ **Has this already happened?** (Search recent news, check official sources)
- ✅ **Can this be objectively verified?** (Zero subjectivity, clear source of truth)
- ✅ **Are edge cases covered?** (What happens if X, Y, or Z occurs?)
- ✅ **Is every term defined precisely?** (Avoid "general," "significant," "widely," etc.)
- ✅ **What source will resolve this?** (If unclear, specify exact source in the question)

---

### Resolution policy

Read [abridged-resolution-policy.md](abridged-resolution-policy.md) for full rules on what makes markets INVALID.

---

### Examples: Bad vs Good Questions

| Bad | Why It Fails | Good |
|-----|--------------|------|
| "Will AI be good?" | Subjective, no resolution criteria | "Will OpenAI release GPT-5 before July 2026?" |
| "ETH price?" | Vague timeframe and price point | "Will ETH trade above $5000 on Binance at 00:00 UTC on 2027-01-01?" |
| "Will Google make Genie widely available?" | "Widely" is vague, no deadline | "Will Google announce public access to Genie for paid users of at least 10 different countries before 2027-01-01?" |
| "Will Trump win in 2 years?" | Relative date | "Will Trump win the 2028 US presidential election?" |
| "Will there be a good movie in 2027?" | Subjective ("good") | "Will a movie gross over $1B worldwide in 2027 according to Box Office Mojo?" |

---

## Market Types: When to Use Each

### Categorical (Yes/No or multiple choice)

**Use for:** Binary outcomes or discrete choices with one correct answer.

**Examples:**
- "Will X happen before [date]?" (Yes/No)
- "Which party will win the election?" (Labour, Conservative, LibDem)
- "Which movie will win Best Picture?" (Oppenheimer, Barbie, Poor Things)

---

## Creating Your First Market

### Step 1: Research the topic

Search current news, verify the event hasn't happened, and identify resolution sources.

**Required before proceeding:**
- WebSearch or WebFetch recent news about the topic
- Check if the event has already occurred
- Confirm your resolution source exists and is accessible

---

### Step 2: Design the question

Use the checklist above and verify your question against the [resolution policy](abridged-resolution-policy.md).

**Question template for beginners:**
```
Will [specific event] happen [according to source] before [absolute date/time in UTC]?
```

**Example:**
```
Will SpaceX successfully land humans on Mars according to NASA announcements before 2030-12-31 23:59 UTC?
```

---

### Step 3: Choose outcomes and resolution source

**Outcomes:**
- Yes/No markets: Use "Yes,No" with tokens "YES,NO"
- Multiple choice: List all realistic outcomes. If unsure, add "Other" as a catch-all.

**Resolution source:**
Include in the question if not obvious:
- "according to [official source]"
- "as reported by [credible outlet]"
- "per [specific metric/database]"

**Examples:**
- "according to official OpenAI announcements"
- "as reported by at least 3 of: NYT, WSJ, Reuters, AP"
- "per CoinMarketCap historical data"

---

### Step 4: Understand `--opening-time`

**`--opening-time`** = earliest moment Reality.eth accepts answers.

**Omit** (defaults to now) if answer can be known before deadline. Example: "Will X announce Y before March?" - if announced in January, answer is YES immediately.

**Set to specific date** if unknowable until then. Example: "Will ETH trade above $5000 on 2027-01-01?" - set `--opening-time 2027-01-02` (day after event).

---

## ⛔ STOP — Before Running create-market.mjs

Do NOT proceed until you have searched current news and verified the event hasn't already happened.

---

### Step 5: Create the market

**Basic categorical market (Yes/No):**
```bash
node create-market.mjs --type categorical \
  --name "Will OpenAI release GPT-5 before 2026-07-01 00:00 UTC?" \
  --outcomes "Yes,No" \
  --tokens "YES,NO" \
  --category technology \
  --min-bond 5
```

**Multiple choice market:**
```bash
node create-market.mjs --type categorical \
  --name "Which team will win the 2026 World Cup?" \
  --outcomes "Brazil,Argentina,France,Germany,Other" \
  --tokens "BRA,ARG,FRA,GER,OTHER" \
  --category sports \
  --opening-time 2026-07-20 \
  --min-bond 10
```

**Returns:** Market address and outcome token addresses. Save these for answering, resolving, and monitoring.

---

### Step 6: Fund and monitor

After creating the market:

- **Add to portfolio tracking** (recommended) - see [MONITORING-MARKETS.md](MONITORING-MARKETS.md) for format
- **Set HEARTBEAT reminder** to monitor regularly - see [MONITORING-MARKETS.md](MONITORING-MARKETS.md#heartbeat-integration)
- **Answer after opening time** when outcome is known - see [MONITORING-MARKETS.md](MONITORING-MARKETS.md#answering-realityeth-questions)

---

## After Creation

Once your market is created:

- **Monitor Reality.eth** for answers (see [MONITORING-MARKETS.md](MONITORING-MARKETS.md))
- **Answer when appropriate** (you created it, you should ensure correct resolution)
- **Resolve after finalization** (~3.5 days after first answer)
- **Trade or provide liquidity** if you have a view on the outcome

---

## Next Steps

- **Learn advanced market types:** [CREATING-MARKETS-ADVANCED.md](CREATING-MARKETS-ADVANCED.md)
- **Monitor and resolve your market:** [MONITORING-MARKETS.md](MONITORING-MARKETS.md)
- **Trade on your market:** [TRADING.md](TRADING.md)
- **Provide liquidity:** [LIQUIDITY-PROVISION.md](LIQUIDITY-PROVISION.md)
