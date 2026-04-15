import { generateHooksFile, type GenerateHooksInput } from "./hookGenerator";
import { readTemplate, inject } from "./inject";

export interface ProjectFiles {
  /** Flat map: relative file path → file content */
  files: Record<string, string>;
  /** Detected function names for display in UI */
  functions: {
    reads: string[];
    writes: string[];
  };
  /** The hooks filename for display (e.g. "useMyContract.ts") */
  hooksFilename: string;
}

export function generateProject(input: GenerateHooksInput): ProjectFiles {
  const { contractName, contractAddress, classHash, network, abi, parsed } = input;

  const pascal =
    contractName.charAt(0).toUpperCase() +
    contractName.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    
  const slug = contractName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const hooksCode = generateHooksFile(input);
  const hooksFilename = `use${pascal}.tsx`;

  const files: Record<string, string> = {};

  // ── Static Template Files ──────────────────────────────────────────────────
  
  const staticFiles = [
    "postcss.config.mjs",
    "next.config.mjs",
    "tsconfig.json",
    "app/globals.css",
    "lib/contractFunctions.ts",
    "hooks/useContract.ts",
    "components/ActionItem.tsx",
    "components/ReadItem.tsx",
    "components/Actions.tsx",
    "components/Data.tsx",
    "components/Activity.tsx",
    "components/Header.tsx",
    "components/Overview.tsx",
    "components/WalletBar.tsx",
    "components/SetupGuide.tsx",
    "providers/index.tsx",
    "providers/privy-wrapper.tsx",
    "app/api/signer-context/route.ts",
    "app/api/wallet/sign/route.ts",
    "lib/stubs/generic.ts",
  ];

  for (const f of staticFiles) {
    files[f] = readTemplate("nextjs", ...f.split("/"));
  }

  // ── Injected Template Files ────────────────────────────────────────────────
  
  const vars = {
    SLUG: slug,
    ADDRESS: contractAddress,
    CONTRACT_ADDRESS: contractAddress,
    NETWORK: network,
    CONTRACT_NAME: contractName,
    PASCAL_NAME: pascal,
    CLASS_HASH: classHash ?? "",
    RPC_URL: network === "mainnet"
      ? "https://free-rpc.nethermind.io/mainnet-juno/v0_8"
      : "https://starknet-sepolia.drpc.org",
    ABI_JSON: JSON.stringify(abi, null, 2),
  };

  files["package.json"] = inject(readTemplate("nextjs", "package.json"), vars);
  files[".env.example"] = inject(readTemplate("nextjs", "env.example"), vars);
  files["README.md"] = inject(readTemplate("nextjs", "README.md"), vars);
  files["lib/contract.ts"] = inject(readTemplate("nextjs", "lib", "contract.ts"), vars);
  files["app/layout.tsx"] = inject(readTemplate("nextjs", "app", "layout.tsx"), vars);
  files["app/page.tsx"] = inject(readTemplate("nextjs", "app", "page.tsx"), vars);
  files["hooks/wallet.ts"] = inject(readTemplate("nextjs", "hooks", "wallet.ts"), vars);

  // ── Generated Files ────────────────────────────────────────────────────────
  
  files[`hooks/${hooksFilename}`] = hooksCode;

  return {
    files,
    hooksFilename,
    functions: {
      reads: parsed.reads.map((f) => f.name),
      writes: parsed.writes.map((f) => f.name),
    },
  };
}
