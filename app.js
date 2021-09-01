const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const usersRoutes = require('./routes/users-routes');
const placesRoutes = require('./routes/places-routes');
const HttpError = require('./models/http-error');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const xssClean = require('xss-clean');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const hpp = require('hpp');

const app = express();

// Enables Body parser middleware
app.use(express.json());

// Enables logging middleware during development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Sanitizes data
app.use(mongoSanitize());

// Sets security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xssClean());

// Sets Rate limiting
const apiRatelimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100
});
app.use('/api/', apiRatelimiter);

// Prevents http param pollution
app.use(hpp());

// Enables CORS
app.use(cors());

// Enables static serving for uploaded images
app.use('/uploads/images', express.static(path.join('uploads', 'images')));

// Mounts routers
app.use('/api/users', usersRoutes);
app.use('/api/places', placesRoutes);

app.use((req, res, next) => {
    const error = new HttpError('Could not find this route.', 404);
    throw error;
});

app.use((error, req, res, next) => {
    if (req.file) {
        fs.unlink(req.file.path, (err) => console.log(err));
    }

    if (res.headerSent) {
        return next(error);
    }

    res.status(error.code || 500);
    res.json({ message: error.message || 'An unknown error occurred.' });
});

mongoose
    .connect(
        `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@roamerapp.tcryr.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
    )
    .then(() => app.listen(process.env.PORT || 5000))
    .catch((error) => console.error(error));
