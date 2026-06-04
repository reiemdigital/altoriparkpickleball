// client/src/pages/AdminWorkspaceGateway.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  PlusCircle, Save, Trash2, Image 
} from 'lucide-react';

/** =======================================================
 * DATA MODEL & LOCAL TYPES FOR STRICT TYPE-CHECKING
 * ======================================================= */
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

/** =======================================================
 * ADMIN WORKSPACE GATEWAY MANAGER PANEL (Authenticated)
 * ======================================================= */
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

  const activeCachedRole = sessionStorage.getItem('altori_admin_role') || 'Staff';

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginError(false);
      const response = await axios.post(`${SOCKET_URL}/api/auth/login`, { username: loginUsername, password: loginPassword });
      if (response.data.success) {
        setIsAuthenticated(true);
        setLoginPassword('');
        sessionStorage.setItem('altori_admin_auth', 'true');
        sessionStorage.setItem('altori_admin_role', response.data.role);
        sessionStorage.setItem('altori_admin_token', response.data.token);
      }
    } catch { 
      setLoginError(true);
    }
  };

  const handleLogout = async () => {
    try { 
      await axios.post(`${SOCKET_URL}/api/auth/logout`); 
    } catch { 
      /* Ignore logout anomalies */ 
    } finally { 
      setIsAuthenticated(false);
      sessionStorage.removeItem('altori_admin_auth');
      sessionStorage.removeItem('altori_admin_role');
      sessionStorage.removeItem('altori_admin_token');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white border border-slate-200 rounded-3xl shadow-sm dark:bg-slate-900/40 dark:border-white/5 mt-12 text-left animate-in fade-in duration-200 font-sans">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 dark:bg-purple-500/10"><Lock className="h-6 w-6 text-[#64317C]" /></div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">Secure Terminal Access</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Enter validation tokens to activate administrative operations.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Staff Account Username</label>
            <div className="relative">
              <input 
                type="text" 
                value={loginUsername} 
                onChange={(e) => setLoginUsername(e.target.value)} 
                placeholder="e.g. Admin" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" 
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Security Passcode</label>
            <div className="relative">
              <KeyRound className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter authorization key" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
            </div>
            {loginError && <span className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wide">Invalid credentials. Access denied.</span>}
          </div>
          <button type="submit" className="w-full mt-2 bg-[#64317C] text-white font-bold font-mono py-3.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer">Unlock Console</button>
        </form>
      </div>
    );
  }

  if (isAuthenticated && !tournamentId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 text-left animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-black font-mono uppercase tracking-tight text-slate-900 dark:text-white">
              Master Control Switchboard
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Logged in as: <span className="text-purple-600 dark:text-purple-400 font-bold font-mono text-[11px] bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded uppercase">{activeCachedRole}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {activeCachedRole === 'Admin' && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-mono font-bold bg-[#088505] text-white px-4 py-2 rounded-xl hover:bg-opacity-90 transition-all shadow-2xs cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" /> New Tournament
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="flex-1 sm:flex-initial text-xs font-mono font-black border border-rose-200 bg-rose-50 text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-500/20 dark:text-rose-400 cursor-pointer uppercase tracking-wider text-center"
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
              <div key={t.id} className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between gap-4 shadow-xs dark:bg-slate-900/40 dark:border-white/5">
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-mono font-bold rounded mb-2 uppercase tracking-wide ${
                      t.status === 'LIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      ● {t.status}
                    </span>
                    
                    {activeCachedRole === 'Admin' && (
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
                  className="w-full bg-slate-900 text-white font-mono font-bold text-xs py-2.5 rounded-xl uppercase tracking-wider hover:bg-[#64317C] transition-all text-center cursor-pointer"
                >
                  Launch Control Console ➔
                </button>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 max-w-xl w-full rounded-2xl p-6 space-y-5 dark:bg-slate-900 dark:border-white/5 animate-in scale-in duration-150 shadow-2xl">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Start Date *</label>
                    <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">End Date *</label>
                    <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                  <input type="url" placeholder="https://images.unsplash.com/photo-..." value={newCoverUrl} onChange={(e) => setNewCoverUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-xs text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 max-w-2xl w-full rounded-2xl p-6 space-y-5 dark:bg-slate-900 dark:border-white/5 animate-in scale-in duration-150 shadow-2xl text-left">
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
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">Opening Start Date</label>
                    <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase">Closing Concluding Date</label>
                    <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total Allocated Courts</label>
                    <input type="number" min={1} max={24} value={editCourtCount} onChange={(e) => setEditCourtCount(Number(e.target.value))} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Guidelines URL Path</label>
                    <input type="url" value={editGuidelinesUrl} onChange={(e) => setEditGuidelinesUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-white/5 pt-3">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Image className="h-3 w-3 text-purple-400" /> Tournament Card Background Imagery URL</label>
                  <input type="url" placeholder="https://images.unsplash.com/photo-..." value={editCoverUrl} onChange={(e) => setEditCoverUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-xs text-slate-800 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700" />
                </div>

                <div className="p-3 border border-rose-200/60 bg-rose-50/40 rounded-xl dark:bg-rose-950/10 dark:border-rose-500/10 flex items-center justify-between gap-4">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400"><b className="text-rose-600 dark:text-rose-400">Danger Zone:</b> Wiping this structural node deletes brackets and all participant rosters.</div>
                  <button type="button" onClick={handleDeleteTournament} className="bg-rose-600 text-white font-mono font-bold px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer shrink-0 flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Scrub Record</button>
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
    <div className="max-w-6xl mx-auto space-y-6 mt-4 animate-in fade-in duration-200 text-left">
      <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between dark:bg-emerald-500/10 dark:border-emerald-500/20">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
          <ShieldAlert className="h-4 w-4" /> Operator Mode Secured
        </div>
        <button onClick={handleLogout} className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer uppercase tracking-wider font-bold bg-transparent border-none">LOGOUT</button>
      </div>
      
      <CourtGrid />

      <div className="my-8 flex justify-center">
        <div className="bg-white border border-slate-200 p-1 rounded-2xl flex flex-wrap justify-center items-center gap-1 shadow-sm dark:bg-slate-900/40 dark:border-white/5">
          <button onClick={() => setAdminTab('registry')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'registry' ? 'bg-purple-50 text-[#64317C] dark:bg-purple-500/10 dark:text-purple-400 shadow-sm' : 'text-slate-500'}`}><Users className="h-4 w-4" /> Roster & Pools</button>
          <button onClick={() => setAdminTab('console')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${adminTab === 'console' ? 'bg-purple-50 text-[#64317C] dark:bg-purple-500/10 dark:text-purple-400 shadow-sm' : 'text-slate-500'}`}><Unlock className="h-4 w-4" /> Director's Console</button>
        </div>
      </div>

      {adminTab === 'registry' ? <RegistrationPortal /> : <AdminPanel />}
    </div>
  );
}