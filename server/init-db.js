/**
 * 种子数据 - 四年级下册数学（人教版）知识点树 + 游戏模板 + 默认游戏
 */
const db = require('./models/database')
const { v4: uuidv4 } = require('uuid')
const path = require('path')

console.log('🌱 开始写入种子数据...\n')

// ========== 年级 ==========
db.prepare('INSERT OR IGNORE INTO grades (id, name, sort_order) VALUES (?, ?, ?)').run('grade-4', '四年级', 4)

// ========== 学期 ==========
db.prepare('INSERT OR IGNORE INTO semesters (id, grade_id, name, sort_order) VALUES (?, ?, ?, ?)').run('sem-4b', 'grade-4', '下学期', 2)

// ========== 学科 ==========
db.prepare('INSERT OR IGNORE INTO subjects (id, name, icon) VALUES (?, ?, ?)').run('math', '数学', '📐')

// ========== 单元和知识点（人教版四年级下册数学） ==========
const units = [
  {
    id: 'unit-1', name: '第一单元：四则运算',
    points: [
      { id: 'kp-1-1', name: '加减法的意义和各部分间的关系', desc: '理解加减法的意义，掌握加减法各部分之间的关系', difficulty: 'normal' },
      { id: 'kp-1-2', name: '乘除法的意义和各部分间的关系', desc: '理解乘除法的意义，掌握乘除法各部分之间的关系', difficulty: 'normal' },
      { id: 'kp-1-3', name: '0在四则运算中的特性', desc: '掌握0在四则运算中的特性：0不能作除数', difficulty: 'easy' },
      { id: 'kp-1-4', name: '含括号的四则运算', desc: '掌握含有小括号和中括号的四则运算顺序', difficulty: 'normal' },
      { id: 'kp-1-5', name: '四则运算的实际应用', desc: '运用四则运算解决实际问题', difficulty: 'hard' },
    ]
  },
  {
    id: 'unit-2', name: '第二单元：观察物体（二）',
    points: [
      { id: 'kp-2-1', name: '从不同方向观察物体', desc: '能辨认从前面、上面、侧面观察到的简单物体的形状', difficulty: 'easy' },
      { id: 'kp-2-2', name: '从不同方向观察立体图形', desc: '能辨认从不同方向看到的立体图形的形状', difficulty: 'normal' },
    ]
  },
  {
    id: 'unit-3', name: '第三单元：运算定律',
    points: [
      { id: 'kp-3-1', name: '加法交换律和结合律', desc: 'a+b=b+a，(a+b)+c=a+(b+c)', difficulty: 'easy' },
      { id: 'kp-3-2', name: '加法运算定律的应用', desc: '运用加法运算定律进行简便计算', difficulty: 'normal' },
      { id: 'kp-3-3', name: '乘法交换律和结合律', desc: 'a×b=b×a，(a×b)×c=a×(b×c)', difficulty: 'easy' },
      { id: 'kp-3-4', name: '乘法分配律', desc: '(a+b)×c=a×c+b×c', difficulty: 'normal' },
      { id: 'kp-3-5', name: '乘法运算定律的应用', desc: '运用乘法运算定律进行简便计算', difficulty: 'hard' },
    ]
  },
  {
    id: 'unit-4', name: '第四单元：小数的意义和性质',
    points: [
      { id: 'kp-4-1', name: '小数的意义', desc: '理解小数的意义，认识小数的计数单位', difficulty: 'normal' },
      { id: 'kp-4-2', name: '小数的读法和写法', desc: '掌握小数的读写方法', difficulty: 'easy' },
      { id: 'kp-4-3', name: '小数的性质', desc: '小数的末尾添上0或去掉0，小数的大小不变', difficulty: 'easy' },
      { id: 'kp-4-4', name: '小数的大小比较', desc: '掌握小数大小比较的方法', difficulty: 'normal' },
      { id: 'kp-4-5', name: '小数点位置移动引起小数大小的变化', desc: '小数点向右移动一位，小数扩大10倍；向左移动一位，缩小10倍', difficulty: 'normal' },
      { id: 'kp-4-6', name: '小数与单位换算', desc: '掌握名数改写的方法', difficulty: 'hard' },
      { id: 'kp-4-7', name: '求一个小数的近似数', desc: '用四舍五入法求小数的近似数', difficulty: 'normal' },
    ]
  },
  {
    id: 'unit-5', name: '第五单元：三角形',
    points: [
      { id: 'kp-5-1', name: '三角形的特性', desc: '理解三角形的特性：稳定性、三边关系', difficulty: 'easy' },
      { id: 'kp-5-2', name: '三角形三边关系', desc: '三角形任意两边之和大于第三边', difficulty: 'normal' },
      { id: 'kp-5-3', name: '三角形的分类', desc: '按角分：锐角、直角、钝角三角形；按边分：不等边、等腰、等边三角形', difficulty: 'normal' },
      { id: 'kp-5-4', name: '三角形的内角和', desc: '三角形的内角和等于180°', difficulty: 'normal' },
    ]
  },
  {
    id: 'unit-6', name: '第六单元：小数的加法和减法',
    points: [
      { id: 'kp-6-1', name: '小数加减法（不进位）', desc: '掌握小数位数相同的小数加减法', difficulty: 'easy' },
      { id: 'kp-6-2', name: '小数加减法（进位退位）', desc: '掌握需要进位或退位的小数加减法', difficulty: 'normal' },
      { id: 'kp-6-3', name: '小数的加减混合运算', desc: '掌握小数的加减混合运算', difficulty: 'normal' },
      { id: 'kp-6-4', name: '整数加减法运算定律推广到小数', desc: '运用运算定律进行小数的简便计算', difficulty: 'hard' },
    ]
  },
  {
    id: 'unit-7', name: '第七单元：图形的运动（二）',
    points: [
      { id: 'kp-7-1', name: '轴对称', desc: '进一步认识轴对称图形，能画出对称轴', difficulty: 'easy' },
      { id: 'kp-7-2', name: '平移', desc: '能在方格纸上画出平移后的图形', difficulty: 'normal' },
    ]
  },
  {
    id: 'unit-8', name: '第八单元：平均数与条形统计图',
    points: [
      { id: 'kp-8-1', name: '平均数', desc: '理解平均数的意义，掌握求平均数的方法', difficulty: 'normal' },
      { id: 'kp-8-2', name: '复式条形统计图', desc: '认识复式条形统计图，能根据图表回答问题', difficulty: 'normal' },
    ]
  },
  {
    id: 'unit-9', name: '第九单元：数学广角——鸡兔同笼',
    points: [
      { id: 'kp-9-1', name: '鸡兔同笼问题', desc: '了解"鸡兔同笼"问题，掌握列表法、假设法等解题方法', difficulty: 'hard' },
    ]
  },
]

