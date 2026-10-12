/** Descripción de la API que se muestra en la raíz del servidor. */
export const infoApi = {
  nombre: 'Convive API',
  descripcion: 'Prototipo funcional de la aplicación para la gestión de conjuntos residenciales y propiedad horizontal',
  version: '1.2.0',
  salud: '/health',
  documentacion: 'Ver docs/API.md en el repositorio',
  modulos: {
    autenticacion: '/api/auth',
    administracion: '/api/admin',
    finanzas: ['/api/cuotas', '/api/estado-cuenta', '/api/pagos'],
    reportes: '/api/reportes/:tipo',
    reservas: ['/api/zonas', '/api/reservas'],
    pqrs: '/api/pqrs',
    noticias: ['/api/noticias', '/api/notificaciones'],
    visitantes: '/api/visitas',
    parqueaderos: '/api/parqueaderos',
  },
};
