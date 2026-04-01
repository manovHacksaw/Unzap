import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });

interface CairoError {
    line: number;
    col: number;
    message: string;
}

export async function POST(req: Request) {
    const { source, error } = await req.json() as { source: string; error: CairoError };

    if (!source || !error) {
        return NextResponse.json({ error: 'Missing source or error information' }, { status: 400 });
    }

    console.log(`[AI FIX] Request received. API Key configured: ${!!process.env.GOOGLE_GENERATIVE_AI_API_KEY}`);

    try {
        try {
            console.log(`[AI FIX] Attempting gemini-2.0-flash...`);
            return await callGemini(source, error, 'gemini-2.0-flash');
        } catch (e1: unknown) {
            const err = e1 as Error;
            console.warn(`[AI FIX] gemini-2.0-flash failed: ${err.message}`);
            try {
                console.log(`[AI FIX] Attempting gemini-1.5-flash...`);
                return await callGemini(source, error, 'gemini-1.5-flash');
            } catch (e2: unknown) {
                const err2 = e2 as Error;
                console.warn(`[AI FIX] gemini-1.5-flash failed: ${err2.message}`);
                throw err2;
            }
        }
    } catch (finalError: unknown) {
        const err = finalError as Error;
        console.warn(`[AI FIX] All models failed: ${err.message}. Using heuristics.`);
        return getHeuristicFix(source, error);
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
- NEVER use StoragePathEntry or .entry(key).field.read/write() — this resolves to Felt252DictTrait::entry and does not work.
- For Map access, ONLY use StorageMapReadAccess and StorageMapWriteAccess with .read(key) and .write(key, value). These work for primitive value types: felt252, u8-u256, bool, ContractAddress, u64, u128.
- Tuple keys like Map<(u64, ContractAddress), u256> DO work with StorageMapReadAccess/StorageMapWriteAccess.
- ContractAddress is NOT auto-imported. Add: use starknet::ContractAddress; at the top of the file AND inside any module that uses it.
- Correct storage imports: use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

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
        suggestion: "Gemini API quota exhausted (429). The AI fix service is temporarily unavailable. Please try again later or check your Google AI Studio billing.",
        description: "All AI models are rate-limited."
    });
}
