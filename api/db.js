/**
 * 内存 JSON 数据库 - Vercel serverless 环境替代 better-sqlite3
 * 实现 prepare().all() / .get() / .run() 接口
 */
const path = require('path')
const fs = require('fs')

// 全局持久化存储（在 Vercel warm invocation 间存活）
let _store = null

function getStore() {
  if (_store) return _store
  const seedPath = path.join(__dirname, 'seed-data.json')
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))
  _store = {
    grades: { ...seed.grades },
    semesters: { ...seed.semesters },
    subjects: { ...seed.subjects },
    units: { ...seed.units },
    knowledge_points: { ...seed.knowledge_points },
    games: { ...seed.games },
    game_templates: { ...seed.game_templates },
    school_classes: { ...seed.school_classes },
    school_students: { ...seed.school_students },
    users: { ...seed.users },
    game_likes: { ...seed.game_likes },
    game_comments: { ...seed.game_comments },
    game_play_records: { ...seed.game_play_records },
  }
  return _store
}

/**
 * 将表名映射到 store 中的 key
 */
function tableKey(tableName) {
  const map = {
    'grades': 'grades',
    'semesters': 'semesters',
    'subjects': 'subjects',
    'units': 'units',
    'knowledge_points': 'knowledge_points',
    'games': 'games',
    'game_templates': 'game_templates',
    'school_classes': 'school_classes',
    'school_students': 'school_students',
    'users': 'users',
    'game_likes': 'game_likes',
    'game_comments': 'game_comments',
    'game_play_records': 'game_play_records',
  }
  return map[tableName] || tableName
}

/**
 * 将数组转为 id 索引的对象，方便快速查找
 */
function indexById(arr) {
  const obj = {}
  arr.forEach(item => { obj[item.id] = item })
  return obj
}

/**
 * 解析 SELECT 语句中的列别名 (e.g. "g.id as grade_id")
 */
function parseSelectColumns(selectPart) {
  // selectPart: "g.id as grade_id, g.name as grade_name, ..."
  const cols = selectPart.split(',').map(c => c.trim())
  const result = []
  for (const col of cols) {
    const m = col.match(/(\w+(?:\.\w+)?)\s+as\s+(\w+)/i)
    if (m) {
      result.push({ expr: m[1], alias: m[2] })
    } else {
      result.push({ expr: col, alias: col.split('.').pop() })
    }
  }
  return result
}

/**
 * 解析 FROM 子句中的表和别名
 */
function parseFrom(fromPart) {
  // fromPart: "grades g" or "grades" or "games g LEFT JOIN users u ON ..."
  const tables = []
  const parts = fromPart.split(/\bJOIN\b/i)
  for (const part of parts) {
    const cleaned = part.replace(/\b(LEFT|INNER|OUTER|CROSS)\b/gi, '').trim()
    const m = cleaned.match(/^(\w+)(?:\s+(\w+))?(?:\s+ON\s+(.+))?$/i)
    if (m) {
      tables.push({ table: m[1], alias: m[2] || m[1], on: m[3] || null })
    }
  }
  return tables
}

/**
 * 解析 WHERE 条件
 */
function parseWhere(wherePart) {
  if (!wherePart || wherePart.trim() === '') return { conditions: [], subqueries: [] }
  // 处理子查询: (SELECT COUNT(*) FROM games WHERE kp_id = kp.id AND status='published')
  const subqueries = []
  let cleaned = wherePart.trim()

  // 提取子查询并替换为占位符
  const subRegex = /\((SELECT\s+.+?)\)/gi
  let subIdx = 0
  cleaned = cleaned.replace(subRegex, (match, sql) => {
    const placeholder = `__SUBQUERY_${subIdx}__`
    subqueries.push(sql.trim())
    subIdx++
    return placeholder
  })

  // 分割 AND 条件
  const conditions = cleaned.split(/\s+AND\s+/i).map(c => c.trim()).filter(Boolean)
  return { conditions, subqueries }
}

/**
 * 解析 ORDER BY 子句
 */
function parseOrderBy(orderPart) {
  if (!orderPart) return []
  return orderPart.split(',').map(o => {
    const parts = o.trim().split(/\s+/)
    const col = parts[0]
    const dir = (parts[1] || 'ASC').toUpperCase()
    return { col, dir }
  })
}

