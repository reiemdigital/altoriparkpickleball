// client/src/pages/TournamentGateway.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTournamentStore } from '../store/useTournamentStore';
import { SOCKET_URL, socket } from '../socket';
import { Calendar, MapPin, Layers, ArrowRight, ExternalLink } from 'lucide-react';

/** =======================================================
 * PREMIUM BRANDED TOURNAMENT GATEWAY PAGE (/tournament/:id)
 * ======================================================= */
export function TournamentGateway() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { gatewayData, setGatewayData } = useTournamentStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    
    const fetchGatewayInfo = async () => {
      try {
        const res = await axios.get(`${SOCKET_URL}/api/tournaments/${tournamentId}/gateway`);
        setGatewayData(res.data);
      } catch (err) {
        console.error("Gateway data compilation handshake error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGatewayInfo();
    socket.emit('join-tournament-room', tournamentId);

    return () => {
      socket.emit('leave-tournament-room', tournamentId);
    };
  }, [tournamentId, setGatewayData]);

  if (loading || !gatewayData.tournament) {
    return (
      <div className="min-h-100 flex items-center justify-center font-mono text-xs text-[#64317C]">
        ⌛ Handshaking dynamic arena matrix variables...
      </div>
    );
  }

  const { tournament, categories, stats } = gatewayData;

  return (
    <div className="animate-in fade-in duration-300 w-full flex flex-col min-h-screen bg-slate-950 text-slate-100">
      
      {/* HERO BANNER BLOCK */}
      <section className="relative overflow-hidden py-16 lg:py-24 bg-linear-to-b from-slate-900 to-slate-950 border-b border-slate-900 w-full">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-125 h-75 bg-[#64317C]/15 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-left relative z-10">
          <div className="lg:col-span-8 space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-mono font-black text-purple-400 uppercase tracking-widest">
              🏆 Official Tournament Hub
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase font-sans leading-none text-white">
              {tournament.title}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-slate-400 pt-1">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[#088505]" /> {tournament.start_date} to {tournament.end_date}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#64317C]" /> {tournament.venue_name}</span>
              <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-purple-400" /> {tournament.court_count} Active Courts</span>
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
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-left">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Live Metrics</div>
          <div className="text-2xl font-black text-white mt-1 flex items-center gap-2">
            {stats.liveMatchesCount} Running
            {stats.liveMatchesCount > 0 && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active live updates executing across courts.</p>
        </div>
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-left">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider"> Roster Pool</div>
          <div className="text-2xl font-black text-white mt-1">{stats.registeredPlayersCount} Entrants</div>
          <p className="text-[11px] text-slate-400 mt-1"> Roster names synchronized with databases.</p>
        </div>
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-left">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Clearance Status</div>
          <div className="text-2xl font-black text-purple-400 mt-1 uppercase font-mono tracking-tight">{tournament.status}</div>
          <p className="text-[11px] text-slate-400 mt-1">Current global operational server state.</p>
        </div>
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-left">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Brackets Engine</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1">Dual-Stage</div>
          <p className="text-[11px] text-slate-400 mt-1">Round Robin tracks advancing to playoffs trees.</p>
        </div>
      </section>

      {/* CATEGORY MATRICES DATA MATRICES LEDGER */}
      <section className="max-w-6xl mx-auto px-4 pb-16 w-full text-left">
        <div className="border-b border-slate-800 pb-3 mb-6 flex justify-between items-end">
          <div>
            <h3 className="text-base font-black font-mono uppercase tracking-wider text-slate-200">Tournament Divisions Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">Review category specifications, remaining team limits, and tier payouts.</p>
          </div>
          {tournament.guidelines_url && (
            <a href={tournament.guidelines_url} target="_blank" rel="noreferrer" className="text-xs font-mono font-bold text-[#088505] hover:underline flex items-center gap-1">
              Guidelines PDF <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div key={cat.category_id} className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col justify-between gap-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-200 uppercase tracking-wide">{cat.category_name}</h4>
                  <div className="flex gap-2 items-center mt-1.5">
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 font-mono text-[9px] rounded uppercase">Division: {cat.gender_division || 'Mixed'}</span>
                    <span className="text-[11px] font-mono text-slate-500">Entry: <span className="text-slate-300 font-bold">₱{cat.entry_fee || '0.00'}</span></span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                  cat.available_slots_remaining <= 3 ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-[#088505]/10 border border-[#088505]/30 text-emerald-400'
                }`}>
                  {cat.available_slots_remaining <= 0 ? '🔒 FULL' : `🔥 ${cat.available_slots_remaining} SLOTS REMAINING`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center text-[11px] font-mono">
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">
                  <div className="text-amber-400 font-bold">🥇 1st Place</div>
                  <div className="text-slate-200 font-black mt-0.5">₱{cat.prize_first || '0.00'}</div>
                </div>
                <div className="bg-slate-300/5 border border-slate-300/10 rounded-lg p-2">
                  <div className="text-slate-300 font-bold">🥈 2nd Place</div>
                  <div className="text-slate-200 font-black mt-0.5">₱{cat.prize_second || '0.00'}</div>
                </div>
                <div className="bg-amber-700/5 border border-amber-700/10 rounded-lg p-2">
                  <div className="text-amber-600 font-bold">🥉 3rd Place</div>
                  <div className="text-slate-200 font-black mt-0.5">₱{cat.prize_third || '0.00'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}