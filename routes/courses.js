// routes/courses.js
import { Router } from "express";
import { getCourses, createCourse, getCourseById } from "../controllers/courseController.js";
import { listCourses, courseDetailPage } from "../controllers/viewsController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

const isApi = (req) => req.headers.accept?.includes("application/json");

/**
 * GET /courses
 * Hybrid: JSON for API clients, HTML courses listing page for browsers.
 */
router.get("/", (req, res, next) => {
    if (isApi(req)) return getCourses(req, res, next);
    return listCourses(req, res, next);
});

/**
 * POST /courses
 * Creates a new course. Returns 201 + JSON.
 */
router.post("/", requireAuth, createCourse);

/**
 * GET /courses/:id
 * Hybrid: JSON (course + sessions) for API clients, detail page for browsers.
 */
router.get("/:id", (req, res, next) => {
    if (isApi(req)) return getCourseById(req, res, next);
    return courseDetailPage(req, res, next);
});

export default router;