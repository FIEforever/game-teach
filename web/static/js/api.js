const API_BASE = '/api'

async function api(path, options = {}) {
  const { headers, ...rest } = options
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest
  })
  const data = await res.json()
  if (data.code !== 0) throw new Error(data.message || '请求失败')
  return data.data
}

// 知识点相关
const getKnowledgeTree = (params) => api('/knowledge/tree?' + new URLSearchParams(params))
const getKnowledgePoint = (id) => api('/knowledge/point/' + id)
const searchKnowledge = (keyword) => api('/knowledge/search?keyword=' + encodeURIComponent(keyword))
const getGrades = () => api('/knowledge/grades')
const getSemesters = (gradeId) => api('/knowledge/semesters?gradeId=' + gradeId)
const getUnits = (semesterId, subjectId) => {
  let url = '/knowledge/units?semesterId=' + semesterId
  if (subjectId) url += '&subjectId=' + subjectId
  return api(url)
}

// 游戏相关
const getGames = (params) => api('/games/list?' + new URLSearchParams(params))
const getGame = (id) => api('/games/' + id)
const getHotGames = () => api('/games/hot/list')
const playGame = (id) => api('/games/' + id + '/play-count', { method: 'POST' })
const likeGame = (id) => api('/games/' + id + '/like', { method: 'POST' })
const commentGame = (id, content) => api('/games/' + id + '/comments', {
  method: 'POST',
  body: JSON.stringify({ content })
})

// 模板相关
const getTemplates = (params) => api('/templates/list?' + new URLSearchParams(params))
const getTemplate = (id) => api('/templates/' + id)

// 用户相关
const login = (name) => api('/users/login', { method: 'POST', body: JSON.stringify({ name }) })

// 学校/学生相关
const getSchoolGrades = () => api('/school/grades')
const getSchoolClasses = (gradeId) => api('/school/classes' + (gradeId ? '?gradeId=' + gradeId : ''))
const getSchoolStudents = (classId) => api('/school/students?classId=' + classId)
const submitPlayRecord = (studentId, gameId, score) => api('/school/play-record', {
  method: 'POST',
  body: JSON.stringify({ studentId, gameId, score })
})
const getPlayRecords = (studentId) => api('/school/play-records/' + studentId)

// 新增：班级/学生仪表板相关
const getClassStats = (classId) => api('/school/class-stats/' + classId)
const getKPStudents = (kpId, classId) => api('/school/kp-students/' + kpId + '?classId=' + classId)
const getStudentDashboard = (studentId) => api('/school/student-dashboard/' + studentId)
const getClassDashboard = (classId) => api('/school/class-dashboard/' + classId)
const getAllClasses = () => api('/school/classes')
