// So'z darajasidagi diff (LCS) — typing mashqida xatolarni ko'rsatish uchun.
export const normWord = (w) => w.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^\w']/g, '')

export function wordDiff(target, typed) {
  const a = target.split(/\s+/).filter(Boolean)
  const b = typed.split(/\s+/).filter(Boolean)
  const A = a.map(normWord)
  const B = b.map(normWord)
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])

  const out = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (A[i] === B[j]) {
      out.push({ t: 'ok', w: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ t: 'missing', w: a[i++] })
    else out.push({ t: 'extra', w: b[j++] })
  }
  while (i < a.length) out.push({ t: 'missing', w: a[i++] })
  while (j < b.length) out.push({ t: 'extra', w: b[j++] })

  const correct = dp[0][0]
  const accuracy = a.length ? Math.round((correct / Math.max(a.length, b.length)) * 100) : 0
  return { parts: out, accuracy }
}
