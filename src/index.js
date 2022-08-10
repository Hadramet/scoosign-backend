import express, { json } from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { logErrors, clientErrorHandler } from './errors/error-handlers.js'
import { jwtMiddleware } from './middleware/jwt.js'
import userRouter from './routes/users.js'
import authorizeRouter from './routes/authorize.js'
import studentsRouter from './routes/students.js'
import groupsRouter from './routes/groups.js'
import coursesRouter from './routes/courses.js'
import teachersRouter from './routes/teachers.js'
import ScooError from './errors/scoo-error.js'

dotenv.config()

const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_TOKEN_HEADER_KEY']

for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing the environment variable ${key}`)
    }
}

const mongoString = process.env.MONGODB_URI

mongoose.connect(mongoString)
const database = mongoose.connection

database.on('error', (error) => {
    console.log(error)
})

database.once('connected', () => {
    console.log('Database connected')
})

const app = express()

// Middleware
app.use(json())
app.use(jwtMiddleware())

// Routes
app.use('/api/v1/authorize', authorizeRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/students', studentsRouter)
app.use('/api/v1/groups', groupsRouter)
app.use('/api/v1/teachers', teachersRouter)
app.use('/api/v1/courses', coursesRouter)

// Routes Not found
app.use((req, res, next) => {
    const error = new ScooError('Not found')
    error.message = 'Invalid route'
    error.scope = 'route'
    error.status = 404
    next(error)
})

// Error Handlers
app.use(logErrors)
app.use(clientErrorHandler)
app.use((err, req, res, next) => {
    return res.status(err.status || 500).send({
        success: false,
        failed: err.scope || 'request',
        message: err.message || 'Internal server error',
    })
})

const port = process.env.PORT || 5000

const server = app.listen(port, () => {
    console.log(`Server listening on port ${server.address().port}`)
})

export default server
