import { useState, useEffect } from 'react'

interface Props {
  onVerPolitica: () => void
}

export default function CookieBanner({ onVerPolitica }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const decision = localStorage.getItem('cookies_decision')
    if (!decision) setVisible(true)
  }, [])

  const aceptar = () => {
    localStorage.setItem('cookies_decision', 'aceptadas')
    setVisible(false)
  }

  const rechazar = () => {
    localStorage.setItem('cookies_decision', 'rechazadas')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-gray-800 mb-1">🍪 Usamos cookies</p>
          <p className="text-sm text-gray-500">
            Utilizamos cookies propias y de terceros para mejorar tu experiencia. Puedes aceptarlas, rechazarlas o consultar nuestra{' '}
            <button onClick={onVerPolitica} className="underline text-green-700 hover:text-green-900">
              política de cookies
            </button>.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={rechazar}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Rechazar
          </button>
          <button
            onClick={aceptar}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  )
}
