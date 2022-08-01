import { expressjwt } from "express-jwt";
import { pathToRegexp } from "path-to-regexp";

const unprotected = [pathToRegexp("/api/v1/authorize")];

export function jwtMiddleware() {
  return expressjwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"],
    credentialsRequired: true,
    getToken: function fromHeaderOrQuerystring(req) {
      // 1 - Custom authorization header
      if (
        req.header(process.env.JWT_TOKEN_HEADER_KEY) &&
        req
          .header(process.env.JWT_TOKEN_HEADER_KEY)
          .toString()
          .split(" ")[0] === "Bearer"
      ) {
        return req
          .header(process.env.JWT_TOKEN_HEADER_KEY)
          .toString()
          .split(" ")[1];
      }
      return null;
    },
  }).unless({
    path: unprotected,
  });
}
