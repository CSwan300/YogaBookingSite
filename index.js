import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
import mustacheExpress from "mustache-express";
import path from "path";
import { fileURLToPath } from "url";

import courseRoutes from "./routes/courses.js";
import sessionRoutes from "./routes/sessions.js";
import bookingRoutes from "./routes/bookings.js";
import viewRoutes from "./routes/views.js";
import profileRoutes from "./routes/profile.js";
import { attachSessionUser } from "./middlewares/auth.js";
import { initDb } from "./models/_db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

/* ── Global Template Variables ─────────────────────────────── */
app.locals.year = new Date().getFullYear();

// ── View engine (Mustache) ───────────────────────────────────
app.engine(
    "mustache",
    mustacheExpress(path.join(__dirname, "views", "partials"), ".mustache")
);
app.set("view engine", "mustache");
app.set("views", [
    path.join(__dirname, "views"),
    path.join(__dirname, "views", "misc"),
    path.join(__dirname, "views", "course"),
    path.join(__dirname, "views", "booking"),
    path.join(__dirname, "views", "account"),
    path.join(__dirname, "views", "dashboards"),
]);

// ── Body parsing ─────────────────────────────────────────────
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ── Cookie parser ────────────────────────────────────────────
app.use(cookieParser(process.env.COOKIE_SECRET || "dev-cookie-secret"));

// ── Session ──────────────────────────────────────────────────
app.use(
    session({
        secret: process.env.SESSION_SECRET || "dev-session-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    })
);

// ── Static files ─────────────────────────────────────────────
app.use("/static", express.static(path.join(__dirname, "public")));

// ── Attach JWT user ──────────────────────────────────────────
app.use(attachSessionUser);

// ── Health ───────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ ok: true }));

// ── SSR View Routes ──────────────────────────────────────────
app.use("/", viewRoutes);     // Main HTML pages + admin dashboards
app.use("/", profileRoutes);  // Profile routes

// ── JSON API Routes (original filenames) ─────────────────────
app.use("/api/courses",  courseRoutes);   //  courses.js
app.use("/api/sessions", sessionRoutes);  //  sessions.js
app.use("/api/bookings", bookingRoutes);  // bookings.js

// ── Error handlers ───────────────────────────────────────────
export const not_found = (req, res) =>
    res.status(404).render("error", { title: "Not Found", message: "Page not found." });
export const server_error = (err, req, res, next) => {
    console.error(err);
    res.status(500).render("error", { title: "Server Error", message: "Something went wrong." });
};
app.use(not_found);
app.use(server_error);

// ── Start server ─────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
    await initDb();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () =>
        console.log(`Yoga booking running on http://localhost:${PORT}`)
    );
}