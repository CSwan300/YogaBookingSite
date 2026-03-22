// routes/bookings.js
import { Router } from 'express';
import { bookCourse, bookSession, cancelBooking } from '../controllers/bookingController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/course',        requireAuth, bookCourse);
router.post('/session',       requireAuth, bookSession);
router.delete('/:bookingId',  requireAuth, cancelBooking);

export default router;