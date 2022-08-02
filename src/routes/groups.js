import express from 'express'
import { getPaginatorDefaultOptions } from '../aggregation/get-paginator-default.js'
import ScooError from '../errors/scoo-error.js'
import { AdminAndAcademicPermissionHandler } from '../middleware/admin-authority.js'
import { Group } from '../models/group.js'
import { Student } from '../models/student.js'
import { User } from '../models/user.js'

const router = express.Router()

// name , description, parent
router.post('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    // get the parent : not res error
    const { body } = req
    const newGroup = new Group(body)
    newGroup.created_by = req.auth.uid
    newGroup.save((err, result) => {
        if (err) return next(new ScooError(err.message, err.scope || 'group'))
        return res.status(201).send({
            success: true,
            message: 'Group successfully created',
            data: result._id,
        })
    })
})

router.get('/:groupId', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const groupId = req.params.groupId
    Group.findOne({ _id: groupId }, (err, group) => {
        if (err || !group)
            return next(
                new ScooError(
                    err?.message || 'Group not found',
                    err?.scope || 'group'
                )
            )
        return res.status(200).send({
            success: true,
            data: group,
        })
    }).populate('created_by updated_by', 'description firstName lastName')
})

router.get('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const aggregateQuery = Group.aggregate([
        {
            $lookup: {
                from: User.collection.name,
                localField: 'created_by',
                foreignField: '_id',
                as: 'createdBy',
            },
        },
        {
            $unwind: '$createdBy',
        },
        {
            $project: {
                'createdBy.salt': 0,
                'createdBy.hash': 0,
            },
        },
    ])
    const options = getPaginatorDefaultOptions(req)
    Group.aggregatePaginate(aggregateQuery, options, (err, result) => {
        if (err) return next(new ScooError(err?.message, 'group'))
        return res.status(200).send({
            success: true,
            data: result,
        })
    })
})

// name , description, parent, active
router.put('/:groupId', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const groupId = req.params.groupId
    const { body } = req
    body.updated_by = req.auth.uid
    Group.updateOne({ _id: groupId }, body, (err, result) => {
        if (err)
            return next(
                new ScooError(
                    err.message || 'Unable to update',
                    err.scope || 'group'
                )
            )
        return res.status(200).send({
            success: true,
            data: result,
        })
    })
})

// set students to group
// students : [ids]
// BUG : we do not get the errors and result correctly
router.post(
    '/:groupId',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const groupId = req.params.groupId
        const { body } = req
        if (!body.students)
            return next(new ScooError('Missing students field', 'group'))

        const results = []
        const errors = []
        body.students.map((student) => {
            Student.findByIdAndUpdate(
                student,
                { $addToSet: { groups: groupId } },
                { new: true },
                (err, doc) => {
                    if (err) {
                        return next(new ScooError(err?.message, 'group'))
                    }
                    results.push(doc)
                }
            )
        })

        res.status(200).send({
            success: true,
            data: results,
        })
    }
)
export default router
