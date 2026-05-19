// ─── Beneficios.tsx ──────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/auth'

interface Beneficio {
  id: string
  nombre: string
  descripcion: string
  coste_horas: number
  categoria: string
  condiciones: string
  stock: number
  nombre_empresa: string
}

interface Canje {
  id: string
  codigo_canje: string
  beneficio_nombre: string
  horas_consumidas: number
  estado: string
  fecha_generacion: string
  fecha_expiracion: string
}

interface Props {
  onBack: () => void
}

export default function Beneficios({ onBack }: Props) {
  const [beneficios, setBeneficios] = useState<Beneficio[]>([])
  const [canjes, setCanjes] = useState<Canje[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'disponibles' | 'mis-canjes'>('disponibles')
  const [generando, setGenerando] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<Record<string, { texto: string; tipo: 'ok' | 'error' }>>({})

  useEffect(() => {
    cargarBeneficios()
    cargarCanjes()
  }, [])

  const cargarBeneficios = async () => {
    try {
      const res = await axios.get('/api/beneficios')
      setBeneficios(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const cargarCanjes = async () => {
    try {
      const res = await axios.get('/api/beneficios/mis-canjes', { headers: getAuthHeaders() })
      setCanjes(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const generarCanje = async (beneficioId: string) => {
    try {
      setGenerando(beneficioId)
      await axios.post('/api/beneficios/canje', { beneficio_id: beneficioId }, { headers: getAuthHeaders() })
      setMensajes(m => ({ ...m, [beneficioId]: { texto: '¡Código generado! Míralo en "Mis Canjes"', tipo: 'ok' } }))
      cargarCanjes()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al generar canje'
      setMensajes(m => ({ ...m, [beneficioId]: { texto: msg, tipo: 'error' } }))
    } finally {
      setGenerando(null)
    }
  }

  const categoriaColor: Record<string, string> = {
    'Teatro': 'bg-purple-100 text-purple-700',
    'Cultura': 'bg-blue-100 text-blue-700',
    'Música': 'bg-pink-100 text-pink-700',
    'Formación': 'bg-green-100 text-green-700',
  }

  const estadoColor: Record<string, string> = {
    'generado': 'bg-green-100 text-green-700',
    'canjeado': 'bg-gray-100 text-gray-500',
    'expirado': 'bg-red-100 text-red-500',
    'cancelado': 'bg-red-100 text-red-500',
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <nav className="px-6 py-4 flex justify-between items-center shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <h1 className="text-xl font-bold text-white">🎭 Thanks For It</h1>
        <button onClick={onBack} className="text-sm font-semibold px-4 py-2 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800">
          ← Volver al dashboard
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">🎟️ Beneficios Culturales</h2>
        <p className="text-gray-500 mb-6">Canjea tus horas de voluntariado por experiencias culturales</p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('disponibles')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${tab === 'disponibles' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Beneficios disponibles
          </button>
          <button
            onClick={() => setTab('mis-canjes')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${tab === 'mis-canjes' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Mis canjes {canjes.length > 0 && `(${canjes.length})`}
          </button>
        </div>

        {tab === 'disponibles' && (
          loading ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">⏳</p>
              <p>Cargando beneficios...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {beneficios.map(b => {
                const mensaje = mensajes[b.id]
                return (
                  <div key={b.id} className="bg-white rounded-xl shadow p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{b.nombre}</h3>
                        <p className="text-gray-400 text-sm">{b.nombre_empresa}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoriaColor[b.categoria] || 'bg-gray-100 text-gray-600'}`}>
                        {b.categoria}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{b.descripcion}</p>
                    {b.condiciones && (
                      <p className="text-gray-400 text-xs mb-4 italic">📋 {b.condiciones}</p>
                    )}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-blue-600">{b.coste_horas}h</span>
                      <span className="text-sm text-gray-400">{b.stock} disponibles</span>
                    </div>
                    {mensaje && (
                      <p className={`text-sm mb-2 text-center ${mensaje.tipo === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                        {mensaje.tipo === 'ok' ? '✅' : '❌'} {mensaje.texto}
                      </p>
                    )}
                    <button
                      onClick={() => generarCanje(b.id)}
                      disabled={generando === b.id}
                      className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {generando === b.id ? 'Generando...' : 'Generar código de canje'}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        )}

        {tab === 'mis-canjes' && (
          canjes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow">
              <p className="text-4xl mb-2">🎫</p>
              <p>No tienes canjes todavía</p>
              <p className="text-sm mt-1">Genera tu primer código desde "Beneficios disponibles"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {canjes.map(c => (
                <div key={c.id} className="bg-white rounded-xl shadow p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">{c.beneficio_nombre}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoColor[c.estado] || 'bg-gray-100'}`}>
                      {c.estado}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
                    <p className="text-xs text-gray-400 mb-1">Código de canje</p>
                    <p className="text-2xl font-mono font-bold text-blue-600 tracking-widest">{c.codigo_canje}</p>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>⏱️ Horas consumidas: <span className="font-medium text-gray-700">{c.horas_consumidas}h</span></p>
                    <p>📅 Generado: {new Date(c.fecha_generacion).toLocaleDateString('es-ES')}</p>
                    <p>⏳ Expira: {new Date(c.fecha_expiracion).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
