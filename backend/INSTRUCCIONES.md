# 🎯 INSTRUCCIONES DE INTEGRACIÓN

## ✅ Archivos listos para copiar a tu proyecto existente

He preparado toda la estructura del backend. Ahora solo tienes que copiar estas carpetas y archivos a tu proyecto `PROYECTO WEB`:

---

## 📁 ESTRUCTURA A COPIAR:

```
proyecto-integrado/
├── src/
│   ├── config/
│   │   └── database.ts          ← COPIAR A TU src/config/
│   ├── controllers/
│   │   ├── authController.ts    ← COPIAR A TU src/controllers/
│   │   ├── actividadesController.ts
│   │   └── beneficiosController.ts
│   ├── middleware/
│   │   └── auth.ts              ← COPIAR A TU src/middleware/
│   ├── routes/
│   │   ├── auth.ts              ← COPIAR A TU src/routes/
│   │   ├── actividades.ts
│   │   └── beneficios.ts
│   └── index.ts                 ← COPIAR A TU src/
│
├── package.json                 ← REEMPLAZAR el tuyo
├── tsconfig.json                ← YA LO TIENES (mantén el tuyo)
├── .env.example                 ← COPIAR (nuevo archivo)
├── .gitignore                   ← COPIAR o fusionar con el tuyo
└── README.md                    ← COPIAR o fusionar con el tuyo
```

---

## 🚀 PASO A PASO:

### 1️⃣ Copia las carpetas nuevas a tu `src/`:

En tu `PROYECTO WEB/src/`, crea estas carpetas si no existen y copia los archivos:

- `PROYECTO WEB/src/config/` ← Copia `database.ts`
- `PROYECTO WEB/src/controllers/` ← Copia los 3 archivos
- `PROYECTO WEB/src/middleware/` ← Copia `auth.ts`
- `PROYECTO WEB/src/routes/` ← Copia los 3 archivos
- `PROYECTO WEB/src/index.ts` ← Copia este archivo

### 2️⃣ Copia los archivos de configuración raíz:

- `PROYECTO WEB/package.json` ← **REEMPLAZA** con el nuevo
- `PROYECTO WEB/.env.example` ← **COPIA** (es nuevo)
- `PROYECTO WEB/.gitignore` ← Copia o fusiona
- `PROYECTO WEB/README.md` ← Copia o fusiona

### 3️⃣ Los archivos SQL ya los tienes:

✅ `01_schema.sql`
✅ `02_funciones.sql`
✅ `03_seed_data.sql`
✅ `04_consultas_y_reportes.sql`

**NO TOQUES ESTOS**, ya están bien en tu proyecto.

---

## ⚙️ DESPUÉS DE COPIAR TODO:

### 1. Instala las dependencias:
```bash
npm install
```

### 2. Crea tu archivo `.env`:
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de PostgreSQL:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plataforma_voluntariado
DB_USER=postgres
DB_PASSWORD=tu_password_real
JWT_SECRET=un_secreto_super_seguro
```

### 3. Crea la base de datos (si no lo has hecho):
```bash
createdb plataforma_voluntariado
psql -d plataforma_voluntariado -f 01_schema.sql
psql -d plataforma_voluntariado -f 02_funciones.sql
psql -d plataforma_voluntariado -f 03_seed_data.sql
psql -d plataforma_voluntariado -f 04_consultas_y_reportes.sql
```

### 4. ¡ARRANCA EL SERVIDOR!
```bash
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en puerto 3000
📍 Entorno: development
✅ Conexión a PostgreSQL establecida
```

---

## 🎉 ¡LISTO!

Tu API estará disponible en `http://localhost:3000`

### Prueba que funciona:
```bash
curl http://localhost:3000/health
```

Deberías ver:
```json
{
  "status": "OK",
  "timestamp": "2025-04-10T...",
  "uptime": 1.234
}
```

---

## 🗑️ BORRAR después de integrar:

- ❌ `plataforma-voluntariado-backend.zip` (el ZIP que te di antes)
- ❌ La carpeta `proyecto-integrado/` (es solo para que copies desde aquí)

---

## ❓ Si tienes problemas:

1. **Error de conexión a BD**: Verifica que PostgreSQL esté corriendo y las credenciales en `.env` sean correctas
2. **Error de módulos**: Ejecuta `npm install` de nuevo
3. **Puerto ocupado**: Cambia `PORT=3000` en `.env` por otro (ej: 3001)

---

¡Todo listo para continuar con el desarrollo! 🚀
