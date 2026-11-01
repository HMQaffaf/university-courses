const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course');

router.get("/courses", courseController.getCourses);
router.get("/course-details/:courseName", courseController.getCourseDetails);
router.get("/enroll/:courseId", courseController.enrollCourse);
router.get("/my-courses", courseController.getMyCourses);
router.get("/remove/:courseId", courseController.removeCourse);
router.get("/add-course", courseController.getAddCourse);
router.post("/courses/add", courseController.postAddCourse);

module.exports = router;
