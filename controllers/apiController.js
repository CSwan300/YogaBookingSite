import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

export const getCourses = async (req, res) => {
    const courses = await CourseModel.list();
    res.json({ courses });
};

export const createCourse = async (req, res) => {
    const course = await CourseModel.create(req.body);
    res.status(201).json({ course });
};

export const getCourseById = async (req, res) => {
    const course = await CourseModel.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    const sessions = await SessionModel.listByCourse(course._id);
    res.json({ course, sessions });
};