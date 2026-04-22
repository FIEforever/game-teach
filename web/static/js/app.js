// ========== 路由系统 ==========
let currentPage = 'home'
let currentUser = JSON.parse(localStorage.getItem('user') || 'null')
let currentStudent = JSON.parse(localStorage.getItem('student') || 'null')
let pendingGameId = null // 等待学生选择后要打开的游戏
let currentClassId = null // 当前选中的班级ID（用于学生选择页）

// 恢复学生信息到导航栏
function restoreStudentNav() {
  const navStudent = document.getElementById('nav-student')
  if (currentStudent && navStudent) {
    navStudent.style.display = 'flex'
    document.getElementById('nav-student-name').textContent = currentStudent.name
    document.getElementById('nav-student-class').textContent = currentStudent.grade_name + currentStudent.class_name
    const avatar = document.getElementById('nav-student-avatar')
    avatar.style.background = currentStudent.avatar_color || '#6C5CE7'
    avatar.textContent = currentStudent.name.charAt(0)
  }
}

function navigate(page, params = {}) {
  currentPage = page
  window._params = params
  renderPage()
  window.scrollTo(0, 0)
  // 更新导航高亮
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page)
  })
}

async function renderPage() {
  const app = document.getElementById('app')
  try {
    let html = ''
    switch (currentPage) {
      case 'home': html = await renderHome(); break
      case 'students': html = await renderStudentsPage(); break
      case 'knowledge': html = await renderKnowledge(); break
      case 'game': html = await renderGameDetail(); break
      case 'student': html = await renderStudentDashboard(); break
      case 'prompts': html = await renderPrompts(); break
      case 'create': html = renderCreate(); break
      default: html = await renderHome()
    }
    app.innerHTML = html
  } catch (e) {
    console.error('页面渲染错误:', e)
    app.innerHTML = `<div class="empty-state" style="padding:60px"><div style="font-size:48px;margin-bottom:16px"><span class="icon-box warning" style="width:48px;height:48px"></span></div><div style="font-size:18px;color:#ff7675;margin-bottom:8px">页面加载失败</div><div style="font-size:14px;color:#999">${e.message}</div><button class="btn btn-primary" style="margin-top:24px" onclick="renderPage()">重新加载</button></div>`
  }
}

// ========== 首页（班级选择） ==========
async function renderHome() {
  const allClasses = await getAllClasses()

  // 按年级分组
  const gradeMap = {}
  allClasses.forEach(c => {
    const gradeName = c.grade_name || '未分类'
    if (!gradeMap[gradeName]) gradeMap[gradeName] = []
    gradeMap[gradeName].push(c)
  })

  const gradeIcons = { '一年级': '<span class="icon-circle green">1</span>', '二年级': '<span class="icon-circle green">2</span>', '三年级': '<span class="icon-circle green">3</span>', '四年级': '<span class="icon-circle blue">4</span>', '五年级': '<span class="icon-circle purple">5</span>', '六年级': '<span class="icon-circle purple">6</span>' }

  let classCardsHtml = ''
  for (const [gradeName, classes] of Object.entries(gradeMap)) {
    classCardsHtml += `
      <div class="grade-section-title">${gradeIcons[gradeName] || '<span class="icon-circle gray">K</span>'} ${gradeName}</div>
      <div class="class-select-grid fade-in">
        ${classes.map(c => `
          <div class="class-select-card" onclick="navigate('students', { classId: '${c.id}', className: '${c.grade_name || ''}${c.class_name || ''}', gradeName: '${c.grade_name || ''}' })">
            <div class="class-select-icon"></div>
            <div class="class-select-name">${c.grade_name || ''}${c.class_name || ''}</div>
            <div class="class-select-meta">${c.student_count || 0} 名学生</div>
          </div>
        `).join('')}
      </div>
    `
  }

  return `
    <div class="hero fade-in">
      <h1><span class="icon-box game hero-icon"></span> 让每个知识点都变成好玩的游戏</h1>
      <p>覆盖小学各年级各学科知识点，每个知识点都有配套教学小游戏。选择班级，开始你的学习之旅。</p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" onclick="window.scrollTo({top: document.querySelector('.grade-section-title')?.offsetTop - 80, behavior: 'smooth'})">选择班级开始学习</button>
      </div>
    </div>

    <div class="section-title fade-in" style="margin-top:8px"><span class="icon-box school"></span> 选择班级</div>
    ${classCardsHtml || '<div class="empty-state"><div class="icon"><span class="icon-box school"></span></div><div class="text">暂无班级数据</div></div>'}
  `
}

// ========== 学生选择页 ==========
let pageStudents = []

async function renderStudentsPage() {
  const { classId, className, gradeName } = window._params || {}
  if (!classId) return '<div class="empty-state"><div class="icon"><span class="icon-box school"></span></div><div class="text">请先选择一个班级</div><button class="btn btn-primary" style="margin-top:16px" onclick="navigate(\'home\')">← 返回首页</button></div>'

  currentClassId = classId
  pageStudents = await getSchoolStudents(classId)

  return `
    <div class="fade-in">
      <div style="margin-bottom:32px">
        <button class="btn btn-sm btn-outline" onclick="navigate('home')" style="margin-bottom:16px">← 返回选择班级</button>
        <h2 style="font-size:28px;font-weight:800">${className || '班级'} - 选择学生</h2>
        <p style="color:var(--text-light);margin-top:8px">共 ${pageStudents.length} 名学生</p>
      </div>

      <div class="search-bar fade-in">
        <input class="search-input" placeholder="🔍 搜索学生姓名..." id="page-student-search" oninput="filterPageStudents(this.value)" />
      </div>

      <div class="students-page-grid" id="page-student-grid">
        ${renderPageStudentGrid(pageStudents)}
      </div>
    </div>
  `
}

