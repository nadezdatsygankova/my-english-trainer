// Keep punctuation & spaces as separate tokens; normalize lookup key to lowercase
export function tokenizeText(text = "") {
  const tokens = [];
  const re = /([A-Za-z]+(?:'[A-Za-z]+)?)|(\s+)|([^\sA-Za-z]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) tokens.push({ type: "word", raw: m[1], key: m[1].toLowerCase() });
    else if (m[2]) tokens.push({ type: "space", raw: m[2] });
    else if (m[3]) tokens.push({ type: "punct", raw: m[3] });
  }
  return tokens;
}