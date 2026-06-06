// client/src/pages/LandingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Trophy, Users, CheckCircle2, ShieldCheck, 
  Sparkles, Zap, Star, ChevronRight, MapPin, Phone
} from 'lucide-react';

interface MarqueeLogo {
  id: string;
  name: string;
  src: string;
  heightClass: string; 
}

const BRAND_LOGOS: MarqueeLogo[] = [
  { id: 'brand-altori', name: 'Altori Park Pickleball', src: '/Altori_Park_Pickleball_Logo.svg', heightClass: 'h-14' },
  { id: 'brand-joola', name: 'Joola Lux', src: '/logos/joola.png', heightClass: 'h-8' },
  { id: 'brand-paddletek', name: 'Paddletek', src: '/logos/paddletek.png', heightClass: 'h-6' },
  { id: 'brand-reiem', name: 'Reiem Digitals', src: '/logos/franklin.png', heightClass: 'h-9 dark:invert' }, 
  { id: 'brand-franklin', name: 'Franklin', src: '/logos/crbn.png', heightClass: 'h-7' },
  { id: 'brand-crbn', name: 'CRBN Labs', src: '/logos/sypik.png', heightClass: 'h-6' },
];

/** =======================================================
 * SELF-CONTAINED STATIC DATA MATRICES (Senior UI/UX Best Practice)
 * ======================================================= */
const SPORTS360_URL = "https://app.sports360.ph/sportshub/altori-park-pickleball";

const AMENITIES = [
  {
    id: "amenity-1",
    num: "01",
    tag: "Surface Spec", 
    title: "Joint-Friendly Cushion Floors",
    description: "Our premium indoor and outdoor courts feature multi-layered cushioning designed to absorb impact and protect your knees. You get maximum comfort during long rallies without sacrificing a perfectly true, consistent ball bounce."
  },
  {
    id: "amenity-2",
    num: "02",
    tag: "Venue Flexibility", 
    title: "Indoor & Outdoor Comfort Play",
    description: "Play your way, rain or shine. Escape the heat on our fully climate-controlled indoor courts featuring advanced airflow systems, or step outside to enjoy top-tier open-air play under the GenSan sky."
  },
  {
    id: "amenity-3",
    num: "03",
    tag: "Match Tracking", 
    title: "Real-Time Live Scoreboards",
    description: "Keep your eyes on the competition. Our courts feature instant digital scoreboard updates, allowing players and spectators to watch local bracket standings and leaderboards shift the second a point is scored."
  }
];

const PLAY_ECOSYSTEM = [
  {
    id: "eco-1",
    title: "Open Play Matches",
    badge: "Community",
    desc: "Dynamic rotational play organized completely by dynamic skill-ratings. Show up solo or with a partner and jump straight into balanced court pairings.",
    cta: "Explore Open Play",
    link: "/open-play",
    isExternal: false
  },
  {
    id: "eco-2",
    title: "Structured Training Blocks",
    badge: "Pro Coaching Available",
    desc: "Accelerate your development paths under accredited coaches. Gain structural masterclass guidance on mechanical drills, dink strategies, and positioning safety.",
    cta: "Book Training Session",
    link: SPORTS360_URL,
    isExternal: true
  },
  {
    id: "eco-3",
    title: "Private Venue Reservations",
    badge: "Exclusive",
    desc: "Reserve elite court blocks for corporate tournaments, private mixers, or targeted team training schedules. Full automated scoreboard integration included.",
    cta: "Secure Court Bookings",
    link: SPORTS360_URL,
    isExternal: true
  }
];

