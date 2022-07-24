const express = require('express')
const router  = express.Router()

router.post('/test', (req, res) => {
    res.send('Test API')
})

module.exports = router