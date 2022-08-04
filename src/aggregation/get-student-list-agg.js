import { Student } from '../models/student.js'
import { User } from '../models/user.js'

export function getStudentAgg() {
    return Student.aggregate([
        {
            $lookup: {
                from: User.collection.name,
                localField: 'user',
                foreignField: '_id',
                as: 'user',
            },
        },
        {
            $unwind: '$user',
        },
        {
            $project: {
                'user.firstName': 1,
                'user.lastName': 1,
                'user._id': 1,
                'user.email': 1,
                'user.active': 1,
                groups: 1,
            },
        },
    ])
}
