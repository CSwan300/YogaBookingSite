import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
    postBookCourse,
    postBookSession,
    postCancelBooking
} from "../controllers/viewsController.js";
import {
    apiBookCourse,
    apiBookSession,
    apiCancelBooking
} from "../controllers/apiController.js";

const router = Router();

// API routes (JSON, no auth middleware - userId comes from body)
router.post("/course", (req, res, next) => {
    if (req.headers.accept?.includes("application/json"))
        return apiBookCourse(req, res, next);
    return requireAuth(req, res, () => postBookCourse(req, res, next));
});

router.post("/session", (req, res, next) => {
    if (req.headers.accept?.includes("application/json"))
        return apiBookSession(req, res, next);
    return requireAuth(req, res, () => postBookSession(req, res, next));
});

router.delete("/:id", (req, res, next) => {
    if (req.headers.accept?.includes("application/json"))
        return apiCancelBooking(req, res, next);
    return requireAuth(req, res, () => postCancelBooking(req, res, next));
});

export default router;