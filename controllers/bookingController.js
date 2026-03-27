// controllers/bookingController.js
import {
    bookCourseForUser,
    bookSessionsForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { CourseModel } from "../models/courseModel.js";

// ── GET /courses/:courseId/book ──────────────────────────────────────────────
export const showBookCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await CourseModel.findById(courseId);
        if (!course) return res.status(404).render("404");

        const sessions = await SessionModel.listByCourse(courseId);

        res.render("bookCourse", {
            course: { ...course, id: course._id },
            user: req.user,
            sessionsCount: sessions.length,
            sessions: sessions.map((s) => ({
                id: s._id,
                start: s.start,
                remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
            })),
        });
    } catch (err) {
        console.error(err);
        res.status(500).render("error", { message: "Failed to load booking page" });
    }
};

// ── GET /courses/:courseId/book/session ──────────────────────────────────────
export const showBookSession = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await CourseModel.findById(courseId);
        if (!course) return res.status(404).render("404");

        // Guard: only render drop-in page if the course allows it
        if (!course.allowDropIn) {
            return res.redirect(`/courses/${courseId}/book`);
        }

        const sessions = await SessionModel.listByCourse(courseId);

        res.render("bookSession", {
            course: { ...course, id: course._id },
            user: req.user,
            sessions: sessions.map((s) => {
                const remaining = Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0));
                return {
                    id: s._id,
                    start: s.start,
                    remaining,
                    full: remaining === 0,
                    pluralRemaining: remaining !== 1,
                };
            }),
        });
    } catch (err) {
        console.error(err);
        res.status(500).render("error", { message: "Failed to load session booking page" });
    }
};

// ── POST /courses/:courseId/book ─────────────────────────────────────────────
export const bookCourse = async (req, res) => {
    try {
        const { userId, courseId } = req.body;
        const booking = await bookCourseForUser(userId, courseId);
        res.status(201).json({ booking });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
};

// ── POST /bookings/session ───────────────────────────────────────────────────
export const bookSession = async (req, res) => {
    try {
        const { userId, sessionId } = req.body;
        const booking = await bookSessionsForUser(userId, [sessionId]);
        res.status(201).json({ booking });
    } catch (err) {
        console.error(err);
        res
            .status(err.code === "DROPIN_NOT_ALLOWED" ? 400 : 500)
            .json({ error: err.message });
    }
};
// ── POST /bookings/:bookingId/sessions/:sessionId/cancel ─────────────────────
export const cancelIndividualSession = async (req, res) => {
    try {
        const { bookingId, sessionId } = req.params;
        const booking = await BookingModel.findById(bookingId);

        if (!booking) return res.status(404).json({ error: "Booking not found" });
        if (booking.status === "CANCELLED") return res.status(400).json({ error: "Booking already cancelled" });

        await SessionModel.incrementBookedCount(sessionId, -1);

        const updatedBooking = await BookingModel.removeSession(bookingId, sessionId);

        if (req.body.returnTo) {
            return res.redirect(req.body.returnTo);
        }
        res.json({ message: "Session cancelled", booking: updatedBooking });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to cancel session" });
    }
};
// ── DELETE /bookings/:bookingId ──────────────────────────────────────────────
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await BookingModel.findById(bookingId);
        if (!booking) return res.status(404).json({ error: "Booking not found" });
        if (booking.status === "CANCELLED") return res.json({ booking });

        if (booking.status === "CONFIRMED") {
            for (const sid of booking.sessionIds) {
                await SessionModel.incrementBookedCount(sid, -1);
            }
        }
        const updated = await BookingModel.cancel(bookingId);
        res.json({ booking: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to cancel booking" });
    }
};