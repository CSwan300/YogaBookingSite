// services/bookingViewService.js
// Assembles view-model data for every booking-related page.
// Controllers call one function here and pass the result straight to res.render().
// No HTTP objects (req / res) ever enter this file.

import { BookingModel } from "../models/bookingModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { CourseModel }  from "../models/courseModel.js";

import {
    fmtDate,
    fmtDateOnly,
    fmtTimeOnly,
    fmtType,
} from "./formatService.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the course title and location for a given session's courseId.
 * Returns safe fallback strings if the course cannot be found.
 *
 * @param {object|null} session - A session document (may be null / undefined).
 * @returns {Promise<{ courseTitle: string, location: string }>}
 */
const resolveCourseInfo = async (session) => {
    if (!session?.courseId) return { courseTitle: "Unknown Course", location: "TBA" };
    const course = await CourseModel.findById(session.courseId);
    return course
        ? { courseTitle: course.title, location: course.location }
        : { courseTitle: "Unknown Course", location: "TBA" };
};

/**
 * Resolves a course ID by looking up the first of a set of session IDs.
 * Used to recover the course context when a booking error occurs mid-flow.
 *
 * @param {string|string[]} rawSessionIds
 * @returns {Promise<string>}
 * @throws {Error} If no session IDs are provided or the session cannot be found.
 */
export const resolveCourseIdFromSessions = async (rawSessionIds) => {
    const ids = Array.isArray(rawSessionIds) ? rawSessionIds : [rawSessionIds];
    if (!ids.length) throw new Error("No session IDs provided");

    const session = await SessionModel.findById(ids[0]);
    if (!session) throw new Error("Session not found");

    return String(session.courseId);
};

// ---------------------------------------------------------------------------
// My Bookings page  —  GET /bookings
// ---------------------------------------------------------------------------

/**
 * Builds the complete view-model for the "my bookings" listing page.
 * Filters out cancelled bookings, resolves session and course data for each,
 * and surfaces the next upcoming session date.
 *
 * @param {string} userId - The authenticated user's ID.
 * @returns {Promise<{ bookings: BookingCard[], hasBookings: boolean }>}
 *
 * @typedef {object} BookingCard
 * @property {string}  id           - Booking ID as a string.
 * @property {string}  type         - Human-readable booking type.
 * @property {string}  status       - Booking status (e.g. "CONFIRMED").
 * @property {string}  createdAt    - Formatted creation date.
 * @property {number}  sessionCount - Total number of sessions in this booking.
 * @property {string}  nextSession  - Formatted date of the next upcoming session.
 * @property {string}  courseTitle  - Title of the parent course.
 * @property {string}  location     - Course location string.
 */
export const getMyBookingsData = async (userId) => {
    const raw    = await BookingModel.listByUser(userId);
    const active = raw.filter((b) => b.status !== "CANCELLED");
    const now    = new Date();

    const bookings = await Promise.all(
        active.map(async (b) => {
            const sessionDocs   = await Promise.all((b.sessionIds || []).map((sid) => SessionModel.findById(sid)));
            const validSessions = sessionDocs.filter(Boolean);

            const upcoming = validSessions
                .filter((s) => new Date(s.startDateTime) >= now)
                .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

            const nextSession = upcoming[0]
                ? fmtDate(upcoming[0].startDateTime)
                : "No upcoming sessions";

            const { courseTitle, location } = await resolveCourseInfo(validSessions[0]);

            return {
                id:           String(b._id),
                type:         fmtType(b.type),
                status:       b.status,
                createdAt:    b.createdAt ? fmtDateOnly(b.createdAt) : "",
                sessionCount: validSessions.length,
                nextSession,
                courseTitle,
                location,
            };
        })
    );

    return { bookings, hasBookings: bookings.length > 0 };
};

// ---------------------------------------------------------------------------
// Booking confirmation page  —  GET /bookings/:bookingId
// ---------------------------------------------------------------------------

/**
 * Builds the view-model for the booking confirmation / status page.
 *
 * @param {string} bookingId   - The booking to display.
 * @param {string} [status]    - Optional status override from the query string
 *                               (e.g. "CANCELLED", "UPDATED"). Falls back to
 *                               the booking's persisted status.
 * @param {string} [returnTo]  - Decoded URL the user should be sent back to.
 *                               Defaults to "/profile".
 * @returns {Promise<ConfirmationViewModel>}
 * @throws {{ code: "NOT_FOUND" }} When the booking does not exist.
 *
 * @typedef {object} ConfirmationViewModel
 * @property {object}         booking      - Formatted booking summary.
 * @property {SessionLine[]}  sessions     - Formatted session rows.
 * @property {boolean}        isCancelled  - True when the effective status is "CANCELLED".
 * @property {boolean}        isUpdated    - True when the effective status is "UPDATED".
 * @property {string}         returnTo     - Back-navigation URL.
 *
 * @typedef {object} SessionLine
 * @property {string} id        - Session ID as a string.
 * @property {string} bookingId - Parent booking ID as a string.
 * @property {string} start     - Formatted start date/time.
 * @property {string} end       - Formatted end time.
 */
