import * as courseService from "../services/courseService.js";
import { CourseModel } from "../models/courseModel.js";

/**
 * @typedef {Object} Course
 * @property {string} _id - Unique identifier for the course.
 * @property {string} title - The name of the course.
 * @property {string} instructorId - ID of the assigned instructor.
 * @property {string} startDate - ISO string for course start date.
 * @property {string} endDate - ISO string for course end date.
 * @property {string} level - Difficulty level (e.g., Beginner, Advanced).
 * @property {string} type - Course category or type.
 */

/**
 * @typedef {Object} Session
 * @property {string} _id - Unique identifier for the session.
 * @property {string} courseId - ID of the parent course.
 * @property {string} startDateTime - ISO string for session start time.
 * @property {string} endDateTime - ISO string for session end time.
 * @property {number} capacity - Maximum number of participants.
 * @property {number} bookedCount - Number of current bookings.
 */

/**
 * Retrieves all available courses.
 * @route GET /courses
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>} Returns JSON with an array of {@link Course} objects.
 */
export const getCourses = async (req, res) => {
    try {
        const courses = await courseService.listAllCourses();
        res.json({ courses });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Creates a new course.
 * @route POST /courses
 * @param {import('express').Request} req - Express request object.
 * @param {Object} req.body - Course data.
 * @param {string} req.body.title - Required.
 * @param {string} req.body.instructorId - Required.
 * @param {string} [req.body.startDate] - Optional start date.
 * @param {string} [req.body.endDate] - Optional end date.
 * @param {string} req.body.level - Required.
 * @param {string} req.body.type - Required.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>} Returns 201 and the created {@link Course}.
 * @throws {400} If required fields are missing or dates are invalid.
 */
export const createCourse = async (req, res) => {
    try {
        const { title, instructorId, startDate, endDate, level, type } = req.body;

        if (!title) return res.status(400).json({ error: "title is required" });
        if (!instructorId) return res.status(400).json({ error: "instructorId is required" });
        if (!level) return res.status(400).json({ error: "level is required" });
        if (!type) return res.status(400).json({ error: "type is required" });

        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ error: "endDate must be after startDate" });
        }

        const course = await courseService.createNewCourse(req.body);
        res.status(201).json({ course });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * Retrieves a single course and its associated sessions.
 * @route GET /courses/:id
 * @param {import('express').Request} req - Express request object.
 * @param {Object} req.params - URL parameters.
 * @param {string} req.params.id - The ID of the course.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>} Returns JSON containing the {@link Course} and an array of {@link Session} objects.
 * @throws {400} If ID is missing.
 * @throws {404} If the course is not found.
 */
export const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id.trim() === "") {
            return res.status(400).json({ error: "Course ID is required" });
        }

        const { course, sessions } = await courseService.getCourseDetail(id);
        res.json({
            course: { ...course, _id: id },
            sessions,
        });
    } catch (err) {
        const status = err.code === "NOT_FOUND" ? 404 : 500;
        res.status(status).json({ error: err.message });
    }
};

/**
 * Creates a session for a specific course.
 * @route POST /sessions
 * @param {import('express').Request} req - Express request object.
 * @param {Object} req.body - Session data.
 * @param {string} req.body.courseId - ID of the parent course.
 * @param {string} [req.body.start] - Start time (alias for startDateTime).
 * @param {string} [req.body.end] - End time (alias for endDateTime).
 * @param {string} [req.body.startDateTime] - Start time.
 * @param {string} [req.body.endDateTime] - End time.
 * @param {number} req.body.capacity - Capacity (must be > 0).
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>} Returns 201 and the created {@link Session}.
 * @throws {400} Missing fields, capacity <= 0, or invalid chronology.
 * @throws {404} If the associated courseId does not exist.
 */
export const createSession = async (req, res) => {
    try {
        const { courseId, start, end, startDateTime, endDateTime, capacity } = req.body;

        const finalStart = startDateTime || start;
        const finalEnd = endDateTime || end;

        if (!courseId || !finalStart || !finalEnd || capacity === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (Number(capacity) <= 0) {
            return res.status(400).json({ error: "Capacity must be greater than zero" });
        }

        if (new Date(finalStart) >= new Date(finalEnd)) {
            return res.status(400).json({ error: "Start time must be before end time" });
        }

        const course = await CourseModel.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        const session = await courseService.createNewSession({
            ...req.body,
            startDateTime: finalStart,
            endDateTime: finalEnd,
            capacity: Number(capacity)
        });

        res.status(201).json({ session });
    } catch (err) {
        const status = (err.name === "CastError" || err.kind === "ObjectId") ? 400 : 500;
        res.status(status).json({ error: err.message });
    }
};

/**
 * Lists all sessions belonging to a specific course.
 * @route GET /sessions/by-course/:courseId
 * @param {import('express').Request} req - Express request object.
 * @param {Object} req.params - URL parameters.
 * @param {string} req.params.courseId - The ID of the course to filter by.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>} Returns JSON with an array of {@link Session} objects.
 */
export const getSessionsByCourse = async (req, res) => {
    try {
        const sessions = await courseService.listSessionsByCourseId(req.params.courseId);
        res.json({ sessions: sessions || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};