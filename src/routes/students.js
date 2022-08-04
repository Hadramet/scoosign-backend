import express from 'express'
import ScooError from '../errors/scoo-error.js'
import { AdminAndAcademicPermissionHandler } from '../middleware/admin-authority.js'
import { Student } from '../models/student.js'
import { User } from '../models/user.js'
import { getPaginatorDefaultOptions } from '../aggregation/get-paginator-default.js'
import { getStudentAgg } from '../aggregation/get-student-list-agg.js'
import { Group } from '../models/group.js'
import mongoose from 'mongoose'

const router = express.Router()

// Create a student
router.post('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    // TODO : refactor this part
    const { body } = req
    const newUser = new User(body)
    newUser.setPassword(body.password)
    newUser.created_by = req.auth.uid
    newUser.role = 'student'
    newUser.save((err, result) => {
        if (err) return next(new ScooError(err.message, err.scope || 'user'))
        const userId = result._id
        if (!userId) return next(new ScooError('User id not supply', 'userId'))
        const newStudent = new Student()
        newStudent.user = userId
        newStudent.save((err, result) => {
            if (err)
                return next(new ScooError(err.message, err.scope || 'student'))
            return res.status(201).send({
                success: true,
                message: 'Student successfully created',
                data: result._id,
            })
        })
    })
})

// Create student profile from an existing user with student role
router.post('/:userId', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const userId = req.params.userId
    User.findOne({ _id: userId }, (err, user) => {
        if (err || !user)
            return next(new ScooError(err.message || 'Not user found', 'user'))
        if (user.role != 'student')
            return next(new ScooError('User is not a student', 'user'))

        const newStudent = new Student()
        newStudent.user = userId
        newStudent.save((err, result) => {
            if (err)
                return next(new ScooError(err.message, err.scope || 'student'))
            return res.status(201).send({
                success: true,
                message: 'Student successfully created',
                data: result._id,
            })
        })
    })
})

// Get student by id
router.get('/:studentId', (req, res, next) => {
    const studentId = req.params.studentId
    Student.findOne({ _id: studentId }, (err, student) => {
        if (err || !student)
            return next(
                new ScooError(err?.message || 'Not user found', 'student')
            )
        return res.status(200).send({
            success: true,
            data: student,
        })
    }).populate('user groups', 'firstName lastName email name active')
})

// Get all
// TODO : paginate with indexing solution
router.get('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const aggregateQuery = getStudentAgg()
    const options = getPaginatorDefaultOptions(req)
    Student.aggregatePaginate(aggregateQuery, options, (err, result) => {
        if (err) return next(new ScooError(err?.message, 'student'))
        return res.status(200).send({
            success: true,
            data: result,
        })
    })
})

router.get(
    '/:studentId/groups',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const studentId = req.params.studentId
        const aggregateQuery = Student.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId(studentId.toString()),
                },
            },
            {
                $lookup: {
                    from: Group.collection.name,
                    localField: 'groups',
                    foreignField: '_id',
                    as: 'groups',
                },
            },
            {
                $unwind: {
                    path: '$groups',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: {
                    groups: {
                        $exists: true,
                        $not: {
                            $type: 'array',
                        },
                    },
                },
            },
            {
                $replaceRoot: {
                    newRoot: '$groups',
                },
            },
        ])

        const options = getPaginatorDefaultOptions(req)
        Student.aggregatePaginate(aggregateQuery, options, (err, result) => {
            if (err) return next(new ScooError(err?.message, 'student'))
            return res.status(200).send({
                success: true,
                data: result,
            })
        })
    }
)

// groups
router.put(
    '/:studentId',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const studentId = req.params.studentId
        const { body } = req
        Student.updateOne({ _id: studentId }, body, (err, result) => {
            if (err)
                return next(
                    new ScooError(
                        err.message || 'Unable to update',
                        err.scope || 'students'
                    )
                )
            return res.status(200).send({
                success: true,
                data: result,
            })
        })
    }
)
router.put(
    '/:studentId/add-groups',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const studentId = req.params.studentId
        const { body } = req
        if (!body.groups)
            return next(new ScooError('Missing groups field', 'student'))
        Student.updateOne(
            { _id: mongoose.Types.ObjectId(studentId) },
            {
                $addToSet: {
                    groups: {
                        $each: body.groups,
                    },
                },
            },
            (err, result) => {
                if (err)
                    return next(
                        new ScooError(
                            err.message || 'Unable to update',
                            err.scope || 'students'
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
router.patch(
    '/:studentId/remove-group',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const studentId = req.params.studentId
        const { body } = req
        if (!body.groups)
            return next(new ScooError('Missing groups field', 'student'))
        Student.findByIdAndUpdate(
            studentId,
            {
                $pullAll: {
                    groups: body.groups,
                },
            },
            (err, result) => {
                if (err)
                    return next(
                        new ScooError(
                            err.message || 'Unable to update',
                            err.scope || 'students'
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

export default router
