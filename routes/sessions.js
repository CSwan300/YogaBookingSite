import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";


const router = Router();

// Pure route - delegates to model helpers
router.post("/:id/book", requireAuth, async (req, res, next) => {
    try {
        // Models handle all validation + business logic
        const { session } = await SessionModel.findByIdWithValidation(req.params.id, req.user._id);
        await BookingModel.createDropInBooking(req.user._id, session);

        res.redirect(`/courses/${session.courseId}?booked=session`);
    } catch (err) {
        // Models throw specific errors
        if (err.message === 'Session full') {
            return res.status(409).render("error", { title: "Session full", message: "Sorry, this session is fully booked." });
        }
        if (err.message === 'Already booked this session') {
            return res.status(409).render("error", { title: "Already booked", message: "You have already booked this session." });
        }
        next(err);
    }
});

export default router;