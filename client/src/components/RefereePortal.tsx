// client/src/components/RefereePortal.tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// FIXED: Imported the Match type interface contract directly to clear the linter warning
import { useTournamentStore, type Match } from '../store/useTournamentStore.js';
import axios from 'axios';
import { io } from 'socket.io-client'; 
import { SOCKET_URL } from '../socket';
import { ChevronLeft, CheckCircle2, ShieldAlert, Award, Plus, Minus } from 'lucide-react';

interface CustomMatchExtension {
  id: string;
  tournament_id: string; 
  status: string;
  court_id: number | null;
  courtId?: number | null;
  team1_id: string;
  team2_id: string;
  team1_score: number;
  team2_score: number;
  score1?: number;
  score2?: number;
  team1: { team_name?: string; name?: string };
  team2: { team_name?: string; name?: string };
  refereeName?: string;
  referee_name?: string;
}

export const RefereePortal = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  // Zustand Bindings
  const matches = useTournamentStore((state) => state.matches) as unknown as CustomMatchExtension[];
  const updateMatch = useTournamentStore((state) => state.updateMatch);
  
  const currentMatch = matches.find((m) => m.id === matchId);

  // Localized WebSocket lifecycle observer syncs standalone handheld controllers
  useEffect(() => {
    if (!matchId || !currentMatch) return;

    const socket = io(SOCKET_URL);
    const parentTournamentId = currentMatch.tournament_id;

    socket.emit('join-tournament-room', parentTournamentId);

    // FIXED: Exchanged explicit 'any' type definition with the strict 'Match' schema object
    socket.on('score-live', (updatedMatch: Match) => {
      if (updatedMatch.id === matchId) {
        updateMatch(updatedMatch); 
      }
    });

    return () => {
      socket.emit('leave-tournament-room', parentTournamentId);
      socket.off('score-live');
      socket.disconnect();
    };
  }, [matchId, currentMatch, updateMatch]);

  // 🛠️ DEFENSIVE ARCHITECTURAL APPROACH: Safe variable route target computations
  const exitTargetRoute = currentMatch?.tournament_id 
    ? `/admin/${currentMatch.tournament_id}` 
    : '/admin';

  const adjustScore = async (teamNum: 1 | 2, amount: number) => {
    // Stop adjustments if the match is already locked/finished
    if (!currentMatch || currentMatch.status === 'FINISHED') return;
    
    let s1 = currentMatch.team1_score ?? currentMatch.score1 ?? 0;
    let s2 = currentMatch.team2_score ?? currentMatch.score2 ?? 0;

    if (teamNum === 1) s1 = Math.max(0, s1 + amount);
    if (teamNum === 2) s2 = Math.max(0, s2 + amount);

    try {
      await axios.put(`${SOCKET_URL}/api/matches/${currentMatch.id}/score`, {
        score1: s1,
        score2: s2,
      });
    } catch (error) {
      console.error("Failed syncing remote referee adjustment:", error);
    }
  };

  const finalizeMatch = async () => {
    if (!currentMatch || currentMatch.status === 'FINISHED') return;
    if (!window.confirm("🚨 LOCK SCORES? Are you sure this match is complete? Final scores will be locked permanently into tournament standings.")) return;

    // Cache target route before unmounting schemas inside store modifications
    const targetedRedirect = exitTargetRoute;

    try {
      await axios.put(`${SOCKET_URL}/api/matches/${currentMatch.id}/finish`);
      
      // 🚀 Fix approach: Routes cleanly back into the designated console workspace
      navigate(targetedRedirect);
    } catch (error: unknown) {
      console.error("Failed to execute final lifecycle check:", error);
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Failed to finalize scorecard on server repository layers.");
      } else {
        alert("An unexpected exception network state blocked scorecard submittal.");
      }
    }
  };

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4">
          <ShieldAlert className="h-6 w-6 text-red-500" />
        </div>
        <p className="text-sm font-mono font-bold text-slate-200 mb-2 uppercase tracking-wide">Session Terminated</p>
        <p className="text-xs text-slate-500 max-w-xs mb-6">Match session not found or has already been finalized by tournament controllers.</p>
        
        {/* 🚀 Fix approach: Modified to route back to general administrative gateway safely */}
        <button 
          onClick={() => navigate('/admin')} 
          className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider uppercase text-slate-300 active:scale-95 transition-all cursor-pointer"
        >
          Return to Console
        </button>
      </div>
    );
  }

  const displayCourtId = currentMatch.court_id ?? currentMatch.courtId ?? 0;
  const team1ActiveScore = currentMatch.team1_score ?? currentMatch.score1 ?? 0;
  const team2ActiveScore = currentMatch.team2_score ?? currentMatch.score2 ?? 0;

  const isTeam1Leading = team1ActiveScore > team2ActiveScore;
  const isTeam2Leading = team2ActiveScore > team1ActiveScore;

  const displayTeam1Name = currentMatch.team1?.team_name || currentMatch.team1?.name || "Team 1";
  const displayTeam2Name = currentMatch.team2?.team_name || currentMatch.team2?.name || "Team 2";
  const displayRefereeName = currentMatch.refereeName || currentMatch.referee_name || "Official Staff";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-brand-accent/20 select-none touch-manipulation">
      {/* HEADER CONTROL BAR */}
      <header className="px-4 py-3.5 border-b border-white/5 bg-slate-900/20 backdrop-blur-md flex justify-between items-center sticky top-0 z-50">
        {/* 🚀 Fix approach: Modifies the top bar back click to safely return to active director views */}
        <button 
          onClick={() => navigate(exitTargetRoute)} 
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 active:text-white transition-colors cursor-pointer bg-transparent border-none focus:outline-none"
        >
          <ChevronLeft className="h-4 w-4 stroke-[3]" /> LEAVE
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">{displayRefereeName}</span>
          <span className="text-[10px] font-mono font-black px-2.5 py-1 bg-brand-accent text-slate-950 rounded-lg tracking-wider uppercase">
            COURT 0{displayCourtId}
          </span>
        </div>
      </header>

      {/* CORE CONTROL CONTEXT VIEW */}
      <div className="flex-1 flex flex-col p-4 gap-4 max-w-md mx-auto w-full justify-between my-auto">
        
        {/* TEAM ONE GIANT SCORE BOX CARD */}
        <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col p-4 justify-between h-[38vh] min-h-[220px] ${
          isTeam1Leading ? 'bg-slate-900 border-brand-accent/30 shadow-lg shadow-brand-accent/[0.02]' : 'bg-slate-900/40 border-white/5'
        }`}>
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">TEAM ONE</span>
            {isTeam1Leading && <Award className="h-4 w-4 text-brand-accent animate-pulse" />}
          </div>
          <div className="truncate my-1">
            <h2 className="text-base font-black text-white tracking-tight truncate">{displayTeam1Name}</h2>
          </div>
          <div className="flex items-center justify-between gap-4 w-full mt-auto h-24">
            <button onClick={() => adjustScore(1, -1)} className="h-20 w-16 bg-slate-800 border border-white/5 rounded-xl flex items-center justify-center active:bg-slate-700 text-slate-300 transition-colors cursor-pointer">
              <Minus className="h-5 w-5 stroke-[3]" />
            </button>
            <span className="text-7xl font-black font-mono tracking-tighter text-white w-20 text-center">{team1ActiveScore}</span>
            <button onClick={() => adjustScore(1, 1)} className="h-20 flex-1 bg-gradient-to-r from-brand-accent to-purple-600 text-white rounded-xl flex items-center justify-center gap-1 active:scale-[0.97] text-sm font-black tracking-wider uppercase transition-transform shadow-md shadow-brand-accent/10 cursor-pointer">
              <Plus className="h-4 w-4 stroke-[4]" /> Point
            </button>
          </div>
        </div>

        {/* TEAM TWO GIANT SCORE BOX CARD */}
        <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col p-4 justify-between h-[38vh] min-h-[220px] ${
          isTeam2Leading ? 'bg-slate-900 border-brand-accent/30 shadow-lg shadow-brand-accent/[0.02]' : 'bg-slate-900/40 border-white/5'
        }`}>
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">TEAM TWO</span>
            {isTeam2Leading && <Award className="h-4 w-4 text-brand-accent animate-pulse" />}
          </div>
          <div className="truncate my-1">
            <h2 className="text-base font-black text-white tracking-tight truncate">{displayTeam2Name}</h2>
          </div>
          <div className="flex items-center justify-between gap-4 w-full mt-auto h-24">
            <button onClick={() => adjustScore(2, -1)} className="h-20 w-16 bg-slate-800 border border-white/5 rounded-xl flex items-center justify-center active:bg-slate-700 text-slate-300 transition-colors cursor-pointer">
              <Minus className="h-5 w-5 stroke-[3]" />
            </button>
            <span className="text-7xl font-black font-mono tracking-tighter text-white w-20 text-center">{team2ActiveScore}</span>
            <button onClick={() => adjustScore(2, 1)} className="h-20 flex-1 bg-gradient-to-r from-brand-accent to-purple-600 text-white rounded-xl flex items-center justify-center gap-1 active:scale-[0.97] text-sm font-black tracking-wider uppercase transition-transform shadow-md shadow-brand-accent/10 cursor-pointer">
              <Plus className="h-4 w-4 stroke-[4]" /> Point
            </button>
          </div>
        </div>

        {/* SECURE SUBMITTAL SUB-PANEL CARD */}
        <div className="mt-2 p-1.5 border border-dashed border-emerald-500/20 bg-emerald-500/[0.02] rounded-2xl">
          <button
            onClick={finalizeMatch}
            className="w-full bg-emerald-500 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 active:scale-[0.99] text-xs font-mono tracking-widest uppercase transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4 stroke-[2.5]" /> Submit Official Scorecard
          </button>
        </div>

      </div>
    </div>
  );
};