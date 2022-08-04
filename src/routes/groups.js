import express from 'express'
import mongoose from 'mongoose'
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
    if (body.parent === '') body.parent = null
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

// Get a group by id
router.get('/:groupId', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const groupId = req.params.groupId
    Group.aggregate(
        [
            {
                $match: {
                    _id: mongoose.Types.ObjectId(groupId.toString()),
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
                    from: User.collection.name,
                    localField: 'created_by',
                    foreignField: '_id',
                    as: 'created_by',
                },
            },
            {
                $lookup: {
                    from: User.collection.name,
                    localField: 'updated_by',
                    foreignField: '_id',
                    as: 'updated_by',
                },
            },
            {
                $unwind: {
                    path: '$created_by',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $unwind: {
                    path: '$updated_by',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    'created_by.salt': 0,
                    'created_by.hash': 0,
                    'updated_by.salt': 0,
                    'updated_by.hash': 0,
                },
            },
        ],
        (err, group) => {
            if (err || !group)
                return next(
                    new ScooError(
                        err?.message || 'Group not found',
                        err?.scope || 'group'
                    )
                )
            return res.status(200).send({
                success: true,
                data: group[0],
            })
        }
    )
})

// Get all groups
router.get('/', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const aggregateQuery = Group.aggregate([
        {
            $sort: { created_at: -1 },
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

// Get groups that have as parent the current groupId
router.get(
    '/subGroups/:groupId',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const groupId = req.params.groupId
        const aggregateQuery = Group.aggregate([
            {
                $match: {
                    parent: mongoose.Types.ObjectId(groupId.toString()),
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

// Get groups that have not parent
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

// Update a group infos
router.put('/:groupId', AdminAndAcademicPermissionHandler, (req, res, next) => {
    const groupId = req.params.groupId
    const { body } = req
    body.updated_by = req.auth.uid
    if (body.parent === '') body.parent = null
    if (body.subGroups) {
        body.subGroups.map((group) => {
            Group.findByIdAndUpdate(
                group,
                { parent: groupId },
                { new: true },
                (err, doc) => {
                    //TODO
                }
            )
        })
    }
    if (body.students) {
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
    }
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
// DEPRECATED : we do not get the errors and result correctly
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

// Get students that belong to some group id
router.get(
    '/:groupId/students',
    AdminAndAcademicPermissionHandler,
    (req, res, next) => {
        const groupId = req.params.groupId
        const aggregateQuery = Student.aggregate([
            {
                $match: {
                    $and: [
                        {
                            groups: {
                                $exists: true,
                                $in: [mongoose.Types.ObjectId(groupId)],
                            },
                        },
                    ],
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
                    'user.firstName': 1,
                    'user.lastName': 1,
                    'user.email': 1,
                },
            },
        ])
        const options = getPaginatorDefaultOptions(req)
        Student.aggregatePaginate(aggregateQuery, options, (err, result) => {
            if (err) return next(new ScooError(err?.message, 'group'))
            return res.status(200).send({
                success: true,
                data: result,
            })
        })
    }
)
export default router
