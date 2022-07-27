const logErrors = function (err, req, res, next) {
  console.log('hi');
  console.error(err.stack);
  next(err);
};
exports.logErrors = logErrors;
const clientErrorHandler = function (err, req, res, next) {
  console.log('hoo');
  res.status(err.statusCode || 500).send({
    success: false,
    failed: "request",
    message: err.message || "Internal server error",
  });
};
exports.clientErrorHandler = clientErrorHandler;
