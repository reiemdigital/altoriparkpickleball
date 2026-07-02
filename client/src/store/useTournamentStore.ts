// client/src/store/useTournamentStore.ts
import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.PROD 
  ? window.location.origin 
  : 'http://192.168.8.110:5001'; 

export interface TournamentEvent {
  id: string;
  title: string;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED' | 'COMPLETED';
  start_date: string;
  end_date: string;
  venue_name: string;
  court_count: number;
  guidelines_url?: string;
  cover_url?: string;
}

export interface TournamentCategory {
  category_type: string;
  category_id: string;
  tournament_id: string;
  category_name: string;
  max_slots: number;
  registered_teams_count: number;
  available_slots_remaining: number;
  gender_division?: 'Mixed' | 'Male' | 'Female';
  entry_fee?: number;
  prize_first?: number;
  prize_second?: number;
  prize_third?: number;
}

export interface Match {
  id: string;
  tournament_id: string;
  category_id: string;
  team1_id: string | null;
  team2_id: string | null;
  court_id: number | null;
  team1_score: number;
  team2_score: number;
  status: 'PENDING' | 'LIVE' | 'FINISHED';
  referee_name: string | null;
  pin_code: string | null;
  match_type: 'ROUND_ROBIN' | 'ELIMINATION';
  
  // 🚀 UPDATED CONTRACT: Expanded bracket enum string union vectors to natively map Quarter-Final tracking keys
  bracket_position: 'QF1' | 'QF2' | 'QF3' | 'QF4' | 'SF1' | 'SF2' | 'FINALS' | '3RD_PLACE' | null;
  
  started_at: string | null;
  ended_at: string | null;
  
  team1?: { team_name: string; group_id?: string | null };
  team2?: { team_name: string; group_id?: string | null };
  category?: { name: string };
  
  score1?: number;
  score2?: number;
  refereeName?: string | null;
  pinCode?: string | null;
  courtId?: number | null;
}

export interface TeamStanding {
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
}

export interface GatewayData {
  isAdmin: boolean;
  tournament: TournamentEvent | null;
  categories: TournamentCategory[];
  stats: {
    liveMatchesCount: number;
    registeredPlayersCount: number;
  };
}

interface TournamentState {
  tournaments: TournamentEvent[];
  activeTournamentId: string | null;
  gatewayData: GatewayData;
  matches: Match[];
  standings: TeamStanding[];
  history: Match[];
  
  setTournaments: (tournaments: TournamentEvent[]) => void;
  setActiveTournamentId: (id: string | null) => void;
  setGatewayData: (data: GatewayData) => void;
  setMatches: (matches: Match[]) => void;
  setStandings: (standings: TeamStanding[]) => void;
  setHistory: (history: Match[]) => void;
  updateMatch: (updatedMatch: Match) => void;
  
  addTournament: (tournamentData: Omit<TournamentEvent, 'id' | 'status'>) => Promise<TournamentEvent>;
  updateTournamentInStore: (id: string, updatedData: Partial<TournamentEvent>) => Promise<TournamentEvent>;
  deleteTournamentFromStore: (id: string) => Promise<void>;
  fetchSingleMatchDetails: (matchId: string) => Promise<Match | null>;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  activeTournamentId: null,
  gatewayData: {
    tournament: null,
    categories: [],
    stats: { liveMatchesCount: 0, registeredPlayersCount: 0 },
    isAdmin: false
  },
  matches: [],
  standings: [],
  history: [],

  setTournaments: (tournaments) => set({ tournaments }),
  setActiveTournamentId: (activeTournamentId) => set({ activeTournamentId }),
  setGatewayData: (gatewayData) => set({ gatewayData }),
  setMatches: (matches) => set({ matches }),
  setStandings: (standings) => set({ standings }),
  setHistory: (history) => set({ history }),

  updateMatch: (updatedMatch) => set((state) => {
    const matchExists = state.matches.some((m) => m.id === updatedMatch.id);
    return {
      matches: matchExists
        ? state.matches.map((m) => m.id === updatedMatch.id ? updatedMatch : m)
        : [...state.matches, updatedMatch]
    };
  }),

  addTournament: async (tournamentData) => {
    const response = await axios.post<TournamentEvent>(
      `${API_URL}/api/tournaments`, 
      tournamentData, 
      { withCredentials: true }
    );
    set((state) => ({ tournaments: [...state.tournaments, response.data] }));
    return response.data;
  },

  updateTournamentInStore: async (id, updatedData) => {
    const response = await axios.put<TournamentEvent>(
      `${API_URL}/api/tournaments/${id}`, 
      updatedData, 
      { withCredentials: true }
    );
    
    set((state) => ({
      tournaments: state.tournaments.map((t) => (t.id === id ? response.data : t)),
      gatewayData: state.gatewayData.tournament?.id === id 
        ? { ...state.gatewayData, tournament: response.data } 
        : state.gatewayData
    }));
    return response.data;
  },

  deleteTournamentFromStore: async (id) => {
    await axios.delete(
      `${API_URL}/api/tournaments/${id}`, 
      { withCredentials: true }
    );
    
    const isCurrentActive = get().activeTournamentId === id;

    set((state) => ({
      tournaments: state.tournaments.filter((t) => t.id !== id),
      activeTournamentId: isCurrentActive ? null : state.activeTournamentId,
      gatewayData: isCurrentActive 
        ? { tournament: null, categories: [], stats: { liveMatchesCount: 0, registeredPlayersCount: 0 }, isAdmin: false } 
        : state.gatewayData
    }));
  },

  fetchSingleMatchDetails: async (matchId) => {
    try {
      const response = await axios.get<Match[]>(`${API_URL}/api/tournaments/all/matches-lookup-fallback`);
      const targetedMatch = response.data.find(m => m.id === matchId);
      if (targetedMatch) {
        get().updateMatch(targetedMatch);
        return targetedMatch;
      }
      return null;
    } catch {
      return null;
    }
  }
}));