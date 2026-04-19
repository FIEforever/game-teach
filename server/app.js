const express = require('express')
const cors = require('cors')
const path = require('path')

const kpRoutes = require('./routes/knowledge')
const gameRoutes = require('./routes/games')
const templateRoutes = require('./routes/templates')
const userRoutes = require('./routes/users')
const schoolRoutes = require('./routes/school')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'uploads')))
app.use(express.static(path.join(__dirname, '../web')))

// API路由
app.use('/api/knowledge', kpRoutes)
app.use('/api/games', gameRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/users', userRoutes)
app.use('/api/school', schoolRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 游戏文件直接访问路由（必须在SPA fallback之前）
app.get('/play/:gameId', (req, res) => {
  const filePath = path.join(__dirname, 'uploads/games', req.params.gameId, 'index.html')
  if (require('fs').existsSync(filePath)) {
    res.sendFile(filePath)
  } else {
    res.status(404).send('游戏文件不存在')
  }
})

// SPA fallback - 所有非API请求返回index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/play')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(path.join(__dirname, '../web/index.html'))
})

app.listen(PORT, () => {
  console.log(`🎮 游戏化教学平台已启动: http://localhost:${PORT}`)
})

module.exports = app
