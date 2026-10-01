'use client'

import { FormEvent, useEffect, useState } from 'react'

type RecordItem = { id: string; roundNo?: string; num1: number; num2: number; num3: number; createdAt: string }
type Digits = [number, number, number]
type CandidateColumns = { first: number[]; second: number[]; third: number[] }
const STORAGE_KEY = 'coze-number-round-records-v1'
const PAGE_SIZE = 10
const EXPIRES_AT = new Date('2026-10-31T23:59:59+08:00').getTime()

type DigitField = keyof Pick<RecordItem, 'num1' | 'num2' | 'num3'>

function pickCandidateDigits(records: RecordItem[], field: DigitField, amount: number): number[] {
  const counts = Array.from({ length: 10 }, () => 0)
  const recentBoost = Array.from({ length: 10 }, () => 0)
  records.forEach((record, index) => {
    const digit = record[field]
    counts[digit] += 1
    recentBoost[digit] += Math.max(0, 24 - index) / 24
  })

  const available = Array.from({ length: 10 }, (_, digit) => digit)
  const picked: number[] = []
  while (picked.length < amount && available.length > 0) {
    const weights = available.map((digit) => 1 + counts[digit] * 3 + recentBoost[digit])
    let threshold = Math.random() * weights.reduce((total, weight) => total + weight, 0)
    const selectedIndex = weights.findIndex((weight) => {
      threshold -= weight
      return threshold <= 0
    })
    picked.push(available.splice(selectedIndex < 0 ? 0 : selectedIndex, 1)[0])
  }
  return picked
}

function drawReference(candidates: CandidateColumns, hasRecords: boolean): Digits | null {
  if (!hasRecords) return null
  return [candidates.first, candidates.second, candidates.third].map((options) => {
    return options[Math.floor(Math.random() * options.length)]
  }) as Digits
}

function formatRemaining(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000))
  const days = Math.floor(totalMinutes / 1_440)
  const hours = Math.floor((totalMinutes % 1_440) / 60)
  const minutes = totalMinutes % 60
  return `${days} 天 ${hours} 小时 ${minutes} 分钟`
}

