import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privy } from "@/lib/privy";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const header = req.headers.get("authorization");
    if (!header) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = header.replace("Bearer ", "");
    const { userId } = await privy.verifyAuthToken(token);

    const deployment = await prisma.deployment.findFirst({
      where: { id, userId },
    });

    if (!deployment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(deployment);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    const msg = err.message?.toLowerCase() ?? "";
    const isDbDown =
      err.code === "P1001" ||
      msg.includes("can't reach database") ||
      msg.includes("connect timeout") ||
      msg.includes("econnrefused");

    if (isDbDown) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    console.error("GET /api/deployments/[id] failed:", err.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
