import ScooError from '../errors/scoo-error.js'

function AdminPermission(req, next) {
    if (!req.auth.uid || req.auth.urole !== 'admin') {
        next(new Error('Only admin user are authorize to proceed this request'))
    } else {
        next()
    }
}

function AdminAndAcademicPermission(req, next) {
    if (!req.auth.uid) return next(new ScooError('Unauthorize user', 'request'))
    if (req.auth.urole !== 'academic') {
        if (req.auth.urole !== 'admin')
            next(
                new Error(
                    'Only admin or academic user are authorize to proceed this request',
                    'request'
                )
            )
        else next()
    } else next()
}

export function AdminPermissionHandler(req, res, next) {
    try {
        AdminPermission(req, next)
    } catch (error) {
        res.status(error.statusCode || 500).send({
            success: false,
            failed: 'request',
            message: error.message || 'Internal server error',
        })
    }
}

export function AdminAndAcademicPermissionHandler(req, res, next) {
    try {
        AdminAndAcademicPermission(req, next)
    } catch (error) {
        res.status(error.statusCode || 500).send({
            success: false,
            failed: 'request',
            message: error.message || 'Internal server error',
        })
    }
}
