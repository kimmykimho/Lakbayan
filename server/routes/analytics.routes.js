import express from 'express';
import { getAnalytics } from '../controllers/analytics.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'tourism_officer'));

router.get('/', getAnalytics);

export default router;

