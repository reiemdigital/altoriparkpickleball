// client/src/components/RegistrationPortal.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import type { TournamentCategory } from '../store/useTournamentStore';
import { SOCKET_URL, socket } from '../socket';
import { 
  UserPlus, Settings2, Users, Layers, Play, Trash2, Edit2, 
  Check, X, GripVertical, Sparkles, AlertCircle, Eye, 
  ShieldCheck, Loader2, FileText, User, RotateCcw
} from 'lucide-react';

interface PlayerModel {
  id: string;
  name: string;
}

interface TeamRosterModel {
  id: string;
  tournament_id: string;
  category_id: string;
  team_name: string;
  player1_name: string;
  player2_name: string;
  registration_status: 'PENDING' | 'CONFIRMED' | 'WAITLISTED';
  matches_played: number;
  wins: number;
  points_for: number;
  points_against: number;
  group_id: string | null;
  category?: string;
  contact_no?: string; 
  address?: string;
  email?: string;
  players?: PlayerModel[];
  payment_proof_url?: string | null; 
}

export const RegistrationPortal = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  
  const standings = useTournamentStore((state) => state.standings) as unknown as TeamRosterModel[];
  const categories = useTournamentStore((state) => state.gatewayData.categories);
  const matches = useTournamentStore((state) => state.matches);

  const setStandings = useTournamentStore((state) => state.setStandings);
  const setGatewayData = useTournamentStore((state) => state.setGatewayData);
  const setMatches = useTournamentStore((state) => state.setMatches);

  const [category, setCategory] = useState('');
  const [teamName, setTeamName] = useState('');
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempMaxSlots, setTempMaxSlots] = useState<number>(16);
  const [tempGroupCount, setTempGroupCount] = useState<number>(1);

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState<string>('');

  const [pendingTeams, setPendingTeams] = useState<TeamRosterModel[]>([]);
  const [isPendingLoading, setIsPendingLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);
  
  // Explicit transaction lock processing state tracker
  const [unseedingCatId, setUnseedingCatId] = useState<string | null>(null);

  const currentCategoryObj = useMemo(() => {
    return categories.find((c: TournamentCategory) => c.category_name === category);
  }, [categories, category]);

  const currentCategoryId = useMemo(() => {
    return currentCategoryObj?.category_id || '';
  }, [currentCategoryObj]);

  const isSingles = useMemo(() => {
    return currentCategoryObj?.category_type === 'Singles';
  }, [currentCategoryObj]);

  const refreshData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setIsPendingLoading(true);
      const [standingsRes, gatewayRes, matchesRes, pendingTeamsRes] = await Promise.all([
        axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/standings`),
        axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/gateway`),
        axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/matches`),
        axios.get<TeamRosterModel[]>(`${SOCKET_URL}/api/admin/tournaments/${tournamentId}/teams`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);

      setStandings(standingsRes.data);
      setGatewayData(gatewayRes.data);
      setMatches(matchesRes.data);
      
      if (pendingTeamsRes && Array.isArray(pendingTeamsRes.data)) {
        const unverifiedItems = pendingTeamsRes.data.filter((t: TeamRosterModel) => t.registration_status === 'PENDING');
        setPendingTeams(unverifiedItems);
      } else {
        setPendingTeams([]);
      }
    } catch (err) {
      console.error("Failed to refresh real-time registration sync data:", err);
    } finally {
      setIsPendingLoading(false);
    }
  }, [tournamentId, setStandings, setGatewayData, setMatches]);

  useEffect(() => {
    let deferTask: ReturnType<typeof setTimeout>;
    if (tournamentId) {
      deferTask = setTimeout(() => {
        refreshData();
      }, 0);
    }
    socket.on('registration-updated', () => { refreshData(); });
    return () => {
      if (deferTask) clearTimeout(deferTask);
      socket.off('registration-updated');
    };
  }, [tournamentId, refreshData]);

  useEffect(() => {
    if (categories && categories.length > 0) {
      const isCurrentlySelectedValid = categories.some(c => c.category_name === category);
      if (!isCurrentlySelectedValid) {
        const queueCategoryTask = setTimeout(() => {
          setCategory(categories[0].category_name);
        }, 0);
        return () => clearTimeout(queueCategoryTask);
      }
    }
  }, [categories, category]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId || !currentCategoryId) {
      alert("Validation Exception: Missing active tournament scope parameters or invalid category identification mapping.");
      return;
    }
    try {
      await axios.post(`${SOCKET_URL}/api/teams/register`, {
        tournamentId,
        categoryId: currentCategoryId,
        category, 
        teamName: isSingles ? player1Name : teamName, 
        player1Name, 
        player2Name: isSingles ? '' : player2Name, 
        contactNo, 
        address, 
        email
      });
      setTeamName(''); setPlayer1Name(''); setPlayer2Name('');
      setContactNo(''); setAddress(''); setEmail('');
      alert("Registration saved and synced successfully!");
      await refreshData();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Registration exception encountered.");
      } else {
        alert("An unexpected registration error occurred.");
      }
    }
  };

  const handleApprovePayment = async (teamId: string) => {
    setVerifyingId(teamId);
    try {
      await axios.put(`${SOCKET_URL}/api/admin/teams/${teamId}/verify-payment`, {}, { withCredentials: true });
      alert("Participant payment approved. Team context seeded into the live roster pool!");
      await refreshData();
    } catch (err) {
      console.error("Payment confirmation loop block:", err);
      alert("Operational Block: Verification route failed to complete state mutation.");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleUpdateConfig = async (catName: string) => {
    const targetCat = categories.find((c: TournamentCategory) => c.category_name === catName);
    if (!tournamentId || !targetCat) return;

    try {
      await axios.put(`${SOCKET_URL}/api/config/category-settings`, {
        tournamentId,
        categoryId: targetCat.category_id,
        categoryName: catName, 
        maxSlots: tempMaxSlots, 
        groupCount: tempGroupCount
      }, { withCredentials: true });
      setEditingCategory(null);
      await refreshData();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(`Configuration Error: ${error.response?.data?.error || error.message}`);
      } else {
        alert("An unexpected configuration error occurred.");
      }
    }
  };

  const handleAutoAllocateGroups = async (catName: string, targetGroups: number) => {
    const targetCat = categories.find((c: TournamentCategory) => c.category_name === catName);
    if (!tournamentId || !targetCat) return;

    try {
      const response = await axios.post(`${SOCKET_URL}/api/groups/auto-allocate`, {
        tournamentId,
        categoryId: targetCat.category_id,
        categoryName: catName, 
        groupCount: targetGroups
      },{withCredentials: true});
      alert(response.data.message);
      await refreshData();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Failed to auto-allocate group splits.");
      } else {
        alert("An unexpected error occurred during allocation.");
      }
    }
  };

  const handleCommitSeedPools = async (catName: string) => {
    const targetCat = categories.find((c: TournamentCategory) => c.category_name === catName);
    if (!tournamentId || !targetCat) return;

    if (!window.confirm(`⚠️ LOCK POOLS? This will lock current group layouts for ${catName} and generate all official Round Robin matches. Proceed?`)) return;
    try {
      const response = await axios.post(`${SOCKET_URL}/api/groups/generate`, {
        tournamentId,
        categoryId: targetCat.category_id,
        categoryName: catName
      });
      alert(response.data.message);
      await refreshData();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Failed to commit official seed fixtures.");
      } else {
        alert("An unexpected scheduling error occurred.");
      }
    }
  };

  const handleUnseedCategory = async (catName: string) => {
    const targetCat = categories.find((c: TournamentCategory) => c.category_name === catName);
    if (!tournamentId || !targetCat) return;

    const safetyVerification = window.confirm(
      `🚨 DANGER ZONE: UNSEED BRACKETS?\n\nThis will permanently remove ALL generated match schedules, score logs, and court sessions for the "${catName}" division.\n\nTeams will safely return to a draft layout state. Are you sure you want to proceed?`
    );

    if (!safetyVerification) return;

    try {
      setUnseedingCatId(targetCat.category_id);
      const secureToken = sessionStorage.getItem('altori_admin_token');

      const response = await axios.post(`${SOCKET_URL}/api/groups/unseed`, {
        tournamentId,
        categoryId: targetCat.category_id,
        categoryName: catName
      }, {
        withCredentials: true,
        headers: secureToken ? { Authorization: `Bearer ${secureToken}` } : {}
      });

      alert(response.data.message || "Seeding tables successfully scrubbed. Brackets reset to draft mode.");
      await refreshData();
    } catch (error: unknown) {
      console.error("❌ Critical Pool Unseeding Error Matrix Details:", error);
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Backend failed to safely drop seeded bracket records.");
      } else {
        alert("An unexpected network connection error occurred trying to unseed pools.");
      }
    } finally {
      setUnseedingCatId(null);
    }
  };

  const handleDeleteTeam = async (teamId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to completely remove "${name}" from the roster?`)) return;
    try {
      await axios.delete(`${SOCKET_URL}/api/teams/${teamId}`);
      await refreshData();
    } catch {
      alert("Failed to delete team. Please ensure backend route is configured.");
    }
  };

  const handleSaveEditTeam = async (teamId: string) => {
    if (!editTeamName.trim()) return;
    try {
      await axios.put(`${SOCKET_URL}/api/teams/${teamId}`, { name: editTeamName });
      setEditingTeamId(null);
      await refreshData();
    } catch {
      alert("Failed to update team name. Please ensure backend route is configured.");
    }
  };

  const handleDragStart = (e: React.DragEvent, teamId: string) => {
    e.dataTransfer.setData('text/plain', teamId);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleOnDrop = async (e: React.DragEvent, targetGroupId: string | null) => {
    e.preventDefault();
    const draggedTeamId = e.dataTransfer.getData('text/plain');
    if (!draggedTeamId) return;

    try {
      await axios.put(`${SOCKET_URL}/api/teams/${draggedTeamId}/group`, { groupId: targetGroupId });
      await refreshData();
    } catch {
      alert("Failed to relocate team drop configuration parameters.");
    }
  };

  const getCategoryDisplayLabel = (catId: string) => {
    const matchObj = categories.find(c => c.category_id === catId);
    return matchObj ? matchObj.category_name : "Unknown Division";
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-[1600px] mx-auto px-1 sm:px-4">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start w-full">
        
        {/* LEFT HAND SIDE COLUMN: MANUAL ENTRY ONBOARDING REGISTRY FORM */}
        <div className="lg:col-span-4 p-4 sm:p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm dark:border-white/5 dark:bg-slate-900/40 backdrop-blur-sm transition-all duration-200 text-left w-full">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
            <UserPlus className="h-5 w-5 text-purple-500 shrink-0" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Onboarding Entry Registry Form
            </h2>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4 text-xs w-full">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Category Division Type</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 sm:py-2.5 font-medium text-slate-800 focus:outline-none focus:border-purple-500 dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 min-h-[40px]"
              >
                {categories.map((catObj: TournamentCategory) => (
                  <option key={catObj.category_id} value={catObj.category_name}>
                    {catObj.category_name}
                  </option>
                ))}
              </select>
            </div>

            {!isSingles && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Team Identity Name</label>
                <input 
                  type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} required={!isSingles} placeholder="Enter unique team tag"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 sm:py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 min-h-[40px]"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500">{isSingles ? "Player Name" : "Player One Full Name"}</label>
              <input 
                type="text" value={player1Name} onChange={(e) => setPlayer1Name(e.target.value)} required placeholder="Primary participant name"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 sm:py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 min-h-[40px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Player Two Full Name</label>
              <input 
                type="text" value={player2Name} onChange={(e) => setPlayer2Name(e.target.value)} 
                disabled={isSingles} placeholder={isSingles ? "Disabled for Singles" : "Partner name"}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 sm:py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 disabled:opacity-40 min-h-[40px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Primary Contact #</label>
              <input 
                type="text" value={contactNo} onChange={(e) => setContactNo(e.target.value)} placeholder="09xxxxxxxxx"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 sm:py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 min-h-[40px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Email Address</label>
              <input 
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="participant@domain.com"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 sm:py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 min-h-[40px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-500">Residential Address</label>
              <input 
                type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, Barangay, City Province"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 sm:py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 dark:bg-slate-950 dark:border-white/10 dark:text-slate-200 min-h-[40px]"
              />
            </div>

            <button 
              type="submit"
              className="mt-2 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold font-mono py-3.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-md shadow-purple-500/10 cursor-pointer min-h-[44px]"
            >
              Save Participant Record
            </button>
          </form>
        </div>

        {/* RIGHT HAND SIDE COLUMN: THE HYBRID MOBILE-READY VERIFICATION QUEUE */}
        <div className="lg:col-span-8 p-4 sm:p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm dark:border-white/5 dark:bg-slate-900/40 backdrop-blur-sm transition-all duration-200 text-left min-w-0 self-stretch flex flex-col justify-between w-full">
          <div>
            <div className="flex flex-wrap justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4 gap-2 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  Live Public Verification Queue
                </h2>
              </div>
              <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full font-mono font-bold text-[10px]">
                🔥 {pendingTeams.length} Pending Review
              </span>
            </div>

            {isPendingLoading ? (
              <div className="py-24 text-center font-mono text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> Aligning ledger pipelines...
              </div>
            ) : pendingTeams.length === 0 ? (
              <div className="py-24 border border-dashed border-slate-200 dark:border-white/5 rounded-xl text-center font-mono text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                <ShieldCheck className="h-6 w-6 text-slate-300 dark:text-slate-600" /> Clean Ledger: No public registrations waiting.
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto w-full border border-slate-200 dark:border-white/5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-white/2 font-mono uppercase text-[10px] text-slate-500">
                        <th className="p-3">Team / Participants</th>
                        <th className="p-3">Division</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3 text-center">Receipt</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {pendingTeams.map((team) => (
                        <tr key={team.id} className="hover:bg-slate-100/40 transition-colors">
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200 max-w-[160px] truncate">
                            <div className="truncate">{team.team_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal mt-0.5">
                              👤 {team.player1_name}{team.player2_name ? ` / ${team.player2_name}` : ''}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex px-2 py-0.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-[9px] font-bold rounded">
                              {getCategoryDisplayLabel(team.category_id)}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            <div>{team.contact_no || 'N/A'}</div>
                            <div className="text-[9px] text-slate-400 truncate max-w-[120px]">{team.email || ''}</div>
                          </td>
                          <td className="p-3 text-center">
                            {team.payment_proof_url ? (
                              <button
                                onClick={() => setActiveReceiptUrl(team.payment_proof_url || null)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 rounded-lg font-mono font-bold transition-colors cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" /> Inspect
                              </button>
                            ) : (
                              <span className="text-rose-400 font-mono text-[10px] italic">No Slip Uploaded</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleApprovePayment(team.id)}
                              disabled={verifyingId === team.id || !team.payment_proof_url}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-lg font-mono font-bold uppercase text-[9px] tracking-wider cursor-pointer shadow-xs shadow-emerald-600/10"
                            >
                              {verifyingId === team.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Approve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden space-y-3 w-full">
                  {pendingTeams.map((team) => (
                    <div key={team.id} className="p-4 bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 rounded-xl space-y-3 flex flex-col text-xs w-full min-w-0">
                      <div className="flex justify-between items-start gap-2 border-b border-slate-200 dark:border-white/5 pb-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="text-slate-800 dark:text-slate-100 font-bold truncate">{team.team_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1 truncate">
                            <User className="h-3 w-3 shrink-0" /> <span className="truncate">{team.player1_name}{team.player2_name ? ` / ${team.player2_name}` : ''}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-[9px] font-bold rounded uppercase shrink-0">
                          {getCategoryDisplayLabel(team.category_id)}
                        </span>
                      </div>

                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 min-w-0">
                        <div className="truncate">📞 Contact: {team.contact_no || 'N/A'}</div>
                        <div className="truncate text-[10px]">{team.email || 'No email saved'}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px] font-bold uppercase tracking-wider min-h-[40px]">
                        {team.payment_proof_url ? (
                          <button
                            onClick={() => setActiveReceiptUrl(team.payment_proof_url || null)}
                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg flex items-center justify-center gap-1 cursor-pointer border border-slate-200 min-h-[40px]"
                          >
                            <FileText className="h-3.5 w-3.5" /> View Slip
                          </button>
                        ) : (
                          <div className="w-full py-2.5 bg-rose-500/5 text-rose-400 rounded-lg flex items-center justify-center text-[9px] italic border border-transparent min-h-[40px]">No File</div>
                        )}
                        
                        <button
                          onClick={() => handleApprovePayment(team.id)}
                          disabled={verifyingId === team.id || !team.payment_proof_url}
                          className="w-full py-2.5 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer shadow-xs min-h-[40px]"
                        >
                          {verifyingId === team.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Verify
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
      </div>

      {/* REAL-TIME DIVISION ROSTER CARDS */}
      <div className="w-full text-left">
        <div className="flex items-center gap-2 mb-4 sm:mb-6 px-1">
          <Users className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">Division Entries Tracker</h2>
        </div>

        {categories.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-8 text-center bg-white border border-slate-200/60 rounded-2xl dark:bg-slate-900/20">
            No division tracking segments initialized for this tournament shell.
          </p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full">
            {categories.map((catObj: TournamentCategory) => {
              const cat = catObj.category_name;
              const divisionTeams = standings.filter(t => t.category_id === catObj.category_id);
              const maxLimit = catObj.max_slots ?? 16;
              const activeGroupCount = 4; 
              const isFull = divisionTeams.length >= maxLimit;
              const isCatSingles = catObj.category_type === 'Singles';
              const isAllocated = divisionTeams.some(t => t.group_id && t.group_id !== 'Pending Pool Seeding');
              const isSeeded = matches.some((m) => m.match_type === 'ROUND_ROBIN' && m.category_id === catObj.category_id);

              const previewDistribution = Array.from({ length: activeGroupCount }, () => 0);
              const GROUP_LABELS = ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Group G", "Group H"];
              const targetGroupLabels = GROUP_LABELS.slice(0, activeGroupCount);

              const groupedTeams: Record<string, typeof divisionTeams> = {};
              targetGroupLabels.forEach(label => { groupedTeams[label] = []; });
              groupedTeams["Unassigned"] = [];

              if (divisionTeams.length > 0) {
                divisionTeams.forEach((team, idx) => {
                  previewDistribution[idx % activeGroupCount]++;
                  const groupLabel = team.group_id || "Unassigned";
                  if (!groupedTeams[groupLabel]) groupedTeams[groupLabel] = [];
                  groupedTeams[groupLabel].push(team);
                });
              }

              const hasIncomingUnassignedTeams = groupedTeams["Unassigned"] && groupedTeams["Unassigned"].length > 0;

              return (
                <div key={catObj.category_id} className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between min-h-90 shadow-sm shadow-slate-100 dark:border-white/5 dark:bg-slate-950/40 backdrop-blur-sm transition-all duration-200 w-full min-w-0">
                  <div className="w-full min-w-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4 border-b border-slate-50 dark:border-white/5 pb-2 min-w-0">
                      <h3 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider font-mono truncate max-w-full sm:max-w-xs flex-1" title={cat}>{cat}</h3>
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border transition-colors shrink-0 ${
                        isFull ? 'bg-red-50 text-red-700 border-red-200' : 'bg-purple-50 text-purple-600 border-purple-100'
                      }`}>
                        {divisionTeams.length} / {maxLimit} Entries
                      </span>
                    </div>

                    {divisionTeams.length > 0 && !isAllocated && (
                      <div className="mb-4 px-2.5 py-2 sm:py-1.5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row gap-1 sm:items-center sm:justify-between text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-purple-500 shrink-0" /> Pools Split Bounds: {activeGroupCount} Groups</span>
                        <span className="text-slate-400">({previewDistribution.slice(0, activeGroupCount).join('-')} distribution)</span>
                      </div>
                    )}

                    {divisionTeams.length > 0 && isAllocated && !isSeeded && (
                      <div className="mb-4 px-2.5 py-2 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between text-[10px] font-mono text-amber-700 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Draft Boards Active (Drag & Drop Ready)</span>
                        <span>Draft</span>
                      </div>
                    )}

                    {divisionTeams.length > 0 && isSeeded && (
                      <div className="mb-4 px-2.5 py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-[10px] font-mono text-emerald-600 font-black uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Seeding Locked & Matches Deployed</span>
                        <span>Official</span>
                      </div>
                    )}

                    {isAllocated && !isSeeded && hasIncomingUnassignedTeams && (
                      <div className="mb-3 p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-sans font-semibold text-rose-700 flex items-center gap-2 animate-pulse">
                        <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                        <span>Action Required: New teams added! Click "Re-Group All".</span>
                      </div>
                    )}

                    <div className="mt-2 pr-1 w-full min-w-0">
                      {divisionTeams.length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic block pt-10 text-center">No participants registered yet</span>
                      ) : isAllocated ? (
                        <div className="space-y-4 w-full min-w-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 w-full min-w-0">
                            {targetGroupLabels.map(groupName => (
                              <div 
                                key={groupName}
                                onDragOver={!isSeeded ? handleDragOver : undefined}
                                onDrop={!isSeeded ? (e) => handleOnDrop(e, groupName) : undefined}
                                className="p-2 rounded-xl border min-h-28 flex flex-col gap-1.5 bg-slate-50/50 border-slate-200/60 min-w-0"
                              >
                                <div className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/50 pb-1 mb-1">
                                  {groupName} ({groupedTeams[groupName]?.length || 0})
                                </div>
                                
                                {groupedTeams[groupName]?.length === 0 ? (
                                  <span className="text-[8px] font-mono text-slate-400 italic block my-auto text-center">Empty Pool Dropzone</span>
                                ) : (
                                  groupedTeams[groupName].map((team) => (
                                    <div 
                                      key={team.id}
                                      draggable={!isSeeded}
                                      onDragStart={(e) => handleDragStart(e, team.id)}
                                      className="text-xs font-semibold p-2 rounded-lg flex items-center justify-between gap-2 border bg-white border-slate-200 shadow-2xs min-w-0"
                                    >
                                      <div className="flex flex-col min-w-0 text-left flex-1">
                                        <div className="truncate font-bold text-slate-800 dark:text-slate-200 text-xs w-full">
                                          {team.team_name}
                                          {team.address && <span className="text-[10px] font-normal text-slate-400 italic ml-1">- {team.address}</span>}
                                        </div>
                                        {!isCatSingles && team.player1_name && (
                                          <div className="text-[10px] font-medium text-slate-500 truncate mt-0.5 w-full">
                                            {team.player1_name} / {team.player2_name || 'TBD'}
                                          </div>
                                        )}
                                      </div>
                                      {!isSeeded && <GripVertical className="h-3 w-3 text-slate-300 shrink-0" />}
                                    </div>
                                  ))
                                )}
                              </div>
                            ))}
                          </div>

                          {hasIncomingUnassignedTeams && (
                            <div 
                              onDragOver={!isSeeded ? handleDragOver : undefined}
                              onDrop={!isSeeded ? (e) => handleOnDrop(e, null) : undefined}
                              className="p-3 bg-rose-500/2 border border-dashed border-rose-500/20 rounded-xl mt-2 w-full min-w-0"
                            >
                              <div className="text-[9px] font-mono font-black text-rose-500 uppercase tracking-widest border-b border-rose-500/10 pb-1 mb-2">
                                📥 Incoming Draft Pool / Unassigned Entries ({groupedTeams["Unassigned"].length})
                              </div>
                              <div className="flex flex-wrap gap-2 w-full">
                                {groupedTeams["Unassigned"].map((team) => (
                                  <div
                                    key={team.id}
                                    draggable={!isSeeded}
                                    onDragStart={(e) => handleDragStart(e, team.id)}
                                    className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-rose-200 shadow-3xs rounded-lg flex items-center justify-between gap-3 text-slate-800 max-w-full min-w-0"
                                  >
                                    <div className="flex flex-col min-w-0 text-left flex-1">
                                      <div className="truncate font-bold text-slate-800 dark:text-slate-200 text-xs w-full">
                                        {team.team_name}
                                        {team.address && <span className="text-[10px] font-normal text-slate-400 italic ml-1">- {team.address}</span>}
                                      </div>
                                      {!isCatSingles && team.player1_name && (
                                        <div className="text-[10px] font-medium text-slate-500 truncate mt-0.5 w-full">
                                          {team.player1_name} / {team.player2_name || 'TBD'}
                                        </div>
                                      )}
                                    </div>
                                    {!isSeeded && <GripVertical className="h-3 w-3 text-slate-400 shrink-0" />}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 w-full">
                          {divisionTeams.map((team, idx) => (
                            <div key={team.id} className="text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-2.5 rounded-lg flex items-center justify-between gap-2.5 dark:bg-white/2 group min-w-0 w-full">
                              {editingTeamId === team.id ? (
                                <div className="flex items-center gap-2 w-full min-h-[32px]">
                                  <input 
                                    type="text" value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)}
                                    className="flex-1 bg-white border border-purple-500 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none dark:bg-slate-900 dark:text-white" autoFocus
                                  />
                                  <button onClick={() => handleSaveEditTeam(team.id)} className="text-emerald-500 hover:bg-emerald-50 p-1.5 rounded cursor-pointer shrink-0">
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => setEditingTeamId(null)} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded cursor-pointer shrink-0">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                    <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0">
                                      {String(idx + 1).padStart(2, '0')}
                                    </span>
                                    <div className="truncate text-left flex items-center flex-wrap gap-x-1.5 gap-y-0.5 w-full min-w-0">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">
                                        {team.team_name}
                                      </span>
                                      {!isCatSingles && team.player1_name && (
                                        <span className="text-slate-500 font-medium text-xs truncate max-w-full">
                                          : {team.player1_name} / {team.player2_name || 'TBD'}
                                        </span>
                                      )}
                                      {team.address && <span className="text-[11px] font-medium text-slate-400 italic shrink-0">- {team.address}</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button onClick={() => { setEditingTeamId(team.id); setEditTeamName(team.team_name); }} className="text-slate-400 hover:text-purple-600 p-2 cursor-pointer transition-colors" title="Edit Team"><Edit2 className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => handleDeleteTeam(team.id, team.team_name)} className="text-slate-400 hover:text-red-500 p-2 cursor-pointer transition-colors" title="Remove Team"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2 w-full shrink-0">
                    {editingCategory === cat ? (
                      <div className="flex flex-col gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 dark:bg-black/20 w-full text-xs">
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                          <span>Max Capacity:</span>
                          <input 
                            type="number" value={tempMaxSlots} onChange={(e) => setTempMaxSlots(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 bg-white border border-slate-200 rounded px-1.5 py-1 text-center font-bold text-purple-600 dark:bg-slate-900"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                          <span>Group Count:</span>
                          <input 
                            type="number" value={tempGroupCount} onChange={(e) => setTempGroupCount(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                            className="w-16 bg-white border border-slate-200 rounded px-1.5 py-1 text-center font-bold text-purple-600 dark:bg-slate-900"
                          />
                        </div>
                        <div className="flex justify-end gap-3 mt-1 font-mono text-[10px]">
                          <button onClick={() => setEditingCategory(null)} className="font-bold text-slate-400 py-1 cursor-pointer">Cancel</button>
                          <button onClick={() => handleUpdateConfig(cat)} className="bg-purple-600 text-white px-2.5 py-1 rounded font-bold cursor-pointer">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full min-h-[36px]">
                        <div className="flex items-center gap-2">
                          {divisionTeams.length >= 2 && (!isAllocated || hasIncomingUnassignedTeams) && (
                            <button
                              onClick={() => handleAutoAllocateGroups(cat, activeGroupCount)}
                              className="text-[9px] font-mono font-bold uppercase bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-600 hover:text-white px-2.5 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer min-h-[32px]"
                            >
                              <Layers className="h-2.5 w-2.5 shrink-0" /> {isAllocated ? "Re-Group All" : "Auto Group"}
                            </button>
                          )}

                          {isAllocated && !isSeeded && !hasIncomingUnassignedTeams && (
                            <button
                              onClick={() => handleCommitSeedPools(cat)}
                              className="text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-600 hover:text-white px-2.5 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer min-h-[32px]"
                            >
                              <Play className="h-2.5 w-2.5 fill-current shrink-0" /> Seed Pools
                            </button>
                          )}

                          {isSeeded && (
                            <button
                              onClick={() => handleUnseedCategory(cat)}
                              disabled={unseedingCatId === catObj.category_id}
                              className="text-[9px] font-mono font-bold uppercase bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-600 hover:text-white px-2.5 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 min-h-[32px]"
                            >
                              {unseedingCatId === catObj.category_id ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
                              ) : (
                                <RotateCcw className="h-2.5 w-2.5 shrink-0" />
                              )}
                              {unseedingCatId === catObj.category_id ? "Resetting..." : "Unseed Pools"}
                            </button>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => { setEditingCategory(cat); setTempMaxSlots(maxLimit); setTempGroupCount(activeGroupCount); }} 
                          className={`text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer py-1.5 ${isSeeded ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-purple-600'}`}
                          disabled={isSeeded}
                        >
                          <Settings2 className="h-3 w-3 shrink-0" /> Config Settings
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DIRECT INSULATION LIGHTBOX MODAL OVERLAY PORTAL */}
      {activeReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 max-w-sm w-full rounded-2xl overflow-hidden p-4 flex flex-col gap-3 shadow-2xl animate-in scale-in duration-150 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
              <span className="font-mono font-bold text-slate-400 uppercase text-[9px] tracking-wider">
                Auditing Payment Voucher Attachment
              </span>
              <button 
                onClick={() => setActiveReceiptUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="w-full bg-slate-950 rounded-xl p-1.5 border border-slate-200 dark:border-white/5 flex items-center justify-center max-h-[50vh] overflow-y-auto">
              <img 
                src={activeReceiptUrl} 
                alt="Payment proof receipt asset validation token"
                className="max-w-full h-auto object-contain rounded-lg"
              />
            </div>

            <button 
              onClick={() => setActiveReceiptUrl(null)}
              className="w-full font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white py-3 sm:py-2 rounded-xl text-center uppercase tracking-wide text-xs cursor-pointer transition-colors min-h-[40px]"
            >
              Close Asset Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
};