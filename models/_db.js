// models/_db.js
import Datastore from "nedb-promises";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always resolve relative to this file so seeding and server hit the SAME files
const dbDir = path.join(__dirname, "../db");

export const usersDb = Datastore.create({
    filename: path.join(dbDir, "users.db"),
    autoload: true,
});
export const coursesDb = Datastore.create({
    filename: path.join(dbDir, "courses.db"),
    autoload: true,
});
export const sessionsDb = Datastore.create({
    filename: path.join(dbDir, "sessions.db"),
    autoload: true,
});
export const bookingsDb = Datastore.create({
    filename: path.join(dbDir, "bookings.db"),
    autoload: true,
});

// Call this once at startup (server + seed)
export async function initDb() {
    await fs.mkdir(dbDir, { recursive: true });

    const TEN_MINUTES = 10 * 60 * 1000;

    // Modern NeDB (seald-io) allows calling this directly on the DB instance
    usersDb.setAutocompactionInterval(TEN_MINUTES);
    coursesDb.setAutocompactionInterval(TEN_MINUTES);
    sessionsDb.setAutocompactionInterval(TEN_MINUTES);
    bookingsDb.setAutocompactionInterval(TEN_MINUTES);

    // Ensure helpful indexes are ready
    await usersDb.ensureIndex({ fieldName: "email", unique: true });
    await sessionsDb.ensureIndex({ fieldName: "courseId" });
}