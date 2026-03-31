// controllers/bookingController.js
// Handles all booking operations: API endpoints and form-submission handlers.
// Views controller delegates here; this file never calls res.render() for pages.

import { BookingModel } from "../models/bookingModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { CourseModel } from "../models/courseModel.js";
import { bookCourseForUser, bookSessionsForUser } from "../services/bookingService.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const isApiRequest = (req) =>
    req.headers.accept?.includes("application/json");

// ---------------------------------------------------------------------------
// API endpoints  (JSON in / JSON out)
// ---------------------------------------------------------------------------

/**
 * POST /bookings/course
 * Body: { userId, courseId }
 */
export const apiBookCourse = async (req, res) => {
    try {
        const { userId, courseId } = req.body;
        if (!userId || !courseId)
            return res.status(400).json({ error: "userId and courseId are required" });

        const booking = await bookCourseForUser(userId, courseId);
        res.status(201).json({ booking });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * POST /bookings/session
 * Body: { userId, sessionId }
 */
export const apiBookSession = async (req, res) => {
    try {
        const { userId, sessionId } = req.body;
        if (!userId || !sessionId)
            return res.status(400).json({ error: "userId and sessionId are required" });

        const booking = await bookSessionsForUser(userId, [sessionId]);
        res.status(201).json({ booking });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * DELETE /bookings/:id
 */
export const apiCancelBooking = async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);
        if (!booking)
            return res.status(404).json({ error: "Booking not found" });

        await BookingModel.cancel(booking._id);
        const updated = await BookingModel.findById(booking._id);
        res.json({ booking: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ---------------------------------------------------------------------------
// Form handlers  (called from views routes; redirect on success)
// ---------------------------------------------------------------------------

/**
 * POST /courses/:id/book
 * Books every future session of a course for the logged-in user.
 * Expects `consent` checkbox in req.body.
 * Returns the booking object so the views controller can redirect.
 */
export const handleBookCourse = async (userId, courseId, consent) => {
    if (!consent)
        throw Object.assign(
            new Error("You must agree to the booking terms & health disclaimer."),
            { code: "CONSENT_MISSING" }
        );

    return bookCourseForUser(userId, courseId);
};

/**
 * POST /courses/:id/book/sessions
 * Books one or more drop-in sessions for the logged-in user.
 * Returns the booking object so the views controller can redirect.
 */
export const handleBookSessions = async (userId, rawSessionIds) => {
    const sessionIds = Array.isArray(rawSessionIds)
        ? rawSessionIds
        : rawSessionIds
            ? [rawSessionIds]
            : [];

    if (!sessionIds.length)
        throw Object.assign(
            new Error("No sessions selected. Please choose at least one session."),
            { code: "NO_SESSIONS" }
        );

    return bookSessionsForUser(userId, sessionIds);
};

/**
 * POST /bookings/:bookingId/cancel
 * Cancels an entire booking for the logged-in user, decrementing all session counts.
 * Returns the updated booking so the views controller can redirect.
 */
export const handleCancelBooking = async (bookingId, userId) => {
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
        throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });

    if (booking.userId.toString() !== userId.toString())
        throw Object.assign(new Error("You can only cancel your own bookings."), {
            code: "FORBIDDEN",
        });

    if (booking.status !== "CANCELLED") {
        for (const sid of booking.sessionIds ?? []) {
            await SessionModel.incrementBookedCount(sid, -1);
        }
        await BookingModel.cancel(booking._id);
    }

    return booking;
};

/**
 * POST /bookings/:bookingId/sessions/:sessionId/cancel
 * Removes a single session from a booking for the logged-in user.
 * Returns the bookingId so the views controller can redirect.
 */
export const handleCancelSession = async (bookingId, sessionId, userId) => {
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
        throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });

    if (booking.userId.toString() !== userId.toString())
        throw Object.assign(new Error("Unauthorised"), { code: "FORBIDDEN" });

    await SessionModel.incrementBookedCount(sessionId, -1);
    await BookingModel.removeSession(bookingId, sessionId);

    return bookingId;
};