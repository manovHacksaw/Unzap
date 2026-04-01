import { NextResponse } from "next/server";
import { RpcProvider } from "starknet";
import { StarkZap, StarkSigner, accountPresets } from "starkzap";
import { getNetworkConfig, type Network } from "@/lib/network-config";

export async function POST(req: Request) {
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const deployerAddress = process.env.DEPLOYER_ADDRESS;

  if (!deployerPrivateKey || !deployerAddress) {
    return NextResponse.json(
      { error: "Deployer wallet not configured. Cannot declare contract server-side." },
      { status: 503 }
    );
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
  const sdk = new StarkZap({ network: netConfig.network });
  if (!sierra || !casm) {
    return NextResponse.json({ error: "Missing sierra or casm in request body" }, { status: 400 });
  }

  try {
    const signer = new StarkSigner(deployerPrivateKey);
    const wallet = await sdk.connectWallet({
      account: { signer, accountClass: accountPresets.argentXV050 },
      accountAddress: deployerAddress as Parameters<typeof sdk.connectWallet>[0]["accountAddress"],
    });

    const account = wallet.getAccount();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await account.declare({ contract: sierra as any, casm: casm as any });

    // Wait for confirmation on the server side
    const provider = new RpcProvider({ nodeUrl: netConfig.rpcUrl });
    await provider.waitForTransaction(result.transaction_hash);

    return NextResponse.json({
      classHash: result.class_hash,
      txHash: result.transaction_hash,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);

    // Already declared → extract the class hash from the error message
    // Error: StarknetErrorCode.CLASS_ALREADY_DECLARED
    const alreadyDeclaredMatch = msg.match(/class_hash["\s:]+([0-9a-fx]+)/i);
    if (msg.includes("CLASS_ALREADY_DECLARED") || msg.includes("already declared")) {
      // Try to get the class hash from the sierra
      try {
        const { hash } = await import("starknet");
        const classHash = hash.computeSierraContractClassHash(
          sierra as Parameters<typeof hash.computeSierraContractClassHash>[0]
        );
        return NextResponse.json({ classHash, txHash: null, alreadyDeclared: true });
      } catch {
        // fall through to return error with extracted hash if any
      }
      if (alreadyDeclaredMatch) {
        return NextResponse.json({ classHash: alreadyDeclaredMatch[1], txHash: null, alreadyDeclared: true });
      }
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
