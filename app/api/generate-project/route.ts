import { NextResponse } from "next/server";
import { generateProject } from "@/lib/codegen/projectGenerator";
import { parseAbi } from "@/lib/codegen/abiParser";
import type { AbiEntry } from "@/app/studio/contract-lab/types";
import type { Network } from "@/lib/network-config";

interface GenerateProjectBody {
  contractName: string;
  contractAddress: string;
  classHash: string;
  network: Network;
  abi: AbiEntry[];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<GenerateProjectBody>;
    const { contractName, contractAddress, classHash, network, abi } = body;

    if (!contractAddress || !abi || !Array.isArray(abi)) {
      return NextResponse.json(
        { error: "contractAddress and abi (array) are required." },
        { status: 400 }
      );
    }

    const resolvedName = (contractName ?? "MyContract").replace(
      /[^a-zA-Z0-9_]/g,
      ""
    );
    const resolvedNetwork: Network =
      network === "mainnet" ? "mainnet" : "sepolia";

    const parsed = parseAbi(abi);

    const result = generateProject({
      contractName: resolvedName,
      contractAddress,
      classHash: classHash ?? "",
      network: resolvedNetwork,
      abi,
      parsed,
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-project] error:", msg);
    return NextResponse.json(
      { error: "Project generation failed.", details: msg },
      { status: 500 }
    );
  }
}
