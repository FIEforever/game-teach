/**
 * 学校/班级/学生 API
 */
const express = require('express')
const router = express.Router()
const db = require('../models/database')

// 获取所有年级（用于学生选择）
router.get('/grades', (req, res) => {
  const grades = db.prepare('SELECT id, name, sort_order FROM grades WHERE sort_order BETWEEN 1 AND 6 ORDER BY sort_order').all()
  res.json({ code: 0, data: grades })
})

// 获取某年级下的班级列表
router.get('/classes', (req, res) => {
  const { gradeId } = req.query
  let classes
  if (gradeId) {
    classes = db.prepare(`
      SELECT c.*, COUNT(s.id) as student_count
      FROM school_classes c
      LEFT JOIN school_students s ON s.class_id = c.id
      WHERE c.grade_id = ?
      GROUP BY c.id ORDER BY c.sort_order
    `).all(gradeId)
  } else {
    classes = db.prepare(`
      SELECT c.*, COUNT(s.id) as student_count
      FROM school_classes c
      LEFT JOIN school_students s ON s.class_id = c.id
      GROUP BY c.id ORDER BY c.grade_id, c.sort_order
    `).all()
  }
  res.json({ code: 0, data: classes })
})

// 获取某班级下的学生列表
router.get('/students', (req, res) => {
  const { classId } = req.query
  if (!classId) return res.json({ code: 1, message: '缺少 classId 参数' })
  const students = db.prepare('SELECT * FROM school_students WHERE class_id = ? ORDER BY student_no').all(classId)
  res.json({ code: 0, data: students })
})

// 按ID获取学生信息
router.get('/student/:id', (req, res) => {
  const student = db.prepare('SELECT s.*, c.class_name, c.grade_name FROM school_students s JOIN school_classes c ON s.class_id = c.id WHERE s.id = ?').get(req.params.id)
  if (!student) return res.json({ code: 1, message: '学生不存在' })
  res.json({ code: 0, data: student })
})

// 记录游戏成绩（增强版：支持 totalQuestions 和 correctCount）
router.post('/play-record', (req, res) => {
  const { studentId, gameId, score, totalQuestions, correctCount } = req.body
  if (!studentId || !gameId) return res.json({ code: 1, message: '缺少参数' })

  const existing = db.prepare('SELECT * FROM game_play_records WHERE student_id = ? AND game_id = ?').get(studentId, gameId)

  if (existing) {
    const maxScore = Math.max(existing.max_score, score || 0)
    db.prepare('UPDATE game_play_records SET score = ?, max_score = ?, play_count = play_count + 1, last_played = datetime("now","localtime"), total_questions = ?, correct_count = ? WHERE id = ?')
      .run(score || 0, maxScore, totalQuestions || existing.total_questions, correctCount !== undefined ? correctCount : existing.correct_count, existing.id)
  } else {
    db.prepare('INSERT INTO game_play_records (id, student_id, game_id, score, max_score, play_count, last_played, total_questions, correct_count) VALUES (?, ?, ?, ?, ?, 1, datetime("now","localtime"), ?, ?)')
      .run(`rec-${studentId}-${gameId}`, studentId, gameId, score || 0, score || 0, totalQuestions || null, correctCount || null)
  }

  res.json({ code: 0, message: '记录成功' })
})

// 获取学生的游戏记录
router.get('/play-records/:studentId', (req, res) => {
  const records = db.prepare(`
    SELECT r.*, g.title as game_title, g.kp_id
    FROM game_play_records r
    JOIN games g ON r.game_id = g.id
    WHERE r.student_id = ?
    ORDER BY r.last_played DESC
  `).all(req.params.studentId)
  res.json({ code: 0, data: records })
})

// ==================== 新增端点 ====================

