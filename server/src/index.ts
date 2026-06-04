// server/src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser'; 
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path'; //  ADDED: Essential for production asset path resolution
// FIXED: Retained explicit .js extension for ES Module runtime compliance under NodeNext resolution
import { supabase } from './config/supabase.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const JWT_SECRET = process.env.JWT_SECRET || 'altori_park_super_secret_key_2026';

/** =======================================================
 * DATA MODEL INTERFACES FOR STRICT TYPE-CHECKING
 * ======================================================= */
interface Team {
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
  address?: string | null;
  contact_no?: string | null;
  email?: string | null;
}

interface Match {
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
  bracket_position: 'SF1' | 'SF2' | 'FINALS' | null;
  started_at: string | null;
  ended_at: string | null;
  team1?: { team_name: string };
  team2?: { team_name: string };
  category?: { name: string };
}

// Configured the Express CORS policies with exact development origin arrays
app.use(cors({
  origin: [
    'http://192.168.8.110:3000', 
    'http://192.168.8.110:3001', 
    'http://192.168.8.110:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173'
  ],
  credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

const io = new Server(httpServer, { 
  cors: { 
    origin: [
      'http://192.168.8.110:3000', 
      'http://192.168.8.110:3001', 
      'http://192.168.8.110:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173'
    ],
    credentials: true 
  } 
});

/** =======================================================
 * SECURITY INTEGRATION & CLEARANCE GATEKEEPING MIDDLEWARE
 * ======================================================= */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'Admin' | 'Staff';
  };
}

const requireAuth = (roles?: ('Admin' | 'Staff')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token = req.cookies?.token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No session token provided.' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: 'Admin' | 'Staff' };
      req.user = decoded;

      if (roles && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden. You do not have clearance for this action.' });
      }

      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }
  };
};

const CATEGORIES = [
  "Open Singles",
  "Open Doubles(Coed)",
  "Intermediate Men's Double",
  "Intermediate Women's Double",
  "Intermediate Mixed Doubles",
  "Novice Mens Doubles",
  "Novice Woman's Doubles",
  "Novice Mixed Doubles",
  "Rookie(Coed) Doubles",
  "Juniors(17yrs old and below)",
  "50+ men's Doubles"
];

const activeLiveSessions: Record<string, { refereeName: string; pinCode: string }> = {};

/** =======================================================
 * SOCKET.IO DYNAMIC TOURNAMENT ROOM ROUTING MATRIX
 * ======================================================= */
io.on('connection', (socket: Socket) => {
  console.log('Device connected to Telemetry Engine:', socket.id);

  socket.on('join-tournament-room', (tournamentId: string) => {
    socket.join(`tournament:${tournamentId}`);
    console.log(`📡 Client ${socket.id} joined isolated stream room: tournament:${tournamentId}`);
  });

  socket.on('leave-tournament-room', (tournamentId: string) => {
    socket.leave(`tournament:${tournamentId}`);
    console.log(`🚪 Client ${socket.id} exited stream room: tournament:${tournamentId}`);
  });

  socket.on('update-score', async (data: { matchId: string; score1: number; score2: number }) => {
    try {
      const { data: updated, error } = await supabase
        .from('matches')
        .update({ team1_score: data.score1, team2_score: data.score2 })
        .eq('id', data.matchId)
        .select('*')
        .single();

      if (error || !updated) return;

      const session = activeLiveSessions[updated.id] || { refereeName: "Official Staff", pinCode: "" };
      io.to(`tournament:${updated.tournament_id}`).emit('score-live', { ...updated, ...session });
    } catch (err) {
      console.error("Socket scoring update loop failure:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
  });
});

/** =======================================================
 * AUTHENTICATION & CREDENTIAL DISPATCH ROUTES
 * ======================================================= */

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please supply a username and password.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('username', username.trim())
      .maybeSingle();

    if (error || !user) {
      return res.status(400).json({ error: 'Invalid clearance credentials.' });
    }

    if (user.password !== password) {
      return res.status(400).json({ error: 'Invalid clearance credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, 
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000 
    });

    return res.json({ success: true, role: user.role, token });
  } catch {
    return res.status(500).json({ error: 'Authentication internal handler engine crash.' });
  }
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ success: true });
});

