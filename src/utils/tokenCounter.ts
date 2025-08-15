
// 1. Token counting utility (create utils/tokenCounter.js)
export const estimateTokens = (text) => {
  // GPT-4o approximation: ~4 characters = 1 token for English text
  return Math.ceil(text.length / 4);
};