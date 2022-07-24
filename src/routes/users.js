const express = require("express");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const router = express.Router();

router.post("/", function (req, res) {
  try {
    const token = req.header(process.env.JWT_TOKEN_HEADER_KEY);
    if (!token) throw new Error("Invalid headers configuration");
    const verify = jwt.verify(token, process.env.JWT_SECRET);
    if (!verify) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized",
      });
    } else {
      const { body } = req;
      User.findOne({ email: body.email }, function (err, user) {
        if (user) {
          return res.status(400).send({
            success: false,
            message: "User already exist",
          });
        } else {
          const new_user = new User(body);
          new_user.setPassword(body.password);
          const { uid } = jwt.decode(token);
          new_user.created_by = uid;
          new_user.save((err, User) => {
            if (err) {
              return res.status(400).send({
                success: false,
                message: "Failed to create user",
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
    res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
