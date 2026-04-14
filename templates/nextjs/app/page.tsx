'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Overview } from '@/components/Overview';
import { Actions } from '@/components/Actions';
import { Data } from '@/components/Data';
import { Activity } from '@/components/Activity';
import { SetupGuide } from '@/components/SetupGuide';
import { useWallet } from '@/hooks/wallet';

type LogType = 'call' | 'result' | 'tx' | 'error' | 'info';

interface LogEntry {
  id: string;
  type: LogType;
  text: string;
  timestamp: number;
}

export default function Home() {
  const { address } = useWallet();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback(
    (type: LogType, text: string) => {
      setLogs((prev) => [
        ...prev.slice(-19),
        { 
          id: Math.random().toString(36).slice(2), 
          type, 
          text, 
          timestamp: Date.now() 
        },
      ]);
    },
    []
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-100/10">
      <Header contractName="{{CONTRACT_NAME}}" />

      <main className="max-w-[1400px] mx-auto px-8 py-12 space-y-12">
        <Overview contractName="{{CONTRACT_NAME}}" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Write Actions */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-100 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Execute Commands
                </h2>
              </div>
              <div className="bg-zinc-900/10 border border-zinc-900 rounded-[2.5rem] overflow-hidden">
                <Actions onLog={addLog} walletConnected={!!address} />
              </div>
            </section>

            {/* Read Data */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.4)]" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Contract Status
                </h2>
              </div>
              <div className="bg-zinc-900/10 border border-zinc-900 rounded-[2.5rem] overflow-hidden">
                <Data />
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-12">
             <section className="space-y-6 h-[500px]">
               <Activity logs={logs} />
             </section>

             <section className="space-y-6">
               <SetupGuide />
             </section>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-8 mt-12">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          <p>© 2026 Powered by Unzap Protocol</p>
          <div className="flex gap-8">
            <a href="https://unzap.dev" className="hover:text-zinc-400 transition-colors">Documentation</a>
            <a href="https://github.com/manovHacksaw/Unzap" className="hover:text-zinc-400 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
