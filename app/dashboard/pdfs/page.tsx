import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 30

async function getPdfs() {
  const { data } = await supabaseAdmin
    .from('pdfs')
    .select(`
      id, title, subtitle, price, slug, active, created_at,
      pdf_orders(count)
    `)
    .order('created_at', { ascending: false })
  return data || []
}

export default async function PdfsPage() {
  const pdfs = await getPdfs()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gepubliceerde PDFs</h1>
        <p className="text-gray-500 mt-1">Alle actieve PDF producten met verkoopcijfers</p>
      </div>

      {pdfs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📄</p>
          <p className="text-lg mb-2">Nog geen PDFs gepubliceerd</p>
          <p className="text-sm">Keur een idee goed om automatisch een PDF te publiceren.</p>
          <Link href="/dashboard/ideas" className="text-indigo-600 underline mt-4 inline-block text-sm">
            Bekijk ideeën →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pdfs.map((pdf: any) => {
            const orderCount = pdf.pdf_orders?.[0]?.count ?? 0
            return (
              <div key={pdf.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${pdf.active ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                    <span className="text-xs text-gray-400">{pdf.active ? 'Live' : 'Inactief'}</span>
                  </div>
                  <h3 className="font-bold text-gray-900">{pdf.title}</h3>
                  <p className="text-gray-500 text-sm">{pdf.subtitle}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-gray-400">/{pdf.slug}</span>
                    <a
                      href={`/${pdf.slug}`}
                      target="_blank"
                      className="text-xs text-indigo-500 hover:underline"
                    >
                      Bekijk landingspagina →
                    </a>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">€{pdf.price}</p>
                  <p className="text-sm text-gray-500 mt-1">{orderCount} verkopen</p>
                  <p className="text-sm text-green-600 font-medium">€{(orderCount * pdf.price).toFixed(2)} omzet</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
