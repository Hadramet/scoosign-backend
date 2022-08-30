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
import {
    Course,
    StudentAttendance,
    TeacherAttendance,
} from '../models/course.js'
import mongoose from 'mongoose'
import { Group } from '../models/group.js'
import { Student } from '../models/student.js'
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
                        $cond : { if : {$gt: ['$total', 0]}, then: { $divide: ['$presentCount', '$total']}, else:0 },
                    },
                    abs_perct: {
                        $cond : { if : {$gt: ['$total', 0]}, then: { $divide: ['$absentCount', '$total']}, else:0 },
                    },
                    just_perct: {
                        $cond : { if : {$gt: ['$total', 0]}, then: { $divide: ['$justifyCount', '$total']}, else:0 },
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
                            value: { $round: ['$pres_perct', 2] },
                        },
                        {
                            color: '#FF9800',
                            label: 'Justify',
                            subtitle: 'Justify absence(s)',
                            value: { $round: ['$just_perct', 2] },
                        },
                        {
                            color: '#F44336',
                            label: 'Absence ',
                            subtitle: 'Time(s)',
                            value: { $round: ['$abs_perct', 2] },
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
                data: result[0],
            })
        }
    )
})

router.get('/courses/daily', TeacherPermissionHandler, (req, res, next) => {
    const teacherId = req.auth.uid
    const interval_start = new Date()
    const interval_end = new Date()

    interval_start.setHours(8)
    interval_start.setMinutes(0)

    interval_end.setHours(23)
    interval_end.setMinutes(50)

    console.log(interval_start)
    console.log(interval_end)

    Teacher.aggregate(
        [
            {
                $match: {
                    user: mongoose.Types.ObjectId(teacherId),
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
                                    ],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: 'courses',
                                let: {
                                    cid: '$courseId',
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    {
                                                        $eq: ['$_id', '$$cid'],
                                                    },
                                                    {
                                                        $gte: [
                                                            '$start',
                                                            interval_start,
                                                        ],
                                                    },
                                                    {
                                                        $lte: [
                                                            '$start',
                                                            interval_end,
                                                        ],
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                    {
                                        $lookup: {
                                            from: 'students',
                                            let: {
                                                sts: '$students',
                                            },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: {
                                                            $in: [
                                                                '$_id',
                                                                '$$sts',
                                                            ],
                                                        },
                                                    },
                                                },
                                                {
                                                    $lookup: {
                                                        from: 'users',
                                                        foreignField: '_id',
                                                        localField: 'user',
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
                                                        'user.email': 1,
                                                    },
                                                },
                                            ],
                                            as: 'students',
                                        },
                                    },
                                ],
                                as: 'course',
                            },
                        },
                        {
                            $unwind: '$course',
                        },
                        {
                            $project: {
                                name: '$course.name',
                                courseId: '$course._id',
                                room: '$course.classRoom',
                                description: '$course.description',
                                start: '$course.start',
                                end: '$course.end',
                                isSigned: '$course.isLocked',
                                students: '$course.students',
                            },
                        },
                    ],
                    as: 'dailyCourses',
                },
            },
            {
                $project: {
                    dailyCourses: 1,
                },
            },
        ],
        (err, result) => {
            if (err) return next(new ScooError(err?.message, 'teacher'))
            return res.status(200).send({
                success: true,
                data: result[0],
            })
        }
    )
})

