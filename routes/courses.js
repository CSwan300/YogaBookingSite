//routes/courses.js
import { Router } from "express";
import { getCourses, createCourse, getCourseById } from "../controllers/courseController.js";
import { listCourses, courseDetailPage } from "../controllers/viewsController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

const isApi = (req) => req.headers.accept?.includes("application/json");

router.get("/", (req, res, next) => {
    if (isApi(req)) return getCourses(req, res, next);
    return listCourses(req, res, next);
});

router.post("/", requireAuth, createCourse);

router.get("/:id", (req, res, next) => {
    const id = req.params.id?.trim();
    if (!id) return res.status(400).json({ error: "Course ID is required" });
    if (isApi(req)) return getCourseById(req, res, next);
    return courseDetailPage(req, res, next);
});

export default router;