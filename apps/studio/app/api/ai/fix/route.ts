import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });

interface CairoError {
    line: number;
    col: number;
    message: string;
}

export async function POST(req: Request) {
    let body: { source?: unknown; error?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { source, error } = body;
    if (typeof source !== 'string' || !source || !error || typeof error !== 'object') {
        return NextResponse.json({ error: 'Missing source or error information' }, { status: 400 });
    }

    const cairoError = error as CairoError;

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.warn('[AI FIX] No API key configured — falling back to heuristics.');
        return getHeuristicFix(source, cairoError);
    }

    try {
        try {
            return await callGemini(source, cairoError, 'gemini-2.0-flash');
        } catch (e1: unknown) {
            const err1 = e1 instanceof Error ? e1 : new Error(String(e1));
            console.warn(`[AI FIX] gemini-2.0-flash failed: ${err1.message}`);
            return await callGemini(source, cairoError, 'gemini-1.5-flash');
        }
    } catch (finalError: unknown) {
        const err = finalError instanceof Error ? finalError : new Error(String(finalError));
        console.warn(`[AI FIX] All models failed: ${err.message}. Using heuristics.`);
        return getHeuristicFix(source, cairoError);
    }
}

async function callGemini(source: string, error: CairoError, modelName: string) {
    const prompt = `
You are an expert Starknet and Cairo developer targeting Scarb 2.9.2 / starknet 2.9.2.
Analyze the following Cairo source code and the specific compiler error provided.
Suggest a precise code-level fix.

CRITICAL RULES FOR SCARB 2.9.2:
- NEVER use #[derive(Store)] on structs — the Store plugin is not available.
- NEVER store a struct directly as a Map value (e.g. Map<u64, MyStruct>). Flatten structs into separate maps per field instead (e.g. Map<u64, ContractAddress>, Map<u64, u256>).
- NEVER use LegacyMap in new fixes. It is deprecated; use starknet::storage::Map instead.
- NEVER use StoragePathEntry or .entry(key).field.read/write() — this resolves to Felt252DictTrait::entry and does not work.
- For Map access, ONLY use StorageMapReadAccess and StorageMapWriteAccess with .read(key) and .write(key, value). These work for primitive value types: felt252, u8-u256, bool, ContractAddress, u64, u128.
- Tuple keys like Map<(u64, ContractAddress), u256> DO work with StorageMapReadAccess/StorageMapWriteAccess.
- ContractAddress is NOT auto-imported. Add: use starknet::ContractAddress; at the top of the file AND inside any module that uses it.
- Correct storage imports: use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
- Cairo short-string literals used in assert!/panic messages must fit in a single felt252. Keep them short ASCII strings (roughly <= 31 characters). If the compiler says a value does not fit within felt252 and points to a quoted message, shorten the message.
- Types, structs, interfaces, and generated dispatcher symbols declared outside #[starknet::contract] mod are NOT automatically in scope inside the module.
- If a contract module references a root-level type, prefer a minimal one-line fix using an explicit path like super::TokenTransfer, super::NftTransfer, super::IERC20Dispatcher, or super::IERC721Dispatcher.
- For Array/Span parameters of custom structs inside a contract module, ensure the struct is in scope and derives Serde + Drop. A minimal fix is often Array<super::MyStruct>.
- Dispatcher method calls depend on the generated dispatcher type and matching dispatcher trait being in scope. If a dispatcher type is missing inside a contract module, fix that before changing the method call.
- When the compiler says a parameter type is incompatible because the expected type is contract::MyType but the actual type is missing, the fix is usually to qualify the type inside the module with super::MyType.

SOURCE CODE:
\`\`\`cairo
${source}
\`\`\`

COMPILER ERROR:
Line ${error.line}:${error.col} - ${error.message}

INSTRUCTIONS:
1. Identify the exact line that needs to be changed.
2. Provide the corrected version of that line.
3. Keep the fix as minimal as possible.

RESPONSE FORMAT — respond ONLY with a valid JSON object, no markdown:
{
  "fix": {
    "line": ${error.line},
    "oldContent": "the exact original line",
    "newContent": "the new corrected line",
    "description": "Short explanation of the fix (Powered by ${modelName})"
  }
}`;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from model');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');

    return NextResponse.json(JSON.parse(jsonMatch[0]));
}