/**
 * 解析 LIMIT 子句
 */
function parseLimit(limitPart) {
  if (!limitPart) return null
  const m = limitPart.trim().match(/^(\d+)$/)
  return m ? parseInt(m[1]) : null
}

/**
 * 解析 GROUP BY 子句
 */
function parseGroupBy(groupPart) {
  if (!groupPart) return []
  return groupPart.split(',').map(g => g.trim())
}

/**
 * 执行 JOIN 操作
 */
function performJoins(baseTable, baseAlias, tables, store, row) {
  let result = [row]
  for (let i = 1; i < tables.length; i++) {
    const t = tables[i]
    const key = tableKey(t.table)
    const joinTable = store[key]
    if (!joinTable || !Array.isArray(joinTable)) continue

    const newResult = []
    for (const r of result) {
      // 解析 ON 条件: "s.class_id = c.id"
      if (t.on) {
        const onParts = t.on.split('=').map(p => p.trim())
        if (onParts.length === 2) {
          const leftRef = onParts[0] // e.g. "s.class_id"
          const rightRef = onParts[1] // e.g. "c.id"

          // 从当前行中解析引用值
          const leftVal = resolveRef(leftRef, r)
          const rightVal = resolveRef(rightRef, r)

          // 确定哪边是已知的，哪边需要在 join 表中查找
          if (leftVal !== undefined) {
            // 在 join 表中查找匹配的行
            const joinAlias = t.alias
            const rightCol = rightRef.split('.').pop()
            const matches = Array.isArray(joinTable)
              ? joinTable.filter(jr => String(jr[rightCol]) === String(leftVal))
              : []
            if (matches.length > 0) {
              for (const m of matches) {
                const merged = { ...r }
                for (const [k, v] of Object.entries(m)) {
                  merged[`${joinAlias}.${k}`] = v
                  // 也设置不带别名的，如果没冲突
                  if (!(k in merged)) merged[k] = v
                }
                newResult.push(merged)
              }
            } else {
              // LEFT JOIN - 保留左侧行，右侧为 null
              const merged = { ...r }
              newResult.push(merged)
            }
          } else if (rightVal !== undefined) {
            const joinAlias = t.alias
            const leftCol = leftRef.split('.').pop()
            const matches = Array.isArray(joinTable)
              ? joinTable.filter(jr => String(jr[leftCol]) === String(rightVal))
              : []
            if (matches.length > 0) {
              for (const m of matches) {
                const merged = { ...r }
                for (const [k, v] of Object.entries(m)) {
                  merged[`${joinAlias}.${k}`] = v
                  if (!(k in merged)) merged[k] = v
                }
                newResult.push(merged)
              }
            } else {
              const merged = { ...r }
              newResult.push(merged)
            }
          } else {
            newResult.push(r)
          }
        }
      }
    }
    result = newResult
  }
  return result
}

/**
 * 从行数据中解析引用 (e.g. "g.id" -> row["g.id"] 或 row["id"])
 */
function resolveRef(ref, row) {
  if (ref.includes('.')) {
    const parts = ref.split('.')
    return row[ref] !== undefined ? row[ref] : row[parts[1]]
  }
  return row[ref]
}

/**
 * 主 SQL 执行引擎
 */
function executeSQL(sql, params = []) {
  const store = getStore()

  // 标准化 SQL
  let normalized = sql.replace(/\s+/g, ' ').trim()

  // 判断 SQL 类型
  const isSelect = /^\s*SELECT\b/i.test(normalized)
  const isInsert = /^\s*INSERT\b/i.test(normalized)
  const isUpdate = /^\s*UPDATE\b/i.test(normalized)
  const isDelete = /^\s*DELETE\b/i.test(normalized)

  if (isSelect) return executeSelect(normalized, params, store)
  if (isInsert) return executeInsert(normalized, params, store)
  if (isUpdate) return executeUpdate(normalized, params, store)
  if (isDelete) return executeDelete(normalized, params, store)

  return []
}

/**
 * 执行 SELECT
 */
