const express = require('express')
const router = express.Router()
const db = require('../models/database')

// 获取游戏模板列表
router.get('/list', (req, res) => {
  const { difficulty, tag } = req.query
  let sql = 'SELECT * FROM game_templates WHERE 1=1'
  const params = []
  if (difficulty) { sql += ' AND difficulty = ?'; params.push(difficulty) }
  if (tag) { sql += ' AND tags LIKE ?'; params.push(`%"${tag}"%`) }
  sql += ' ORDER BY use_count DESC'

  const templates = db.prepare(sql).all(...params)
  templates.forEach(t => { t.tags = JSON.parse(t.tags || '[]') })
  res.json({ code: 0, data: templates })
})

// 获取模板详情
router.get('/:id', (req, res) => {
  const tpl = db.prepare('SELECT * FROM game_templates WHERE id = ?').get(req.params.id)
  if (!tpl) return res.status(404).json({ code: 404, message: '模板不存在' })
  tpl.tags = JSON.parse(tpl.tags || '[]')
  res.json({ code: 0, data: tpl })
})

// 增加使用次数
router.post('/:id/use', (req, res) => {
  db.prepare('UPDATE game_templates SET use_count = use_count + 1 WHERE id = ?').run(req.params.id)
  res.json({ code: 0 })
})

module.exports = router
