// server/routes/matches.ts
import express from 'express';
import { requireAuth } from '../middleware/auth'; 
// ... keep your other original imports here unchanged ...

const router = express.Router();

// 1. Public endpoints (Leave your original handlers completely untouched)
router.get('/', /* your original get matches handler */);
router.get('/history', /* your original history handler */);


// 2. Protected administrative operations
// FIXED: Injected the middleware arrays cleanly right before your original callback logic handler functions
router.put('/:id/start', requireAuth(['Admin', 'Staff']), (req, res, next) => {
  // ... your original match start logic controller code goes here ...
});

router.put('/:id/cancel', requireAuth(['Admin']), (req, res, next) => {
  // ... your original match cancel/recall logic controller code goes here ...
});

router.put('/:id/default', requireAuth(['Admin']), (req, res, next) => {
  // ... your original match default walk-over logic controller code goes here ...
});

export default router;