const insertUnit = db.prepare('INSERT OR IGNORE INTO units (id, semester_id, subject_id, name, sort_order) VALUES (?, ?, ?, ?, ?)')
const insertKP = db.prepare('INSERT OR IGNORE INTO knowledge_points (id, unit_id, name, description, difficulty, sort_order) VALUES (?, ?, ?, ?, ?, ?)')

units.forEach((unit, ui) => {
  insertUnit.run(unit.id, 'sem-4b', 'math', unit.name, ui + 1)
  unit.points.forEach((p, pi) => {
    insertKP.run(p.id, unit.id, p.name, p.desc, p.difficulty, pi + 1)
  })
})

console.log(`   ✅ ${units.length} 个单元，${units.reduce((s, u) => s + u.points.length, 0)} 个知识点`)

// ========== 默认游戏（32个知识点全覆盖） ==========
const defaultGames = [
  { id: 'game-arithmetic', kpId: 'kp-1-4', title: '四则运算大冒险', desc: '闯关答题，练习含括号的四则运算' },
  { id: 'game-add-sub', kpId: 'kp-1-1', title: '水果篮子加减法', desc: '拖拽水果到篮子，学习加减法的意义' },
  { id: 'game-mul-div', kpId: 'kp-1-2', title: '糖果工厂', desc: '装盒分配糖果，理解乘除法的意义' },
  { id: 'game-zero-hero', kpId: 'kp-1-3', title: '零之英雄', desc: '漫画风格，判断0的运算特性' },
  { id: 'game-bracket-run', kpId: 'kp-1-5', title: '括号跑跑跑', desc: '横版冒险，解应用题过障碍' },
  { id: 'game-3d-view', kpId: 'kp-2-1', title: '3D观察家', desc: '旋转立体图形，选择正确的观察方向' },
  { id: 'game-shape-builder', kpId: 'kp-2-2', title: '积木建筑师', desc: '等轴测积木搭建，辨认立体图形' },
  { id: 'game-law-planet', kpId: 'kp-3-1', title: '定律星球', desc: '太空主题，交换组合星球学定律' },
  { id: 'game-add-quest', kpId: 'kp-3-2', title: '加法寻宝', desc: '地图寻宝，用加法定律找捷径' },
  { id: 'game-mul-swap', kpId: 'kp-3-3', title: '乘法配对', desc: '翻牌匹配等价的乘法表达式' },
  { id: 'game-dist-blast', kpId: 'kp-3-4', title: '分配律泡泡', desc: '射击正确分配律表达式泡泡' },
  { id: 'game-mul-race', kpId: 'kp-3-5', title: '乘法赛车', desc: '答题加速赛车，学乘法运算定律' },
  { id: 'game-decimal-world', kpId: 'kp-4-1', title: '小数世界', desc: '魔法森林数轴，理解小数意义' },
  { id: 'game-decimal-read', kpId: 'kp-4-2', title: '小数电话', desc: '拨号读写小数' },
  { id: 'game-decimal-magic', kpId: 'kp-4-3', title: '小数魔术', desc: '魔术舞台变换，学小数性质' },
  { id: 'game-decimal', kpId: 'kp-4-4', title: '小数大比拼', desc: '快速比较小数大小，连击加分' },
  { id: 'game-decimal-sort', kpId: 'kp-4-5', title: '小数传送带', desc: '工厂传送带移动小数点' },
  { id: 'game-unit-convert', kpId: 'kp-4-6', title: '厨房换算', desc: '烹饪中做单位换算' },
  { id: 'game-round-up', kpId: 'kp-4-7', title: '四舍五入钓鱼', desc: '水下钓鱼，四舍五入求近似数' },
  { id: 'game-tri-build', kpId: 'kp-5-1', title: '三角建造', desc: '建桥利用三角形稳定性' },
  { id: 'game-tri-ruler', kpId: 'kp-5-2', title: '三角尺子', desc: '判断三根棒能否组成三角形' },
  { id: 'game-triangle', kpId: 'kp-5-3', title: '三角形知识大闯关', desc: '选择题闯关，掌握三角形分类' },
  { id: 'game-tri-angle', kpId: 'kp-5-4', title: '三角拼图', desc: '拼角度等于180度' },
  { id: 'game-decimal-add', kpId: 'kp-6-1', title: '小数超市', desc: '购物计算不进位加减法' },
  { id: 'game-decimal-carry', kpId: 'kp-6-2', title: '密码保险箱', desc: '进位退位破解密码' },
  { id: 'game-decimal-chain', kpId: 'kp-6-3', title: '连锁反应', desc: '答对触发粒子爆炸' },
  { id: 'game-decimal-shortcut', kpId: 'kp-6-4', title: '迷宫捷径', desc: '用运算定律开门' },
  { id: 'game-symmetry-paint', kpId: 'kp-7-1', title: '对称画板', desc: '画对称图形' },
  { id: 'game-slide-puzzle', kpId: 'kp-7-2', title: '平移拼图', desc: '方向键移动图形到目标' },
  { id: 'game-avg-balance', kpId: 'kp-8-1', title: '天平平衡', desc: '天平动画求平均数' },
  { id: 'game-bar-chart', kpId: 'kp-8-2', title: '条形统计', desc: '动态条形图读数据' },
  { id: 'game-chicken-rabbit', kpId: 'kp-9-1', title: '农场谜题', desc: '动画鸡兔解经典题' },
]

