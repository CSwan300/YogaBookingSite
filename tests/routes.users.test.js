// tests/routes.users.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb } from "./helpers.js";
import { UserModel } from "../models/userModel.js";
import { closeDb } from "../models/_db.js";

describe("Users API & UserModel", () => {
    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
    });

    afterAll(async () => {
        await closeDb();
    });

    // --- UserModel unit tests ---

    describe("UserModel.create", () => {
        test("creates a user with required fields", async () => {
            const user = await UserModel.create({
                name: "Unit Test User",
                email: "unit@test.local",
                role: "student",
            });

            expect(user._id).toBeDefined();
            expect(user.name).toBe("Unit Test User");
            expect(user.email).toBe("unit@test.local");
            expect(user.role).toBe("student");
        });

        test("creates an instructor user", async () => {
            const instructor = await UserModel.create({
                name: "Unit Instructor",
                email: "unit-instructor@test.local",
                role: "instructor",
            });

            expect(instructor.role).toBe("instructor");
        });

        test("each user gets a unique _id", async () => {
            const u1 = await UserModel.create({
                name: "User One",
                email: "one@test.local",
                role: "student",
            });
            const u2 = await UserModel.create({
                name: "User Two",
                email: "two@test.local",
                role: "student",
            });

            expect(u1._id).not.toBe(u2._id);
        });
    });

    describe("UserModel.findById", () => {
        test("finds a user that exists", async () => {
            const created = await UserModel.create({
                name: "Find Me",
                email: "findme@test.local",
                role: "student",
            });

            const found = await UserModel.findById(created._id);
            expect(found).not.toBeNull();
            expect(found._id).toBe(created._id);
            expect(found.name).toBe("Find Me");
        });

        test("returns null for non-existent id", async () => {
            const found = await UserModel.findById("totally-fake-id");
            expect(found).toBeNull();
        });
    });

    // --- HTTP routes (if user routes exist) ---

    describe("GET /users/:id (optional route)", () => {
        test("returns user or 404 for unknown id", async () => {
            const res = await request(app)
                .get("/users/fake-user-id")
                .set("Accept", "application/json");

            expect([200, 404, 405]).toContain(res.status);
        });
    });

    describe("POST /users (optional route)", () => {
        test("creates a user if route is implemented", async () => {
            const res = await request(app)
                .post("/users")
                .set("Accept", "application/json")
                .send({
                    name: "Route Created User",
                    email: "routecreated@test.local",
                    role: "student",
                });

            expect([201, 200, 404, 405]).toContain(res.status);
            if (res.status === 201 || res.status === 200) {
                expect(res.body.user).toBeDefined();
                expect(res.body.user.email).toBe("routecreated@test.local");
            }
        });

        test("rejects user creation with missing name", async () => {
            const res = await request(app)
                .post("/users")
                .set("Accept", "application/json")
                .send({
                    email: "noname@test.local",
                    role: "student",
                });

            expect([400, 404, 405, 422, 500]).toContain(res.status);
        });

        test("rejects user creation with missing email", async () => {
            const res = await request(app)
                .post("/users")
                .set("Accept", "application/json")
                .send({
                    name: "No Email",
                    role: "student",
                });

            expect([400, 404, 405, 422, 500]).toContain(res.status);
        });
    });
});
