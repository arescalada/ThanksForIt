import { useEffect, useState } from 'react'
import axios from 'axios'
import { getAuthHeaders, isAuthenticated } from '../utils/auth'

interface Actividad {
  id: string
  nombre: string
  descripcion: string
  municipio: string
  fecha_inicio: string
  fecha_fin?: string
  horarios?: string
  num_voluntarios_objetivo: number
  inscritos?: number
  faltan?: number
  nombre_entidad?: string
}

interface MiInscripcion {
  id: string
  nombre: string
  entidad_nombre: string
  municipio: string
  fecha_inicio: string
  fecha_fin?: string
  horarios?: string
  descripcion?: string
  num_voluntarios_objetivo?: number
  inscritos?: number
  estado: 'pendiente' | 'confirmado' | 'rechazado' | 'cancelado' | 'inscrito'
}

interface Props {
  onBack: () => void
}

export default function Actividades({ onBack }: Props) {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [misInscripciones, setMisInscripciones] = useState<MiInscripcion[]>([])
  const [loading, setLoading] = useState(true)
  const [inscLoading, setInscLoading] = useState(false)
  const [municipio, setMunicipio] = useState('')
  const [inscribiendo, setInscribiendo] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<Record<string, { texto: string; tipo: 'ok' | 'error' }>>({})
  const [modalActividad, setModalActividad] = useState<Actividad | null>(null)
  const [modalInscripcion, setModalInscripcion] = useState<MiInscripcion | null>(null)

  useEffect(() => {
    cargarActividades()
    if (isAuthenticated()) cargarMisInscripciones()
  }, [])

  const cargarActividades = async () => {
    try {
      setLoading(true)
      const params = municipio ? `?municipio=${encodeURIComponent(municipio)}` : ''
      const res = await axios.get(`/api/actividades${params}`)
      setActividades(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const cargarMisInscripciones = async () => {
    try {
      setInscLoading(true)
      const res = await axios.get('/api/inscripciones/mis-inscripciones', { headers: getAuthHeaders() })
      setMisInscripciones(res.data)
    } catch (err) { console.error(err) }
    finally { setInscLoading(false) }
  }

  const inscribirse = async (actividadId: string) => {
    if (!isAuthenticated()) {
      setMensajes(m => ({ ...m, [actividadId]: { texto: 'Debes iniciar sesión', tipo: 'error' } }))
      return
    }
    try {
      setInscribiendo(actividadId)
      await axios.post(`/api/inscripciones/${actividadId}`, {}, { headers: getAuthHeaders() })
      setMensajes(m => ({ ...m, [actividadId]: { texto: '¡Inscrito correctamente!', tipo: 'ok' } }))
      cargarActividades()
      cargarMisInscripciones()
      setModalActividad(null)
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al inscribirse'
      setMensajes(m => ({ ...m, [actividadId]: { texto: msg, tipo: 'error' } }))
    } finally { setInscribiendo(null) }
  }

  const formatFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  const estadoConfig: Record<string, { label: string; bg: string; color: string; emoji: string }> = {
    pendiente:  { label: 'Pendiente',   bg: '#fef9c3', color: '#854d0e', emoji: '⏳' },
    inscrito:   { label: 'Pendiente',   bg: '#fef9c3', color: '#854d0e', emoji: '⏳' },
    confirmado: { label: 'Confirmado',  bg: '#dcfce7', color: '#166534', emoji: '✅' },
    rechazado:  { label: 'No aceptado',bg: '#fee2e2', color: '#991b1b', emoji: '❌' },
    cancelado:  { label: 'Cancelado',  bg: '#f3f4f6', color: '#6b7280', emoji: '✕'  },
  }

  const inscritosIds = new Set(misInscripciones.map(i => i.id))

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <nav className="px-6 py-4 flex justify-between items-center shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <h1 className="text-xl font-bold text-white">🎭 Thanks For It</h1>
        <button onClick={onBack} className="text-sm font-semibold px-4 py-2 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800">
          ← Volver al dashboard
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6">

        {/* ── MIS ACTIVIDADES ── */}
        {isAuthenticated() && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">📋 Mis actividades</h2>
            {inscLoading ? (
              <p className="text-sm text-gray-400 py-4">Cargando...</p>
            ) : misInscripciones.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">Aún no estás inscrito en ninguna actividad</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {misInscripciones.map(insc => {
                  const cfg = estadoConfig[insc.estado] || estadoConfig.pendiente
                  const terminada = insc.fecha_fin ? new Date(insc.fecha_fin) < new Date() : false
                  return (
                    <div key={insc.id}
                      onClick={() => setModalInscripcion(insc)}
                      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition cursor-pointer hover:border-green-200">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-800 text-sm leading-snug flex-1 pr-2">{insc.nombre}</h3>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-500 mt-3">
                        <p>🏢 {insc.entidad_nombre}</p>
                        <p>📍 {insc.municipio}</p>
                        <p>📅 {formatFecha(insc.fecha_inicio)}{insc.fecha_fin ? ` → ${formatFecha(insc.fecha_fin)}` : ''}</p>
                        {terminada && <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">🔒 Finalizada</span>}
                      </div>
                      <p className="text-xs text-green-600 mt-3 font-medium">Ver detalles →</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── BUSCADOR PÚBLICO ── */}
        <h2 className="text-2xl font-bold mb-2">📋 Actividades de Voluntariado</h2>
        <p className="text-gray-500 mb-6">Encuentra actividades y apúntate como voluntario</p>

        <div className="bg-white rounded-xl shadow p-4 mb-6 flex gap-4">
          <input
            className="flex-1 border rounded-lg p-3"
            placeholder="Filtrar por municipio..."
            value={municipio}
            onChange={e => setMunicipio(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargarActividades()}
          />
          <button onClick={cargarActividades} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">Buscar</button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400"><p className="text-4xl mb-2">⏳</p><p>Cargando actividades...</p></div>
        ) : actividades.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow"><p className="text-4xl mb-2">📭</p><p>No hay actividades disponibles</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actividades.map(actividad => {
              const mensaje = mensajes[actividad.id]
              const yaInscrito = mensaje?.tipo === 'ok' || inscritosIds.has(actividad.id)
              const inscritos = actividad.inscritos ?? 0
              const objetivo = actividad.num_voluntarios_objetivo
              const faltan = actividad.faltan ?? Math.max(objetivo - inscritos, 0)
              const cubierta = faltan === 0
              const pct = Math.min(Math.round((inscritos / objetivo) * 100), 100)

              return (
                <div key={actividad.id}
                  onClick={() => setModalActividad(actividad)}
                  className="bg-white rounded-xl shadow p-6 hover:shadow-md transition cursor-pointer hover:border-green-200 border border-transparent">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{actividad.nombre}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${cubierta ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {cubierta ? 'Cubierta' : 'Abierta'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{actividad.descripcion}</p>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p>📍 {actividad.municipio}</p>
                    <p>📅 {formatFecha(actividad.fecha_inicio)}</p>
                    <p>🎯 Objetivo: <span className="font-semibold">{objetivo}</span> · Inscritos: <span className="font-semibold">{inscritos}</span>
                      <span className="ml-1">{cubierta ? <span className="text-green-600 font-semibold">✅</span> : <span className="text-orange-500 font-semibold">· Faltan: {faltan}</span>}</span>
                    </p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                    <div className={`h-1.5 rounded-full ${cubierta ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  {mensaje && (
                    <p className={`text-sm mb-2 text-center font-medium ${mensaje.tipo === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                      {mensaje.tipo === 'ok' ? '✅' : '❌'} {mensaje.texto}
                    </p>
                  )}
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => inscribirse(actividad.id)}
                      disabled={inscribiendo === actividad.id || yaInscrito}
                      className={`w-full rounded-lg py-2 text-sm font-semibold transition ${yaInscrito ? 'bg-green-100 text-green-700 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'}`}
                    >
                      {inscribiendo === actividad.id ? 'Inscribiendo...' : yaInscrito ? '✅ Ya inscrito' : 'Inscribirme'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── MODAL ACTIVIDAD PÚBLICA ── */}
      {modalActividad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setModalActividad(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">{modalActividad.nombre}</h3>
                  <p className="text-green-100 text-sm mt-1">📍 {modalActividad.municipio}</p>
                  {modalActividad.nombre_entidad && <p className="text-green-200 text-xs mt-0.5">🏢 {modalActividad.nombre_entidad}</p>}
                </div>
                <button onClick={() => setModalActividad(null)} className="text-white/60 hover:text-white text-xl ml-4">✕</button>
              </div>
              {(() => { const cubierta = (modalActividad.faltan ?? 1) === 0; return (
                <span className={`mt-3 inline-block text-xs font-semibold px-3 py-1 rounded-full ${cubierta ? 'bg-gray-200 text-gray-700' : 'bg-green-200 text-green-900'}`}>
                  {cubierta ? 'Cubierta' : 'Abierta'}
                </span>
              )})()}
            </div>
            <div className="p-6 space-y-4">
              {modalActividad.descripcion && (
                <p className="text-sm text-gray-600">{modalActividad.descripcion}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha inicio</p>
                  <p className="text-sm font-semibold text-gray-700">{new Date(modalActividad.fecha_inicio).toLocaleDateString('es-ES')}</p>
                </div>
                {modalActividad.fecha_fin && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha fin</p>
                    <p className="text-sm font-semibold text-gray-700">{new Date(modalActividad.fecha_fin).toLocaleDateString('es-ES')}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Objetivo</p>
                  <p className="text-sm font-semibold text-gray-700">{modalActividad.num_voluntarios_objetivo} voluntarios</p>
                </div>
                {modalActividad.inscritos !== undefined && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Inscritos</p>
                    <p className="text-sm font-semibold text-green-600">{modalActividad.inscritos} / {modalActividad.num_voluntarios_objetivo}</p>
                  </div>
                )}
              </div>
              {modalActividad.horarios && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Horarios</p>
                  <p className="text-sm text-gray-700">{modalActividad.horarios}</p>
                </div>
              )}
              {mensajes[modalActividad.id] && (
                <p className={`text-sm text-center font-medium ${mensajes[modalActividad.id].tipo === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                  {mensajes[modalActividad.id].tipo === 'ok' ? '✅' : '❌'} {mensajes[modalActividad.id].texto}
                </p>
              )}
              {(() => {
                const yaInscrito = mensajes[modalActividad.id]?.tipo === 'ok' || inscritosIds.has(modalActividad.id)
                return (
                  <button
                    onClick={() => inscribirse(modalActividad.id)}
                    disabled={inscribiendo === modalActividad.id || yaInscrito}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${yaInscrito ? 'bg-green-100 text-green-700 cursor-default' : 'text-white hover:opacity-90 disabled:opacity-50'}`}
                    style={!yaInscrito ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}
                  >
                    {inscribiendo === modalActividad.id ? 'Inscribiendo...' : yaInscrito ? '✅ Ya inscrito' : '✋ Inscribirme en esta actividad'}
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL MIS INSCRIPCIONES ── */}
      {modalInscripcion && (() => {
        const cfg = estadoConfig[modalInscripcion.estado] || estadoConfig.pendiente
        const terminada = modalInscripcion.fecha_fin ? new Date(modalInscripcion.fecha_fin) < new Date() : false
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setModalInscripcion(null)}>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-lg leading-tight">{modalInscripcion.nombre}</h3>
                    <p className="text-green-100 text-sm mt-1">📍 {modalInscripcion.municipio}</p>
                    <p className="text-green-200 text-xs mt-0.5">🏢 {modalInscripcion.entidad_nombre}</p>
                  </div>
                  <button onClick={() => setModalInscripcion(null)} className="text-white/60 hover:text-white text-xl ml-4">✕</button>
                </div>
                <span className="mt-3 inline-block text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.emoji} {cfg.label}
                </span>
              </div>
              <div className="p-6 space-y-4">
                {modalInscripcion.descripcion && (
                  <p className="text-sm text-gray-600">{modalInscripcion.descripcion}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha inicio</p>
                    <p className="text-sm font-semibold text-gray-700">{new Date(modalInscripcion.fecha_inicio).toLocaleDateString('es-ES')}</p>
                  </div>
                  {modalInscripcion.fecha_fin && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha fin</p>
                      <p className="text-sm font-semibold text-gray-700">{new Date(modalInscripcion.fecha_fin).toLocaleDateString('es-ES')}</p>
                    </div>
                  )}
                  {modalInscripcion.num_voluntarios_objetivo && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Objetivo</p>
                      <p className="text-sm font-semibold text-gray-700">{modalInscripcion.num_voluntarios_objetivo} voluntarios</p>
                    </div>
                  )}
                  {modalInscripcion.inscritos !== undefined && modalInscripcion.num_voluntarios_objetivo && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Inscritos</p>
                      <p className="text-sm font-semibold text-green-600">{modalInscripcion.inscritos} / {modalInscripcion.num_voluntarios_objetivo}</p>
                    </div>
                  )}
                </div>
                {modalInscripcion.horarios && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Horarios</p>
                    <p className="text-sm text-gray-700">{modalInscripcion.horarios}</p>
                  </div>
                )}
                {terminada && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-sm text-gray-500">🔒 Esta actividad ha finalizado</p>
                  </div>
                )}
                <div className="rounded-xl p-4 text-sm font-medium text-center" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.emoji} Tu estado: <span className="font-bold">{cfg.label}</span>
                  {modalInscripcion.estado === 'confirmado' && <p className="text-xs mt-1 font-normal opacity-80">La entidad ha confirmado tu participación</p>}
                  {(modalInscripcion.estado === 'pendiente' || modalInscripcion.estado === 'inscrito') && <p className="text-xs mt-1 font-normal opacity-80">Esperando confirmación de la entidad</p>}
                  {modalInscripcion.estado === 'rechazado' && <p className="text-xs mt-1 font-normal opacity-80">La entidad no ha podido aceptar tu solicitud</p>}
                </div>
                <button onClick={() => setModalInscripcion(null)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
