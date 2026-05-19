import { useState, useEffect } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/auth'

interface Beneficio {
  id: string
  nombre: string
  descripcion: string
  coste_horas: number
  stock_disponible: number | null
  activo: boolean
}

interface Voluntario {
  id: string
  nombre: string
  apellidos: string
  email: string
  telefono?: string
  municipio?: string
  fecha_registro?: string
}

interface Props {
  usuario: { id: string; email: string; tipo_usuario: string }
  onLogout: () => void
}

export default function EmpresaDashboard({ usuario, onLogout }: Props) {
  const [vista, setVista] = useState<'dashboard' | 'nuevo' | 'voluntarios'>('dashboard')
  const [beneficios, setBeneficios] = useState<Beneficio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [voluntariosCargando, setVoluntariosCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    coste_horas: 1,
    stock_disponible: '',
    fecha_caducidad: ''
  })

  useEffect(() => { cargarBeneficios() }, [])

  useEffect(() => {
    if (vista === 'voluntarios') cargarVoluntarios()
  }, [vista])

  const cargarBeneficios = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/empresas/mis-beneficios', { headers: getAuthHeaders() })
      setBeneficios(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const cargarVoluntarios = async () => {
    try {
      setVoluntariosCargando(true)
      const res = await axios.get('/api/voluntarios/todos', { headers: getAuthHeaders() })
      setVoluntarios(res.data)
    } catch (err) {
      console.error(err)
      setVoluntarios([])
    } finally {
      setVoluntariosCargando(false)
    }
  }

  const handleCrear = async () => {
    if (!form.nombre || !form.coste_horas) return setError('Nombre y coste en horas son obligatorios')
    const stockNum = form.stock_disponible !== '' ? parseInt(form.stock_disponible) : null
    if (form.stock_disponible !== '' && (isNaN(stockNum!) || stockNum! < 1)) {
      return setError('El stock debe ser un número mayor que 0')
    }
    try {
      setLoading(true)
      await axios.post('/api/empresas/beneficios', {
        nombre: form.nombre,
        descripcion: form.descripcion,
        coste_horas: form.coste_horas,
        stock_disponible: stockNum,
        fecha_caducidad: form.fecha_caducidad || null
      }, { headers: getAuthHeaders() })
      setSuccess('✅ Beneficio publicado correctamente')
      setError('')
      setForm({ nombre: '', descripcion: '', coste_horas: 1, stock_disponible: '', fecha_caducidad: '' })
      cargarBeneficios()
      setVista('dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear beneficio')
    } finally {
      setLoading(false)
    }
  }

  const voluntariosFiltrados = voluntarios.filter(v => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      v.nombre?.toLowerCase().includes(q) ||
      v.apellidos?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.municipio?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <nav className="px-6 py-4 flex justify-between items-center shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-lg text-white">Voluntariado Cultural</span>
          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 10px', borderRadius: '999px', marginLeft: '8px' }}>Empresa Cultural</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-green-100 text-sm hidden sm:block">{usuario.email}</span>
          <button onClick={onLogout} className="text-sm font-semibold px-4 py-2 rounded-xl border border-white text-white hover:bg-white hover:text-green-800 transition">
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-3xl p-8 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-8xl opacity-20">🎭</div>
          <h2 className="text-3xl font-bold text-white mb-1">¡Hola, {usuario.email.split('@')[0]}! 👋 Bienvenido/a a Thanks For It</h2>
          <p className="text-green-100">Publica beneficios culturales y gestiona voluntarios</p>
        </div>

        {success && <div className="bg-green-50 text-green-700 p-4 rounded-2xl mb-4 text-sm">{success}</div>}

        <div className="flex gap-2 mb-6">
          <button onClick={() => setVista('dashboard')}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition ${vista === 'dashboard' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'dashboard' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            🎟️ Mis Beneficios
          </button>
          <button onClick={() => { setVista('nuevo'); setError(''); setSuccess('') }}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition ${vista === 'nuevo' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'nuevo' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            ➕ Nuevo Beneficio
          </button>
          <button onClick={() => setVista('voluntarios')}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition ${vista === 'voluntarios' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'voluntarios' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            🙋 Voluntarios
          </button>
        </div>

        {/* MIS BENEFICIOS */}
        {vista === 'dashboard' && (
          loading ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-2">⏳</p><p>Cargando beneficios...</p>
            </div>
          ) : beneficios.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-2">🎭</p>
              <p className="font-medium">No tienes beneficios publicados</p>
              <p className="text-sm mt-1">Publica tu primer beneficio para que los voluntarios puedan canjearlo</p>
              <button onClick={() => setVista('nuevo')}
                className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                ➕ Publicar beneficio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {beneficios.map(b => (
                <div key={b.id} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-800">{b.nombre}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${b.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {b.activo ? 'activo' : 'inactivo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{b.descripcion}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>⏱️ Coste: <span className="font-semibold text-green-600">{b.coste_horas}h</span></p>
                    {b.stock_disponible != null && <p>📦 Stock: {b.stock_disponible} unidades</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* NUEVO BENEFICIO */}
        {vista === 'nuevo' && (
          <div className="bg-white rounded-2xl p-8 border border-gray-100">
            <h3 className="text-lg font-semibold mb-6">➕ Nuevo Beneficio Cultural</h3>
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nombre del beneficio *</label>
            <input className="w-full border border-gray-200 rounded-xl p-3 mb-4 text-sm focus:outline-none focus:border-green-500"
              placeholder="Ej: Entrada al museo, Taller de cerámica..."
              value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />

            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Descripción</label>
            <textarea className="w-full border border-gray-200 rounded-xl p-3 mb-4 text-sm focus:outline-none focus:border-green-500 h-24 resize-none"
              placeholder="Describe el beneficio..."
              value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Coste en horas *</label>
                <input type="number" min="1" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                  value={form.coste_horas}
                  onChange={e => setForm({ ...form, coste_horas: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Stock (opcional)</label>
                <input type="number" min="1" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                  placeholder="Ilimitado si vacío"
                  value={form.stock_disponible}
                  onChange={e => setForm({ ...form, stock_disponible: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Fecha caducidad (opcional)</label>
                <input type="date" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                  value={form.fecha_caducidad}
                  onChange={e => setForm({ ...form, fecha_caducidad: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setVista('dashboard')}
                className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleCrear} disabled={loading}
                className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {loading ? 'Publicando...' : '✅ Publicar beneficio'}
              </button>
            </div>
          </div>
        )}

        {/* VOLUNTARIOS */}
        {vista === 'voluntarios' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex gap-3 border border-gray-100">
              <input
                className="flex-1 text-sm outline-none text-gray-700"
                placeholder="🔍 Buscar por nombre, email o municipio..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="text-gray-300 hover:text-gray-500 text-sm">✕</button>
              )}
            </div>

            {voluntariosCargando ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
                <p className="text-4xl mb-2">⏳</p>
                <p>Cargando voluntarios...</p>
              </div>
            ) : voluntariosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">🔭</p>
                <p className="font-medium">{busqueda ? 'No hay resultados para esa búsqueda' : 'No hay voluntarios registrados todavía'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {voluntariosFiltrados.map(v => (
                  <div key={v.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                        {(v.nombre?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800">{v.nombre} {v.apellidos}</p>
                        <p className="text-sm text-gray-400">{v.email}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {v.telefono && <span className="text-xs text-gray-400">📞 {v.telefono}</span>}
                          {v.municipio && <span className="text-xs text-gray-400">📍 {v.municipio}</span>}
                          {v.fecha_registro && (
                            <span className="text-xs text-gray-400">
                              Registrado {new Date(v.fecha_registro).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
