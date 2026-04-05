// tests/helpers.js
import {
    initDb,
    usersDb,
    coursesDb,
    sessionsDb,
    bookingsDb,
} from "../models/_db.js";
import { UserModel } from "../models/userModel.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

export async function resetDb() {
    await initDb();

    await usersDb.remove({}, { multi: true });
    await coursesDb.remove({}, { multi: true });
    await sessionsDb.remove({}, { multi: true });
    await bookingsDb.remove({}, { multi: true });
}

export async function seedMinimal() {
    const student = await UserModel.create({
        name: "Test Student",
        email: "student@test.local",
        role: "student",
    });
    const instructor = await UserModel.create({
        name: "Test Instructor",
        email: "instructor@test.local",
        role: "instructor",
    });

    const course = await CourseModel.create({
        title: "Test Course",
        level: "beginner",
        type: "WEEKLY_BLOCK",
        allowDropIn: true,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        instructorId: instructor._id,
        sessionIds: [],
        description: "A test course for E2E route testing.",
    });

    const s1 = await SessionModel.create({
        courseId: course._id,
        startDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDateTime:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toISOString(),
        capacity: 18,
        bookedCount: 0,
    });

    const s2 = await SessionModel.create({
        courseId: course._id,
        startDateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        endDateTime:   new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000).toISOString(),
        capacity: 18,
        bookedCount: 0,
    });

    await CourseModel.update(course._id, { sessionIds: [s1._id, s2._id] });

    return { student, instructor, course, sessions: [s1, s2] };
}