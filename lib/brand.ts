/**
 * PraktischAI — Brand Identity
 * Gebruik deze constanten in alle agents, templates en UI.
 */

export const BRAND = {
  name: 'PraktischAI',
  tagline: 'AI gidsen voor de gewone ondernemer',
  tagline_sub: 'Praktisch toepasbaar, meteen resultaat',
  domain: process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app',
  email: process.env.OWNER_EMAIL || 'info@praktischai.nl',

  colors: {
    primary: '#4f46e5',
    primaryDark: '#3730a3',
    primaryDeep: '#1e1b4b',
    accent: '#f59e0b',
    accentLight: '#fef3c7',
    text: '#1f2937',
    textMuted: '#6b7280',
    white: '#ffffff',
    bg: '#f9fafb',
    border: '#e5e7eb',
  },

  // Inline SVG logo (embed directly in HTML)
  logoSvg: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#4f46e5"/>
    <path d="M16 7C12.13 7 9 10.13 9 14c0 2.38 1.19 4.47 3 5.74V21a1 1 0 001 1h6a1 1 0 001-1v-1.26C21.81 18.47 23 16.38 23 14c0-3.87-3.13-7-7-7z" fill="white"/>
    <path d="M13 24h6v1a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1z" fill="white" opacity="0.7"/>
    <path d="M16 9.5c-.28 0-.5.22-.5.5v4.5l-2.65 2.65a.5.5 0 00.71.71L17 14.71V10c0-.28-.22-.5-.5-.5-.28 0-.5.22-.5.5z" fill="#f59e0b"/>
  </svg>`,

  // Unsplash photo URLs (free, no API key, search-based)
  // source.unsplash.com redirects to a random matching photo
  photos: {
    hero: (niche: string) =>
      `https://source.unsplash.com/1200x630/?${encodeURIComponent(niche + ',entrepreneur,laptop,professional,netherlands')}`,
    instagramSquare: (niche: string) =>
      `https://source.unsplash.com/1080x1080/?${encodeURIComponent(niche + ',business,office,success')}`,
    pdfCover: (niche: string) =>
      `https://source.unsplash.com/800x1100/?${encodeURIComponent(niche + ',professional,minimal,clean')}`,
  },
}

/**
 * Geeft een gestileerde HTML cover terug voor de PDF
 */
export function buildBrandedCover(title: string, subtitle: string, niche: string): string {
  const photoUrl = BRAND.photos.pdfCover(niche)
  return `
<div style="position:relative; background: linear-gradient(135deg, ${BRAND.colors.primaryDeep} 0%, ${BRAND.colors.primary} 60%, #7c3aed 100%); min-height:320px; padding:56px 48px; color:white; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
  <!-- Background photo overlay -->
  <div style="position:absolute;inset:0;background-image:url('${photoUrl}');background-size:cover;background-position:center;opacity:0.12;"></div>
  <!-- Decorative elements -->
  <div style="position:absolute;top:-60px;right:-60px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
  <div style="position:absolute;bottom:-40px;left:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
  <!-- Content -->
  <div style="position:relative;z-index:1;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
      ${BRAND.logoSvg}
      <span style="font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:0.8;">${BRAND.name}</span>
    </div>
    <div style="width:40px;height:2px;background:${BRAND.colors.accent};margin:16px 0;"></div>
  </div>
  <div style="position:relative;z-index:1;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;opacity:0.55;margin-bottom:14px;">Praktische AI Gids · ${niche}</div>
    <h1 style="font-size:34px;font-weight:800;line-height:1.2;margin:0 0 14px;letter-spacing:-0.5px;">${title}</h1>
    ${subtitle ? `<p style="font-size:17px;opacity:0.8;margin:0;line-height:1.5;">${subtitle}</p>` : ''}
  </div>
  <div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px;">
    <span style="font-size:13px;opacity:0.5;font-style:italic;">${BRAND.tagline}</span>
    <span style="font-size:12px;opacity:0.4;">${new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}</span>
  </div>
</div>
<div style="height:1px;background:linear-gradient(to right, ${BRAND.colors.accent}, ${BRAND.colors.primary});"></div>`
}

/**
 * Tabel van inhoud HTML
 */
export function buildTableOfContents(chapters: string[]): string {
  return `
<div style="padding:32px 48px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
    <div style="width:3px;height:20px;background:${BRAND.colors.primary};border-radius:2px;"></div>
    <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${BRAND.colors.textMuted};margin:0;">Inhoudsopgave</h2>
  </div>
  <div style="space-y:8px;">
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e5e7eb;">
      <span style="font-size:13px;color:${BRAND.colors.textMuted};">Introductie</span>
    </div>
    ${chapters.map((ch, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed #e5e7eb;">
      <span style="font-size:14px;color:${BRAND.colors.text};font-weight:500;">${i + 1}. ${ch}</span>
      <span style="font-size:11px;background:${BRAND.colors.primaryDeep};color:white;padding:2px 8px;border-radius:20px;font-weight:600;">${String.fromCharCode(65 + i)}</span>
    </div>`).join('')}
    <div style="display:flex;justify-content:space-between;padding:6px 0;">
      <span style="font-size:13px;color:${BRAND.colors.textMuted};">Conclusie &amp; volgende stappen</span>
    </div>
  </div>
</div>`
}

/**
 * Bouw een volledig hoofdstuk
 */
export function buildChapter(
  number: number,
  title: string,
  body: string,
  actions: string[]
): string {
  const paragraphs = body.split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="font-size:15px;line-height:1.8;color:${BRAND.colors.text};margin:0 0 14px;">${p.trim()}</p>`)
    .join('')

  const actionsHtml = actions.length > 0 ? `
  <div style="background:${BRAND.colors.accentLight};border-left:4px solid ${BRAND.colors.accent};padding:18px 22px;border-radius:0 10px 10px 0;margin-top:24px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="font-size:16px;">✅</span>
      <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;">Dit doe jij deze week</span>
    </div>
    <ul style="margin:0;padding-left:18px;">
      ${actions.map(a => `<li style="font-size:14px;color:#78350f;line-height:1.7;margin-bottom:6px;font-weight:500;">${a}</li>`).join('')}
    </ul>
  </div>` : ''

  return `
<div style="padding:40px 48px;border-bottom:1px solid #f3f4f6;">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;">
    <div style="width:38px;height:38px;background:${BRAND.colors.primaryDeep};color:white;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;flex-shrink:0;">${number}</div>
    <h2 style="font-size:21px;font-weight:700;color:${BRAND.colors.text};margin:0;line-height:1.3;">${title}</h2>
  </div>
  ${paragraphs}
  ${actionsHtml}
</div>`
}

export function buildBrandedFooter(): string {
  return `
<div style="padding:20px 48px;background:${BRAND.colors.primaryDeep};color:white;display:flex;justify-content:space-between;align-items:center;">
  <div style="display:flex;align-items:center;gap:8px;">
    ${BRAND.logoSvg.replace('width="32" height="32"', 'width="22" height="22"')}
    <span style="font-size:12px;font-weight:700;letter-spacing:1px;opacity:0.8;">${BRAND.name.toUpperCase()}</span>
  </div>
  <span style="font-size:11px;opacity:0.4;">${BRAND.tagline}</span>
  <a href="${BRAND.domain}" style="font-size:11px;color:${BRAND.colors.accent};text-decoration:none;opacity:0.8;">${BRAND.domain.replace('https://', '')}</a>
</div>`
}
