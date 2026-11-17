// Builds the WhatsApp / tear-off flyer SVG (1080 x 1400 content, on a 1400 square canvas for qlmanage).
const fs = require('fs');
const QR = require('qrcode');
const ROOT = '/Users/akhileshdwivedi/Desktop/Github-divinelight-biz';
const out = process.argv[2];

const inner = (file) => fs.readFileSync(file, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const logo = inner(`${ROOT}/assets/logo.svg`);
const lotus = inner(`${ROOT}/print-assets/lotus-icon.svg`);

// Short original lines about holistic healing; shuffled so each tab gets a different one.
const quotes = [
  'Breathe. Heal. Begin again.',
  'Healing begins within.',
  'Calm is your true nature.',
  'Release. Restore. Renew.',
  'Mind, body, soul aligned.',
  'Let your inner light shine.',
  'Peace is a daily practice.',
  'Your energy, restored.',
];
// KEEP_ORDER="quote1|quote2|..." reuses an earlier shuffle instead of reshuffling.
if (process.env.KEEP_ORDER) quotes.splice(0, quotes.length, ...process.env.KEEP_ORDER.split('|'));
else for (let i = quotes.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [quotes[i], quotes[j]] = [quotes[j], quotes[i]]; }
const QR_URL = 'https://divinelighthealing-lifecoach.com/contact#book';

const F = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const W = 1080, H = 1400, TAB_TOP = 1096, TABS = 8, TW = W / TABS;

QR.toString(QR_URL, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#2E2A3A', light: '#FFFFFF' } }).then((qrSvg) => {
  const qrBox = qrSvg.match(/viewBox="([^"]+)"/)[1];
  const qr = qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

  let tabs = '';
  for (let i = 0; i < TABS; i++) {
    const x = i * TW, cx = x + TW / 2;
    if (i > 0) tabs += `  <line x1="${x}" y1="${TAB_TOP}" x2="${x}" y2="${H}" stroke="#A89BC9" stroke-width="2" stroke-dasharray="8 7"/>\n`;
    tabs += `  <svg x="${cx - 24}" y="${TAB_TOP + 12}" width="48" height="48" viewBox="80 92 240 240">${lotus}</svg>\n`;
    tabs += `  <g transform="translate(${cx},${TAB_TOP + 186}) rotate(-90)">
    <text x="0" y="-16" text-anchor="middle" font-family="${F}" font-size="24" font-weight="700" fill="#2E2A3A">(971) 246-4628</text>
    <text x="0" y="13" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="17" fill="#5E5180">${quotes[i]}</text>
    <text x="0" y="36" text-anchor="middle" font-family="${F}" font-size="14" fill="#5C566E">Call or text · not WhatsApp</text>
  </g>\n`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1400" viewBox="0 0 1400 1400">
 <rect width="1400" height="1400" fill="#F7F5FA"/>
 <g transform="translate(160,0)">
  <rect width="${W}" height="570" fill="#E9E4F1"/>
  <svg x="428" y="14" width="224" height="213" viewBox="0 0 400 380">${logo}</svg>
  <text x="540" y="298" text-anchor="middle" font-family="Georgia, serif" font-size="76" letter-spacing="9" fill="#2E2A3A">DIVINE LIGHT</text>
  <line x1="130" y1="340" x2="212" y2="340" stroke="#A89BC9" stroke-width="3"/>
  <line x1="868" y1="340" x2="950" y2="340" stroke="#A89BC9" stroke-width="3"/>
  <text x="540" y="354" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="42" fill="#5E5180">Healing and Life Coaching</text>
  <text x="540" y="428" text-anchor="middle" font-family="${F}" font-size="56" font-weight="700" fill="#2E2A3A">Feeling stressed, stuck</text>
  <text x="540" y="492" text-anchor="middle" font-family="${F}" font-size="56" font-weight="700" fill="#2E2A3A">or overwhelmed?</text>
  <text x="540" y="556" text-anchor="middle" font-family="${F}" font-size="56" font-weight="700" fill="#6E5F92">Find your calm again.</text>

  <text x="540" y="628" text-anchor="middle" font-family="${F}" font-size="35" font-weight="600" fill="#2E2A3A">Reiki · Life Coaching · Subconscious Programming</text>
  <text x="540" y="678" text-anchor="middle" font-family="${F}" font-size="35" font-weight="600" fill="#2E2A3A">Chakra Healing · Emotional Detox · Anxiety Support</text>

  <rect x="370" y="716" width="340" height="74" rx="37" fill="#6E5F92"/>
  <text x="540" y="765" text-anchor="middle" font-family="${F}" font-size="34" font-weight="700" fill="#FFFFFF">Book a call</text>


  <rect x="36" y="830" width="1008" height="176" rx="24" fill="#FFFFFF" stroke="#D9D0E8" stroke-width="2"/>
  <svg x="62" y="846" width="144" height="144" viewBox="${qrBox}" shape-rendering="crispEdges">${qr}</svg>
  <text x="236" y="893" font-family="${F}" font-size="36" font-weight="700" fill="#2E2A3A">Scan to book a call</text>
  <text x="236" y="942" font-family="${F}" font-size="33" font-weight="500" fill="#54467A">divinelighthealing-lifecoach.com</text>
  <text x="236" y="984" font-family="${F}" font-size="28" fill="#5C566E">info@divinelighthealing-lifecoach.com</text>

  <text x="540" y="1048" text-anchor="middle" font-family="${F}" font-size="44" font-weight="700" fill="#2E2A3A">Call or text (971) 246-4628</text>
  <text x="540" y="1082" text-anchor="middle" font-family="${F}" font-size="25" fill="#5C566E">Please call or send a regular text. This number is not on WhatsApp.</text>

  <rect x="0" y="${TAB_TOP}" width="${W}" height="${H - TAB_TOP}" fill="#FFFFFF"/>
  <line x1="0" y1="${TAB_TOP}" x2="${W}" y2="${TAB_TOP}" stroke="#A89BC9" stroke-width="2" stroke-dasharray="8 7"/>
${tabs} </g>
</svg>`;
  fs.writeFileSync(out, svg);
  console.log('quotes (left to right):\n' + quotes.map((q, i) => `${i + 1}. ${q}`).join('\n'));
});
