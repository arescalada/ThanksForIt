import { useState, useEffect, memo, useCallback } from 'react'
import axios from 'axios'

interface Props {
  onBack: () => void
  onRegistered: () => void
}

interface Entidad {
  id: string
  nombre_legal: string
  municipio?: string
}

interface EntidadItemProps {
  ent: { id: string; nombre_legal: string; municipio?: string }
  seleccionada: boolean
  onToggle: (id: string) => void
}

const EntidadItem = memo(({ ent, seleccionada, onToggle }: EntidadItemProps) => (
  <div
    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-green-50"
    style={{ background: seleccionada ? '#f0fdf4' : '#ffffff' }}
    onClick={() => onToggle(ent.id)}
  >
    <input
      type="checkbox"
      checked={seleccionada}
      onChange={() => onToggle(ent.id)}
      onClick={e => e.stopPropagation()}
      className="w-4 h-4 accent-green-600 flex-shrink-0"
    />
    <div>
      <p style={{ color: seleccionada ? '#166534' : '#374151' }} className="text-sm font-medium">
        {ent.nombre_legal}
      </p>
      {ent.municipio && (
        <p className="text-xs text-gray-400">📍 {ent.municipio}</p>
      )}
    </div>
  </div>
))

export default function Register({ onBack, onRegistered }: Props) {
  const [tipo, setTipo] = useState('voluntario')
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [base, setBase] = useState({ email: '', password: '', confirmar_password: '' })
  const [voluntario, setVoluntario] = useState({
    nombre: '', apellidos: '', fecha_nacimiento: '', dni_nie: '',
    telefono: '', direccion: '', consentimiento_rgpd: false
  })
  const [entidadesSeleccionadas, setEntidadesSeleccionadas] = useState<string[]>([])
  const [entidadesDisponibles, setEntidadesDisponibles] = useState<Entidad[]>([])
  const [entidadesCargando, setEntidadesCargando] = useState(false)

  const [entidad, setEntidad] = useState({
    nombre_legal: '', nif: '', direccion: '', web: '',
    fecha_inscripcion: '', numero_registro: '',
    admin_nombre: '', admin_email: '', admin_telefono: '',
    contacto_nombre: '', contacto_email: '', contacto_telefono: ''
  })
  const [empresa, setEmpresa] = useState({
    nombre_empresa: '', cif: '', direccion: '', web: '',
    contacto_nombre: '', contacto_email: '', contacto_telefono: '',
    tipo_oferta: '', sistema_canje: 'manual'
  })

  useEffect(() => {
    if (tipo === 'voluntario' && step === 2) {
      cargarEntidades()
    }
  }, [tipo, step])

  const cargarEntidades = async () => {
    try {
      setEntidadesCargando(true)
      const res = await axios.get('/api/entidades/publicas')
      setEntidadesDisponibles(res.data)
    } catch (err) {
      console.error('Error cargando entidades:', err)
      setEntidadesDisponibles([])
    } finally {
      setEntidadesCargando(false)
    }
  }

  const toggleEntidad = useCallback((id: string) => {
    setEntidadesSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }, [])

  const validarStep2 = (): string | null => {
    if (tipo === 'voluntario') {
      if (!voluntario.nombre || !voluntario.apellidos) return 'Nombre y apellidos son obligatorios'
      if (!voluntario.dni_nie) return 'El DNI/NIE es obligatorio'
      if (!voluntario.consentimiento_rgpd) return 'Debes aceptar el consentimiento RGPD'
    }
    if (tipo === 'entidad') {
      if (!entidad.nombre_legal) return 'El nombre legal es obligatorio'
      if (!entidad.nif) return 'El NIF es obligatorio'
      if (!entidad.direccion) return 'La dirección es obligatoria'
      if (!entidad.admin_nombre || !entidad.admin_email || !entidad.admin_telefono) {
        return 'Los datos de la persona administradora son obligatorios'
      }
    }
    if (tipo === 'empresa') {
      if (!empresa.nombre_empresa) return 'El nombre de la empresa es obligatorio'
      if (!empresa.cif) return 'El CIF es obligatorio'
      if (!empresa.direccion) return 'La dirección es obligatoria'
      if (!empresa.tipo_oferta) return 'El tipo de oferta cultural es obligatorio'
      if (!empresa.contacto_nombre || !empresa.contacto_email || !empresa.contacto_telefono) {
        return 'Los datos de contacto son obligatorios'
      }
    }
    return null
  }

  const handleSubmit = async () => {
    const errValidacion = validarStep2()
    if (errValidacion) return setError(errValidacion)

    try {
      setLoading(true)
      setError('')
      const { data } = await axios.post('/api/auth/register', {
        email: base.email, password: base.password, tipo_usuario: tipo
      })

      const token_temp = data.token
      const userId = data.usuario.id
      const headers = { Authorization: `Bearer ${token_temp}` }

      if (tipo === 'voluntario') {
        await axios.post('/api/voluntarios/perfil', { ...voluntario, usuario_id: userId }, { headers })
        if (entidadesSeleccionadas.length > 0) {
          try {
            await axios.post('/api/voluntarios/solicitar-entidades', {
              entidad_ids: entidadesSeleccionadas
            }, { headers })
          } catch (entidadErr: any) {
            console.error('Error al solicitar entidades:', entidadErr.response?.data || entidadErr)
          }
        }
      } else if (tipo === 'entidad') {
        await axios.post('/api/entidades/perfil', { ...entidad, usuario_id: userId }, { headers })
      } else if (tipo === 'empresa') {
        await axios.post('/api/empresas/perfil', { ...empresa, usuario_id: userId }, { headers })
      }

      onRegistered()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full border border-gray-200 rounded-xl p-3 mb-3 text-sm focus:outline-none focus:border-green-500"
  const labelClass = "text-xs font-medium text-gray-500 mb-1 block uppercase tracking-wide"
  const sectionClass = "text-xs font-bold text-green-700 uppercase tracking-wider mb-3 mt-4 pb-1 border-b border-green-100"

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8 max-h-screen overflow-y-auto">

        <div className="text-center mb-6">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold mt-2">Crear cuenta</h1>
          <p className="text-gray-500 text-sm">Plataforma Voluntariado Cultural</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

        {step === 1 && (
          <>
            <label className={labelClass}>Tipo de usuario</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputClass}>
              <option value="voluntario">🙋 Voluntario</option>
              <option value="entidad">🏢 Entidad Social (ONG/Fundación)</option>
              <option value="empresa">🎭 Empresa Cultural</option>
            </select>

            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} placeholder="tu@email.com"
              value={base.email} onChange={e => setBase({ ...base, email: e.target.value })} />

            <label className={labelClass}>Contraseña</label>
            <input type="password" className={inputClass} placeholder="Mínimo 6 caracteres"
              value={base.password} onChange={e => setBase({ ...base, password: e.target.value })} />

            <label className={labelClass}>Confirmar contraseña</label>
            <input type="password" className={inputClass} placeholder="Repite la contraseña"
              value={base.confirmar_password} onChange={e => setBase({ ...base, confirmar_password: e.target.value })} />

            <button onClick={() => {
              if (!base.email || !base.password || !base.confirmar_password) return setError('Completa todos los campos')
              if (base.password !== base.confirmar_password) return setError('Las contraseñas no coinciden')
              if (base.password.length < 6) return setError('Mínimo 6 caracteres')
              setError(''); setStep(2)
            }} className="w-full py-3 rounded-xl font-semibold text-white mt-2" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              Siguiente →
            </button>
          </>
        )}

        {/* ── VOLUNTARIO ── */}
        {step === 2 && tipo === 'voluntario' && (
          <>
            <h2 className="font-semibold text-gray-700 mb-4">📋 Datos del voluntario</h2>

            <label className={labelClass}>Nombre *</label>
            <input className={inputClass} placeholder="Tu nombre" value={voluntario.nombre}
              onChange={e => setVoluntario({ ...voluntario, nombre: e.target.value })} />

            <label className={labelClass}>Apellidos *</label>
            <input className={inputClass} placeholder="Tus apellidos" value={voluntario.apellidos}
              onChange={e => setVoluntario({ ...voluntario, apellidos: e.target.value })} />

            <label className={labelClass}>DNI / NIE *</label>
            <input className={inputClass} placeholder="12345678A" value={voluntario.dni_nie}
              onChange={e => setVoluntario({ ...voluntario, dni_nie: e.target.value })} />

            <label className={labelClass}>Fecha de nacimiento</label>
            <input type="date" className={inputClass} value={voluntario.fecha_nacimiento}
              onChange={e => setVoluntario({ ...voluntario, fecha_nacimiento: e.target.value })} />

            <label className={labelClass}>Teléfono</label>
            <input className={inputClass} placeholder="600000000" value={voluntario.telefono}
              onChange={e => setVoluntario({ ...voluntario, telefono: e.target.value })} />

            <label className={labelClass}>Dirección</label>
            <input className={inputClass} placeholder="Calle, número, ciudad" value={voluntario.direccion}
              onChange={e => setVoluntario({ ...voluntario, direccion: e.target.value })} />

            {/* SELECTOR DE ENTIDADES */}
            <div className="mt-2 mb-3">
              <p className={sectionClass}>🏢 Entidades a las que quieres ofrecerte</p>
              <p className="text-xs text-gray-400 mb-3">
                Selecciona las entidades donde te gustaría hacer voluntariado. Ellas podrán ver tu perfil y aceptarte.
                Puedes seleccionar varias o ninguna.
              </p>

              {entidadesCargando ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  <p>⏳ Cargando entidades...</p>
                </div>
              ) : entidadesDisponibles.length === 0 ? (
                <div className="text-center py-4 text-gray-300 text-sm bg-gray-50 rounded-xl">
                  <p>No hay entidades registradas todavía</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl">
                  {entidadesDisponibles.map(ent => (
                    <EntidadItem
                      key={ent.id}
                      ent={ent}
                      seleccionada={entidadesSeleccionadas.includes(ent.id)}
                      onToggle={toggleEntidad}
                    />
                  ))}
                </div>
              )}

              {entidadesSeleccionadas.length > 0 && (
                <p className="text-xs text-green-600 mt-2 font-medium">
                  ✅ {entidadesSeleccionadas.length} entidad{entidadesSeleccionadas.length > 1 ? 'es' : ''} seleccionada{entidadesSeleccionadas.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex items-start gap-3 mb-4 mt-2">
              <input type="checkbox" id="rgpd" className="mt-1"
                checked={voluntario.consentimiento_rgpd}
                onChange={e => setVoluntario({ ...voluntario, consentimiento_rgpd: e.target.checked })} />
              <label htmlFor="rgpd" className="text-xs text-gray-500">
                Acepto el tratamiento de mis datos personales conforme al <span className="text-green-600 underline cursor-pointer">Reglamento RGPD</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">← Atrás</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {loading ? 'Creando...' : '✅ Crear cuenta'}
              </button>
            </div>
          </>
        )}

        {/* ── ENTIDAD ── */}
        {step === 2 && tipo === 'entidad' && (
          <>
            <h2 className="font-semibold text-gray-700 mb-4">🏢 Datos de la entidad</h2>

            <p className={sectionClass}>Datos de la organización</p>

            <label className={labelClass}>Nombre legal *</label>
            <input className={inputClass} placeholder="Fundación / ONG / Asociación" value={entidad.nombre_legal}
              onChange={e => setEntidad({ ...entidad, nombre_legal: e.target.value })} />

            <label className={labelClass}>NIF *</label>
            <input className={inputClass} placeholder="G12345678" value={entidad.nif}
              onChange={e => setEntidad({ ...entidad, nif: e.target.value })} />

            <label className={labelClass}>Dirección *</label>
            <input className={inputClass} placeholder="Dirección completa" value={entidad.direccion}
              onChange={e => setEntidad({ ...entidad, direccion: e.target.value })} />

            <label className={labelClass}>Página web (opcional)</label>
            <input className={inputClass} placeholder="https://..." value={entidad.web}
              onChange={e => setEntidad({ ...entidad, web: e.target.value })} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Fecha de inscripción oficial</label>
                <input type="date" className={inputClass} value={entidad.fecha_inscripcion}
                  onChange={e => setEntidad({ ...entidad, fecha_inscripcion: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Número de registro</label>
                <input className={inputClass} placeholder="Nº registro" value={entidad.numero_registro}
                  onChange={e => setEntidad({ ...entidad, numero_registro: e.target.value })} />
              </div>
            </div>

            <p className={sectionClass}>Persona administradora *</p>

            <label className={labelClass}>Nombre completo *</label>
            <input className={inputClass} placeholder="Nombre completo" value={entidad.admin_nombre}
              onChange={e => setEntidad({ ...entidad, admin_nombre: e.target.value })} />

            <label className={labelClass}>Email *</label>
            <input type="email" className={inputClass} placeholder="admin@entidad.org" value={entidad.admin_email}
              onChange={e => setEntidad({ ...entidad, admin_email: e.target.value })} />

            <label className={labelClass}>Teléfono *</label>
            <input className={inputClass} placeholder="600000000" value={entidad.admin_telefono}
              onChange={e => setEntidad({ ...entidad, admin_telefono: e.target.value })} />

            <p className={sectionClass}>Persona de contacto (opcional, si es distinta)</p>

            <label className={labelClass}>Nombre completo</label>
            <input className={inputClass} placeholder="Nombre completo" value={entidad.contacto_nombre}
              onChange={e => setEntidad({ ...entidad, contacto_nombre: e.target.value })} />

            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} placeholder="contacto@entidad.org" value={entidad.contacto_email}
              onChange={e => setEntidad({ ...entidad, contacto_email: e.target.value })} />

            <label className={labelClass}>Teléfono</label>
            <input className={inputClass} placeholder="600000000" value={entidad.contacto_telefono}
              onChange={e => setEntidad({ ...entidad, contacto_telefono: e.target.value })} />

            <div className="flex gap-3 mt-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">← Atrás</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {loading ? 'Creando...' : '✅ Crear cuenta'}
              </button>
            </div>
          </>
        )}

        {/* ── EMPRESA ── */}
        {step === 2 && tipo === 'empresa' && (
          <>
            <h2 className="font-semibold text-gray-700 mb-4">🎭 Datos de la empresa cultural</h2>

            <p className={sectionClass}>Datos de la empresa</p>

            <label className={labelClass}>Nombre de la empresa *</label>
            <input className={inputClass} placeholder="Nombre comercial" value={empresa.nombre_empresa}
              onChange={e => setEmpresa({ ...empresa, nombre_empresa: e.target.value })} />

            <label className={labelClass}>CIF *</label>
            <input className={inputClass} placeholder="B12345678" value={empresa.cif}
              onChange={e => setEmpresa({ ...empresa, cif: e.target.value })} />

            <label className={labelClass}>Dirección *</label>
            <input className={inputClass} placeholder="Dirección completa" value={empresa.direccion}
              onChange={e => setEmpresa({ ...empresa, direccion: e.target.value })} />

            <label className={labelClass}>Página web (opcional)</label>
            <input className={inputClass} placeholder="https://..." value={empresa.web}
              onChange={e => setEmpresa({ ...empresa, web: e.target.value })} />

            <label className={labelClass}>Tipo de oferta cultural *</label>
            <select className={inputClass} value={empresa.tipo_oferta}
              onChange={e => setEmpresa({ ...empresa, tipo_oferta: e.target.value })}>
              <option value="">Selecciona...</option>
              <option value="museo">Museo</option>
              <option value="teatro">Teatro</option>
              <option value="musica">Música / Conciertos</option>
              <option value="cine">Cine</option>
              <option value="danza">Danza</option>
              <option value="talleres">Talleres culturales</option>
              <option value="otros">Otros</option>
            </select>

            <label className={labelClass}>Sistema de canje disponible *</label>
            <select className={inputClass} value={empresa.sistema_canje}
              onChange={e => setEmpresa({ ...empresa, sistema_canje: e.target.value })}>
              <option value="manual">Opción A – Canje manual (código en TPV/web)</option>
              <option value="api">Opción B – API REST (validación automática)</option>
              <option value="plugin">Opción C – Plugin (Shopify, WooCommerce...)</option>
              <option value="middleware">Opción D – Middleware (sincronización automática)</option>
            </select>

            <p className={sectionClass}>Persona de contacto *</p>

            <label className={labelClass}>Nombre completo *</label>
            <input className={inputClass} placeholder="Nombre completo" value={empresa.contacto_nombre}
              onChange={e => setEmpresa({ ...empresa, contacto_nombre: e.target.value })} />

            <label className={labelClass}>Email *</label>
            <input type="email" className={inputClass} placeholder="contacto@empresa.com" value={empresa.contacto_email}
              onChange={e => setEmpresa({ ...empresa, contacto_email: e.target.value })} />

            <label className={labelClass}>Teléfono *</label>
            <input className={inputClass} placeholder="600000000" value={empresa.contacto_telefono}
              onChange={e => setEmpresa({ ...empresa, contacto_telefono: e.target.value })} />

            <div className="flex gap-3 mt-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">← Atrás</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {loading ? 'Creando...' : '✅ Crear cuenta'}
              </button>
            </div>
          </>
        )}

        <button onClick={onBack} className="w-full mt-4 text-gray-400 hover:text-gray-600 text-sm">
          ← Volver al login
        </button>
      </div>
    </div>
  )
}
