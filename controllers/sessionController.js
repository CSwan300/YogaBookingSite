// controllers/sessionController.js
// Handles session creation and deletion routes.
// All business logic (slot generation, cascade cleanup) is delegated to
// services/sessionService.js. This file only reads req, calls the service,
// and issues the appropriate redirect or error response.

import { generateSessionSlots, deleteSessionWithCascade } from "../services/sessionService.js";

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

/**
 * Handles POST /sessions.
 *
 * For WEEKLY_BLOCK courses, delegates to the service which auto-generates one
 * slot per week from `startDateTime` through `course.endDate` (inclusive).
 * For all other course types, a single slot is created.
 *
 * On success, redirects the organiser back to the course edit page.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postCreateSession = async (req, res, next) => {
    try {
        const { courseId, startDateTime, durationMins, capacity } = req.body;
        await generateSessionSlots({ courseId, startDateTime, durationMins, capacity });
        res.redirect(`/dashboard/courses/${courseId}/edit`);
    } catch (err) {
        if (err.code === "NOT_FOUND") return res.status(404).send(err.message);
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Session deletion
// ---------------------------------------------------------------------------

/**
 * Handles POST /sessions/:id/delete.
 *
 * Delegates the cascade cleanup (removing the session from any bookings that
 * reference it, then deleting the session document itself) to the service layer.
 *
 * On success, redirects the organiser back to the parent course edit page.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postDeleteSession = async (req, res, next) => {
    try {
        const { courseId } = await deleteSessionWithCascade(req.params.id);
        res.redirect(`/dashboard/courses/${courseId}/edit`);
    } catch (err) {
        if (err.code === "NOT_FOUND") return res.status(404).send(err.message);
        next(err);
    }
};