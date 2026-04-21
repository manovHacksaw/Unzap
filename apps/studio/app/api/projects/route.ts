import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privy } from "@/lib/privy";

export async function GET(req: Request) {
    try {
        const header = req.headers.get("authorization");
        if (!header) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const token = header.replace("Bearer ", "");
        const { userId } = await privy.verifyAuthToken(token);

        const projects = await prisma.project.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(projects.map((p: { id: string; name: string; files: string }) => ({
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
        const { userId } = await privy.verifyAuthToken(token);

        const body = await req.json();
        const { id, name, files } = body;

        const existing = id
            ? await prisma.project.findUnique({ where: { id } })
            : await prisma.project.findFirst({ where: { userId, name } });

        const project = existing
            ? await prisma.project.update({
                where: { id: existing.id },
                data: { name, files: JSON.stringify(files) },
            })
            : await prisma.project.create({
                data: { name, files: JSON.stringify(files), userId },
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
