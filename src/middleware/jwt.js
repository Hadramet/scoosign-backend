const { expressjwt: expressJwt } = require("express-jwt");
const { pathToRegexp } = require("path-to-regexp");
const { ScooError } = require("../errors/scoo-error");

const unprotected = [pathToRegexp("/api/v1/authorize")];

function jwtMiddleware() {
  return expressJwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"],
    credentialsRequired: true,
    getToken: function fromHeaderOrQuerystring(req) {
      try {
        if (
          req.header(process.env.JWT_TOKEN_HEADER_KEY) &&
          req
            .header(process.env.JWT_TOKEN_HEADER_KEY)
            .toString()
            .split(" ")[0] === "Bearer"
        ) {
          // 1 - Custom authorization header
          return req
            .header(process.env.JWT_TOKEN_HEADER_KEY)
            .toString()
            .split(" ")[1];
        } else if (req.query && req.query.token) {
          // 2 - by query
          return req.query.token;
        } else if (
          req.headers.authorization &&
          req.headers.authorization.split(" ")[0] === "Bearer"
        ) {
          // 3 - authorization headers
          return req.headers.authorization.split(" ")[1];
        }
        return null;
      } catch (error) {

        throw new Scoo("jwt", error.message);
      }
    },
  }).unless({
    path: unprotected,
  });
}

function jwtErrorHandler(err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    next(new ScooError( err.message, "user"));
  } else {
    next(new ScooError(err.message, "user"));
  }
}

module.exports = { jwtMiddleware, jwtErrorHandler };
