// client/src/pages/TournamentGateway.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useTournamentStore } from '../store/useTournamentStore';
import { SOCKET_URL, socket } from '../socket';
import { supabaseStorage } from '../config/supabaseClient';
import { 
  Calendar, MapPin, Layers, ArrowRight, ExternalLink, 
  Settings, Check, Loader2, Plus, Trash2, X, Upload, FileImage,
  Trophy, ChevronRight, Phone, ShieldCheck, UserPlus 
} from 'lucide-react';

/** =======================================================
 * STRICT STRUCTURAL DATA CONTRACT TYPE DEFINITIONS
 * ======================================================= */
interface Category {
  category_id: string;
  tournament_id: string;
  category_name: string;
  gender_division?: string | null; // 🛡️ Widened to string/null to comfortably absorb raw database rows
  category_type: string;           // 🏓 Aligned with string to perfectly match useTournamentStore contract
  entry_fee: string | number;
  max_slots: number;
  prize_first: string | number;
  prize_second: string | number;
  prize_third: string | number;
  registered_teams_count?: number;
  available_slots_remaining?: number;
}

/** =======================================================
 * PREMIUM BRANDED TOURNAMENT GATEWAY PAGE (/tournament/:id)
 * ======================================================= */
export function TournamentGateway() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { gatewayData, setGatewayData } = useTournamentStore();
  const [loading, setLoading] = useState(true);
  
  // 🛠️ ADMIN & MODAL MATRIX STATE HANDLERS
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false); // 🌟 Dynamic Public Entry Modal Switcher

  // 📝 ADMINISTRATIVE NEW DIVISION FORM HOOK VARIABLES
  const [newCatName, setNewCatName] = useState('');
  const [newGenderDiv, setNewGenderDiv] = useState<'Mixed' | 'Male' | 'Female'>('Mixed');
  const [newCategoryType, setNewCategoryType] = useState<'Singles' | 'Doubles'>('Doubles');
  const [newEntryFee, setNewEntryFee] = useState('0');
  const [newMaxSlots, setNewMaxSlots] = useState('16');
  const [newPrize1st, setNewPrize1st] = useState('0');
  const [newPrize2nd, setNewPrize2nd] = useState('0');
  const [newPrize3rd, setNewPrize3rd] = useState('0');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // 📥 PUBLIC REGISTER SYSTEM HOOK VARIABLES
  const [pubCategory, setPubCategory] = useState('');
  const [pubTeamName, setPubTeamName] = useState('');
  const [pubPlayer1Name, setPubPlayer1Name] = useState('');
  const [pubPlayer2Name, setPubPlayer2Name] = useState('');
  const [pubContactNo, setPubContactNo] = useState('');
  const [pubAddress, setPubAddress] = useState('');
  const [pubEmail, setPubEmail] = useState('');
  const [pubFile, setPubFile] = useState<File | null>(null);
  const [pubFormSubmitting, setPubFormSubmitting] = useState(false);

  // Unified data re-fetch action to clear race conditions
  const fetchGatewayInfo = React.useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/gateway`, { withCredentials: true });
      setGatewayData(res.data);
    } catch (err) {
      console.error("Gateway data compilation handshake error:", err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, setGatewayData]);

  useEffect(() => {
    if (!tournamentId) return;
    
    fetchGatewayInfo();
    
    // Join isolated socket stream channel
    socket.emit('join-tournament-room', tournamentId);

    // 📡 TELEMETRY ENGINE: Listen for live participant additions or parameter updates
    socket.on('registration-updated', () => {
      fetchGatewayInfo();
    });
    
    socket.on('tournament-metadata-updated', () => {
      fetchGatewayInfo();
    });

    return () => {
      socket.emit('leave-tournament-room', tournamentId);
      socket.off('registration-updated');
      socket.off('tournament-metadata-updated');
    };
  }, [tournamentId, fetchGatewayInfo]);

  // 🔥 Type casting data layers directly to eliminate structural friction
  const tournament = gatewayData.tournament;
  const stats = gatewayData.stats;
  const isAdmin = gatewayData.isAdmin;
  const categories = (gatewayData.categories || []) as Category[];

  // Avoid calling setState synchronously within an effect by using macro-task scheduling
  useEffect(() => {
    if (categories && categories.length > 0 && !pubCategory) {
      const deferTask = setTimeout(() => {
        setPubCategory(categories[0].category_name);
      }, 0);
      return () => clearTimeout(deferTask);
    }
  }, [categories, pubCategory]);

  // TYPE-SAFE DYNAMIC FORMAT DETECTOR
  const selectedPubCatObj = useMemo(() => {
    return categories.find((c: Category) => c.category_name === pubCategory);
  }, [categories, pubCategory]);

  const isPubSingles = useMemo(() => {
    return selectedPubCatObj?.category_type === 'Singles';
  }, [selectedPubCatObj]);

  // Async slot alteration handler
  const handleUpdateMaxSlots = async (categoryId: string, newSlotsValue: string) => {
    const parsedSlots = parseInt(newSlotsValue, 10);
    if (isNaN(parsedSlots) || parsedSlots <= 0) return;

    setUpdatingId(categoryId);
    try {
      await axios.put(`${SOCKET_URL}/api/config/category-settings`, {
        tournamentId,
        categoryId,
        maxSlots: parsedSlots
      }, { withCredentials: true });
      
      await fetchGatewayInfo();
    } catch (err) {
      console.error("Failed to persist modified slot thresholds:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Submit request handler for creating new categories (Admin)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setFormSubmitting(true);

    try {
      await axios.post(`${SOCKET_URL}/api/tournaments/${tournamentId}/categories`, {
        category_name: newCatName,
        gender_division: newGenderDiv,
        category_type: newCategoryType, 
        entry_fee: newEntryFee,
        max_slots: newMaxSlots,
        prize_first: newPrize1st,
        prize_second: newPrize2nd,
        prize_third: newPrize3rd
      }, { withCredentials: true });

      setNewCatName('');
      setNewGenderDiv('Mixed');
      setNewCategoryType('Doubles');
      setNewEntryFee('0');
      setNewMaxSlots('16');
      setNewPrize1st('0');
      setNewPrize2nd('0');
      setNewPrize3rd('0');
      setShowAddModal(false);
      await fetchGatewayInfo();
    } catch (err) {
      console.error("Division insertion failure:", err);
      alert("Failed to create the new division bracket settings.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Clean execution call to delete target structural categories safely
  const handleDeleteCategory = async (categoryId: string, name: string) => {
    const confirmation = window.confirm(`Are you absolutely sure you want to delete the "${name}" division?\nThis action cannot be undone.`);
    if (!confirmation) return;

    try {
      await axios.delete(`${SOCKET_URL}/api/categories/${categoryId}`, { withCredentials: true });
      await fetchGatewayInfo();
    } catch (err) {
      let serverErrorMessage = "Failed to drop the division bracket.";
      if (axios.isAxiosError(err)) {
        serverErrorMessage = err.response?.data?.error || serverErrorMessage;
      }
      alert(serverErrorMessage);
    }
  };

  // 🚀 PUBLIC SELF-REGISTRATION WORKFLOW WITH DIRECT STORAGE UPLOADING
  const handlePublicRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId || !selectedPubCatObj) {
      alert("Error: Missing tournament identification values.");
      return;
    }

    if (!pubFile) {
      alert("Please upload a copy of your payment receipt to secure your spot.");
      return;
    }

    setPubFormSubmitting(true);
    let publicReceiptUrl: string;

    try {
      const fileExtension = pubFile.name.split('.').pop() || 'png';
      const cleanFileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;
      const bucketDestinationPath = `receipts/${cleanFileName}`;

      const { error: uploadError } = await supabaseStorage.storage
        .from('payment-proofs')
        .upload(bucketDestinationPath, pubFile);

      if (uploadError) throw uploadError;

      const { data: spatialUrlObject } = supabaseStorage.storage
        .from('payment-proofs')
        .getPublicUrl(bucketDestinationPath);

      publicReceiptUrl = spatialUrlObject.publicUrl;

      await axios.post(`${SOCKET_URL}/api/teams/register`, {
        tournamentId,
        categoryId: selectedPubCatObj.category_id,
        category: pubCategory,
        teamName: isPubSingles ? pubPlayer1Name : pubTeamName,
        player1Name: pubPlayer1Name,
        player2Name: isPubSingles ? '' : pubPlayer2Name,
        contactNo: pubContactNo,
        address: pubAddress,
        email: pubEmail,
        paymentProofUrl: publicReceiptUrl 
      });

      alert("Registration submitted! Your spot is held provisionally until our team reviews your payment receipt.");
      
      setPubTeamName('');
      setPubPlayer1Name('');
      setPubPlayer2Name('');
      setPubContactNo('');
      setPubAddress('');
      setPubEmail('');
      setPubFile(null);
      
      setShowRegisterModal(false); // 🛡️ Dismiss overlay cleanly upon successful ledger commit
      await fetchGatewayInfo();

    } catch (error) {
      console.error("Public onboarding pipeline error:", error);
      let runtimeMessage = "Failed to submit your registration record.";
      if (axios.isAxiosError(error)) {
        runtimeMessage = error.response?.data?.error || runtimeMessage;
      }
      alert(runtimeMessage);
    } finally {
      setPubFormSubmitting(false);
    }
  };

  if (loading || !tournament) {
    return (
      <div className="min-h-100 flex items-center justify-center font-mono text-xs text-[#64317C]">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> ⌛ Getting court rosters and bracket details...
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 w-full flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      
      {/* HERO BANNER BLOCK */}
      <section className="relative overflow-hidden py-16 lg:py-24 bg-linear-to-b from-slate-100 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-900 w-full transition-colors duration-200">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-125 h-75 bg-[#64317C]/5 dark:bg-[#64317C]/15 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left relative z-10">
          <div className="lg:col-span-8 space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-mono font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
              🏆 Tournament Central
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase font-sans leading-none text-slate-900 dark:text-white">
              {tournament?.title}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-slate-600 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#088505]" /> {tournament?.start_date} to {tournament?.end_date}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#64317C]" /> {tournament?.venue_name}</span>
              <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-purple-500 dark:text-purple-400" /> {tournament?.court_count} Active Courts</span>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-end w-full">
            <button 
              onClick={() => navigate(`/tournament/${tournamentId}/live`)} 
              className="bg-[#088505] hover:bg-opacity-95 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl transition-all shadow-lg shadow-[#088505]/20 flex items-center gap-2 group cursor-pointer w-full lg:w-auto justify-center"
            >
              Enter Live Arena Hub <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* VALUE PROPERTY GRID */}
      <section className="max-w-6xl mx-auto px-4 py-12 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl text-left shadow-xs transition-colors duration-200">
          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Live Matches</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            {stats.liveMatchesCount} Running
            {stats.liveMatchesCount > 0 && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Matches currently unfolding out on the courts right now.</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl text-left shadow-xs transition-colors duration-200">
          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Players & Teams</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.registeredPlayersCount} Entrants</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Teams officially registered and ready to play.</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl text-left shadow-xs transition-colors duration-200">
          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tournament Status</div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 uppercase font-mono tracking-tight">{tournament?.status}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">The current stage of this tournament timeline.</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl text-left shadow-xs transition-colors duration-200">
          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tournament Style</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">Dual-Stage</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Hard Play in Round-Robin and leading into single-elimination brackets.</p>
        </div>
      </section>

      {/* CATEGORY MATRICES DATA MATRICES LEDGER */}
      <section className="max-w-6xl mx-auto px-4 pb-12 w-full text-left">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 flex justify-between items-end gap-4 transition-colors duration-200">
          <div>
            <h3 className="text-base font-black font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200">Tournament Divisions & Brackets</h3>
            <p className="text-xs text-slate-500 mt-0.5">Check out the active brackets, open entry slots, and cash prize breakdowns.</p>
          </div>
          <div className="flex items-center gap-2">
            
            {/* SECURITY LAYER: Admin tools for Create and Edit switches */}
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-xs font-mono font-bold px-3 py-1.5 bg-[#088505] text-white rounded-lg hover:bg-opacity-90 flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Division
                </button>
                <button
                  onClick={() => setIsAdminMode(!isAdminMode)}
                  className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isAdminMode 
                      ? 'bg-purple-600 text-white border-purple-600 dark:bg-purple-500/20 dark:border-purple-500/50 dark:text-purple-300' 
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Settings className={`h-3.5 w-3.5 ${isAdminMode ? 'animate-spin' : ''}`} />
                  {isAdminMode ? 'Exit Admin Mode' : 'Manage Slots'}
                </button>
              </>
            )}

            {tournament?.guidelines_url && (
              <a href={tournament.guidelines_url} target="_blank" rel="noreferrer" className="text-xs font-mono font-bold text-[#088505] hover:underline flex items-center gap-1 pl-2">
                Guidelines Rules PDF <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat: Category) => {
            const maxSlots = cat.max_slots || 16;
            const filledSlots = cat.registered_teams_count || 0;
            const fillPercentage = Math.min(100, (filledSlots / maxSlots) * 100);

            let progressBarColor = "bg-[#088505]"; 
            if (fillPercentage >= 100) {
              progressBarColor = "bg-purple-600 dark:bg-purple-500"; 
            } else if (fillPercentage >= 80) {
              progressBarColor = "bg-amber-500 animate-pulse"; 
            }

            return (
              <div key={cat.category_id} className="p-5 bg-white border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl flex flex-col justify-between gap-4 shadow-xs transition-all duration-200">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{cat.category_name}</h4>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-mono text-[9px] rounded uppercase">Division: {cat.gender_division || 'Mixed'}</span>
                        <span className="px-2 py-0.5 bg-purple-50 border border-purple-100 text-purple-600 dark:bg-purple-950/40 dark:border-purple-900/30 dark:text-purple-400 font-mono text-[9px] rounded uppercase">Type: {cat.category_type || 'Doubles'}</span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Entry Fee: <span className="text-slate-800 dark:text-slate-300 font-bold">₱{cat.entry_fee || '0.00'}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Contextual Delete Button */}
                      {isAdmin && isAdminMode && (
                        <button
                          onClick={() => handleDeleteCategory(cat.category_id, cat.category_name)}
                          className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-md hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Delete Division Bracket"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                        fillPercentage >= 100 
                          ? 'bg-purple-50 border border-purple-100 text-purple-600 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-400' 
                          : fillPercentage >= 80 
                            ? 'bg-amber-50 border border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400' 
                            : 'bg-[#088505]/5 border border-[#088505]/20 text-[#088505] dark:bg-[#088505]/10 dark:border-[#088505]/30 dark:text-emerald-400'
                      }`}>
                        {fillPercentage >= 100 ? '🔒 FULL' : `🔥 ${cat.available_slots_remaining} LEFT`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ease-out ${progressBarColor}`}
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span>Registration Fill Rate</span>
                      <span>{filledSlots} / {maxSlots} Teams</span>
                    </div>
                  </div>
                </div>

                {/* INLINE CAPACITY CONFIGURATION PANEL */}
                {isAdmin && isAdminMode && (
                  <div className="p-3 bg-slate-50 border border-slate-200 dark:bg-slate-950/60 dark:border-slate-800/80 rounded-lg flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-150">
                    <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Set Team Limit:</span>
                    <div className="flex items-center gap-1.5 relative">
                      <input 
                        type="number"
                        min={filledSlots || 1}
                        defaultValue={maxSlots}
                        disabled={updatingId === cat.category_id}
                        onBlur={(e) => handleUpdateMaxSlots(cat.category_id, e.target.value)}
                        className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center font-mono text-xs text-slate-900 focus:outline-hidden focus:border-purple-500 disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                      />
                      <div className="h-5 w-5 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        {updatingId === cat.category_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 opacity-60" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-center text-[11px] font-mono">
                  <div className="bg-amber-500/[0.04] border border-amber-500/20 rounded-lg p-2 dark:bg-amber-500/5 dark:border-amber-500/10">
                    <div className="text-amber-600 dark:text-amber-400 font-bold">🥇 Champion</div>
                    <div className="text-slate-800 dark:text-slate-200 font-black mt-0.5">₱{cat.prize_first || '0.00'}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 dark:bg-slate-300/5 dark:border-slate-300/10">
                    <div className="text-slate-600 dark:text-slate-300 font-bold">🥈 2nd Place</div>
                    <div className="text-slate-800 dark:text-slate-200 font-black mt-0.5">₱{cat.prize_second || '0.00'}</div>
                  </div>
                  <div className="bg-amber-700/[0.04] border border-amber-700/20 rounded-lg p-2 dark:bg-amber-700/5 dark:border-amber-700/10">
                    <div className="text-amber-700 dark:text-amber-600 font-bold">🥉 3rd Place</div>
                    <div className="text-slate-800 dark:text-slate-200 font-black mt-0.5">₱{cat.prize_third || '0.00'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
 * 🚀 CTA MODULE ANCHOR BOX
 * ========================================================================= */}
{!isAdmin && tournament?.status === 'UPCOMING' && categories.length > 0 && (
  <section className="max-w-6xl mx-auto px-4 pb-16 w-full text-left animate-in fade-in duration-300">
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-50 via-slate-50 to-white border border-slate-200 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/50 dark:border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xs dark:shadow-xl transition-all duration-200">
      <div className="space-y-2 max-w-xl">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-black tracking-wider uppercase bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400">
          ⚡ Secure Your Slot
        </span>
        <h3 className="text-xl sm:text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tight">
          Ready to take your game to the court?
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Registration is currently open for active divisions. Tap the button to fill out your player profile details, submit your entry slip, and claim your seed allocation.
        </p>
      </div>
      
      <button
        onClick={() => setShowRegisterModal(true)}
        className="w-full md:w-auto shrink-0 bg-[#088505] hover:bg-opacity-95 text-white font-black font-mono text-xs uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg shadow-[#088505]/20 flex items-center justify-center gap-2 transition-all cursor-pointer group hover:-translate-y-0.5"
      >
        <UserPlus className="h-4 w-4 text-white group-hover:scale-110 transition-transform" /> 
        Register For This Tournament
      </button>
    </div>
  </section>
)}

      {/* =========================================================================
       * 💻 & 📱 DUAL-THEME HIGH-DENSITY RESPONSIVE FOOTER COMPONENT
       * ========================================================================= */}
      <footer className="mt-auto pt-16 border-t border-slate-200 dark:border-slate-800 text-left bg-white dark:bg-slate-950 w-full transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 pb-12 border-b border-slate-200 dark:border-slate-800">
            
            {/* BLOCK 1: DEPLOYMENT STACK LOGO BRIEF BRANDING LAYOUT */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#64317C] dark:text-purple-400" />
                <span className="font-mono font-black uppercase text-xs tracking-wider text-slate-900 dark:text-white">
                  Altori Park Hub System
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed max-w-sm">
                Next-generation modular bracket management system and tournament tracking network, streamlining public entry processing and live bracket telemetry updates.
              </p>
            </div>

            {/* BLOCK 2: TOURNAMENT UTILITY DIRECTORY CHANNELS */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-mono font-black uppercase text-[10px] tracking-widest text-slate-400 dark:text-slate-500">
                Ecosystem Hub
              </h4>
              <ul className="flex flex-col gap-2.5 font-mono text-xs font-bold uppercase tracking-wide">
                <li>
                  <Link to="/about" className="text-slate-600 hover:text-[#088505] dark:text-slate-400 dark:hover:text-purple-400 inline-flex items-center gap-1 transition-colors">
                    <ChevronRight className="h-3 w-3 opacity-50" /> About Arena
                  </Link>
                </li>
                <li>
                  <Link to="/tournaments" className="text-slate-600 hover:text-[#088505] dark:text-slate-400 dark:hover:text-purple-400 inline-flex items-center gap-1 transition-colors">
                    <ChevronRight className="h-3 w-3 opacity-50" /> Tournaments List
                  </Link>
                </li>
                <li>
                  <Link to="/schedule" className="text-slate-600 hover:text-[#088505] dark:text-slate-400 dark:hover:text-purple-400 inline-flex items-center gap-1 transition-colors">
                    <ChevronRight className="h-3 w-3 opacity-50" /> Court Schedules
                  </Link>
                </li>
              </ul>
            </div>

            {/* BLOCK 3: SUPPORT LEGAL DIRECTORY INDEX */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="font-mono font-black uppercase text-[10px] tracking-widest text-slate-400 dark:text-slate-500">
                Legal Base
              </h4>
              <ul className="flex flex-col gap-2.5 font-mono text-xs font-bold uppercase tracking-wide">
                <li>
                  <Link to="/privacy" className="text-slate-600 hover:text-[#64317C] dark:text-slate-400 dark:hover:text-purple-400 inline-flex items-center gap-1 transition-colors">
                    <ChevronRight className="h-3 w-3 opacity-50" /> Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-slate-600 hover:text-[#64317C] dark:text-slate-400 dark:hover:text-purple-400 inline-flex items-center gap-1 transition-colors">
                    <ChevronRight className="h-3 w-3 opacity-50" /> Terms & Rules
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="text-slate-600 hover:text-[#64317C] dark:text-slate-400 dark:hover:text-purple-400 inline-flex items-center gap-1 transition-colors">
                    <ChevronRight className="h-3 w-3 opacity-50" /> Cookie Maps
                  </Link>
                </li>
              </ul>
            </div>

            {/* BLOCK 4: REGIONAL GEO-COORDINATION ADAPTER LAYER */}
            <div className="lg:col-span-3 space-y-3 text-slate-600 dark:text-slate-400 text-xs">
              <h4 className="font-mono font-black uppercase text-[10px] tracking-widest text-slate-400 dark:text-slate-500">
                Venue Location
              </h4>
              <ul className="space-y-2.5 font-sans font-medium">
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-600 shrink-0 mt-0.5" />
                  <span>Altori Park Pickleball, Matatag Park Square, Nunez Ext St, General Santos City, Philippines</span>
                </li>
                <li className="flex items-center gap-2 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>+63 (083) 552-ALTORI</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CORE BASE LEVEL FOOTPRINT ATTRIBUTION ROWS */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1.5 text-center sm:text-left">
              <ShieldCheck className="h-4 w-4 text-[#088505]" /> 
              <span>Altori Park Pickleball • All Rights Reserved • Powered by Reiem Digitals</span>
            </div>
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()} Altori Park</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
       * 📱 📥 INTERACTIVE REGISTRATION MODAL FORM SCREEN
       * ========================================================================= */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 max-w-2xl w-full rounded-2xl p-6 space-y-4 animate-in scale-in duration-150 text-left shadow-2xl max-h-[90vh] overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10 pt-1 transition-colors duration-200">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#088505]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">Official Entry Registration Form</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Complete your team credentials and add a payment voucher copy below.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePublicRegistrationSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans pt-2">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Select Your Division Bracket</label>
                <select 
                  value={pubCategory} 
                  onChange={(e) => setPubCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 font-medium cursor-pointer"
                >
                  {categories.map((c: Category) => (
                    <option key={c.category_id} value={c.category_name}>
                      {c.category_name} ({c.category_type || 'Doubles'}) — ₱{c.entry_fee || '0.00'}
                    </option>
                  ))}
                </select>
              </div>

              {!isPubSingles && (
                <div className="flex flex-col gap-1.5 md:col-span-2 animate-in fade-in duration-150">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Your Team Name</label>
                  <input 
                    type="text" value={pubTeamName} onChange={(e) => setPubTeamName(e.target.value)} required={!isPubSingles} placeholder="e.g., GenSan Smashers"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">
                  {isPubSingles ? "Full Name (First and Last) *" : "Player One Full Name *"}
                </label>
                <input 
                  type="text" value={pubPlayer1Name} onChange={(e) => setPubPlayer1Name(e.target.value)} required placeholder="Enter primary player's full name"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Player Two Full Name</label>
                <input 
                  type="text" value={pubPlayer2Name} onChange={(e) => setPubPlayer2Name(e.target.value)} 
                  disabled={isPubSingles} placeholder={isPubSingles ? "Disabled for Singles" : "Enter partner's full name"}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Contact Phone Number *</label>
                <input 
                  type="text" required value={pubContactNo} onChange={(e) => setPubContactNo(e.target.value)} placeholder="e.g., 09123456789"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Email Address *</label>
                <input 
                  type="email" required value={pubEmail} onChange={(e) => setPubEmail(e.target.value)} placeholder="player@domain.com"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">Home Address *</label>
                <input 
                  type="text" required value={pubAddress} onChange={(e) => setPubAddress(e.target.value)} placeholder="Barangay, City, Province"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2 border-t border-dashed border-slate-200 dark:border-slate-800 pt-4 mt-2">
                <label className="text-[10px] font-mono font-bold uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <FileImage className="h-3.5 w-3.5" /> Upload Your Payment Receipt or Screenshot *
                </label>
                <div className="relative border border-dashed border-slate-300 hover:border-purple-400 bg-slate-50/50 dark:border-slate-800 dark:hover:border-purple-500/50 dark:bg-slate-950/40 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors group">
                  <input 
                    type="file" 
                    required 
                    accept="image/*"
                    onChange={(e) => setPubFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Upload className="h-5 w-5 text-slate-400 group-hover:text-purple-500 dark:text-slate-500 dark:group-hover:text-purple-400 transition-colors" />
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors truncate max-w-xs">
                    {pubFile ? pubFile.name : "Click or drag your payment slip image file here..."}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 font-mono text-xs font-bold mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowRegisterModal(false)} 
                  className="px-5 py-3 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer uppercase tracking-wider text-[11px]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={pubFormSubmitting}
                  className="flex-1 md:flex-initial bg-[#088505] text-white font-bold px-6 py-3 rounded-xl hover:bg-opacity-90 active:scale-[0.995] tracking-wider uppercase transition-all shadow-md shadow-[#088505]/10 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 text-[11px]"
                >
                  {pubFormSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Register Team ➔"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📋 ADD NEW DIVISION OVERLAY MODAL FORM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/77 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 max-w-lg w-full rounded-2xl p-6 space-y-4 animate-in scale-in duration-150 text-left shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">Create New Division Bracket</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Set up the registration options, entry fee, and cash prizes for a new division.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 font-sans text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Division Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Advanced Men's Singles (4.0+)" 
                    value={newCatName} 
                    onChange={(e) => setNewCatName(e.target.value)} 
                    required 
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Match Format</label>
                  <select 
                    value={newCategoryType} 
                    onChange={(e) => setNewCategoryType(e.target.value as 'Singles' | 'Doubles')} 
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 cursor-pointer"
                  >
                    <option value="Doubles">Doubles Match</option>
                    <option value="Singles">Singles Match</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Gender Bracket</label>
                  <select 
                    value={newGenderDiv} 
                    onChange={(e) => setNewGenderDiv(e.target.value as 'Mixed' | 'Male' | 'Female')} 
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 cursor-pointer"
                  >
                    <option value="Mixed">Mixed (Coed)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Entry Fee (₱)</label>
                  <input 
                    type="number" 
                    value={newEntryFee} 
                    onChange={(e) => setNewEntryFee(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 font-mono" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Max Slots</label>
                  <input 
                    type="number" 
                    value={newMaxSlots} 
                    onChange={(e) => setNewMaxSlots(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-3 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 font-mono" 
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3">
                <label className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-2">Cash Prizes (PHP)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">🥇 1st Place</label>
                    <input type="number" value={newPrize1st} onChange={(e) => setNewPrize1st(e.target.value)} className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 font-mono" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">🥈 2nd Place</label>
                    <input type="number" value={newPrize2nd} onChange={(e) => setNewPrize2nd(e.target.value)} className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 font-mono" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">🥉 3rd Place</label>
                    <input type="number" value={newPrize3rd} onChange={(e) => setNewPrize3rd(e.target.value)} className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-purple-500 font-mono" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 font-mono text-xs font-bold">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={formSubmitting} 
                  className="px-5 py-2 bg-[#088505] text-white rounded-xl hover:bg-opacity-90 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? "Deploying..." : "Create Division"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}