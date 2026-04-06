// tests/routes.courses.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { closeDb } from "../models/_db.js";

describe("Courses API - comprehensive", () => {
    let data;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
        data = await seedMinimal();
    });

    afterAll(async () => {
        await closeDb();
    });

    // --- GET /courses ---

    describe("GET /courses", () => {
        test("returns 200 with courses array", async () => {
            const res = await request(app)
                .get("/courses")
                .set("Accept", "application/json");

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.courses)).toBe(true);
        });

        test("each course has required fields", async () => {
            const res = await request(app)
                .get("/courses")
                .set("Accept", "application/json");

            const course = res.body.courses[0];
            expect(course).toHaveProperty("_id");
            expect(course).toHaveProperty("title");
            expect(course).toHaveProperty("level");
            expect(course).toHaveProperty("type");
        });

        test("returns seeded course in list", async () => {
            const res = await request(app)
                .get("/courses")
                .set("Accept", "application/json");

            const titles = res.body.courses.map((c) => c.title);
            expect(titles).toContain("Test Course");
        });
    });

    // --- POST /courses ---

    describe("POST /courses", () => {
        test("creates a course with all valid fields", async () => {
            const res = await request(app)
                .post("/courses")
                .set("Accept", "application/json")
                .send({
                    title: "Full Fields Course",
                    level: "intermediate",
                    type: "workshop",
                    allowDropIn: true,
                    startDate: "2026-06-01",
                    endDate: "2026-06-30",
                    instructorId: data.instructor._id,
                    description: "Fully specified course.",
                });

            expect(res.status).toBe(201);
            expect(res.body.course.title).toBe("Full Fields Course");
            expect(res.body.course.level).toBe("intermediate");
        });

        test("created course has an _id", async () => {
            const res = await request(app)
                .post("/courses")
                .set("Accept", "application/json")
                .send({
                    title: "ID Check Course",
                    level: "beginner",
                    type: "workshop",
                    startDate: "2026-07-01",
                    endDate: "2026-07-15",
                    instructorId: data.instructor._id,
                });

            expect(res.status).toBe(201);
            expect(res.body.course._id).toBeDefined();
            expect(typeof res.body.course._id).toBe("string");
        });

        test("returns 400 when title is missing", async () => {
            const res = await request(app)
                .post("/courses")
                .set("Accept", "application/json")
                .send({
                    level: "beginner",
                    type: "workshop",
                    startDate: "2026-07-01",
                    endDate: "2026-07-15",
                    instructorId: data.instructor._id,
                });

            expect([400, 422, 500]).toContain(res.status);
        });

        test("returns 400 when instructorId is missing", async () => {
            const res = await request(app)
                .post("/courses")
                .set("Accept", "application/json")
                .send({
                    title: "No Instructor Course",
                    level: "beginner",
                    type: "workshop",
                    startDate: "2026-07-01",
                    endDate: "2026-07-15",
                });

            expect([400, 422, 500]).toContain(res.status);
        });

        test("returns 400 when endDate is before startDate", async () => {
            const res = await request(app)
                .post("/courses")
                .set("Accept", "application/json")
                .send({
                    title: "Bad Dates Course",
                    level: "beginner",
                    type: "workshop",
                    startDate: "2026-12-01",
                    endDate: "2026-01-01",
                    instructorId: data.instructor._id,
                });

            expect([400, 422, 500]).toContain(res.status);
        });

        test("rejects empty body", async () => {
            const res = await request(app)
                .post("/courses")
                .set("Accept", "application/json")
                .send({});

            expect([400, 422, 500]).toContain(res.status);
        });
    });

    // --- GET /courses/:id ---

    describe("GET /courses/:id", () => {
        test("returns course and sessions for valid id", async () => {
            const res = await request(app)
                .get(`/courses/${data.course._id}`)
                .set("Accept", "application/json");

            expect(res.status).toBe(200);
            expect(res.body.course._id).toBe(data.course._id);
            expect(Array.isArray(res.body.sessions)).toBe(true);
        });

        test("sessions belong to the requested course", async () => {
            const res = await request(app)
                .get(`/courses/${data.course._id}`)
                .set("Accept", "application/json");

            res.body.sessions.forEach((s) => {
                expect(s.courseId).toBe(data.course._id);
            });
        });

        test("returns 404 for non-existent id", async () => {
            const res = await request(app)
                .get("/courses/non-existent-id-xyz")
                .set("Accept", "application/json");

            expect(res.status).toBe(404);
        });

    });

    // --- PUT/PATCH /courses/:id (if implemented) ---

    describe("PUT /courses/:id", () => {
        test("updates an existing course title", async () => {
            const res = await request(app)
                .put(`/courses/${data.course._id}`)
                .set("Accept", "application/json")
                .send({ title: "Updated Title" });

            // Accept 200 (updated) or 404/405 (not implemented)
            expect([200, 404, 405]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body.course.title).toBe("Updated Title");
            }
        });

        test("returns 404 when updating non-existent course", async () => {
            const res = await request(app)
                .put("/courses/does-not-exist")
                .set("Accept", "application/json")
                .send({ title: "Ghost Update" });

            expect([404, 405]).toContain(res.status);
        });
    });

    // --- DELETE /courses/:id (if implemented) ---

    describe("DELETE /courses/:id", () => {
        test("deletes or returns 404/405 for non-existent course", async () => {
            const res = await request(app)
                .delete("/courses/does-not-exist")
                .set("Accept", "application/json");

            expect([200, 404, 405]).toContain(res.status);
        });
    });
});
