const Course = require('../models/course');
const User = require('../models/user');

// Helper: Universal user resolver from session
async function getCurrentUser(req) {
    if (!req.session || !req.session.userLoggedIn) return null;
    if (req.session.userId) {
        const u = await User.findById(req.session.userId);
        if (u) return u;
    }
    if (req.session.userEmail) {
        const u = await User.findOne({ email: req.session.userEmail });
        if (u) return u;
    }
    if (req.session.username) {
        const u = await User.findOne({ username: req.session.username });
        if (u) return u;
    }
    return null;
}

// Helper: Convert time string (e.g. '09:00 AM' or '01:30 PM') to total minutes from midnight
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = (match[3] || '').toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

// Helper: Determine if two timeslots overlap
function hasTimeConflict(startA, endA, startB, endB) {
    const sA = parseTimeToMinutes(startA);
    const eA = parseTimeToMinutes(endA);
    const sB = parseTimeToMinutes(startB);
    const eB = parseTimeToMinutes(endB);
    if (sA === null || eA === null || sB === null || eB === null) {
        return (startA && startB && startA.trim().toLowerCase() === startB.trim().toLowerCase());
    }
    // Intervals [sA, eA] and [sB, eB] overlap if max(sA, sB) < min(eA, eB)
    return Math.max(sA, sB) < Math.min(eA, eB);
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
        let enrolledIds = [];
        if (user && user.courses) {
            enrolledIds = user.courses.map(id => id.toString());
        }

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
        let enrolledIds = [];
        if (user && user.courses) {
            enrolledIds = user.courses.map(id => id.toString());
        }

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

// ENROLL WITH MANDATORY VALIDATION:
// 1) Duplicate subject check: Cannot enroll in two sections of the SAME course subject
// 2) Schedule time conflict check: Cannot enroll in courses with overlapping timeslots
exports.enrollCourse = async (req, res) => {
    if (!req.session.userLoggedIn) return res.redirect("/login");

    try {
        const courseId = req.params.courseId;
        const targetCourse = await Course.findById(courseId);
        if (!targetCourse) {
            return res.redirect('/courses');
        }

        const user = await getCurrentUser(req);
        if (!user) {
            return res.redirect('/login');
        }

        if (!user.courses) user.courses = [];

        // Check 0: Already registered in this exact section
        if (user.courses.some(id => id.toString() === courseId)) {
            return res.redirect(`/course-details/${encodeURIComponent(targetCourse.name)}?error=` +
                encodeURIComponent(`You are already enrolled in this exact section with ${targetCourse.teacher}.`));
        }

        // Populate existing enrolled courses to perform validations
        const populatedUser = await User.findById(user._id).populate('courses');
        const enrolledCourses = (populatedUser && populatedUser.courses) 
            ? populatedUser.courses.filter(c => c != null) 
            : [];

        // Check 1: Duplicate Subject Check
        const sameSubjectCourse = enrolledCourses.find(c => 
            c.name.trim().toLowerCase() === targetCourse.name.trim().toLowerCase()
        );
        if (sameSubjectCourse) {
            const errorMsg = `Cannot register '${targetCourse.name}'. You are already enrolled in Section (${sameSubjectCourse.teacher}: ${sameSubjectCourse.startTime} - ${sameSubjectCourse.endTime}). A student cannot register the same subject twice.`;
            return res.redirect(`/course-details/${encodeURIComponent(targetCourse.name)}?error=` + encodeURIComponent(errorMsg));
        }

        // Check 2: Schedule Time Conflict Check
        const conflictingCourse = enrolledCourses.find(c => 
            hasTimeConflict(c.startTime, c.endTime, targetCourse.startTime, targetCourse.endTime)
        );
        if (conflictingCourse) {
            const errorMsg = `Schedule Time Conflict! This lecture (${targetCourse.startTime} - ${targetCourse.endTime}) overlaps with your registered course '${conflictingCourse.name}' (${conflictingCourse.startTime} - ${conflictingCourse.endTime}).`;
            return res.redirect(`/course-details/${encodeURIComponent(targetCourse.name)}?error=` + encodeURIComponent(errorMsg));
        }

        // All checks passed -> Enroll and Save to MongoDB!
        user.courses.push(courseId);
        await user.save();

        return res.redirect(`/course-details/${encodeURIComponent(targetCourse.name)}?enrolled=1`);
    } catch (err) {
        console.error("Enrollment error:", err);
        return res.redirect('/courses');
    }
};

exports.getMyCourses = async (req, res) => {
    if (!req.session.userLoggedIn) return res.redirect("/login");

    try {
        const user = await getCurrentUser(req);
        let courses = [];
        if (user) {
            const populated = await User.findById(user._id).populate('courses');
            courses = populated && populated.courses ? populated.courses.filter(c => c != null) : [];
        }
        res.render('my-courses', {
            courses: courses,
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
        if (user && user.courses) {
            user.courses = user.courses.filter(c => c && c.toString() !== courseId);
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