/** =======================================================
 * TOURNAMENT DIRECTORY & ENRICHED CRUD ROUTES
 * ======================================================= */

app.get('/api/tournaments', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json(data);
  } catch {
    return res.status(500).json({ error: "Failed to compile tournament listings internal state." });
  }
});

app.get('/api/admin/assigned-tournaments', requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized profile mapping.' });

  try {
    if (req.user.role === 'Admin') {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) return res.status(400).json({ error: error.message });
      return res.json(data);
    }

    const { data: assignments, error: assignError } = await supabase
      .from('tournament_assignments')
      .select('tournament_id, tournaments(*)')
      .eq('user_id', req.user.id);

    if (assignError) return res.status(400).json({ error: assignError.message });

    const filteredTournaments = (assignments || [])
      .map((item: any) => item.tournaments)
      .filter(Boolean);

    return res.json(filteredTournaments);
  } catch {
    return res.status(500).json({ error: 'Failed compiling authorized tournament matrix vectors.' });
  }
});

app.get('/api/tournaments/:tournamentId/gateway', async (req: Request, res: Response) => {
  const { tournamentId } = req.params;

  try {
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .maybeSingle();

    if (tournamentError) {
      return res.status(400).json({ error: tournamentError.message });
    }

    if (!tournament) {
      return res.status(404).json({ error: "Target tournament instance not found inside data registries." });
    }

    const { data: categories, error: categoriesError } = await supabase
  .from('tournament_categories_matrix') // 🔥 SWAPPED: Now targets our dynamic, self-calculating view
  .select('*')
  .eq('tournament_id', tournamentId);

if (categoriesError) {
  return res.status(400).json({ error: categoriesError.message });
}

    const { count: liveMatchesCount, error: matchesCountError } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('status', 'LIVE');

    if (matchesCountError) {
      return res.status(400).json({ error: matchesCountError.message });
    }

    const { count: registeredPlayersCount, error: teamsCountError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    if (teamsCountError) {
      return res.status(400).json({ error: teamsCountError.message });
    }

    return res.status(200).json({
      tournament,
      categories: categories || [],
      stats: {
        liveMatchesCount: liveMatchesCount || 0,
        registeredPlayersCount: registeredPlayersCount || 0
      }
    });

  } catch {
    return res.status(500).json({ error: "Failed to compile complete gateway dynamic data maps safely." });
  }
});

app.post('/api/tournaments', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { title, start_date, end_date, venue_name, court_count, guidelines_url } = req.body;

  if (!title || !start_date || !end_date || !venue_name) {
    return res.status(400).json({ error: "Validation Failure: Required parameter data points missing." });
  }

  try {
    const { data: newTournament, error } = await supabase
      .from('tournaments')
      .insert([
        {
          title: title.trim(),
          start_date,
          end_date,
          venue_name: venue_name.trim(),
          court_count: parseInt(court_count, 10) || 4,
          guidelines_url: guidelines_url || null,
          status: 'UPCOMING'
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json(newTournament);
  } catch {
    return res.status(500).json({ error: "Internal processing crash creating tournament." });
  }
});

app.put('/api/tournaments/:id', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, start_date, end_date, venue_name, court_count, status, guidelines_url } = req.body;

  try {
    const { data: updatedTournament, error } = await supabase
      .from('tournaments')
      .update({
        title: title?.trim(),
        start_date,
        end_date,
        venue_name: venue_name?.trim(),
        court_count: court_count ? parseInt(court_count, 10) : undefined,
        status, 
        guidelines_url: guidelines_url || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    io.to(`tournament:${id}`).emit('tournament-metadata-updated', updatedTournament);
    return res.status(200).json(updatedTournament);
  } catch {
    return res.status(500).json({ error: "Internal processing crash updating tournament details." });
  }
});

app.delete('/api/tournaments/:id', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: "Tournament and all cascading records successfully scrubbed." });
  } catch {
    return res.status(500).json({ error: "Internal processing crash deleting tournament." });
  }
});

