const { Router } = require('express');
const { check } = require('express-validator');
const controller = require('../controllers/users-controller');
const fileUpload = require('../middleware/file-upload');

const router = Router();

router.get('/', controller.getUsers);

router.post(
    '/signup',
    fileUpload.single('image'),
    [
        check('name').not().isEmpty(),
        check('email').normalizeEmail().isEmail(),
        check('password').isLength({ min: 6 })
    ],
    controller.signup
);

router.post('/login', controller.login);

module.exports = router;
