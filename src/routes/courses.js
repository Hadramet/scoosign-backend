import express from 'express'
import mongoose from 'mongoose'
import { getPaginatorDefaultOptions } from '../aggregation/get-paginator-default.js'
import ScooError from '../errors/scoo-error.js'
import { AdminAndAcademicPermissionHandler } from '../middleware/admin-authority.js'
import {
    Course,
    StudentAttendance,
    TeacherAttendance,
} from '../models/course.js'
import { Group } from '../models/group.js'
import { Student } from '../models/student.js'
import { Teacher } from '../models/teacher.js'
import { User } from '../models/user.js'
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
                    _id: 1,
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
            const stuAtt = []
            stu.map((student) =>
                stuAtt.push(
                    new StudentAttendance({
                        studentId: student._id,
                        courseId: newCourse._id,
                    })
                )
            )
            StudentAttendance.insertMany(stuAtt, (err, res) => {
                if (err)
                    return next(
                        new ScooError(err.message, err.scope || 'course')
                    )
            })
            TeacherAttendance.create(
                {
                    teacherId: req.body.teacher,
                    courseId: newCourse._id,
                },
                (err, res) => {
                    if (err)
                        return next(
                            new ScooError(err.message, err.scope || 'course')
                        )
                }
            )

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
                {
                    $lookup: {
                        from: StudentAttendance.collection.name,
                        localField: '_id',
                        foreignField: 'courseId',
                        as: 'students',
                    },
                },
                {
                    $lookup: {
                        from: TeacherAttendance.collection.name,
                        localField: '_id',
                        foreignField: 'courseId',
                        as: 'teacher',
                    },
                },
                {
                    $unwind: '$teacher',
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
                    data: result,
                })
            }
        )
    }
)

router.get('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const aggregateQuery = Course.aggregate([
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
                        $project: {
                            userId: '$user._id',
                            specialty: 1,
                            firstName: '$user.firstName',
                            lastName: '$user.lastName',
                            email: '$user.email',
                            active: '$user.active',
                        },
                    },
                ],
                as: 'teacher',
            },
        },
        {
            $unwind: '$teacher', //TODO: if multiple teacher can be added remove this
        },
    ])
    const options = getPaginatorDefaultOptions(req)
    Course.aggregatePaginate(aggregateQuery, options, (err, result) => {
        if (err) return next(new ScooError(err?.message, 'student'))
        return res.status(200).send({
            success: true,
            data: result,
        })
    })
})

router.get(
    '/attendance/certificate',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const aggregateQuery = Course.aggregate([
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
                            $project: {
                                userId: '$user._id',
                                specialty: 1,
                                firstName: '$user.firstName',
                                lastName: '$user.lastName',
                                email: '$user.email',
                                active: '$user.active',
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
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'absent',
                },
            },
            {
                $addFields: {
                    present: { $size: '$present' },
                    absent: { $size: '$absent' },
                },
            },
            {
                $addFields: {
                    total: { $add: ['$present', '$absent'] },
                },
            },
            { $sort: { start: -1 } },
        ])
        const options = getPaginatorDefaultOptions(req)
        Course.aggregatePaginate(aggregateQuery, options, (err, result) => {
            if (err) return next(new ScooError(err?.message, 'student'))
            return res.status(200).send({
                success: true,
                data: result,
            })
        })
    }
)
router.get(
    '/attendance/:attendanceId/certificate',
    AdminAndAcademicPermissionHandler,
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

router.patch(
    '/:courseId/lock',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const courseId = req.params.courseId
        Course.updateOne(
            { _id: mongoose.Types.ObjectId(courseId) },
            {
                $set: {
                    isLocked: true,
                    link: 'http_link_here',
                    locked_by: mongoose.Types.ObjectId(req.auth.uid),
                },
            },
            {
                strict: false,
                upsert: true,
            },
            (err, result) => {
                if (err) return next(new ScooError(err?.message, 'student'))
                return res.status(200).send({
                    success: true,
                    data: result,
                })
            }
        )
    }
)

router.patch(
    '/:courseId/studentPresent/:studentId',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const courseId = req.params.courseId
        const studentId = req.params.studentId

        StudentAttendance.updateOne(
            {
                studentId: mongoose.Types.ObjectId(studentId),
                courseId: mongoose.Types.ObjectId(courseId),
            },
            {
                $set: {
                    present: true,
                    signedAt: new Date(),
                    updated_by: mongoose.Types.ObjectId(req.auth.uid),
                },
            },
            {
                strict: false,
                upsert: true,
            },
            (err, result) => {
                if (err) return next(new ScooError(err?.message, 'student'))
                return res.status(200).send({
                    success: true,
                    data: result,
                })
            }
        )
    }
)
router.patch(
    '/:courseId/studentAbsent/:studentId',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const courseId = req.params.courseId
        const studentId = req.params.studentId

        StudentAttendance.updateOne(
            {
                studentId: mongoose.Types.ObjectId(studentId),
                courseId: mongoose.Types.ObjectId(courseId),
            },
            {
                $set: {
                    present: false,
                    updated_by: mongoose.Types.ObjectId(req.auth.uid),
                },
            },
            {
                strict: false,
                upsert: true,
            },
            (err, result) => {
                if (err) return next(new ScooError(err?.message, 'student'))
                return res.status(200).send({
                    success: true,
                    data: result,
                })
            }
        )
    }
)

router.patch(
    '/:courseId/studentJustify/:studentId',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const courseId = req.params.courseId
        const studentId = req.params.studentId

        StudentAttendance.updateOne(
            {
                studentId: mongoose.Types.ObjectId(studentId),
                courseId: mongoose.Types.ObjectId(courseId),
            },
            {
                $set: {
                    present: false,
                    justify: true,
                    justifyLink: 'http_lik_here',
                    signedAt: new Date(),
                    updated_by: mongoose.Types.ObjectId(req.auth.uid),
                },
            },
            {
                strict: false,
                upsert: true,
            },
            (err, result) => {
                if (err) return next(new ScooError(err?.message, 'student'))
                return res.status(200).send({
                    success: true,
                    data: result,
                })
            }
        )
    }
)
export default router
