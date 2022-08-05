import mongoose from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'

const TeacherSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User id not supply'],
            unique: true,
        },
        specialty: {
            type: String,
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
)

function uniqueValidator(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new ScooError('Student already exist', 'student'))
    } else {
        next(error)
    }
}
TeacherSchema.post('updateOne', uniqueValidator)
TeacherSchema.post('save', uniqueValidator)
TeacherSchema.plugin(mongooseAggregatePaginate)
export const Teacher = mongoose.model('Teacher', TeacherSchema)
