# Discovering and Sharing Markets

---

## Searching Markets (Recommended)

Use `search-markets.mjs` to find markets via the Seer API. No private key or RPC needed.

```bash
# Search by keyword
node search-markets.mjs --query "bitcoin"

# Open markets sorted by liquidity
node search-markets.mjs --status open --sort liquidity --limit 10

# Verified markets in a category
node search-markets.mjs --category politics --verified --status open

# Markets by a specific creator
node search-markets.mjs --creator 0x...

# Look up a specific market by address
node search-markets.mjs --id 0x...

# Full JSON output for programmatic use
node search-markets.mjs --query "election" --raw
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--query <text>` | Search by market name (case-insensitive substring) |
| `--chain <name>` | Filter by chain: `gnosis`, `base`, `optimism`, `mainnet` (default: all) |
| `--status <s>` | `open`, `closed`, `not_open`, `answer_not_final`, `in_dispute`, `pending_execution` |
| `--category <name>` | e.g. `politics`, `sports`, `crypto`, `misc` |
| `--creator <addr>` | Filter by creator address |
| `--mine` | Show markets created by your wallet (uses `PRIVATE_KEY` env var) |
| `--verified` | Only verified markets |
| `--sort <field>` | `liquidity` (default), `date`, `opening` |
| `--order <dir>` | `desc` (default), `asc` |
| `--limit <n>` | Max results (default 10) |
| `--page <n>` | Page number (default 1) |
| `--id <addr>` | Look up specific market by address |
| `--raw` | Full JSON response |

---

## Reading Market Details On-Chain

For full on-chain data (useful after finding a market via search):

```bash
node read-market.mjs --market 0x... [--chain base]
```

This reads directly from the blockchain via the `MARKET_VIEW` contract.

---

## Next Steps

- **Create your first market:** [CREATING-MARKETS-BASIC.md](CREATING-MARKETS-BASIC.md)
- **Trade on markets:** [TRADING.md](TRADING.md)
- **Monitor positions:** [MONITORING-MARKETS.md](MONITORING-MARKETS.md)
