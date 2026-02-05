export const CREATE_MARKET_PARAMS_COMPONENTS = [
  { name: "marketName", type: "string" }, { name: "outcomes", type: "string[]" },
  { name: "questionStart", type: "string" }, { name: "questionEnd", type: "string" },
  { name: "outcomeType", type: "string" }, { name: "parentOutcome", type: "uint256" },
  { name: "parentMarket", type: "address" }, { name: "category", type: "string" },
  { name: "lang", type: "string" }, { name: "lowerBound", type: "uint256" },
  { name: "upperBound", type: "uint256" }, { name: "minBond", type: "uint256" },
  { name: "openingTime", type: "uint32" }, { name: "tokenNames", type: "string[]" }
];

export function createMarketAbi(fnName) {
  return [{ name: fnName, type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "params", type: "tuple", components: CREATE_MARKET_PARAMS_COMPONENTS }],
    outputs: [{ type: "address" }] }];
}

export const ERC20_APPROVE_ABI = [{ name: "approve", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ type: "bool" }] }];

export const SPLIT_POSITION_ABI = [{ name: "splitPosition", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "collateralToken", type: "address" }, { name: "market", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] }];

export const MERGE_POSITIONS_ABI = [{ name: "mergePositions", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "collateralToken", type: "address" }, { name: "market", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] }];

export const REDEEM_POSITIONS_ABI = [{ name: "redeemPositions", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "collateralToken", type: "address" }, { name: "market", type: "address" }, { name: "outcomeIndexes", type: "uint256[]" }, { name: "amounts", type: "uint256[]" }], outputs: [] }];

const QUESTION_COMPONENTS = [
  { name: "content_hash", type: "bytes32" }, { name: "arbitrator", type: "address" },
  { name: "opening_ts", type: "uint32" }, { name: "timeout", type: "uint32" },
  { name: "finalize_ts", type: "uint32" }, { name: "is_pending_arbitration", type: "bool" },
  { name: "bounty", type: "uint256" }, { name: "best_answer", type: "bytes32" },
  { name: "history_hash", type: "bytes32" }, { name: "bond", type: "uint256" },
  { name: "min_bond", type: "uint256" }
];

const PARENT_MARKET_COMPONENTS = [
  { name: "id", type: "address" }, { name: "marketName", type: "string" },
  { name: "outcomes", type: "string[]" }, { name: "wrappedTokens", type: "address[]" },
  { name: "conditionId", type: "bytes32" }, { name: "payoutReported", type: "bool" },
  { name: "payoutNumerators", type: "uint256[]" }
];

export const MARKET_VIEW_ABI = [{ name: "getMarket", type: "function", stateMutability: "view",
  inputs: [{ name: "marketFactory", type: "address" }, { name: "market", type: "address" }],
  outputs: [{ type: "tuple", components: [
    { name: "id", type: "address" }, { name: "marketName", type: "string" },
    { name: "outcomes", type: "string[]" },
    { name: "parentMarket", type: "tuple", components: PARENT_MARKET_COMPONENTS },
    { name: "parentOutcome", type: "uint256" },
    { name: "collateralToken", type: "address" },
    { name: "wrappedTokens", type: "address[]" },
    { name: "outcomesSupply", type: "uint256" },
    { name: "lowerBound", type: "uint256" }, { name: "upperBound", type: "uint256" },
    { name: "parentCollectionId", type: "bytes32" },
    { name: "collateralToken1", type: "address" }, { name: "collateralToken2", type: "address" },
    { name: "conditionId", type: "bytes32" }, { name: "questionId", type: "bytes32" },
    { name: "templateId", type: "uint256" },
    { name: "questions", type: "tuple[]", components: QUESTION_COMPONENTS },
    { name: "questionsIds", type: "bytes32[]" }, { name: "encodedQuestions", type: "string[]" },
    { name: "payoutReported", type: "bool" }, { name: "payoutNumerators", type: "uint256[]" }
  ]}] }];

export const SUBMIT_ANSWER_ABI = [{ name: "submitAnswer", type: "function", stateMutability: "payable",
  inputs: [{ name: "question_id", type: "bytes32" }, { name: "answer", type: "bytes32" }, { name: "max_previous", type: "uint256" }], outputs: [] }];

