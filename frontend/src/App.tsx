import { API_URL } from './config'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import Admin from './pages/Admin'
import EmpresaDashboard from './pages/EmpresaDashboard'
import EntidadDashboard from './pages/EntidadDashboard'
import DelegadoDashboard from './pages/DelegadoDashboard'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import CookieBanner from './pages/CookieBanner'
import PoliticaPrivacidad from './pages/PoliticaPrivacidad'
import PoliticaCookies from './pages/PoliticaCookies'
import AvisoLegal from './pages/AvisoLegal'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [usuario, setUsuario] = useState<any>(null)
  const [showRegister, setShowRegister] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [filtromunicipio, setFiltroMunicipio] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [actividadesPublicas, setActividadesPublicas] = useState<any[]>([])
  const [buscadorCargando, setBuscadorCargando] = useState(false)
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [paginaLegal, setPaginaLegal] = useState<'privacidad' | 'cookies' | 'aviso' | null>(null)

  // Detectar token de reset en la URL al cargar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('token')) setShowReset(true)
  }, [])

  // Ref para pausar el carrusel cuando Register está abierto sin cambiar dependencias
  const showRegisterRef = useRef(showRegister)
  useEffect(() => { showRegisterRef.current = showRegister }, [showRegister])

  // Autoplay del carrusel — se pausa cuando Register está abierto
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showRegisterRef.current) {
        setCurrentSlide(prev => (prev + 1) % 3)
      }
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const buscarActividades = async () => {
    try {
      setBuscadorCargando(true)
      setBusquedaRealizada(true)
      const params = new URLSearchParams()
      if (filtromunicipio) params.append('municipio', filtromunicipio)
      if (filtroTipo) params.append('tipo', filtroTipo)
      if (filtroFecha) params.append('fecha_inicio', filtroFecha)
      const res = await axios.get(`/api/actividades?${params.toString()}`)
      setActividadesPublicas(res.data)
    } catch (err) {
      console.error(err)
      setActividadesPublicas([])
    } finally {
      setBuscadorCargando(false)
    }
  }

  const handleLogin = async () => {
    try {
      const res = await axios.post(\\/api/auth/login', { email, password })
      sessionStorage.setItem('token', res.data.token)
      setUsuario(res.data.usuario)
      setError('')
      setShowLogin(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    }
  }

  const handleLogout = () => {
    setUsuario(null)
    localStorage.clear()
    sessionStorage.clear()
  }

  // Pantallas especiales (reset password desde email)
  if (showReset) {
    return <ResetPassword onSuccess={() => { setShowReset(false); setShowLogin(true) }} />
  }

  if (showForgot) {
    return <ForgotPassword onBack={() => setShowForgot(false)} />
  }

  // Dashboards según tipo de usuario
  if (usuario) {
    if (usuario.tipo_usuario === 'admin') {
      return <Admin onLogout={handleLogout} />
    }
    if (usuario.tipo_usuario === 'empresa') {
      return <EmpresaDashboard usuario={usuario} onLogout={handleLogout} />
    }
    if (usuario.tipo_usuario === 'entidad') {
      return <EntidadDashboard usuario={usuario} onLogout={handleLogout} />
    }
    if (usuario.tipo_usuario === 'delegado') {
      return <DelegadoDashboard usuario={usuario} onLogout={handleLogout} />
    } 
     return <Dashboard usuario={usuario} onLogout={handleLogout} />
  }

  if (showRegister) {
    return (
      <Register
        onBack={() => setShowRegister(false)}
        onRegistered={() => { setShowRegister(false); setRegistered(true); setShowLogin(true) }}
      />
    )
  }

  const slides = [
    {
      titulo: 'Tu tiempo vale cultura',
      subtitulo: 'Convierte tus horas de voluntariado en experiencias culturales únicas',
      imagen: '🎭',
      color: 'from-green-50 to-emerald-100'
    },
    {
      titulo: 'Más de 200 empresas culturales',
      subtitulo: 'Teatros, museos, festivales y escuelas de arte colaborando contigo',
      imagen: '🎪',
      color: 'from-blue-50 to-cyan-100'
    },
    {
      titulo: '2.400+ voluntarios activos',
      subtitulo: 'Únete a la comunidad que transforma horas en cultura',
      imagen: '🌱',
      color: 'from-purple-50 to-pink-100'
    }
  ]

  const noticias = [
    {
      emoji: '🎭',
      categoria: 'Eventos',
      titulo: 'Nueva temporada de ópera en el Teatro Real',
      texto: 'Los voluntarios registrados pueden acceder con descuentos de hasta el 50% presentando su código de canje generado en la plataforma.',
      fecha: '10 abril 2026'
    },
    {
      emoji: '🎪',
      categoria: 'Beneficios',
      titulo: 'Más de 200 empresas culturales ya participan',
      texto: 'Teatros, museos, festivales y escuelas de arte se suman a la plataforma para ofrecer experiencias únicas a los voluntarios registrados.',
      fecha: '8 abril 2026'
    },
    {
      emoji: '🌍',
      categoria: 'Comunidad',
      titulo: 'Cómo funciona el sistema de horas y canjes',
      texto: 'Cada hora validada por tu entidad suma a tu saldo. Con ese saldo puedes generar códigos de canje para disfrutar de la cultura que te mereces.',
      fecha: '5 abril 2026'
    }
  ]

  const stats = [
    { numero: '2.400+', label: 'Voluntarios activos' },
    { numero: '180+', label: 'Entidades sociales' },
    { numero: '200+', label: 'Empresas culturales' },
    { numero: '12.000+', label: 'Horas registradas' }
  ]

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>

      {/* BANNER DE COOKIES */}
      <CookieBanner
        onVerPolitica={() => setPaginaLegal('cookies')}
      />

      {/* PÁGINAS LEGALES (modal overlay) */}
      {paginaLegal === 'privacidad' && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-60 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 py-8">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl relative">
              <button
                onClick={() => setPaginaLegal(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
              >✕</button>
              <PoliticaPrivacidad />
            </div>
          </div>
        </div>
      )}
      {paginaLegal === 'cookies' && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-60 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 py-8">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl relative">
              <button
                onClick={() => setPaginaLegal(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
              >✕</button>
              <PoliticaCookies />
            </div>
          </div>
        </div>
      )}
      {paginaLegal === 'aviso' && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-60 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 py-8">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl relative">
              <button
                onClick={() => setPaginaLegal(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
              >✕</button>
              <AvisoLegal />
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowLogin(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🌿</div>
              <h2 className="text-2xl font-bold" style={{ color: '#14532d' }}>Iniciar sesión</h2>
              <p className="text-gray-500 text-sm mt-1">Accede a tu cuenta</p>
            </div>

            {registered && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-xl mb-4">
                ✅ Cuenta creada. Ya puedes iniciar sesión.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-4">
                ❌ {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Email</label>
                <input
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Contraseña</label>
                <input
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full mt-6 py-3 rounded-xl text-white font-semibold text-sm transition hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
            >
              Iniciar sesión
            </button>

            <div className="mt-3 text-center">
              <button
                onClick={() => { setShowLogin(false); setShowForgot(true) }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setShowLogin(false); setShowRegister(true) }}
                className="text-sm font-medium hover:underline"
                style={{ color: '#16a34a' }}
              >
                ¿No tienes cuenta? Regístrate gratis
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen">
        {/* HEADER */}
        <header className="sticky top-0 z-40 shadow-sm border-b border-green-800" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌿</span>
              <span className="font-bold text-base sm:text-lg text-white">Thanks For It</span>
            </div>
            {/* Nav escritorio */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#actividades" className="text-sm text-green-100 hover:text-white font-medium transition">Actividades</a>
              <a href="#como-funciona" className="text-sm text-green-100 hover:text-white font-medium transition">Cómo funciona</a>
              <a href="#beneficios" className="text-sm text-green-100 hover:text-white font-medium transition">Beneficios</a>
              <a href="#noticias" className="text-sm text-green-100 hover:text-white font-medium transition">Noticias</a>
              <a href="#contacto" className="text-sm text-green-100 hover:text-white font-medium transition">Contacto</a>
            </nav>
            {/* Botones escritorio */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setShowLogin(!showLogin)}
                className="text-sm font-semibold px-4 py-2 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => setShowRegister(true)}
                className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition border border-white hover:bg-white hover:text-green-800"
              >
                Regístrate
              </button>
            </div>
            {/* Botones móvil */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setShowLogin(!showLogin)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl transition border border-white text-white hover:bg-white hover:text-green-800"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => setMenuAbierto(m => !m)}
                className="text-white p-1.5 rounded-lg border border-white/40 hover:bg-white/10 transition"
              >
                {menuAbierto ? '✕' : '☰'}
              </button>
            </div>
          </div>
          {/* Menú desplegable móvil */}
          {menuAbierto && (
            <div className="md:hidden border-t border-green-700 px-4 py-3 flex flex-col gap-2" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
              <a href="#actividades" onClick={() => setMenuAbierto(false)} className="text-sm text-green-100 hover:text-white font-medium py-2 border-b border-green-700/50 transition">Actividades</a>
              <a href="#como-funciona" onClick={() => setMenuAbierto(false)} className="text-sm text-green-100 hover:text-white font-medium py-2 border-b border-green-700/50 transition">Cómo funciona</a>
              <a href="#beneficios" onClick={() => setMenuAbierto(false)} className="text-sm text-green-100 hover:text-white font-medium py-2 border-b border-green-700/50 transition">Beneficios</a>
              <a href="#noticias" onClick={() => setMenuAbierto(false)} className="text-sm text-green-100 hover:text-white font-medium py-2 border-b border-green-700/50 transition">Noticias</a>
              <a href="#contacto" onClick={() => setMenuAbierto(false)} className="text-sm text-green-100 hover:text-white font-medium py-2 transition">Contacto</a>
              <button
                onClick={() => { setMenuAbierto(false); setShowRegister(true) }}
                className="mt-1 w-full py-2 rounded-xl text-sm font-semibold border border-white text-white hover:bg-white hover:text-green-800 transition"
              >
                Regístrate gratis
              </button>
            </div>
          )}
        </header>

        {/* HERO CON CAROUSEL */}
        <section style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 relative">
            <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12">
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight" style={{ color: '#14532d' }}>
                  {slides[currentSlide].titulo}
                </h1>
                <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8">{slides[currentSlide].subtitulo}</p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start">
                  <button
                    onClick={() => setShowRegister(true)}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-white font-semibold text-base sm:text-lg transition hover:opacity-90 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                  >
                    Empezar ahora
                  </button>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition border-2 bg-white hover:bg-gray-50"
                    style={{ borderColor: '#16a34a', color: '#16a34a' }}
                  >
                    Iniciar sesión
                  </button>
                </div>
                <div className="flex gap-2 mt-6 sm:mt-8 justify-center md:justify-start">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className="w-2 h-2 rounded-full transition"
                      style={{ background: i === currentSlide ? '#16a34a' : '#d1d5db' }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="text-7xl sm:text-9xl animate-pulse">{slides[currentSlide].imagen}</div>
              </div>
            </div>
          </div>
        </section>

        {/* BUSCADOR DE ACTIVIDADES */}
        <section id="actividades" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }} className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#14532d' }}>🔍 Buscar actividades</h2>
              <p className="text-gray-500">Encuentra voluntariado cerca de ti</p>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-col md:flex-row gap-3">
              <input
                className="flex-1 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                placeholder="📍 Municipio..."
                value={filtromunicipio}
                onChange={e => setFiltroMunicipio(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarActividades()}
              />
              <select
                className="flex-1 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
              >
                <option value="">🎭 Todos los tipos</option>
                <option value="museo">Museo</option>
                <option value="teatro">Teatro</option>
                <option value="musica">Música / Conciertos</option>
                <option value="danza">Danza</option>
                <option value="talleres">Talleres culturales</option>
                <option value="otros">Otros</option>
              </select>
              <input
                type="date"
                className="flex-1 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-500"
                value={filtroFecha}
                onChange={e => setFiltroFecha(e.target.value)}
              />
              <button
                onClick={buscarActividades}
                className="px-6 py-3 rounded-xl text-white font-semibold text-sm transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                Buscar
              </button>
            </div>

            {/* Resultados */}
            {buscadorCargando ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">⏳</p>
                <p>Buscando actividades...</p>
              </div>
            ) : actividadesPublicas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {actividadesPublicas.map((a: any) => (
                  <div key={a.id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">{a.nombre}</h3>
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#dcfce7', color: '#15803d' }}>Abierta</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{a.descripcion}</p>
                    <div className="space-y-1 text-xs text-gray-500 mb-4">
                      <p>📍 {a.municipio}</p>
                      <p>📅 {new Date(a.fecha_inicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      <p>👥 {a.num_voluntarios_objetivo} voluntarios necesarios</p>
                    </div>
                    <button
                      onClick={() => setShowRegister(true)}
                      className="w-full py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                    >
                      Inscribirme →
                    </button>
                  </div>
                ))}
              </div>
            ) : busquedaRealizada ? (
              <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">🔭</p>
                <p>No hay actividades con esos filtros</p>
                <button onClick={() => { setFiltroMunicipio(''); setFiltroTipo(''); setFiltroFecha(''); setBusquedaRealizada(false); setActividadesPublicas([]) }} className="mt-3 text-sm text-green-600 hover:underline">
                  Limpiar filtros
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {/* ESTADÍSTICAS */}
        <section style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)', borderTop: '1px solid #bbf7d0', borderBottom: '1px solid #bbf7d0' }} className="py-12">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-bold" style={{ color: '#16a34a' }}>{s.numero}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }} className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3" style={{ color: '#14532d' }}>¿Cómo funciona?</h2>
              <p className="text-gray-500">En 3 pasos, tu tiempo se convierte en cultura</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { paso: '01', emoji: '📝', titulo: 'Regístrate como voluntario', texto: 'Crea tu cuenta en minutos y accede a todas las actividades de voluntariado disponibles en tu municipio.' },
                { paso: '02', emoji: '⏱️', titulo: 'Acumula horas validadas', texto: 'Participa en actividades, registra tus horas y espera la validación del responsable de la entidad.' },
                { paso: '03', emoji: '🎟️', titulo: 'Canjea por cultura', texto: 'Usa tus horas para generar códigos de canje en teatros, museos, festivales y mucho más.' }
              ].map(item => (
                <div key={item.paso} className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-md transition text-center">
                  <div className="text-5xl mb-4">{item.emoji}</div>
                  <p className="text-xs font-bold mb-2" style={{ color: '#16a34a' }}>PASO {item.paso}</p>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: '#14532d' }}>{item.titulo}</h3>
                  <p className="text-gray-600 text-sm">{item.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFICIOS */}
        <section id="beneficios" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }} className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3" style={{ color: '#14532d' }}>Beneficios culturales</h2>
              <p className="text-gray-500">Experiencias que puedes conseguir con tus horas</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { emoji: '🎭', titulo: 'Teatro y ópera', texto: 'Entradas para las mejores obras' },
                { emoji: '🎵', titulo: 'Conciertos', texto: 'Música en vivo de todos los estilos' },
                { emoji: '🏛️', titulo: 'Museos', texto: 'Visitas guiadas y exposiciones' },
                { emoji: '🎬', titulo: 'Cine y festivales', texto: 'Pases y acreditaciones especiales' }
              ].map((b, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:shadow-md transition">
                  <div className="text-5xl mb-3">{b.emoji}</div>
                  <h3 className="font-semibold mb-2" style={{ color: '#14532d' }}>{b.titulo}</h3>
                  <p className="text-sm text-gray-500">{b.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NOTICIAS */}
        <section id="noticias" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }} className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3" style={{ color: '#14532d' }}>Últimas noticias</h2>
              <p className="text-gray-500">Lo más reciente de la plataforma</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {noticias.map((n, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-3xl">{n.emoji}</span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#dcfce7', color: '#15803d' }}>
                      {n.categoria}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: '#14532d' }}>{n.titulo}</h3>
                  <p className="text-sm text-gray-600 mb-4">{n.texto}</p>
                  <p className="text-xs text-gray-400">{n.fecha}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-20" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)' }}>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">¿Listo para empezar?</h2>
            <p className="text-green-100 text-lg mb-8">Únete a miles de voluntarios que ya disfrutan de la cultura</p>
            <button
              onClick={() => setShowRegister(true)}
              className="px-8 py-4 bg-white rounded-xl font-semibold text-lg transition hover:bg-gray-100 shadow-xl"
              style={{ color: '#16a34a' }}
            >
              Crear mi cuenta gratis
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer id="contacto" style={{ background: '#14532d' }} className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🌿</span>
                  <span className="font-bold text-lg text-white">Thanks For It</span>
                </div>
                <p className="text-sm text-green-200">Tu tiempo vale cultura. Plataforma de beneficios culturales para voluntariado.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-white">Enlaces</h4>
                <ul className="space-y-2 text-sm text-green-200">
                  <li><a href="#actividades" className="hover:text-white transition">Actividades</a></li>
                  <li><a href="#como-funciona" className="hover:text-white transition">Cómo funciona</a></li>
                  <li><a href="#beneficios" className="hover:text-white transition">Beneficios</a></li>
                  <li><a href="#noticias" className="hover:text-white transition">Noticias</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-white">Legal</h4>
                <ul className="space-y-2 text-sm text-green-200">
                  <li><button onClick={() => setPaginaLegal('aviso')} className="hover:text-white transition text-left">Aviso legal</button></li>
                  <li><button onClick={() => setPaginaLegal('privacidad')} className="hover:text-white transition text-left">Política de privacidad</button></li>
                  <li><button onClick={() => setPaginaLegal('cookies')} className="hover:text-white transition text-left">Política de cookies</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-white">Contacto</h4>
                <ul className="space-y-2 text-sm text-green-200">
                  <li>📧 info@voluntariadocultural.es</li>
                  <li>📞 900 123 456</li>
                  <li>📍 Madrid, España</li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t border-green-800 text-center text-sm text-green-400">
              <p>© 2026 Thanks For It. Todos los derechos reservados.</p>
              <div className="flex justify-center gap-4 mt-2">
                <button onClick={() => setPaginaLegal('aviso')} className="hover:text-green-200 transition">Aviso legal</button>
                <span>·</span>
                <button onClick={() => setPaginaLegal('privacidad')} className="hover:text-green-200 transition">Privacidad</button>
                <span>·</span>
                <button onClick={() => setPaginaLegal('cookies')} className="hover:text-green-200 transition">Cookies</button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App

