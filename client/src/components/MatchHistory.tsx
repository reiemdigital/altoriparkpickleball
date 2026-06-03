// client/src/components/MatchHistory.tsx
import React from 'react';
import { useTournamentStore } from '../store/useTournamentStore.js';
import { History, Calendar } from 'lucide-react';

export const MatchHistory = () => {
  const history = useTournamentStore((state) => state.history);

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/10 dark:shadow-none transition-all duration-200">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
        <History className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
          Completed Match Ledger
        </h2>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {history.map((match) => {
          const t1Won = match.score1 > match.score2;
          const timestamp = new Date(match.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div 
              key={match.id} 
              className="bg-slate-50 border border-slate-100/70 p-4 rounded-xl flex items-center justify-between gap-4 dark:bg-slate-950/40 dark:border-white/2 transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-2">
                {/* Team 1 Row */}
                <div className="flex justify-between items-center text-sm">
                  <span className={`truncate pr-2 ${t1Won ? 'text-slate-900 font-bold dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                    {match.team1.name} {t1Won && '🏆'}
                  </span>
                  <span className={`font-mono font-black text-base ${t1Won ? 'text-brand-accent' : 'text-slate-300 dark:text-slate-600'}`}>
                    {match.score1}
                  </span>
                </div>

                {/* Team 2 Row */}
                <div className="flex justify-between items-center text-sm">
                  <span className={`truncate pr-2 ${!t1Won ? 'text-slate-900 font-bold dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                    {match.team2.name} {!t1Won && '🏆'}
                  </span>
                  <span className={`font-mono font-black text-base ${!t1Won ? 'text-brand-accent' : 'text-slate-300 dark:text-slate-600'}`}>
                    {match.score2}
                  </span>
                </div>
              </div>

              {/* Meta information container block */}
              <div className="border-l border-slate-100 pl-4 flex flex-col items-end justify-center min-w-[75px] text-right font-mono dark:border-white/5">
                <span className="text-[9px] font-mono font-bold bg-purple-50 text-brand-accent border border-purple-100 px-2 py-0.5 rounded-md mb-1.5 dark:bg-brand-accent/5 dark:border-brand-accent/10">
                  CT 0{match.courtId}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" /> {timestamp}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};