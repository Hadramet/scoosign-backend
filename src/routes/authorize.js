import express from "express";
import jwt from "jsonwebtoken";
import ScooError from "../errors/scoo-error.js";
import { User } from "../models/user.js";

const router = express.Router();

router.post("/", (req, res, next) => {
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) return next(new ScooError(err.message, "email"));
    else if (!user) return next(new ScooError("Invalid user email ", "email"));
    else if (!user.validatePassword(req.body.password))
      return next(new ScooError("Invalid  password", "email"));
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
          token,
        },
      });
    }
  });
});

router.post("/me", (req, res, next) => {
  User.findById(req.auth.uid, (err, user) => {
    if (err) return next(new ScooError(err.message, "user"));
    else if (!user)
      return next(new ScooError("Invalid authorization token ", "user"));

    return res.status(200).send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: `${user.lastName} ${user.firstName}`,
        role: user.role,
      },
    });
  });
});

export default router;