function renderPageStudentGrid(students) {
  return students.map(s => `
    <div class="student-card" onclick="confirmPageStudent('${s.id}', '${s.name}', '${s.gender || ''}', '${s.avatar_color || ''}', '${s.student_no || ''}')">
      <div class="student-avatar" style="background:${s.avatar_color || '#6C5CE7'}">${s.name.charAt(0)}</div>
      <div class="student-name">${s.name}</div>
      <div class="student-no">${s.student_no || ''}号</div>
    </div>
  `).join('')
}

function filterPageStudents(keyword) {
  if (!keyword.trim()) {
    document.getElementById('page-student-grid').innerHTML = renderPageStudentGrid(pageStudents)
    return
  }
  const filtered = pageStudents.filter(s => s.name.includes(keyword))
  document.getElementById('page-student-grid').innerHTML = renderPageStudentGrid(filtered)
}

function confirmPageStudent(id, name, gender, avatarColor, studentNo) {
  const { className, gradeName } = window._params || {}
  currentStudent = {
    id, name, gender,
    avatar_color: avatarColor,
    student_no: studentNo,
    grade_name: gradeName || '',
    class_name: (className || '').replace(gradeName || '', ''),
    class_id: currentClassId
  }
  localStorage.setItem('student', JSON.stringify(currentStudent))
  restoreStudentNav()
  navigate('knowledge')
}

// ========== 知识点浏览页（增强版） ==========
let selectedUnit = null
let knowledgeTree = null
let classKPStats = null // 班级知识点统计

async function renderKnowledge() {
  knowledgeTree = knowledgeTree || await getKnowledgeTree({})
  const grades = Object.values(knowledgeTree)

  if (grades.length === 0) {
    return '<div class="empty-state"><div class="icon"><span class="icon-box books"></span></div><div class="text">暂无知识点数据</div></div>'
  }

  // 加载班级统计（如果有选中学生）
  if (currentStudent && currentStudent.class_id) {
    try {
      classKPStats = await getClassDashboard(currentStudent.class_id)
    } catch (e) {
      classKPStats = null
    }
  }

  // 默认选第一个年级第一个学期第一个单元
  const firstGrade = grades[0]
  const firstSem = Object.values(firstGrade.semesters)[0]
  const firstUnit = Object.values(firstSem.units)[0]

  if (!selectedUnit) selectedUnit = firstUnit

  const semesters = Object.values(firstGrade.semesters)
  const units = semesters.flatMap(s => Object.values(s.units))

  // 班级分析按钮
  const analyticsBtn = (currentStudent && currentStudent.class_id)
    ? `<button class="btn btn-accent btn-sm" onclick="openAnalyticsModal()"><span class="icon-box chart"></span> 班级分析</button>`
    : ''

  return `
    <div class="kp-page-header fade-in">
      <div class="search-bar" style="margin-bottom:0;flex:1">
        <input class="search-input" placeholder="🔍 搜索知识点..." id="kp-search" oninput="handleSearch(this.value)" />
      </div>
      ${analyticsBtn}
    </div>
    <div id="search-results"></div>
    <div id="kp-content" class="kp-tree fade-in">
      <div class="kp-sidebar">
        <div style="font-size:13px;color:var(--text-lighter);padding:8px 16px;font-weight:600;">单元列表</div>
        ${units.map(u => `
          <div class="kp-sidebar-item ${selectedUnit?.id === u.id ? 'active' : ''}"
            onclick="selectUnit('${u.id}')">
            ${u.name} <span style="float:right;font-size:12px;opacity:0.7">${u.points.length}个知识点</span>
          </div>
        `).join('')}
      </div>
      <div class="kp-main" id="kp-main">
        ${renderUnitContent(selectedUnit)}
      </div>
    </div>
  `
}

function getKPStat(kpId) {
  if (!classKPStats || !classKPStats.kpAnalysis) return null
  return classKPStats.kpAnalysis.find(s => s.kpId === kpId) || null
}