function executeSelect(sql, params, store) {
  // 解析子查询 (SELECT COUNT(*) FROM ... WHERE ...) 作为列
  const subqueryCols = []
  let cleanSQL = sql

  // 提取子查询列
  const subColRegex = /\((SELECT\s+COUNT\(\*\)\s+FROM\s+(\w+)\s+WHERE\s+([^)]+(?:\([^)]*\))*[^)]*))\)\s+as\s+(\w+)/gi
  let m
  while ((m = subColRegex.exec(sql)) !== null) {
    subqueryCols.push({
      full: m[0],
      subSQL: m[1],
      table: m[2],
      where: m[3],
      alias: m[4]
    })
  }
  // 替换子查询为占位符
  for (let i = 0; i < subqueryCols.length; i++) {
    cleanSQL = cleanSQL.replace(subqueryCols[i].full, `__SUBCOL_${i}__`)
  }

  // 提取各部分
  const selectMatch = cleanSQL.match(/SELECT\s+(.*?)\s+FROM\s+(.*?)(?:\s+WHERE\s+(.*?))?(?:\s+GROUP\s+BY\s+(.*?))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+LIMIT\s+(\d+))?$/i)
  if (!selectMatch) return []

  const selectPart = selectMatch[1]
  const fromPart = selectMatch[2]
  const wherePart = selectMatch[3] || ''
  const groupPart = selectMatch[4] || ''
  const orderPart = selectMatch[5] || ''
  const limitPart = selectMatch[6] || ''

  const tables = parseFrom(fromPart)
  if (tables.length === 0) return []

  // 获取基础表数据
  const baseTable = tables[0]
  const baseKey = tableKey(baseTable.table)
  let baseData = store[baseKey]
  if (!Array.isArray(baseData)) baseData = []
  // 创建副本避免修改原始数据
  let rows = baseData.map(row => {
    const r = {}
    const alias = baseTable.alias
    for (const [k, v] of Object.entries(row)) {
      r[`${alias}.${k}`] = v
      r[k] = v
    }
    return r
  })

  // 执行 JOIN
  if (tables.length > 1) {
    const joined = []
    for (const row of rows) {
      const joinedRows = performJoins(baseTable.table, baseTable.alias, tables, store, row)
      joined.push(...joinedRows)
    }
    rows = joined
  }

  // 应用 WHERE 过滤
  if (wherePart) {
    const { conditions, subqueries } = parseWhere(wherePart)
    rows = rows.filter(row => {
      let paramIdx = 0
      for (const cond of conditions) {
        // 替换子查询占位符
        let condClean = cond
        for (let si = 0; si < subqueries.length; si++) {
          condClean = condClean.replace(`__SUBQUERY_${si}__`, '1=1') // 子查询条件在后续处理
        }

        if (condClean === '1=1') continue

        // 处理 BETWEEN
        const betweenMatch = condClean.match(/(\S+)\s+BETWEEN\s+(\S+)\s+AND\s+(\S+)/i)
        if (betweenMatch) {
          const col = betweenMatch[1]
          const lowVal = params[paramIdx++] !== undefined ? params[paramIdx - 1] : betweenMatch[2]
          const highVal = params[paramIdx++] !== undefined ? params[paramIdx - 1] : betweenMatch[3]
          const rowVal = resolveRef(col, row)
          if (rowVal === undefined || rowVal === null) return false
          if (typeof lowVal === 'string' && typeof highVal === 'string') {
            if (rowVal < parseInt(lowVal) || rowVal > parseInt(highVal)) return false
          }
          continue
        }

        // 处理 IN (?,?,?)
        const inMatch = condClean.match(/(\S+)\s+IN\s*\(([^)]+)\)/i)
        if (inMatch) {
          const col = inMatch[1]
          const placeholders = inMatch[2].split(',').map(p => p.trim())
          const inValues = []
          for (const ph of placeholders) {
            if (ph === '?') {
              inValues.push(params[paramIdx++])
            } else {
              inValues.push(ph.replace(/['"]/g, ''))
            }
          }
          const rowVal = resolveRef(col, row)
          if (!inValues.includes(rowVal)) return false
          continue
        }

        // 处理 LIKE
        const likeMatch = condClean.match(/(\S+)\s+LIKE\s+\?/i)
        if (likeMatch) {
          const col = likeMatch[1]
          const pattern = params[paramIdx++]
          const rowVal = resolveRef(col, row)
          if (rowVal === undefined || rowVal === null) return false
          // 将 SQL LIKE 模式转为正则
          const regex = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i')
          if (!regex.test(String(rowVal))) return false
          continue
        }

        // 处理普通比较: col = ?, col != ?, col > ?, etc.
        const compMatch = condClean.match(/(\S+(?:\.\S+)?)\s*(!=|<>|>=|<=|=|>|<)\s*\?/)
        if (compMatch) {
          const col = compMatch[1]
          const op = compMatch[2]
          const val = params[paramIdx++]
          const rowVal = resolveRef(col, row)
          if (!compare(rowVal, op, val)) return false
          continue
        }

        // 处理 col = 'literal'
        const litMatch = condClean.match(/(\S+(?:\.\S+)?)\s*(!=|<>|>=|<=|=|>|<)\s*'([^']*)'/)
        if (litMatch) {
          const col = litMatch[1]
          const op = litMatch[2]
          const val = litMatch[3]
          const rowVal = resolveRef(col, row)
          if (!compare(rowVal, op, val)) return false
          continue
        }

        // 处理 col = col (JOIN 条件等)
        const colColMatch = condClean.match(/(\S+(?:\.\S+)?)\s*(!=|<>|>=|<=|=|>|<)\s*(\S+(?:\.\S+)?)/)
        if (colColMatch) {
          const left = resolveRef(colColMatch[1], row)
          const op = colColMatch[2]
          const right = resolveRef(colColMatch[3], row)
          if (!compare(left, op, right)) return false
          continue
        }
      }
      return true
    })
  }

  // 应用 GROUP BY
  if (groupPart) {
    const groupCols = parseGroupBy(groupPart)
    const grouped = new Map()
    for (const row of rows) {
      const key = groupCols.map(col => {
        const parts = col.split('.')
        return row[col] !== undefined ? row[col] : row[parts[parts.length - 1]]
      }).join('|||')
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(row)
    }

    rows = []
    for (const [key, groupRows] of grouped) {
      const baseRow = { ...groupRows[0] }

      // 处理聚合函数
      const selectCols = selectPart.split(',').map(c => c.trim())
      for (const colExpr of selectCols) {
        // COUNT(*)
        if (/COUNT\s*\(\s*\*\s*\)/i.test(colExpr)) {
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : 'count'
          baseRow[alias] = groupRows.length
          continue
        }
        // COUNT(col)
        const countColMatch = colExpr.match(/COUNT\s*\(\s*(\w+(?:\.\w+)?)\s*\)/i)
        if (countColMatch) {
          const col = countColMatch[1]
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : 'count'
          baseRow[alias] = groupRows.filter(r => resolveRef(col, r) != null).length
          continue
        }
        // COUNT(DISTINCT col)
        const countDistMatch = colExpr.match(/COUNT\s*\(\s*DISTINCT\s+(\w+(?:\.\w+)?)\s*\)/i)
        if (countDistMatch) {
          const col = countDistMatch[1]
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : 'count'
          const uniqueVals = new Set(groupRows.map(r => resolveRef(col, r)).filter(v => v != null))
          baseRow[alias] = uniqueVals.size
          continue
        }
        // SUM(col)
        const sumMatch = colExpr.match(/SUM\s*\(\s*(\w+(?:\.\w+)?)\s*\)/i)
        if (sumMatch) {
          const col = sumMatch[1]
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : col.split('.').pop()
          baseRow[alias] = groupRows.reduce((sum, r) => sum + (parseFloat(resolveRef(col, r)) || 0), 0)
          continue
        }
        // AVG(col)
        const avgMatch = colExpr.match(/AVG\s*\(\s*(\w+(?:\.\w+)?)\s*\)/i)
        if (avgMatch) {
          const col = avgMatch[1]
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : col.split('.').pop()
          const vals = groupRows.map(r => parseFloat(resolveRef(col, r))).filter(v => !isNaN(v))
          baseRow[alias] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
          continue
        }
        // ROUND(AVG(col), N)
        const roundAvgMatch = colExpr.match(/ROUND\s*\(\s*AVG\s*\(\s*(\w+(?:\.\w+)?)\s*\)\s*,\s*(\d+)\s*\)/i)
        if (roundAvgMatch) {
          const col = roundAvgMatch[1]
          const decimals = parseInt(roundAvgMatch[2])
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : col.split('.').pop()
          const vals = groupRows.map(r => parseFloat(resolveRef(col, r))).filter(v => !isNaN(v))
          const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
          baseRow[alias] = Math.round(avg * Math.pow(10, decimals)) / Math.pow(10, decimals)
          continue
        }
        // MAX(col)
        const maxMatch = colExpr.match(/MAX\s*\(\s*(\w+(?:\.\w+)?)\s*\)/i)
        if (maxMatch) {
          const col = maxMatch[1]
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : col.split('.').pop()
          const vals = groupRows.map(r => parseFloat(resolveRef(col, r))).filter(v => !isNaN(v))
          baseRow[alias] = vals.length > 0 ? Math.max(...vals) : 0
          continue
        }
        // MIN(col)
        const minMatch = colExpr.match(/MIN\s*\(\s*(\w+(?:\.\w+)?)\s*\)/i)
        if (minMatch) {
          const col = minMatch[1]
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : col.split('.').pop()
          const vals = groupRows.map(r => parseFloat(resolveRef(col, r))).filter(v => !isNaN(v))
          baseRow[alias] = vals.length > 0 ? Math.min(...vals) : 0
          continue
        }
        // COALESCE(MAX(col), 0)
        const coalesceMaxMatch = colExpr.match(/COALESCE\s*\(\s*MAX\s*\(\s*(\w+(?:\.\w+)?)\s*\)\s*,\s*(\d+)\s*\)/i)
        if (coalesceMaxMatch) {
          const col = coalesceMaxMatch[1]
          const defaultVal = parseInt(coalesceMaxMatch[2])
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : col.split('.').pop()
          const vals = groupRows.map(r => parseFloat(resolveRef(col, r))).filter(v => !isNaN(v))
          const max = vals.length > 0 ? Math.max(...vals) : null
          baseRow[alias] = max !== null ? max : defaultVal
          continue
        }
        // COALESCE(SUM(col), 0)
        const coalesceSumMatch = colExpr.match(/COALESCE\s*\(\s*SUM\s*\(\s*(\w+(?:\.\w+)?)\s*\)\s*,\s*(\d+)\s*\)/i)
        if (coalesceSumMatch) {
          const col = coalesceSumMatch[1]
          const defaultVal = parseInt(coalesceSumMatch[2])
          const aliasMatch = colExpr.match(/as\s+(\w+)/i)
          const alias = aliasMatch ? aliasMatch[1] : col.split('.').pop()
          const sum = groupRows.reduce((s, r) => s + (parseFloat(resolveRef(col, r)) || 0), 0)
          baseRow[alias] = sum || defaultVal
          continue
        }
      }
      rows.push(baseRow)
    }
  }

  // 处理子查询列 (SELECT COUNT(*) FROM games WHERE kp_id = kp.id AND status='published')
  if (subqueryCols.length > 0) {
    for (const row of rows) {
      for (let i = 0; i < subqueryCols.length; i++) {
        const sc = subqueryCols[i]
        // 解析子查询的 WHERE 条件，替换引用为当前行值
        let subWhere = sc.where
        // 替换 "kp_id = kp.id" -> "kp_id = <actual value>"
        subWhere = subWhere.replace(/(\w+)\s*=\s*(\w+)\.(\w+)/g, (match, leftCol, refAlias, refCol) => {
          const val = row[`${refAlias}.${refCol}`] !== undefined ? row[`${refAlias}.${refCol}`] : row[refCol]
          return `${leftCol} = '${val}'`
        })
        // 在 store 中查询
        const subKey = tableKey(sc.table)
        const subTable = store[subKey]
        if (Array.isArray(subTable)) {
          const subCount = subTable.filter(r => {
            return evalCondition(subWhere, r)
          }).length
          row[sc.alias] = subCount
        }
      }
    }
  }

  // 应用 ORDER BY
  if (orderPart) {
    const orderCols = parseOrderBy(orderPart)
    rows.sort((a, b) => {
      for (const { col, dir } of orderCols) {
        let aVal = resolveRef(col, a)
        let bVal = resolveRef(col, b)
        if (aVal === undefined) aVal = null
        if (bVal === undefined) bVal = null
        if (aVal === bVal) continue
        let cmp = 0
        if (aVal === null) cmp = -1
        else if (bVal === null) cmp = 1
        else if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal
        else cmp = String(aVal).localeCompare(String(bVal))
        return dir === 'DESC' ? -cmp : cmp
      }
      return 0
    })
  }

  // 应用 LIMIT
  if (limitPart) {
    const limit = parseInt(limitPart)
    rows = rows.slice(0, limit)
  }

  // 处理 SELECT * 和列选择
  if (selectPart.trim() !== '*') {
    const colDefs = parseSelectColumns(selectPart)
    rows = rows.map(row => {
      const result = {}
      for (const { expr, alias } of colDefs) {
        if (expr.startsWith('__SUBCOL_')) {
          // 子查询列已经在上面处理了
          result[alias] = row[alias]
        } else {
          const val = resolveRef(expr, row)
          result[alias] = val
        }
      }
      return result
    })
  } else {
    // SELECT * - 移除 alias 前缀的重复键
    rows = rows.map(row => {
      const result = {}
      for (const [k, v] of Object.entries(row)) {
        if (k.includes('.')) {
          const shortKey = k.split('.').pop()
          if (!(shortKey in result)) result[shortKey] = v
        } else {
          result[k] = v
        }
      }
      return result
    })
  }

  return rows
}

