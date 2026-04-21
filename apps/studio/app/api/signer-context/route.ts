import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privy } from "@/lib/privy";

const PRIVY_API_BASE_URL = "https://api.privy.io";

function getPrivyCredentials() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Privy server credentials are not configured.");
  }

  return { appId, appSecret };
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

async function privyFetch(path: string, options: RequestInit = {}) {
  const { appId, appSecret } = getPrivyCredentials();
  const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString("base64");

  return fetch(`${PRIVY_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth}`,
      "privy-app-id": appId,
      ...(options.headers ?? {}),
    },
  });
}

async function createPrivyWallet() {
  const createRes = await privyFetch("/v1/wallets", {
    method: "POST",
    body: JSON.stringify({ chain_type: "starknet" }),
  });

  if (!createRes.ok) {
    const err = (await createRes.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    throw new Error(err.message ?? err.error ?? "Failed to create wallet");
  }

  const created = (await createRes.json()) as { id?: string };

  if (!created.id) {
    throw new Error("Privy did not return a wallet id.");
  }

  return created.id;
}

async function getOrCreateWalletId(userId: string) {
  const existing = await prisma.privyWallet.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing.walletId;
  }

  const createdWalletId = await createPrivyWallet();

  try {
    const record = await prisma.privyWallet.create({
      data: {
        userId,
        walletId: createdWalletId,
      },
    });

    return record.walletId;
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const record = await prisma.privyWallet.findUnique({
      where: { userId },
    });

    if (!record) {
      throw error;
    }

    return record.walletId;
  }
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  let userId: string;

  try {
    const verifiedToken = await privy.verifyAuthToken(token);
    userId = verifiedToken.userId;
  } catch {
    return NextResponse.json({ error: "Invalid access token" }, { status: 401 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Invalid access token" }, { status: 401 });
  }

  try {
    const walletId = await getOrCreateWalletId(userId);
    const walletRes = await privyFetch(`/v1/wallets/${walletId}`);

    if (!walletRes.ok) {
      const err = (await walletRes.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      return NextResponse.json(
        { error: err.message ?? err.error ?? "Failed to fetch wallet details" },
        { status: 500 }
      );
    }

    const wallet = (await walletRes.json()) as {
      id: string;
      public_key: string;
    };
    const origin = new URL(req.url).origin;

    return NextResponse.json({
      walletId: wallet.id,
      publicKey: wallet.public_key,
      serverUrl: `${origin}/api/wallet/sign`,
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };

    console.error("POST /api/signer-context failed:", {
      message: err.message,
      code: err.code,
      stack: error instanceof Error ? error.stack?.split("\n")[0] : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to resolve signer context",
        details: process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