router.get(
    '/attendance/:attendanceId',
    TeacherPermissionHandler,
    (req, res, next) => {
        const attendanceId = req.params.attendanceId
        Course.aggregate(
            [
                {
                    $match: {
                        _id: mongoose.Types.ObjectId(attendanceId),
                    },
                },
                {
                    $lookup: {
                        from: Group.collection.name,
                        let: {
                            g: '$groups',
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ['$_id', '$$g'],
                                    },
                                },
                            },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                },
                            },
                        ],
                        as: 'groups',
                    },
                },
                {
                    $lookup: {
                        from: Teacher.collection.name,
                        let: { tid: '$teacher' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ['$_id', '$$tid'],
                                    },
                                },
                            },
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
                                $lookup: {
                                    from: TeacherAttendance.collection.name,
                                    let: {
                                        cId: mongoose.Types.ObjectId(
                                            attendanceId
                                        ),
                                    },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $and: [
                                                        {
                                                            $eq: [
                                                                '$teacherId',
                                                                '$$tid',
                                                            ],
                                                        },
                                                        {
                                                            $eq: [
                                                                '$courseId',
                                                                '$$cId',
                                                            ],
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'teacherAttendance',
                                },
                            },
                            {
                                $unwind: '$teacherAttendance',
                            },
                            {
                                $project: {
                                    userId: '$user._id',
                                    specialty: 1,
                                    firstName: '$user.firstName',
                                    lastName: '$user.lastName',
                                    email: '$user.email',
                                    present: '$teacherAttendance.present',
                                    comment: '$teacherAttendance.comment',
                                },
                            },
                        ],
                        as: 'teacher',
                    },
                },
                {
                    $unwind: '$teacher', //TODO: if multiple teacher can be added remove this
                },
                {
                    $lookup: {
                        from: StudentAttendance.collection.name,
                        let: { cid: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$courseId', '$$cid'] },
                                            { $eq: ['$present', true] },
                                        ],
                                    },
                                },
                            },
                            {
                                $lookup: {
                                    from: Student.collection.name,
                                    let: { sId: '$studentId' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$sId'],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'student',
                                },
                            },
                            {
                                $unwind: '$student',
                            },
                            {
                                $lookup: {
                                    from: User.collection.name,
                                    let: { uId: '$student.user' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$uId'],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'user',
                                },
                            },
                            {
                                $unwind: '$user',
                            },
                            {
                                $project: {
                                    firstName: '$user.firstName',
                                    lastName: '$user.lastName',
                                    present: 1,
                                    signedAt: 1,
                                    studentId: '$studentId',
                                    email: '$user.email',
                                },
                            },
                        ],
                        as: 'present',
                    },
                },
                {
                    $lookup: {
                        from: StudentAttendance.collection.name,
                        let: { cid: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$courseId', '$$cid'] },
                                            { $eq: ['$present', false] },
                                            {
                                                $or: [
                                                    {
                                                        $eq: [
                                                            '$justify',
                                                            false,
                                                        ],
                                                    },
                                                    {
                                                        $eq: [
                                                            {
                                                                $ifNull: [
                                                                    '$justify',
                                                                    false,
                                                                ],
                                                            },
                                                            false,
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                            {
                                $lookup: {
                                    from: Student.collection.name,
                                    let: { sId: '$studentId' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$sId'],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'student',
                                },
                            },
                            {
                                $unwind: '$student',
                            },
                            {
                                $lookup: {
                                    from: User.collection.name,
                                    let: { uId: '$student.user' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$uId'],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'user',
                                },
                            },
                            {
                                $unwind: '$user',
                            },
                            {
                                $project: {
                                    firstName: '$user.firstName',
                                    lastName: '$user.lastName',
                                    present: 1,
                                    justify: 1,
                                    studentId: '$studentId',
                                    email: '$user.email',
                                },
                            },
                        ],
                        as: 'absent',
                    },
                },
                {
                    $lookup: {
                        from: StudentAttendance.collection.name,
                        let: { cid: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$courseId', '$$cid'] },
                                            { $eq: ['$present', false] },
                                            { $eq: ['$justify', true] },
                                        ],
                                    },
                                },
                            },
                            {
                                $lookup: {
                                    from: Student.collection.name,
                                    let: { sId: '$studentId' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$sId'],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'student',
                                },
                            },
                            {
                                $unwind: '$student',
                            },
                            {
                                $lookup: {
                                    from: User.collection.name,
                                    let: { uId: '$student.user' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$uId'],
                                                },
                                            },
                                        },
                                    ],
                                    as: 'user',
                                },
                            },
                            {
                                $unwind: '$user',
                            },
                            {
                                $project: {
                                    firstName: '$user.firstName',
                                    lastName: '$user.lastName',
                                    present: 1,
                                    justify: 1,
                                    signedAt: 1,
                                    studentId: '$studentId',
                                    email: '$user.email',
                                },
                            },
                        ],
                        as: 'justify',
                    },
                },
                {
                    $addFields: {
                        presentCount: { $size: '$present' },
                        absentCount: { $size: '$absent' },
                        justifyCount: { $size: '$justify' },
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
                        students: {
                            $concatArrays: ['$present', '$absent', '$justify'],
                        },
                    },
                },
                {
                    $project: {
                        present: 0,
                        absent: 0,
                        justify: 0,
                    },
                },
            ],
            (err, result) => {
                if (err) return next(new ScooError(err?.message, 'student'))
                return res.status(200).send({
                    success: true,
                    data: result[0],
                })
            }
        )
    }
)
export default router
