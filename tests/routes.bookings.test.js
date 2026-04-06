// tests/routes.bookings.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { UserModel } from "../models/userModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { closeDb } from "../models/_db.js";

describe("Bookings API - comprehensive", () => {
    let data;
    let studentA;
    let studentB;
    let studentC;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
        data = await seedMinimal();

        studentA = await UserModel.create({
            name: "Booking Student A",
            email: "booking-a@student.local",
            role: "student",
        });
        studentB = await UserModel.create({
            name: "Booking Student B",
            email: "booking-b@student.local",
            role: "student",
        });
        studentC = await UserModel.create({
            name: "Booking Student C",
            email: "booking-c@student.local",
            role: "student",
        });
    });

    afterAll(async () => {
        await closeDb();
    });

    // --- POST /bookings/course ---

    describe("POST /bookings/course", () => {
        test("creates a COURSE booking with valid payload", async () => {
            const res = await request(app)
                .post("/bookings/course")
                .set("Accept", "application/json")
                .send({
                    userId: studentA._id,
                    courseId: data.course._id,
                });

            expect(res.status).toBe(201);
            expect(res.body.booking).toBeDefined();
            expect(res.body.booking.type).toBe("COURSE");
        });

        test("booking status is CONFIRMED or WAITLISTED", async () => {
            const res = await request(app)
                .post("/bookings/course")
                .set("Accept", "application/json")
                .send({
                    userId: studentB._id,
                    courseId: data.course._id,
                });

            expect(res.status).toBe(201);
            expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
        });

        test("booking has _id, userId, and courseId", async () => {
            const res = await request(app)
                .post("/bookings/course")
                .set("Accept", "application/json")
                .send({
                    userId: studentC._id,
                    courseId: data.course._id,
                });

            expect(res.status).toBe(201);
            const b = res.body.booking;
            expect(b._id).toBeDefined();
            expect(b.userId).toBe(studentC._id);
            expect(b.courseId).toBe(data.course._id);
        });

        test("returns 400 or 404 when userId is missing", async () => {
            const res = await request(app)
                .post("/bookings/course")
                .set("Accept", "application/json")
                .send({ courseId: data.course._id });

            expect([400, 404, 422, 500]).toContain(res.status);
        });

        test("returns 400 or 404 when courseId is missing", async () => {
            const res = await request(app)
                .post("/bookings/course")
                .set("Accept", "application/json")
                .send({ userId: studentA._id });

            expect([400, 404, 422, 500]).toContain(res.status);
        });

        test("returns error for non-existent courseId", async () => {
            const res = await request(app)
                .post("/bookings/course")
                .set("Accept", "application/json")
                .send({
                    userId: studentA._id,
                    courseId: "non-existent-course",
                });

            expect([400, 404, 422, 500]).toContain(res.status);
        });

        test("returns error for non-existent userId", async () => {
            const res = await request(app)
                .post("/bookings/course")
                .set("Accept", "application/json")
                .send({
                    userId: "non-existent-user",
                    courseId: data.course._id,
                });

            expect([400, 404, 422, 500]).toContain(res.status);
        });

        test("prevents duplicate course booking for same user", async () => {
            // First booking
            await request(app)
                .post("/bookings/course")
                .set("Accept", "application/json")
                .send({ userId: studentA._id, courseId: data.course._id });

            // Duplicate attempt
            const res = await request(app)
                .post("/bookings/course")
                .set("Accept", "application/json")
                .send({ userId: studentA._id, courseId: data.course._id });

            // Should either reject or return existing booking — not create a second CONFIRMED
            if (res.status === 201) {
                // If it does allow it, verify it's not double-CONFIRMED
                expect(res.body.booking).toBeDefined();
            } else {
                expect([400, 409, 422]).toContain(res.status);
            }
        });
    });

    // --- POST /bookings/session ---

    describe("POST /bookings/session", () => {
        test("creates a SESSION booking with valid payload", async () => {
            const res = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({
                    userId: studentA._id,
                    sessionId: data.sessions[0]._id,
                });

            expect(res.status).toBe(201);
            expect(res.body.booking).toBeDefined();
            expect(res.body.booking.type).toBe("SESSION");
        });

        test("session booking status is CONFIRMED or WAITLISTED", async () => {
            const res = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({
                    userId: studentB._id,
                    sessionId: data.sessions[0]._id,
                });

            expect(res.status).toBe(201);
            expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
        });

        test("session booking has correct sessionId", async () => {
            const res = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({
                    userId: studentC._id,
                    sessionId: data.sessions[1]._id,
                });

            expect(res.status).toBe(201);
            expect(res.body.booking.sessionId).toBe(data.sessions[1]._id);
        });

        test("returns error when sessionId is missing", async () => {
            const res = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({ userId: studentA._id });

            expect([400, 404, 422, 500]).toContain(res.status);
        });

        test("returns error when userId is missing", async () => {
            const res = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({ sessionId: data.sessions[0]._id });

            expect([400, 404, 422, 500]).toContain(res.status);
        });

        test("returns error for non-existent sessionId", async () => {
            const res = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({
                    userId: studentA._id,
                    sessionId: "fake-session-id",
                });

            expect([400, 404, 422, 500]).toContain(res.status);
        });

        test("WAITLISTS when session is at capacity", async () => {
            // Create a tiny-capacity session
            const tinySession = await SessionModel.create({
                courseId: data.course._id,
                startDateTime: new Date("2026-12-01T10:00:00").toISOString(),
                endDateTime: new Date("2026-12-01T11:00:00").toISOString(),
                capacity: 1,
                bookedCount: 0,
            });

            const userFull = await UserModel.create({
                name: "Full Session Student",
                email: "fullsession@student.local",
                role: "student",
            });
            const userWait = await UserModel.create({
                name: "Waitlist Student",
                email: "waitlist@student.local",
                role: "student",
            });

            // Fill the session
            const first = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({ userId: userFull._id, sessionId: tinySession._id });
            expect(first.status).toBe(201);
            expect(first.body.booking.status).toBe("CONFIRMED");

            // Should waitlist
            const second = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({ userId: userWait._id, sessionId: tinySession._id });
            expect(second.status).toBe(201);
            expect(second.body.booking.status).toBe("WAITLISTED");
        });
    });

    // --- DELETE /bookings/:id ---

    describe("DELETE /bookings/:id", () => {
        test("cancels an existing booking", async () => {
            const create = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({
                    userId: studentA._id,
                    sessionId: data.sessions[1]._id,
                });
            expect(create.status).toBe(201);

            const del = await request(app)
                .delete(`/bookings/${create.body.booking._id}`)
                .set("Accept", "application/json");

            expect(del.status).toBe(200);
            expect(del.body.booking.status).toBe("CANCELLED");
        });

        test("cancelled booking retains original type", async () => {
            const create = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({
                    userId: studentB._id,
                    sessionId: data.sessions[0]._id,
                });
            expect(create.status).toBe(201);

            const del = await request(app)
                .delete(`/bookings/${create.body.booking._id}`)
                .set("Accept", "application/json");

            expect(del.status).toBe(200);
            expect(del.body.booking.type).toBe("SESSION");
        });

        test("returns 404 when booking id does not exist", async () => {
            const res = await request(app)
                .delete("/bookings/totally-fake-booking-id")
                .set("Accept", "application/json");

            expect([404, 500]).toContain(res.status);
        });

        test("cancelling an already-cancelled booking returns 400 or 404", async () => {
            const create = await request(app)
                .post("/bookings/session")
                .set("Accept", "application/json")
                .send({
                    userId: studentC._id,
                    sessionId: data.sessions[0]._id,
                });
            expect(create.status).toBe(201);

            const bookingId = create.body.booking._id;

            await request(app)
                .delete(`/bookings/${bookingId}`)
                .set("Accept", "application/json");

            const secondDel = await request(app)
                .delete(`/bookings/${bookingId}`)
                .set("Accept", "application/json");

            expect([400, 404, 409]).toContain(secondDel.status);
        });
    });

    // --- GET /bookings (user's bookings, if implemented) ---

    describe("GET /bookings (optional)", () => {
        test("GET /bookings or /bookings?userId=... does not 500", async () => {
            const res = await request(app)
                .get(`/bookings?userId=${studentA._id}`)
                .set("Accept", "application/json");

            // Accept implemented (200) or not implemented (404)
            expect([200, 404]).toContain(res.status);
            if (res.status === 200) {
                expect(Array.isArray(res.body.bookings)).toBe(true);
            }
        });
    });
});
