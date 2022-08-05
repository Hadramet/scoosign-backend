import express from 'express'
import { User } from '../models/user.js'
import generator from 'generate-password'
import { Teacher } from '../models/teacher.js'
import { AdminAndAcademicPermissionHandler } from '../middleware/admin-authority.js'
import ScooError from '../errors/scoo-error.js'
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
// TODO : delete teacher

export default router