const MEMBERSHIP_TIERS = [
  {
    name: "Club Pass",
    price: "1,500",
    billing: "per month",
    desc: "Perfect for social players stepping onto competitive cushion courts regularly.",
    features: [
      "Access to premium indoor court tracking",
      "Standard 3-day advanced booking window",
      "Entry eligibility into community open play",
      "Standard rating tracking ledger analytics"
    ],
    isPopular: false,
    accentColor: "border-slate-200 dark:border-slate-800"
  },
  {
    name: "Pro Advantage",
    price: "3,500",
    billing: "per month",
    desc: "Optimized for dedicated athletes looking to scale up match parity and bracket placement.",
    features: [
      "Priority 7-day advanced court booking matrix",
      "10% discount on all local arena training blocks",
      "Complimentary access to weekly Open Play Mixers",
      "Premium bracket seed profiling updates"
    ],
    isPopular: true,
    accentColor: "border-slate-200 dark:border-[#64317C] shadow-lg shadow-[#64317C]/5"
  },
  {
    name: "Elite Gold Elite",
    price: "6,000",
    billing: "per month",
    desc: "The ultimate tier for maximum accessibility, performance tracking, and network perks.",
    features: [
      "Unrestricted 14-day advanced priority reservations",
      "Free select entry tokens to official live tournaments",
      "All community matching mixer pools fully un-metered",
      "Advanced metric exports and video review access paths"
    ],
    isPopular: false,
    accentColor: "border-slate-200 dark:border-slate-800"
  }
];

const TESTIMONIALS = [
  {
    quote: "The court layout here is unmatched. The pro-cushion surface completely saves your knees during lengthy competitive baseline rallies, and watching points render live on the screen keeps everyone locked in.",
    author: "Marc D.",
    role: "Tournament Division Competitor"
  },
  {
    quote: "Booking via the sports360 dashboard is effortless, and having access to real-time skill-matched mixers means I get top-tier games every single time I show up.",
    author: "Sarah L.",
    role: "Open Play regular"
  }
];

/** =======================================================
 * MAIN REDESIGNED PREVIEW COMPONENT EXPORT
 * ======================================================= */
