import express from 'express'
import mongoose from 'mongoose'
import ScooError from '../errors/scoo-error.js'
import { AdminAndAcademicPermissionHandler } from '../middleware/admin-authority.js'
import { Course } from '../models/course.js'
import { Group } from '../models/group.js'
import { Student } from '../models/student.js'
const router = express.Router()

// TODO : create new course
router.post('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const newCourse = new Course(req.body)
    newCourse.created_by = req.auth.uid

    const groups = []
    if (!req.body.groups) return next(new ScooError('Missing group or groups'))
    req.body.groups.map((group) => groups.push(mongoose.Types.ObjectId(group)))

    Student.aggregate(
        [
            {
                $match: {
                    groups: { $elemMatch: { $in: groups } },
                },
            },
            {
                $project: {
                    studentId: '$_id',
                    _id: 0,
                },
            },
            {
                $addFields: {
                    attendance: false,
                    comment: '',
                },
            },
        ],
        (err, stu) => {
            if (err)
                return next(new ScooError(err.message, err.scope || 'course'))
            if (stu.length === 0)
                return next(
                    new ScooError(
                        'You cannot create a course with no students' ||
                            'course'
                    )
                )
            newCourse.students = stu
            newCourse.save((err, result) => {
                if (err)
                    return next(
                        new ScooError(err.message, err.scope || 'course')
                    )
                return res.status(201).send({
                    success: true,
                    message: 'Course successfully created',
                    data: result,
                })
            })
        }
    )

    // newCourse.save((err, result) => {
    //     if (err) return next(new ScooError(err.message, err.scope || 'course'))
    //     return res.status(201).send({
    //         success: true,
    //         message: 'Course successfully created',
    //         data: result,
    //     })
    // })
})

router.get(
    '/:courseId',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const courseId = req.params.courseId
        Course.aggregate(
            [
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(courseId),
                    },
                },
                {
                    $lookup: {
                        from: Group.collection.name,
                        let: { g: '$groups' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ['$_id', '$$g'],
                                    },
                                },
                            },
                        ],
                        as: 'groups',
                    },
                },
            ],
            (err, result) => {
                if (err)
                    return next(
                        new ScooError(
                            err.message || 'Unable to find course',
                            'course'
                        )
                    )
                return res.status(200).send({
                    success: true,
                    data: result[0],
                })
            }
        )
    }
)
export default router