const insertGame = db.prepare(`
  INSERT OR IGNORE INTO games (id, kp_id, title, description, game_type, file_path, is_default, status)
  VALUES (?, ?, ?, ?, 'html5', ?, 1, 'published')
`)

defaultGames.forEach(g => {
  const gamePath = `/games/${g.id}/index.html`
  insertGame.run(g.id, g.kpId, g.title, g.desc, gamePath)
})

console.log(`   ✅ ${defaultGames.length} 个游戏（32个知识点全覆盖）`)

// ========== 游戏模板/提示词 ==========
const templates = [
  {
    id: 'tpl-quiz', name: '选择题闯关', difficulty: 'easy',
    description: '经典的答题闯关游戏，适合知识点记忆和理解。学生从4个选项中选择正确答案，答对加分，答错扣命。',
    tags: JSON.stringify(['通用', '记忆', '理解']),
    prompt_template: `请帮我制作一个HTML5教学小游戏，要求如下：

【游戏类型】选择题闯关
【知识点】[在此填写知识点名称]
【年级】四年级
【题目数量】10题

【游戏规则】
1. 开始页面显示游戏标题和知识点名称
2. 每题显示一道选择题，4个选项
3. 答对+10分，显示正确提示和知识点解析
4. 答错扣1条命（共3条命），显示正确答案和解析
5. 10题结束后显示总分和星级评价
6. 有进度条显示当前进度

【题目内容】
请根据"[在此填写具体知识点]"生成10道由易到难的选择题。

【设计要求】
- 单个HTML文件，包含所有CSS和JS
- 移动端适配（max-width: 480px）
- 配色活泼，适合小学生
- 有动画反馈（答对/答错）
- 不使用任何外部依赖`,
    example_prompt: `请帮我制作一个HTML5教学小游戏，要求如下：

【游戏类型】选择题闯关
【知识点】三角形的分类
【年级】四年级
【题目数量】10题

【游戏规则】
1. 开始页面显示"三角形分类大闯关"
2. 每题显示一道选择题，4个选项
3. 答对+10分，显示正确提示
4. 答错扣1条命（共3条命），显示正确答案
5. 结束后显示总分和知识点总结

【题目内容】
1. 三个角都是锐角的三角形叫什么？A.锐角三角形 B.直角三角形 C.钝角三角形 D.等腰三角形
2. 有一个角是90°的三角形叫什么？A.锐角三角形 B.直角三角形 C.钝角三角形 D.等边三角形
...（请生成完整的10道题）

【设计要求】
- 单个HTML文件，粉色渐变背景
- 显示三角形图形辅助理解
- 移动端适配`
  },
  {
    id: 'tpl-match', name: '拖拽配对', difficulty: 'medium',
    description: '将左侧概念与右侧定义/公式配对，适合公式记忆和概念对应。',
    tags: JSON.stringify(['配对', '公式', '概念']),
    prompt_template: `请帮我制作一个HTML5拖拽配对教学小游戏：

【游戏类型】拖拽配对
【知识点】[在此填写知识点名称]
【配对数量】6-8组

【游戏规则】
1. 左侧显示概念/公式名称，右侧显示对应的定义/值（打乱顺序）
2. 学生拖拽左侧项目到右侧对应位置进行配对
3. 配对正确显示绿色，错误显示红色并弹回
4. 全部配对完成后显示用时和正确率
5. 有计时功能

【配对内容】
请根据"[在此填写具体知识点]"生成6-8组配对内容。

【设计要求】
- 单个HTML文件
- 拖拽交互流畅
- 配色活泼
- 移动端适配（支持触摸拖拽）`,
    example_prompt: `请帮我制作一个HTML5拖拽配对教学小游戏：

【游戏类型】拖拽配对
【知识点】运算定律
【配对数量】6组

【配对内容】
- 加法交换律 ↔ a+b=b+a
- 加法结合律 ↔ (a+b)+c=a+(b+c)
- 乘法交换律 ↔ a×b=b×a
- 乘法结合律 ↔ (a×b)×c=a×(b×c)
- 乘法分配律 ↔ (a+b)×c=a×c+b×c
- 连减性质 ↔ a-b-c=a-(b+c)`
  },
  {
    id: 'tpl-fill', name: '填空挑战', difficulty: 'medium',
    description: '在规定时间内填写正确答案，适合计算练习和公式填空。',
    tags: JSON.stringify(['计算', '填空', '速算']),
    prompt_template: `请帮我制作一个HTML5填空挑战教学小游戏：

【游戏类型】限时填空
【知识点】[在此填写知识点名称]
【题目数量】10题
【每题时间】30秒

【游戏规则】
1. 每题显示一个填空题，学生输入答案
2. 每题有30秒倒计时，超时自动跳到下一题
3. 答对+10分，连续答对有连击加分
4. 10题结束后显示总分、正确率和用时

【题目内容】
请根据"[在此填写具体知识点]"生成10道填空题。

【设计要求】
- 单个HTML文件
- 有倒计时动画
- 数字键盘输入（适合移动端）
- 配色活泼`
  },
  {
    id: 'tpl-memory', name: '记忆翻牌', difficulty: 'easy',
    description: '翻牌配对记忆游戏，翻开两张相同的牌即消除，适合概念记忆。',
    tags: JSON.stringify(['记忆', '配对', '趣味']),
    prompt_template: `请帮我制作一个HTML5记忆翻牌教学小游戏：

【游戏类型】记忆翻牌
【知识点】[在此填写知识点名称]
【牌数】12张（6对）

【游戏规则】
1. 12张牌背面朝上排列（4×3网格）
2. 每次翻开2张牌
3. 如果2张牌配对成功（如概念+对应答案），则保持翻开
4. 如果不配对，1秒后翻回
5. 全部配对完成显示翻牌次数和用时
6. 每张牌的一面是概念/题目，另一面是答案/公式

【牌面内容】
请根据"[在此填写具体知识点]"生成6对配对内容。

【设计要求】
- 单个HTML文件
- 翻牌动画流畅（CSS 3D翻转）
- 配色活泼
- 移动端适配`
  },
  {
    id: 'tpl-speed', name: '数学速算', difficulty: 'medium',
    description: '限时速算挑战，在规定时间内完成尽可能多的计算题，适合计算能力训练。',
    tags: JSON.stringify(['计算', '速算', '挑战']),
    prompt_template: `请帮我制作一个HTML5数学速算挑战游戏：

【游戏类型】限时速算
【知识点】[在此填写知识点名称]
【游戏时长】60秒

【游戏规则】
1. 60秒倒计时
2. 屏幕显示一道计算题，下方显示4个选项
3. 点击正确答案立即出下一题
4. 答错不扣分但浪费时间
5. 连续答对有连击加分
6. 时间结束后显示总分、答题数和正确率

【题目内容】
请根据"[在此填写具体知识点]"随机生成计算题。

【设计要求】
- 单个HTML文件
- 倒计时动画醒目
- 连击特效
- 移动端适配`
  },
  {
    id: 'tpl-sort', name: '排序挑战', difficulty: 'hard',
    description: '将打乱的项目按正确顺序排列，适合步骤记忆和大小比较。',
    tags: JSON.stringify(['排序', '步骤', '逻辑']),
    prompt_template: `请帮我制作一个HTML5排序挑战教学小游戏：

【游戏类型】拖拽排序
【知识点】[在此填写知识点名称]
【排序数量】5-6项

【游戏规则】
1. 显示一组打乱顺序的项目
2. 学生通过拖拽将项目排列成正确顺序
3. 点击"提交"检查答案
4. 正确的位置显示绿色，错误的位置显示红色
5. 可以重新排列后再次提交

【排序内容】
请根据"[在此填写具体知识点]"设计一组需要排序的内容（如计算步骤、大小排列等）。

【设计要求】
- 单个HTML文件
- 拖拽排序交互
- 移动端适配`
  }
]