/**
 * 评估简单条件字符串 (用于子查询)
 */
function evalCondition(whereStr, row) {
  const conditions = whereStr.split(/\s+AND\s+/i)
  return conditions.every(cond => {
    const m = cond.match(/(\w+)\s*=\s*'([^']*)'/)
    if (m) {
      return String(row[m[1]]) === m[2]
    }
    return true
  })
}

/**
 * 比较函数
 */
function compare(a, op, b) {
  if (a === undefined || a === null) {
    if (op === '=' && (b === undefined || b === null)) return true
    if (op === '!=' && b !== undefined && b !== null) return true
    return false
  }
  switch (op) {
    case '=': return String(a) === String(b)
    case '!=': case '<>': return String(a) !== String(b)
    case '>': return Number(a) > Number(b)
    case '<': return Number(a) < Number(b)
    case '>=': return Number(a) >= Number(b)
    case '<=': return Number(a) <= Number(b)
    default: return true
  }
}

/**
 * 执行 INSERT
 */
function executeInsert(sql, params, store) {
  // INSERT INTO table (col1, col2, ...) VALUES (?, ?, ...)
  const m = sql.match(/INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s+VALUES\s*\(([^)]+)\)/i)
    || sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s+VALUES\s*\(([^)]+)\)/i)
  if (!m) return { changes: 0, lastInsertRowid: 0 }

  const table = m[1]
  const cols = m[2].split(',').map(c => c.trim())
  const valuePlaceholders = m[3].split(',').map(v => v.trim())

  const key = tableKey(table)
  if (!store[key]) store[key] = []

  const row = {}
  let paramIdx = 0
  for (let i = 0; i < cols.length; i++) {
    if (valuePlaceholders[i] === '?') {
      row[cols[i]] = params[paramIdx++] !== undefined ? params[paramIdx - 1] : null
    } else {
      // 字面值
      row[cols[i]] = valuePlaceholders[i].replace(/^['"]|['"]$/g, '')
    }
  }

  // INSERT OR IGNORE - 检查主键是否已存在
  if (sql.includes('OR IGNORE')) {
    const existing = store[key].find(r => r.id === row.id)
    if (existing) return { changes: 0, lastInsertRowid: 0 }
  }

  store[key].push(row)
  return { changes: 1, lastInsertRowid: store[key].length }
}

/**
 * 执行 UPDATE
 */
function executeUpdate(sql, params, store) {
  // UPDATE table SET col1 = expr1, col2 = expr2 WHERE ...
  const m = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)\s+WHERE\s+(.*)/i)
  if (!m) return { changes: 0 }

  const table = m[1]
  const setPart = m[2]
  const wherePart = m[3]

  const key = tableKey(table)
  if (!store[key] || !Array.isArray(store[key])) return { changes: 0 }

  // 解析 SET 子句
  const setClauses = setPart.split(',').map(c => c.trim())
  let changes = 0

  for (const row of store[key]) {
    // 检查 WHERE 条件
    if (wherePart) {
      const { conditions } = parseWhere(wherePart)
      let match = true
      let paramIdx = 0
      for (const cond of conditions) {
        if (cond === '1=1') continue
        const compMatch = cond.match(/(\S+)\s*(!=|<>|>=|<=|=|>|<)\s*\?/)
        if (compMatch) {
          const col = compMatch[1]
          const op = compMatch[2]
          const val = params[paramIdx++]
          if (!compare(row[col], op, val)) { match = false; break }
          continue
        }
      }
      if (!match) continue
    }

    // 应用 SET
    let paramIdx2 = 0
    for (const clause of setClauses) {
      // col = col + 1
      const incMatch = clause.match(/(\w+)\s*=\s*(\w+)\s*\+\s*(\d+)/)
      if (incMatch) {
        const col = incMatch[1]
        const refCol = incMatch[2]
        const inc = parseInt(incMatch[3])
        row[col] = (parseFloat(row[refCol]) || 0) + inc
        continue
      }
      // col = MAX(0, col - 1)
      const maxMatch = clause.match(/(\w+)\s*=\s*MAX\s*\(\s*(\d+)\s*,\s*(\w+)\s*-\s*(\d+)\s*\)/i)
      if (maxMatch) {
        const col = maxMatch[1]
        const minVal = parseInt(maxMatch[2])
        const refCol = maxMatch[3]
        const dec = parseInt(maxMatch[4])
        row[col] = Math.max(minVal, (parseFloat(row[refCol]) || 0) - dec)
        continue
      }
      // col = ?
      const paramMatch = clause.match(/(\w+)\s*=\s*\?/)
      if (paramMatch) {
        const col = paramMatch[1]
        row[col] = params[paramIdx2++]
        continue
      }
      // col = 'literal'
      const litMatch = clause.match(/(\w+)\s*=\s*'([^']*)'/)
      if (litMatch) {
        row[litMatch[1]] = litMatch[2]
        continue
      }
      // col = datetime("now","localtime")
      const dtMatch = clause.match(/(\w+)\s*=\s*datetime\s*\(/i)
      if (dtMatch) {
        row[dtMatch[1]] = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
        continue
      }
    }
    changes++
  }

  return { changes }
}

