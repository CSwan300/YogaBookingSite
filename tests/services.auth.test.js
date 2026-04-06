// tests/services.auth.test.js
/**
 * Unit tests for services/authService.js
 * Tests cover: registerUser, authenticateUser, verifyTokenAndGetUser
 *
 * The DB is reset before each test so email-uniqueness assertions are
 * reliable without inter-test pollution.
 */

import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { resetDb } from "./helpers.js";
import { closeDb } from "../models/_db.js";
import {
    registerUser,
    authenticateUser,
    verifyTokenAndGetUser,
} from "../services/authService.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validPayload = (overrides = {}) => ({
    name:             "Test User",
    email:            "test@example.com",
    password:         "Password1",
    confirm_password: "Password1",
    ...overrides,
});

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------

describe("authService.registerUser", () => {
    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
    });

    afterAll(async () => {
        await closeDb();
    });

    test("creates a user and returns { user, token }", async () => {
        const { user, token } = await registerUser(validPayload());

        expect(user).toBeDefined();
        expect(user._id).toBeDefined();
        expect(user.email).toBe("test@example.com");
        expect(typeof token).toBe("string");
        expect(token.split(".").length).toBe(3); // JWT structure
    });

    test("normalises email to lowercase", async () => {
        const { user } = await registerUser(
            validPayload({ email: "UPPER@Example.COM", name: "Upper User" })
        );
        expect(user.email).toBe("upper@example.com");
    });

    test("trims whitespace from name", async () => {
        const { user } = await registerUser(
            validPayload({ name: "  Trimmed Name  ", email: "trim@example.com" })
        );
        expect(user.name).toBe("Trimmed Name");
    });

    test("sets role to 'user' on new registrations", async () => {
        const { user } = await registerUser(
            validPayload({ email: "role@example.com", name: "Role Check" })
        );
        expect(user.role).toBe("user");
    });

    test("throws when name is missing", async () => {
        await expect(
            registerUser(validPayload({ name: undefined }))
        ).rejects.toThrow("All fields are required");
    });

    test("throws when email is missing", async () => {
        await expect(
            registerUser(validPayload({ email: undefined }))
        ).rejects.toThrow("All fields are required");
    });

    test("throws when password is missing", async () => {
        await expect(
            registerUser(validPayload({ password: undefined, confirm_password: undefined }))
        ).rejects.toThrow("All fields are required");
    });

    test("throws when passwords do not match", async () => {
        await expect(
            registerUser(validPayload({ confirm_password: "DifferentPass1" }))
        ).rejects.toThrow("Passwords do not match");
    });

    test("throws when password is fewer than 8 chars", async () => {
        await expect(
            registerUser(validPayload({ password: "Short1", confirm_password: "Short1", email: "short@example.com" }))
        ).rejects.toThrow("at least 8 characters");
    });

    test("throws when password has no digit", async () => {
        await expect(
            registerUser(
                validPayload({
                    password:         "NoDigitsHere",
                    confirm_password: "NoDigitsHere",
                    email:            "nodigit@example.com",
                })
            )
        ).rejects.toThrow("at least one number");
    });

    test("throws on invalid email format (no @)", async () => {
        await expect(
            registerUser(validPayload({ email: "notanemail", name: "Bad Email" }))
        ).rejects.toThrow("valid email");
    });

    test("throws on invalid email format (no dot after @)", async () => {
        await expect(
            registerUser(validPayload({ email: "no@dot", name: "No Dot" }))
        ).rejects.toThrow("valid email");
    });

    test("throws when email is already registered", async () => {
        // First registration succeeds
        await registerUser(validPayload({ email: "dup@example.com", name: "First" }));

        // Second attempt with same email must fail
        await expect(
            registerUser(validPayload({ email: "dup@example.com", name: "Second" }))
        ).rejects.toThrow("already exists");
    });

    test("email uniqueness check is case-insensitive", async () => {
        await registerUser(validPayload({ email: "case@example.com", name: "Case One" }));

        await expect(
            registerUser(validPayload({ email: "CASE@Example.COM", name: "Case Two" }))
        ).rejects.toThrow("already exists");
    });
});

// ---------------------------------------------------------------------------
// authenticateUser
// ---------------------------------------------------------------------------

describe("authService.authenticateUser", () => {
    let createdUserEmail;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
        createdUserEmail = "auth@example.com";
        await registerUser(validPayload({ email: createdUserEmail, name: "Auth Tester" }));
    });

    afterAll(async () => {
        await closeDb();
    });

    test("returns { user, token } for valid credentials", async () => {
        const { user, token } = await authenticateUser(createdUserEmail, "Password1");

        expect(user).toBeDefined();
        expect(user.email).toBe(createdUserEmail);
        expect(typeof token).toBe("string");
    });

    test("is case-insensitive for email", async () => {
        const { user } = await authenticateUser("AUTH@EXAMPLE.COM", "Password1");
        expect(user.email).toBe(createdUserEmail);
    });

    test("throws when email is missing", async () => {
        await expect(authenticateUser(undefined, "Password1")).rejects.toThrow(
            "Email is required"
        );
    });

    test("throws when password is missing", async () => {
        await expect(authenticateUser(createdUserEmail, undefined)).rejects.toThrow(
            "Password is required"
        );
    });

    test("throws for unknown email", async () => {
        await expect(
            authenticateUser("nobody@example.com", "Password1")
        ).rejects.toThrow("Invalid email or password");
    });

    test("throws for wrong password", async () => {
        await expect(
            authenticateUser(createdUserEmail, "WrongPass1")
        ).rejects.toThrow("Invalid email or password");
    });
});

// ---------------------------------------------------------------------------
// verifyTokenAndGetUser
// ---------------------------------------------------------------------------

describe("authService.verifyTokenAndGetUser", () => {
    let validToken;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
        const { token } = await registerUser(
            validPayload({ email: "verify@example.com", name: "Verify Tester" })
        );
        validToken = token;
    });

    afterAll(async () => {
        await closeDb();
    });

    test("resolves to a user for a valid token", async () => {
        const user = await verifyTokenAndGetUser(validToken);
        expect(user).not.toBeNull();
        expect(user.email).toBe("verify@example.com");
    });

    test("returns null for a garbage string", async () => {
        const user = await verifyTokenAndGetUser("not.a.jwt");
        expect(user).toBeNull();
    });

    test("returns null for an empty string", async () => {
        const user = await verifyTokenAndGetUser("");
        expect(user).toBeNull();
    });

    test("returns null for undefined", async () => {
        const user = await verifyTokenAndGetUser(undefined);
        expect(user).toBeNull();
    });
});
