import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getSessionsByCourse } from "../controllers/apiController.js";
import {
    getSingleSessionBookPage,
    postCreateSession,
    postBookSession
} from "../controllers/viewsController.js";

const router = Router();

// GET /sessions/:id/book
router.get("/:id/book", requireAuth, getSingleSessionBookPage);

// POST /sessions
router.post("/", postCreateSession);

// GET /sessions/by-course/:courseId
router.get("/by-course/:courseId", getSessionsByCourse);

// POST /sessions/book
router.post("/book", requireAuth, postBookSession);

export default router;