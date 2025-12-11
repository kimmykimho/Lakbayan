import express from 'express';
import {
    getPlaces,
    getPlace,
    createPlace,
    updatePlace,
    deletePlace,
    updatePlaceStats
} from '../controllers/place.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getPlaces);
router.get('/:id', getPlace);

// Protected routes (admin/tourism officer only)
router.post('/', protect, authorize('admin', 'tourism_officer'), createPlace);
router.put('/:id', protect, authorize('admin', 'tourism_officer'), updatePlace);
router.delete('/:id', protect, authorize('admin', 'tourism_officer'), deletePlace);
router.patch('/:id/stats', updatePlaceStats);

export default router;

