/**
 * 0.5cm 精度工具。
 * 规格书 §8 精度要求：身高 / 胸围 / 腰围 按 0.5cm 精度存储，
 * 判定时统一换算成「半厘米整数」再比较，避免浮点相等带来的误差。
 */

export function roundToHalfCm(value: number): number {
  return Math.round(value * 2) / 2
}

export function cmToHalfUnits(cm: number): number {
  return Math.round(cm * 2)
}

export function halfUnitsToCm(units: number): number {
  return units / 2
}

/** 把档位数值格式化成展示文本 */
export function formatHalfUnits(units: number): string {
  return String(Math.round(halfUnitsToCm(units)))
}

export function formatCm(cm: number | null | undefined): string {
  if (cm === null || cm === undefined || !Number.isFinite(cm)) return ''
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1)
}

/**
 * 解析身高等长度输入（cm）。
 * 这是身高 / 胸围 / 腰围唯一的取值入口，页面、覆写候选、导出与判定都用这里返回的值，
 * 保证「按填进去的那个数算」与「先归到半厘米再算」是同一套取法：
 * - 允许首尾空白、首尾正负号、小数点，以及千分位分隔（1,070 / 1，070 / 1 070）；
 * - 允许尾部单位（cm、CM、ｃｍ、厘米、公分）；
 * - 数字中间夹了其它字符（170x、1,70、1.7.0、12cm3）一律视为无效，返回 null；
 * - 空值 / 非数字 / 无穷值返回 null（由调用方判为缺失，绝不当成 0 参与归并）；
 * - 有效值统一按 0.5cm 精度取整（规格书 §8：存储与判定都用 0.5 的整数倍）。
 */
export function parseLengthCm(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  let text = String(raw).trim()
  if (text === '') return null
  // 全角数字 / 字母 / 符号统一归一为半角（U+FF01~FF5E 与 ASCII 差 0xFEE0）
  text = text.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
  const sign = text.startsWith('-') ? -1 : 1
  if (text[0] === '-' || text[0] === '+') text = text.slice(1).trim()
  if (text === '') return null
  text = text
    .replace(/\s+/g, '')
    .replace(/(?:cm|厘米|公分)$/i, '')
  if (text === '') return null
  // 标准千分位（1,070 / 1,070.5）去掉逗号；单独一个逗号不是小数点（1,70 → 无效）
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) {
    text = text.replace(/,/g, '')
  } else if (text.includes(',')) {
    return null
  }
  if (!/^\d+(\.\d+)?$/.test(text)) return null
  const value = sign * Number(text)
  if (!Number.isFinite(value)) return null
  return roundToHalfCm(value)
}

/** 体重按 0.1kg 精度解析（仅用于建议号型参考） */
export function parseWeightKg(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw * 10) / 10 : null
  const text = raw
    .trim()
    .replace(/[kKｇgG公斤千克]/g, '')
    .replace(/[,，]/g, '.')
    .replace(/[^0-9.\-]/g, '')
  if (text === '' || text === '-' || text === '.') return null
  const value = Number(text)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 10) / 10
}

/** 身高体重派生值：胸腰差（cm），用半厘米整数相减后换算，保证精确 */
export function chestWaistDiffCm(chestCm: number, waistCm: number): number {
  return (cmToHalfUnits(chestCm) - cmToHalfUnits(waistCm)) / 2
}