const insertTpl = db.prepare(`
  INSERT OR IGNORE INTO game_templates (id, name, description, game_type, prompt_template, example_prompt, difficulty, tags)
  VALUES (?, ?, ?, 'html5', ?, ?, ?, ?)
`)

templates.forEach(t => {
  insertTpl.run(t.id, t.name, t.description, t.prompt_template, t.example_prompt, t.difficulty, t.tags)
})

console.log(`   ✅ ${templates.length} 个游戏模板`)

// ========== 学校年级（1-6年级） ==========
const schoolGrades = [
  { id: 'sg-1', name: '一年级', order: 1 },
  { id: 'sg-2', name: '二年级', order: 2 },
  { id: 'sg-3', name: '三年级', order: 3 },
  { id: 'grade-4', name: '四年级', order: 4 },
  { id: 'sg-5', name: '五年级', order: 5 },
  { id: 'sg-6', name: '六年级', order: 6 },
]
const insertSchoolGrade = db.prepare('INSERT OR IGNORE INTO grades (id, name, sort_order) VALUES (?, ?, ?)')
schoolGrades.forEach(g => insertSchoolGrade.run(g.id, g.name, g.order))
console.log(`   ✅ ${schoolGrades.length} 个年级`)

// ========== 班级（每年级4个班） ==========
const insertClass = db.prepare('INSERT OR IGNORE INTO school_classes (id, grade_id, grade_name, class_name, sort_order) VALUES (?, ?, ?, ?, ?)')
let classCount = 0
schoolGrades.forEach(grade => {
  for (let i = 1; i <= 4; i++) {
    insertClass.run(`${grade.id}-c${i}`, grade.id, grade.name, `${i}班`, i)
    classCount++
  }
})
console.log(`   ✅ ${classCount} 个班级`)

