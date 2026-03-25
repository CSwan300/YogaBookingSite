// models/bookingModel.js
import { bookingsDb } from './_db.js';

export const BookingModel = {
    async create(booking) {
        return bookingsDb.insert({ ...booking, createdAt: new Date().toISOString() });
    },
    async findById(id) {
        return bookingsDb.findOne({ _id: id });
    },
    async findByUserAndSession(userId, sessionId) {
        return bookingsDb.findOne({ userId, sessionIds: sessionId, status: { $ne: "CANCELLED" } });
    },
    async listByUser(userId) {
        return bookingsDb.find({ userId }).sort({ createdAt: -1 });
    },
    async cancel(id) {
        await bookingsDb.update({ _id: id }, { $set: { status: "CANCELLED" } });
        return this.findById(id);
    },
    async removeSession(bookingId, sessionId) {
        // Use $pull to remove the specific sessionId from the array
        await bookingsDb.update(
            { _id: bookingId },
            { $pull: { sessionIds: sessionId } }
        );

        // Check if there are any sessions left; if not, cancel the whole booking
        const updated = await this.findById(bookingId);
        if (!updated.sessionIds || updated.sessionIds.length === 0) {
            await this.cancel(bookingId);
        }
        return this.findById(bookingId);
    }
};