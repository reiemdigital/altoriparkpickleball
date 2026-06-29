// client/src/components/AdminPanel.tsx
import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore.js';
import { SOCKET_URL } from '../socket';
import { 
  ShieldCheck, 
  UserCheck, 
  Smartphone, 
  Eye, 
  Layers, 
  Settings, 
  Activity,
  Loader2
} from 'lucide-react';
import { useAlertStore } from '../store/useAlertStore';

/** =======================================================
 * DATA MODEL INTERFACES FOR STRICT TYPE-CHECKING
 * ======================================================= */
interface StaffProfile {
  id: string;
  username: string;
  display_name: string;
  role: 'ADMIN' | 'STAFF';
}

interface CustomMatchExtension {
  id: string;
  status: string;
  court_id: number | null;
  team1_id: string;
  team2_id: string;
  team1?: { team_name: string };
  team2?: { team_name: string };
  category?: { name: string };
  referee_name?: string | null;
  refereeName?: string | null; // In-memory fallback
  pin_code?: string | null;
  pinCode?: string | null;     // In-memory fallback
}

declare global {
  interface Window {
    speakMatchAnnouncement?: (team1: string, team2: string, court: number, category: string, mode: 'short' | 'detailed') => void;
  }
}

const speakMatchAnnouncementInternal = (team1: string, team2: string, court: number, category: string, mode: 'short' | 'detailed') => {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const phraseText = mode === 'detailed'
    ? `Next Match, for ${category}. ${team1}, Versus, ${team2}. Please proceed to Court Number ${court}.`
    : `Next Match. ${team1} Versus ${team2}. Please proceed to Court Number ${court}.`;

  const utterance = new SpeechSynthesisUtterance(phraseText);
  
  const availableVoices = window.speechSynthesis.getVoices();
  const americanVoice = availableVoices.find(voice => 
    voice.lang === 'en-US' || voice.lang.includes('en_US') || voice.name.toLowerCase().includes('united states')
  );

  if (americanVoice) {
    utterance.voice = americanVoice;
  }

  utterance.rate = 0.85; 
  utterance.pitch = 1.0;
  
  window.speechSynthesis.speak(utterance);
};

window.speakMatchAnnouncement = speakMatchAnnouncementInternal;

