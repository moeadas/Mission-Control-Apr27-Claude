export function sanitizePromptValue(value: string | undefined | null) {
  if (!value) return ''

  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/```/g, '')
    .replace(/\{\{/g, '[')
    .replace(/\}\}/g, ']')
    .replace(/\b(ignore|disregard|override)\b\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/gi, '[removed]')
    .replace(/\b(system|developer|assistant)\s+prompt\b/gi, '[removed]')
    .replace(/\bact\s+as\b/gi, '[removed]')
    .trim()
}

export function sanitizePromptProfile<T extends Record<string, string>>(profile: T | undefined) {
  if (!profile) return undefined

  return Object.fromEntries(
    Object.entries(profile).map(([key, value]) => [key, sanitizePromptValue(value)])
  ) as T
}
