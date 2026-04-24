import { NextResponse } from "next/server";
import { hash, RpcProvider, type CompiledSierra, type CairoAssembly } from "starknet";
import { StarkZap, StarkSigner, accountPresets } from "starkzap";
import { getNetworkConfig, type Network } from "@/lib/network-config";
import { privy } from "@/lib/privy";
import { prisma } from "@/lib/prisma";

const DAILY_SPONSORED_LIMIT = 10;

function readEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function getSponsorCredentials(network: Network) {
  const scope = network === "mainnet" ? "MAINNET" : "SEPOLIA";

  return {
    privateKey: readEnvValue(
      `${scope}_DEPLOYER_PRIVATE_KEY`,
      `DEPLOYER_PRIVATE_KEY_${scope}`,
      "DEPLOYER_PRIVATE_KEY"
    ),
    address: readEnvValue(
      `${scope}_DEPLOYER_ADDRESS`,
      `DEPLOYER_ADDRESS_${scope}`,
      "DEPLOYER_ADDRESS"
    ),
  };
}

function isClassHashMissingError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("not found") || normalized.includes("class hash");
}

export async function POST(req: Request) {
  const header = req.headers.get("authorization");
  if (!header) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = header.replace("Bearer ", "");

  let userId: string;
  try {
    const session = await privy.verifyAuthToken(token);
    userId = session.userId;
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  let body: { sierra: unknown; casm: unknown; network?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sierra, casm } = body;
  const networkName: Network = body.network === "sepolia" ? "sepolia" : "mainnet";
  const netConfig = getNetworkConfig(networkName);
  if (!sierra || !casm) {
    return NextResponse.json({ error: "Missing sierra or casm in request body" }, { status: 400 });
  }

  try {
    const provider = new RpcProvider({ nodeUrl: netConfig.rpcUrl });
    const classHash = hash.computeSierraContractClassHash(
      sierra as Parameters<typeof hash.computeSierraContractClassHash>[0]
    );

    try {
      await provider.getClassByHash(classHash);
      return NextResponse.json({
        classHash,
        txHash: null,
        alreadyDeclared: true,
        mode: "already_declared",
      });
    } catch (existingClassErr) {
      const existingClassMessage =
        existingClassErr instanceof Error ? existingClassErr.message : String(existingClassErr);

      if (!isClassHashMissingError(existingClassMessage)) {
        throw existingClassErr;
      }
    }

    try {
      const recentDeclares = await prisma.transaction.count({
        where: {
          userId,
          type: "declare",
          status: "success",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentDeclares >= DAILY_SPONSORED_LIMIT) {
        return NextResponse.json(
          {
            error: `Your daily sponsored declare limit (${DAILY_SPONSORED_LIMIT}/day) reached. Use a self-funded declare instead.`,
          },
          { status: 429 }
        );
      }
    } catch (dbErr) {
      console.error("[api/declare] Rate limit check failed — blocking sponsorship as a precaution:", dbErr);
      return NextResponse.json(
        { error: "Rate limit check unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    const { privateKey: deployerPrivateKey, address: deployerAddress } = getSponsorCredentials(networkName);
    if (!deployerPrivateKey || !deployerAddress) {
      return NextResponse.json(
        {
          error:
            "Studio sponsor wallet not configured. Set DEPLOYER_PRIVATE_KEY and DEPLOYER_ADDRESS to enable sponsored declare.",
        },
        { status: 503 }
      );
    }

    const sdk = new StarkZap({ network: netConfig.network });
    const signer = new StarkSigner(deployerPrivateKey);
    const wallet = await sdk.connectWallet({
      account: { signer, accountClass: accountPresets.argentXV050 },
      accountAddress: deployerAddress as Parameters<typeof sdk.connectWallet>[0]["accountAddress"],
      feeMode: "user_pays",
    });

    const account = wallet.getAccount();
    const compiledClassHash = hash.computeCompiledClassHash(casm as CairoAssembly);
    
    // Sponsored declare
    const result = await account.declare({
      contract: sierra as CompiledSierra,
      casm: casm as CairoAssembly,
      compiledClassHash,
    });

    try {
      await prisma.transaction.create({
        data: {
          hash: result.transaction_hash,
          type: "declare",
          status: "success",
          userId,
        },
      });
    } catch (dbLogErr) {
      console.error("[api/declare] Could not log sponsored declaration to DB:", dbLogErr);
    }

    // Return immediately — client polls for confirmation via the RPC node.
    return NextResponse.json({
      classHash: result.class_hash,
      txHash: result.transaction_hash,
      mode: "studio_sponsored",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.includes("CLASS_ALREADY_DECLARED") || msg.includes("already declared")) {
      try {
        const classHash = hash.computeSierraContractClassHash(
          sierra as Parameters<typeof hash.computeSierraContractClassHash>[0]
        );
        return NextResponse.json({
          classHash,
          txHash: null,
          alreadyDeclared: true,
          mode: "already_declared",
        });
      } catch (hashErr) {
        // extract from msg if possible
        const hashMatch = msg.match(/0x[a-fA-F0-9]{64}/);
        return NextResponse.json({
          classHash: hashMatch ? hashMatch[0] : "0x0",
          txHash: null,
          alreadyDeclared: true,
        });
      }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
