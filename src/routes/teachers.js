import express from 'express'
import { User } from '../models/user.js'
import generator from 'generate-password'
import { Teacher } from '../models/teacher.js'
import {
    AdminAndAcademicPermissionHandler,
    TeacherPermissionHandler,
} from '../middleware/admin-authority.js'
import ScooError from '../errors/scoo-error.js'
import { getPaginatorDefaultOptions } from '../aggregation/get-paginator-default.js'
import { TeacherAttendance } from '../models/course.js'
import mongoose from 'mongoose'
const router = express.Router()

// Add new teacher
router.post('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const { body } = req
    const newUser = new User(body)
    const newPassword = generator.generate({
        length: 12,
        uppercase: true,
        lowercase: true,
        symbols: true,
        numbers: true,
    })
    newUser.setPassword(newPassword)
    newUser.created_by = req.auth.uid
    newUser.role = 'teacher'
    newUser.save((err, result) => {
        if (err) return next(new ScooError(err.message, err.scope || 'user'))
        const userId = result._id
        if (!userId) return next(new ScooError('User id not supply', 'userId'))
        const newTeacher = new Teacher()
        newTeacher.user = userId
        newTeacher.specialty = body.specialty
        newTeacher.save((err, result) => {
            if (err)
                return next(new ScooError(err.message, err.scope || 'teacher'))
            // TODO: send the password by email
            return res.status(201).send({
                success: true,
                message: 'Teacher successfully created',
                password: newPassword, // TODO : remove this just for dev
                data: result._id,
            })
        })
    })
})

router.get('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const aggregateQuery = Teacher.aggregate([
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
                specialty: 1,
            },
        },
    ])
    const options = getPaginatorDefaultOptions(req)
    Teacher.aggregatePaginate(aggregateQuery, options, (err, result) => {
        if (err) return next(new ScooError(err?.message, 'teacher'))
        return res.status(200).send({
            success: true,
            data: result,
        })
    })
})

router.get('/:teacherId', (req, res, next) => {
    const teacherId = req.params.teacherId
    Teacher.findOne({ _id: teacherId }, (err, teacher) => {
        if (err || !teacher)
            return next(
                new ScooError(err?.message || 'Not user found', 'teacher')
            )
        return res.status(200).send({
            success: true,
            data: teacher,
        })
    }).populate('user', 'firstName lastName email active')
})

router.get('/stats/basic', TeacherPermissionHandler, (req, res, next) => {
    const teacherId = req.auth.uid
    Teacher.aggregate(
        [
            {
                $match: {
                    user: mongoose.Types.ObjectId(teacherId.toString()),
                },
            },
            {
                $lookup: {
                    from: TeacherAttendance.collection.name,
                    let: {
                        uid: '$_id',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$teacherId', '$$uid'],
                                        },
                                        {
                                            $eq: ['$present', true],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'pres_att',
                },
            },
            {
                $lookup: {
                    from: TeacherAttendance.collection.name,
                    let: {
                        uid: '$_id',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$teacherId', '$$uid'],
                                        },
                                        {
                                            $eq: ['$present', false],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'abs_att',
                },
            },
            {
                $lookup: {
                    from: TeacherAttendance.collection.name,
                    let: {
                        uid: '$_id',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$teacherId', '$$uid'],
                                        },
                                        {
                                            $eq: ['$present', false],
                                        },
                                        {
                                            $eq: ['$justify', true],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'just_att',
                },
            },
            {
                $addFields: {
                    presentCount: {
                        $size: '$pres_att',
                    },
                    absentCount: {
                        $size: '$abs_att',
                    },
                    justifyCount: {
                        $size: '$just_att',
                    },
                },
            },
            {
                $addFields: {
                    total: {
                        $add: [
                            '$presentCount',
                            '$absentCount',
                            '$justifyCount',
                        ],
                    },
                },
            },
            {
                $addFields: {
                    pres_perct: {
                        $divide: ['$presentCount', '$total'],
                    },
                    abs_perct: {
                        $divide: ['$absentCount', '$total'],
                    },
                    just_perct: {
                        $divide: ['$justifyCount', '$total'],
                    },
                },
            },
            {
                $addFields: {
                    pres_perct: {
                        $multiply: ['$pres_perct', 100],
                    },
                    abs_perct: {
                        $multiply: ['$abs_perct', 100],
                    },
                    just_perct: {
                        $multiply: ['$just_perct', 100],
                    },
                },
            },
            {
                $addFields: {
                    items: [
                        {
                            color: '#4CAF50',
                            label: 'Presence',
                            subtitle: 'Course attended',
                            value: '$pres_perct',
                        },
                        {
                            color: '#FF9800',
                            label: 'Justify',
                            subtitle: 'Justify absence(s)',
                            value: '$just_perct',
                        },
                        {
                            color: '#F44336',
                            label: 'Absence ',
                            subtitle: 'Time(s)',
                            value: '$abs_perct',
                        },
                    ],
                },
            },
            {
                $project: {
                    items: 1,
                },
            },
        ],
        (err, result) => {
            if (err) return next(new ScooError(err?.message, 'teacher'))
            return res.status(200).send({
                success: true,
                data: result,
            })
        }
    )
})

export default router
