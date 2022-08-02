import mongoose from 'mongoose'
import ScooError from '../errors/scoo-error.js'
import aggregatePaginate from 'mongoose-aggregate-paginate-v2'

const StudentSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User id not supply'],
        unique: true,
    },
    groups: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
        },
    ],
})

function uniqueValidator(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new ScooError('Student already exist', 'student'))
    } else {
        next(error)
    }
}
StudentSchema.post('updateOne', uniqueValidator)
StudentSchema.post('save', uniqueValidator)
StudentSchema.plugin(aggregatePaginate)
export const Student = mongoose.model('Student', StudentSchema)
