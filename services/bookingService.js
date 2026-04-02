/**
 * @typedef {Object} Booking
 * @property {string} _id - Unique ID of the booking
 * @property {string} userId - ID of the user who owns the booking
 * @property {string} courseId - ID of the parent course
 * @property {string} type - 'COURSE' (full block) or 'SESSION' (drop-in)
 * @property {string[]} sessionIds - Array of session IDs included in this booking
 * @property {string} status - Current state: 'CONFIRMED', 'WAITLISTED', or 'CANCELLED'
 */

import { CourseModel }  from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";

/**
 * Validates if all provided sessions have available capacity.
 * @param {Array<Object>} sessions - Array of raw session documents
 * @returns {boolean} True if all sessions can be reserved
 */
const canReserveAll = (sessions) =>
    sessions.every((s) => (s.bookedCount ?? 0) < (s.capacity ?? 0));

/**
 * Books every upcoming session of a course for a user.
 * Performs validation for existing bookings and session availability.
 * @param {string} userId - The authenticated user's ID
 * @param {string} courseId - The ID of the course to book
 * @throws {Error} If course not found, already booked, or no upcoming sessions
 * @returns {Promise<Booking>} The created booking document
 */
export async function bookCourseForUser(userId, courseId) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error("Course not found");

    const existingBookings = await BookingModel.listByUser(userId);
    const alreadyBooked = existingBookings.some(
        (b) => String(b.courseId) === String(courseId) && b.status !== "CANCELLED"
    );

    if (alreadyBooked) {
        const err = new Error("You are already booked onto this course.");
        err.code = "ALREADY_BOOKED";
        throw err;
    }

    const allSessions = await SessionModel.listByCourse(courseId);
    const now = new Date();
    const sessions = allSessions.filter((s) => new Date(s.startDateTime) >= now);

    if (sessions.length === 0) throw new Error("Course has no upcoming sessions");

    let status = "CONFIRMED";
    if (!canReserveAll(sessions)) {
        status = "WAITLISTED";
    } else {
        for (const s of sessions) await SessionModel.incrementBookedCount(s._id, 1);
    }

    return BookingModel.create({
        userId,
        courseId,
        type: "COURSE",
        sessionIds: sessions.map((s) => s._id),
        status,
    });
}

/**
 * Books one or more drop-in sessions for a user.
 * Validates course drop-in permissions and checks for session overlaps.
 * @param {string} userId - The authenticated user's ID
 * @param {string[]} sessionIds - Array of session IDs to book
 * @throws {Error} If sessions missing, drop-ins disabled, or already booked
 * @returns {Promise<Booking>} The created booking document
 */
export async function bookSessionsForUser(userId, sessionIds) {
    if (!sessionIds?.length) throw new Error("No sessions selected");

    const firstSession = await SessionModel.findById(sessionIds[0]);
    if (!firstSession) throw new Error("Session not found");

    const course = await CourseModel.findById(firstSession.courseId);
    if (!course) {
        const err = new Error("Course not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (!course.allowDropIn) {
        const err = new Error("Drop-in not allowed for this course");
        err.code = "DROPIN_NOT_ALLOWED";
        throw err;
    }

    const existingBookings = await BookingModel.listByUser(userId);
    const bookedSessionIds = new Set(
        existingBookings
            .filter((b) => b.status !== "CANCELLED")
            .flatMap((b) => (b.sessionIds ?? []).map(String))
    );

    if (sessionIds.some((id) => bookedSessionIds.has(String(id)))) {
        const err = new Error("You have already booked one or more of these sessions.");
        err.code = "ALREADY_BOOKED";
        throw err;
    }

    const sessions = await Promise.all(sessionIds.map((id) => SessionModel.findById(id)));

    let status = "CONFIRMED";
    for (const session of sessions) {
        if ((session.bookedCount ?? 0) >= (session.capacity ?? 0)) {
            status = "WAITLISTED";
        } else {
            await SessionModel.incrementBookedCount(session._id, 1);
        }
    }

    return BookingModel.create({
        userId,
        courseId: course._id,
        type: "SESSION",
        sessionIds: sessions.map((s) => s._id),
        status,
    });
}
/**
 * Cancels an entire booking and restores capacity to all included sessions.
 * @param {string} bookingId - ID of the booking to cancel
 * @param {string} userId - ID of the user requesting cancellation (for ownership check)
 * @throws {Error} If booking not found or user does not own the booking
 * @returns {Promise<Booking>} The updated booking document
 */
export async function cancelFullBooking(bookingId, userId) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });

    // Only enforce ownership when a userId is explicitly provided
    if (userId && String(booking.userId) !== String(userId)) {
        throw Object.assign(new Error("Unauthorised"), { code: "FORBIDDEN" });
    }

    if (booking.status !== "CANCELLED") {
        for (const sid of booking.sessionIds ?? []) {
            await SessionModel.incrementBookedCount(sid, -1);
        }
        await BookingModel.cancel(bookingId);
    }

    return await BookingModel.findById(bookingId);
}
/**
 * Removes a specific session from an existing booking and restores its capacity.
 * @param {string} bookingId - ID of the parent booking
 * @param {string} sessionId - ID of the session to remove
 * @param {string} userId - ID of the user requesting removal
 * @throws {Error} If booking not found or unauthorized
 * @returns {Promise<string>} The bookingId for redirection purposes
 */
export async function cancelSingleSession(bookingId, sessionId, userId) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });

    if (String(booking.userId) !== String(userId)) {
        throw Object.assign(new Error("Unauthorised"), { code: "FORBIDDEN" });
    }

    await SessionModel.incrementBookedCount(sessionId, -1);
    await BookingModel.removeSession(bookingId, sessionId);

    return bookingId;
}