function getHeuristicFix(source: string, error: CairoError) {
    const errorMessage = error.message.toLowerCase();
    const line = error.line;
    const lines = source.split('\n');
    const targetLine = lines[line - 1];

    console.log(`[AI FIX] Running heuristics for: "${errorMessage}" at line ${line}`);

    if (errorMessage.includes("does not fit within the range of type core::felt252") && targetLine?.includes("'")) {
        const shortenedStringLine = targetLine.replace(/'([^']+)'/g, (_match, message: string) => `'${shortenCairoShortString(message)}'`);
        if (shortenedStringLine !== targetLine) {
            return NextResponse.json({
                fix: {
                    line,
                    oldContent: targetLine,
                    newContent: shortenedStringLine,
                    description: "Shortened the Cairo short-string literal so it fits within a single felt252 (Heuristic Fallback)."
                }
            });
        }
    }

    if ((errorMessage.includes("type not found") || errorMessage.includes("incompatible with")) && targetLine?.includes("Array<")) {
        const qualifiedArrayLine = targetLine.replace(/Array<([A-Z][A-Za-z0-9_]*)>/g, "Array<super::$1>");
        if (qualifiedArrayLine !== targetLine) {
            return NextResponse.json({
                fix: {
                    line,
                    oldContent: targetLine,
                    newContent: qualifiedArrayLine,
                    description: "Qualified the root-level Cairo type with 'super::' so the contract module can resolve it (Heuristic Fallback)."
                }
            });
        }
    }

    if (errorMessage.includes("type not found") && targetLine?.includes("Dispatcher {")) {
        const qualifiedDispatcherLine = targetLine.replace(/\b(I[A-Za-z0-9_]+Dispatcher)\b/g, "super::$1");
        if (qualifiedDispatcherLine !== targetLine) {
            return NextResponse.json({
                fix: {
                    line,
                    oldContent: targetLine,
                    newContent: qualifiedDispatcherLine,
                    description: "Qualified the generated dispatcher with 'super::' so it is visible inside the contract module (Heuristic Fallback)."
                }
            });
        }
    }

    if (errorMessage.includes("unsupported attribute") && targetLine?.includes("#[external")) {
        return NextResponse.json({
            fix: {
                line,
                oldContent: targetLine,
                newContent: targetLine.replace("#[external(v0)]", "#[abi(embed_v0)]").replace("#[external]", ""),
                description: "Replaced deprecated attribute with modern Starknet syntax (Heuristic Fallback)."
            }
        });
    }

    if (errorMessage.includes("write") || errorMessage.includes("read") || errorMessage.includes("no such field")) {
        const match = targetLine?.match(/(\s*)([a-zA-Z0-9_]+)\.(write|read)\(/);
        if (match) {
            const field = match[2];
            const method = match[3];

            if (!targetLine.includes("self.")) {
                return NextResponse.json({
                    fix: {
                        line,
                        oldContent: targetLine,
                        newContent: targetLine.replace(`${field}.${method}(`, `self.${field}.${method}(`),
                        description: "Added missing 'self.' storage reference (Heuristic Fallback)."
                    }
                });
            } else if (errorMessage.includes("map") || errorMessage.includes("storage_base")) {
                return NextResponse.json({
                    suggestion: `In Scarb 2.9.2, structs cannot be stored in a Map. Flatten your struct into separate maps per field (e.g. Map<u64, ContractAddress>, Map<u64, u256>). Use StorageMapReadAccess/StorageMapWriteAccess with .read(key) and .write(key, value).`,
                    description: "Scarb 2.9.2 does not support struct values in Map. Flatten into primitive-typed maps."
                });
            } else {
                return NextResponse.json({
                    suggestion: `Check if '${field}' is correctly defined in your '#[storage]' struct and matches the expected type.`,
                    description: "This error usually means a storage field is not declared or has a type mismatch."
                });
            }
        }
    }

    return NextResponse.json({
        suggestion: "The AI fix service is temporarily unavailable. Please try again later.",
        description: "AI service unavailable."
    });
}

function shortenCairoShortString(message: string) {
    const normalized = message.trim().toLowerCase();

    if (normalized.includes("registered voter") || normalized.includes("not a voter")) {
        return "not voter";
    }

    if (normalized.includes("already voted")) {
        return "dup vote";
    }

    if (normalized.includes("only admin")) {
        return "not admin";
    }

    const compact = normalized
        .replace(/[^a-z0-9 ]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 4)
        .join(" ")
        .slice(0, 31)
        .trim();

    return compact || "err";
}
