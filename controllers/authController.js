// controllers/authController.js
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel.js";

const JWT_SECRET     = process.env.JWT_SECRET     || "dev-secret-change-me";
const COOKIE_OPTIONS = {
    httpOnly: true,
    signed:   true,
    maxAge:   1000 * 60 * 60 * 24, // 24 hours
    sameSite: "lax",
};

/* ── Login ──────────────────────────────────────────────────── */
export const loginPage = (req, res) => {
    if (res.locals.user) return res.redirect("/");
    res.render("account/login", { title: "Sign In" });
};

export const postLogin = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).render("account/login", {
                title: "Sign In",
                error: "Email is required.",
            });

        const user = await UserModel.findByEmail(email.trim().toLowerCase());
        if (!user)
            return res.status(401).render("account/login", {
                title: "Sign In",
                error: "No account found with that email.",
            });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" }
        );
        res.cookie("token", token, COOKIE_OPTIONS);

        if (user.role === "organiser") return res.redirect("/organiser");
        res.redirect("/");
    } catch (err) {
        next(err);
    }
};

/* ── Logout ─────────────────────────────────────────────────── */
export const logoutHandler = (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
};

/* ── Register ───────────────────────────────────────────────── */
export const registerPage = (req, res) => {
    if (res.locals.user) return res.redirect("/");
    res.render("account/register", { title: "Create Account" });
};

export const postRegister = async (req, res, next) => {
    try {
        const { name, email, password, confirm_password } = req.body;

        if (!name || !email || !password || !confirm_password)
            return res.status(400).render("account/register", {
                title:       "Create Account",
                error:       "All fields are required.",
                name_value:  name  || "",
                email_value: email || "",
            });

        if (password !== confirm_password)
            return res.status(400).render("account/register", {
                title:       "Create Account",
                error:       "Passwords do not match.",
                name_value:  name,
                email_value: email,
            });

        if (password.length < 8)
            return res.status(400).render("account/register", {
                title:       "Create Account",
                error:       "Password must be at least 8 characters.",
                name_value:  name,
                email_value: email,
            });

        const existing = await UserModel.findByEmail(email.trim().toLowerCase());
        if (existing)
            return res.status(409).render("account/register", {
                title:       "Create Account",
                error:       "An account with that email already exists.",
                name_value:  name,
                email_value: email,
            });

        const user = await UserModel.create({
            name:  name.trim(),
            email: email.trim().toLowerCase(),
            role:  "student",
        });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" }
        );
        res.cookie("token", token, COOKIE_OPTIONS);
        res.redirect("/");
    } catch (err) {
        next(err);
    }
};