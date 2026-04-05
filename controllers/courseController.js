// controllers/sessionsController.js
// Orchestrates session scheduling and capacity management for individual courses.
// Interfaces with models/sessionModel.js for direct increments and availability checks;
// leverages services/timeService.js for timezone conversions and conflict detection.

import * as courseService from "../services/courseService.js";

/**
 * GET /courses
 * Returns a JSON list of all available courses.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
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
 * POST /courses
 * Creates a new course via the service layer.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const createCourse = async (req, res) => {
    try {
        const course = await courseService.createNewCourse(req.body);
        res.status(201).json({ course });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * GET /courses/:id
 * Fetches course details and associated sessions, including dynamic price calculation.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getCourseById = async (req, res) => {
    try {
        const { course, sessions } = await courseService.getCourseDetail(req.params.id);
        res.json({
            course: { ...course, _id: req.params.id },
            sessions,
        });
    } catch (err) {
        const status = err.code === "NOT_FOUND" ? 404 : 500;
        res.status(status).json({ error: err.message });
    }
};

/**
 * POST /sessions
 * Creates a new session entry for a course.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const createSession = async (req, res) => {
    try {
        const session = await courseService.createNewSession(req.body);
        res.status(201).json({ session });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * GET /sessions/by-course/:courseId
 * Returns all sessions for a specific course ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getSessionsByCourse = async (req, res) => {
    try {
        const sessions = await courseService.listSessionsByCourseId(req.params.courseId);
        res.json({ sessions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};