// Maps Cairo/Starknet types to TypeScript equivalents for generated hook files.

const EXACT_MAP: Record<string, string> = {
  // Felts & strings
  "felt252": "string",
  "core::felt252": "string",
  "felt": "string",
  "shortstring": "string",
  // Booleans
  "bool": "boolean",
  "core::bool": "boolean",
  // Unsigned integers
  "u8": "number",
  "core::integer::u8": "number",
  "u16": "number",
  "core::integer::u16": "number",
  "u32": "number",
  "core::integer::u32": "number",
  "u64": "number",
  "core::integer::u64": "number",
  "u128": "string", // too large for JS number
  "core::integer::u128": "string",
  "u256": "{ low: string; high: string }",
  "core::integer::u256": "{ low: string; high: string }",
  // Addresses
  "ContractAddress": "string",
  "core::starknet::contract_address::ContractAddress": "string",
  "ClassHash": "string",
  "core::starknet::class_hash::ClassHash": "string",
  "EthAddress": "string",
  "core::starknet::eth_address::EthAddress": "string",
  // Bytes
  "bytes31": "string",
  "core::bytes_31::bytes31": "string",
  "ByteArray": "string",
  "core::byte_array::ByteArray": "string",
};

export function toTsType(cairoType: string): string {
  if (!cairoType) return "string";

  // Exact match
  if (EXACT_MAP[cairoType]) return EXACT_MAP[cairoType];

  // Array: core::array::Array::<T> or Span::<T>
  const arrayMatch = cairoType.match(/^(?:core::array::Array|core::array::Span)::<(.+)>$/);
  if (arrayMatch) return `${toTsType(arrayMatch[1])}[]`;

  // Option<T>
  const optionMatch = cairoType.match(/^core::option::Option::<(.+)>$/);
  if (optionMatch) return `${toTsType(optionMatch[1])} | null`;

  // Tuple: (T1, T2, ...)
  if (cairoType.startsWith("(") && cairoType.endsWith(")")) {
    const inner = cairoType.slice(1, -1);
    const parts = splitGenericArgs(inner);
    return `[${parts.map(toTsType).join(", ")}]`;
  }

  // Fallback: use the last segment of the path as the type name
  const short = cairoType.split("::").pop() ?? cairoType;
  // Strip generic brackets for struct names
  return short.replace(/<.*>$/, "");
}

// Splits "T1, T2<A, B>, T3" correctly respecting nesting
function splitGenericArgs(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "<") depth++;
    else if (ch === ">") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// Converts a Cairo type to a calldata representation comment for generated code
export function toCalldataNote(cairoType: string): string {
  if (cairoType.includes("u256")) return "// u256: pass as { low: string; high: string }";
  if (cairoType.includes("Array") || cairoType.includes("Span")) return "// Array: pass length then each element";
  if (cairoType.includes("bool")) return "// bool: pass '0' or '1'";
  return "";
}