app.post('/api/tournaments/:id/seed-categories', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { id: tournamentId } = req.params;
  try {
    for (const cat of CATEGORIES) {
      const { data: existing } = await supabase
        .from('categories')
        .select('category_id')
        .eq('tournament_id', tournamentId)
        .eq('category_name', cat)
        .maybeSingle();

      if (!existing) {
        let genderDivision = 'Mixed';
        if (cat.toLowerCase().includes("men's") || cat.toLowerCase().includes("mens")) genderDivision = 'Male';
        if (cat.toLowerCase().includes("women's") || cat.toLowerCase().includes("woman")) genderDivision = 'Female';

        await supabase.from('categories').insert({
          tournament_id: tournamentId,
          category_name: cat,
          gender_division: genderDivision,
          entry_fee: 0.00,
          max_slots: 16,
          available_slots_remaining: 16
        });
      }
    }
    return res.json({ success: true, message: "Tournament dynamic categories seeded cleanly." });
  } catch {
    return res.status(500).json({ error: "Failed seeding tournament metadata matrix." });
  }
});

/** =======================================================
 * TOURNAMENT OPERATIONS & ENRICHED SCOPED MATCH ROUTES
 * ======================================================= */

app.get('/api/tournaments/:tournamentId/matches', async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*, team1:team1_id(team_name), team2:team2_id(team_name), category:category_id(name:category_name)')
      .eq('tournament_id', tournamentId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const enrichedMatches = (matches as unknown as Match[] || []).map((match: Match) => {
      const session = activeLiveSessions[match.id];
      return session ? { ...match, refereeName: session.refereeName, pinCode: session.pinCode } : match;
    });

    return res.json(enrichedMatches);
  } catch {
    return res.status(500).json({ error: "Failed to fetch matches completely." });
  }
});

app.put('/api/matches/:id/start', requireAuth(['Admin', 'Staff']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { courtId, refereeName } = req.body;
  const targetCourtParsed = parseInt(courtId, 10);

  try {
    if (!refereeName) {
      return res.status(400).json({ error: "Operational Block: An official referee must be selected before match deployment." });
    }

    const { data: matchToStart, error: mError } = await supabase
      .from('matches')
      .select('*, team1:team1_id(*), team2:team2_id(*)')
      .eq('id', id)
      .single();

    if (mError || !matchToStart) {
      return res.status(404).json({ error: "Match configuration instance not found." });
    }

    const { data: activeCourtMatch } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', matchToStart.tournament_id)
      .eq('status', 'LIVE')
      .eq('court_id', targetCourtParsed)
      .maybeSingle();

    if (activeCourtMatch) {
      return res.status(400).json({ error: `Court 0${targetCourtParsed} is currently occupied by another active match.` });
    }

    const { data: conflictingMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', matchToStart.tournament_id)
      .eq('status', 'LIVE')
      .or(`team1_id.eq.${matchToStart.team1_id},team2_id.eq.${matchToStart.team1_id},team1_id.eq.${matchToStart.team2_id},team2_id.eq.${matchToStart.team2_id}`);

    if (conflictingMatches && conflictingMatches.length > 0) {
      return res.status(400).json({ error: "One or both selected teams are already actively playing a match on another court." });
    }

    const generatedPinCode = crypto.randomInt(1000, 9999).toString();

    activeLiveSessions[id] = {
      refereeName: refereeName,
      pinCode: generatedPinCode
    };

    const { data: updatedMatch, error: uError } = await supabase
      .from('matches')
      .update({
        court_id: targetCourtParsed,
        status: 'LIVE',
        started_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, team1:team1_id(team_name), team2:team2_id(team_name), category:category_id(name:category_name)')
      .single();

    if (uError || !updatedMatch) throw uError;

    const extendedPayload = {
      ...updatedMatch,
      refereeName: refereeName,
      pinCode: generatedPinCode
    };

    io.to(`tournament:${updatedMatch.tournament_id}`).emit('score-live', extendedPayload);
    io.to(`tournament:${updatedMatch.tournament_id}`).emit('standings-refresh');
    return res.json(extendedPayload);
  } catch {
    return res.status(500).json({ error: "Failed to start match due to system server exceptions." });
  }
});

app.put('/api/matches/:id/cancel', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: match } = await supabase.from('matches').select('tournament_id').eq('id', id).single();
    if (!match) return res.status(404).json({ error: "Match not found" });

    const { data: updatedMatch, error } = await supabase
      .from('matches')
      .update({
        status: 'PENDING',
        court_id: null,
        started_at: null,
        team1_score: 0,
        team2_score: 0
      })
      .eq('id', id)
      .select('*, team1:team1_id(team_name), team2:team2_id(team_name), category:category_id(name:category_name)')
      .single();

    if (error) throw error;
    delete activeLiveSessions[id];

    io.to(`tournament:${match.tournament_id}`).emit('score-live', { ...updatedMatch, refereeName: "", pinCode: "" });
    io.to(`tournament:${match.tournament_id}`).emit('standings-refresh');
    return res.json({ message: "Match successfully recalled back to the pending dashboard queue.", match: updatedMatch });
  } catch {
    return res.status(500).json({ error: "Failed to execute server-side match cancellation script." });
  }
});

