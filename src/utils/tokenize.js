// Keep punctuation & spaces as separate tokens; normalize lookup key to lowercase
export function tokenizeText(text = "") {
  const tokens = [];
  // Use Unicode property escapes so that accented letters are treated as part of words
  const re = /([\p{L}]+(?:'[\p{L}]+)?)|(\s+)|([^\s\p{L}]+)/gu;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) tokens.push({ type: "word", raw: m[1], key: m[1].toLowerCase() });
    else if (m[2]) tokens.push({ type: "space", raw: m[2] });
    else if (m[3]) tokens.push({ type: "punct", raw: m[3] });
  }
  return tokens;
}