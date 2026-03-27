const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usersSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minLength: 3,
            maxLength: 30,
        },
        
        password: {
            type: String,
            required: true,
            minLength: 8,
        },

        role: {
            type: String,
            required: true,
            enum: ['officer', 'president'],
            default: 'officer',
        },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'users',
    }
);

usersSchema.pre('save', async function hashPassword() {
    if (!this.isModified('password')) {
        return;
    }

    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
});

usersSchema.methods.comparePassword = async function comparePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', usersSchema);