// ADMIN MATCH DEFAULT / WALKOVER FLOW - PROTECTED
app.put('/api/matches/:id/default', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { absentTeamNum } = req.body; 

  try {
    const { data: match, error: mError } = await supabase
      .from('matches')
      .select('*, team1:team1_id(*), team2:team2_id(*)')
      .eq('id', id)
      .single();

    if (mError || !match) return res.status(404).json({ error: "Match instance target not found." });

    const extractTeamId = (teamIdField: any, teamObjectField: any) => {
      if (typeof teamIdField === 'string') return teamIdField;
      if (teamIdField && typeof teamIdField === 'object' && teamIdField.id) return teamIdField.id;
      if (teamObjectField && teamObjectField.id) return teamObjectField.id;
      return null;
    };

    const absentTeamId = absentTeamNum === 1 
      ? extractTeamId(match.team1_id, match.team1) 
      : extractTeamId(match.team2_id, match.team2);
      
    const presentTeamId = absentTeamNum === 1 
      ? extractTeamId(match.team2_id, match.team2) 
      : extractTeamId(match.team1_id, match.team1);

    if (!absentTeamId || !presentTeamId) {
      return res.status(400).json({ error: "Could not resolve valid team identity text strings from match keys." });
    }

    // FIXED: Removed the non-existent 'winner_id' column payload from the database update schema object
    const { data: updatedMatch, error: uError } = await supabase
      .from('matches')
      .update({
        status: 'FINISHED',
        ended_at: new Date().toISOString(),
        team1_score: absentTeamNum === 1 ? 0 : 11,
        team2_score: absentTeamNum === 1 ? 11 : 0
      })
      .eq('id', id)
      .select('*, team1:team1_id(team_name), team2:team2_id(team_name), category:category_id(name:category_name)')
      .single();

    if (uError) throw uError;
    delete activeLiveSessions[id];

    try {
      const { data: pTeam } = await supabase.from('teams').select('*').eq('id', presentTeamId).maybeSingle();
      const { data: aTeam } = await supabase.from('teams').select('*').eq('id', absentTeamId).maybeSingle();

      if (pTeam) {
        const { error: pUpdateErr } = await supabase.from('teams').update({
          matches_played: (pTeam.matches_played || 0) + 1,
          wins: (pTeam.wins || 0) + 1
        }).eq('id', presentTeamId);
        if (pUpdateErr) throw pUpdateErr;
      }

      if (aTeam) {
        const { error: aUpdateErr } = await supabase.from('teams').update({
          matches_played: (aTeam.matches_played || 0) + 1,
          points_for: (aTeam.points_for || 0) - 11 
        }).eq('id', absentTeamId);
        if (aUpdateErr) throw aUpdateErr;
      }
    } catch (standingsBypassError) {
      console.error("Non-fatal database column check standings constraint anomaly:", standingsBypassError);
    }

    io.to(`tournament:${match.tournament_id}`).emit('score-live', { ...updatedMatch, refereeName: "", pinCode: null });
    io.to(`tournament:${match.tournament_id}`).emit('standings-refresh');
    return res.json({ message: `Walkover logged cleanly.` });
  } catch (err: any) {
    console.error("Match default configuration processing crash:", err);
    return res.status(500).json({ 
      error: "Failed to log walkover default configurations.",
      message: err?.message || err
    });
  }
});

