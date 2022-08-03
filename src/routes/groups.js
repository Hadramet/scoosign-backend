import express from 'express'
import { getPaginatorDefaultOptions } from '../aggregation/get-paginator-default.js'
import ScooError from '../errors/scoo-error.js'
import { AdminAndAcademicPermissionHandler } from '../middleware/admin-authority.js'
import { Group } from '../models/group.js'
import { Student } from '../models/student.js'
import { User } from '../models/user.js'

const router = express.Router()

// name , description, parent, subGroups = [id], students=[id]
router.post('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    // get the parent : not res error
    const { body } = req
    const newGroup = new Group(body)
    newGroup.created_by = req.auth.uid
    const subGroups = body.subGroups || []
    const students = body.students || []
    const docs = []

    newGroup.save((err, result) => {
        if (err) return next(new ScooError(err.message, err.scope || 'group'))

        students.map((student) => {
            Student.findByIdAndUpdate(
                student,
                { $addToSet: { groups: result._id } },
                { new: true }
            )
        })

        subGroups.map((group) => {
            Group.findByIdAndUpdate(
                group,
                { parent: result._id },
                { new: true },
                (err, doc) => {
                    //TODO
                }
            )
        })

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
            $lookup: {
                from: Student.collection.name,
                let: { gid: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: ['$$gid', '$groups'],
                            },
                        },
                    },
                ],
                as: 'students',
            },
        },
        {
            $lookup: {
                from: Group.collection.name,
                localField: '_id',
                foreignField: 'parent',
                as: 'child',
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

router.get(
    '/list/available',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const aggregateQuery = Group.aggregate([
            {
                $match: {
                    $and: [
                        { parent: { $eq: null } },
                        { active: { $ne: false } },
                    ],
                },
            },
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
    }
)

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
                    // TODO
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
