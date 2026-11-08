/**
 * Currency Formatting and Conversion Utilities
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  TWD: 'NT$',
  USD: '$',
  JPY: '¥',
  EUR: '€',
  CNY: '¥',
  HKD: 'HK$',
  KRW: '₩',
  GBP: '£',
};

/**
 * 格式化金額顯示
 * @param amount 金額數值
 * @param currency 貨幣代碼，預設 TWD
 */
export function formatCurrency(amount: number, currency: string = 'TWD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const isNoDecimal = ['TWD', 'JPY', 'KRW'].includes(currency);
  const formattedNumber = new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: isNoDecimal ? 0 : 2,
    maximumFractionDigits: isNoDecimal ? 0 : 2,
  }).format(amount);

  return `${symbol} ${formattedNumber}`;
}

/**
 * 計算換算後的新台幣基準金額 (base_amount)
 * 基準幣別皆為 TWD
 */
export function calculateBaseAmount(amount: number, exchangeRate: number): number {
  return Math.round(amount * exchangeRate * 10000) / 10000;
}
