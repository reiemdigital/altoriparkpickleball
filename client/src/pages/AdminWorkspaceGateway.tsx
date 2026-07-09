// client/src/pages/AdminWorkspaceGateway.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useTournamentStore } from '../store/useTournamentStore';
import { useAlertStore } from '../store/useAlertStore'; 
import { SOCKET_URL, socket } from '../socket';

// Sub-Component Layer Imports
import { CourtGrid } from '../components/CourtGrid';
import { AdminPanel } from '../components/AdminPanel';
import { RegistrationPortal } from '../components/RegistrationPortal';

// Icons
import { 
  Lock, Unlock, ShieldAlert, KeyRound, Users, Settings, 
  PlusCircle, Save, Trash2, Image, Eye, EyeOff, Loader2, Terminal
} from 'lucide-react';

type AdminTabType = 'registry' | 'console';

interface Tournament {
  id: string;
  title: string;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  start_date: string;
  end_date: string;
  venue_name: string;
  court_count: number;
  guidelines_url?: string | null;
  cover_url?: string | null;
}

export function AdminWorkspaceGateway() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [adminTab, setAdminTab] = useState<AdminTabType>('console');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => sessionStorage.getItem('altori_admin_auth') === 'true');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [assignedTournaments, setAssignedTournaments] = useState<Tournament[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const navigate = useNavigate();

  // 🚀 REFACTORED: Modern State Drivers for Interface Hardening & Input Utilities
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const addTournament = useTournamentStore((state) => state.addTournament);
  const updateTournamentInStore = useTournamentStore((state) => state.updateTournamentInStore);
  const deleteTournamentFromStore = useTournamentStore((state) => state.deleteTournamentFromStore);
  const triggerAlert = useAlertStore((state) => state.triggerAlert);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newCourtCount, setNewCourtCount] = useState(4);
  const [newGuidelinesUrl, setNewGuidelinesUrl] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState(''); 
  const [isCreating, setIsCreating] = useState(false);

  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCourtCount, setEditCourtCount] = useState(4);
  const [editStatus, setEditStatus] = useState<'UPCOMING' | 'LIVE' | 'FINISHED'>('UPCOMING');
  const [editGuidelinesUrl, setEditGuidelinesUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState(''); 
  const [isUpdating, setIsUpdating] = useState(false);

  const activeCachedRole = (sessionStorage.getItem('altori_admin_role') || 'STAFF').toUpperCase();

  const fetchAssignedData = useCallback(async () => {
    setLoadingAssigned(true);
    try {
      const response = await axios.get(`${SOCKET_URL}/api/admin/assigned-tournaments`);
      setAssignedTournaments(response.data);
    } catch (err) {
      console.error("Master switchboard compilation failure:", err);
    } finally {
      setLoadingAssigned(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !tournamentId) {
      const queueFetchTask = setTimeout(() => {
        fetchAssignedData();
      }, 0);

      return () => clearTimeout(queueFetchTask);
    }
  }, [isAuthenticated, tournamentId, fetchAssignedData]);

  useEffect(() => {
    if (tournamentId && isAuthenticated) {
      socket.emit('join-tournament-room', tournamentId);
    }
  }, [tournamentId, isAuthenticated]);

  const startEditingContext = (t: Tournament) => {
    setEditingTournament(t);
    setEditTitle(t.title || '');
    setEditVenue(t.venue_name || '');
    setEditStartDate(t.start_date ? t.start_date.split('T')[0] : '');
    setEditEndDate(t.end_date ? t.end_date.split('T')[0] : '');
    setEditCourtCount(t.court_count || 4);
    setEditStatus(t.status || 'UPCOMING');
    setEditGuidelinesUrl(t.guidelines_url || '');
    setEditCoverUrl(t.cover_url || ''); 
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newStartDate || !newEndDate || !newVenue) {
      alert("Please populate all required validation fields.");
      return;
    }
    setIsCreating(true);

    try {
      await addTournament({
        title: newTitle,
        venue_name: newVenue,
        start_date: newStartDate,
        end_date: newEndDate,
        court_count: newCourtCount,
        guidelines_url: newGuidelinesUrl || undefined,
        cover_url: newCoverUrl || undefined 
      });
      
      setShowCreateModal(false);
      setNewTitle(''); setNewVenue(''); setNewStartDate(''); setNewEndDate(''); setNewCourtCount(4); setNewGuidelinesUrl(''); setNewCoverUrl('');
      triggerAlert({ title: "Tournament Created", message: "New event shell built successfully.", type: "success" });
      fetchAssignedData();
    } catch {
      triggerAlert({ title: "Creation Failed", message: "Could not save tournament matrix context.", type: "error" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;
    setIsUpdating(true);

    try {
      await updateTournamentInStore(editingTournament.id, {
        title: editTitle,
        venue_name: editVenue,
        start_date: editStartDate,
        end_date: editEndDate,
        court_count: editCourtCount,
        status: editStatus,
        guidelines_url: editGuidelinesUrl || undefined,
        cover_url: editCoverUrl || undefined 
      });
      triggerAlert({ title: "Configuration Updated", message: "Tournament parameters saved and synced cleanly.", type: "success" });
      setEditingTournament(null);
      setEditCoverUrl('');
      fetchAssignedData();
    } catch {
      triggerAlert({ title: "Update Failed", message: "Failed to persist structural modifications.", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!editingTournament) return;
    
    const tokenVerification = window.confirm(
      "⚠️ DANGER ZONE WARNING:\nAre you absolutely sure you want to permanently delete this tournament event profile? This will immediately wipe out all linked categories, division metrics, brackets, match logs, and participant rosters. This action cannot be undone."
    );

    if (!tokenVerification) return;

    try {
      await deleteTournamentFromStore(editingTournament.id);
      triggerAlert({ title: "Event Scrubbed", message: "Tournament data profiles detached successfully.", type: "warning" });
      setEditingTournament(null);
      fetchAssignedData();
    } catch {
      triggerAlert({ title: "Deletion Refused", message: "Backend interface rejected target elimination sweep.", type: "error" });
    }
  };

  // 🚀 REFACTORED: Enhanced Secured Inbound Event Handler Pipeline
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return; // Prevent submission collision bugs

    // Enforce basic input cleanup routines prior to transit operations
    const cleanUser = loginUsername.trim();
    const cleanPass = loginPassword;

    if (!cleanUser || !cleanPass) return;

    try {
      setLoginError(false);
      setIsLoggingIn(true);

      const response = await axios.post(`${SOCKET_URL}/api/auth/login`, { 
        username: cleanUser, 
        password: cleanPass 
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        setLoginUsername('');
        setLoginPassword('');
        sessionStorage.setItem('altori_admin_auth', 'true');
        sessionStorage.setItem('altori_admin_role', response.data.role.toUpperCase());
        sessionStorage.setItem('altori_admin_token', response.data.token);
      }
    } catch (error) { 
      console.error("Authentication exception triggered:", error);
      setLoginError(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try { 
      await axios.post(`${SOCKET_URL}/api/auth/logout`); 
    } catch { 
      /* Ignore anomalies */ 
    } finally { 
      setIsAuthenticated(false);
      sessionStorage.removeItem('altori_admin_auth');
      sessionStorage.removeItem('altori_admin_role');
      sessionStorage.removeItem('altori_admin_token');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950 overflow-y-auto selection:bg-purple-500/30 selection:text-white">
        
        {/* Deep Ambient Grid Backdrops */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/10 rounded-full filter blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md p-6 sm:p-8 bg-slate-900/60 border border-slate-800/80 rounded-3xl shadow-2xl shadow-black/50 backdrop-blur-xl text-left select-none font-sans"
        >
          {/* Subtle Terminal Running Header Element */}
          <div className="absolute top-4 right-6 flex items-center gap-1.5 font-mono text-[9px] font-black tracking-widest text-slate-500 uppercase">
            <Terminal className="h-3 w-3 text-purple-400" /> v1.0
          </div>

          <div className="text-center mb-6 sm:mb-8">
            <div className="h-14 w-14 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 relative shadow-inner">
              <Lock className="h-6 w-6 text-purple-400" />
              <motion.div 
                animate={isLoggingIn ? { opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 border border-purple-500/30 rounded-2xl pointer-events-none" 
              />
            </div>
            <h3 className="text-base font-black text-white font-mono uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Admin Access Portal
            </h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Provide your login credentials to unlock the admin dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Staff Identity Code
              </label>
              <input 
                type="text" 
                value={loginUsername} 
                onChange={(e) => setLoginUsername(e.target.value)} 
                placeholder="Enter assignment handle" 
                required
                disabled={isLoggingIn}
                autoComplete="username"
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-40 font-medium transition-all" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Security Passcode
              </label>
              <div className="relative">
                <KeyRound className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  placeholder="••••••••••••" 
                  required
                  disabled={isLoggingIn}
                  autoComplete="current-password"
                  className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-40 font-mono tracking-widest transition-all" 
                />
                
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-30"
                  title={showPassword ? "Mask password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <AnimatePresence>
                {loginError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <span className="text-[10px] text-rose-400 font-bold mt-1 uppercase tracking-wide block bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg font-mono">
                      ❌ Authentication failure. Please Re-try logging in.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-bold font-mono py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md shadow-purple-600/20 hover:shadow-purple-500/30 flex items-center justify-center gap-2 min-h-[46px] cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-purple-200" />
                  Verifying Signatures...
                </>
              ) : (
                <>Login</>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (isAuthenticated && !tournamentId) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 text-left animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black font-mono uppercase tracking-tight text-slate-900 dark:text-white">
              Master Control Switchboard
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Logged in as: <span className="text-purple-600 dark:text-purple-400 font-bold font-mono text-[11px] bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded uppercase">{activeCachedRole}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
            {activeCachedRole === 'ADMIN' && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-mono font-bold bg-[#088505] text-white px-4 py-2.5 sm:py-2 rounded-xl hover:bg-opacity-90 transition-all shadow-2xs cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" /> New Tournament
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="w-full sm:w-auto text-xs font-mono font-black border border-rose-200 bg-rose-50 text-rose-600 px-4 py-2.5 sm:py-2 rounded-xl hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-500/20 dark:text-rose-400 cursor-pointer uppercase tracking-wider text-center"
            >
              Logout
            </button>
          </div>
        </div>

        {loadingAssigned ? (
          <div className="text-center py-12 font-mono text-xs text-purple-400 animate-pulse">
            ⌛ Fetching assigned tournament rosters via relational mapping lines...
          </div>
        ) : assignedTournaments.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl dark:border-white/10">
            <p className="text-sm text-slate-400 italic">No tournament contexts match your current access credentials right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedTournaments.map((t: Tournament) => (
              <div key={t.id} className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between gap-4 shadow-xs dark:bg-slate-900/40 dark:border-white/5">
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-mono font-bold rounded mb-2 uppercase tracking-wide ${
                      t.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      ● {t.status}
                    </span>
                    
                    {activeCachedRole === 'ADMIN' && (
                      <button
                        onClick={() => startEditingContext(t)}
                        className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        title="Configure Settings Matrix"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">{t.title}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">ID: {t.id}</p>
                </div>
                <button
                  onClick={() => navigate(`/admin/${t.id}`)}
                  className="w-full bg-slate-900 text-white font-mono font-bold text-xs py-3 sm:py-2.5 rounded-xl uppercase tracking-wider hover:bg-[#64317C] transition-all text-center cursor-pointer"
                >
                  Launch Control Console ➔
                </button>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white border border-slate-200 max-w-xl w-full rounded-2xl p-4 sm:p-6 space-y-5 dark:bg-slate-900 dark:border-white/5 animate-in scale-in duration-150 shadow-2xl my-auto">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">Initialize New Tournament</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Build a completely clean tournament registry mapping layout.</p>
              </div>

              <form onSubmit={handleCreateTournament} className="space-y-4 font-sans text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Event Title *</label>
                  <input type="text" placeholder="e.g., Mindanao Pickleball Smash" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Arena Venue Location *</label>
                  <input type="text" placeholder="e.g., Altori Park Court Center" value={newVenue} onChange={(e) => setNewVenue(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Start Date *</label>
                    <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">End Date *</label>
                    <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Allocated Courts Capacity</label>
                    <input type="number" min={1} max={24} value={newCourtCount} onChange={(e) => setNewCourtCount(Number(e.target.value))} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Guidelines URL Link</label>
                    <input type="url" placeholder="https://..." value={newGuidelinesUrl} onChange={(e) => setNewGuidelinesUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-white/5 pt-3">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Image className="h-3 w-3 text-emerald-500" /> Tournament Card Background Imagery URL</label>
                  <input type="url" placeholder="https://images.unsplash.com/photo-..." value={newCoverUrl} onChange={(e) => setNewCoverUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-xs text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5 font-mono text-xs font-bold">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isCreating} className="px-5 py-2 bg-[#088505] text-white rounded-xl hover:bg-opacity-90 transition-all cursor-pointer disabled:opacity-50">{isCreating ? "Deploying..." : "Create Event"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingTournament && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white border border-slate-200 max-w-2xl w-full rounded-2xl p-4 sm:p-6 space-y-5 dark:bg-slate-900 dark:border-white/5 animate-in scale-in duration-150 shadow-2xl text-left my-auto">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider flex items-center gap-1.5"><Settings className="h-4 w-4 text-purple-500" /> Event Configuration Matrix</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Modify parameters for: <span className="text-slate-700 dark:text-slate-200 font-bold">{editingTournament.title}</span></p>
                </div>
                <button onClick={() => setEditingTournament(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-mono cursor-pointer font-bold">✕</button>
              </div>

              <form onSubmit={handleUpdateTournament} className="space-y-4 font-sans text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Tournament Title Identity</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Venue Address</label>
                    <input type="text" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Operational Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'UPCOMING' | 'LIVE' | 'FINISHED')} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none">
                      <option value="UPCOMING">UPCOMING (Registry Open)</option>
                      <option value="LIVE">LIVE (Active Court Streams)</option>
                      <option value="FINISHED">FINISHED (Archived Record)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">Opening Start Date</label>
                    <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">Closing Concluding Date</label>
                    <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Allocated Courts</label>
                    <input type="number" min={1} max={24} value={editCourtCount} onChange={(e) => setEditCourtCount(Number(e.target.value))} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Guidelines URL Path</label>
                    <input type="url" value={editGuidelinesUrl} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-white/5 pt-3">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Image className="h-3 w-3 text-purple-400" /> Tournament Card Background Imagery URL</label>
                  <input type="url" placeholder="https://images.unsplash.com/photo-..." value={editCoverUrl} onChange={(e) => setEditCoverUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-xs text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                </div>

                <div className="p-3 border border-rose-200/60 bg-rose-50/40 rounded-xl dark:bg-rose-950/10 dark:border-rose-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400"><b className="text-rose-600 dark:text-rose-400">Danger Zone:</b> Wiping this structural node deletes brackets and all participant rosters.</div>
                  <button type="button" onClick={handleDeleteTournament} className="w-full sm:w-auto bg-rose-600 text-white font-mono font-bold px-3 py-2 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Scrub Record</button>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5 font-mono text-xs font-bold">
                  <button type="button" onClick={() => setEditingTournament(null)} className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isUpdating} className="px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-opacity-90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"><Save className="h-3.5 w-3.5" /> {isUpdating ? "Saving..." : "Save Settings"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 mt-4 animate-in fade-in duration-200 text-left">
      <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between dark:bg-emerald-500/10 dark:border-emerald-500/20">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
          <ShieldAlert className="h-4 w-4 shrink-0" /> Operator Mode Secured
        </div>
        <button onClick={handleLogout} className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer uppercase tracking-wider font-bold bg-transparent border-none text-left sm:text-right">LOGOUT</button>
      </div>
      
      <CourtGrid />

      {activeCachedRole === 'ADMIN' && (
        <div className="my-6 sm:my-8 flex justify-center w-full">
          <div className="w-full sm:w-auto bg-white border border-slate-200 p-1 rounded-2xl flex flex-row justify-center items-center gap-1 shadow-sm dark:bg-slate-900/40 dark:border-white/5">
            <button onClick={() => setAdminTab('registry')} className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'registry' ? 'bg-purple-50 text-[#64317C] dark:bg-purple-500/10 dark:text-purple-400 shadow-sm' : 'text-slate-500'}`}><Users className="h-4 w-4 shrink-0" /> Roster & Pools</button>
            <button onClick={() => setAdminTab('console')} className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'console' ? 'bg-purple-50 text-[#64317C] dark:bg-purple-500/10 dark:text-purple-400 shadow-sm' : 'text-slate-500'}`}><Unlock className="h-4 w-4 shrink-0" /> Director's Console</button>
          </div>
        </div>
      )}

      {adminTab === 'registry' && activeCachedRole === 'ADMIN' ? <RegistrationPortal /> : <AdminPanel />}
    </div>
  );
}