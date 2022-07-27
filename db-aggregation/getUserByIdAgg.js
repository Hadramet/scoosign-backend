const mongoose = require("mongoose");

function getUserByIdAgg(req) {
    return [
        {
            $match: {
                _id: mongoose.Types.ObjectId(req.params.userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "created_by",
                foreignField: "_id",
                as: "createdBy",
            },
        },
        {
            $unwind: {
                path: "$createdBy",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                lastName: 1,
                firstName: 1,
                email: 1,
                role: 1,
                created_at: 1,
                active: 1,
                salt: 1,
                hash: 1,
                createdBy: {
                    $concat: ["$createdBy.firstName", " ", "$createdBy.lastName"],
                },
            },
        },
    ];
}
exports.getUserByIdAgg = getUserByIdAgg;
