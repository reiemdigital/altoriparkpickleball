// client/src/pages/SupportViews.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAlertStore } from '../store/useAlertStore';
import { ShieldCheck, Scale, Cookie, AlertCircle, Send, HardHat, Trophy } from 'lucide-react';

/** =======================================================
 * DEDICATED POLICY COMPONENT SUITE VIEWS
 * ======================================================= */

export function PrivacyPolicyView() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-left space-y-6 animate-in fade-in duration-200 font-sans">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-4">
        <ShieldCheck className="h-6 w-6 text-[#64317C]" />
        <h1 className="text-xl font-black font-mono uppercase text-slate-900 dark:text-white tracking-tight">Privacy Policy</h1>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Last Updated: May 2026</p>
      <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <h3 className="text-sm font-bold text-[#64317C] uppercase font-mono">1. Data Storage & System Logging</h3>
        <p>Altori Park Pickleball stores tournament profiles, category preferences, matching pools, and historical match stats. Our platform streams live point allocations across open networks using Socket.io architecture.</p>
        <h3 className="text-sm font-bold text-[#64317C] uppercase font-mono">2. Administrative Credential Safety</h3>
        <p>Administrative validation passcodes and bearer JSON Web Tokens (JWT) are cached inside temporary browser session structures. We run secure authorization validation scripts to prevent malicious token spoofing vectors.</p>
      </div>
      <Link to="/" className="inline-block mt-4 text-xs font-mono font-bold text-[#088505] hover:underline">➔ Return Home</Link>
    </div>
  );
}

export function TermsConditionsView() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-left space-y-6 animate-in fade-in duration-200 font-sans">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-4">
        <Scale className="h-6 w-6 text-[#64317C]" />
        <h1 className="text-xl font-black font-mono uppercase text-slate-900 dark:text-white tracking-tight">Terms & Conditions</h1>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Last Updated: May 2026</p>
      <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <h3 className="text-sm font-bold text-[#64317C] uppercase font-mono">1. Fair Play & Walkover Disqualifications</h3>
        <p>Teams registering for competitive categories must occupy their assigned court within the scheduled tournament bounds. Failure to appear will invoke an automated loss state and a permanent **-11 PTS** penalty adjustment tracking marker.</p>
      </div>
      <Link to="/" className="inline-block mt-4 text-xs font-mono font-bold text-[#088505] hover:underline">➔ Return Home</Link>
    </div>
  );
}

export function CookiePolicyView() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-left space-y-6 animate-in fade-in duration-200 font-sans">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-4">
        <Cookie className="h-6 w-6 text-[#64317C]" />
        <h1 className="text-xl font-black font-mono uppercase text-slate-900 dark:text-white tracking-tight">Cookie Policy</h1>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Last Updated: May 2026</p>
      <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <h3 className="text-sm font-bold text-[#64317C] uppercase font-mono">1. Essential State Storage Only</h3>
        <p>Our platform uses structural local session variables and verification headers to preserve state across application tabs. We explicitly do not drop advertisement cookies or track operations outside of our system's network space.</p>
      </div>
      <Link to="/" className="inline-block mt-4 text-xs font-mono font-bold text-[#088505] hover:underline">➔ Return Home</Link>
    </div>
  );
}

/** =======================================================
 * PREMIUM INTERACTIVE REPORT ISSUE VIEW COMPONENT
 * ======================================================= */
export function ReportIssueView() {
  const triggerAlert = useAlertStore((state) => state.triggerAlert);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Low');

  const handleSubmitIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) {
      triggerAlert({ title: "Validation Error", message: "Please supply all field details completely.", type: "error" });
      return;
    }
    triggerAlert({ title: "Ticket Dispatched", message: `System Diagnostic Ticket logged successfully.\nSeverity: ${severity}`, type: "success" });
    setSubject('');
    setDescription('');
  };

  return (
    <div className="max-w-md mx-auto py-12 px-6 bg-white border border-slate-200 rounded-3xl shadow-sm dark:bg-slate-900/40 dark:border-white/5 text-left font-sans animate-in fade-in duration-200">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4 mb-6">
        <AlertCircle className="h-5 w-5 text-amber-500" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">Report Terminal Issue</h3>
      </div>
      <form onSubmit={handleSubmitIssue} className="space-y-4 text-xs">
        <div className="flex flex-col gap-1.5">
          <label className="font-mono font-bold uppercase text-slate-500">Incident Target Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Court 03 score lag" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-mono font-bold uppercase text-slate-500">Impact Classification</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 dark:bg-slate-950 dark:border-white/10 dark:text-white focus:outline-none">
            <option value="Low">Low - Cosmetic Glitch</option>
            <option value="Medium">Medium - Delays Deploys</option>
            <option value="Critical">Critical - Freezes Brackets</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-mono font-bold uppercase text-slate-500">Diagnostic Description</label>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain exactly what happened..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 dark:bg-slate-950 dark:border-white/10 dark:text-white resize-none focus:outline-none" />
        </div>
        <button type="submit" className="w-full bg-linear-to-r from-amber-500 to-orange-600 text-white font-bold font-mono py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer">
          <Send className="h-3.5 w-3.5" /> Dispatch Ticket
        </button>
      </form>
    </div>
  );
}

/** =======================================================
 * UX-FRIENDLY "UNDER CONSTRUCTION" FALLBACK COMPONENT
 * ======================================================= */
export function UnderConstructionView() {
  const location = useLocation();
  const activeRouteLabel = location.pathname.replace('/', '').replace('-', ' ');

  return (
    <div className="max-w-md mx-auto py-20 px-6 text-center space-y-6 animate-in fade-in duration-200">
      <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
        <HardHat className="h-8 w-8 animate-bounce" />
      </div>
      <div className="space-y-2">
        <span className="text-[10px] font-mono font-black text-[#64317C] px-2.5 py-1 bg-purple-50 dark:bg-purple-500/10 rounded-md">Module Active Pipeline</span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight font-mono pt-1">{activeRouteLabel} Portal</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">Our engineering team is packaging this asset module context for the cloud. Roster integration hooks will activate shortly!</p>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <Link to="/tournaments" className="bg-[#088505] text-white font-bold font-mono py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer">
          <Trophy className="h-3.5 w-3.5" /> View Active Tournaments
        </Link>
      </div>
    </div>
  );
}