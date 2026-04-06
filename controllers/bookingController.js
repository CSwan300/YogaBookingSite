// controllers/bookingController.js
import * as bookingService from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

/**
 * Retrieves a list of bookings, optionally filtered by user ID.
 * @route GET /bookings
 * @param {import('express').Request} req - Express request object.
 * @param {Object} req.query - Query parameters.
 * @param {string} [req.query.userId] - Optional user ID to filter bookings.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const apiGetBookings = async (req, res) => {
    try {
        const { userId } = req.query;
        const query = userId ? { userId } : {};
        const bookings = await BookingModel.find(query);

        res.status(200).json({ bookings: bookings || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Creates a new booking for a full course.
 * @route POST /bookings/course
 * @param {import('express').Request} req - Express request object.
 * @param {Object} req.body - Request body.
 * @param {string} req.body.userId - ID of the user booking the course.
 * @param {string} req.body.courseId - ID of the course to be booked.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const apiBookCourse = async (req, res) => {
    try {
        const { userId, courseId } = req.body;

        if (!userId || !courseId) {
            return res.status(400).json({ error: "userId and courseId are required" });
        }

        const [user, course] = await Promise.all([
            UserModel.findById(userId),
            CourseModel.findById(courseId)
        ]);

        if (!user) return res.status(404).json({ error: "User not found" });
        if (!course) return res.status(404).json({ error: "Course not found" });

        const booking = await bookingService.bookCourseForUser(userId, courseId);
        res.status(201).json({ booking });
    } catch (err) {
        const status = err.message.includes("already") ? 409 : 400;
        res.status(status).json({ error: err.message });
    }
};

/**
 * Creates a booking for a specific session.
 * @route POST /bookings/session
 * @param {import('express').Request} req - Express request object.
 * @param {Object} req.body - Request body.
 * @param {string} req.body.userId - ID of the user booking the session.
 * @param {string} req.body.sessionId - ID of the specific session.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const apiBookSession = async (req, res) => {
    try {
        const { userId, sessionId } = req.body;

        if (!userId || !sessionId)
            return res.status(400).json({ error: "userId and sessionId are required" });

        const [user, session] = await Promise.all([
            UserModel.findById(userId),
            SessionModel.findById(sessionId)
        ]);

        if (!user) return res.status(404).json({ error: "User not found" });
        if (!session) return res.status(404).json({ error: "Session not found" });

        const booking = await bookingService.bookSessionsForUser(
            userId, [sessionId], { enforceDropIn: false, enforceDuplicates: false }
        );

        res.status(201).json({
            booking: {
                ...booking,
                type: booking.type || "SESSION",
                sessionId: booking.sessionIds?.[0] ? String(booking.sessionIds[0]) : undefined,
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Cancels an existing booking and updates session counts.
 * @route DELETE /bookings/:id
 * @param {import('express').Request} req - Express request object.
 * @param {Object} req.params - URL parameters.
 * @param {string} req.params.id - The booking ID to cancel.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const apiCancelBooking = async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (booking.status === "CANCELLED") {
            return res.status(400).json({ error: "Already cancelled" });
        }

        const { SessionModel } = await import("../models/sessionModel.js");
        for (const sid of booking.sessionIds ?? []) {
            await SessionModel.incrementBookedCount(sid, -1);
        }

        await BookingModel.cancel(req.params.id);
        const updated = await BookingModel.findById(req.params.id);
        res.json({ booking: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Handler for course booking with consent verification.
 * @param {string} userId - ID of the user.
 * @param {string} courseId - ID of the course.
 * @param {boolean} consent - Whether the user has provided booking consent.
 * @throws {Error} Throws "Consent required" if consent is false.
 * @returns {Promise<Object>} The created booking object.
 */
export const handleBookCourse = async (userId, courseId, consent) => {
    if (!consent) throw Object.assign(new Error("Consent required"), { code: "CONSENT_MISSING" });
    return bookingService.bookCourseForUser(userId, courseId);
};

/**
 * Handler for booking multiple sessions.
 * @param {string} userId - ID of the user.
 * @param {string|string[]} rawSessionIds - A single session ID or an array of session IDs.
 * @throws {Error} Throws "No sessions" if the session list is empty.
 * @returns {Promise<Object>} The created booking object.
 */
export const handleBookSessions = async (userId, rawSessionIds) => {
    const ids = Array.isArray(rawSessionIds) ? rawSessionIds : (rawSessionIds ? [rawSessionIds] : []);
    if (!ids.length) throw Object.assign(new Error("No sessions"), { code: "NO_SESSIONS" });
    return bookingService.bookSessionsForUser(userId, ids);
};

/**
 * Cancels a full booking via the booking service.
 * @param {string} id - Booking ID.
 * @param {string} uid - User ID for authorization.
 * @returns {Promise<Object>}
 */
export const handleCancelBooking = (id, uid) => bookingService.cancelFullBooking(id, uid);

/**
 * Cancels a single session within a larger booking.
 * @param {string} id - Booking ID.
 * @param {string} sid - Session ID to remove from booking.
 * @param {string} uid - User ID for authorization.
 * @returns {Promise<Object>}
 */
export const handleCancelSession = (id, sid, uid) => bookingService.cancelSingleSession(id, sid, uid);