/**
 * Social Media Subagent
 * Verbeterd met:
 *   - social-content skill: hook formulas, platform-specifieke formats
 *   - ad-creative skill: angle-based copy, Meta specs (125 char zichtbaar), specificity
 *   - marketing-psychology skill: loss aversion, social proof, identity triggers
 *   - copywriting skill: benefits > features, specifiek > vaag, klantentaal
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.substring(start, end + 1)
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

export async function runSocialSubagent(
  pdfId: string,
  pdfChapters: string[] = []
): Promise<{ postsCreated: number; postsPublished: number }> {
  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('*, pdf_ideas(niche, target_audience, problem_solved, product_type, meta_hook)')
    .eq('id', pdfId)
    .single()

  if (!pdf) throw new Error('PDF not found')

  const niche = (pdf.pdf_ideas as any)?.niche || ''
  const doelgroep = (pdf.pdf_ideas as any)?.target_audience || 'Nederlandse ZZP\'ers'
  const probleem = (pdf.pdf_ideas as any)?.problem_solved || ''
  const productType = (pdf.pdf_ideas as any)?.product_type || 'swipe_file'
  const metaHook = (pdf.pdf_ideas as any)?.meta_hook || ''
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vakwebtwente.vercel.app'
  const link = `${baseUrl}/${pdf.slug}`
  const chaptersContext = pdfChapters.length > 0
    ? `\nInhoud: ${pdfChapters.map((t, i) => `${i + 1}. ${t}`).join(' | ')}`
    : ''

  const productTypeLabels: Record<string, string> = {
    swipe_file: 'swipe file (kant-en-klare teksten)',
    playbook: 'playbook (stap-voor-stap systeem)',
    toolkit: 'toolkit (prompts + tools + templates)',
  }
  const productTypeLabel = productTypeLabels[productType] || 'gids'

  const systemPrompt = `Je bent een expert social media strateeg die content maakt voor Nederlandse ZZP'ers.

JE KENT DEZE PRINCIPES:

**HOOK FORMULES (eerste zin stopt het scrollen):**
- Curiosity: "De reden dat [probleem] blijft bestaan is niet wat je denkt."
- Story: "Vorige week sprak ik een [beroep] die [herkenbare situatie]."
- Value: "Hoe je [gewenst resultaat] bereikt (zonder [pijn]):"
- Contrarian: "Stoppen met [veelgemaakte fout]. Doe dit in plaats daarvan:"
- Loss: "Elke week dat je dit niet doet kost je [concreet verlies]."

**META AD SPECS:**
- Instagram primaire tekst: eerste 125 tekens zijn zichtbaar zonder "meer lezen" — zet de hook HIER
- Facebook: iets langer, community-gevoel, minder emoji's
- Geen externe links in post body (gaat ten koste van bereik) — link in bio/comments

**ANGLES PER POST TYPE:**
- Awareness: Pain point angle — benoem het probleem zo specifiek dat mensen denken "dit ben ik"
- Interest: Outcome angle + Social proof — "ondernemers zoals jij die dit gebruiken zien [concreet resultaat]"
- Conversion: Identity + Urgency — "voor [specifiek type ondernemer] die [specifieke situatie]"

**COPYWRITING REGELS:**
- Specifiek > vaag: "3 uur per week" > "veel tijd"
- Voordelen > kenmerken: "je stuurt offertes in 5 min" > "bevat offerte templates"
- Klantentaal: gebruik woorden die ZZP'ers zelf gebruiken
- Actieve stem, geen jargon
- Cijfers maken geloofwaardig`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Schrijf 6 social media posts die ZZP'ers écht laten stoppen met scrollen en die leiden tot aankopen.

PRODUCT: ${pdf.title}
TYPE: ${productTypeLabel}
NICHE: ${niche}
DOELGROEP: ${doelgroep}
PROBLEEM DAT HET OPLOST: ${probleem}
PRIJS: €${pdf.price}
LINK: ${link}
BESTAANDE HOOK IDEE: ${metaHook || 'nog niet vastgesteld'}${chaptersContext}

MAAK DEZE 6 POSTS:

**Instagram (3 posts):**
1. AWARENESS — Pain point hook. Eerste zin = scroll-stopper. Beschrijf het probleem zo herkenbaar dat ze denken "dit ben ik." Noem het product pas aan het einde.
2. INTEREST — Outcome post. Concreet resultaat na gebruik. Gebruik een for/mazing opening of story-hook. Voeg 1 social proof element toe ("ZZP'ers die dit gebruiken...").
3. CONVERSION — Direct verkooppost. Identity hook: voor wie is dit precies. Prijs noemen. Link in bio/comments. Creëer urgentie zonder nep-schaarste.

**Facebook (3 posts):**
4. AWARENESS — Herkenbaar verhaal/situatie. Iets langer dan Instagram. Community-toon ("ken jij dit ook?"). Meer tekst, minder emoji's.
5. INTEREST — Educatief maar verkoopgericht. Geef échte waarde weg (1 concrete tip uit het product) en laat zien dat het product nog veel meer bevat.
6. CONVERSION — Directe aanbieding. Benoem de transformatie: van [situatie voor] naar [situatie na]. Link naar ${link}.

TECHNISCHE EISEN:
- Instagram: eerste 125 tekens = de hook (want daarna "meer lezen")
- Conversion posts: altijd link naar ${link}
- Nooit vage claims — altijd specifiek (tijdsbesparing, aantal items, concrete output)
- Schrijf in jij-vorm, directe toon

Geef antwoord als JSON (GEEN markdown):
{
  "posts": [
    {
      "platform": "instagram",
      "post_type": "awareness",
      "angle": "pain_point",
      "hook": "De eerste zin apart (max 125 tekens)",
      "content_text": "Volledige post inclusief hook. Instagram: 150-300 woorden + witregels voor leesbaarheid.",
      "hashtags": ["#zzpnederland", "#ondernemen"],
      "visual_description": "Beschrijf concreet: welke stockfoto past hier? Sfeer, kleuren, type persoon/situatie.",
      "days_from_now": 1
    }
  ]
}`
    }]
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Bad social response')

  let socialData: { posts: any[] }
  try {
    socialData = JSON.parse(stripJson(content.text))
  } catch (e) {
    console.error('Social subagent JSON parse error. Raw text:', content.text.substring(0, 300))
    throw new Error('Failed to parse social posts JSON')
  }

  const now = new Date()
  let postsCreated = 0

  for (const post of (socialData.posts || [])) {
    const scheduledDate = new Date(now)
    scheduledDate.setDate(scheduledDate.getDate() + (post.days_from_now || 1))

    const postType = ['awareness', 'interest', 'conversion'].includes(post.post_type)
      ? post.post_type
      : 'awareness'

    // Facebook posts opslaan als instagram (DB beperking) — onderscheid via visual_description prefix
    const platform = post.platform === 'facebook' ? 'instagram' : (
      ['instagram', 'linkedin', 'tiktok'].includes(post.platform) ? post.platform : 'instagram'
    )

    // Prefix Facebook posts in content_text zodat je ze kunt onderscheiden
    const contentText = post.platform === 'facebook'
      ? `[Facebook]\n${post.content_text || ''}`
      : post.content_text || ''

    try {
      await supabaseAdmin.from('social_posts').insert({
        pdf_id: pdfId,
        platform,
        post_type: postType,
        content_text: contentText,
        hashtags: post.hashtags || [],
        visual_description: post.visual_description || '',
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'planned',
      })
      postsCreated++
    } catch (err) {
      console.error('Failed to insert social post:', err)
    }
  }

  return { postsCreated, postsPublished: 0 }
}
