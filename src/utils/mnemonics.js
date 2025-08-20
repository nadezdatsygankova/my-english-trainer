// src/utils/mnemonics.js
// src/utils/mnemonics.js
export function suggestMnemonic(word) {
  if (!word) return "";
  // Example simple mnemonic
  return `Remember "${word}" by thinking of: ${word.split("").join("-")}`;
}