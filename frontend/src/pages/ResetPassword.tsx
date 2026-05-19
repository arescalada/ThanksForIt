import { useState, useEffect } from 'react'
import axios from 'axios'

interface Props {
  onSuccess: () => void
}

export default function ResetPassword({ onSuccess }: Props) {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) setToken(t)
    else setError('Token no válido. Solicita un nuevo enlace de recuperación.')
  }, [])

  const handleReset = async () => {
    if (!password || !confirmar) return setError('Completa todos los campos')
    if (password !== confirmar) return setError('Las contraseñas no coinciden')
    if (password.length < 6) return setError('Mínimo 6 caracteres')
    try {
      setLoading(true)
      setError('')
      await axios.post('/api/password/reset', { token, password })
      alert('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al restablecer contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <span className="text-4xl">🔑</span>
          <h1 className="text-2xl font-bold mt-2">Nueva contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Introduce tu nueva contraseña</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl mb-4">{error}</div>}
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nueva contraseña</label>
        <input
          type="password"
          className="w-full border border-gray-200 rounded-xl p-3 mb-3 text-sm focus:outline-none focus:border-green-500"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Confirmar contraseña</label>
        <input
          type="password"
          className="w-full border border-gray-200 rounded-xl p-3 mb-4 text-sm focus:outline-none focus:border-green-500"
          placeholder="Repite la contraseña"
          value={confirmar}
          onChange={e => setConfirmar(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleReset()}
        />
        <button
          onClick={handleReset}
          disabled={loading || !token}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
        >
          {loading ? 'Guardando...' : 'Restablecer contraseña'}
        </button>
      </div>
    </div>
  )
}
