import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";

export const bookDropInSession = async (req, res, next) => {
    try {
        const { session } = await SessionModel.findByIdWithValidation(req.params.id, req.user._id);
        await BookingModel.createDropInBooking(req.user._id, session);
        res.redirect(`/courses/${session.courseId}?booked=session`);
    } catch (err) {
        next(err);
    }
};