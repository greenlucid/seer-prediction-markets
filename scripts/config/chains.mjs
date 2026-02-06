import { gnosis, mainnet, optimism, base } from "viem/chains";

export const CHAIN_CONFIGS = {
  gnosis: {
    viemChain: gnosis,
    rpcUrl: "https://rpc.gnosis.gateway.fm",
    contracts: {
      MARKET_FACTORY: "0x83183DA839Ce8228E31Ae41222EaD9EDBb5cDcf1",
      GNOSIS_ROUTER: "0xeC9048b59b3467415b1a38F63416407eA0c70fB8",
      REALITY_PROXY: "0xc260ADfAC11f97c001dC143d2a4F45b98e0f2D6C",
      MARKET_VIEW: "0x95493F3e3F151eD9ee9338a4Fc1f49c00890F59C",
      CONDITIONAL_TOKENS: "0xCeAfDD6bc0bEF976fdCd1112955828E00543c0Ce",
      REALITY_ETH: "0xE78996A233895bE74a66F451f1019cA9734205cc",
    },
    collateral: {
      name: "sDAI",
      symbol: "sDAI",
      address: "0xaf204776c7245bf4147c2612bf6e5972ee483701",
      adapter: "0xD499b51fcFc66bd31248ef4b28d656d67E591A94",
      decimals: 18,
    },
    dex: {
      type: "swaprv3",
      router: "0x2d3F3f0C9fAeF4A8e2d900a3AAe2E7c8f36A98B9",
      nonfungiblePositionManager: "0x91fd594c46d8b01e62dbdebed2401dde01817834",
      algebraFactory: "0xA0864cCA6E114013AB0e27cbd5B6f4c8947da766",
      tickSpacing: 60,
      fee: null, // Algebra doesn't use fee tiers
    },
    farming: {
      farmingCenter: "0xde51ddf1ae7d5bbd7bf1a0e40aaa1f6c12579106",
      algebraEternalFarming: "0x607BbfD4CEbd869AaD04331F8a2AD0C3C396674b",
    },
  },

  mainnet: {
    viemChain: mainnet,
    rpcUrl: "https://eth.llamarpc.com",
    contracts: {
      MARKET_FACTORY: "0x1F728c2fD6a3008935c1446a965a313E657b7904",
      GNOSIS_ROUTER: "0x886Ef0A78faBbAE942F1dA1791A8ed02a5aF8BC6",
      REALITY_PROXY: "0xC72f738e331b6B7A5d77661277074BB60Ca0Ca9E",
      MARKET_VIEW: "0xB2aB74afe47e6f9D8c392FA15b139Ac02684771a",
      CONDITIONAL_TOKENS: "0xC59b0e4De5F1248C1140964E0fF287B192407E0C",
      REALITY_ETH: "0x5b7dd1e86623548af054a4985f7fc8ccbb554e2c",
    },
    collateral: {
      name: "sDAI",
      symbol: "sDAI",
      address: "0x83F20F44975D03b1b09e64809B757c47f942BEeA", // Maker sDAI
      adapter: null, // sDAI is yield-bearing itself
      decimals: 18,
    },
    dex: {
      type: "uniswapv3",
      router: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 SwapRouter
      nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      tickSpacing: 60,
      fee: 3000, // 0.3% fee tier
    },
    farming: null, // Farming is Gnosis-only (Algebra/SwaprV3)
  },

  optimism: {
    viemChain: optimism,
    rpcUrl: "https://mainnet.optimism.io",
    contracts: {
      MARKET_FACTORY: "0x886Ef0A78faBbAE942F1dA1791A8ed02a5aF8BC6",
      GNOSIS_ROUTER: "0x179d8F8c811B8C759c33809dbc6c5ceDc62D05DD",
      REALITY_PROXY: "0xfE8bF5140F00de6F75BAFa3Ca0f4ebf2084A46B2",
      MARKET_VIEW: "0x44921b4c7510Fb306d8E58cF3894fA2bc8a79F00",
      CONDITIONAL_TOKENS: "0x8bdC504dC3A05310059c1c67E0A2667309D27B93",
      REALITY_ETH: "0x0eF940F7f053a2eF5D6578841072488aF0c7d89A",
    },
    collateral: {
      name: "sUSDS",
      symbol: "sUSDS",
      address: "0xb5b2dc7fd34c249f4be7fb1fcea07950784229e0",
      adapter: null, // sUSDS is yield-bearing itself
      decimals: 18,
      rateSource: { chain: "mainnet", address: "0xa3931d71877c0e7a3148cb7eb4463524fec27fbd" },
    },
    dex: {
      type: "uniswapv3",
      router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Optimism SwapRouter02
      nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      tickSpacing: 60,
      fee: 100, // 0.01% fee tier
    },
    farming: null,
  },

  base: {
    viemChain: base,
    rpcUrl: "https://mainnet.base.org",
    contracts: {
      MARKET_FACTORY: "0x886Ef0A78faBbAE942F1dA1791A8ed02a5aF8BC6",
      GNOSIS_ROUTER: "0x3124e97ebF4c9592A17d40E54623953Ff3c77a73",
      REALITY_PROXY: "0xfE8bF5140F00de6F75BAFa3Ca0f4ebf2084A46B2",
      MARKET_VIEW: "0x179d8F8c811B8C759c33809dbc6c5ceDc62D05DD",
      CONDITIONAL_TOKENS: "0xAb797C4C6022A401c31543E316D3cd04c67a87fC",
      REALITY_ETH: "0x2F39f464d16402Ca3D8527dA89617b73DE2F60e8",
    },
    collateral: {
      name: "sUSDS",
      symbol: "SUSDS", // Verified from Blockscout
      address: "0x5875eee11cf8398102fdad704c9e96607675467a",
      adapter: null,
      decimals: 18,
      rateSource: { chain: "mainnet", address: "0xa3931d71877c0e7a3148cb7eb4463524fec27fbd" },
    },
    dex: {
      type: "uniswapv3",
      router: "0x2626664c2603336E57B271c5C0b26F421741e481", // Base SwapRouter02
      nonfungiblePositionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
      factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      tickSpacing: 60,
      fee: 3000, // 0.3% fee tier
    },
    farming: null,
  },
};

// Default chain (backwards compatibility)
export const DEFAULT_CHAIN = "gnosis";

// Get chain config from env var or default
export function getChainConfig(chainName = null) {
  const chain = chainName || process.env.CHAIN || DEFAULT_CHAIN;
  if (!CHAIN_CONFIGS[chain]) {
    throw new Error(`Unknown chain: ${chain}. Supported: ${Object.keys(CHAIN_CONFIGS).join(", ")}`);
  }
  return { name: chain, ...CHAIN_CONFIGS[chain] };
}
