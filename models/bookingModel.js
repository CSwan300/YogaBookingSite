//models/bookingModel.js
import { bookingsDb } from "./_db.js";

/**
 * @typedef {Object} Booking
 * @property {string} [_id] - The unique identifier for the booking.
 * @property {string} userId - The ID of the user who made the booking.
 * @property {string[]} sessionIds - Array of session IDs included in this booking.
 * @property {string} [status] - The current status (e.g., "CONFIRMED", "CANCELLED").
 * @property {string} [createdAt] - ISO timestamp of when the booking was created.
 */

/**
 * Data access object for Booking management.
 */
export const BookingModel = {
    /**
     * Creates a new booking and sets the creation timestamp.
     * @param {Omit<Booking, 'createdAt'>} booking - The booking data.
     * @returns {Promise<Booking>} The created booking document.
     */
    async create(booking) {
        return bookingsDb.insert({
            ...booking,
            createdAt: new Date().toISOString(),
        });
    },

    /**
     * Finds a booking by its unique ID.
     * @param {string} id - The booking ID.
     * @returns {Promise<Booking|null>} The booking document or null if not found.
     */
    async findById(id) {
        return bookingsDb.findOne({ _id: id });
    },

    /**
     * Checks if a user has an active booking for a specific session.
     * @param {string} userId - The user ID.
     * @param {string} sessionId - The session ID to check within the booking.
     * @returns {Promise<Booking|null>} An active booking or null if none exists.
     */
    async findByUserAndSession(userId, sessionId) {
        return bookingsDb.findOne({
            userId,
            sessionIds: sessionId,
            status: { $ne: "CANCELLED" },
        });
    },

    /**
     * Retrieves all bookings in the system.
     * @returns {Promise<Booking[]>} An array of all bookings.
     */
    async list() {
        return bookingsDb.find({});
    },

    /**
     * Retrieves all bookings for a specific user, newest first.
     * @param {string} userId - The user ID.
     * @returns {Promise<Booking[]>} A sorted array of user bookings.
     */
    async listByUser(userId) {
        return bookingsDb.find({ userId }).sort({ createdAt: -1 });
    },

    /**
     * Marks a booking as cancelled.
     * @param {string} id - The booking ID.
     * @returns {Promise<Booking|null>} The updated booking document.
     */
    async cancel(id) {
        await bookingsDb.update({ _id: id }, { $set: { status: "CANCELLED" } });
        return this.findById(id);
    },

    /**
     * Removes a session from a booking. If no sessions remain, the booking is cancelled.
     * @param {string} bookingId - The ID of the booking to modify.
     * @param {string} sessionId - The ID of the session to remove from the array.
     * @returns {Promise<Booking|null>} The updated booking document.
     */
    async removeSession(bookingId, sessionId) {
        await bookingsDb.update(
            { _id: bookingId },
            { $pull: { sessionIds: sessionId } }
        );

        const updated = await this.findById(bookingId);
        if (!updated || !updated.sessionIds || updated.sessionIds.length === 0) {
            await this.cancel(bookingId);
        }
        return this.findById(bookingId);
    },
};