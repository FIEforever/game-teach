const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

// 设置 VERCEL 环境变量，让 database.js 使用内存 JSON 数据库
process.env.VERCEL = '1'

// 导入路由
const knowledgeRoutes = require('../server/routes/knowledge')
const gameRoutes = require('../server/routes/games')
const schoolRoutes = require('../server/routes/school')
const templateRoutes = require('../server/routes/templates')
const userRoutes = require('../server/routes/users')

// 挂载路由
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/games', gameRoutes)
app.use('/api/school', schoolRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/users', userRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: 'vercel' })
})

module.exports = app
