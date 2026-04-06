//models/sessionModel.js
import { sessionsDb } from "./_db.js";

/**
 * @typedef {Object} Session
 * @property {string} [_id] - The unique identifier for the session.
 * @property {string} courseId - The ID of the associated course.
 * @property {Date|string} startDateTime - The starting date and time.
 * @property {number} [bookedCount] - The current number of bookings.
 */

/**
 * Data access object for Session management.
 */
export const SessionModel = {
    /**
     * Creates a new session in the database.
     * @param {Session} session - The session data to insert.
     * @returns {Promise<Session>} The created session document.
     */
    async create(session) {
        return sessionsDb.insert(session);
    },

    /**
     * Retrieves all sessions for a specific course, ordered by date.
     * @param {string} courseId - The ID of the course to filter by.
     * @returns {Promise<Session[]>} An array of sessions sorted by start time.
     */
    async listByCourse(courseId) {
        return sessionsDb.find({ courseId }).sort({ startDateTime: 1 });
    },

    /**
     * Finds a single session by its unique ID.
     * @param {string} id - The session ID.
     * @returns {Promise<Session|null>} The session document or null if not found.
     */
    async findById(id) {
        return sessionsDb.findOne({ _id: id });
    },

    /**
     * Increments or decrements the booking count for a session.
     * @param {string} id - The session ID.
     * @param {number} [delta=1] - The amount to change the count by (can be negative).
     * @throws {Error} If the session is not found or if the resulting count is negative.
     * @returns {Promise<Session>} The updated session document.
     */
    async incrementBookedCount(id, delta = 1) {
        const s = await this.findById(id);
        if (!s) throw new Error("Session not found");

        const next = (s.bookedCount ?? 0) + delta;
        if (next < 0) throw new Error("Booked count cannot be negative");

        await sessionsDb.update({ _id: id }, { $set: { bookedCount: next } });
        return this.findById(id);
    },
    /**
     * Deletes a session by its unique ID.
     * @param {string} id - The session ID.
     * @returns {Promise<number>} The number of documents removed.
     */
    async delete(id) {
        return sessionsDb.remove({ _id: id }, {});
    },
};