const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const userRepository = require('../../common/userRepository');
const config = require('../../common/config');

const { createAppError } = require('../../common/utils/appError');

function getTransporter() {
    return nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
            user: config.email.user,
            pass: config.email.pass,
        },
    });
}

const prepareVerificationEmail = async (email) => {
    if (!email) {
        throw createAppError(400, 'Email and name are required');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
        throw createAppError(404, 'User not found');
    }

    if (user.emailVerified) {
        throw createAppError(400, 'Email already verified');
    }

    let token = user.verificationToken;
    const tokenExpired =
        !user.verificationTokenExpiry || new Date(user.verificationTokenExpiry).getTime() < Date.now();

    if (!token || tokenExpired) {
        token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000);
        await userRepository.setVerificationToken(user.id, token, expiry);
    }

    // authController.verifyEmail renders its own success/failure HTML page
    // directly on Dashboard - this is not a frontend route.
    const verifyLink = `${config.http.dashboardPublicUrl}/auth/verify-email?token=${token}`;

    return { user, verifyLink };
};

const sendVerificationEmail = async ({ to, html }) => {
    const transporter = getTransporter();

    await transporter.sendMail({
        from: config.email.from,
        to,
        subject: 'Verify Your Email Address',
        html,
    });
};

const verifyEmail = async (token) => {
    if (!token) {
        return { success: false };
    }

    const user = await userRepository.findByVerificationToken(token);
    if (!user) {
        return { success: false };
    }

    await userRepository.markEmailVerified(user.id);

    return { success: true };
};

const requestPasswordReset = async (email) => {
    if (!email) {
        throw createAppError(400, 'Email is required');
    }

    const user = await userRepository.findByEmail(email.trim().toLowerCase());
    // Never reveal whether an email exists - caller returns a generic
    // success message either way.
    if (!user) {
        return null;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour
    await userRepository.setResetToken(user.id, token, expiry);

    const resetLink = `${config.http.frontendUrl}/reset-password/${token}`;
    return { user, resetLink };
};

const sendPasswordResetEmail = async ({ to, html }) => {
    const transporter = getTransporter();

    await transporter.sendMail({
        from: config.email.from,
        to,
        subject: 'Reset Your Password',
        html,
    });
};

const confirmPasswordReset = async (token, newPassword) => {
    if (!token || !newPassword) {
        throw createAppError(400, 'Token and new password are required');
    }

    const user = await userRepository.findByResetToken(token);
    if (!user) {
        throw createAppError(400, 'Reset link is invalid or has expired');
    }

    const hashed = bcrypt.hashSync(newPassword, config.auth.bcryptSaltRounds);
    await userRepository.updatePassword(user.id, hashed);

    return { msg: 'Password reset successful', success: true };
};

module.exports = {
    prepareVerificationEmail,
    sendVerificationEmail,
    verifyEmail,
    requestPasswordReset,
    sendPasswordResetEmail,
    confirmPasswordReset,
};
