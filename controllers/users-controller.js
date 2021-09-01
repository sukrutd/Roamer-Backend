const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const normalizeEmail = require('validator/lib/normalizeEmail');
const HttpError = require('../models/http-error');
const User = require('../models/user');

const getUsers = async (req, res, next) => {
    let users;

    try {
        users = await User.find({}, '-password');
    } catch (error) {
        return next(new HttpError('Unable to fetch users, please try again later.', 500));
    }

    res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid input data.', 400));
    }

    const { name, email, password } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ email });
    } catch (error) {
        return next(new HttpError('Could not register user, please try again later.', 500));
    }

    if (existingUser) {
        return next(new HttpError('User already exists.', 422));
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12);
    } catch (error) {
        return next(new HttpError('Could not register user, please try again later.', 500));
    }

    const createdUser = new User({
        name,
        email,
        password: hashedPassword,
        image: req.file.path,
        places: []
    });

    try {
        await createdUser.save();
    } catch (error) {
        return next(new HttpError('Could not register user, please try again later.', 500));
    }

    let token;
    try {
        token = jwt.sign(
            { userId: createdUser.id, email: createdUser.email },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRE
            }
        );
    } catch (error) {
        return next(new HttpError('Could not register user, please try again later.', 500));
    }

    res.status(201).json({ userId: createdUser.id, email: createdUser.email, token });
};

const login = async (req, res, next) => {
    const { email, password } = req.body;

    let existingUser;
    try {
        existingUser = await User.findOne({ email: normalizeEmail(email) });
    } catch (error) {
        return next(
            new HttpError('Could not log you in, please check your credentials and try again.', 500)
        );
    }

    if (!existingUser) {
        return next(
            new HttpError('Invalid credentials, please check your credentials and try again.', 403)
        );
    }

    let isValidPassword = false;
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (error) {
        return next(
            new HttpError('Could not log you in, please check your credentials and try again.', 500)
        );
    }

    if (!isValidPassword) {
        return next(
            new HttpError('Invalid credentials, please check your credentials and try again.', 403)
        );
    }

    let token;
    try {
        token = jwt.sign(
            { userId: existingUser.id, email: existingUser.email },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRE
            }
        );
    } catch (error) {
        new HttpError('Could not log you in, please check your credentials and try again.', 500);
    }

    res.json({ userId: existingUser.id, email: existingUser.email, token });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