// ========== 403班真实学生名单（45人） ==========
const class403Students = [
  {no:'01',name:'陈凯滢',gender:'female'},{no:'02',name:'冯汐悦',gender:'female'},
  {no:'03',name:'龚齐安',gender:'male'},{no:'04',name:'郭善恩',gender:'female'},
  {no:'05',name:'胡烯儿',gender:'female'},{no:'06',name:'黄俊熙',gender:'male'},
  {no:'07',name:'黄铠宇',gender:'male'},{no:'08',name:'赖俊星',gender:'male'},
  {no:'09',name:'李润棠',gender:'male'},{no:'10',name:'李晓宇',gender:'male'},
  {no:'11',name:'李欣晞',gender:'female'},{no:'12',name:'李颖杰',gender:'male'},
  {no:'13',name:'李宇鑫',gender:'male'},{no:'14',name:'李卓洋',gender:'male'},
  {no:'15',name:'李梓健',gender:'male'},{no:'16',name:'林政宇',gender:'male'},
  {no:'17',name:'刘佳莹',gender:'female'},{no:'18',name:'刘芷菡',gender:'female'},
  {no:'19',name:'罗嘉鹏',gender:'male'},{no:'20',name:'莫昕瑞',gender:'female'},
  {no:'21',name:'苏梓淇',gender:'female'},{no:'22',name:'覃邱宁',gender:'female'},
  {no:'23',name:'温可莜',gender:'female'},{no:'24',name:'谢一心',gender:'female'},
  {no:'25',name:'叶昊燊',gender:'male'},{no:'26',name:'叶楒韵',gender:'female'},
  {no:'27',name:'叶御陞',gender:'male'},{no:'28',name:'尹炘彤',gender:'female'},
  {no:'29',name:'尹弈淇',gender:'female'},{no:'30',name:'余乐音',gender:'female'},
  {no:'31',name:'张雄锋',gender:'male'},{no:'32',name:'钟浩言',gender:'male'},
  {no:'33',name:'钟宇轩',gender:'male'},{no:'34',name:'钟子恒',gender:'male'},
  {no:'35',name:'周润敏',gender:'female'},{no:'36',name:'谢金钰',gender:'female'},
  {no:'37',name:'李熙文',gender:'male'},{no:'38',name:'陆胜男',gender:'male'},
  {no:'39',name:'郑凯文',gender:'male'},{no:'40',name:'钟炜皓',gender:'male'},
  {no:'41',name:'梁倍毓',gender:'female'},{no:'42',name:'赵雨凡',gender:'female'},
  {no:'43',name:'陈殊颖',gender:'female'},{no:'44',name:'黄润凯',gender:'male'},
  {no:'45',name:'孙雨宣',gender:'female'},
]

