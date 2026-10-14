// Detects Filipino or Taglish so the assistant can answer in Filipino. One clearly Filipino word
// is enough; short words English also uses ("may", "na", "sa") only count in pairs.
// ponytail: word list, not a language model; extend the lists when a common phrasing is missed.
const strong = new Set(
  `ang ng mga yung yong yun ayaw bakit paano pano hindi wala walang po opo naman kasi lang ano sino
  saan kailan ito iyan yan dito ganito ganyan ko mo ba nga sana kumusta kamusta musta salamat sige oo
  sira nasira gumagana pwede puwede paki tulong patulong tulungan mabagal mainit nabura nakalimutan`
    .split(/\s+/)
    .filter(Boolean),
);
const weak = new Set(['may', 'na', 'sa', 'si', 'pag', 'kapag']);

export function isFilipino(text) {
  let weakHits = 0;
  for (const word of String(text)
    .toLowerCase()
    .match(/[a-z]+(?:-[a-z]+)*/g) || []) {
    // Verb prefixes on English roots are typical Taglish: nag-hang, mag-charge, i-restart.
    if (strong.has(word) || /^(nag|mag|naka|maka|i|ma)-[a-z]/.test(word)) return true;
    if (weak.has(word)) weakHits++;
  }
  return weakHits >= 2;
}
