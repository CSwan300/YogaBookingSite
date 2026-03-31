// controllers/courseController.js
// Handles all course and session data operations (API layer).

import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

/**
 * GET /courses
 */
export const getCourses = async (req, res) => {
    try {
        const courses = await CourseModel.list();
        res.json({ courses });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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