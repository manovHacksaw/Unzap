"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  StarkZap,
  OnboardStrategy,
  accountPresets,
  getPresets,
  ChainId,
  Amount,
} from "starkzap";
import { usePrivy } from "@privy-io/react-auth";
import {
  Wallet,
  Zap,
  Send,
  PenLine,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";

// ── SDK instance ──────────────────────────────────────────────────────────────
const sdk = new StarkZap({
  network: "sepolia",
  paymaster: {
    headers: {
      "x-paymaster-api-key": process.env.NEXT_PUBLIC_AVNU_API_KEY!,
    },
  },
});

// ── Types ─────────────────────────────────────────────────────────────────────
type Action = "pay" | "sign" | "send";

type StepStatus = "pending" | "active" | "done" | "error";

interface Step {
  id: string;
  label: string;
  detail?: string;
  status: StepStatus;
}

const INITIAL_STEPS: Step[] = [
  { id: "wallet",    label: "Wallet connected",       status: "pending" },
  { id: "build",     label: "Transaction created",    status: "pending" },
  { id: "paymaster", label: "Paymaster applied",      detail: "gasless via AVNU", status: "pending" },
  { id: "sign",      label: "Signed by account",      status: "pending" },
  { id: "send",      label: "Sent to Starknet",       status: "pending" },
  { id: "confirm",   label: "Confirmed",              status: "pending" },
];

function makeSteps(): Step[] {
  return INITIAL_STEPS.map((s) => ({ ...s }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepNode({ step, index }: { step: Step; index: number }) {
  const colors: Record<StepStatus, string> = {
    pending: "border-neutral-800 text-neutral-700",
    active:  "border-amber-500 text-amber-400",
    done:    "border-amber-500/40 text-amber-600",
    error:   "border-red-500 text-red-400",
  };
  const dotColors: Record<StepStatus, string> = {
    pending: "bg-neutral-800",
    active:  "bg-amber-400",
    done:    "bg-amber-600",
    error:   "bg-red-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3"
    >
      {/* connector line + dot */}
      <div className="flex flex-col items-center pt-0.5">
        <motion.div
          className={clsx("w-2 h-2 rounded-full flex-shrink-0", dotColors[step.status])}
          animate={
            step.status === "active"
              ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }
              : {}
          }
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
        {index < INITIAL_STEPS.length - 1 && (
          <motion.div
            className="w-px mt-1 flex-1"
            style={{ minHeight: 28 }}
            animate={{
              backgroundColor:
                step.status === "done" ? "rgb(180 130 36 / 0.4)" : "rgb(38 38 38)",
            }}
            transition={{ duration: 0.4 }}
          />
        )}
      </div>

      {/* text */}
      <div className="pb-7">
        <div className={clsx("text-xs font-medium tracking-wide", colors[step.status])}>
          {step.label}
        </div>
        {step.detail && (
          <div className="text-[10px] font-mono text-neutral-600 mt-0.5">{step.detail}</div>
        )}
      </div>
    </motion.div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlaygroundPage() {
  const { login, logout, authenticated, getAccessToken, user } = usePrivy();

  const [wallet, setWallet] = useState<Awaited<ReturnType<typeof sdk.onboard>>["wallet"] | null>(null);
  const [balance, setBalance]     = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [action, setAction]       = useState<Action>("pay");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount]       = useState("");
  const [message, setMessage]     = useState("");

  const [steps, setSteps]         = useState<Step[]>(makeSteps());
  const [running, setRunning]     = useState(false);
  const [txHash, setTxHash]       = useState<string | null>(null);
  const [result, setResult]       = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // helper to mutate a single step
  const setStep = useCallback((id: string, status: StepStatus, detail?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, ...(detail ? { detail } : {}) } : s))
    );
  }, []);

  // ── Connect wallet ──
  const connectWallet = async () => {
    if (!authenticated) { login(); return; }
    if (connecting) return;
    setConnecting(true);
    try {
      const accessToken = await getAccessToken();
      const { wallet: w } = await sdk.onboard({
        strategy: OnboardStrategy.Privy,
        privy: {
          resolve: async () => {
            const res = await fetch("/api/signer-context", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Signer context failed");
            return data;
          },
        },
        accountPreset: accountPresets.argentXV050,
        feeMode: "sponsored",
        deploy: "if_needed",
      });
      setWallet(w);
      const STRK = getPresets(ChainId.SEPOLIA).STRK;
      const bal  = await w.balanceOf(STRK);
      setBalance(bal.toFormatted());
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    logout();
    setWallet(null);
    setBalance(null);
  };

  // ── Execute action ──
  const execute = async () => {
    if (!wallet || running) return;

    setRunning(true);
    setTxHash(null);
    setResult(null);
    setError(null);
    setSteps(makeSteps());

    try {
      setStep("wallet", "done");

      if (action === "sign") {
        // Sign message flow
        setStep("build", "active");
        const typedData = {
          types: {
            StarkNetDomain: [
              { name: "name", type: "felt" },
              { name: "version", type: "felt" },
              { name: "chainId", type: "felt" },
            ],
            Message: [{ name: "message", type: "felt" }],
          },
          primaryType: "Message",
          domain: { name: "Unzap", version: "1", chainId: "0x534e5f5345504f4c4941" },
          message: { message: message || "Hello from Unzap" },
        };
        setStep("build", "done");
        setStep("paymaster", "done", "n/a — off-chain signature");
        setStep("sign", "active");
        const sig = await wallet.signMessage(typedData as Parameters<typeof wallet.signMessage>[0]);
        setStep("sign", "done");
        setStep("send", "done");
        setStep("confirm", "done");
        setResult(JSON.stringify(sig, null, 2));
      } else {
        // Pay / Send transaction flow
        const STRK   = getPresets(ChainId.SEPOLIA).STRK;
        const ETH    = getPresets(ChainId.SEPOLIA).ETH;
        const token  = action === "pay" ? STRK : ETH;
        const target = toAddress.trim() || wallet.address.toString();

        setStep("build", "active");
        const parsedAmount = Amount.parse(amount || "0.0001", token);
        setStep("build", "done");
        setStep("paymaster", "active");

        const tx = await wallet.transfer(token, [{ to: target as `0x${string}`, amount: parsedAmount }]);

        setStep("paymaster", "done");
        setStep("sign", "done");
        setStep("send", "active", `tx: ${tx.hash.slice(0, 10)}...`);
        setTxHash(tx.hash);

        await tx.wait();

        setStep("send", "done");
        setStep("confirm", "active");
        setStep("confirm", "done");
        setResult(JSON.stringify({ hash: tx.hash, explorerUrl: tx.explorerUrl }, null, 2));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      // mark current active step as error
      setSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "error" } : s))
      );
    } finally {
      setRunning(false);
    }
  };

  const hasExecuted = steps.some((s) => s.status !== "pending");

  // ── Code snippet ──
  const snippet = {
    pay:  `const tx = await wallet.transfer(STRK, [{\n  to: "${toAddress || "0xRecipient"}",\n  amount: Amount.parse("${amount || "0.0001"}", STRK),\n}]);\nawait tx.wait();`,
    sign: `const sig = await wallet.signMessage({\n  primaryType: "Message",\n  message: { message: "${message || "Hello from Unzap"}" },\n});`,
    send: `const tx = await wallet.execute([{\n  contractAddress: "0xContract",\n  entrypoint: "transfer",\n  calldata: ["${toAddress || "0xRecipient"}", "${amount || "1"}"],\n}]);\nawait tx.wait();`,
  }[action];

  const actions: { id: Action; icon: typeof Zap; label: string; desc: string }[] = [
    { id: "pay",  icon: Zap,     label: "Pay (gasless)", desc: "Transfer STRK · sponsored" },
    { id: "sign", icon: PenLine, label: "Sign Message",  desc: "Off-chain typed data" },
    { id: "send", icon: Send,    label: "Send Tx",       desc: "Raw contract call" },
  ];

  return (
    <div className="flex h-full">
      {/* ── LEFT: Config panel ── */}
      <div className="flex flex-col w-80 flex-shrink-0 border-r border-neutral-900 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-900">
          <div className="text-xs font-mono text-neutral-500 tracking-widest mb-1">[ PLAYGROUND ]</div>
          <h1 className="text-white font-bold text-base tracking-tight">Live Execution</h1>
          <p className="text-neutral-500 text-xs mt-1">Execute Starkzap actions on Sepolia</p>
        </div>

        {/* Wallet */}
        <div className="px-5 py-4 border-b border-neutral-900">
          {wallet ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgb(251_191_36)]" />
                  <span className="text-xs text-amber-400 font-mono">Connected</span>
                </div>
                <button
                  onClick={disconnect}
                  className="flex items-center gap-1 text-[10px] text-neutral-600 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  Disconnect
                </button>
              </div>
              <a
                href={`https://sepolia.voyager.online/contract/${wallet.address.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 font-mono text-[11px] text-neutral-400 bg-[#0a0a0a] border border-neutral-800 px-2.5 py-1.5 hover:border-neutral-700 hover:text-neutral-300 transition-colors group"
              >
                <span className="truncate">{wallet.address.toString()}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0 text-neutral-700 group-hover:text-amber-400 transition-colors" />
              </a>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-600">{user?.email?.address}</span>
                <span className="text-[11px] font-mono text-neutral-400">{balance ?? "…"}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-black bg-amber-400 hover:bg-amber-300 transition-colors disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wallet className="w-3.5 h-3.5" />
              )}
              {connecting ? "Connecting…" : authenticated ? "Finalise Connection" : "Connect with Privy"}
            </button>
          )}
        </div>

        {/* Action selector */}
        <div className="px-5 py-4 border-b border-neutral-900 space-y-2">
          <div className="text-[10px] font-mono text-neutral-600 tracking-widest mb-3">SELECT ACTION</div>
          {actions.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setAction(id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 border text-left transition-all",
                action === id
                  ? "border-amber-500/40 bg-amber-500/5 text-white"
                  : "border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
              )}
            >
              <Icon
                className={clsx("w-4 h-4 flex-shrink-0", action === id ? "text-amber-400" : "text-neutral-700")}
                strokeWidth={1.5}
              />
              <div>
                <div className="text-xs font-medium">{label}</div>
                <div className="text-[10px] text-neutral-600">{desc}</div>
              </div>
              {action === id && <ChevronRight className="w-3 h-3 text-amber-500 ml-auto" />}
            </button>
          ))}
        </div>

        {/* Input fields */}
        <div className="px-5 py-4 border-b border-neutral-900 space-y-3">
          <div className="text-[10px] font-mono text-neutral-600 tracking-widest mb-3">PARAMETERS</div>

          {action === "sign" ? (
            <div>
              <label className="text-[10px] text-neutral-500 tracking-wide block mb-1.5">MESSAGE</label>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hello from Unzap"
                className="w-full bg-[#0a0a0a] border border-neutral-800 text-neutral-300 text-xs px-3 py-2 focus:outline-none focus:border-amber-500/50 placeholder:text-neutral-700 font-mono"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] text-neutral-500 tracking-wide block mb-1.5">RECIPIENT ADDRESS</label>
                <input
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="0x…"
                  className="w-full bg-[#0a0a0a] border border-neutral-800 text-neutral-300 text-xs px-3 py-2 focus:outline-none focus:border-amber-500/50 placeholder:text-neutral-700 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-500 tracking-wide block mb-1.5">
                  AMOUNT {action === "pay" ? "(STRK)" : "(ETH)"}
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0001"
                  className="w-full bg-[#0a0a0a] border border-neutral-800 text-neutral-300 text-xs px-3 py-2 focus:outline-none focus:border-amber-500/50 placeholder:text-neutral-700 font-mono"
                />
              </div>
            </>
          )}
        </div>

        {/* Execute button */}
        <div className="px-5 py-4">
          <button
            onClick={execute}
            disabled={!wallet || running}
            className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Executing…
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Execute →
              </>
            )}
          </button>
          {!wallet && (
            <p className="text-center text-[10px] text-neutral-700 mt-2">Connect wallet to execute</p>
          )}
        </div>
      </div>

      {/* ── RIGHT: Visualizer + Output ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top: Execution Visualizer */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[10px] font-mono text-neutral-600 tracking-widest">[ EXECUTION VISUALIZER ]</div>
              <h2 className="text-white font-bold text-sm mt-1 tracking-tight">
                {hasExecuted ? "Tracing execution…" : "Waiting for execution"}
              </h2>
            </div>
            {txHash && (
              <a
                href={`https://sepolia.voyager.online/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-amber-500 hover:text-amber-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on Starkscan
              </a>
            )}
          </div>

          {/* Steps */}
          <div className="max-w-xs">
            {steps.map((step, i) => (
              <StepNode key={step.id} step={step} index={i} />
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 px-4 py-3 border border-red-500/30 bg-red-500/5 text-red-400 text-xs font-mono max-w-md"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom: Code + Result panels */}
        <div className="border-t border-neutral-900 grid grid-cols-2 divide-x divide-neutral-900" style={{ height: 220 }}>
          {/* Code snippet */}
          <div className="overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-900">
              <span className="text-[10px] font-mono text-neutral-600 tracking-widest">SDK SNIPPET</span>
              <CopyButton text={snippet} />
            </div>
            <pre className="flex-1 overflow-auto px-4 py-3 text-[11px] font-mono text-neutral-400 leading-relaxed bg-[#030303]">
              {snippet}
            </pre>
          </div>

          {/* Raw result */}
          <div className="overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-900">
              <span className="text-[10px] font-mono text-neutral-600 tracking-widest">RAW RESULT</span>
              {result && <CopyButton text={result} />}
            </div>
            <pre className="flex-1 overflow-auto px-4 py-3 text-[11px] font-mono leading-relaxed bg-[#030303]">
              {result ? (
                <span className="text-amber-400">{result}</span>
              ) : (
                <span className="text-neutral-700">
                  {running ? "Waiting…" : "No result yet"}
                </span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
