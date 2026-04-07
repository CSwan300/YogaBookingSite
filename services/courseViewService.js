// services/courseViewService.js
// Assembles view-model data for course admin pages.
// The edit-page formatter lived inline in viewsController.getUpdateCoursePage;
// it is moved here so the controller stays a thin render layer.
// No HTTP objects (req / res) live here.

import { CourseModel }   from "../models/courseModel.js";
import { SessionModel }  from "../models/sessionModel.js";

import { getCoursesDashboardData } from "./organiserService.js";
import { duration, fmtDate }       from "./formatService.js";

// ---------------------------------------------------------------------------
// Edit course page  —  GET /dashboard/courses/:id/edit
// ---------------------------------------------------------------------------

/**
 * Builds the full view-model for the course edit form.
 * Fetches the course, its sessions, and the instructor list in parallel,
 * then shapes each into the flags and formatted fields the template expects.
 *
 * @param {string} courseId - The ID of the course being edited.
 * @returns {Promise<EditCourseViewModel>}
 * @throws {{ code: "NOT_FOUND" }} When the course does not exist.
 *
 * @typedef {object} EditCourseViewModel
 * @property {FormattedCourse}       course       - Course data with boolean helper flags.
 * @property {FormattedSession[]}    sessions     - All sessions for this course.
 * @property {FormattedInstructor[]} instructors  - All instructors, with isSelected flag.
 *
 * @typedef {object} FormattedCourse
 * @property {string}  startDate           - ISO date string (YYYY-MM-DD) or empty string.
 * @property {string}  endDate             - ISO date string (YYYY-MM-DD) or empty string.
 * @property {boolean} isBeginnerLevel     - True when level === "beginner".
 * @property {boolean} isIntermediateLevel - True when level === "intermediate".
 * @property {boolean} isAdvancedLevel     - True when level === "advanced".
 * @property {boolean} isWeeklyBlock       - True when type === "WEEKLY_BLOCK".
 * @property {boolean} isWeekendWorkshop   - True when type === "WEEKEND_WORKSHOP".
 *
 * @typedef {object} FormattedSession
 * @property {string}  id        - Session ID as a string.
 * @property {string}  start     - Formatted start date/time.
 * @property {string}  end       - Formatted end date/time.
 * @property {string}  duration  - Human-readable duration (e.g. "60 min").
 * @property {number}  capacity  - Maximum participants.
 * @property {number}  booked    - Current booking count.
 * @property {number}  spotsLeft - Remaining capacity (min 0).
 * @property {boolean} isFull    - True when booked >= capacity.
 * @property {boolean} isPast    - True when the session start is in the past.
 *
 * @typedef {object} FormattedInstructor
 * @property {string}  id         - Instructor ID as a string.
 * @property {string}  name       - Instructor display name.
 * @property {boolean} isSelected - True when this instructor is assigned to the course.
 */
export const getEditCoursePageData = async (courseId) => {
    const course = await CourseModel.findById(courseId);
    if (!course) throw Object.assign(new Error("Course not found"), { code: "NOT_FOUND" });

    const [sessions, { instructors }] = await Promise.all([
        SessionModel.listByCourse(courseId),
        getCoursesDashboardData(),
    ]);

    const now = new Date();

    const formattedCourse = {
        ...course,
        startDate:           course.startDate ? new Date(course.startDate).toISOString().split("T")[0] : "",
        endDate:             course.endDate   ? new Date(course.endDate).toISOString().split("T")[0]   : "",
        isBeginnerLevel:     course.level === "beginner",
        isIntermediateLevel: course.level === "intermediate",
        isAdvancedLevel:     course.level === "advanced",
        isWeeklyBlock:       course.type  === "WEEKLY_BLOCK",
        isWeekendWorkshop:   course.type  === "WEEKEND_WORKSHOP",
    };

    const formattedSessions = sessions.map((s) => ({
        id:        String(s._id),
        start:     fmtDate(s.startDateTime),
        end:       fmtDate(s.endDateTime),
        duration:  duration(s.startDateTime, s.endDateTime),
        capacity:  s.capacity,
        booked:    s.bookedCount ?? 0,
        spotsLeft: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
        isFull:    (s.bookedCount ?? 0) >= (s.capacity ?? 0),
        isPast:    new Date(s.startDateTime) < now,
    }));

    const formattedInstructors = instructors.map((i) => ({
        id:         String(i._id),
        name:       i.name,
        isSelected: String(i._id) === String(course.instructorId),
    }));

    return {
        course:      formattedCourse,
        sessions:    formattedSessions,
        instructors: formattedInstructors,
    };
};