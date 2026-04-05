//models/courseModel.js
import { coursesDb } from "./_db.js";

/**
 * @typedef {Object} Course
 * @property {string} [_id] - The unique identifier for the course.
 * @property {string} title - The title of the course.
 * @property {string} [description] - A brief overview of the course content.
 * @property {Date|string} startDate - The scheduled start date.
 * @property {number} [price] - The cost of the course.
 */

/**
 * Data access object for Course management and administration.
 */
export const CourseModel = {
    /**
     * Retrieves a single course by its unique ID.
     * @param {string} id - The course ID.
     * @returns {Promise<Course|null>} The course document or null if not found.
     */
    async findById(id) {
        return coursesDb.findOne({ _id: id });
    },

    /**
     * Lists courses based on a filter, sorted by start date.
     * @param {Object} [filter={}] - Mongo-style query filter.
     * @returns {Promise<Course[]>} An array of courses.
     */
    async list(filter = {}) {
        return coursesDb.find(filter).sort({ startDate: 1 });
    },

    /**
     * Creates a new course entry (Admin/Seed use).
     * @param {Course} courseData - The course details to insert.
     * @returns {Promise<Course>} The created course document.
     */
    async create(courseData) {
        return coursesDb.insertAsync(courseData);
    },

    /**
     * Updates an existing course (Admin/Seed use).
     * @param {string} id - The ID of the course to update.
     * @param {Partial<Course>} updateData - The fields to update.
     * @returns {Promise<number>} The number of affected documents.
     */
    async update(id, updateData) {
        return coursesDb.updateAsync({ _id: id }, { $set: updateData }, {});
    },

    /**
     * Removes a course from the database.
     * @param {string} id - The ID of the course to delete.
     * @returns {Promise<number>} The number of removed documents.
     */
    async delete(id) {
        return coursesDb.remove({ _id: id });
    },
};