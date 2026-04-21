import type { AbiEntry } from "@/app/studio/contract-lab/types";

export interface ParsedAbi {
  reads: AbiEntry[];
  writes: AbiEntry[];
  structs: AbiEntry[];
  constructor: AbiEntry | null;
}

function flattenFunctions(entries: AbiEntry[]): AbiEntry[] {
  const result: AbiEntry[] = [];
  for (const entry of entries) {
    if (entry.type === "function") {
      result.push(entry);
    } else if (entry.type === "interface" && entry.items) {
      result.push(...flattenFunctions(entry.items));
    } else if (entry.type === "impl" && entry.items) {
      result.push(...flattenFunctions(entry.items));
    }
  }
  return result;
}

export function parseAbi(abi: AbiEntry[]): ParsedAbi {
  const reads: AbiEntry[] = [];
  const writes: AbiEntry[] = [];
  const structs: AbiEntry[] = [];
  let constructor: AbiEntry | null = null;

  const allFunctions = flattenFunctions(abi);

  for (const entry of abi) {
    if (entry.type === "struct" || entry.type === "enum") {
      structs.push(entry);
    }
    if (entry.type === "constructor") {
      constructor = entry;
    }
  }

  for (const fn of allFunctions) {
    if (fn.state_mutability === "view") {
      reads.push(fn);
    } else {
      writes.push(fn);
    }
  }

  return { reads, writes, structs, constructor };
}