export function LandingPage() {
  return (
    <div className="animate-in fade-in duration-300 w-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen font-sans selection:bg-[#088505]/30">
      
      {/* 1. HIGH-IMPACT HERO CORE SECTION */}
      <section className="relative overflow-hidden py-28 lg:py-40 bg-slate-900 text-white w-full border-b border-slate-800/60">
        {/* Background Graphic Asset Accents */}
        <div className="absolute inset-0 z-0 opacity-20 mix-blend-luminosity pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1600" 
            alt="Indoor Sports Cushion Court" 
            className="w-full h-full object-cover object-center scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950" />
        </div>

        {/* Ambient Blur Nodes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 sm:w-125 h-96 sm:h-125 bg-[#64317C]/20 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#088505]/10 rounded-full blur-[100px] pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#64317C]/20 border border-[#64317C]/40 rounded-full text-xs font-mono font-black text-purple-400 uppercase tracking-wider backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} /> Premium Indoor & Outdoor Facility
            </span>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.95] uppercase font-sans">
              Built for the Game <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#088505] via-emerald-400 to-teal-400 italic font-serif normal-case tracking-normal">
                Engineered for You
              </span>
            </h1>
            
            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-medium">
              Step onto General Santos City's premier pickleball facility. Whether you prefer our premium climate-controlled indoor cushion courts or playing under the open sky on our outdoor courts, we offer a top-tier athletic center built for true competitors.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              <Link 
                to="/tournaments" 
                className="bg-[#088505] hover:bg-[#066404] text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl transition-all shadow-lg shadow-[#088505]/20 flex items-center gap-2 group cursor-pointer"
              >
                Explore Tournament Hub <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href={SPORTS360_URL}
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-slate-800/80 border border-slate-700 text-slate-200 hover:bg-slate-700 font-bold text-xs uppercase tracking-widest px-7 py-4 rounded-xl transition-all backdrop-blur-xs flex items-center gap-1.5 cursor-pointer"
              >
                Reserve Active Court
              </a>
            </div>
          </div>
          
          {/* Hero Standalone Feature Widget */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="p-1 bg-gradient-to-br from-[#64317C] to-transparent rounded-3xl shadow-2xl shadow-black/40">
              <div className="bg-slate-950/90 rounded-[22px] p-6 space-y-6 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="text-left">
                    <div className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">Venue Location</div>
                    <div className="text-lg font-black font-sans uppercase text-slate-200 flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-rose-500" /> Altori Park Pickleball
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-[#64317C]/20 border border-[#64317C]/40 rounded-lg text-[10px] font-mono font-bold text-purple-300 uppercase tracking-wide">
                    8 Courts Available
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-left">
                    <div className="h-10 w-10 rounded-lg bg-[#64317C]/10 border border-[#64317C]/20 flex items-center justify-center shrink-0 text-[#64317C]">
                      <Trophy className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-300 tracking-wide">Tournament Ready Courts</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Instant ladder advancement math processed natively across live court scores.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-left">
                    <div className="h-10 w-10 rounded-lg bg-[#088505]/10 border border-[#088505]/20 flex items-center justify-center shrink-0 text-[#088505]">
                      <Users className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-300 tracking-wide">Balanced Open Play</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Automated player metrics guarantee competitive parity across matches.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INFINITE BRAND PERFORMANCE MARQUEE */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-white/5 py-8 overflow-hidden relative w-full select-none">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes infiniteMarquee {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          .animate-marquee-slow {
            display: flex;
            width: max-content;
            animation: infiniteMarquee 35s linear infinite;
          }
          .animate-marquee-slow:hover {
            animation-play-state: paused;
          }
        `}} />

        <div className="absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-slate-50 via-slate-50/20 to-transparent dark:from-slate-950 dark:via-slate-950/20 z-20 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-slate-50 via-slate-50/20 to-transparent dark:from-slate-950 dark:via-slate-950/20 z-20 pointer-events-none" />

        <div className="w-full flex items-center overflow-hidden">
          <div className="animate-marquee-slow flex items-center pl-4">
            <div className="flex items-center gap-16 sm:gap-24 shrink-0 pr-16 sm:pr-24">
              {BRAND_LOGOS.map((logo) => (
                <img
                  key={logo.id}
                  src={logo.src}
                  alt={`${logo.name} Corporate Logo`}
                  className={`${logo.heightClass} w-auto object-contain shrink-0 grayscale opacity-55 hover:opacity-100 hover:grayscale-0 transition-all duration-200 cursor-pointer`}
                  loading="lazy"
                />
              ))}
            </div>
            <div className="flex items-center gap-16 sm:gap-24 shrink-0 pr-16 sm:pr-24" aria-hidden="true">
              {BRAND_LOGOS.map((logo) => (
                <img
                  key={`${logo.id}-duplicate`}
                  src={logo.src}
                  alt={`${logo.name} Corporate Logo`}
                  className={`${logo.heightClass} w-auto object-contain shrink-0 grayscale opacity-55 hover:opacity-100 hover:grayscale-0 transition-all duration-200 cursor-pointer`}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. VENUE AMENITIES SECTION */}
      <section className="py-24 max-w-7xl mx-auto px-4 w-full border-b border-slate-200/60 dark:border-slate-900">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
          <span className="text-[10px] font-mono font-black text-[#64317C] dark:text-purple-400 px-3 py-1 bg-[#64317C]/5 dark:bg-[#64317C]/10 rounded-full uppercase tracking-widest">
            Premium Infrastructure
          </span>
          <h2 className="text-3xl font-black uppercase text-slate-900 dark:text-white tracking-tight pt-2">
            Built for Every Game
          </h2>
          <div className="h-1 w-12 bg-[#088505] mx-auto mt-3 rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {AMENITIES.map((amenity) => (
            <div 
              key={amenity.id} 
              className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-xs dark:bg-slate-900/20 dark:border-white/5 space-y-4 text-left hover:border-[#64317C]/40 dark:hover:border-[#64317C]/40 transition-all duration-300 group hover:-translate-y-0.5"
            >
              <div className="text-xs font-black font-mono text-[#64317C] dark:text-purple-400 group-hover:text-[#088505] dark:group-hover:text-emerald-400 transition-colors">
                {amenity.num} / {amenity.tag}
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                {amenity.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {amenity.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. DAILY PLAY ECOSYSTEM HOOK SECTION */}
      <section className="py-24 bg-slate-100 dark:bg-slate-900/10 border-b border-slate-200/60 dark:border-slate-900 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
            <span className="text-[10px] font-mono font-black text-[#088505] dark:text-emerald-400 px-3 py-1 bg-[#088505]/5 dark:bg-[#088505]/10 rounded-full uppercase tracking-widest">
              Daily Operations
            </span>
            <h2 className="text-3xl font-black uppercase text-slate-900 dark:text-white tracking-tight pt-2">
              The Court Play Ecosystem
            </h2>
            <div className="h-1 w-12 bg-[#64317C] mx-auto mt-3 rounded" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {PLAY_ECOSYSTEM.map((eco) => (
              <div 
                key={eco.id} 
                className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col justify-between items-start text-left shadow-xs hover:shadow-md transition-all duration-300"
              >
                <div className="space-y-4 w-full">
                  <div className="flex justify-between items-center gap-4">
                    <span className="px-2.5 py-0.5 rounded-md font-mono text-[9px] font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {eco.badge}
                    </span>
                    <Zap className="h-4 w-4 text-[#088505] opacity-40" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                    {eco.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {eco.desc}
                  </p>
                </div>
                
                <div className="w-full pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/60">
                  {eco.isExternal ? (
                    <a 
                      href={eco.link}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-[#64317C] dark:hover:bg-[#64317C] text-white font-bold font-mono py-3 rounded-xl text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {eco.cta} <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <Link 
                      to={eco.link}
                      className="w-full bg-[#088505] hover:bg-opacity-95 text-white font-bold font-mono py-3 rounded-xl text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shadow-[#088505]/10"
                    >
                      {eco.cta} <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. MEMBERSHIP MATRIX SECTION */}
      <section className="py-24 max-w-7xl mx-auto px-4 w-full border-b border-slate-200/60 dark:border-slate-900">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
          <span className="text-[10px] font-mono font-black text-[#64317C] dark:text-purple-400 px-3 py-1 bg-[#64317C]/5 dark:bg-[#64317C]/10 rounded-full uppercase tracking-widest">
            Club Pricing Matrix
          </span>
          <h2 className="text-3xl font-black uppercase text-slate-900 dark:text-white tracking-tight pt-2">
            Unlock Full Arena Access
          </h2>
          <div className="h-1 w-12 bg-[#088505] mx-auto mt-3 rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {MEMBERSHIP_TIERS.map((tier) => (
            <div 
              key={tier.name}
              className={`relative bg-white dark:bg-slate-900/40 border rounded-2xl p-6 sm:p-8 flex flex-col justify-between text-left transition-all duration-300 ${tier.accentColor}`}
            >
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#64317C] text-white rounded-full text-[9px] font-mono font-black uppercase tracking-widest shadow-sm">
                  ⚡ Most Requested Tier
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">{tier.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{tier.desc}</p>
                </div>

                <div className="flex items-baseline gap-1 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">₱{tier.price}</span>
                  <span className="text-xs text-slate-400 font-mono">/ {tier.billing}</span>
                </div>

                <ul className="space-y-3 text-xs">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-[#088505] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8 mt-6">
                <a 
                  href={SPORTS360_URL}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`w-full font-bold font-mono py-3.5 rounded-xl text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                    tier.isPopular 
                      ? 'bg-[#64317C] text-white hover:bg-opacity-95' 
                      : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700'
                  }`}
                >
                  Acquire Access Key <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. TOURNAMENT HUB FLAGSHIP INTERACTIVE SHOWCASE */}
      <section className="py-12 max-w-7xl mx-auto px-4 w-full">
        <div className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-8 sm:p-12 text-left border border-slate-800 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#088505]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#64317C]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              🔥 Open Registrations Active
            </span>
            <h3 className="text-2xl sm:text-4xl font-black font-sans uppercase tracking-tight leading-tight">
              Ready to claim your place <br />
              inside the arena leaderboard?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
              Don't miss our flagship championship brackets. Secure your roster tracking allocation slots now or step onto visitors streams to follow active match data arrays live.
            </p>
            <div className="pt-4">
              <Link 
                to="/tournaments" 
                className="inline-flex bg-[#088505] hover:bg-opacity-95 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl transition-all shadow-md shadow-[#088505]/10 items-center gap-2 group cursor-pointer"
              >
                View Live & Upcoming Tournaments <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. DYNAMIC SOCIAL PROOF GRID LAYOUT & HIGH-DENSITY RESPONSIVE FOOTER */}
      <section className="py-24 bg-slate-100 dark:bg-slate-900/20 w-full border-t border-slate-200/60 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-4 text-left space-y-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />)}
              </div>
              <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white tracking-tight">
                Validated By Our Player Network
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Hear from tournament vectors and community open-play regulars across General Santos City.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {TESTIMONIALS.map((test, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 text-left flex flex-col justify-between shadow-xs">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic font-medium">
                    "{test.quote}"
                  </p>
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">{test.author}</span>
                    <span className="text-slate-400 dark:text-slate-500">{test.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* =========================================================================
           * 💻 & 📱 HIGH-DENSITY IMMERSIVE MULTI-COLUMN RESPONSIVE FOOTER COMPONENT
           * ========================================================================= */}
          <footer className="mt-24 pt-16 border-t border-slate-200 dark:border-slate-800/60 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 pb-12">
              
              {/* BLOCK 1: DEPLOYMENT STACK LOGO BRIEF BRANDING LAYOUT */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#64317C] dark:text-purple-400" />
                  <span className="font-mono font-black uppercase text-xs tracking-wider text-slate-900 dark:text-white">
                    Altori Park Pickleball
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
                    <Link to="/about" className="text-slate-500 hover:text-[#088505] dark:text-slate-400 dark:hover:text-emerald-400 inline-flex items-center gap-1 transition-colors">
                      <ChevronRight className="h-3 w-3 opacity-50" /> About Arena
                    </Link>
                  </li>
                  <li>
                    <Link to="/tournaments" className="text-slate-500 hover:text-[#088505] dark:text-slate-400 dark:hover:text-emerald-400 inline-flex items-center gap-1 transition-colors">
                      <ChevronRight className="h-3 w-3 opacity-50" /> Tournaments List
                    </Link>
                  </li>
                  <li>
                    <Link to="/schedule" className="text-slate-500 hover:text-[#088505] dark:text-slate-400 dark:hover:text-emerald-400 inline-flex items-center gap-1 transition-colors">
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
                    <Link to="/privacy" className="text-slate-500 hover:text-[#64317C] dark:text-slate-400 dark:hover:text-purple-400 inline-flex items-center gap-1 transition-colors">
                      <ChevronRight className="h-3 w-3 opacity-50" /> Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-slate-500 hover:text-[#64317C] dark:text-slate-400 dark:hover:text-purple-400 inline-flex items-center gap-1 transition-colors">
                      <ChevronRight className="h-3 w-3 opacity-50" /> Terms & Rules
                    </Link>
                  </li>
                  <li>
                    <Link to="/cookies" className="text-slate-500 hover:text-[#64317C] dark:text-slate-400 dark:hover:text-purple-400 inline-flex items-center gap-1 transition-colors">
                      <ChevronRight className="h-3 w-3 opacity-50" /> Cookie Maps
                    </Link>
                  </li>
                </ul>
              </div>

              {/* BLOCK 4: REGIONAL GEO-COORDINATION ADAPTER LAYER */}
              <div className="lg:col-span-3 space-y-3 text-slate-500 dark:text-slate-400 text-xs">
                <h4 className="font-mono font-black uppercase text-[10px] tracking-widest text-slate-400 dark:text-slate-500">
                  Venue Location
                </h4>
                <ul className="space-y-2.5 font-sans font-medium">
                  <li className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-600 shrink-0 mt-0.5" />
                    <span>Altori Park Pickleball, Matatag Park Square, Nunez Ext St, General Santos City, Philippines</span>
                  </li>
                  <li className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>+63 (083) 552-ALTORI</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CORE BASE LEVEL FOOTPRINT ATTRIBUTION ROWS */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-1.5 text-center sm:text-left">
                <ShieldCheck className="h-4 w-4 text-[#088505]" /> 
                <span>Altori Park Pickleball • All Rights Reserved • Powered by Reiem Digitals</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400/50 dark:text-slate-600">
                <span>© {new Date().getFullYear()} Altori Park</span>
              </div>
            </div>
          </footer>

        </div>
      </section>

    </div>
  );
}