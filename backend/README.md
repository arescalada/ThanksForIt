# 🎭 Plataforma de Beneficios Culturales para Voluntariado - Backend API

API REST desarrollada con Node.js, Express y TypeScript para gestionar una plataforma de incentivos culturales para voluntarios.

## 🚀 Stack Tecnológico

- **Runtime**: Node.js
- **Framework**: Express.js
- **Lenguaje**: TypeScript
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT (JSON Web Tokens)
- **Seguridad**: Helmet, bcryptjs
- **Logging**: Morgan

## 📋 Requisitos Previos

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm o yarn

## 🛠️ Instalación

### 1. Clonar el repositorio e instalar dependencias

```bash
cd plataforma-voluntariado-backend
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura tus valores:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de PostgreSQL:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=plataforma_voluntariado
DB_USER=postgres
DB_PASSWORD=tu_password_real

JWT_SECRET=genera_un_secreto_seguro_aqui
JWT_EXPIRES_IN=7d
```

### 3. Crear la base de datos

```bash
# Crear la base de datos
createdb plataforma_voluntariado

# Ejecutar migrations (scripts SQL)
psql -d plataforma_voluntariado -f ../01_schema.sql
psql -d plataforma_voluntariado -f ../02_funciones.sql
psql -d plataforma_voluntariado -f ../03_seed_data.sql
psql -d plataforma_voluntariado -f ../04_consultas_y_reportes.sql
```

### 4. Iniciar el servidor

**Desarrollo (con hot-reload):**
```bash
npm run dev
```

**Producción:**
```bash
npm run build
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📚 Endpoints Principales

### Autenticación

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil (requiere token)

### Actividades

- `GET /api/actividades` - Listar actividades (público)
- `GET /api/actividades/:id` - Ver detalle de actividad
- `POST /api/actividades` - Crear actividad (entidades)
- `PUT /api/actividades/:id` - Actualizar actividad (entidades)
- `DELETE /api/actividades/:id` - Eliminar actividad (entidades)

### Beneficios

- `GET /api/beneficios` - Listar beneficios culturales
- `POST /api/beneficios` - Crear beneficio (empresas culturales)
- `POST /api/beneficios/canje` - Generar código de canje (voluntarios)
- `POST /api/beneficios/validar-canje` - Validar código (empresas)
- `POST /api/beneficios/usar-canje` - Marcar como usado (empresas)
- `GET /api/beneficios/mis-canjes` - Historial de canjes (voluntarios)

## 🔐 Autenticación

La API usa JWT para autenticación. Incluye el token en el header:

```
Authorization: Bearer <tu_token_jwt>
```

### Ejemplo de login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@plataforma.com",
    "password": "Admin123!"
  }'
```

Respuesta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "email": "admin@plataforma.com",
    "tipo_usuario": "admin",
    "nombre_completo": "Administrador Sistema"
  }
}
```

## 👥 Tipos de Usuario

1. **admin** - Administrador de la plataforma
2. **entidad_social** - ONGs, fundaciones, asociaciones
3. **voluntario** - Personas que realizan voluntariado
4. **empresa_cultural** - Empresas que ofrecen beneficios

## 🧪 Datos de Prueba

Después de ejecutar `03_seed_data.sql`, tendrás usuarios de ejemplo:

| Email | Password | Tipo |
|-------|----------|------|
| admin@plataforma.com | Admin123! | admin |
| contacto@cruzroja.org | Cruz123! | entidad_social |
| ana.garcia@email.com | Voluntario123! | voluntario |
| contacto@museonacional.com | Museo123! | empresa_cultural |

## 📁 Estructura del Proyecto

```
plataforma-voluntariado-backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Configuración PostgreSQL
│   ├── controllers/
│   │   ├── authController.ts    # Lógica de autenticación
│   │   ├── actividadesController.ts
│   │   └── beneficiosController.ts
│   ├── middleware/
│   │   └── auth.ts              # Middleware JWT
│   ├── routes/
│   │   ├── auth.ts              # Rutas de autenticación
│   │   ├── actividades.ts       # Rutas de actividades
│   │   └── beneficios.ts        # Rutas de beneficios
│   └── index.ts                 # Punto de entrada
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔧 Scripts Disponibles

- `npm run dev` - Desarrollo con hot-reload
- `npm run build` - Compilar TypeScript a JavaScript
- `npm start` - Ejecutar versión compilada
- `npm run db:migrate` - Ejecutar migraciones de BD
- `npm run db:seed` - Cargar datos de ejemplo

## 🛡️ Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ JWT para autenticación stateless
- ✅ Helmet para headers de seguridad
- ✅ CORS configurado
- ✅ Validación de permisos por rol
- ✅ Sanitización de inputs (express-validator)

## 🚧 Próximas Mejoras

- [ ] Documentación Swagger/OpenAPI
- [ ] Rate limiting
- [ ] Subida de archivos (multer)
- [ ] Envío de emails (nodemailer)
- [ ] Tests unitarios y de integración
- [ ] Docker + docker-compose
- [ ] CI/CD pipeline

## 📞 Soporte

Para dudas o problemas, contacta con el equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: Abril 2025
