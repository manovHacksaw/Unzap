import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privy } from "@/lib/privy";

export async function GET(req: Request) {
    try {
        const header = req.headers.get("authorization");
        if (!header) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = header.replace("Bearer ", "");
        const { userId } = await privy.verifyAccessToken(token);

        const projects = await prisma.project.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(projects.map((p: any) => ({
            ...p,
            files: JSON.parse(p.files)
        })));
    } catch (error) {
        console.error("GET Projects failed:", error);
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
        const { id, name, files } = body;

        const project = await prisma.project.upsert({
            where: { id: id || "new-dummy-id" }, // upsert needs a unique identifier
            update: {
                name,
                files: JSON.stringify(files),
            },
            create: {
                id: id || undefined,
                name,
                files: JSON.stringify(files),
                userId,
            },
        });

        return NextResponse.json({
            ...project,
            files: JSON.parse(project.files)
        });
    } catch (error) {
        console.error("POST Project failed:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
