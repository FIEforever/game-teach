const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()

app.use(cors())
app.use(express.json())

process.env.VERCEL = '1'

const knowledgeRoutes = require('../server/routes/knowledge')
const gameRoutes = require('../server/routes/games')
const schoolRoutes = require('../server/routes/school')
const templateRoutes = require('../server/routes/templates')
const userRoutes = require('../server/routes/users')

app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/games', gameRoutes)
app.use('/api/school', schoolRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/users', userRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: 'vercel' })
})

app.use('/static', express.static(path.join(__dirname, '../web/static')))
app.use('/games', express.static(path.join(__dirname, '../server/uploads/games')))

app.use((req, res) => {
  const htmlPath = path.join(__dirname, '../web/index.html')
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath)
  } else {
    res.status(404).send('Not Found')
  }
})

module.exports = app
