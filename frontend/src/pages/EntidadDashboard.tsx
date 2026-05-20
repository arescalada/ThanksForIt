import { useState, useEffect } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/auth'
import Mensajes from './Mensajes'

interface Actividad {
  id: string
  nombre: string
  descripcion: string
  objetivo: string
  municipio: string
  fecha_inicio: string
  fecha_fin: string
  horarios: string
  num_voluntarios_objetivo: number
  estado: string
  publicar_buscador: boolean
  delegado_nombre?: string
  delegado_cargo?: string
  total_inscritos?: number
  total_confirmados?: number
}

interface Voluntario {
  id: string
  usuario_id: string
  nombre: string
  apellidos: string
  email: string
  telefono?: string
  municipio?: string
  dni_nie?: string
  fecha_nacimiento?: string
  preferencias?: string
  fecha_registro?: string
  vinculacion?: 'pendiente' | 'aceptado' | 'no_vinculado'
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

interface VoluntarioDetalle {
  voluntario: Voluntario
  actividades: { actividad_id: string; nombre: string; estado: string }[]
  actividadesDisponibles: Actividad[]
}

interface PerfilEntidadSocial {
  nombre_legal: string
  nif: string
  direccion: string
  web: string
  fecha_inscripcion: string
  numero_registro: string
  admin_nombre: string
  admin_email: string
  admin_telefono: string
  contacto_nombre: string
  contacto_email: string
  contacto_telefono: string
}

interface PerfilEmpresaCultural {
  nombre_empresa: string
  cif: string
  direccion: string
  web: string
  tipo_oferta: string
  sistema_canje: string
  contacto_nombre: string
  contacto_email: string
  contacto_telefono: string
}

interface Props {
  usuario: { id: string; email: string; tipo_usuario: string }
  onLogout: () => void
}

const trimestreActual = () => {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return `T${q} ${now.getFullYear()}`
}

const proximoTrimestre = () => {
  const now = new Date()
  let q = Math.floor(now.getMonth() / 3) + 2
  let y = now.getFullYear()
  if (q > 4) { q = 1; y++ }
  const starts = ['-01-01', '-04-01', '-07-01', '-10-01']
  const ends = ['-03-31', '-06-30', '-09-30', '-12-31']
  return { inicio: `${y}${starts[q - 1]}`, fin: `${y}${ends[q - 1]}`, label: `T${q} ${y}` }
}

export default function EntidadDashboard({ usuario, onLogout }: Props) {
  const [vista, setVista] = useState<'dashboard' | 'nueva' | 'voluntarios' | 'mensajes' | 'inscripciones' | 'perfil' | 'delegados' | 'horas'>('dashboard')
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)

  // Perfil de la entidad
  const esEmpresa = usuario.tipo_usuario === 'empresa'

  const perfilEntidadVacio: PerfilEntidadSocial = {
    nombre_legal: '', nif: '', direccion: '', web: '',
    fecha_inscripcion: '', numero_registro: '',
    admin_nombre: '', admin_email: '', admin_telefono: '',
    contacto_nombre: '', contacto_email: '', contacto_telefono: ''
  }
  const perfilEmpresaVacio: PerfilEmpresaCultural = {
    nombre_empresa: '', cif: '', direccion: '', web: '',
    tipo_oferta: '', sistema_canje: 'manual',
    contacto_nombre: '', contacto_email: '', contacto_telefono: ''
  }

