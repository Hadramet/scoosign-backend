export const AdminPermission = (req, next) => {
  if (!req.auth.uid || req.auth.urole !== "admin") {
    throw new Error("Only admin user are authorize to proceed this request");
  }
  next();
};

export const AdminPermissionHandler = (req, res, next) => {
  try {
    AdminPermission(req, next);
  } catch (error) {
    res.status(error.statusCode || 500).send({
      success: false,
      failed: "request",
      message: error.message || "Internal server error",
    });
  }
};
