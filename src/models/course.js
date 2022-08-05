import mongoose from 'mongoose'
import aggregatePaginate from 'mongoose-aggregate-paginate-v2'

const StudentCourseAttendanceSchema = mongoose.Schema()
const CourseSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please supply a course name'],
            maxLength: [255, 'Course name cannot be more than 255 characters'],
        },
        description: {
            type: String,
            maxLength: [
                255,
                'Course description cannot be more than 255 characters',
            ],
        },
        start: {
            type: Date,
            required: [true, 'Please supply a course start date'],
        },
        end: {
            type: Date,
            required: [true, 'Please supply a course end date'],
        },
        groups: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Group',
            },
        ],
        students: [Object],
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'Please supply a teacher for this course'],
            ref: 'Teacher',
        },
        classRoom: {
            type: String,
            maxLength: [
                60,
                'Class room name cannot be more than 255 characters',
            ],
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

CourseSchema.plugin(aggregatePaginate)
export const Course = mongoose.model('Course', CourseSchema)
