/** Models that are not general text chat models, so they are never picked as a default. */
const NOT_CHAT = /embedding|aqa|imagen|tts|image|live|audio|vision|robotics|computer-use|veo|gemma|learnlm/i

/**
 * How good a default a Gemini model is. Aliases that always point at the current model are best, because they keep
 * working when Google retires a version. Then stable (not preview or experimental) Flash models, newest version first.
 */
function score(name: string) {
  let s = 0
  if (name === 'gemini-flash-latest') s += 1000
  if (/flash/.test(name) && !/lite/.test(name)) s += 200
  if (/lite/.test(name)) s += 100
  if (/preview|exp/.test(name)) s -= 150
  const v = name.match(/gemini-(\d+(?:\.\d+)?)/)
  if (v) s += Number(v[1]) * 10
  return s
}

/** Picks the best Gemini model from the names an account can use, or null if none is suitable. */
export function pickGeminiModel(names: string[]): string | null {
  const ok = names.map((n) => n.replace(/^models\//, '')).filter((n) => /^gemini-/.test(n) && !NOT_CHAT.test(n))
  if (!ok.length) return null
  return [...ok].sort((a, b) => score(b) - score(a))[0]
}
