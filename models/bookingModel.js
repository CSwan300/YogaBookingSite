// models/bookingModel.js
import { bookingsDb } from "./_db.js";

/**
 * @typedef {Object} Booking
 * @property {string} [_id] - Unique identifier.
 * @property {string} userId - ID of the student.
 * @property {string[]} sessionIds - Array of session IDs.
 * @property {string} [courseId] - ID of the course (for COURSE type).
 * @property {string} [type] - "COURSE" or "SESSION".
 * @property {string} [status] - "CONFIRMED", "WAITLISTED", or "CANCELLED".
 * @property {string} [createdAt] - ISO timestamp.
 */

export const BookingModel = {
    async create(booking) {
        return bookingsDb.insert({
            ...booking,
            status: booking.status || "CONFIRMED",
            createdAt: new Date().toISOString(),
        });
    },

    async findById(id) {
        return bookingsDb.findOne({ _id: id });
    },

    /**
     * Generic find to support controller filters (e.g., { userId }).
     * Fixes the "TypeError: BookingModel.find is not a function"
     */
    async find(query = {}) {
        return bookingsDb.find(query);
    },

    async findByUserAndSession(userId, sessionId) {
        return bookingsDb.findOne({
            userId,
            sessionIds: sessionId,
            status: { $ne: "CANCELLED" },
        });
    },

    async list() {
        return bookingsDb.find({});
    },

    async listByUser(userId) {
        return bookingsDb.find({ userId }).sort({ createdAt: -1 });
    },

    async cancel(id) {
        await bookingsDb.update({ _id: id }, { $set: { status: "CANCELLED" } });
        return this.findById(id);
    },

    async removeSession(bookingId, sessionId) {
        await bookingsDb.update(
            { _id: bookingId },
            { $pull: { sessionIds: sessionId } }
        );

        const updated = await this.findById(bookingId);
        if (!updated || !updated.sessionIds || updated.sessionIds.length === 0) {
            return this.cancel(bookingId);
        }
        return updated;
    },
};