import { mongoose } from 'mongoose'
import crypto from 'node:crypto'
import ScooError from '../errors/scoo-error.js'

const UserSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'Please prove a first name for this user. '],
        maxLength: [60, 'First name cannot be more than 60 characters'],
    },
    lastName: {
        type: String,
        required: [true, 'Please provide a last name for this user'],
        maxLength: [60, 'Last name cannot be more than 60 characters'],
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Please provide an user email.'],
        maxLength: [255, 'Last name cannot be more than 255 characters'],
    },
    role: {
        type: String,
        enum: [
            'user',
            'admin',
            'owner',
            'academic',
            'student',
            'parent',
            'teacher',
        ],
        default: 'user',
    },
    active: {
        type: Boolean,
        default: true,
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    hash: { type: String },
    salt: { type: String },
})

const saltLength = 64
const iterations = 1000
const pwLength = 255
const digest = 'sha256'
const encoding = 'hex'

UserSchema.methods.setPassword = function (password) {
    this.salt = crypto.randomBytes(saltLength).toString(encoding)
    this.hash = crypto
        .pbkdf2Sync(password, this.salt, iterations, pwLength, digest)
        .toString(encoding)
}

UserSchema.methods.validatePassword = function (password) {
    const hash = crypto
        .pbkdf2Sync(password, this.salt, iterations, pwLength, digest)
        .toString(encoding)
    return this.hash === hash
}

UserSchema.pre('save', function (next) {
    const current = new Date()
    this.updated_at = current
    if (!this.created_at) {
        this.created_at = current
    }
    next()
})

function uniqueValidator(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new ScooError('Email already exist', 'email'))
    } else {
        next(error)
    }
}

UserSchema.post('updateOne', uniqueValidator)

UserSchema.post('save', uniqueValidator)

UserSchema.statics.deleteById = (_id) => this.deleteOne({ _id })

export const User = mongoose.model('User', UserSchema)
