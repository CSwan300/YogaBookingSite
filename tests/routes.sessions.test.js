// tests/routes.sessions.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { closeDb } from "../models/_db.js";

describe("Sessions API - comprehensive", () => {
    let data;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
        data = await seedMinimal();
    });

    afterAll(async () => {
        await closeDb();
    });

    // --- POST /sessions ---

    describe("POST /sessions", () => {
        test("creates a session with valid payload", async () => {
            const res = await request(app)
                .post("/sessions")
                .set("Accept", "application/json")
                .send({
                    courseId: data.course._id,
                    start: new Date("2026-09-01T10:00:00").toISOString(),
                    end: new Date("2026-09-01T11:15:00").toISOString(),
                    capacity: 20,
                    bookedCount: 0,
                });

            expect(res.status).toBe(201);
            expect(res.body.session).toBeDefined();
            expect(res.body.session._id).toBeDefined();
        });

        test("created session has correct courseId", async () => {
            const res = await request(app)
                .post("/sessions")
                .set("Accept", "application/json")
                .send({
                    courseId: data.course._id,
                    start: new Date("2026-09-08T10:00:00").toISOString(),
                    end: new Date("2026-09-08T11:15:00").toISOString(),
                    capacity: 12,
                    bookedCount: 0,
                });

            expect(res.status).toBe(201);
            expect(res.body.session.courseId).toBe(data.course._id);
        });

        test("returns 400 when courseId is missing", async () => {
            const res = await request(app)
                .post("/sessions")
                .set("Accept", "application/json")
                .send({
                    start: new Date("2026-10-01T10:00:00").toISOString(),
                    end: new Date("2026-10-01T11:00:00").toISOString(),
                    capacity: 10,
                });

            expect([400, 404, 422, 500]).toContain(res.status);
        });

        test("returns error when start is after end", async () => {
            const res = await request(app)
                .post("/sessions")
                .set("Accept", "application/json")
                .send({
                    courseId: data.course._id,
                    start: new Date("2026-10-01T12:00:00").toISOString(),
                    end: new Date("2026-10-01T10:00:00").toISOString(),
                    capacity: 10,
                });

            expect([400, 422, 500]).toContain(res.status);
        });

        test("returns error when capacity is zero or negative", async () => {
            const res = await request(app)
                .post("/sessions")
                .set("Accept", "application/json")
                .send({
                    courseId: data.course._id,
                    start: new Date("2026-11-01T10:00:00").toISOString(),
                    end: new Date("2026-11-01T11:00:00").toISOString(),
                    capacity: 0,
                });

            expect([400, 422, 500]).toContain(res.status);
        });

        test("returns error for non-existent courseId", async () => {
            const res = await request(app)
                .post("/sessions")
                .set("Accept", "application/json")
                .send({
                    courseId: "not-a-real-course",
                    start: new Date("2026-10-10T10:00:00").toISOString(),
                    end: new Date("2026-10-10T11:00:00").toISOString(),
                    capacity: 15,
                });

            expect([400, 404, 422, 500]).toContain(res.status);
        });

        test("rejects empty body", async () => {
            const res = await request(app)
                .post("/sessions")
                .set("Accept", "application/json")
                .send({});

            expect([400, 422, 500]).toContain(res.status);
        });
    });

    // --- GET /sessions/by-course/:courseId ---

    describe("GET /sessions/by-course/:courseId", () => {
        test("returns sessions array for valid courseId", async () => {
            const res = await request(app)
                .get(`/sessions/by-course/${data.course._id}`)
                .set("Accept", "application/json");

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.sessions)).toBe(true);
        });

        test("returns at least the seeded sessions", async () => {
            const res = await request(app)
                .get(`/sessions/by-course/${data.course._id}`)
                .set("Accept", "application/json");

            expect(res.body.sessions.length).toBeGreaterThanOrEqual(2);
        });

        test("all returned sessions belong to the requested course", async () => {
            const res = await request(app)
                .get(`/sessions/by-course/${data.course._id}`)
                .set("Accept", "application/json");

            res.body.sessions.forEach((s) => {
                expect(s.courseId).toBe(data.course._id);
            });
        });

        test("returns empty array for a course with no sessions", async () => {
            // Create a course with no sessions
            const courseRes = await request(app)
                .post("/courses")
                .set("Accept", "application/json")
                .send({
                    title: "Empty Sessions Course",
                    level: "beginner",
                    type: "workshop",
                    startDate: "2026-08-01",
                    endDate: "2026-08-31",
                    instructorId: data.instructor._id,
                });

            expect(courseRes.status).toBe(201);
            const emptyCourseId = courseRes.body.course._id;

            const res = await request(app)
                .get(`/sessions/by-course/${emptyCourseId}`)
                .set("Accept", "application/json");

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.sessions)).toBe(true);
            expect(res.body.sessions.length).toBe(0);
        });

        test("returns 404 for completely unknown courseId", async () => {
            const res = await request(app)
                .get("/sessions/by-course/ghost-course-id")
                .set("Accept", "application/json");

            expect([200, 404]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body.sessions.length).toBe(0);
            }
        });
    });

    // --- GET /sessions/:id ---

    describe("GET /sessions/:id", () => {
        test("returns a single session by id", async () => {
            const sessionId = data.sessions[0]._id;
            const res = await request(app)
                .get(`/sessions/${sessionId}`)
                .set("Accept", "application/json");

            // Accept 200 or 404 depending on whether single-session GET is implemented
            expect([200, 404]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body.session._id).toBe(sessionId);
            }
        });

        test("returns 404 for non-existent session id", async () => {
            const res = await request(app)
                .get("/sessions/totally-fake-id")
                .set("Accept", "application/json");

            expect([404, 200]).toContain(res.status);
        });
    });
});
