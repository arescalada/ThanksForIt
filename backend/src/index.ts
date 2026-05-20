import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import pool from './config/database';
import { initDB } from './initDB';


// Importar rutas
import mensajesRoutes from './routes/mensajes';
import authRoutes from './routes/auth';
import actividadesRoutes from './routes/actividades';
import beneficiosRoutes from './routes/beneficios';
import inscripcionesRoutes from './routes/inscripciones';
import horasRoutes from './routes/horas';
import adminRoutes from './routes/admin';
import voluntariosRoutes from './routes/voluntarios';
import entidadesRoutes from './routes/entidades';
import empresasRoutes from './routes/empresas';
import passwordRoutes from './routes/password';
import delegadosRoutes from './routes/delegados';
// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(helmet()); // Seguridad con headers HTTP
app.use(cors({
  origin: ['http://localhost:5173', 'https://thanks-for-it.vercel.app', /\.vercel\.app$/],
  credentials: true
}));
app.use(morgan('dev')); // Logging de requests
app.use(express.json()); // Parsear JSON
app.use(express.urlencoded({ extended: true })); // Parsear URL-encoded


// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas de la API
app.use('/api/mensajes', mensajesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/actividades', actividadesRoutes);
app.use('/api/beneficios', beneficiosRoutes);
app.use('/api/inscripciones', inscripcionesRoutes);
app.use('/api/horas', horasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voluntarios', voluntariosRoutes);
app.use('/api/entidades', entidadesRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/delegados', delegadosRoutes);

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API de Plataforma de Beneficios Culturales para Voluntariado',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      actividades: '/api/actividades',
      beneficios: '/api/beneficios'
    },
    documentacion: 'Próximamente con Swagger'
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor
const server = app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Verificar conexión a base de datos
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL establecida');
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error);
  }
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    pool.end();
    process.exit(0);
  });
});

export default app;











