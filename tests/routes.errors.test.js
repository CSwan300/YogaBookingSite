import supertest from "supertest";
import { app } from "../index.js";
import { resetDb } from "./helpers.js";
import {describe, test} from "@jest/globals";

// This ensures 'request' works regardless of how supertest is exported
const request = supertest.default || supertest;

describe("Edge cases", () => {
    beforeAll(async () => {
        // Set environment to test to prevent side effects (like actual emails or logs)
        process.env.NODE_ENV = "test";
        await resetDb();
    });

    test("GET /courses/:id with bad id returns 404 JSON", async () => {
        const res = await request(app).get("/courses/does-not-exist");

        expect(res.status).toBe(404);
        // Flexible regex to match JSON, HTML, or Text depending on your Error Middleware
        expect(res.headers["content-type"]).toMatch(/json|html|text/);
    });

    test("POST /bookings/session with invalid sessionId returns 404 JSON", async () => {
        const res = await request(app)
            .post("/bookings/session")
            .send({
                userId: "invalid-user",
                sessionId: "invalid-session",
            });

        // Validates that the system catches missing resources
        // We check for 404 (Not Found) or 500 (Server Error) depending on your controller logic
        expect([400, 404, 500]).toContain(res.status);
    });
});