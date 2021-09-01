const fs = require('fs');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const { getCoordinatesForAddress } = require('../utils/location');
const HttpError = require('../models/http-error');
const Place = require('../models/place');
const User = require('../models/user');

const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;
    let place;

    try {
        place = await Place.findById(placeId);
    } catch (error) {
        return next(new HttpError('Something went wrong, could not find a place'), 500);
    }

    if (!place) {
        return next(new HttpError('Could not find a place for the provided id.', 404));
    }

    res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    let places;

    try {
        places = await Place.find({ creator: userId });
    } catch (error) {
        return next(new HttpError('Something went wrong, could not find a place'), 500);
    }

    res.json({ places: places.map((place) => place.toObject({ getters: true })) });
};

const createPlace = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid input data.', 400));
    }

    const { title, description, address } = req.body;

    let user;
    try {
        user = await User.findById(req.userId);
    } catch (error) {
        return next(new HttpError('Failed to create a place, please try again later.', 500));
    }

    if (!user) {
        return next(new HttpError('Could not find user for the provided userId.', 404));
    }

    let coordinates;
    try {
        coordinates = await getCoordinatesForAddress(address);
    } catch (error) {
        return next(error);
    }

    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator: req.userId
    });

    try {
        const session = await mongoose.startSession();
        session.startTransaction();
        await createdPlace.save({ session });
        user.places.push(createdPlace);
        await user.save({ session });
        await session.commitTransaction();
    } catch (error) {
        return next(new HttpError('Failed to create a place, please try again later.', 500));
    }

    res.status(201).json({ place: createdPlace.toObject({ getters: true }) });
};

const updatePlace = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid input data.', 400));
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;
    let place;

    try {
        place = await Place.findById(placeId);
    } catch (error) {
        return next(new HttpError('Something went wrong, could not update place.', 500));
    }

    if (place.creator.toString() !== req.userId) {
        return next(new HttpError('You are not authorized to edit this place.', 401));
    }

    place.title = title;
    place.description = description;

    try {
        await place.save();
    } catch (error) {
        return next(new HttpError('Something went wrong, could not update place.', 500));
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;
    let place;

    try {
        place = await (await Place.findById(placeId)).populate('creator');
    } catch (error) {
        return next(new HttpError('Something went wrong, could not delete place.', 500));
    }

    if (!place) {
        return next(new HttpError('Could not find place for the provided id.', 404));
    }

    if (place.creator.id !== req.userId) {
        return next(new HttpError('You are not authorized to delete this place.', 401));
    }

    const imagePath = place.image;

    try {
        const session = await mongoose.startSession();
        session.startTransaction();
        await place.remove({ session });
        place.creator.places.pull(place);
        await place.creator.save({ session });
        await session.commitTransaction();
    } catch (error) {
        return next(new HttpError('Something went wrong, could not delete place.', 500));
    }

    fs.unlink(imagePath, (err) => console.log(err));

    res.status(200).json({ message: 'The place has been deleted.' });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
