import { NextResponse } from "next/server";
import { hash, RpcProvider } from "starknet";
import { StarkZap, StarkSigner, accountPresets } from "starkzap";
import { getNetworkConfig, type Network } from "@/lib/network-config";

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
    const result = await account.declare({
      contract: sierra as Parameters<typeof account.declare>[0]["contract"],
      casm: casm as Parameters<typeof account.declare>[0]["casm"],
    });

    await provider.waitForTransaction(result.transaction_hash);

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
      } catch {
        // fall through
      }
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
