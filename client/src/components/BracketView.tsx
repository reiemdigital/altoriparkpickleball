// client/src/components/BracketView.tsx
import { useState, useMemo, useEffect } from 'react';
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

// 🛡️ TYPE SAFETY REFACTOR: Intersection type blueprint containing custom calculations safely
type PlayoffTeamDraft = TeamStanding & { poolRank?: number };

interface DraftSlots {
  SF1_T1: PlayoffTeamDraft | null;
  SF1_T2: PlayoffTeamDraft | null;
  SF2_T1: PlayoffTeamDraft | null;
  SF2_T2: PlayoffTeamDraft | null;
}

type SlotKey = keyof DraftSlots;

/** =======================================================
 * STANDALONE TOURNAMENT NODE COMPONENT
 * ======================================================= */
const RenderNode = ({ match, title }: RenderNodeProps) => {
  if (!match) return null;

  const isTeam1Winner = match.status === 'FINISHED' && match.team1_score > match.team2_score;
  const isTeam2Winner = match.status === 'FINISHED' && match.team2_score > match.team1_score;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 w-64 shadow-xs dark:bg-slate-950/60 dark:border-white/5 backdrop-blur-sm transition-all duration-200">
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

/** =======================================================
 * FLAGSHIP INTERACTIVE BRACKET WORKSPACE COMPONENT
 * ======================================================= */
export const BracketView = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const matches = useTournamentStore((state) => state.matches);
  const standings = useTournamentStore((state) => state.standings) as TeamStanding[];
  const gatewayData = useTournamentStore((state) => state.gatewayData);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const isAuthenticatedOperator = sessionStorage.getItem('altori_admin_auth') === 'true';

  // 🛠️ DRAG-AND-DROP WORKSPACE ENGINE STATES
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [finalizeLoading, setFinalizeLoading] = useState<boolean>(false);
  const [activeOverSlot, setActiveOverSlot] = useState<string | null>(null);
  const [bracketDraft, setBracketDraft] = useState<DraftSlots>({
    SF1_T1: null,
    SF1_T2: null,
    SF2_T1: null,
    SF2_T2: null,
  });

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

  // 🛡️ SENIOR DEV UX FIX: Unified workflow handler substituting the multi-render useEffect rule exception
  const handleCategoryChange = (targetCategoryId: string) => {
    setSelectedCategoryId(targetCategoryId);
    setBracketDraft({ SF1_T1: null, SF1_T2: null, SF2_T1: null, SF2_T2: null });
    setIsCustomizing(false);
  };

  const playoffMatches = useMemo(() => {
    if (!selectedCategoryId) return [];
    return matches.filter((m) => m.match_type === 'ELIMINATION' && m.category_id === selectedCategoryId);
  }, [matches, selectedCategoryId]);

  const sf1 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'SF1'), [playoffMatches]);
  const sf2 = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'SF2'), [playoffMatches]);
  const finals = useMemo(() => playoffMatches.find((m) => m.bracket_position === 'FINALS'), [playoffMatches]);

  // =========================================================================
  // 🧮 PERFORMANCE ENGINE: DERIVE TOP 2 QUALIFIED TEAMS FROM ACTIVE POOLS
  // =========================================================================
  const eligiblePlayoffTeams = useMemo(() => {
    if (!selectedCategoryId || standings.length === 0) return [];

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

    const calculatedSeeds: PlayoffTeamDraft[] = [];

    Object.keys(pools).forEach((poolLabel) => {
      const sortedPool = [...pools[poolLabel]].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.points_for - b.points_against) - (a.points_for - a.points_against);
      });

      if (sortedPool[0]) calculatedSeeds.push({ ...sortedPool[0], poolRank: 1 });
      if (sortedPool[1]) calculatedSeeds.push({ ...sortedPool[1], poolRank: 2 });
    });

    const assignedTeamIds = new Set(
      [bracketDraft.SF1_T1, bracketDraft.SF1_T2, bracketDraft.SF2_T1, bracketDraft.SF2_T2]
        .filter((t): t is PlayoffTeamDraft => t !== null)
        .map((t) => t.id)
    );

    return calculatedSeeds.filter((team) => !assignedTeamIds.has(team.id));
  }, [standings, selectedCategoryId, bracketDraft]);

  const isDraftComplete = useMemo(() => {
    return !!(bracketDraft.SF1_T1 && bracketDraft.SF1_T2 && bracketDraft.SF2_T1 && bracketDraft.SF2_T2);
  }, [bracketDraft]);

  // =========================================================================
  // 🎛️ NATIVE HTML5 DRAG AND DROP EVENT BUS HANDLERS
  // =========================================================================
  const handleDragStart = (e: React.DragEvent, teamId: string) => {
    e.dataTransfer.setData('text/plain', teamId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, slotKey: SlotKey) => {
    e.preventDefault();
    if (activeOverSlot !== slotKey) {
      setActiveOverSlot(slotKey);
    }
  };

  const handleDragLeave = () => {
    setActiveOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, slotKey: SlotKey) => {
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

  const handleClearSlot = (slotKey: SlotKey) => {
    setBracketDraft((prev) => ({
      ...prev,
      [slotKey]: null,
    }));
  };

  // =========================================================================
  // 🚀 SERVER RE-ROUTE ACTION: COMMIT OVERRIDE LEDGER TO DATABASE
  // =========================================================================
  const handleFinalizeCustomBrackets = async () => {
    if (!tournamentId || !selectedCategoryId || !isDraftComplete) return;

    const confirmation = window.confirm(
      "Confirm Seeding Layout?\nThis will create a production bracket tree using your custom seed map alignments."
    );
    if (!confirmation) return;

    setFinalizeLoading(true);
    try {
      const response = await axios.post(`${SOCKET_URL}/api/brackets/generate`, {
        tournamentId,
        categoryId: selectedCategoryId,
        seedingMethod: 'MANUAL',
        customSeeds: {
          SF1_T1_id: bracketDraft.SF1_T1?.id,
          SF1_T2_id: bracketDraft.SF1_T2?.id,
          SF2_T1_id: bracketDraft.SF2_T1?.id,
          SF2_T2_id: bracketDraft.SF2_T2?.id,
        },
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
    const confirmation = window.confirm("Execute Automated Seeding Matrix? This defaults to an standard Pool #1 vs Pool #2 crossover mapping layout.");
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

  const renderDropSlot = (slotKey: SlotKey, positionTitle: string) => {
    const occupiedTeam = bracketDraft[slotKey];
    const isHovered = activeOverSlot === slotKey;

    return (
      <div 
        onDragOver={(e) => handleDragOver(e, slotKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, slotKey)}
        className={`relative border-2 rounded-xl p-3 flex items-center justify-between transition-all duration-200 h-16 ${
          occupiedTeam 
            ? 'bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/50' 
            : isHovered
              ? 'bg-emerald-50 border-emerald-500 border-solid scale-[1.01] dark:bg-emerald-950/20 dark:border-emerald-500'
              : 'border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'
        }`}
      >
        {occupiedTeam ? (
          <>
            <div className="text-left truncate max-w-[80%]">
              <span className="text-[9px] font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 px-1.5 py-0.5 rounded uppercase tracking-wider block w-max mb-1">
                {occupiedTeam.group_id} — Rank {occupiedTeam.poolRank ?? '#'}
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
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 dark:border-white/5 dark:bg-slate-900/50 dark:shadow-none transition-all duration-200 text-left">
        
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
            
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 dark:bg-slate-950/40 dark:border-slate-800 space-y-4">
              <div>
                <h3 className="text-xs font-black font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Move className="h-3.5 w-3.5 text-purple-500" /> Eligible Finalists Pool
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Hold and drag your top team seeds directly into their target match nodes on the right.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
                {eligiblePlayoffTeams.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-[11px] font-mono select-none">
                    All qualified teams assigned
                  </div>
                ) : (
                  eligiblePlayoffTeams.map((team) => (
                    <div
                      key={team.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, team.id)}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-purple-400 active:scale-[0.99] transition-all cursor-grab flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 group"
                    >
                      <div className="truncate max-w-[85%]">
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[9px] rounded font-bold uppercase mb-1">
                          {team.group_id} — Rank {team.poolRank}
                        </span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{team.team_name}</p>
                      </div>
                      <Move className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-purple-400 transition-colors" />
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setBracketDraft({ SF1_T1: null, SF1_T2: null, SF2_T1: null, SF2_T2: null });
                  setIsCustomizing(false);
                }}
                className="w-full text-center py-2 border border-slate-200 dark:border-slate-800 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel Override Layout
              </button>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-5 dark:bg-slate-900/30 dark:border-slate-800 space-y-6">
              <div>
                <h3 className="text-xs font-black font-mono uppercase tracking-wider text-slate-800 dark:text-white">
                  Seeding Allocation Wireframe
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Align seed matches directly to create your custom semi-final pairings layout.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl dark:bg-slate-950/20 dark:border-slate-800/60">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider block">
                    🏆 Semifinal Match 1
                  </span>
                  {renderDropSlot('SF1_T1', 'Seed 1 (Top)')}
                  {renderDropSlot('SF1_T2', 'Seed 4 (Bottom)')}
                </div>

                <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl dark:bg-slate-950/20 dark:border-slate-800/60">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider block">
                    🏆 Semifinal Match 2
                  </span>
                  {renderDropSlot('SF2_T1', 'Seed 2 (Top)')}
                  {renderDropSlot('SF2_T2', 'Seed 3 (Bottom)')}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-medium text-[11px]">
                  <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
                  <span>Fill all four slot parameters to unlock transmission hooks.</span>
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
              Once pool play matches for <span className="font-bold text-slate-700 dark:text-slate-300">"{selectedCategoryName}"</span> wrap up, the tournament coordinator will advance the Top 4 teams into this knockout bracket.
            </p>
            
            {isAuthenticatedOperator && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2 font-mono text-xs font-bold uppercase tracking-wider">
                <button
                  onClick={handleRunAutoSeeding}
                  disabled={finalizeLoading || standings.filter(t => t.category_id === selectedCategoryId).length < 4}
                  className="w-full sm:w-auto bg-slate-100 border border-slate-200 text-slate-700 rounded-xl px-5 py-3 hover:bg-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80 transition-all cursor-pointer disabled:opacity-30"
                >
                  Standard Cross Seed
                </button>
                <button
                  onClick={() => setIsCustomizing(true)}
                  disabled={finalizeLoading || standings.filter(t => t.category_id === selectedCategoryId).length < 4}
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
  // 👥 UI VIEW 2: CHAMPIONSHIP MATCH TREE OVERVIEW (BRACKETS ACTIVE LIVE)
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

      <div className="flex items-center justify-center gap-8 min-w-150 py-4">
        <div className="flex flex-col gap-8">
          <RenderNode match={sf1} title="Semifinal 1" />
          <RenderNode match={sf2} title="Semifinal 2" />
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