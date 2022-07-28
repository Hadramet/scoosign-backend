const express = require("express");
const User = require("../models/user");
const router = express.Router();
const mongoose = require("mongoose");
const { AdminPermissionHandler } = require("../middleware/admin-authority");
const { getUserByIdAgg } = require("../aggregation/get-user-byid-agg");
const { ScooError } = require("../errors/scoo-error");
const { getUserListAgg } = require("../aggregation/get-user-list-agg");

router.post("/", AdminPermissionHandler, function (req, res, next) {
  console.log("[POST/][users]", "Post on /users ..");
  const { body } = req;
  const new_user = new User(body);
  new_user.setPassword(body.password);
  new_user.created_by = req.auth.uid;
  new_user.save((err, result) => {
    if (err) next(new ScooError(err.message, err.scope || "user"));
    else {
      return res.status(201).send({
        success: true,
        message: "User successfully created",
        data: result,
      });
    }
  });
});

/**
 * Get all users basic informations
 * @param query:
 * - filter: user role ['admin', 'student',...]
 * - rowsPerPage: number of items par page
 * - page : current page
 */
router.get("/", AdminPermissionHandler, function (req, res, next) {
  const filter = req.query.filter || "all";
  const rowsPerPage = Number(req.query.rowsPerPage) || 0;
  const page = Number(req.query.page) || 1;
  const agg = getUserListAgg(filter, page, rowsPerPage);
  User.aggregate(agg, (err, users) => {
    if (err) next(new ScooError(err.message, "user"));
    else if (users) {
      return res.status(200).send({
        success: true,
        data: users,
      });
    }
  });
});

router.get("/:userId", function (req, res, next) {
  console.log("[GET/][users]", "request");
  const userByIdAgg = getUserByIdAgg(req);
  User.aggregate(userByIdAgg, (err, user) => {
    if (err) next(new ScooError(err.message, "user"));
    else if (user) {
      if (user.length === 0) {
        next(new ScooError("User not found", "user"));
      } else {
        return res.status(200).send({
          success: true,
          data: user[0],
        });
      }
    }
  });
});

router.put("/:userId", (req, res, next) => {
  /**
   * TODO: check user permission
   * - admin : allow
   * - others : allows only if its there account req.auth.uid === req.userId
   */
  console.log("[PUT/][users/:id]", "request");
  const query = req.body;
  console.log(query);
  User.updateOne(
    { _id: mongoose.Types.ObjectId(req.params.userId) },
    [{ $set: query }, { $set: { lastUpdate: "$$NOW" } }],
    (err, result) => {
      if (err) next(new ScooError(err.message, err.scope || "user"));
      else if (result.matchedCount === 0)
        new ScooError("User not found", "email");
      else {
        return res.status(200).send({
          success: true,
          message: "User successfully updated",
          data: result,
        });
      }
    }
  );
});

router.delete("/:userId", AdminPermissionHandler, (req, res, next) => {
  User.deleteOne({ _id: req.params.userId }, (err, result) => {
    if (err) next(err);
    else if (result.deletedCount === 0)
      new ScooError("User not found", "email");
    else {
      res.status(200).send({
        success: true,
        message: "Ok",
        data: result,
      });
    }
  });
});

module.exports = router;
