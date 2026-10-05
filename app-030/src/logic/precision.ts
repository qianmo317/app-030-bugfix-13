/**
 * 0.5cm 精度工具。
 * 规格书 §8 精度要求：身高 / 胸围 / 腰围 按 0.5cm 精度存储，
 * 判定时统一换算成「半厘米整数」再比较，避免浮点相等带来的误差。
 */

/**
 * 量体值的唯一入库取法：先归到 0.5cm，再参与校验、展示、覆写候选、导出和号型判定。
 */
export function normalizeLengthCm(value: number): number {
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

const LENGTH_UNIT_PATTERN = /(?:\s*(?:cm|CM|厘米|公分))?$/u

function hasValidThousands(text: string): boolean {
  return /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text) || /^[+-]?\d{1,3}(?:，\d{3})+(?:\.\d+)?$/.test(text)
}

/**
 * 解析长度（cm）。只接受数字、千分位和明确的 cm/厘米/公分单位；
 * 数字中间夹其他字符一律判为无效，避免把 17a0、abc123 静默读成 170/123。
 * 返回值已经按 0.5cm 归一化，空值返回 null（由调用方记为缺失，不能当 0 归并）。
 */
export function parseLengthCm(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null

  let text: string
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null
    text = String(raw)
  } else {
    text = raw.trim()
    if (text === '') return null
    const numericText = text.replace(LENGTH_UNIT_PATTERN, '')
    if (numericText === text && /[a-zA-Z一-鿿]$/u.test(text)) return null
    text = numericText
  }

  if (hasValidThousands(text)) text = text.replace(/[，,]/g, '')
  else if (/[，,]/.test(text)) return null

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null
  const value = Number(text)
  if (!Number.isFinite(value)) return null
  return normalizeLengthCm(value)
}

/** 体重按 0.1kg 精度解析（仅用于建议号型参考） */
export function parseWeightKg(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw * 10) / 10 : null
  let text = raw.trim()
  if (text === '') return null
  text = text.replace(/\s*(?:kg|KG|公斤|千克)$/u, '')
  if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text) || /^[+-]?\d{1,3}(?:，\d{3})+(?:\.\d+)?$/.test(text)) {
    text = text.replace(/[，,]/g, '')
  } else if (/[，,]/.test(text)) {
    return null
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null
  const value = Number(text)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 10) / 10
}

/** 身高体重派生值：胸腰差（cm），用半厘米整数相减后换算，保证精确 */
export function chestWaistDiffCm(
  chestCm: number | null | undefined,
  waistCm: number | null | undefined
): number | null {
  if (
    chestCm === null ||
    waistCm === null ||
    chestCm === undefined ||
    waistCm === undefined ||
    !Number.isFinite(chestCm) ||
    !Number.isFinite(waistCm)
  ) {
    return null
  }
  return (cmToHalfUnits(chestCm) - cmToHalfUnits(waistCm)) / 2
}
