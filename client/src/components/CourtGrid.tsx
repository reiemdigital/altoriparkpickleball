// client/src/components/CourtGrid.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import { useTournamentStore } from '../store/useTournamentStore.js';
import type { Match } from '../store/useTournamentStore.js';
import { useAlertStore } from '../store/useAlertStore'; 
import axios from 'axios';
import { SOCKET_URL } from '../socket';
import { X, AlertTriangle, ShieldAlert, RefreshCw, Layers, Volume2 } from 'lucide-react';

declare global {
  interface Window {
    speakMatchAnnouncement?: (team1: string, team2: string, court: number, category: string, mode: 'short' | 'detailed') => void;
  }
}

export const CourtGrid = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  const matches = useTournamentStore((state) => state.matches) as unknown as Match[];
  const setMatches = useTournamentStore((state) => state.setMatches);
  const gatewayData = useTournamentStore((state) => state.gatewayData);
  const triggerAlert = useAlertStore((state) => state.triggerAlert);

  const [localCourtCount, setLocalCourtCount] = useState<number | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showDefaultSubMenu, setShowDefaultSubMenu] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const totalVenueCourts = localCourtCount || gatewayData?.tournament?.court_count || 4;
  const courts = Array.from({ length: totalVenueCourts }, (_, i) => i + 1);

  const isAdminView = window.location.pathname.includes('/admin');

  const refreshMatches = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/matches`);
      setMatches(res.data);

      const gatewayRes = await axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/gateway`);
      if (gatewayRes.data?.tournament?.court_count) {
        setLocalCourtCount(gatewayRes.data.tournament.court_count);
      }
    } catch (err) {
      console.error("Court Grid background refresh transaction failure:", err);
    }
  }, [tournamentId, setMatches]);

  useEffect(() => {
    if (tournamentId) {
      const deferFetchTask = setTimeout(() => {
        refreshMatches();
      }, 0);
      
      return () => clearTimeout(deferFetchTask);
    }
  }, [tournamentId, refreshMatches]);

  useEffect(() => {
    if (!tournamentId) return;

    const socketClient = io(SOCKET_URL);
    socketClient.emit('join-tournament-room', tournamentId);

    socketClient.on('score-live', () => { refreshMatches(); });
    socketClient.on('standings-refresh', () => { refreshMatches(); });
    socketClient.on('registration-updated', () => { refreshMatches(); });

    return () => {
      socketClient.emit('leave-tournament-room', tournamentId);
      socketClient.disconnect();
    };
  }, [tournamentId, refreshMatches]);

  const handleCourtClick = (match: Match, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.replay-audio-btn')) return;
    if (!isAdminView) return; 
    setSelectedMatch(match);
    setShowDefaultSubMenu(false);
  };

  const handleReplayAnnouncement = (match: Match) => {
    const currentMode = (localStorage.getItem('tournament_announcement_mode') as 'short' | 'detailed') || 'detailed';
    if (window.speakMatchAnnouncement) {
      window.speakMatchAnnouncement(
        match.team1?.team_name || "Unknown Team",
        match.team2?.team_name || "Unknown Team",
        match.court_id || 1,
        match.category?.name || "Tournament Division",
        currentMode
      );
    }
  };

  const handleCancelMatch = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!selectedMatch) return;

    triggerAlert({
      title: "Recall Active Match?",
      message: `This will stop the active match on Court 0${selectedMatch.court_id} and send both teams back to the pending queue list.\n\nAll current scores will be reset to 0. Are you sure you want to proceed?`,
      type: "warning",
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await axios.put(`${SOCKET_URL}/api/matches/${selectedMatch.id}/cancel`, {}, { withCredentials: true });
          setSelectedMatch(null);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 403) {
            triggerAlert({
              title: "Clearance Restriction",
              message: "Only the Tournament Director account holds authorization to cancel active match deployments.",
              type: "error"
            });
          } else {
            console.error("Cancellation script failure:", error);
            triggerAlert({
              title: "System Error",
              message: "An operational error occurred trying to recall the active match. Please double check backend connections.",
              type: "error"
            });
          }
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleDeclareDefault = async (absentTeamNumber: 1 | 2, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!selectedMatch) return;
    const absentTeamName = absentTeamNumber === 1 ? (selectedMatch.team1?.team_name || "Team 1") : (selectedMatch.team2?.team_name || "Team 2");
    const winningTeamName = absentTeamNumber === 1 ? (selectedMatch.team2?.team_name || "Team 2") : (selectedMatch.team1?.team_name || "Team 1");

    triggerAlert({
      title: "Lock Walkover Default?",
      message: `Absent Side: "${absentTeamName}"\n(Receives a Loss marker and -11 PTS penalty deduction)\n\nWinning Side: "${winningTeamName}"\n(Receives a Win marker, +1 match played, +0 score points)\n\nAre you sure you want to permanently lock this scorecard into tournament history records?`,
      type: "error",
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          await axios.put(`${SOCKET_URL}/api/matches/${selectedMatch.id}/default`, {
            absentTeamNum: absentTeamNumber
          }, { withCredentials: true });
          setSelectedMatch(null);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 403) {
            triggerAlert({
              title: "Clearance Restriction",
              message: "Only the Tournament Director account holds authorization to issue walkover default penalties.",
              type: "error"
            });
          } else {
            console.error("Walkover script processing breakdown:", error);
            triggerAlert({
              title: "System Error",
              message: "Failed to execute match default sequence due to server configuration database connectivity drops.",
              type: "error"
            });
          }
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  return (
    <div className="relative w-full">
      {/* 🚀 RESPONSIVE UPGRADE: Adjusted dynamic gap tracking from desktop to mobile screen scopes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {courts.map((num) => {
          const liveMatch = matches.find(m => m.court_id === num && m.status === 'LIVE');

          return (
            <div 
              key={num} 
              onClick={liveMatch ? (e) => handleCourtClick(liveMatch, e) : undefined}
              className={`relative p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                liveMatch 
                  ? 'bg-white border-brand-accent/80 shadow-lg shadow-purple-600/[0.15] dark:bg-slate-900 dark:border-brand-accent/80' 
                  : 'bg-white border-slate-200/60 shadow-sm shadow-slate-100/50 dark:bg-brand-dark/20 dark:border-white/5 dark:shadow-none'
              } ${liveMatch && isAdminView ? 'cursor-pointer hover:border-brand-accent group' : ''}`}
            >
              {liveMatch && isAdminView && (
                <div className="absolute inset-0 bg-brand-accent/[0.01] group-hover:bg-brand-accent/[0.03] rounded-2xl transition-colors duration-200 pointer-events-none flex items-center justify-center z-10">
                  <span className="opacity-0 group-hover:opacity-100 bg-slate-950/80 text-white font-mono font-bold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md transition-all shadow-md transform translate-y-1 group-hover:translate-y-0">
                    Manage Court ⚙️
                  </span>
                </div>
              )}

              <div className="flex justify-between items-start mb-4 sm:mb-6 gap-2 relative z-20">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black shrink-0 mt-0.5">Court 0{num}</span>
                  {liveMatch && isAdminView && (
                    <button
                      onClick={() => handleReplayAnnouncement(liveMatch)}
                      className="replay-audio-btn p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-brand-accent hover:border-brand-accent/30 dark:bg-slate-950 dark:border-white/5 dark:text-slate-500 dark:hover:text-white transition-all cursor-pointer shadow-3xs"
                      title="Replay Voice Callout"
                    >
                      <Volume2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {liveMatch && (
                  <div className="flex flex-col items-end gap-1.5 max-w-[70%] min-w-0">
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#088505]/10 text-[#088505] text-[10px] font-bold border border-[#088505]/20 dark:bg-[#088505]/15 dark:border-[#088505]/30 shrink-0">
                      <span className="h-1.5 w-1.5 bg-[#088505] rounded-full animate-pulse" />
                      LIVE
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right truncate w-full flex items-center justify-end gap-1">
                      <Layers className="h-2.5 w-2.5 text-brand-accent shrink-0" /> <span className="truncate">{liveMatch.category?.name || "General Category"}</span>
                    </span>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {liveMatch ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col relative py-1 w-full min-w-0"
                  >
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-100 px-3 sm:px-4 py-3 sm:py-4 rounded-xl dark:bg-black/20 dark:border-white/5 min-w-0 gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate flex-1">
                        {liveMatch.team1?.team_name || "Unknown Team"}
                      </span>
                      <motion.span 
                        key={liveMatch.team1_score}
                        initial={{ scale: 1.4, color: '#ef4444' }}
                        animate={{ scale: 1, color: '#7400d9' }} 
                        className="text-xl sm:text-2xl font-black min-w-[1.5rem] sm:min-w-[2rem] text-right shrink-0"
                      >
                        {liveMatch.team1_score}
                      </motion.span>
                    </div>

                    <div className="my-2 sm:my-3 block text-[12px] sm:text-[14px] font-mono font-black tracking-[0.25em] text-brand-accent/90 text-center pl-[0.25em]">
                      VS
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 border border-slate-100 px-3 sm:px-4 py-3 sm:py-4 rounded-xl dark:bg-black/20 dark:border-white/5 min-w-0 gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate flex-1">
                        {liveMatch.team2?.team_name || "Unknown Team"}
                      </span>
                      <motion.span 
                        key={liveMatch.team2_score}
                        initial={{ scale: 1.4, color: '#ef4444' }}
                        animate={{ scale: 1, color: '#7400d9' }} 
                        className="text-xl sm:text-2xl font-black min-w-[1.5rem] sm:min-w-[2rem] text-right shrink-0"
                      >
                        {liveMatch.team2_score}
                      </motion.span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-28 sm:h-36 flex items-center justify-center border border-dashed border-slate-200 rounded-xl dark:border-white/5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider font-mono">Available</span>
                  </div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* DISSOLVING MODAL DIALOG CONTAINER SCREEN OVERLAY */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMatch(null)} 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 z-[200]"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()} 
              className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-sm w-full font-sans dark:bg-slate-900 dark:border-white/10 text-slate-900 dark:text-white select-none my-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-brand-accent" />
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Court 0{selectedMatch.court_id} Control
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedMatch(null)}
                  disabled={isProcessing}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                >
                  <X className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="mb-6 text-center">
                <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5">Active Match Session</p>
                <p className="text-sm font-bold truncate px-2">
                  {selectedMatch.team1?.team_name || "Unknown Team"} <span className="text-brand-accent">vs</span> {selectedMatch.team2?.team_name || "Unknown Team"}
                </p>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase mt-1 truncate px-4">
                  {selectedMatch.category?.name || "General Division"}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!showDefaultSubMenu ? (
                  <motion.div 
                    key="main-hub"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-2.5"
                  >
                    <button
                      onClick={(e) => handleCancelMatch(e)}
                      disabled={isProcessing}
                      className="w-full bg-slate-100 border border-slate-200/60 hover:bg-slate-200 text-slate-800 font-bold font-mono py-3 rounded-xl text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer dark:bg-slate-800 dark:border-transparent dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Cancel Match (Recall Queue)
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDefaultSubMenu(true); }}
                      disabled={isProcessing}
                      className="w-full bg-rose-50 border border-rose-200/60 hover:bg-rose-500 hover:text-white text-rose-700 font-bold font-mono py-3 rounded-xl text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer dark:bg-rose-500/10 dark:border-transparent dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white disabled:opacity-40"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> Declare Match Default
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="absent-selector"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-3"
                  >
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-sans font-semibold mb-2 leading-relaxed text-center">
                      ⚠️ Select the **ABSENT** team below. They will receive an automatic loss marker and a **-11 PTS penalty deduction**.
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => handleDeclareDefault(1, e)}
                        disabled={isProcessing}
                        className="w-full text-left bg-slate-50 border border-slate-200 px-3 py-3 rounded-xl text-xs font-semibold hover:border-rose-400 dark:bg-slate-950 dark:border-white/5 truncate block cursor-pointer transition-colors disabled:opacity-40"
                      >
                        🚨 Team 1 Absent: <span className="text-rose-500 font-bold ml-1">{selectedMatch.team1?.team_name || "Unknown Team"}</span>
                      </button>
                      
                      <button
                        onClick={(e) => handleDeclareDefault(2, e)}
                        disabled={isProcessing}
                        className="w-full text-left bg-slate-50 border border-slate-200 px-3 py-3 rounded-xl text-xs font-semibold hover:border-rose-400 dark:bg-slate-950 dark:border-white/5 truncate block cursor-pointer transition-colors disabled:opacity-40"
                      >
                        🚨 Team 2 Absent: <span className="text-rose-500 font-bold ml-1">{selectedMatch.team2?.team_name || "Unknown Team"}</span>
                      </button>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDefaultSubMenu(false); }}
                      disabled={isProcessing}
                      className="text-[10px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-white tracking-widest uppercase block mx-auto pt-2 cursor-pointer transition-colors disabled:opacity-40"
                    >
                      ← Back
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};