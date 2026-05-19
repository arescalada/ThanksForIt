import { useState } from 'react'
import axios from 'axios'

interface Props {
  onBack: () => void
}

export default function ForgotPassword({ onBack }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSolicitar = async () => {
    if (!email) return setError('Introduce tu email')
    try {
      setLoading(true)
      setError('')
      await axios.post('/api/password/solicitar', { email })
      setSuccess('Si el email existe, recibirás un enlace en breve. Revisa tu bandeja de entrada.')
      setEmail('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar el email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <span className="text-4xl">🔒</span>
          <h1 className="text-2xl font-bold mt-2">Recuperar contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Te enviaremos un enlace para restablecerla</p>
        </div>
        {success && <div className="bg-green-50 text-green-700 text-sm p-4 rounded-xl mb-4">{success}</div>}
        {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl mb-4">{error}</div>}
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Email registrado</label>
        <input
          type="email"
          className="w-full border border-gray-200 rounded-xl p-3 mb-4 text-sm focus:outline-none focus:border-green-500"
          placeholder="tu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSolicitar()}
        />
        <button
          onClick={handleSolicitar}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
        >
          {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
        </button>
        <button onClick={onBack} className="w-full mt-4 text-gray-400 hover:text-gray-600 text-sm">
          ← Volver al login
        </button>
      </div>
    </div>
  )
}
