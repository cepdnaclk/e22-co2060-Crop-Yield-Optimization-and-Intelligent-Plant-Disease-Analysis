import express from 'express';
import { getNearbyFloodForecast } from '../controllers/floodController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get flood forecast warnings for the logged-in user's coordinates
router.get('/nearby', requireAuth, getNearbyFloodForecast);

export default router;
