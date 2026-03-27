import { bookingsDb } from "./_db.js";
import { SessionModel } from "./sessionModel.js";


export const BookingModel = {
    async create(booking) {
        return bookingsDb.insert({
            ...booking,
            createdAt: new Date().toISOString(),
        });
    },

    async findById(id) {
        return bookingsDb.findOne({ _id: id });
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
        if (!updated.sessionIds || updated.sessionIds.length === 0) {
            await this.cancel(bookingId);
        }
        return this.findById(bookingId);
    },

    // Helper for drop‑in bookings
    async createDropInBooking(userId, session) {
        const booking = {
            userId,
            sessionIds: [session._id],
            courseId: session.courseId,
            type: "drop-in",
        };
        await this.create(booking);
        await SessionModel.incrementBookedCount(session._id);
    },
};