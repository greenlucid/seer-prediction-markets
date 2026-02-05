# SEER Airdrop & Farming

## How the SEER airdrop works

Seer distributes ~6.67M SEER tokens daily (200M/month) to active participants. Allocation is calculated once per day (midnight UTC) based on:

- **Outcome token holding** (25% of daily pool): Your share of all outcome tokens held across Seer markets. Both direct holdings and indirect holdings via LP positions count.
- **Proof of Humanity bonus** (25% of daily pool): If your address is POH-verified, you get a separate allocation on top.
- **SER LP provision**: Providing liquidity to SEER-related LP pools on Mainnet or Gnosis earns additional allocation.

Your share = `your_holdings / total_holdings * daily_pool * weight`.

**Check your allocation:**
```bash
node get-airdrop-data.mjs                    # uses PRIVATE_KEY
node get-airdrop-data.mjs --address 0x...    # check any address
node get-airdrop-data.mjs --raw              # full JSON
```

---

## Farming: extra rewards on LP positions

On Gnosis, Seer markets with active Algebra farming incentives let you deposit your LP NFT into a FarmingCenter contract to earn SEER rewards on top of swap fees. This is separate from the airdrop — it's direct token rewards proportional to your liquidity.

**The farming lifecycle:**
1. Add liquidity normally (`add-liquidity.mjs`) — you get an LP NFT
2. Deposit the NFT into farming (`enter-farming.mjs`) — NFT transfers to FarmingCenter
3. Earn SEER rewards over time proportional to your liquidity share
4. Exit farming (`exit-farming.mjs`) — claims rewards and returns NFT to your wallet
5. Withdraw liquidity (`withdraw-liquidity.mjs`) — remove liquidity as usual

**Important:** While your NFT is in the FarmingCenter, you cannot withdraw liquidity. You must exit farming first.

**Find markets with active incentives:**
```bash
node search-markets.mjs --rewards                    # only incentivized markets
node search-markets.mjs --rewards --status open       # open + incentivized
```

**Enter farming:**
```bash
# After add-liquidity.mjs gives you token ID 12345
node enter-farming.mjs --token-id 12345
```

**Exit farming and claim rewards:**
```bash
node exit-farming.mjs --token-id 12345
```

---

## Strategy for maximizing points

1. **Hold outcome tokens** across many active markets (split collateral via `split-collateral.mjs`)
2. **Provide liquidity** on markets with active farming incentives (find them with `search-markets.mjs --rewards`)
3. **Enter farming** for all LP positions on incentivized markets on Gnosis
4. **Register with Proof of Humanity** for the 25% PoH allocation bonus
5. **Monitor weekly** with `get-airdrop-data.mjs` to track accumulation

---

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `get-airdrop-data.mjs` | Check your SEER airdrop allocation |
| `search-markets.mjs --rewards` | Find markets with active farming incentives |
| `enter-farming.mjs --token-id N` | Deposit LP NFT + enter farming (Gnosis only) |
| `exit-farming.mjs --token-id N` | Exit farming + claim rewards + withdraw NFT |

---

## Related

- **Liquidity provision:** [LIQUIDITY-PROVISION.md](LIQUIDITY-PROVISION.md)
- **Monitoring positions:** [MONITORING-MARKETS.md](MONITORING-MARKETS.md)
