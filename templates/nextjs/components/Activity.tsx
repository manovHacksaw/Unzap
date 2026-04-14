'use client';

import { Terminal, Clock, ExternalLink, Zap, AlertCircle, Info } from 'lucide-react';

interface LogEntry {
  id: string;
  type: 'call' | 'result' | 'tx' | 'error' | 'info';
  text: string;
  timestamp: number;
}

interface ActivityProps {
  logs: LogEntry[];
}

export function Activity({ logs }: ActivityProps) {
  return (
    <div className="flex flex-col h-full bg-zinc-950/20 border border-zinc-900 rounded-3xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-zinc-500" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Recent Actions
          </h2>
        </div>
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
          {logs.length} entries
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-700 py-12">
            <Clock size={24} strokeWidth={1.5} className="mb-3 opacity-20" />
            <p className="text-[10px] font-bold uppercase tracking-widest">No activity yet</p>
          </div>
        ) : (
          [...logs].reverse().map((log) => (
            <div
              key={log.id}
              className="group flex gap-3 p-3 rounded-xl bg-zinc-900/10 border border-transparent hover:border-zinc-800/50 hover:bg-zinc-900/30 transition-all duration-300"
            >
              <div className="mt-1 shrink-0">
                {log.type === 'call' && <Zap size={12} className="text-orange-500" fill="currentColor" />}
                {log.type === 'tx' && <Zap size={12} className="text-emerald-500" fill="currentColor" />}
                {log.type === 'error' && <AlertCircle size={12} className="text-red-500" />}
                {log.type === 'info' && <Info size={12} className="text-zinc-500" />}
                {log.type === 'result' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    log.type === 'error' ? 'text-red-500/80' : 
                    log.type === 'tx' ? 'text-emerald-500/80' : 
                    log.type === 'call' ? 'text-orange-500/80' : 
                    'text-zinc-600'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-700 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                
                <p className="text-[11px] leading-relaxed text-zinc-400 break-all selection:bg-orange-500/30">
                  {log.text.includes('·') ? (
                    <>
                      {log.text.split('·')[0]}
                      <a 
                        href={log.text.split('·')[1].trim()} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-400 ml-1 underline underline-offset-4 decoration-emerald-500/20"
                      >
                        view <ExternalLink size={10} />
                      </a>
                    </>
                  ) : log.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
