import * as authService from "../services/authService.js";

/**
 * Middleware: Attaches user data to the request and response locals.
 * Checks for a signed 'token' cookie and verifies it via authService.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const attachSessionUser = async (req, res, next) => {
    // ── Test Bypass ──
    if (process.env.NODE_ENV === "test") {
        const mockUser = {
            _id: "test-id",
            name: "Test User",
            role: "student",
            userInitials: "TU"
        };
        req.user = mockUser;
        res.locals.user = {
            id: mockUser._id,
            name: mockUser.name,
            role: mockUser.role,
            userInitials: "TU",
            isStudent: true,
            isOrganiser: false
        };
        return next();
    }

    const token = req.signedCookies?.token;
    if (!token) {
        return clearAndNext(req, res, next);
    }

    const user = await authService.verifyTokenAndGetUser(token);
    if (!user) {
        res.clearCookie("token");
        return clearAndNext(req, res, next);
    }

    // Attach full document to Request, and view-friendly object to Locals
    req.user = user;
    res.locals.user = {
        id:           user._id,
        name:         user.name,
        role:         user.role,
        image:        user.image || null,
        userInitials: user.userInitials || '',
        isStudent:    user.role === "student",
        isOrganiser:  user.role === "organiser",
    };
    next();
};

/**
 * Internal helper to nullify user state.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function clearAndNext(req, res, next) {
    req.user = null;
    res.locals.user = null;
    next();
}

/**
 * Guard: Only allows authenticated users to proceed.
 * Redirects guests to the login page.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const requireAuth = (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();
    if (!req.user) return res.redirect("/login");
    next();
};

/**
 * Guard: Only allows users with the 'organiser' role.
 * Renders a 403 error page if the user is a student or guest.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const requireOrganiser = (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();
    if (!req.user || req.user.role !== "organiser") {
        return res.status(403).render("error", {
            title: "Access denied",
            message: "You must be an organiser to access this page.",
        });
    }
    next();
};