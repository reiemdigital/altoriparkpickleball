// client/src/components/StandingsTable.tsx
import { useState, useMemo, useEffect } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Trophy, Layers, Lock } from 'lucide-react';

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
  const standings = useTournamentStore((state) => state.standings) as TeamStanding[];
  const gatewayData = useTournamentStore((state) => state.gatewayData);
  const matches = useTournamentStore((state) => state.matches);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const databaseCategories = useMemo(() => {
    return (gatewayData?.categories || []) as CategoryMapping[];
  }, [gatewayData]);

  useEffect(() => {
    if (databaseCategories.length > 0 && !selectedCategoryId) {
      const deferInit = setTimeout(() => {
        setSelectedCategoryId(databaseCategories[0].category_id);
      }, 0);
      return () => clearTimeout(deferInit);
    }
  }, [databaseCategories, selectedCategoryId]);

  // 🚀 REFACTORED: Determine if the round-robin group phase has concluded
  const isGroupStageFinished = useMemo(() => {
    if (!selectedCategoryId) return false;
    
    const categoryMatches = matches.filter(m => m.category_id === selectedCategoryId);
    const roundRobinMatches = categoryMatches.filter(m => m.match_type === 'ROUND_ROBIN');
    
    if (roundRobinMatches.length === 0) return false;
    
    // Group stage is done if all round robin matches are FINISHED and elimination matches have started
    const allRoundRobinFinished = roundRobinMatches.every(m => m.status === 'FINISHED');
    const eliminationStarted = categoryMatches.some(m => m.match_type === 'ELIMINATION');
    
    return allRoundRobinFinished || eliminationStarted;
  }, [matches, selectedCategoryId]);

  // 🚀 REFACTORED: Dynamically re-calculate standings exclusively using ROUND_ROBIN match records
  const computedStandings = useMemo(() => {
    if (!selectedCategoryId) return [];

    const isCategoryOfficiallySeeded = matches.some(m => m.category_id === selectedCategoryId);
    if (!isCategoryOfficiallySeeded) return [];

    // Onboard teams belonging to this category segment
    const baseTeams = standings.filter(team => 
      team.category_id === selectedCategoryId && 
      team.group_id && 
      team.group_id.trim() !== '' && 
      team.group_id !== 'Pending Pool Seeding'
    );

    // Filter down to completed group stage matches for this specific category tier
    const completedGroupMatches = matches.filter(m => 
      m.category_id === selectedCategoryId && 
      m.match_type === 'ROUND_ROBIN' && 
      m.status === 'FINISHED'
    );

    // Build fresh, insulated metrics maps
    return baseTeams.map(team => {
      let matches_played = 0;
      let wins = 0;
      let points_for = 0;
      let points_against = 0;

      completedGroupMatches.forEach(match => {
        if (match.team1_id === team.id) {
          matches_played++;
          points_for += match.team1_score;
          points_against += match.team2_score;
          if (match.team1_score > match.team2_score) wins++;
        } else if (match.team2_id === team.id) {
          matches_played++;
          points_for += match.team2_score;
          points_against += match.team1_score;
          if (match.team2_score > match.team1_score) wins++;
        }
      });

      return {
        ...team,
        matches_played,
        wins,
        points_for,
        points_against
      };
    });
  }, [standings, selectedCategoryId, matches]);

  const groupedStandings = useMemo(() => {
    const groups: Record<string, TeamStanding[]> = {};

    computedStandings.forEach((team) => {
      const poolLabel = team.group_id as string; 
      if (!groups[poolLabel]) {
        groups[poolLabel] = [];
      }
      groups[poolLabel].push(team);
    });

    Object.keys(groups).forEach((poolLabel) => {
      groups[poolLabel].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const diffA = a.points_for - a.points_against;
        const diffB = b.points_for - b.points_against;
        return diffB - diffA;
      });
    });

    return groups;
  }, [computedStandings]);

  const sortedGroupLabels = useMemo(() => {
    return Object.keys(groupedStandings).sort((a, b) => a.localeCompare(b));
  }, [groupedStandings]);

  return (
    <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/50 dark:shadow-none transition-all duration-200">
      
      {/* CARD NAVIGATION CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-white/5 pb-4 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Live Tournament Standings
            </h2>
            {/* 🚀 UI EMBED: Visible status tag that communicates when metrics are locked */}
            {isGroupStageFinished && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 uppercase tracking-wider">
                <Lock className="h-2.5 w-2.5" /> Pools Locked
              </span>
            )}
          </div>
        </div>

        {databaseCategories.length > 0 && (
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 transition-colors duration-200 cursor-pointer"
          >
            {databaseCategories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.category_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {computedStandings.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic py-8 text-center bg-slate-50/50 dark:bg-white/[0.02] rounded-xl border border-dashed border-slate-200 dark:border-white/5 transition-all duration-200">
          No active standings available. This division may be empty or awaiting pool seeding.
        </p>
      ) : (
        <div className="space-y-8">
          {sortedGroupLabels.map((groupLabel) => {
            const poolTeams = groupedStandings[groupLabel];

            return (
              <div key={groupLabel} className="space-y-3">
                <div className="flex items-center gap-1.5 px-1">
                  <Layers className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {groupLabel}
                  </h3>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl dark:border-white/5 transition-colors duration-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 dark:bg-white/[0.02] dark:border-white/5 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-200">
                        <th className="py-2.5 px-4 w-16">Rank</th>
                        <th className="py-2.5 px-4">Team</th>
                        <th className="py-2.5 px-4 text-center w-20">Played</th>
                        <th className="py-2.5 px-4 text-center w-16">Wins</th>
                        <th className="py-2.5 px-4 text-center w-16">Losses</th>
                        <th className="py-2.5 px-4 text-center w-20">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 transition-colors duration-200">
                      {poolTeams.map((team, index) => {
                        const diff = team.points_for - team.points_against;
                        const losses = team.matches_played - team.wins;
                        const qualifiesForPlayoffs = index < 2;

                        return (
                          <tr 
                            key={team.id} 
                            className={`text-sm transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.02] ${
                              qualifiesForPlayoffs ? 'bg-purple-50/40 dark:bg-purple-500/[0.03]' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={`inline-block w-6 text-center ${
                                qualifiesForPlayoffs ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'
                              }`}>
                                0index + 1
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-colors duration-200">
                                {team.team_name}
                                {qualifiesForPlayoffs && (
                                  <span className="text-[8px] font-mono font-bold bg-purple-100 text-purple-600 px-1 py-0.5 rounded uppercase tracking-wider dark:bg-purple-500/10">
                                    Q
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 transition-colors duration-200">
                                {team.player1_name}{team.player2_name ? ` • ${team.player2_name}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400 transition-colors duration-200">{team.matches_played}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 transition-colors duration-200">{team.wins}</td>
                            <td className="py-3 px-4 text-center font-mono text-slate-400 dark:text-slate-500 transition-colors duration-200">{losses}</td>
                            <td className={`py-3 px-4 text-center font-mono font-bold transition-colors duration-200 ${
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