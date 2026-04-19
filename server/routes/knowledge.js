const express = require('express')
const router = express.Router()
const db = require('../models/database')

// 获取完整知识点树（按年级→学期→单元→知识点）
router.get('/tree', (req, res) => {
  const { gradeId, semesterId, subjectId } = req.query

  let where = 'WHERE 1=1'
  const params = []
  if (gradeId) { where += ' AND g.id = ?'; params.push(gradeId) }
  if (semesterId) { where += ' AND s.id = ?'; params.push(semesterId) }
  if (subjectId) { where += ' AND u.subject_id = ?'; params.push(subjectId) }

  const tree = db.prepare(`
    SELECT
      g.id as grade_id, g.name as grade_name,
      s.id as semester_id, s.name as semester_name,
      u.id as unit_id, u.name as unit_name,
      sub.id as subject_id, sub.name as subject_name,
      kp.id as kp_id, kp.name as kp_name, kp.description as kp_desc,
      kp.difficulty, kp.sort_order as kp_order,
      (SELECT COUNT(*) FROM games WHERE kp_id = kp.id AND status='published') as game_count
    FROM grades g
    JOIN semesters s ON s.grade_id = g.id
    JOIN units u ON u.semester_id = s.id
    JOIN subjects sub ON sub.id = u.subject_id
    JOIN knowledge_points kp ON kp.unit_id = u.id
    ${where}
    ORDER BY g.sort_order, s.sort_order, u.sort_order, kp.sort_order
  `).all(...params)

  // 构建树形结构
  const result = {}
  tree.forEach(row => {
    const gKey = row.grade_id
    const sKey = row.semester_id
    const uKey = row.unit_id

    if (!result[gKey]) result[gKey] = { id: gKey, name: row.grade_name, semesters: {} }
    if (!result[gKey].semesters[sKey]) result[gKey].semesters[sKey] = { id: sKey, name: row.semester_name, units: {} }
    if (!result[gKey].semesters[sKey].units[uKey]) result[gKey].semesters[sKey].units[uKey] = { id: uKey, name: row.unit_name, subject: row.subject_name, points: [] }

    result[gKey].semesters[sKey].units[uKey].points.push({
      id: row.kp_id, name: row.kp_name, description: row.kp_desc,
      difficulty: row.difficulty, gameCount: row.game_count
    })
  })

  res.json({ code: 0, data: result })
})

// 获取某个知识点的详情
router.get('/point/:id', (req, res) => {
  const point = db.prepare(`
    SELECT kp.*, u.name as unit_name, s.name as semester_name, g.name as grade_name, sub.name as subject_name
    FROM knowledge_points kp
    JOIN units u ON kp.unit_id = u.id
    JOIN semesters s ON u.semester_id = s.id
    JOIN grades g ON s.grade_id = g.id
    JOIN subjects sub ON u.subject_id = sub.id
    WHERE kp.id = ?
  `).get(req.params.id)

  if (!point) return res.status(404).json({ code: 404, message: '知识点不存在' })
  res.json({ code: 0, data: point })
})

// 获取年级列表
router.get('/grades', (req, res) => {
  const grades = db.prepare('SELECT * FROM grades ORDER BY sort_order').all()
  res.json({ code: 0, data: grades })
})

// 获取学期列表
router.get('/semesters', (req, res) => {
  const { gradeId } = req.query
  const semesters = db.prepare('SELECT * FROM semesters WHERE grade_id = ? ORDER BY sort_order').all(gradeId)
  res.json({ code: 0, data: semesters })
})

// 获取单元列表
router.get('/units', (req, res) => {
  const { semesterId, subjectId } = req.query
  let sql = 'SELECT u.*, s.name as subject_name FROM units u JOIN subjects s ON u.subject_id = s.id WHERE u.semester_id = ?'
  const params = [semesterId]
  if (subjectId) { sql += ' AND u.subject_id = ?'; params.push(subjectId) }
  const units = db.prepare(sql + ' ORDER BY u.sort_order').all(...params)
  res.json({ code: 0, data: units })
})

// 搜索知识点
router.get('/search', (req, res) => {
  const { keyword } = req.query
  if (!keyword) return res.json({ code: 0, data: [] })
  const points = db.prepare(`
    SELECT kp.*, u.name as unit_name, g.name as grade_name, s.name as semester_name,
      (SELECT COUNT(*) FROM games WHERE kp_id = kp.id AND status='published') as game_count
    FROM knowledge_points kp
    JOIN units u ON kp.unit_id = u.id
    JOIN semesters s ON u.semester_id = s.id
    JOIN grades g ON s.grade_id = g.id
    WHERE kp.name LIKE ? OR kp.description LIKE ?
    LIMIT 20
  `).all(`%${keyword}%`, `%${keyword}%`)
  res.json({ code: 0, data: points })
})

module.exports = router