// GET /api/school/class-stats/:classId - 班级概览统计
router.get('/class-stats/:classId', (req, res) => {
  const { classId } = req.params

  // 验证班级是否存在
  const classInfo = db.prepare('SELECT * FROM school_classes WHERE id = ?').get(classId)
  if (!classInfo) return res.json({ code: 1, message: '班级不存在' })

  // 总学生数
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM school_students WHERE class_id = ?').get(classId).count

  // 该班级所有游戏记录
  const playRecords = db.prepare(`
    SELECT r.*, g.kp_id, g.title as game_title
    FROM game_play_records r
    JOIN school_students s ON r.student_id = s.id
    JOIN games g ON r.game_id = g.id
    WHERE s.class_id = ?
  `).all(classId)

  // 总游戏次数
  const totalPlays = playRecords.reduce((sum, r) => sum + r.play_count, 0)

  // 平均分
  const avgScore = playRecords.length > 0
    ? Math.round(playRecords.reduce((sum, r) => sum + r.max_score, 0) / playRecords.length * 10) / 10
    : 0

  // 按知识点统计
  const kpRecords = db.prepare(`
    SELECT kp.id as kpId, kp.name as kpName,
      COUNT(DISTINCT r.student_id) as studentCount,
      SUM(r.play_count) as playCount,
      ROUND(AVG(r.max_score), 1) as avgScore,
      MAX(r.max_score) as maxScore
    FROM game_play_records r
    JOIN school_students s ON r.student_id = s.id
    JOIN games g ON r.game_id = g.id
    JOIN knowledge_points kp ON g.kp_id = kp.id
    WHERE s.class_id = ?
    GROUP BY kp.id, kp.name
    ORDER BY playCount DESC
  `).all(classId)

  res.json({
    code: 0,
    data: {
      totalStudents,
      totalPlays,
      avgScore,
      kpStats: kpRecords
    }
  })
})

// GET /api/school/kp-students/:kpId?classId=xxx - 知识点学生统计
router.get('/kp-students/:kpId', (req, res) => {
  const { kpId } = req.params
  const { classId } = req.query

  // 验证知识点是否存在
  const kpInfo = db.prepare(`
    SELECT kp.*, u.name as unit_name
    FROM knowledge_points kp
    LEFT JOIN units u ON kp.unit_id = u.id
    WHERE kp.id = ?
  `).get(kpId)
  if (!kpInfo) return res.json({ code: 1, message: '知识点不存在' })

  // 获取该知识点下所有游戏ID
  const gameIds = db.prepare('SELECT id FROM games WHERE kp_id = ?').all(kpId).map(g => g.id)
  if (gameIds.length === 0) {
    return res.json({
      code: 0,
      data: {
        kpInfo: { kpId: kpInfo.id, kpName: kpInfo.name, unitName: kpInfo.unit_name },
        classAvg: 0,
        students: []
      }
    })
  }

  const placeholders = gameIds.map(() => '?').join(',')

  // 获取学生数据
  let students
  if (classId) {
    // 指定班级：列出该班级所有学生，包含其在此知识点下的成绩
    students = db.prepare(`
      SELECT s.id as studentId, s.name, s.avatar_color, s.student_no,
        COALESCE(MAX(r.max_score), 0) as bestScore,
        COALESCE(SUM(r.play_count), 0) as playCount,
        MAX(r.last_played) as lastPlayed
      FROM school_students s
      LEFT JOIN game_play_records r ON s.id = r.student_id AND r.game_id IN (${placeholders})
      WHERE s.class_id = ?
      GROUP BY s.id, s.name, s.avatar_color, s.student_no
      ORDER BY bestScore DESC, s.student_no
    `).all(...gameIds, classId)
  } else {
    // 未指定班级：列出所有有游戏记录的学生
    students = db.prepare(`
      SELECT s.id as studentId, s.name, s.avatar_color, s.student_no,
        MAX(r.max_score) as bestScore,
        SUM(r.play_count) as playCount,
        MAX(r.last_played) as lastPlayed
      FROM game_play_records r
      JOIN school_students s ON r.student_id = s.id
      WHERE r.game_id IN (${placeholders})
      GROUP BY s.id, s.name, s.avatar_color, s.student_no
      ORDER BY bestScore DESC, s.student_no
    `).all(...gameIds)
  }

  // 计算班级平均分（只统计有记录的学生）
  const scoredStudents = students.filter(s => s.playCount > 0)
  const classAvg = scoredStudents.length > 0
    ? Math.round(scoredStudents.reduce((sum, s) => sum + s.bestScore, 0) / scoredStudents.length * 10) / 10
    : 0

  res.json({
    code: 0,
    data: {
      kpInfo: { kpId: kpInfo.id, kpName: kpInfo.name, unitName: kpInfo.unit_name },
      classAvg,
      students
    }
  })
})

