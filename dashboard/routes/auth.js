const express = require('express');
const validateFields = require('../middlewares/validator');
const verifyPassword = require('../middlewares/verifyPassword');
const verifyToken = require('../middlewares/verifyToken');
const { authLimiter } = require('../middlewares/rateLimiters');
const authController = require('../controllers/authController');

const authRouter = express.Router();

authRouter.get('/', authController.index);
authRouter.get('/userInfo', verifyToken, authController.getUserInfo);
authRouter.post('/register', authLimiter, validateFields(['name', 'email', 'password']), authController.register);
authRouter.post('/login', authLimiter, validateFields(['password']), verifyPassword, authController.login);
authRouter.post('/logout', authController.logout);
authRouter.post('/send-verification-email', authLimiter, authController.sendVerificationEmail);
authRouter.get('/verify-email', authController.verifyEmail);
authRouter.post('/forgot-password', authLimiter, validateFields(['email']), authController.forgotPassword);
authRouter.post('/reset-password', authLimiter, validateFields(['token', 'password']), authController.resetPassword);

module.exports = authRouter;
