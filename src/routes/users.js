const express = require("express");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const router = express.Router();
const mongoose = require("mongoose");
const { AdminPermissionHandler } = require("../middleware/AdminPermission");
const { getUserByIdAgg } = require("../../db-aggregation/getUserByIdAgg");

/**
 * Create a user
 */
router.post("/", AdminPermissionHandler, function (req, res) {
  try {
    console.log("[POST/][users]", "Post on /users ..");
    const { body } = req;
    const new_user = new User(body);
    new_user.setPassword(body.password);
    new_user.created_by = req.auth.uid;
    new_user.save((err, result) => {
      if (err) {
        return res.status(err.statusCode || 400).send({
          success: false,
          failed: "request",
          message: err.message || "Failed to create user",
        });
      } else {
        return res.status(201).send({
          success: true,
          message: "User successfully created",
          data: result,
        });
      }
    });
  } catch (error) {
    console.log("[POST/][users]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      failed: "request",
      message: "Internal server error",
    });
  }
});

/**
 * Get all users basic informations
 * @param query:
 * - filter: user role ['admin', 'student',...]
 * - rowsPerPage: number of items par page
 * - page : current page
 */
router.get("/", AdminPermissionHandler, function (req, res) {
  try {
    const filter = req.query.filter || "all";
    const rowsPerPage = Number(req.query.rowsPerPage) || 0;
    const page = Number(req.query.page) || 1;

    const agg = [];
    if (filter !== "all") {
      agg.push({
        $match: {
          role: {
            $eq: filter,
          },
        },
      });
    }

    if (page >> 1) {
      agg.push({
        $skip: page * rowsPerPage,
      });
    }

    if (rowsPerPage >> 0) {
      agg.push({
        $limit: rowsPerPage,
      });
    }
    agg.push({
      $project: {
        name: {
          $concat: ["$firstName", " ", "$lastName"],
        },
        email: 1,
        type: "$role",
        active: 1,
      },
    });
    User.aggregate(agg, (err, users) => {
      if (users) {
        return res.status(200).send({
          success: true,
          data: users,
        });
      } else if (err) {
        return res.status(error.statusCode || 400).send({
          success: false,
          failed: "request",
          message: err.message || "Failed to retrieve the data",
        });
      }
    });
  } catch (error) {
    console.log("[GET/][users]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      failed: "request",
      message: "Internal server error",
    });
  }
});
router.get("/:userId", function (req, res) {
  try {
    console.log("[GET/][users]", "request");
    const userByIdAgg = getUserByIdAgg(req);
    User.aggregate(userByIdAgg, (err, user) => {
      if (err) {
        return res.status(err.statusCode || 300).send({
          success: false,
          failed: "user",
          message: err.message || "User not found",
        });
      } else if (user) {
        if (user.length === 0) {
          return res.status(300).send({
            success: false,
            failed: "user",
            message: "User not found",
          });
        } else {
          return res.status(200).send({
            success: true,
            data: user[0],
          });
        }
      }
    });
  } catch (error) {
    console.log("[GET/][users][id]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      failed: "request",
      message: "Internal server error",
    });
  }
});
router.put("/:userId", (req, res) => {
  try {
    /**
     * TODO: check user permission
     * - admin : allow
     * - others : allows only if its there account req.auth.uid === req.userId
     */
    console.log("[PUT/][users/:id]", "request");
    const query = req.body;
    User.updateOne(
      { _id: mongoose.Types.ObjectId(req.params.userId) },
      [{ $set: query }, { $set: { lastUpdate: "$$NOW" } }],
      (err, result) => {
        if (err) {
          return res.status(err.statusCode || 404).send({
            success: false,
            failed: "user",
            message: err.message || "User not found",
          });
        } else {
          if (result.matchedCount >> 0) {
            return res.status(200).send({
              success: true,
              message: "User successfully updated",
              data: result,
            });
          } else {
            return res.status(404).send({
              success: false,
              failed: "user",
              message: "User not found",
            });
          }
        }
      }
    );
  } catch (error) {
    console.log("[PUT/][users][id]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      failed: "request",
      message: "Internal server error",
    });
  }
});

// TODO: DELETE user by id
router.delete("/:userId", AdminPermissionHandler, (req, res) => {
  try {
    res.send(req.userId);
  } catch (error) {
    console.log("[PUT/][users][id]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      failed: "request",
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;

