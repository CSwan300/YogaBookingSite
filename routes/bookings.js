// routes/bookings.js
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { postBookCourse, postBookSession, postCancelBooking } from "../controllers/viewsController.js";
import { apiBookCourse, apiBookSession, apiCancelBooking } from "../controllers/bookingController.js";

const router = Router();

const isApi = (req) => req.headers.accept?.includes("application/json");

/**
 * POST /bookings/course
 * Hybrid: JSON booking for API clients, form submission for browsers.
 */
router.post("/course", (req, res, next) => {
    if (isApi(req)) return apiBookCourse(req, res, next);
    return requireAuth(req, res, () => postBookCourse(req, res, next));
});

/**
 * POST /bookings/session
 * Hybrid: JSON booking for API clients, form submission for browsers.
 */
router.post("/session", (req, res, next) => {
    if (isApi(req)) return apiBookSession(req, res, next);
    return requireAuth(req, res, () => postBookSession(req, res, next));
});

/**
 * DELETE /bookings/:id
 * Hybrid: JSON cancellation for API clients, form submission for browsers.
 */
router.delete("/:id", (req, res, next) => {
    if (isApi(req)) return apiCancelBooking(req, res, next);
    return requireAuth(req, res, () => postCancelBooking(req, res, next));
});

export default router;