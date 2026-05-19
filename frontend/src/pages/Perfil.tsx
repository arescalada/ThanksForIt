import { useState, useEffect } from 'react'
import axios from 'axios'
import { getAuthHeaders } from '../utils/auth'

interface Props {
  usuario: { id: string; email: string; tipo_usuario: string }
  onBack: () => void
}

export default function Perfil({ usuario, onBack }: Props) {
  const [form, setForm] = useState({
    nombre: '', apellidos: '', fecha_nacimiento: '', dni_nie: '',
    telefono: '', direccion: '', preferencias: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { cargarPerfil() }, [])

  const cargarPerfil = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/voluntarios/perfil', { headers: getAuthHeaders() })
      if (res.data) {
        setForm({
          nombre: res.data.nombre || '',
          apellidos: res.data.apellidos || '',
          fecha_nacimiento: res.data.fecha_nacimiento?.split('T')[0] || '',
          dni_nie: res.data.dni_nie || '',
          telefono: res.data.telefono || '',
          direccion: (res.data.direccion === 'Sin dirección' ? '' : res.data.direccion) || '',
          preferencias: res.data.preferencias || '',
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGuardar = async () => {
    if (!form.nombre || !form.apellidos || !form.dni_nie) {
      return setError('Nombre, apellidos y DNI/NIE son obligatorios')
    }
    try {
      setSaving(true)
      setError('')
      await axios.post('/api/voluntarios/perfil', form, { headers: getAuthHeaders() })
      setSuccess('✅ Perfil actualizado correctamente')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar perfil')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
  const labelClass = "text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block"

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <nav className="px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="font-bold text-lg text-white">Thanks For It</span>
        </div>
        <button onClick={onBack} className="text-sm font-semibold px-4 py-2 rounded-xl border border-white text-white hover:bg-white hover:text-green-800 transition">
          ← Volver al dashboard
        </button>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-3xl p-8 mb-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-8xl opacity-20">👤</div>
          <h2 className="text-3xl font-bold text-white mb-1">Mi Perfil</h2>
          <p className="text-green-100">{usuario.email}</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
            <p className="text-3xl mb-2">⏳</p>
            <p>Cargando perfil...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-6">📋 Datos personales</h3>

            {success && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl mb-4">{success}</div>}
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombre *</label>
                <input className={inputClass} placeholder="Tu nombre"
                  value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Apellidos *</label>
                <input className={inputClass} placeholder="Tus apellidos"
                  value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>DNI / NIE *</label>
                <input className={inputClass} placeholder="12345678A"
                  value={form.dni_nie} onChange={e => setForm({ ...form, dni_nie: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Fecha de nacimiento</label>
                <input type="date" className={inputClass}
                  value={form.fecha_nacimiento} onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input className={inputClass} placeholder="600000000"
                  value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Dirección</label>
                <input className={inputClass} placeholder="Calle, número, ciudad"
                  value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
            </div>

            {/* Preferencias — campo nuevo */}
            <div className="mt-4">
              <label className={labelClass}>Preferencias e intereses</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500 resize-none h-24"
                placeholder="Ej: me gusta trabajar con personas mayores, actividades al aire libre, educación..."
                value={form.preferencias}
                onChange={e => setForm({ ...form, preferencias: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">Esto ayuda a las entidades a conocerte mejor</p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <label className={labelClass}>Email (no editable)</label>
              <input className="w-full border border-gray-100 rounded-xl p-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                value={usuario.email} disabled />
            </div>

            <button
              onClick={handleGuardar}
              disabled={saving}
              className="w-full mt-6 py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
            >
              {saving ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
