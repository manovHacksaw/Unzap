import type { AbiEntry } from "@/app/studio/contract-lab/types";
import type { ParsedAbi } from "./abiParser";
import { toTsType, toCalldataNote } from "./typeMapper";
import type { Network } from "@/lib/network-config";

export interface GenerateHooksInput {
  contractName: string;
  contractAddress: string;
  classHash: string;
  network: Network;
  abi: AbiEntry[];
  parsed: ParsedAbi;
}

function toPascal(s: string): string {
  return s.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function toCamel(s: string): string {
  const pascal = toPascal(s);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function buildParams(inputs: AbiEntry["inputs"]): string {
  if (!inputs || inputs.length === 0) return "";
  return inputs.map((i) => `${toCamel(i.name)}: ${toTsType(i.type)}`).join(", ");
}

function buildCalldataLines(inputs: AbiEntry["inputs"]): string[] {
  if (!inputs || inputs.length === 0) return ["// No arguments"];
  return inputs.flatMap((i) => {
    const camel = toCamel(i.name);
    const note = toCalldataNote(i.type);
    const noteStr = note ? `      ${note}\n` : "";
    if (i.type.includes("u256")) {
      return [
        `${noteStr}      ...(typeof ${camel} === 'object' ? [${camel}.low, ${camel}.high] : [String(BigInt(${camel} as string) & ((BigInt(1) << BigInt(128)) - BigInt(1))), String(BigInt(${camel} as string) >> BigInt(128))]),`,
      ];
    }
    if (i.type.includes("Array") || i.type.includes("Span")) {
      return [`${noteStr}      String((${camel} as unknown[]).length), ...(${camel} as unknown[]).map(String),`];
    }
    if (i.type === "bool" || i.type === "core::bool") {
      return [`      ${camel} ? '1' : '0',`];
    }
    return [`      String(${camel}),`];
  });
}

function generateStructInterfaces(structs: AbiEntry[]): string {
  if (structs.length === 0) return "";
  
  const BUILTINS = new Set([
    "bool", "u8", "u16", "u32", "u64", "u128", "u256", 
    "felt252", "ContractAddress", "ClassHash", "EthAddress", 
    "bytes31", "ByteArray"
  ]);

  const lines: string[] = ["// Generated struct interfaces\n"];
  for (const s of structs) {
    const name = s.name.split("::").pop() ?? s.name;
    
    // Skip built-ins or types that conflict with JS/TS primitives
    if (BUILTINS.has(name)) continue;

    if (s.type === "enum") {
      const items = s.items ?? [];
      if (items.length === 0) continue;
      
      const variants = items.map((v) => `  | { variant: "${v.name}"; value: ${toTsType(v.type ?? "felt252")} }`);
      lines.push(`export type ${name} =\n${variants.join("\n")};\n`);
    } else {
      const fields = (s.items ?? []).map((f) => `  ${toCamel(f.name)}: ${toTsType(f.type ?? "felt252")};`);
      if (fields.length === 0) continue;
      
      lines.push(`export interface ${name} {\n${fields.join("\n")}\n}\n`);
    }
  }
  
  return lines.length > 1 ? lines.join("\n") : "";
}

/** Encode one input value to a felt-string for callContract calldata */
function toCalldataExpr(camelName: string, cairoType: string): string {
  if (cairoType === "core::bool" || cairoType === "bool") {
    return `${camelName} ? '0x1' : '0x0'`;
  }
  if (cairoType.includes("u256")) {
    return `...(typeof ${camelName} === 'object' ? [String(${camelName}.low), String(${camelName}.high)] : [String(BigInt(${camelName} as string) & ((BigInt(1) << BigInt(128)) - BigInt(1))), String(BigInt(${camelName} as string) >> BigInt(128))])`;
  }
  // ContractAddress, felt252, u8/u16/u32/u64/u128, ClassHash — all pass as string
  return `String(${camelName})`;
}

/** Decode response[0] (a hex felt string) back to the TS output type */
function decodeResultExpr(cairoType: string): string {
  if (cairoType === "core::bool" || cairoType === "bool") {
    return `response[0] !== '0x0' && response[0] !== '0'`;
  }
  if (cairoType === "core::integer::u8"  || cairoType === "u8"  ||
      cairoType === "core::integer::u16" || cairoType === "u16" ||
      cairoType === "core::integer::u32" || cairoType === "u32" ||
      cairoType === "core::integer::u64" || cairoType === "u64") {
    return `Number(BigInt(response[0]))`;
  }
  if (cairoType.includes("u256")) {
    return `{ low: response[0], high: response[1] ?? '0x0' }`;
  }
  // felt252, ContractAddress, ClassHash, u128, ByteArray → string
  return `response[0]`;
}

function generateReadHook(fn: AbiEntry, contractName: string): string {
  const hookName = `use${toPascal(contractName)}${toPascal(fn.name)}`;
  const params = buildParams(fn.inputs);
  const outputType = fn.outputs && fn.outputs.length > 0 ? toTsType(fn.outputs[0].type) : "string";
  const rawOutputType = fn.outputs?.[0]?.type ?? "felt252";
  const hasParams = fn.inputs && fn.inputs.length > 0;
  const depList = hasParams ? fn.inputs!.map((i) => toCamel(i.name)).join(", ") : "";

  // calldata: each input encoded to a felt string (spread for u256)
  const calldataItems = (fn.inputs ?? []).map((i) => toCalldataExpr(toCamel(i.name), i.type));
  const calldataExpr = calldataItems.length > 0
    ? `[${calldataItems.join(", ")}]`
    : `[]`;

  // For string params (addresses, felt252), skip the call when the value is empty
  const stringGuards = (fn.inputs ?? [])
    .filter((i) => i.type.includes("ContractAddress") || i.type === "felt252" || i.type === "core::felt252" || i.type.includes("ByteArray"))
    .map((i) => `    if (!${toCamel(i.name)}) return;`);

  const decode = decodeResultExpr(rawOutputType);

  const lines = [
    `/** Read: ${fn.name} — view */`,
    `export function ${hookName}(${params}) {`,
    `  const [data, setData] = useState<${outputType} | null>(null);`,
    `  const [loading, setLoading] = useState(false);`,
    `  const [error, setError] = useState<string | null>(null);`,
    ``,
    `  const read = useCallback(async () => {`,
    ...stringGuards,
    `    setLoading(true);`,
    `    setError(null);`,
    `    try {`,
    `      const provider = new RpcProvider({ nodeUrl: NETWORK_RPC });`,
    `      const response = await provider.callContract({`,
    `        contractAddress: CONTRACT_ADDRESS,`,
    `        entrypoint: '${fn.name}',`,
    `        calldata: ${calldataExpr},`,
    `      });`,
    `      setData(${decode} as ${outputType});`,
    `    } catch (e) {`,
    `      setError(e instanceof Error ? e.message : String(e));`,
    `    } finally {`,
    `      setLoading(false);`,
    `    }`,
    `  }, [${depList}]);`,
    ``,
    `  useEffect(() => { void read(); }, [read]);`,
    ``,
    `  return { data, loading, error, refetch: read };`,
    `}`,
    ``,
  ];
  return lines.join("\n");
}

function generateWriteHook(fn: AbiEntry, contractName: string): string {
  const hookName = `use${toPascal(contractName)}${toPascal(fn.name)}`;
  const params = buildParams(fn.inputs);
  const calldataLines = buildCalldataLines(fn.inputs);

  const lines = [
    `/** Write: ${fn.name} — external */`,
    `export function ${hookName}() {`,
    `  const { account, szWallet, walletType } = useWallet();`,
    `  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');`,
    `  const [txHash, setTxHash] = useState<string | null>(null);`,
    `  const [error, setError] = useState<string | null>(null);`,
    ``,
    `  const execute = useCallback(async (${params}): Promise<string> => {`,
    `    if (!account) throw new Error('Wallet not connected.');`,
    `    setStatus('pending');`,
    `    setError(null);`,
    `    setTxHash(null);`,
    ``,
    `    const calldata = [`,
    ...calldataLines,
    `    ];`,
    `    const calls = [{ contractAddress: CONTRACT_ADDRESS, entrypoint: '${fn.name}', calldata }];`,
    `    let hash = '';`,
    ``,
    `    try {`,
    `      if (walletType === 'privy' && szWallet) {`,
    `        // ── Gasless via StarkZap (Privy embedded wallet) ──────────────────`,
    `        const tx = await szWallet.execute(calls, { feeMode: 'sponsored' });`,
    `        hash = tx.hash;`,
    `        setTxHash(hash);`,
    `        await tx.wait();`,
    `      } else {`,
    `        // ── Standard extension wallet execution ───────────────────────────`,
    `        const result = await (account as Account).execute(calls);`,
    `        hash = result.transaction_hash;`,
    `        setTxHash(hash);`,
    `        await new RpcProvider({ nodeUrl: NETWORK_RPC }).waitForTransaction(hash);`,
    `      }`,
    `      setStatus('success');`,
    `      return hash;`,
    `    } catch (e) {`,
    `      setStatus('error');`,
    `      const msg = e instanceof Error ? e.message : String(e);`,
    `      setError(msg);`,
    `      throw e; // re-throw so callers can show errors / log them`,
    `    }`,
    `  }, [account, szWallet, walletType]);`,
    ``,
    `  const reset = useCallback(() => { setStatus('idle'); setTxHash(null); setError(null); }, []);`,
    ``,
    `  return { execute, status, txHash, error, reset };`,
    `}`,
    ``,
  ];
  return lines.join("\n");
}

function generateWalletContext(): string {
  return [
    `// ── Wallet context ────────────────────────────────────────────────────────────`,
    `// providers/privy-wrapper.tsx overrides this context when Privy is configured.`,
    `// WalletProvider below is the extension-only fallback (no Privy).`,
    ``,
    `interface WalletContextValue {`,
    `  account: Account | WalletAccount | null;`,
    `  /** StarkZap wallet — provided by privy-wrapper when walletType === 'privy' */`,
    `  szWallet: any | null;`,
    `  address: string | null;`,
    `  connect: (method: 'extension' | 'privy') => Promise<void>;`,
    `  disconnect: () => void;`,
    `  isConnecting: boolean;`,
    `  walletType: 'extension' | 'privy' | null;`,
    `  error: string | null;`,
    `}`,
    ``,
    `export const WalletContext = createContext<WalletContextValue>({`,
    `  account: null,`,
    `  szWallet: null,`,
    `  address: null,`,
    `  connect: async () => {},`,
    `  disconnect: () => {},`,
    `  isConnecting: false,`,
    `  walletType: null,`,
    `  error: null,`,
    `});`,
    ``,
    `/** Extension-only fallback — used when NEXT_PUBLIC_PRIVY_APP_ID is not set. */`,
    `export function WalletProvider({ children }: { children: ReactNode }) {`,
    `  const [account, setAccount] = useState<WalletAccount | null>(null);`,
    `  const [address, setAddress] = useState<string | null>(null);`,
    `  const [isConnecting, setIsConnecting] = useState(false);`,
    `  const [walletType, setWalletType] = useState<'extension' | 'privy' | null>(null);`,
    `  const [error, setError] = useState<string | null>(null);`,
    ``,
    `  const connect = useCallback(async (method: 'extension' | 'privy') => {`,
    `    if (method === 'privy') {`,
    `      setError('Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local to enable Privy login.');`,
    `      return;`,
    `    }`,
    `    setIsConnecting(true);`,
    `    setError(null);`,
    `    try {`,
    `      const wallet = await connectStarknet({ modalMode: 'alwaysAsk' });`,
    `      if (!wallet) return;`,
    `      const provider = new RpcProvider({ nodeUrl: NETWORK_RPC });`,
    `      const walletAccount = await WalletAccount.connect(provider, wallet);`,
    `      setAccount(walletAccount);`,
    `      setAddress(walletAccount.address);`,
    `      setWalletType('extension');`,
    `    } catch (e) {`,
    `      setError(e instanceof Error ? e.message : String(e));`,
    `    } finally {`,
    `      setIsConnecting(false);`,
    `    }`,
    `  }, []);`,
    ``,
    `  const disconnect = useCallback(() => {`,
    `    setAccount(null);`,
    `    setAddress(null);`,
    `    setWalletType(null);`,
    `    setError(null);`,
    `  }, []);`,
    ``,
    `  return (`,
    `    <WalletContext.Provider value={{ account, szWallet: null, address, connect, disconnect, isConnecting, walletType, error }}>`,
    `      {children}`,
    `    </WalletContext.Provider>`,
    `  );`,
    `}`,
    ``,
    `export function useWallet() {`,
    `  return useContext(WalletContext);`,
    `}`,
  ].join("\n");
}

export function generateHooksFile(input: GenerateHooksInput): string {
  const { contractName, contractAddress, classHash, network, abi, parsed } = input;

  const rpcUrl =
    network === "mainnet"
      ? "https://free-rpc.nethermind.io/mainnet-juno/v0_8"
      : "https://starknet-sepolia.drpc.org";

  const firstRead = parsed.reads[0] ? toPascal(parsed.reads[0].name) : "Read";
  const firstWrite = parsed.writes[0] ? toPascal(parsed.writes[0].name) : "Write";
  const pascal = toPascal(contractName);

  const header = [
    `/**`,
    ` * Generated by Unzap Contract Lab`,
    ` * https://unzap.dev`,
    ` *`,
    ` * Contract : ${contractName}`,
    ` * Address  : ${contractAddress}`,
    ` * Class    : ${classHash}`,
    ` * Network  : Starknet ${network === "mainnet" ? "Mainnet" : "Sepolia"}`,
    ` *`,
    ` * Setup:`,
    ` * 1. npm install starknet @starknet-io/get-starknet`,
    ` * 2. Wrap your app: <WalletProvider><App /></WalletProvider>`,
    ` * 3. Use hooks:`,
    ` *    const { data } = use${pascal}${firstRead}();`,
    ` *    const { execute, status } = use${pascal}${firstWrite}();`,
    ` */`,
    ``,
    `'use client';`,
    ``,
    `import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from 'react';`,
    `import { RpcProvider, WalletAccount, Account } from 'starknet';`,
    `import { connect as connectStarknet } from '@starknet-io/get-starknet';`,
    ``,
    `const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '${contractAddress}';`,
    `const NETWORK_RPC = process.env.NEXT_PUBLIC_RPC_URL ?? '${rpcUrl}';`,
    ``,
  ].join("\n");

  const structBlock = generateStructInterfaces(parsed.structs);
  const walletBlock = generateWalletContext();

  const readSection =
    parsed.reads.length > 0
      ? "// Read hooks (view functions)\n\n" +
        parsed.reads.map((fn) => generateReadHook(fn, contractName)).join("\n")
      : "// No view functions found in this ABI.\n";

  const writeSection =
    parsed.writes.length > 0
      ? "// Write hooks (external functions)\n\n" +
        parsed.writes.map((fn) => generateWriteHook(fn, contractName)).join("\n")
      : "// No external functions found in this ABI.\n";

  return [header, structBlock, walletBlock, readSection, writeSection].join("\n");
}
