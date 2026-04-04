// routes/sessions.js
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getSessionsByCourse, createSession } from "../controllers/courseController.js";
import { getSingleSessionBookPage, postCreateSession, postBookSession } from "../controllers/viewsController.js";

const router = Router();

/**
 * GET /sessions/:id/book
 * Renders the drop-in booking page for a single session.
 */
router.get("/:id/book", requireAuth, getSingleSessionBookPage);

/**
 * POST /sessions
 * Hybrid endpoint — branches on the Accept header:
 *   - JSON clients (Accept: application/json): delegates to courseController.createSession,
 *     returning 201 { session } on success.
 *   - HTML clients (browser form submissions): delegates to viewsController.postCreateSession,
 *     which generates sessions for a course and redirects to the edit page on success.
 */
router.post("/", (req, res, next) => {
    if (req.accepts("json") && !req.accepts("html")) {
        return createSession(req, res, next);
    }
    return postCreateSession(req, res, next);
});

/**
 * GET /sessions/by-course/:courseId
 * Returns all sessions for a given course as JSON.
 */
router.get("/by-course/:courseId", getSessionsByCourse);

/**
 * POST /sessions/book
 * Books one or more drop-in sessions for the logged-in user.
 */
router.post("/book", requireAuth, postBookSession);

export default router;