app.put('/api/matches/:id/score', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { score1, score2 } = req.body;

  try {
    const { data: updatedMatch, error } = await supabase
      .from('matches')
      .update({ team1_score: parseInt(score1, 10), team2_score: parseInt(score2, 10) })
      .eq('id', id)
      .select('*, team1:team1_id(team_name), team2:team2_id(team_name), category:category_id(name:category_name)')
      .single();

    if (error) throw error;

    const session = activeLiveSessions[id] || { refereeName: "Official Staff", pinCode: "" };
    const fullPayload = { ...updatedMatch, refereeName: session.refereeName, pinCode: session.pinCode };

    io.to(`tournament:${updatedMatch.tournament_id}`).emit('score-live', fullPayload);
    return res.json(fullPayload);
  } catch {
    return res.status(500).json({ error: "Failed to update score" });
  }
});

app.put('/api/matches/:id/finish', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: match, error: mError } = await supabase
      .from('matches')
      .select('*, team1:team1_id(*), team2:team2_id(*), category:category_id(*)')
      .eq('id', id)
      .single();
    
    if (mError || !match) return res.status(404).json({ error: "Match target instance not found" });

    const score1 = match.team1_score;
    const score2 = match.team2_score;
    const winnerId = score1 > score2 ? match.team1_id : match.team2_id;

    const sessionContext = activeLiveSessions[id] || { refereeName: "Official Staff", pinCode: null };
    const officiatingReferee = sessionContext.refereeName;

    const { data: updatedMatch, error: uError } = await supabase
      .from('matches').update({ status: 'FINISHED', ended_at: new Date().toISOString()}).eq('id', id).select('*, team1:team1_id(team_name), team2:team2_id(team_name), category:category_id(name:category_name)').single();

    if (uError) throw uError;
    delete activeLiveSessions[id];

    const { data: t1 } = await supabase.from('teams').select('*').eq('id', match.team1_id).single();
    if (t1) {
      await supabase.from('teams').update({
        matches_played: (t1.matches_played || 0) + 1,
        wins: (t1.wins || 0) + (score1 > score2 ? 1 : 0),
        points_for: (t1.points_for || 0) + score1,
        points_against: (t1.points_against || 0) + score2
      }).eq('id', match.team1_id);
    }

    const { data: t2 } = await supabase.from('teams').select('*').eq('id', match.team2_id).single();
    if (t2) {
      await supabase.from('teams').update({
        matches_played: (t2.matches_played || 0) + 1,
        wins: (t2.wins || 0) + (score2 > score1 ? 1 : 0),
        points_for: (t2.points_for || 0) + score2,
        points_against: (t2.points_against || 0) + score1
      }).eq('id', match.team2_id);
    }

    if (match.match_type === 'ELIMINATION' && (match.bracket_position === 'SF1' || match.bracket_position === 'SF2')) {
      const siblingPosition = match.bracket_position === 'SF1' ? 'SF2' : 'SF1';
      
      const { data: siblingMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', match.tournament_id)
        .eq('category_id', match.category_id)
        .eq('match_type', 'ELIMINATION')
        .eq('bracket_position', siblingPosition)
        .single();

      if (siblingMatch && siblingMatch.status === 'FINISHED' && siblingMatch.winner_id) {
        const sf1Winner = match.bracket_position === 'SF1' ? winnerId : siblingMatch.winner_id;
        const sf2Winner = match.bracket_position === 'SF2' ? winnerId : siblingMatch.winner_id;

        const { data: existingFinals } = await supabase
          .from('matches')
          .select('id')
          .eq('tournament_id', match.tournament_id)
          .eq('category_id', match.category_id)
          .eq('match_type', 'ELIMINATION')
          .eq('bracket_position', 'FINALS')
          .maybeSingle();

        if (!existingFinals && sf1Winner && sf2Winner) {
          await supabase.from('matches').insert({
            tournament_id: match.tournament_id,
            category_id: match.category_id,
            match_type: 'ELIMINATION',
            bracket_position: 'FINALS',
            status: 'PENDING',
            team1_id: sf1Winner,
            team2_id: sf2Winner
          });
        }
      }
    }

    const finalFinishPayload = { ...updatedMatch, refereeName: officiatingReferee, pinCode: null };
    io.to(`tournament:${updatedMatch.tournament_id}`).emit('score-live', finalFinishPayload);
    io.to(`tournament:${updatedMatch.tournament_id}`).emit('standings-refresh');
    return res.json(finalFinishPayload);
  } catch {
    return res.status(500).json({ error: "Internal server compilation failure" });
  }
});

