/**
 * Calculate Levenshtein distance between two strings
 * @param a First string
 * @param b Second string
 * @returns Distance value
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Extract common patterns from a set of strings
 * @param strings Array of strings to analyze
 * @returns Common pattern if found
 */
export function extractCommonPattern(strings: string[]): string | null {
  if (!strings.length) return null
  if (strings.length === 1) return strings[0]

  // Find the shortest string to use as initial pattern
  let pattern = strings.reduce(
    (shortest, current) => (current.length < shortest.length ? current : shortest),
    strings[0],
  )

  // Iteratively reduce the pattern
  for (const str of strings) {
    let newPattern = ""
    let patternIndex = 0
    let strIndex = 0

    while (patternIndex < pattern.length && strIndex < str.length) {
      if (pattern[patternIndex] === str[strIndex] || pattern[patternIndex] === "*") {
        newPattern += pattern[patternIndex]
      } else {
        newPattern += "*"
      }

      patternIndex++
      strIndex++
    }

    // If pattern is longer than current string, truncate it
    if (patternIndex < pattern.length) {
      newPattern += "*"
    }

    pattern = newPattern
  }

  // Replace consecutive wildcards with a single one
  pattern = pattern.replace(/\*+/g, "*")

  // If pattern is just wildcards, return null
  if (pattern === "*" || pattern === "") return null

  return pattern
}
