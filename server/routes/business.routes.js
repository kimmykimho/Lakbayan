import express from 'express';
import { getBusinesses, createBusiness, updateBusiness, deleteBusiness } from '../controllers/business.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', getBusinesses);
router.post('/', protect, authorize('admin', 'tourism_officer'), createBusiness);
router.put('/:id', protect, authorize('admin', 'tourism_officer'), updateBusiness);
router.delete('/:id', protect, authorize('admin', 'tourism_officer'), deleteBusiness);

export default router;