function renderUnitContent(unit) {
  if (!unit) return '<div class="empty-state"><div class="icon"><span class="icon-box search"></span></div><div class="text">请选择一个单元</div></div>'
  return `
    <div style="margin-bottom:24px">
      <h2 style="font-size:22px;font-weight:700">${unit.name}</h2>
      <p style="color:var(--text-light);font-size:14px;margin-top:4px">${unit.subject} · 共${unit.points.length}个知识点</p>
    </div>
    ${unit.points.map(p => {
      const stat = getKPStat(p.id)
      let classInfoHtml = ''
      if (stat) {
        const playedCount = stat.studentCount || 0
        const totalCount = stat.totalStudents || 0
        const progress = totalCount > 0 ? Math.round(playedCount / totalCount * 100) : 0
        const avgScore = stat.avgScore
        let avgBadge = ''
        if (avgScore !== null && avgScore !== undefined) {
          const cls = avgScore >= 80 ? 'score-good' : avgScore >= 60 ? 'score-mid' : 'score-low'
          avgBadge = `<span class="kp-class-avg ${cls}">均分${avgScore}</span>`
        }
        classInfoHtml = `
          <div class="kp-class-progress">
            <div class="progress-bar-mini"><div class="progress-fill" style="width:${progress}%"></div></div>
            <span class="progress-text">${playedCount}/${totalCount}人已玩</span>
            ${avgBadge}
          </div>
        `
      }
      return `
        <div class="card-flat kp-point-card" onclick="navigate('game', { kpId: '${p.id}', kpName: '${p.name}' })">
          <div class="kp-point-icon">${getKPIcon(p.name)}</div>
          <div class="kp-point-info">
            <div class="kp-point-name">${p.name}</div>
            <div class="kp-point-desc">${p.description || ''}</div>
            <div class="kp-point-meta">
              <span class="tag ${p.difficulty === 'easy' ? 'tag-green' : p.difficulty === 'hard' ? 'tag-red' : 'tag-orange'}">
                ${p.difficulty === 'easy' ? '基础' : p.difficulty === 'hard' ? '提高' : '进阶'}
              </span>
            </div>
            ${classInfoHtml}
          </div>
          <div class="kp-game-count">${p.gameCount}个游戏 ›</div>
        </div>
      `
    }).join('')}
  `
}

function selectUnit(unitId) {
  // 从树中找到对应单元
  for (const grade of Object.values(knowledgeTree || {})) {
    for (const sem of Object.values(grade.semesters)) {
      for (const unit of Object.values(sem.units)) {
        if (unit.id === unitId) {
          selectedUnit = unit
          document.querySelectorAll('.kp-sidebar-item').forEach(el => el.classList.remove('active'))
          event.target.closest('.kp-sidebar-item')?.classList.add('active')
          document.getElementById('kp-main').innerHTML = renderUnitContent(unit)
          return
        }
      }
    }
  }
}

async function handleSearch(keyword) {
  const resultsDiv = document.getElementById('search-results')
  const contentDiv = document.getElementById('kp-content')
  if (!keyword.trim()) {
    resultsDiv.innerHTML = ''
    contentDiv.style.display = ''
    return
  }
  contentDiv.style.display = 'none'
  const results = await searchKnowledge(keyword)
  resultsDiv.innerHTML = results.length > 0
    ? results.map(p => {
      const stat = getKPStat(p.id)
      let classInfoHtml = ''
      if (stat) {
        const playedCount = stat.played_count || 0
        const totalCount = stat.total_students || 0
        const progress = totalCount > 0 ? Math.round(playedCount / totalCount * 100) : 0
        const avgScore = stat.avg_score
        let avgBadge = ''
        if (avgScore !== null && avgScore !== undefined) {
          const cls = avgScore >= 80 ? 'score-good' : avgScore >= 60 ? 'score-mid' : 'score-low'
          avgBadge = `<span class="kp-class-avg ${cls}">均分${avgScore}</span>`
        }
        classInfoHtml = `
          <div class="kp-class-progress">
            <div class="progress-bar-mini"><div class="progress-fill" style="width:${progress}%"></div></div>
            <span class="progress-text">${playedCount}/${totalCount}人已玩</span>
            ${avgBadge}
          </div>
        `
      }
      return `
        <div class="card-flat kp-point-card" onclick="navigate('game', { kpId: '${p.id}', kpName: '${p.name}' })">
          <div class="kp-point-icon">${getKPIcon(p.name)}</div>
          <div class="kp-point-info">
            <div class="kp-point-name">${p.name}</div>
            <div class="kp-point-desc">${p.description || ''} · ${p.grade_name} ${p.semester_name}</div>
            ${classInfoHtml}
          </div>
          <div class="kp-game-count">${p.gameCount}个游戏 ›</div>
        </div>
      `
    }).join('')
    : '<div class="empty-state"><div class="icon"><span class="icon-box search"></span></div><div class="text">未找到相关知识点</div></div>'
}

