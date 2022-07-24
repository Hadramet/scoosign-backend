require('dotenv').config()
const express = require("express");
const mongoose = require("mongoose");
const routes = require('./routes/routes')

const mongoString = process.env.MONGODB_URI

mongoose.connect(mongoString)
const database = mongoose.connection

database.on('error', (error) =>{
    console.log(error)
})

database.once('connected', () =>{
    console.log('Database connected')
})

const app = express();

app.use(express.json());
app.use('/api', routes)

app.listen(3001, () => {
    console.log(`Server started at ${3001}`)
})