app.get('/api/tournaments/:tournamentId/standings', async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const sortedStandings = (teams as unknown as Team[] || []).sort((a: Team, b: Team) => {
      if (b.wins !== a.wins) return (b.wins || 0) - (a.wins || 0);
      const diffA = (a.points_for || 0) - (a.points_against || 0);
      const diffB = (b.points_for || 0) - (b.points_against || 0);
      return diffB - diffA;
    });

    return res.json(sortedStandings);
  } catch {
    return res.status(500).json({ error: "Standings computation exception" });
  }
});

app.get('/api/tournaments/:tournamentId/matches/history', async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const { data: completedMatches, error } = await supabase
      .from('matches')
      .select('*, team1:team1_id(team_name), team2:team2_id(team_name), category:category_id(name:category_name)')
      .eq('tournament_id', tournamentId)
      .eq('status', 'FINISHED')
      .order('ended_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json(completedMatches);
  } catch {
    return res.status(500).json({ error: "Match history extraction failure" });
  }
});

/** =======================================================
 * REGISTRATION, POOLS, & AUTOMATED PLAYOFF GENERATORS
 * ======================================================= */

app.post('/api/brackets/generate', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { tournamentId, categoryId } = req.body;
  if (!tournamentId || !categoryId) return res.status(400).json({ error: "Required mapping variables missing." });

  try {
    const { data: existingPlayoffs } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('category_id', categoryId)
      .eq('match_type', 'ELIMINATION')
      .maybeSingle();

    if (existingPlayoffs) {
      return res.status(400).json({ error: "Playoff brackets have already been generated for this tier." });
    }

    const { data: teams } = await supabase.from('teams').select('*').eq('category_id', categoryId);
    if (!teams || teams.length < 4) {
      return res.status(400).json({ error: "Insufficient team datasets. Minimum 4 contenders required." });
    }

    const qualifyingWinners = (teams as unknown as Team[]).sort((a: Team, b: Team) => {
      if (b.wins !== a.wins) return (b.wins || 0) - (a.wins || 0);
      return ((b.points_for || 0) - (b.points_against || 0)) - ((a.points_for || 0) - (a.points_against || 0));
    });

    const { data: sf1, error: e1 } = await supabase.from('matches').insert({
      tournament_id: tournamentId,
      category_id: categoryId,
      match_type: 'ELIMINATION',
      bracket_position: 'SF1',
      status: 'PENDING',
      team1_id: qualifyingWinners[0].id,
      team2_id: qualifyingWinners[3].id
    }).select().single();

    const { data: sf2, error: e2 } = await supabase.from('matches').insert({
      tournament_id: tournamentId,
      category_id: categoryId,
      match_type: 'ELIMINATION',
      bracket_position: 'SF2',
      status: 'PENDING',
      team1_id: qualifyingWinners[1].id,
      team2_id: qualifyingWinners[2].id
    }).select().single();

    if (e1 || e2) throw (e1 || e2);

    io.to(`tournament:${tournamentId}`).emit('standings-refresh'); 
    return res.json({ success: true, brackets: [sf1, sf2] });
  } catch {
    return res.status(500).json({ error: "Internal elimination tree computation exception" });
  }
});

app.get('/api/tournaments/:tournamentId/categories', async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const { data: settings, error } = await supabase
      .from('categories')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (error) throw error;
    return res.json(settings);
  } catch {
    return res.status(500).json({ error: "Failed to extract registration settings matrix." });
  }
});

