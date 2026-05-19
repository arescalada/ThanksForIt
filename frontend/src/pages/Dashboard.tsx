import { useState, useEffect } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/auth'
import Actividades from './Actividades'
import Beneficios from './Beneficios'
import Horas from './Horas'
import Perfil from './Perfil'
import Mensajes from './Mensajes'

interface Props {
  usuario: { id: string; email: string; tipo_usuario: string }
  onLogout: () => void
}

interface Inscripcion {
  id: string
  nombre: string
  entidad_nombre: string
  municipio: string
  fecha_inicio: string
  fecha_fin?: string
  descripcion?: string
  horarios?: string
  num_voluntarios_objetivo?: number
  inscritos?: number
  estado: 'pendiente' | 'confirmado' | 'rechazado' | 'cancelado' | 'inscrito'
}

export default function Dashboard({ usuario, onLogout }: Props) {
  const [vista, setVista] = useState<'dashboard' | 'actividades' | 'beneficios' | 'horas' | 'perfil' | 'mensajes'>('dashboard')
  const [stats, setStats] = useState({ horas: 0, beneficios: 0, actividades: 0 })
  const [noLeidos, setNoLeidos] = useState(0)
  const [horasNuevas, setHorasNuevas] = useState(0)
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [inscLoading, setInscLoading] = useState(false)
  const [modalInscripcion, setModalInscripcion] = useState<Inscripcion | null>(null)

  useEffect(() => {
    cargarStats()
    cargarNoLeidos()
    cargarInscripciones()
    // Polling en tiempo real cada 8s
    const interval = setInterval(() => {
      cargarStats()
      cargarNoLeidos()
      cargarInscripciones(true)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const cargarStats = async () => {
    try {
      const headers = getAuthHeaders()
      const [horasRes, beneficiosRes, actividadesRes] = await Promise.allSettled([
        axios.get('/api/horas/mis-horas', { headers }),
        axios.get('/api/beneficios'),
        axios.get('/api/actividades')
      ])
      setStats({
        horas: horasRes.status === 'fulfilled' ? (horasRes.value.data.resumen?.disponibles || 0) : 0,
        beneficios: beneficiosRes.status === 'fulfilled' ? (beneficiosRes.value.data.length || 0) : 0,
        actividades: actividadesRes.status === 'fulfilled' ? (actividadesRes.value.data.length || 0) : 0
      })
    } catch (err) {
      console.error(err)
    }
  }

  const cargarNoLeidos = async () => {
    try {
      const res = await axios.get('/api/mensajes/no-leidos?t=' + Date.now(), { headers: getAuthHeaders() })
      setNoLeidos(res.data.no_leidos || 0)
    } catch (err) {
      console.error(err)
    }
    try {
      const res2 = await axios.get('/api/horas/mis-horas', { headers: getAuthHeaders() })
      const validadas = res2.data.horas?.filter((h: any) => h.estado === 'validada').length || 0
      const vistas = parseInt(localStorage.getItem('horas_validadas_vistas') || '0', 10)
      setHorasNuevas(Math.max(0, validadas - vistas))
    } catch {}
  }

  const cargarInscripciones = async (silencioso = false) => {
    try {
      if (!silencioso) setInscLoading(true)
      const res = await axios.get('/api/inscripciones/mis-inscripciones', { headers: getAuthHeaders() })
      setInscripciones(res.data.slice(0, 5))
    } catch (err) {
      console.error(err)
    } finally {
      if (!silencioso) setInscLoading(false)
    }
  }

  const estadoConfig: Record<string, { label: string; bg: string; color: string; emoji: string }> = {
    pendiente: { label: 'Pendiente', bg: '#fef9c3', color: '#854d0e', emoji: '⏳' },
    inscrito:  { label: 'Pendiente', bg: '#fef9c3', color: '#854d0e', emoji: '⏳' },
    confirmado: { label: 'Confirmado', bg: '#dcfce7', color: '#166534', emoji: '✅' },
    rechazado: { label: 'No aceptado', bg: '#fee2e2', color: '#991b1b', emoji: '❌' },
    cancelado: { label: 'Cancelado', bg: '#f3f4f6', color: '#6b7280', emoji: '✕' },
  }

  if (vista === 'actividades') return <Actividades onBack={() => { setVista('dashboard'); cargarStats(); cargarInscripciones() }} />
  if (vista === 'beneficios') return <Beneficios onBack={() => { setVista('dashboard'); cargarStats() }} />
  if (vista === 'horas') return <Horas onBack={() => {
    // Al volver de horas, marcar las actuales como vistas
    const validadasActuales = parseInt(localStorage.getItem('horas_validadas_vistas') || '0', 10) + horasNuevas
    localStorage.setItem('horas_validadas_vistas', String(validadasActuales))
    setHorasNuevas(0)
    setVista('dashboard')
    cargarStats()
  }} />
  if (vista === 'perfil') return <Perfil usuario={usuario} onBack={() => setVista('dashboard')} />
  if (vista === 'mensajes') return (
    <Mensajes
      onBack={() => { setVista('dashboard'); cargarNoLeidos() }}
      onUnreadChange={setNoLeidos}
    />
  )

  const mainContent = (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #dcfce7 0%, #bbf7d0 50%, #dcfce7 100%)' }}>
      <nav className="px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-base sm:text-lg text-white">Thanks For It</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium" style={{ color: '#15803d' }}>{usuario.email}</span>
          </div>
          <button
            onClick={() => setVista('mensajes')}
            className="relative text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800"
          >
            <span className="hidden sm:inline">📬 Mensajes</span>
            <span className="sm:hidden">📬</span>
            {noLeidos > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
          <button
            onClick={() => setVista('perfil')}
            className="text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800"
          >
            <span className="hidden sm:inline">👤 Mi perfil</span>
            <span className="sm:hidden">👤</span>
          </button>
          <button
            onClick={onLogout}
            className="text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800"
          >
            <span className="hidden sm:inline">Cerrar sesión</span>
            <span className="sm:hidden">✕</span>
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-3 sm:p-6">
        {/* Hero */}
        <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
          <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-5xl sm:text-8xl opacity-20">🌱</div>
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 pr-12">¡Hola, {usuario.email.split('@')[0]}! 👋 Bienvenido/a a Thanks For It</h2>
          <p className="text-green-100 text-sm sm:text-base">Tu panel de voluntario — gestiona actividades y beneficios culturales</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <span className="text-white text-sm font-medium">🏷️ Voluntario</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <button onClick={() => setVista('horas')}
            className="relative bg-white rounded-2xl p-4 sm:p-6 text-left hover:shadow-md transition group border border-gray-100">
            {horasNuevas > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center z-10">
                {horasNuevas > 9 ? '9+' : horasNuevas}
              </span>
            )}
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xl sm:text-2xl" style={{ background: '#dcfce7' }}>⏱️</div>
              <span className="text-xs text-gray-400 group-hover:text-green-600 transition hidden sm:block">Ver →</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#16a34a' }}>{stats.horas}h</p>
            <p className="text-xs sm:text-sm text-gray-500">Horas</p>
            <p className="text-xs text-gray-400 mt-1 hidden sm:block">Para canjear</p>
          </button>

          <button onClick={() => setVista('beneficios')}
            className="bg-white rounded-2xl p-4 sm:p-6 text-left hover:shadow-md transition group border border-gray-100">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xl sm:text-2xl" style={{ background: '#fef9c3' }}>🎟️</div>
              <span className="text-xs text-gray-400 group-hover:text-green-600 transition hidden sm:block">Ver →</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#ca8a04' }}>{stats.beneficios}</p>
            <p className="text-xs sm:text-sm text-gray-500">Beneficios</p>
            <p className="text-xs text-gray-400 mt-1 hidden sm:block">Para canjear</p>
          </button>

          <button onClick={() => setVista('actividades')}
            className="bg-white rounded-2xl p-4 sm:p-6 text-left hover:shadow-md transition group border border-gray-100">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xl sm:text-2xl" style={{ background: '#ede9fe' }}>📅</div>
              <span className="text-xs text-gray-400 group-hover:text-green-600 transition hidden sm:block">Ver →</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#7c3aed' }}>{stats.actividades}</p>
            <p className="text-xs sm:text-sm text-gray-500">Actividades</p>
            <p className="text-xs text-gray-400 mt-1 hidden sm:block">Disponibles ahora</p>
          </button>
        </div>

        {/* Mis inscripciones recientes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span>📋</span> Mis inscripciones
            </h3>
            <button
              onClick={() => setVista('actividades')}
              className="text-xs text-green-600 hover:underline"
            >
              + Buscar más →
            </button>
          </div>

          {inscLoading ? (
            <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>
          ) : inscripciones.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">Aún no te has inscrito en ninguna actividad</p>
              <button
                onClick={() => setVista('actividades')}
                className="mt-3 text-sm font-medium text-green-600 hover:underline"
              >
                Explorar actividades →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {inscripciones.map(insc => {
                const cfg = estadoConfig[insc.estado] || estadoConfig.pendiente
                return (
                  <div key={insc.id} onClick={() => setModalInscripcion(insc)} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition cursor-pointer hover:border-green-100">
                    <span className="text-lg">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{insc.nombre}</p>
                      <p className="text-xs text-gray-400">{insc.entidad_nombre} · {insc.municipio}</p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>🎭</span> Beneficios Culturales
            </h3>
            <p className="text-sm text-gray-500 mb-4">Canjea tus horas por entradas, talleres y experiencias culturales únicas.</p>
            <button onClick={() => setVista('beneficios')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              Ver beneficios
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 relative">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>📬</span> Mensajes
              {noLeidos > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {noLeidos}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {noLeidos > 0
                ? `Tienes ${noLeidos} mensaje${noLeidos > 1 ? 's' : ''} sin leer de entidades o la plataforma.`
                : 'Aquí verás notificaciones de tus inscripciones y mensajes de las entidades.'}
            </p>
            <button
              onClick={() => setVista('mensajes')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90 border-2"
              style={{ borderColor: '#16a34a', color: '#16a34a' }}>
              {noLeidos > 0 ? `📬 Ver mensajes (${noLeidos})` : 'Ver bandeja de entrada'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )


  return (
    <>
      {mainContent}
      {modalInscripcion && (() => {
        const cfg = estadoConfig[modalInscripcion.estado] || estadoConfig.pendiente
        const formatF = (f: string) => new Date(f).toLocaleDateString('es-ES')
        const terminada = modalInscripcion.fecha_fin ? new Date(modalInscripcion.fecha_fin) < new Date() : false
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setModalInscripcion(null)}>
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Cabecera verde */}
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
              {/* Cuerpo */}
              <div className="p-6 space-y-4">
                {/* Descripción */}
                {modalInscripcion.descripcion && (
                  <p className="text-sm text-gray-600">{modalInscripcion.descripcion}</p>
                )}
                {/* Grid fechas + objetivo + inscritos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha inicio</p>
                    <p className="text-sm font-semibold text-gray-700">{formatF(modalInscripcion.fecha_inicio)}</p>
                  </div>
                  {modalInscripcion.fecha_fin && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha fin</p>
                      <p className="text-sm font-semibold text-gray-700">{formatF(modalInscripcion.fecha_fin)}</p>
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
                {/* Horarios */}
                {modalInscripcion.horarios && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Horarios</p>
                    <p className="text-sm text-gray-700">{modalInscripcion.horarios}</p>
                  </div>
                )}
                {/* Finalizada */}
                {terminada && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-sm text-gray-500">🔒 Esta actividad ha finalizado</p>
                  </div>
                )}
                {/* Estado inscripción */}
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
    </>
  )
}