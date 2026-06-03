// client/src/pages/TournamentList.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTournamentStore } from '../store/useTournamentStore';
import { SOCKET_URL } from '../socket';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

/** =======================================================
 * MULTI-TOURNAMENT DIRECTORY MATRIX VIEW (/tournaments)
 * ======================================================= */
export function TournamentList() {
  const { tournaments, setTournaments } = useTournamentStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTournaments = async () => {
      try {
        const res = await axios.get(`${SOCKET_URL}/api/tournaments`);
        setTournaments(res.data);
      } catch (err) {
        console.error("Failed to fetch tournament listings index:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllTournaments();
  }, [setTournaments]);

  const formatTournamentDate = (dateString: string) => {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-100 flex items-center justify-center font-mono text-xs text-purple-400">
        ⌛ Loading Tournament Data....
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-left animate-in fade-in duration-300">
      
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-10 flex items-center justify-between">
        <h2 className="text-3xl sm:text-4xl font-black font-sans uppercase tracking-tight text-slate-900 dark:text-white">
          Tournaments
        </h2>
        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[10px] font-mono font-bold text-[#088505] dark:text-emerald-400 tracking-wider uppercase">
          {tournaments.length} Active
        </span>
      </div>

      {tournaments.length === 0 ? (
        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center max-w-md mx-auto bg-slate-50 dark:bg-slate-900/20">
          <p className="text-sm font-mono font-bold uppercase tracking-wider text-slate-400">No Tournaments Discovered</p>
          <p className="text-xs text-slate-500 mt-1">Check back later or initialize an event sequence block inside your administrative console terminal workspace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              to={`/tournament/${t.id}`}
              className="relative h-80 w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 group shadow-md hover:shadow-xl transition-all duration-300 hover:border-[#64317C]/60 hover:scale-[1.01] flex flex-col justify-end p-6 cursor-pointer"
            >
              
              {t.cover_url ? (
                <img 
                  src={t.cover_url} 
                  alt={t.title} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#088505]/5 to-[#64317C]/10 dark:from-purple-950/20 dark:to-slate-950/40 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] opacity-70 dark:opacity-40 transition-opacity group-hover:opacity-90" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/10 dark:from-slate-950 dark:via-slate-950/80 dark:to-transparent z-10" />

              <div className="absolute top-4 left-4 z-20">
                <span className={`px-2.5 py-0.5 rounded-md font-mono text-[9px] font-black tracking-wider uppercase border ${
                  t.status === 'LIVE' 
                    ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' 
                    : 'bg-slate-950/60 text-slate-300 border-white/10 backdrop-blur-xs'
                }`}>
                  ● {t.status}
                </span>
              </div>

              <div className="z-20 space-y-2.5 text-left pointer-events-none">
                
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 dark:text-emerald-400 tracking-wide uppercase">
                  <Calendar className="h-3.5 w-3.5 text-[#088505] dark:text-emerald-400 shrink-0" />
                  <span>{formatTournamentDate(t.start_date)}</span>
                </div>

                <h3 className="text-xl font-black text-white tracking-tight leading-snug group-hover:text-emerald-400 dark:group-hover:text-emerald-400 transition-colors duration-200 line-clamp-2 uppercase">
                  {t.title}
                </h3>

                <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-white/10 text-slate-300 text-xs font-mono">
                  <div className="flex items-center gap-1 truncate max-w-[75%]">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{t.venue_name}</span>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-white group-hover:text-emerald-400 transition-colors shrink-0 text-[10px] uppercase tracking-widest">
                    Explore <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}