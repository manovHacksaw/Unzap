'use client';

import { READ_FUNCTIONS } from '@/lib/contractFunctions';
import { ReadItem } from './ReadItem';

export function Data() {
  if (READ_FUNCTIONS.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-zinc-600 font-bold uppercase tracking-widest">
          No read functions found in ABI
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-8 glass-panel shadow-2xl shadow-black/50">
      {READ_FUNCTIONS.map((fn) => (
        <ReadItem key={fn.name} fn={fn} />
      ))}
    </div>
  );
}
