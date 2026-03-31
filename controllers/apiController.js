import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { bookCourseForUser, bookSessionsForUser } from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";

/**
 * GET /courses
 */
export const getCourses = async (req, res) => {
    const courses = await CourseModel.list();
    res.json({ courses });
};

/**
 * POST /courses
 */
export const createCourse = async (req, res) => {
    try {
        const course = await CourseModel.create(req.body);
        res.status(201).json({ course });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * GET /courses/:id
 */
export const getCourseById = async (req, res) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course) return res.status(404).json({ error: "Course not found" });
        const sessions = await SessionModel.listByCourse(course._id);
        res.json({ course, sessions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /sessions
 */
export const createSession = async (req, res) => {
    try {
        const { courseId, start, end, startDateTime, endDateTime, capacity, bookedCount } = req.body;
        const session = await SessionModel.create({
            courseId,
            startDateTime: startDateTime || start,
            endDateTime:   endDateTime   || end,
            capacity,
            bookedCount:   bookedCount ?? 0,
        });
        res.status(201).json({ session });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * GET /sessions/by-course/:courseId
 */
export const getSessionsByCourse = async (req, res) => {
    try {
        const sessions = await SessionModel.listByCourse(req.params.courseId);
        res.json({ sessions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /bookings/course
 */
export const apiBookCourse = async (req, res) => {
    try {
        const { userId, courseId } = req.body;
        if (!userId || !courseId)
            return res.status(400).json({ error: "userId and courseId are required" });
        const booking = await bookCourseForUser(userId, courseId);
        res.status(201).json({ booking });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * POST /bookings/session
 */
export const apiBookSession = async (req, res) => {
    try {
        const { userId, sessionId } = req.body;
        if (!userId || !sessionId)
            return res.status(400).json({ error: "userId and sessionId are required" });
        const booking = await bookSessionsForUser(userId, [sessionId]);
        res.status(201).json({ booking });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * DELETE /bookings/:id
 */
export const apiCancelBooking = async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);
        if (!booking)
            return res.status(404).json({ error: "Booking not found" });
        await BookingModel.cancel(booking._id);
        const updated = await BookingModel.findById(booking._id);
        res.json({ booking: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};