const mongoose = require('mongoose');

const activitiesSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            trim: true,
        },
        'pictures._id': {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Picture',
        },
        'users._id': {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        'date': {
            type: Date,
        },
        archived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'activities',
    }
);

module.exports = mongoose.model('Activity', activitiesSchema);