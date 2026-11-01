const Course = require('../models/course');
const User = require('../models/user');

async function getCurrentUser(req) {
    if (!req.session.userLoggedIn) return null;
    if (req.session.userEmail) {
        const byEmail = await User.findOne({ email: req.session.userEmail });
        if (byEmail) return byEmail;
    }
    if (req.session.username) {
        return await User.findOne({ username: req.session.username });
    }
    return null;
}

exports.getCourses = async (req, res) => {
    try {
        const courses = await Course.find();
        const groupedCourses = {};
        courses.forEach(course => {
            if (!groupedCourses[course.name]) groupedCourses[course.name] = [];
            groupedCourses[course.name].push(course);
        });

        const user = await getCurrentUser(req);
        const enrolledIds = user ? user.courses.map(id => id.toString()) : [];

        res.render('courses', {
            groupedCourses,
            enrolledIds,
            totalCoursesCount: Object.keys(groupedCourses).length,
            totalSectionsCount: courses.length,
            userLoggedIn: req.session.userLoggedIn
        });
    } catch (err) {
        res.status(500).send("Error fetching courses");
    }
};

exports.getCourseDetails = async (req, res) => {
    try {
        const courseName = req.params.courseName;
        const courses = await Course.find({ name: courseName });
        const user = await getCurrentUser(req);
        const enrolledIds = user ? user.courses.map(id => id.toString()) : [];

        res.render('course-details', {
            courseName,
            courses,
            enrolledIds,
            userLoggedIn: req.session.userLoggedIn
        });
    } catch (err) {
        res.status(500).send("Error fetching course details");
    }
};

exports.enrollCourse = async (req, res) => {
    if (!req.session.userLoggedIn) return res.redirect("/login");

    try {
        const courseId = req.params.courseId;
        const user = await getCurrentUser(req);

        if (user && !user.courses.some(id => id.toString() === courseId)) {
            user.courses.push(courseId);
            await user.save();
        }

        const course = await Course.findById(courseId);
        if (course) {
            return res.redirect(`/course-details/${encodeURIComponent(course.name)}?enrolled=1`);
        }
        res.redirect('/my-courses');
    } catch (err) {
        res.redirect('/courses');
    }
};

exports.getMyCourses = async (req, res) => {
    if (!req.session.userLoggedIn) return res.redirect("/login");

    try {
        const user = await getCurrentUser(req);
        let populatedUser = null;
        if (user) {
            populatedUser = await User.findById(user._id).populate('courses');
        }
        res.render('my-courses', {
            courses: populatedUser ? populatedUser.courses : [],
            userLoggedIn: req.session.userLoggedIn
        });
    } catch (err) {
        res.redirect('/courses');
    }
};

exports.removeCourse = async (req, res) => {
    if (!req.session.userLoggedIn) return res.redirect("/login");

    try {
        const courseId = req.params.courseId;
        const user = await getCurrentUser(req);
        if (user) {
            user.courses = user.courses.filter(c => c.toString() !== courseId);
            await user.save();
        }
        res.redirect('/my-courses');
    } catch (err) {
        res.redirect('/my-courses');
    }
};

exports.getAddCourse = (req, res) => {
    if (!req.session.userLoggedIn) return res.redirect("/login");
    res.render('addCourse', { userLoggedIn: req.session.userLoggedIn, error: null, success: null });
};

exports.postAddCourse = async (req, res) => {
    if (!req.session.userLoggedIn) return res.redirect("/login");
    const { name, teacher, startTime, endTime } = req.body;
    try {
        const newCourse = new Course({
            name: (name || '').trim(),
            teacher: (teacher || '').trim(),
            startTime: (startTime || '').trim(),
            endTime: (endTime || '').trim()
        });
        await newCourse.save();
        res.redirect(`/course-details/${encodeURIComponent(newCourse.name)}`);
    } catch (err) {
        res.render('addCourse', {
            userLoggedIn: req.session.userLoggedIn,
            error: 'Please fill in all course fields properly.',
            success: null
        });
    }
};
