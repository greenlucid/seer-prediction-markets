# Monitoring Markets and Portfolio

---

## Checking Your Positions

**See all your token positions (holdings across all chains):**
```bash
node get-positions.mjs
node get-positions.mjs --chain gnosis    # one chain
node get-positions.mjs --raw             # full JSON
```

**See your LP positions (auto-tracked):**
```bash
node get-lp-positions.mjs               # active LP positions
node get-lp-positions.mjs --live        # with on-chain liquidity check
node get-lp-positions.mjs --all         # include withdrawn
```

**Find all markets you created:**
```bash
node search-markets.mjs --mine
```

**Check specific token balance:**
```bash
node check-balance.mjs --token 0x<outcome-token-address>
```

---

## HEARTBEAT Integration

Regular monitoring is critical for managing risk. Set up a HEARTBEAT system to ensure you don't forget markets.

### Setup HEARTBEAT.md

**Check if file exists:**
```bash
ls ~/.openclaw/workspace/memory/HEARTBEAT.md
```

**If it doesn't exist, create it:**
```bash
cat > ~/.openclaw/workspace/memory/HEARTBEAT.md << 'EOF'
# Portfolio Heartbeat

## Seer Prediction Markets
- [ ] Run `get-positions.mjs` to see current holdings
- [ ] Run `get-lp-positions.mjs` to check LP positions
- [ ] Run `search-markets.mjs --mine` to check created markets
- [ ] Search for news on markets with approaching deadlines
- [ ] Identify high-risk positions (deadline approaching or significant news)
- [ ] Withdraw LP if any position is high-risk
EOF
```

**If it exists but lacks Seer section, add:**
```markdown
## Seer Prediction Markets
- [ ] Run `get-positions.mjs` to see current holdings
- [ ] Run `get-lp-positions.mjs` to check LP positions
- [ ] Run `search-markets.mjs --mine` to check created markets
- [ ] Search for news on markets with approaching deadlines
- [ ] Identify high-risk positions (deadline approaching or significant news)
- [ ] Withdraw LP if any position is high-risk
```

---

### Regular review schedule

**Daily (if actively trading/LP):**
- Run `get-positions.mjs` to check token holdings
- Run `get-lp-positions.mjs` to check LP positions
- Run `search-markets.mjs --mine` for created markets needing attention
- **For each active position/LP:** Search the web for recent news about the market's subject. The market name is the question — search for keywords from it. If significant news has broken, act immediately (withdraw LP, exit trades, or adjust ranges).

**Weekly (if passive):**
- Search for news on each active market's topic
- Reassess whether your probability ranges still make sense
- Update positions if your view has changed

**Before deadline (< 1 week):**
- **Traders:** Research the outcome — is the answer clear? Decide whether to hold or exit
- **LPs:** Withdraw liquidity immediately (impermanent loss accelerates near resolution)

---

## Answering Reality.eth Questions

Reality.eth is the oracle that resolves Seer markets. Anyone can answer, but you should monitor your markets to ensure correct resolution.

### Why answering matters

- **Final resolution depends on Reality.eth answer**
- **Anyone can answer** (not just market creator)
- **Incorrect answers can be challenged** (by submitting higher bond)
- **You should answer your own markets** to ensure they resolve correctly

**If you created the market, you have the most stake in correct resolution.**

---

### When to answer

Answer when **all** of these are true:

