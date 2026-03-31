import express from "express";
import cookieParser from "cookie-parser";
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

// ── Global Template Variables ──
app.locals.year = new Date().getFullYear();

// ── View engine (Mustache) ──
app.engine("mustache", mustacheExpress(path.join(__dirname, "views", "partials"), ".mustache"));
app.set("view engine", "mustache");
app.set("views", [
    path.join(__dirname, "views"),
    path.join(__dirname, "views", "misc"),
    path.join(__dirname, "views", "course"),
    path.join(__dirname, "views", "booking"),
    path.join(__dirname, "views", "account"),
    path.join(__dirname, "views", "dashboards"),
]);

// ── Middleware ──
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || "dev-cookie-secret"));
app.use("/static", express.static(path.join(__dirname, "public")));
app.use(attachSessionUser);


//for the dashboard
app.use((req, res, next) => {
    if (req.user) {
        res.locals.user = req.user;
        // Check if the role string is exactly "organiser"
        res.locals.isOrganiser = req.user.role === "organiser";
    }
    next();
});
// ── Health ──
app.get("/health", (req, res) => res.json({ ok: true }));

// ── Route Mounting ──
app.use("/courses", courseRoutes);
app.use("/sessions", sessionRoutes);
app.use("/bookings", bookingRoutes);
app.use("/", profileRoutes);
app.use("/", viewRoutes);

// ── Error handlers ──
app.use((req, res) => {
    res.status(404);
    const accept = req.headers.accept || '';
    if (accept.includes('text/html') && accept.includes('q=')) {
        return res.render("error", { title: "Not Found", message: "Page not found." });
    }
    return res.type('txt').send('404 Not found');
});
app.use((err, req, res, next) => {
    console.error(err);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
    res.status(500).render("error", { title: "Server Error", message: "Something went wrong." });
});

if (process.env.NODE_ENV !== "test") {
    await initDb();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Yoga booking running on http://localhost:${PORT}`));
}