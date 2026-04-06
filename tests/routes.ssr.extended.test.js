// tests/routes.ssr.extended.test.js
/**
 * Extended SSR rendering tests covering pages not included in the base
 * routes.ssr.test.js. Exercises all public-facing view routes.
 */

import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { closeDb } from "../models/_db.js";

describe("SSR extended view routes", () => {
    let data;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
        data = await seedMinimal();
    });

    afterAll(async () => {
        await closeDb();
    });

    // ── Static public pages ───────────────────────────────────────────────

    describe("Public pages", () => {
        test("GET /about returns 200 HTML", async () => {
            const res = await request(app).get("/about");
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/html/);
        });

        test("GET /about mentions the studio", async () => {
            const res = await request(app).get("/about");
            expect(res.text).toMatch(/about|yoga|studio|mission/i);
        });

        test("GET /instructors returns 200 HTML", async () => {
            const res = await request(app).get("/instructors");
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/html/);
        });

        test("GET /schedule returns 200 HTML", async () => {
            const res = await request(app).get("/schedule");
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/html/);
        });

        test("GET /schedule?my=1 returns 200 HTML (auth bypassed in test mode)", async () => {
            const res = await request(app).get("/schedule?my=1");
            expect(res.status).toBe(200);
        });
    });

    // ── Courses list filtering ────────────────────────────────────────────

    describe("GET /courses — filtering and query params", () => {
        test("level=beginner returns 200", async () => {
            const res = await request(app).get("/courses?level=beginner");
            expect(res.status).toBe(200);
        });

        test("level=intermediate returns 200", async () => {
            const res = await request(app).get("/courses?level=intermediate");
            expect(res.status).toBe(200);
        });

        test("level=advanced returns 200", async () => {
            const res = await request(app).get("/courses?level=advanced");
            expect(res.status).toBe(200);
        });

        test("type=WEEKLY_BLOCK returns 200", async () => {
            const res = await request(app).get("/courses?type=WEEKLY_BLOCK");
            expect(res.status).toBe(200);
        });

        test("dropin=true returns 200", async () => {
            const res = await request(app).get("/courses?dropin=true");
            expect(res.status).toBe(200);
        });

        test("dropin=false returns 200", async () => {
            const res = await request(app).get("/courses?dropin=false");
            expect(res.status).toBe(200);
        });

        test("q= text search returns 200", async () => {
            const res = await request(app).get("/courses?q=test");
            expect(res.status).toBe(200);
        });

        test("pagination page=1 returns 200", async () => {
            const res = await request(app).get("/courses?page=1&pageSize=5");
            expect(res.status).toBe(200);
        });

        test("unknown q returns 200 with empty or partial results", async () => {
            const res = await request(app).get("/courses?q=zzznotarealyogacourse");
            expect(res.status).toBe(200);
        });
    });

    // ── Course detail ─────────────────────────────────────────────────────

    describe("GET /courses/:id — detail page", () => {
        test("shows course title in body", async () => {
            const res = await request(app).get(`/courses/${data.course._id}`);
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/Test Course/);
        });

        test("returns 404 HTML for unknown course id", async () => {
            const res = await request(app).get("/courses/does-not-exist");
            expect(res.status).toBe(404);
            expect(res.headers["content-type"]).toMatch(/html/);
        });
    });

    // ── Booking pages (auth bypassed in test mode) ───────────────────────

    describe("GET /courses/:id/book — course booking form", () => {
        test("renders the booking form", async () => {
            const res = await request(app).get(`/courses/${data.course._id}/book`);
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/book|confirm|course/i);
        });

        test("returns 404 for unknown course", async () => {
            const res = await request(app).get("/courses/fake-id/book");
            expect(res.status).toBe(404);
        });
    });

    describe("GET /courses/:id/book/session — drop-in session selector", () => {
        test("renders drop-in page for allowDropIn=true course", async () => {
            const res = await request(app).get(`/courses/${data.course._id}/book/session`);
            expect(res.status).toBe(200);
        });
    });

    describe("GET /sessions/:id/book — single session booking", () => {
        test("renders session booking page", async () => {
            const res = await request(app).get(`/sessions/${data.sessions[0]._id}/book`);
            expect(res.status).toBe(200);
            expect(res.text).toMatch(/book session|confirm|session/i);
        });

        test("returns 404 for unknown session id", async () => {
            const res = await request(app).get("/sessions/fake-session-id/book");
            expect(res.status).toBe(404);
        });
    });

    // ── My Bookings / Confirmation (auth bypassed in test mode) ──────────

    describe("GET /bookings — my bookings page", () => {
        test("returns 200 HTML", async () => {
            const res = await request(app).get("/bookings");
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/html/);
        });
    });

    // ── Admin dashboard pages (auth bypassed in test mode) ───────────────

    describe("Admin / organiser dashboard pages", () => {
        test("GET /dashboard returns 200", async () => {
            const res = await request(app).get("/dashboard");
            expect(res.status).toBe(200);
        });

        test("GET /dashboard/courses returns 200", async () => {
            const res = await request(app).get("/dashboard/courses");
            expect(res.status).toBe(200);
        });

        test("GET /dashboard/courses/:id/edit returns 200 or 404", async () => {
            const res = await request(app).get(`/dashboard/courses/${data.course._id}/edit`);
            expect([200, 404]).toContain(res.status);
        });

        test("GET /dashboard/classes returns 200", async () => {
            const res = await request(app).get("/dashboard/classes");
            expect(res.status).toBe(200);
        });

        test("GET /dashboard/classlist/:id returns 200", async () => {
            const res = await request(app).get(`/dashboard/classlist/${data.course._id}`);
            expect(res.status).toBe(200);
        });

        test("GET /dashboard/organisers returns 200", async () => {
            const res = await request(app).get("/dashboard/organisers");
            expect(res.status).toBe(200);
        });

        test("GET /dashboard/instructors returns 200", async () => {
            const res = await request(app).get("/dashboard/instructors");
            expect(res.status).toBe(200);
        });

        test("GET /dashboard/users returns 200", async () => {
            const res = await request(app).get("/dashboard/users");
            expect(res.status).toBe(200);
        });
    });

    // ── Profile pages (auth bypassed in test mode) ────────────────────────

    describe("Profile pages", () => {
        test("GET /profile returns 200 HTML", async () => {
            const res = await request(app).get("/profile");
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/html/);
        });

        test("GET /profile/edit returns 200 HTML", async () => {
            const res = await request(app).get("/profile/edit");
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/html/);
        });
    });

    // ── 404 fallthrough ───────────────────────────────────────────────────

    describe("404 fallthrough", () => {
        test("GET /this-route-does-not-exist returns 404", async () => {
            const res = await request(app).get("/this-route-does-not-exist-xyz");
            expect(res.status).toBe(404);
        });

        test("GET /dashboard/no-such-section returns 404", async () => {
            const res = await request(app).get("/dashboard/no-such-section-xyz");
            expect(res.status).toBe(404);
        });
    });
});
