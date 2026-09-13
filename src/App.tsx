import { useEffect, useMemo, useState } from 'react'
import { calculate, dateInputValue, dateLabel, initialForm, initialProjection, project, statutoryRetirementDate, type FormValues, type ProjectionValues } from './calculator'
import { policy } from './policy'
import './styles.css'

type Mode = 'near' | 'plan'
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 })
const number = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{help && <small>{help}</small>}</label>
}

export default function App() {
  const [mode, setMode] = useState<Mode>('near')
  const [form, setForm] = useState<FormValues>(initialForm)
  const [projection, setProjection] = useState<ProjectionValues>(initialProjection)
  useEffect(() => {
    const statutoryDate = statutoryRetirementDate(form.birthDate, form.category)
    const automaticDate = statutoryDate ? dateInputValue(statutoryDate) : ''
    setForm((old) => old.retirementDate === automaticDate ? old : ({ ...old, retirementDate: automaticDate }))
  }, [form.birthDate, form.category])
  const result = useMemo(() => calculate(form), [form])
  const future = useMemo(() => mode === 'plan' ? project(form, projection) : null, [mode, form, projection])
  const set = (key: keyof FormValues, value: string | boolean) => setForm((old) => ({ ...old, [key]: value }))
  const setProjectionValue = (key: keyof ProjectionValues, value: string) => setProjection((old) => ({ ...old, [key]: value }))
  const year = form.retirementDate ? new Date(`${form.retirementDate}T12:00:00`).getFullYear() : 0
  const legacy = !!form.firstInsuredDate && form.firstInsuredDate < '1996-01-01'
  const active = future ?? result
  const canShow = active.errors.length === 0

  return <main>
    <header className="hero">
      <div className="eyebrow">重庆 · 企业职工基本养老保险</div>
      <h1>养老金实时测算</h1>
      <p>仅用于初始基本养老金估算。输入不会上传、不会保存；最终待遇以社保经办机构核定为准。</p>
    </header>

    <section className="privacy"><strong>隐私承诺</strong>　所有计算均在当前浏览器内完成。刷新页面后，您填写的数据会清空。</section>
    <nav className="tabs" aria-label="计算模式">
      <button className={mode === 'near' ? 'active' : ''} onClick={() => setMode('near')}>临近退休测算</button>
      <button className={mode === 'plan' ? 'active' : ''} onClick={() => setMode('plan')}>长期退休规划</button>
    </nav>

    <div className="layout">
      <div className="form-stack">
        <section className="card">
          <h2>资格预检</h2>
          <div className="grid two">
            <Field label="出生日期"><input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></Field>
            <Field label="原法定退休年龄类别" help="请按人事身份选择，不按性别自动推断。"><select value={form.category} onChange={(e) => set('category', e.target.value)}><option value="male60">男职工（原 60 周岁）</option><option value="female55">女职工（原 55 周岁）</option><option value="female50">女职工（原 50 周岁）</option></select></Field>
            <Field label="计划退休日期" help="已按现行渐进式规则自动推算；你可按自己的规划修改。"><input type="date" value={form.retirementDate} onChange={(e) => set('retirementDate', e.target.value)} /></Field>
            <Field label="首次参加企业职工养老保险日期"><input type="date" value={form.firstInsuredDate} onChange={(e) => set('firstInsuredDate', e.target.value)} /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={form.specialCase} onChange={(e) => set('specialCase', e.target.checked)} /> 涉及特殊工种、病退、弹性退休或政策性增发</label>
        </section>

        <section className="card">
          <h2>{mode === 'near' ? '退休时的汇总缴费数据' : '截至当前的汇总缴费数据'}</h2>
          <p className="muted">参保类型：重庆企业职工基本养老保险（含以个人身份参保）。建议直接抄录社保权益记录。</p>
          <div className="grid two">
            <Field label="实际缴费月数" help="不含视同缴费年限。"><input inputMode="numeric" type="number" min="0" value={form.contributionMonths} onChange={(e) => set('contributionMonths', e.target.value)} placeholder="如：360" /></Field>
            <Field label="视同缴费月数" help="没有则填 0。"><input inputMode="numeric" type="number" min="0" value={form.deemedMonths} onChange={(e) => set('deemedMonths', e.target.value)} placeholder="如：24" /></Field>
            <Field label="本人平均缴费工资指数 Q" help="以社保权益记录中的汇总值为准。"><input type="number" min="0" step="0.0001" value={form.averageIndex} onChange={(e) => set('averageIndex', e.target.value)} placeholder="如：0.6009" /></Field>
            <Field label={mode === 'near' ? '退休时个人账户累计储存额 K（元）' : '当前个人账户累计储存额 K（元）'}><input type="number" min="0" value={form.accountBalance} onChange={(e) => set('accountBalance', e.target.value)} placeholder="如：25466.42" /></Field>
          </div>
        </section>

        {legacy && <section className="card legacy"><h2>1996 年前参保：过渡性养老金</h2><Field label="个人账户建立前缴费月数 M1" help="含建立个人账户前实际缴费和实行个人缴费前视同缴费；不含折算工龄。"><input type="number" min="0" value={form.preAccountMonths} onChange={(e) => set('preAccountMonths', e.target.value)} placeholder="如：208" /></Field></section>}

        <section className="card">
          <h2>{mode === 'near' ? '退休计发参数' : '未来规划假设'}</h2>
          <div className="grid two">
            <Field label={mode === 'near' ? '养老金计发基数 A（元/月）' : '当前养老金计发基数 A（元/月）'} help={`当前版本已固定为 ${policy.currentPensionCalculationBase.toLocaleString('zh-CN')} 元；变更政策参数请更新配置后重新发布。`}><input type="number" value={form.pensionBase} readOnly aria-readonly="true" /></Field>
            {mode === 'plan' && <>
              <Field label="预计年缴费基数（元）"><input type="number" min="0" value={projection.annualBase} onChange={(e) => setProjectionValue('annualBase', e.target.value)} placeholder="如：96000" /></Field>
              <Field label="个人账户划入比例（%）"><input type="number" min="0" step="0.1" value={projection.accountRate} onChange={(e) => setProjectionValue('accountRate', e.target.value)} /></Field>
              <Field label="预计账户年记账利率（%）" help={`当前版本已固定为 ${policy.currentAccountAnnualInterestRate}%`}><input type="number" value={projection.annualInterest} readOnly aria-readonly="true" /></Field>
              <Field label="预计计发基数年增长率（%）"><input type="number" min="0" step="0.1" value={projection.pensionBaseGrowth} onChange={(e) => setProjectionValue('pensionBaseGrowth', e.target.value)} /></Field>
            </>}
          </div>
        </section>
      </div>

      <aside className="result-panel">
        <section className="result-card">
          <div className="result-kicker">{mode === 'plan' ? '按未来假设估算' : '预计月基本养老金'}</div>
          <div className="total">{canShow ? money.format(active.total) : '—'}</div>
          <p>不含退休后历年调待、企业年金、医保待遇、个税及个案性增发。</p>
          {canShow && <div className="breakdown"><div><span>基础养老金</span><strong>{money.format(active.basic)}</strong></div><div><span>个人账户养老金</span><strong>{money.format(active.account)}</strong></div>{active.isLegacy && <div><span>过渡性养老金</span><strong>{money.format(active.transition)}</strong></div>}</div>}
        </section>
        <section className="card status">
          <h2>资格与参数</h2>
          {active.statutoryDate && <p>按现行渐进式规则推算的法定退休日：<strong>{dateLabel(active.statutoryDate)}</strong></p>}
          {form.retirementDate && <p>最低缴费年限：<strong>{active.minimumMonths} 个月（{number.format(active.minimumMonths / 12)} 年）</strong></p>}
          {canShow && <p>退休年龄约 {number.format(active.retirementAge)} 岁；个人账户计发月数 L：<strong>{active.divisor}</strong></p>}
          {result.errors.map((error) => <p className="error" key={error}>{error}</p>)}
          {active.notices.map((notice) => <p className="notice" key={notice}>{notice}</p>)}
        </section>
        {canShow && <section className="card formula"><h2>本次公式</h2><code>基础 = A × (1 + Q) ÷ 2 × M × 1%</code><code>账户 = K ÷ L</code>{active.isLegacy && <code>过渡 = A × (1 + Q) ÷ 2 × M1 × 1.4%</code>}</section>}
      </aside>
    </div>

    <section className="card sources"><h2>政策依据与版本</h2><p>政策参数版本 {policy.version}，更新于 {policy.updatedAt}。新年度计发基数必须由维护者核验后写入配置；本页不会将社保缴费基数误作养老金计发基数。</p><ul>{policy.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></section>
  </main>
}
