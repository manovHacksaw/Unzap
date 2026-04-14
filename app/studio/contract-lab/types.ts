import type { StarkZap } from "starkzap";

// ── Constants ─────────────────────────────────────────────────────────────────

export const COMPILER_URL = process.env.NEXT_PUBLIC_COMPILER_URL ?? "https://gallant-peace-production-7e77.up.railway.app";
export const CONTRACT_LAB_DRAFT_KEY = "unzap:contract-lab:draft";
export const CONTRACT_LAB_SETTINGS_KEY = "unzap:contract-lab:settings";
export const CONTRACT_LAB_WALLET_SESSION_KEY = "unzap:contract-lab:wallet-session";
export const CONTRACT_LAB_DRAFT_VERSION = 2;
export const STRK_TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
export const UDC_ADDRESS = "0x02ceed65a4bd731034c01113685c831b01c15d7d432f71afb1cf1634b53a2125";
export const UDC_ENTRYPOINT = "deployContract";

export const INITIAL_FILES = [
  {
    id: "storage-1",
    filename: "simple_storage.cairo",
    source: `#[starknet::interface]
trait ISimpleStorage<TContractState> {
    fn set(ref self: TContractState, value: felt252);
    fn get(self: @TContractState) -> felt252;
}

#[starknet::contract]
mod SimpleStorage {
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        stored_value: felt252,
    }

    #[abi(embed_v0)]
    impl StorageImpl of super::ISimpleStorage<ContractState> {
        fn set(ref self: ContractState, value: felt252) {
            self.stored_value.write(value);
        }

        fn get(self: @ContractState) -> felt252 {
            self.stored_value.read()
        }
    }
}
`,
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type SzWalletType = Awaited<ReturnType<StarkZap["onboard"]>>["wallet"];

export type DeployStepStatus = "idle" | "active" | "done" | "error";
export interface DeployStep {
  id: string;
  label: string;
  detail?: string;
  status: DeployStepStatus;
}

export interface IDESettings {
  theme: "amber" | "emerald" | "azure" | "mono";
  fontSize: number;
  showLineNumbers: boolean;
  autoSave: boolean;
  lineWrapping: boolean;
}

export const DEFAULT_SETTINGS: IDESettings = {
  theme: "amber",
  fontSize: 13,
  showLineNumbers: true,
  autoSave: true,
  lineWrapping: false,
};

export interface CompileError {
  message: string;
  line: number;
  col: number;
}

export interface ExplorerContextMenuState {
  x: number;
  y: number;
  fileId: string | null;
}

export interface ExplorerEntry {
  id: string;
  filename: string;
  source: string;
  readonly?: boolean;
  kind: "source" | "artifact";
  sourceFileId?: string;
}

export interface SearchMatch {
  index: number;
  line: number;
  col: number;
  preview: string;
}

export interface ContractLabDraft {
  version: number;
  files: typeof INITIAL_FILES;
  activeFileId: string;
  buildOutputsByFile: Record<string, CompileSuccess>;
  updatedAt: number;
}

export interface AbiEntry {
  type: string;
  name: string;
  inputs?: { name: string; type: string }[];
  outputs?: { type: string }[];
  state_mutability?: string;
  items?: AbiEntry[];
}

export interface CompileSuccess {
  sierra: unknown;
  casm: unknown;
  abi: AbiEntry[];
  logs: string;
}

export interface TransactionData {
  hash: string;
  type: string;
  status?: string;
}

export interface DeploymentData {
  contractAddress: string;
  classHash: string;
  abi: AbiEntry[];
  name: string;
  network?: string;
}

export interface ContractHistoryItem {
  id: string;
  contractAddress: string;
  classHash: string;
  abi: string; // JSON string
  name: string;
  network: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionHistoryItem {
  id: string;
  hash: string;
  type: string;
  status: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryData {
  deployments: ContractHistoryItem[];
  transactions: TransactionHistoryItem[];
}

export interface CompileFailure {
  errors?: CompileError[];
  logs?: string;
}

export interface LiveDiagnostic extends CompileError {
  severity: "warning" | "hint";
}

export type BuildStatus = "idle" | "building" | "success" | "error";
export type DeployStatus = "idle" | "declaring" | "declared" | "deploying" | "deployed";

// ── InteractPanel types ────────────────────────────────────────────────────────

export interface CallLogEntry {
  id: string;
  fnName: string;
  type: "read" | "write";
  inputs: Record<string, string>;
  result?: string;
  error?: string;
  txHash?: string;
  timestamp: number;
  confirmed?: boolean;
}

export interface FnResult {
  raw: string[];
  decoded: string;
  extra?: string;
}

export type StudioToastTone = "success" | "error" | "info" | "warning";

export interface StudioToastInput {
  title: string;
  description?: string;
  tone?: StudioToastTone;
}

export interface StudioToast extends StudioToastInput {
  id: string;
  tone: StudioToastTone;
}
