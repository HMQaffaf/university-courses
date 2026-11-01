const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');

// Standard & /auth prefixed routes so both conventions work seamlessly
router.get("/login", userController.getLogin);
router.post("/login", userController.postLogin);
router.get("/auth/login", userController.getLogin);

router.get("/register", userController.getRegister);
router.post("/register", userController.postRegister);
router.get("/auth/register", userController.getRegister);

router.post("/auth/google", userController.googleLogin);

router.get("/logout", userController.getLogout);
router.get("/auth/logout", userController.getLogout);

router.get("/profile", userController.getProfile);

module.exports = router;
