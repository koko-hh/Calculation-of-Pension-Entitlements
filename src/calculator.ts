import { policy } from './policy'

export type RetirementCategory = 'male60' | 'female55' | 'female50'
export type FormValues = {
  birthDate: string
  category: RetirementCategory
  retirementDate: string
  firstInsuredDate: string
  contributionMonths: string
  deemedMonths: string
  averageIndex: string
  accountBalance: string
  pensionBase: string
  preAccountMonths: string
  specialCase: boolean
}

export type ProjectionValues = {
  annualBase: string
  accountRate: string
  annualInterest: string
  pensionBaseGrowth: string
}

export const initialForm: FormValues = {
  birthDate: '', category: 'male60', retirementDate: '', firstInsuredDate: '',
  contributionMonths: '', deemedMonths: '', averageIndex: '', accountBalance: '',
  pensionBase: String(policy.currentPensionCalculationBase), preAccountMonths: '', specialCase: false,
}

export const initialProjection: ProjectionValues = {
  annualBase: '', accountRate: '8', annualInterest: String(policy.currentAccountAnnualInterestRate), pensionBaseGrowth: '0',
}

const dateAtNoon = (value: string) => new Date(`${value}T12:00:00`)
const addMonths = (date: Date, months: number) => {
  const copy = new Date(date)
  copy.setMonth(copy.getMonth() + months)
  return copy
}
const monthDiff = (later: Date, earlier: Date) =>
  (later.getFullYear() - earlier.getFullYear()) * 12 + later.getMonth() - earlier.getMonth()
export const dateLabel = (date: Date) => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
export const dateInputValue = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function statutoryRetirementDate(birthDate: string, category: RetirementCategory): Date | null {
  if (!birthDate) return null
  const birth = dateAtNoon(birthDate)
  const config = {
    male60: { baseAge: 60, start: '1965-01-01', interval: 4, cap: 36 },
    female55: { baseAge: 55, start: '1970-01-01', interval: 4, cap: 36 },
    female50: { baseAge: 50, start: '1975-01-01', interval: 2, cap: 60 },
  }[category]
  const baseline = new Date(birth)
  baseline.setFullYear(baseline.getFullYear() + config.baseAge)
  const sinceStart = monthDiff(birth, dateAtNoon(config.start))
  const delayedMonths = sinceStart < 0 ? 0 : Math.min(Math.floor(sinceStart / config.interval) + 1, config.cap)
  return addMonths(baseline, delayedMonths)
}

export function minimumContributionMonths(retirementYear: number) {
  if (retirementYear <= 2029) return 180
  return Math.min(240, 180 + (retirementYear - 2029) * 6)
}

export function divisorForAge(ageYears: number) {
  const age = Math.max(40, Math.min(70, Math.ceil(ageYears)))
  return policy.accountDivisors[age]
}

const num = (input: string) => Number(input)
const round = (value: number, digits: number) => Number(value.toFixed(digits))
export type Calculation = {
  errors: string[]; notices: string[]; isLegacy: boolean; pensionBase: number; totalMonths: number
  minimumMonths: number; statutoryDate: Date | null; divisor: number; basic: number; account: number
  transition: number; total: number; retirementAge: number
}

export function calculate(form: FormValues): Calculation {
  const errors: string[] = []
  const notices: string[] = []
  const required = [
    ['出生日期', form.birthDate], ['计划退休日期', form.retirementDate], ['首次参保日期', form.firstInsuredDate],
    ['实际缴费月数', form.contributionMonths], ['平均缴费工资指数', form.averageIndex],
    ['个人账户累计储存额', form.accountBalance], ['养老金计发基数 A', form.pensionBase],
  ] as const
  required.forEach(([label, value]) => { if (!value) errors.push(`请填写${label}`) })
  const actual = num(form.contributionMonths || '0')
  const deemed = num(form.deemedMonths || '0')
  const q = num(form.averageIndex || '0')
  const k = num(form.accountBalance || '0')
  const A = num(form.pensionBase || '0')
  const totalMonths = actual + deemed
  const isLegacy = !!form.firstInsuredDate && form.firstInsuredDate < '1996-01-01'
  const m1 = num(form.preAccountMonths || '0')
  if ([actual, deemed, q, k, A, m1].some((value) => !Number.isFinite(value) || value < 0)) errors.push('金额、指数和月数必须为非负数')
  if (q > 3) notices.push('平均缴费工资指数超过 3，请核对社保权益记录中的汇总值。')
  if (isLegacy && !form.preAccountMonths) errors.push('1996 年前参保者请填写个人账户建立前缴费年限 M1')
  if (isLegacy && m1 > totalMonths) errors.push('M1 不能大于累计缴费年限')
  const statutoryDate = statutoryRetirementDate(form.birthDate, form.category)
  const retirementDate = form.retirementDate ? dateAtNoon(form.retirementDate) : null
  if (statutoryDate && retirementDate && retirementDate < statutoryDate) notices.push(`计划日期早于按现行规则推算的法定退休日（${dateLabel(statutoryDate)}）；特殊/弹性提前退休需经办机构核定。`)
  const retirementYear = retirementDate?.getFullYear() ?? 0
  const minimumMonths = minimumContributionMonths(retirementYear)
  if (retirementDate && totalMonths < minimumMonths) notices.push(`累计缴费年限尚差 ${minimumMonths - totalMonths} 个月，暂不满足该退休年度按月领取的最低缴费年限。`)
  if (form.specialCase) notices.push('已标记特殊退休或政策性增发：本工具不计算该部分，请以经办机构核定为准。')
  const age = retirementDate && form.birthDate ? monthDiff(retirementDate, dateAtNoon(form.birthDate)) / 12 : 0
  const divisor = divisorForAge(age)
  // 渝人社发〔2010〕275号：Q、M、M1 保留四位小数，其余结果保留两位。
  const m = round(totalMonths / 12, 4)
  const m1Years = round(m1 / 12, 4)
  const indexedQ = round(q, 4)
  const calculationBase = A * (1 + indexedQ) / 2
  const basic = round(calculationBase * m * 0.01, 2)
  const account = round(k / divisor, 2)
  const transition = isLegacy ? round(calculationBase * m1Years * 0.014, 2) : 0
  return { errors, notices, isLegacy, pensionBase: A, totalMonths, minimumMonths, statutoryDate, divisor, basic, account, transition, total: round(basic + account + transition, 2), retirementAge: age }
}

export function project(form: FormValues, input: ProjectionValues) {
  const base = calculate(form)
  if (base.errors.length || !form.retirementDate) return null
  const retirement = dateAtNoon(form.retirementDate)
  const now = new Date()
  const months = Math.max(0, monthDiff(retirement, now))
  const years = months / 12
  const annualBase = num(input.annualBase)
  const accountRate = num(input.accountRate) / 100
  const interest = num(input.annualInterest) / 100
  const baseGrowth = num(input.pensionBaseGrowth) / 100
  if (![annualBase, accountRate, interest, baseGrowth].every(Number.isFinite) || annualBase < 0 || accountRate < 0) return null
  let futureBalance = num(form.accountBalance)
  for (let index = 0; index < Math.ceil(years); index += 1) futureBalance = futureBalance * (1 + interest) + annualBase * accountRate
  const futureForm = { ...form, accountBalance: String(futureBalance), pensionBase: String(num(form.pensionBase) * (1 + baseGrowth) ** years), contributionMonths: String(num(form.contributionMonths) + months) }
  return calculate(futureForm)
}
