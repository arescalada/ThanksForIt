import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/auth'

interface Mensaje {
  id: string
  remitente_id: string
  remitente_email: string
  remitente_tipo: string
  asunto: string
  cuerpo: string
  leido: boolean
  relacionado_tipo?: string
  relacionado_id?: string
  actividad_id?: string
  created_at: string
  // Info de actividad (en mensajes de inscripción/invitación)
  actividad_nombre?: string
  actividad_municipio?: string
  actividad_fecha_inicio?: string
  actividad_fecha_fin?: string
  actividad_horarios?: string
  actividad_entidad_nombre?: string
}

interface Conversacion {
  otro_usuario_id: string
  otro_email: string
  otro_tipo: string
  ultima_fecha: string
  no_leidos?: number
}

interface ConversacionActividad {
  actividad_id: string
  actividad_nombre: string
  actividad_fecha_fin: string
  otro_usuario_id: string
  otro_email: string
  otro_tipo: string
  ultima_fecha: string
  no_leidos?: number
}

interface Props {
  onBack: () => void
  onUnreadChange?: (count: number) => void
  chatInicialUsuarioId?: string
  chatInicialEmail?: string
  chatInicialActividadId?: string
  chatInicialActividadNombre?: string
}

export default function Mensajes({
  onBack,
  onUnreadChange,
  chatInicialUsuarioId,
  chatInicialEmail,
  chatInicialActividadId,
  chatInicialActividadNombre,
}: Props) {
  // Si viene con actividadId, abrir directo en pestaña actividad-chat
  const tabInicial = chatInicialActividadId ? 'actividad' : chatInicialUsuarioId ? 'chat' : 'bandeja'

  const [tab, setTab] = useState<'bandeja' | 'chat' | 'actividad'>(tabInicial)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState<Mensaje | null>(null)
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [respuestaExito, setRespuestaExito] = useState<Record<string, 'aceptado' | 'rechazado'>>({})
  const [respondiendoMensaje, setRespondiendoMensaje] = useState<string | null>(null)
  const [formRespuesta, setFormRespuesta] = useState({ asunto: '', cuerpo: '' })
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false)
  const [respuestaMensajeOk, setRespuestaMensajeOk] = useState('')

  // Chat directo
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [convLoading, setConvLoading] = useState(false)
  const [chatActivo, setChatActivo] = useState<{ usuarioId: string; email: string } | null>(
    chatInicialUsuarioId && !chatInicialActividadId
      ? { usuarioId: chatInicialUsuarioId, email: chatInicialEmail || '' }
      : null
  )
  const [chatMensajes, setChatMensajes] = useState<Mensaje[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatTexto, setChatTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Chat por actividad
  const [convActividad, setConvActividad] = useState<ConversacionActividad[]>([])
  const [convActividadLoading, setConvActividadLoading] = useState(false)
  const [chatActividadActivo, setChatActividadActivo] = useState<{
    actividadId: string
    actividadNombre: string
    otroUsuarioId: string
    otroEmail: string
    terminada: boolean
  } | null>(
    chatInicialActividadId && chatInicialUsuarioId
      ? {
          actividadId: chatInicialActividadId,
          actividadNombre: chatInicialActividadNombre || '',
          otroUsuarioId: chatInicialUsuarioId,
          otroEmail: chatInicialEmail || '',
          terminada: false,
        }
      : null
  )
  const [chatActividadMensajes, setChatActividadMensajes] = useState<Mensaje[]>([])
  const [chatActividadLoading, setChatActividadLoading] = useState(false)
  const [chatActividadTexto, setChatActividadTexto] = useState('')
  const [enviandoActividad, setEnviandoActividad] = useState(false)

  const [miUsuarioId, setMiUsuarioId] = useState<string>('')
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const chatActividadBottomRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingBandejaRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingActividadRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [noLeidosChat, setNoLeidosChat] = useState(0)
  const [noLeidosActividad, setNoLeidosActividad] = useState(0)

  useEffect(() => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setMiUsuarioId(payload.id || payload.userId || payload.sub || '')
      }
    } catch {}
    cargarMensajes()
    cargarNoLeidosChat()
  }, [])

  // Polling bandeja cada 5s
  useEffect(() => {
    pollingBandejaRef.current = setInterval(() => {
      cargarMensajes(true)
      cargarNoLeidosChat()
    }, 5000)
    return () => { if (pollingBandejaRef.current) clearInterval(pollingBandejaRef.current) }
  }, [])

  // Al cambiar de pestaña, cargar lo que toca
  useEffect(() => {
    if (tab === 'chat') {
      cargarConversaciones()
      if (chatActivo) abrirChat(chatActivo.usuarioId, chatActivo.email)
    }
    if (tab === 'actividad') {
      cargarConversacionesActividad()
      if (chatActividadActivo) {
        abrirChatActividad(
          chatActividadActivo.actividadId,
          chatActividadActivo.actividadNombre,
          chatActividadActivo.otroUsuarioId,
          chatActividadActivo.otroEmail
        )
      }
    }
  }, [tab])

  // Polling chat directo activo cada 3s
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (tab === 'chat' && chatActivo) {
      pollingRef.current = setInterval(() => {
        cargarChatMensajes(chatActivo.usuarioId)
        cargarConversaciones()
      }, 3000)
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [tab, chatActivo])

  // Polling chat actividad activo cada 3s
  useEffect(() => {
    if (pollingActividadRef.current) clearInterval(pollingActividadRef.current)
    if (tab === 'actividad' && chatActividadActivo) {
      pollingActividadRef.current = setInterval(() => {
        cargarChatActividadMensajes(chatActividadActivo.actividadId, chatActividadActivo.otroUsuarioId)
        cargarConversacionesActividad()
      }, 3000)
    }
    return () => { if (pollingActividadRef.current) clearInterval(pollingActividadRef.current) }
  }, [tab, chatActividadActivo])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMensajes])

  useEffect(() => {
    chatActividadBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatActividadMensajes])

  // Si llegamos con actividadId inicial, cargar el chat al montar
  useEffect(() => {
    if (chatInicialActividadId && chatInicialUsuarioId) {
      abrirChatActividad(
        chatInicialActividadId,
        chatInicialActividadNombre || '',
        chatInicialUsuarioId,
        chatInicialEmail || ''
      )
    }
  }, [])

  // ── Bandeja ──────────────────────────────────────────────────────────────────

  const cargarMensajes = async (silencioso = false) => {
    try {
      if (!silencioso) setLoading(true)
      const res = await axios.get('/api/mensajes?t=' + Date.now(), { headers: getAuthHeaders() })
      // Excluir mensajes de chat de actividad — esos van solo a la pestaña "Chat de actividades"
      const soloMensajesDirectos = res.data.filter((m: Mensaje) => !m.actividad_id)
      setMensajes(soloMensajesDirectos)
      onUnreadChange?.(soloMensajesDirectos.filter((m: Mensaje) => !m.leido).length)
    } catch (err) { console.error(err) }
    finally { if (!silencioso) setLoading(false) }
  }

  const cargarNoLeidosChat = async () => {
    try {
      const [dirRes, actRes] = await Promise.all([
        axios.get('/api/mensajes/no-leidos-chat?t=' + Date.now(), { headers: getAuthHeaders() }),
        axios.get('/api/mensajes/actividad-chats?t=' + Date.now(), { headers: getAuthHeaders() }).catch(() => ({ data: [] }))
      ])
      setNoLeidosChat(dirRes.data.no_leidos || 0)
      const noLeidosAct = (actRes.data as ConversacionActividad[]).reduce(
        (acc, c) => acc + (Number(c.no_leidos) || 0), 0
      )
      setNoLeidosActividad(noLeidosAct)
    } catch {}
  }

  const abrirMensaje = async (msg: Mensaje) => {
    setSeleccionado(msg)
    if (!msg.leido) {
      try {
        await axios.put(`/api/mensajes/${msg.id}/leido`, {}, { headers: getAuthHeaders() })
        setMensajes(prev => prev.map(m => m.id === msg.id ? { ...m, leido: true } : m))
        onUnreadChange?.(mensajes.filter(m => !m.leido && m.id !== msg.id).length)
      } catch (err) { console.error(err) }
    }
  }

  const eliminarMensajeBandeja = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await axios.delete(`/api/mensajes/${id}`, { headers: getAuthHeaders() })
      const updated = mensajes.filter(m => m.id !== id)
      setMensajes(updated)
      if (seleccionado?.id === id) setSeleccionado(null)
      onUnreadChange?.(updated.filter(m => !m.leido).length)
    } catch (err) { console.error(err) }
  }

  const esInvitacion = (msg: Mensaje): boolean =>
    msg.relacionado_tipo === 'inscripcion' &&
    !!msg.relacionado_id &&
    msg.asunto.toLowerCase().includes('invitación de voluntariado') &&
    !respuestaExito[msg.id]

  const responderInvitacion = async (msg: Mensaje, accion: 'aceptar' | 'rechazar') => {
    if (!msg.relacionado_id) return
    try {
      setRespondiendo(msg.id + accion)
      await axios.post(`/api/inscripciones/${msg.relacionado_id}/responder`, { accion }, { headers: getAuthHeaders() })
      setRespuestaExito(prev => ({ ...prev, [msg.id]: accion === 'aceptar' ? 'aceptado' : 'rechazado' }))
      if (seleccionado?.id === msg.id) setSeleccionado({ ...msg })
    } catch (err: any) { console.error(err.response?.data || err) }
    finally { setRespondiendo(null) }
  }

  const enviarRespuestaMensaje = async () => {
    if (!seleccionado || !formRespuesta.asunto.trim() || !formRespuesta.cuerpo.trim()) return
    try {
      setEnviandoRespuesta(true)
      await axios.post('/api/mensajes', {
        destinatario_id: seleccionado.remitente_id,
        asunto: formRespuesta.asunto.trim(),
        cuerpo: formRespuesta.cuerpo.trim(),
        relacionado_tipo: seleccionado.relacionado_tipo || null,
        relacionado_id: seleccionado.relacionado_id || null,
      }, { headers: getAuthHeaders() })
      setRespuestaMensajeOk('✅ Respuesta enviada')
      setRespondiendoMensaje(null)
      setFormRespuesta({ asunto: '', cuerpo: '' })
      setTimeout(() => setRespuestaMensajeOk(''), 3000)
    } catch (err: any) {
      console.error(err.response?.data || err)
    } finally {
      setEnviandoRespuesta(false)
    }
  }

  // ── Chat directo ─────────────────────────────────────────────────────────────

  const cargarConversaciones = async () => {
    try {
      setConvLoading(true)
      const res = await axios.get('/api/mensajes/conversaciones', { headers: getAuthHeaders() })
      setConversaciones(res.data)
    } catch (err) { console.error(err) }
    finally { setConvLoading(false) }
  }

  const cargarChatMensajes = async (otroUsuarioId: string) => {
    try {
      const res = await axios.get(`/api/mensajes/conversacion/${otroUsuarioId}`, { headers: getAuthHeaders() })
      setChatMensajes(res.data)
    } catch (err) { console.error(err) }
  }

  const abrirChat = async (otroUsuarioId: string, otroEmail: string) => {
    setChatActivo({ usuarioId: otroUsuarioId, email: otroEmail })
    setChatLoading(true)
    try { await cargarChatMensajes(otroUsuarioId) }
    finally { setChatLoading(false) }
    cargarConversaciones()
    cargarNoLeidosChat()
  }

  const enviarChatMensaje = async () => {
    if (!chatActivo || !chatTexto.trim()) return
    try {
      setEnviando(true)
      await axios.post('/api/mensajes/directo', {
        destinatario_id: chatActivo.usuarioId,
        cuerpo: chatTexto.trim()
      }, { headers: getAuthHeaders() })
      setChatTexto('')
      await cargarChatMensajes(chatActivo.usuarioId)
    } catch (err: any) { console.error(err.response?.data || err) }
    finally { setEnviando(false) }
  }

  // ── Chat por actividad ───────────────────────────────────────────────────────

  const cargarConversacionesActividad = async () => {
    try {
      setConvActividadLoading(true)
      const res = await axios.get('/api/mensajes/actividad-chats', { headers: getAuthHeaders() })
      setConvActividad(res.data)
    } catch (err) { console.error(err) }
    finally { setConvActividadLoading(false) }
  }

  const cargarChatActividadMensajes = async (actividadId: string, otroUsuarioId: string) => {
    try {
      const res = await axios.get(
        `/api/mensajes/actividad/${actividadId}/${otroUsuarioId}`,
        { headers: getAuthHeaders() }
      )
      setChatActividadMensajes(res.data.mensajes)
      setChatActividadActivo(prev => prev ? { ...prev, terminada: res.data.actividadTerminada } : prev)
    } catch (err) { console.error(err) }
  }

  const abrirChatActividad = async (
    actividadId: string,
    actividadNombre: string,
    otroUsuarioId: string,
    otroEmail: string
  ) => {
    setChatActividadActivo({ actividadId, actividadNombre, otroUsuarioId, otroEmail, terminada: false })
    setChatActividadLoading(true)
    try {
      const res = await axios.get(
        `/api/mensajes/actividad/${actividadId}/${otroUsuarioId}`,
        { headers: getAuthHeaders() }
      )
      setChatActividadMensajes(res.data.mensajes)
      setChatActividadActivo({ actividadId, actividadNombre, otroUsuarioId, otroEmail, terminada: res.data.actividadTerminada })
    } catch (err) { console.error(err) }
    finally { setChatActividadLoading(false) }
    cargarConversacionesActividad()
    cargarNoLeidosChat()
  }

  const enviarMensajeActividad = async () => {
    if (!chatActividadActivo || !chatActividadTexto.trim()) return
    try {
      setEnviandoActividad(true)
      await axios.post('/api/mensajes/actividad', {
        destinatario_id: chatActividadActivo.otroUsuarioId,
        cuerpo: chatActividadTexto.trim(),
        actividad_id: chatActividadActivo.actividadId,
      }, { headers: getAuthHeaders() })
      setChatActividadTexto('')
      await cargarChatActividadMensajes(chatActividadActivo.actividadId, chatActividadActivo.otroUsuarioId)
    } catch (err: any) {
      console.error(err.response?.data || err)
    } finally { setEnviandoActividad(false) }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha)
    const diff = Date.now() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return d.toLocaleDateString('es-ES', { weekday: 'short' })
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  const getTipoIcon = (tipo: string) => {
    if (tipo === 'admin') return '⚙️'
    if (tipo === 'entidad' || tipo === 'entidad_social') return '🏢'
    if (tipo === 'voluntario') return '🙋'
    if (tipo === 'empresa' || tipo === 'empresa_cultural') return '🎭'
    return '📨'
  }

  const getAsuntoColor = (asunto: string) => {
    if (asunto.includes('confirmad') || asunto.includes('aceptad') || asunto.includes('✅')) return { bg: '#dcfce7', color: '#166534' }
    if (asunto.includes('rechazad') || asunto.includes('cancelad')) return { bg: '#fee2e2', color: '#991b1b' }
    if (asunto.includes('invitaci') || asunto.includes('📩')) return { bg: '#dbeafe', color: '#1e40af' }
    if (asunto.includes('💬')) return { bg: '#f3e8ff', color: '#6b21a8' }
    if (asunto.includes('solicitud') || asunto.includes('inscripci')) return { bg: '#fef9c3', color: '#854d0e' }
    return { bg: '#ede9fe', color: '#5b21b6' }
  }

  const noLeidos = mensajes.filter(m => !m.leido).length

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <nav className="px-6 py-4 flex justify-between items-center shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-lg text-white">Thanks For It</span>
        </div>
        <button onClick={onBack} className="text-sm font-semibold px-4 py-2 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800">
          ← Volver al dashboard
        </button>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-3xl p-8 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-8xl opacity-20">📬</div>
          <h2 className="text-3xl font-bold text-white mb-1">
            Mensajes
            {noLeidos > 0 && <span className="ml-3 text-lg bg-white text-green-700 font-bold px-3 py-1 rounded-full">{noLeidos} nuevo{noLeidos > 1 ? 's' : ''}</span>}
          </h2>
          <p className="text-green-100">Comunicaciones de la plataforma y entidades</p>
        </div>

        {/* Pestañas */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setTab('bandeja')}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition relative ${tab === 'bandeja' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={tab === 'bandeja' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}
          >
            📬 Bandeja de entrada
            {noLeidos > 0 && <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{noLeidos}</span>}
          </button>
          <button
            onClick={() => { setTab('chat'); cargarConversaciones() }}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition relative ${tab === 'chat' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={tab === 'chat' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}
          >
            💬 Chat directo
            {noLeidosChat > 0 && <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{noLeidosChat}</span>}
          </button>
          <button
            onClick={() => { setTab('actividad'); cargarConversacionesActividad() }}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition relative ${tab === 'actividad' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={tab === 'actividad' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}
          >
            🎯 Chat de actividades
            {noLeidosActividad > 0 && <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{noLeidosActividad}</span>}
          </button>
        </div>

        {/* ── BANDEJA ── */}
        {tab === 'bandeja' && (
          <div className="flex gap-4">
            <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${seleccionado ? 'w-2/5' : 'w-full'} transition-all`}>
              {loading ? (
                <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">⏳</p><p>Cargando mensajes...</p></div>
              ) : mensajes.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-5xl mb-3">📭</p>
                  <p className="font-medium">No tienes mensajes</p>
                  <p className="text-sm mt-1 text-gray-300">Aquí aparecerán las notificaciones de inscripciones</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {mensajes.map(msg => {
                    const colors = getAsuntoColor(msg.asunto)
                    const esInv = esInvitacion(msg)
                    const respuesta = respuestaExito[msg.id]
                    return (
                      <div key={msg.id} onClick={() => abrirMensaje(msg)}
                        className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition ${seleccionado?.id === msg.id ? 'bg-green-50' : ''}`}>
                        <div className="mt-1.5 flex-shrink-0">
                          {!msg.leido ? <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> : <div className="w-2.5 h-2.5" />}
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: colors.bg }}>
                          {getTipoIcon(msg.remitente_tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <p className={`text-sm truncate ${!msg.leido ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{msg.remitente_email}</p>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatFecha(msg.created_at)}</span>
                          </div>
                          <p className={`text-sm truncate ${!msg.leido ? 'font-medium text-gray-700' : 'text-gray-500'}`}>{msg.asunto}</p>
                          {esInv && !seleccionado && <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">📩 Pendiente de respuesta</span>}
                          {respuesta && !seleccionado && (
                            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${respuesta === 'aceptado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {respuesta === 'aceptado' ? '✅ Aceptaste' : '✕ Rechazaste'}
                            </span>
                          )}
                          {!seleccionado && !esInv && !respuesta && <p className="text-xs text-gray-400 truncate mt-0.5">{msg.cuerpo}</p>}
                        </div>
                        <button onClick={(e) => eliminarMensajeBandeja(msg.id, e)}
                          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition">×</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {seleccionado && (
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getTipoIcon(seleccionado.remitente_tipo)}</span>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={getAsuntoColor(seleccionado.asunto)}>
                        {seleccionado.relacionado_tipo || 'notificación'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{seleccionado.asunto}</h3>
                    <p className="text-sm text-gray-400">
                      De: <span className="text-gray-600">{seleccionado.remitente_email}</span>
                      <span className="mx-2">·</span>
                      {new Date(seleccionado.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => setSeleccionado(null)} className="text-gray-400 hover:text-gray-600 text-xl ml-4">×</button>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-gray-50 rounded-xl p-5">{seleccionado.cuerpo}</div>
                </div>
                {seleccionado.actividad_nombre && (
                  <div className="mt-4 p-4 rounded-2xl border border-green-100 bg-green-50 space-y-1.5">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">📋 Información de la actividad</p>
                    <p className="text-sm text-gray-700">🎯 <span className="font-semibold">{seleccionado.actividad_nombre}</span></p>
                    {seleccionado.actividad_entidad_nombre && <p className="text-sm text-gray-600">🏢 Entidad: <span className="font-medium">{seleccionado.actividad_entidad_nombre}</span></p>}
                    {seleccionado.actividad_municipio && <p className="text-sm text-gray-600">📍 Municipio: <span className="font-medium">{seleccionado.actividad_municipio}</span></p>}
                    {seleccionado.actividad_fecha_inicio && <p className="text-sm text-gray-600">📅 Inicio: <span className="font-medium">{new Date(seleccionado.actividad_fecha_inicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>}
                    {seleccionado.actividad_fecha_fin && <p className="text-sm text-gray-600">🏁 Fin: <span className="font-medium">{new Date(seleccionado.actividad_fecha_fin).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>}
                    {seleccionado.actividad_horarios && <p className="text-sm text-gray-600">🕐 Horarios: <span className="font-medium">{seleccionado.actividad_horarios}</span></p>}
                  </div>
                )}
                {esInvitacion(seleccionado) && (
                  <div className="mt-5 p-4 rounded-2xl border-2 border-blue-100 bg-blue-50">
                    <p className="text-sm font-semibold text-blue-800 mb-3">📩 ¿Quieres participar en esta actividad?</p>
                    <div className="flex gap-3">
                      <button onClick={() => responderInvitacion(seleccionado, 'aceptar')} disabled={!!respondiendo}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                        {respondiendo === seleccionado.id + 'aceptar' ? '...' : '✅ Sí, quiero participar'}
                      </button>
                      <button onClick={() => responderInvitacion(seleccionado, 'rechazar')} disabled={!!respondiendo}
                        className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50">
                        {respondiendo === seleccionado.id + 'rechazar' ? '...' : '✕ No puedo participar'}
                      </button>
                    </div>
                  </div>
                )}
                {respuestaExito[seleccionado.id] && (
                  <div className={`mt-5 p-4 rounded-2xl text-sm font-semibold text-center ${respuestaExito[seleccionado.id] === 'aceptado' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {respuestaExito[seleccionado.id] === 'aceptado' ? '✅ ¡Has aceptado la invitación! La entidad recibirá una notificación.' : '✕ Has rechazado la invitación. La entidad recibirá una notificación.'}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      if (respondiendoMensaje === seleccionado.id) {
                        setRespondiendoMensaje(null)
                        setFormRespuesta({ asunto: '', cuerpo: '' })
                      } else {
                        setRespondiendoMensaje(seleccionado.id)
                        setFormRespuesta({ asunto: `Re: ${seleccionado.asunto}`, cuerpo: '' })
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                  >
                    ↩️ Responder
                  </button>
                  <button onClick={(e) => eliminarMensajeBandeja(seleccionado.id, e)}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-500 hover:bg-red-100 transition">
                    🗑️ Eliminar mensaje
                  </button>
                  <button onClick={() => setSeleccionado(null)}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                    ✕ Cerrar mensaje
                  </button>
                </div>

                {respuestaMensajeOk && (
                  <div className="mt-3 p-3 rounded-xl bg-green-50 text-green-700 text-sm font-medium">{respuestaMensajeOk}</div>
                )}

                {respondiendoMensaje === seleccionado.id && (
                  <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Respondiendo a {seleccionado.remitente_email}
                    </p>
                    <input
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400"
                      placeholder="Asunto"
                      value={formRespuesta.asunto}
                      onChange={e => setFormRespuesta(prev => ({ ...prev, asunto: e.target.value }))}
                    />
                    <textarea
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 resize-none"
                      placeholder="Escribe tu respuesta..."
                      rows={4}
                      value={formRespuesta.cuerpo}
                      onChange={e => setFormRespuesta(prev => ({ ...prev, cuerpo: e.target.value }))}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setRespondiendoMensaje(null); setFormRespuesta({ asunto: '', cuerpo: '' }) }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                      >Cancelar</button>
                      <button
                        onClick={enviarRespuestaMensaje}
                        disabled={enviandoRespuesta || !formRespuesta.asunto.trim() || !formRespuesta.cuerpo.trim()}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                      >{enviandoRespuesta ? 'Enviando...' : '📩 Enviar respuesta'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CHAT DIRECTO ── */}
        {tab === 'chat' && (
          <div className="flex gap-4" style={{ height: '560px' }}>
            <div className="w-72 bg-white rounded-2xl border border-gray-100 flex flex-col flex-shrink-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">💬 Conversaciones</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {convLoading ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
                ) : conversaciones.length === 0 ? (
                  <div className="text-center py-10 px-4 text-gray-400">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm font-medium">Sin conversaciones aún</p>
                    <p className="text-xs mt-1 text-gray-300">Inicia un chat desde el panel de inscripciones o voluntarios</p>
                  </div>
                ) : (
                  conversaciones.map(conv => (
                    <div key={conv.otro_usuario_id} onClick={() => abrirChat(conv.otro_usuario_id, conv.otro_email)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition border-b border-gray-50 ${chatActivo?.usuarioId === conv.otro_usuario_id ? 'bg-green-50' : ''}`}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                        {conv.otro_email[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{conv.otro_email}</p>
                        <p className="text-xs text-gray-400">{getTipoIcon(conv.otro_tipo)} {conv.otro_tipo}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-400">{formatFecha(conv.ultima_fecha)}</span>
                        {Number(conv.no_leidos) > 0 && (
                          <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {conv.no_leidos}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
              {!chatActivo ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-5xl mb-3">💬</p>
                    <p className="font-medium">Selecciona una conversación</p>
                    <p className="text-sm mt-1 text-gray-300">O inicia una desde el panel de inscripciones</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                      {chatActivo.email[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{chatActivo.email}</p>
                      <p className="text-xs text-green-600">Chat directo</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatLoading ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
                    ) : chatMensajes.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <p className="text-3xl mb-2">👋</p>
                        <p className="text-sm">Empieza la conversación</p>
                      </div>
                    ) : (
                      chatMensajes.map(msg => {
                        const esMio = msg.remitente_id === miUsuarioId
                        return (
                          <div key={msg.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${esMio ? 'text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
                              style={esMio ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
                              <p className="whitespace-pre-wrap">{msg.cuerpo}</p>
                              <p className={`text-xs mt-1 ${esMio ? 'text-green-200' : 'text-gray-400'}`}>{formatFecha(msg.created_at)}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 flex gap-2 items-end">
                    <textarea
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-green-500"
                      placeholder="Escribe un mensaje... (Enter para enviar)"
                      rows={1}
                      value={chatTexto}
                      onChange={e => setChatTexto(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarChatMensaje() } }}
                    />
                    <button onClick={enviarChatMensaje} disabled={enviando || !chatTexto.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                      {enviando ? '...' : '➤'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── CHAT DE ACTIVIDADES ── */}
        {tab === 'actividad' && (
          <div className="flex gap-4" style={{ height: '560px' }}>
            {/* Lista de chats por actividad */}
            <div className="w-72 bg-white rounded-2xl border border-gray-100 flex flex-col flex-shrink-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">🎯 Chats de actividades</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {convActividadLoading ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
                ) : convActividad.length === 0 ? (
                  <div className="text-center py-10 px-4 text-gray-400">
                    <p className="text-3xl mb-2">🎯</p>
                    <p className="text-sm font-medium">Sin chats de actividad</p>
                    <p className="text-xs mt-1 text-gray-300">Aparecerán al iniciar un chat desde una actividad confirmada</p>
                  </div>
                ) : (
                  convActividad.map(conv => {
                    const terminada = conv.actividad_fecha_fin ? new Date(conv.actividad_fecha_fin) < new Date() : false
                    const isActivo =
                      chatActividadActivo?.actividadId === conv.actividad_id &&
                      chatActividadActivo?.otroUsuarioId === conv.otro_usuario_id
                    return (
                      <div
                        key={`${conv.actividad_id}-${conv.otro_usuario_id}`}
                        onClick={() => abrirChatActividad(conv.actividad_id, conv.actividad_nombre, conv.otro_usuario_id, conv.otro_email)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition border-b border-gray-50 ${isActivo ? 'bg-green-50' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: terminada ? '#9ca3af' : 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                          {conv.otro_email[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-green-700 truncate">{conv.actividad_nombre}</p>
                          <p className="text-sm text-gray-700 truncate">{conv.otro_email}</p>
                          {terminada && <span className="text-xs text-gray-400">🔒 Actividad finalizada</span>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-gray-400">{formatFecha(conv.ultima_fecha)}</span>
                          {Number(conv.no_leidos) > 0 && (
                            <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {conv.no_leidos}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Área de chat de actividad */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
              {!chatActividadActivo ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-5xl mb-3">🎯</p>
                    <p className="font-medium">Selecciona un chat de actividad</p>
                    <p className="text-sm mt-1 text-gray-300">O inícialo desde el botón 💬 de una inscripción confirmada</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: chatActividadActivo.terminada ? '#9ca3af' : 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                      {chatActividadActivo.otroEmail[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{chatActividadActivo.otroEmail}</p>
                      <p className="text-xs text-green-600 truncate">🎯 {chatActividadActivo.actividadNombre}</p>
                    </div>
                    {chatActividadActivo.terminada && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                        🔒 Chat cerrado
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatActividadLoading ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
                    ) : chatActividadMensajes.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <p className="text-3xl mb-2">👋</p>
                        <p className="text-sm">Empieza la conversación sobre esta actividad</p>
                      </div>
                    ) : (
                      chatActividadMensajes.map(msg => {
                        const esMio = msg.remitente_id === miUsuarioId
                        return (
                          <div key={msg.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${esMio ? 'text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
                              style={esMio ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
                              <p className="whitespace-pre-wrap">{msg.cuerpo}</p>
                              <p className={`text-xs mt-1 ${esMio ? 'text-green-200' : 'text-gray-400'}`}>{formatFecha(msg.created_at)}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={chatActividadBottomRef} />
                  </div>

                  {chatActividadActivo.terminada ? (
                    <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 text-center">
                      <p className="text-sm text-gray-400">🔒 Esta actividad ha finalizado. El chat está cerrado.</p>
                    </div>
                  ) : (
                    <div className="px-4 py-3 border-t border-gray-100 flex gap-2 items-end">
                      <textarea
                        className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-green-500"
                        placeholder="Escribe sobre esta actividad... (Enter para enviar)"
                        rows={1}
                        value={chatActividadTexto}
                        onChange={e => setChatActividadTexto(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensajeActividad() } }}
                      />
                      <button
                        onClick={enviarMensajeActividad}
                        disabled={enviandoActividad || !chatActividadTexto.trim()}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                      >
                        {enviandoActividad ? '...' : '➤'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
