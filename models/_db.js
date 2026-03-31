// models/_db.js
import Datastore from "nedb-promises";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export async function initDb() {
    await fs.mkdir(dbDir, { recursive: true });

    const TEN_MINUTES = 10 * 60 * 1000;

    usersDb.setAutocompactionInterval(TEN_MINUTES);
    coursesDb.setAutocompactionInterval(TEN_MINUTES);
    sessionsDb.setAutocompactionInterval(TEN_MINUTES);
    bookingsDb.setAutocompactionInterval(TEN_MINUTES);

    await usersDb.ensureIndex({ fieldName: "email", unique: true });
    await sessionsDb.ensureIndex({ fieldName: "courseId" });
}

/**
 * Stop all intervals to allow Jest to exit gracefully.
 */
export async function closeDb() {
    // Wrap in a check to avoid the Proxy trap error
    const dbs = [usersDb, coursesDb, sessionsDb, bookingsDb];
    for (const db of dbs) {
        if (db && typeof db.stopAutocompaction === 'function') {
            try {
                db.stopAutocompaction();
            } catch (e) {
                // Fallback: manually clear the interval if the proxy fails
                if (db._autocompactionIntervalId) {
                    clearInterval(db._autocompactionIntervalId);
                    db._autocompactionIntervalId = null;
                }
            }
        }
    }
}