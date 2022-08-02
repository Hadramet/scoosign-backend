import express from 'express'
import mongoose from 'mongoose'
import { User } from '../models/user.js'
import { AdminPermissionHandler } from '../middleware/admin-authority.js'
import getUserByIdAgg from '../aggregation/get-user-byid-agg.js'
import ScooError from '../errors/scoo-error.js'
import getUserListAgg from '../aggregation/get-user-list-agg.js'

const router = express.Router()

// TODO: (global) remove complex aggregation if necessary and use mongoose populate instead

router.post('/', AdminPermissionHandler, (req, res, next) => {
    const { body } = req
    const newUser = new User(body)
    newUser.setPassword(body.password)
    newUser.created_by = req.auth.uid
    newUser.save((err, result) => {
        if (err) return next(new ScooError(err.message, err.scope || 'user'))
        return res.status(201).send({
            success: true,
            message: 'User successfully created',
            data: result._id,
        })
    })
})

router.get('/', AdminPermissionHandler, (req, res, next) => {
    const filter = req.query.filter || 'all'
    const rowsPerPage = Number(req.query.rowsPerPage) || 0
    const page = Number(req.query.page) || 1
    const agg = getUserListAgg(filter, page, rowsPerPage)
    User.aggregate(agg, (err, users) => {
        if (err) return next(new ScooError(err.message, 'user'))
        if (!users) return res.status(200).send({ success: true, data: [] })
        return res.status(200).send({
            success: true,
            data: users,
        })
    })
})

router.get('/:userId', (req, res, next) => {
    const userByIdAgg = getUserByIdAgg(req)
    User.aggregate(userByIdAgg, (err, user) => {
        if (err) return next(new ScooError(err.message, 'user'))
        else if (user) {
            if (user.length === 0)
                return next(new ScooError('User not found', 'user'))
        }
        return res.status(200).send({
            success: true,
            data: user[0],
        })
    })
})

router.put('/:userId', (req, res, next) => {
    /**
     * TODO: check user permission
     * - admin : allow
     * - others : allows only if its there account req.auth.uid === req.userId
     */
    const query = req.body
    User.updateOne(
        { _id: mongoose.Types.ObjectId(req.params.userId) },
        [{ $set: query }, { $set: { lastUpdate: '$$NOW' } }],
        (err, result) => {
            if (err)
                return next(new ScooError(err.message, err.scope || 'user'))
            else if (result.matchedCount === 0)
                return next(new ScooError('User not found', 'email'))
            return res.status(200).send({
                success: true,
                message: 'User successfully updated',
                data: result,
            })
        }
    )
})

// TODO : for RGPD delete all object that ref the user
router.delete('/:userId', AdminPermissionHandler, (req, res, next) => {
    User.deleteOne({ _id: req.params.userId }, (err, result) => {
        if (err) return next(err)
        else if (result.deletedCount === 0)
            return next(new ScooError('User not found', 'email'))
        else {
            res.status(200).send({
                success: true,
                message: 'Ok',
                data: result,
            })
        }
    })
})

export default router
