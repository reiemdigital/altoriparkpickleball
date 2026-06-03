// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'altori_park_super_secret_key_2026';

// Extend the Express Request interface to include the authenticated user payload
export interface AuthenticatedRequest extends Request {
  user?: {
    role: 'Admin' | 'Staff';
  };
}

export const requireAuth = (roles?: ('Admin' | 'Staff')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Read the token from secure HTTP-only cookies
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No session token provided.' });
    }

    try {
      // Verify token authenticity against our secret signature key
      const decoded = jwt.verify(token, JWT_SECRET) as { role: 'Admin' | 'Staff' };
      req.user = decoded;

      // Optional: Check if the user's explicit role is allowed to access this specific route
      if (roles && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden. You do not have clearance for this action.' });
      }

      next(); // Credentials match perfectly! Proceed to the controller logic.
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }
  };
};