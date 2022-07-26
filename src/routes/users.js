const express = require("express");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const router = express.Router();

router.post("/", function (req, res) {
  try {
    console.log("[POST/][users]", "Post on /users ..");
    if (!req.auth.uid || req.auth.urole !== "admin") {
      console.log("[POST/][users]", "Unauthorized token");
      return res.status(401).send({
        success: false,
        failed: "request",
        message: "Unauthorized token",
      });
    } else {
      const { body } = req;
      User.findOne({ email: body.email }, function (err, user) {
        if (user) {
          return res.status(400).send({
            success: false,
            failed: "email",
            message: "User already exist",
          });
        } else {
          const new_user = new User(body);
          new_user.setPassword(body.password);
          new_user.created_by = req.auth.uid;
          new_user.save((err, User) => {
            if (err) {
              return res.status(error.statusCode || 400).send({
                success: false,
                failed: "request",
                message: err.message || "Failed to create user",
              });
            } else {
              return res.status(201).send({
                success: true,
                message: "User successfully created",
              });
            }
          });
        }
      });
    }
  } catch (error) {
    console.log("[POST/][users]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      failed: "request",
      message: "Internal server error",
    });
  }
});

router.get("/", function (req, res) {
  try {
    console.log("[GET/][users]", "request");
    if (!req.auth.uid || req.auth.urole !== "admin") {
      console.log("[GET/][users]", "Unauthorized token");
      return res.status(401).send({
        success: false,
        failed: "request",
        message: "Unauthorized token",
      });
    } else {
      console.log(req.query.filter);
      console.log(req.query.rowsPerPage);
      console.log(req.query.page);

      const filter = req.query.filter || "all";
      const rowsPerPage = Number(req.query.rowsPerPage) || 0;
      const page = Number(req.query.page) || 1;

      console.log(filter);
      console.log(rowsPerPage);
      console.log(page);

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
    }
  } catch (error) {
    console.log("[GET/][users]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      failed: "request",
      message: "Internal server error",
    });
  }
});

module.exports = router;
