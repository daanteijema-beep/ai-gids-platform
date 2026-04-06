// Supabase Edge Function: brand-kit-builder
// Pre-fetcht foto's van Pexels op basis van thema's en slaat ze op in brand_assets.
// Kan handmatig getriggerd worden of periodiek via een cron job.
// De content-creator haalt dan foto's uit de DB ipv live van Pexels.

import { createClient } from 'npm:@supabase/supabase-js'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const THEMAS = [
  // Algemeen ondernemen
  { zoekterm: 'small business owner working', tags: ['ondernemer', 'werk', 'kantoor'], platform: 'general' },
  { zoekterm: 'entrepreneur laptop coffee', tags: ['ondernemer', 'laptop', 'koffie'], platform: 'general' },
  { zoekterm: 'freelancer home office', tags: ['freelancer', 'thuiswerken'], platform: 'general' },
  { zoekterm: 'Dutch business professional', tags: ['nederland', 'professional'], platform: 'general' },
  // LinkedIn specifiek (landscape, professioneel)
  { zoekterm: 'business meeting team collaboration', tags: ['samenwerking', 'team'], platform: 'linkedin' },
  { zoekterm: 'professional office modern workspace', tags: ['kantoor', 'modern'], platform: 'linkedin' },
  { zoekterm: 'digital technology innovation', tags: ['technologie', 'innovatie'], platform: 'linkedin' },
  { zoekterm: 'entrepreneur success growth', tags: ['succes', 'groei'], platform: 'linkedin' },
  // Meta/Instagram (levendig, emotioneel)
  { zoekterm: 'happy business owner shop', tags: ['winkel', 'blij'], platform: 'meta' },
  { zoekterm: 'craftsman tradesperson working', tags: ['vakman', 'ambacht'], platform: 'meta' },
  { zoekterm: 'construction worker professional', tags: ['bouw', 'vakman'], platform: 'meta' },
  { zoekterm: 'restaurant chef kitchen', tags: ['horeca', 'chef'], platform: 'meta' },
  { zoekterm: 'plumber electrician technician', tags: ['loodgieter', 'elektricien'], platform: 'meta' },
  { zoekterm: 'accountant finance calculator', tags: ['boekhouder', 'financiën'], platform: 'meta' },
  // Instagram specifiek (visueel, lifestyle)
  { zoekterm: 'creative studio design work', tags: ['creatief', 'design'], platform: 'instagram' },
  { zoekterm: 'phone technology app mobile', tags: ['app', 'mobiel'], platform: 'instagram' },
  { zoekterm: 'automation robot technology future', tags: ['automatisering', 'AI'], platform: 'instagram' },
  { zoekterm: 'time saving productivity focus', tags: ['productiviteit', 'tijd'], platform: 'instagram' },
]

async function haalPexelsFotos(
  zoekterm: string,
  platform: string,
  count = 8
): Promise<Array<{ pexels_id: string; url: string; thumbnail_url: string; alt: string; breedte: number; hoogte: number }>> {
  const key = Deno.env.get('PEXELS_API_KEY')
  if (!key) return []

  const orientation = platform === 'instagram' ? 'square' : 'landscape'
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(zoekterm)}&per_page=${count}&orientation=${orientation}`,
    { headers: { Authorization: key } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.photos || []).map((p: {
    id: number; src: {large2x: string; large: string; medium: string}; alt: string; width: number; height: number
  }) => ({
    pexels_id: String(p.id),
    url: p.src.large2x || p.src.large,
    thumbnail_url: p.src.medium,
    alt: p.alt || zoekterm,
    breedte: p.width,
    hoogte: p.height,
  }))
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  if (auth !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const themas = body.themas || THEMAS
  const vervang = body.vervang || false // true = ook al bestaande thema's verversen

  let totaalNieuw = 0
  let totaalOvergeslagen = 0

  for (const thema of themas) {
    // Check of we al foto's hebben voor dit thema + platform
    if (!vervang) {
      const { count } = await supabase
        .from('brand_assets')
        .select('*', { count: 'exact', head: true })
        .eq('zoekterm', thema.zoekterm)
        .eq('platform', thema.platform)

      if ((count || 0) >= 5) {
        totaalOvergeslagen++
        continue
      }
    }

    try {
      const fotos = await haalPexelsFotos(thema.zoekterm, thema.platform)

      // Haal al bestaande Pexels IDs op om duplicaten te voorkomen
      const { data: bestaand } = await supabase
        .from('brand_assets')
        .select('pexels_id')
        .eq('zoekterm', thema.zoekterm)

      const bestaandeIds = new Set((bestaand || []).map((b: {pexels_id: string}) => b.pexels_id))
      const nieuw = fotos.filter(f => !bestaandeIds.has(f.pexels_id))

      if (nieuw.length) {
        const inserts = nieuw.map(f => ({
          type: 'photo',
          zoekterm: thema.zoekterm,
          pexels_id: f.pexels_id,
          url: f.url,
          thumbnail_url: f.thumbnail_url,
          alt: f.alt,
          breedte: f.breedte,
          hoogte: f.hoogte,
          platform: thema.platform,
          tags: thema.tags || [],
        }))
        await supabase.from('brand_assets').insert(inserts)
        totaalNieuw += nieuw.length
        console.log(`${thema.zoekterm} (${thema.platform}): ${nieuw.length} nieuwe foto's`)
      }

      // Kleine pauze om Pexels rate limit te respecteren
      await new Promise(r => setTimeout(r, 500))

    } catch (e) {
      console.error(`Fout bij ${thema.zoekterm}:`, e)
      continue
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    nieuw: totaalNieuw,
    overgeslagen: totaalOvergeslagen,
    themas_verwerkt: themas.length,
  }), { status: 200 })
})
