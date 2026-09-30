'use client'

import { FormEvent, useEffect, useState } from 'react'

type RecordItem = { id: string; num1: number; num2: number; num3: number; createdAt: string }
type Digits = [number, number, number]
type CandidateColumns = { first: number[]; second: number[]; third: number[] }
const STORAGE_KEY = 'coze-number-round-records-v1'

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

export default function HomePage() {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [form, setForm] = useState<Digits>([0, 0, 0])
  const [amount, setAmount] = useState(5)
  const [candidates, setCandidates] = useState<CandidateColumns>({ first: [], second: [], third: [] })
  const [reference, setReference] = useState<Digits | null>(null)
  const [updatedAt, setUpdatedAt] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try { setRecords(JSON.parse(saved) as RecordItem[]) } catch { window.localStorage.removeItem(STORAGE_KEY) }
  }, [])

  useEffect(() => {
    if (records.length > 0) refreshRecommendations(records, amount)
  }, [records, amount])

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
    const next = [{ id: crypto.randomUUID(), num1: form[0], num2: form[1], num3: form[2], createdAt: new Date().toLocaleString('zh-CN') }, ...records]
    setRecords(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const sum = reference ? reference.reduce((total, digit) => total + digit, 0) : '--'
  const columns = [{ label: '第一位置', digits: candidates.first }, { label: '第二位置', digits: candidates.second }, { label: '第三位置', digits: candidates.third }]

  return <main className="app-shell">
    <header><strong>数字回合参考</strong><span>Coze Coding · Next.js</span></header>
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

    <section className="card"><h2>最近记录</h2><div className="history">{records.slice(0, 10).map((record) => <div key={record.id}>{record.num1} · {record.num2} · {record.num3}<small>合值 {record.num1 + record.num2 + record.num3} · {record.createdAt}</small></div>)}{records.length === 0 && <p className="empty">暂无记录</p>}</div></section>
  </main>
}
