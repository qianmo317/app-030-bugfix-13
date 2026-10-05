/**
 * 号型规则引擎：档位对齐、型别判定、号型代码生成。
 * 规格书 §8 要求：档位与型别阈值一律从 SizeRule 读取，组件里不得硬编码。
 */
import rawBuiltinRules from '../data/size-rules.json'
import type { BoundaryRule, FitRange, Gender, PatternFit, SizeRule } from './types'
import { cmToHalfUnits, formatHalfUnits, halfUnitsToCm } from './precision'

export const BUILTIN_RULES = rawBuiltinRules as unknown as SizeRule[]
export const DEFAULT_RULE_VERSION = BUILTIN_RULES[0]?.version ?? 'v1.0.0'

function truncDiv(value: number, divisor: number): number {
  return Math.trunc(value / divisor)
}

/**
 * 档位对齐，入参全部是「半厘米整数」：
 * boundaryRule = round_up → 正/负半档都向较大档靠（167.5 归 170）
 * boundaryRule = nearest  → 正/负半档都向离锚点较近且数值较小的档靠（167.5 归 165）
 * 不用浮点商和 Math.round，避免 0.3 这类中间值经反复编辑后在相邻档之间跳动。
 */
export function alignToStep(
  units: number,
  anchorUnits: number,
  stepUnits: number,
  boundary: BoundaryRule
): number {
  if (!Number.isInteger(units) || !Number.isInteger(anchorUnits) || !Number.isInteger(stepUnits) || stepUnits <= 0) {
    return units
  }
  const delta = units - anchorUnits
  const quotient = truncDiv(delta, stepUnits)
  const remainder = delta - quotient * stepUnits
  if (remainder > 0) {
    const twice = remainder * 2
    const advance = twice > stepUnits || (twice === stepUnits && boundary === 'round_up')
    return anchorUnits + (quotient + (advance ? 1 : 0)) * stepUnits
  }
  if (remainder < 0) {
    const twice = remainder * 2
    const retreat = twice < -stepUnits || (twice === -stepUnits && boundary === 'nearest')
    return anchorUnits + (quotient - (retreat ? 1 : 0)) * stepUnits
  }
  return anchorUnits + quotient * stepUnits
}

export function heightCodeUnits(rule: SizeRule, heightCm: number): number {
  return alignToStep(
    cmToHalfUnits(heightCm),
    cmToHalfUnits(rule.heightAnchor),
    cmToHalfUnits(rule.heightStepCm),
    rule.boundaryRule
  )
}

export function chestCodeUnits(rule: SizeRule, chestCm: number): number {
  return alignToStep(
    cmToHalfUnits(chestCm),
    cmToHalfUnits(rule.chestAnchor),
    cmToHalfUnits(rule.chestStepCm),
    rule.boundaryRule
  )
}

export function rangesFor(rule: SizeRule, gender: Gender): FitRange[] {
  return rule.fitByChestWaistDiff.find((item) => item.gender === gender)?.ranges ?? []
}

/** 型别判定：胸腰差落在哪个区间（区间端点为闭区间，来自 SizeRule）。入参为半厘米整数。 */
export function resolveFitUnits(
  rule: SizeRule,
  gender: Gender,
  diffUnits: number
): { fit: PatternFit; range: FitRange } | null {
  const ranges = rangesFor(rule, gender)
  for (const range of ranges) {
    const minUnits = cmToHalfUnits(range.minCm)
    const maxUnits = cmToHalfUnits(range.maxCm)
    if (diffUnits >= minUnits && diffUnits <= maxUnits) return { fit: range.fit, range }
  }
  return null
}

/** 兼容按 cm 调用的旧入口；规则判定内部优先使用 resolveFitUnits。 */
export function resolveFit(
  rule: SizeRule,
  gender: Gender,
  diffCm: number
): { fit: PatternFit; range: FitRange } | null {
  return resolveFitUnits(rule, gender, cmToHalfUnits(diffCm))
}

export function makeSizeCode(heightUnits: number, chestUnits: number, fit: PatternFit): string {
  return `${formatHalfUnits(heightUnits)}/${formatHalfUnits(chestUnits)}${fit}`
}

/** 由身高 / 胸围 / 性别生成号型代码，胸腰差不在任何区间内时返回 null（未归并） */
export function buildSizeCode(
  rule: SizeRule,
  gender: Gender,
  heightCm: number,
  chestCm: number,
  waistCm: number
): { sizeCode: string; fit: PatternFit; heightCode: number; chestCode: number; diffCm: number } | null {
  const diffUnits = cmToHalfUnits(chestCm) - cmToHalfUnits(waistCm)
  const matched = resolveFitUnits(rule, gender, diffUnits)
  if (!matched) return null
  const hUnits = heightCodeUnits(rule, heightCm)
  const cUnits = chestCodeUnits(rule, chestCm)
  return {
    sizeCode: makeSizeCode(hUnits, cUnits, matched.fit),
    fit: matched.fit,
    heightCode: halfUnitsToCm(hUnits),
    chestCode: halfUnitsToCm(cUnits),
    diffCm: halfUnitsToCm(diffUnits)
  }
}

/** 人工覆写号型的格式校验：170/88A、175/96.5B 之类 */
export function normalizeSizeCodeInput(input: string): string {
  return input.replace(/\s+/g, '').replace(/[／]/g, '/').replace(/，/g, '/').toUpperCase()
}

export function isSizeCodeValid(rule: SizeRule, input: string): boolean {
  const code = normalizeSizeCodeInput(input)
  if (!/^\d+(\.5)?\/\d+(\.5)?[YABC]$/.test(code)) return false
  const fit = code.slice(-1)
  return rule.fitByChestWaistDiff.some((group) => group.ranges.some((range) => range.fit === fit))
}

export function specialFlagLabel(rule: SizeRule, code: string | null): string {
  if (!code) return ''
  return rule.specialFlags.find((flag) => flag.code === code)?.label ?? code
}

export function ruleByVersion(rules: SizeRule[], version: string): SizeRule {
  return rules.find((rule) => rule.version === version) ?? rules[0] ?? BUILTIN_RULES[0]
}

export function fitRangeText(range: FitRange): string {
  return `${range.fit} ${range.minCm}~${range.maxCm}`
}

/** 拼接规则的文字说明，供 UI 展示（不硬编码数字，全部来自规则） */
export function describeAlign(rule: SizeRule, cm: number, kind: 'height' | 'chest'): string {
  const units = kind === 'height' ? heightCodeUnits(rule, cm) : chestCodeUnits(rule, cm)
  return `${formatHalfUnits(units)}`
}

/** 号码档位可对齐的候选值（用于 UI 说明与覆写建议） */
export function stepCandidates(anchor: number, step: number, min: number, max: number): number[] {
  const list: number[] = []
  for (let value = anchor; value <= max; value += step) if (value >= min) list.push(value)
  for (let value = anchor - step; value >= min; value -= step) list.unshift(value)
  return list.map((value) => Math.round(value * 10) / 10)
}