1. **Opening time has passed** (can't answer before `--opening-time`)
2. **Outcome is objectively known** (verifiable via source)
3. **No one has answered yet** OR **current answer is incorrect**

**Don't answer:**
- Before opening time (transaction will fail)
- If outcome is still uncertain
- If correct answer already exists (wastes gas + bond)

---

### How to answer

**Categorical markets (Yes/No, multiple choice):**
```bash
node answer-question.mjs --question-id 0x... --answer-index 0 --bond 10
```

**Answer indices:**
- `0` = first outcome (usually YES)
- `1` = second outcome (usually NO)
- `2+` = additional outcomes in multicategorical markets

**Scalar markets:**
```bash
node answer-question.mjs --question-id 0x... --answer-value 5000 --bond 10
```

**Special answers:**
```bash
# INVALID (question violates resolution policy)
node answer-question.mjs --question-id 0x... --answer-index INVALID --bond 10

# ANSWERED TOO SOON (outcome not yet known)
node answer-question.mjs --question-id 0x... --answer-index ANSWERED_TOO_SOON --bond 10
```

**Parameters:**
- `--question-id`: Get from `read-market.mjs` output
- `--answer-index`: Outcome index (0, 1, 2, ...) OR special value (INVALID, ANSWERED_TOO_SOON)
- `--answer-value`: For scalar markets, the numeric value
- `--bond`: Amount in native token (xDAI on Gnosis, ETH on other chains) - must exceed `minBond` and any previous bond

**Bond mechanics:**
- Higher bond = harder for others to challenge your answer
- If challenged and you're correct, you get bond back + challenger's bond
- If challenged and you're wrong, challenger gets your bond

**Rule of thumb:** Bond 2-5x the `minBond` to deter frivolous challenges.

---

### Answer encoding reference

| Market Type | Answer Format | Example |
|-------------|---------------|---------|
| Categorical | Outcome index (0, 1, 2, ...) | YES = 0, NO = 1 |
| Scalar | Numeric value | ETH price $5000 = 5000 |
| Multi-Scalar | Each outcome answered separately | Labour: 350, Conservative: 180 |
| Invalid | Special keyword | `INVALID` |
| Answered Too Soon | Special keyword | `ANSWERED_TOO_SOON` |

---

### Changing your answer

If you submitted an answer but want to change it (or someone else submitted wrong answer):

**Submit new answer with higher bond:**
```bash
# Previous bond was 10 (native token), submit with 20+ (double the bond)
node answer-question.mjs --question-id 0x... --answer-index 1 --bond 20 [--chain base]
```

New answer with higher bond replaces previous answer. Bond wars escalate (each answer must double the previous bond), so economically irrational attackers are naturally deterred.

---

## Resolving Markets

Markets resolve in two steps:

1. **Answer submitted** to Reality.eth
2. **Timeout passes** (~3.5 days default, set by `minBond` parameter)
3. **Market resolved** by calling `resolve-market.mjs`

---

### Resolution workflow

**Step 1: Opening time passes**
- Wait until after `--opening-time` (if set)
- Or immediately (if no `--opening-time`)

**Step 2: Answer submitted to Reality.eth**
```bash
node answer-question.mjs --question-id 0x... --answer-index 0 --bond 10
```

**Step 3: Wait ~3.5 days (86400s default timeout)**
- This is the challenge period
- Anyone can challenge the answer during this time
- If no challenge, answer is final

**Step 4: Resolve the market**
```bash
node resolve-market.mjs --market 0x...
```

**Step 5: Redeem winnings**
```bash
# Traders redeem winning tokens
node merge-redeem.mjs --mode redeem --market 0x... --outcome-index 0 --amount 50

# LPs can now withdraw and merge complete sets
node withdraw-liquidity.mjs --token-id 123
node merge-redeem.mjs --mode merge --market 0x... --amount max
```

---

### Resolution timeline example

| Date | Event |
|------|-------|
| 2026-06-01 | Opening time passes |
| 2026-06-02 | You submit answer (YES, bond 10 native token) |
| 2026-06-02 to 2026-06-05 | Challenge period (~3.5 days) |
| 2026-06-06 | No challenge → answer finalized |
| 2026-06-06 | You call `resolve-market.mjs` |
| 2026-06-06+ | Winners redeem tokens 1:1 for sDAI |

---

## Risk Monitoring

### For traders

**Monitor:**
1. **Position value** via `get-positions.mjs`
2. **Reality.eth answers** for incorrect submissions
3. **Market status** via `read-market.mjs`

**Red flags:**
- Incorrect answer submitted → challenge it
- Opening time approaching → decide to hold or exit
- Major news breaks → reassess position

---

### For LPs

**Monitor:**
1. **Odds movement** (did price shift significantly?)
2. **News events** (did new information emerge?)
3. **Deadline proximity** (< 1 week to opening time?)
4. **Current pool state** (is one outcome > 80%?)

**Red flags (withdraw immediately):**
- Opening time < 1 week away
- Major news shifted odds > 20%
- One outcome crossed 80% probability
- Market might resolve INVALID

See [LIQUIDITY-PROVISION.md](LIQUIDITY-PROVISION.md#risk-management-for-lps) for detailed LP risk management.

---

## Scripts Reference

### answer-question.mjs

**Answer categorical market:**
```bash
node answer-question.mjs --question-id 0x... --answer-index 0 --bond 10
```

**Answer scalar market:**
```bash
node answer-question.mjs --question-id 0x... --answer-value 5000 --bond 10
```

**Answer as INVALID:**
```bash
node answer-question.mjs --question-id 0x... --answer-index INVALID --bond 10
```

**Parameters:**
- `--question-id`: From `read-market.mjs` output
- `--answer-index`: Outcome index (0, 1, ...) or INVALID/ANSWERED_TOO_SOON
- `--answer-value`: For scalar markets, numeric value
- `--bond`: Amount in native token (must exceed minBond and previous bonds)

---

### resolve-market.mjs

**Resolve market after finalization:**
```bash
node resolve-market.mjs --market 0x...
```

Call after:
1. Answer submitted to Reality.eth
2. Timeout passed (~3.5 days)
3. No challenge (or challenge resolved)

---

### check-balance.mjs

**Check specific token balance:**
```bash
node check-balance.mjs --token 0x<token-address>
```

---

## Common Questions

**Q: What if I miss the opening time?**
A: Anyone can still answer after opening time. If you're late, check Reality.eth to ensure someone answered correctly. If not, answer yourself.

**Q: What happens if no one answers?**
A: Market can't resolve until someone answers. It will remain in limbo. Always answer your own markets.

**Q: Can I change my answer?**
A: Yes, by submitting a new answer with a higher bond. Previous answer is replaced.

**Q: What if two people submit different answers?**
A: Higher bond wins. If you think the higher-bonded answer is wrong, submit a higher bond yourself.

**Q: What if I forget to redeem winnings?**
A: No expiration. You can redeem anytime after resolution, but you're missing out on sDAI yield.

---

## Next Steps

- **Understand resolution policy:** [abridged-resolution-policy.md](abridged-resolution-policy.md)
- **Learn to trade:** [TRADING.md](TRADING.md)
- **Learn LP strategies:** [LIQUIDITY-PROVISION.md](LIQUIDITY-PROVISION.md)
- **Create markets:** [CREATING-MARKETS-BASIC.md](CREATING-MARKETS-BASIC.md)
