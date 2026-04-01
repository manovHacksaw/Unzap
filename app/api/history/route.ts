import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privy } from "@/lib/privy";

export async function GET(req: Request) {
    try {
        const header = req.headers.get("authorization");
        if (!header) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = header.replace("Bearer ", "");
        const { userId } = await privy.verifyAccessToken(token);

        const deployments = await prisma.deployment.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ deployments, transactions });
    } catch (error) {
        console.error("GET History failed:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const header = req.headers.get("authorization");
        if (!header) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = header.replace("Bearer ", "");
        const { userId } = await privy.verifyAccessToken(token);

        const body = await req.json();
        const { type, data } = body; // type is 'transaction' or 'deployment'

        if (type === "deployment") {
            const deployment = await prisma.deployment.create({
                data: {
                    contractAddress: data.contractAddress,
                    classHash: data.classHash,
                    abi: JSON.stringify(data.abi),
                    name: data.name,
                    network: data.network || "mainnet",
                    userId,
                },
            });
            return NextResponse.json(deployment);
        } else {
            const transaction = await prisma.transaction.create({
                data: {
                    hash: data.hash,
                    type: data.type, // 'declare', 'deploy', 'invoke'
                    status: data.status || "success",
                    userId,
                },
            });
            return NextResponse.json(transaction);
        }
    } catch (error) {
        console.error("POST History failed:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
