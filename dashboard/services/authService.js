const bcrypt = require('bcryptjs');
const userRepository = require('../../common/userRepository');
const { sign } = require('../../common/auth');
const config = require('../../common/config');

const { createAppError } = require('../../common/utils/appError');

const registerUser = async ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await userRepository.findByEmail(normalizedEmail);
    if (userExists) {
        throw createAppError(409, 'User already exists');
    }

    await userRepository.create({
        name: name.trim(),
        email: normalizedEmail,
        password: bcrypt.hashSync(password, config.auth.bcryptSaltRounds),
    });

    return { msg: 'Registration successful', success: true };
};

const createLoginToken = (user, remember = false) => {
    const { password, ...userWithoutPassword } = user;
    const token = sign(userWithoutPassword);

    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        path: '/',
    };

    if (remember) {
        cookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000;
    }

    return { token, cookieOptions, user: userWithoutPassword };
};

const getUserById = async (userId) => {
    const userData = await userRepository.findById(userId);
    if (!userData) {
        throw createAppError(404, 'User not found');
    }
    delete userData.password;
    return userData;
};

module.exports = {
    registerUser,
    createLoginToken,
    getUserById,
};
