// controllers/coursesListController.js
// Handles the /courses listing page with filtering and pagination.
// Heavy query logic stays here (it is tightly coupled to URL params);
// formatting helpers are imported from services/formatService.js.

import { CourseModel }       from "../models/courseModel.js";
import { SessionModel }      from "../models/sessionModel.js";
import { buildCourseShape }  from "../services/courseService.js";
import { fmtDate }           from "../services/formatService.js";

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
 * drop-in availability, price, free-text search, and pagination.
 */
export const coursesListPage = async (req, res, next) => {
    try {
        const {
            level,
            type,
            dropin,
            q,
            price,
            page     = "1",
            pageSize = "10",
        } = req.query;

        // Build the DB filter from query params.
        // NOTE: dropin values from the form are "true"/"false" strings.
        const filter = {};
        if (level)              filter.level      = level;
        if (type)               filter.type       = type;
        if (dropin === "true")  filter.allowDropIn = true;
        if (dropin === "false") filter.allowDropIn = false;

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

        // ---------------------------------------------------------------------------
        // Enrich ALL filtered courses with session data so we can:
        //   a) apply the price filter against the dynamic (future-session) price
        //   b) paginate the already-enriched set
        // ---------------------------------------------------------------------------
        const now = new Date();

        const enriched = await Promise.all(
            courses.map(async (c) => {
                const sessions = await SessionModel.listByCourse(c._id);
                const future   = sessions.filter((s) => new Date(s.startDateTime) >= now);

                // Use first future session for nextSession; fall back to first overall
                const first = future[0] ?? sessions[0];

                // Dynamic display price:
                //   - Drop-in courses: per-session rate × number of future sessions remaining
                //   - Block courses:   fixed block price from the DB
                const sessionRate  = c.dropInPrice || 15;
                const displayPrice = c.allowDropIn
                    ? future.length * sessionRate
                    : c.price ?? 0;

                // Price used for filtering:
                //   - Drop-in courses: filter against the per-session rate, because that
                //     is the actual cost to the user for a single transaction.
                //   - Block courses:   filter against the full block price.
                const filterPrice = c.allowDropIn ? sessionRate : displayPrice;

                return {
                    ...buildCourseShape(c),
                    price:         displayPrice,
                    filterPrice,                                    // internal only, stripped before render
                    nextSession:   first ? fmtDate(first.startDateTime) : "TBA",
                    sessionsCount: sessions.length,
                };
            })
        );

        // Apply price filter AFTER enrichment (price is dynamic, not a raw DB field)
        const priceMax  = price ? parseInt(price, 10) : null;
        const filtered  = priceMax
            ? enriched.filter((c) => c.filterPrice <= priceMax)
            : enriched;

        // Paginate the enriched + filtered set
        const p          = Math.max(1, parseInt(page, 10)     || 1);
        const ps         = Math.max(1, parseInt(pageSize, 10) || 10);
        const total      = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / ps));
        const start      = (p - 1) * ps;

        // Strip the internal filterPrice field before handing data to the template
        const cards = filtered
            .slice(start, start + ps)
            .map(({ filterPrice: _fp, ...rest }) => rest);

        const pagination = {
            page:       p,
            pageSize:   ps,
            total,
            totalPages,
            hasPrev:  p > 1,
            hasNext:  p < totalPages,
            prevLink: p > 1          ? buildLink(req, p - 1, ps) : null,
            nextLink: p < totalPages ? buildLink(req, p + 1, ps) : null,
        };

        const filters = {
            level, type, dropin, q, price,
            isBeginnerSelected:     level  === "beginner",
            isIntermediateSelected: level  === "intermediate",
            isAdvancedSelected:     level  === "advanced",
            isWeeklySelected:       type   === "WEEKLY_BLOCK",
            isWeekendSelected:      type   === "WEEKEND_WORKSHOP",
            isDropinTrue:           dropin === "true",
            isDropinFalse:          dropin === "false",
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