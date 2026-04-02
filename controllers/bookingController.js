import * as bookingService from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";

/**
 * API Handler: Books a full course for a user via JSON request.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const apiBookCourse = async (req, res) => {
    try {
        const { userId, courseId } = req.body;
        const booking = await bookingService.bookCourseForUser(userId, courseId);
        res.status(201).json({ booking });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * API Handler: Books a single drop-in session for a user via JSON request.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const apiBookSession = async (req, res) => {
    try {
        const { userId, sessionId } = req.body;
        const booking = await bookingService.bookSessionsForUser(userId, [sessionId]);
        res.status(201).json({ booking });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * API Handler: Cancels a booking via JSON request.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const apiCancelBooking = async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (booking.status !== "CANCELLED") {
            const { SessionModel } = await import("../models/sessionModel.js");
            for (const sid of booking.sessionIds ?? []) {
                await SessionModel.incrementBookedCount(sid, -1);
            }
            await BookingModel.cancel(req.params.id);
        }

        const updated = await BookingModel.findById(req.params.id);
        res.json({ booking: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Form Handler: Processes full course booking from a UI form.
 * @param {string} userId - Current user ID
 * @param {string} courseId - Selected course ID
 * @param {boolean} consent - Whether terms were accepted
 * @returns {Promise<Object>} The booking result
 */
export const handleBookCourse = async (userId, courseId, consent) => {
    if (!consent) {
        throw Object.assign(
            new Error("You must agree to the booking terms."),
            { code: "CONSENT_MISSING" }
        );
    }
    return bookingService.bookCourseForUser(userId, courseId);
};

/**
 * Form Handler: Processes drop-in session bookings from a UI form.
 * @param {string} userId - Current user ID
 * @param {string|string[]} rawSessionIds - Selected session ID(s)
 * @returns {Promise<Object>} The booking result
 */
export const handleBookSessions = async (userId, rawSessionIds) => {
    const sessionIds = Array.isArray(rawSessionIds) ? rawSessionIds : (rawSessionIds ? [rawSessionIds] : []);
    if (!sessionIds.length) {
        throw Object.assign(new Error("No sessions selected."), { code: "NO_SESSIONS" });
    }
    return bookingService.bookSessionsForUser(userId, sessionIds);
};

/**
 * Form Handler: Cancels a full booking from a UI request.
 * @param {string} bookingId
 * @param {string} userId
 */
export const handleCancelBooking = async (bookingId, userId) => {
    return bookingService.cancelFullBooking(bookingId, userId);
};

/**
 * Form Handler: Cancels a single session from a UI request.
 * @param {string} bookingId
 * @param {string} sessionId
 * @param {string} userId
 */
export const handleCancelSession = async (bookingId, sessionId, userId) => {
    return bookingService.cancelSingleSession(bookingId, sessionId, userId);
};