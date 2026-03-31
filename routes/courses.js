import { Router } from "express";
import {
    getCourses,
    createCourse,
    getCourseById
} from "../controllers/apiController.js";
import {
    listCourses,
    courseDetailPage
} from "../controllers/viewsController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

/**
 * GET /courses
 * Hybrid Route: Returns JSON for API/Tests, HTML for Browsers.
 */
router.get("/", (req, res, next) => {
    const isApi = req.headers.accept && req.headers.accept.includes("application/json");

    if (isApi) {
        return getCourses(req, res, next);
    }
    return listCourses(req, res, next);
});

/**
 * POST /courses
 * Protected Route: Creates a new course.
 * Tests expect a 201 Created status with the course JSON.
 */
router.post("/", requireAuth, createCourse);

/**
 * GET /courses/:id
 * Hybrid Route: Returns Course + Sessions JSON for API, Detail Page for Browsers.
 */
router.get("/:id", (req, res, next) => {
    const isApi = req.headers.accept && req.headers.accept.includes("application/json");

    if (isApi) {
        return getCourseById(req, res, next);
    }
    return courseDetailPage(req, res, next);
});

export default router;