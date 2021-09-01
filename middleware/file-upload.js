const multer = require('multer');
const { v1: uuid } = require('uuid');

const mimeTypeMap = {
    'image/png': 'png',
    'image/jpg': 'jpg',
    'image/jpeg': 'jpeg'
};

const fileUpload = multer({
    limits: 500000,
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/images');
        },
        filename: (req, file, cb) => {
            const extension = mimeTypeMap[file.mimetype];
            const fileName = uuid() + '.' + extension;
            cb(null, fileName);
        }
    }),
    fileFilter: (req, file, cb) => {
        const isValid = !!mimeTypeMap[file.mimetype];
        const error = isValid ? null : new Error('Invalid image format.');
        cb(error, isValid);
    }
});

module.exports = fileUpload;
