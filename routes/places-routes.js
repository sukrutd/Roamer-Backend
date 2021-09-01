const { Router } = require('express');
const { check } = require('express-validator');
const controller = require('../controllers/places-controller');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = Router();

router.get('/:pid', controller.getPlaceById);

router.get('/user/:uid', controller.getPlacesByUserId);

router.use(checkAuth);

router.post(
    '/',
    fileUpload.single('image'),
    [
        check('title').not().isEmpty(),
        check('description').isLength({ min: 5 }),
        check('address').not().isEmpty()
    ],
    controller.createPlace
);

router.patch(
    '/:pid',
    [check('title').not().isEmpty(), check('description').isLength({ min: 5 })],
    controller.updatePlace
);

router.delete('/:pid', controller.deletePlace);

module.exports = router;
