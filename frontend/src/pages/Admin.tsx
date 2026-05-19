import { useEffect, useState } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/auth'

interface Usuario {
  id: string
  email: string
  tipo_usuario: string
  created_at: string
}

interface HoraPendiente {
  id: string
  voluntario_nombre: string
  actividad_nombre: string
  horas: number
  fecha_registro: string
  notas: string
}

interface Estadisticas {
  total_usuarios: number
  total_voluntarios: number
  total_horas_validadas: number
  total_canjes: number
}

interface Props {
  onLogout: () => void
}

export default function Admin({ onLogout }: Props) {
  const [tab, setTab] = useState<'estadisticas' | 'usuarios' | 'horas'>('estadisticas')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [horasPendientes, setHorasPendientes] = useState<HoraPendiente[]>([])
  const [stats, setStats] = useState<Estadisticas>({ total_usuarios: 0, total_voluntarios: 0, total_horas_validadas: 0, total_canjes: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => { cargarEstadisticas() }, [])

  useEffect(() => {
    if (tab === 'usuarios') cargarUsuarios()
    if (tab === 'horas') cargarHorasPendientes()
  }, [tab])

  const cargarEstadisticas = async () => {
    try {
      const res = await axios.get('/api/admin/estadisticas', { headers: getAuthHeaders() })
      setStats(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const cargarUsuarios = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/usuarios', { headers: getAuthHeaders() })
      setUsuarios(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const cargarHorasPendientes = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/horas-pendientes', { headers: getAuthHeaders() })
      setHorasPendientes(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const validarHora = async (horaId: string, aprobar: boolean) => {
    try {
      const endpoint = aprobar
        ? `/api/admin/horas/${horaId}/validar`
        : `/api/admin/horas/${horaId}/rechazar`
      await axios.put(endpoint, {}, { headers: getAuthHeaders() })
      cargarHorasPendientes()
      cargarEstadisticas()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al validar hora')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <nav className="px-6 py-4 flex justify-between items-center shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-lg text-white">Panel de Administración</span>
        </div>
        <button
          onClick={onLogout}
          className="text-sm font-semibold px-4 py-2 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800"
        >
          Cerrar sesión
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-3xl p-8 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-8xl opacity-20">⚙️</div>
          <h2 className="text-3xl font-bold text-white mb-1">Panel de Administración</h2>
          <p className="text-green-100">Gestiona usuarios, valida horas y consulta estadísticas</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(['estadisticas', 'usuarios', 'horas'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl font-medium text-sm transition ${tab === t ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              style={tab === t ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}
            >
              {t === 'estadisticas' ? '📊 Estadísticas' : t === 'usuarios' ? '👥 Usuarios' : '⏱️ Horas Pendientes'}
            </button>
          ))}
        </div>

        {tab === 'estadisticas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { emoji: '👥', valor: stats.total_usuarios, label: 'Total usuarios', color: '#16a34a', bg: '#dcfce7' },
              { emoji: '🙋', valor: stats.total_voluntarios, label: 'Voluntarios', color: '#ca8a04', bg: '#fef9c3' },
              { emoji: '⏱️', valor: `${stats.total_horas_validadas}h`, label: 'Horas validadas', color: '#7c3aed', bg: '#ede9fe' },
              { emoji: '🎟️', valor: stats.total_canjes, label: 'Canjes realizados', color: '#dc2626', bg: '#fecaca' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: s.bg }}>{s.emoji}</div>
                <p className="text-3xl font-bold mb-1" style={{ color: s.color }}>{s.valor}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'usuarios' && (
          loading ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-2">⏳</p>
              <p>Cargando usuarios...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Tipo</th>
                    <th className="px-6 py-3 text-left">Registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {u.tipo_usuario}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{new Date(u.created_at).toLocaleDateString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'horas' && (
          loading ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-2">⏳</p>
              <p>Cargando horas pendientes...</p>
            </div>
          ) : horasPendientes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-2">✅</p>
              <p>No hay horas pendientes de validación</p>
            </div>
          ) : (
            <div className="space-y-4">
              {horasPendientes.map(h => (
                <div key={h.id} className="bg-white rounded-2xl p-6 border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">{h.voluntario_nombre}</h3>
                      <p className="text-sm text-gray-500">{h.actividad_nombre}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>{h.horas}h</p>
                      <p className="text-xs text-gray-400">{new Date(h.fecha_registro).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                  {h.notas && <p className="text-sm text-gray-600 mb-4 italic">"{h.notas}"</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => validarHora(h.id, true)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                    >
                      ✅ Aprobar
                    </button>
                    <button
                      onClick={() => validarHora(h.id, false)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition"
                    >
                      ❌ Rechazar
                    </button>
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
