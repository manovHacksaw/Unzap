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

// Converts snake_case to PascalCase: "my_function" → "MyFunction"
function toPascal(s: string): string {
  return s.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
}

// Converts snake_case to camelCase: "my_function" → "myFunction"
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
        `${noteStr}      ...(typeof ${camel} === 'object'\n        ? [${camel}.low, ${camel}.high]\n        : [String(BigInt(${camel} as string) & ((BigInt(1) << BigInt(128)) - BigInt(1))), String(BigInt(${camel} as string) >> BigInt(128))]),`,
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
  const lines: string[] = ["// ── Generated struct interfaces ──────────────────────────────────────────────\n"];
  for (const s of structs) {
    const name = s.name.split("::").pop() ?? s.name;
    if (s.type === "enum") {
      const variants = (s.items ?? []).map((v) => `  | { variant: "${v.name}"; value: ${toTsType(v.type ?? "felt252")} }`);
      lines.push(`export type ${name} =\n${variants.join("\n")}\n`);
    } else {
      const fields = (s.items ?? []).map((f) => `  ${toCamel(f.name)}: ${toTsType(f.type ?? "felt252")};`);
      lines.push(`export interface ${name} {\n${fields.join("\n")}\n}\n`);
    }
  }
  return lines.join("\n");
}

function generateReadHook(fn: AbiEntry, contractName: string): string {
  const hookName = `use${toPascal(contractName)}${toPascal(fn.name)}`;
  const params = buildParams(fn.inputs);
  const calldataLines = buildCalldataLines(fn.inputs);
  const outputType = fn.outputs && fn.outputs.length > 0 ? toTsType(fn.outputs[0].type) : "string";
  const hasParams = fn.inputs && fn.inputs.length > 0;
  const paramArgs = hasParams ? `, [${fn.inputs!.map((i) => toCamel(i.name)).join(", ")}]` : "";

  return `/**
 * Read: ${fn.name}
 * State mutability: view
 */
export function ${hookName}(${params}) {
  const [data, setData] = useState<${outputType} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new RpcProvider({ nodeUrl: NETWORK_RPC });
      const contract = new Contract(ABI, CONTRACT_ADDRESS, provider);
      const result = await contract.${fn.name}(${fn.inputs?.map((i) => toCamel(i.name)).join(", ") ?? ""});
      setData(result as ${outputType});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [${hasParams ? fn.inputs!.map((i) => toCamel(i.name)).join(", ") : ""}]);

  useEffect(() => {
    void read();
  }, [read${paramArgs}]);

  return { data, loading, error, refetch: read };
}
`;
}

function generateWriteHook(fn: AbiEntry, contractName: string): string {
  const hookName = `use${toPascal(contractName)}${toPascal(fn.name)}`;
  const params = buildParams(fn.inputs);
  const calldataLines = buildCalldataLines(fn.inputs);

  return `/**
 * Write: ${fn.name}
 * State mutability: external (gasless via Starkzap + AVNU Paymaster)
 */
export function ${hookName}() {
  const { wallet } = useStarkzap();
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (${params}) => {
    if (!wallet) {
      setError('Wallet not connected. Call connectWallet() first.');
      return;
    }
    setStatus('pending');
    setError(null);
    setTxHash(null);
    try {
      const calldata = [
${calldataLines.join("\n")}
      ];
      const tx = await wallet.execute(
        [{ contractAddress: CONTRACT_ADDRESS, entrypoint: '${fn.name}', calldata }],
        { feeMode: 'sponsored' }
      );
      setTxHash(tx.hash);
      await tx.wait();
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [wallet]);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
  }, []);

  return { execute, status, txHash, error, reset };
}
`;
}

function generateStarkzapContext(): string {
  return `// ── Starkzap context ──────────────────────────────────────────────────────────
// Minimal hook to access the Starkzap wallet instance.
// Wrap your app with <StarkzapProvider> before using write hooks.

import { createContext, useContext, useState, type ReactNode } from 'react';
import { StarkZap, OnboardStrategy, accountPresets } from 'starkzap';

type SzWallet = Awaited<ReturnType<StarkZap['onboard']>>['wallet'];

interface StarkzapContextValue {
  wallet: SzWallet | null;
  connectWallet: () => Promise<void>;
  address: string | null;
}

const StarkzapContext = createContext<StarkzapContextValue>({
  wallet: null,
  connectWallet: async () => {},
  address: null,
});

const sdk = new StarkZap({ chainId: CHAIN_ID });

export function StarkzapProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<SzWallet | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    const { wallet: w } = await sdk.onboard({
      strategy: OnboardStrategy.BrowserExtension,
      accountPreset: accountPresets.argentXV050,
      feeMode: 'sponsored',
      deploy: 'never',
    });
    setWallet(w);
    setAddress(w.address);
  };

  return (
    <StarkzapContext.Provider value={{ wallet, connectWallet, address }}>
      {children}
    </StarkzapContext.Provider>
  );
}

export function useStarkzap() {
  return useContext(StarkzapContext);
}
`;
}

export function generateHooksFile(input: GenerateHooksInput): string {
  const { contractName, contractAddress, classHash, network, abi, parsed } = input;

  const rpcUrl =
    network === "mainnet"
      ? "https://free-rpc.nethermind.io/mainnet-juno/v0_8"
      : "https://free-rpc.nethermind.io/sepolia-juno/v0_8";

  const chainId = network === "mainnet" ? "ChainId.MAINNET" : "ChainId.SEPOLIA";

  const preamble = `/**
 * Generated by Unzap Contract Lab
 * https://unzap.dev
 *
 * Contract : ${contractName}
 * Address  : ${contractAddress}
 * Class    : ${classHash}
 * Network  : Starknet ${network === "mainnet" ? "Mainnet" : "Sepolia"}
 *
 * ─── Setup ────────────────────────────────────────────────────────────────────
 * 1. npm install starknet starkzap
 * 2. Wrap your app root:
 *      import { StarkzapProvider } from './use${toPascal(contractName)}';
 *      <StarkzapProvider><App /></StarkzapProvider>
 * 3. Use hooks anywhere:
 *      const { data } = use${toPascal(contractName)}${parsed.reads[0] ? toPascal(parsed.reads[0].name) : "Read"}();
 *      const { execute, status } = use${toPascal(contractName)}${parsed.writes[0] ? toPascal(parsed.writes[0].name) : "Write"}();
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use client';

import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from 'react';
import { RpcProvider, Contract } from 'starknet';
import { StarkZap, OnboardStrategy, accountPresets, ChainId } from 'starkzap';

// ── Contract constants ─────────────────────────────────────────────────────────

const CONTRACT_ADDRESS = '${contractAddress}';
const NETWORK_RPC = '${rpcUrl}';
const CHAIN_ID = ${chainId};
const ABI = ${JSON.stringify(abi, null, 2)} as const;
`;

  const structBlock = generateStructInterfaces(parsed.structs);

  const contextBlock = generateStarkzapContext();

  const readHooks =
    parsed.reads.length > 0
      ? `// ── Read hooks (view functions) ───────────────────────────────────────────────\n\n` +
        parsed.reads.map((fn) => generateReadHook(fn, contractName)).join("\n")
      : "// No view functions found in this contract's ABI.\n";

  const writeHooks =
    parsed.writes.length > 0
      ? `// ── Write hooks (external functions, gasless via Starkzap) ───────────────────\n\n` +
        parsed.writes.map((fn) => generateWriteHook(fn, contractName)).join("\n")
      : "// No external functions found in this contract's ABI.\n";

  return [preamble, structBlock, contextBlock, readHooks, writeHooks].join("\n");
}
