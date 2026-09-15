import { describe, expect, it } from 'vitest'
import { calculate, dateInputValue, divisorForAge, initialForm, initialProjection, minimumContributionMonths, project, statutoryRetirementDate } from './calculator'

const base = { ...initialForm, birthDate: '1959-01-01', category: 'male60' as const, retirementDate: '2019-01-01', firstInsuredDate: '2000-01-01', contributionMonths: '360', deemedMonths: '0', averageIndex: '1', accountBalance: '13900', pensionBase: '5000' }

describe('重庆企业职工养老金计算', () => {
  it('计算1996年后参保者的基础和个人账户养老金', () => {
    const result = calculate(base)
    expect(result.errors).toEqual([])
    expect(result.basic).toBe(1500)
    expect(result.account).toBe(100)
    expect(result.transition).toBe(0)
    expect(result.total).toBe(1600)
  })
  it('为1996年前参保者增加过渡性养老金', () => {
    const result = calculate({ ...base, firstInsuredDate: '1990-01-01', preAccountMonths: '120' })
    expect(result.transition).toBe(700)
    expect(result.total).toBe(2300)
  })
  it('按年龄取个人账户计发月数', () => { expect(divisorForAge(60)).toBe(139); expect(divisorForAge(55.1)).toBe(164) })
  it('从2030年开始逐步提高最低缴费年限', () => { expect(minimumContributionMonths(2029)).toBe(180); expect(minimumContributionMonths(2030)).toBe(186); expect(minimumContributionMonths(2039)).toBe(240) })
  it('对延迟退休起始出生月份应用递延', () => { expect(statutoryRetirementDate('1965-01-01', 'male60')?.toISOString().slice(0, 10)).toBe('2025-02-01') })
  it('将自动退休日期转换为表单日期格式', () => { expect(dateInputValue(statutoryRetirementDate('1975-01-01', 'female50')!)).toBe('2025-02-01') })
  it('在公开个案所披露的两位小数参数下贴近三项构成', () => {
    const result = calculate({ ...initialForm, birthDate: '1959-01-01', category: 'male60', retirementDate: '2015-01-01', firstInsuredDate: '1980-01-01', contributionMonths: '234', deemedMonths: '208', preAccountMonths: '208', averageIndex: '0.6009', accountBalance: '25466.42', pensionBase: '4737.67' })
    expect(Math.abs(result.basic - 1396.82)).toBeLessThanOrEqual(0.011)
    expect(Math.abs(result.account - 155.28)).toBeLessThanOrEqual(0.011)
    // 公开决定只展示 A 的两位小数，内部原始精度会导致末位分差。
    expect(Math.abs(result.transition - 920.25)).toBeLessThanOrEqual(0.011)
    expect(Math.abs(result.total - 2472.35)).toBeLessThanOrEqual(0.011)
  })
  it('出生日为 31 号时法定退休日不溢出到下个月', () => {
    // 1972-01-31 出生男职工：满 60 岁为 2032-01-31，再延迟 22 个月应落在 2033 年 11 月。
    expect(dateInputValue(statutoryRetirementDate('1972-01-31', 'male60')!)).toBe('2033-11-30')
    // 目标月天数不足时钳制到月末，而不是滚进 3 月。
    expect(dateInputValue(statutoryRetirementDate('1975-01-31', 'female50')!)).toBe('2025-02-28')
  })
  it('2 月 29 日出生者加满原法定年龄时同样钳制到月末', () => {
    // 1976-02-29 满 50 岁落在 2026 年 2 月（平年），再延迟 7 个月为 2026 年 9 月。
    expect(dateInputValue(statutoryRetirementDate('1976-02-29', 'female50')!)).toBe('2026-09-28')
  })
})

describe('长期退休规划', () => {
  const planForm = { ...initialForm, birthDate: '1990-01-01', category: 'male60' as const, retirementDate: '2050-01-01', firstInsuredDate: '2015-01-01', contributionMonths: '120', averageIndex: '1', accountBalance: '50000' }
  it('未填写预计年缴费基数时提示按「退休前不再缴费」估算', () => {
    const result = project(planForm, { ...initialProjection, annualBase: '' })!
    expect(result.notices.some((notice) => notice.includes('预计年缴费基数'))).toBe(true)
  })
  it('填写预计年缴费基数后不再提示，且个人账户养老金更高', () => {
    const empty = project(planForm, { ...initialProjection, annualBase: '' })!
    const filled = project(planForm, { ...initialProjection, annualBase: '64164' })!
    expect(filled.notices.some((notice) => notice.includes('预计年缴费基数'))).toBe(false)
    expect(filled.account).toBeGreaterThan(empty.account)
  })
})
