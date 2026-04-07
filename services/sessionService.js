// services/sessionService.js
// Business logic for session lifecycle: generating weekly/single slots from a
// course definition, and safely deleting a session while cleaning up bookings.
// No HTTP objects (req / res) live here.

import { CourseModel }   from "../models/courseModel.js";
import { SessionModel }  from "../models/sessionModel.js";
import { BookingModel }  from "../models/bookingModel.js";
import { createNewSession } from "./courseService.js";

// ---------------------------------------------------------------------------
// Slot generation
// ---------------------------------------------------------------------------

/**
 * Generates one or more session slots for a course and persists them.
 *
 * Behaviour by course type:
 * - **WEEKLY_BLOCK** — creates one slot per week, starting at `startDateTime`
 *   and repeating until `course.endDate` (inclusive, normalised to end-of-day).
 * - **All other types** (e.g. WEEKEND_WORKSHOP) — creates a single slot.
 *
 * @param {object} params
 * @param {string} params.courseId      - ID of the parent course.
 * @param {string} params.startDateTime - ISO string for the first session start.
 * @param {number} params.durationMins  - Session length in minutes.
 * @param {number} params.capacity      - Maximum participants per slot.
 * @returns {Promise<object[]>} Array of created session documents.
 * @throws {{ code: "NOT_FOUND" }} When the course does not exist.
 * @throws {Error}                When required params are missing or invalid.
 */
export const generateSessionSlots = async ({ courseId, startDateTime, durationMins, capacity }) => {
    if (!courseId || !startDateTime || !durationMins || !capacity) {
        throw new Error("courseId, startDateTime, durationMins and capacity are all required");
    }

    const course = await CourseModel.findById(courseId);
    if (!course) throw Object.assign(new Error("Course not found"), { code: "NOT_FOUND" });

    const durationMs = Number(durationMins) * 60_000;

    // Normalise endDate to end-of-day so a session that falls on the end date is included.
    const endDate = new Date(course.endDate);
    endDate.setHours(23, 59, 59, 999);

    const slots = [];
    let current = new Date(startDateTime);

    if (course.type === "WEEKLY_BLOCK") {
        while (current <= endDate) {
            slots.push({
                courseId,
                startDateTime: current.toISOString(),
                endDateTime:   new Date(current.getTime() + durationMs).toISOString(),
                capacity:      Number(capacity),
                bookedCount:   0,
            });
            // Advance by exactly one calendar week.
            current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
    } else {
        // WEEKEND_WORKSHOP or any future type — single slot only.
        slots.push({
            courseId,
            startDateTime: current.toISOString(),
            endDateTime:   new Date(current.getTime() + durationMs).toISOString(),
            capacity:      Number(capacity),
            bookedCount:   0,
        });
    }

    // Persist sequentially to preserve chronological order in the DB.
    const created = [];
    for (const slot of slots) {
        created.push(await createNewSession(slot));
    }

    return created;
};

// ---------------------------------------------------------------------------
// Cascade delete
// ---------------------------------------------------------------------------

/**
 * Deletes a session and removes it from every booking that references it.
 * Bookings that still have other sessions are left active; the session entry
 * is simply stripped from their `sessionIds` array via `BookingModel.removeSession`.
 *
 * @param {string} sessionId - The ID of the session to delete.
 * @returns {Promise<{ courseId: string }>} The parent course ID, useful for
 *   post-delete redirects back to the course edit page.
 * @throws {{ code: "NOT_FOUND" }} When the session does not exist.
 */
export const deleteSessionWithCascade = async (sessionId) => {
    const session = await SessionModel.findById(sessionId);
    if (!session) throw Object.assign(new Error("Session not found"), { code: "NOT_FOUND" });

    const courseId = String(session.courseId);

    // Strip this session from any bookings that include it.
    const bookings = (await BookingModel.listByCourse?.(courseId)) ?? [];
    await Promise.all(
        bookings
            .filter((b) => (b.sessionIds ?? []).map(String).includes(sessionId))
            .map((b)  => BookingModel.removeSession(b._id, sessionId))
    );

    await SessionModel.delete(sessionId);

    return { courseId };
};