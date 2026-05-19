export default function PoliticaCookies() {
  return (
    <div className="p-8 max-w-3xl mx-auto text-gray-700">
      <div className="text-center mb-8">
        <span className="text-5xl">🍪</span>
        <h1 className="text-3xl font-bold mt-3" style={{ color: '#14532d' }}>Política de Cookies</h1>
        <p className="text-sm text-gray-400 mt-1">Última actualización: enero 2026</p>
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>1. ¿Qué son las cookies?</h2>
        <p className="text-sm leading-relaxed">
          Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web.
          Permiten que el sitio recuerde tus acciones y preferencias durante un período de tiempo, para que no
          tengas que volver a introducirlas cada vez que visites la página.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>2. Cookies que utilizamos</h2>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ background: '#dcfce7' }}>
                <th className="border border-green-200 p-2 text-left font-semibold text-green-800">Nombre</th>
                <th className="border border-green-200 p-2 text-left font-semibold text-green-800">Tipo</th>
                <th className="border border-green-200 p-2 text-left font-semibold text-green-800">Finalidad</th>
                <th className="border border-green-200 p-2 text-left font-semibold text-green-800">Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border border-gray-100 p-2">cookies_decision</td>
                <td className="border border-gray-100 p-2">Técnica</td>
                <td className="border border-gray-100 p-2">Guardar tu decisión sobre el uso de cookies</td>
                <td className="border border-gray-100 p-2">1 año</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-100 p-2">token (sessionStorage)</td>
                <td className="border border-gray-100 p-2">Técnica</td>
                <td className="border border-gray-100 p-2">Mantener la sesión iniciada del usuario</td>
                <td className="border border-gray-100 p-2">Sesión</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>3. Tipos de cookies según su finalidad</h2>
        <div className="text-sm space-y-3">
          <div className="bg-green-50 rounded-xl p-4">
            <p className="font-semibold text-green-800">🔧 Cookies técnicas (necesarias)</p>
            <p className="text-gray-600 mt-1">Son imprescindibles para el funcionamiento del sitio web. Permiten la navegación y el uso de las funciones básicas como mantener la sesión iniciada. No requieren tu consentimiento.</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="font-semibold text-blue-800">📊 Cookies analíticas (opcionales)</p>
            <p className="text-gray-600 mt-1">Nos permiten contar las visitas y fuentes de tráfico para medir y mejorar el rendimiento del sitio. Toda la información es agregada y anónima. Solo se activan si aceptas las cookies.</p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>4. Cómo gestionar o eliminar las cookies</h2>
        <p className="text-sm leading-relaxed mb-3">
          Puedes cambiar tu decisión en cualquier momento eliminando el valor almacenado en tu navegador.
          También puedes configurar tu navegador para bloquear o eliminar cookies:
        </p>
        <ul className="text-sm space-y-1 ml-4 list-disc">
          <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
          <li><strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies</li>
          <li><strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos de sitios web</li>
          <li><strong>Edge:</strong> Configuración → Privacidad, búsqueda y servicios → Cookies</li>
        </ul>
        <p className="text-sm mt-3 text-gray-500">
          Ten en cuenta que deshabilitar las cookies técnicas puede afectar al funcionamiento de la plataforma
          e impedir el inicio de sesión.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>5. Más información</h2>
        <p className="text-sm leading-relaxed">
          Para más información sobre cómo tratamos tus datos consulta nuestra Política de Privacidad, o
          contáctanos en privacidad@voluntariadocultural.es.
        </p>
      </section>
    </div>
  )
}
