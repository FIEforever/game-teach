const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const db = require('../models/database')

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const gameId = req.body.gameId || uuidv4()
    const dir = path.join(__dirname, '../uploads/games', gameId)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, 'index.html')
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.html', '.htm', '.zip']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('只支持 .html 或 .zip 文件'))
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

// 获取某知识点的游戏列表
router.get('/list', (req, res) => {
  const { kpId, authorId, sort } = req.query
  let sql = "SELECT g.*, u.name as author_name FROM games g LEFT JOIN users u ON g.author_id = u.id WHERE g.status = 'published'"
  const params = []
  if (kpId) { sql += ' AND g.kp_id = ?'; params.push(kpId) }
  if (authorId) { sql += ' AND g.author_id = ?'; params.push(authorId) }

  if (sort === 'popular') sql += ' ORDER BY g.play_count DESC'
  else if (sort === 'liked') sql += ' ORDER BY g.like_count DESC'
  else sql += ' ORDER BY g.is_default DESC, g.created_at DESC'

  const games = db.prepare(sql).all(...params)
  games.forEach(g => { g.tags = JSON.parse(g.tags || '[]') })
  res.json({ code: 0, data: games })
})

// 获取游戏详情
router.get('/:id', (req, res) => {
  const game = db.prepare(`
    SELECT g.*, u.name as author_name, u.avatar as author_avatar,
      kp.name as kp_name, kp.description as kp_desc
    FROM games g
    LEFT JOIN users u ON g.author_id = u.id
    LEFT JOIN knowledge_points kp ON g.kp_id = kp.id
    WHERE g.id = ?
  `).get(req.params.id)

  if (!game) return res.status(404).json({ code: 404, message: '游戏不存在' })
  game.tags = JSON.parse(game.tags || '[]')

  // 获取评论
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM game_comments c LEFT JOIN users u ON c.user_id = u.id
    WHERE c.game_id = ? ORDER BY c.created_at DESC LIMIT 20
  `).all(req.params.id)

  res.json({ code: 0, data: { ...game, comments } })
})

// 获取游戏HTML内容
router.get('/:id/play', (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id)
  if (!game) return res.status(404).send('游戏不存在')

  const filePath = path.join(__dirname, '../uploads/games', game.id, 'index.html')
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath)
  } else if (game.file_path) {
    res.sendFile(game.file_path)
  } else {
    res.status(404).send('游戏文件不存在')
  }
})

// 增加播放次数
router.post('/:id/play-count', (req, res) => {
  db.prepare('UPDATE games SET play_count = play_count + 1 WHERE id = ?').run(req.params.id)
  res.json({ code: 0 })
})

// 点赞/取消点赞
router.post('/:id/like', (req, res) => {
  const userId = req.headers['x-user-id'] || 'anonymous'
  const existing = db.prepare('SELECT id FROM game_likes WHERE user_id = ? AND game_id = ?').get(userId, req.params.id)

  if (existing) {
    db.prepare('DELETE FROM game_likes WHERE id = ?').run(existing.id)
    db.prepare('UPDATE games SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(req.params.id)
    res.json({ code: 0, data: { liked: false } })
  } else {
    db.prepare('INSERT INTO game_likes (id, user_id, game_id) VALUES (?, ?, ?)').run(uuidv4(), userId, req.params.id)
    db.prepare('UPDATE games SET like_count = like_count + 1 WHERE id = ?').run(req.params.id)
    res.json({ code: 0, data: { liked: true } })
  }
})

// 评论
router.post('/:id/comments', (req, res) => {
  const { content } = req.body
  const userId = req.headers['x-user-id'] || 'anonymous'
  const userName = req.headers['x-user-name'] || '匿名用户'

  if (!content) return res.status(400).json({ code: 400, message: '评论内容不能为空' })

  db.prepare('INSERT INTO game_comments (id, game_id, user_id, user_name, content) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), req.params.id, userId, userName, content)

  res.json({ code: 0, message: '评论成功' })
})

// 上传游戏（共创）
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    const { kpId, title, description, tags } = req.body
    const authorId = req.headers['x-user-id'] || 'anonymous'
    const authorName = req.headers['x-user-name'] || '匿名老师'

    if (!kpId || !title) {
      return res.status(400).json({ code: 400, message: '缺少必要参数' })
    }

    // 验证知识点存在
    const kp = db.prepare('SELECT id FROM knowledge_points WHERE id = ?').get(kpId)
    if (!kp) return res.status(404).json({ code: 404, message: '知识点不存在' })

    const gameId = req.body.gameId || uuidv4()
    const filePath = path.join(__dirname, '../uploads/games', gameId, 'index.html')

    // 如果上传的是zip，需要解压（简化处理，这里假设直接上传HTML）
    const gamePath = `/games/${gameId}/index.html`

    db.prepare(`
      INSERT INTO games (id, kp_id, title, description, game_type, file_path, author_id, author_name, is_default, tags, status)
      VALUES (?, ?, ?, ?, 'html5', ?, ?, ?, 0, ?, 'published')
    `).run(gameId, kpId, title, description || '', gamePath, authorId, authorName, JSON.stringify(tags ? tags.split(',') : []))

    res.json({ code: 0, data: { id: gameId, message: '上传成功' } })
  } catch (e) {
    res.status(500).json({ code: 500, message: '上传失败: ' + e.message })
  }
})

// 获取热门游戏
router.get('/hot/list', (req, res) => {
  const games = db.prepare(`
    SELECT g.*, u.name as author_name, kp.name as kp_name
    FROM games g
    LEFT JOIN users u ON g.author_id = u.id
    LEFT JOIN knowledge_points kp ON g.kp_id = kp.id
    WHERE g.status = 'published'
    ORDER BY g.play_count DESC LIMIT 10
  `).all()
  games.forEach(g => { g.tags = JSON.parse(g.tags || '[]') })
  res.json({ code: 0, data: games })
})

module.exports = router
