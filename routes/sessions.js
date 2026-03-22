import { Router } from "express";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { requireAuth, requireOrganiser } from "../middlewares/auth.js";

const router = Router();

// ... existing routes ...

// ── Book a single session (drop-in) ──────────────────────────
router.post("/:id/book", requireAuth, async (req, res, next) => {
    try {
        const session = await SessionModel.findById(req.params.id);
        if (!session) return res.status(404).render("error", {
            title: "Not found",
            message: "Session not found."
        });

        if (session.bookedCount >= session.capacity) {
            return res.status(409).render("error", {
                title: "Session full",
                message: "Sorry, this session is fully booked."
            });
        }

        const existing = await BookingModel.findByUserAndSession(
            req.user._id,
            session._id
        );
        if (existing) {
            return res.status(409).render("error", {
                title: "Already booked",
                message: "You have already booked this session."
            });
        }

        await BookingModel.create({
            userId:    req.user._id,
            sessionId: session._id,
            courseId:  session.courseId,
            type:      "drop-in",
        });

        await SessionModel.incrementBookedCount(session._id);

        res.redirect(`/courses/${session.courseId}?booked=session`);
    } catch (err) {
        next(err);
    }
});

export default router;