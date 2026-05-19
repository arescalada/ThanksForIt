import { useState, useEffect } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/auth'
import Mensajes from './Mensajes'

interface Actividad {
  id: string
  nombre: string
  descripcion: string
  municipio: string
  fecha_inicio: string
  fecha_fin: string
  horarios: string
  num_voluntarios_objetivo: number
  estado: string
  inscritos?: number
  faltan?: number
}

interface Voluntario {
  id: string
  usuario_id: string
  nombre: string
  apellidos: string
  email: string
  telefono?: string
  municipio?: string
  vinculacion?: string
}

interface Inscripcion {
  id: string
  voluntario_id: string
  usuario_id: string
  nombre: string
  apellidos: string
  email: string
  telefono?: string
  municipio?: string
  estado: string
  fecha_inscripcion: string
}

interface Entidad {
  id: string
  nombre_legal: string
  direccion: string
  web: string
  admin_nombre: string
  admin_email: string
  delegado_nombre: string
  delegado_cargo: string
}

interface Props {
  usuario: { id: string; email: string; tipo_usuario: string }
  onLogout: () => void
}

export default function DelegadoDashboard({ usuario, onLogout }: Props) {
  const [vista, setVista] = useState<'dashboard' | 'voluntarios' | 'inscripciones' | 'mensajes' | 'perfil' | 'equipo' | 'horas'>('dashboard')
  const [entidad, setEntidad] = useState<Entidad | null>(null)
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [actividadSeleccionada, setActividadSeleccionada] = useState<Actividad | null>(null)
  const [loading, setLoading] = useState(true)
  const [inscLoading, setInscLoading] = useState(false)
  const [noLeidos, setNoLeidos] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [chatInicialUsuarioId, setChatInicialUsuarioId] = useState<string | undefined>()
  const [chatInicialEmail, setChatInicialEmail] = useState<string | undefined>()
  const [chatInicialActividadId, setChatInicialActividadId] = useState<string | undefined>()
  const [chatInicialActividadNombre, setChatInicialActividadNombre] = useState<string | undefined>()

  // Horas pendientes
  interface HoraPendiente {
    id: string; horas: number; fecha_registro: string; notas: string; estado: string;
    actividad_nombre: string; voluntario_nombre: string; voluntario_apellidos: string; voluntario_email: string;
  }
  const [horasPendientes, setHorasPendientes] = useState<HoraPendiente[]>([])
  const [horasLoading, setHorasLoading] = useState(false)
  const [horasMensaje, setHorasMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)
  const [horasPendientesCount, setHorasPendientesCount] = useState(0)

  // Perfil
  const [formPerfil, setFormPerfil] = useState({ nombre: '', cargo: '', telefono: '', dni: '', direccion: '', fecha_nacimiento: '' })
  const [perfilLoading, setPerfilLoading] = useState(false)
  const [perfilError, setPerfilError] = useState('')
  const [perfilSuccess, setPerfilSuccess] = useState('')

  // Equipo (entidad + compañeros delegados)
  interface Companero { id: string; nombre: string; cargo: string; usuario_id: string; email: string }
  interface EquipoData { entidad: { usuario_id: string; email: string; nombre_legal: string }; companeros: Companero[] }
  const [equipo, setEquipo] = useState<EquipoData | null>(null)
  const [equipoLoading, setEquipoLoading] = useState(false)
  const [mensajeDestinatarioId, setMensajeDestinatarioId] = useState<string | null>(null)
  const [formMensaje, setFormMensaje] = useState({ asunto: '', cuerpo: '' })
  const [enviandoMensaje, setEnviandoMensaje] = useState(false)
  const [mensajeOk, setMensajeOk] = useState('')
  const [mensajeError, setMensajeError] = useState('')

  // Modal detalle voluntario
  interface ActividadVoluntario { actividad_id: string; nombre: string; estado: string }
  interface VoluntarioDetalle { voluntario: Voluntario; actividades: ActividadVoluntario[] }
  const [voluntarioDetalle, setVoluntarioDetalle] = useState<VoluntarioDetalle | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [mostrarPerfilEnModal, setMostrarPerfilEnModal] = useState(false)

  useEffect(() => {
    cargarDatos()
    cargarNoLeidos()
    cargarVoluntarios()
    cargarHorasPendientes()

    // Polling en tiempo real cada 8s — todo actualizado
    const interval = setInterval(() => {
      cargarDatos(true)
      cargarNoLeidos()
      cargarVoluntarios(true)
      cargarHorasPendientes(true)
      // Si hay actividad seleccionada, refrescar sus inscripciones
      setActividadSeleccionada(prev => {
        if (prev) {
          axios.get(`/api/delegados/inscripciones/${prev.id}`, { headers: getAuthHeaders() })
            .then(res => setInscripciones(res.data))
            .catch(() => {})
        }
        return prev
      })
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (vista === 'equipo') cargarEquipo()
  }, [vista])

  const cargarHorasPendientes = async (silencioso = false) => {
    try {
      if (!silencioso) setHorasLoading(true)
      const res = await axios.get('/api/horas/pendientes-delegado', { headers: getAuthHeaders() })
      setHorasPendientes(res.data)
      setHorasPendientesCount(res.data.length)
    } catch (err) { console.error(err) }
    finally { if (!silencioso) setHorasLoading(false) }
  }

  const accionHoras = async (id: string, accion: 'aprobar-delegado' | 'rechazar-delegado') => {
    try {
      await axios.put(`/api/horas/${id}/${accion}`, {}, { headers: getAuthHeaders() })
      setHorasMensaje({ texto: accion === 'aprobar-delegado' ? '✅ Horas aprobadas y enviadas a la entidad' : '❌ Horas rechazadas', tipo: 'ok' })
      cargarHorasPendientes()
      setTimeout(() => setHorasMensaje(null), 4000)
    } catch (err: any) {
      setHorasMensaje({ texto: err.response?.data?.error || 'Error al procesar', tipo: 'error' })
      setTimeout(() => setHorasMensaje(null), 4000)
    }
  }

  const cargarDatos = async (silencioso = false) => {
    try {
      if (!silencioso) setLoading(true)
      const [entRes, actRes] = await Promise.all([
        axios.get('/api/delegados/mi-entidad', { headers: getAuthHeaders() }),
        axios.get('/api/delegados/mis-actividades', { headers: getAuthHeaders() }),
      ])
      setEntidad(entRes.data)
      setActividades(actRes.data)
      setFormPerfil({
        nombre: entRes.data.delegado_nombre || '',
        cargo: entRes.data.delegado_cargo || '',
        telefono: entRes.data.delegado_telefono || '',
        dni: entRes.data.delegado_dni || '',
        direccion: entRes.data.delegado_direccion || '',
        fecha_nacimiento: entRes.data.delegado_fecha_nacimiento ? entRes.data.delegado_fecha_nacimiento.split('T')[0] : '',
      })
    } catch (err) {
      console.error(err)
    } finally {
      if (!silencioso) setLoading(false)
    }
  }

  const cargarEquipo = async () => {
    try {
      setEquipoLoading(true)
      const res = await axios.get('/api/delegados/mi-equipo', { headers: getAuthHeaders() })
      setEquipo(res.data)
    } catch (err) { console.error(err) }
    finally { setEquipoLoading(false) }
  }

  const enviarMensajeEquipo = async () => {
    if (!mensajeDestinatarioId) return
    if (!formMensaje.asunto.trim() || !formMensaje.cuerpo.trim()) {
      setMensajeError('Asunto y mensaje son obligatorios')
      setTimeout(() => setMensajeError(''), 3000)
      return
    }
    try {
      setEnviandoMensaje(true)
      // Si el destinatario es la entidad, usar endpoint específico
      const esEntidad = mensajeDestinatarioId === equipo?.entidad.usuario_id
      if (esEntidad) {
        await axios.post('/api/delegados/mensaje-entidad', formMensaje, { headers: getAuthHeaders() })
      } else {
        // Compañero delegado: usar el endpoint general de mensajes
        await axios.post('/api/mensajes', {
          destinatario_id: mensajeDestinatarioId,
          asunto: formMensaje.asunto.trim(),
          cuerpo: formMensaje.cuerpo.trim(),
          relacionado_tipo: 'entidad_delegado',
        }, { headers: getAuthHeaders() })
      }
      setMensajeOk('✅ Mensaje enviado')
      setFormMensaje({ asunto: '', cuerpo: '' })
      setMensajeDestinatarioId(null)
      setTimeout(() => setMensajeOk(''), 3000)
    } catch (err: any) {
      setMensajeError(err.response?.data?.error || 'Error al enviar mensaje')
      setTimeout(() => setMensajeError(''), 3000)
    } finally {
      setEnviandoMensaje(false)
    }
  }

  const cargarVoluntarios = async (silencioso = false) => {
    try {
      const res = await axios.get('/api/delegados/mis-voluntarios', { headers: getAuthHeaders() })
      setVoluntarios(res.data)
    } catch (err) { console.error(err) }
  }

  const abrirDetalleVoluntario = async (v: Voluntario) => {
    setDetalleLoading(true)
    setMostrarPerfilEnModal(false)
    setVoluntarioDetalle({ voluntario: v, actividades: [] })
    try {
      const res = await axios.get(`/api/delegados/voluntario/${v.id}/actividades`, { headers: getAuthHeaders() })
      setVoluntarioDetalle({ voluntario: v, actividades: res.data })
    } catch {
      setVoluntarioDetalle({ voluntario: v, actividades: [] })
    } finally {
      setDetalleLoading(false)
    }
  }

  const cargarNoLeidos = async () => {
    try {
      const res = await axios.get('/api/mensajes/no-leidos?t=' + Date.now(), { headers: getAuthHeaders() })
      setNoLeidos(res.data.no_leidos || 0)
    } catch {}
    try {
      const res2 = await axios.get('/api/horas/pendientes-delegado', { headers: getAuthHeaders() })
      setHorasPendientesCount(res2.data.length)
    } catch {}
  }

  const abrirInscripciones = async (actividad: Actividad) => {
    setActividadSeleccionada(actividad)
    setVista('inscripciones')
    try {
      setInscLoading(true)
      const res = await axios.get(`/api/delegados/inscripciones/${actividad.id}`, { headers: getAuthHeaders() })
      setInscripciones(res.data)
    } catch (err) { console.error(err) }
    finally { setInscLoading(false) }
  }

  const guardarPerfil = async () => {
    setPerfilError('')
    if (!formPerfil.nombre) { setPerfilError('El nombre es obligatorio'); return }
    try {
      setPerfilLoading(true)
      await axios.put('/api/delegados/mi-perfil', formPerfil, { headers: getAuthHeaders() })
      setPerfilSuccess('✅ Perfil actualizado correctamente')
      setEntidad(prev => prev ? { ...prev, delegado_nombre: formPerfil.nombre, delegado_cargo: formPerfil.cargo } : prev)
      setTimeout(() => setPerfilSuccess(''), 3000)
    } catch (err: any) {
      setPerfilError(err.response?.data?.error || 'Error al guardar')
    } finally {
      setPerfilLoading(false)
    }
  }

  const formatFecha = (f: string) =>
    new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

  const actividadTerminada = (a: Actividad) => new Date(a.fecha_fin) < new Date()

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

  const estadoInscripcion: Record<string, { label: string; bg: string; color: string }> = {
    pendiente:  { label: 'Pendiente',  bg: '#fef9c3', color: '#854d0e' },
    inscrito:   { label: 'Pendiente',  bg: '#fef9c3', color: '#854d0e' },
    confirmado: { label: 'Confirmado', bg: '#dcfce7', color: '#166534' },
    cancelado:  { label: 'Rechazado',  bg: '#fee2e2', color: '#991b1b' },
    rechazado:  { label: 'Rechazado',  bg: '#fee2e2', color: '#991b1b' },
  }

  if (vista === 'mensajes') return (
    <Mensajes
      onBack={() => {
        setVista('dashboard')
        cargarNoLeidos()
        setChatInicialUsuarioId(undefined)
        setChatInicialEmail(undefined)
        setChatInicialActividadId(undefined)
        setChatInicialActividadNombre(undefined)
      }}
      onUnreadChange={setNoLeidos}
      chatInicialUsuarioId={chatInicialUsuarioId}
      chatInicialEmail={chatInicialEmail}
      chatInicialActividadId={chatInicialActividadId}
      chatInicialActividadNombre={chatInicialActividadNombre}
    />
  )

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>

      {/* NAV */}
      <nav className="px-4 sm:px-6 py-3 flex justify-between items-center shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-base sm:text-lg text-white">Thanks For It</span>
          <span className="hidden sm:inline" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 10px', borderRadius: '999px', marginLeft: '8px' }}>
            Delegado
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-100 text-sm hidden md:block">{usuario.email}</span>
          <button
            onClick={() => setVista('mensajes')}
            className="relative text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl border border-white text-white hover:bg-white hover:text-green-800 transition"
          >
            📬
            {noLeidos > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
          <button onClick={onLogout} className="text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl border border-white text-white hover:bg-white hover:text-green-800 transition">
            <span className="hidden sm:inline">Cerrar sesión</span>
            <span className="sm:hidden">✕</span>
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-3 sm:p-6">

        {/* HERO */}
        <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
          <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-5xl sm:text-8xl opacity-20">🤝</div>
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 pr-12">
            ¡Hola, {entidad?.delegado_nombre || usuario.email.split('@')[0]}! 👋 Bienvenido/a a Thanks For It
          </h2>
          <p className="text-green-100 text-sm sm:text-base">
            {entidad?.delegado_cargo && <span className="font-semibold">{entidad.delegado_cargo} · </span>}
            {entidad?.nombre_legal || 'Cargando entidad...'}
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 flex-wrap">
          <button onClick={() => setVista('dashboard')}
            className={`px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'dashboard' || vista === 'inscripciones' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'dashboard' || vista === 'inscripciones' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            📋 Actividades
          </button>
          <button onClick={() => setVista('voluntarios')}
            className={`px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'voluntarios' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'voluntarios' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            🙋 Voluntarios
          </button>
          <button onClick={() => setVista('mensajes')}
            className={`relative px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'mensajes' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'mensajes' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            📬 Mensajes
            {noLeidos > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
          <button onClick={() => setVista('perfil')}
            className={`px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'perfil' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'perfil' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            👤 Mi Perfil
          </button>
          <button onClick={() => setVista('equipo')}
            className={`px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'equipo' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'equipo' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            🏢 Mi Equipo
          </button>
          <button onClick={() => { setVista('horas'); setHorasPendientesCount(0) }}
            className={`relative px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'horas' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'horas' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            ⏱️ Horas
            {horasPendientesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {horasPendientesCount > 9 ? '9+' : horasPendientesCount}
              </span>
            )}
          </button>
        </div>

        {/* ── ACTIVIDADES ── */}
        {vista === 'dashboard' && (
          loading ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-2">⏳</p><p>Cargando actividades...</p>
            </div>
          ) : actividades.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-2">📭</p>
              <p className="font-medium">La entidad no tiene actividades creadas aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actividades.map(a => {
                const terminada = actividadTerminada(a)
                return (
                  <div key={a.id} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-800">{a.nombre}</h3>
                      <div className="flex gap-2">
                        {terminada && (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-500">
                            Finalizada
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.estado === 'publicada' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {a.estado}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{a.descripcion}</p>
                    <div className="space-y-1 text-xs text-gray-500 mb-4">
                      <p>📍 {a.municipio}</p>
                      <p>📅 {formatFecha(a.fecha_inicio)} → {formatFecha(a.fecha_fin)}</p>
                      <p>🎯 Objetivo: <span className="font-semibold text-gray-700">{a.num_voluntarios_objetivo}</span> voluntarios</p>
                      {a.inscritos !== undefined && (
                        <p>
                          👥 Inscritos: <span className="font-semibold text-gray-700">{a.inscritos}</span>
                          <span className="mx-1 text-gray-300">·</span>
                          {(a.faltan ?? 0) > 0
                            ? <span className="text-orange-500 font-semibold">Faltan: {a.faltan}</span>
                            : <span className="text-green-600 font-semibold">✅ Cubierta</span>
                          }
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => abrirInscripciones(a)}
                      className="w-full py-2 rounded-xl text-xs font-semibold text-white transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                      👥 Ver voluntarios e inscripciones
                    </button>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── INSCRIPCIONES DE ACTIVIDAD ── */}
        {vista === 'inscripciones' && actividadSeleccionada && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setVista('dashboard')} className="text-sm text-gray-500 hover:text-gray-700">
                ← Volver
              </button>
              <div>
                <h3 className="font-semibold text-gray-800">{actividadSeleccionada.nombre}</h3>
                <p className="text-xs text-gray-400">📍 {actividadSeleccionada.municipio} · {formatFecha(actividadSeleccionada.fecha_inicio)} → {formatFecha(actividadSeleccionada.fecha_fin)}</p>
              </div>
              {actividadTerminada(actividadSeleccionada) && (
                <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-500 font-medium ml-auto">🔒 Actividad finalizada</span>
              )}
            </div>

            {inscLoading ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
                <p className="text-4xl mb-2">⏳</p><p>Cargando...</p>
              </div>
            ) : inscripciones.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">📭</p>
                <p className="font-medium">No hay inscripciones en esta actividad</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-2">{inscripciones.length} inscripción{inscripciones.length !== 1 ? 'es' : ''}</p>
                {inscripciones.map(insc => {
                  const cfg = estadoInscripcion[insc.estado] || estadoInscripcion.pendiente
                  const confirmado = insc.estado === 'confirmado'
                  const terminada = actividadTerminada(actividadSeleccionada)
                  const volNombre = insc.nombre && insc.nombre !== 'Pendiente'
                    ? `${insc.nombre} ${insc.apellidos || ''}`.trim()
                    : insc.email

                  return (
                    <div key={insc.id} className="bg-white rounded-2xl p-5 border border-gray-100">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                            {(insc.nombre?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800">{volNombre}</p>
                            <p className="text-sm text-gray-400">{insc.email}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {insc.telefono && <span className="text-xs text-gray-400">📞 {insc.telefono}</span>}
                              {insc.municipio && <span className="text-xs text-gray-400">📍 {insc.municipio}</span>}
                              <span className="text-xs text-gray-400">
                                {new Date(insc.fecha_inscripcion).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          {confirmado && !terminada && (
                            <button
                              onClick={() => {
                                setChatInicialUsuarioId(insc.usuario_id)
                                setChatInicialEmail(insc.email)
                                setChatInicialActividadId(actividadSeleccionada.id)
                                setChatInicialActividadNombre(actividadSeleccionada.nombre)
                                setVista('mensajes')
                              }}
                              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                            >
                              💬 Chat actividad
                            </button>
                          )}
                          {confirmado && terminada && (
                            <span className="text-xs text-gray-400 px-2 py-1 rounded-lg bg-gray-50">🔒 Chat cerrado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VOLUNTARIOS ── */}
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

            {voluntariosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">📭</p>
                <p className="font-medium">No hay voluntarios en las actividades de la entidad</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 px-1">{voluntariosFiltrados.length} voluntario{voluntariosFiltrados.length !== 1 ? 's' : ''}</p>
                {voluntariosFiltrados.map(v => (
                  <div key={v.id}
                    onClick={() => abrirDetalleVoluntario(v)}
                    className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md hover:border-green-200 transition cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                          {(v.nombre?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{v.nombre} {v.apellidos}</p>
                          <p className="text-sm text-gray-400 truncate">{v.email}</p>
                          <div className="flex flex-wrap gap-3 mt-1">
                            {v.telefono && <span className="text-xs text-gray-400">📞 {v.telefono}</span>}
                            {v.municipio && <span className="text-xs text-gray-400">📍 {v.municipio}</span>}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-green-600 font-medium flex-shrink-0">Ver detalle →</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MODAL DETALLE VOLUNTARIO (DELEGADO) ── */}
        {voluntarioDetalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setVoluntarioDetalle(null)}>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Cabecera */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
                    {(voluntarioDetalle.voluntario.nombre?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-lg">
                      {voluntarioDetalle.voluntario.nombre} {voluntarioDetalle.voluntario.apellidos}
                    </h3>
                    <p className="text-sm text-gray-400">{voluntarioDetalle.voluntario.email}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {voluntarioDetalle.voluntario.telefono && (
                        <span className="text-xs text-gray-400">📞 {voluntarioDetalle.voluntario.telefono}</span>
                      )}
                      {voluntarioDetalle.voluntario.municipio && (
                        <span className="text-xs text-gray-400">📍 {voluntarioDetalle.voluntario.municipio}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setVoluntarioDetalle(null)} className="text-gray-300 hover:text-gray-500 text-xl ml-2">✕</button>
                </div>
                {/* Botones acción */}
                <div className="mt-4 flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setChatInicialUsuarioId(voluntarioDetalle.voluntario.usuario_id)
                      setChatInicialEmail(voluntarioDetalle.voluntario.email)
                      setChatInicialActividadId(undefined)
                      setChatInicialActividadNombre(undefined)
                      setVoluntarioDetalle(null)
                      setVista('mensajes')
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                  >💬 Enviar mensaje</button>
                  <button
                    onClick={() => setMostrarPerfilEnModal(p => !p)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${mostrarPerfilEnModal ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                  >👤 Perfil</button>
                </div>
              </div>
              {/* Datos del perfil */}
              {mostrarPerfilEnModal && (
                <div className="px-6 py-4 bg-blue-50/40 border-b border-blue-100 grid grid-cols-2 gap-3">
                  {voluntarioDetalle.voluntario.telefono && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Teléfono</p>
                      <p className="text-sm font-medium text-gray-700">{voluntarioDetalle.voluntario.telefono}</p>
                    </div>
                  )}
                  {voluntarioDetalle.voluntario.municipio &&
                   voluntarioDetalle.voluntario.municipio !== 'Sin dirección' && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Dirección</p>
                      <p className="text-sm font-medium text-gray-700">{voluntarioDetalle.voluntario.municipio}</p>
                    </div>
                  )}
                </div>
              )}
              {/* Actividades */}
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>📋 Actividades en las que participa</span>
                  {voluntarioDetalle.actividades.length > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {voluntarioDetalle.actividades.length}
                    </span>
                  )}
                </h4>
                {detalleLoading ? (
                  <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>
                ) : voluntarioDetalle.actividades.length === 0 ? (
                  <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                    No participa en ninguna actividad de la entidad aún
                  </p>
                ) : (
                  <div className="space-y-2">
                    {voluntarioDetalle.actividades.map(a => {
                      const cfg = estadoInscripcion[a.estado] || estadoInscripcion.pendiente
                      return (
                        <div key={a.actividad_id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                          <span className="text-sm text-gray-700 font-medium">{a.nombre}</span>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2"
                            style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                <button onClick={() => setVoluntarioDetalle(null)}
                  className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PERFIL ── */}
        {vista === 'perfil' && (
          <div className="max-w-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-5">👤 Mi Perfil</h3>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
                  {(formPerfil.nombre?.[0] || usuario.email[0]).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{formPerfil.nombre || usuario.email}</p>
                  <p className="text-sm text-gray-400">{usuario.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{entidad?.nombre_legal}</p>
                </div>
              </div>

              {perfilError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{perfilError}</div>}
              {perfilSuccess && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl mb-4">{perfilSuccess}</div>}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nombre completo *</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Tu nombre"
                      value={formPerfil.nombre}
                      onChange={e => setFormPerfil({ ...formPerfil, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Cargo</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Ej: Coordinador"
                      value={formPerfil.cargo}
                      onChange={e => setFormPerfil({ ...formPerfil, cargo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">DNI / NIE</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="12345678A"
                      value={formPerfil.dni}
                      onChange={e => setFormPerfil({ ...formPerfil, dni: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Teléfono</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="600000000"
                      value={formPerfil.telefono}
                      onChange={e => setFormPerfil({ ...formPerfil, telefono: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Fecha de nacimiento</label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      value={formPerfil.fecha_nacimiento}
                      onChange={e => setFormPerfil({ ...formPerfil, fecha_nacimiento: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Dirección</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Calle, número, ciudad"
                      value={formPerfil.direccion}
                      onChange={e => setFormPerfil({ ...formPerfil, direccion: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Email (no editable)</label>
                  <input
                    className="w-full border border-gray-100 rounded-xl p-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                    value={usuario.email}
                    disabled
                  />
                  <p className="text-xs text-gray-400 mt-1">El email lo gestiona la entidad</p>
                </div>
              </div>

              <button
                onClick={guardarPerfil}
                disabled={perfilLoading}
                className="w-full mt-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                {perfilLoading ? 'Guardando...' : '✅ Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* ── MI EQUIPO ── */}
        {vista === 'equipo' && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-5">🏢 Mi Equipo</h3>

            {mensajeOk && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm mb-4">{mensajeOk}</div>}
            {mensajeError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{mensajeError}</div>}

            {equipoLoading ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
                <p className="text-4xl mb-2">⏳</p><p>Cargando equipo...</p>
              </div>
            ) : !equipo ? null : (
              <div className="space-y-3">

                {/* La entidad */}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Entidad</p>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
                        🏢
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">{equipo.entidad.nombre_legal}</p>
                        <p className="text-sm text-gray-400 truncate">{equipo.entidad.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setMensajeDestinatarioId(mensajeDestinatarioId === equipo.entidad.usuario_id ? null : equipo.entidad.usuario_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex-shrink-0"
                    >
                      📩 Mensaje
                    </button>
                  </div>
                  {mensajeDestinatarioId === equipo.entidad.usuario_id && (
                    <div className="border-t border-gray-100 p-5 bg-blue-50/30">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mensaje a {equipo.entidad.nombre_legal}</p>
                      <div className="space-y-3">
                        <input
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 bg-white"
                          placeholder="Asunto"
                          value={formMensaje.asunto}
                          onChange={e => setFormMensaje(prev => ({ ...prev, asunto: e.target.value }))}
                        />
                        <textarea
                          className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 bg-white resize-none"
                          placeholder="Escribe tu mensaje..."
                          rows={3}
                          value={formMensaje.cuerpo}
                          onChange={e => setFormMensaje(prev => ({ ...prev, cuerpo: e.target.value }))}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setMensajeDestinatarioId(null); setFormMensaje({ asunto: '', cuerpo: '' }) }}
                            className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                          >Cancelar</button>
                          <button
                            onClick={enviarMensajeEquipo}
                            disabled={enviandoMensaje}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                          >{enviandoMensaje ? 'Enviando...' : '📩 Enviar'}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Compañeros delegados */}
                {equipo.companeros.length > 0 && (
                  <>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mt-4 mb-2">Compañeros delegados</p>
                    {equipo.companeros.map(c => (
                      <div key={c.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                              {(c.nombre?.[0] || '?').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-800">{c.nombre}</p>
                                {c.cargo && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{c.cargo}</span>}
                              </div>
                              <p className="text-sm text-gray-400 truncate">{c.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setMensajeDestinatarioId(mensajeDestinatarioId === c.usuario_id ? null : c.usuario_id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex-shrink-0"
                          >📩 Mensaje</button>
                        </div>
                        {mensajeDestinatarioId === c.usuario_id && (
                          <div className="border-t border-gray-100 p-5 bg-blue-50/30">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mensaje a {c.nombre}</p>
                            <div className="space-y-3">
                              <input
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 bg-white"
                                placeholder="Asunto"
                                value={formMensaje.asunto}
                                onChange={e => setFormMensaje(prev => ({ ...prev, asunto: e.target.value }))}
                              />
                              <textarea
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 bg-white resize-none"
                                placeholder="Escribe tu mensaje..."
                                rows={3}
                                value={formMensaje.cuerpo}
                                onChange={e => setFormMensaje(prev => ({ ...prev, cuerpo: e.target.value }))}
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => { setMensajeDestinatarioId(null); setFormMensaje({ asunto: '', cuerpo: '' }) }}
                                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                                >Cancelar</button>
                                <button
                                  onClick={enviarMensajeEquipo}
                                  disabled={enviandoMensaje}
                                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                                >{enviandoMensaje ? 'Enviando...' : '📩 Enviar'}</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {equipo.companeros.length === 0 && (
                  <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-100 mt-2">
                    <p className="text-3xl mb-2">👤</p>
                    <p className="text-sm">No hay otros delegados en tu entidad aún</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── HORAS PENDIENTES ── */}
        {vista === 'horas' && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">⏱️ Horas pendientes de revisión</h3>
            <p className="text-sm text-gray-500 mb-5">Revisa las horas que los voluntarios han registrado. Si las apruebas, irán a la entidad para validación final.</p>

            {horasMensaje && (
              <div className={`p-3 rounded-xl text-sm mb-4 ${horasMensaje.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {horasMensaje.texto}
              </div>
            )}

            {horasLoading ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
                <p className="text-4xl mb-2">⏳</p><p>Cargando horas...</p>
              </div>
            ) : horasPendientes.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">✅</p>
                <p className="font-medium">No hay horas pendientes de revisión</p>
                <p className="text-sm mt-1">Cuando un voluntario registre horas, aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-3">
                {horasPendientes.map(h => (
                  <div key={h.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-800">{h.voluntario_nombre} {h.voluntario_apellidos}</span>
                          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{h.voluntario_email}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          📋 <span className="font-medium">{h.actividad_nombre}</span>
                          <span className="mx-2 text-gray-300">·</span>
                          🕐 <span className="font-bold text-blue-600">{h.horas}h</span>
                          <span className="mx-2 text-gray-300">·</span>
                          📅 {new Date(h.fecha_registro).toLocaleDateString('es-ES')}
                        </p>
                        {h.notas && <p className="text-xs text-gray-400 italic">"{h.notas}"</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => accionHoras(h.id, 'aprobar-delegado')}
                          className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition"
                        >
                          ✅ Aprobar
                        </button>
                        <button
                          onClick={() => accionHoras(h.id, 'rechazar-delegado')}
                          className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition"
                        >
                          ❌ Rechazar
                        </button>
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
