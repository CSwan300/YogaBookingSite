// controllers/bookingController.js
// Two distinct responsibilities live here, kept in one file because they share
// the same service imports:
//
//   1. VIEW HANDLERS  (handleBook*, handleCancel*)
//      Called by viewsController. Accept plain arguments, return domain objects,
//      throw coded errors. No req / res.
//
//   2. API HANDLERS   (apiGetBookings, apiBookCourse, apiBookSession, apiCancelBooking)
//      Called directly by API routes. Accept req / res, respond with JSON.
//
// All persistence and business rules are delegated to services/bookingService.js.

import * as bookingService from "../services/bookingService.js";
import { BookingModel }    from "../models/bookingModel.js";
import { UserModel }       from "../models/userModel.js";
import { CourseModel }     from "../models/courseModel.js";
import { SessionModel }    from "../models/sessionModel.js";

// ===========================================================================
// VIEW HANDLERS
// ===========================================================================

/**
 * Books a full course on behalf of a user after verifying consent.
 *
 * @param {string}  userId   - Authenticated user's ID.
 * @param {string}  courseId - Course to book.
 * @param {*}       consent  - Truthy value from the booking consent checkbox.
 * @returns {Promise<object>} The created booking document.
 * @throws {{ code: "CONSENT_MISSING" }} When consent is falsy.
 * @throws {{ code: "ALREADY_BOOKED" }} When the user is already booked (from service).
 */
export const handleBookCourse = async (userId, courseId, consent) => {
    if (!consent) {
        throw Object.assign(new Error("Consent required"), { code: "CONSENT_MISSING" });
    }
    return bookingService.bookCourseForUser(userId, courseId);
};

/**
 * Books one or more sessions on behalf of a user.
 *
 * @param {string}          userId        - Authenticated user's ID.
 * @param {string|string[]} rawSessionIds - Single ID or array of session IDs.
 * @returns {Promise<object>} The created booking document.
 * @throws {{ code: "NO_SESSIONS" }} When the resolved ID array is empty.
 * @throws {{ code: "ALREADY_BOOKED" }} When any session is already booked (from service).
 */
export const handleBookSessions = async (userId, rawSessionIds) => {
    const ids = Array.isArray(rawSessionIds)
        ? rawSessionIds
        : rawSessionIds ? [rawSessionIds] : [];

    if (!ids.length) {
        throw Object.assign(new Error("No sessions selected"), { code: "NO_SESSIONS" });
    }
    return bookingService.bookSessionsForUser(userId, ids);
};

/**
 * Cancels an entire booking on behalf of a user.
 *
 * @param {string} bookingId - ID of the booking to cancel.
 * @param {string} userId    - Authenticated user's ID (for authorisation).
 * @returns {Promise<object>} The updated booking document.
 * @throws {{ code: "NOT_FOUND" | "FORBIDDEN" }} Propagated from the service.
 */
export const handleCancelBooking = (bookingId, userId) =>
    bookingService.cancelFullBooking(bookingId, userId);

/**
 * Cancels a single session within a booking on behalf of a user.
 *
 * @param {string} bookingId - ID of the parent booking.
 * @param {string} sessionId - ID of the session to remove.
 * @param {string} userId    - Authenticated user's ID (for authorisation).
 * @returns {Promise<string>} The booking ID (useful for redirects).
 * @throws {{ code: "NOT_FOUND" | "FORBIDDEN" }} Propagated from the service.
 */
export const handleCancelSession = (bookingId, sessionId, userId) =>
    bookingService.cancelSingleSession(bookingId, sessionId, userId);

// ===========================================================================
// API HANDLERS
// ===========================================================================

/**
 * Returns a list of bookings, optionally filtered by userId.
 *
 * @route GET /bookings
 * @param {import("express").Request}  req
 * @param {import("express").Request}  req.query
 * @param {string} [req.query.userId] - Filter to a specific user's bookings.
 * @param {import("express").Response} res
 * @returns {Promise<void>} JSON `{ bookings: object[] }`
 */
export const apiGetBookings = async (req, res) => {
    try {
        const { userId } = req.query;
        const bookings   = await BookingModel.find(userId ? { userId } : {});
        res.status(200).json({ bookings: bookings || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Creates a full-course booking for a given user.
 *
 * @route POST /bookings/course
 * @param {import("express").Request}  req
 * @param {object} req.body
 * @param {string} req.body.userId   - Required.
 * @param {string} req.body.courseId - Required.
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 JSON `{ booking }` on success.
 */
export const apiBookCourse = async (req, res) => {
    try {
        const { userId, courseId } = req.body;
        if (!userId || !courseId) {
            return res.status(400).json({ error: "userId and courseId are required" });
        }

        const [user, course] = await Promise.all([
            UserModel.findById(userId),
            CourseModel.findById(courseId),
        ]);
        if (!user)   return res.status(404).json({ error: "User not found" });
        if (!course) return res.status(404).json({ error: "Course not found" });

        const booking = await bookingService.bookCourseForUser(userId, courseId);
        res.status(201).json({ booking });
    } catch (err) {
        const status = err.message.includes("already") ? 409 : 400;
        res.status(status).json({ error: err.message });
    }
};

/**
 * Creates a session booking for a given user.
 *
 * @route POST /bookings/session
 * @param {import("express").Request}  req
 * @param {object} req.body
 * @param {string} req.body.userId    - Required.
 * @param {string} req.body.sessionId - Required.
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 JSON `{ booking }` on success.
 */
export const apiBookSession = async (req, res) => {
    try {
        const { userId, sessionId } = req.body;
        if (!userId || !sessionId) {
            return res.status(400).json({ error: "userId and sessionId are required" });
        }

        const [user, session] = await Promise.all([
            UserModel.findById(userId),
            SessionModel.findById(sessionId),
        ]);
        if (!user)    return res.status(404).json({ error: "User not found" });
        if (!session) return res.status(404).json({ error: "Session not found" });

        const booking = await bookingService.bookSessionsForUser(userId, [sessionId], {
            enforceDropIn:      false,
            enforceDuplicates:  false,
        });

        res.status(201).json({
            booking: {
                ...booking,
                type:      booking.type || "SESSION",
                sessionId: booking.sessionIds?.[0] ? String(booking.sessionIds[0]) : undefined,
            },
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Cancels a booking by ID and decrements the bookedCount on each related session.
 *
 * @route DELETE /bookings/:id
 * @param {import("express").Request}  req
 * @param {object} req.params
 * @param {string} req.params.id - The booking ID to cancel.
 * @param {import("express").Response} res
 * @returns {Promise<void>} JSON `{ booking }` with the updated document.
 */
export const apiCancelBooking = async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: "Booking not found" });
        if (booking.status === "CANCELLED") {
            return res.status(400).json({ error: "Already cancelled" });
        }

        await Promise.all(
            (booking.sessionIds ?? []).map((sid) => SessionModel.incrementBookedCount(sid, -1))
        );

        await BookingModel.cancel(req.params.id);
        const updated = await BookingModel.findById(req.params.id);
        res.json({ booking: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};