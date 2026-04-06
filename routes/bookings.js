//routes/bookings.js
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { myBookingsPage, postBookCourse, postBookSession, postCancelBooking } from "../controllers/viewsController.js";
import { apiGetBookings, apiBookCourse, apiBookSession, apiCancelBooking } from "../controllers/bookingController.js";

const router = Router();

const isApi = (req) => req.headers.accept?.includes("application/json");

router.get("/", (req, res, next) => {
    if (isApi(req)) return apiGetBookings(req, res, next);
    return requireAuth(req, res, () => myBookingsPage(req, res, next));
});

router.post("/course", (req, res, next) => {
    if (isApi(req)) return apiBookCourse(req, res, next);
    return requireAuth(req, res, () => postBookCourse(req, res, next));
});

router.post("/session", (req, res, next) => {
    if (isApi(req)) return apiBookSession(req, res, next);
    return requireAuth(req, res, () => postBookSession(req, res, next));
});

router.delete("/:id", (req, res, next) => {
    if (isApi(req)) return apiCancelBooking(req, res, next);
    return requireAuth(req, res, () => postCancelBooking(req, res, next));
});

export default router;