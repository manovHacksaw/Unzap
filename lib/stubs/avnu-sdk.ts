// Stub for @avnu/avnu-sdk
// starkzap imports these for swap/DCA features — stubbed so the bundler
// doesn't walk into the avnu-sdk's own ethers v5 dependency chain.

export const BASE_URL = "";
export const SEPOLIA_BASE_URL = "";

export const getQuotes = async () => [];
export const quoteToCalls = () => [];

export const cancelDcaToCalls = () => [];
export const createDcaToCalls = () => [];
export const getDcaOrders = async () => [];
export const DcaOrderStatus = {
  INDEXING: "INDEXING",
} as any;
export const AvnuDcaOrderStatus = {} as any;

export default {};