export const getBookingConfirmationData = async (bookingId, status, returnTo = "/profile") => {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });

    const sessionDocs = await Promise.all(
        (booking.sessionIds || []).map((sid) => SessionModel.findById(sid))
    );

    const sessions = sessionDocs.filter(Boolean).map((s) => ({
        id:        String(s._id),
        bookingId: String(booking._id),
        start:     fmtDate(s.startDateTime),
        end:       fmtTimeOnly(s.endDateTime),
    }));

    const effectiveStatus = status || booking.status;

    return {
        booking: {
            id:        String(booking._id),
            type:      booking.type,
            status:    effectiveStatus,
            createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
        },
        sessions,
        isCancelled: effectiveStatus === "CANCELLED",
        isUpdated:   effectiveStatus === "UPDATED",
        returnTo,
    };
};

// ---------------------------------------------------------------------------
// Cancel booking page  —  GET /bookings/:bookingId/cancel
// ---------------------------------------------------------------------------

/**
 * Builds the view-model for the cancellation confirmation page.
 * Also performs ownership authorisation — throws FORBIDDEN if the booking
 * does not belong to the requesting user.
 *
 * @param {string}      bookingId       - Booking to be cancelled.
 * @param {string}      userId          - Authenticated user requesting cancellation.
 * @param {string|null} [targetSession] - When set, only this session is being cancelled
 *                                        (partial cancellation flow).
 * @returns {Promise<CancelViewModel>}
 * @throws {{ code: "NOT_FOUND" }}  When the booking does not exist.
 * @throws {{ code: "FORBIDDEN" }}  When the booking belongs to a different user.
 *
 * @typedef {object} CancelViewModel
 * @property {object}        booking         - Booking summary for the template.
 * @property {CancelSession[]} sessions      - Sessions affected by the cancellation.
 * @property {boolean}       isSingleSession - True when only one session is being cancelled.
 * @property {string|null}   targetSessionId - The session ID being cancelled, or null.
 *
 * @typedef {object} CancelSession
 * @property {string}  id       - Session ID as a string.
 * @property {string}  start    - Formatted start date/time.
 * @property {string}  end      - Formatted end time.
 * @property {boolean} isTarget - True when this is the session being cancelled.
 */
export const getCancelBookingData = async (bookingId, userId, targetSession = null) => {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });

    if (booking.userId.toString() !== userId.toString()) {
        throw Object.assign(
            new Error("You can only manage your own bookings."),
            { code: "FORBIDDEN" }
        );
    }

    const sessionDocs = await Promise.all(
        (booking.sessionIds || []).map((sid) => SessionModel.findById(sid))
    );

    const sessions = sessionDocs.filter(Boolean).map((s) => ({
        id:       String(s._id),
        start:    fmtDate(s.startDateTime),
        end:      fmtTimeOnly(s.endDateTime),
        isTarget: targetSession ? String(s._id) === targetSession : true,
    }));

    return {
        booking: {
            id:        booking._id,
            type:      booking.type,
            status:    booking.status,
            createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
        },
        sessions,
        isSingleSession: !!targetSession,
        targetSessionId: targetSession,
    };
};

// ---------------------------------------------------------------------------
// Schedule page  —  GET /schedule
// ---------------------------------------------------------------------------

/**
 * Resolves the set of session IDs and their booking IDs for a given user.
 * Used by the schedule page to mark sessions the user has already booked.
 *
 * @param {string} userId - The authenticated user's ID.
 * @returns {Promise<{ bookedSessionIds: Set<string>, bookingBySessionId: Record<string, string> }>}
 */
export const getUserScheduleBookings = async (userId) => {
    const bookings         = await BookingModel.listByUser(userId);
    const bookedSessionIds   = new Set();
    const bookingBySessionId = {};

    for (const b of bookings) {
        if (b.status === "CANCELLED") continue;
        for (const sid of b.sessionIds ?? []) {
            const key = String(sid);
            bookedSessionIds.add(key);
            bookingBySessionId[key] = String(b._id);
        }
    }

    return { bookedSessionIds, bookingBySessionId };
};