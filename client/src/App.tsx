// client/src/App.tsx
import React, { useState, useEffect } from 'react';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlertStore } from './store/useAlertStore'; 
import { RefereePortal } from './components/RefereePortal';
import { ThemeToggle } from './components/ThemeToggle';
import { Lock, CheckCircle2, AlertTriangle, XCircle, Menu, X, ChevronRight } from 'lucide-react';

/** =======================================================
 * DYNAMIC PAGES DISPATCH IMPORTS (Refactored Sub-Modules)
 * ======================================================= */
import { LandingPage } from './pages/LandingPage';
import { TournamentList } from './pages/TournamentList';
import { TournamentGateway } from './pages/TournamentGateway';
import { LiveTournamentDashboard } from './pages/LiveTournamentDashboard';
import { AdminWorkspaceGateway } from './pages/AdminWorkspaceGateway';
import { 
  PrivacyPolicyView, 
  TermsConditionsView, 
  CookiePolicyView, 
  ReportIssueView, 
  UnderConstructionView 
} from './pages/SupportViews';

// Forces Axios to automatically attach secure cookies to every outbound server request
axios.defaults.withCredentials = true;

// Global Axios Interceptors map security signatures over standalone machine execution paths
axios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem('altori_admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (error: any) => Promise.reject(error)
);

/** =======================================================
 * MASTER CORE DASHBOARD PLATFORM VIEW LAYOUT ENGINE
 * ======================================================= */
