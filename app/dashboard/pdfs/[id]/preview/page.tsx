import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

type Props = { params: Promise<{ id: string }> }

export default async function PdfPreviewPage({ params }: Props) {
  const { id } = await params

  const { data: pdf } = await supabaseAdmin
    .from('pdfs')
    .select('id, title, generated_pdf_html')
    .eq('id', id)
    .single()

  if (!pdf) notFound()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/pdfs/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Terug
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{pdf.title}</span>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">PDF Preview</span>
      </div>

      {/* PDF content */}
      <div className="max-w-3xl mx-auto my-8 bg-white shadow-xl rounded-lg overflow-hidden">
        {pdf.generated_pdf_html ? (
          <div dangerouslySetInnerHTML={{ __html: pdf.generated_pdf_html }} />
        ) : (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-4">📄</p>
            <p className="font-medium">Nog geen PDF gegenereerd</p>
            <p className="text-sm mt-2">Ga naar het dashboard en klik op "PDF genereren" in de Acties tab.</p>
            <Link
              href={`/dashboard/pdfs/${id}`}
              className="mt-4 inline-block bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Naar Acties →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
