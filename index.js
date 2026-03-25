// index.js
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

// ── Cookie parser (signed cookies for JWT) ───────────────────
app.use(cookieParser(process.env.COOKIE_SECRET || "dev-cookie-secret"));

// ── Session (used for flash messages) ───────────────────────
// NOTE: For production swap MemoryStore for a persistent store,
// e.g. connect-mongo or connect-redis, to survive restarts.
app.use(
    session({
        secret: process.env.SESSION_SECRET || "dev-session-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        },
    })
);

// ── Static files ─────────────────────────────────────────────
app.use("/static", express.static(path.join(__dirname, "public")));

// ── Attach real JWT user ─────────────────────────────────────
app.use(attachSessionUser);

// ── Health ───────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ ok: true }));

// ── SSR view routes ──────────────────────────────────────────
app.use("/", viewRoutes);
app.use("/", profileRoutes);

// ── JSON API routes ──────────────────────────────────────────
app.use("/api/courses",  courseRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/bookings", bookingRoutes);

// ── Error handlers ───────────────────────────────────────────
export const not_found = (req, res) =>
    res.status(404).type("text/plain").send("404 Not found.");
export const server_error = (err, req, res, next) => {
    console.error(err);
    res.status(500).type("text/plain").send("Internal Server Error.");
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