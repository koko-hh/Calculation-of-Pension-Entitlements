export const policy = {
  version: '2026.09.13',
  updatedAt: '2026-09-13',
  // 当前产品采用的用户确认测算参数；更新时须同步更新版本、日期与依据。
  currentPensionCalculationBase: 8240,
  currentAccountAnnualInterestRate: 1.5,
  sources: [
    {
      title: '重庆市企业职工基本养老金新计发办法（渝人社发〔2010〕275号）',
      url: 'https://rlsbj.cq.gov.cn/zwgk_182/zfxxgkml/zcwj_145360/jfxzgfxwj/202004/t20200421_7099428.html',
    },
    {
      title: '个人账户养老金计发月数表',
      url: 'https://rlsbj.cq.gov.cn/zwgk_182/zfxxgkml/zcwj_145360/fzhsxwj/201512/W020240531539613448168.pdf',
    },
    {
      title: '渐进式延迟法定退休年龄决定及办法',
      url: 'https://rlsbj.cq.gov.cn/zwxx_182/tzgg/202409/t20240914_13630500.html',
    },
  ],
  accountDivisors: {
    40: 233, 41: 230, 42: 226, 43: 223, 44: 220, 45: 216, 46: 212,
    47: 208, 48: 204, 49: 199, 50: 195, 51: 190, 52: 185, 53: 180,
    54: 175, 55: 170, 56: 164, 57: 158, 58: 152, 59: 145, 60: 139,
    61: 132, 62: 125, 63: 117, 64: 109, 65: 101, 66: 93, 67: 84,
    68: 75, 69: 65, 70: 56,
  } as Record<number, number>,
  // 仅收录有官方个案明示的历史示例；新年度请由维护者核验后追加。
  pensionCalculationBaseByYear: { 2015: 4737.67 } as Record<number, number>,
}
