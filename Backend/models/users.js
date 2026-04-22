const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usersSchema = new mongoose.Schema(
    {
        first_name: {
            type: String,
            trim: true,
            default: '',
        },

        last_name: {
            type: String,
            trim: true,
            default: '',
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
        },
        
        password: {
            type: String,
            required: true,
            minLength: 8,
        },

        password_reset_code_hash: {
            type: String,
            default: null,
        },

        password_reset_code_expires_at: {
            type: Date,
            default: null,
        },

        role: {
            type: String,
            required: true,
            enum: ['officer', 'president', 'admin'],
            default: 'officer',
        },

        status: {
            type: String,
            required: true,
            enum: ['active', 'inactive'],
            default: 'active',
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