import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { createSession, getSessionsByCourse } from "../controllers/apiController.js";
import { postBookSession } from "../controllers/viewsController.js";
import { SessionModel } from "../models/sessionModel.js";
import { CourseModel } from "../models/courseModel.js";

const router = Router();

// GET /sessions/:id/book - drop-in booking form
router.get("/:id/book", requireAuth, async (req, res, next) => {
    try {
        const session = await SessionModel.findById(req.params.id);
        if (!session)
            return res.status(404).render("error", { title: "Not Found", message: "Session not found." });

        const course = await CourseModel.findById(session.courseId);
        if (!course)
            return res.status(404).render("error", { title: "Not Found", message: "Course not found." });

        if (!course.allowDropIn)
            return res.status(400).render("error", { title: "Not Allowed", message: "Drop-ins are not enabled for this course." });

        const now = new Date();
        const remaining = Math.max(0, (session.capacity ?? 0) - (session.bookedCount ?? 0));

        res.render("session_book", {
            title: "Book Session",
            course: {
                id:          course._id,
                title:       course.title,
                level:       course.level,
                location:    course.location,
                description: course.description,
            },
            sessions: [{
                id:              String(session._id),
                start:           new Date(session.startDateTime).toLocaleString("en-GB"),
                remaining,
                isFull:          remaining === 0,
                pluralRemaining: remaining !== 1,
                isPast:          new Date(session.startDateTime) < now,
            }],
            user: req.user ? {
                id:    req.user._id,
                name:  req.user.name,
                email: req.user.email,
            } : null,
        });
    } catch (err) {
        next(err);
    }
});

// POST /sessions - no auth for API calls
router.post("/", (req, res, next) => {
    if (req.headers.accept?.includes("application/json"))
        return createSession(req, res, next);
    return requireAuth(req, res, () => createSession(req, res, next));
});

// GET /sessions/by-course/:courseId
router.get("/by-course/:courseId", getSessionsByCourse);

// POST /sessions/book (used by the booking flow)
router.post("/book", requireAuth, postBookSession);

export default router;