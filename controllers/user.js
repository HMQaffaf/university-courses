const User = require('../models/user');
const { auth: firebaseAuth } = require('../firebase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_key_placeholder';

exports.getLogin = (req, res) => {
    if (req.session.userLoggedIn) return res.redirect('/profile');
    res.render('login', { userLoggedIn: false, error: null });
};

exports.getRegister = (req, res) => {
    if (req.session.userLoggedIn) return res.redirect('/profile');
    res.render('register', { userLoggedIn: false, error: null });
};

// Traditional MongoDB Email & Password Login
exports.postLogin = async (req, res) => {
    const email = (req.body.email || '').trim();
    const password = req.body.password || '';

    try {
        const user = await User.findOne({ email, password });
        if (user) {
            const token = jwt.sign(
                { email: user.email, name: user.username, id: user._id },
                JWT_SECRET,
                { expiresIn: '2h' }
            );
            req.session.token = token;
            req.session.userLoggedIn = true;
            req.session.username = user.username;
            req.session.userEmail = user.email;
            req.session.authMethod = 'Standard Credentials + JWT';
            return res.redirect('/profile');
        } else {
            return res.render('login', {
                userLoggedIn: false,
                error: 'Invalid email or password. Try signing in with Google or register a new account.'
            });
        }
    } catch (err) {
        return res.render('login', {
            userLoggedIn: false,
            error: 'An error occurred during login. Please try again.'
        });
    }
};

// Traditional Form Registration (saves to both Firebase if configured and MongoDB)
exports.postRegister = async (req, res) => {
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim();
    const password = req.body.password || '';

    if (!username || !email || password.length < 6) {
        return res.render('register', {
            userLoggedIn: false,
            error: 'Please provide a valid name, email, and a password of at least 6 characters.'
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('register', {
                userLoggedIn: false,
                error: 'An account with this email already exists. Please sign in.'
            });
        }

        if (firebaseAuth) {
            try {
                await firebaseAuth.createUser({ email, password, displayName: username });
            } catch (fbErr) {
                // If user already exists in Firebase, continue saving to MongoDB
                console.log('Firebase user creation note:', fbErr.message);
            }
        }

        const newUser = new User({ username, email, password, courses: [] });
        await newUser.save();

        const token = jwt.sign(
            { email: newUser.email, name: newUser.username, id: newUser._id },
            JWT_SECRET,
            { expiresIn: '2h' }
        );
        req.session.token = token;
        req.session.userLoggedIn = true;
        req.session.username = newUser.username;
        req.session.userEmail = newUser.email;
        req.session.authMethod = 'Firebase & MongoDB Verified';

        return res.redirect('/profile');
    } catch (err) {
        return res.render('register', {
            userLoggedIn: false,
            error: 'Registration failed: ' + (err.message || 'Please check your inputs.')
        });
    }
};

// Google OAuth & Firebase Client SDK Login + Automatic MongoDB User Sync
exports.googleLogin = async (req, res) => {
    const { idToken, username: customName } = req.body;
    try {
        let decodedToken = null;
        if (firebaseAuth && idToken) {
            decodedToken = await firebaseAuth.verifyIdToken(idToken);
        } else if (idToken) {
            // Fallback decode if serviceAccountKey.json was removed for public demo
            decodedToken = jwt.decode(idToken) || {};
        }

        if (!decodedToken || !decodedToken.email) {
            return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
        }

        const email = decodedToken.email;
        const displayName = customName || decodedToken.name || email.split('@')[0];
        const uid = decodedToken.uid || decodedToken.user_id || 'google_uid';

        // Sync user with MongoDB so course enrollment works seamlessly
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                username: displayName,
                email: email,
                password: 'google_oauth_' + uid,
                courses: []
            });
            await user.save();
        } else if (customName && user.username !== customName) {
            user.username = customName;
            await user.save();
        }

        const token = jwt.sign(
            { email: user.email, name: user.username, uid, id: user._id },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        req.session.token = token;
        req.session.userLoggedIn = true;
        req.session.username = user.username;
        req.session.userEmail = user.email;
        req.session.authMethod = 'Google OAuth 2.0 & JWT';

        return res.json({ success: true });
    } catch (error) {
        console.error('Google Auth Error:', error.message);
        return res.status(401).json({ success: false, message: 'Authentication Failed: ' + error.message });
    }
};

exports.getProfile = async (req, res) => {
    if (!req.session.userLoggedIn) return res.redirect('/login');

    try {
        const query = req.session.userEmail
            ? { email: req.session.userEmail }
            : { username: req.session.username };
        const user = await User.findOne(query).populate('courses');

        const profileData = {
            name: user ? user.username : (req.session.username || 'Student'),
            email: user ? user.email : (req.session.userEmail || 'student@uop.edu.jo'),
            authMethod: req.session.authMethod || 'Google OAuth & JWT',
            enrolledCount: user && user.courses ? user.courses.length : 0,
            courses: user && user.courses ? user.courses : []
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
