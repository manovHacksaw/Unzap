import { NextResponse } from "next/server";
import { parseAbi } from "@/lib/codegen/abiParser";
import { generateHooksFile } from "@/lib/codegen/hookGenerator";
import type { AbiEntry } from "@/app/studio/contract-lab/types";
import type { Network } from "@/lib/network-config";

interface GenerateHooksBody {
  contractName: string;
  contractAddress: string;
  classHash: string;
  network: Network;
  abi: AbiEntry[];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<GenerateHooksBody>;

    const { contractName, contractAddress, classHash, network, abi } = body;

    if (!contractAddress || !abi || !Array.isArray(abi)) {
      return NextResponse.json(
        { error: "contractAddress and abi (array) are required." },
        { status: 400 }
      );
    }

    const resolvedName = (contractName ?? "MyContract").replace(/[^a-zA-Z0-9]/g, "");
    const resolvedNetwork: Network = network === "mainnet" ? "mainnet" : "sepolia";

    const parsed = parseAbi(abi);
    const code = generateHooksFile({
      contractName: resolvedName,
      contractAddress,
      classHash: classHash ?? "",
      network: resolvedNetwork,
      abi,
      parsed,
    });

    return NextResponse.json({
      code,
      filename: `use${resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1)}.ts`,
      functions: {
        reads: parsed.reads.map((f) => f.name),
        writes: parsed.writes.map((f) => f.name),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-hooks error:", msg);
    return NextResponse.json({ error: "Code generation failed.", details: msg }, { status: 500 });
  }
}