export const RESOLVE_ABI = [{ name: "resolve", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "market", type: "address" }], outputs: [] }];

export const SDAI_ADAPTER_ABI = [
  { name: "depositXDAI", type: "function", stateMutability: "payable",
    inputs: [{ name: "receiver", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "redeemXDAI", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "shares", type: "uint256" }, { name: "receiver", type: "address" }], outputs: [{ type: "uint256" }] }
];

export const ERC4626_CONVERT_ABI = [
  { name: "convertToAssets", type: "function", stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] }
];

// Algebra (SwaprV3) mint - no fee parameter
export const ALGEBRA_MINT_POSITION_ABI = [{ name: "mint", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "params", type: "tuple", components: [
    { name: "token0", type: "address" }, { name: "token1", type: "address" },
    { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" },
    { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" },
    { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" },
    { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }
  ]}],
  outputs: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" },
    { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] }];

// Uniswap V3 mint - includes fee parameter
export const UNISWAP_V3_MINT_POSITION_ABI = [{ name: "mint", type: "function", stateMutability: "payable",
  inputs: [{ name: "params", type: "tuple", components: [
    { name: "token0", type: "address" }, { name: "token1", type: "address" },
    { name: "fee", type: "uint24" },
    { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" },
    { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" },
    { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" },
    { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }
  ]}],
  outputs: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" },
    { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] }];

// Backwards compat export (Algebra version)
export const MINT_POSITION_ABI = ALGEBRA_MINT_POSITION_ABI;

export const POSITION_MANAGER_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "tokenOfOwnerByIndex", type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "positions", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "nonce", type: "uint96" }, { name: "operator", type: "address" },
      { name: "token0", type: "address" }, { name: "token1", type: "address" },
      { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" },
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" }, { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0", type: "uint128" }, { name: "tokensOwed1", type: "uint128" }] },
  { name: "decreaseLiquidity", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" },
      { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" },
      { name: "deadline", type: "uint256" }] }],
    outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] },
  { name: "collect", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "tokenId", type: "uint256" }, { name: "recipient", type: "address" },
      { name: "amount0Max", type: "uint128" }, { name: "amount1Max", type: "uint128" }] }],
    outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }] },
  { name: "burn", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
];

export const SWAPR_V3_SWAP_ABI = [
  { name: "exactInputSingle", type: "function", stateMutability: "payable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" },
      { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" },
      { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" },
      { name: "sqrtPriceLimitX96", type: "uint160" }] }],
    outputs: [{ name: "amountOut", type: "uint256" }] }
];

export const POOL_STATE_ABI = [
  { name: "globalState", type: "function", stateMutability: "view",
    inputs: [], outputs: [
      { name: "price", type: "uint160" }, { name: "tick", type: "int24" },
      { name: "fee", type: "uint16" }, { name: "timepointIndex", type: "uint16" },
      { name: "communityFeeToken0", type: "uint8" }, { name: "communityFeeToken1", type: "uint8" },
      { name: "unlocked", type: "bool" }] }
];

export const POOL_FACTORY_ABI = [
  { name: "poolByPair", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }],
    outputs: [{ name: "pool", type: "address" }] }
];

// Uniswap V3 Factory ABI
export const UNISWAP_V3_FACTORY_ABI = [
  { name: "getPool", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "fee", type: "uint24" }],
    outputs: [{ name: "pool", type: "address" }] }
];

// Uniswap V3 SwapRouter ABI
export const UNISWAP_V3_SWAP_ABI = [
  { name: "exactInputSingle", type: "function", stateMutability: "payable",
    inputs: [{ name: "params", type: "tuple", components: [
      { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" },
      { name: "fee", type: "uint24" }, { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" }, { name: "amountIn", type: "uint256" },
      { name: "amountOutMinimum", type: "uint256" }, { name: "sqrtPriceLimitX96", type: "uint160" }] }],
    outputs: [{ name: "amountOut", type: "uint256" }] }
];

// Uniswap V3 Pool state ABI
export const UNISWAP_V3_POOL_STATE_ABI = [
  { name: "slot0", type: "function", stateMutability: "view",
    inputs: [], outputs: [
      { name: "sqrtPriceX96", type: "uint160" }, { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" }, { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" }, { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" }] }
];
