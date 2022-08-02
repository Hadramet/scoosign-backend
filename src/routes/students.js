import express from 'express'
import ScooError from '../errors/scoo-error.js'
import { AdminAndAcademicPermissionHandler } from '../middleware/admin-authority.js'
import { Student } from '../models/student.js'
import { User } from '../models/user.js'

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
    }).populate('user groups', 'firstName lastName email name')
})

// Get all
// TODO : paginate with indexing solution
router.get('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    Student.find((err, students) => {
        if (err) return next(new ScooError(err?.message, 'student'))
        return res.status(200).send({
            success: true,
            data: students,
        })
    }).populate('user', 'firstName lastName email')
})

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

export default router
