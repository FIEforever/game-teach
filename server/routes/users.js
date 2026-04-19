const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const db = require('../models/database')

// 登录/注册（简化版）
router.post('/login', (req, res) => {
  const { name } = req.body
  let user = db.prepare('SELECT * FROM users WHERE name = ?').get(name)

  if (!user) {
    const id = uuidv4()
    db.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(id, name)
    user = { id, name }
  }

  res.json({ code: 0, data: { id: user.id, name: user.name, avatar: user.avatar, role: user.role } })
})

// 获取用户信息
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT id, name, avatar, role, bio, created_at FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })

  // 获取用户上传的游戏
  const games = db.prepare("SELECT id, title, play_count, like_count, created_at FROM games WHERE author_id = ? AND status = 'published' ORDER BY created_at DESC").all(req.params.id)

  res.json({ code: 0, data: { ...user, games } })
})

module.exports = router