// ========== 游戏详情页（增强版） ==========
async function renderGameDetail() {
  const { kpId, kpName } = window._params || {}
  if (!kpId) return '<div class="empty-state"><div class="icon"><span class="icon-box game"></span></div><div class="text">请先选择一个知识点</div></div>'

  const [point, games] = await Promise.all([
    getKnowledgePoint(kpId),
    getGames({ kpId, sort: 'popular' })
  ])

  // 加载学生掌握情况（如果有选中学生）
  let masteryHtml = ''
  if (currentStudent && currentStudent.class_id) {
    try {
      const kpStudents = await getKPStudents(kpId, currentStudent.class_id)
      if (kpStudents && kpStudents.length > 0) {
        masteryHtml = `
          <div class="mastery-section fade-in">
            <div class="section-title"><span class="icon-box chart"></span> 学生掌握情况</div>
            <table class="mastery-table">
              <thead>
                <tr>
                  <th>学生</th>
                  <th>最佳成绩</th>
                  <th>游戏次数</th>
                </tr>
              </thead>
              <tbody>
                ${kpStudents.map(s => {
                  const score = s.bestScore || 0
                  const cls = score >= 80 ? 'score-good' : score >= 60 ? 'score-mid' : 'score-low'
                  return `
                    <tr>
                      <td>
                        <span style="display:inline-flex;align-items:center;gap:8px">
                          <span style="width:28px;height:28px;border-radius:50%;background:${s.avatar_color || '#6C5CE7'};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${s.name.charAt(0)}</span>
                          ${s.name}
                        </span>
                      </td>
                      <td><span class="score-badge ${cls}">${score}分</span></td>
                      <td>${s.playCount || 0}次</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        `
      }
    } catch (e) {
      // 静默失败
    }
  }

  return `
    <div class="fade-in">
      <div style="margin-bottom:32px">
        <button class="btn btn-sm btn-outline" onclick="navigate('knowledge')" style="margin-bottom:16px">← 返回知识点</button>
        <h2 style="font-size:28px;font-weight:800">${point.name}</h2>
        <p style="color:var(--text-light);margin-top:8px">${point.description || ''}</p>
        <div style="margin-top:12px;display:flex;gap:8px">
          <span class="tag tag-purple">${point.grade_name}</span>
          <span class="tag tag-blue">${point.semester_name}</span>
          <span class="tag tag-green">${point.subject_name}</span>
          <span class="tag ${point.difficulty === 'easy' ? 'tag-green' : point.difficulty === 'hard' ? 'tag-red' : 'tag-orange'}">
            ${point.difficulty === 'easy' ? '基础' : point.difficulty === 'hard' ? '提高' : '进阶'}
          </span>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div class="section-title" style="margin-bottom:0"><span class="icon-box game"></span> 教学游戏 (${games.length})</div>
        <button class="btn btn-accent btn-sm" onclick="navigate('create', { kpId: '${kpId}', kpName: '${kpName}' })">+ 上传游戏</button>
      </div>

      ${games.length > 0 ? `
        <div class="game-grid">
          ${games.map(g => renderGameCard(g)).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="icon"><span class="icon-box game"></span></div>
          <div class="text">该知识点暂无游戏，成为第一个创作者吧！</div>
          <button class="btn btn-primary" style="margin-top:16px" onclick="navigate('create', { kpId: '${kpId}', kpName: '${kpName}' })"><span class="icon-box tools"></span> 去创作工坊</button>
        </div>
      `}

      ${masteryHtml}
    </div>
  `
}

// ========== 学生仪表板页 ==========
async function renderStudentDashboard() {
  if (!currentStudent) {
    return '<div class="empty-state"><div class="icon"><span class="icon-box person"></span></div><div class="text">请先选择一个学生</div><button class="btn btn-primary" style="margin-top:16px" onclick="navigate(\'home\')">← 选择班级</button></div>'
  }

  let dashboard = null
  try {
    dashboard = await getStudentDashboard(currentStudent.id)
  } catch (e) {
    dashboard = null
  }

  const stats = dashboard?.stats || {}
  const totalGames = stats.totalPlays || 0
  const avgScore = stats.avgScore || 0
  const masteredKP = stats.masteredKP || 0
  const needPracticeKP = stats.needPracticeKP || 0
  const totalKP = dashboard?.kpBreakdown ? dashboard.kpBreakdown.length : 32
  const masteryRate = totalKP > 0 ? Math.round(masteredKP / totalKP * 100) : 0

  // 知识点进度网格
  let kpProgressHtml = ''
  if (dashboard && dashboard.kpBreakdown && dashboard.kpBreakdown.length > 0) {
    kpProgressHtml = dashboard.kpBreakdown.map(kp => {
      const score = kp.avgScore || 0
      let circleClass = 'not-started'
      let circleText = '-'
      if (score > 0) {
        if (score >= 80) { circleClass = 'mastered'; circleText = score; }
        else if (score >= 60) { circleClass = 'learning'; circleText = score; }
        else { circleClass = 'weak'; circleText = score; }
      }
      return `
        <div class="kp-progress-item" onclick="navigate('game', { kpId: '${kp.kpId}', kpName: '${kp.kpName || ''}' })">
          <div class="kp-progress-circle ${circleClass}">${circleText}</div>
          <div class="kp-progress-name">${kp.kpName || '知识点'}</div>
        </div>
      `
    }).join('')
  } else {
    kpProgressHtml = '<div class="empty-state"><div class="icon"><span class="icon-box chart"></span></div><div class="text">暂无学习数据，快去玩游戏吧！</div></div>'
  }

  // 最近游戏记录 - 从kpBreakdown中提取
  let historyHtml = ''
  if (dashboard && dashboard.kpBreakdown) {
    const allGames = []
    dashboard.kpBreakdown.forEach(kp => {
      if (kp.games) {
        kp.games.forEach(g => {
          allGames.push({ ...g, kpName: kp.kpName, unitName: kp.unitName })
        })
      }
    })
    allGames.sort((a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''))
    const recentGames = allGames.slice(0, 10)
    if (recentGames.length > 0) {
      historyHtml = recentGames.map(r => {
        const score = r.bestScore || r.score || 0
        const cls = score >= 80 ? 'score-good' : score >= 60 ? 'score-mid' : 'score-low'
        return `
          <li class="history-item">
            <div style="flex:1">
              <div class="history-game-name">${r.title || '游戏'}</div>
              <div class="history-kp-name">${r.kpName || ''}</div>
            </div>
            <span class="score-badge ${cls}">${score}分</span>
            <span class="history-time">${r.lastPlayed || ''}</span>
          </li>
        `
      }).join('')
    }
  }
  if (!historyHtml) {
    historyHtml = '<div class="empty-state"><div class="icon"><span class="icon-box game"></span></div><div class="text">暂无游戏记录</div></div>'
  }

  return `
    <div class="fade-in">
      <div class="student-dashboard-header">
        <div class="student-dashboard-avatar" style="background:${currentStudent.avatar_color || '#6C5CE7'}">${currentStudent.name.charAt(0)}</div>
        <div class="student-dashboard-info">
          <h2>${currentStudent.name}</h2>
          <p>${currentStudent.grade_name || ''}${currentStudent.class_name || ''} · ${currentStudent.student_no || ''}号</p>
        </div>
      </div>

      <div class="dashboard-stats">
        <div class="dashboard-stat-card">
          <div class="stat-value">${totalGames}</div>
          <div class="stat-name">游戏总数</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="stat-value">${avgScore}</div>
          <div class="stat-name">平均分数</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="stat-value">${masteryRate}%</div>
          <div class="stat-name">掌握率</div>
        </div>
      </div>

      <div class="section-title"><span class="icon-box chart"></span> 知识点进度</div>
      <div class="kp-progress-grid">
        ${kpProgressHtml}
      </div>

      <div class="section-title"><span class="icon-box game"></span> 最近游戏记录</div>
      <ul class="history-list">
        ${historyHtml}
      </ul>
    </div>
  `
}

// ========== 班级分析模态框 ==========
async function openAnalyticsModal() {
  if (!currentStudent || !currentStudent.class_id) return

  const modal = document.getElementById('analytics-modal')
  const body = document.getElementById('analytics-body')
  modal.style.display = 'block'
  body.innerHTML = '<div class="empty-state"><div class="icon"><span class="icon-box game"></span></div><div class="text">加载中...</div></div>'

  try {
    const data = await getClassDashboard(currentStudent.class_id)

    const totalStudents = data.totalStudents || 0
    const totalGames = data.studentSummary ? data.studentSummary.reduce((s, st) => s + (st.totalPlays || 0), 0) : 0
    const avgScore = data.kpAnalysis && data.kpAnalysis.length > 0
      ? Math.round(data.kpAnalysis.reduce((s, kp) => s + (kp.avgScore || 0), 0) / data.kpAnalysis.filter(kp => kp.avgScore > 0).length) || 0
      : 0

    // 概览
    let overviewHtml = `
      <div class="analytics-overview">
        <div class="overview-card">
          <div class="overview-value">${totalStudents}</div>
          <div class="overview-label">班级人数</div>
        </div>
        <div class="overview-card">
          <div class="overview-value">${totalGames}</div>
          <div class="overview-label">游戏总次数</div>
        </div>
        <div class="overview-card">
          <div class="overview-value">${avgScore}</div>
          <div class="overview-label">班级平均分</div>
        </div>
      </div>
    `

    // 柱状图
    let barChartHtml = ''
    const kpStats = data.kpAnalysis || []
    if (kpStats.length > 0) {
      barChartHtml = `
        <div class="bar-chart">
          <div class="bar-chart-title">各知识点平均分</div>
          ${kpStats.map(kp => {
            const score = kp.avgScore || 0
            const width = Math.max(score, 5) // 最小宽度保证可见
            const cls = score >= 80 ? 'bar-good' : score >= 60 ? 'bar-mid' : 'bar-low'
            return `
              <div class="bar-chart-row">
                <div class="bar-chart-label" title="${kp.kpName || ''}">${kp.kpName || '知识点'}</div>
                <div class="bar-chart-track">
                  <div class="bar-chart-fill ${cls}" style="width:${width}%">${score}</div>
                </div>
              </div>
            `
          }).join('')}
        </div>
      `
    }

    // 强弱知识点列表
    let strongWeakHtml = ''
    if (kpStats.length > 0) {
      const sorted = [...kpStats].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
      const strong = sorted.filter(kp => (kp.avgScore || 0) >= 80).slice(0, 5)
      const weak = sorted.filter(kp => (kp.avgScore || 0) > 0 && (kp.avgScore || 0) < 60).slice(0, 5)

      strongWeakHtml = '<div class="analytics-kp-list">'

      if (strong.length > 0) {
        strongWeakHtml += `
          <div class="kp-list-section">
            <div class="kp-list-title strong"><span class="icon-box check"></span> 掌握较好的知识点</div>
            ${strong.map(kp => `
              <div class="kp-list-item">
                <span>${kp.kpName || ''}</span>
                <span class="kp-list-score" style="color:var(--accent)">${kp.avgScore}分</span>
              </div>
            `).join('')}
          </div>
        `
      }

      if (weak.length > 0) {
        strongWeakHtml += `
          <div class="kp-list-section">
            <div class="kp-list-title weak"><span class="icon-box warning"></span> 需要加强的知识点</div>
            ${weak.map(kp => `
              <div class="kp-list-item">
                <span>${kp.kpName || ''}</span>
                <span class="kp-list-score" style="color:var(--danger)">${kp.avgScore}分</span>
              </div>
            `).join('')}
          </div>
        `
      }

      strongWeakHtml += '</div>'
    }

    body.innerHTML = overviewHtml + barChartHtml + strongWeakHtml
  } catch (e) {
    body.innerHTML = `<div class="empty-state"><div class="icon"><span class="icon-box warning"></span></div><div class="text">加载失败：${e.message}</div></div>`
  }
}

function closeAnalyticsModal() {
  document.getElementById('analytics-modal').style.display = 'none'
}

// ========== 创作工坊 ==========
async function renderPrompts() {
  const templates = await getTemplates()

  return `
    <div class="fade-in">
      <div style="margin-bottom:32px">
        <h2 style="font-size:28px;font-weight:800"><span class="icon-box tools"></span> 创作工坊</h2>
        <p style="color:var(--text-light);margin-top:8px">选择一个游戏模板，复制提示词到 SOLO 中生成自定义教学游戏，然后上传到对应知识点。</p>
      </div>

      <div style="background:linear-gradient(135deg,#E8FFF5,#E8F4FD);border-radius:var(--radius);padding:24px;margin-bottom:32px">
        <h3 style="font-size:18px;font-weight:700;margin-bottom:12px"><span class="icon-box idea"></span> 如何创建自定义游戏？</h3>
        <ol style="padding-left:20px;color:var(--text);line-height:2.2">
          <li><strong>选择模板</strong> — 从下方选择一个合适的游戏类型模板</li>
          <li><strong>复制提示词</strong> — 点击"复制提示词"按钮</li>
          <li><strong>用SOLO生成</strong> — 将提示词粘贴到 SOLO 中，替换方括号中的内容为你的题目</li>
          <li><strong>保存游戏</strong> — 将生成的HTML文件保存到本地</li>
          <li><strong>上传发布</strong> — 点击"上传游戏"，选择对应知识点并上传HTML文件</li>
        </ol>
      </div>

      <div class="section-title"><span class="icon-box game"></span> 游戏模板</div>
      <div class="template-grid">
        ${templates.map(t => renderTemplateCard(t)).join('')}
      </div>
    </div>
  `
}

function renderTemplateCard(tpl) {
  const iconClasses = { '选择题闯关': 'target', '拖拽配对': 'puzzle', '填空挑战': 'pencil', '记忆翻牌': 'cards', '数学速算': 'abacus', '拼图游戏': 'teddy' }
  const iconClass = iconClasses[tpl.name] || 'game'
  return `
    <div class="card template-card">
      <div class="template-card-header" style="background:linear-gradient(135deg, var(--primary), var(--primary-light))"><span class="icon-box ${iconClass}" style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.9)"></span></div>
      <div class="template-card-body">
        <div class="template-card-title">${tpl.name}</div>
        <div class="template-card-desc">${tpl.description}</div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <span class="tag tag-purple">${tpl.difficulty === 'easy' ? '简单' : tpl.difficulty === 'hard' ? '困难' : '中等'}</span>
          ${tpl.tags.map(tag => `<span class="tag tag-gray">${tag}</span>`).join('')}
        </div>
        <div class="prompt-box">
          <button class="copy-btn" onclick="copyPrompt(this, \`${escapeForAttr(tpl.prompt_template)}\`)"><span class="icon-box write" style="width:16px;height:16px;border-radius:4px"></span> 复制</button>${escapeHtml(tpl.prompt_template)}
        </div>
        ${tpl.example_prompt ? `
          <details style="margin-top:12px">
            <summary style="cursor:pointer;font-size:14px;color:var(--primary);font-weight:600"><span class="icon-box idea"></span> 查看示例提示词</summary>
            <div class="prompt-box" style="margin-top:8px">
              <button class="copy-btn" onclick="copyPrompt(this, \`${escapeForAttr(tpl.example_prompt)}\`)"><span class="icon-box write" style="width:16px;height:16px;border-radius:4px"></span> 复制</button>${escapeHtml(tpl.example_prompt)}
            </div>
          </details>
        ` : ''}
      </div>
    </div>
  `
}

function copyPrompt(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = '<span class="icon-box check"></span> 已复制'
    setTimeout(() => btn.innerHTML = '<span class="icon-box write" style="width:16px;height:16px;border-radius:4px"></span> 复制', 2000)
  })
}

// ========== 上传页面 ==========
function renderCreate() {
  const { kpId, kpName } = window._params || {}
  return `
    <div class="fade-in">
      <div class="upload-form">
        <h2 style="font-size:28px;font-weight:800;margin-bottom:8px"><span class="icon-box game"></span> 上传教学游戏</h2>
        <p style="color:var(--text-light);margin-bottom:32px">将你用SOLO生成的HTML游戏上传到对应知识点，与其他老师共享。</p>

        <div class="form-group">
          <label class="form-label">关联知识点 *</label>
          <input class="form-input" id="upload-kp" value="${kpName || ''}" placeholder="请输入知识点名称或ID" />
          <input type="hidden" id="upload-kp-id" value="${kpId || ''}" />
          <div class="form-hint">提示：先在知识点页面选择要关联的知识点，再点击"上传游戏"</div>
        </div>

        <div class="form-group">
          <label class="form-label">游戏标题 *</label>
          <input class="form-input" id="upload-title" placeholder="给你的游戏起个名字" />
        </div>

        <div class="form-group">
          <label class="form-label">游戏描述</label>
          <textarea class="form-textarea" id="upload-desc" placeholder="简单描述这个游戏的教学目标和玩法"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">标签</label>
          <input class="form-input" id="upload-tags" placeholder="用逗号分隔，如：闯关,趣味,互动" />
        </div>

        <div class="form-group">
          <label class="form-label">游戏文件 (HTML) *</label>
          <div class="file-upload-area" onclick="document.getElementById('file-input').click()">
            <div class="file-upload-icon"><span class="icon-box game" style="width:48px;height:48px;border-radius:14px"></span></div>
            <div class="file-upload-text" id="file-name">点击选择HTML文件</div>
            <div class="file-upload-hint">支持 .html 文件，最大10MB</div>
          </div>
          <input type="file" id="file-input" accept=".html,.htm" style="display:none" onchange="handleFileSelect(this)" />
        </div>

        <button class="btn btn-primary btn-lg" style="width:100%" onclick="handleUpload()"><span class="icon-box rocket"></span> 发布游戏</button>
      </div>
    </div>
  `
}

let selectedFile = null
function handleFileSelect(input) {
  if (input.files.length > 0) {
    selectedFile = input.files[0]
    document.getElementById('file-name').textContent = selectedFile.name
  }
}

async function handleUpload() {
  const kpId = document.getElementById('upload-kp-id').value
  const title = document.getElementById('upload-title').value.trim()
  const desc = document.getElementById('upload-desc').value.trim()
  const tags = document.getElementById('upload-tags').value.trim()

  if (!kpId) { alert('请先选择关联的知识点'); return }
  if (!title) { alert('请输入游戏标题'); return }
  if (!selectedFile) { alert('请选择游戏文件'); return }

  const formData = new FormData()
  formData.append('file', selectedFile)
  formData.append('kpId', kpId)
  formData.append('title', title)
  formData.append('description', desc)
  formData.append('tags', tags)

  try {
    const res = await fetch('/api/games/upload', {
      method: 'POST',
      headers: { 'x-user-id': currentUser?.id || 'anonymous', 'x-user-name': currentUser?.name || '匿名老师' },
      body: formData
    })
    const data = await res.json()
    if (data.code === 0) {
      alert('发布成功！')
      navigate('game', { kpId, kpName: document.getElementById('upload-kp').value })
    } else {
      alert('发布失败：' + data.message)
    }
  } catch (e) {
    alert('上传失败：' + e.message)
  }
}

// ========== 游戏运行弹窗 ==========
async function openGame(gameId) {
  // 如果还没选择学生，先弹出学生选择
  if (!currentStudent) {
    pendingGameId = gameId
    showStudentSelector()
    return
  }
  await doOpenGame(gameId)
}

async function doOpenGame(gameId) {
  const modal = document.getElementById('game-modal')
  const iframe = document.getElementById('game-iframe')
  const title = document.getElementById('game-modal-title')

  modal.style.display = 'block'
  title.textContent = '加载中...'

  try {
    const game = await getGame(gameId)
    title.textContent = game.title + (currentStudent ? ` · ${currentStudent.name}` : '')
    iframe.src = '/play/' + gameId;
    playGame(gameId)
  } catch (e) {
    title.textContent = '加载失败'
    iframe.src = 'about:blank'
  }
}

function closeGameModal() {
  document.getElementById('game-modal').style.display = 'none'
  document.getElementById('game-iframe').src = 'about:blank'
}

function toggleFullscreen() {
  const content = document.querySelector('.game-modal-content')
  if (!document.fullscreenElement) {
    content.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

// ========== 工具函数 ==========
function getKPIcon(name) {
  if (/乘|除|加|减|算|计算/.test(name)) return '<span class="icon-circle pink">算</span>'
  if (/图形|角|面积|周长|三角形|平行/.test(name)) return '<span class="icon-circle blue">形</span>'
  if (/分数|小数|百分数/.test(name)) return '<span class="icon-circle orange">数</span>'
  if (/统计|图表|数据/.test(name)) return '<span class="icon-circle blue">统</span>'
  if (/方程|未知数|等式/.test(name)) return '<span class="icon-circle purple">方</span>'
  if (/位置|方向|坐标/.test(name)) return '<span class="icon-circle green">向</span>'
  if (/规律|模式|排列/.test(name)) return '<span class="icon-circle green">规</span>'
  return '<span class="icon-circle gray">知</span>'
}

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeForAttr(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
}

// ========== 导航栏二级菜单 ==========
function toggleSecondaryMenu(e) {
  e.stopPropagation()
  const menu = document.getElementById('secondary-menu')
  menu.classList.toggle('show')
}

function closeSecondaryMenu() {
  document.getElementById('secondary-menu').classList.remove('show')
}

// 点击页面其他地方关闭菜单
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-secondary')) {
    closeSecondaryMenu()
  }
})

// ========== 学生选择弹窗（保留用于游戏打开时的快速选择） ==========
let selectedGradeId = null
let selectedGradeName = null
let selectedClassId = null
let selectedClassName = null
let allStudents = []

async function showStudentSelector() {
  const modal = document.getElementById('student-modal')
  modal.style.display = 'block'
  goToStep(1)
  // 加载年级
  try {
    const grades = await getSchoolGrades()
    const grid = document.getElementById('grade-grid')
    const gradeColors = ['green', 'green', 'green', 'blue', 'purple', 'purple']
    const gradeNums = ['1', '2', '3', '4', '5', '6']
    grid.innerHTML = grades.map((g, i) => `
      <div class="grade-card" onclick="selectGrade('${g.id}', '${g.name}')">
        <div class="grade-emoji icon-circle ${gradeColors[i] || 'gray'}">${gradeNums[i] || (i+1)}</div>
        <div class="grade-name">${g.name}</div>
      </div>
    `).join('')
  } catch (e) {
    console.error('加载年级失败:', e)
  }
}

function closeStudentModal() {
  document.getElementById('student-modal').style.display = 'none'
  pendingGameId = null
}

function goToStep(step) {
  // 更新步骤指示器
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById('step-' + i)
    stepEl.classList.toggle('active', i <= step)
    stepEl.classList.toggle('done', i < step)
  }
  // 切换面板
  document.getElementById('panel-grade').style.display = step === 1 ? '' : 'none'
  document.getElementById('panel-class').style.display = step === 2 ? '' : 'none'
  document.getElementById('panel-student').style.display = step === 3 ? '' : 'none'
}

async function selectGrade(gradeId, gradeName) {
  selectedGradeId = gradeId
  selectedGradeName = gradeName
  goToStep(2)
  try {
    const classes = await getSchoolClasses(gradeId)
    const grid = document.getElementById('class-grid')
    grid.innerHTML = classes.map(c => `
      <div class="class-card" onclick="selectClass('${c.id}', '${c.class_name}')">
        <div class="class-icon"></div>
        <div class="class-name">${gradeName}${c.class_name}</div>
        <div class="class-student-count"></div>
      </div>
    `).join('')
  } catch (e) {
    console.error('加载班级失败:', e)
  }
}

async function selectClass(classId, className) {
  selectedClassId = classId
  selectedClassName = className
  goToStep(3)
  try {
    allStudents = await getSchoolStudents(classId)
    document.getElementById('student-search').value = ''
    renderStudentGrid(allStudents)
  } catch (e) {
    console.error('加载学生失败:', e)
  }
}

function renderStudentGrid(students) {
  const grid = document.getElementById('student-grid')
  grid.innerHTML = students.map(s => `
    <div class="student-card" onclick="confirmStudent('${s.id}', '${s.name}', '${s.gender}', '${s.avatar_color}', '${s.student_no}')">
      <div class="student-avatar" style="background:${s.avatar_color}">${s.name.charAt(0)}</div>
      <div class="student-name">${s.name}</div>
      <div class="student-no">${s.student_no}号</div>
    </div>
  `).join('')
}

function filterStudents(keyword) {
  if (!keyword.trim()) {
    renderStudentGrid(allStudents)
    return
  }
  const filtered = allStudents.filter(s => s.name.includes(keyword))
  renderStudentGrid(filtered)
}

function confirmStudent(id, name, gender, avatarColor, studentNo) {
  currentStudent = {
    id, name, gender,
    avatar_color: avatarColor,
    student_no: studentNo,
    grade_name: selectedGradeName,
    class_name: selectedClassName,
    class_id: selectedClassId
  }
  localStorage.setItem('student', JSON.stringify(currentStudent))
  closeStudentModal()
  restoreStudentNav()

  // 如果有待打开的游戏，现在打开
  if (pendingGameId) {
    const gameId = pendingGameId
    pendingGameId = null
    doOpenGame(gameId)
  }
}

// ========== 游戏卡片渲染 ==========
function renderGameCard(game) {
  const iconTypes = ['target', 'puzzle', 'dice', 'trophy', 'star', 'rocket', 'circus', 'art', 'write', 'diamond']
  const iconType = iconTypes[Math.abs(hashCode(game.id)) % iconTypes.length]
  return `
    <div class="card game-card" onclick="openGame('${game.id}')">
      <div class="game-card-cover">
        <span class="icon-box ${iconType}" style="width:40px;height:40px;border-radius:12px"></span>
        ${game.is_default ? '<span class="default-badge">官方</span>' : ''}
      </div>
      <div class="game-card-body">
        <div class="game-card-title">${game.title}</div>
        <div class="game-card-kp"><span class="icon-circle gray" style="width:20px;height:20px;font-size:10px">K</span> ${game.kp_name || '知识点'}</div>
        <div class="game-card-footer">
          <div class="game-card-stats">
            <span>&#9654; ${game.play_count || 0}</span>
            <span>&#9829; ${game.like_count || 0}</span>
          </div>
          <div class="game-card-author">${game.author_name || '匿名'}</div>
        </div>
      </div>
    </div>
  `
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  renderPage()
  restoreStudentNav()
})
