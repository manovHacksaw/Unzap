// Generic stub for Turbopack to prevent resolving heavy or missing optional dependencies
export const Account = class {};
export const Contract = class {};
export const Wallet = class {};
export const DcaOrderStatus = {
  INDEXING: "INDEXING",
};
export const AvnuDcaOrderStatus = DcaOrderStatus;
export const getQuotes = async () => [];
export const quoteToCalls = () => [];

const genericStub = {
  Account,
  Contract,
  Wallet,
  DcaOrderStatus,
  getQuotes,
  quoteToCalls,
};

export default genericStub;
