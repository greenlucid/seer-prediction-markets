# Seer Resolution Policy (Abridged)

**Purpose**: Ensure your market questions resolve correctly by following these rules.

## Questions That Resolve as INVALID

Avoid these at all costs:

1. **Relative dates** without context: "Will X happen in 6 months?" → INVALID (6 months from when?)
   - Fix: "Will X happen before 2026-07-31?" or "Will X happen in 6 months from opening date?"

2. **Moral/subjective questions**: "Is it ethical to eat meat?" → INVALID
   - Fix: Make it factual: "Will global meat consumption decrease by 2027?"

3. **Missing valid answer**: Multiple choice with outcomes that don't include the actual result → INVALID
   - Fix: Add "Other" or research thoroughly before setting outcomes

4. **Multiple valid answers** in single-choice questions: "Who was Time Person of Year 1937?" with "Chiang Kai-shek" and "Soong Mei-ling" → INVALID (both won jointly)
   - Fix: Use multicategorical (>1 correct) markets, or rephrase to have one clear answer

5. **Repeated outcomes**: Same answer listed twice (even with typos) → INVALID unless non-repeated outcome occurs

6. **Prohibited questions** that incentivize violence: "Will [person] be alive on [date]?" → INVALID (creates murder incentive)
   - Exceptions: Natural disasters, events where uncertainty isn't violence-based

## Default Assumptions

**Dates & Times:**
- All dates/times are UTC, 24-hour clock
- YYYY-MM-DD format preferred. MM/DD/YYYY if using slashes
- If no event date given, defaults to opening date

**Numbers:**
- "." = decimal separator, "," = thousand separator
- Missing units default to most common (e.g., "million" usually means USD)
- Round to nearest value (0.5 rounds toward 0)

**Entities:**
- Names refer to most obvious entity in context
- "Michael Jordan" in sports = basketball player, in AI = computer scientist

## Writing Good Questions

**Be specific:**
- ❌ "ETH price in 2027?"
- ✅ "Will ETH trade above $5000 on Binance at 00:00 UTC on 2027-01-01?"

**Specify sources:**
- ❌ "Will X happen?"
- ✅ "Will X happen according to [credible source]?"

**Account for edge cases:**
- If asking about ranges, ensure all possibilities are covered
- For scalar markets, confirm negative values resolve to 0

**Grammar mistakes are OK** if meaning is clear, but avoid them anyway.

## Quick Checks Before Creating

1. Can this resolve objectively? (factual, not moral)
2. Do I have a clear resolution source?
3. Are dates absolute (not relative)?
4. Do outcomes cover all realistic possibilities?
5. Does this incentivize violence? (if yes: don't create)
6. If multiple choice (1 correct), is there exactly one correct answer?

Follow these rules to avoid INVALID markets and maximize credibility.
