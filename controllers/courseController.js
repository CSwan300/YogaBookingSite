// controllers/courseController.js
// JSON API handlers for course and session resources.
// Validation lives here (it is HTTP-layer responsibility); all persistence
// and business logic is delegated to services/courseService.js.

import * as courseService from "../services/courseService.js";
import { CourseModel }    from "../models/courseModel.js";

// ---------------------------------------------------------------------------
// Course endpoints
// ---------------------------------------------------------------------------

/**
 * Returns all available courses.
 *
 * @route GET /courses
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @returns {Promise<void>} JSON `{ courses: Course[] }`
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
 *
 * @route POST /courses
 * @param {import("express").Request}  req
 * @param {object} req.body
 * @param {string} req.body.title        - Required.
 * @param {string} req.body.instructorId - Required.
 * @param {string} req.body.level        - Required.
 * @param {string} req.body.type         - Required.
 * @param {string} [req.body.startDate]  - Optional ISO date string.
 * @param {string} [req.body.endDate]    - Optional ISO date string; must be after startDate.
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 JSON `{ course }` on success.
 */
export const createCourse = async (req, res) => {
    try {
        const { title, instructorId, startDate, endDate, level, type } = req.body;

        if (!title)        return res.status(400).json({ error: "title is required" });
        if (!instructorId) return res.status(400).json({ error: "instructorId is required" });
        if (!level)        return res.status(400).json({ error: "level is required" });
        if (!type)         return res.status(400).json({ error: "type is required" });

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
 * Returns a single course and its associated sessions.
 *
 * @route GET /courses/:id
 * @param {import("express").Request}  req
 * @param {object} req.params
 * @param {string} req.params.id - The course ID to look up.
 * @param {import("express").Response} res
 * @returns {Promise<void>} JSON `{ course, sessions }` on success.
 */
export const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id.trim() === "") {
            return res.status(400).json({ error: "Course ID is required" });
        }

        const { course, sessions } = await courseService.getCourseDetail(id);
        res.json({ course: { ...course, _id: id }, sessions });
    } catch (err) {
        const status = err.code === "NOT_FOUND" ? 404 : 500;
        res.status(status).json({ error: err.message });
    }
};

// ---------------------------------------------------------------------------
// Session endpoints
// ---------------------------------------------------------------------------

/**
 * Creates a session for a specific course.
 *
 * @route POST /sessions
 * @param {import("express").Request}  req
 * @param {object} req.body
 * @param {string} req.body.courseId                    - Required.
 * @param {string} [req.body.startDateTime]             - Session start time (ISO string).
 * @param {string} [req.body.start]                     - Alias for startDateTime.
 * @param {string} [req.body.endDateTime]               - Session end time (ISO string).
 * @param {string} [req.body.end]                       - Alias for endDateTime.
 * @param {number} req.body.capacity                    - Must be > 0.
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 JSON `{ session }` on success.
 */
export const createSession = async (req, res) => {
    try {
        const { courseId, start, end, startDateTime, endDateTime, capacity } = req.body;

        const finalStart = startDateTime || start;
        const finalEnd   = endDateTime   || end;

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
        if (!course) return res.status(404).json({ error: "Course not found" });

        const session = await courseService.createNewSession({
            ...req.body,
            startDateTime: finalStart,
            endDateTime:   finalEnd,
            capacity:      Number(capacity),
        });

        res.status(201).json({ session });
    } catch (err) {
        const status = (err.name === "CastError" || err.kind === "ObjectId") ? 400 : 500;
        res.status(status).json({ error: err.message });
    }
};

/**
 * Returns all sessions belonging to a specific course.
 *
 * @route GET /sessions/by-course/:courseId
 * @param {import("express").Request}  req
 * @param {object} req.params
 * @param {string} req.params.courseId - The course whose sessions to return.
 * @param {import("express").Response} res
 * @returns {Promise<void>} JSON `{ sessions: Session[] }`
 */
export const getSessionsByCourse = async (req, res) => {
    try {
        const sessions = await courseService.listSessionsByCourseId(req.params.courseId);
        res.json({ sessions: sessions || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};