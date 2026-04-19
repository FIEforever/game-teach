// Vercel 环境使用内存 JSON 数据库（better-sqlite3 是原生模块，不支持 serverless）
if (process.env.VERCEL) {
  module.exports = require('../../api/db')
  return
}

const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, 'gameteach.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ========== 班级表 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS school_classes (
    id TEXT PRIMARY KEY,
    grade_id TEXT NOT NULL,
    grade_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (grade_id) REFERENCES grades(id)
  );
`)

// ========== 学生表 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS school_students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT DEFAULT 'male',
    class_id TEXT NOT NULL,
    student_no TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#4A90D9',
    FOREIGN KEY (class_id) REFERENCES school_classes(id)
  );
`)

// ========== 游戏记录表（学生玩游戏的记录） ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS game_play_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    last_played TEXT,
    total_questions INTEGER,
    correct_count INTEGER,
    FOREIGN KEY (student_id) REFERENCES school_students(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
  );
`)

// 为已有的 game_play_records 表添加新列（兼容旧数据库）
try { db.exec('ALTER TABLE game_play_records ADD COLUMN total_questions INTEGER') } catch (e) { /* 列已存在 */ }
try { db.exec('ALTER TABLE game_play_records ADD COLUMN correct_count INTEGER') } catch (e) { /* 列已存在 */ }

// ========== 用户表 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    role TEXT DEFAULT 'teacher',
    bio TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`)

// ========== 知识点树 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📚'
  );

  CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS semesters (
    id TEXT PRIMARY KEY,
    grade_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (grade_id) REFERENCES grades(id)
  );

  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    semester_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (semester_id) REFERENCES semesters(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS knowledge_points (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'normal' CHECK(difficulty IN ('easy','normal','hard')),
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (unit_id) REFERENCES units(id)
  );
`)

// ========== 游戏表 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    kp_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    game_type TEXT NOT NULL DEFAULT 'html5',
    file_path TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    author_id TEXT,
    author_name TEXT DEFAULT '系统默认',
    is_default INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK(status IN ('draft','published','reviewing','rejected')),
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (kp_id) REFERENCES knowledge_points(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
  );
`)

// ========== 游戏模板/提示词 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS game_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    game_type TEXT NOT NULL,
    cover_image TEXT DEFAULT '',
    prompt_template TEXT NOT NULL,
    example_prompt TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'easy',
    tags TEXT DEFAULT '[]',
    use_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`)

// ========== 游戏收藏/点赞 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS game_likes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(user_id, game_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
  );
`)

// ========== 游戏评论 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS game_comments (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT DEFAULT '',
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

console.log('✅ 数据库表创建完成')
module.exports = db
