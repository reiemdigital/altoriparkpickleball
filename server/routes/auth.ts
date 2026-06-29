// server/routes/auth.ts
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'altori_park_super_secret_key_2026';

/**
 * 📊 TEMPORARY STAFF ACCOUNT REGISTRY MOCK
 * (Replace this array with a direct query to your database when you plug in Prisma/Knex/Dexie)
 */
const MOCK_USER_DATABASE = [
  { id: 'usr_admin_01', username: 'admin', display_name: 'Super Admin', password: 'admin123', role: 'ADMIN' },
  { id: 'usr_ref_01', username: 'ref_gensan', display_name: 'Referee GenSan', password: 'staff123', role: 'STAFF' },
  { id: 'usr_ref_02', username: 'ref_matatag', display_name: 'Referee Matatag', password: 'staff123', role: 'STAFF' },
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter both your username and password security credentials.' });
  }

  // 🛡️ SECURITY PATHWAY: Scan directory map for a matching identity row
  const matchedUser = MOCK_USER_DATABASE.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  if (!matchedUser) {
    return res.status(401).json({ error: 'Invalid clearance credentials. Access denied.' });
  }

  // 📝 ENHANCED JWT PAYLOAD: Pack the unique identity parameters directly into the session ticket
  const tokenPayload = {
    id: matchedUser.id,
    username: matchedUser.username,
    displayName: matchedUser.display_name,
    role: matchedUser.role, // "ADMIN" or "STAFF"
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

  // Pack the token securely inside a browser cookie envelope
  res.cookie('token', token, {
    httpOnly: true,                                 // Prevents XSS script execution leaks
    secure: process.env.NODE_ENV === 'production', // Forces SSL connection layers in production
    sameSite: 'strict',                             // Defends against CSRF forge tokens
    maxAge: 8 * 60 * 60 * 1000                      // 8 Hours session duration cycle
  });

  return res.json({ 
    success: true, 
    user: {
      id: matchedUser.id,
      displayName: matchedUser.display_name,
      role: matchedUser.role
    }
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true });
});

export default router;