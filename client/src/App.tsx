// client/src/App.tsx
import React, { useState, useEffect } from 'react';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlertStore } from './store/useAlertStore'; 
import { RefereePortal } from './components/RefereePortal';
import { ThemeToggle } from './components/ThemeToggle';
import { Lock, CheckCircle2, AlertTriangle, XCircle, Menu, X, ChevronRight, ShieldAlert } from 'lucide-react';

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
    const token = sessionStorage.getItem('altori_auth_token') || sessionStorage.getItem('altori_admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (error: any) => Promise.reject(error)
);

/** =======================================================
 * 🛡️ CLIENT ROUTE GUARD: ALLOWS STAFF ACCESS TO WORKSPACES
 * ======================================================= */
interface GuardProps {
  children: React.ReactNode;
}

function AdminRouteGuard({ children }: GuardProps) {
  // 🛡️ Fallback verification checks both administrative and standard session roles safely
  const currentSessionRole = (sessionStorage.getItem('altori_admin_role') || sessionStorage.getItem('altori_user_role'))?.toUpperCase();
  const hasToken = !!(sessionStorage.getItem('altori_auth_token') || sessionStorage.getItem('altori_admin_token'));

  // If the user hasn't logged in at all, pass them directly down to the auth login page view natively
  if (!hasToken) {
    return <>{children}</>;
  }

  // 🚀 STAFF USERS ARE NOW GRANTED CLEARANCE TO ACCESS THE DASHBOARD MONITORING SYSTEM
  // Only completely unknown or invalid security profile signatures get rejected here
  if (currentSessionRole && currentSessionRole !== 'ADMIN' && currentSessionRole !== 'STAFF') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm dark:border-white/5 dark:bg-slate-900 text-center flex flex-col items-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-base font-black font-mono uppercase tracking-wider text-slate-900 dark:text-white">
            Administrative Access Denied
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
            Your profile does not possess valid credentials or clearance flags to load this internal dashboard terminal matrix.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full justify-center font-mono text-xs font-bold uppercase tracking-wider">
            <Link 
              to="/" 
              className="w-full sm:w-auto px-6 py-3 bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-xl hover:opacity-90 text-center transition-all duration-200"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** =======================================================
 * MASTER CORE DASHBOARD PLATFORM VIEW LAYOUT ENGINE
 * ======================================================= */
function DashboardLayout() {
  const location = useLocation();
  const { isOpen, title, message, type, onConfirm, closeAlert } = useAlertStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const deferMenuClose = setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 0);

    return () => clearTimeout(deferMenuClose);
  }, [location.pathname]);

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
      
      {/* GLOBAL HEADER */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 dark:border-white/5 dark:bg-brand-dark/50 dark:backdrop-blur-md dark:shadow-none">
        <div className="max-w-7xl mx-auto h-16 md:h-20 flex items-center justify-between px-4 gap-4">
          
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
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <ThemeToggle />
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center focus:outline-none"
              aria-label="Toggle navigation viewport drawer overlay"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* 📱 RESPONSIVE MENU DRAWER */}
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
                  <Lock className="h-4 w-4" /> Access Staff Portal
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

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
          
          {/* 🛡️ SECURITY WRAPPER MATRIX DEPLOYMENT */}
          <Route path="/admin" element={<AdminRouteGuard><AdminWorkspaceGateway /></AdminRouteGuard>} />
          <Route path="/admin/:tournamentId" element={<AdminRouteGuard><AdminWorkspaceGateway /></AdminRouteGuard>} />
          
          <Route path="/about" element={<div className="max-w-7xl mx-auto px-4 mt-6"><UnderConstructionView /></div>} />
          <Route path="/schedule" element={<div className="max-w-7xl mx-auto px-4 mt-6"><UnderConstructionView /></div>} />
          <Route path="/open-play" element={<div className="max-w-7xl mx-auto px-4 mt-6"><UnderConstructionView /></div>} />
          <Route path="/membership" element={<div className="max-w-7xl mx-auto px-4 mt-6"><UnderConstructionView /></div>} />
          
          <Route path="/privacy" element={<div className="max-w-7xl mx-auto px-4 mt-6"><PrivacyPolicyView /></div>} />
          <Route path="/terms" element={<div className="max-w-7xl mx-auto px-4 mt-6"><TermsConditionsView /></div>} />
          <Route path="/cookies" element={<div className="max-w-7xl mx-auto px-4 mt-6"><CookiePolicyView /></div>} />
          <Route path="/report-issue" element={<div className="max-w-7xl mx-auto px-4 mt-6"><ReportIssueView /></div>} />
          
          {/* Catch-all safety redirection route */}
          <Route path="*" element={<Navigate to="/" replace />} />
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