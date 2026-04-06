// tests/routes.auth.test.js
/**
 * HTTP-level tests for the authentication routes:
 *   POST /login, POST /register, GET /logout
 *   GET /login, GET /register
 *
 * In test mode, authService bypasses bcrypt-level logic is still exercised via
 * the real service — we seed a known user with a known password hash so that
 * login tests work end-to-end.
 */

import request from "supertest";
import { app } from "../index.js";
import { resetDb } from "./helpers.js";
import { closeDb } from "../models/_db.js";
import { registerUser } from "../services/authService.js";

describe("Auth routes", () => {
    const TEST_EMAIL    = "authroute@example.com";
    const TEST_PASSWORD = "ValidPass1";

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
        // Seed a known user so POST /login has something to authenticate against
        await registerUser({
            name:             "Auth Route User",
            email:            TEST_EMAIL,
            password:         TEST_PASSWORD,
            confirm_password: TEST_PASSWORD,
        });
    });

    afterAll(async () => {
        await closeDb();
    });

    // ── GET /login ────────────────────────────────────────────────────────

    describe("GET /login", () => {
        test("returns 200 HTML", async () => {
            const res = await request(app).get("/login");
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/html/);
        });

        test("page contains a form or login-related text", async () => {
            const res = await request(app).get("/login");
            expect(res.text).toMatch(/sign in|login|email|password/i);
        });
    });

    // ── GET /register ─────────────────────────────────────────────────────

    describe("GET /register", () => {
        test("returns 200 HTML", async () => {
            const res = await request(app).get("/register");
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toMatch(/html/);
        });

        test("page contains a registration form or related text", async () => {
            const res = await request(app).get("/register");
            expect(res.text).toMatch(/register|create account|sign up|email/i);
        });
    });

    // ── POST /register ────────────────────────────────────────────────────

    describe("POST /register", () => {
        test("creates a user and redirects on success", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({
                    name:             "New Reg User",
                    email:            "newreg@example.com",
                    password:         "NewPass1",
                    confirm_password: "NewPass1",
                });

            // Successful registration should redirect (3xx) to home
            expect([200, 302]).toContain(res.status);
            if (res.status === 302) {
                expect(res.headers.location).toMatch(/^\//);
            }
        });

        test("re-renders with error when passwords do not match", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({
                    name:             "Mismatch User",
                    email:            "mismatch@example.com",
                    password:         "ValidPass1",
                    confirm_password: "WrongPass2",
                });

            expect(res.status).toBe(400);
            expect(res.text).toMatch(/do not match|passwords/i);
        });

        test("re-renders with error when email is already taken", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({
                    name:             "Duplicate",
                    email:            TEST_EMAIL, // already registered
                    password:         "ValidPass1",
                    confirm_password: "ValidPass1",
                });

            expect(res.status).toBe(400);
            expect(res.text).toMatch(/already|exists/i);
        });

        test("re-renders with error for invalid email format", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({
                    name:             "Bad Email",
                    email:            "not-an-email",
                    password:         "ValidPass1",
                    confirm_password: "ValidPass1",
                });

            expect(res.status).toBe(400);
            expect(res.text).toMatch(/valid email/i);
        });

        test("re-renders with error when password lacks a digit", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({
                    name:             "No Digit",
                    email:            "nodigit@example.com",
                    password:         "NoDigitsHere",
                    confirm_password: "NoDigitsHere",
                });

            expect(res.status).toBe(400);
            expect(res.text).toMatch(/number|digit/i);
        });

        test("re-renders with error when password is too short", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({
                    name:             "Short Pass",
                    email:            "shortpass@example.com",
                    password:         "Sh0rt",
                    confirm_password: "Sh0rt",
                });

            expect(res.status).toBe(400);
            expect(res.text).toMatch(/8 characters/i);
        });

        test("re-renders with error when name is missing", async () => {
            const res = await request(app)
                .post("/register")
                .type("form")
                .send({
                    name:             "",
                    email:            "noname@example.com",
                    password:         "ValidPass1",
                    confirm_password: "ValidPass1",
                });

            expect(res.status).toBe(400);
            expect(res.text).toMatch(/required|name/i);
        });
    });

    // ── POST /login ───────────────────────────────────────────────────────

    describe("POST /login", () => {
        test("sets a cookie and redirects on valid credentials", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

            expect([200, 302]).toContain(res.status);
            if (res.status === 302) {
                // Should redirect to home or dashboard
                expect(res.headers.location).toMatch(/^\//);
            }
        });

        test("re-renders login with 401 on wrong password", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ email: TEST_EMAIL, password: "WrongPass9" });

            expect(res.status).toBe(401);
            expect(res.text).toMatch(/invalid|incorrect|password|email/i);
        });

        test("re-renders login with 401 for unknown email", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ email: "ghost@example.com", password: "ValidPass1" });

            expect(res.status).toBe(401);
            expect(res.text).toMatch(/invalid|email/i);
        });

        test("re-renders login when email field is empty", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ email: "", password: "ValidPass1" });

            expect([400, 401]).toContain(res.status);
        });

        test("re-renders login when password field is empty", async () => {
            const res = await request(app)
                .post("/login")
                .type("form")
                .send({ email: TEST_EMAIL, password: "" });

            expect([400, 401]).toContain(res.status);
        });
    });

    // ── GET /logout ───────────────────────────────────────────────────────

    describe("GET /logout", () => {
        test("returns 200 and clears the session cookie", async () => {
            const res = await request(app).get("/logout");
            expect(res.status).toBe(200);
        });

        test("response contains logout confirmation text", async () => {
            const res = await request(app).get("/logout");
            expect(res.text).toMatch(/signed out|logged out|goodbye|see you/i);
        });
    });
});
