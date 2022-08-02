import mongoose from 'mongoose'
import ScooError from '../errors/scoo-error.js'

const GroupSchema = mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: [true, 'Please provide a group name.'],
        maxLength: [60, 'Group name cannot be more than 60 characters'],
    },
    description: {
        type: String,
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
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
})

GroupSchema.pre('save', function (next) {
    const current = new Date()
    this.updated_at = current
    if (!this.created_at) {
        this.created_at = current
    }
    next()
})

function uniqueValidator(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new ScooError('Group name already exist', 'group'))
    } else {
        next(error)
    }
}

GroupSchema.post('save', uniqueValidator)

export const Group = mongoose.model('Group', GroupSchema)
