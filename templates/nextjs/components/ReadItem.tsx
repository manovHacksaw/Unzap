'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { ContractFunction } from '@/lib/contractFunctions';
import { formatResult } from '@/lib/contractFunctions';
import { useContractRead } from '@/hooks/useContract';

interface ReadItemProps {
  fn: ContractFunction;
}

export function ReadItem({ fn }: ReadItemProps) {
  const [values, setValues] = useState<string[]>(
    new Array(fn.params.length).fill('')
  );
  
  const { data, loading, error, refetch } = useContractRead(fn, values);

  const hasEmptyParam = fn.params.length > 0 && values.some((v) => v.trim() === '');
  const result = data ? formatResult(data, fn.outputType) : null;

  return (
    <div className="bg-zinc-950/30 border border-zinc-900 rounded-2xl p-6 flex flex-col gap-4 hover:border-zinc-800 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{fn.title}</h3>
          <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-widest font-bold font-mono">
            {fn.name}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {result && !loading && (
            <span className="text-xs font-mono text-emerald-500 font-bold bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">
              {result}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={loading || hasEmptyParam}
            className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-20"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>
        </div>
      </div>

      {fn.params.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2 text-xs font-mono text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all placeholder:text-zinc-700"
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-[10px] text-red-500 font-mono bg-red-500/5 p-2 rounded-lg border border-red-500/10">
          {error}
        </p>
      )}
    </div>
  );
}
