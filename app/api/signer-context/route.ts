import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privy } from "@/lib/privy";

async function privyFetch(path: string, options: RequestInit = {}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  const appSecret = process.env.PRIVY_APP_SECRET!;
  const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString("base64");

  return fetch(`https://api.privy.io${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
      "privy-app-id": appId,
      ...(options.headers ?? {}),
    },
  });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  let userDid: string;
  try {
    const claims = await privy.verifyAuthToken(token);
    userDid = claims.userId;
  } catch (err) {
    console.error("[signer-context] Token verification failed:", err);
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  try {
    // Look up existing wallet in database
    const existing = await prisma.privyWallet.findUnique({ where: { userId: userDid } });
    let walletId = existing?.walletId ?? null;

    if (!walletId) {
      const createRes = await privyFetch("/v1/wallets", {
        method: "POST",
        body: JSON.stringify({ chain_type: "starknet" }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        const message = (err as { message?: string }).message ?? "Failed to create wallet";
        console.error("[signer-context] Privy wallet creation failed:", message);
        return NextResponse.json({ error: message }, { status: 500 });
      }

      const created = await createRes.json();
      walletId = created.id as string;

      // Persist wallet ID to database (survives deploys, works on Vercel)
      await prisma.privyWallet.create({
        data: {
          id: walletId,
          userId: userDid,
          walletId,
          updatedAt: new Date(),
        },
      });
    }

    const walletRes = await privyFetch(`/v1/wallets/${walletId}`);

    if (!walletRes.ok) {
      console.error("[signer-context] Failed to fetch wallet details for walletId:", walletId);
      return NextResponse.json({ error: "Failed to fetch wallet details" }, { status: 500 });
    }

    const wallet = await walletRes.json();
    const origin = new URL(req.url).origin;

    return NextResponse.json({
      walletId: wallet.id,
      publicKey: wallet.public_key,
      serverUrl: `${origin}/api/wallet/sign`,
    });
  } catch (err) {
    console.error("[signer-context] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
