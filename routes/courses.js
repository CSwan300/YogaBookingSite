import { Router } from "express";
import { getCourses, createCourse, getCourseById } from "../controllers/apiController.js";

const router = Router();

router.get("/",     getCourses);
router.post("/",    createCourse);
router.get("/:id",  getCourseById);

export default router;