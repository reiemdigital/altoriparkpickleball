// client/src/pages/LiveTournamentDashboard.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTournamentStore, type Match } from '../store/useTournamentStore';
import { SOCKET_URL, socket } from '../socket';

// Sub-Component Layer Imports
import { CourtGrid } from '../components/CourtGrid';
import { StandingsTable } from '../components/StandingsTable';
import { MatchHistory } from '../components/MatchHistory';
import { BracketView } from '../components/BracketView';

// Icons
import { Trophy, GitFork, ShieldAlert, Medal, Award } from 'lucide-react';

// Local Component Type Definitions
type PublicTabType = 'leaderboards' | 'brackets' | 'podium';

/** =======================================================
 * PUBLIC LIVE TELEMETRY STREAM PANEL (/tournament/:id/live)
 * ======================================================= */
export function LiveTournamentDashboard() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [publicTab, setPublicTab] = useState<PublicTabType>('leaderboards');
  
  // Strict selector extraction tracking global slice updates atomically
  const matches = useTournamentStore((state) => state.matches);
  const standings = useTournamentStore((state) => state.standings);
  const gatewayData = useTournamentStore((state) => state.gatewayData);
  
  const setMatches = useTournamentStore((state) => state.setMatches);
  const setStandings = useTournamentStore((state) => state.setStandings);
  const setHistory = useTournamentStore((state) => state.setHistory);
  const setGatewayData = useTournamentStore((state) => state.setGatewayData);
  const updateMatch = useTournamentStore((state) => state.updateMatch);
  
  const [networkError, setNetworkError] = useState(false);

  const isAdminAuthenticated = sessionStorage.getItem('altori_admin_auth') === 'true';

  const fetchTournamentData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const [matchesRes, standingsRes, historyRes, gatewayRes] = await Promise.all([
        axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/matches`),
        axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/standings`),
        axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/matches/history`),
        axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/gateway`) 
      ]);
      setMatches(matchesRes.data);
      setStandings(standingsRes.data);
      setHistory(historyRes.data);
      setGatewayData(gatewayRes.data); 
      setNetworkError(false);
    } catch (err) {
      console.error("Failed to compile active running arrays context:", err);
      setNetworkError(true);
    }
  }, [tournamentId, setMatches, setStandings, setHistory, setGatewayData]);

  useEffect(() => {
    const deferredFetch = setTimeout(() => {
      fetchTournamentData();
    }, 0);
    
    socket.emit('join-tournament-room', tournamentId);

    socket.on('score-live', (updatedMatch: Match) => {
      updateMatch(updatedMatch);
    });

    socket.on('standings-refresh', () => {
      fetchTournamentData();
    });

    return () => {
      clearTimeout(deferredFetch);
      socket.emit('leave-tournament-room', tournamentId);
      socket.off('score-live');
      socket.off('standings-refresh');
    };
  }, [tournamentId, fetchTournamentData, updateMatch]);

  /** =======================================================
   * DYNAMIC PODIUM DATA EXTRACTION ENGINE (MEMOIZED)
   * ======================================================= */
  const podiumDataByDivision = useMemo(() => {
    const categoriesList = gatewayData.categories || [];
    
    return categoriesList.map((cat) => {
      const catId = cat.category_id;
      
      // Filter category specific matches and standings
      const catMatches = matches.filter(m => m.category_id === catId);
      const catStandings = standings.filter(s => s.category_id === catId);

      let championName = "";
      let secondPlaceName = "";
      let thirdPlaceName = "";
      let isOfficialFromBrackets = false;

      // Extract details from elimination brackets if available
      const finalsMatch = catMatches.find(m => m.match_type === 'ELIMINATION' && m.bracket_position === 'FINALS');
      const thirdPlaceMatch = catMatches.find(m => m.match_type === 'ELIMINATION' && m.bracket_position === '3RD_PLACE');

      if (finalsMatch && finalsMatch.status === 'FINISHED') {
        isOfficialFromBrackets = true;
        if (finalsMatch.team1_score > finalsMatch.team2_score) {
          championName = finalsMatch.team1?.team_name || "Unassigned Champ";
          secondPlaceName = finalsMatch.team2?.team_name || "Unassigned 2nd";
        } else {
          championName = finalsMatch.team2?.team_name || "Unassigned Champ";
          secondPlaceName = finalsMatch.team1?.team_name || "Unassigned 2nd";
        }
      }

      if (thirdPlaceMatch && thirdPlaceMatch.status === 'FINISHED') {
        if (thirdPlaceMatch.team1_score > thirdPlaceMatch.team2_score) {
          thirdPlaceName = thirdPlaceMatch.team1?.team_name || "Unassigned 3rd";
        } else {
          thirdPlaceName = thirdPlaceMatch.team2?.team_name || "Unassigned 3rd";
        }
      }

      // Standings fallback projection loop
      if (!championName && catStandings.length > 0) {
        championName = catStandings[0]?.team_name || "TBD";
      }
      if (!secondPlaceName && catStandings.length > 1) {
        secondPlaceName = catStandings[1]?.team_name || "TBD";
      }
      if (!thirdPlaceName && catStandings.length > 2) {
        thirdPlaceName = catStandings[2]?.team_name || "TBD";
      }

      return {
        categoryId: catId,
        categoryName: cat.category_name,
        categoryFormat: cat.category_type || 'Doubles',
        hasTeams: catStandings.length > 0,
        isOfficial: isOfficialFromBrackets,
        champion: championName || "To Be Decided",
        second: secondPlaceName || "To Be Decided",
        third: thirdPlaceName || "To Be Decided"
      };
    });
  }, [gatewayData.categories, matches, standings]);

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6 animate-in fade-in duration-200 relative min-h-[calc(100vh-100px)] pb-24">
      {networkError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm font-mono">
          ⚠️ Connection offline. Transmitting signals dropping from backend engine at {SOCKET_URL}.
        </div>
      )}

      <CourtGrid />

      {/* REFACTORED TAB SELECTOR CAPABILITY WITH MEDAL LAYER LINKAGE */}
      <div className="my-8 flex justify-center">
        <div className="bg-white border border-slate-200 p-1 rounded-2xl flex flex-wrap justify-center items-center gap-1 shadow-xs dark:bg-slate-900/40 dark:border-white/5">
          <button 
            onClick={() => setPublicTab('leaderboards')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              publicTab === 'leaderboards' ? 'bg-purple-50 text-[#64317C] dark:bg-purple-500/10 dark:text-purple-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Trophy className="h-4 w-4" /> Leaderboards
          </button>
          <button 
            onClick={() => setPublicTab('brackets')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              publicTab === 'brackets' ? 'bg-purple-50 text-[#64317C] dark:bg-purple-500/10 dark:text-purple-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <GitFork className="h-4 w-4" /> Knockout Brackets
          </button>
          <button 
            onClick={() => setPublicTab('podium')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              publicTab === 'podium' ? 'bg-purple-50 text-[#64317C] dark:bg-purple-500/10 dark:text-purple-400 shadow-xs' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Medal className="h-4 w-4" /> Winners Circle
          </button>
        </div>
      </div>

      {/* CONTENT PANELS MATRIX LAYER VIEW ENVELOPE */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {publicTab === 'leaderboards' ? (
          <div className="space-y-6 max-w-6xl mx-auto">
            <StandingsTable />
            <MatchHistory />
          </div>
        ) : publicTab === 'brackets' ? (
          <div className="max-w-6xl mx-auto">
            <BracketView />
          </div>
        ) : (
          /* MODERN PRESTIGE PODIUM DISPLAY PANELS MODULE */
          <div className="max-w-6xl mx-auto space-y-8 text-left">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-black font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" /> Division Winners Circle
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Official podium crowns and live performance seeding layouts across running categories.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {podiumDataByDivision.map((div) => (
                <div key={div.categoryId} className="bg-white border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
                  
                  {/* Division Header Meta Info Box */}
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-black uppercase font-mono tracking-wide text-slate-900 dark:text-white">{div.categoryName}</h3>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded mt-1 inline-block">
                        Format: {div.categoryFormat}
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-full border uppercase ${
                      div.isOfficial 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20' 
                        : 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20'
                    }`}>
                      {div.isOfficial ? '🏆 Official Results' : '🔥 Live Projections'}
                    </span>
                  </div>

                  {!div.hasTeams ? (
                    <div className="py-8 text-center font-mono text-xs text-slate-400 italic">
                      Waiting for matches to start in this division.
                    </div>
                  ) : (
                    /* Staggered Responsive Podium Elements Grid Container */
                    <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-2 pt-4 w-full">
                      
                      {/* 🥈 Second Placer Card Block */}
                      <div className="w-full md:order-1 flex flex-col items-center">
                        <div className="w-full bg-linear-to-b from-slate-100/60 to-slate-50 border border-slate-200 dark:from-slate-900/50 dark:to-slate-950/20 dark:border-slate-800 rounded-2xl p-4 text-center space-y-2 relative min-h-25 flex flex-col justify-center">
                          <div className="absolute top-3 left-3 bg-slate-400/20 text-slate-700 dark:text-slate-300 h-6 w-6 font-mono font-bold text-xs flex items-center justify-center rounded-full">2</div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate px-4">{div.second}</p>
                          <p className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Silver Medalist</p>
                        </div>
                        <div className="hidden md:block w-full h-12 bg-slate-200/60 border-t border-slate-300 dark:bg-slate-800/40 dark:border-slate-700 rounded-t-lg mt-1" />
                      </div>

                      {/* 🥇 First Placer (Champion) Card Block */}
                      <div className="w-full md:order-2 flex flex-col items-center transform md:-translate-y-3">
                        <div className="w-full bg-linear-to-b from-amber-500/10 to-yellow-500/2 border-2 border-amber-400/40 dark:from-amber-500/10 dark:to-slate-950/10 rounded-2xl p-5 text-center space-y-2.5 relative min-h-28.75 shadow-sm flex flex-col justify-center">
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white h-7 w-7 font-mono font-black text-xs flex items-center justify-center rounded-full shadow-xs animate-bounce">1</div>
                          <p className="text-sm font-black text-amber-600 dark:text-yellow-400 truncate pt-4 px-2">{div.champion}</p>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">🥇 Division Champion</p>
                        </div>
                        <div className="hidden md:block w-full h-20 bg-linear-to-b from-amber-500/20 to-amber-500/5 border-t-2 border-amber-400/40 rounded-t-lg mt-1" />
                      </div>

                      {/* 🥉 Third Placer Card Block */}
                      <div className="w-full md:order-3 flex flex-col items-center">
                        <div className="w-full bg-linear-to-b from-orange-400/10 to-orange-400/2 border border-orange-300/30 dark:from-orange-500/5 dark:to-slate-950/20 dark:border-slate-800/80 rounded-2xl p-4 text-center space-y-2 relative min-h-25 flex flex-col justify-center">
                          <div className="absolute top-3 left-3 bg-orange-600/10 text-orange-700 dark:text-orange-400 h-6 w-6 font-mono font-bold text-xs flex items-center justify-center rounded-full">3</div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate px-4">{div.third}</p>
                          <p className="text-[9px] font-mono uppercase tracking-wider text-orange-500/80">Bronze Medalist</p>
                        </div>
                        <div className="hidden md:block w-full h-8 bg-orange-700/10 border-t border-orange-600/20 dark:bg-orange-950/20 dark:border-orange-900/30 rounded-t-lg mt-1" />
                      </div>

                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isAdminAuthenticated && tournamentId && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Link
            to={`/admin/${tournamentId}`}
            className="flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-xl font-mono text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-xl border border-slate-800 dark:border-white/10 group cursor-pointer"
          >
            <ShieldAlert className="h-4 w-4 text-emerald-500 animate-pulse group-hover:rotate-12 transition-transform" />
            Manage Tournament
          </Link>
        </div>
      )}
    </div>
  );
}