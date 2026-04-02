import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privy } from "@/lib/privy";

export async function GET(req: Request) {
    try {
        const header = req.headers.get("authorization");
        if (!header) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = header.replace("Bearer ", "");
        const { userId } = await privy.verifyAuthToken(token);

        const deployments = await prisma.deployment.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ deployments, transactions });
    } catch (error: any) {
        console.error("GET History failed:", {
          message: error.message,
          code: error.code,
          stack: error.stack?.split("\n")[0]
        });
        return NextResponse.json({ 
          error: "Internal error", 
          details: process.env.NODE_ENV === "development" ? error.message : undefined 
        }, { status: 500 });
    }
}

interface DeploymentData {
    contractAddress: string;
    classHash: string;
    abi: unknown[];
    name: string;
    network?: string;
}

interface TransactionData {
    hash: string;
    type: string;
    status?: string;
}

interface HistoryPostBody {
    type: "deployment" | "transaction";
    data: DeploymentData | TransactionData;
}

export async function POST(req: Request) {
    try {
        const header = req.headers.get("authorization");
        if (!header) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = header.replace("Bearer ", "");
        const { userId } = await privy.verifyAuthToken(token);

        const body = await req.json() as HistoryPostBody;
        const { type, data } = body;

        if (type === "deployment") {
            const d = data as DeploymentData;
            const deployment = await prisma.deployment.create({
                data: {
                    contractAddress: d.contractAddress,
                    classHash: d.classHash,
                    abi: JSON.stringify(d.abi),
                    name: d.name,
                    network: d.network || "mainnet",
                    userId,
                },
            });
            return NextResponse.json(deployment);
        } else {
            const t = data as TransactionData;
            const transaction = await prisma.transaction.create({
                data: {
                    hash: t.hash,
                    type: t.type, // 'declare', 'deploy', 'invoke'
                    status: t.status || "success",
                    userId,
                },
            });
            return NextResponse.json(transaction);
        }
    } catch (error: unknown) {
        const err = error as Error;
        console.error("POST History failed:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
