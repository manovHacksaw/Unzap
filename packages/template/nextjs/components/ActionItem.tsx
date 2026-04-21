'use client';

import { useState } from 'react';
import { Loader2, ArrowUpRight, CheckCircle2, Zap } from 'lucide-react';
import type { ContractFunction } from '@/lib/contractFunctions';
import { useContractWrite } from '@/hooks/useContract';
import { explorerTxUrl } from '@/lib/contract';

type LogFn = (
  type: 'call' | 'result' | 'tx' | 'error' | 'info',
  text: string
) => void;

interface ActionItemProps {
  fn: ContractFunction;
  onLog: LogFn;
  walletConnected: boolean;
}

export function ActionItem({ fn, onLog, walletConnected }: ActionItemProps) {
  const [values, setValues] = useState<string[]>(
    new Array(fn.params.length).fill('')
  );
  const { execute, status, reset } = useContractWrite(fn);

  const isPending = status === 'pending';
  const isSuccess = status === 'success';
  const hasEmptyParam = fn.params.length > 0 && values.some((v) => v.trim() === '');
  const isDisabled = isPending || !walletConnected || hasEmptyParam;

  const handleSubmit = async () => {
    if (isDisabled) return;
    const argsLabel = values.length > 0 ? `(${values.join(', ')})` : '()';
    onLog('call', `${fn.name}${argsLabel}`);
    try {
      const hash = await execute(values);
      onLog('tx', `${fn.title} confirmed · ${explorerTxUrl(hash)}`);
    } catch (e) {
      onLog('error', e instanceof Error ? e.message : String(e));
      reset();
    }
  };

  return (
    <div className={`interactive-card group/card flex flex-col gap-5 ${
      isSuccess ? 'success-highlight border-emerald-500/30' : ''
    } focus-within:border-emerald-500/50 focus-within:shadow-[0_0_30px_rgba(16,185,129,0.1)]`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 group-hover/card:text-white transition-colors">{fn.title}</h3>
          <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-widest font-bold">
            {fn.params.length === 0
              ? 'No parameters required'
              : `${fn.params.length} parameter${fn.params.length > 1 ? 's' : ''}`}
          </p>
        </div>
        {isSuccess && (
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center animate-bounce">
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
        )}
      </div>

      {fn.params.length > 0 && (
        <div className="space-y-3">
          {fn.params.map((param, idx) => (
            <div key={param.name} className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-0.5 group-focus-within/card:text-emerald-500/70 transition-colors">
                {param.label}
              </label>
              <input
                type={param.inputType}
                value={values[idx]}
                onChange={(e) => {
                  const next = [...values];
                  next[idx] = e.target.value;
                  setValues(next);
                }}
                placeholder={param.placeholder}
                disabled={isPending}
                className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all placeholder:text-zinc-700 disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={
          isSuccess
            ? () => {
                reset();
                setValues(new Array(fn.params.length).fill(''));
              }
            : handleSubmit
        }
        disabled={isDisabled}
        className={`w-full h-11 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
          isSuccess
            ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-black cursor-pointer'
            : 'bg-zinc-100 hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-700 disabled:cursor-not-allowed text-black shadow-lg shadow-black/20'
        }`}
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin text-zinc-900" />
            Sending...
          </>
        ) : isSuccess ? (
          <>
            <ArrowUpRight size={13} />
            Reset State
          </>
        ) : (
          <>
            <Zap size={13} fill="currentColor" />
            Execute Transaction
          </>
        )}
      </button>

      {!walletConnected && (
        <div className="flex items-center justify-center gap-2 -mt-2">
           <div className="w-1 h-1 rounded-full bg-zinc-700" />
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
             Connect wallet to sign
           </p>
        </div>
      )}
    </div>
  );
}