  const [perfilEntidad, setPerfilEntidad] = useState<PerfilEntidadSocial>(perfilEntidadVacio)
  const [perfilEmpresa, setPerfilEmpresa] = useState<PerfilEmpresaCultural>(perfilEmpresaVacio)
  const [tienePerfil, setTienePerfil] = useState<boolean | null>(null)
  const [perfilLoading, setPerfilLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [noLeidos, setNoLeidos] = useState(0)
  const [chatInicialUsuarioId, setChatInicialUsuarioId] = useState<string | undefined>()
  const [chatInicialEmail, setChatInicialEmail] = useState<string | undefined>()
  const [chatInicialActividadId, setChatInicialActividadId] = useState<string | undefined>()
  const [chatInicialActividadNombre, setChatInicialActividadNombre] = useState<string | undefined>()

  // Inscripciones por actividad
  const [actividadSeleccionada, setActividadSeleccionada] = useState<Actividad | null>(null)
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [inscLoading, setInscLoading] = useState(false)

  // Voluntarios (panel principal)
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [voluntariosCargando, setVoluntariosCargando] = useState(false)
  const [tabVoluntarios, setTabVoluntarios] = useState<'solicitudes' | 'todos'>('solicitudes')
  const [busquedaVoluntario, setBusquedaVoluntario] = useState('')
  const [ordenVoluntarios, setOrdenVoluntarios] = useState<'nombre' | 'apellido' | 'email'>('nombre')

  // Modal detalle voluntario
  const [voluntarioDetalle, setVoluntarioDetalle] = useState<VoluntarioDetalle | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [invitandoDesdeDetalle, setInvitandoDesdeDetalle] = useState<string | null>(null)
  const [mostrarPerfilVoluntario, setMostrarPerfilVoluntario] = useState(false)

  // Editor de actividad
  const formVacio = {
    nombre: '', descripcion: '', objetivo: '', municipio: '',
    fecha_inicio: '', fecha_fin: '', horarios: '',
    num_voluntarios_objetivo: 10, publicar_buscador: true, delegado_id: ''
  }
  const [form, setForm] = useState(formVacio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [tabEditor, setTabEditor] = useState<'datos' | 'voluntarios'>('datos')
  const [voluntariosEditor, setVoluntariosEditor] = useState<(Voluntario & { estado_actividad?: string })[]>([])
  const [voluntariosEditorCargando, setVoluntariosEditorCargando] = useState(false)
  const [busquedaEditor, setBusquedaEditor] = useState('')
  const [invitando, setInvitando] = useState<string | null>(null)
  const [invitadosExito, setInvitadosExito] = useState<Set<string>>(new Set())
  const [delegadosForm, setDelegadosForm] = useState<{id:string; nombre:string; cargo:string}[]>([])

  // Delegados
  interface Delegado {
    id: string
    nombre: string
    cargo: string
    email: string
    activo: boolean
    created_at: string
  }
  const [delegados, setDelegados] = useState<Delegado[]>([])
  const [actividadesPorDelegado, setActividadesPorDelegado] = useState<Record<string, {id:string; nombre:string; municipio:string}[]>>({})
  const [actividadModalDelegado, setActividadModalDelegado] = useState<Actividad | null>(null)
  const [delegadosLoading, setDelegadosLoading] = useState(false)
  const [formDelegado, setFormDelegado] = useState({ nombre: '', cargo: '', email: '', password: '' })
  const [delegadoError, setDelegadoError] = useState('')
  const [delegadoSuccess, setDelegadoSuccess] = useState('')
  const [creandoDelegado, setCreandoDelegado] = useState(false)
  const [mostrarFormDelegado, setMostrarFormDelegado] = useState(false)
  const [mensajeDelegadoId, setMensajeDelegadoId] = useState<string | null>(null)
  const [formMensajeDelegado, setFormMensajeDelegado] = useState({ asunto: '', cuerpo: '' })
  const [enviandoMensajeDelegado, setEnviandoMensajeDelegado] = useState(false)
  const [mensajeDelegadoOk, setMensajeDelegadoOk] = useState('')

  // Horas pendientes (aprobadas por delegado, esperan validaciÃ³n entidad)
  interface HoraPendienteEntidad {
    id: string; horas: number; fecha_registro: string; notas: string; estado: string;
    actividad_nombre: string; voluntario_nombre: string; voluntario_apellidos: string; voluntario_email: string;
  }
  const [horasPendientesEntidad, setHorasPendientesEntidad] = useState<HoraPendienteEntidad[]>([])
  const [horasEntidadLoading, setHorasEntidadLoading] = useState(false)
  const [horasEntidadMensaje, setHorasEntidadMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)
  const [horasEntidadCount, setHorasEntidadCount] = useState(0)

  useEffect(() => { cargarActividades(); cargarNoLeidos(); cargarPerfil(); cargarVoluntarios() }, [])

  // Polling del badge de mensajes no leidos y horas pendientes cada 8 segundos
  useEffect(() => {
    // Carga inicial del count de horas para mostrar badge desde el primer momento
    cargarHorasPendientesEntidad()
    const interval = setInterval(() => {
      cargarNoLeidos()
      cargarActividades(true)
      cargarHorasPendientesEntidad()
      cargarVoluntarios(true)
      // Refrescar inscripciones de la actividad abierta (ruta correcta)
      setActividadSeleccionada(prev => {
        if (prev) {
          axios.get(`/api/inscripciones/actividad/${prev.id}`, { headers: getAuthHeaders() })
            .then(res => setInscripciones(res.data))
            .catch(() => {})
        }
        return prev
      })
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (vista === 'voluntarios') cargarVoluntarios()
  }, [vista, tabVoluntarios])

  useEffect(() => {
    if (vista === 'delegados') cargarDelegados()
  }, [vista])

  useEffect(() => {
    if (vista === 'nueva') {
      axios.get('/api/entidades/delegados-actividad', { headers: getAuthHeaders() })
        .then(r => setDelegadosForm(r.data))
        .catch(() => {})
    }
  }, [vista])

  useEffect(() => {
    if (vista === 'horas') cargarHorasPendientesEntidad(true)
  }, [vista])

  useEffect(() => {
    if (tabEditor === 'voluntarios' && editandoId) {
      cargarVoluntariosEditor(editandoId)
    }
  }, [tabEditor, editandoId])

  const cargarDelegados = async () => {
    try {
      setDelegadosLoading(true)
      const res = await axios.get('/api/delegados', { headers: getAuthHeaders() })
      setDelegados(res.data)
      // Cargar actividades asignadas a cada delegado
      const actRes = await axios.get('/api/entidades/mis-actividades', { headers: getAuthHeaders() })
      const acts: any[] = actRes.data
      const map: Record<string, {id:string; nombre:string; municipio:string}[]> = {}
      acts.forEach(a => {
        if (a.delegado_id) {
          if (!map[a.delegado_id]) map[a.delegado_id] = []
          map[a.delegado_id].push({ id: a.id, nombre: a.nombre, municipio: a.municipio })
        }
      })
      setActividadesPorDelegado(map)
    } catch (err) {
      console.error(err)
    } finally {
      setDelegadosLoading(false)
    }
  }

  const cargarHorasPendientesEntidad = async (conLoading = false) => {
    try {
      if (conLoading) setHorasEntidadLoading(true)
      const res = await axios.get('/api/horas/pendientes-entidad', { headers: getAuthHeaders() })
      setHorasPendientesEntidad(res.data)
      setHorasEntidadCount(res.data.length)
    } catch (err) { console.error(err) }
    finally { if (conLoading) setHorasEntidadLoading(false) }
  }

  const accionHorasEntidad = async (id: string, accion: 'validar-entidad' | 'rechazar-entidad') => {
    try {
      await axios.put(`/api/horas/${id}/${accion}`, {}, { headers: getAuthHeaders() })
      setHorasEntidadMensaje({
        texto: accion === 'validar-entidad' ? 'âœ… Horas validadas. El voluntario las verÃ¡ en su saldo.' : 'âŒ Horas rechazadas.',
        tipo: 'ok'
      })
      cargarHorasPendientesEntidad(true)
      setTimeout(() => setHorasEntidadMensaje(null), 4000)
    } catch (err: any) {
      setHorasEntidadMensaje({ texto: err.response?.data?.error || 'Error al procesar', tipo: 'error' })
      setTimeout(() => setHorasEntidadMensaje(null), 4000)
    }
  }

  const crearDelegado = async () => {
    setDelegadoError('')
    if (!formDelegado.nombre || !formDelegado.email || !formDelegado.password) {
      setDelegadoError('Nombre, email y contraseÃ±a son obligatorios')
      return
    }
    try {
      setCreandoDelegado(true)
      await axios.post('/api/delegados', formDelegado, { headers: getAuthHeaders() })
      setDelegadoSuccess('âœ… Delegado creado correctamente')
      setFormDelegado({ nombre: '', cargo: '', email: '', password: '' })
      setMostrarFormDelegado(false)
      setTimeout(() => setDelegadoSuccess(''), 3000)
      cargarDelegados()
    } catch (err: any) {
      setDelegadoError(err.response?.data?.error || 'Error al crear delegado')
    } finally {
      setCreandoDelegado(false)
    }
  }

  const toggleDelegado = async (delegadoId: string) => {
    try {
      const res = await axios.put(`/api/delegados/${delegadoId}/toggle`, {}, { headers: getAuthHeaders() })
      setDelegados(prev => prev.map(d => d.id === delegadoId ? { ...d, activo: res.data.activo } : d))
    } catch (err) {
      console.error(err)
    }
  }

  const eliminarDelegado = async (delegadoId: string) => {
    if (!confirm('Â¿Seguro que quieres eliminar este delegado? Se borrarÃ¡ su cuenta.')) return
    try {
      await axios.delete(`/api/delegados/${delegadoId}`, { headers: getAuthHeaders() })
      setDelegados(prev => prev.filter(d => d.id !== delegadoId))
    } catch (err) {
      console.error(err)
    }
  }

  const cargarPerfil = async () => {
    try {
      const endpoint = esEmpresa ? '/api/empresas/mi-perfil' : '/api/entidades/mi-perfil'
      const res = await axios.get(endpoint, { headers: getAuthHeaders() })
      if (res.data) {
        if (esEmpresa) {
          setPerfilEmpresa({
            nombre_empresa: res.data.nombre_empresa || '',
            cif: res.data.cif || '',
            direccion: res.data.direccion || '',
            web: res.data.web || '',
            tipo_oferta: res.data.tipo_oferta || '',
            sistema_canje: res.data.sistema_canje || 'manual',
            contacto_nombre: res.data.contacto_nombre || '',
            contacto_email: res.data.contacto_email || '',
            contacto_telefono: res.data.contacto_telefono || ''
          })
          setTienePerfil(!!res.data.nombre_empresa)
        } else {
          setPerfilEntidad({
            nombre_legal: res.data.nombre_legal || '',
            nif: res.data.nif || '',
            direccion: res.data.direccion || '',
            web: res.data.web || '',
            fecha_inscripcion: res.data.fecha_inscripcion?.split('T')[0] || '',
            numero_registro: res.data.numero_registro || '',
            admin_nombre: res.data.admin_nombre || '',
            admin_email: res.data.admin_email || '',
            admin_telefono: res.data.admin_telefono || '',
            contacto_nombre: res.data.contacto_nombre || '',
            contacto_email: res.data.contacto_email || '',
            contacto_telefono: res.data.contacto_telefono || ''
          })
          setTienePerfil(!!res.data.nombre_legal)
        }
        if (!res.data.nombre_legal && !res.data.nombre_empresa) setVista('perfil')
      } else {
        setTienePerfil(false)
        setVista('perfil')
      }
    } catch {
      setTienePerfil(false)
      setVista('perfil')
    }
  }

  const guardarPerfil = async () => {
    if (esEmpresa) {
      if (!perfilEmpresa.nombre_empresa || !perfilEmpresa.cif || !perfilEmpresa.direccion || !perfilEmpresa.tipo_oferta) {
        setError('Nombre, CIF, direcciÃ³n y tipo de oferta son obligatorios')
        return
      }
      if (!perfilEmpresa.contacto_nombre || !perfilEmpresa.contacto_email || !perfilEmpresa.contacto_telefono) {
        setError('Los datos de contacto son obligatorios')
        return
      }
    } else {
      if (!perfilEntidad.nombre_legal || !perfilEntidad.nif || !perfilEntidad.direccion) {
        setError('Nombre legal, NIF y direcciÃ³n son obligatorios')
        return
      }
      if (!perfilEntidad.admin_nombre || !perfilEntidad.admin_email || !perfilEntidad.admin_telefono) {
        setError('Los datos de la persona administradora son obligatorios')
        return
      }
    }
    try {
      setPerfilLoading(true)
      const endpoint = esEmpresa ? '/api/empresas/perfil' : '/api/entidades/perfil'
      const datos = esEmpresa ? perfilEmpresa : perfilEntidad
      await axios.post(endpoint, datos, { headers: getAuthHeaders() })
      setTienePerfil(true)
      setSuccess('âœ… Perfil guardado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      setVista('dashboard')
      cargarActividades()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar perfil')
    } finally {
      setPerfilLoading(false)
    }
  }

  const cargarActividades = async (silencioso = false) => {
    try {
      if (!silencioso) setLoading(true)
      const res = await axios.get('/api/entidades/mis-actividades', { headers: getAuthHeaders() })
      setActividades(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      if (!silencioso) setLoading(false)
    }
  }

  const cargarNoLeidos = async () => {
    try {
      const res = await axios.get('/api/mensajes/no-leidos?t=' + Date.now(), { headers: getAuthHeaders() })
      setNoLeidos(res.data.no_leidos || 0)
    } catch (err) {
      console.error(err)
    }
  }

  const cargarInscripciones = async (actividadId: string) => {
    try {
      setInscLoading(true)
      const res = await axios.get(`/api/inscripciones/actividad/${actividadId}`, { headers: getAuthHeaders() })
      setInscripciones(res.data)
    } catch (err) {
      console.error(err)
      setInscripciones([])
    } finally {
      setInscLoading(false)
    }
  }

  const cargarVoluntariosEditor = async (actividadId: string) => {
    try {
      setVoluntariosEditorCargando(true)
      const [todosRes, inscRes] = await Promise.all([
        axios.get('/api/entidades/todos-voluntarios', { headers: getAuthHeaders() }),
        axios.get(`/api/inscripciones/actividad/${actividadId}`, { headers: getAuthHeaders() })
      ])
      const inscritos: Inscripcion[] = inscRes.data
      const inscritosMap: Record<string, string> = {}
      inscritos.forEach(i => { inscritosMap[i.voluntario_id] = i.estado })
      const todos = todosRes.data.map((v: Voluntario) => ({
        ...v,
        estado_actividad: inscritosMap[v.id] || null
      }))
      setVoluntariosEditor(todos)
    } catch (err) {
      console.error(err)
      setVoluntariosEditor([])
    } finally {
      setVoluntariosEditorCargando(false)
    }
  }

  const abrirDetalleVoluntario = async (v: Voluntario) => {
    setDetalleLoading(true)
    setVoluntarioDetalle({ voluntario: v, actividades: [], actividadesDisponibles: [] })
    try {
      const misActRes = await axios.get('/api/entidades/mis-actividades', { headers: getAuthHeaders() })
      const misActs: Actividad[] = misActRes.data

      let inscVoluntario: { actividad_id: string; nombre: string; estado: string }[] = []
      try {
        const inscRes = await axios.get(`/api/entidades/voluntario/${v.id}/actividades`, { headers: getAuthHeaders() })
        inscVoluntario = inscRes.data
      } catch {
        inscVoluntario = []
      }

      const inscritosIds = new Set(inscVoluntario.map((i: any) => i.actividad_id))
      const disponibles = misActs.filter(a => !inscritosIds.has(a.id) && a.estado === 'publicada')

      setVoluntarioDetalle({
        voluntario: v,
        actividades: inscVoluntario,
        actividadesDisponibles: disponibles
      })
    } catch (err) {
      console.error(err)
      setVoluntarioDetalle({ voluntario: v, actividades: [], actividadesDisponibles: [] })
    } finally {
      setDetalleLoading(false)
    }
  }

  const invitarDesdeDetalle = async (actividadId: string) => {
    if (!voluntarioDetalle) return
    const voluntarioId = voluntarioDetalle.voluntario.id
    try {
      setInvitandoDesdeDetalle(actividadId)
      await axios.post(
        `/api/inscripciones/invitar/${actividadId}/${voluntarioId}`,
        {},
        { headers: getAuthHeaders() }
      )
      // Actualizamos el detalle: mover esa actividad de "disponibles" a "actividades"
      setVoluntarioDetalle(prev => {
        if (!prev) return prev
        const act = prev.actividadesDisponibles.find(a => a.id === actividadId)
        return {
          ...prev,
          actividades: [
            ...prev.actividades,
            { actividad_id: actividadId, nombre: act?.nombre || '', estado: 'pendiente' }
          ],
          actividadesDisponibles: prev.actividadesDisponibles.filter(a => a.id !== actividadId)
        }
      })
      setSuccess('âœ… InvitaciÃ³n enviada')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al invitar')
      setTimeout(() => setError(''), 3000)
    } finally {
      setInvitandoDesdeDetalle(null)
    }
  }

  const invitarVoluntario = async (voluntarioId: string) => {
    if (!editandoId) return
    try {
      setInvitando(voluntarioId)
      await axios.post(
        `/api/inscripciones/invitar/${editandoId}/${voluntarioId}`,
        {},
        { headers: getAuthHeaders() }
      )
      setInvitadosExito(prev => new Set([...prev, voluntarioId]))
      setVoluntariosEditor(prev =>
        prev.map(v => v.id === voluntarioId ? { ...v, estado_actividad: 'pendiente' } : v)
      )
      setSuccess('âœ… InvitaciÃ³n enviada al voluntario')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar invitaciÃ³n')
      setTimeout(() => setError(''), 3000)
    } finally {
      setInvitando(null)
    }
  }

  const abrirInscripciones = (actividad: Actividad) => {
    setActividadSeleccionada(actividad)
    setVista('inscripciones')
    cargarInscripciones(actividad.id)
  }

  const gestionarInscripcion = async (inscripcionId: string, accion: 'aceptar' | 'rechazar') => {
    try {
      await axios.put(`/api/inscripciones/gestionar/${inscripcionId}`, { accion }, { headers: getAuthHeaders() })
      setSuccess(accion === 'aceptar' ? 'âœ… Voluntario confirmado y notificado' : 'Solicitud rechazada y voluntario notificado')
      setTimeout(() => setSuccess(''), 3000)
      if (actividadSeleccionada) cargarInscripciones(actividadSeleccionada.id)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al gestionar inscripciÃ³n')
      setTimeout(() => setError(''), 3000)
    }
  }

  const cargarVoluntarios = async (silencioso = false) => {
    try {
      if (!silencioso) setVoluntariosCargando(true)
      const endpoint = tabVoluntarios === 'solicitudes'
        ? '/api/entidades/solicitudes-voluntarios'
        : '/api/entidades/todos-voluntarios'
      const res = await axios.get(endpoint, { headers: getAuthHeaders() })
      setVoluntarios(res.data)
    } catch (err) {
      console.error(err)
      setVoluntarios([])
    } finally {
      setVoluntariosCargando(false)
    }
  }

  const gestionarVoluntario = async (voluntarioId: string, accion: 'aceptar' | 'rechazar' | 'vincular' | 'desvincular') => {
    try {
      await axios.post(`/api/entidades/voluntarios/${voluntarioId}/${accion}`, {}, { headers: getAuthHeaders() })
      setSuccess(
        accion === 'aceptar' ? 'âœ… Voluntario aceptado en tu entidad' :
        accion === 'rechazar' ? 'Solicitud rechazada' :
        accion === 'vincular' ? 'âœ… Voluntario aÃ±adido a tu entidad' :
        'Voluntario desvinculado'
      )
      setTimeout(() => setSuccess(''), 3000)
      cargarVoluntarios()
      // Si el modal estÃ¡ abierto, actualizamos vinculaciÃ³n
      if (voluntarioDetalle && voluntarioDetalle.voluntario.id === voluntarioId) {
        setVoluntarioDetalle(prev => prev ? {
          ...prev,
          voluntario: {
            ...prev.voluntario,
            vinculacion: accion === 'aceptar' || accion === 'vincular' ? 'aceptado' :
                         accion === 'rechazar' || accion === 'desvincular' ? 'no_vinculado' :
                         prev.voluntario.vinculacion
          }
        } : prev)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al gestionar voluntario')
      setTimeout(() => setError(''), 3000)
    }
  }

  const enviarMensajeDelegado = async () => {
    if (!mensajeDelegadoId) return
    if (!formMensajeDelegado.asunto.trim() || !formMensajeDelegado.cuerpo.trim()) {
      setError('Asunto y mensaje son obligatorios')
      setTimeout(() => setError(''), 3000)
      return
    }
    try {
      setEnviandoMensajeDelegado(true)
      await axios.post(
        `/api/delegados/${mensajeDelegadoId}/mensaje`,
        formMensajeDelegado,
        { headers: getAuthHeaders() }
      )
      setMensajeDelegadoOk('âœ… Mensaje enviado')
      setFormMensajeDelegado({ asunto: '', cuerpo: '' })
      setMensajeDelegadoId(null)
      setTimeout(() => setMensajeDelegadoOk(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar mensaje')
      setTimeout(() => setError(''), 3000)
    } finally {
      setEnviandoMensajeDelegado(false)
    }
  }

  const handleCrear = async () => {
    if (!form.nombre || !form.municipio || !form.fecha_inicio || !form.fecha_fin) {
      return setError('Nombre, municipio y fechas son obligatorios')
    }
    try {
      setLoading(true)
      if (editandoId) {
        await axios.put(`/api/actividades/${editandoId}`, form, { headers: getAuthHeaders() })
        setSuccess('âœ… Actividad actualizada correctamente')
      } else {
        await axios.post('/api/entidades/actividades', form, { headers: getAuthHeaders() })
        setSuccess('âœ… Actividad creada correctamente')
      }
      setError('')
      setForm(formVacio)
      setEditandoId(null)
      setTabEditor('datos')
      setInvitadosExito(new Set())
      cargarActividades()
      setVista('dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar actividad')
    } finally {
      setLoading(false)
    }
  }

  const handleEditar = (a: Actividad) => {
    setForm({
      nombre: a.nombre,
      descripcion: a.descripcion || '',
      objetivo: a.objetivo || '',
      municipio: a.municipio,
      fecha_inicio: a.fecha_inicio?.split('T')[0] || '',
      fecha_fin: a.fecha_fin?.split('T')[0] || '',
      horarios: a.horarios || '',
      num_voluntarios_objetivo: a.num_voluntarios_objetivo,
      publicar_buscador: a.publicar_buscador,
      delegado_id: (a as any).delegado_id || ''
    })
    setEditandoId(a.id)
    setTabEditor('datos')
    setInvitadosExito(new Set())
    setBusquedaEditor('')
    setVista('nueva')
    setSuccess('')
    setError('')
    window.scrollTo(0, 0)
  }

  const handleDuplicar = (a: Actividad) => {
    const prox = proximoTrimestre()
    setForm({
      nombre: `${a.nombre} â€“ ${prox.label}`,
      descripcion: a.descripcion,
      objetivo: a.objetivo || '',
      municipio: a.municipio,
      fecha_inicio: prox.inicio,
      fecha_fin: prox.fin,
      horarios: a.horarios || '',
      num_voluntarios_objetivo: a.num_voluntarios_objetivo,
      publicar_buscador: a.publicar_buscador
    })
    setEditandoId(null)
    setTabEditor('datos')
    setInvitadosExito(new Set())
    setVista('nueva')
    setSuccess('')
    setError('')
    window.scrollTo(0, 0)
  }

  const formatFecha = (f: string) =>
    new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

  const resetForm = () => { setForm(formVacio); setEditandoId(null); setTabEditor('datos') }

  const voluntariosFiltrados = voluntarios
    .filter(v => {
      if (!busquedaVoluntario) return true
      const q = busquedaVoluntario.toLowerCase()
      return (
        v.nombre?.toLowerCase().includes(q) ||
        v.apellidos?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.municipio?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (ordenVoluntarios === 'nombre') return (a.nombre || '').localeCompare(b.nombre || '', 'es')
      if (ordenVoluntarios === 'apellido') return (a.apellidos || '').localeCompare(b.apellidos || '', 'es')
      if (ordenVoluntarios === 'email') return (a.email || '').localeCompare(b.email || '', 'es')
      return 0
    })

  const voluntariosEditorFiltrados = voluntariosEditor.filter(v => {
    if (!busquedaEditor) return true
    const q = busquedaEditor.toLowerCase()
    return (
      v.nombre?.toLowerCase().includes(q) ||
      v.apellidos?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.municipio?.toLowerCase().includes(q)
    )
  })

  const estadoInscripcion: Record<string, { label: string; bg: string; color: string }> = {
    pendiente: { label: 'Pendiente', bg: '#fef9c3', color: '#854d0e' },
    inscrito:  { label: 'Pendiente', bg: '#fef9c3', color: '#854d0e' },
    confirmado: { label: 'Confirmado', bg: '#dcfce7', color: '#166534' },
    cancelado: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b' },
    rechazado: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b' },
  }

  const getEstadoActividadLabel = (estado: string | null | undefined) => {
    if (!estado) return null
    const map: Record<string, { label: string; bg: string; color: string; emoji: string }> = {
      pendiente: { label: 'Invitado', bg: '#fef9c3', color: '#854d0e', emoji: 'â³' },
      inscrito:  { label: 'Inscrito', bg: '#fef9c3', color: '#854d0e', emoji: 'â³' },
      confirmado: { label: 'Confirmado', bg: '#dcfce7', color: '#166534', emoji: 'âœ…' },
      cancelado: { label: 'RechazÃ³', bg: '#fee2e2', color: '#991b1b', emoji: 'âœ•' },
      rechazado: { label: 'RechazÃ³', bg: '#fee2e2', color: '#991b1b', emoji: 'âœ•' },
    }
    return map[estado] || null
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

      {/* â”€â”€ MODAL ACTIVIDAD DESDE DELEGADO â”€â”€ */}
      {actividadModalDelegado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setActividadModalDelegado(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">{actividadModalDelegado.nombre}</h3>
                  <p className="text-green-100 text-sm mt-1">ðŸ“ {actividadModalDelegado.municipio}</p>
                </div>
                <button onClick={() => setActividadModalDelegado(null)} className="text-white/60 hover:text-white text-xl ml-4">âœ•</button>
              </div>
              <span className={`mt-3 inline-block text-xs font-semibold px-3 py-1 rounded-full ${actividadModalDelegado.estado === 'publicada' ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-700'}`}>
                {actividadModalDelegado.estado}
              </span>
            </div>
            <div className="p-6 space-y-4">
              {actividadModalDelegado.descripcion && (
                <p className="text-sm text-gray-600">{actividadModalDelegado.descripcion}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha inicio</p>
                  <p className="text-sm font-semibold text-gray-700">{new Date(actividadModalDelegado.fecha_inicio).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fecha fin</p>
                  <p className="text-sm font-semibold text-gray-700">{new Date(actividadModalDelegado.fecha_fin).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Objetivo</p>
                  <p className="text-sm font-semibold text-gray-700">{actividadModalDelegado.num_voluntarios_objetivo} voluntarios</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Inscritos</p>
                  <p className="text-sm font-semibold text-green-600">{Number((actividadModalDelegado as any).total_inscritos) || 0} / {actividadModalDelegado.num_voluntarios_objetivo}</p>
                </div>
              </div>
              {actividadModalDelegado.horarios && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Horarios</p>
                  <p className="text-sm text-gray-700">{actividadModalDelegado.horarios}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setActividadModalDelegado(null); handleEditar(actividadModalDelegado) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-blue-600 border-blue-200 hover:bg-blue-50 transition"
                >âœï¸ Editar</button>
                <button
                  onClick={() => setActividadModalDelegado(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                >Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ MODAL DETALLE VOLUNTARIO â”€â”€ */}
      {voluntarioDetalle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setVoluntarioDetalle(null); setMostrarPerfilVoluntario(false) }}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
                    {(voluntarioDetalle.voluntario.nombre?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {voluntarioDetalle.voluntario.nombre} {voluntarioDetalle.voluntario.apellidos}
                    </h3>
                    <p className="text-sm text-gray-400">{voluntarioDetalle.voluntario.email}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {voluntarioDetalle.voluntario.telefono && (
                        <span className="text-xs text-gray-400">ðŸ“ž {voluntarioDetalle.voluntario.telefono}</span>
                      )}
                      {voluntarioDetalle.voluntario.municipio && (
                        <span className="text-xs text-gray-400">ðŸ“ {voluntarioDetalle.voluntario.municipio}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setVoluntarioDetalle(null); setMostrarPerfilVoluntario(false) }}
                  className="text-gray-300 hover:text-gray-500 text-xl font-light flex-shrink-0"
                >âœ•</button>
              </div>

              {/* VinculaciÃ³n y acciones rÃ¡pidas */}
              <div className="flex flex-wrap gap-2 mt-4">
                {voluntarioDetalle.voluntario.vinculacion === 'aceptado' ? (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700">âœ… Vinculado a tu entidad</span>
                ) : voluntarioDetalle.voluntario.vinculacion === 'pendiente' ? (
                  <>
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-600">â³ Solicitud pendiente</span>
                    <button
                      onClick={() => gestionarVoluntario(voluntarioDetalle.voluntario.id, 'aceptar')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                    >âœ… Aceptar solicitud</button>
                    <button
                      onClick={() => gestionarVoluntario(voluntarioDetalle.voluntario.id, 'rechazar')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-600"
                    >âœ• Rechazar</button>
                  </>
                ) : (
                  <button
                    onClick={() => gestionarVoluntario(voluntarioDetalle.voluntario.id, 'vincular')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                  >âž• AÃ±adir a mi entidad</button>
                )}
                <button
                  onClick={() => {
                    setChatInicialUsuarioId(voluntarioDetalle.voluntario.usuario_id)
                    setChatInicialEmail(voluntarioDetalle.voluntario.email)
                    setVoluntarioDetalle(null)
                    setVista('mensajes')
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                >ðŸ’¬ Enviar mensaje</button>
                <button
                  onClick={() => setMostrarPerfilVoluntario(p => !p)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${mostrarPerfilVoluntario ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                >ðŸ‘¤ Perfil</button>
                {voluntarioDetalle.voluntario.vinculacion === 'aceptado' && (
                  <button
                    onClick={() => gestionarVoluntario(voluntarioDetalle.voluntario.id, 'desvincular')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                  >Desvincular</button>
                )}
              </div>
            </div>
            {/* Datos del perfil â€” se muestra al pulsar botÃ³n Perfil */}
            {mostrarPerfilVoluntario && (
              <div className="px-6 py-4 bg-blue-50/40 border-b border-blue-100 grid grid-cols-2 gap-3">
                {voluntarioDetalle.voluntario.fecha_nacimiento && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Fecha nacimiento</p>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(voluntarioDetalle.voluntario.fecha_nacimiento).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}
                {voluntarioDetalle.voluntario.dni_nie &&
                 !voluntarioDetalle.voluntario.dni_nie.startsWith('PENDIENTE') &&
                 !voluntarioDetalle.voluntario.dni_nie.startsWith('PEND-') && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">DNI/NIE</p>
                    <p className="text-sm font-medium text-gray-700">{voluntarioDetalle.voluntario.dni_nie}</p>
                  </div>
                )}
                {voluntarioDetalle.voluntario.municipio &&
                 voluntarioDetalle.voluntario.municipio !== 'Sin direcciÃ³n' && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">DirecciÃ³n</p>
                    <p className="text-sm font-medium text-gray-700">{voluntarioDetalle.voluntario.municipio}</p>
                  </div>
                )}
                {voluntarioDetalle.voluntario.fecha_registro && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Miembro desde</p>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(voluntarioDetalle.voluntario.fecha_registro).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}
                {voluntarioDetalle.voluntario.preferencias && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Preferencias / Intereses</p>
                    <p className="text-sm text-gray-600 bg-white rounded-xl px-3 py-2 border border-gray-100">
                      {voluntarioDetalle.voluntario.preferencias}
                    </p>
                  </div>
                )}
              </div>
            )}

            {mostrarPerfilVoluntario ? (
              <div className="p-5 flex justify-center">
                <button
                  onClick={() => setMostrarPerfilVoluntario(false)}
                  className="px-5 py-2 rounded-xl text-sm font-semibold border-2 border-blue-200 text-blue-600 hover:bg-blue-50 transition flex items-center gap-2"
                >
                  â† Volver a actividades
                </button>
              </div>
            ) : detalleLoading ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-3xl mb-2">â³</p>
                <p className="text-sm">Cargando informaciÃ³n...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">

                {/* Actividades en las que YA participa */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span>ðŸ“‹ Actividades en las que participa</span>
                    {voluntarioDetalle.actividades.length > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {voluntarioDetalle.actividades.length}
                      </span>
                    )}
                  </h4>
                  {voluntarioDetalle.actividades.length === 0 ? (
                    <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                      No participa en ninguna actividad de tu entidad aÃºn
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {voluntarioDetalle.actividades.map(a => {
                        const cfg = getEstadoActividadLabel(a.estado)
                        return (
                          <div key={a.actividad_id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                            <span className="text-sm text-gray-700 font-medium">{a.nombre}</span>
                            {cfg && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2"
                                style={{ background: cfg.bg, color: cfg.color }}>
                                {cfg.emoji} {cfg.label}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Actividades disponibles para invitar */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span>ðŸ“¨ Invitar a otra actividad</span>
                    {voluntarioDetalle.actividadesDisponibles.length > 0 && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {voluntarioDetalle.actividadesDisponibles.length} disponibles
                      </span>
                    )}
                  </h4>
                  {voluntarioDetalle.actividadesDisponibles.length === 0 ? (
                    <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                      Ya estÃ¡ invitado o inscrito en todas tus actividades publicadas
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {voluntarioDetalle.actividadesDisponibles.map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-blue-50/50 rounded-xl px-4 py-3 border border-blue-100">
                          <div className="min-w-0 mr-3">
                            <p className="text-sm text-gray-700 font-medium truncate">{a.nombre}</p>
                            <p className="text-xs text-gray-400">ðŸ“ {a.municipio} Â· {formatFecha(a.fecha_inicio)}</p>
                          </div>
                          <button
                            onClick={() => invitarDesdeDetalle(a.id)}
                            disabled={invitandoDesdeDetalle === a.id}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                          >
                            {invitandoDesdeDetalle === a.id ? '...' : 'ðŸ“¨ Invitar'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      <nav className="px-4 sm:px-6 py-3 flex justify-between items-center shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">ðŸŒ¿</span>
          <span className="font-bold text-base sm:text-lg text-white">Thanks For It</span>
          <span className="hidden sm:inline" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 10px', borderRadius: '999px', marginLeft: '8px' }}>Entidad Social</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-100 text-sm hidden md:block">{usuario.email}</span>
          <button
            onClick={() => setVista('mensajes')}
            className="relative text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl border border-white text-white hover:bg-white hover:text-green-800 transition"
          >
            ðŸ“¬
            {noLeidos > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
          <button onClick={onLogout} className="text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl border border-white text-white hover:bg-white hover:text-green-800 transition">
            <span className="hidden sm:inline">Cerrar sesiÃ³n</span>
            <span className="sm:hidden">âœ•</span>
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-3 sm:p-6">
        <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
          <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-5xl sm:text-8xl opacity-20">ðŸ¢</div>
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 pr-12">Â¡Hola, {(esEmpresa ? perfilEmpresa.contacto_nombre : perfilEntidad.admin_nombre) || usuario.email.split('@')[0]}! ðŸ‘‹ Bienvenido/a a Thanks For It</h2>
          <p className="text-green-100 text-sm sm:text-base">Gestiona tus actividades y voluntarios Â· <span className="font-semibold">{trimestreActual()}</span></p>
        </div>

        {success && <div className="bg-green-50 text-green-700 p-4 rounded-2xl mb-4 text-sm">{success}</div>}
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 text-sm">{error}</div>}

        {/* TABS */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 flex-wrap">
          <button onClick={() => setVista('dashboard')}
            className={`px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'dashboard' || vista === 'inscripciones' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'dashboard' || vista === 'inscripciones' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            ðŸ“‹ Mis Actividades
          </button>
          <button onClick={() => { setVista('nueva'); setError(''); setSuccess(''); resetForm() }}
            className={`px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'nueva' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'nueva' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            âž• {editandoId ? 'Editar' : 'Nueva'}
          </button>
          <button onClick={() => { setVista('voluntarios'); setTabVoluntarios('solicitudes') }}
            className={`px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'voluntarios' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'voluntarios' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            ðŸ™‹ Voluntarios
          </button>
          <button
            onClick={() => setVista('mensajes')}
            className={`relative px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'mensajes' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'mensajes' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}
          >
            ðŸ“¬ Mensajes
            {noLeidos > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
          <button onClick={() => setVista('perfil')}
            className={`px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'perfil' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'perfil' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            ðŸ¢ Mi Perfil
          </button>
          <button onClick={() => setVista('delegados')}
            className={`px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'delegados' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'delegados' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            ðŸ‘¥ Delegados
          </button>
          <button onClick={() => { setVista('horas'); setHorasEntidadCount(0) }}
            className={`relative px-3 sm:px-5 py-2 rounded-xl font-medium text-xs sm:text-sm transition ${vista === 'horas' ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            style={vista === 'horas' ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' } : {}}>
            â±ï¸ Horas
            {horasEntidadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {horasEntidadCount > 9 ? '9+' : horasEntidadCount}
              </span>
            )}
          </button>
        </div>

        {/* â”€â”€ ACTIVIDADES â”€â”€ */}
        {vista === 'dashboard' && (
          loading ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-2">â³</p><p>Cargando actividades...</p>
            </div>
          ) : actividades.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-2">ðŸ”­</p>
              <p className="font-medium">No tienes actividades creadas</p>
              <button onClick={() => setVista('nueva')}
                className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                âž• Crear actividad
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {actividades.map(a => (
                <div key={a.id} className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-800">{a.nombre}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.estado === 'publicada' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {a.estado}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{a.descripcion}</p>
                  <div className="space-y-1 text-xs text-gray-500 mb-4">
                    <p>ðŸ“ {a.municipio}</p>
                    <p>ðŸ“… {formatFecha(a.fecha_inicio)} â†’ {formatFecha(a.fecha_fin)}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>ðŸ‘¥ Objetivo: <span className="font-semibold">{a.num_voluntarios_objetivo}</span></span>
                      <span className="text-gray-300">Â·</span>
                      <span>Inscritos: <span className="font-semibold text-green-600">{Number(a.total_inscritos) || 0}</span></span>
                      <span className="text-gray-300">Â·</span>
                      <span>Faltan: <span className={`font-semibold ${Math.max(0, a.num_voluntarios_objetivo - (Number(a.total_inscritos) || 0)) === 0 ? 'text-green-600' : 'text-orange-500'}`}>
                        {Math.max(0, a.num_voluntarios_objetivo - (Number(a.total_inscritos) || 0))}
                      </span></span>
                    </div>
                    {a.delegado_nombre && (
                      <p className="text-blue-600 font-medium">ðŸ‘¤ {a.delegado_nombre}{a.delegado_cargo ? ` Â· ${a.delegado_cargo}` : ''}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirInscripciones(a)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                      ðŸ‘¥ Ver inscripciones
                    </button>
                    <button
                      onClick={() => handleEditar(a)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border-2 transition hover:bg-blue-50"
                      style={{ borderColor: '#3b82f6', color: '#3b82f6' }}>
                      âœï¸ Editar
                    </button>
                    <button
                      onClick={() => handleDuplicar(a)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border-2 transition hover:bg-green-50"
                      style={{ borderColor: '#16a34a', color: '#16a34a' }}>
                      ðŸ“‹
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* â”€â”€ INSCRIPCIONES DE UNA ACTIVIDAD â”€â”€ */}
        {vista === 'inscripciones' && actividadSeleccionada && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setVista('dashboard')} className="text-sm text-gray-500 hover:text-gray-700">
                â† Volver
              </button>
              <div>
                <h3 className="font-semibold text-gray-800">{actividadSeleccionada.nombre}</h3>
                <p className="text-xs text-gray-400">ðŸ“ {actividadSeleccionada.municipio}</p>
              </div>
            </div>

            {inscLoading ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
                <p className="text-4xl mb-2">â³</p><p>Cargando inscripciones...</p>
              </div>
            ) : inscripciones.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">ðŸ”­</p>
                <p className="font-medium">No hay inscripciones en esta actividad</p>
                <p className="text-sm mt-1 text-gray-300">Cuando un voluntario se inscriba, aparecerÃ¡ aquÃ­</p>
                <button
                  onClick={() => handleEditar(actividadSeleccionada)}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                >
                  ðŸ“¨ Invitar voluntarios
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-500">{inscripciones.length} solicitud{inscripciones.length !== 1 ? 'es' : ''}</p>
                  <button
                    onClick={() => handleEditar(actividadSeleccionada)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                  >
                    ðŸ“¨ Invitar mÃ¡s voluntarios
                  </button>
                </div>
                {inscripciones.map(insc => {
                  const cfg = estadoInscripcion[insc.estado] || estadoInscripcion.pendiente
                  const isPendiente = insc.estado === 'pendiente' || insc.estado === 'inscrito'
                  const volNombre = (insc.nombre && insc.nombre !== 'Pendiente')
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
                              {insc.telefono && <span className="text-xs text-gray-400">ðŸ“ž {insc.telefono}</span>}
                              {insc.municipio && <span className="text-xs text-gray-400">ðŸ“ {insc.municipio}</span>}
                              <span className="text-xs text-gray-400">
                                SolicitÃ³ {new Date(insc.fecha_inscripcion).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          {isPendiente && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => gestionarInscripcion(insc.id, 'aceptar')}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition"
                                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                              >
                                âœ… Aceptar
                              </button>
                              <button
                                onClick={() => gestionarInscripcion(insc.id, 'rechazar')}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition"
                              >
                                âœ• Rechazar
                              </button>
                              <button
                                onClick={() => { setChatInicialUsuarioId(insc.usuario_id); setChatInicialEmail(insc.email); setVista('mensajes') }}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                              >
                                ðŸ’¬ Chat
                              </button>
                            </div>
                          )}
                          {!isPendiente && insc.estado === 'confirmado' && (
                             <button
                               onClick={() => {
                                 setChatInicialUsuarioId(insc.usuario_id)
                                 setChatInicialEmail(insc.email)
                                 setChatInicialActividadId(actividadSeleccionada?.id)        // â† nuevo
                                 setChatInicialActividadNombre(actividadSeleccionada?.nombre) // â† nuevo
                                 setVista('mensajes')
                              }}
                              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                             >
                              ðŸ’¬ Chat actividad
                            </button>
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

        {/* â”€â”€ VOLUNTARIOS (panel principal) â”€â”€ */}
        {vista === 'voluntarios' && (
          <div>
            <div className="flex gap-2 mb-5">
              <button onClick={() => setTabVoluntarios('solicitudes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tabVoluntarios === 'solicitudes' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                ðŸ“¬ Solicitudes pendientes
              </button>
              <button onClick={() => setTabVoluntarios('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tabVoluntarios === 'todos' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                ðŸ‘¥ Todos los voluntarios
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex gap-3 border border-gray-100">
              <input
                className="flex-1 text-sm outline-none text-gray-700"
                placeholder="ðŸ” Buscar por nombre, email o municipio..."
                value={busquedaVoluntario}
                onChange={e => setBusquedaVoluntario(e.target.value)}
              />
              {busquedaVoluntario && (
                <button onClick={() => setBusquedaVoluntario('')} className="text-gray-300 hover:text-gray-500 text-sm">âœ•</button>
              )}
              <select
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:border-green-500"
                value={ordenVoluntarios}
                onChange={e => setOrdenVoluntarios(e.target.value as 'nombre' | 'apellido' | 'email')}
              >
                <option value="nombre">Ordenar: Nombre</option>
                <option value="apellido">Ordenar: Apellido</option>
                <option value="email">Ordenar: Email</option>
              </select>
            </div>

            {tabVoluntarios === 'todos' && (
              <p className="text-xs text-gray-400 mb-3 px-1">
                ðŸ’¡ Haz clic en cualquier voluntario para ver sus actividades e invitarle a otras
              </p>
            )}

            {voluntariosCargando ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
                <p className="text-4xl mb-2">â³</p><p>Cargando...</p>
              </div>
            ) : voluntariosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">{tabVoluntarios === 'solicitudes' ? 'ðŸ“¬' : 'ðŸ”­'}</p>
                <p className="font-medium">
                  {tabVoluntarios === 'solicitudes' ? 'No hay solicitudes pendientes' : 'No hay voluntarios registrados todavÃ­a'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {voluntariosFiltrados.map(v => (
                  <div
                    key={v.id}
                    className={`bg-white rounded-2xl p-5 border border-gray-100 transition ${tabVoluntarios === 'todos' ? 'hover:shadow-md hover:border-green-200 cursor-pointer' : 'hover:shadow-sm'}`}
                    onClick={tabVoluntarios === 'todos' ? () => abrirDetalleVoluntario(v) : undefined}
                  >
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
                            {v.telefono && <span className="text-xs text-gray-400">ðŸ“ž {v.telefono}</span>}
                            {v.municipio && <span className="text-xs text-gray-400">ðŸ“ {v.municipio}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {tabVoluntarios === 'solicitudes' && v.vinculacion === 'pendiente' && (
                          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700">Pendiente</span>
                        )}
                        {tabVoluntarios === 'solicitudes' && v.vinculacion === 'aceptado' && (
                          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700">Aceptado</span>
                        )}
                        {tabVoluntarios === 'todos' && (
                          <span className="text-xs text-gray-300 flex items-center gap-1">Ver detalle â†’</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ NUEVA / EDITAR ACTIVIDAD â”€â”€ */}
        {vista === 'nueva' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setTabEditor('datos')}
                className={`flex-1 py-4 text-sm font-medium transition ${tabEditor === 'datos' ? 'text-green-700 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ðŸ“‹ Datos de la actividad
              </button>
              <button
                onClick={() => {
                  if (!editandoId) {
                    setError('Guarda primero los datos bÃ¡sicos para poder invitar voluntarios')
                    setTimeout(() => setError(''), 3000)
                    return
                  }
                  setTabEditor('voluntarios')
                }}
                className={`flex-1 py-4 text-sm font-medium transition relative ${tabEditor === 'voluntarios' ? 'text-green-700 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'} ${!editandoId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ðŸ“¨ Invitar voluntarios
                {invitadosExito.size > 0 && (
                  <span className="ml-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {invitadosExito.size}
                  </span>
                )}
                {!editandoId && (
                  <span className="block text-xs text-gray-400 font-normal">Guarda primero</span>
                )}
              </button>
            </div>

            {tabEditor === 'datos' && (
              <div className="p-8">
                <h3 className="text-lg font-semibold mb-6">
                  {editandoId ? 'âœï¸ Editar Actividad' : 'âž• Nueva Actividad de Voluntariado'}
                </h3>

                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nombre de la actividad *</label>
                    <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Ej: Limpieza del parque municipal"
                      value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">DescripciÃ³n</label>
                    <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 h-24 resize-none"
                      placeholder="Describe la actividad..."
                      value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Objetivo</label>
                    <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Objetivo de la actividad"
                      value={form.objetivo} onChange={e => setForm({ ...form, objetivo: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Municipio *</label>
                    <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Madrid, Barcelona..."
                      value={form.municipio} onChange={e => setForm({ ...form, municipio: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Horarios</label>
                    <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Ej: SÃ¡bados 10:00-14:00"
                      value={form.horarios} onChange={e => setForm({ ...form, horarios: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Fecha inicio *</label>
                    <input type="date" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Fecha fin *</label>
                    <input type="date" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">NÂº voluntarios objetivo</label>
                    <input type="number" min="1" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      value={form.num_voluntarios_objetivo}
                      onChange={e => setForm({ ...form, num_voluntarios_objetivo: parseInt(e.target.value) || 1 })} />
                  </div>
                  {delegadosForm.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">ðŸ‘¥ Delegado responsable</label>
                      <select
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        value={form.delegado_id}
                        onChange={e => setForm({ ...form, delegado_id: e.target.value })}
                      >
                        <option value="">â€” Sin delegado asignado â€”</option>
                        {delegadosForm.map(d => (
                          <option key={d.id} value={d.id}>{d.nombre}{d.cargo ? ` Â· ${d.cargo}` : ''}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-6">
                    <input type="checkbox" id="publicar" checked={form.publicar_buscador}
                      onChange={e => setForm({ ...form, publicar_buscador: e.target.checked })} />
                    <label htmlFor="publicar" className="text-sm text-gray-600">Publicar en el buscador pÃºblico</label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setVista('dashboard'); resetForm() }}
                    className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button onClick={handleCrear} disabled={loading}
                    className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                    {loading ? 'Guardando...' : editandoId ? 'âœ… Guardar cambios' : 'âœ… Crear actividad'}
                  </button>
                </div>

                {editandoId && (
                  <p className="text-center text-xs text-gray-400 mt-3">
                    ðŸ’¡ DespuÃ©s de guardar puedes ir a la pestaÃ±a "Invitar voluntarios" para aÃ±adir voluntarios directamente
                  </p>
                )}
              </div>
            )}

            {tabEditor === 'voluntarios' && editandoId && (
              <div className="p-8">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-gray-800">ðŸ“¨ Invitar voluntarios</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Invita a voluntarios de la plataforma a esta actividad. RecibirÃ¡n un mensaje y podrÃ¡n aceptar o rechazar.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-5 flex gap-3 border border-gray-100">
                  <input
                    className="flex-1 text-sm outline-none bg-transparent text-gray-700"
                    placeholder="ðŸ” Buscar por nombre, email o municipio..."
                    value={busquedaEditor}
                    onChange={e => setBusquedaEditor(e.target.value)}
                  />
                  {busquedaEditor && (
                    <button onClick={() => setBusquedaEditor('')} className="text-gray-300 hover:text-gray-500 text-sm">âœ•</button>
                  )}
                </div>

                {invitadosExito.size > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-sm text-green-700">
                    âœ… Has invitado a <span className="font-semibold">{invitadosExito.size} voluntario{invitadosExito.size > 1 ? 's' : ''}</span> en esta sesiÃ³n. RecibirÃ¡n un mensaje automÃ¡tico.
                  </div>
                )}

                {voluntariosEditorCargando ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-2">â³</p>
                    <p>Cargando voluntarios...</p>
                  </div>
                ) : voluntariosEditorFiltrados.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
                    <p className="text-4xl mb-2">ðŸ”­</p>
                    <p className="font-medium">{busquedaEditor ? 'Sin resultados para esa bÃºsqueda' : 'No hay voluntarios registrados'}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {voluntariosEditorFiltrados.map(v => {
                      const estadoCfg = getEstadoActividadLabel(v.estado_actividad)
                      const yaInvitado = !!v.estado_actividad
                      const volNombre = (v.nombre && v.nombre !== 'Pendiente')
                        ? `${v.nombre} ${v.apellidos || ''}`.trim()
                        : v.email

                      return (
                        <div
                          key={v.id}
                          className={`rounded-2xl p-4 border transition ${yaInvitado ? 'border-green-100 bg-green-50/40' : 'border-gray-100 bg-white hover:shadow-sm'}`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                style={{ background: yaInvitado ? '#16a34a' : 'linear-gradient(135deg, #6b7280, #9ca3af)' }}
                              >
                                {(v.nombre?.[0] || '?').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">{volNombre}</p>
                                <p className="text-xs text-gray-400 truncate">{v.email}</p>
                                <div className="flex flex-wrap gap-2 mt-0.5">
                                  {v.municipio && <span className="text-xs text-gray-400">ðŸ“ {v.municipio}</span>}
                                  {v.telefono && <span className="text-xs text-gray-400">ðŸ“ž {v.telefono}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {estadoCfg ? (
                                <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                                  style={{ background: estadoCfg.bg, color: estadoCfg.color }}>
                                  {estadoCfg.emoji} {estadoCfg.label}
                                </span>
                              ) : (
                                <button
                                  onClick={() => invitarVoluntario(v.id)}
                                  disabled={invitando === v.id}
                                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                                >
                                  {invitando === v.id ? '...' : 'ðŸ“¨ Invitar'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
                  <button onClick={() => setTabEditor('datos')}
                    className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                    â† Volver a datos
                  </button>
                  <button onClick={() => { setVista('dashboard'); resetForm() }}
                    className="flex-1 py-3 rounded-xl font-semibold text-white transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                    âœ… Terminar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* â”€â”€ PERFIL DE ENTIDAD â”€â”€ */}
        {vista === 'perfil' && (
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
                  {esEmpresa ? 'ðŸŽ­' : 'ðŸ¢'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {tienePerfil ? 'Mi Perfil' : 'Â¡Bienvenido! Completa tu perfil'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {tienePerfil
                      ? 'Actualiza los datos de tu organizaciÃ³n cuando quieras'
                      : 'Necesitas completar tu perfil antes de crear actividades'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {!tienePerfil && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                  <span className="text-2xl">âš ï¸</span>
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">Perfil incompleto</p>
                    <p className="text-amber-700 text-sm mt-0.5">Rellena los campos obligatorios (*) para poder crear actividades e invitar voluntarios.</p>
                  </div>
                </div>
              )}

              {/* â”€â”€ ENTIDAD SOCIAL â”€â”€ */}
              {!esEmpresa && (
                <>
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 pb-1 border-b border-green-100">Datos de la organizaciÃ³n</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nombre legal *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="FundaciÃ³n / ONG / AsociaciÃ³n"
                        value={perfilEntidad.nombre_legal}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, nombre_legal: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">NIF *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="G12345678"
                        value={perfilEntidad.nif}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, nif: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">PÃ¡gina web</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="https://..."
                        value={perfilEntidad.web}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, web: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">DirecciÃ³n *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="DirecciÃ³n completa"
                        value={perfilEntidad.direccion}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, direccion: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Fecha de inscripciÃ³n oficial</label>
                      <input type="date" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        value={perfilEntidad.fecha_inscripcion}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, fecha_inscripcion: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">NÃºmero de registro</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="NÂº registro"
                        value={perfilEntidad.numero_registro}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, numero_registro: e.target.value })} />
                    </div>
                  </div>

                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 pb-1 border-b border-green-100 mt-6">Persona administradora *</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nombre completo *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="Nombre completo"
                        value={perfilEntidad.admin_nombre}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, admin_nombre: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Email *</label>
                      <input type="email" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="admin@entidad.org"
                        value={perfilEntidad.admin_email}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, admin_email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">TelÃ©fono *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="600000000"
                        value={perfilEntidad.admin_telefono}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, admin_telefono: e.target.value })} />
                    </div>
                  </div>

                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 pb-1 border-b border-green-100 mt-6">Persona de contacto (opcional, si es distinta)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nombre completo</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="Nombre completo"
                        value={perfilEntidad.contacto_nombre}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, contacto_nombre: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Email</label>
                      <input type="email" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="contacto@entidad.org"
                        value={perfilEntidad.contacto_email}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, contacto_email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">TelÃ©fono</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="600000000"
                        value={perfilEntidad.contacto_telefono}
                        onChange={e => setPerfilEntidad({ ...perfilEntidad, contacto_telefono: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {/* â”€â”€ EMPRESA CULTURAL â”€â”€ */}
              {esEmpresa && (
                <>
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 pb-1 border-b border-green-100">Datos de la empresa</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nombre de la empresa *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="Nombre comercial"
                        value={perfilEmpresa.nombre_empresa}
                        onChange={e => setPerfilEmpresa({ ...perfilEmpresa, nombre_empresa: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">CIF *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="B12345678"
                        value={perfilEmpresa.cif}
                        onChange={e => setPerfilEmpresa({ ...perfilEmpresa, cif: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">PÃ¡gina web</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="https://..."
                        value={perfilEmpresa.web}
                        onChange={e => setPerfilEmpresa({ ...perfilEmpresa, web: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">DirecciÃ³n *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="DirecciÃ³n completa"
                        value={perfilEmpresa.direccion}
                        onChange={e => setPerfilEmpresa({ ...perfilEmpresa, direccion: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Tipo de oferta cultural *</label>
                      <select className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        value={perfilEmpresa.tipo_oferta}
                        onChange={e => setPerfilEmpresa({ ...perfilEmpresa, tipo_oferta: e.target.value })}>
                        <option value="">Selecciona...</option>
                        <option value="museo">Museo</option>
                        <option value="teatro">Teatro</option>
                        <option value="musica">MÃºsica / Conciertos</option>
                        <option value="cine">Cine</option>
                        <option value="danza">Danza</option>
                        <option value="talleres">Talleres culturales</option>
                        <option value="otros">Otros</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Sistema de canje *</label>
                      <select className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        value={perfilEmpresa.sistema_canje}
                        onChange={e => setPerfilEmpresa({ ...perfilEmpresa, sistema_canje: e.target.value })}>
                        <option value="manual">OpciÃ³n A â€“ Canje manual (cÃ³digo en TPV/web)</option>
                        <option value="api">OpciÃ³n B â€“ API REST (validaciÃ³n automÃ¡tica)</option>
                        <option value="plugin">OpciÃ³n C â€“ Plugin (Shopify, WooCommerce...)</option>
                        <option value="middleware">OpciÃ³n D â€“ Middleware (sincronizaciÃ³n automÃ¡tica)</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 pb-1 border-b border-green-100 mt-6">Persona de contacto *</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nombre completo *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="Nombre completo"
                        value={perfilEmpresa.contacto_nombre}
                        onChange={e => setPerfilEmpresa({ ...perfilEmpresa, contacto_nombre: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Email *</label>
                      <input type="email" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="contacto@empresa.com"
                        value={perfilEmpresa.contacto_email}
                        onChange={e => setPerfilEmpresa({ ...perfilEmpresa, contacto_email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">TelÃ©fono *</label>
                      <input className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                        placeholder="600000000"
                        value={perfilEmpresa.contacto_telefono}
                        onChange={e => setPerfilEmpresa({ ...perfilEmpresa, contacto_telefono: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-8">
                {tienePerfil && (
                  <button onClick={() => setVista('dashboard')}
                    className="px-6 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                )}
                <button onClick={guardarPerfil} disabled={perfilLoading}
                  className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  {perfilLoading ? 'Guardando...' : tienePerfil ? 'âœ… Actualizar perfil' : 'âœ… Guardar perfil y continuar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ DELEGADOS â”€â”€ */}
        {vista === 'delegados' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-800">ðŸ‘¥ Delegados</h3>
                <p className="text-sm text-gray-400">Responsables de tu entidad con acceso al panel</p>
              </div>
              <button
                onClick={() => { setMostrarFormDelegado(true); setDelegadoError('') }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                âž• Nuevo delegado
              </button>
            </div>

            {delegadoSuccess && (
              <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm mb-4">{delegadoSuccess}</div>
            )}

            {/* Formulario nuevo delegado */}
            {mostrarFormDelegado && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-4">Crear nuevo delegado</h4>
                {delegadoError && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{delegadoError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nombre completo *</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Nombre del delegado"
                      value={formDelegado.nombre}
                      onChange={e => setFormDelegado({ ...formDelegado, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Cargo</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Ej: Coordinador de voluntarios"
                      value={formDelegado.cargo}
                      onChange={e => setFormDelegado({ ...formDelegado, cargo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Email *</label>
                    <input
                      type="email"
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="delegado@entidad.org"
                      value={formDelegado.email}
                      onChange={e => setFormDelegado({ ...formDelegado, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">ContraseÃ±a *</label>
                    <input
                      type="password"
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                      placeholder="ContraseÃ±a de acceso"
                      value={formDelegado.password}
                      onChange={e => setFormDelegado({ ...formDelegado, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setMostrarFormDelegado(false); setDelegadoError('') }}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={crearDelegado}
                    disabled={creandoDelegado}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                  >
                    {creandoDelegado ? 'Creando...' : 'âœ… Crear delegado'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de delegados */}
            {delegadosLoading ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
                <p className="text-4xl mb-2">â³</p><p>Cargando delegados...</p>
              </div>
            ) : delegados.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">ðŸ‘¤</p>
                <p className="font-medium">No tienes delegados aÃºn</p>
                <p className="text-sm mt-1">Crea uno para que pueda gestionar actividades y voluntarios</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mensajeDelegadoOk && (
                  <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm">{mensajeDelegadoOk}</div>
                )}
                {delegados.map(d => (
                  <div key={d.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: d.activo ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#d1d5db' }}>
                          {(d.nombre?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800">{d.nombre}</p>
                            {d.cargo && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{d.cargo}</span>}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {d.activo ? 'â— Activo' : 'â— Inactivo'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 truncate">{d.email}</p>
                          {actividadesPorDelegado[d.id]?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {actividadesPorDelegado[d.id].map(a => (
                                <button
                                  key={a.id}
                                  onClick={() => {
                                    const act = actividades.find(ac => ac.id === a.id)
                                    if (act) setActividadModalDelegado(act)
                                  }}
                                  className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full hover:bg-green-100 transition cursor-pointer"
                                >
                                  ðŸ“‹ {a.nombre.length > 30 ? a.nombre.slice(0, 30) + 'â€¦' : a.nombre}
                                </button>
                              ))}
                            </div>
                          )}
                          {!actividadesPorDelegado[d.id]?.length && (
                            <p className="text-xs text-gray-300 mt-0.5">Sin actividades asignadas</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setMensajeDelegadoId(mensajeDelegadoId === d.id ? null : d.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                        >
                          ðŸ“© Mensaje
                        </button>
                        <button
                          onClick={() => toggleDelegado(d.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${d.activo ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        >
                          {d.activo ? 'â¸ Desactivar' : 'â–¶ Activar'}
                        </button>
                        <button
                          onClick={() => eliminarDelegado(d.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition"
                        >
                          ðŸ—‘ Eliminar
                        </button>
                      </div>
                    </div>

                    {/* Formulario de mensaje inline */}
                    {mensajeDelegadoId === d.id && (
                      <div className="border-t border-gray-100 p-5 bg-blue-50/30">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Enviar mensaje a {d.nombre}
                        </p>
                        <div className="space-y-3">
                          <input
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 bg-white"
                            placeholder="Asunto"
                            value={formMensajeDelegado.asunto}
                            onChange={e => setFormMensajeDelegado(prev => ({ ...prev, asunto: e.target.value }))}
                          />
                          <textarea
                            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 bg-white resize-none"
                            placeholder="Escribe tu mensaje..."
                            rows={3}
                            value={formMensajeDelegado.cuerpo}
                            onChange={e => setFormMensajeDelegado(prev => ({ ...prev, cuerpo: e.target.value }))}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setMensajeDelegadoId(null); setFormMensajeDelegado({ asunto: '', cuerpo: '' }) }}
                              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={enviarMensajeDelegado}
                              disabled={enviandoMensajeDelegado}
                              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                            >
                              {enviandoMensajeDelegado ? 'Enviando...' : 'ðŸ“© Enviar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ HORAS PENDIENTES ENTIDAD â”€â”€ */}
        {vista === 'horas' && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">â±ï¸ ValidaciÃ³n final de horas</h3>
            <p className="text-sm text-gray-500 mb-5">
              Estas horas han sido aprobadas por el delegado. Como entidad, tienes la Ãºltima palabra: al validarlas se suman al saldo disponible del voluntario.
            </p>

            {horasEntidadMensaje && (
              <div className={`p-3 rounded-xl text-sm mb-4 ${horasEntidadMensaje.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {horasEntidadMensaje.texto}
              </div>
            )}

            {horasEntidadLoading ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
                <p className="text-4xl mb-2">â³</p><p>Cargando horas...</p>
              </div>
            ) : horasPendientesEntidad.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">âœ…</p>
                <p className="font-medium">No hay horas pendientes de validaciÃ³n</p>
                <p className="text-sm mt-1">Cuando el delegado apruebe horas, aparecerÃ¡n aquÃ­ para tu validaciÃ³n final</p>
              </div>
            ) : (
              <div className="space-y-3">
                {horasPendientesEntidad.map(h => (
                  <div key={h.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-800">{h.voluntario_nombre} {h.voluntario_apellidos}</span>
                          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{h.voluntario_email}</span>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">âœ“ Aprobado por delegado</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          ðŸ“‹ <span className="font-medium">{h.actividad_nombre}</span>
                          <span className="mx-2 text-gray-300">Â·</span>
                          ðŸ• <span className="font-bold text-blue-600">{h.horas}h</span>
                          <span className="mx-2 text-gray-300">Â·</span>
                          ðŸ“… {new Date(h.fecha_registro).toLocaleDateString('es-ES')}
                        </p>
                        {h.notas && <p className="text-xs text-gray-400 italic">"{h.notas}"</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => accionHorasEntidad(h.id, 'validar-entidad')}
                          className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition"
                        >
                          âœ… Validar
                        </button>
                        <button
                          onClick={() => accionHorasEntidad(h.id, 'rechazar-entidad')}
                          className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition"
                        >
                          âŒ Rechazar
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


