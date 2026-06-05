// client/src/App.tsx
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlertStore } from './store/useAlertStore'; 
import { RefereePortal } from './components/RefereePortal';
import { ThemeToggle } from './components/ThemeToggle';
import { Lock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

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

  return (
    <main className="min-h-screen pb-12 bg-slate-50 text-slate-900 dark:bg-brand-dark dark:text-white transition-colors duration-200 flex flex-col">
      
      <header className="p-2 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 dark:border-white/5 dark:bg-brand-dark/50 dark:backdrop-blur-md dark:shadow-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-2">
          
          {/* BRAND LINK HUB WITH LOGO IMAGE AND BRAND TEXT */}
          <Link to="/" className="flex items-center gap-2.5 group hover:opacity-95 cursor-pointer select-none shrink-0">
            <img 
              src="/Altori_Park_Pickleball_Logo.svg" 
              alt="Altori Park Logo" 
              className="h-18 w-18 object-contain transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                // Fallback asset mapping layer if target relative address paths vary
                const target = e.target as HTMLImageElement;
                if (target.src !== window.location.origin + '/assets/logo.png') {
                  target.src = '/assets/logo.png';
                }
              }}
            />
            <h1 className="text-lg font-black tracking-tighter text-[#64317C] italic uppercase dark:text-purple-400">
              Altori Park <span className="text-[#088505]">Pickleball</span>
            </h1>
          </Link>

          <nav className="flex items-center flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-mono font-black uppercase tracking-wider">
            <Link to="/about" className="text-slate-500 dark:text-slate-400 hover:text-[#088505]">About Us</Link>
            <Link to="/schedule" className="text-slate-500 dark:text-slate-400 hover:text-[#088505]">Courts Schedule</Link>
            <Link to="/open-play" className="text-slate-500 dark:text-slate-400 hover:text-[#088505]">Open Play</Link>
            <Link to="/membership" className="text-slate-500 dark:text-slate-400 hover:text-[#088505]">Membership</Link>
            <Link to="/tournaments" className={`hover:text-[#088505] transition-colors ${location.pathname.includes('/tournament') ? 'text-[#088505]' : 'text-slate-500 dark:text-slate-400'}`}>Tournaments</Link>
            
            <Link 
              to="/admin" 
              className="text-slate-400 dark:text-slate-500 hover:text-purple-500 dark:hover:text-purple-400 border-l border-slate-200 dark:border-white/10 pl-5 normal-case tracking-normal font-sans font-semibold flex items-center gap-1"
            >
              <Lock className="h-3 w-3" /> Staff Portal
            </Link>
          </nav>
          
          <div className="flex items-center gap-4 shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

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