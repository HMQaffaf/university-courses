const User = require('../models/user');
const { auth: firebaseAuth } = require('../firebase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'UOP_Security_Key_2026_Hash';

exports.getLogin = (req, res) => {
    if (req.session.userLoggedIn) return res.redirect('/profile');
    res.render('login', { userLoggedIn: false, error: null });
};

exports.getRegister = (req, res) => {
    if (req.session.userLoggedIn) return res.redirect('/profile');
    res.render('register', { userLoggedIn: false, error: null });
};

// Login: Finds student in MongoDB by EITHER Email OR Username (case-insensitive)
exports.postLogin = async (req, res) => {
    const identifier = (req.body.email || '').trim();
    const password = req.body.password || '';

    if (!identifier || !password) {
        return res.render('login', {
            userLoggedIn: false,
            error: 'Please enter your email or username and password.'
        });
    }

    try {
        const escapeRegex = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const user = await User.findOne({
            $or: [
                { email: new RegExp('^' + escapeRegex(identifier) + '$', 'i') },
                { username: new RegExp('^' + escapeRegex(identifier) + '$', 'i') }
            ],
            password: password
        });

        if (user) {
            req.session.userLoggedIn = true;
            req.session.userId = user._id.toString();
            req.session.username = user.username;
            req.session.userEmail = user.email;
            req.session.authMethod = 'Verified Student Credentials';
            return res.redirect('/profile');
        } else {
            return res.render('login', {
                userLoggedIn: false,
                error: 'Invalid email/username or password. If you registered previously, please verify your password.'
            });
        }
    } catch (err) {
        return res.render('login', {
            userLoggedIn: false,
            error: 'Database connection error during login. Please ensure MongoDB is running.'
        });
    }
};

// Registration: Saves new student to MongoDB and logs in immediately
exports.postRegister = async (req, res) => {
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!username || !email || password.length < 6) {
        return res.render('register', {
            userLoggedIn: false,
            error: 'Please provide a valid name, email, and a password of at least 6 characters.'
        });
    }

    try {
        const escapeRegex = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const existing = await User.findOne({
            $or: [
                { email: new RegExp('^' + escapeRegex(email) + '$', 'i') },
                { username: new RegExp('^' + escapeRegex(username) + '$', 'i') }
            ]
        });

        if (existing) {
            return res.render('register', {
                userLoggedIn: false,
                error: 'An account with this email or username already exists. Please log in instead.'
            });
        }

        if (firebaseAuth) {
            try {
                await firebaseAuth.createUser({ email, password, displayName: username });
            } catch (fbErr) {
                console.log('Firebase user note:', fbErr.message);
            }
        }

        const newUser = new User({ username, email, password, courses: [] });
        await newUser.save();

        req.session.userLoggedIn = true;
        req.session.userId = newUser._id.toString();
        req.session.username = newUser.username;
        req.session.userEmail = newUser.email;
        req.session.authMethod = 'Registered Student Account';

        return res.redirect('/profile');
    } catch (err) {
        return res.render('register', {
            userLoggedIn: false,
            error: 'Registration failed: ' + (err.message || 'Please check your inputs.')
        });
    }
};

// Google OAuth: Finds existing user by email or creates permanent MongoDB record
exports.googleLogin = async (req, res) => {
    const { idToken, username: customName } = req.body;
    try {
        let decodedToken = null;
        if (firebaseAuth && idToken) {
            decodedToken = await firebaseAuth.verifyIdToken(idToken);
        } else if (idToken) {
            decodedToken = jwt.decode(idToken) || {};
        }

        if (!decodedToken || !decodedToken.email) {
            return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
        }

        const email = decodedToken.email.toLowerCase();
        const displayName = customName || decodedToken.name || email.split('@')[0];
        const uid = decodedToken.uid || decodedToken.user_id || 'google_uid';

        const escapeRegex = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        let user = await User.findOne({
            email: new RegExp('^' + escapeRegex(email) + '$', 'i')
        });

        if (!user) {
            user = new User({
                username: displayName,
                email: email,
                password: 'google_account_auth_' + uid,
                courses: []
            });
            await user.save();
        }

        req.session.userLoggedIn = true;
        req.session.userId = user._id.toString();
        req.session.username = user.username;
        req.session.userEmail = user.email;
        req.session.authMethod = 'Google OAuth 2.0';

        return res.json({ success: true });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Authentication Failed: ' + error.message });
    }
};

exports.getProfile = async (req, res) => {
    if (!req.session.userLoggedIn) return res.redirect('/login');

    try {
        let user = null;
        if (req.session.userId) {
            user = await User.findById(req.session.userId).populate('courses');
        } else if (req.session.userEmail) {
            user = await User.findOne({ email: req.session.userEmail }).populate('courses');
        } else if (req.session.username) {
            user = await User.findOne({ username: req.session.username }).populate('courses');
        }

        const validCourses = user && user.courses ? user.courses.filter(c => c != null) : [];

        const profileData = {
            name: user ? user.username : (req.session.username || 'Student'),
            email: user ? user.email : (req.session.userEmail || 'student@uop.edu.jo'),
            authMethod: req.session.authMethod || 'Verified Student Portal',
            enrolledCount: validCourses.length,
            courses: validCourses
        };

        res.render('profile', {
            userLoggedIn: true,
            profile: profileData,
            user: profileData
        });
    } catch (err) {
        res.redirect('/login');
    }
};

exports.getLogout = (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
};