/**
 * 执行 DELETE
 */
function executeDelete(sql, params, store) {
  const m = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.*)/i)
  if (!m) return { changes: 0 }

  const table = m[1]
  const wherePart = m[2]
  const key = tableKey(table)
  if (!store[key] || !Array.isArray(store[key])) return { changes: 0 }

  const { conditions } = parseWhere(wherePart)
  const before = store[key].length

  store[key] = store[key].filter(row => {
    let paramIdx = 0
    for (const cond of conditions) {
      const compMatch = cond.match(/(\S+)\s*(!=|<>|>=|<=|=|>|<)\s*\?/)
      if (compMatch) {
        const col = compMatch[1]
        const op = compMatch[2]
        const val = params[paramIdx++]
        if (!compare(row[col], op, val)) return true // 保留
        continue
      }
    }
    return false // 删除
  })

  return { changes: before - store[key].length }
}

/**
 * prepare() 返回一个对象，有 .all(), .get(), .run() 方法
 */
function prepare(sql) {
  return {
    all(...params) {
      const flatParams = params.flat()
      return executeSQL(sql, flatParams)
    },
    get(...params) {
      const flatParams = params.flat()
      const results = executeSQL(sql, flatParams)
      return results.length > 0 ? results[0] : undefined
    },
    run(...params) {
      const flatParams = params.flat()
      return executeSQL(sql, flatParams)
    }
  }
}

module.exports = { prepare, getStore }
