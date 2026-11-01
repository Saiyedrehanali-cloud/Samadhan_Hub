/**
 * Text processing utilities for multi-signal complaint correlation.
 * Implements tokenization, stop-word filtering, Jaccard similarity,
 * TF-IDF Cosine similarity, and Jaro-Winkler string similarity.
 */

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
  "by", "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for",
  "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
  "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
  "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
  "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
  "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves",
  "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
  "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
  "why", "with", "you", "your", "yours", "yourself", "yourselves",
  // Common generic institutional words to drop from semantic matching
  "college", "institute", "institution", "engineering", "technology", "university", "department",
  "student", "students", "complaint", "regarding", "matter", "against", "application", "request",
]);

/**
 * Normalizes text: lowercase, punctuation removed, trimmed.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenizes text into a clean array of meaningful word stems/tokens.
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(" ")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Computes Jaccard Similarity between two texts: |A ∩ B| / |A ∪ B|.
 */
export function jaccardSimilarity(textA: string, textB: string): number {
  const tokensA = new Set(tokenize(textA));
  const tokensB = new Set(tokenize(textB));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersectionCount++;
  });

  const unionCount = tokensA.size + tokensB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Computes TF-IDF Cosine Similarity between two texts.
 */
export function tfIdfCosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Compute Term Frequencies
  const tfA: Record<string, number> = {};
  const tfB: Record<string, number> = {};
  const allTerms = new Set<string>();

  for (const t of tokensA) {
    tfA[t] = (tfA[t] || 0) + 1 / tokensA.length;
    allTerms.add(t);
  }

  for (const t of tokensB) {
    tfB[t] = (tfB[t] || 0) + 1 / tokensB.length;
    allTerms.add(t);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  allTerms.forEach((term) => {
    const valA = tfA[term] || 0;
    const valB = tfB[term] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Computes Jaro-Winkler string similarity (0.0 to 1.0)
 * Excellent for detecting fuzzy name matches (e.g. college names, titles).
 */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix boost
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(len1, len2));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  const p = 0.1; // scaling factor
  return jaro + prefix * p * (1 - jaro);
}

/**
 * Extracts top distinctive shared keywords between two case texts for explanation.
 */
export function extractSharedKeywords(textA: string, textB: string): string[] {
  const tokensA = new Set(tokenize(textA));
  const tokensB = new Set(tokenize(textB));
  const shared: string[] = [];

  tokensA.forEach((t) => {
    if (tokensB.has(t)) shared.push(t);
  });

  return shared.slice(0, 5);
}

