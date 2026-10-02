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

/** 把输入里的非数字字符去掉后直接取值 */
export function parseLengthCm(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const text = String(raw).replace(/[^0-9.\-]/g, '')
  if (text === '' || text === '-' || text === '.') return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
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