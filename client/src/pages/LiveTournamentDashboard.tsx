// client/src/pages/LiveTournamentDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import { Trophy, GitFork, ShieldAlert } from 'lucide-react';

// Local Component Type Definitions
type PublicTabType = 'leaderboards' | 'brackets';

/** =======================================================
 * PUBLIC LIVE TELEMETRY STREAM PANEL (/tournament/:id/live)
 * ======================================================= */
export function LiveTournamentDashboard() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [publicTab, setPublicTab] = useState<PublicTabType>('leaderboards');
  
  const { setMatches, setStandings, setHistory, setGatewayData, updateMatch } = useTournamentStore();
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

    // FIXED: Strong typed match data parameters prevent explicit 'any' lint block exceptions
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

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6 animate-in fade-in duration-200 relative min-h-[calc(100vh-100px)] pb-24">
      {networkError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm font-mono">
          ⚠️ Connection offline. Transmitting signals dropping from backend engine at {SOCKET_URL}.
        </div>
      )}

      <CourtGrid />

      <div className="my-8 flex justify-center">
        <div className="bg-white border border-slate-200 p-1 rounded-2xl flex flex-wrap justify-center items-center gap-1 shadow-sm dark:bg-slate-900/40 dark:border-white/5">
          <button 
            onClick={() => setPublicTab('leaderboards')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              publicTab === 'leaderboards' ? 'bg-purple-50 text-[#64317C] dark:bg-purple-500/10 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Trophy className="h-4 w-4" /> Leaderboards
          </button>
          <button 
            onClick={() => setPublicTab('brackets')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              publicTab === 'brackets' ? 'bg-purple-50 text-[#64317C] dark:bg-purple-500/10 dark:text-purple-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <GitFork className="h-4 w-4" /> Knockout Brackets
          </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {publicTab === 'leaderboards' ? (
          <div className="space-y-6 max-w-6xl mx-auto">
            <StandingsTable />
            <MatchHistory />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <BracketView />
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