/**
 * @typedef {Object} Booking
 * @property {string} _id - Unique ID of the booking
 * @property {string} userId - ID of the user who owns the booking
 * @property {string} courseId - ID of the parent course
 * @property {string} type - 'COURSE' (full block) or 'SESSION' (drop-in)
 * @property {string[]} sessionIds - Array of session IDs included in this booking
 * @property {'CONFIRMED'|'WAITLISTED'|'CANCELLED'} status - Current state of the booking
 */

import { CourseModel }  from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";

/**
 * Checks if all provided sessions have available capacity.
 * @param {Array<Object>} sessions - Array of session objects to check.
 * @returns {boolean} True if every session has at least one spot left.
 * @private
 */
const canReserveAll = (sessions) =>
    sessions.every((s) => (s.bookedCount ?? 0) < (s.capacity ?? 0));

/**
 * Books a user onto all upcoming sessions of a specific course.
 * Logic: Filters out past sessions, checks for existing active bookings,
 * and sets status to 'WAITLISTED' if any session is full.
 * * @param {string} userId - ID of the user.
 * @param {string} courseId - ID of the course to book.
 * @throws {Error} "Course not found"
 * @throws {Error} "You are already booked onto this course." (Code: ALREADY_BOOKED)
 * @throws {Error} "Course has no upcoming sessions"
 * @returns {Promise<Booking>} The created booking record.
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
 * Books a user for specific individual sessions (drop-ins).
 * * @param {string} userId - ID of the user.
 * @param {string[]} sessionIds - Array of specific session IDs to book.
 * @param {Object} [options] - Booking configurations.
 * @param {boolean} [options.enforceDropIn=true] - If true, checks if the course allows drop-ins.
 * @param {boolean} [options.enforceDuplicates=true] - If true, prevents re-booking the same sessions.
 * @throws {Error} "No sessions selected"
 * @throws {Error} "Session not found" or "Course not found" (Code: NOT_FOUND)
 * @throws {Error} "Drop-in not allowed for this course" (Code: DROPIN_NOT_ALLOWED)
 * @throws {Error} "You have already booked one or more of these sessions." (Code: ALREADY_BOOKED)
 * @returns {Promise<Booking>} The created session booking record.
 */
export async function bookSessionsForUser(userId, sessionIds, { enforceDropIn = true, enforceDuplicates = true } = {}) {
    if (!sessionIds?.length) throw new Error("No sessions selected");

    const firstSession = await SessionModel.findById(sessionIds[0]);
    if (!firstSession) throw new Error("Session not found");

    const course = await CourseModel.findById(firstSession.courseId);
    if (!course) {
        const err = new Error("Course not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (enforceDropIn && !course.allowDropIn) {
        const err = new Error("Drop-in not allowed for this course");
        err.code = "DROPIN_NOT_ALLOWED";
        throw err;
    }

    if (enforceDuplicates) {
        const existingBookings = await BookingModel.listByUser(userId);
        const bookedSessionIds = new Set(
            existingBookings
                .filter((b) => b.status !== "CANCELLED" && b.type === "SESSION")
                .flatMap((b) => (b.sessionIds ?? []).map(String))
        );

        if (sessionIds.some((id) => bookedSessionIds.has(String(id)))) {
            const err = new Error("You have already booked one or more of these sessions.");
            err.code = "ALREADY_BOOKED";
            throw err;
        }
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
 * Cancels an entire booking and releases the capacity for all associated sessions.
 * * @param {string} bookingId - ID of the booking to cancel.
 * @param {string} [userId] - Optional ID of the user (for authorization check).
 * @throws {Error} "Booking not found" (Code: NOT_FOUND)
 * @throws {Error} "Unauthorised" (Code: FORBIDDEN)
 * @returns {Promise<Booking>} The updated (cancelled) booking record.
 */
export async function cancelFullBooking(bookingId, userId) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });

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
 * Removes a single session from a booking and decreases the session's booked count.
 * * @param {string} bookingId - ID of the booking.
 * @param {string} sessionId - ID of the session to remove.
 * @param {string} userId - ID of the user requesting cancellation.
 * @throws {Error} "Booking not found" (Code: NOT_FOUND)
 * @throws {Error} "Unauthorised" (Code: FORBIDDEN)
 * @returns {Promise<string>} The ID of the modified booking.
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