export const AdminPanel = () => {
  const matches = useTournamentStore((state) => state.matches) as unknown as CustomMatchExtension[];
  const gatewayData = useTournamentStore((state) => state.gatewayData);
  const triggerAlert = useAlertStore((state) => state.triggerAlert);

  // 🛠️ DYNAMIC REF LIFECYCLE STATES
  const [staffReferees, setStaffReferees] = useState<StaffProfile[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState<boolean>(true);

  // Command Console Form Tracking States
  const [courtAssignments, setCourtAssignments] = useState<Record<string, number>>({});
  const [refereeAssignments, setRefereeAssignments] = useState<Record<string, string>>({});
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [announcementMode, setAnnouncementMode] = useState<'short' | 'detailed'>(() => {
    return (localStorage.getItem('tournament_announcement_mode') as 'short' | 'detailed') || 'detailed';
  });

  const totalVenueCourts = gatewayData?.tournament?.court_count || 4;

  // =========================================================================
  // 🛰️ DISPATCH LAYER: FETCH ACTIVE STAFF ACCOUNTS FROM DATABASE
  // =========================================================================
  useEffect(() => {
  const fetchStaffReferees = async () => {
    try {
      setIsStaffLoading(true);
      const response = await axios.get(`${SOCKET_URL}/api/admin/staff`);
      
      // 🛡️ DEFENSIVE GUARD: Ensure state is never polluted by string fallbacks or HTML pages
      if (response.data && Array.isArray(response.data)) {
        setStaffReferees(response.data);
      } else {
        console.warn("API resolved, but unexpected non-array format returned:", response.data);
        setStaffReferees([]);
      }
    } catch (error) {
      console.error("Failed to query runtime staff registers:", error);
      setStaffReferees([]);
    } finally {
      setIsStaffLoading(false);
    }
  };

  fetchStaffReferees();
}, []);

  const handleToggleAnnouncementMode = (mode: 'short' | 'detailed') => {
    setAnnouncementMode(mode);
    localStorage.setItem('tournament_announcement_mode', mode);
  };

  const currentlyLiveMatches = useMemo(() => {
    return matches.filter(m => m.status === 'LIVE');
  }, [matches]);

  const occupiedCourts = useMemo(() => {
    return new Set(currentlyLiveMatches.map(m => m.court_id).filter(Boolean) as number[]);
  }, [currentlyLiveMatches]);

  const occupiedReferees = useMemo(() => {
    return new Set(currentlyLiveMatches.map(m => m.referee_name || m.refereeName).filter(Boolean) as string[]);
  }, [currentlyLiveMatches]);

  const busyTeamIds = useMemo(() => {
    return new Set(currentlyLiveMatches.flatMap(m => [m.team1_id, m.team2_id]));
  }, [currentlyLiveMatches]);

  const processedPendingMatches = useMemo(() => {
    const pending = matches.filter((m) => m.status === 'PENDING');
    return [...pending].sort((a, b) => {
      const aBlocked = busyTeamIds.has(a.team1_id) || busyTeamIds.has(a.team2_id);
      const bBlocked = busyTeamIds.has(b.team1_id) || busyTeamIds.has(b.team2_id);
      if (aBlocked && !bBlocked) return 1;
      if (!aBlocked && bBlocked) return -1;
      return 0;
    });
  }, [matches, busyTeamIds]);

  const handleCourtChange = (matchId: string, courtId: number) => {
    setCourtAssignments((prev) => ({ ...prev, [matchId]: courtId }));
  };

  const handleRefereeChange = (matchId: string, refName: string) => {
    setRefereeAssignments((prev) => ({ ...prev, [matchId]: refName }));
  };

  const togglePinReveal = (matchId: string) => {
    setRevealedPins(prev => ({ ...prev, [matchId]: !prev[matchId] }));
  };

  const startMatch = async (matchId: string) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const availableCourts = Array.from({ length: totalVenueCourts }, (_, i) => i + 1).filter(c => !occupiedCourts.has(c));
    
    // Filter out dynamic referee instances matching current string fields
    const availableReferees = staffReferees.filter(r => !occupiedReferees.has(r.display_name));

    const assignedCourt = courtAssignments[matchId] || (availableCourts[0] || 1);
    
    // Resolves fallback fields based on live fetched database states cleanly
    const fallbackRefereeName = staffReferees[0]?.display_name || "Official Referee";
    const assignedReferee = refereeAssignments[matchId] || (availableReferees[0]?.display_name || fallbackRefereeName);

    const courtOccupiedMatch = currentlyLiveMatches.find(m => m.court_id === assignedCourt);
    if (courtOccupiedMatch) {
      triggerAlert({
        title: "Court Occupied",
        message: `Court 0${assignedCourt} is currently running an active match. Clear or finish that match first!`,
        type: "warning"
      });
      return;
    }

    const activeConflictMatch = currentlyLiveMatches.find(m => 
      m.team1_id === targetMatch.team1_id || 
      m.team2_id === targetMatch.team1_id || 
      m.team1_id === targetMatch.team2_id || 
      m.team2_id === targetMatch.team2_id
    );

    if (activeConflictMatch) {
      const busyTeamName = (activeConflictMatch.team1_id === targetMatch.team1_id || activeConflictMatch.team1_id === targetMatch.team2_id)
        ? (activeConflictMatch.team1?.team_name || "Unknown")
        : (activeConflictMatch.team2?.team_name || "Unknown");
      alert(`⚠️ Scheduling Collision: Team "${busyTeamName}" is currently playing an active match on Court 0${activeConflictMatch.court_id}!`);
      return;
    }

    try {
      await axios.put(`${SOCKET_URL}/api/matches/${matchId}/start`, {
        courtId: assignedCourt,
        refereeName: assignedReferee
      });

      speakMatchAnnouncementInternal(
        targetMatch.team1?.team_name || "Unknown Team",
        targetMatch.team2?.team_name || "Unknown Team",
        assignedCourt,
        targetMatch.category?.name || "Tournament Division",
        announcementMode
      );

    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Failed to deploy match.");
      } else {
        alert("An unexpected scheduling layout error occurred.");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left">
      
      {/* CONTROL CONSOLE SUB-HEADER META BLOCK */}
      <div className="flex items-center gap-2 px-1 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Activity className="h-4 w-4 text-purple-500 animate-pulse" />
        <span className="text-xs font-mono font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Live Arena Match Supervisor Console
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
        
        {/* VIEW BLOCK 1: ACTIVE LIVE ACCESS SECURITY PIN TOKENS */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm dark:border-none dark:bg-slate-900/20 transition-all flex flex-col h-full min-h-130">
          <h2 className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="h-4 w-4" /> Active Court Access Security Tokens
          </h2>

          {currentlyLiveMatches.length > 0 && (
            <div className="hidden md:flex flex-wrap items-center gap-3 mb-4 p-3 bg-slate-50 border border-slate-200/60 rounded-xl dark:bg-slate-950 dark:border-white/5 animate-in fade-in duration-200 shrink-0">
              <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Smartphone className="h-3 w-3 text-purple-500" /> Active Desktop Remotes:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentlyLiveMatches.map((m) => (
                  <Link 
                    key={m.id} 
                    to={`/referee/${m.id}`} 
                    className="bg-white border border-slate-200 text-slate-800 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg hover:border-[#64317C] dark:bg-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:border-purple-400 transition-colors shadow-3xs"
                  >
                    Court 0{m.court_id} ↗
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto max-h-110 pr-1">
            {currentlyLiveMatches.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic pt-2">No courts are currently running active match sessions.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentlyLiveMatches.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200/60 font-mono text-xs flex flex-col justify-between gap-2 shadow-sm dark:bg-slate-950 dark:text-white dark:border-white/5">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-1.5">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">COURT 0{m.court_id}</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 dark:text-slate-400 truncate max-w-[60%]">
                        <UserCheck className="h-3 w-3 shrink-0" /> <span className="truncate">{m.referee_name || m.refereeName || "Assigned Ref"}</span>
                      </span>
                    </div>
                    <div className="text-[11px] truncate text-slate-800 font-sans font-semibold dark:text-slate-200 flex flex-col gap-0.5">
                      <div className="truncate">{m.team1?.team_name || "Unknown Team"} <span className="text-purple-500">vs</span> {m.team2?.team_name || "Unknown Team"}</div>
                      <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{m.category?.name || "General Category"}</div>
                    </div>
                    <div className="mt-1 flex justify-between items-center bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:bg-black/40 dark:border-white/5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 flex items-center gap-1 dark:text-slate-400"><Smartphone className="h-3 w-3" /> Terminal PIN:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm tracking-widest text-emerald-600 dark:text-emerald-400">
                          {revealedPins[m.id] ? (m.pinCode || m.pin_code || "----") : "••••"}
                        </span>
                        <button onClick={() => togglePinReveal(m.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer" title="Reveal PIN">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* VIEW BLOCK 2: COMMAND SCHEDULER QUEUE PANEL */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm dark:border-none dark:bg-slate-900/20 transition-all flex flex-col h-full min-h-130">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 dark:border-white/5 pb-3 shrink-0">
            <h2 className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider font-mono">
              Director's Command Console
            </h2>
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl dark:bg-slate-950 border dark:border-white/5 shadow-inner">
              <span className="text-[9px] font-mono font-black text-slate-400 px-2 uppercase tracking-wide flex items-center gap-1"><Settings className="h-2.5 w-2.5 text-purple-500" /> Audio:</span>
              <button
                onClick={() => handleToggleAnnouncementMode('short')}
                className={`text-[9px] font-mono font-bold px-2 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${announcementMode === 'short' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                Simple
              </button>
              <button
                onClick={() => handleToggleAnnouncementMode('detailed')}
                className={`text-[9px] font-mono font-bold px-2 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${announcementMode === 'detailed' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                Detailed
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-105 pr-1">
            {isStaffLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 font-mono text-xs">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <span>Syncing Database Referees...</span>
              </div>
            ) : processedPendingMatches.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic pt-2">
                No pending matches available. All courts are deployed or finished!
              </p>
            ) : (
              <div className="space-y-3">
                {processedPendingMatches.map((match) => {
                  const availableReferees = staffReferees.filter(r => !occupiedReferees.has(r.display_name));
                  const availableCourts = Array.from({ length: totalVenueCourts }, (_, i) => i + 1).filter(c => !occupiedCourts.has(c));

                  const currentSelectedCourt = courtAssignments[match.id] || (availableCourts[0] || 1);
                  const fallbackRefereeName = staffReferees[0]?.display_name || "";
                  const currentSelectedReferee = refereeAssignments[match.id] || (availableReferees[0]?.display_name || fallbackRefereeName);
                  
                  const isTeam1Busy = busyTeamIds.has(match.team1_id);
                  const isTeam2Busy = busyTeamIds.has(match.team2_id);
                  const isBlocked = isTeam1Busy || isTeam2Busy;

                  const isResourceExhausted = availableCourts.length === 0 || staffReferees.length === 0 || availableReferees.length === 0;

                  return (
                    <div 
                      key={match.id} 
                      className={`flex flex-col lg:flex-row justify-between items-start lg:items-center p-4 rounded-xl border transition-all duration-300 gap-4 ${
                        isBlocked 
                          ? 'bg-slate-100/50 border-slate-200 opacity-50 dark:bg-slate-950/20 dark:border-white/5' 
                          : 'bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-white/5'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Match Queue</span>
                          {isBlocked && (
                            <span className="text-[8px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                              Teams on Court
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            <span className={isTeam1Busy ? "text-amber-600 dark:text-amber-400 underline decoration-dashed" : ""}>
                              {match.team1?.team_name || "Unknown Team"}
                            </span>
                            <span className="text-purple-500 font-bold mx-1.5">vs</span>
                            <span className={isTeam2Busy ? "text-amber-600 dark:text-amber-400 underline decoration-dashed" : ""}>
                              {match.team2?.team_name || "Unknown Team"}
                            </span>
                          </span>

                          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 select-all truncate">
                            <Layers className="h-3 w-3 text-purple-500 inline mr-1" /> {match.category?.name || "General Category"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end shrink-0">
                        
                        <select
                          value={currentSelectedReferee}
                          onChange={(e) => handleRefereeChange(match.id, e.target.value)}
                          disabled={isBlocked || staffReferees.length === 0 || availableReferees.length === 0}
                          className="bg-white text-slate-800 text-xs px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none dark:bg-slate-800 dark:text-white dark:border-white/10 disabled:opacity-50 text-left max-w-40 truncate"
                        >
                          {staffReferees.length === 0 ? (
                            <option value="" disabled>⚠️ No registered staff found</option>
                          ) : availableReferees.length === 0 ? (
                            <option value="" disabled>⚠️ All Refs Deployed</option>
                          ) : (
                            availableReferees.map((ref) => (
                              <option key={ref.id} value={ref.display_name}>{ref.display_name}</option>
                            ))
                          )}
                        </select>

                        <select 
                          value={currentSelectedCourt} 
                          onChange={(e) => handleCourtChange(match.id, Number(e.target.value))}
                          disabled={isBlocked || availableCourts.length === 0}
                          className="bg-white text-slate-800 text-xs px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-none dark:bg-slate-800 dark:text-white dark:border-white/10 disabled:opacity-50 text-left"
                        >
                          {availableCourts.length === 0 ? (
                            <option value={0} disabled>⚠️ All Courts Busy</option>
                          ) : (
                            availableCourts.map((num) => (
                              <option key={num} value={num}>Court 0{num}</option>
                            ))
                          )}
                        </select>

                        <button 
                          onClick={() => startMatch(match.id)}
                          disabled={isBlocked || isResourceExhausted}
                          className={`text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm ${
                            isBlocked || isResourceExhausted
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600 shadow-none'
                              : 'bg-purple-600 text-white hover:bg-opacity-90 active:scale-95 cursor-pointer'
                          }`}
                        >
                          Deploy
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};