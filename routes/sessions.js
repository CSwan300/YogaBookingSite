// routes/sessions.js
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getSessionsByCourse } from "../controllers/courseController.js";
import { getSingleSessionBookPage, postCreateSession, postBookSession } from "../controllers/viewsController.js";

const router = Router();

/**
 * GET /sessions/:id/book
 * Renders the drop-in booking page for a single session.
 */
router.get("/:id/book", requireAuth, getSingleSessionBookPage);

/**
 * POST /sessions
 * Creates a new session. Hybrid: delegates to courseController.createSession,
 * applying requireAuth for non-API callers (handled inside postCreateSession).
 */
router.post("/", postCreateSession);

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