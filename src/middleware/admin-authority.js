const AdminPermission = function (req, next) {
    if (!req.auth.uid || req.auth.urole !== "admin") {
        throw new Error("Only admin user are authorize to proceed this request");
    }
    next();
};
const AdminPermissionHandler = (req, res, next) => {
    try {
        AdminPermission(req, next);
    } catch (error) {
        console.log("[PUT/][users][id]", error);
        res.status(error.statusCode || 500).send({
            success: false,
            failed: "request",
            message: error.message || "Internal server error",
        });
    }
};
exports.AdminPermissionHandler = AdminPermissionHandler;