app.put('/api/categories/:id', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { maxSlots } = req.body;
  try {
    const { data: updated, error } = await supabase
      .from('categories')
      .update({ max_slots: parseInt(maxSlots, 10) })
      .eq('category_id', id)
      .select().single();

    if (error) throw error;
    io.to(`tournament:${updated.tournament_id}`).emit('registration-updated'); 
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to update category parameters." });
  }
});

app.put('/api/config/category-settings', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { tournamentId, categoryId, maxSlots, groupCount } = req.body;
  const parsedMaxSlots = parseInt(maxSlots, 10);
  
  if (isNaN(parsedMaxSlots) || !categoryId) {
    return res.status(400).json({ error: "Validation failure: Invalid category ID or slots value type supplied." });
  }

  try {
    const { data: updated, error } = await supabase
      .from('categories')
      .update({ max_slots: parsedMaxSlots })
      .eq('category_id', categoryId)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase update error:", error.message);
      return res.status(400).json({ error: `Database Error: ${error.message}` });
    }
    
    io.to(`tournament:${tournamentId}`).emit('registration-updated');
    return res.json({ success: true, updated, groupCount });
  } catch (err: unknown) {
    console.error("❌ Complex category settings route crash:", err);
    return res.status(500).json({ error: "Internal server error processing category parameters." });
  }
});

app.post('/api/teams/register', async (req: Request, res: Response) => {
  const { tournamentId, categoryId, teamName, player1Name, player2Name, contactNo, address, email } = req.body;

  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!tournamentId || !uuidRegex.test(tournamentId) || !categoryId || !uuidRegex.test(categoryId)) {
      return res.status(400).json({ error: "Operational Block: Ensure you are accessing a valid tournament URL parameter path." });
    }

    const { data: tier, error: tierError } = await supabase
      .from('categories')
      .select('*')
      .eq('category_id', categoryId)
      .maybeSingle();

    if (tierError) throw tierError;
    if (!tier) {
      return res.status(404).json({ error: "The selected division category does not exist for this tournament track." });
    }

    const { count: currentCount, error: countError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (countError) throw countError;

    const maxLimit = tier.max_slots ?? 16;
    if (currentCount && currentCount >= maxLimit) {
      return res.status(400).json({ error: `Registration blocked. Category limit of ${maxLimit} entries reached.` });
    }

    const { data: newTeam, error: insertError } = await supabase
      .from('teams')
      .insert({
        tournament_id: tournamentId,
        category_id: categoryId,
        team_name: teamName || `${player1Name} / ${player2Name}`,
        player1_name: player1Name,
        player2_name: player2Name || null,
        contact_no: contactNo || null,
        address: address || null,
        email: email || null,
        registration_status: 'CONFIRMED'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    io.to(`tournament:${tournamentId}`).emit('registration-updated');
    io.to(`tournament:${tournamentId}`).emit('standings-refresh');
    return res.json(newTeam);

  } catch {
    return res.status(500).json({ error: "Failed saving team entry into database system." });
  }
});

app.put('/api/teams/:id/group', requireAuth(['Admin', 'Staff']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { groupId } = req.body;
  try {
    const { data: updatedTeam, error } = await supabase
      .from('teams')
      .update({ group_id: groupId })
      .eq('id', id)
      .select().single();

    if (error) throw error;
    io.to(`tournament:${updatedTeam.tournament_id}`).emit('registration-updated');
    io.to(`tournament:${updatedTeam.tournament_id}`).emit('standings-refresh');
    return res.json(updatedTeam);
  } catch {
    return res.status(500).json({ error: "Failed to persist structural drag-and-drop pool alignment modifications." });
  }
});

app.post('/api/groups/auto-allocate', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { tournamentId, categoryId, groupCount } = req.body;
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('category_id', categoryId);

    if (error || !teams) throw error;

    const GROUP_LABELS = ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Group G", "Group H"];
    const activeLabels = GROUP_LABELS.slice(0, groupCount || 4);

    for (let i = 0; i < teams.length; i++) {
      const targetLabel = activeLabels[i % activeLabels.length];
      await supabase.from('teams').update({ group_id: targetLabel }).eq('id', teams[i].id);
    }

    io.to(`tournament:${tournamentId}`).emit('registration-updated');
    io.to(`tournament:${tournamentId}`).emit('standings-refresh');
    return res.json({ success: true, message: "Draft boards auto-populated and distributed evenly!" });
  } catch {
    return res.status(500).json({ error: "Group allocation auto-split calculation error encountered." });
  }
});

