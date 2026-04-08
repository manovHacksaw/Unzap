import { generateHooksFile, type GenerateHooksInput } from "./hookGenerator";
import { readTemplate, inject } from "./inject";
import { buildReadSection, buildWriteSection } from "./reactUiGenerator";

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
  const shortAddr = contractAddress ? `${contractAddress.slice(0, 8)}…${contractAddress.slice(-6)}` : "0x…";

  const hooksCode = generateHooksFile(input);
  const hooksFilename = `use${pascal}.tsx`;

  const files: Record<string, string> = {};

  // Standard static files
  files["postcss.config.mjs"] = readTemplate("nextjs", "postcss.config.mjs");
  files["next.config.mjs"] = readTemplate("nextjs", "next.config.mjs");
  files["tsconfig.json"] = readTemplate("nextjs", "tsconfig.json");
  files["app/globals.css"] = readTemplate("nextjs", "app", "globals.css");
  files["components/LogsPanel.tsx"] = readTemplate("nextjs", "components", "LogsPanel.tsx");

  // Injected template files
  files["package.json"] = inject(readTemplate("nextjs", "package.json"), { SLUG: slug });
  files[".env.example"] = inject(readTemplate("nextjs", ".env.example"), { ADDRESS: contractAddress, NETWORK: network });
  
  const rpc = network === "mainnet"
    ? "https://free-rpc.nethermind.io/mainnet-juno/v0_8"
    : "https://free-rpc.nethermind.io/sepolia-juno/v0_8";
    
  files["lib/contract.ts"] = inject(readTemplate("nextjs", "lib", "contract.ts"), {
    ADDRESS: contractAddress,
    CLASS_HASH: classHash ?? "",
    NETWORK: network,
    RPC_URL: rpc,
    ABI_JSON: JSON.stringify(abi, null, 2),
  });

  files["app/layout.tsx"] = inject(readTemplate("nextjs", "app", "layout.tsx"), {
    CONTRACT_NAME: contractName,
    PASCAL_NAME: pascal,
  });

  files["app/page.tsx"] = inject(readTemplate("nextjs", "app", "page.tsx"), {
    CONTRACT_NAME: contractName,
    PASCAL_NAME: pascal,
    NETWORK: network,
    SHORT_ADDRESS: shortAddr,
  });

  // Contract UI Dynamic Generation
  const readImports = parsed.reads.map(fn => `use${pascal}${toPascal(fn.name)}`);
  const writeImports = parsed.writes.map(fn => `use${pascal}${toPascal(fn.name)}`);
  const needsStarkzap = parsed.writes.length > 0;
  
  const allImports = [
    ...readImports,
    ...writeImports,
    ...(needsStarkzap ? ["useStarkzap"] : []),
  ];
  
  const hookImports = allImports.length > 0 
    ? `import { ${allImports.join(", ")} } from "@/hooks/use${pascal}";`
    : "";

  const readSections = parsed.reads.map(fn => buildReadSection(fn, contractName)).join("\n");
  const writeSections = parsed.writes.map(fn => buildWriteSection(fn, contractName)).join("\n");
  
  const readRender = parsed.reads.map(fn => `        <${toPascal(fn.name)}Row />`).join("\n");
  const writeRender = parsed.writes.map(fn => `        <${toPascal(fn.name)}Row />`).join("\n");

  const hasReads = parsed.reads.length > 0 ? `        <div className="subhed">Read</div>` : "";
  const hasWrites = parsed.writes.length > 0 ? `        <div className="subhed">Write</div>` : "";

  files["components/ContractUI.tsx"] = inject(readTemplate("nextjs", "components", "ContractUI.tsx"), {
    HOOK_IMPORTS: hookImports,
    READ_COMPONENTS: readSections,
    WRITE_COMPONENTS: writeSections,
    HAS_READS: hasReads,
    RENDER_READS: readRender,
    HAS_WRITES: hasWrites,
    RENDER_WRITES: writeRender,
  });

  // Generated hooks
  files[`hooks/${hooksFilename}`] = hooksCode;

  // Add a simple basic README if needed
  files["README.md"] = `# ${pascal} - Unzap Generated dApp\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`;

  return {
    files,
    hooksFilename,
    functions: {
      reads: parsed.reads.map((f) => f.name),
      writes: parsed.writes.map((f) => f.name),
    },
  };
}

function toPascal(s: string): string {
  return s.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
}