const avatarColors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F',
  '#BB8FCE','#85C1E9','#F0B27A','#82E0AA','#F1948A','#AED6F1','#A3E4D7','#FAD7A0']

const insertStudent = db.prepare('INSERT OR IGNORE INTO school_students (id, name, gender, class_id, student_no, avatar_color) VALUES (?, ?, ?, ?, ?, ?)')
let studentCount = 0

// 写入403班真实名单
const c403Id = 'grade-4-c3'
class403Students.forEach((s, i) => {
  const color = avatarColors[i % avatarColors.length]
  insertStudent.run(`${c403Id}-s${s.no}`, s.name, s.gender, c403Id, s.no, color)
  studentCount++
})
console.log(`   ✅ 403班 ${class403Students.length} 名真实学生`)

// 其他班级用模拟数据
const maleNames = ['浩然','子轩','宇轩','博文','铭轩','天翊','嘉懿','煜城','懿轩',
  '烨磊','晟睿','文昊','修洁','黎昕','远航','旭尧','鸿涛','伟祺','荣轩',
  '越泽','瑾瑜','皓轩','擎苍','擎宇','志泽','子骞','明辉','健柏',
  '弘文','峻熙','靖琪','明杰','昊天','昊焱','昊祺','运鹏','展鹏']
const femaleNames = ['子涵','欣怡','梓涵','晨曦','语嫣','雨涵','诗琪','紫萱','雅琪','梦琪',
  '思颖','晓彤','心怡','佳怡','雨桐','诗涵','若曦','可馨','语桐','依诺',
  '芷若','雨萱','诗玥','梓萱','紫琪','雅静','欣然','若兮','思琪','梦洁',
  '语嫣','佳琪','雨薇','梓晴','思涵','雅馨','欣悦','可欣','若萱','诗雨']

schoolGrades.forEach(grade => {
  for (let c = 1; c <= 4; c++) {
    const classId = `${grade.id}-c${c}`
    if (classId === c403Id) continue // 跳过403班
    const shuffledMale = [...maleNames].sort(() => Math.random() - 0.5)
    const shuffledFemale = [...femaleNames].sort(() => Math.random() - 0.5)
    const count = 38 + Math.floor(Math.random() * 5)
    for (let s = 0; s < count; s++) {
      const gender = s < count / 2 ? 'male' : 'female'
      const name = gender === 'male' ? shuffledMale[s % shuffledMale.length] : shuffledFemale[(s - Math.floor(count/2)) % shuffledFemale.length]
      const studentNo = String(s + 1).padStart(2, '0')
      const color = avatarColors[Math.floor(Math.random() * avatarColors.length)]
      insertStudent.run(`${classId}-s${studentNo}`, name, gender, classId, studentNo, color)
      studentCount++
    }
  }
})
console.log(`   ✅ 共 ${studentCount} 名学生`)

console.log('\n🎉 种子数据写入完成！')
console.log('   运行 npm start 启动服务')
