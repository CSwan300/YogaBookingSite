// controllers/coursesListController.js
// Handles the GET /courses listing page with filtering, enrichment and pagination.
//
// Design note: the enrichment loop (fetching sessions per course to derive a
// dynamic display price and next-session date) is intentionally kept here rather
// than pushed to a service. It is tightly coupled to URL query params and
// produces view-specific fields (filterPrice, nextSession) that have no meaning
// outside this single route. Moving it to a service would create a leaky
// abstraction without real reuse benefit.
//
// Formatting helpers are imported from services/formatService.js.
// Course shape normalisation is imported from services/courseService.js.

import { CourseModel }      from "../models/courseModel.js";
import { SessionModel }     from "../models/sessionModel.js";
import { buildCourseShape } from "../services/courseService.js";
import { fmtDate }          from "../services/formatService.js";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Builds a paginated URL preserving all existing query params except `page`
 * and `pageSize`.
 *
 * @param {import("express").Request} req      - The current request (used for protocol, host and path).
 * @param {number}                    page     - Target page number.
 * @param {number}                    pageSize - Number of items per page.
 * @returns {string} Fully-qualified relative URL with updated pagination params.
 */
const buildLink = (req, page, pageSize) => {
    const url    = new URL(`${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}`);
    const params = new URLSearchParams(req.query);
    params.set("page",     String(page));
    params.set("pageSize", String(pageSize));
    return `${url.pathname}?${params.toString()}`;
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * Renders the course listing page.
 *
 * Supports the following query parameters:
 * - `level`    — filter by difficulty level ("beginner" | "intermediate" | "advanced")
 * - `type`     — filter by course type ("WEEKLY_BLOCK" | "WEEKEND_WORKSHOP")
 * - `dropin`   — filter by drop-in availability ("true" | "false")
 * - `q`        — free-text search against title and description
 * - `price`    — maximum price cap (integer); applied against the per-session rate
 *                for drop-in courses and the block price for full-course bookings
 * - `page`     — current page number (default: 1)
 * - `pageSize` — items per page (default: 10)
 *
 * The price filter is applied *after* session enrichment because the display
 * price is dynamic (future-session count × drop-in rate) rather than a raw
 * DB field.
 *
 * @route GET /courses
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
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

        // ------------------------------------------------------------------
        // 1. Fetch & filter
        // ------------------------------------------------------------------

        const filter = {};
        if (level)              filter.level       = level;
        if (type)               filter.type        = type;
        // Form values arrive as the strings "true" / "false".
        if (dropin === "true")  filter.allowDropIn = true;
        if (dropin === "false") filter.allowDropIn = false;

        let courses = await CourseModel.list(filter);

        // NeDB has limited querying so free-text search runs in JS.
        const needle = (q || "").trim().toLowerCase();
        if (needle) {
            courses = courses.filter(
                (c) =>
                    c.title?.toLowerCase().includes(needle) ||
                    c.description?.toLowerCase().includes(needle)
            );
        }

        // Sort ascending by startDate, then by title as a tiebreaker.
        courses.sort((a, b) => {
            const ad = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bd = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
            if (ad !== bd) return ad - bd;
            return (a.title || "").localeCompare(b.title || "");
        });

        // ------------------------------------------------------------------
        // 2. Compute filter-option counts for the sidebar dropdowns.
        //    These reflect the counts within the already-filtered set so that
        //    unavailable combinations are shown as zero.
        // ------------------------------------------------------------------

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

        // ------------------------------------------------------------------
        // 3. Enrich with session data.
        //    This must happen before pagination so the price filter can be
        //    applied across the full filtered set.
        // ------------------------------------------------------------------

        const now = new Date();

        const enriched = await Promise.all(
            courses.map(async (c) => {
                const sessions = await SessionModel.listByCourse(c._id);
                const future   = sessions.filter((s) => new Date(s.startDateTime) >= now);
                const first    = future[0] ?? sessions[0];

                // Display price:
                //   Drop-in  → future sessions remaining × per-session rate
                //   Block    → fixed price from the DB
                const sessionRate  = c.dropInPrice || 15;
                const displayPrice = c.allowDropIn ? future.length * sessionRate : c.price ?? 0;

                // Filter price:
                //   Drop-in  → per-session rate (what a user actually pays per transaction)
                //   Block    → full block price
                const filterPrice = c.allowDropIn ? sessionRate : displayPrice;

                return {
                    ...buildCourseShape(c),
                    price:         displayPrice,
                    filterPrice,                              // internal — stripped before render
                    nextSession:   first ? fmtDate(first.startDateTime) : "TBA",
                    sessionsCount: sessions.length,
                };
            })
        );

        // ------------------------------------------------------------------
        // 4. Price filter (post-enrichment)
        // ------------------------------------------------------------------

        const priceMax = price ? parseInt(price, 10) : null;
        const filtered = priceMax
            ? enriched.filter((c) => c.filterPrice <= priceMax)
            : enriched;

        // ------------------------------------------------------------------
        // 5. Paginate
        // ------------------------------------------------------------------

        const p          = Math.max(1, parseInt(page, 10)     || 1);
        const ps         = Math.max(1, parseInt(pageSize, 10) || 10);
        const total      = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / ps));
        const start      = (p - 1) * ps;

        // Strip the internal filterPrice field before handing data to the template.
        const cards = filtered
            .slice(start, start + ps)
            .map(({ filterPrice: _fp, ...rest }) => rest);

        const pagination = {
            page:      p,
            pageSize:  ps,
            total,
            totalPages,
            hasPrev:   p > 1,
            hasNext:   p < totalPages,
            prevLink:  p > 1          ? buildLink(req, p - 1, ps) : null,
            nextLink:  p < totalPages ? buildLink(req, p + 1, ps) : null,
        };

        // ------------------------------------------------------------------
        // 6. Build filter state object for template helpers
        // ------------------------------------------------------------------

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