// GET /api/school/student-dashboard/:studentId - 学生个人仪表盘
router.get('/student-dashboard/:studentId', (req, res) => {
  const { studentId } = req.params

  // 学生基本信息
  const student = db.prepare(`
    SELECT s.id, s.name, s.gender, s.student_no, s.avatar_color,
      c.id as class_id, c.class_name, c.grade_name
    FROM school_students s
    JOIN school_classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).get(studentId)
  if (!student) return res.json({ code: 1, message: '学生不存在' })

  // 所有游戏记录
  const records = db.prepare(`
    SELECT r.*, g.title as game_title, g.kp_id
    FROM game_play_records r
    JOIN games g ON r.game_id = g.id
    WHERE r.student_id = ?
    ORDER BY r.last_played DESC
  `).all(studentId)

  // 总体统计
  const totalPlays = records.reduce((sum, r) => sum + r.play_count, 0)
  const avgScore = records.length > 0
    ? Math.round(records.reduce((sum, r) => sum + r.max_score, 0) / records.length * 10) / 10
    : 0

  // 按知识点分组
  const kpBreakdown = db.prepare(`
    SELECT kp.id as kpId, kp.name as kpName, u.name as unitName,
      g.id as gameId, g.title as gameTitle,
      r.max_score as bestScore, r.play_count as playCount, r.last_played as lastPlayed
    FROM game_play_records r
    JOIN games g ON r.game_id = g.id
    JOIN knowledge_points kp ON g.kp_id = kp.id
    LEFT JOIN units u ON kp.unit_id = u.id
    WHERE r.student_id = ?
    ORDER BY u.sort_order, kp.sort_order, g.title
  `).all(studentId)

  // 聚合知识点数据
  const kpMap = new Map()
  for (const row of kpBreakdown) {
    if (!kpMap.has(row.kpId)) {
      kpMap.set(row.kpId, {
        kpId: row.kpId,
        kpName: row.kpName,
        unitName: row.unitName,
        games: [],
        scores: []
      })
    }
    const kp = kpMap.get(row.kpId)
    kp.games.push({
      gameId: row.gameId,
      title: row.gameTitle,
      bestScore: row.bestScore,
      playCount: row.playCount,
      lastPlayed: row.lastPlayed
    })
    kp.scores.push(row.bestScore)
  }

  const kpList = Array.from(kpMap.values()).map(kp => {
    const avg = kp.scores.length > 0
      ? Math.round(kp.scores.reduce((a, b) => a + b, 0) / kp.scores.length * 10) / 10
      : 0
    return {
      kpId: kp.kpId,
      kpName: kp.kpName,
      unitName: kp.unitName,
      games: kp.games,
      avgScore: avg
    }
  })

  // 掌握分析
  const masteredKP = kpList.filter(kp => kp.avgScore >= 80).map(kp => ({ kpId: kp.kpId, kpName: kp.kpName, avgScore: kp.avgScore }))
  const needPracticeKP = kpList.filter(kp => kp.avgScore < 60).map(kp => ({ kpId: kp.kpId, kpName: kp.kpName, avgScore: kp.avgScore }))

  res.json({
    code: 0,
    data: {
      student: {
        id: student.id,
        name: student.name,
        gender: student.gender,
        student_no: student.student_no,
        avatar_color: student.avatar_color,
        class_name: student.class_name,
        grade_name: student.grade_name
      },
      stats: {
        totalPlays,
        avgScore,
        masteredKP,
        needPracticeKP
      },
      kpBreakdown: kpList
    }
  })
})

// GET /api/school/class-dashboard/:classId - 班级仪表盘（教师视图）
router.get('/class-dashboard/:classId', (req, res) => {
  const { classId } = req.params

  // 验证班级是否存在
  const classInfo = db.prepare('SELECT * FROM school_classes WHERE id = ?').get(classId)
  if (!classInfo) return res.json({ code: 1, message: '班级不存在' })

  // 总学生数
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM school_students WHERE class_id = ?').get(classId).count

  // 按知识点分析
  const kpAnalysis = db.prepare(`
    SELECT kp.id as kpId, kp.name as kpName, u.name as unitName,
      COUNT(DISTINCT r.student_id) as studentCount,
      SUM(r.play_count) as totalPlays,
      ROUND(AVG(r.max_score), 1) as avgScore,
      MIN(r.max_score) as minScore,
      MAX(r.max_score) as maxScore
    FROM game_play_records r
    JOIN school_students s ON r.student_id = s.id
    JOIN games g ON r.game_id = g.id
    JOIN knowledge_points kp ON g.kp_id = kp.id
    LEFT JOIN units u ON kp.unit_id = u.id
    WHERE s.class_id = ?
    GROUP BY kp.id, kp.name, u.name
    ORDER BY u.sort_order, kp.sort_order
  `).all(classId)

  // 为每个知识点计算分数分布
  const kpAnalysisWithDist = kpAnalysis.map(kp => {
    // 获取该知识点下每个学生的最高分
    const scoreRecords = db.prepare(`
      SELECT MAX(r.max_score) as bestScore
      FROM game_play_records r
      JOIN school_students s ON r.student_id = s.id
      JOIN games g ON r.game_id = g.id
      WHERE s.class_id = ? AND g.kp_id = ?
      GROUP BY r.student_id
    `).all(classId, kp.kpId)

    const scores = scoreRecords.map(r => r.bestScore)
    const distribution = {
      excellent: scores.filter(s => s >= 90).length,  // 优秀
      good: scores.filter(s => s >= 80 && s < 90).length,  // 良好
      average: scores.filter(s => s >= 60 && s < 80).length,  // 及格
      poor: scores.filter(s => s < 60).length  // 不及格
    }

    return {
      ...kp,
      distribution
    }
  })

  // 按学生汇总
  const studentSummary = db.prepare(`
    SELECT s.id as studentId, s.name, s.student_no, s.avatar_color,
      COUNT(r.id) as gameCount,
      SUM(r.play_count) as totalPlays,
      ROUND(AVG(r.max_score), 1) as avgScore,
      MAX(r.max_score) as bestScore
    FROM school_students s
    LEFT JOIN game_play_records r ON s.id = r.student_id
    WHERE s.class_id = ?
    GROUP BY s.id, s.name, s.student_no, s.avatar_color
    ORDER BY avgScore DESC
  `).all(classId)

  // 薄弱知识点（班级平均分 < 60）
  const weakKPs = kpAnalysisWithDist
    .filter(kp => kp.avgScore < 60)
    .map(kp => ({ kpId: kp.kpId, kpName: kp.kpName, unitName: kp.unitName, avgScore: kp.avgScore, studentCount: kp.studentCount }))

  // 优势知识点（班级平均分 >= 80）
  const strongKPs = kpAnalysisWithDist
    .filter(kp => kp.avgScore >= 80)
    .map(kp => ({ kpId: kp.kpId, kpName: kp.kpName, unitName: kp.unitName, avgScore: kp.avgScore, studentCount: kp.studentCount }))

  res.json({
    code: 0,
    data: {
      classInfo: {
        id: classInfo.id,
        gradeName: classInfo.grade_name,
        className: classInfo.class_name
      },
      totalStudents,
      kpAnalysis: kpAnalysisWithDist,
      studentSummary,
      weakKPs,
      strongKPs
    }
  })
})

module.exports = router
