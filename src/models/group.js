import mongoose from 'mongoose'
import ScooError from '../errors/scoo-error'

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
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
})

function uniqueValidator(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new ScooError('Group name already exist', 'name'))
    } else {
        next(error)
    }
}

GroupSchema.post('save', uniqueValidator)

export const Group = mongoose.model('Group', GroupSchema)
