import ScooError from './scoo-error.js'

function logErrors(err, req, res, next) {
    console.error(err.stack)
    next(err)
}

// eslint-disable-next-line no-unused-vars
function clientErrorHandler(err, req, res, next) {
    if (req.xhr) {
        res.status(400).send({
            success: false,
            failed: err.scope || 'request',
            message: 'Bad request' + err.message,
        })
    } else if (err.name === 'UnauthorizedError') {
        next(new ScooError('Invalid token', 'user'))
    } else {
        next(err)
    }
}

export { logErrors, clientErrorHandler }
