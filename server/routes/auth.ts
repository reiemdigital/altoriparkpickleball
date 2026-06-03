// server/routes/auth.ts
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'altori_park_super_secret_key_2026';

router.post('/login', (req, res) => {
  const { role, password } = req.body;

  // Simple validation logic (In production, compare against bcrypt/argon2 database hashes!)
  const isValidAdmin = role === 'Admin' && password === 'admin123';
  const isValidStaff = role === 'Staff' && password === 'staff123';

  if (!isValidAdmin && !isValidStaff) {
    return res.status(400).json({ error: 'Invalid clearance credentials.' });
  }

  // Create the encrypted token payload
  const token = jwt.sign({ role }, JWT_SECRET, { expiresIn: '8h' });

  // Pack the token securely inside a browser cookie envelope
  res.cookie('token', token, {
    httpOnly: true,                 // Prevents client-side scripts from reading this token
    secure: process.env.NODE_ENV === 'production', // Forces HTTPS in production
    sameSite: 'strict',             // Solid protection against Cross-Site Request Forgery (CSRF)
    maxAge: 8 * 60 * 60 * 1000      // 8 Hours session lifecycle duration
  });

  return res.json({ success: true, role });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true });
});