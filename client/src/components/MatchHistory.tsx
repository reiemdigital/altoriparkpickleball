// client/src/components/MatchHistory.tsx
import { useState, useMemo } from 'react';
import { useTournamentStore } from '../store/useTournamentStore.js';
import { SOCKET_URL } from '../socket';
import axios from 'axios';
import { History, Calendar, Edit2, Check, X, Loader2, Search } from 'lucide-react';
import { useAlertStore } from '../store/useAlertStore';

export const MatchHistory = () => {
  const history = useTournamentStore((state) => state.history);
  const gatewayData = useTournamentStore((state) => state.gatewayData);
  const triggerAlert = useAlertStore((state) => state.triggerAlert);

  const isAdmin = gatewayData?.isAdmin;

  // =========================================================================
  // 🎛️ LOCAL CONTROL ACTIONS, SEARCH STATE & RUNTIME HOOKS
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [inputScore1, setInputScore1] = useState<number>(0);
  const [inputScore2, setInputScore2] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // =========================================================================
  // 🧮 MEMOIZED SEARCH FILTER EVALUATION LAYER (Moved above early return)
  // =========================================================================
  const processedFilteredHistory = useMemo(() => {
    const parsedQuery = searchQuery.trim().toLowerCase();
    if (!parsedQuery) return history;

    return history.filter((match) => {
      const team1Name = match.team1?.team_name?.toLowerCase() || 'unassigned contender';
      const team2Name = match.team2?.team_name?.toLowerCase() || 'unassigned contender';
      const divisionName = match.category?.name?.toLowerCase() || 'general category';
      const courtNumber = `court 0${match.court_id ?? match.courtId ?? 0}`;
      const shortCourtNumber = `ct 0${match.court_id ?? match.courtId ?? 0}`;

      return (
        team1Name.includes(parsedQuery) ||
        team2Name.includes(parsedQuery) ||
        divisionName.includes(parsedQuery) ||
        courtNumber.includes(parsedQuery) ||
        shortCourtNumber.includes(parsedQuery)
      );
    });
  }, [history, searchQuery]);

  // Early-return threshold check only if the total baseline array is empty
  if (history.length === 0) {
    return (
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl dark:border-white/5 dark:bg-slate-900/10 text-center text-xs text-slate-400 italic">
        No completed matches discovered inside this tournament record.
      </div>
    );
  }

  const startInlineEditing = (matchId: string, currentS1: number, currentS2: number) => {
    setEditingMatchId(matchId);
    setInputScore1(currentS1);
    setInputScore2(currentS2);
  };

  const cancelInlineEditing = () => {
    setEditingMatchId(null);
    setIsSubmitting(false);
  };

  const saveScoreCorrection = async (matchId: string) => {
    if (inputScore1 < 0 || inputScore2 < 0) {
      triggerAlert({
        title: "Validation Limit",
        message: "Match scores cannot fall below negative baseline integer metrics.",
        type: "warning"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const secureToken = sessionStorage.getItem('altori_admin_token');

      await axios.put(
        `${SOCKET_URL}/api/admin/matches/${matchId}/correct-score`,
        {
          score1: inputScore1,
          score2: inputScore2
        },
        {
          withCredentials: true,
          headers: secureToken ? { Authorization: `Bearer ${secureToken}` } : {}
        }
      );

      triggerAlert({
        title: "Scores Corrected",
        message: "Match outcome values updated and standings redistributed successfully.",
        type: "success"
      });
      
      setEditingMatchId(null);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        triggerAlert({
          title: "Adjustment Rejected",
          message: String(error.response?.data?.error || "Failed to commit retroactive parameters."),
          type: "error"
        });
      } else {
        triggerAlert({
          title: "System Exception",
          message: "An internal front-end compiler exception occurred.",
          type: "error"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/10 dark:shadow-none transition-all duration-200 text-left w-full">
      
      {/* Container Header Title Bar */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-white/5 pb-4">
        <History className="h-5 w-5 text-purple-500" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
          Completed Match Ledger
        </h2>
      </div>

      {/* 🔍 COMPLETED LEDGER DYNAMIC SEARCH INPUT BOUNDARY BAR */}
      <div className="mb-4 relative w-full shrink-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Lookup history by team profiles, category divisions, or assigned courts..."
          className="w-full bg-slate-50/50 border border-slate-200/80 rounded-xl pl-9 pr-8 py-2.5 text-xs font-sans font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 transition-all min-h-9.5"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer group"
            title="Clear ledger query"
          >
            <X className="h-3.5 w-3.5 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        )}
      </div>

      {/* Match Records Scroll Container Block */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 w-full">
        {processedFilteredHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-sans italic border border-dashed border-slate-200/60 dark:border-white/5 rounded-xl bg-slate-50/30 dark:bg-slate-950/10">
            No historical records discovered matching your search criteria.
          </div>
        ) : (
          processedFilteredHistory.map((match) => {
            const score1 = match.team1_score ?? match.score1 ?? 0;
            const score2 = match.team2_score ?? match.score2 ?? 0;
            const t1Won = score1 > score2;
            const isCurrentlyEditing = editingMatchId === match.id;

            const timestamp = match.ended_at
              ? new Date(match.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '00:00';

            const team1Display = match.team1?.team_name || 'Unassigned Contender';
            const team2Display = match.team2?.team_name || 'Unassigned Contender';
            const courtDisplay = match.court_id ?? match.courtId ?? 0;
            const divisionDisplay = match.category?.name || 'General Category';

            return (
              <div 
                key={match.id} 
                className={`border p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 w-full min-w-0 ${
                  isCurrentlyEditing
                    ? 'bg-amber-50/40 border-amber-300 shadow-xs dark:bg-amber-500/5 dark:border-amber-500/30'
                    : 'bg-slate-50 border-slate-100/70 dark:bg-slate-950/40 dark:border-white/2'
                }`}
              >
                {/* Left Score Presentation Layout Pane */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* Team 1 Row */}
                  <div className="flex justify-between items-center text-sm gap-4">
                    <span className={`truncate ${t1Won ? 'text-slate-900 font-bold dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                      {team1Display} {t1Won && '🏆'}
                    </span>
                    
                    {!isCurrentlyEditing ? (
                      <span className={`font-mono font-black text-base ${t1Won ? 'text-purple-600 dark:text-purple-400' : 'text-slate-300 dark:text-slate-600'}`}>
                        {score1}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={inputScore1}
                        disabled={isSubmitting}
                        onChange={(e) => setInputScore1(parseInt(e.target.value, 10) || 0)}
                        className="w-14 bg-white text-slate-800 border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-center font-bold focus:outline-none focus:border-purple-500 dark:bg-slate-900 dark:text-white dark:border-white/10"
                      />
                    )}
                  </div>

                  {/* Team 2 Row */}
                  <div className="flex justify-between items-center text-sm gap-4">
                    <span className={`truncate ${!t1Won ? 'text-slate-900 font-bold dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                      {team2Display} {!t1Won && '🏆'}
                    </span>
                    
                    {!isCurrentlyEditing ? (
                      <span className={`font-mono font-black text-base ${!t1Won ? 'text-purple-600 dark:text-purple-400' : 'text-slate-300 dark:text-slate-600'}`}>
                        {score2}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={inputScore2}
                        disabled={isSubmitting}
                        onChange={(e) => setInputScore2(parseInt(e.target.value, 10) || 0)}
                        className="w-14 bg-white text-slate-800 border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-center font-bold focus:outline-none focus:border-purple-500 dark:bg-slate-900 dark:text-white dark:border-white/10"
                      />
                    )}
                  </div>
                </div>

                {/* Right Metadata and Operational Button Action Ribbon */}
                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-white/5 pt-3 md:pt-0 md:pl-4 shrink-0 font-mono">
                  <div className="flex flex-col items-start md:items-end justify-center min-w-[110px]">
                    <span className="text-[9px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-md mb-1 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40 uppercase tracking-wider">
                      CT 0{courtDisplay}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide truncate max-w-[120px] mb-1" title={divisionDisplay}>
                      {divisionDisplay}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" /> {timestamp}
                    </span>
                  </div>

                  {/* Control Actions: Admin Score Override Toggles */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 pl-2">
                      {!isCurrentlyEditing ? (
                        <button
                          onClick={() => startInlineEditing(match.id, score1, score2)}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Correct finished scores"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 animate-in scale-in duration-150">
                          <button
                            onClick={() => saveScoreCorrection(match.id)}
                            disabled={isSubmitting}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            title="Save adjustments"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={cancelInlineEditing}
                            disabled={isSubmitting}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            title="Cancel adjustments"
                        >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};