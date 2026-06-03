// client/src/components/StandingsTable.tsx
import { useState, useMemo } from 'react';
import { useTournamentStore } from '../store/useTournamentStore.js';
import { Trophy, Layers } from 'lucide-react';

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

/** =======================================================
 * DATA MODEL INTERFACES FOR STRICT TYPE-CHECKING
 * ======================================================= */
interface TeamStanding {
  id: string;
  tournament_id: string;
  category_id: string;
  team_name: string;
  player1_name: string;
  player2_name: string;
  matches_played: number;
  wins: number;
  points_for: number;
  points_against: number;
  group_id: string | null;
}

interface CategoryMapping {
  category_id: string;
  category_name: string;
}

export const StandingsTable = () => {
  // Pull standings, matches, and metadata categories out of global state cache hooks
  const standings = useTournamentStore((state) => state.standings) as TeamStanding[];
  const gatewayData = useTournamentStore((state) => state.gatewayData);
  const matches = useTournamentStore((state) => state.matches);
  
  // Track currently active category filter view (Default to Open Doubles Coed)
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[1]);

  // Resolve UUID category keys from human-readable category name strings
  const targetCategoryId = useMemo(() => {
    const categoriesList = (gatewayData?.categories || []) as CategoryMapping[];
    const matchedCategory = categoriesList.find(c => c.category_name === selectedCategory);
    return matchedCategory?.category_id || null;
  }, [gatewayData, selectedCategory]);

  // 1. Filter out teams belonging strictly to the resolved category AND must have been seeded officially
  const filteredTeams = useMemo(() => {
    if (!targetCategoryId) return [];
    
    // SENIOR DEV FIX: Check if official match fixtures exist for this category.
    // If no matches exist, the admin hasn't clicked "Seed Pools" yet, so keep the table hidden.
    const isCategoryOfficiallySeeded = matches.some(match => match.category_id === targetCategoryId);
    if (!isCategoryOfficiallySeeded) return [];

    return standings.filter(team => 
      team.category_id === targetCategoryId && 
      team.group_id && 
      team.group_id.trim() !== '' && 
      team.group_id !== 'Pending Pool Seeding'
    );
  }, [standings, targetCategoryId, matches]);

  // 2. Separate filtered teams into individual round-robin pools (Group A, Group B, etc.)
  const groupedStandings = useMemo(() => {
    const groups: Record<string, TeamStanding[]> = {};

    filteredTeams.forEach((team) => {
      const poolLabel = team.group_id as string; 
      if (!groups[poolLabel]) {
        groups[poolLabel] = [];
      }
      groups[poolLabel].push(team);
    });

    // Sort teams internally inside each independent group bucket using snake_case properties
    Object.keys(groups).forEach((poolLabel) => {
      groups[poolLabel].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        // Tie-breaker fallback: Point Differential
        const diffA = a.points_for - a.points_against;
        const diffB = b.points_for - b.points_against;
        return diffB - diffA;
      });
    });

    return groups;
  }, [filteredTeams]);

  // Alpha-sort group keys so Group A always renders before Group B
  const sortedGroupLabels = useMemo(() => {
    return Object.keys(groupedStandings).sort((a, b) => a.localeCompare(b));
  }, [groupedStandings]);

  return (
    <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/10 dark:shadow-none transition-all duration-200">
      
      {/* CARD NAVIGATION CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            Live Tournament Standings
          </h2>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none dark:bg-slate-950 dark:border-white/10 dark:text-slate-200"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {filteredTeams.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic py-8 text-center bg-slate-50/50 dark:bg-white/1 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
          No active standings available. This division may be empty or awaiting pool seeding.
        </p>
      ) : (
        <div className="space-y-8">
          {sortedGroupLabels.map((groupLabel) => {
            const poolTeams = groupedStandings[groupLabel];

            return (
              <div key={groupLabel} className="space-y-3">
                {/* POOL HEADER BADGE */}
                <div className="flex items-center gap-1.5 px-1">
                  <Layers className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {groupLabel}
                  </h3>
                </div>

                {/* STANDALONE POOL DATA LEADERBOARD */}
                <div className="overflow-x-auto border border-slate-100 rounded-xl dark:border-white/5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 dark:bg-white/1 dark:border-white/5 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <th className="py-2.5 px-4 w-16">Rank</th>
                        <th className="py-2.5 px-4">Team</th>
                        <th className="py-2.5 px-4 text-center w-20">Played</th>
                        <th className="py-2.5 px-4 text-center w-16">Wins</th>
                        <th className="py-2.5 px-4 text-center w-16">Losses</th>
                        <th className="py-2.5 px-4 text-center w-20">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/2">
                      {poolTeams.map((team, index) => {
                        const diff = team.points_for - team.points_against;
                        const losses = team.matches_played - team.wins;
                        
                        // Highlight top 2 teams PER POOL for playoff qualifications
                        const qualifiesForPlayoffs = index < 2;

                        return (
                          <tr 
                            key={team.id} 
                            className={`text-sm transition-colors hover:bg-slate-50/80 dark:hover:bg-white/1 ${
                              qualifiesForPlayoffs ? 'bg-purple-50/40 dark:bg-purple-500/5' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={`inline-block w-6 text-center ${
                                qualifiesForPlayoffs ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'
                              }`}>
                                0{index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                {team.team_name}
                                {qualifiesForPlayoffs && (
                                  <span className="text-[8px] font-mono font-bold bg-purple-100 text-purple-600 px-1 py-0.5 rounded uppercase tracking-wider dark:bg-purple-500/10">
                                    Q
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {team.player1_name}{team.player2_name ? ` • ${team.player2_name}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">{team.matches_played}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{team.wins}</td>
                            <td className="py-3 px-4 text-center font-mono text-slate-400 dark:text-slate-500">{losses}</td>
                            <td className={`py-3 px-4 text-center font-mono font-bold ${
                              diff > 0 ? 'text-purple-600 dark:text-purple-400' : diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};