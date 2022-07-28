const express = require("express");
const jwt = require("jsonwebtoken");
const { ScooError } = require("../errors/scoo-error");
const router = express.Router();

const User = require("../models/user");

router.post("/", (req, res, next) => {
  console.log("[POST/][authorize]", "request");
  User.findOne({ email: req.body.email }, function (err, user) {
    if (err) next(new ScooError(err.message, "email"));
    else if (!user) next(new ScooError("Invalid user email ", "email"));
    else if (!user.validatePassword(req.body.password))
      next(new ScooError("Invalid  password", "email"));
    else {
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
    }
  });
});

router.post("/me", (req, res, next) => {
  User.findById(req.auth.uid, function (err, user) {
    if (err) next(new ScooError(err.message, "user"));
    else if (!user) next(new ScooError("Invalid authorization token ", "user"));
    else {
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
});

module.exports = router;
