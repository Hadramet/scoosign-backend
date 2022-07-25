const express = require("express");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const router = express.Router();

router.post("/", function (req, res) {
  try {
    
    console.log(["INFOS", "Post on /users .."]);
    if (!req.auth.uid || req.auth.urole !== 'admin') {
      return res.status(401).send({
        success: false,
        failed: 'request',
        message: "Unauthorized token",
      });
    } else {
      const { body } = req;
      User.findOne({ email: body.email }, function (err, user) {
        if (user) {
          return res.status(400).send({
            success: false,
            failed : 'email',
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
                failed: 'request',
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
    console.log("[Users Api]", error);
    res.status(error.statusCode || 500).send({
      success: false,
      failed : 'request',
      message: "Internal server error",
    });
  }
});

module.exports = router;
