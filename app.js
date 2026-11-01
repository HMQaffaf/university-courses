require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const expressSession = require('express-session');

const Course = require('./models/course');
const userRouter = require('./routes/user');
const courseRouter = require('./routes/course');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSession({
    secret: process.env.SESSION_SECRET || 'development_session_secret_placeholder',
    resave: false,
    saveUninitialized: false
}));

// Make auth state & current path available to all EJS views
app.use((req, res, next) => {
    res.locals.userLoggedIn = req.session.userLoggedIn || false;
    res.locals.currentUsername = req.session.username || null;
    res.locals.currentUserEmail = req.session.userEmail || null;
    res.locals.currentPath = req.path;
    res.locals.query = req.query;
    next();
});

app.use(userRouter);
app.use(courseRouter);

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/students";

async function seedInitialCourses() {
    try {
        const count = await Course.countDocuments();
        if (count === 0) {
            const sampleCourses = [
                { name: "Data Structures & Algorithms", teacher: "Dr. Ahmad Al-Mansour", startTime: "09:00 AM", endTime: "10:30 AM" },
                { name: "Data Structures & Algorithms", teacher: "Dr. Lina Haddad", startTime: "11:00 AM", endTime: "12:30 PM" },
                { name: "Full-Stack Web Technologies", teacher: "Dr. Tariq Nassar", startTime: "10:00 AM", endTime: "11:30 AM" },
                { name: "Full-Stack Web Technologies", teacher: "Eng. Sara Qudah", startTime: "01:00 PM", endTime: "02:30 PM" },
                { name: "Artificial Intelligence & Machine Learning", teacher: "Prof. Rami Zوايدة", startTime: "09:30 AM", endTime: "11:00 AM" },
                { name: "Database Management Systems", teacher: "Dr. Omar Dabbas", startTime: "12:00 PM", endTime: "01:30 PM" },
                { name: "Cybersecurity & Network Defense", teacher: "Dr. Nadine Khoury", startTime: "02:00 PM", endTime: "03:30 PM" },
                { name: "Software Engineering Principles", teacher: "Dr. Zaid Al-Fayez", startTime: "11:00 AM", endTime: "12:30 PM" }
            ];
            await Course.insertMany(sampleCourses);
            console.log("Seeded initial university courses into MongoDB.");
        }
    } catch (err) {
        console.warn("Could not seed initial courses:", err.message);
    }
}

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("Connected to MongoDB (students database)!");
        await seedInitialCourses();
    })
    .catch(err => {
        console.error("MongoDB connection error (make sure MongoDB is running locally):", err.message);
    });

app.get("/", (req, res) => {
    res.render("home", { userLoggedIn: req.session.userLoggedIn });
});

const PORT = process.env.PORT || 8880;
app.listen(PORT, () => console.log(`UOP Academic Portal started on http://localhost:${PORT}`));
