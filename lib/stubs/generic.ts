// Generic stub for missing optional dependencies
export const Account = class {};
export class Controller {
  constructor() {}
  isReady() { return true; }
  async connect() { return { 
    address: "0x0", 
    execute: async () => ({}), 
    executePaymasterTransaction: async () => ({}),
    signMessage: async () => ({}),
    simulateTransaction: async () => ({}),
    estimateInvokeFee: async () => ({})
  } as any; }
  rpcUrl() { return ""; }
  async username() { return ""; }
  async disconnect() {}
}
export const toSessionPolicies = (p: any) => p;
export const StarknetController = class {};
export const Connector = class {};
export const Provider = class {};
export default { Controller, toSessionPolicies };
