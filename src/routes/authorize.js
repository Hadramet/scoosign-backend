const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../models/user");

router.post("/", (req, res) => {
  try {
    console.log("[POST/][authorize]", "request");
    User.findOne({ email: req.body.email }, function (err, user) {
      if (!user) {
        return res.status(400).send({
          success: false,
          message: "Invalid user email ",
        });
      } else {
        if (user.validatePassword(req.body.password)) {
          const token = jwt.sign(
            { uid: user.id, urole: user.role },
            process.env.JWT_SECRET,
            {
              expiresIn: process.env.JWT_EXPIRES_IN,
              algorithm: "HS256",
            }
          );
          res.status(201).send({
            success: true,
            data: {
              token: token,
            },
          });
        } else {
          return res.status(400).send({
            success: false,
            message: "Invalid  password",
          });
        }
      }
    });
  } catch (error) {
    console.log("[Auth Api]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/me", (req, res) => {
  try {
    User.findById(req.auth.uid, function (err, user) {
      if (!user) {
        return res.status(400).send({
          success: false,
          message: "Invalid authorization token ",
        });
      } else {
        return res.status(200).send({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            name: user.lastName + " " + user.firstName,
            role: user.role,
          },
        });
      }
    });
  } catch (error) {
    console.log("[Auth Api]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
