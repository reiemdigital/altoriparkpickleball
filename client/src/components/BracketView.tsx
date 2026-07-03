// client/src/components/BracketView.tsx
import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import type { Match } from '../store/useTournamentStore';
import { SOCKET_URL } from '../socket';
import { GitFork, Sparkles, Trophy, Move, X, Check, Loader2, HelpCircle } from 'lucide-react';

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

interface RenderNodeProps {
  match: Match | undefined;
  title: string;
}

type PlayoffTeamDraft = TeamStanding & { poolRank?: number };

/** =======================================================
 * STANDALONE TOURNAMENT NODE COMPONENT WITH BYE DETECTION
 * ======================================================= */
const RenderNode = ({ match, title }: RenderNodeProps) => {
  if (!match) return null;

  const t1Name = match.team1?.team_name || "TBD";
  const t2Name = match.team2?.team_name || "TBD";
  
  const isT1Bye = t1Name.toUpperCase() === 'BYE';
  const isT2Bye = t2Name.toUpperCase() === 'BYE';

  const isTeam1Winner = match.status === 'FINISHED' && match.team1_score > match.team2_score;
  const isTeam2Winner = match.status === 'FINISHED' && match.team2_score > match.team1_score;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 w-64 shadow-xs dark:bg-slate-950/60 dark:border-white/5 backdrop-blur-sm transition-all duration-200">
      <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-white/5 pb-1 flex justify-between transition-colors duration-200">
        <span>{title}</span>
        {match.court_id && !isT1Bye && !isT2Bye && (
          <span className="text-purple-600 dark:text-purple-400 font-bold">CT 0{match.court_id}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {/* TEAM NODE SLOT 1 */}
        <div className={`text-xs flex justify-between p-1.5 rounded border transition-all duration-200 ${
          isTeam1Winner 
            ? 'bg-purple-50 font-bold text-slate-900 border-purple-100 dark:bg-purple-500/10 dark:text-white dark:border-purple-500/20' 
            : isT1Bye 
              ? 'bg-slate-100/40 text-slate-400 border-transparent italic dark:bg-white/2'
              : 'text-slate-500 border-transparent dark:text-slate-400'
        }`}>
          <span className="truncate">{t1Name}</span>
          <span className="font-mono">
            {isT1Bye ? '—' : match.status !== 'PENDING' ? match.team1_score : '-'}
          </span>
        </div>
        
        {/* TEAM NODE SLOT 2 */}
        <div className={`text-xs flex justify-between p-1.5 rounded border transition-all duration-200 ${
          isTeam2Winner 
            ? 'bg-purple-50 font-bold text-slate-900 border-purple-100 dark:bg-purple-500/10 dark:text-white dark:border-purple-500/20' 
            : isT2Bye 
              ? 'bg-slate-100/40 text-slate-400 border-transparent italic dark:bg-white/2'
              : 'text-slate-500 border-transparent dark:text-slate-400'
        }`}>
          <span className="truncate">{t2Name}</span>
          <span className="font-mono">
            {isT2Bye ? '—' : match.status !== 'PENDING' ? match.team2_score : '-'}
          </span>
        </div>
      </div>
    </div>
  );
};

/** =======================================================
 * DYNAMIC BRACKET TREE WORKSPACE CANVAS
 * ======================================================= */
export const BracketView = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const matches = useTournamentStore((state) => state.matches) as Match[];
  const standings = useTournamentStore((state) => state.standings) as TeamStanding[];
  const gatewayData = useTournamentStore((state) => state.gatewayData);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const isAuthenticatedOperator = sessionStorage.getItem('altori_admin_auth') === 'true';

  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [finalizeLoading, setFinalizeLoading] = useState<boolean>(false);
  const [activeOverSlot, setActiveOverSlot] = useState<string | null>(null);
  
  const [bracketDraft, setBracketDraft] = useState<Record<string, PlayoffTeamDraft | null>>({});

  const databaseCategories = useMemo(() => {
    return (gatewayData?.categories || []) as CategoryMapping[];
  }, [gatewayData]);

  const selectedCategoryName = useMemo(() => {
    const matched = databaseCategories.find(c => c.category_id === selectedCategoryId);
    return matched?.category_name || 'this division';
  }, [databaseCategories, selectedCategoryId]);

  useEffect(() => {
    if (databaseCategories.length > 0 && !selectedCategoryId) {
      const deferInit = setTimeout(() => {
        setSelectedCategoryId(databaseCategories[0].category_id);
      }, 0);
      return () => clearTimeout(deferInit);
    }
  }, [databaseCategories, selectedCategoryId]);

  const handleCategoryChange = (targetCategoryId: string) => {
    setSelectedCategoryId(targetCategoryId);
    setBracketDraft({});
    setIsCustomizing(false);
  };

  const playoffMatches = useMemo(() => {
    if (!selectedCategoryId) return [];
    return matches.filter((m) => m.match_type === 'ELIMINATION' && m.category_id === selectedCategoryId);
  }, [matches, selectedCategoryId]);

  const qf1 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'QF1'), [playoffMatches]);
  const qf2 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'QF2'), [playoffMatches]);
  const qf3 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'QF3'), [playoffMatches]);
  const qf4 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'QF4'), [playoffMatches]);
  const sf1 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'SF1'), [playoffMatches]);
  const sf2 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'SF2'), [playoffMatches]);
  const finals = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'FINALS'), [playoffMatches]);
  const thirdPlace = useMemo(() => playoffMatches.find((m) => m.bracket_position === '3RD_PLACE'), [playoffMatches]);

  const hasActiveQuarterFinals = useMemo(() => {
    return !!(qf1 || qf2 || qf3 || qf4);
  }, [qf1, qf2, qf3, qf4]);

  // =========================================================================
  // 🧮 PLAYOFF DATA DERIVATION MATRIX WITH FIXED TIE-BREAKER LOGIC
  // =========================================================================
  const { calculatedSeeds, targetBracketSize } = useMemo(() => {
    if (!selectedCategoryId || standings.length === 0) return { calculatedSeeds: [], targetBracketSize: 4 };

    const categoryTeams = standings.filter(
      (t) =>
        t.category_id === selectedCategoryId &&
        t.group_id &&
        t.group_id.trim() !== '' &&
        t.group_id !== 'Pending Pool Seeding'
    );

    const pools: Record<string, TeamStanding[]> = {};
    categoryTeams.forEach((team) => {
      const poolLabel = team.group_id!;
      if (!pools[poolLabel]) pools[poolLabel] = [];
      pools[poolLabel].push(team);
    });

    const seeds: PlayoffTeamDraft[] = [];
    
    // Sort keys alphabetically to guarantee deterministic layout groupings
    Object.keys(pools).sort().forEach((poolLabel) => {
      const sortedPool = [...pools[poolLabel]].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        // 🚀 FIXED: Fixed tie-breaker derivation loop clashing formulas
        const diffA = a.points_for - a.points_against;
        const diffB = b.points_for - b.points_against;
        return diffB - diffA;
      });

      if (sortedPool[0]) seeds.push({ ...sortedPool[0], poolRank: 1 });
      if (sortedPool[1]) seeds.push({ ...sortedPool[1], poolRank: 2 });
    });

    // 🚀 UX IMPROVEMENT: Sort finalists list by Rank first, then alphabetically by Group ID
    const displaySortedSeeds = [...seeds].sort((a, b) => {
      if ((a.poolRank || 0) !== (b.poolRank || 0)) {
        return (a.poolRank || 0) - (b.poolRank || 0);
      }
      return (a.group_id || '').localeCompare(b.group_id || '');
    });

    const size = displaySortedSeeds.length > 4 ? 8 : 4;
    return { calculatedSeeds: displaySortedSeeds, targetBracketSize: size };
  }, [standings, selectedCategoryId]);

  const eligiblePlayoffTeams = useMemo(() => {
    const assignedTeamIds = new Set(
      Object.values(bracketDraft)
        .filter((t): t is PlayoffTeamDraft => t !== null && t.id !== 'BYE_WILDCARD')
        .map((t) => t.id)
    );

    const filteredPool = calculatedSeeds.filter((team) => !assignedTeamIds.has(team.id));

    if (targetBracketSize === 8) {
      const byeCardAsset: PlayoffTeamDraft = {
        id: 'BYE_WILDCARD',
        tournament_id: '',
        category_id: '',
        team_name: 'BYE',
        player1_name: 'System',
        player2_name: 'Walkover',
        matches_played: 0,
        wins: 0,
        points_for: 0,
        points_against: 0,
        group_id: 'FREE'
      };
      return [byeCardAsset, ...filteredPool];
    }

    return filteredPool;
  }, [calculatedSeeds, bracketDraft, targetBracketSize]);

  const activeWireframeSlots = useMemo(() => {
    return targetBracketSize === 8 
      ? [
          { key: 'QF1_T1', title: 'QF1 (Top)' }, { key: 'QF1_T2', title: 'QF1 (Bottom)' },
          { key: 'QF2_T1', title: 'QF2 (Top)' }, { key: 'QF2_T2', title: 'QF2 (Bottom)' },
          { key: 'QF3_T1', title: 'QF3 (Top)' }, { key: 'QF3_T2', title: 'QF3 (Bottom)' },
          { key: 'QF4_T1', title: 'QF4 (Top)' }, { key: 'QF4_T2', title: 'QF4 (Bottom)' }
        ]
      : [
          { key: 'SF1_T1', title: 'SF1 (Top)' }, { key: 'SF1_T2', title: 'SF1 (Bottom)' },
          { key: 'SF2_T1', title: 'SF2 (Top)' }, { key: 'SF2_T2', title: 'SF2 (Bottom)' }
        ];
  }, [targetBracketSize]);

  const isDraftComplete = useMemo(() => {
    return activeWireframeSlots.every(slot => !!bracketDraft[slot.key]);
  }, [activeWireframeSlots, bracketDraft]);

  // =========================================================================
  // 🎛️ NATIVE HTML5 DRAG AND DROP EVENT BUS HANDLERS
  // =========================================================================
  const handleDragStart = (e: React.DragEvent, teamId: string) => {
    e.dataTransfer.setData('text/plain', teamId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    if (activeOverSlot !== slotKey) setActiveOverSlot(slotKey);
  };

  const handleDragLeave = () => {
    setActiveOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    setActiveOverSlot(null);
    const teamId = e.dataTransfer.getData('text/plain');
    if (!teamId) return;

    const targetedTeam = eligiblePlayoffTeams.find((t) => t.id === teamId);
    if (!targetedTeam) return;

    setBracketDraft((prev) => ({
      ...prev,
      [slotKey]: targetedTeam,
    }));
  };

  const handleClearSlot = (slotKey: string) => {
    setBracketDraft((prev) => ({
      ...prev,
      [slotKey]: null,
    }));
  };

  // =========================================================================
  // 🚀 SERVER RE-ROUTE ACTIONS
  // =========================================================================
  const handleFinalizeCustomBrackets = async () => {
    if (!tournamentId || !selectedCategoryId || !isDraftComplete) return;

    const confirmation = window.confirm(
      "Confirm Seeding Layout?\nThis will create a production bracket tree using your custom seed map alignments."
    );
    if (!confirmation) return;

    setFinalizeLoading(true);
    
    const processIdParam = (nodeObj: PlayoffTeamDraft | null | undefined) => {
      if (!nodeObj) return null;
      if (nodeObj.id === 'BYE_WILDCARD') return 'BYE';
      return nodeObj.id;
    };

    const corePayload = targetBracketSize === 8
      ? {
          SF1_T1_id: null, SF1_T2_id: null, SF2_T1_id: null, SF2_T2_id: null, 
          QF1_T1_id: processIdParam(bracketDraft['QF1_T1']),
          QF1_T2_id: processIdParam(bracketDraft['QF1_T2']),
          QF2_T1_id: processIdParam(bracketDraft['QF2_T1']),
          QF2_T2_id: processIdParam(bracketDraft['QF2_T2']),
          QF3_T1_id: processIdParam(bracketDraft['QF3_T1']),
          QF3_T2_id: processIdParam(bracketDraft['QF3_T2']),
          QF4_T1_id: processIdParam(bracketDraft['QF4_T1']),
          QF4_T2_id: processIdParam(bracketDraft['QF4_T2']),
        }
      : {
          SF1_T1_id: processIdParam(bracketDraft['SF1_T1']),
          SF1_T2_id: processIdParam(bracketDraft['SF1_T2']),
          SF2_T1_id: processIdParam(bracketDraft['SF2_T1']),
          SF2_T2_id: processIdParam(bracketDraft['SF2_T2']),
        };

    try {
      const response = await axios.post(`${SOCKET_URL}/api/brackets/generate`, {
        tournamentId,
        categoryId: selectedCategoryId,
        seedingMethod: 'MANUAL',
        customSeeds: corePayload,
      });

      alert(response.data.message || "Custom playoff brackets initialized!");
      setIsCustomizing(false);
    } catch (error) {
      console.error("Manual allocation validation pipeline failure:", error);
      let runtimeMessage = "Failed to establish your custom playoff layout specifications.";
      if (axios.isAxiosError(error)) {
        runtimeMessage = error.response?.data?.error || runtimeMessage;
      }
      alert(runtimeMessage);
    } finally {
      setFinalizeLoading(false);
    }
  };

  const handleRunAutoSeeding = async () => {
    const confirmation = window.confirm("Execute Automated Seeding Matrix? This defaults to a standard Pool #1 vs Pool #2 crossover mapping layout.");
    if (!confirmation) return;

    setFinalizeLoading(true);
    try {
      const response = await axios.post(`${SOCKET_URL}/api/brackets/generate`, {
        tournamentId,
        categoryId: selectedCategoryId,
        seedingMethod: 'AUTOMATIC'
      });
      alert(response.data.message || "Playoff brackets initialized successfully!");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Failed to compile automatic bracket paths.");
      }
    } finally {
      setFinalizeLoading(false);
    }
  };

  const renderDropSlot = (slotKey: string, positionTitle: string) => {
    const occupiedTeam = bracketDraft[slotKey];
    const isHovered = activeOverSlot === slotKey;
    const isByeObj = occupiedTeam?.id === 'BYE_WILDCARD';

    return (
      <div 
        onDragOver={(e) => handleDragOver(e, slotKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, slotKey)}
        className={`relative border-2 rounded-xl p-3 flex items-center justify-between transition-all duration-200 h-16 ${
          occupiedTeam 
            ? isByeObj
              ? 'bg-slate-100 border-slate-300 dark:bg-white/5 dark:border-white/10 opacity-60 font-mono italic'
              : 'bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/50' 
            : isHovered
              ? 'bg-emerald-50 border-emerald-500 border-solid scale-[1.01] dark:bg-emerald-950/20 dark:border-emerald-500'
              : 'border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'
        }`}
      >
        {occupiedTeam ? (
          <>
            <div className="text-left truncate max-w-[80%]">
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider block w-max mb-1 ${
                isByeObj ? 'bg-slate-200 text-slate-600' : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
              }`}>
                {isByeObj ? 'System Wildcard' : `${occupiedTeam.group_id} — Rank ${occupiedTeam.poolRank ?? '#'}`}
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{occupiedTeam.team_name}</p>
            </div>
            <button 
              type="button"
              onClick={() => handleClearSlot(slotKey)}
              className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-600 font-mono text-[11px] font-medium mx-auto select-none">
            <Move className={`h-3.5 w-3.5 ${isHovered ? 'animate-bounce text-emerald-500' : ''}`} />
            <span>Drop {positionTitle} Here</span>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // 🖥️ UI VIEW 1: DRAFT OVERLAY CREATOR SUITE (UNSEEDED / PLAYOFFS OPEN)
  // =========================================================================
  if (playoffMatches.length === 0) {
    return (
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/50 dark:shadow-none text-left">
        
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
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 cursor-pointer transition-colors duration-200"
            >
              {databaseCategories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
              ))}
            </select>
          )}
        </div>

        {isAuthenticatedOperator && isCustomizing ? (
          <div className="animate-in fade-in duration-200 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 dark:bg-slate-950/40 dark:border-slate-800 space-y-4">
              <div>
                <h3 className="text-xs font-black font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Move className="h-3.5 w-3.5 text-purple-500" /> Finalists Allocation Board
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  {targetBracketSize === 8 
                    ? "Drag teams or BYE placeholders onto the 8-slot Quarter-Final layout wires."
                    : "Drag your top team seeds directly into their target match nodes on the right."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-110 overflow-y-auto pr-1">
                {eligiblePlayoffTeams.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-[11px] font-mono select-none">
                    All qualified teams assigned
                  </div>
                ) : (
                  eligiblePlayoffTeams.map((team, idx) => {
                    const isBye = team.id === 'BYE_WILDCARD';
                    return (
                      <div
                        key={isBye ? `bye-card-${idx}` : team.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, team.id)}
                        className={`p-3 border rounded-xl shadow-xs transition-all cursor-grab flex items-center justify-between group text-xs font-bold ${
                          isBye 
                            ? 'bg-slate-100 border-slate-300 text-slate-600 font-mono italic dark:bg-white/5 dark:border-white/10' 
                            : 'bg-white border-slate-200 hover:border-purple-400 dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="truncate max-w-[85%]">
                          <span className={`inline-block px-1.5 py-0.5 font-mono text-[9px] rounded font-bold uppercase mb-1 ${
                            isBye ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {isBye ? 'Wildcard' : `${team.group_id} — Rank ${team.poolRank}`}
                          </span>
                          <p className="truncate">{team.team_name}</p>
                        </div>
                        <Move className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-purple-400 transition-colors" />
                      </div>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setBracketDraft({});
                  setIsCustomizing(false);
                }}
                className="w-full text-center py-2 border border-slate-200 dark:border-slate-800 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel Override Layout
              </button>
            </div>

            <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl p-5 dark:bg-slate-900/30 dark:border-slate-800 space-y-6">
              <div>
                <h3 className="text-xs font-black font-mono uppercase tracking-wider text-slate-800 dark:text-white">
                  {targetBracketSize === 8 ? "Quarter-Final Wireframe Array" : "Semifinal Wireframe Array"}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Populate all slot parameters to formulate your customized brackets payload.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targetBracketSize === 8 ? (
                  <>
                    <div className="space-y-2 bg-slate-50/50 p-3.5 border border-slate-200/60 rounded-xl dark:bg-slate-950/20 dark:border-slate-800/60">
                      <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider block">🏆 Quarterfinal Match 1</span>
                      {renderDropSlot('QF1_T1', 'QF1 (Top)')}
                      {renderDropSlot('QF1_T2', 'QF1 (Bottom)')}
                    </div>
                    <div className="space-y-2 bg-slate-50/50 p-3.5 border border-slate-200/60 rounded-xl dark:bg-slate-950/20 dark:border-slate-800/60">
                      <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider block">🏆 Quarterfinal Match 2</span>
                      {renderDropSlot('QF2_T1', 'QF2 (Top)')}
                      {renderDropSlot('QF2_T2', 'QF2 (Bottom)')}
                    </div>
                    <div className="space-y-2 bg-slate-50/50 p-3.5 border border-slate-200/60 rounded-xl dark:bg-slate-950/20 dark:border-slate-800/60">
                      <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider block">🏆 Quarterfinal Match 3</span>
                      {renderDropSlot('QF3_T1', 'QF3 (Top)')}
                      {renderDropSlot('QF3_T2', 'QF3 (Bottom)')}
                    </div>
                    <div className="space-y-2 bg-slate-50/50 p-3.5 border border-slate-200/60 rounded-xl dark:bg-slate-950/20 dark:border-slate-800/60">
                      <span className="text-[9px] font-mono font-black uppercase text-slate-400 tracking-wider block">🏆 Quarterfinal Match 4</span>
                      {renderDropSlot('QF4_T1', 'QF4 (Top)')}
                      {renderDropSlot('QF4_T2', 'QF4 (Bottom)')}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl dark:bg-slate-950/20 dark:border-slate-800/60">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider block">🏆 Semifinal Match 1</span>
                      {renderDropSlot('SF1_T1', 'Seed 1 (Top)')}
                      {renderDropSlot('SF1_T2', 'Seed 4 (Bottom)')}
                    </div>
                    <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl dark:bg-slate-950/20 dark:border-slate-800/60">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider block">🏆 Semifinal Match 2</span>
                      {renderDropSlot('SF2_T1', 'Seed 2 (Top)')}
                      {renderDropSlot('SF2_T2', 'Seed 3 (Bottom)')}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-medium text-[11px]">
                  <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
                  <span>Fill out all empty parameters to unlock the deployment pipelines.</span>
                </div>

                <button
                  onClick={handleFinalizeCustomBrackets}
                  disabled={!isDraftComplete || finalizeLoading}
                  className="w-full sm:w-auto bg-[#088505] text-white font-mono text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-lg shadow-[#088505]/10 active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {finalizeLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Committing Seeds...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Save & Finalize Bracket
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="p-8 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center max-w-xl mx-auto my-4 dark:border-white/10 dark:bg-white/[0.01] transition-colors duration-200">
            <GitFork className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-pulse" />
            <h3 className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Playoff Brackets Locked</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-2 mb-4 leading-relaxed">
              Once group play finishes for <span className="font-bold text-slate-700 dark:text-slate-300">"{selectedCategoryName}"</span>, the director will advance qualified teams into this knockout tree layout.
            </p>
            
            {isAuthenticatedOperator && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2 font-mono text-xs font-bold uppercase tracking-wider">
                <button
                  onClick={handleRunAutoSeeding}
                  disabled={finalizeLoading || calculatedSeeds.length < 4}
                  className="w-full sm:w-auto bg-slate-100 border border-slate-200 text-slate-700 rounded-xl px-5 py-3 hover:bg-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80 transition-all cursor-pointer disabled:opacity-30"
                >
                  Standard Cross Seed
                </button>
                <button
                  onClick={() => {
                    setBracketDraft({});
                    setIsCustomizing(true);
                  }}
                  disabled={finalizeLoading || calculatedSeeds.length < 4}
                  className="w-full sm:w-auto bg-[#088505] text-white rounded-xl px-6 py-3 shadow-md shadow-[#088505]/10 hover:bg-opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-30"
                >
                  <Move className="h-3.5 w-3.5" /> Manual Drag & Drop
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 👥 UI VIEW 2: ACTIVE BRACKET TREE CANVASES (POLYMORPHIC COLUMN SCALING)
  // =========================================================================
  return (
    <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/50 dark:shadow-none overflow-x-auto transition-all duration-200 text-left">
      
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
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 cursor-pointer transition-colors duration-200"
          >
            {databaseCategories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-10">
        
        {/* UPPER ROW: ACTIVE SINGLE-ELIMINATION TOURNAMENT FLOW LINES */}
        <div className="flex items-center justify-center gap-6 min-w-180 py-4 select-none">
          
          {/* TIER 1 COLUMN: QUARTER-FINALS */}
          {hasActiveQuarterFinals && (
            <>
              <div className="flex flex-col gap-4">
                <RenderNode match={qf1} title="Quarterfinal 1" />
                <RenderNode match={qf2} title="Quarterfinal 2" />
                <RenderNode match={qf3} title="Quarterfinal 3" />
                <RenderNode match={qf4} title="Quarterfinal 4" />
              </div>
              
              <div className="flex flex-col justify-around h-96 text-slate-300 dark:text-slate-700 font-mono text-xs">
                <div className="h-1/4 flex items-center">➔</div>
                <div className="h-1/4 flex items-center">➔</div>
                <div className="h-1/4 flex items-center">➔</div>
                <div className="h-1/4 flex items-center">➔</div>
              </div>
            </>
          )}

          {/* TIER 2 COLUMN: SEMI-FINALS */}
          <div className="flex flex-col gap-16 justify-around h-full py-4">
            <RenderNode match={sf1} title="Semifinal 1" />
            <RenderNode match={sf2} title="Semifinal 2" />
          </div>

          <div className="flex flex-col justify-around h-48 text-slate-300 dark:text-slate-700 font-mono text-xs">
            <div>➔</div>
            <div>➔</div>
          </div>

          {/* TIER 3 COLUMN: CHAMPIONSHIP FINAL NODE */}
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

        {/* LOWER ROW: 3RD PLACE CONSOLATION PLAYOFF */}
        <div className="mt-4 pt-6 border-t border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
          <div className="text-center mb-4">
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-500 font-black tracking-widest uppercase flex items-center justify-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" /> Bronze Medal Consolation Playoff
            </span>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Losing teams from Semifinal 1 and Semifinal 2 compete directly to determine the 3rd place podium position.
            </p>
          </div>
          <div className="flex justify-center select-none">
            {thirdPlace ? (
              <RenderNode match={thirdPlace} title="3rd Place Playoff" />
            ) : (
              <div className="border border-dashed border-slate-100 bg-slate-50/40 h-24 w-64 rounded-xl flex items-center justify-center text-center p-4 dark:border-white/5 dark:bg-black/10 transition-all duration-200">
                <span className="text-[9px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-wider font-medium">
                  Awaiting Consolation Seeds...
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
      
    </div>
  );
};