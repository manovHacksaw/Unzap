import { useState, useCallback, useRef, useEffect } from "react";
import { WalletAccount, Account, hash, type CairoAssembly, type CompiledSierra } from "starknet";
import { OnboardStrategy, accountPresets } from "starkzap";
import { 
  STRK_TOKEN, 
  UDC_ADDRESS, 
  UDC_ENTRYPOINT, 
  type SzWalletType, 
  type DeployStep, 
  type DeployStepStatus, 
  type DeployStatus,
  type CompileSuccess,
  type ExplorerEntry
} from "../types";

interface UseStarknetDeployProps {
  networkConfig: any;
  sdk: any;
  activeBuildData: CompileSuccess | null;
  activeSourceFile: ExplorerEntry | null;
  addLog: (log: string) => void;
  logTransaction: (data: any) => Promise<void>;
  logDeployment: (data: any) => Promise<void>;
  authenticated: boolean;
  getAccessToken: () => Promise<string | null>;
  login: () => void;
  logout: () => void;
}

export function useStarknetDeploy({
  networkConfig,
  sdk,
  activeBuildData,
  activeSourceFile,
  addLog,
  logTransaction,
  logDeployment,
  authenticated,
  getAccessToken,
  login,
  logout,
}: UseStarknetDeployProps) {
  // --- Wallet state ---
  const [szWallet, setSzWallet] = useState<SzWalletType | null>(null);
  const [starknetAccount, setStarknetAccount] = useState<Account | WalletAccount | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletType, setWalletType] = useState<"privy" | "extension" | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [strkBalance, setStrkBalance] = useState<string | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [constructorInputs, setConstructorInputs] = useState<Record<string, string>>({});
  const [deploySteps, setDeploySteps] = useState<DeployStep[]>([]);
  const [salt, setSalt] = useState("0");
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [contractAddress, setContractAddress] = useState("");
  const [classHash, setClassHash] = useState("");
  const [showDeployAccountPrompt, setShowDeployAccountPrompt] = useState(false);
  const [isDeployingAccount, setIsDeployingAccount] = useState(false);

  // Auto-reconnect Privy wallet on page load if already authenticated
  useEffect(() => {
    if (authenticated && !starknetAccount && sdk) {
      connectPrivyWallet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, sdk]);

  const fetchStrkBalance = useCallback(async (address: string) => {
    if (!sdk) return;
    setIsFetchingBalance(true);
    try {
      const provider = sdk.getProvider();
      const result = await provider.callContract({
        contractAddress: STRK_TOKEN,
        entrypoint: "balanceOf",
        calldata: [address],
      });
      const low = BigInt(result[0] ?? "0x0");
      const high = BigInt(result[1] ?? "0x0");
      const raw = low + high * (BigInt(2) ** BigInt(128));
      setStrkBalance((Number(raw) / 1e18).toFixed(4));
    } catch {
      setStrkBalance(null);
    } finally {
      setIsFetchingBalance(false);
    }
  }, [sdk]);

  const connectPrivyWallet = async () => {
    if (!authenticated) { login(); return; }
    if (!sdk) return;
    setIsWalletConnecting(true);
    setWalletError(null);
    try {
      const accessToken = await getAccessToken();
      const { wallet: connectedWallet } = await sdk.onboard({
        strategy: OnboardStrategy.Privy,
        privy: {
          resolve: async () => {
            const res = await fetch("/api/signer-context", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error((data as { error?: string }).error ?? "Signer context failed");
            return data;
          },
        },
        accountPreset: accountPresets.argentXV050,
        feeMode: "user_pays",
        deploy: "never",
      });
      setSzWallet(connectedWallet);
      setStarknetAccount(connectedWallet.getAccount() as unknown as Account);
      setWalletAddress(connectedWallet.address);
      setWalletType("privy");
      addLog(`Privy wallet connected: ${connectedWallet.address.slice(0, 10)}...`);
      fetchStrkBalance(connectedWallet.address);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const connectExtensionWallet = async () => {
    if (!sdk) return;
    setIsWalletConnecting(true);
    setWalletError(null);
    try {
      const swo = (window as unknown as { starknet?: any }).starknet;
      if (!swo) throw new Error("No Starknet browser extension found. Install ArgentX or Braavos.");
      const provider = sdk.getProvider();
      const walletAccount = await WalletAccount.connect(provider, swo);
      setStarknetAccount(walletAccount);
      setWalletAddress(walletAccount.address);
      setWalletType("extension");
      addLog(`Extension wallet connected: ${walletAccount.address.slice(0, 10)}...`);
      fetchStrkBalance(walletAccount.address);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Extension connection failed");
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const disconnectWallet = () => {
    if (walletType === "privy") logout();
    setSzWallet(null);
    setStarknetAccount(null);
    setWalletAddress("");
    setWalletType(null);
    setStrkBalance(null);
    setDeploySteps([]);
    addLog("Wallet disconnected.");
  };

  const setDeployStep = (id: string, status: DeployStepStatus, detail?: string) => {
    setDeploySteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, ...(detail ? { detail } : {}) } : s))
    );
  };

  const handleDeclare = async () => {
    if (!starknetAccount) return; // Should show auth modal instead but this is pure logic
    if (!activeBuildData) { addLog("Build the contract first (Ctrl+S)."); return; }
    if (deployStatus !== "idle") return;

    if (walletType === "privy" && szWallet) {
      const isDeployed = await szWallet.isDeployed();
      if (!isDeployed) { setShowDeployAccountPrompt(true); return; }
    }

    const steps: DeployStep[] = [
      { id: "check", label: "Checking wallet", status: "idle" },
      { id: "sign", label: "Signing declare tx", status: "idle" },
      { id: "broadcast", label: `Confirmed on ${networkConfig.label}`, status: "idle" },
      { id: "confirm", label: "Class hash ready", status: "idle" },
    ];
    setDeploySteps(steps);
    setDeployStatus("declaring");
    addLog(`Declaring contract on ${networkConfig.label}...`);

    try {
      setDeployStep("check", "active");
      addLog(`Using wallet: ${walletAddress.slice(0, 14)}...`);
      setDeployStep("check", "done");
      setDeployStep("sign", "active");
      addLog("Sending declare transaction (sierra + casm)...");

      const declareResult = await (starknetAccount as Account).declare({
        contract: activeBuildData.sierra as CompiledSierra,
        casm: activeBuildData.casm as CairoAssembly,
      });
      setDeployStep("sign", "done", `tx: ${declareResult.transaction_hash.slice(0, 10)}...`);
      addLog(`Declare tx: ${declareResult.transaction_hash}`);
      setDeployStep("broadcast", "active");
      await (starknetAccount as Account).waitForTransaction(declareResult.transaction_hash);
      setDeployStep("broadcast", "done");
      const cHash = declareResult.class_hash;
      setDeployStep("confirm", "active");
      setClassHash(cHash);
      setDeployStep("confirm", "done", `class hash: ${cHash.slice(0, 10)}...`);
      setDeployStatus("declared");
      addLog(`Declare success! Class Hash: ${cHash}`);
      logTransaction({ hash: declareResult.transaction_hash, type: "declare", status: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("CLASS_ALREADY_DECLARED") || msg.includes("already declared") || msg.includes("already exists")) {
        try {
          const cHash = hash.computeSierraContractClassHash(activeBuildData.sierra as CompiledSierra);
          setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "done", detail: "already declared" } : s));
          setClassHash(cHash);
          setDeployStatus("declared");
          addLog("Class already declared on-chain — reusing existing class hash.");
          addLog(`Class Hash: ${cHash}`);
          return;
        } catch { /* fall through to error */ }
      }
      setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "error", detail: msg.slice(0, 60) } : s));
      setDeployStatus("idle");
      addLog(`Declare failed: ${msg}`);
    }
  };

  const handleDeploy = async () => {
    if (!starknetAccount || !classHash || deployStatus !== "declared") return;

    const newSalt = "0x" + Math.floor(Math.random() * 1000000).toString(16);
    setSalt(newSalt);

    const constructorAbi = activeBuildData?.abi?.find((entry: any) => entry.type === "constructor");
    const constructorParams: any[] = constructorAbi?.inputs ?? [];
    const calldata = constructorParams.map((p: any) => constructorInputs[p.name] ?? "0");
    const predictedAddress = hash.calculateContractAddressFromHash(
      hash.computePedersenHash(walletAddress, newSalt),
      classHash,
      calldata,
      UDC_ADDRESS,
    );

    const steps: DeployStep[] = [
      { id: "check", label: "Address availability", status: "idle" },
      { id: "udc", label: walletType === "privy" ? "Preparing sponsored UDC call" : "Preparing UDC call", status: "idle" },
      { id: "sign", label: walletType === "privy" ? "Gasless via AVNU paymaster" : "Signing deploy transaction", status: "idle" },
      { id: "broadcast", label: `Broadcasting to ${networkConfig.label}`, status: "idle" },
      { id: "confirm", label: "Contract deployed", status: "idle" },
    ];
    setDeploySteps(steps);
    setDeployStatus("deploying");
    addLog(`Deploying via UDC${walletType === "privy" ? " (gasless — AVNU paymaster)" : ""}...`);

    try {
      setDeployStep("check", "active");
      try {
        await (starknetAccount as Account).getClassHashAt(predictedAddress);
        addLog(`Error: Contract already deployed at ${predictedAddress.slice(0, 12)}... Use a different salt.`);
        setDeployStep("check", "error", "Already deployed");
        setDeployStatus("declared");
        return;
      } catch (e: unknown) {
        setDeployStep("check", "done", "Address is available");
      }
      
      setDeployStep("udc", "active");
      setDeployStep("udc", "done");
      setDeployStep("sign", "active");

      let txHash = "";
      if (walletType === "privy" && szWallet) {
        const udcCall = {
          contractAddress: UDC_ADDRESS,
          entrypoint: UDC_ENTRYPOINT,
          calldata: [classHash, newSalt, "1", String(calldata.length), ...calldata],
        };
        const tx = await szWallet.execute([udcCall], { feeMode: "sponsored" });
        txHash = tx.hash;
        setDeployStep("sign", "done", `tx: ${tx.hash.slice(0, 10)}...`);
        setDeployStep("broadcast", "active");
        await tx.wait();
        setDeployStep("broadcast", "done");
      } else {
        const deployResult = await (starknetAccount as Account).deployContract({
          classHash,
          constructorCalldata: calldata,
          salt: newSalt,
          unique: true,
        });
        txHash = deployResult.transaction_hash;
        setDeployStep("sign", "done", `tx: ${deployResult.transaction_hash.slice(0, 10)}...`);
        setDeployStep("broadcast", "active");
        await (starknetAccount as Account).waitForTransaction(deployResult.transaction_hash);
        setDeployStep("broadcast", "done");
      }

      setDeployStep("confirm", "active");
      setContractAddress(predictedAddress);
      setDeployStep("confirm", "done", `address: ${predictedAddress.slice(0, 10)}...`);
      setDeployStatus("deployed");
      addLog(`Deploy success! Contract: ${predictedAddress}`);
      
      logDeployment({ 
        contractAddress: predictedAddress, 
        classHash, 
        abi: activeBuildData?.abi || [], 
        name: activeSourceFile?.filename || "Unknown" 
      });
      logTransaction({ hash: txHash, type: "deploy", status: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "error", detail: msg.slice(0, 60) } : s));
      setDeployStatus("declared");
      addLog(`Deploy failed: ${msg}`);
    }
  };

  const handleDeployAccount = async () => {
    if (!szWallet) return;
    setIsDeployingAccount(true);
    try {
      addLog("Deploying account on-chain...");
      await szWallet.deploy();
      addLog("Account deployed successfully.");
      setShowDeployAccountPrompt(false);
      fetchStrkBalance(walletAddress);
    } catch (e) {
      addLog(`Account deploy failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsDeployingAccount(false);
    }
  };

  return {
    szWallet,
    starknetAccount,
    walletAddress,
    walletType,
    isWalletConnecting,
    walletError,
    strkBalance,
    isFetchingBalance,
    constructorInputs,
    setConstructorInputs,
    deploySteps,
    salt,
    setSalt,
    deployStatus,
    setDeployStatus,
    contractAddress,
    classHash,
    setClassHash,
    setContractAddress,
    showDeployAccountPrompt,
    setShowDeployAccountPrompt,
    isDeployingAccount,
    connectPrivyWallet,
    connectExtensionWallet,
    disconnectWallet,
    handleDeclare,
    handleDeploy,
    handleDeployAccount,
    fetchStrkBalance,
    setDeploySteps,
  };
}
