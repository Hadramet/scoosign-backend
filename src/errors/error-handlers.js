const logErrors = function (err, req, res, next) {
  console.error(err.stack);
  next(err);
};
exports.logErrors = logErrors;

//TODO: find a way to customize error for client
// Ex : new CustomError(scope, message)
const clientErrorHandler = function (err, req, res, next) {
  console.log('Error send to client');
  console.log(err)
  res.status(err.statusCode || 500).send({
    success: false,
    failed: err.scope,
    message: err.message || "Internal server error",
  });
};
exports.clientErrorHandler = clientErrorHandler;
