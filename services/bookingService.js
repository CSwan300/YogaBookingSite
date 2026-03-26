// services/bookingService.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";

const canReserveAll = (sessions) =>
  sessions.every((s) => (s.bookedCount ?? 0) < (s.capacity ?? 0));

export async function bookCourseForUser(userId, courseId) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error("Course not found");

    const allSessions = await SessionModel.listByCourse(courseId);
    const now = new Date();
    const sessions = allSessions.filter(s => new Date(s.startDateTime) >= now);

    if (sessions.length === 0) throw new Error("Course has no upcoming sessions");

    let status = "CONFIRMED";
    if (!canReserveAll(sessions)) {
        status = "WAITLISTED";
    } else {
        for (const s of sessions) await SessionModel.incrementBookedCount(s._id, 1);
    }

    return BookingModel.create({
        userId,
        courseId,
        type: "COURSE",
        sessionIds: sessions.map((s) => s._id),
        status,
    });
}

export async function bookSessionsForUser(userId, sessionIds) {
    if (!sessionIds?.length) throw new Error("No sessions selected");

    const course = await CourseModel.findById(
        (await SessionModel.findById(sessionIds[0])).courseId
    );
    if (!course) throw new Error("Course not found");
    if (!course.allowDropIn) {
        const err = new Error("Drop-in not allowed for this course");
        err.code = "DROPIN_NOT_ALLOWED";
        throw err;
    }

    const sessions = await Promise.all(sessionIds.map(id => SessionModel.findById(id)));

    let status = "CONFIRMED";
    for (const session of sessions) {
        if ((session.bookedCount ?? 0) >= (session.capacity ?? 0)) {
            status = "WAITLISTED";
        } else {
            await SessionModel.incrementBookedCount(session._id, 1);
        }
    }

    return BookingModel.create({
        userId,
        courseId: course._id,
        type:     "SESSION",
        sessionIds: sessions.map(s => s._id),
        status,
    });
}