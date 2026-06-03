// client/src/components/BracketView.tsx
import { useState, useMemo } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore.js';
import type { Match } from '../store/useTournamentStore';
import { SOCKET_URL } from '../socket';
import { GitFork, Sparkles, Trophy } from 'lucide-react';

const CATEGORIES = [
  "Open Singles",
  "Open Doubles(Coed)",
  "Intermediate Men's Double",
  "Intermediate Women's Double",
  "Intermediate Mixed Doubles",
  "Novice Mens Doubles",
  "Novice Woman's Doubles",
  "Novice Mixed Doubles",
  "Rookie(Coed) Doubles",
  "Juniors(17yrs old and below)",
  "50+ men's Doubles"
];

interface RenderNodeProps {
  match: Match | undefined;
  title: string;
}

const RenderNode = ({ match, title }: RenderNodeProps) => {
  if (!match) return null;

  // Evaluates winner based on finished scores cleanly to handle normal matches and walkovers
  const isTeam1Winner = match.status === 'FINISHED' && match.team1_score > match.team2_score;
  const isTeam2Winner = match.status === 'FINISHED' && match.team2_score > match.team1_score;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 w-64 shadow-md dark:bg-slate-950/60 dark:border-white/5 backdrop-blur-sm transition-all">
      <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-white/5 pb-1 flex justify-between">
        <span>{title}</span>
        {match.court_id && <span className="text-brand-accent font-bold">CT 0{match.court_id}</span>}
      </div>
      <div className="space-y-1.5">
        <div className={`text-xs flex justify-between p-1.5 rounded transition-colors ${
          isTeam1Winner 
            ? 'bg-purple-50 font-bold text-slate-900 border border-purple-100 dark:bg-brand-accent/5 dark:text-white dark:border-brand-accent/10' 
            : 'text-slate-500 dark:text-slate-400'
        }`}>
          <span className="truncate">{match.team1?.team_name || "TBD"}</span>
          <span className="font-mono">{match.status !== 'PENDING' ? match.team1_score : '-'}</span>
        </div>
        <div className={`text-xs flex justify-between p-1.5 rounded transition-colors ${
          isTeam2Winner 
            ? 'bg-purple-50 font-bold text-slate-900 border border-purple-100 dark:bg-brand-accent/5 dark:text-white dark:border-brand-accent/10' 
            : 'text-slate-500 dark:text-slate-400'
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

  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[1]);

  const isAuthenticatedOperator = sessionStorage.getItem('altori_admin_auth') === 'true';

  // Filters matches matching the strict relational payload layout of your upgraded backend
  const playoffMatches = useMemo(() => {
    return matches.filter((m) => m.match_type === 'ELIMINATION' && m.category?.name === selectedCategory);
  }, [matches, selectedCategory]);

  // Resolves category id cleanly by parsing sub-relations within active data scopes
  const currentCategoryId = useMemo(() => {
    const targetMatch = matches.find((m) => m.category?.name === selectedCategory);
    return targetMatch?.category_id || '';
  }, [matches, selectedCategory]);

  const sf1 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'SF1'), [playoffMatches]);
  const sf2 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'SF2'), [playoffMatches]);
  const finals = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'FINALS'), [playoffMatches]);

  const handleGeneratePlayoffs = async () => {
    if (!tournamentId || !currentCategoryId) {
      alert("Operational Block: Missing required tournament or category configuration references.");
      return;
    }
    try {
      const response = await axios.post(`${SOCKET_URL}/api/brackets/generate`, {
        tournamentId,
        categoryId: currentCategoryId
      });
      alert(response.data.message || "Playoff tree generated cleanly!");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Failed to initialize brackets pipeline.");
      } else {
        alert("An unexpected processing error occurred.");
      }
    }
  };

  if (playoffMatches.length === 0) {
    return (
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/10 dark:shadow-none transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-accent" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Championship Knockout Tree
            </h2>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-accent dark:bg-slate-950 dark:border-white/10 dark:text-slate-200"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="p-8 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center max-w-xl mx-auto my-4 dark:border-white/10 dark:bg-slate-900/5">
          <GitFork className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-pulse" />
          <h3 className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Playoff Vault Locked</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-2 mb-4">
            Once pool matches for {selectedCategory} wrap up, the tournament administration will calculate the dynamic wildcard matrix to advance the Top 4 teams.
          </p>
          
          {isAuthenticatedOperator && (
            <button
              onClick={handleGeneratePlayoffs}
              disabled={standings.filter(t => t.category_id === currentCategoryId).length < 4}
              className="bg-brand-accent text-white text-xs font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-md shadow-brand-accent/10 mt-2"
            >
              Run Wildcard Seeding Matrix
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/10 dark:shadow-none overflow-x-auto transition-all duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-accent" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            Championship Knockout Tree
          </h2>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-accent dark:bg-slate-950 dark:border-white/10 dark:text-slate-200"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-center gap-8 min-w-150 py-4">
        <div className="flex flex-col gap-8">
          <RenderNode match={sf1} title="Semifinal 1 (Matrix Seed 1 vs 4)" />
          <RenderNode match={sf2} title="Semifinal 2 (Matrix Seed 2 vs 3)" />
        </div>

        <div className="flex flex-col justify-around h-48 text-slate-300 dark:text-slate-700 font-mono text-xs select-none">
          <div>➔</div>
          <div>➔</div>
        </div>

        <div className="flex flex-col items-center justify-center">
          {finals ? (
            <div className="relative group">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-brand-accent font-bold tracking-widest flex items-center gap-1 min-w-37.5 justify-center">
                <Trophy className="h-3 w-3 animate-bounce" /> CHAMPIONSHIP MATCH
              </div>
              <RenderNode match={finals} title="Grand Finals" />
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 bg-slate-50 h-28 w-64 rounded-xl flex items-center justify-center text-center p-4 dark:border-white/5 dark:bg-black/20">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-wider font-medium">
                Waiting for Winners...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};