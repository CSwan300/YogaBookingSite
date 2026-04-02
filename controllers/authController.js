/**
 * @module controllers/authController
 * Handles all user authentication web interface logic including login,
 * registration, and session termination.
 */

import * as authService from "../services/authService.js";

/** * Standard cookie configuration for the application.
 * @type {import('express').CookieOptions}
 */
const COOKIE_OPTIONS = {
    httpOnly: true,
    signed:   true,
    maxAge:   1000 * 60 * 60 * 24, // 24 Hours
    sameSite: "lax",
    path:     "/"
};

/**
 * Renders the login page.
 * Redirects to home if the user is already authenticated.
 * * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const loginPage = (req, res) => {
    if (res.locals.user) return res.redirect("/");
    res.render("account/login", { title: "Sign In" });
};

/**
 * Renders the registration page.
 * Redirects to home if the user is already authenticated.
 * * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const registerPage = (req, res) => {
    if (res.locals.user) return res.redirect("/");
    res.render("account/register", { title: "Create Account" });
};

/**
 * Handles login form submission.
 * Validates credentials via authService and sets the session cookie.
 * * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const postLogin = async (req, res, next) => {
    try {
        const { user, token } = await authService.authenticateUser(req.body.email);

        res.cookie("token", token, COOKIE_OPTIONS);

        // Role-based redirection
        if (user.role === "organiser") {
            return res.redirect("/dashboard");
        }
        res.redirect("/");
    } catch (err) {
        res.status(401).render("account/login", {
            title: "Sign In",
            error: err.message,
        });
    }
};

/**
 * Handles registration form submission.
 * Creates a new student user and sets the session cookie.
 * * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const postRegister = async (req, res, next) => {
    try {
        const { user, token } = await authService.registerStudent(req.body);

        res.cookie("token", token, COOKIE_OPTIONS);
        res.redirect("/");
    } catch (err) {
        res.status(400).render("account/register", {
            title: "Create Account",
            error: err.message,
            name_value: req.body.name,
            email_value: req.body.email,
        });
    }
};

/**
 * Clears the session cookie and renders the logout confirmation page.
 * Note: maxAge is omitted to comply with Express v5 deprecation guidelines.
 * * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const logoutHandler = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        signed:   true,
        sameSite: "lax",
        path:     "/"
    });

    res.render("logout", {
        title: "Signed Out",
        goodbye_message: "You have been successfully signed out. See you back on the mat soon!",
        login_url: "/login",
        home_url: "/",
        home_label: "Home"
    });
};