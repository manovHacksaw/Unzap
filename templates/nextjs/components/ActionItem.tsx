'use client';

import { useState } from 'react';
import { Loader2, ArrowUpRight, CheckCircle2 } from 'lucide-react';
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
    }
  };

  return (
    <div className="bg-zinc-950/30 border border-zinc-900 rounded-2xl p-6 flex flex-col gap-5 hover:border-zinc-800 transition-colors">
      <div>
        <h3 className="text-sm font-bold text-zinc-100">{fn.title}</h3>
        <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-widest font-bold">
          {fn.params.length === 0
            ? 'No parameters required'
            : `${fn.params.length} parameter${fn.params.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {fn.params.length > 0 && (
        <div className="space-y-3">
          {fn.params.map((param, idx) => (
            <div key={param.name} className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-0.5">
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
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
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
        className={`w-full h-11 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
          isSuccess
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-pointer'
            : 'bg-zinc-100 hover:bg-white disabled:bg-zinc-900 disabled:text-zinc-700 disabled:cursor-not-allowed text-black'
        }`}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin text-zinc-500" />
        ) : isSuccess ? (
          <>
            <CheckCircle2 size={13} />
            Confirmed
          </>
        ) : (
          <>
            <ArrowUpRight size={13} />
            Submit
          </>
        )}
      </button>

      {!walletConnected && (
        <p className="text-[10px] text-zinc-600 text-center -mt-2">
          Connect wallet to submit
        </p>
      )}
    </div>
  );
}
