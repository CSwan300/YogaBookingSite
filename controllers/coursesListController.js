// controllers/coursesListController.js
// Handles the /courses listing page with filtering and pagination.
// Heavy query logic stays here (it is tightly coupled to URL params);
// formatting helpers are imported from services/formatService.js.

import { CourseModel }  from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { fmtDateOnly, fmtDate } from "../services/formatService.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Builds a paginated URL preserving all existing query params except `page`.
 *
 * @param {import("express").Request} req
 * @param {number} page
 * @param {number} pageSize
 * @returns {string}
 */
function buildLink(req, page, pageSize) {
    const url    = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}`);
    const params = new URLSearchParams(req.query);
    params.set("page",     String(page));
    params.set("pageSize", String(pageSize));
    return `${url.pathname}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET /courses
 * Renders the courses listing page with optional filtering by level, type,
 * drop-in availability, free-text search, and pagination.
 */
export const coursesListPage = async (req, res, next) => {
    try {
        const {
            level,
            type,
            dropin,
            q,
            page     = "1",
            pageSize = "10",
        } = req.query;

        // Build the DB filter from query params
        const filter = {};
        if (level)          filter.level        = level;
        if (type)           filter.type         = type;
        if (dropin === "yes") filter.allowDropIn = true;
        if (dropin === "no")  filter.allowDropIn = false;

        let courses = await CourseModel.list(filter);

        // Client-side text search (NeDB has limited querying)
        const needle = (q || "").trim().toLowerCase();
        if (needle) {
            courses = courses.filter(
                (c) =>
                    c.title?.toLowerCase().includes(needle) ||
                    c.description?.toLowerCase().includes(needle)
            );
        }

        // Sort ascending by startDate, then by title
        courses.sort((a, b) => {
            const ad = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bd = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            if (ad !== bd) return ad - bd;
            return (a.title || "").localeCompare(b.title || "");
        });

        // Compute filter counts for frontend dropdowns
        const levelCounts = {
            beginner:     courses.filter((c) => c.level === "beginner").length,
            intermediate: courses.filter((c) => c.level === "intermediate").length,
            advanced:     courses.filter((c) => c.level === "advanced").length,
        };

        const typeCounts = {
            WEEKLY_BLOCK:     courses.filter((c) => c.type === "WEEKLY_BLOCK").length,
            WEEKEND_WORKSHOP: courses.filter((c) => c.type === "WEEKEND_WORKSHOP").length,
        };

        const dropinCounts = {
            true:  courses.filter((c) => c.allowDropIn === true).length,
            false: courses.filter((c) => c.allowDropIn === false).length,
        };

        // Pagination
        const p          = Math.max(1, parseInt(page, 10)     || 1);
        const ps         = Math.max(1, parseInt(pageSize, 10) || 10);
        const total      = courses.length;
        const totalPages = Math.max(1, Math.ceil(total / ps));
        const start      = (p - 1) * ps;
        const pageItems  = courses.slice(start, start + ps);

        // Enrich each page item with first-session date and session count
        const cards = await Promise.all(
            pageItems.map(async (c) => {
                const sessions = await SessionModel.listByCourse(c._id);
                const first    = sessions[0];
                return {
                    id:            c._id,
                    title:         c.title,
                    level:         c.level,
                    type:          c.type,
                    allowDropIn:   c.allowDropIn,
                    startDate:     fmtDateOnly(c.startDate),
                    endDate:       fmtDateOnly(c.endDate),
                    nextSession:   first ? fmtDate(first.startDateTime) : "TBA",
                    sessionsCount: sessions.length,
                    description:   c.description,
                };
            })
        );

        const pagination = {
            page:       p,
            pageSize:   ps,
            total,
            totalPages,
            hasPrev:  p > 1,
            hasNext:  p < totalPages,
            prevLink: p > 1           ? buildLink(req, p - 1, ps) : null,
            nextLink: p < totalPages  ? buildLink(req, p + 1, ps) : null,
        };

        const filters = {
            level, type, dropin, q,
            isBeginnerSelected:     level  === "beginner",
            isIntermediateSelected: level  === "intermediate",
            isAdvancedSelected:     level  === "advanced",
            isWeeklySelected:       type   === "WEEKLY_BLOCK",
            isWeekendSelected:      type   === "WEEKEND_WORKSHOP",
            isDropinYes:            dropin === "yes",
            isDropinNo:             dropin === "no",
        };

        res.render("courses", {
            title: "Courses",
            filters,
            courses: cards,
            pagination,
            levelCounts,
            typeCounts,
            dropinCounts,
        });
    } catch (err) {
        next(err);
    }
};