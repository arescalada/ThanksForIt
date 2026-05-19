export default function PoliticaPrivacidad() {
  return (
    <div className="p-8 max-w-3xl mx-auto text-gray-700">
      <div className="text-center mb-8">
        <span className="text-5xl">🔒</span>
        <h1 className="text-3xl font-bold mt-3" style={{ color: '#14532d' }}>Política de Privacidad</h1>
        <p className="text-sm text-gray-400 mt-1">Última actualización: enero 2026</p>
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>1. Responsable del tratamiento</h2>
        <ul className="text-sm space-y-1 ml-4">
          <li><strong>Identidad:</strong> Thanks For It S.L.</li>
          <li><strong>CIF:</strong> B-XXXXXXXX</li>
          <li><strong>Dirección:</strong> Calle Ejemplo, 1 — 28001 Madrid</li>
          <li><strong>Email DPO:</strong> privacidad@voluntariadocultural.es</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>2. Datos que recogemos</h2>
        <p className="text-sm leading-relaxed mb-2">Tratamos los siguientes datos personales según el tipo de usuario:</p>
        <ul className="text-sm space-y-1 ml-4 list-disc">
          <li><strong>Voluntarios:</strong> nombre, apellidos, email, contraseña (cifrada), municipio, teléfono, DNI, fecha de nacimiento y dirección (opcionales en perfil).</li>
          <li><strong>Entidades sociales:</strong> nombre de la entidad, email, descripción, municipio y datos de contacto.</li>
          <li><strong>Empresas culturales:</strong> nombre de la empresa, email, descripción y datos de contacto.</li>
          <li><strong>Delegados:</strong> nombre, email, teléfono, DNI, dirección y entidad a la que pertenecen.</li>
          <li><strong>Datos de uso:</strong> horas de voluntariado registradas, actividades inscritas, canjes realizados y mensajes enviados en la plataforma.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>3. Finalidad y base jurídica del tratamiento</h2>
        <div className="text-sm space-y-3">
          <div>
            <p className="font-semibold">Gestión de la cuenta de usuario</p>
            <p className="text-gray-500">Base: ejecución de un contrato (art. 6.1.b RGPD). Necesario para registrarse y usar la plataforma.</p>
          </div>
          <div>
            <p className="font-semibold">Registro de actividades y horas de voluntariado</p>
            <p className="text-gray-500">Base: ejecución del servicio contratado. Permite llevar el cómputo de horas y generar códigos de canje.</p>
          </div>
          <div>
            <p className="font-semibold">Comunicaciones del servicio</p>
            <p className="text-gray-500">Base: interés legítimo (art. 6.1.f RGPD). Enviamos notificaciones sobre actividades inscritas, validaciones y mensajes de la plataforma.</p>
          </div>
          <div>
            <p className="font-semibold">Mejora del servicio y análisis estadístico</p>
            <p className="text-gray-500">Base: consentimiento (art. 6.1.a RGPD). Solo si lo aceptas a través del banner de cookies.</p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>4. Conservación de los datos</h2>
        <p className="text-sm leading-relaxed">
          Los datos se conservarán mientras la cuenta permanezca activa. Una vez eliminada la cuenta, los datos
          se suprimirán en un plazo máximo de 30 días, salvo que exista obligación legal de conservarlos
          (p. ej., datos fiscales, que se conservan 5 años).
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>5. Destinatarios y transferencias internacionales</h2>
        <p className="text-sm leading-relaxed">
          No cedemos tus datos a terceros salvo obligación legal. Los proveedores de hosting y servicios técnicos
          pueden acceder a los datos como encargados del tratamiento, bajo contrato de confidencialidad y en el
          marco del RGPD. No realizamos transferencias internacionales fuera del Espacio Económico Europeo.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>6. Tus derechos</h2>
        <p className="text-sm leading-relaxed mb-2">
          Puedes ejercer en cualquier momento los siguientes derechos dirigiéndote a privacidad@voluntariadocultural.es:
        </p>
        <ul className="text-sm space-y-1 ml-4 list-disc">
          <li><strong>Acceso:</strong> obtener confirmación de si tratamos tus datos y una copia de los mismos.</li>
          <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
          <li><strong>Supresión:</strong> solicitar el borrado de tus datos ("derecho al olvido").</li>
          <li><strong>Limitación:</strong> solicitar que suspendamos el tratamiento mientras se resuelve una reclamación.</li>
          <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado y de uso común.</li>
          <li><strong>Oposición:</strong> oponerte al tratamiento basado en interés legítimo.</li>
        </ul>
        <p className="text-sm mt-3 text-gray-500">
          Si consideras que el tratamiento no es conforme al RGPD, tienes derecho a presentar una reclamación
          ante la Agencia Española de Protección de Datos (www.aepd.es).
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-bold mb-2" style={{ color: '#15803d' }}>7. Seguridad</h2>
        <p className="text-sm leading-relaxed">
          Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos: cifrado de contraseñas
          mediante bcrypt, comunicaciones por HTTPS, acceso restringido por roles y copias de seguridad periódicas.
        </p>
      </section>
    </div>
  )
}
