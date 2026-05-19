import { useEffect, useState } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/auth'

interface Actividad {
  id: string
  nombre: string
  municipio: string
}

interface RegistroHoras {
  id: string
  actividad_nombre: string
  horas: number
  fecha_registro: string
  estado: 'pendiente' | 'pendiente_delegado' | 'pendiente_entidad' | 'validada' | 'rechazada'
  notas: string
}

interface Resumen {
  total_validadas: number
  total_pendientes: number
  total_canjeadas: number
  disponibles: number
}

interface Props {
  onBack: () => void
}

export default function Horas({ onBack }: Props) {
  const [horas, setHoras] = useState<RegistroHoras[]>([])
  const [resumen, setResumen] = useState<Resumen>({ total_validadas: 0, total_pendientes: 0, total_canjeadas: 0, disponibles: 0 })
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [tab, setTab] = useState<'historial' | 'registrar'>('historial')
  const [form, setForm] = useState({ actividad_id: '', horas: '', notas: '' })
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    cargarHoras()
    cargarActividades()
  }, [])

  const cargarHoras = async () => {
    try {
      const res = await axios.get('/api/horas/mis-horas', { headers: getAuthHeaders() })
      setHoras(res.data.horas)
      setResumen(res.data.resumen)
    } catch (err) {
      console.error(err)
    }
  }

  const cargarActividades = async () => {
    try {
      const res = await axios.get('/api/actividades/mis-actividades', { headers: getAuthHeaders() })
      setActividades(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const registrarHoras = async () => {
    if (!form.actividad_id || !form.horas) {
      setMensaje({ texto: 'Selecciona una actividad e introduce las horas', tipo: 'error' })
      return
    }
    const horasNum = parseFloat(form.horas)
    if (isNaN(horasNum) || horasNum <= 0 || horasNum > 24) {
      setMensaje({ texto: 'Las horas deben ser un número entre 0.5 y 24', tipo: 'error' })
      return
    }
    try {
      setEnviando(true)
      await axios.post('/api/horas', {
        actividad_id: form.actividad_id,
        horas: horasNum,
        notas: form.notas,
      }, { headers: getAuthHeaders() })
      setMensaje({ texto: 'Horas registradas correctamente. Pendientes de validación.', tipo: 'ok' })
      setForm({ actividad_id: '', horas: '', notas: '' })
      cargarHoras()
    } catch (err: any) {
      setMensaje({ texto: err.response?.data?.error || 'Error al registrar horas', tipo: 'error' })
    } finally {
      setEnviando(false)
    }
  }

  const estadoColor: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700',
    pendiente_delegado: 'bg-yellow-100 text-yellow-700',
    pendiente_entidad: 'bg-orange-100 text-orange-700',
    validada: 'bg-green-100 text-green-700',
    rechazada: 'bg-red-100 text-red-500',
  }

  const estadoLabel: Record<string, string> = {
    pendiente: '⏳ Pendiente',
    pendiente_delegado: '⏳ Pendiente delegado',
    pendiente_entidad: '🔄 Pendiente entidad',
    validada: '✅ Validada',
    rechazada: '❌ Rechazada',
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <nav className="px-6 py-4 flex justify-between items-center shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <h1 className="text-xl font-bold text-white">🌿 Thanks For It</h1>
        <button onClick={onBack} className="text-sm font-semibold px-4 py-2 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800">
          ← Volver al dashboard
        </button>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">⏱️ Mis Horas</h2>
        <p className="text-gray-500 mb-6">Registra y consulta tus horas de voluntariado</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{resumen.total_validadas}h</p>
            <p className="text-xs text-gray-500 mt-1">Validadas</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">{resumen.total_pendientes}h</p>
            <p className="text-xs text-gray-500 mt-1">Pendientes</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{resumen.total_canjeadas}h</p>
            <p className="text-xs text-gray-500 mt-1">Canjeadas</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{resumen.disponibles}h</p>
            <p className="text-xs text-gray-500 mt-1">Disponibles</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('historial')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${tab === 'historial' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Historial
          </button>
          <button
            onClick={() => setTab('registrar')}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition ${tab === 'registrar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            + Registrar horas
          </button>
        </div>

        {tab === 'historial' && horas.length === 0 && (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>No tienes horas registradas todavía</p>
            <button
              onClick={() => setTab('registrar')}
              className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Registrar mis primeras horas
            </button>
          </div>
        )}

        {tab === 'historial' && horas.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Actividad</th>
                  <th className="px-6 py-3 text-left">Fecha</th>
                  <th className="px-6 py-3 text-center">Horas</th>
                  <th className="px-6 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {horas.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{h.actividad_nombre}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(h.fecha_registro).toLocaleDateString('es-ES')}</td>
                    <td className="px-6 py-4 text-center font-bold text-blue-600">{h.horas}h</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor[h.estado]}`}>
                        {estadoLabel[h.estado] ?? h.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'registrar' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-lg mb-4">Registrar horas de voluntariado</h3>

            {mensaje && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${mensaje.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {mensaje.texto}
              </div>
            )}

            <label className="text-sm text-gray-600 mb-1 block">Actividad *</label>
            <select
              className="w-full border rounded-lg p-3 mb-4"
              value={form.actividad_id}
              onChange={e => setForm({ ...form, actividad_id: e.target.value })}
            >
              <option value="">Selecciona una actividad...</option>
              {actividades.map(a => (
                <option key={a.id} value={a.id}>{a.nombre} - {a.municipio}</option>
              ))}
            </select>

            <label className="text-sm text-gray-600 mb-1 block">Horas realizadas *</label>
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              className="w-full border rounded-lg p-3 mb-4"
              placeholder="Ej: 4"
              value={form.horas}
              onChange={e => setForm({ ...form, horas: e.target.value })}
            />

            <label className="text-sm text-gray-600 mb-1 block">Notas (opcional)</label>
            <textarea
              className="w-full border rounded-lg p-3 mb-6 resize-none"
              rows={3}
              placeholder="Describe brevemente tu aportación..."
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
            />

            <button
              onClick={registrarHoras}
              disabled={enviando}
              className="w-full bg-blue-600 text-white rounded-lg p-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {enviando ? 'Registrando...' : 'Registrar horas'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">Las horas quedan pendientes de validación por el responsable</p>
          </div>
        )}
      </div>
    </div>
  )
}
