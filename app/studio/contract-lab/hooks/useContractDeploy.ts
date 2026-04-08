import { useState, useCallback, type MutableRefObject } from "react";
import { Account, hash, type CairoAssembly, type CompiledSierra, type ProviderInterface } from "starknet";
import type { StarkZap } from "starkzap";
import type { NetworkConfig, Network } from "@/lib/network-config";
import {
  UDC_ADDRESS,
  UDC_ENTRYPOINT,
  type SzWalletType,
  type DeployStep,
  type DeployStepStatus,
  type DeployStatus,
  type CompileSuccess,
  type ExplorerEntry,
  type TransactionData,
  type DeploymentData,
  type StudioToastInput,
} from "../types";

interface UseContractDeployProps {
  network: Network;
  netConfig: NetworkConfig;
  sdkRef: MutableRefObject<StarkZap | null>;
  activeBuildData: CompileSuccess | null;
  activeSourceFile: ExplorerEntry | null;
  activeFile: ExplorerEntry | null;
  starknetAccount: Account | import("starknet").WalletAccount | null;
  szWallet: SzWalletType | null;
  walletAddress: string;
  walletType: "privy" | "extension" | null;
  addLog: (log: string) => void;
  pushToast: (toast: StudioToastInput) => void;
  logTransaction: (data: TransactionData) => Promise<void>;
  logDeployment: (data: DeploymentData) => Promise<void>;
  setShowAuthModal: (show: boolean) => void;
  setShowDeployAccountPrompt: (show: boolean) => void;
  readStrkBalance: (provider: ProviderInterface, address: string) => Promise<bigint>;
  formatStrkAmount: (raw: bigint) => string;
  setStrkBalance: (balance: string | null) => void;
  fetchStrkBalance: (address: string) => Promise<void>;
  setActiveSidebarTab: (tab: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setActiveInteractFn: (fn: string | null) => void;
  getAccessToken: () => Promise<string | null>;
}

export function useContractDeploy({
  network,
  netConfig,
  sdkRef,
  activeBuildData,
  activeSourceFile,
  activeFile,
  starknetAccount,
  szWallet,
  walletAddress,
  walletType,
  addLog,
  pushToast,
  logTransaction,
  logDeployment,
  setShowAuthModal,
  setShowDeployAccountPrompt,
  readStrkBalance,
  formatStrkAmount,
  setStrkBalance,
  fetchStrkBalance,
  setActiveSidebarTab,
  setIsSidebarOpen,
  setActiveInteractFn,
  getAccessToken,
}: UseContractDeployProps) {
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [deploySteps, setDeploySteps] = useState<DeployStep[]>([]);
  const [classHash, setClassHash] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [constructorInputs, setConstructorInputs] = useState<Record<string, string>>({});
  const [salt, setSalt] = useState("0");
  const [isDeployingAccount, setIsDeployingAccount] = useState(false);
  const [showDeployAccountPrompt, setShowDeployAccountPromptLocal] = useState(false);

  // Sync external setter
  const setShowDeployAccountPromptBoth = useCallback(
    (show: boolean) => {
      setShowDeployAccountPromptLocal(show);
      setShowDeployAccountPrompt(show);
    },
    [setShowDeployAccountPrompt]
  );

  const setDeployStep = useCallback((id: string, status: DeployStepStatus, detail?: string) => {
    setDeploySteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, ...(detail ? { detail } : {}) } : s))
    );
  }, []);

  const TX_TIMEOUT_MS = network === "mainnet" ? 300_000 : 120_000;
  const TX_TIMEOUT_LABEL = network === "mainnet" ? "5 minutes" : "2 minutes";

  const waitForTx = useCallback(
    async (txHash: string, ms = TX_TIMEOUT_MS) => {
      const provider = (sdkRef.current?.getProvider() ?? starknetAccount) as
        | ProviderInterface
        | Account
        | null;
      if (!provider) throw new Error("No provider available to watch the transaction.");

      return Promise.race([
        provider.waitForTransaction(txHash, { retryInterval: 5000 }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
      ]);
    },
    [starknetAccount, TX_TIMEOUT_MS, sdkRef]
  );

  const handleDeployAccount = useCallback(async () => {
    if (!szWallet) return;
    setIsDeployingAccount(true);
    try {
      addLog("Deploying account on-chain...");
      await szWallet.deploy({ feeMode: "user_pays" });
      addLog("Account deployed successfully.");
      setShowDeployAccountPromptBoth(false);
      fetchStrkBalance(walletAddress);
      pushToast({
        tone: "success",
        title: "Account deployed",
        description: "Your Privy account is now live on-chain.",
      });
    } catch (e) {
      addLog(`Account deploy failed: ${e instanceof Error ? e.message : String(e)}`);
      pushToast({
        tone: "error",
        title: "Account deployment failed",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsDeployingAccount(false);
    }
  }, [addLog, fetchStrkBalance, pushToast, setShowDeployAccountPromptBoth, szWallet, walletAddress]);

  const handleDeclare = useCallback(async () => {
    if (!activeBuildData) {
      addLog("Build the contract first (Ctrl+S).");
      pushToast({
        tone: "warning",
        title: "Build required",
        description: "Compile the current contract before declaring it on-chain.",
      });
      return;
    }
    if (deployStatus !== "idle") return;

    const steps: DeployStep[] = [
      { id: "check", label: "Preparing declare", status: "idle" },
      { id: "sign", label: "Submitting declare", status: "idle" },
      { id: "broadcast", label: `Confirmed on ${netConfig.label}`, status: "idle" },
      { id: "confirm", label: "Class hash ready", status: "idle" },
    ];
    setDeploySteps(steps);
    setDeployStatus("declaring");
    addLog(`Declaring contract on ${netConfig.label}...`);

    try {
      setDeployStep("check", "active");
      if (walletAddress) {
        addLog(`Fallback wallet available: ${walletAddress.slice(0, 14)}...`);
        setDeployStep("check", "done", "wallet ready");
      } else {
        addLog("No user wallet connected. Trying the studio sponsor first.");
        setDeployStep("check", "done", "studio sponsor");
      }
      setDeployStep("sign", "active");
      addLog("Attempting studio-sponsored declaration...");

      let declareResult: { transaction_hash: string; class_hash: string } = { transaction_hash: "", class_hash: "" };
      let isAlreadyDeclared = false;
      let declareSource: "studio" | "local" | "existing" = "studio";

      try {
        const token = await getAccessToken();
        const res = await fetch("/api/declare", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            sierra: activeBuildData.sierra,
            casm: activeBuildData.casm,
            network,
          }),
        });
        const data = await res.json();

        if (res.ok) {
          declareResult = {
            transaction_hash: data.txHash || "",
            class_hash: data.classHash,
          };
          isAlreadyDeclared = !!data.alreadyDeclared;
          declareSource = isAlreadyDeclared ? "existing" : "studio";
          if (isAlreadyDeclared) {
            addLog("Class hash already exists on-chain. Reusing it without sending a new declare.");
          } else {
            addLog(`Studio-sponsored declare tx: ${data.txHash}`);
          }
        } else {
          throw new Error(data.error || "Server declare failed");
        }
      } catch (apiErr) {
        const paymasterMessage = apiErr instanceof Error ? apiErr.message : "Internal error";
        addLog(`Studio-sponsored declare unavailable: ${paymasterMessage}`);

        if (!starknetAccount) {
          setShowAuthModal(true);
          throw new Error(
            `Studio-sponsored declare is unavailable (${paymasterMessage}). Connect a wallet to continue with a self-funded declare.`
          );
        }

        if (walletType === "privy" && szWallet) {
          const isDeployed = await szWallet.isDeployed();
          if (!isDeployed) {
            setShowDeployAccountPromptBoth(true);
            throw new Error(
              `Studio-sponsored declare is unavailable (${paymasterMessage}). Deploy your Privy account on ${netConfig.label} before using the local fallback.`
            );
          }
        }

        const account = starknetAccount as Account;
        declareSource = "local";
        try {
          const estimate = await account.estimateDeclareFee({
            contract: activeBuildData.sierra as CompiledSierra,
            casm: activeBuildData.casm as CairoAssembly,
          });
          const estimatedFee = BigInt(estimate.overall_fee);
          const balanceProvider = (sdkRef.current?.getProvider() ?? account) as ProviderInterface;
          const balanceRaw = await readStrkBalance(balanceProvider, walletAddress);
          const estimatedFeeStrk = formatStrkAmount(estimatedFee);
          const balanceStrk = formatStrkAmount(balanceRaw);

          setStrkBalance(balanceStrk);
          addLog(
            `Local declare estimate: ~${estimatedFeeStrk} STRK. Wallet balance: ${balanceStrk} STRK.`
          );

          if (estimatedFee > balanceRaw) {
            throw new Error(
              `Insufficient STRK for declare on ${netConfig.label}. Estimated fee: ${estimatedFeeStrk} STRK. Available balance: ${balanceStrk} STRK.`
            );
          }
        } catch (feeErr: any) {
          const errorMsg = feeErr.message || String(feeErr);
          if (errorMsg.includes("already declared")) {
             isAlreadyDeclared = true;
             // Compute locally instead of parsing message to avoid picking up wallet address
             const cHash = hash.computeSierraContractClassHash(activeBuildData.sierra as CompiledSierra);
             declareResult = { transaction_hash: "", class_hash: cHash };
             declareSource = "existing";
          } else if (errorMsg.includes("Insufficient STRK")) {
            throw feeErr;
          } else {
            addLog(`Could not pre-estimate local declare fee: ${errorMsg}.`);
          }
        }

        if (!isAlreadyDeclared) {
          addLog("Falling back to local wallet declaration...");
          try {
            const localResult = await (starknetAccount as Account).declare({
              contract: activeBuildData.sierra as CompiledSierra,
              casm: activeBuildData.casm as CairoAssembly,
            }, { maxFee: 0 } as any);
            declareResult = {
              transaction_hash: localResult.transaction_hash,
              class_hash: localResult.class_hash,
            };
          } catch (declErr: any) {
            const errorMsg = declErr.message || String(declErr);
            if (errorMsg.includes("already declared")) {
                 isAlreadyDeclared = true;
                 const cHash = hash.computeSierraContractClassHash(activeBuildData.sierra as CompiledSierra);
                 declareResult = { transaction_hash: "", class_hash: cHash };
                 declareSource = "existing";
            } else {
              throw declErr;
            }
          }
        }
      }

      const signDetail = isAlreadyDeclared
        ? "skipped (already declared)"
        : `${declareSource === "local" ? "local" : "studio"} tx: ${declareResult.transaction_hash.slice(0, 10)}...`;
      setDeployStep("sign", "done", signDetail);

      if (!isAlreadyDeclared && declareResult.transaction_hash) {
        setDeployStep("broadcast", "active");
        try {
          await waitForTx(declareResult.transaction_hash);
        } catch (waitErr) {
          if ((waitErr as Error).message === "timeout") {
            throw new Error(
              `Transaction timed out after ${TX_TIMEOUT_LABEL}. The network may be congested. Check the tx on explorer: ${netConfig.explorer}/tx/${declareResult.transaction_hash}`
            );
          }
          throw waitErr;
        }
        setDeployStep("broadcast", "done");
      } else if (isAlreadyDeclared) {
        setDeployStep("broadcast", "done", "skipped (already declared)");
      } else {
        setDeployStep("broadcast", "done", "skipped (no tx)");
      }
      const cHash = hash.computeSierraContractClassHash(activeBuildData!.sierra as CompiledSierra);
      setDeployStep("confirm", "active");
      setClassHash(cHash);
      setDeployStep("confirm", "done", `class hash: ${cHash.slice(0, 10)}...`);
      setDeployStatus("declared");
      addLog(`Declare success! Class Hash: ${cHash}`);
      addLog(`Explorer: ${netConfig.explorer}/class/${cHash}`);
      if (declareResult.transaction_hash) {
        logTransaction({ hash: declareResult.transaction_hash, type: "declare", status: "success" });
      }
      pushToast({
        tone: "success",
        title: "Contract declared",
        description: `Class hash ${cHash.slice(0, 10)}... is ready to deploy.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg.includes("CLASS_ALREADY_DECLARED") ||
        msg.includes("already declared") ||
        msg.includes("already exists")
      ) {
        try {
          const cHash = hash.computeSierraContractClassHash(
            activeBuildData.sierra as CompiledSierra
          );
          setDeploySteps((prev) =>
            prev.map((s) =>
              s.status === "active" ? { ...s, status: "done", detail: "already declared" } : s
            )
          );
          setClassHash(cHash);
          setDeployStatus("declared");
          addLog("Class already declared on-chain — reusing existing class hash.");
          addLog(`Class Hash: ${cHash}`);
          pushToast({
            tone: "info",
            title: "Class already declared",
            description: "The existing class hash was recovered and reused.",
          });
          return;
        } catch {
          /* fall through to error */
        }
      }
      setDeploySteps((prev) =>
        prev.map((s) =>
          s.status === "active" ? { ...s, status: "error", detail: msg.slice(0, 60) } : s
        )
      );
      setDeployStatus("idle");
      addLog(`Declare failed: ${msg}`);
      if (msg.includes("Transaction timed out after")) {
        pushToast({
          tone: "error",
          title: "Declare timed out",
          description: `No confirmation after ${TX_TIMEOUT_LABEL}. The network may be congested. Check the terminal for the tx link.`,
        });
      } else {
        pushToast({ tone: "error", title: "Declare failed", description: msg.slice(0, 140) });
      }
    }
  }, [
    activeBuildData,
    addLog,
    deployStatus,
    formatStrkAmount,
    logTransaction,
    netConfig,
    network,
    pushToast,
    readStrkBalance,
    sdkRef,
    setShowAuthModal,
    setShowDeployAccountPromptBoth,
    setStrkBalance,
    starknetAccount,
    szWallet,
    waitForTx,
    walletAddress,
    walletType,
    TX_TIMEOUT_LABEL,
  ]);

  const handleDeploy = useCallback(async () => {
    if (!starknetAccount || !classHash || deployStatus !== "declared") return;

    const newSalt = "0x" + Math.floor(Math.random() * 1000000).toString(16);
    setSalt(newSalt);

    const constructorAbi = activeBuildData?.abi?.find(
      (entry: { type: string; name: string }) => entry.type === "constructor"
    );
    const constructorParams: Array<{ name: string; type: string }> = constructorAbi?.inputs ?? [];

    const calldata = constructorParams.flatMap((p: { name: string; type: string }) => {
      const val = constructorInputs[p.name] ?? "0";
      const type = p.type.toLowerCase();
      if (type.includes("u256")) {
        try {
          const bn = BigInt(val);
          const low = bn & ((BigInt(1) << BigInt(128)) - BigInt(1));
          const high = bn >> BigInt(128);
          return [low.toString(), high.toString()];
        } catch {
          return ["0", "0"];
        }
      }
      return [val];
    });

    const effectiveSalt = newSalt;
    const predictedAddress = hash.calculateContractAddressFromHash(
      hash.computePedersenHash(walletAddress, effectiveSalt),
      classHash,
      calldata,
      UDC_ADDRESS
    );

    const steps: DeployStep[] = [
      { id: "check", label: "Address availability", status: "idle" },
      {
        id: "udc",
        label: "Preparing UDC call",
        status: "idle",
      },
      {
        id: "sign",
        label: "Signing deploy transaction",
        status: "idle",
      },
      { id: "broadcast", label: `Broadcasting to ${netConfig.label}`, status: "idle" },
      { id: "confirm", label: "Contract deployed", status: "idle" },
    ];
    setDeploySteps(steps);
    setDeployStatus("deploying");
    addLog(`Deploying via UDC (V1, STRK)...`);

    try {
      setDeployStep("check", "active");
      addLog(`Checking if contract already exists at ${predictedAddress.slice(0, 10)}...`);
      try {
        await (starknetAccount as Account).getClassHashAt(predictedAddress);
        addLog(
          `Error: Contract already deployed at ${predictedAddress.slice(0, 12)}... Use a different salt.`
        );
        setDeployStep("check", "error", "Already deployed");
        setDeployStatus("declared");
        return;
      } catch (e: unknown) {
        const msg = String(e);
        if (msg.includes("Contract not found") || msg.includes("20")) {
          setDeployStep("check", "done", "Address is available");
        } else {
          addLog("Note: Could not verify address status (network error). Proceeding anyway.");
          setDeployStep("check", "done", "Bypassed");
        }
      }
      setDeployStep("udc", "active");
      addLog(`Class hash: ${classHash}`);
      addLog(`Constructor args: [${calldata.join(", ")}]`);
      addLog(`Predicted address: ${predictedAddress}`);
      setDeployStep("udc", "done");
      setDeployStep("sign", "active");

      let txHash = "";
      if (walletType === "privy" && szWallet) {
        addLog("Signing deploy transaction (via Starkzap flow)...");
        
        // Re-compute class hash to be 100% safe - ALWAYS use computed hash from current build
        const actualClassHash = hash.computeSierraContractClassHash(activeBuildData!.sierra as CompiledSierra);
        
        const udcCall = {
          contractAddress: UDC_ADDRESS,
          entrypoint: UDC_ENTRYPOINT,
          calldata: [
            actualClassHash,
            effectiveSalt,
            "1", // unique=true
            calldata.length.toString(),
            ...calldata
          ]
        };

        const isSponsored = (szWallet as any)?.mode === "sponsored";
        const txOptions = isSponsored ? { feeMode: "sponsored" as const } : { feeMode: "user_pays" as const };

        const res = await szWallet.execute([udcCall], txOptions as any);
        const txReceiptHash = (res as any).hash || (res as any).transaction_hash;
        txHash = txReceiptHash;
        
        setDeployStep("sign", "done", `tx: ${txReceiptHash.slice(0, 10)}...`);
        addLog(`Deploy tx: ${txReceiptHash}`);
        setDeployStep("broadcast", "active");
        
        try {
          if ((res as any).wait) {
            await (res as any).wait();
          } else {
            await waitForTx(txReceiptHash);
          }
        } catch (waitErr) {
          if ((waitErr as Error).message === "timeout") {
            throw new Error(
              `Transaction timed out after ${TX_TIMEOUT_LABEL}. Check: ${netConfig.explorer}/tx/${txReceiptHash}`
            );
          }
          throw waitErr;
        }
        setDeployStep("broadcast", "done");
      } else {
        const deployResult = await (starknetAccount as Account).deployContract({
          classHash,
          constructorCalldata: calldata,
          salt: effectiveSalt,
          unique: true,
        });
        txHash = deployResult.transaction_hash;
        setDeployStep("sign", "done", `tx: ${deployResult.transaction_hash.slice(0, 10)}...`);
        addLog(`Deploy tx: ${deployResult.transaction_hash}`);
        setDeployStep("broadcast", "active");
        try {
          await waitForTx(deployResult.transaction_hash);
        } catch (waitErr) {
          if ((waitErr as Error).message === "timeout") {
            throw new Error(
              `Transaction timed out after ${TX_TIMEOUT_LABEL}. The paymaster may be out of gas or the network is congested. Check the tx on explorer: ${netConfig.explorer}/tx/${deployResult.transaction_hash}`
            );
          }
          throw waitErr;
        }
        setDeployStep("broadcast", "done");
      }

      setDeployStep("confirm", "active");
      setContractAddress(predictedAddress);
      setDeployStep("confirm", "done", `address: ${predictedAddress.slice(0, 10)}...`);
      setDeployStatus("deployed");
      addLog(`Deploy success! Contract: ${predictedAddress}`);
      addLog(`View on explorer: ${netConfig.explorer}/contract/${predictedAddress}`);
      setActiveSidebarTab("interact");
      setIsSidebarOpen(true);
      setActiveInteractFn(null);
      pushToast({
        tone: "success",
        title: "Contract deployed",
        description: `${predictedAddress.slice(0, 10)}... is live and ready to interact with.`,
      });

      logDeployment({
        contractAddress: predictedAddress,
        classHash,
        abi: activeBuildData?.abi || [],
        name: activeFile?.filename || "Unknown",
        network,
      });
      logTransaction({ hash: txHash, type: "deploy", status: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDeploySteps((prev) =>
        prev.map((s) =>
          s.status === "active" ? { ...s, status: "error", detail: msg.slice(0, 60) } : s
        )
      );
      setDeployStatus("declared");
      if (msg.includes("Transaction timed out after")) {
        addLog(`Deploy failed: ${msg}`);
        pushToast({
          tone: "error",
          title: "Deploy timed out",
          description: `No confirmation after ${TX_TIMEOUT_LABEL}. The paymaster may be out of gas or the network is congested. Check the terminal for the tx link.`,
        });
      } else if (
        msg.includes("contract already deployed") ||
        msg.includes("already deployed") ||
        msg.includes("already exists")
      ) {
        addLog("Deploy failed: Address collision. Change the salt and try again.");
        pushToast({
          tone: "warning",
          title: "Address collision detected",
          description:
            "That predicted address is already deployed. Regenerate the salt and try again.",
        });
      } else {
        addLog(`Deploy failed: ${msg}`);
        pushToast({ tone: "error", title: "Deploy failed", description: msg.slice(0, 140) });
      }
    }
  }, [
    activeBuildData,
    activeFile,
    addLog,
    classHash,
    constructorInputs,
    deployStatus,
    logDeployment,
    logTransaction,
    netConfig,
    network,
    pushToast,
    setActiveSidebarTab,
    setActiveInteractFn,
    setIsSidebarOpen,
    starknetAccount,
    szWallet,
    waitForTx,
    walletAddress,
    walletType,
    TX_TIMEOUT_LABEL,
    TX_TIMEOUT_MS,
  ]);

  const resetDeployState = useCallback(() => {
    setDeployStatus("idle");
    setClassHash("");
    setContractAddress("");
    setDeploySteps([]);
    setConstructorInputs({});
  }, []);

  return {
    deployStatus,
    setDeployStatus,
    deploySteps,
    setDeploySteps,
    classHash,
    setClassHash,
    contractAddress,
    setContractAddress,
    constructorInputs,
    setConstructorInputs,
    salt,
    setSalt,
    showDeployAccountPrompt,
    setShowDeployAccountPrompt: setShowDeployAccountPromptBoth,
    isDeployingAccount,
    handleDeclare,
    handleDeploy,
    handleDeployAccount,
    resetDeployState,
  };
}