app.post('/api/groups/generate', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { tournamentId, categoryId } = req.body;
  try {
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('category_id', categoryId);

    if (!teams || teams.length === 0) {
      return res.status(400).json({ error: "Roster empty. Cannot generate rounds for zero entrants." });
    }

    const activeAssignedTeams = teams.filter((t) => t.group_id && t.group_id !== 'Unassigned');
    
    const groupBuckets: Record<string, typeof teams> = {};
    activeAssignedTeams.forEach((team) => {
      if (!groupBuckets[team.group_id!]) groupBuckets[team.group_id!] = [];
      groupBuckets[team.group_id!].push(team);
    });

    const matchesToInsert = [];

    for (const groupLabel of Object.keys(groupBuckets)) {
      const poolTeams = groupBuckets[groupLabel];
      for (let i = 0; i < poolTeams.length; i++) {
        for (let j = i + 1; j < poolTeams.length; j++) {
          matchesToInsert.push({
            tournament_id: tournamentId,
            category_id: categoryId,
            team1_id: poolTeams[i].id,
            team2_id: poolTeams[j].id,
            match_type: 'ROUND_ROBIN',
            status: 'PENDING',
            team1_score: 0,
            team2_score: 0
          });
        }
      }
    }

    await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('category_id', categoryId)
      .eq('match_type', 'ROUND_ROBIN')
      .eq('status', 'PENDING');

    if (matchesToInsert.length > 0) {
      const { error: matchInsertError } = await supabase.from('matches').insert(matchesToInsert);
      if (matchInsertError) throw matchInsertError;
    }

    io.to(`tournament:${tournamentId}`).emit('standings-refresh');
    return res.json({ success: true, message: `Successfully committed pools and generated ${matchesToInsert.length} Round Robin fixtures!` });
  } catch {
    return res.status(500).json({ error: "Failed to compile group generation schedule parameters." });
  }
});

app.put('/api/teams/:id', requireAuth(['Admin', 'Staff']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const { data: updatedTeam, error } = await supabase
      .from('teams')
      .update({ team_name: name.trim() })
      .eq('id', id)
      .select().single();

    if (error) throw error;
    io.to(`tournament:${updatedTeam.tournament_id}`).emit('registration-updated');
    io.to(`tournament:${updatedTeam.tournament_id}`).emit('standings-refresh');
    return res.json(updatedTeam);
  } catch {
    return res.status(500).json({ error: "Failed to update team details." });
  }
});

app.delete('/api/teams/:id', requireAuth(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: team } = await supabase.from('teams').select('tournament_id').eq('id', id).single();
    if (!team) return res.status(404).json({ error: "Team profile not discovered." });

    await supabase.from('matches').delete().eq('status', 'PENDING').or(`team1_id.eq.${id},team2_id.eq.${id}`);
    await supabase.from('teams').delete().eq('id', id);

    io.to(`tournament:${team.tournament_id}`).emit('registration-updated');
    io.to(`tournament:${team.tournament_id}`).emit('standings-refresh');
    return res.json({ message: "Participant entry scrubbed successfully." });
  } catch {
    return res.status(500).json({ error: "Failed to delete team entry." });
  }
});

/** =======================================================
 * PRODUCTION FRONTEND STATIC ASSET DISTRIBUTION GLUE
 * ======================================================= */
const clientDistPath = path.join(process.cwd(), 'client/dist');

// Serve the static JS, CSS, and media bundles from the compiled directory 
app.use(express.static(clientDistPath));

// Catch-All Routing: Guides initial page hits and refreshes cleanly to React Router
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = parseInt(process.env.PORT || '5001', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-Tournament Full-Stack TypeScript Engine Running at http://192.168.8.110:${PORT}`);
});