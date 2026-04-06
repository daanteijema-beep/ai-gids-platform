import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 0

async function getOrders() {
  const { data } = await supabaseAdmin
    .from('pdf_orders')
    .select('*, pdfs(title, price)')
    .order('created_at', { ascending: false })
    .limit(100)
  return data || []
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'Wacht op betaling', color: 'bg-gray-100 text-gray-600' },
  paid: { label: 'Betaald — PDF genereren', color: 'bg-yellow-100 text-yellow-700' },
  generated: { label: 'PDF gegenereerd', color: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Bezorgd', color: 'bg-green-100 text-green-700' },
}

export default async function OrdersPage() {
  const orders = await getOrders()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bestellingen</h1>
        <p className="text-gray-500 mt-1">{orders.length} bestellingen totaal</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-lg">Nog geen bestellingen</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Klant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">PDF</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bedrag</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order: any) => {
                const status = STATUS_LABEL[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-500' }
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.customer_name}</p>
                      <p className="text-gray-400 text-xs">{order.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{order.pdfs?.title || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      €{order.pdfs?.price || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(order.created_at).toLocaleDateString('nl-NL')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
