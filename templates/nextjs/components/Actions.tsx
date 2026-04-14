'use client';

import { WRITE_FUNCTIONS } from '@/lib/contractFunctions';
import { ActionItem } from './ActionItem';

interface ActionsProps {
  onLog: (type: 'call' | 'result' | 'tx' | 'error' | 'info', text: string) => void;
  walletConnected: boolean;
}

export function Actions({ onLog, walletConnected }: ActionsProps) {
  if (WRITE_FUNCTIONS.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-zinc-600 font-bold uppercase tracking-widest">
          No write functions found in ABI
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {WRITE_FUNCTIONS.map((fn) => (
        <ActionItem 
          key={fn.name} 
          fn={fn} 
          onLog={onLog} 
          walletConnected={walletConnected} 
        />
      ))}
    </div>
  );
}
