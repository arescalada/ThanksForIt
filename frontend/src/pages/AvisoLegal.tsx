export default function AvisoLegal() {
  return (
    <div className="p-8 max-w-3xl mx-auto text-gray-700">
      <div className="text-center mb-8">
        <span className="text-5xl">⚖️</span>
        <h1 className="text-3xl font-bold mt-3" style={{ color: '#14532d' }}>Aviso Legal</h1>
        <p className="text-sm text-gray-400 mt-1">Última actualización: enero 2026</p>
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>1. Titular del sitio web</h2>
        <p className="text-sm leading-relaxed">
          En cumplimiento con el deber de información recogido en el artículo 10 de la Ley 34/2002, de 11 de julio,
          de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), se facilitan los
          siguientes datos del titular del sitio web:
        </p>
        <ul className="text-sm mt-3 space-y-1 ml-4">
          <li><strong>Denominación social:</strong> Thanks For It S.L.</li>
          <li><strong>CIF:</strong> B-XXXXXXXX</li>
          <li><strong>Domicilio social:</strong> Calle Ejemplo, 1 — 28001 Madrid, España</li>
          <li><strong>Email:</strong> info@voluntariadocultural.es</li>
          <li><strong>Teléfono:</strong> 900 123 456</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>2. Objeto y ámbito de aplicación</h2>
        <p className="text-sm leading-relaxed">
          El presente Aviso Legal regula el acceso y uso de la plataforma web Thanks For It, cuya finalidad es
          poner en contacto a voluntarios con entidades sociales que organizan actividades de voluntariado, y
          permitir el canje de horas de voluntariado por beneficios culturales ofrecidos por empresas colaboradoras.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>3. Condiciones de uso</h2>
        <p className="text-sm leading-relaxed">
          El acceso y uso de este sitio web implica la aceptación plena y sin reservas de las presentes condiciones.
          El usuario se compromete a hacer un uso adecuado de los contenidos y servicios ofrecidos, y en particular
          se obliga a no utilizarlos para fines ilícitos, lesivos o contrarios a la buena fe.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>4. Propiedad intelectual e industrial</h2>
        <p className="text-sm leading-relaxed">
          Todos los contenidos del sitio web (textos, imágenes, logotipos, código fuente, diseño gráfico) son
          propiedad de Thanks For It S.L. o de sus licenciantes, y están protegidos por la legislación española
          e internacional sobre propiedad intelectual e industrial. Queda expresamente prohibida su reproducción,
          distribución o comunicación pública sin autorización previa y por escrito.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>5. Responsabilidad</h2>
        <p className="text-sm leading-relaxed">
          Thanks For It S.L. no se hace responsable de los daños o perjuicios que pudieran derivarse del uso
          del sitio web, de la falta de disponibilidad del mismo, ni de la veracidad de los contenidos publicados
          por terceros (entidades, empresas o voluntarios). La plataforma actúa como intermediario técnico y no
          valida previamente la información introducida por los usuarios.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>6. Legislación aplicable y jurisdicción</h2>
        <p className="text-sm leading-relaxed">
          El presente Aviso Legal se rige por la legislación española vigente. Para la resolución de cualquier
          controversia derivada del acceso o uso de este sitio web, las partes se someten a los Juzgados y
          Tribunales de Madrid, con renuncia expresa a cualquier otro fuero que pudiera corresponderles.
        </p>
      </section>
    </div>
  )
}