export default function HomePage() {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [form, setForm] = useState<Digits>([0, 0, 0])
  const [amount, setAmount] = useState(5)
  const [candidates, setCandidates] = useState<CandidateColumns>({ first: [], second: [], third: [] })
  const [reference, setReference] = useState<Digits | null>(null)
  const [updatedAt, setUpdatedAt] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDigits, setEditingDigits] = useState<Digits>([0, 0, 0])
  const [now, setNow] = useState(0)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try { setRecords(JSON.parse(saved) as RecordItem[]) } catch { window.localStorage.removeItem(STORAGE_KEY) }
  }, [])

  useEffect(() => {
    const updateTime = () => setNow(Date.now())
    updateTime()
    const timer = window.setInterval(updateTime, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  function refreshRecommendations(source = records, candidateAmount = amount): void {
    const nextCandidates = {
      first: pickCandidateDigits(source, 'num1', candidateAmount),
      second: pickCandidateDigits(source, 'num2', candidateAmount),
      third: pickCandidateDigits(source, 'num3', candidateAmount),
    }
    setCandidates(nextCandidates)
    const next = drawReference(nextCandidates, source.length > 0)
    setReference(next)
    setUpdatedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
  }

  function saveRecord(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const now = new Date()
    const roundNo = `R${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const next = [{ id: crypto.randomUUID(), roundNo, num1: form[0], num2: form[1], num3: form[2], createdAt: now.toLocaleString('zh-CN') }, ...records]
    setRecords(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setHistoryPage(1)
  }

  function updateEditDigit(index: number, value: number): void {
    const next = [...editingDigits] as Digits
    next[index] = Math.min(9, Math.max(0, value))
    setEditingDigits(next)
  }

  function saveEdit(recordId: string): void {
    const next = records.map((record) => record.id === recordId ? { ...record, num1: editingDigits[0], num2: editingDigits[1], num3: editingDigits[2] } : record)
    setRecords(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setEditingId(null)
  }

  function deleteRecord(recordId: string): void {
    if (!window.confirm('确定删除这条记录吗？')) return
    const next = records.filter((record) => record.id !== recordId)
    setRecords(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setHistoryPage(Math.min(historyPage, Math.max(1, Math.ceil(next.length / PAGE_SIZE))))
  }

  const sum = reference ? reference.reduce((total, digit) => total + digit, 0) : '--'
  const columns = [{ label: '第一位置', digits: candidates.first }, { label: '第二位置', digits: candidates.second }, { label: '第三位置', digits: candidates.third }]
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const pageRecords = records.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE)
  const remaining = EXPIRES_AT - now

  if (now > 0 && remaining <= 0) {
    return <main className="expired-shell"><section className="expired-card"><span>使用期限结束</span><h1>模型已过期</h1><p>当前版本的 30 天使用期限已结束，请充值后获取续期版本。</p></section></main>
  }

  return <main className="app-shell">
    <header><strong>中奖 2.0版本</strong><span>剩余 {formatRemaining(remaining)} · Coze Coding</span></header>
    <section className="card">
      <h1>数字录入</h1>
      <form onSubmit={saveRecord} className="entry-form">
        {form.map((value, index) => <label key={index}>第 {index + 1} 位
          <input type="number" min="0" max="9" value={value} onChange={(event) => {
            const next = [...form] as Digits
            next[index] = Math.min(9, Math.max(0, Number(event.target.value)))
            setForm(next)
          }} />
        </label>)}
        <button type="submit">保存记录</button>
      </form>
      <p className="muted">已保存 {records.length} 条记录（保存在当前浏览器）</p>
    </section>

    <section className="card reference-card">
      <div className="section-head"><div><h2>三位参考组合</h2><p>基于已保存的历史记录生成 {updatedAt && `· 更新于 ${updatedAt}`}</p></div><button onClick={() => refreshRecommendations()}>开始推荐</button></div>
      <p className="notice">参考数字从各位置候选中生成，不代表或保证下一期结果。</p>
      {reference ? <div className="reference"><span>本期参考号码</span><div className="balls">{reference.map((digit, index) => <b key={index}>{digit}</b>)}</div><span>合值 <strong>{sum}</strong></span></div> : <p className="empty">请先录入一条记录。</p>}
      <div className="candidate-head"><h3>各位置候选数字</h3><label>每个位置推荐 <input type="number" min="1" max="9" value={amount} onChange={(event) => setAmount(Math.min(9, Math.max(1, Number(event.target.value))))} /> 个</label></div>
      <div className="candidate-grid">{columns.map((column) => <div className="candidate-column" key={column.label}><h3>{column.label}</h3><div>{column.digits.map((digit, index) => <span key={digit}><i>{index + 1}</i>{digit}</span>)}</div></div>)}</div>
    </section>

    <section className="card history-card">
      <div className="section-head"><div><h2>回合历史记录</h2><p>共 {records.length} 条，支持编辑与删除</p></div></div>
      {records.length === 0 ? <p className="empty">暂无记录</p> : <>
        <div className="table-wrap"><table><thead><tr><th>回合编号</th><th>第一位置</th><th>第二位置</th><th>第三位置</th><th>总和</th><th>录入时间</th><th>操作</th></tr></thead>
          <tbody>{pageRecords.map((record) => {
            const editing = editingId === record.id
            const digits = [record.num1, record.num2, record.num3]
            return <tr key={record.id}><td>{record.roundNo ?? record.id.slice(0, 8)}</td>
              {digits.map((digit, index) => <td key={index}>{editing ? <input aria-label={`编辑第${index + 1}位`} type="number" min="0" max="9" value={editingDigits[index]} onChange={(event) => updateEditDigit(index, Number(event.target.value))} /> : <span className="digit-cell">{digit}</span>}</td>)}
              <td className="sum-cell">{editing ? editingDigits.reduce((total, digit) => total + digit, 0) : record.num1 + record.num2 + record.num3}</td><td>{record.createdAt}</td>
              <td className="record-actions">{editing ? <><button onClick={() => saveEdit(record.id)}>保存</button><button className="secondary" onClick={() => setEditingId(null)}>取消</button></> : <><button onClick={() => { setEditingId(record.id); setEditingDigits([record.num1, record.num2, record.num3]) }}>编辑</button><button className="danger" onClick={() => deleteRecord(record.id)}>删除</button></>}</td></tr>
          })}</tbody></table></div>
        <nav className="pagination" aria-label="历史记录分页"><span>共 {records.length} 条</span><button className="secondary" disabled={historyPage === 1} onClick={() => setHistoryPage(historyPage - 1)}>上一页</button><span>{historyPage} / {totalPages}</span><button className="secondary" disabled={historyPage === totalPages} onClick={() => setHistoryPage(historyPage + 1)}>下一页</button></nav>
      </>}
    </section>
  </main>
}
