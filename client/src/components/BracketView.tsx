// client/src/components/BracketView.tsx
import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import type { Match } from '../store/useTournamentStore';
import { SOCKET_URL } from '../socket';
import { GitFork, Sparkles, Trophy } from 'lucide-react';

interface RenderNodeProps {
  match: Match | undefined;
  title: string;
}

interface CategoryMapping {
  category_id: string;
  category_name: string;
}

const RenderNode = ({ match, title }: RenderNodeProps) => {
  if (!match) return null;

  // Evaluates winner based on finished scores cleanly to handle normal matches and walkovers
  const isTeam1Winner = match.status === 'FINISHED' && match.team1_score > match.team2_score;
  const isTeam2Winner = match.status === 'FINISHED' && match.team2_score > match.team1_score;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 w-64 shadow-md dark:bg-slate-950/60 dark:border-white/5 backdrop-blur-sm transition-all duration-200">
      <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-white/5 pb-1 flex justify-between transition-colors duration-200">
        <span>{title}</span>
        {match.court_id && <span className="text-purple-600 dark:text-purple-400 font-bold">CT 0{match.court_id}</span>}
      </div>
      <div className="space-y-1.5">
        <div className={`text-xs flex justify-between p-1.5 rounded border transition-colors duration-200 ${
          isTeam1Winner 
            ? 'bg-purple-50 font-bold text-slate-900 border-purple-100 dark:bg-purple-500/10 dark:text-white dark:border-purple-500/20' 
            : 'text-slate-500 border-transparent dark:text-slate-400'
        }`}>
          <span className="truncate">{match.team1?.team_name || "TBD"}</span>
          <span className="font-mono">{match.status !== 'PENDING' ? match.team1_score : '-'}</span>
        </div>
        <div className={`text-xs flex justify-between p-1.5 rounded border transition-colors duration-200 ${
          isTeam2Winner 
            ? 'bg-purple-50 font-bold text-slate-900 border-purple-100 dark:bg-purple-500/10 dark:text-white dark:border-purple-500/20' 
            : 'text-slate-500 border-transparent dark:text-slate-400'
        }`}>
          <span className="truncate">{match.team2?.team_name || "TBD"}</span>
          <span className="font-mono">{match.status !== 'PENDING' ? match.team2_score : '-'}</span>
        </div>
      </div>
    </div>
  );
};

export const BracketView = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const matches = useTournamentStore((state) => state.matches);
  const standings = useTournamentStore((state) => state.standings);
  const gatewayData = useTournamentStore((state) => state.gatewayData);

  // 🛡️ PERFORMANCE SEPARATOR: Track active views by relational key instead of text values
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const isAuthenticatedOperator = sessionStorage.getItem('altori_admin_auth') === 'true';

  // Safely distill database categories array from global caching gateway layer
  const databaseCategories = useMemo(() => {
    return (gatewayData?.categories || []) as CategoryMapping[];
  }, [gatewayData]);

  // Resolve dynamic localized text value for descriptions/placeholders
  const selectedCategoryName = useMemo(() => {
    const matched = databaseCategories.find(c => c.category_id === selectedCategoryId);
    return matched?.category_name || 'this division';
  }, [databaseCategories, selectedCategoryId]);

  // ⚡ AUTOMATED STATE LIFECYCLE SYNC LAYER
  useEffect(() => {
    if (databaseCategories.length > 0 && !selectedCategoryId) {
      // Defer macro-task execution timing to break synchronous re-rendering loops seamlessly
      const deferInit = setTimeout(() => {
        setSelectedCategoryId(databaseCategories[0].category_id);
      }, 0);
      return () => clearTimeout(deferInit);
    }
  }, [databaseCategories, selectedCategoryId]);

  // Filters elimination rounds matching the strict relational layout of your database
  const playoffMatches = useMemo(() => {
    if (!selectedCategoryId) return [];
    return matches.filter((m) => m.match_type === 'ELIMINATION' && m.category_id === selectedCategoryId);
  }, [matches, selectedCategoryId]);

  const sf1 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'SF1'), [playoffMatches]);
  const sf2 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'SF2'), [playoffMatches]);
  const finals = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'FINALS'), [playoffMatches]);

  const handleGeneratePlayoffs = async () => {
    if (!tournamentId || !selectedCategoryId) {
      alert("Operational Block: Missing required tournament or division configurations.");
      return;
    }
    try {
      const response = await axios.post(`${SOCKET_URL}/api/brackets/generate`, {
        tournamentId,
        categoryId: selectedCategoryId
      });
      alert(response.data.message || "Playoff brackets initialized successfully!");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Failed to compile bracket paths.");
      } else {
        alert("An unexpected network engine exception occurred.");
      }
    }
  };

  if (playoffMatches.length === 0) {
    return (
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/50 dark:shadow-none transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-4 transition-colors duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Championship Knockout Tree
            </h2>
          </div>

          {databaseCategories.length > 0 && (
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 cursor-pointer transition-colors duration-200"
            >
              {databaseCategories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="p-8 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center max-w-xl mx-auto my-4 dark:border-white/10 dark:bg-white/[0.01] transition-colors duration-200">
          <GitFork className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-pulse" />
          <h3 className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Playoff Brackets Locked</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-2 mb-4 leading-relaxed">
            Once pool play matches for <span className="font-bold text-slate-700 dark:text-slate-300">"{selectedCategoryName}"</span> wrap up, the tournament coordinator will advance the Top 4 teams into this knockout bracket.
          </p>
          
          {isAuthenticatedOperator && (
            <button
              onClick={handleGeneratePlayoffs}
              disabled={standings.filter(t => t.category_id === selectedCategoryId).length < 4}
              className="bg-[#088505] text-white text-xs font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-md shadow-[#088505]/10 mt-2"
            >
              Generate Elimination Brackets
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/50 dark:shadow-none overflow-x-auto transition-all duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-4 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            Championship Knockout Tree
          </h2>
        </div>

        {databaseCategories.length > 0 && (
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 cursor-pointer transition-colors duration-200"
          >
            {databaseCategories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center justify-center gap-8 min-w-150 py-4">
        <div className="flex flex-col gap-8">
          <RenderNode match={sf1} title="Semifinal 1 (Seed 1 vs 4)" />
          <RenderNode match={sf2} title="Semifinal 2 (Seed 2 vs 3)" />
        </div>

        <div className="flex flex-col justify-around h-48 text-slate-300 dark:text-slate-700 font-mono text-xs select-none">
          <div>➔</div>
          <div>➔</div>
        </div>

        <div className="flex flex-col items-center justify-center">
          {finals ? (
            <div className="relative group">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-purple-600 dark:text-purple-400 font-black tracking-widest flex items-center gap-1 min-w-37.5 justify-center uppercase">
                <Trophy className="h-3 w-3 animate-bounce" /> Championship Final
              </div>
              <RenderNode match={finals} title="Grand Finals" />
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 bg-slate-50 h-28 w-64 rounded-xl flex items-center justify-center text-center p-4 dark:border-white/5 dark:bg-black/20 transition-all duration-200">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-wider font-medium">
                Awaiting Match Winners...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};