function DashboardLayout() {
  const location = useLocation();
  const { isOpen, title, message, type, onConfirm, closeAlert } = useAlertStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-close mobile viewport drawer when navigation transition routes change
  useEffect(() => {
    // 🛡️ Defer execution to a macro-task queue to eliminate synchronous cascading re-renders
    const deferMenuClose = setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 0);

    return () => clearTimeout(deferMenuClose);
  }, [location.pathname]);

  // Prevent double-scrollbar viewport layout shifting when mobile overlay mask is active
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  const navigationLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Courts Schedule', path: '/schedule' },
    { name: 'Open Play', path: '/open-play' },
    { name: 'Membership', path: '/membership' },
    { name: 'Tournaments', path: '/tournaments' },
  ];

  return (
    <main className="min-h-screen pb-12 bg-slate-50 text-slate-900 dark:bg-brand-dark dark:text-white transition-colors duration-200 flex flex-col relative">
      
      {/* GLOBAL HEADER: Optimized to maintain fixed-height boundaries across all screens */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 dark:border-white/5 dark:bg-brand-dark/50 dark:backdrop-blur-md dark:shadow-none">
        <div className="max-w-7xl mx-auto h-16 md:h-20 flex items-center justify-between px-4 gap-4">
          
          {/* BRAND LINK HUB WITH LOGO IMAGE AND BRAND TEXT */}
          <Link to="/" className="flex items-center gap-2 group hover:opacity-95 cursor-pointer select-none shrink-0">
            <img 
              src="/Altori_Park_Pickleball_Logo.svg" 
              alt="Altori Park Logo" 
              className="h-12 w-12 md:h-16 md:w-16 object-contain transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== window.location.origin + '/assets/logo.png') {
                  target.src = '/assets/logo.png';
                }
              }}
            />
            <h1 className="text-sm md:text-lg font-black tracking-tighter text-[#64317C] italic uppercase dark:text-purple-400 text-left leading-none">
              Altori Park <br className="block md:hidden"/><span className="text-[#088505] md:ml-1">Pickleball</span>
            </h1>
          </Link>

          {/* DESKTOP NAV SPECIFICATION LAYER (Hidden below md media queries) */}
          <nav className="hidden md:flex items-center gap-x-5 text-xs font-mono font-black uppercase tracking-wider">
            {navigationLinks.map((link) => {
              const isTargetActive = link.path === '/tournaments' 
                ? location.pathname.includes('/tournament')
                : location.pathname === link.path;

              return (
                <Link 
                  key={link.path}
                  to={link.path} 
                  className={`transition-colors hover:text-[#088505] ${isTargetActive ? 'text-[#088505]' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {link.name}
                </Link>
              );
            })}
            
            <Link 
              to="/admin" 
              className="text-slate-400 dark:text-slate-500 hover:text-purple-500 dark:hover:text-purple-400 border-l border-slate-200 dark:border-white/10 pl-5 normal-case tracking-normal font-sans font-semibold flex items-center gap-1"
            >
              <Lock className="h-3 w-3" /> Staff Portal
            </Link>
          </nav>
          
          {/* RIGHT VIEW INTERACTIVE CONTROL BASE VECTOR */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <ThemeToggle />
            
            {/* MOBILE INTERFACE TRIGGER ACTION OVERLAY BUTTON */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center focus:outline-none"
              aria-label="Toggle navigation viewport drawer overlay"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* 📱 RESPONSIVE INTERACTIVE ANCHOR MENU CONSOLE DRAWER OVERLAY SHEET */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="absolute top-16 left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 shadow-xl overflow-hidden md:hidden z-40 text-left"
            >
              <nav className="flex flex-col p-4 font-mono text-xs font-black uppercase tracking-wider divide-y divide-slate-100 dark:divide-white/5">
                {navigationLinks.map((link) => {
                  const isTargetActive = link.path === '/tournaments' 
                    ? location.pathname.includes('/tournament')
                    : location.pathname === link.path;

                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`py-3.5 flex items-center justify-between group active:bg-slate-50 dark:active:bg-white/2 px-2 rounded-lg transition-colors ${
                        isTargetActive ? 'text-[#088505]' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>{link.name}</span>
                      <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity text-slate-400" />
                    </Link>
                  );
                })}
                
                <Link
                  to="/admin"
                  className="py-4 text-purple-600 dark:text-purple-400 normal-case font-sans font-bold flex items-center gap-2 px-2 mt-1"
                >
                  <Lock className="h-4 w-4" /> Access Staff Portal Shell
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* BACKDROP BLUR SHADOW LAYER IF EXPANDED MOBILE MENU DRAWER IS ACTIVE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 top-[64px] bg-black/40 backdrop-blur-xs z-30 md:hidden transition-all"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 w-full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/tournaments" element={<TournamentList />} />
          <Route path="/tournament/:tournamentId" element={<TournamentGateway />} />
          <Route path="/tournament/:tournamentId/live" element={<LiveTournamentDashboard />} />
          
          <Route path="/admin" element={<AdminWorkspaceGateway />} />
          <Route path="/admin/:tournamentId" element={<AdminWorkspaceGateway />} />
          
          <Route path="/about" element={<div className="max-w-7xl mx-auto px-4 mt-6"><UnderConstructionView /></div>} />
          <Route path="/schedule" element={<div className="max-w-7xl mx-auto px-4 mt-6"><UnderConstructionView /></div>} />
          <Route path="/open-play" element={<div className="max-w-7xl mx-auto px-4 mt-6"><UnderConstructionView /></div>} />
          <Route path="/membership" element={<div className="max-w-7xl mx-auto px-4 mt-6"><UnderConstructionView /></div>} />
          
          <Route path="/privacy" element={<div className="max-w-7xl mx-auto px-4 mt-6"><PrivacyPolicyView /></div>} />
          <Route path="/terms" element={<div className="max-w-7xl mx-auto px-4 mt-6"><TermsConditionsView /></div>} />
          <Route path="/cookies" element={<div className="max-w-7xl mx-auto px-4 mt-6"><CookiePolicyView /></div>} />
          <Route path="/report-issue" element={<div className="max-w-7xl mx-auto px-4 mt-6"><ReportIssueView /></div>} />
        </Routes>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-4 z-999">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 rounded-3xl max-w-sm w-full dark:bg-slate-900 text-center">
              <div className="mb-4 flex justify-center">
                {type === 'success' && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                {type === 'warning' && <AlertTriangle className="h-6 w-6 text-amber-500" />}
                {type === 'error' && <XCircle className="h-6 w-6 text-rose-500" />}
              </div>
              <h3 className="text-sm font-black font-mono uppercase tracking-wider mb-1">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 px-2">{message}</p>
              
              <button 
                onClick={async () => {
                  if (onConfirm) {
                    await onConfirm();
                  }
                  closeAlert();
                }} 
                className="w-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-bold font-mono py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer hover:opacity-90 active:scale-95 transition-all"
              >
                Acknowledge
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<DashboardLayout />} />
        <Route path="/referee/:matchId" element={<RefereePortal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;