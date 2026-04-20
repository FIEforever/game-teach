// Catch-all serverless function for Vercel
// This file handles ALL requests: API, static files, and SPA routing
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()

app.use(cors())
app.use(express.json())

// 设置 VERCEL 环境变量
process.env.VERCEL = '1'

// 导入路由
const knowledgeRoutes = require('../server/routes/knowledge')
const gameRoutes = require('../server/routes/games')
const schoolRoutes = require('../server/routes/school')
const templateRoutes = require('../server/routes/templates')
const userRoutes = require('../server/routes/users')

// 挂载 API 路由
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/games', gameRoutes)
app.use('/api/school', schoolRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/users', userRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: 'vercel' })
})

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, '../web/static')))
app.use('/games', express.static(path.join(__dirname, '../server/uploads/games')))

// SPA fallback
app.use((req, res) => {
  const htmlPath = path.join(__dirname, '../web/index.html')
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath)
  } else {
    res.status(404).send('Not Found')
  }
})

module.exports = app
