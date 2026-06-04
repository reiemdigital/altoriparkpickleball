// client/src/components/MatchHistory.tsx
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
          // ALIGNED CONTRACTS: Fall back securely to guaranteed schema scores
          const score1 = match.team1_score ?? match.score1 ?? 0;
          const score2 = match.team2_score ?? match.score2 ?? 0;
          const t1Won = score1 > score2;

          // ALIGNED TIMESTAMP: Swapped non-existent endTime for the native ended_at string path
          const timestamp = match.ended_at
            ? new Date(match.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '00:00';

          // ALIGNED PROPERTIES: Handled optional chained safety logic and renamed .name to .team_name
          const team1Display = match.team1?.team_name || 'Unassigned Contender';
          const team2Display = match.team2?.team_name || 'Unassigned Contender';
          const courtDisplay = match.court_id ?? match.courtId ?? 0;

          return (
            <div 
              key={match.id} 
              className="bg-slate-50 border border-slate-100/70 p-4 rounded-xl flex items-center justify-between gap-4 dark:bg-slate-950/40 dark:border-white/2 transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-2">
                {/* Team 1 Row */}
                <div className="flex justify-between items-center text-sm">
                  <span className={`truncate pr-2 ${t1Won ? 'text-slate-900 font-bold dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                    {team1Display} {t1Won && '🏆'}
                  </span>
                  <span className={`font-mono font-black text-base ${t1Won ? 'text-[#64317C] dark:text-purple-400' : 'text-slate-300 dark:text-slate-600'}`}>
                    {score1}
                  </span>
                </div>

                {/* Team 2 Row */}
                <div className="flex justify-between items-center text-sm">
                  <span className={`truncate pr-2 ${!t1Won ? 'text-slate-900 font-bold dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                    {team2Display} {!t1Won && '🏆'}
                  </span>
                  <span className={`font-mono font-black text-base ${!t1Won ? 'text-[#64317C] dark:text-purple-400' : 'text-slate-300 dark:text-slate-600'}`}>
                    {score2}
                  </span>
                </div>
              </div>

              {/* Meta information container block */}
              <div className="border-l border-slate-100 pl-4 flex flex-col items-end justify-center min-w-[75px] text-right font-mono dark:border-white/5">
                <span className="text-[9px] font-mono font-bold bg-purple-50 text-[#64317C] border border-purple-100 px-2 py-0.5 rounded-md mb-1.5 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40">
                  CT 0{courtDisplay}
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