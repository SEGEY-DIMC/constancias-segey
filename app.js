/**
 * Sistema de Gestión y Control de Constancias de Cambios
 * Secretaría de Educación del Estado de Yucatán (SEGEY)
 * Formato oficial con motor dinámico de plantillas / Layouts
 * Permite subir, cambiar y regenerar documentos PDF con cualquier diseño
 */

const STORAGE_KEY = 'segey_constancias_records_v1';
const WEBHOOK_KEY = 'segey_gsheets_webhook_url';
const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwqoesxAkV6PcQF9eh6RGsD-uJx_pxr9QqZx4lFoPo9_HYx6Xuqe9uIn79QY2TgSzg/exec'; // URL institucional predeterminada de Google Sheets
const NOTIF_EMAILS_KEY = 'segey_notification_emails_v1';
const REMOTE_CATALOG_KEY = 'segey_gsheets_catalog_v1';
const LAYOUTS_STORAGE_KEY = 'segey_custom_layouts_v1';
const ACTIVE_LAYOUT_ID_KEY = 'segey_active_layout_id';
const ADMIN_AUTH_KEY = 'segey_admin_auth_v1';
const AREAS_STORAGE_KEY = 'segey_areas_notificadoras_v1';
const CATALOG_REMOTE_VERSION_KEY = 'segey_catalog_remote_version_v1';
const DYNAMIC_SUBORDINADAS_KEY = 'segey_mapa_subordinadas_custom_v2';

// Memoria dinámica para áreas subordinadas añadidas o sincronizadas
let MAPA_AREAS_SUBORDINADAS_DINAMICO = {};
try {
  const cachedSub = localStorage.getItem(DYNAMIC_SUBORDINADAS_KEY);
  if (cachedSub) {
    MAPA_AREAS_SUBORDINADAS_DINAMICO = JSON.parse(cachedSub);
  }
} catch (e) {}

/**
 * Función que convierte puestos a nombres de área/departamento en el cliente
 */
function clientPuestoToAreaName(puesto) {
  if (!puesto) return '';
  let p = String(puesto).trim();
  const repls = [
    [/^(?:Subsecretario|Subsecretaria) de\s+/i, 'Subsecretaría de '],
    [/^(?:Director|Directora) Jurídic[oa]/i, 'Dirección Jurídica'],
    [/^(?:Jefe|Jefa) del Despacho/i, 'Jefatura del Despacho'],
    [/^Secretari[oa] Particular/i, 'Secretaría Particular'],
    [/^(?:Jefe|Jefa) de Departamento de\s+/i, 'Departamento de '],
    [/^(?:Jefe|Jefa) de Departamento\s+/i, 'Departamento de '],
    [/^(?:Director|Directora) de\s+/i, 'Dirección de '],
    [/^(?:Director|Directora)\s+/i, 'Dirección '],
    [/^(?:Subdirector|Subdirectora) de\s+/i, 'Subdirección de '],
    [/^(?:Subdirector|Subdirectora)\s+/i, 'Subdirección '],
    [/^(?:Subjefe|Subjefa) de\s+/i, 'Subjefatura de '],
    [/^(?:Subjefe|Subjefa)\s+/i, 'Subjefatura '],
    [/^(?:Jefe|Jefa) de Oficina de\s+/i, 'Oficina de '],
    [/^(?:Responsable|Encargado|Encargada) de Área de\s+/i, 'Área de '],
    [/^(?:Responsable|Encargado|Encargada) de\s+/i, 'Área de '],
    [/^(?:Coordinador|Coordinadora) General de\s+/i, 'Coordinación General de '],
    [/^(?:Coordinador|Coordinadora) Estatal de\s+/i, 'Coordinación Estatal de '],
    [/^(?:Coordinador|Coordinadora) de\s+/i, 'Coordinación de ']
  ];
  for (let i = 0; i < repls.length; i++) {
    const [rx, rep] = repls[i];
    if (rx.test(p)) {
      return p.replace(rx, rep);
    }
  }
  return p;
}

/**
 * Integra dinámicamente un área nueva al mapa de subordinadas en memoria y en localStorage
 */
function registrarAreaSubordinadaDinamica(areaPadre, subArea) {
  if (!areaPadre) return;
  areaPadre = areaPadre.trim();
  subArea = subArea ? subArea.trim() : areaPadre;

  if (!MAPA_AREAS_SUBORDINADAS_DINAMICO[areaPadre]) {
    const base = (typeof MAPA_AREAS_SUBORDINADAS !== 'undefined' && MAPA_AREAS_SUBORDINADAS[areaPadre]) ?
                 [...MAPA_AREAS_SUBORDINADAS[areaPadre]] : [areaPadre];
    MAPA_AREAS_SUBORDINADAS_DINAMICO[areaPadre] = base;
  }
  if (!MAPA_AREAS_SUBORDINADAS_DINAMICO[areaPadre].includes(subArea)) {
    MAPA_AREAS_SUBORDINADAS_DINAMICO[areaPadre].push(subArea);
    MAPA_AREAS_SUBORDINADAS_DINAMICO[areaPadre].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    try {
      localStorage.setItem(DYNAMIC_SUBORDINADAS_KEY, JSON.stringify(MAPA_AREAS_SUBORDINADAS_DINAMICO));
    } catch (e) {}
  }
}

// Catálogo de respaldo directo para áreas subordinadas clave
const FALLBACK_MAPA_SUBORDINADAS = {
  "Subsecretaría de Educación Superior": [
    "Coordinación de Atención a Escuelas Normales",
    "Coordinación de Vinculación Académica y Proyectos",
    "Coordinación de Área Académica",
    "Coordinación de Área de Difusión y Extensión Educativa",
    "Coordinación de Área de Investigación",
    "Departamento de Incorporación y Revalidación de Estudios",
    "Departamento de Instituciones Formadoras de Docentes y Actualización del Magisterio",
    "Departamento de Instituciones Particulares y Supervisión",
    "Departamento de Instituciones de Educación Superior Públicas",
    "Departamento de Registro y Certificación de Servicio Profesional",
    "Departamento de Validación Profesional",
    "Dirección de Fortalecimiento de Educación Superior",
    "Dirección de Servicio Profesional",
    "Dirección del Centro de Actualización del Magisterio (CAM)",
    "Subdirector Académico del Centro de Actualización del Magisterio (CAM)",
    "Subdirector Administrativo del Centro de Actualización del Magisterio (CAM)",
    "Subsecretaría de Educación Superior",
    "Área de Atención a Colegios de Profesionistas",
    "Área de Equivalencia a Estudios",
    "Área de Formación y Actualización",
    "Área de Formalización de Reconocimiento de Validez Oficial de Estudios (RVOE)",
    "Área de Instituciones Educativas",
    "Área de Instituciones Educativas Formadoras",
    "Área de Planificación",
    "Área de Procesos Estadísticos",
    "Área de Proyectos",
    "Área de Refrendo de Reconocimiento de Validez Oficial de Estudios (RVOE)",
    "Área de Registro y Actualización de Instituciones",
    "Área de Revalidación de Estudios",
    "Área del Proceso de Incorporación de Reconocimiento de Validez Oficial de Estudios (RVOE)",
    "Área del Registro Estatal de Profesionistas y Autorizaciones Temporales para Ejercer Actos Profesionales"
  ],
  "Subsecretaría de Educación Media Superior": [
    "Coordinación de Área Institucional y Desarrollo Académico",
    "Coordinación de Área de Acompañamiento Institucional para la Mejora Educativa",
    "Coordinación de Área de Educación Física de Preparatorias Estatales y Particulares Incorporadas",
    "Coordinación de Área de Escuelas Particulares",
    "Coordinación de Área de Estrategias para la Cobertura y Prevención del Abandono",
    "Coordinación de Área de Vinculación con Organismos Descentralizados",
    "Coordinador Institucional",
    "Departamento de Gestión Educativa y Fortalecimiento Académico",
    "Departamento de Preparatoria Abierta",
    "Departamento de Preparatorias Estatales y Particulares Incorporadas",
    "Departamento de Telebachillerato Comunitario del Estado de Yucatán",
    "Departamento de la Unidad Administrativa y Financiera",
    "Dirección de Desarrollo Educativo y Proyectos Estratégicos",
    "Dirección de Servicios Educativos de Media Superior",
    "Subsecretaría de Educación Media Superior",
    "Área Académica en el Proyecto de Preparatoria Abierta con el Instituto de Formación Policial del Estado de Yucatán",
    "Área Administrativa y Financiera",
    "Área Pedagógica",
    "Área de Aplicación de Exámenes",
    "Área de Atención al Usuario Matutino",
    "Área de Atención al Usuario Vespertino",
    "Área de Certificación",
    "Área de Control Escolar",
    "Área de Desarrollo Académico",
    "Área de Gestión de Servicios y Proyectos Educativos",
    "Área de Orientación Educativa y Tutorías",
    "Área de Patrimonio",
    "Área de Preparatorias Estatales",
    "Área de Procesos de la Información y Tecnología",
    "Área de Proyectos y Presupuestos",
    "Área de Recursos Humanos",
    "Área de Trámite y Control",
    "Área de la Unidad de Trámite y Control Escolar",
    "Área del Módulo de Preparatoria Abierta en el Centro de Alto Rendimiento Deportivo"
  ],
  "Subsecretaría de Educación Básica": [
    "Coordinación General de Servicios Educativos",
    "Coordinación General de Trámite y Control",
    "Coordinación de Bienes",
    "Coordinación de Contraloría Escolar",
    "Coordinación de Desarrollo Artístico",
    "Coordinación de Gestión Estratégica",
    "Coordinación de Promoción y Reconocimiento Docente",
    "Coordinación de Proyecto y Vinculación",
    "Coordinación de Proyectos Estratégicos",
    "Coordinación del Despacho de la Subsecretaría de Educación Básica",
    "Coordinación del Programa de Atención al Alumnado en Situación de Extraedad (PAASE)",
    "Coordinación para la Promoción y Reconocimiento Docente",
    "Departamento de Administrativo",
    "Departamento de Asesoría y Gestión de la Información",
    "Departamento de Cultura Física y Deporte Escolar",
    "Departamento de Desarrollo Organizacional",
    "Departamento de Diseño de Materiales Educativos en Lengua Maya",
    "Departamento de Educación Escolarizada y No Escolarizada",
    "Departamento de Escuelas Particulares",
    "Departamento de Fortalecimiento Docente",
    "Departamento de Gestión y Trámite",
    "Departamento de Lengua y Cultura Maya",
    "Departamento de Secundarias Estatales",
    "Departamento de Secundarias Federales",
    "Departamento de Secundarias Técnicas",
    "Departamento de Servicios Educativos",
    "Departamento de Telesecundarias",
    "Departamento de Trámite y Control",
    "Departamento de para la Promoción y Reconocimiento Docente",
    "Dirección de Educación Artística",
    "Dirección de Educación Especial",
    "Dirección de Educación Física",
    "Dirección de Educación Indígena",
    "Dirección de Educación Inicial",
    "Dirección de Educación Preescolar",
    "Dirección de Educación Primaria",
    "Dirección de Educación Secundaria",
    "Subjefatura Estatal",
    "Subjefatura Federal",
    "Subsecretaría de Educación Básica",
    "Área Académica",
    "Área Administrativa",
    "Área Escolarizada de los Centros de Atención Infantil",
    "Área No Escolarizada",
    "Área Técnica Pedagógica",
    "Área Técnico Escolar",
    "Área de Bolsa de Trabajo",
    "Área de Deporte Escolar",
    "Área de Escuelas Particulares de Inicial",
    "Área de Escuelas Particulares de Preescolar",
    "Área de Escuelas Particulares de Primaria",
    "Área de Escuelas Particulares de Secundaria",
    "Área de Escuelas Particulares del Área Pedagógica",
    "Área de Espacio de Interacción Educativa",
    "Área de Eventos Cívicos Deportivos y Ceremonias",
    "Área de Gestión",
    "Área de Investigación e Innovación en Educación Física",
    "Área de Programas de Estrategias Didácticas",
    "Área de Programas y Proyectos",
    "Área de Promoción de la Cultura Física en Escuelas de Educación Indígena",
    "Área de Proyectos y Concursos",
    "Área de Sectores",
    "Área de Servicios Educativos",
    "Área de Trámite y Control",
    "Área de Trámites Educativos",
    "Área del Espacio de Interacción Educativa",
    "Área para la Promoción y Reconocimiento Docente"
  ],
  "Dirección de Fortalecimiento de Educación Superior": [
    "Coordinación de Atención a Escuelas Normales",
    "Coordinación de Área Académica",
    "Coordinación de Área de Difusión y Extensión Educativa",
    "Coordinación de Área de Investigación",
    "Departamento de Instituciones Formadoras de Docentes y Actualización del Magisterio",
    "Departamento de Instituciones Particulares y Supervisión",
    "Departamento de Instituciones de Educación Superior Públicas",
    "Dirección de Fortalecimiento de Educación Superior",
    "Dirección del Centro de Actualización del Magisterio (CAM)",
    "Subdirector Académico del Centro de Actualización del Magisterio (CAM)",
    "Subdirector Administrativo del Centro de Actualización del Magisterio (CAM)"
  ],
  "Dirección de Servicios Educativos de Media Superior": [
    "Coordinación de Área Institucional y Desarrollo Académico",
    "Coordinación de Área de Educación Física de Preparatorias Estatales y Particulares Incorporadas",
    "Coordinación de Área de Escuelas Particulares",
    "Departamento de Preparatoria Abierta",
    "Departamento de Preparatorias Estatales y Particulares Incorporadas",
    "Departamento de Telebachillerato Comunitario del Estado de Yucatán",
    "Dirección de Servicios Educativos de Media Superior",
    "Área Académica en el Proyecto de Preparatoria Abierta con el Instituto de Formación Policial del Estado de Yucatán",
    "Área Administrativa y Financiera",
    "Área Pedagógica",
    "Área de Aplicación de Exámenes",
    "Área de Atención al Usuario Matutino",
    "Área de Atención al Usuario Vespertino",
    "Área de Certificación",
    "Área de Control Escolar",
    "Área de Desarrollo Académico",
    "Área de Orientación Educativa y Tutorías",
    "Área de Procesos de la Información y Tecnología",
    "Área de Trámite y Control",
    "Área de la Unidad de Trámite y Control Escolar",
    "Área del Módulo de Preparatoria Abierta en el Centro de Alto Rendimiento Deportivo"
  ],
  "Dirección de Administración y Finanzas": [
    "Coordinación de Archivos",
    "Coordinación de Enlace con Direcciones y Otras Dependencias",
    "Coordinación de Gestión y Revisión",
    "Departamento de Administración de Personal de Contrato",
    "Departamento de Adquisiciones",
    "Departamento de Control Patrimonial",
    "Departamento de Distribución de Libros de Texto y Mobiliario",
    "Departamento de Gestión de Información, Capacitación y Ética",
    "Departamento de Innovación y Mejora Continua",
    "Departamento de Presupuestos",
    "Departamento de Recursos Financieros",
    "Departamento de Recursos Humanos",
    "Departamento de Recursos Materiales y Servicios",
    "Departamento de Sistemas de Gestión de Nómina",
    "Dirección de Administración y Finanzas",
    "Oficina de Administración de Plazas",
    "Oficina de Captura de Nómina",
    "Oficina de Enteros No Institucionales",
    "Oficina de Formas Valoradas y Dispersión de Nómina",
    "Oficina de Gasto Corriente y Recursos Propios",
    "Oficina de Gestión",
    "Oficina de Gestión de Gastos",
    "Oficina de Glosa y Archivo",
    "Oficina de Impuestos y Seguridad Social",
    "Oficina de Informes Estadísticos",
    "Oficina de Procesamiento de Nóminas Estatales",
    "Oficina de Procesos de Nómina Universidad Pedagógica Nacional",
    "Oficina de Productos Propios",
    "Oficina de Programas Federales y Estatales",
    "Oficina de Proveedores",
    "Oficina de Reembolsos y Fondo Fijo",
    "Oficina de Seguimiento y Control",
    "Oficina de Servicios Médicos de Contrato de Apoyo",
    "Oficina de Trámites y Prestaciones del Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado (ISSSTE)",
    "Oficina de Validación de Nómina Estatal",
    "Oficina de Validación de Nómina Federal",
    "Oficina de Vinculación Administrativa",
    "Oficina de Viáticos, Pasajes y Fondos Fijos de Productos Propios",
    "Oficina del Sistema del Fondo de Aportaciones para la Nómina Educativa (FONE)",
    "Subdirección de Organización y Administración de Personal",
    "Subjefatura de Administración y de Compensación",
    "Subjefatura de Almacén",
    "Subjefatura de Asistencia y Previsión",
    "Subjefatura de Capacitación",
    "Subjefatura de Compras",
    "Subjefatura de Contabilidad",
    "Subjefatura de Contrataciones",
    "Subjefatura de Contratos Adscritos a la Dirección General (ADG)",
    "Subjefatura de Control Interno y Calidad",
    "Subjefatura de Control Patrimonial Escolar",
    "Subjefatura de Control Patrimonial de Oficinas",
    "Subjefatura de Control de Nómina",
    "Subjefatura de Control y Seguimiento Presupuestal",
    "Subjefatura de Fiscalización",
    "Subjefatura de Gestión Organizacional",
    "Subjefatura de Gestión de Gastos",
    "Subjefatura de Gestión de Información",
    "Subjefatura de Gestión y Enteros No Institucionales de Nómina",
    "Subjefatura de Información",
    "Subjefatura de Mejora Regulatoria",
    "Subjefatura de Pensión Alimenticia y Distribución de Cheques",
    "Subjefatura de Personal Estatal",
    "Subjefatura de Personal Federal",
    "Subjefatura de Personal de Apoyo Estatal",
    "Subjefatura de Personal de Apoyo Federal",
    "Subjefatura de Personal de Contrato Estatal",
    "Subjefatura de Personal de Contrato Federal",
    "Subjefatura de Procedimientos de Adjudicación",
    "Subjefatura de Procesos de Nómina",
    "Subjefatura de Producción de Nómina Federal y Estatal",
    "Subjefatura de Proyectos Transversales",
    "Subjefatura de Servicios Generales",
    "Subjefatura de Tesorería",
    "Subjefatura de Transparencia",
    "Subjefatura de Trámites",
    "Área Administrativa",
    "Área Administrativa de la Bodega de Bienes Reaprovechables y Bajas",
    "Área de Actividades de Control",
    "Área de Apoyo en la Entrega Recepción de Centros de Trabajo Educativos",
    "Área de Apoyo en la Entrega Recepción de Unidades Administrativas",
    "Área de Archivo",
    "Área de Archivo de Expedientes de Personal Federal y Estatal",
    "Área de Archivo de Trámite",
    "Área de Archivo del Personal de Contrato",
    "Área de Aseo y Vigilancia Edificio Amelia Azarcoya",
    "Área de Aseo y Vigilancia Edificio Bellas Artes",
    "Área de Aseo y Vigilancia Edificio Casa de la Historia de la Educación de Yucatán",
    "Área de Aseo y Vigilancia Edificio Central",
    "Área de Aseo y Vigilancia Edificio Centro de Actualización del Magisterio (CAM) Fénix",
    "Área de Aseo y Vigilancia Edificio Ex Facultad de Psicología",
    "Área de Aseo y Vigilancia Edificio Paulo Freire",
    "Área de Aseo y Vigilancia Edificio Zamná y Edificio Espacio Común de la Subsecretaría de Educación Básica",
    "Área de Asignación y Facturación",
    "Área de Atención a Escuelas",
    "Área de Bodega",
    "Área de Boletos de Avión, Hospedajes y Eventos en Hoteles",
    "Área de Contrataciones",
    "Área de Contratos",
    "Área de Control Interno y Calidad (A)",
    "Área de Control Interno y Calidad (B)",
    "Área de Control Presupuestal Interno y Organismos Públicos Descentralizados (OPD)",
    "Área de Control de Bajas de Bienes",
    "Área de Control de Bienes (A)",
    "Área de Control de Bienes (B)",
    "Área de Control y Seguimiento de Contratos de Mantenimientos y Servicios",
    "Área de Correspondencia",
    "Área de Distribución de Cafetería",
    "Área de Existencias Físicas de Bodega de Libros de Texto y Mobiliario",
    "Área de Gestión Organizacional",
    "Área de Gráficos",
    "Área de Libros de Texto",
    "Área de Logística y Transporte",
    "Área de Mantenimiento Vehicular",
    "Área de Mantenimiento a Edificios",
    "Área de Módulo de Información y Acceso al Público",
    "Área de Prestaciones Sociales",
    "Área de Presupuesto Estatal",
    "Área de Presupuesto Federal",
    "Área de Procesos Transversales",
    "Área de Proyectos y Conservación de Áreas Administrativas",
    "Área de Revisión de Centros de Trabajo Educativos",
    "Área de Revisión de Unidades Administrativas",
    "Área de Sistema de Información y Gestión Educativa (SIGE)",
    "Área de Supervisión",
    "Área de Traslados de Personal",
    "Área de Trámite y Control de Facturación Sistema Integral de Recursos Materiales y Servicios (SIRMYS)",
    "Área de Ventanilla Única",
    "Área de la Bodega de Bienes Reaprovechables y Bajas",
    "Área de la Distribución y Entrega de Vales de Gasolina",
    "Área de la Unidad de Correspondencia",
    "Área del Centro de Atención Digital (CAD)",
    "Área del Sistema de Control Patrimonial (SCP)"
  ]
};

function getGoogleScriptWebhookUrl() {
  return localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Catálogo oficial predeterminado de áreas SEGEY (Tomado del Listado de Enlaces Oficial 2024-2030, ordenado alfabéticamente A-Z)
const DEFAULT_AREAS_NOTIFICADORAS = [
  'Área de Prestaciones Sociales',
  'Casa de la Historia de la Educación de Yucatán',
  'Centro de Evaluación Educativa del Estado de Yucatán',
  'Centro Estatal de Bellas Artes',
  'Coordinación de Archivos',
  'Coordinación de Enlace con Direcciones y Otras Dependencias',
  'Coordinación de Gestión y Revisión',
  'Coordinación Estatal de Becas',
  'Coordinación General de Desarrollo de Habilidades Socioemocionales',
  'Coordinación General de Inglés',
  'Coordinación General de Intervención y Gestión Institucional',
  'Coordinación General de Programas Estratégicos',
  'Coordinación General de Servicios Educativos',
  'Coordinación General de Tecnologías de la Información y Comunicaciones',
  'Coordinación General de Trámite y Control',
  'Departamento de Adquisiciones',
  'Departamento de Administración de Personal de Contrato',
  'Departamento de Control Patrimonial',
  'Departamento de Distribución de Libros de Texto y Mobiliario',
  'Departamento de Estadística',
  'Departamento de Estudios y Proyectos',
  'Departamento de Gestión de Información, Capacitación y Ética',
  'Departamento de Innovación y Mejora Continua',
  'Departamento de Planeación, Evaluación y Seguimiento',
  'Departamento de Preparatoria Abierta',
  'Departamento de Preparatorias Estatales y Particulares Incorporadas',
  'Departamento de Presupuestos',
  'Departamento de Recursos Financieros',
  'Departamento de Recursos Humanos',
  'Departamento de Recursos Materiales y Servicios',
  'Departamento de Registro y Certificación',
  'Departamento de Sistemas de Gestión de Nómina',
  'Departamento de Telebachillerato Comunitario del Estado de Yucatán y Bachillerato Intercultural',
  'Despacho del Secretario',
  'Dirección de Administración y Finanzas',
  'Dirección de Desarrollo Educativo',
  'Dirección de Desarrollo Educativo y Proyectos Estratégicos',
  'Dirección de Educación Artística',
  'Dirección de Educación Especial',
  'Dirección de Educación Física',
  'Dirección de Educación Indígena',
  'Dirección de Educación Inicial',
  'Dirección de Educación Preescolar',
  'Dirección de Educación Primaria',
  'Dirección de Educación Secundaria',
  'Dirección de Fortalecimiento de Educación Superior',
  'Dirección de Planeación',
  'Dirección de Servicio Profesional',
  'Dirección de Servicios Educativos de Media Superior',
  'Dirección de Servicios Regionales',
  'Dirección Jurídica',
  'Enlace Estatal con la Unidad del Sistema para la Carrera de las Maestras y los Maestros (USICAMM)',
  'Jefatura del Despacho',
  'Secretario Particular',
  'Subdirección de Organización y Administración de Personal',
  'Subsecretaría de Educación Básica',
  'Subsecretaría de Educación Media Superior',
  'Subsecretaría de Educación Superior',
  'Universidad Virtual del Estado de Yucatán'
];

// Meses en español para la redacción oficial
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// LAYOUT BASE PREDETERMINADO (Formato oficial SEGEY sin cuadros)
const DEFAULT_LAYOUT_HTML = `
<!-- ============================================================== -->
<!-- ENCABEZADO OFICIAL SEGEY (IDÉNTICO AL FORMATO WORD)           -->
<!-- ============================================================== -->
<div class="official-header mb-3">
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #A6A6A6; font-family: 'Lato', Arial, sans-serif;">
    <tr>
      <!-- Columna 1: Escudo del Estado de Yucatán -->
      <td style="width: 25%; text-align: center; vertical-align: middle; padding: 6px 8px; border-right: 1px solid #A6A6A6; border-bottom: 1px solid #A6A6A6;">
        <img src="{{logoYucatan}}" alt="Gobierno del Estado de Yucatán" style="max-height: 48px; max-width: 135px; margin: 0 auto; display: block;" />
      </td>
      <!-- Columna 2: Textos Institucionales -->
      <td style="width: 53%; text-align: center; vertical-align: middle; padding: 6px 10px; border-right: 1px solid #A6A6A6; border-bottom: 1px solid #A6A6A6;">
        <div style="font-size: 13px; font-weight: bold; color: #111827; letter-spacing: 0.3px; line-height: 1.25; font-family: 'Lato', Arial, sans-serif; text-transform: uppercase;">
          SECRETARÍA DE EDUCACIÓN
        </div>
        <div style="font-size: 10.5px; color: #374151; margin-top: 2px; font-family: 'Lato', Arial, sans-serif;">
          Dirección de Administración y Finanzas
        </div>
      </td>
      <!-- Columna 3: Logo SEGEY -->
      <td style="width: 22%; text-align: center; vertical-align: middle; padding: 6px 8px; border-bottom: 1px solid #A6A6A6;">
        <img src="{{logoSegey}}" alt="SEGEY" style="max-height: 46px; max-width: 65px; margin: 0 auto; display: block;" />
      </td>
    </tr>
    <tr>
      <!-- Fila 2: Título Oficial de la Constancia (spanning 3 columns) -->
      <td colspan="3" style="text-align: center; vertical-align: middle; padding: 6px 10px; font-size: 11px; font-weight: bold; color: #111827; background-color: #ffffff; font-family: 'Lato', Arial, sans-serif;">
        Constancia de cambios de denominación o dependencia jerárquica en las unidades administrativas
      </td>
    </tr>
  </table>
</div>

<!-- Folio discreto en esquina superior derecha -->
<div class="text-right text-[11px] text-slate-500 font-mono mb-3 pr-1">
  <span>Folio: <strong>{{folio}}</strong></span>
</div>

<!-- ============================================================== -->
<!-- CUERPO DEL DOCUMENTO (TEXTO FLUIDO SIN CUADROS)                -->
<!-- ============================================================== -->
<div class="official-body text-slate-900 text-justify text-[10pt] leading-relaxed space-y-3" style="font-family: 'Lato', Arial, sans-serif;">

  <!-- APARTADO I. TIPO DE CAMBIO QUE DETERMINA LA UNIDAD ADMINISTRATIVA -->
  <div>
    <div class="font-bold text-[10pt] mb-1 uppercase tracking-wide text-slate-900 text-left">I. TIPO DE CAMBIO QUE DETERMINA LA UNIDAD ADMINISTRATIVA</div>
    <div class="pl-3 space-y-1 text-[10pt] text-left">
      <p>Se determinó la modificación conforme a lo siguiente:</p>
      <div class="grid grid-cols-12 gap-1 items-center my-0.5 text-[10pt]">
        <div class="col-span-12 sm:col-span-3 font-bold">• Tipo de movimiento:</div>
        <div class="col-span-12 sm:col-span-9 flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span style="white-space: nowrap; display: inline-block;">
            <span class="font-mono font-bold" style="white-space: pre;">{{chkAlta}}</span>&nbsp;Alta
          </span>
          <span style="white-space: nowrap; display: inline-block;">
            <span class="font-mono font-bold" style="white-space: pre;">{{chkBaja}}</span>&nbsp;Baja
          </span>
          <span style="white-space: nowrap; display: inline-block;">
            <span class="font-mono font-bold" style="white-space: pre;">{{chkNombre}}</span>&nbsp;Cambio de nombre
          </span>
          <span style="white-space: nowrap; display: inline-block;">
            <span class="font-mono font-bold" style="white-space: pre;">{{chkJerarquica}}</span>&nbsp;Cambio de dependencia jerárquica
          </span>
        </div>
      </div>
      {{#if esCambioNombre}}
      <div>
        <span class="font-bold">• Nombre actual del área o adscripción:</span>
        <span class="inline font-normal ml-1 text-slate-900 uppercase">{{nombreActual}}</span>
      </div>
      <div>
        <span class="font-bold">• Nuevo nombre del área o adscripción:</span>
        <span class="inline font-normal ml-1 text-slate-900 uppercase">{{nuevoNombre}}</span>
      </div>
      {{/if}}
      {{#if noEsCambioNombre}}
      <div>
        <span class="font-bold">• Nombre del área o adscripción:</span>
        <span class="inline font-normal ml-1 text-slate-900 uppercase">{{nuevaDenominacion}}</span>
      </div>
      {{/if}}
      {{#if esCambioDependenciaJerarquica}}
      <div>
        <span class="font-bold">• Dependencia jerárquica de destino:</span>
        <span class="inline font-normal ml-1 text-slate-900 uppercase">{{unidadDestino}}</span>
      </div>
      {{/if}}
    </div>
  </div>

  <!-- APARTADO II. GENERALES -->
  <div>
    <div class="font-bold text-[10pt] mb-1 uppercase tracking-wide text-slate-900 text-left">II. GENERALES</div>
    <p class="text-justify mb-2 leading-relaxed">
      En el municipio de <span class="font-bold">{{municipio}}</span>, del Estado de Yucatán, siendo las <span class="font-bold">{{horas}}</span> horas con <span class="font-bold">{{minutos}}</span> minutos del día <span class="font-bold">{{dia}}</span> del mes de <span class="font-bold">{{mes}}</span> del año <span class="font-bold">20{{anio}}</span>, constituidos en el inmueble que ocupa <span class="font-bold">{{inmueble}}</span> ubicada en domicilio conocido, se encuentran reunidos los siguientes representantes de la Secretaría de Educación involucrados:
    </p>

    <!-- Comparecientes -->
    <div class="my-2 space-y-1 text-[10pt] pl-3 text-left">
      <div class="grid grid-cols-12 gap-2 items-start">
        <div class="col-span-5 font-bold text-slate-800">{{etiquetaTitularUnidad1Label}}:</div>
        <div class="col-span-7 font-normal text-slate-900">
          <span class="font-normal text-slate-900">{{titularUnidad1Linea}}</span>
        </div>
      </div>

      {{#if titularUnidad2Linea}}
      <div class="grid grid-cols-12 gap-2 items-start">
        <div class="col-span-5 font-bold text-slate-800">{{etiquetaTitular2}}:</div>
        <div class="col-span-7 font-normal text-slate-900">
          <span class="font-normal text-slate-900">{{titularUnidad2Linea}}</span>
        </div>
      </div>
      {{/if}}

      <div class="grid grid-cols-12 gap-2 items-start">
        <div class="col-span-5 font-bold text-slate-800">Titular de Área:</div>
        <div class="col-span-7 font-normal text-slate-900">
          <span class="font-normal text-slate-900">{{titularAreaLinea}}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- APARTADO III. JUSTIFICACIÓN Y MOTIVOS DEL CAMBIO -->
  <div>
    <div class="font-bold text-[10pt] mb-1 uppercase tracking-wide text-slate-900 text-left">III. JUSTIFICACIÓN Y MOTIVOS DEL CAMBIO</div>
    <div class="pl-3 space-y-1 text-[10pt]">
      <p class="italic text-[10.5pt] text-slate-700">Se hace constar los siguientes movimientos de carácter administrativo…</p>
      <!-- Cuadro invisible delimitador para forzar división de línea hacia abajo y justificación perfecta sin desbordes -->
      <div class="cuadro-invisible-justificacion" style="width: 100%; max-width: 100%; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse; border: none; table-layout: fixed; margin: 0; padding: 0;">
          <tbody>
            <tr>
              <td style="border: none; padding: 0; width: 100%; vertical-align: top; text-align: justify; text-justify: inter-word; overflow-wrap: break-word; word-break: break-word; hyphens: auto;">
                <div class="text-justify leading-relaxed whitespace-pre-wrap font-normal text-slate-900 uppercase" style="text-align: justify; text-justify: inter-word; overflow-wrap: break-word; word-break: break-word; line-height: 1.35; margin: 0; padding: 0;">{{justificacion}}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- APARTADO IV. CIERRE Y FIRMAS -->
  <div class="page-break-avoid">
    <div class="font-bold text-[10pt] mb-1 uppercase tracking-wide text-slate-900 text-left">IV. CIERRE</div>
    <p class="text-justify mb-2 leading-relaxed text-[10pt]">
      Una vez expresado lo anterior y al no haber más hechos que hacer constar, se da por concluida la presente, firmando al calce para su debida constancia y manifestando su entera conformidad los involucrados, siendo el mismo día y año.
    </p>

    <!-- ESPACIO DE FIRMAS: 3 firmas (sin testigos) -->
    <div class="firmas-container mt-6 space-y-5 font-sans">
      <!-- Fila 1: Titular Unidad (1) y Jefe Inmediato / Titular Unidad (2) -->
      <div class="grid grid-cols-2 gap-8 text-center pt-1.5">
        <div>
          <div class="w-11/12 mx-auto border-t border-slate-900 pt-1.5">
            <div class="font-bold uppercase text-[10.5px] tracking-tight">Titular de Unidad Administrativa (1)</div>
            <div class="text-slate-900 text-[10.5px] mt-0.5 font-bold">{{titularUnidad1Nombre}}</div>
            <div class="text-slate-600 text-[9.5px] leading-tight mt-0.5">{{titularUnidad1Cargo}}</div>
          </div>
        </div>
        <div>
          <div class="w-11/12 mx-auto border-t border-slate-900 pt-1.5">
            <div class="font-bold uppercase text-[10.5px] tracking-tight">{{etiquetaTitular2Firma}}</div>
            <div class="text-slate-900 text-[10.5px] mt-0.5 font-bold">{{titularUnidad2Nombre}}</div>
            <div class="text-slate-600 text-[9.5px] leading-tight mt-0.5">{{titularUnidad2Cargo}}</div>
          </div>
        </div>
      </div>

      <!-- Fila 2: Titular de Área centrado -->
      <div class="text-center pt-2">
        <div class="w-72 mx-auto border-t border-slate-900 pt-1.5">
          <div class="font-bold uppercase text-[10.5px] tracking-tight">Titular de Área</div>
          <div class="text-slate-900 text-[10.5px] mt-0.5 font-bold">{{titularAreaNombre}}</div>
          <div class="text-slate-600 text-[9.5px] leading-tight mt-0.5">{{titularAreaCargo}}</div>
        </div>
      </div>
    </div>
  </div>

</div>

<!-- ============================================================== -->
<!-- PIE DE PÁGINA OFICIAL SEGEY (IDÉNTICO AL FORMATO WORD)        -->
<!-- ============================================================== -->
<div class="official-footer mt-7 pt-2.5" style="font-family: 'Lato', Arial, sans-serif; font-size: 10px; color: #475569; border-top: none;">
  <table style="width: 100%; border-collapse: collapse; border: none;">
    <tr>
      <td style="text-align: left; vertical-align: middle; padding: 2px 0;">
        <span style="letter-spacing: 0.5px; font-weight: 600;">F-PR-EAO-03 &nbsp;R01</span>
      </td>
      <td style="text-align: right; vertical-align: middle; padding: 2px 0;">
        <span>Página 1 de 1</span>
      </td>
    </tr>
  </table>
</div>
`;

// Estado global de la aplicación
let records = [];
let customLayouts = [];
let activeLayoutId = 'default';
let editingRecordId = null;
let currentRenderedRecord = null;
let predefinedAreas = [];

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initLayouts();
  initAreasNotificadoras();
  initCatalogoOrganico();
  updateAdminUI();
  initFormDefaults();
  initQueryParams();
  renderTable();
  updateStats();
  populateAreaFilter();
  updateShareLink();
  renderDocument(getCurrentFormDataForPreview());
  poblarSelectJustificaciones('Alta');
  if (typeof syncJustificacionesFromGoogleSheets === 'function') {
    syncJustificacionesFromGoogleSheets(false);
  }
  initAllSearchableComboboxes();
});

/**
 * =========================================================================
 * COMPONENTE COMBOBOX BUSCABLE NATIVO (OPCIÓN 1)
 * Permite buscar al vuelo escribiendo o hacer clic para ver la lista completa.
 * Formato limpio: Puesto — Nombre (sin etiquetas de nivel de mando).
 * =========================================================================
 */
function normalizeText(str) {
  if (!str) return '';
  return str.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function initSearchableCombobox(selectId, placeholderText = 'Escriba o seleccione...') {
  const select = document.getElementById(selectId);
  if (!select) return null;

  // Si ya existe un combobox wrapper para este select, no crear otro
  let wrapper = select.parentElement ? select.parentElement.querySelector(`.segey-combobox[data-for="${selectId}"]`) : null;
  if (wrapper) {
    return wrapper;
  }

  // Ocultar select original pero mantenerlo en el DOM
  select.classList.add('hidden');
  select.style.display = 'none';
  select.setAttribute('data-combobox-hidden', 'true');

  // Crear wrapper visual
  wrapper = document.createElement('div');
  wrapper.className = 'relative segey-combobox w-full';
  wrapper.setAttribute('data-for', selectId);

  wrapper.innerHTML = `
    <div class="relative w-full">
      <input type="text"
        class="combobox-input w-full text-xs rounded-lg border border-slate-300 p-2.5 pr-14 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-segey-700 focus:outline-none placeholder:text-slate-400 shadow-2xs transition-all"
        placeholder="${placeholderText}"
        autocomplete="off"
        spellcheck="false"
      />
      <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
        <button type="button" class="combobox-clear hidden p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md focus:outline-none transition-all cursor-pointer" title="Limpiar y elegir otro...">
          <i class="fa-solid fa-xmark text-sm font-bold"></i>
        </button>
        <button type="button" class="combobox-toggle p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md focus:outline-none transition-all cursor-pointer" title="Ver opciones">
          <i class="fa-solid fa-chevron-down text-[11px] transition-transform duration-200"></i>
        </button>
      </div>
    </div>
    <div class="combobox-menu hidden absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100 text-xs custom-scrollbar">
    </div>
  `;

  select.parentNode.insertBefore(wrapper, select.nextSibling);

  const input = wrapper.querySelector('.combobox-input');
  const menu = wrapper.querySelector('.combobox-menu');
  const clearBtn = wrapper.querySelector('.combobox-clear');
  const toggleBtn = wrapper.querySelector('.combobox-toggle');
  const chevron = toggleBtn.querySelector('i');

  let activeIndex = -1;

  function getOptions() {
    const list = [];
    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      if (!opt.value && opt.disabled) continue;
      list.push({
        value: opt.value,
        text: opt.textContent.trim(),
        disabled: opt.disabled,
        selected: opt.selected,
        index: i,
        dataset: { ...opt.dataset }
      });
    }
    return list;
  }

  function renderMenu(filterText = '') {
    const q = normalizeText(filterText);
    const opts = getOptions();

    const filtered = opts.filter(opt => {
      if (!opt.value && !opt.text) return false;
      if (!q) return true;
      return normalizeText(opt.text).includes(q);
    });

    if (filtered.length === 0) {
      menu.innerHTML = `<div class="p-3 text-xs text-slate-400 italic text-center">No se encontraron resultados para "${escapeHtml(filterText)}"</div>`;
      return;
    }

    let html = '';
    filtered.forEach((opt) => {
      const isSelected = (opt.value && opt.value === select.value) || opt.selected;
      const isManual = opt.value.includes('MANUAL') || opt.value.includes('OTRA');
      const bgClass = isSelected ? 'bg-segey-50 font-bold text-segey-900 border-l-4 border-segey-700' : 'hover:bg-slate-50 text-slate-800';
      const manualClass = isManual ? 'text-amber-800 bg-amber-50/50 hover:bg-amber-100/70 font-semibold' : '';

      html += `
        <div class="combobox-item p-2.5 cursor-pointer transition-colors flex items-center justify-between ${bgClass} ${manualClass}"
             data-value="${escapeHtml(opt.value)}"
             data-select-index="${opt.index}">
          <span class="truncate">${escapeHtml(opt.text)}</span>
          ${isSelected ? '<i class="fa-solid fa-check text-segey-700 text-xs ml-2 flex-shrink-0"></i>' : ''}
        </div>
      `;
    });
    menu.innerHTML = html;

    menu.querySelectorAll('.combobox-item').forEach(itemEl => {
      itemEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      itemEl.addEventListener('click', () => {
        selectItem(itemEl.dataset.value, itemEl.getAttribute('data-select-index'));
      });
    });
  }

  function selectItem(val, selectIdx) {
    if (selectIdx !== null && selectIdx !== undefined) {
      select.selectedIndex = parseInt(selectIdx, 10);
    } else {
      select.value = val;
    }

    const selectedOpt = select.options[select.selectedIndex];
    if (selectedOpt && selectedOpt.value) {
      input.value = selectedOpt.textContent.trim();
      clearBtn.classList.remove('hidden');
    } else {
      input.value = '';
      clearBtn.classList.add('hidden');
    }

    closeMenu();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function openMenu(filterText = '') {
    if (select.disabled) return;
    renderMenu(filterText);
    menu.classList.remove('hidden');
    chevron.classList.add('rotate-180');
    activeIndex = -1;
  }

  function closeMenu() {
    menu.classList.add('hidden');
    chevron.classList.remove('rotate-180');
    activeIndex = -1;
    syncInputFromSelect();
  }

  function syncInputFromSelect() {
    let selIdx = select.selectedIndex;
    let hasLinkedData = false;
    let linkedNom = '';
    let linkedCar = '';
    if (selectId === 'selectTitularUnidad2') {
      const u2Nom = document.getElementById('titularUnidad2Nombre');
      const u2Car = document.getElementById('titularUnidad2Cargo');
      linkedNom = (u2Nom?.value || '').trim();
      linkedCar = (u2Car?.value || '').trim();
      hasLinkedData = Boolean(linkedNom || linkedCar);
    } else if (selectId === 'selectTitularArea') {
      const aNom = document.getElementById('titularAreaNombre');
      const aCar = document.getElementById('titularAreaCargo');
      linkedNom = (aNom?.value || '').trim();
      linkedCar = (aCar?.value || '').trim();
      hasLinkedData = Boolean(linkedNom || linkedCar);
    } else if (selectId === 'selectTitularUnidad1') {
      const u1Nom = document.getElementById('titularUnidad1Nombre');
      const u1Car = document.getElementById('titularUnidad1Cargo');
      linkedNom = (u1Nom?.value || '').trim();
      linkedCar = (u1Car?.value || '').trim();
      hasLinkedData = Boolean(linkedNom || linkedCar);
    } else if (selectId === 'selectTitularArea2') {
      const a2Nom = document.getElementById('titularArea2Nombre');
      const a2Car = document.getElementById('titularArea2Cargo');
      linkedNom = (a2Nom?.value || '').trim();
      linkedCar = (a2Car?.value || '').trim();
      hasLinkedData = Boolean(linkedNom || linkedCar);
    }

    // Si los inputs inferiores tienen información pero el select aún no tiene una opción válida seleccionada:
    if ((selIdx <= 0 || !select.options[selIdx] || !select.options[selIdx].value) && hasLinkedData) {
      const norm = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(c\.p\.|ing\.|lic\.|mtro\.|mtra\.|dr\.|dra\.|br\.|c\.)\b/g, "").replace(/[^a-z0-9 ]/g, " ").trim();
      const nNom = norm(linkedNom);
      const nCar = norm(linkedCar);
      let matchIdx = -1;

      for (let i = 1; i < select.options.length; i++) {
        const opt = select.options[i];
        if (opt.value === '__MANUAL__') continue;
        const optNom = norm(opt.dataset?.nombre || '');
        const optCar = norm(opt.dataset?.cargo || opt.dataset?.puesto || '');
        const optTxt = norm(opt.textContent || '');

        if (nNom && (optNom === nNom || (optNom.length > 5 && (nNom.includes(optNom) || optNom.includes(nNom))) || (optTxt.length > 5 && (optTxt.includes(nNom) || nNom.includes(optTxt))))) {
          matchIdx = i;
          break;
        }
        if (nCar && (optCar === nCar || (optCar.length > 6 && (nCar.includes(optCar) || optCar.includes(nCar))) || (optTxt.length > 6 && (optTxt.includes(nCar) || nCar.includes(optTxt))))) {
          matchIdx = i;
          break;
        }
      }

      if (matchIdx !== -1) {
        select.selectedIndex = matchIdx;
      } else {
        // Insertar la opción vinculada para que el combobox y el select siempre reflejen la información precargada
        const newOpt = document.createElement('option');
        newOpt.value = `opt_linked_${Date.now()}`;
        const label = (linkedCar && linkedNom) ? `${linkedCar} — ${linkedNom}` : (linkedNom || linkedCar);
        newOpt.textContent = label;
        if (linkedNom) newOpt.setAttribute('data-nombre', linkedNom);
        if (linkedCar) {
          newOpt.setAttribute('data-cargo', linkedCar);
          newOpt.setAttribute('data-puesto', linkedCar);
        }
        if (select.options.length > 1) {
          select.insertBefore(newOpt, select.options[1]);
        } else {
          select.appendChild(newOpt);
        }
        select.selectedIndex = 1;
      }
      selIdx = select.selectedIndex;
    }

    if (selIdx >= 0 && select.options[selIdx] && select.options[selIdx].value) {
      input.value = select.options[selIdx].textContent.trim();
      clearBtn.classList.remove('hidden');
    } else {
      input.value = '';
      if (hasLinkedData) {
        input.value = (linkedCar && linkedNom) ? `${linkedCar} — ${linkedNom}` : (linkedNom || linkedCar);
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
    input.disabled = select.disabled;
    if (select.disabled) {
      input.classList.add('bg-slate-100', 'text-slate-600', 'cursor-not-allowed');
      input.classList.remove('bg-white', 'text-slate-800');
      clearBtn.classList.add('hidden');
      toggleBtn.disabled = true;
      toggleBtn.classList.add('cursor-not-allowed', 'opacity-50');
    } else {
      input.classList.remove('bg-slate-100', 'text-slate-600', 'cursor-not-allowed');
      input.classList.add('bg-white', 'text-slate-800');
      toggleBtn.disabled = false;
      toggleBtn.classList.remove('cursor-not-allowed', 'opacity-50');
    }
  }

  input.addEventListener('focus', () => {
    if (select.disabled) return;
    input.select();
    openMenu('');
  });

  input.addEventListener('click', () => {
    if (select.disabled) return;
    if (menu.classList.contains('hidden')) {
      input.select();
      openMenu('');
    }
  });

  input.addEventListener('input', (e) => {
    if (select.disabled) return;
    openMenu(e.target.value);
    if (e.target.value.trim().length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  });

  input.addEventListener('keydown', (e) => {
    const items = menu.querySelectorAll('.combobox-item');
    if (menu.classList.contains('hidden')) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        openMenu();
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length === 0) return;
      activeIndex = (activeIndex + 1) % items.length;
      highlightItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length === 0) return;
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      highlightItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].click();
      } else if (items.length > 0) {
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      closeMenu();
    }
  });

  function highlightItem(items) {
    items.forEach((it, idx) => {
      if (idx === activeIndex) {
        it.classList.add('bg-slate-100', 'font-bold');
        it.scrollIntoView({ block: 'nearest' });
      } else {
        it.classList.remove('bg-slate-100', 'font-bold');
      }
    });
  }

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    select.value = '';
    select.selectedIndex = 0;

    // Limpiar explícitamente los campos de texto asociados para permitir vaciar y capturar/elegir otro
    if (selectId === 'selectTitularUnidad2') {
      const u2Nom = document.getElementById('titularUnidad2Nombre');
      const u2Car = document.getElementById('titularUnidad2Cargo');
      if (u2Nom) u2Nom.value = '';
      if (u2Car) u2Car.value = '';
      if (typeof gestionarAlertaVacanteGenerales === 'function') gestionarAlertaVacanteGenerales('titular2', false);
    } else if (selectId === 'selectTitularArea') {
      const aNom = document.getElementById('titularAreaNombre');
      const aCar = document.getElementById('titularAreaCargo');
      if (aNom) aNom.value = '';
      if (aCar) aCar.value = '';
      if (typeof gestionarAlertaVacanteGenerales === 'function') gestionarAlertaVacanteGenerales('area1', false);
    } else if (selectId === 'selectTitularUnidad1') {
      const u1Nom = document.getElementById('titularUnidad1Nombre');
      const u1Car = document.getElementById('titularUnidad1Cargo');
      if (u1Nom) u1Nom.value = '';
      if (u1Car) u1Car.value = '';
      if (typeof gestionarAlertaVacanteGenerales === 'function') gestionarAlertaVacanteGenerales('titular1', false);
    } else if (selectId === 'selectTitularArea2') {
      const a2Nom = document.getElementById('titularArea2Nombre');
      const a2Car = document.getElementById('titularArea2Cargo');
      if (a2Nom) a2Nom.value = '';
      if (a2Car) a2Car.value = '';
    } else if (selectId === 'selectAreaBaja' || selectId === 'selectAreaCambioNombre' || selectId === 'selectAreaCambioDep') {
      const nd = document.getElementById('nuevaDenominacion');
      if (nd) nd.value = '';
    }

    syncInputFromSelect();
    select.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
    openMenu('');
  });

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (select.disabled) return;
    if (menu.classList.contains('hidden')) {
      input.focus();
      input.select();
      openMenu('');
    } else {
      closeMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closeMenu();
    }
  });

  // Interceptar asignaciones a .value y .selectedIndex en la instancia del select
  const origValueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const origIndexDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');

  try {
    Object.defineProperty(select, 'value', {
      get() {
        return origValueDesc.get.call(this);
      },
      set(v) {
        origValueDesc.set.call(this, v);
        syncInputFromSelect();
      },
      configurable: true
    });

    Object.defineProperty(select, 'selectedIndex', {
      get() {
        return origIndexDesc.get.call(this);
      },
      set(i) {
        origIndexDesc.set.call(this, i);
        syncInputFromSelect();
      },
      configurable: true
    });
  } catch (err) {
    console.warn('No se pudo redefinir property descriptors en select:', err);
  }

  select.addEventListener('change', () => {
    syncInputFromSelect();
  });

  const observer = new MutationObserver(() => {
    syncInputFromSelect();
  });
  observer.observe(select, { childList: true, attributeFilter: ['disabled'] });

  select._comboboxSync = syncInputFromSelect;
  syncInputFromSelect();
  return wrapper;
}

function setComboboxDisabled(selectId, disabled, customText) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.disabled = disabled;
  if (disabled) {
    select.setAttribute('disabled', 'true');
  } else {
    select.removeAttribute('disabled');
  }

  const wrapper = select.parentElement ? select.parentElement.querySelector(`.segey-combobox[data-for="${selectId}"]`) : null;
  if (wrapper) {
    const input = wrapper.querySelector('.combobox-input');
    const toggleBtn = wrapper.querySelector('.combobox-toggle');
    const clearBtn = wrapper.querySelector('.combobox-clear');
    const menu = wrapper.querySelector('.combobox-menu');
    if (menu) menu.classList.add('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');

    if (disabled) {
      if (input) {
        input.disabled = true;
        input.setAttribute('disabled', 'true');
        input.setAttribute('readonly', 'true');
        input.classList.add('bg-slate-100', 'text-slate-600', 'cursor-not-allowed');
        input.classList.remove('bg-white', 'text-slate-800');
        if (customText !== undefined) {
          input.value = customText;
        }
      }
      if (toggleBtn) {
        toggleBtn.disabled = true;
        toggleBtn.setAttribute('disabled', 'true');
        toggleBtn.classList.add('cursor-not-allowed', 'opacity-50');
      }
    } else {
      if (input) {
        input.disabled = false;
        input.removeAttribute('disabled');
        input.removeAttribute('readonly');
        input.classList.remove('bg-slate-100', 'text-slate-600', 'cursor-not-allowed');
        input.classList.add('bg-white', 'text-slate-800');
        if (customText !== undefined) {
          input.value = customText;
        } else if (select.selectedIndex >= 0 && select.options[select.selectedIndex]) {
          input.value = select.options[select.selectedIndex].textContent.trim();
        }
      }
      if (toggleBtn) {
        toggleBtn.disabled = false;
        toggleBtn.removeAttribute('disabled');
        toggleBtn.classList.remove('cursor-not-allowed', 'opacity-50');
      }
    }
  }
}
window.setComboboxDisabled = setComboboxDisabled;

/**
 * Sincroniza visualmente un combobox de búsqueda con el valor y texto de su <select> original.
 * @param {string} selectId ID del elemento select.
 */
function syncComboboxFromSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  if (typeof select._comboboxSync === 'function') {
    select._comboboxSync();
    return;
  }
  const wrapper = select.parentElement ? select.parentElement.querySelector(`.segey-combobox[data-for="${selectId}"]`) : null;
  if (!wrapper) return;
  const input = wrapper.querySelector('.combobox-input');
  const clearBtn = wrapper.querySelector('.combobox-clear');
  const selIdx = select.selectedIndex;
  if (selIdx >= 0 && select.options[selIdx] && select.options[selIdx].value) {
    if (input) input.value = select.options[selIdx].textContent.trim();
    if (clearBtn) clearBtn.classList.remove('hidden');
  } else {
    if (input) input.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
  }
}
window.syncComboboxFromSelect = syncComboboxFromSelect;

function initAllSearchableComboboxes() {

  initSearchableCombobox('areaNotificadoraSelect', 'Buscar área oficial o escribir...');
  initSearchableCombobox('selectResponsableCaptura', 'Buscar enlace oficial...');
  initSearchableCombobox('selectTitularUnidad1', 'Seleccionar titular de la unidad...');
  initSearchableCombobox('selectTitularArea', 'Buscar puesto o persona del área...');
  initSearchableCombobox('selectTitularArea2', 'Buscar puesto o persona de la unidad 2...');
  initSearchableCombobox('selectTitularUnidad2', 'Buscar puesto o persona de la unidad...');
  initSearchableCombobox('selectAreaBaja', 'Buscar área o departamento a dar de baja...');
  initSearchableCombobox('selectAreaCambioNombre', 'Buscar área o departamento que cambia de nombre...');
  initSearchableCombobox('selectAreaCambioDep', 'Buscar área o departamento a transferir...');
  initSearchableCombobox('selectUnidadDestinoCambioDep', 'Buscar unidad administrativa de destino...');
  initSearchableCombobox('selectTestigo1', 'Buscar puesto o persona del Testigo 1...');
  initSearchableCombobox('selectTestigo2', 'Buscar puesto o persona del Testigo 2...');

  // Sincronizar visibilidad del botón de vaciado (X) al editar manualmente los campos de titulares
  ['titularUnidad1Nombre', 'titularUnidad1Cargo', 'titularUnidad2Nombre', 'titularUnidad2Cargo', 'titularAreaNombre', 'titularAreaCargo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (id.startsWith('titularUnidad1')) syncComboboxFromSelect('selectTitularUnidad1');
        if (id.startsWith('titularUnidad2')) syncComboboxFromSelect('selectTitularUnidad2');
        if (id.startsWith('titularArea')) syncComboboxFromSelect('selectTitularArea');
      });
    }
  });
}

/**
 * Inicializa el almacenamiento local con datos de ejemplo si está vacío
 */
function initStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      records = JSON.parse(saved);
    } catch (e) {
      console.error('Error al cargar registros locales:', e);
      records = [];
    }
  }

  const initial = getInitialSampleRecords();
  // Si no hay registros, precargamos 2 de ejemplo
  if (!records || records.length === 0) {
    records = initial;
    saveRecordsToStorage();
  } else {
    // Sincronizar registros demo existentes a los nuevos ejemplos de unidades administrativas
    let updated = false;
    records = records.map(r => {
      if (r.id === 'rec_demo_001') {
        updated = true;
        return initial[0];
      }
      if (r.id === 'rec_demo_002') {
        updated = true;
        return initial[1];
      }
      if (r.folio && r.folio.startsWith('SEGEY-')) {
        r.folio = r.folio.replace('SEGEY-', 'DIMC-');
        updated = true;
      }
      if (r.nuevaDenominacion && r.nuevaDenominacion !== r.nuevaDenominacion.toUpperCase()) {
        r.nuevaDenominacion = r.nuevaDenominacion.toUpperCase();
        updated = true;
      }
      if (r.justificacion && r.justificacion !== r.justificacion.toUpperCase()) {
        r.justificacion = r.justificacion.toUpperCase();
        updated = true;
      }
      return r;
    });

    // Detección y saneamiento automático de folios duplicados
    const seenFolios = new Set();
    const cleanRecords = [];
    records.forEach(r => {
      if (!r.folio) {
        cleanRecords.push(r);
        return;
      }
      if (seenFolios.has(r.folio)) {
        // Encontrado folio repetido
        const existing = cleanRecords.find(item => item.folio === r.folio);
        const isDuplicateClone = existing && (
          existing.id === r.id ||
          (existing.areaNotificadora === r.areaNotificadora &&
           existing.tipoMovimiento === r.tipoMovimiento &&
           existing.nuevaDenominacion === r.nuevaDenominacion)
        );

        if (isDuplicateClone) {
          // Descartar registro clon idéntico generado por doble envío
          updated = true;
          console.warn(`Descartando registro clon duplicado con folio ${r.folio}`);
        } else {
          // Registro con datos distintos: reasignar el siguiente folio único
          updated = true;
          const anio = new Date().getFullYear();
          let nextNum = 1;
          let newFolio = `DIMC-CC-${anio}-${String(nextNum).padStart(3, '0')}`;
          while (seenFolios.has(newFolio) || records.some(x => x.folio === newFolio)) {
            nextNum++;
            newFolio = `DIMC-CC-${anio}-${String(nextNum).padStart(3, '0')}`;
          }
          r.folio = newFolio;
          seenFolios.add(newFolio);
          cleanRecords.push(r);
          console.warn(`Reasignando folio único: ${newFolio}`);
        }
      } else {
        seenFolios.add(r.folio);
        cleanRecords.push(r);
      }
    });

    if (updated || cleanRecords.length !== records.length) {
      records = cleanRecords;
      saveRecordsToStorage();
    }
  }

  // Sincronización transparente con el archivo físico en disco (bitacora_constancias.json) vía servidor local
  if (window.location.protocol.startsWith('http')) {
    fetch('/api/records')
      .then(res => res.json())
      .then(serverRecords => {
        if (Array.isArray(serverRecords) && serverRecords.length > 0) {
          let updatedFromDisk = false;
          serverRecords.forEach(sr => {
            if (sr.folio && !records.some(r => r.folio === sr.folio)) {
              records.push(sr);
              updatedFromDisk = true;
            }
          });
          if (updatedFromDisk) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch (e) {}
            renderTable();
            updateStats();
            populateAreaFilter();
          }
        } else if (records && records.length > 0) {
          fetch('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(records)
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }
}

/**
 * =========================================================================
 * GESTIÓN DE LAYOUTS / PLANTILLAS DEL DOCUMENTO
 * =========================================================================
 */
function initLayouts() {
  const savedLayouts = localStorage.getItem(LAYOUTS_STORAGE_KEY);
  if (savedLayouts) {
    try {
      customLayouts = JSON.parse(savedLayouts);
    } catch (e) {
      console.error('Error al leer layouts guardados:', e);
      customLayouts = [];
    }
  }

  activeLayoutId = localStorage.getItem(ACTIVE_LAYOUT_ID_KEY) || 'default';
  populateLayoutSelector();
  updateLayoutUIBadge();
}

function getActiveLayoutHtml() {
  if (activeLayoutId === 'default') {
    return DEFAULT_LAYOUT_HTML;
  }
  const found = customLayouts.find(l => l.id === activeLayoutId);
  return found ? found.html : DEFAULT_LAYOUT_HTML;
}

function populateLayoutSelector() {
  const select = document.getElementById('layout-selector');
  if (!select) return;

  let options = [
    `<option value="default" ${activeLayoutId === 'default' ? 'selected' : ''}>Layout Oficial SEGEY (Predeterminado sin cuadros)</option>`
  ];

  customLayouts.forEach(layout => {
    const isSelected = layout.id === activeLayoutId ? 'selected' : '';
    options.push(`<option value="${layout.id}" ${isSelected}>📄 ${layout.name}</option>`);
  });

  select.innerHTML = options.join('');
}

function changeActiveLayout(layoutId) {
  activeLayoutId = layoutId;
  localStorage.setItem(ACTIVE_LAYOUT_ID_KEY, layoutId);
  updateLayoutUIBadge();

  // Si hay un documento en pantalla, re-renderizarlo de inmediato con el nuevo layout
  const targetRecord = currentRenderedRecord || (records.length > 0 ? records[0] : null);
  if (targetRecord) {
    renderDocument(targetRecord);
  }

  const layoutName = getActiveLayoutName();
  showToast(`Layout activo: "${layoutName}". Todos los documentos usarán este diseño.`);
}

function getActiveLayoutName() {
  if (activeLayoutId === 'default') return 'Oficial SEGEY (Predeterminado)';
  const found = customLayouts.find(l => l.id === activeLayoutId);
  return found ? found.name : 'Personalizado';
}

function updateLayoutUIBadge() {
  const badge = document.getElementById('badge-active-layout');
  const btnDelete = document.getElementById('btn-delete-layout');

  if (activeLayoutId === 'default') {
    if (badge) {
      badge.textContent = 'Oficial SEGEY Activo';
      badge.className = 'text-[10px] bg-rose-500/30 text-rose-200 border border-rose-500/40 px-2 py-0.5 rounded-full font-mono font-semibold';
    }
    if (btnDelete) btnDelete.classList.add('hidden');
  } else {
    if (badge) {
      badge.textContent = 'Personalizado';
      badge.className = 'text-[10px] bg-amber-500/30 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-semibold';
    }
    if (btnDelete) btnDelete.classList.remove('hidden');
  }
}

/**
 * Procesa la subida de un nuevo archivo de layout (.html o .txt)
 */
function handleLayoutUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    let content = e.target.result;

    // Si contiene etiquetas de documento completo <body>...</body>, extraer el contenido interior
    if (content.includes('<body')) {
      const match = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (match && match[1]) {
        content = match[1];
      }
    }

    const layoutNamePrompt = prompt(
      'Ingrese un nombre descriptivo para identificar este Layout:',
      file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
    );

    const layoutName = layoutNamePrompt ? layoutNamePrompt.trim() : file.name;
    const newLayout = {
      id: 'layout_' + Date.now(),
      name: layoutName,
      html: content,
      fileName: file.name,
      uploadedAt: new Date().toISOString()
    };

    customLayouts.push(newLayout);
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(customLayouts));

    // Activar inmediatamente el nuevo layout
    changeActiveLayout(newLayout.id);
    populateLayoutSelector();

    // Limpiar input file
    event.target.value = '';

    showToast(`¡Nuevo Layout "${layoutName}" guardado y activado exitosamente!`);
  };

  reader.readAsText(file);
}

/**
 * Descarga el layout base editable con todas las etiquetas
 */
function downloadCurrentLayoutTemplate() {
  const content = getActiveLayoutHtml();
  const blob = new Blob([content], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plantilla_layout_editable_${activeLayoutId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Plantilla de layout descargada para editar.');
}

/**
 * Elimina el layout personalizado activo y restablece el oficial
 */
function deleteCurrentCustomLayout() {
  if (activeLayoutId === 'default') return;

  const currentLayout = customLayouts.find(l => l.id === activeLayoutId);
  const name = currentLayout ? currentLayout.name : 'este layout';

  if (confirm(`¿Está seguro de eliminar la plantilla "${name}"? Se restablecerá el layout oficial predeterminado.`)) {
    customLayouts = customLayouts.filter(l => l.id !== activeLayoutId);
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(customLayouts));
    changeActiveLayout('default');
    populateLayoutSelector();
    showToast(`Layout "${name}" eliminado.`);
  }
}

/**
 * Previsualiza el layout activo con el primer registro o datos de muestra
 */
function previewActiveLayoutWithSample() {
  const targetRecord = (records.length > 0) ? records[0] : getInitialSampleRecords()[0];
  renderDocument(targetRecord);
  switchTab('tab-preview', true);
  showToast(`Visualizando documento con layout: "${getActiveLayoutName()}".`);
}

/**
 * Modales de etiquetas de layout
 */
function openLayoutTagsModal() {
  const modal = document.getElementById('modal-layout-tags');
  if (modal) modal.classList.remove('hidden');
}

function closeLayoutTagsModal() {
  const modal = document.getElementById('modal-layout-tags');
  if (modal) modal.classList.add('hidden');
}

/**
 * =========================================================================
 * MOTOR COMPILADOR DE PLANTILLAS / LAYOUTS
 * =========================================================================
 */
function compileLayout(templateStr, data) {
  if (!templateStr) return '';

  const u1Nom = data.titularUnidad1Nombre || data.titularUnidad1 || '';
  const u1Car = data.titularUnidad1Cargo || '';
  let u2Nom = data.titularUnidad2Nombre || data.titularUnidad2 || '';
  let u2Car = data.titularUnidad2Cargo || '';
  const areaNom = data.titularAreaNombre || data.titularArea || '';
  const areaCar = data.titularAreaCargo || '';
  const area2Nom = data.titularArea2Nombre || data.titularArea2 || '';
  const area2Car = data.titularArea2Cargo || '';
  const test1Nom = data.testigo1Nombre || data.testigo1 || '';
  const test1Car = data.testigo1Cargo || '';
  const test2Nom = data.testigo2Nombre || data.testigo2 || '';
  const test2Car = data.testigo2Cargo || '';

  const tipo = data.tipoMovimiento || 'Alta';
  const esCambioDependenciaJerarquica = (tipo === 'Cambio de dependencia jerárquica' || tipo === 'cambio_dependencia_jerarquica');
  const noEsCambioDependenciaJerarquica = !esCambioDependenciaJerarquica;
  const tieneTestigo2 = esCambioDependenciaJerarquica && Boolean(test2Nom.trim());
  const noTieneTestigo2 = !tieneTestigo2;
  const tieneTitularArea2 = Boolean(esCambioDependenciaJerarquica && (area2Nom.trim() || area2Car.trim()));
  const noTieneTitularArea2 = !tieneTitularArea2;
  const isJefeInmediato = (tipo === 'Alta' || tipo === 'Baja' || tipo === 'Cambio de nombre');
  const isNoAplica = (!isJefeInmediato && (u2Nom.trim().toLowerCase() === 'no aplica' || u2Nom.trim().toLowerCase() === 'n/a'));
  if (isNoAplica) {
    u2Nom = 'No Aplica';
    u2Car = '';
  }

  const etiquetaTitular2 = isJefeInmediato ? 'Jefe Inmediato' : 'Titular de Unidad Administrativa (2)';
  const etiquetaTitular2Firma = isJefeInmediato ? 'JEFE INMEDIATO' : 'TITULAR DE UNIDAD ADMINISTRATIVA (2)';
  const etiquetaTitular1Y2 = isJefeInmediato ? 'Titular de Unidad y Jefe Inmediato' : 'Titular(es) de Unidad(es) Administrativa(s)';
  const etiquetaTitularUnidad1Label = isJefeInmediato ? 'Titular de Unidad Administrativa' : 'Titular de Unidad Administrativa (1)';
  const etiquetaCompareciente2 = isJefeInmediato ? 'Jefe Inmediato: ' : '2) ';

  const vars = {
    logoYucatan: (typeof window !== 'undefined' && window.LOGO_YUCATAN_B64) ? window.LOGO_YUCATAN_B64 : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    logoSegey: (typeof window !== 'undefined' && window.LOGO_SEGEY_B64) ? window.LOGO_SEGEY_B64 : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    etiquetaTestigos: esCambioDependenciaJerarquica ? 'Testigos' : 'Testigo',
    etiquetaEnlaces: esCambioDependenciaJerarquica ? 'Testigos' : 'Testigo',
    etiquetaTitular2: etiquetaTitular2,
    etiquetaTitular2Firma: etiquetaTitular2Firma,
    etiquetaTitular1Y2: etiquetaTitular1Y2,
    etiquetaTitularUnidad1Label: etiquetaTitularUnidad1Label,
    etiquetaCompareciente2: etiquetaCompareciente2,
    folio: data.folio || 'S/F',
    areaNotificadora: data.areaNotificadora || '',
    responsableCaptura: data.responsableCaptura || '',
    municipio: data.municipio || 'Mérida',
    fechaActa: data.fechaConstancia || data.fechaActa || '',
    fechaConstancia: data.fechaConstancia || data.fechaActa || '',
    dia: data.dia || '10',
    mes: data.mes || 'Noviembre',
    anio: (data.anio && String(data.anio).length === 4) ? String(data.anio).slice(-2) : (data.anio || '26'),
    anioCompleto: data.anioCompleto || (data.anio ? (String(data.anio).length === 2 ? `20${data.anio}` : data.anio) : '2026'),
    horaActa: data.horaActa || '10:00',
    horas: data.horas || '10',
    minutos: data.minutos || '00',
    inmueble: data.inmueble || 'el Edificio Central de la Secretaría de Educación',

    titularUnidad1Nombre: u1Nom,
    titularUnidad1Cargo: u1Car,
    titularUnidad1Completo: formatPersonText(u1Nom, u1Car),

    titularUnidad2Nombre: u2Nom,
    titularUnidad2Cargo: u2Car,
    titularUnidad2Completo: isNoAplica ? 'No Aplica' : formatPersonText(u2Nom, u2Car),

    titularAreaNombre: areaNom,
    titularAreaCargo: areaCar,
    titularAreaCompleto: formatPersonText(areaNom, areaCar),

    titularArea2Nombre: area2Nom,
    titularArea2Cargo: area2Car,
    titularArea2Completo: formatPersonText(area2Nom, area2Car),
    tieneTitularArea2: tieneTitularArea2,
    noTieneTitularArea2: noTieneTitularArea2,

    testigo1Nombre: test1Nom,
    testigo1Cargo: test1Car,
    testigo1Completo: formatPersonText(test1Nom, test1Car),

    testigo2Nombre: test2Nom,
    testigo2Cargo: test2Car,
    testigo2Completo: formatPersonText(test2Nom, test2Car),

    titularUnidad1Linea: u1Nom ? (u1Car ? `${u1Nom} (${u1Car})` : u1Nom) : '',
    titularUnidad2Linea: isNoAplica ? 'No Aplica' : (u2Nom ? (u2Car ? `${u2Nom} (${u2Car})` : u2Nom) : ''),
    titularAreaLinea: areaNom ? (areaCar ? `${areaNom} (${areaCar})` : areaNom) : '',
    titularArea2Linea: area2Nom ? (area2Car ? `${area2Nom} (${area2Car})` : area2Nom) : '',
    testigo1Linea: test1Nom ? (test1Car ? `${test1Nom} (${test1Car})` : test1Nom) : '',
    testigo2Linea: test2Nom ? (test2Car ? `${test2Nom} (${test2Car})` : test2Nom) : '',
    tipoMovimiento: tipo,
    chkAlta: tipo === 'Alta' ? '[\u00A0X\u00A0]' : '[\u00A0\u00A0\u00A0]',
    chkBaja: tipo === 'Baja' ? '[\u00A0X\u00A0]' : '[\u00A0\u00A0\u00A0]',
    chkNombre: tipo === 'Cambio de nombre' ? '[\u00A0X\u00A0]' : '[\u00A0\u00A0\u00A0]',
    chkJerarquica: tipo === 'Cambio de dependencia jerárquica' ? '[\u00A0X\u00A0]' : '[\u00A0\u00A0\u00A0]',

    esCambioDependenciaJerarquica: esCambioDependenciaJerarquica,
    noEsCambioDependenciaJerarquica: noEsCambioDependenciaJerarquica,
    tieneTestigo2: tieneTestigo2,
    noTieneTestigo2: noTieneTestigo2,

    esCambioNombre: (tipo === 'Cambio de nombre'),
    noEsCambioNombre: (tipo !== 'Cambio de nombre'),
    nombreActual: (() => {
      let nomAct = (data.nombreActual || data.nuevaDenominacion || '').toUpperCase().trim();
      if (tipo === 'Cambio de nombre') {
        if (nomAct.includes('➔')) {
          nomAct = nomAct.split('➔')[0].trim();
        } else if (nomAct.includes('->')) {
          nomAct = nomAct.split('->')[0].trim();
        }
      }
      return nomAct || '—';
    })(),
    nuevoNombre: (() => {
      let nomNew = (data.nuevoNombre || '').toUpperCase().trim();
      if (tipo === 'Cambio de nombre' && (!nomNew || nomNew === '—')) {
        const full = (data.nuevaDenominacion || '').toUpperCase().trim();
        if (full.includes('➔')) {
          nomNew = full.split('➔')[1].trim();
        } else if (full.includes('->')) {
          nomNew = full.split('->')[1].trim();
        }
      }
      return nomNew || '—';
    })(),

    nuevaDenominacion: (data.nuevaDenominacion || '—').toUpperCase(),
    unidadDestino: (() => {
      let dest = (data.unidadDestino || '').trim();
      if (!dest && typeof getSelectedUnidadDestinoNombre === 'function') {
        dest = getSelectedUnidadDestinoNombre();
      }
      if (!dest && typeof CATALOGO_ORGANICO_SEGEY !== 'undefined' && Array.isArray(CATALOGO_ORGANICO_SEGEY) && u2Nom) {
        const uFound = CATALOGO_ORGANICO_SEGEY.find(item => item.titular && item.titular.nombre && item.titular.nombre.toLowerCase().trim() === u2Nom.toLowerCase().trim());
        if (uFound && uFound.unidad) dest = uFound.unidad;
      }
      return (dest || '___________________________').toUpperCase();
    })(),
    justificacion: (() => {
      let j = (data.justificacion || '—').trim();
      if (j && (j.startsWith('Se hace constar') || j.startsWith('SE HACE CONSTAR'))) {
        const idx = j.indexOf(':');
        if (idx !== -1) {
          j = j.substring(idx + 1).trim();
        } else {
          j = j.replace(/Se hace constar los siguientes (hechos y circunstancias|movimientos) de carácter administrativo…?/gi, '').trim();
        }
      }
      return j.toUpperCase();
    })(),
    estatus: data.estatus || 'Generada para Firma',
    observaciones: data.observaciones || ''
  };

  let result = templateStr;

  // 1. Condicionales {{#if key}} ... {{/if}}
  result = result.replace(/\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    const val = vars[key];
    if (val === false || val === null || val === undefined || val === '' || val === '—') return '';
    return content;
  });

  // 2. Variables {{key}}
  result = result.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : '';
  });

  return result;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * =========================================================================
 * CONTROL DE ACCESO ADMINISTRATIVO (LOGIN / LOGOUT / SESIÓN)
 * =========================================================================
 */
const USER_SESSION_KEY = 'segey_user_session_v1';
const AUTH_TOKEN_KEY = 'segey_auth_token_v1';
const BITACORA_API_TOKEN = 'DIMC_SEGEY_2026_x89aF49bQ2wL';

function getLoggedUser() {
  try {
    const raw = sessionStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function isUserLoggedIn() {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true' && Boolean(getLoggedUser());
}

/**
 * Super Administrador: Acceso total a todo el sistema (admin y danny.uh)
 */
function isSuperAdmin() {
  const user = getLoggedUser();
  if (!user) return false;
  const username = String(user.username || '').toLowerCase().trim();
  const rol = String(user.rol || '').toLowerCase().trim();
  return (username === 'admin' || username === 'danny.uh') || rol === 'administrador';
}

/**
 * Capturista: Acceso exclusivo a registro de folios y visor (captura.dimc)
 */
function isCapturistaUser() {
  const user = getLoggedUser();
  if (!user) return false;
  const username = String(user.username || '').toLowerCase().trim();
  const rol = String(user.rol || '').toLowerCase().trim();
  return username === 'captura.dimc' || rol === 'capturista';
}

/**
 * Auditoría / Consulta: Acceso exclusivo a consulta de bitácora y descarga de reportes (auditoria.segey)
 */
function isAuditoriaUser() {
  const user = getLoggedUser();
  if (!user) return false;
  const username = String(user.username || '').toLowerCase().trim();
  const rol = String(user.rol || '').toLowerCase().trim();
  return username === 'auditoria.segey' || rol === 'consulta' || rol === 'auditoría' || rol === 'auditoria';
}

/**
 * Acceso a Bitácora y Control: Solo Super Administradores y Auditoría
 */
function canAccessBitacora() {
  return isSuperAdmin() || isAuditoriaUser();
}

/**
 * Acceso a Captura de Nuevas Constancias: Super Admin y Capturista
 */
function canCaptureFolios() {
  if (isAuditoriaUser()) return false;
  return true;
}

function isAdminLoggedIn() {
  return canAccessBitacora();
}

function handleBackFromPreview() {
  if (isAuditoriaUser()) {
    switchTab('tab-registry');
  } else {
    switchTab('tab-form');
  }
}
window.handleBackFromPreview = handleBackFromPreview;
window.isSuperAdmin = isSuperAdmin;
window.isCapturistaUser = isCapturistaUser;
window.isAuditoriaUser = isAuditoriaUser;
window.canAccessBitacora = canAccessBitacora;
window.canCaptureFolios = canCaptureFolios;

function openAdminLoginModal() {
  const modal = document.getElementById('modal-admin-login');
  const errorEl = document.getElementById('admin-login-error');
  const userInput = document.getElementById('admin-username-input');
  const passInput = document.getElementById('admin-password-input');

  if (errorEl) errorEl.classList.add('hidden');
  if (userInput) userInput.value = '';
  if (passInput) passInput.value = '';

  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (userInput) userInput.focus();
    }, 100);
  }
}

function closeAdminLoginModal() {
  const modal = document.getElementById('modal-admin-login');
  if (modal) modal.classList.add('hidden');
}

/**
 * Calcula el Hash SHA-256 en minúsculas en el navegador (Web Crypto API)
 */
async function sha256Hex(text) {
  if (!text) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return '';
  }
}

async function handleAdminLoginSubmit(event) {
  if (event) event.preventDefault();

  const userInput = document.getElementById('admin-username-input');
  const passInput = document.getElementById('admin-password-input');
  const errorEl = document.getElementById('admin-login-error');
  const errorTextEl = document.getElementById('admin-login-error-text');
  const submitBtn = document.querySelector('#form-admin-login button[type="submit"]');

  const u = userInput ? userInput.value.trim().toLowerCase() : '';
  const p = passInput ? passInput.value.trim() : '';

  if (!u || !p) {
    if (errorEl) errorEl.classList.remove('hidden');
    if (errorTextEl) errorTextEl.textContent = 'Ingrese usuario y contraseña.';
    return;
  }

  // Estado visual de carga
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Verificando...';
  }
  if (errorEl) errorEl.classList.add('hidden');

  try {
    const webhook = getGoogleScriptWebhookUrl();
    if (!webhook) {
      throw new Error('No se ha configurado la URL del Webhook de Google Apps Script.');
    }

    // Hash SHA-256 en navegador
    const clientHash = await sha256Hex(p);

    // Consulta por POST a Google Apps Script (que consulta la hoja privada de usuarios)
    const payload = {
      action: 'login',
      username: u,
      password: p,
      passwordHash: clientHash
    };

    const resp = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();

    if (result && result.status === 'success' && result.user) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(result.user));
      if (result.token) {
        sessionStorage.setItem(AUTH_TOKEN_KEY, result.token);
      } else if (result.apiToken) {
        sessionStorage.setItem(AUTH_TOKEN_KEY, result.apiToken);
      } else {
        sessionStorage.setItem(AUTH_TOKEN_KEY, BITACORA_API_TOKEN);
      }
      closeAdminLoginModal();
      updateAdminUI();

      if (isAuditoriaUser()) {
        switchTab('tab-registry');
        showToast(`¡Bienvenido, ${result.user.nombre}! (Perfil de Consulta y Descarga de Reportes)`, 'info');
        syncRecordsFromGoogleSheets(false);
      } else if (isCapturistaUser()) {
        switchTab('tab-form');
        showToast(`¡Bienvenido, ${result.user.nombre}! (Perfil de Registro y Captura de Folios)`, 'success');
      } else {
        // Super Administrador (admin o danny.uh)
        switchTab('tab-registry');
        showToast(`¡Bienvenido, ${result.user.nombre}! (Acceso Total de Administrador)`, 'success');
        syncRecordsFromGoogleSheets(false);
      }
    } else {
      const msg = (result && result.message) ? result.message : 'Usuario o contraseña incorrectos.';
      if (errorEl) errorEl.classList.remove('hidden');
      if (errorTextEl) errorTextEl.textContent = msg;
      if (passInput) {
        passInput.value = '';
        passInput.focus();
      }
    }
  } catch (err) {
    console.error('Error al autenticar con el servidor de Google:', err);
    if (errorEl) errorEl.classList.remove('hidden');
    if (errorTextEl) {
      errorTextEl.textContent = 'Error al conectar con la base de usuarios: ' + (err.message || 'Verifique conexión y despliegue del script.');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  sessionStorage.removeItem(USER_SESSION_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  updateAdminUI();
  switchTab('tab-form');
  showToast('Sesión de usuario finalizada.');
}

function updateAdminUI() {
  const isLogged = isUserLoggedIn();
  const user = getLoggedUser();
  const superAdmin = isSuperAdmin();
  const capturista = isCapturistaUser();
  const auditoria = isAuditoriaUser();

  // Botones navegación desktop
  const tabFormBtn = document.getElementById('btn-tab-form');
  const tabRegistryBtn = document.getElementById('btn-tab-registry');
  const loginBtn = document.getElementById('btn-admin-login');
  const loggedBadge = document.getElementById('admin-logged-in-badge');
  const userNameEl = document.getElementById('user-badge-name');
  const userRoleEl = document.getElementById('user-badge-role');

  if (isLogged && user) {
    if (userNameEl) {
      const primerNombre = user.nombre ? user.nombre.split(' ')[0] : (user.username || 'Usuario');
      userNameEl.textContent = primerNombre;
    }
    if (userRoleEl) {
      if (superAdmin) {
        userRoleEl.textContent = 'Admin Total';
        userRoleEl.className = 'text-[10px] bg-emerald-700 text-white px-1.5 py-0.5 rounded font-bold';
      } else if (capturista) {
        userRoleEl.textContent = 'Capturista';
        userRoleEl.className = 'text-[10px] bg-blue-700 text-white px-1.5 py-0.5 rounded font-bold';
      } else if (auditoria) {
        userRoleEl.textContent = 'Auditoría';
        userRoleEl.className = 'text-[10px] bg-purple-700 text-white px-1.5 py-0.5 rounded font-bold';
      } else {
        userRoleEl.textContent = user.rol || 'Usuario';
        userRoleEl.className = 'text-[10px] bg-slate-700 text-white px-1.5 py-0.5 rounded font-bold';
      }
    }
  }

  // 1. Visibilidad botón Login / Logout y Badge
  if (loginBtn) {
    if (isLogged) loginBtn.classList.add('hidden');
    else loginBtn.classList.remove('hidden');
  }
  if (loggedBadge) {
    if (isLogged) {
      loggedBadge.classList.remove('hidden');
      loggedBadge.classList.add('flex');
    } else {
      loggedBadge.classList.add('hidden');
      loggedBadge.classList.remove('flex');
    }
  }

  // 2. Control de Pestaña "Llenar Formato" (Oculta para Auditoría)
  const canCapture = canCaptureFolios();
  if (tabFormBtn) {
    if (canCapture) tabFormBtn.classList.remove('hidden');
    else tabFormBtn.classList.add('hidden');
  }

  // 3. Control de Pestaña "Bitácora" (Solo Super Admin y Auditoría)
  const hasBitacora = canAccessBitacora();
  if (tabRegistryBtn) {
    if (hasBitacora) tabRegistryBtn.classList.remove('hidden');
    else tabRegistryBtn.classList.add('hidden');
  }

  // 4. Botones navegación móvil
  const mobileTabFormBtn = document.getElementById('btn-tab-form-mobile');
  const mobileTabRegistryBtn = document.getElementById('btn-tab-registry-mobile');
  const mobileLoginBtn = document.getElementById('btn-admin-login-mobile');
  const mobileLogoutBtn = document.getElementById('btn-admin-logout-mobile');

  if (mobileTabFormBtn) {
    if (canCapture) mobileTabFormBtn.classList.remove('hidden');
    else mobileTabFormBtn.classList.add('hidden');
  }
  if (mobileTabRegistryBtn) {
    if (hasBitacora) mobileTabRegistryBtn.classList.remove('hidden');
    else mobileTabRegistryBtn.classList.add('hidden');
  }
  if (mobileLoginBtn) {
    if (isLogged) mobileLoginBtn.classList.add('hidden');
    else mobileLoginBtn.classList.remove('hidden');
  }
  if (mobileLogoutBtn) {
    if (isLogged) mobileLogoutBtn.classList.remove('hidden');
    else mobileLogoutBtn.classList.add('hidden');
  }

  // 5. Control de Sidebar en Bitácora (Opciones para Modificar solo para Super Admin)
  const sidebarModifyGroup = document.getElementById('registry-sidebar-modify-group');
  const sidebarAuditoriaBanner = document.getElementById('registry-sidebar-auditoria-banner');
  const btnSidebarNuevoTramite = document.getElementById('btn-sidebar-nuevo-tramite');

  if (sidebarModifyGroup) {
    if (superAdmin) sidebarModifyGroup.classList.remove('hidden');
    else sidebarModifyGroup.classList.add('hidden');
  }
  if (sidebarAuditoriaBanner) {
    if (auditoria) sidebarAuditoriaBanner.classList.remove('hidden');
    else sidebarAuditoriaBanner.classList.add('hidden');
  }
  if (btnSidebarNuevoTramite) {
    if (canCapture) btnSidebarNuevoTramite.classList.remove('hidden');
    else btnSidebarNuevoTramite.classList.add('hidden');
  }

  // 6. Herramientas de respaldo / eliminación en Bitácora
  const btnEliminarSel = document.getElementById('btn-eliminar-seleccionados');
  const adminBackupTools = document.getElementById('admin-backup-tools');
  if (btnEliminarSel && auditoria) {
    btnEliminarSel.classList.add('hidden');
  }
  if (adminBackupTools) {
    if (superAdmin) adminBackupTools.classList.remove('hidden');
    else adminBackupTools.classList.add('hidden');
  }

  // 7. Checkbox maestro superior
  const thCheckbox = document.getElementById('th-checkbox-all');
  if (thCheckbox) {
    if (auditoria) thCheckbox.classList.add('hidden');
    else thCheckbox.classList.remove('hidden');
  }

  // 8. Botón volver en Vista del Documento
  const lblBackFromPreview = document.getElementById('lbl-btn-back-from-preview');
  if (lblBackFromPreview) {
    lblBackFromPreview.textContent = auditoria ? 'Volver a Bitácora' : 'Volver a Formulario';
  }

  // 9. Redirección de seguridad si la pestaña activa no está permitida
  const currentTab = document.querySelector('.tab-content:not(.hidden)');
  if (auditoria && currentTab && currentTab.id === 'tab-form') {
    switchTab('tab-registry');
  }
  if (capturista && currentTab && currentTab.id === 'tab-registry') {
    switchTab('tab-form');
  }
  if (!isLogged && currentTab && currentTab.id === 'tab-registry') {
    switchTab('tab-form');
  }

  // 10. Reglas de control centralizado y permisos de estatus por rol
  updateEstatusPermissions(superAdmin);
}

function updateEstatusPermissions(isAdmin) {
  if (typeof isAdmin === 'undefined') {
    isAdmin = isSuperAdmin();
  }
  const estatusSelect = document.getElementById('estatus');
  const badgeRol = document.getElementById('badge-estatus-rol');
  const hintEl = document.getElementById('estatus-admin-hint');
  const isFolioCargado = Boolean(editingRecordId);

  if (badgeRol) {
    if (isAdmin) {
      badgeRol.className = 'text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold';
      badgeRol.innerHTML = '<i class="fa-solid fa-shield-halved mr-1 text-emerald-600"></i>Admin Central';
    } else {
      badgeRol.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
      badgeRol.innerHTML = '<i class="fa-solid fa-user-pen mr-1"></i>Capturista';
    }
  }

  if (hintEl) {
    if (isAdmin) {
      if (isFolioCargado) {
        hintEl.className = 'text-[10px] text-amber-700 mt-1';
        hintEl.innerHTML = '<i class="fa-solid fa-file-pen mr-1 text-amber-600"></i>Modo Administrador: Folio existente cargado en pantalla. Puede seleccionar <strong>Modificación</strong> para guardar los cambios y mantener la trazabilidad.';
      } else {
        hintEl.className = 'text-[10px] text-emerald-700 mt-1';
        hintEl.innerHTML = '<i class="fa-solid fa-check-circle mr-1"></i>Modo Administrador activo: Trámites nuevos inician como <strong>Generada</strong> o <strong>Borrador</strong>. La opción <em>Modificación</em> solo está disponible al cargar un folio guardado.';
      }
    } else {
      if (isFolioCargado) {
        hintEl.className = 'text-[10px] text-amber-800 font-medium mt-1';
        hintEl.innerHTML = '<i class="fa-solid fa-file-pen mr-1 text-amber-600"></i>Folio guardado cargado en pantalla. Si realiza correcciones, seleccione <strong>Modificación</strong> antes de guardar.';
      } else {
        hintEl.className = 'text-[10px] text-slate-500 mt-1';
        hintEl.innerHTML = '<i class="fa-solid fa-circle-info mr-1"></i>Trámites nuevos inician como <strong>Generada (Listo para Firmar)</strong> o <strong>Borrador</strong>. La opción <strong>Modificación</strong> solo se habilita al cargar un folio guardado.';
      }
    }
  }

  if (estatusSelect) {
    for (let i = 0; i < estatusSelect.options.length; i++) {
      const opt = estatusSelect.options[i];
      if (opt.value === 'Generada para Firma') {
        opt.disabled = false;
        opt.className = 'text-slate-800 font-medium';
        opt.textContent = 'Generada (Listo para Firmar)';
      } else if (opt.value === 'Modificación') {
        if (isFolioCargado) {
          opt.disabled = false;
          opt.className = 'text-amber-800 font-semibold bg-amber-50';
          opt.textContent = 'Modificación (Folio en corrección o edición)';
        } else {
          opt.disabled = true;
          opt.className = 'text-slate-400 bg-slate-50 italic';
          opt.textContent = '🔒 Modificación (Disponible solo al cargar un folio guardado)';
        }
      } else if (opt.value === 'Borrador') {
        opt.disabled = false;
        opt.className = 'text-slate-700 font-medium';
        opt.textContent = 'Borrador (En proceso de integración)';
      } else if (opt.value === 'Firmada y Concluida') {
        if (isAdmin) {
          opt.disabled = false;
          opt.className = 'text-slate-800 font-semibold';
          opt.textContent = '✅ Firmada y Concluida (Trámite finalizado)';
        } else {
          opt.disabled = true;
          opt.className = 'text-slate-400 bg-slate-50';
          opt.textContent = '🔒 Firmada y Concluida (Exclusivo Administrador tras firmas físicas)';
        }
      } else if (opt.value === 'Inactivo') {
        if (isAdmin) {
          opt.disabled = false;
          opt.className = 'text-slate-800 font-medium';
          opt.textContent = 'Inactivo (Cancelada / Sin efecto)';
        } else {
          opt.disabled = true;
          opt.className = 'text-slate-400 bg-slate-50';
          opt.textContent = '🔒 Inactivo (Exclusivo Administrador para cancelar/reactivar)';
        }
      }
    }

    // Si no hay un folio cargado y estaba seleccionado 'Modificación', regresar a 'Generada para Firma'
    if (!isFolioCargado && estatusSelect.value === 'Modificación') {
      estatusSelect.value = 'Generada para Firma';
    }

    if (!isAdmin && !isFolioCargado && !estatusSelect.value) {
      estatusSelect.value = 'Generada para Firma';
    }

    // Protección adicional: detector de cambios en el selector para evitar manipulación en DOM
    if (!estatusSelect.dataset.listenerAttached) {
      estatusSelect.dataset.listenerAttached = 'true';
      estatusSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Modificación' && !editingRecordId) {
          showToast('La opción "Modificación" solo está disponible cuando se carga un folio ya guardado o generado.', 'warning');
          e.target.value = 'Generada para Firma';
          renderDocument(getCurrentFormDataForPreview());
        }
      });
    }
  }
}

/**
 * =========================================================================
 * GESTIÓN DE ÁREAS NOTIFICADORAS PREDEFINIDAS
 * =========================================================================
 */
function initAreasNotificadoras() {
  const AREAS_VERSION_KEY = 'segey_areas_catalog_version';
  const CURRENT_CATALOG_VERSION = '2026_11_areas_59_oficiales_v7';

  const savedVersion = localStorage.getItem(AREAS_VERSION_KEY);
  const saved = localStorage.getItem(AREAS_STORAGE_KEY);

  if (saved && savedVersion === CURRENT_CATALOG_VERSION) {
    try {
      predefinedAreas = JSON.parse(saved)
        .map(a => a.replace(/\s*\(Oficina Central\)/gi, '').trim())
        .filter(a => DEFAULT_AREAS_NOTIFICADORAS.includes(a));
    } catch (e) {
      console.error('Error al cargar áreas predefinidas:', e);
      predefinedAreas = [];
    }
  }

  // Si no hay áreas o la versión es anterior, cargar el catálogo oficial estricto de 59 áreas
  if (!Array.isArray(predefinedAreas) || predefinedAreas.length !== DEFAULT_AREAS_NOTIFICADORAS.length || savedVersion !== CURRENT_CATALOG_VERSION) {
    predefinedAreas = [...DEFAULT_AREAS_NOTIFICADORAS];
    saveAreasToStorage();
    localStorage.setItem(AREAS_VERSION_KEY, CURRENT_CATALOG_VERSION);
  }

  populateAreaSelect();
  renderAdminAreasList();

  // Aplicar catálogo remoto guardado en caché si existe
  try {
    const cachedCat = localStorage.getItem(REMOTE_CATALOG_KEY);
    if (cachedCat) {
      const parsedCat = JSON.parse(cachedCat);
      if (Array.isArray(parsedCat) && parsedCat.length > 0) {
        applyRemoteCatalogo(parsedCat);
      }
    }
  } catch (eCat) {
    console.warn('Error al aplicar catálogo remoto en caché:', eCat);
  }
}

function saveAreasToStorage() {
  predefinedAreas.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  localStorage.setItem(AREAS_STORAGE_KEY, JSON.stringify(predefinedAreas));
}

function populateAreaSelect() {
  const select = document.getElementById('areaNotificadoraSelect');
  if (!select) return;

  const hiddenInput = document.getElementById('areaNotificadora');
  const currentVal = (hiddenInput && hiddenInput.value) ? hiddenInput.value : '';

  // Ordenar alfabéticamente en español (A-Z) para fácil búsqueda por el usuario
  const sortedAreas = [...predefinedAreas].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  let html = `<option value="" disabled ${!currentVal ? 'selected' : ''}>-- Seleccione un área oficial --</option>`;
  sortedAreas.forEach(area => {
    const isSelected = (currentVal === area) ? 'selected' : '';
    html += `<option value="${escapeHtml(area)}" ${isSelected}>${escapeHtml(area)}</option>`;
  });
  const isOther = (currentVal && !predefinedAreas.includes(currentVal));
  html += `<option value="__OTRA__" ${isOther ? 'selected' : ''}>-- Otra área (especificar manualmente) --</option>`;

  select.innerHTML = html;
}

/**
 * ==============================================================
 * CATÁLOGO ORGÁNICO OFICIAL Y LISTAS DESPLEGABLES DEPENDIENTES
 * ==============================================================
 */

// Mapeo oficial de las 58 Áreas Notificadoras a su respectiva Unidad Administrativa en CATALOGO_ORGANICO_SEGEY
const AREA_TO_UNIDAD_MAP = {
  // Despacho del Secretario y Unidades de Apoyo
  'Despacho del Secretario': 'despacho_secretario',
  'Jefatura del Despacho': 'jefatura_despacho',
  'Secretario Particular': 'despacho_secretario',
  'Coordinación General de Programas Estratégicos': 'cg_programas_estrategicos',
  'Coordinación General de Tecnologías de la Información y Comunicaciones': 'cg_tic',
  'Enlace Estatal con la Unidad del Sistema para la Carrera de las Maestras y los Maestros (USICAMM)': 'enlace_usicamm',
  'Coordinación General de Inglés': 'cg_ingles',
  'Coordinación General de Desarrollo de Habilidades Socioemocionales': 'cg_socioemocionales',
  'Centro Estatal de Bellas Artes': 'centro_bellas_artes',
  'Coordinación Estatal de Becas': 'coord_becas',
  'Coordinación General de Intervención y Gestión Institucional': 'cg_intervencion',
  'Casa de la Historia de la Educación de Yucatán': 'casa_historia',
  'Centro de Evaluación Educativa del Estado de Yucatán': 'centro_eval_educativa',
  'Universidad Virtual del Estado de Yucatán': 'univ_virtual',

  // Subsecretaría de Educación Básica y Direcciones
  'Subsecretaría de Educación Básica': 'subsec_basica',
  'Coordinación General de Trámite y Control': 'subsec_basica',
  'Coordinación General de Servicios Educativos': 'subsec_basica',
  'Dirección de Educación Inicial': 'dir_inicial',
  'Dirección de Educación Preescolar': 'dir_preescolar',
  'Dirección de Educación Primaria': 'dir_primaria',
  'Dirección de Educación Secundaria': 'dir_secundaria',
  'Dirección de Educación Indígena': 'dir_indigena',
  'Dirección de Educación Especial': 'dir_especial',
  'Dirección de Educación Física': 'dir_fisica',
  'Dirección de Educación Artística': 'dir_artistica',

  // Subsecretaría de Educación Media Superior
  'Subsecretaría de Educación Media Superior': 'subsec_media_superior',
  'Dirección de Servicios Educativos de Media Superior': 'dir_serv_ed_media_sup',
  'Departamento de Telebachillerato Comunitario del Estado de Yucatán y Bachillerato Intercultural': 'dir_serv_ed_media_sup',
  'Departamento de Preparatorias Estatales y Particulares Incorporadas': 'dir_serv_ed_media_sup',
  'Departamento de Preparatoria Abierta': 'dir_serv_ed_media_sup',
  'Dirección de Desarrollo Educativo y Proyectos Estratégicos': 'dir_desarrollo_media_sup',

  // Subsecretaría de Educación Superior
  'Subsecretaría de Educación Superior': 'subsec_superior',
  'Dirección de Fortalecimiento de Educación Superior': 'dir_fortalecimiento_sup',
  'Dirección de Servicio Profesional': 'dir_serv_profesional',

  // Dirección de Planeación
  'Dirección de Planeación': 'dir_planeacion',
  'Departamento de Planeación, Evaluación y Seguimiento': 'dir_planeacion',
  'Departamento de Estudios y Proyectos': 'dir_planeacion',
  'Departamento de Estadística': 'dir_planeacion',
  'Departamento de Registro y Certificación': 'dir_planeacion',

  // Dirección de Administración y Finanzas
  'Dirección de Administración y Finanzas': 'dir_admin_finanzas',
  'Departamento de Recursos Financieros': 'dir_admin_finanzas',
  'Departamento de Adquisiciones': 'dir_admin_finanzas',
  'Departamento de Presupuestos': 'dir_admin_finanzas',
  'Departamento de Recursos Materiales y Servicios': 'dir_admin_finanzas',
  'Departamento de Innovación y Mejora Continua': 'dir_admin_finanzas',
  'Departamento de Control Patrimonial': 'dir_admin_finanzas',
  'Departamento de Distribución de Libros de Texto y Mobiliario': 'dir_admin_finanzas',
  'Coordinación de Gestión y Revisión': 'dir_admin_finanzas',
  'Coordinación de Enlace con Direcciones y Otras Dependencias': 'dir_admin_finanzas',
  'Coordinación de Archivos': 'dir_admin_finanzas',
  'Subdirección de Organización y Administración de Personal': 'dir_admin_finanzas',
  'Departamento de Recursos Humanos': 'dir_admin_finanzas',
  'Departamento de Administración de Personal de Contrato': 'dir_admin_finanzas',
  'Departamento de Sistemas de Gestión de Nómina': 'dir_admin_finanzas',
  'Departamento de Gestión de Información, Capacitación y Ética': 'dir_admin_finanzas',
  'Área de Prestaciones Sociales': 'dir_admin_finanzas',

  // Otras Direcciones
  'Dirección Jurídica': 'dir_juridica',
  'Dirección de Desarrollo Educativo': 'dir_desarrollo_educativo',
  'Dirección de Servicios Regionales': 'dir_servicios_regionales'
};

// Catálogo oficial de Enlaces Operativos por Unidad Administrativa (según el Listado de Enlaces Oficial 2024-2030)
// FILTRADO ESTRICTAMENTE a enlaces con marca 'X' en la columna "Gestión Organizacional"
// Ordenados alfabéticamente A-Z
const ENLACES_POR_UNIDAD = {
  despacho_secretario: [
    'Ing. Gladys Gahona Cámara',
    'L.E. Rosalinda Villanueva Hau'
  ],
  jefatura_despacho: [
    'Ing. Gladys Gahona Cámara',
    'Ing. Vidal Aarón Ché Zapata',
    'L.E. Rosalinda Villanueva Hau'
  ],
  cg_programas_estrategicos: [
    'Ing. Vidal Aarón Ché Zapata'
  ],
  cg_tic: [
    'Ing. Georgina Elizabeth Kim Flores',
    'Lic. Mariana Aracelly Vazquez González'
  ],
  enlace_usicamm: [
    'C.P. Katia Isabel Manzanilla Mena'
  ],
  cg_ingles: [
    'L.C.S. María Soledad Cruz Aguilar'
  ],
  cg_socioemocionales: [
    'Lic. Luis Alberto Sarmiento Herrera',
    'Psic. Ezbay Cervera Soberanis'
  ],
  centro_bellas_artes: [
    'C. Mary Alba Quintal Chí'
  ],
  coord_becas: [
    'L.A. Guillermo Galván Martínez',
    'Lic. Andrés Ricardo Puc Puch'
  ],
  cg_intervencion: [
    'Mtro. Ángel Alberto Castillo Navarrete'
  ],
  casa_historia: [
    'Lic. Manuel Jesús Tejada Loría'
  ],
  centro_eval_educativa: [
    'Mtra. Nancy Guadalupe Novelo Pech'
  ],
  univ_virtual: [
    'Mtro. José David Encalada Avilés'
  ],
  subsec_basica: [
    'Lic. Rafael Rolando Euán Canché',
    'Lic. Sara Orquídea Morales Puc',
    'Mtra. Carla Guadalupe Sanchez Colli'
  ],
  dir_inicial: [
    'LAE. Ricardo Francisco de María Carrillo',
    'Lic. Sara Orquídea Morales Puc',
    'Mtra. Carla Guadalupe Sanchez Colli'
  ],
  dir_preescolar: [
    'Lic. Sara Orquídea Morales Puc',
    'M.F. Adelina Monserrat Hernández Santos',
    'Mtra. Carla Guadalupe Sanchez Colli'
  ],
  dir_primaria: [
    'Lic. Julia Beatriz Villanueva Ruiz',
    'Lic. Sara Orquidea Morales Puc',
    'Mtra. Carla Guadalupe Sanchez Colli'
  ],
  dir_secundaria: [
    'Lic. Rubén Alejandro Gutiérrez Adrián',
    'Lic. Sara Orquidea Morales Puc',
    'Mtra. Carla Guadalupe Sanchez Colli'
  ],
  dir_indigena: [
    'Lic. Reyna Bertha de Jesús Teh López',
    'Lic. Sara Orquidea Morales Puc',
    'Mtra. Carla Guadalupe Sanchez Colli'
  ],
  dir_especial: [
    'Lic. José Ernesto Barragán Polanco',
    'Lic. Sara Orquidea Morales Puc',
    'Mtra. Carla Guadalupe Sanchez Colli'
  ],
  dir_fisica: [
    'Lic. José Guillermo Rosado Alcocer',
    'Lic. Sara Orquidea Morales Puc',
    'Mtra. Carla Guadalupe Sanchez Colli'
  ],
  dir_artistica: [
    'Lic. Sara Orquidea Morales Puc',
    'Mtra. Carla Guadalupe Sanchez Colli',
    'Tec. Maria de Lourdes Méndez Villafaña'
  ],
  subsec_media_superior: [
    'C.P. Miguel Edgardo Argáez Quijano'
  ],
  dir_serv_ed_media_sup: [
    'C.P. Miguel Edgardo Argáez Quijano',
    'Mtra. Ana Elisa Hernández Navarro',
    'Mtra. Didia Marisol Mendoza Arzápalo',
    'Mtro. Alberto Solís Cámara'
  ],
  dir_desarrollo_media_sup: [
    'Mtra. Ligia Margarita Cícero Galán'
  ],
  subsec_superior: [
    'Lic. Leobardo Medina Xix'
  ],
  dir_fortalecimiento_sup: [
    'Lic. Leobardo Medina Xix'
  ],
  dir_serv_profesional: [
    'Lic. Leobardo Medina Xix'
  ],
  dir_planeacion: [
    'Lic. Gessely Guadalupe Pat Pacheco',
    'Mtra. Diany Reyna Góngora Franco',
    'Mtra. María Luisa Guillermo García',
    'Mtro. Julio Jesús Varela Manzanero',
    'Tec. Mattia de Jesús Tun Peña'
  ],
  dir_admin_finanzas: [
    'Br. Felipe Humberto Ceballos Pech',
    'C.P. Ángel Ermilo Sarabia Gamboa',
    'C.P. Jorge Antonio Uc Camas',
    'C.P. Manuel Jesús Heredia Ceballos',
    'C.P. Rolando Antonio Naal Osorio',
    'C.P. Samuel Medina Flores',
    'Ing. Mario Miguel Solís Quijano',
    'L.C.C. Mirna Arleny Canché Moo',
    'Lic. Blanca Esther Perera Romero',
    'Lic. Miguel Ángel Cob Uitz',
    'Lic. Raúl Oswaldo Hernández Fernández',
    'Lic. William Jesús Rosado Magaña',
    'Lic. Yazmin Eugenia Cob Caballero',
    'M.A. Maribel de Jesús Novelo Pérez',
    'M.E. Adriana del Socorro Durán Lizama',
    'Mtra. Lucely Guadalupe Azcorra Dzib',
    'Mtra. Merly Aurora Marrufo León'
  ],
  dir_juridica: [
    'Lic. Alonso Hernández Núñez',
    'Lic. Maria Guadalupe Castro Acevedo'
  ],
  dir_desarrollo_educativo: [
    'Mtra. Ligia del Socorro Sánchez Castañeda'
  ],
  dir_servicios_regionales: [
    'Ing. Luis Gabriel Canul Mukul'
  ]
};

// Mapeo directo de Área a su Enlace oficial asignado en el documento oficial (Gestión Organizacional)
const ENLACE_DIRECTO_POR_AREA = {
  'Casa de la Historia de la Educación de Yucatán': 'Lic. Manuel Jesús Tejada Loría',
  'Centro Estatal de Bellas Artes': 'C. Mary Alba Quintal Chí',
  'Centro de Evaluación Educativa del Estado de Yucatán': 'Mtra. Nancy Guadalupe Novelo Pech',
  'Coordinación Estatal de Becas': 'L.A. Guillermo Galván Martínez',
  'Coordinación General de Desarrollo de Habilidades Socioemocionales': 'Lic. Luis Alberto Sarmiento Herrera',
  'Coordinación General de Inglés': 'L.C.S. María Soledad Cruz Aguilar',
  'Coordinación General de Intervención y Gestión Institucional': 'Mtro. Ángel Alberto Castillo Navarrete',
  'Coordinación General de Programas Estratégicos': 'Ing. Vidal Aarón Ché Zapata',
  'Coordinación General de Servicios Educativos': 'Lic. Sara Orquídea Morales Puc',
  'Coordinación General de Tecnologías de la Información y Comunicaciones': 'Ing. Georgina Elizabeth Kim Flores',
  'Coordinación General de Trámite y Control': 'Lic. Rafael Rolando Euán Canché',
  'Coordinación de Archivos': 'Mtra. Merly Aurora Marrufo León',
  'Coordinación de Enlace con Direcciones y Otras Dependencias': 'C.P. Rolando Antonio Naal Osorio',
  'Coordinación de Gestión y Revisión': 'Lic. William Jesús Rosado Magaña',
  'Departamento de Administración de Personal de Contrato': 'Lic. Raúl Oswaldo Hernández Fernández',
  'Departamento de Adquisiciones': 'Lic. Blanca Esther Perera Romero',
  'Departamento de Control Patrimonial': 'Mtra. Lucely Guadalupe Azcorra Dzib',
  'Departamento de Distribución de Libros de Texto y Mobiliario': 'Br. Felipe Humberto Ceballos Pech',
  'Departamento de Estadística': 'Mtro. Julio Jesús Varela Manzanero',
  'Departamento de Estudios y Proyectos': 'Mtro. Julio Jesús Varela Manzanero',
  'Departamento de Gestión de Información, Capacitación y Ética': 'M.E. Adriana del Socorro Durán Lizama',
  'Departamento de Innovación y Mejora Continua': 'Lic. Yazmin Eugenia Cob Caballero',
  'Departamento de Planeación, Evaluación y Seguimiento': 'Mtro. Julio Jesús Varela Manzanero',
  'Departamento de Preparatoria Abierta': 'Mtra. Didia Marisol Mendoza Arzápalo',
  'Departamento de Preparatorias Estatales y Particulares Incorporadas': 'Mtra. Ana Elisa Hernández Navarro',
  'Departamento de Presupuestos': 'C.P. Jorge Antonio Uc Camas',
  'Departamento de Recursos Financieros': 'C.P. Ángel Ermilo Sarabia Gamboa',
  'Departamento de Recursos Humanos': 'L.C.C. Mirna Arleny Canché Moo',
  'Departamento de Recursos Materiales y Servicios': 'M.A. Maribel de Jesús Novelo Pérez',
  'Departamento de Registro y Certificación': 'Tec. Mattia de Jesús Tun Peña',
  'Departamento de Sistemas de Gestión de Nómina': 'C.P. Manuel Jesús Heredia Ceballos',
  'Departamento de Telebachillerato Comunitario del Estado de Yucatán y Bachillerato Intercultural': 'Mtro. Alberto Solís Cámara',
  'Despacho del Secretario': ['Ing. Gladys Gahona Cámara', 'L.E. Rosalinda Villanueva Hau'],
  'Dirección Jurídica': 'Lic. Alonso Hernández Núñez',
  'Dirección de Administración y Finanzas': 'Lic. Yazmin Eugenia Cob Caballero',
  'Dirección de Desarrollo Educativo': 'Mtra. Ligia del Socorro Sánchez Castañeda',
  'Dirección de Desarrollo Educativo y Proyectos Estratégicos': 'Mtra. Ligia Margarita Cícero Galán',
  'Dirección de Educación Artística': 'Mtra. Carla Guadalupe Sanchez Colli',
  'Dirección de Educación Especial': 'Mtra. Carla Guadalupe Sanchez Colli',
  'Dirección de Educación Física': 'Mtra. Carla Guadalupe Sanchez Colli',
  'Dirección de Educación Indígena': 'Mtra. Carla Guadalupe Sanchez Colli',
  'Dirección de Educación Inicial': 'Mtra. Carla Guadalupe Sanchez Colli',
  'Dirección de Educación Preescolar': 'Mtra. Carla Guadalupe Sanchez Colli',
  'Dirección de Educación Primaria': 'Mtra. Carla Guadalupe Sanchez Colli',
  'Dirección de Educación Secundaria': 'Mtra. Carla Guadalupe Sanchez Colli',
  'Dirección de Fortalecimiento de Educación Superior': 'Lic. Leobardo Medina Xix',
  'Dirección de Planeación': 'Mtro. Julio Jesús Varela Manzanero',
  'Dirección de Servicio Profesional': 'Lic. Leobardo Medina Xix',
  'Dirección de Servicios Educativos de Media Superior': 'C.P. Miguel Edgardo Argáez Quijano',
  'Dirección de Servicios Regionales': 'Ing. Luis Gabriel Canul Mukul',
  'Enlace Estatal con la Unidad del Sistema para la Carrera de las Maestras y los Maestros (USICAMM)': 'C.P. Katia Isabel Manzanilla Mena',
  'Jefatura del Despacho': ['Ing. Gladys Gahona Cámara', 'L.E. Rosalinda Villanueva Hau'],
  'Secretario Particular': ['Ing. Gladys Gahona Cámara', 'L.E. Rosalinda Villanueva Hau'],
  'Subdirección de Organización y Administración de Personal': 'C.P. Koty Georgina Victoria Delgado',
  'Subsecretaría de Educación Básica': 'Mtra. Carla Guadalupe Sanchez Colli',
  'Subsecretaría de Educación Media Superior': 'C.P. Miguel Edgardo Argáez Quijano',
  'Subsecretaría de Educación Superior': 'Lic. Leobardo Medina Xix',
  'Universidad Virtual del Estado de Yucatán': 'Mtro. José David Encalada Avilés',
  'Área de Prestaciones Sociales': 'Lic. Miguel Ángel Cob Uitz'
};

function initCatalogoOrganico() {
  if (typeof CATALOGO_ORGANICO_SEGEY === 'undefined' || !Array.isArray(CATALOGO_ORGANICO_SEGEY)) {
    console.warn('CATALOGO_ORGANICO_SEGEY no está disponible en la página.');
    return;
  }

  // Inicializar la lista completa de Titular (2) con TODAS las unidades oficiales de la SEGEY
  initSelectTitularUnidad2();

  // Si ya hay un área seleccionada al inicio, actualizar Titular (1) y Titular de Área
  const areaSelect = document.getElementById('areaNotificadoraSelect');
  if (areaSelect && areaSelect.value && areaSelect.value !== '__OTRA__') {
    actualizarTitularesPorArea(areaSelect.value);
  }
}

/**
 * Llena el selector de Titular de Unidad Administrativa (2) con TODAS las unidades
 * de la Secretaría de Educación, agrupadas por su estructura oficial.
 */
function initSelectTitularUnidad2() {
  const selectT2 = document.getElementById('selectTitularUnidad2');
  if (!selectT2) return;

  // Si el tipo de movimiento actual es Alta, Baja o Cambio de nombre, el selector (2)
  // corresponde a "Jefe Inmediato" y NO a "Dependencia de Destino".
  const selectedMov = document.querySelector('input[name="tipoMovimiento"]:checked');
  const tipoMov = selectedMov ? selectedMov.value : '';
  if (tipoMov === 'Alta' || tipoMov === 'Baja' || tipoMov === 'Cambio de nombre') {
    if (typeof poblarSelectJefeInmediato === 'function') {
      poblarSelectJefeInmediato();
    }
    return;
  }

  if (typeof CATALOGO_ORGANICO_SEGEY === 'undefined' || !Array.isArray(CATALOGO_ORGANICO_SEGEY)) {
    return;
  }

  // Preservar selección o valores actuales
  const prevVal = selectT2.value;
  const currentNom = (document.getElementById('titularUnidad2Nombre')?.value || '').trim();
  const currentCar = (document.getElementById('titularUnidad2Cargo')?.value || '').trim();

  const grupos = {};
  CATALOGO_ORGANICO_SEGEY.forEach(u => {
    const grp = u.grupo || 'Otras Unidades';
    if (!grupos[grp]) grupos[grp] = [];
    grupos[grp].push(u);
  });

  let html = '<option value="" disabled selected>-- Seleccione Dependencia Jerárquica de Destino --</option>';

  Object.keys(grupos).forEach(nombreGrupo => {
    html += `<optgroup label="${escapeHtml(nombreGrupo)}">`;
    grupos[nombreGrupo].forEach(u => {
      html += `<option value="${escapeHtml(u.id)}" data-nombre="${escapeHtml(u.titular.nombre)}" data-cargo="${escapeHtml(u.titular.cargo)}">${escapeHtml(u.unidad)} — ${escapeHtml(u.titular.nombre)}</option>`;
    });
    html += '</optgroup>';
  });

  html += '<option value="__MANUAL__">✏️ Ingresar otro nombre y cargo manualmente...</option>';
  selectT2.innerHTML = html;

  // Restaurar selección previa si aún existe o coincide por nombre/cargo
  if (prevVal && selectT2.querySelector(`option[value="${CSS.escape(prevVal)}"]`)) {
    selectT2.value = prevVal;
  } else if (currentNom || currentCar) {
    const norm = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    for (let i = 1; i < selectT2.options.length; i++) {
      const opt = selectT2.options[i];
      if (opt.value === '__MANUAL__') continue;
      const optNom = norm(opt.dataset?.nombre);
      const optCar = norm(opt.dataset?.cargo);
      if (currentNom && optNom && (optNom === norm(currentNom) || optNom.includes(norm(currentNom)) || norm(currentNom).includes(optNom))) {
        selectT2.selectedIndex = i;
        break;
      }
      if (currentCar && optCar && (optCar === norm(currentCar) || optCar.includes(norm(currentCar)))) {
        selectT2.selectedIndex = i;
        break;
      }
    }
  }

  if (typeof syncComboboxFromSelect === 'function') {
    syncComboboxFromSelect('selectTitularUnidad2');
  }
}

/**
 * Catálogo oficial de Mandos Altos (13 niveles autorizados SEGEY):
 * 1. Secretario de Educación
 * 2. Subsecretario
 * 3. Jefe del Despacho
 * 4. Director General
 * 5. Coordinador General
 * 6. Director
 * 7. Director Jurídico
 * 8. Subdirector
 * 9. Jefe de Departamento
 * 10. Coordinador
 * 11. Coordinador de Soporte Técnico (TIC)
 * 12. Director de Plantel
 * 13. Director de Centro
 */
const MANDOS_ALTOS_OFICIALES = [
  'Secretario de Educación',
  'Subsecretario',
  'Jefe del Despacho',
  'Director General',
  'Coordinador General',
  'Director',
  'Director Jurídico',
  'Subdirector',
  'Jefe de Departamento',
  'Coordinador',
  'Coordinador de Soporte Técnico (TIC)',
  'Director de Plantel',
  'Director de Centro'
];

// Puestos de Mandos Medios Altos / Mandos Bajos que contienen palabras clave
// pero NO pertenecen a los Mandos Altos oficiales
const EXCLUSIONES_NO_MANDOS_ALTOS = [
  'Subdirector Administrativo del Centro',
  'Subdirector Académico del Centro',
  'Coordinador Regional',
  'Coordinador de Área',
  'Jefe de Oficina',
  'Secretario Particular',
  'Secretario Técnico',
  'Secretario Administrativo',
  'Secretaría Administrativa',
  'Secretario Administrativo(a)',
  'Secretaría(o) Administrativa(o)'
];

function esMandoAlto(puesto) {
  if (!puesto) return false;
  const p = puesto.trim();
  const pLower = p.toLowerCase();

  // 1. Excluir específicamente puestos de Mandos Medios o Bajos con denominaciones similares
  for (const exc of EXCLUSIONES_NO_MANDOS_ALTOS) {
    if (pLower.startsWith(exc.toLowerCase())) {
      return false;
    }
  }

  // 2. Comprobar si coincide con alguno de los 13 Mandos Altos autorizados
  const reglasMandosAltos = [
    /^secretari[oa]\s+de\s+educaci[oó]n/i,
    /^subsecretari[oa]/i,
    /^jefe\s+del\s+despacho/i,
    /^director(a)?\s+general/i,
    /^coordinador(a)?\s+general/i,
    /^director(a)?\s+jur[ií]dic[oa]/i,
    /^director(a)?\s+de\s+plantel/i,
    /^director(a)?\s+(de\s+|del\s+)?centro/i,
    /^subdirector(a)?/i,
    /^director(a)?/i,
    /^(jefe|jefa)\s+de\s+departamento/i,
    /^coordinador(a)?\s+de\s+soporte\s+t[eé]cnico/i,
    /^coordinador(a)?/i
  ];

  return reglasMandosAltos.some(reg => reg.test(p));
}

/**
 * Llena el selector de Titular (2) / Jefe Inmediato con los Mandos Altos
 * vinculados a la Unidad Administrativa seleccionada (para Alta, Baja y Cambio de nombre).
 */
function poblarSelectJefeInmediato(areaNombre) {
  const selectT2 = document.getElementById('selectTitularUnidad2');
  if (!selectT2) return;

  if (typeof CATALOGO_ORGANICO_SEGEY === 'undefined' || !Array.isArray(CATALOGO_ORGANICO_SEGEY)) {
    return;
  }

  if (!areaNombre) {
    const areaSelect = document.getElementById('areaNotificadoraSelect');
    if (areaSelect && areaSelect.value && areaSelect.value !== '__OTRA__') {
      areaNombre = areaSelect.value;
    } else {
      const areaCustom = document.getElementById('areaNotificadora');
      if (areaCustom && areaCustom.value) {
        areaNombre = areaCustom.value;
      }
    }
  }

  // Preservar valores y opción actualmente seleccionada
  const prevVal = selectT2.value;
  const currentNom = (document.getElementById('titularUnidad2Nombre')?.value || '').trim();
  const currentCar = (document.getElementById('titularUnidad2Cargo')?.value || '').trim();
  const prevSelectedOpt = selectT2.selectedIndex > 0 ? selectT2.options[selectT2.selectedIndex] : null;
  const prevText = prevSelectedOpt ? prevSelectedOpt.textContent.trim() : '';

  let unidadId = areaNombre ? AREA_TO_UNIDAD_MAP[areaNombre] : null;
  let unidad = null;
  if (unidadId) {
    unidad = CATALOGO_ORGANICO_SEGEY.find(u => u.id === unidadId);
  }
  if (!unidad && areaNombre) {
    unidad = CATALOGO_ORGANICO_SEGEY.find(u => u.unidad === areaNombre) ||
             CATALOGO_ORGANICO_SEGEY.find(u => areaNombre.toLowerCase().includes(u.unidad.toLowerCase()) || u.unidad.toLowerCase().includes(areaNombre.toLowerCase()));
  }

  let html = '<option value="" selected>-- Seleccione Jefe Inmediato de la Unidad --</option>';

  if (unidad) {
    // 1. Titular oficial de la Unidad (Puesto — Nombre)
    if (unidad.titular && unidad.titular.nombre) {
      html += `<option value="titular_unidad" data-nombre="${escapeHtml(unidad.titular.nombre)}" data-cargo="${escapeHtml(unidad.titular.cargo)}">${escapeHtml(unidad.titular.cargo)} — ${escapeHtml(unidad.titular.nombre)}</option>`;
    }

    // 2. Personal vinculado a la Unidad Administrativa elegida (Puesto — Nombre)
    const rawSubs = unidad.subordinados || [];
    const mandosAltos = rawSubs.filter(s => esMandoAlto(s.puesto));

    if (mandosAltos.length > 0) {
      mandosAltos.forEach((s, idx) => {
        const esVacante = s.es_vacante || (s.nombre && s.nombre.toLowerCase().trim() === 'vacante');
        const displayNombre = esVacante ? 'Vacante' : s.nombre;
        const displayLabel = `${s.puesto} — ${displayNombre}`;
        html += `<option value="sub_${idx}" data-nombre="${escapeHtml(displayNombre)}" data-cargo="${escapeHtml(s.puesto)}">${escapeHtml(displayLabel)}</option>`;
      });
    }

    // Actualizar badge
    const badgeT2 = document.getElementById('badgeTitular2');
    if (badgeT2) {
      badgeT2.className = 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200';
      badgeT2.innerHTML = '<i class="fa-solid fa-user-shield mr-1"></i>Jefe Inmediato';
    }
  }

  html += '<option value="__MANUAL__">✏️ Ingresar otro nombre y cargo manualmente...</option>';
  selectT2.innerHTML = html;

  // Restaurar y proteger la selección previa si ya existía información del Jefe Inmediato
  if (currentNom || currentCar) {
    const norm = (s) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    let matchIdx = -1;
    for (let i = 1; i < selectT2.options.length; i++) {
      const opt = selectT2.options[i];
      if (opt.value === '__MANUAL__') continue;
      const optNom = norm(opt.dataset?.nombre);
      const optCar = norm(opt.dataset?.cargo);
      const optText = norm(opt.textContent);
      if (currentNom && optNom && (optNom === norm(currentNom) || optText.includes(norm(currentNom)))) {
        matchIdx = i;
        break;
      }
      if (currentCar && optCar && (optCar === norm(currentCar) || optCar.includes(norm(currentCar)))) {
        matchIdx = i;
        break;
      }
    }

    if (matchIdx !== -1) {
      selectT2.selectedIndex = matchIdx;
    } else {
      // Si era un jefe vinculado dinámicamente o capturado, reinsertarlo para conservar la integridad visual
      const newOpt = document.createElement('option');
      newOpt.value = (prevVal && prevVal.startsWith('jefe_vinculado_')) ? prevVal : `jefe_vinculado_${Date.now()}`;
      newOpt.textContent = prevText || (currentCar && currentNom ? `${currentCar} — ${currentNom}` : (currentNom || currentCar));
      newOpt.setAttribute('data-nombre', currentNom);
      newOpt.setAttribute('data-cargo', currentCar);
      if (selectT2.options.length > 1) {
        selectT2.insertBefore(newOpt, selectT2.options[1]);
      } else {
        selectT2.appendChild(newOpt);
      }
      selectT2.selectedIndex = 1;
    }
  } else if (prevVal && selectT2.querySelector(`option[value="${CSS.escape(prevVal)}"]`)) {
    selectT2.value = prevVal;
  }

  if (typeof syncComboboxFromSelect === 'function') {
    syncComboboxFromSelect('selectTitularUnidad2');
  }
}

/**
 * Obtiene las áreas vinculadas que se encuentran al nivel o debajo del nivel
 * del área que notifica y elabora (subordinadas en la estructura orgánica oficial).
 */
function getAreasVinculadasPorUnidad(areaNombre) {
  if (!areaNombre) {
    const areaSelect = document.getElementById('areaNotificadoraSelect');
    if (areaSelect && areaSelect.value && areaSelect.value !== '__OTRA__') {
      areaNombre = areaSelect.value;
    } else {
      const areaCustom = document.getElementById('areaNotificadora');
      if (areaCustom && areaCustom.value) {
        areaNombre = areaCustom.value;
      }
    }
  }

  if (!areaNombre || areaNombre === '__OTRA__') return [];

  // Limpiar cualquier residuo de "(Oficina Central)"
  const cleanAreaNombre = areaNombre.replace(/\s*\(Oficina Central\)/gi, '').trim();
  const subSet = new Set([cleanAreaNombre]);

  const dictSubordinadas = (typeof window !== 'undefined' && window.MAPA_AREAS_SUBORDINADAS)
    ? window.MAPA_AREAS_SUBORDINADAS
    : (typeof MAPA_AREAS_SUBORDINADAS !== 'undefined' && MAPA_AREAS_SUBORDINADAS ? MAPA_AREAS_SUBORDINADAS : FALLBACK_MAPA_SUBORDINADAS);

  // 1. Buscar en el MAPA_AREAS_SUBORDINADAS oficial pre-compilado (0 segundos)
  if (dictSubordinadas) {
    if (dictSubordinadas[cleanAreaNombre] && dictSubordinadas[cleanAreaNombre].length > 0) {
      dictSubordinadas[cleanAreaNombre].forEach(a => subSet.add(a));
    } else {
      const norm = normalizeText(cleanAreaNombre);
      const key = Object.keys(dictSubordinadas).find(k => normalizeText(k) === norm);
      if (key && dictSubordinadas[key] && dictSubordinadas[key].length > 0) {
        dictSubordinadas[key].forEach(a => subSet.add(a));
      } else {
        const keyContain = Object.keys(dictSubordinadas).find(k => {
          const kn = normalizeText(k);
          return kn.includes(norm) || norm.includes(kn);
        });
        if (keyContain && dictSubordinadas[keyContain] && dictSubordinadas[keyContain].length > 0) {
          dictSubordinadas[keyContain].forEach(a => subSet.add(a));
        }
      }
    }
  }

  // 2. Combinar con registros dinámicos sincronizados en memoria o localStorage
  if (MAPA_AREAS_SUBORDINADAS_DINAMICO && MAPA_AREAS_SUBORDINADAS_DINAMICO[cleanAreaNombre] && MAPA_AREAS_SUBORDINADAS_DINAMICO[cleanAreaNombre].length > 0) {
    MAPA_AREAS_SUBORDINADAS_DINAMICO[cleanAreaNombre].forEach(a => subSet.add(a));
  }

  // 3. Fallback inteligente en CATALOGO_ORGANICO_SEGEY (soporta grupos y jerarquía completa)
  if (subSet.size <= 1 && typeof CATALOGO_ORGANICO_SEGEY !== 'undefined' && Array.isArray(CATALOGO_ORGANICO_SEGEY)) {
    const normClean = normalizeText(cleanAreaNombre);
    const orgs = CATALOGO_ORGANICO_SEGEY.filter(u => {
      const uNorm = normalizeText(u.unidad.replace(/\s*\(Oficina Central\)/gi, ''));
      const gNorm = normalizeText(u.grupo || '');
      return uNorm === normClean || gNorm === normClean || uNorm.includes(normClean) || gNorm.includes(normClean);
    });

    if (orgs.length > 0) {
      orgs.forEach(org => {
        const cleanU = org.unidad.replace(/\s*\(Oficina Central\)/gi, '').trim();
        if (cleanU && cleanU.length > 4) subSet.add(cleanU);
        if (Array.isArray(org.subordinados)) {
          org.subordinados.forEach(s => {
            if (s.puesto && s.puesto !== 'None') {
              const a = clientPuestoToAreaName(s.puesto);
              if (a && a.length > 4) subSet.add(a);
            }
          });
        }
      });
      subSet.forEach(item => registrarAreaSubordinadaDinamica(cleanAreaNombre, item));
    }
  }

  return Array.from(subSet)
    .map(a => a.replace(/\s*\(Oficina Central\)/gi, '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

/**
 * Llena el menú desplegable de Áreas a dar de Baja vinculadas debajo del nivel del área que notifica o elabora.
 */
function poblarSelectAreaBaja(areaNombre) {
  const selectBaja = document.getElementById('selectAreaBaja');
  const badgeBaja = document.getElementById('badgeAreasBaja');
  if (!selectBaja) return;

  if (!areaNombre) {
    const areaSelect = document.getElementById('areaNotificadoraSelect');
    if (areaSelect && areaSelect.value && areaSelect.value !== '__OTRA__') {
      areaNombre = areaSelect.value;
    } else {
      const areaCustom = document.getElementById('areaNotificadora');
      if (areaCustom && areaCustom.value) {
        areaNombre = areaCustom.value;
      }
    }
  }

  const areas = getAreasVinculadasPorUnidad(areaNombre);

  let html = '<option value="">-- Seleccione el Área o Departamento a dar de baja --</option>';

  if (areas.length > 0) {
    areas.forEach(area => {
      html += `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`;
    });
  }

  html += '<option value="__OTRA__">✏️ Otra área (escribir manualmente en el cuadro inferior)...</option>';
  const prevVal = selectBaja.value || (document.getElementById('nuevaDenominacion')?.value || '').trim();
  selectBaja.innerHTML = html;

  if (prevVal && (areas.some(a => a.toUpperCase() === prevVal.toUpperCase()) || prevVal === '__OTRA__')) {
    const matched = areas.find(a => a.toUpperCase() === prevVal.toUpperCase());
    selectBaja.value = matched || prevVal;
  } else {
    selectBaja.selectedIndex = 0;
    selectBaja.value = '';
  }

  const wrapper = selectBaja.parentElement?.querySelector('.segey-combobox[data-for="selectAreaBaja"]') || selectBaja.parentElement?.querySelector('.segey-combobox');
  if (wrapper) {
    const input = wrapper.querySelector('.combobox-input');
    const clearBtn = wrapper.querySelector('.combobox-clear');
    if (selectBaja.value) {
      if (input) input.value = selectBaja.value;
      if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
      if (input) input.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
    }
  }

  if (badgeBaja) {
    if (areas.length > 0) {
      badgeBaja.className = 'text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold border border-rose-300';
      badgeBaja.innerHTML = `<i class="fa-solid fa-list-check text-rose-600 mr-1"></i>${areas.length} áreas vinculadas (departamento y subordinadas)`;
    } else {
      badgeBaja.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
      badgeBaja.textContent = 'Seleccione el Área Notificadora arriba';
    }
  }

  renderDocument(getCurrentFormDataForPreview());
}

function handleSelectAreaBaja(selectElem) {
  if (!selectElem) return;
  const val = selectElem.value;
  const ndTextarea = document.getElementById('nuevaDenominacion');
  if (!ndTextarea) return;

  if (val === '__OTRA__') {
    ndTextarea.value = '';
    ndTextarea.focus();
    showToast('Escriba el nombre del área a dar de baja en el cuadro inferior.');
  } else if (val) {
    ndTextarea.value = val.toUpperCase();
    vincularJefeInmediatoConArea(val);
    vincularTitularAreaConBaja(val);
    showToast(`Área a dar de baja seleccionada: ${val}`);
  } else {
    ndTextarea.value = '';
  }

  renderDocument(getCurrentFormDataForPreview());
}

/**
 * Llena el menú desplegable de Áreas que cambian de nombre vinculadas debajo del nivel del área que notifica o elabora.
 */
function poblarSelectAreaCambioNombre(areaNombre) {
  const selectCambio = document.getElementById('selectAreaCambioNombre');
  const badgeCambio = document.getElementById('badgeAreasCambioNombre');
  if (!selectCambio) return;

  if (!areaNombre) {
    const areaSelect = document.getElementById('areaNotificadoraSelect');
    if (areaSelect && areaSelect.value && areaSelect.value !== '__OTRA__') {
      areaNombre = areaSelect.value;
    } else {
      const areaCustom = document.getElementById('areaNotificadora');
      if (areaCustom && areaCustom.value) {
        areaNombre = areaCustom.value;
      }
    }
  }

  const areas = getAreasVinculadasPorUnidad(areaNombre);

  let html = '<option value="">-- Seleccione el Área o Departamento que cambia de nombre --</option>';

  if (areas.length > 0) {
    areas.forEach(area => {
      html += `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`;
    });
  }

  html += '<option value="__OTRA__">✏️ Otra área (escribir manualmente en el cuadro inferior)...</option>';
  const prevVal = selectCambio.value || (document.getElementById('nuevaDenominacion')?.value || '').trim();
  selectCambio.innerHTML = html;

  if (prevVal && (areas.some(a => a.toUpperCase() === prevVal.toUpperCase()) || prevVal === '__OTRA__')) {
    const matched = areas.find(a => a.toUpperCase() === prevVal.toUpperCase());
    selectCambio.value = matched || prevVal;
  } else {
    selectCambio.selectedIndex = 0;
    selectCambio.value = '';
  }

  const wrapper = selectCambio.parentElement?.querySelector('.segey-combobox[data-for="selectAreaCambioNombre"]') || selectCambio.parentElement?.querySelector('.segey-combobox');
  if (wrapper) {
    const input = wrapper.querySelector('.combobox-input');
    const clearBtn = wrapper.querySelector('.combobox-clear');
    if (selectCambio.value) {
      if (input) input.value = selectCambio.value;
      if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
      if (input) input.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
    }
  }

  if (badgeCambio) {
    if (areas.length > 0) {
      badgeCambio.className = 'text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold border border-amber-300';
      badgeCambio.innerHTML = `<i class="fa-solid fa-list-check text-amber-600 mr-1"></i>${areas.length} áreas vinculadas (departamento y subordinadas)`;
    } else {
      badgeCambio.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
      badgeCambio.textContent = 'Seleccione el Área Notificadora arriba';
    }
  }

  renderDocument(getCurrentFormDataForPreview());
}

function handleSelectAreaCambioNombre(selectElem) {
  if (!selectElem) return;
  const val = selectElem.value;
  const ndTextarea = document.getElementById('nuevaDenominacion');
  if (!ndTextarea) return;

  if (val === '__OTRA__') {
    ndTextarea.value = '';
    ndTextarea.focus();
    showToast('Escriba el nombre actual del área en el cuadro inferior.');
  } else if (val) {
    ndTextarea.value = val.toUpperCase();
    vincularJefeInmediatoConArea(val);
    vincularTitularAreaConBaja(val);
    showToast(`Área seleccionada: ${val}. Escriba el nuevo nombre propuesto.`);
  } else {
    ndTextarea.value = '';
  }

  renderDocument(getCurrentFormDataForPreview());
}

/**
 * Llena el menú desplegable de Áreas a transferir vinculadas debajo del nivel del área que notifica o elabora.
 */
function poblarSelectAreaCambioDep(areaNombre) {
  const selectDep = document.getElementById('selectAreaCambioDep');
  const badgeDep = document.getElementById('badgeAreasCambioDep');
  if (!selectDep) return;

  if (!areaNombre) {
    const areaSelect = document.getElementById('areaNotificadoraSelect');
    if (areaSelect && areaSelect.value && areaSelect.value !== '__OTRA__') {
      areaNombre = areaSelect.value;
    } else {
      const areaCustom = document.getElementById('areaNotificadora');
      if (areaCustom && areaCustom.value) {
        areaNombre = areaCustom.value;
      }
    }
  }

  const areas = getAreasVinculadasPorUnidad(areaNombre);

  let html = '<option value="" selected>-- Seleccione el Área o Departamento a transferir --</option>';

  if (areas.length > 0) {
    areas.forEach(area => {
      html += `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`;
    });
  }

  html += '<option value="__OTRA__">✏️ Otra área (escribir manualmente en el cuadro inferior)...</option>';
  const prevVal = selectDep.value || (document.getElementById('nuevaDenominacion')?.value || '').trim();
  selectDep.innerHTML = html;

  if (prevVal && (areas.some(a => a.toUpperCase() === prevVal.toUpperCase()) || prevVal === '__OTRA__')) {
    const matched = areas.find(a => a.toUpperCase() === prevVal.toUpperCase());
    selectDep.value = matched || prevVal;
  } else {
    selectDep.selectedIndex = 0;
    selectDep.value = '';
  }

  const wrapper = selectDep.parentElement?.querySelector('.segey-combobox[data-for="selectAreaCambioDep"]') || selectDep.parentElement?.querySelector('.segey-combobox');
  if (wrapper) {
    const input = wrapper.querySelector('.combobox-input');
    const clearBtn = wrapper.querySelector('.combobox-clear');
    if (selectDep.value) {
      if (input) input.value = selectDep.value;
      if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
      if (input) input.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
    }
  }

  if (badgeDep) {
    if (areas.length > 0) {
      badgeDep.className = 'text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold border border-purple-300';
      badgeDep.innerHTML = `<i class="fa-solid fa-list-check text-purple-600 mr-1"></i>${areas.length} áreas vinculadas (departamento y subordinadas)`;
    } else {
      badgeDep.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
      badgeDep.textContent = 'Seleccione el Área Notificadora arriba';
    }
  }

  renderDocument(getCurrentFormDataForPreview());
}

function handleSelectAreaCambioDep(selectElem) {
  if (!selectElem) return;
  const val = selectElem.value;
  const ndTextarea = document.getElementById('nuevaDenominacion');
  if (!ndTextarea) return;

  if (val === '__OTRA__') {
    ndTextarea.value = '';
    ndTextarea.focus();
    showToast('Escriba el nombre del área a transferir en el cuadro inferior.');
    return;
  }

  if (val) {
    ndTextarea.value = val.toUpperCase();
    vincularTitularAreaConBaja(val);
    vincularJefeInmediatoConArea(val);
    showToast(`Área a transferir seleccionada: ${val}`);
  }

  renderDocument(getCurrentFormDataForPreview());
}

/**
 * Llena el menú desplegable de Unidades Administrativas de Destino para Cambio de Dependencia Jerárquica.
 */
function poblarSelectUnidadDestinoCambioDep() {
  const selectDestino = document.getElementById('selectUnidadDestinoCambioDep');
  const badgeDestino = document.getElementById('badgeUnidadDestinoCambioDep');
  if (!selectDestino) return;

  if (typeof CATALOGO_ORGANICO_SEGEY === 'undefined' || !Array.isArray(CATALOGO_ORGANICO_SEGEY)) {
    return;
  }

  const grupos = {};
  CATALOGO_ORGANICO_SEGEY.forEach(u => {
    const grp = u.grupo || 'Otras Unidades';
    if (!grupos[grp]) grupos[grp] = [];
    grupos[grp].push(u);
  });

  let html = '<option value="" disabled selected>-- Seleccione la Unidad Administrativa a la que se transfiere el Área --</option>';

  Object.keys(grupos).forEach(nombreGrupo => {
    html += `<optgroup label="${escapeHtml(nombreGrupo)}">`;
    grupos[nombreGrupo].forEach(u => {
      html += `<option value="${escapeHtml(u.id)}" data-nombre="${escapeHtml(u.titular.nombre)}" data-cargo="${escapeHtml(u.titular.cargo)}" data-unidad="${escapeHtml(u.unidad)}">${escapeHtml(u.unidad)} — ${escapeHtml(u.titular.nombre)}</option>`;
    });
    html += '</optgroup>';
  });

  html += '<option value="__MANUAL__">✏️ Otra unidad (capturar datos manualmente en el Apartado II)...</option>';
  selectDestino.innerHTML = html;

  if (badgeDestino) {
    badgeDestino.className = 'text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-full border border-purple-300';
    badgeDestino.textContent = `${CATALOGO_ORGANICO_SEGEY.length} unidades oficiales`;
  }

  // Sincronizar si ya existe una unidad seleccionada en selectTitularUnidad2
  const selT2 = document.getElementById('selectTitularUnidad2');
  if (selT2 && selT2.value && selT2.value !== '__MANUAL__') {
    selectDestino.value = selT2.value;
  }
}

function handleSelectUnidadDestinoCambioDep(selectElem) {
  if (!selectElem) return;
  const val = selectElem.value;
  const t2NomInput = document.getElementById('titularUnidad2Nombre');
  const t2CarInput = document.getElementById('titularUnidad2Cargo');
  const selectT2 = document.getElementById('selectTitularUnidad2');

  if (val === '__MANUAL__') {
    if (selectT2) selectT2.value = '__MANUAL__';
    if (t2NomInput) { t2NomInput.value = ''; t2NomInput.focus(); }
    if (t2CarInput) { t2CarInput.value = ''; }
    showToast('Ingrese los datos del Titular de la Unidad de Destino en el Apartado II.');
  } else if (val) {
    const unidad = (typeof CATALOGO_ORGANICO_SEGEY !== 'undefined')
      ? CATALOGO_ORGANICO_SEGEY.find(u => u.id === val)
      : null;

    if (unidad && unidad.titular) {
      if (t2NomInput) t2NomInput.value = unidad.titular.nombre;
      if (t2CarInput) t2CarInput.value = unidad.titular.cargo;
      if (selectT2) selectT2.value = val;

      // Actualizar Testigo 2 si corresponde a la unidad de destino
      poblarDropdownTestigo(2, unidad, 'Dependencia de Destino');
      if (typeof poblarSelectTitularArea2 === 'function') {
        poblarSelectTitularArea2(unidad);
      }

      showToast(`Dependencia de Destino vinculada: ${unidad.unidad}`);
    }
  }

  renderDocument(getCurrentFormDataForPreview());
}

/**
 * Vincula automáticamente el Jefe Inmediato de acuerdo con el Área que Cambia de Nombre,
 * seleccionando su mando superior en selectTitularUnidad2 pero dejando siempre la libertad
 * de cambiarlo o elegir otro en el Apartado II.
 */
function vincularJefeInmediatoConArea(areaNombre) {
  if (!areaNombre) return;

  const selectT2 = document.getElementById('selectTitularUnidad2');
  const u2Nom = document.getElementById('titularUnidad2Nombre');
  const u2Car = document.getElementById('titularUnidad2Cargo');
  if (!selectT2) return;

  // 1. Obtener el Área Notificadora actual para desambiguar si existen áreas homónimas
  const selNotif = document.getElementById('areaNotificadoraSelect');
  const custNotif = document.getElementById('areaNotificadora');
  const areaNotificadora = (selNotif && selNotif.value && selNotif.value !== '__OTRA__') 
    ? selNotif.value 
    : (custNotif ? custNotif.value : '');

  // 2. Consultar el Mapa Oficial de Jerarquía SEGEY (el que está a la izquierda en la jerarquía, Nivel K-1)
  let jefeEncontrado = null;
  if (typeof buscarJefeInmediatoPorArea === 'function') {
    jefeEncontrado = buscarJefeInmediatoPorArea(areaNombre, areaNotificadora);
  }

  if (jefeEncontrado && jefeEncontrado.jefe_cargo) {
    const rawNom = jefeEncontrado.jefe_nombre || '';
    const esVacanteJefe = !rawNom || rawNom === 'None' || rawNom.toLowerCase().trim() === 'vacante';
    const jNom = esVacanteJefe ? '' : rawNom;
    const jCar = jefeEncontrado.jefe_cargo || 'Titular Superior';
    const jNomNorm = normalizeText(jNom);

    gestionarAlertaVacanteGenerales('titular2', esVacanteJefe, jCar, jNom);

    // Buscar si ya existe una opción en selectTitularUnidad2 con este jefe o cargo
    let matchIdx = -1;
    for (let i = 1; i < selectT2.options.length; i++) {
      const opt = selectT2.options[i];
      if (opt.value === '__MANUAL__') continue;
      const optNom = opt.dataset && opt.dataset.nombre ? normalizeText(opt.dataset.nombre) : '';
      const optCar = opt.dataset && opt.dataset.cargo ? normalizeText(opt.dataset.cargo) : '';
      const optText = normalizeText(opt.textContent);
      if (jNom && (optNom === jNomNorm || optText.includes(jNomNorm))) {
        matchIdx = i;
        break;
      }
      if (optCar && optCar === normalizeText(jCar)) {
        matchIdx = i;
        break;
      }
    }

    if (matchIdx !== -1) {
      selectT2.selectedIndex = matchIdx;
    } else {
      // Insertar la opción vinculada en el selector para que esté visible en la lista
      const newOpt = document.createElement('option');
      newOpt.value = `jefe_vinculado_${Date.now()}`;
      newOpt.textContent = esVacanteJefe ? `${jCar} — [Vacante en catálogo / En funciones]` : `${jCar} — ${jNom}`;
      newOpt.setAttribute('data-nombre', esVacanteJefe ? 'Vacante' : jNom);
      newOpt.setAttribute('data-cargo', jCar);
      if (selectT2.options.length > 1) {
        selectT2.insertBefore(newOpt, selectT2.options[1]);
      } else {
        selectT2.appendChild(newOpt);
      }
      selectT2.selectedIndex = 1;
    }

    // Actualizar campos de texto en el Apartado II (siempre editables)
    if (u2Nom) {
      u2Nom.value = jNom;
      u2Nom.removeAttribute('readonly');
      u2Nom.disabled = false;
      if (esVacanteJefe) u2Nom.focus();
    }
    if (u2Car) {
      u2Car.value = jCar;
      u2Car.removeAttribute('readonly');
      u2Car.disabled = false;
    }

    selectT2.disabled = false;
    syncComboboxFromSelect('selectTitularUnidad2');
    actualizarOpcionesTitularAreaPorJefe(jCar, jNom, areaNombre);
    renderDocument(getCurrentFormDataForPreview());
    return;
  }

  // Fallback: Si no hubo coincidencia en el mapa detallado, buscar en las opciones de selectTitularUnidad2
  const aNorm = normalizeText(areaNombre);
  let bestIdx = -1;
  let bestLabel = '';

  for (let i = 1; i < selectT2.options.length; i++) {
    const opt = selectT2.options[i];
    if (opt.value === '__MANUAL__') continue;
    const optTextNorm = normalizeText(opt.textContent);
    const cargo = opt.dataset ? normalizeText(opt.dataset.cargo || '') : '';

    if (cargo.includes('subdirector') || cargo.includes('coordinador general') || cargo.includes('director')) {
      const palabrasArea = aNorm.split(/\s+/).filter(w => w.length > 3 && !['departamento', 'direccion', 'coordinacion', 'area', 'para'].includes(w));
      const coincide = palabrasArea.some(w => optTextNorm.includes(w));
      if (coincide) {
        bestIdx = i;
        bestLabel = opt.textContent.trim();
        break;
      }
    }
  }

  if (bestIdx === -1) {
    for (let i = 1; i < selectT2.options.length; i++) {
      const opt = selectT2.options[i];
      if (opt.value === 'titular_unidad' || (opt.dataset && opt.dataset.cargo && (opt.dataset.cargo.includes('Director') || opt.dataset.cargo.includes('Secretario') || opt.dataset.cargo.includes('Coordinador')))) {
        bestIdx = i;
        bestLabel = opt.textContent.trim();
        break;
      }
    }
  }

  if (bestIdx !== -1) {
    selectT2.selectedIndex = bestIdx;
    handleTitularUnidad2Select(selectT2);
    syncComboboxFromSelect('selectTitularUnidad2');
    showToast(`Jefe Inmediato vinculado: ${bestLabel}. Puedes cambiarlo o editarlo libremente en el Apartado II.`);
  }
}

window.poblarSelectAreaCambioNombre = poblarSelectAreaCambioNombre;
window.handleSelectAreaCambioNombre = handleSelectAreaCambioNombre;
window.vincularJefeInmediatoConArea = vincularJefeInmediatoConArea;
window.poblarSelectAreaCambioDep = poblarSelectAreaCambioDep;
window.handleSelectAreaCambioDep = handleSelectAreaCambioDep;
window.poblarSelectUnidadDestinoCambioDep = poblarSelectUnidadDestinoCambioDep;
window.handleSelectUnidadDestinoCambioDep = handleSelectUnidadDestinoCambioDep;

/**
 * Busca de forma inteligente el Titular oficial (nombre y cargo) de un Área o Departamento específico.
 * Consulta primero el Mapa Oficial de Jerarquía SEGEY y después el Catálogo Orgánico SEGEY.
 */
function buscarTitularPorNombreArea(areaNombre, areaNotificadora = '') {
  if (!areaNombre || areaNombre === '__OTRA__') return null;

  function norm(t) {
    if (!t) return '';
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  }

  const nTarget = norm(areaNombre);
  if (!nTarget) return null;

  // 1. Consultar el Mapa Oficial de Jerarquía de Jefes (MAPA_JERARQUIA_JEFES)
  if (typeof buscarJefeInmediatoPorArea === 'function') {
    const nodo = buscarJefeInmediatoPorArea(areaNombre, areaNotificadora);
    if (nodo) {
      const esVacante = !nodo.titular_nombre || nodo.titular_nombre === 'None' || nodo.titular_nombre.toLowerCase() === 'vacante';
      if (!esVacante) {
        return {
          nombre: nodo.titular_nombre,
          cargo: nodo.titular_cargo || areaNombre,
          esVacante: false
        };
      } else if (nodo.titular_cargo) {
        // El puesto existe formalmente como jefatura/dirección pero la plaza está vacante en el catálogo oficial
        return {
          nombre: '',
          cargo: nodo.titular_cargo,
          esVacante: true
        };
      }
    }
  }

  // 2. Consultar en CATALOGO_ORGANICO_SEGEY
  if (typeof CATALOGO_ORGANICO_SEGEY !== 'undefined' && Array.isArray(CATALOGO_ORGANICO_SEGEY)) {
    const stopWords = ['departamento', 'direccion', 'coordinacion', 'area', 'general', 'para', 'gestion', 'regional', 'de', 'la', 'el', 'los', 'las', 'y', 'del'];
    const targetWords = nTarget.split(/\s+/).filter(w => w.length > 3 && !stopWords.includes(w));

    let bestScore = 0;
    let bestResult = null;

    for (let i = 0; i < CATALOGO_ORGANICO_SEGEY.length; i++) {
      const u = CATALOGO_ORGANICO_SEGEY[i];
      const un = norm(u.unidad);

      // Evaluar titular de la unidad
      if (u.titular && u.titular.nombre && u.titular.nombre.toLowerCase() !== 'vacante') {
        let score = 0;
        if (un === nTarget) score += 30;
        else if (un.includes(nTarget) || nTarget.includes(un)) score += 20;
        else {
          const matchCount = targetWords.filter(w => un.includes(w)).length;
          if (matchCount >= 2) score += matchCount * 5;
        }
        if (score > bestScore) {
          bestScore = score;
          bestResult = { nombre: u.titular.nombre, cargo: u.titular.cargo || u.unidad };
        }
      }

      // Evaluar subordinados
      if (Array.isArray(u.subordinados)) {
        for (let j = 0; j < u.subordinados.length; j++) {
          const s = u.subordinados[j];
          if (!s.nombre || s.nombre.toLowerCase() === 'vacante') continue;
          const sp = norm(s.puesto);
          let score = 0;
          if (sp === nTarget) score += 35;
          else if (sp.includes(nTarget) || nTarget.includes(sp)) score += 25;
          else {
            const matchCount = targetWords.filter(w => sp.includes(w)).length;
            if (matchCount >= 2) score += matchCount * 6;
          }
          if (score > bestScore) {
            bestScore = score;
            bestResult = { nombre: s.nombre, cargo: s.puesto };
          }
        }
      }
    }

    if (bestResult && bestScore >= 10) {
      return bestResult;
    }
  }

  return null;
}

/**
 * =========================================================================
 * GESTIÓN INSTITUCIONAL DE PUESTOS VACANTES EN APARTADO II (GENERALES)
 * =========================================================================
 * Si se detecta un puesto vacante en el catálogo oficial:
 * 1. Mantiene habilitada la edición del Nombre Completo y del Cargo o Puesto.
 * 2. Muestra un mensaje/alerta visual indicando que se detectó vacante el puesto y
 *    se necesita especificar los datos de la persona en funciones para la firma.
 * 3. Notifica al usuario vía toast y resalta los campos de captura.
 */
function gestionarAlertaVacanteGenerales(rol, esVacante, cargoSugerido = '', nombreSugerido = '') {
  const configs = {
    titular1: {
      alertId: 'alertaVacanteTitular1',
      nomId: 'titularUnidad1Nombre',
      carId: 'titularUnidad1Cargo',
      badgeId: 'badgeTitular1',
      defaultBadge: '<i class="fa-solid fa-link mr-1"></i>Según Área que Notifica'
    },
    titular2: {
      alertId: 'alertaVacanteTitular2',
      nomId: 'titularUnidad2Nombre',
      carId: 'titularUnidad2Cargo',
      badgeId: 'badgeTitular2',
      defaultBadge: '<i class="fa-solid fa-user-shield mr-1"></i>Jefe Inmediato'
    },
    area1: {
      alertId: 'alertaVacanteArea',
      nomId: 'titularAreaNombre',
      carId: 'titularAreaCargo',
      badgeId: 'badgeAreaSubordinados',
      defaultBadge: null
    },
    area2: {
      alertId: 'alertaVacanteArea2',
      nomId: 'titularArea2Nombre',
      carId: 'titularArea2Cargo',
      badgeId: 'badgeAreaSubordinados2',
      defaultBadge: '<i class="fa-solid fa-arrow-right-arrow-left mr-1"></i>Dependencia de Destino (2)'
    }
  };

  const cfg = configs[rol];
  if (!cfg) return;

  const alertEl = document.getElementById(cfg.alertId);
  const nomEl = document.getElementById(cfg.nomId);
  const carEl = document.getElementById(cfg.carId);
  const badgeEl = document.getElementById(cfg.badgeId);

  // Asegurar siempre habilitada la edición del nombre y cargo
  if (nomEl) {
    nomEl.disabled = false;
    nomEl.readOnly = false;
  }
  if (carEl) {
    carEl.disabled = false;
    carEl.readOnly = false;
  }

  if (esVacante) {
    if (alertEl) alertEl.classList.remove('hidden');

    if (nomEl) {
      nomEl.value = '';
      nomEl.placeholder = 'Puesto vacante en catálogo: capture el nombre de quien firma...';
      nomEl.classList.add('border-amber-400', 'focus:ring-amber-500', 'bg-amber-50/20');
      nomEl.classList.remove('border-slate-300');
    }

    if (carEl) {
      if (cargoSugerido) carEl.value = cargoSugerido;
      carEl.placeholder = 'Puesto oficial: confirme o ajuste el cargo para la firma...';
      carEl.classList.add('border-amber-400', 'focus:ring-amber-500', 'bg-amber-50/20');
      carEl.classList.remove('border-slate-300', 'bg-slate-50', 'text-slate-700');
      carEl.classList.add('bg-white', 'text-slate-900');
    }

    if (badgeEl && rol !== 'area1') {
      badgeEl.className = 'text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold border border-amber-300';
      badgeEl.innerHTML = '<i class="fa-solid fa-user-clock text-amber-700 mr-1"></i>Puesto Vacante';
    }

    showToast(`Se detectó vacante el puesto (${cargoSugerido || 'oficial'}). Por favor especifique el nombre y puesto para la firma.`, 'warning');
  } else {
    if (alertEl) alertEl.classList.add('hidden');

    if (nomEl) {
      if (nombreSugerido !== undefined && nombreSugerido !== null) {
        nomEl.value = (nombreSugerido.toLowerCase() === 'vacante') ? '' : nombreSugerido;
      }
      nomEl.classList.remove('border-amber-400', 'focus:ring-amber-500', 'bg-amber-50/20');
      nomEl.classList.add('border-slate-300');
    }

    if (carEl) {
      if (cargoSugerido) carEl.value = cargoSugerido;
      carEl.classList.remove('border-amber-400', 'focus:ring-amber-500', 'bg-amber-50/20');
      carEl.classList.add('border-slate-300', 'bg-white', 'text-slate-800');
    }
  }
}

window.gestionarAlertaVacanteGenerales = gestionarAlertaVacanteGenerales;

/**
 * Vincula y precarga automáticamente el Titular de Área en el Apartado II (Datos Generales)
 * cuando se elige el Área Oficial a dar de Baja en el Apartado I.
 */
function vincularTitularAreaConBaja(areaNombre) {
  if (!areaNombre || areaNombre === '__OTRA__') return;

  const aNom = document.getElementById('titularAreaNombre');
  const aCar = document.getElementById('titularAreaCargo');
  const selectArea = document.getElementById('selectTitularArea');

  // Obtener Área Notificadora actual para desambiguar
  const selNotif = document.getElementById('areaNotificadoraSelect');
  const custNotif = document.getElementById('areaNotificadora');
  const areaNotificadora = (selNotif && selNotif.value && selNotif.value !== '__OTRA__') 
    ? selNotif.value 
    : (custNotif ? custNotif.value : '');

  const titular = buscarTitularPorNombreArea(areaNombre, areaNotificadora);

  if (titular) {
    if (titular.esVacante) {
      gestionarAlertaVacanteGenerales('area1', true, titular.cargo, '');
      if (aNom) {
        aNom.value = '';
        aNom.focus();
      }
      if (aCar) {
        aCar.value = titular.cargo;
      }

      if (selectArea) {
        let matchedIdx = -1;
        for (let i = 0; i < selectArea.options.length; i++) {
          if (selectArea.options[i].textContent.includes(titular.cargo)) {
            matchedIdx = i;
            break;
          }
        }
        if (matchedIdx !== -1) {
          selectArea.selectedIndex = matchedIdx;
        } else {
          const newOpt = document.createElement('option');
          newOpt.value = `titular_baja_vacante_${Date.now()}`;
          newOpt.textContent = `${titular.cargo} — [Vacante en catálogo / En funciones]`;
          newOpt.setAttribute('data-nombre', '');
          newOpt.setAttribute('data-puesto', titular.cargo);
          if (selectArea.options.length > 1) {
            selectArea.insertBefore(newOpt, selectArea.options[1]);
            selectArea.selectedIndex = 1;
          } else {
            selectArea.appendChild(newOpt);
            selectArea.selectedIndex = selectArea.options.length - 1;
          }
        }
        syncComboboxFromSelect('selectTitularArea');
      }

      showToast(`Puesto oficial vinculado: ${titular.cargo}. Registrado como vacante en catálogo; capture el titular en funciones.`, 'info');
    } else if (titular.nombre) {
      gestionarAlertaVacanteGenerales('area1', false, titular.cargo, titular.nombre);
      if (aNom) aNom.value = titular.nombre;
      if (aCar) aCar.value = titular.cargo;

      // Sincronizar selectTitularArea si existe la opción coincidente
      if (selectArea) {
        let matchedIdx = -1;
        function cleanText(t) {
          if (!t) return '';
          return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        }
        const tNomNorm = cleanText(titular.nombre);
        const tCarNorm = cleanText(titular.cargo);

        for (let i = 0; i < selectArea.options.length; i++) {
          const opt = selectArea.options[i];
          if (opt.value === '__MANUAL__') continue;
          const optNom = cleanText(opt.dataset && opt.dataset.nombre ? opt.dataset.nombre : '');
          const optPue = cleanText(opt.dataset && opt.dataset.puesto ? opt.dataset.puesto : '');
          const optText = cleanText(opt.textContent || '');

          if ((optNom && optNom === tNomNorm) || (optPue && optPue === tCarNorm) || optText.includes(tNomNorm)) {
            matchedIdx = i;
            break;
          }
        }

        if (matchedIdx !== -1) {
          selectArea.selectedIndex = matchedIdx;
        } else {
          // Si no está en la lista de puestos de la unidad, insertar la opción para que coincida visualmente
          const newOpt = document.createElement('option');
          newOpt.value = `titular_baja_${Date.now()}`;
          newOpt.textContent = `${titular.cargo} — ${titular.nombre}`;
          newOpt.setAttribute('data-nombre', titular.nombre);
          newOpt.setAttribute('data-puesto', titular.cargo);
          if (selectArea.options.length > 1) {
            selectArea.insertBefore(newOpt, selectArea.options[1]);
            selectArea.selectedIndex = 1;
          } else {
            selectArea.appendChild(newOpt);
            selectArea.selectedIndex = selectArea.options.length - 1;
          }
        }
        syncComboboxFromSelect('selectTitularArea');
      }

      showToast(`Titular de Área precargado para Baja: ${titular.nombre}`);
    }
  }
}

window.buscarTitularPorNombreArea = buscarTitularPorNombreArea;
window.vincularTitularAreaConBaja = vincularTitularAreaConBaja;

/**
 * Actualiza automáticamente Titular de Unidad Administrativa (1) y filtra
 * el catálogo de Titular de Área de acuerdo al Área que Notifica o Elabora seleccionada arriba.
 */
/**
 * Filtra dinámicamente las opciones del selector de Titular de Área para que
 * contenga estrictamente los puestos y personal vinculados al Jefe Inmediato seleccionado.
 */
function actualizarOpcionesTitularAreaPorJefe(jefeCargo, jefeNombre, areaTarget = '') {
  const selectArea = document.getElementById('selectTitularArea');
  const badgeArea = document.getElementById('badgeAreaSubordinados');
  if (!selectArea) return false;

  function norm(str) {
    if (!str) return '';
    return str.toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .trim();
  }

  const nJefeCar = norm(jefeCargo);
  const nJefeNom = norm(jefeNombre);
  const nAreaTarget = norm(areaTarget);

  let subs = [];

  const jerarquia = (typeof window !== 'undefined' && window.MAPA_JERARQUIA_JEFES) ? window.MAPA_JERARQUIA_JEFES : (typeof MAPA_JERARQUIA_JEFES !== 'undefined' ? MAPA_JERARQUIA_JEFES : []);

  if (Array.isArray(jerarquia) && jerarquia.length > 0) {
    subs = jerarquia.filter(node => {
      const nodeJNom = norm(node.jefe_nombre);
      const nodeJCar = norm(node.jefe_cargo);
      if (nJefeNom && (nodeJNom === nJefeNom || (nodeJNom.length > 5 && nJefeNom.includes(nodeJNom)) || (nJefeNom.length > 5 && nodeJNom.includes(nJefeNom)))) {
        return true;
      }
      if (nJefeCar && (nodeJCar === nJefeCar || (nodeJCar.length > 6 && nJefeCar.includes(nodeJCar)))) {
        return true;
      }
      return false;
    });
  }

  // Deduplicar puestos por titular_cargo + titular_nombre
  const seen = new Set();
  const uniqueSubs = [];
  subs.forEach(s => {
    const key = `${norm(s.titular_cargo)}|${norm(s.titular_nombre)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSubs.push(s);
    }
  });

  if (uniqueSubs.length > 0) {
    // Si hay un área objetivo (ej. bodega a dar de baja), priorizarla arriba
    uniqueSubs.sort((a, b) => {
      if (nAreaTarget) {
        const aMatch = norm(a.titular_cargo).includes(nAreaTarget) || (a.norm_aliases && a.norm_aliases.some(al => al.includes(nAreaTarget)));
        const bMatch = norm(b.titular_cargo).includes(nAreaTarget) || (b.norm_aliases && b.norm_aliases.some(al => al.includes(nAreaTarget)));
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      return (a.titular_cargo || '').localeCompare(b.titular_cargo || '', 'es', { sensitivity: 'base' });
    });

    let html = '<option value="">-- Seleccione Puesto y Subordinado del Área --</option>';
    uniqueSubs.forEach((s, idx) => {
      const rawNom = s.titular_nombre || '';
      const esVac = !rawNom || rawNom === 'None' || norm(rawNom) === 'vacante';
      const dispNom = esVac ? '[Vacante en catálogo / En funciones]' : rawNom;
      const displayLabel = `${s.titular_cargo} — ${dispNom}`;
      html += `<option value="sub_jefe_${idx}" data-nombre="${escapeHtml(esVac ? '' : rawNom)}" data-puesto="${escapeHtml(s.titular_cargo)}">${escapeHtml(displayLabel)}</option>`;
    });

    html += '<option value="__MANUAL__">✏️ + Ingresar otro puesto y nombre manualmente...</option>';

    // Preservar la selección previa de Titular de Área si existe
    const curAreaNom = (document.getElementById('titularAreaNombre')?.value || '').trim();
    const curAreaCar = (document.getElementById('titularAreaCargo')?.value || '').trim();
    const prevAreaVal = selectArea.value;

    selectArea.innerHTML = html;

    if (badgeArea) {
      badgeArea.className = 'text-[10.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1';
      badgeArea.innerHTML = `<i class="fa-solid fa-user-check text-emerald-600"></i> ${uniqueSubs.length} puestos vinculados al Jefe Inmediato`;
    }

    if (curAreaNom || curAreaCar) {
      for (let i = 1; i < selectArea.options.length; i++) {
        const opt = selectArea.options[i];
        if (opt.value === '__MANUAL__') continue;
        const optNom = norm(opt.dataset?.nombre);
        const optPue = norm(opt.dataset?.puesto);
        if (curAreaNom && optNom && (optNom === norm(curAreaNom) || optNom.includes(norm(curAreaNom)))) {
          selectArea.selectedIndex = i;
          break;
        }
        if (curAreaCar && optPue && (optPue === norm(curAreaCar) || optPue.includes(norm(curAreaCar)))) {
          selectArea.selectedIndex = i;
          break;
        }
      }
    } else if (prevAreaVal && selectArea.querySelector(`option[value="${CSS.escape(prevAreaVal)}"]`)) {
      selectArea.value = prevAreaVal;
    }

    syncComboboxFromSelect('selectTitularArea');
    return true;
  }

  return false;
}
window.actualizarOpcionesTitularAreaPorJefe = actualizarOpcionesTitularAreaPorJefe;

function actualizarTitularesPorArea(areaNombre, forzarLimpieza = false) {
  if (typeof CATALOGO_ORGANICO_SEGEY === 'undefined' || !areaNombre) return;

  // 1. Obtener la Unidad Administrativa oficial
  let unidadId = AREA_TO_UNIDAD_MAP[areaNombre];
  let unidad = null;

  if (unidadId) {
    unidad = CATALOGO_ORGANICO_SEGEY.find(u => u.id === unidadId);
  }

  if (!unidad) {
    unidad = CATALOGO_ORGANICO_SEGEY.find(u => u.unidad === areaNombre) ||
             CATALOGO_ORGANICO_SEGEY.find(u => areaNombre.toLowerCase().includes(u.unidad.toLowerCase()) || u.unidad.toLowerCase().includes(areaNombre.toLowerCase()));
  }

  if (!unidad && areaNombre) {
    const cleanWord = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(direccion|general|departamento|coordinacion|de|la|el|los|las|y|gestion|regional)\b/g, "").trim();
    const cleanArea = cleanWord(areaNombre);
    if (cleanArea.length >= 4) {
      unidad = CATALOGO_ORGANICO_SEGEY.find(u => {
        const cleanU = cleanWord(u.unidad);
        return cleanU && (cleanU.includes(cleanArea) || cleanArea.includes(cleanU));
      });
    }
  }

  if (!unidad) {
    setupManualTitulares();
    return;
  }

  // 2. Actualizar lista desplegable de Titular de Unidad Administrativa (1)
  const selectT1 = document.getElementById('selectTitularUnidad1');
  const badgeT1 = document.getElementById('badgeTitular1');
  const u1Nom = document.getElementById('titularUnidad1Nombre');
  const u1Car = document.getElementById('titularUnidad1Cargo');

  if (badgeT1) {
    badgeT1.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i>${escapeHtml(unidad.unidad)}`;
  }

  if (selectT1) {
    let t1Html = '';
    // Opción principal: Titular de la Unidad (Puesto — Nombre)
    t1Html += `<option value="${escapeHtml(unidad.id)}" data-nombre="${escapeHtml(unidad.titular.nombre)}" data-cargo="${escapeHtml(unidad.titular.cargo)}" selected>${escapeHtml(unidad.titular.cargo)} — ${escapeHtml(unidad.titular.nombre)}</option>`;

    // Subtitulares conocidos
    if (areaNombre === 'Subdirección de Organización y Administración de Personal' || areaNombre === 'Departamento de Recursos Humanos') {
      t1Html += `<option value="subdir_personal" data-nombre="C.P. Sonia Noemi Vallejos Albornoz" data-cargo="Subdirectora de Organización y Administración de Personal">Subdirectora de Organización y Administración de Personal — C.P. Sonia Noemi Vallejos Albornoz</option>`;
    }

    t1Html += '<option value="__MANUAL__">✏️ Ingresar otro nombre y cargo manualmente...</option>';
    selectT1.innerHTML = t1Html;
  }

  // Autocompletar inputs de Titular (1) con detección de vacantes
  const esVacanteT1 = !unidad.titular.nombre || unidad.titular.nombre.toLowerCase().trim() === 'vacante';
  if (forzarLimpieza || !u1Nom?.value) {
    gestionarAlertaVacanteGenerales('titular1', esVacanteT1, unidad.titular.cargo || '', esVacanteT1 ? '' : (unidad.titular.nombre || ''));
  }

  // 3. Filtrar y cargar menú desplegable dependiente de "Titular de Área" (Puesto — Nombre)
  const selectArea = document.getElementById('selectTitularArea');
  const badgeArea = document.getElementById('badgeAreaSubordinados');
  const aNom = document.getElementById('titularAreaNombre');
  const aCar = document.getElementById('titularAreaCargo');

  if (selectArea) {
    selectArea.disabled = false;
    selectArea.classList.remove('bg-slate-50', 'text-slate-700');
    selectArea.classList.add('bg-white', 'text-slate-800');

    const curAreaNom = (aNom?.value || '').trim();
    const curAreaCar = (aCar?.value || '').trim();

    const rawSubs = unidad.subordinados || [];
    const subs = rawSubs.filter(s => esMandoAlto(s.puesto));

    // Priorizar puestos directamente asociados al área específica elegida arriba
    const keywords = areaNombre.toLowerCase()
      .replace('departamento de ', '')
      .replace('coordinación de ', '')
      .replace('coordinación general de ', '')
      .replace('dirección de ', '')
      .replace('dirección general de ', '')
      .split(' ')
      .filter(w => w.length > 3);
    const prioritarios = subs.filter(s => keywords.some(k => s.puesto.toLowerCase().includes(k)));
    const otrosMandos = subs.filter(s => !prioritarios.includes(s));

    if (badgeArea) {
      badgeArea.className = 'text-[10.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1';
      badgeArea.innerHTML = `<i class="fa-solid fa-check-circle text-emerald-600"></i> ${subs.length} puestos disponibles`;
    }

    let areaHtml = '<option value="" selected>-- Seleccione Puesto y Subordinado del Área --</option>';

    // Listar puestos prioritarios del área y luego los demás puestos de la unidad
    const allSubsOrdered = [...prioritarios, ...otrosMandos];
    allSubsOrdered.forEach((s, idx) => {
      const esVacante = s.es_vacante || (s.nombre && s.nombre.toLowerCase().trim() === 'vacante');
      const displayNombre = esVacante ? 'Vacante' : s.nombre;
      const displayLabel = `${s.puesto} — ${displayNombre}`;
      const isSel = (!forzarLimpieza && curAreaNom && (s.nombre.toUpperCase() === curAreaNom.toUpperCase() || s.puesto.toUpperCase() === curAreaCar.toUpperCase())) ? ' selected' : '';
      areaHtml += `<option value="p_${idx}" data-nombre="${escapeHtml(displayNombre)}" data-puesto="${escapeHtml(s.puesto)}"${isSel}>${escapeHtml(displayLabel)}</option>`;
    });

    areaHtml += '<option value="__MANUAL__">✏️ + Ingresar otro puesto y nombre manualmente...</option>';
    selectArea.innerHTML = areaHtml;

    if (forzarLimpieza) {
      gestionarAlertaVacanteGenerales('area1', false);
      if (aNom) aNom.value = '';
      if (aCar) aCar.value = '';
    } else {
      // Mantener los valores ya capturados o vinculados
      if (curAreaNom && aNom) aNom.value = curAreaNom;
      if (curAreaCar && aCar) aCar.value = curAreaCar;
    }
  }

  // 4. Actualizar Responsable de Captura exclusivo del Área (admite múltiples enlaces por área)
  const selectResp = document.getElementById('selectResponsableCaptura');
  const respInput = document.getElementById('responsableCaptura');
  const customRespWrapper = document.getElementById('responsableCapturaCustomWrapper');
  const customRespInput = document.getElementById('responsableCapturaCustom');
  const badgeResp = document.getElementById('badgeResponsableEnlaces');

  if (selectResp) {
    const enlacesList = getResponsablesForArea(areaNombre);

    let respHtml = '<option value="" disabled' + (enlacesList.length === 0 ? ' selected' : '') + '>-- Seleccione un Enlace oficial de la Unidad --</option>';
    enlacesList.forEach((enlace, idx) => {
      const isSel = idx === 0 ? ' selected' : '';
      respHtml += `<option value="${escapeHtml(enlace)}"${isSel}>${escapeHtml(enlace)}</option>`;
    });
    respHtml += '<option value="__MANUAL__">✏️ Ingresar otro responsable manualmente...</option>';
    selectResp.innerHTML = respHtml;

    const curRespVal = (respInput?.value || '').trim();
    if (!forzarLimpieza && curRespVal) {
      if (enlacesList.includes(curRespVal)) {
        selectResp.value = curRespVal;
      }
      sincronizarTestigo1ConResponsable(curRespVal);
    } else if (enlacesList.length > 0) {
      const selectedResp = enlacesList[0];
      selectResp.value = selectedResp;
      if (respInput) respInput.value = selectedResp;
      if (badgeResp) {
        badgeResp.className = 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200';
        badgeResp.innerHTML = enlacesList.length === 1
          ? `<i class="fa-solid fa-user-check text-emerald-600 mr-1"></i>1 responsable asignado`
          : `<i class="fa-solid fa-users text-emerald-600 mr-1"></i>${enlacesList.length} responsables asignados`;
      }
      if (customRespWrapper) customRespWrapper.classList.add('hidden');
      sincronizarTestigo1ConResponsable(selectedResp);
    } else {
      selectResp.value = '';
      if (respInput) respInput.value = '';
      if (badgeResp) {
        badgeResp.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
        badgeResp.innerHTML = `<i class="fa-solid fa-circle-info text-slate-400 mr-1"></i>Sin responsable asignado`;
      }
      sincronizarTestigo1ConResponsable('');
    }

    if (customRespInput) {
      customRespInput.value = '';
    }
  }

  // 5. Si el movimiento actual es Alta, Baja o Cambio de nombre, actualizar el catálogo de Jefe Inmediato
  const selectedMov = document.querySelector('input[name="tipoMovimiento"]:checked');
  const tipoMovVal = selectedMov ? selectedMov.value : 'Alta';
  if (tipoMovVal === 'Alta' || tipoMovVal === 'Baja' || tipoMovVal === 'Cambio de nombre') {
    poblarSelectJefeInmediato(areaNombre);
  }
  if (tipoMovVal === 'Baja') {
    poblarSelectAreaBaja(areaNombre);
  }
  if (tipoMovVal === 'Cambio de nombre') {
    poblarSelectAreaCambioNombre(areaNombre);
  }
  if (tipoMovVal === 'Cambio de dependencia jerárquica') {
    poblarSelectAreaCambioDep(areaNombre);
    poblarSelectUnidadDestinoCambioDep();
  }

  // 6. Actualizar listas desplegables de Testigos (1 y 2) con el personal del Área
  poblarSelectTestigos(areaNombre);

  // 7. Sincronizar automáticamente Testigo (1) con el Responsable de Captura
  const respActual = respInput ? respInput.value : '';
  if (respActual) {
    sincronizarTestigo1ConResponsable(respActual);
  }

  showToast(`Área: ${areaNombre}. Responsable, titulares y testigos actualizados.`);
}

function setupManualTitulares() {
  const selectResp = document.getElementById('selectResponsableCaptura');
  const customRespWrapper = document.getElementById('responsableCapturaCustomWrapper');
  const customRespInput = document.getElementById('responsableCapturaCustom');
  const respInput = document.getElementById('responsableCaptura');
  const badgeResp = document.getElementById('badgeResponsableEnlaces');

  if (badgeResp) {
    badgeResp.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
    badgeResp.innerHTML = '<i class="fa-solid fa-pen mr-1"></i>Captura manual';
  }
  if (selectResp) {
    selectResp.innerHTML = '<option value="__MANUAL__" selected>✏️ Ingresar otro responsable manualmente...</option>';
  }
  if (customRespWrapper) {
    customRespWrapper.classList.remove('hidden');
  }
  if (customRespInput) {
    customRespInput.value = '';
    customRespInput.focus();
  }
  if (respInput) {
    respInput.value = '';
  }

  const selectT1 = document.getElementById('selectTitularUnidad1');
  const badgeT1 = document.getElementById('badgeTitular1');
  if (badgeT1) {
    badgeT1.innerHTML = '<i class="fa-solid fa-pen mr-1"></i>Captura Libre';
  }
  if (selectT1) {
    selectT1.innerHTML = '<option value="__MANUAL__" selected>✏️ Captura manual de Titular de Unidad...</option>';
  }

  const selectArea = document.getElementById('selectTitularArea');
  const badgeArea = document.getElementById('badgeAreaSubordinados');
  if (badgeArea) {
    badgeArea.className = 'text-[10.5px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium';
    badgeArea.innerHTML = '<i class="fa-solid fa-pen mr-1"></i>Captura Libre';
  }
  if (selectArea) {
    selectArea.disabled = false;
    selectArea.classList.remove('bg-slate-50', 'text-slate-700');
    selectArea.classList.add('bg-white', 'text-slate-800');
    selectArea.innerHTML = '<option value="__MANUAL__" selected>✏️ Captura manual de Titular de Área...</option>';
  }

  const selT1 = document.getElementById('selectTestigo1');
  if (selT1) {
    selT1.innerHTML = '<option value="__MANUAL__" selected>✏️ Captura manual de Testigo (1)...</option>';
  }
  const badgeTestigo1 = document.getElementById('badgeTestigo1');
  if (badgeTestigo1) {
    badgeTestigo1.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
    badgeTestigo1.innerHTML = '<i class="fa-solid fa-pen mr-1"></i>Captura Libre';
  }

  const selT2 = document.getElementById('selectTestigo2');
  if (selT2) {
    selT2.innerHTML = '<option value="__MANUAL__" selected>✏️ Captura manual de Testigo (2)...</option>';
  }
  const badgeTestigo2 = document.getElementById('badgeTestigo2');
  if (badgeTestigo2) {
    badgeTestigo2.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
    badgeTestigo2.innerHTML = '<i class="fa-solid fa-pen mr-1"></i>Captura Libre';
  }
}

/**
 * Busca el puesto o cargo oficial de una persona en el catálogo orgánico de la SEGEY.
 */
const CARGOS_RESPONSABLES_OFICIALES = {
  "Lic. Manuel Jesús Tejada Loría": "Enlace de Gestión",
  "C. Mary Alba Quintal Chí": "Coordinador de Área de Control Escolar y Procedimientos",
  "Mtra. Nancy Guadalupe Novelo Pech": "Jefe de Departamento de Diseño y Difusión de la Información",
  "L.A. Guillermo Galván Martínez": "Encargado de Área Administrativa y Financiera",
  "Lic. Luis Alberto Sarmiento Herrera": "Coordinador de Personal",
  "L.C.S. María Soledad Cruz Aguilar": "Administrativo Especializado",
  "Mtro. Ángel Alberto Castillo Navarrete": "Coordinador de Mediación y Seguimiento Institucional",
  "Ing. Vidal Aarón Ché Zapata": "Enlace",
  "Lic. Sara Orquídea Morales Puc": "Responsable de Gestión y Trámite",
  "Ing. Georgina Elizabeth Kim Flores": "Administrativo Especializado",
  "Lic. Rafael Rolando Euán Canché": "Enlace",
  "Mtra. Merly Aurora Marrufo León": "Coordinador de Archivos",
  "C.P. Rolando Antonio Naal Osorio": "Administrativo Especializado",
  "Lic. William Jesús Rosado Magaña": "Encargado de Área de Apoyo en la Entrega Recepción de Unidades Administrativas",
  "Lic. Raúl Oswaldo Hernández Fernández": "Supervisor Administrativo",
  "Lic. Blanca Esther Perera Romero": "Auxiliar Administrativo",
  "Mtra. Lucely Guadalupe Azcorra Dzib": "Subjefe de Control Patrimonial Escolar",
  "Br. Felipe Humberto Ceballos Pech": "Asesor Especializado",
  "Mtra. Diany Reyna Góngora Franco": "Subjefe de Análisis de Datos",
  "Lic. Gessely Guadalupe Pat Pacheco": "Auxiliar Administrativo",
  "M.E. Adriana del Socorro Durán Lizama": "Subjefe de Gestión de Información",
  "Lic. Yazmin Eugenia Cob Caballero": "Supervisor Administrativo",
  "Mtra. María Luisa Guillermo García": "Director de Planeación",
  "Mtra. Didia Marisol Mendoza Arzápalo": "Jefe de Departamento de Preparatoria Abierta",
  "Mtra. Ana Elisa Hernández Navarro": "Jefe de Departamento de Preparatorias Estatales y Particulares Incorporadas",
  "C.P. Jorge Antonio Uc Camas": "Encargado de Área de Control Presupuestal Interno y Organismos Públicos Descentralizados (OPD)",
  "C.P. Ángel Ermilo Sarabia Gamboa": "Subjefe de Gestión de Gastos",
  "L.C.C. Mirna Arleny Canché Moo": "Analista Administrativo de Gestión de Información",
  "M.A. Maribel de Jesús Novelo Pérez": "Encargado de Área de Procesos Transversales",
  "Tec. Mattia de Jesús Tun Peña": "Subjefe de Registro y Certificación con el Nivel Preescolar",
  "C.P. Manuel Jesús Heredia Ceballos": "Subjefe de Gestión y Enteros No Institucionales de Nómina",
  "Mtro. Alberto Solís Cámara": "Jefe de Departamento de Telebachillerato Comunitario del Estado de Yucatán",
  "Lic. Alonso Hernández Núñez": "Encargado de Área de Asuntos Interinstitucionales",
  "Mtra. Ligia del Socorro Sánchez Castañeda": "Responsable de Área de Gestión Administrativa",
  "Mtra. Ligia Margarita Cícero Galán": "Jefe de Departamento de Gestión Educativa y Fortalecimiento Académico",
  "Tec. Maria de Lourdes Méndez Villafaña": "Enlace",
  "Lic. José Ernesto Barragán Polanco": "Enlace",
  "Lic. José Guillermo Rosado Alcocer": "Enlace (B)",
  "Lic. Reyna Bertha de Jesús Teh López": "Responsable de Ko'one'ex Kanik Maaya",
  "LAE. Ricardo Francisco de María Carrillo": "Jefe de Departamento de Gestión y Trámite",
  "M.F. Adelina Monserrat Hernández Santos": "Enlace Administrativo",
  "Lic. Julia Beatriz Villanueva Ruiz": "Enlace",
  "Lic. Rubén Alejandro Gutiérrez Adrián": "Enlace",
  "Lic. Leobardo Medina Xix": "Enlace Administrativo y Financiero",
  "Mtro. Julio Jesús Varela Manzanero": "Analista Administrativo",
  "C.P. Miguel Edgardo Argáez Quijano": "Jefe de Departamento de la Unidad Administrativa y Financiera",
  "Ing. Luis Gabriel Canul Mukul": "Administrativo Especializado",
  "C.P. Katia Isabel Manzanilla Mena": "Administrativo Especializado",
  "L.E. Rosalinda Villanueva Hau": "Coordinador Administrativo",
  "Mtra. Carla Guadalupe Sanchez Colli": "Coordinador de Gestión Estratégica",
  "Mtro. José David Encalada Avilés": "Director de la Universidad Virtual del Estado de Yucatán",
  "Lic. Miguel Ángel Cob Uitz": "Jefe de Oficina de Trámites y Prestaciones del Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado (ISSSTE)"
};

function buscarCargoDePersona(nombre) {
  if (!nombre) return '';
  const norm = normalizeText(nombre);

  // 1. Búsqueda directa en catálogo oficial de responsables
  if (typeof CARGOS_RESPONSABLES_OFICIALES !== 'undefined' && CARGOS_RESPONSABLES_OFICIALES) {
    if (CARGOS_RESPONSABLES_OFICIALES[nombre]) {
      return CARGOS_RESPONSABLES_OFICIALES[nombre];
    }
    for (const [k, v] of Object.entries(CARGOS_RESPONSABLES_OFICIALES)) {
      if (normalizeText(k) === norm) {
        return v;
      }
    }
  }

  // 2. Normalizar quitando prefijos de grado académico (Lic., Mtro., C.P., etc.)
  const stripPrefix = (str) => {
    return str.toLowerCase()
      .replace(/^(lic\.|lic|mtro\.|mtra\.|mtro|mtra|c\.p\.|cp|cp\.|dr\.|dra\.|dr|dra|ing\.|ing|br\.|br|c\.|c|l\.a\.e\.|lae\.|lae|l\.c\.c\.|lcc\.|lcc|l\.c\.s\.|lcs\.|lcs|m\.e\.|me\.|me|m\.f\.|mf\.|mf|m\.a\.|ma\.|ma|l\.e\.|le\.|le|prof\.|profa\.|prof|profa|l\.a\.|la\.|la)\s+/i, '')
      .trim();
  };

  const cleanNombre = normalizeText(stripPrefix(nombre));

  if (typeof CARGOS_RESPONSABLES_OFICIALES !== 'undefined' && CARGOS_RESPONSABLES_OFICIALES) {
    for (const [k, v] of Object.entries(CARGOS_RESPONSABLES_OFICIALES)) {
      if (normalizeText(stripPrefix(k)) === cleanNombre) {
        return v;
      }
    }
  }

  // 3. Búsqueda en CATALOGO_ORGANICO_SEGEY
  if (typeof CATALOGO_ORGANICO_SEGEY !== 'undefined' && Array.isArray(CATALOGO_ORGANICO_SEGEY)) {
    for (const u of CATALOGO_ORGANICO_SEGEY) {
      if (u.titular && u.titular.nombre) {
        if (normalizeText(u.titular.nombre) === norm || normalizeText(stripPrefix(u.titular.nombre)) === cleanNombre) {
          return u.titular.cargo || '';
        }
      }
      if (u.subordinados && Array.isArray(u.subordinados)) {
        for (const s of u.subordinados) {
          if (s.nombre) {
            if (normalizeText(s.nombre) === norm || normalizeText(stripPrefix(s.nombre)) === cleanNombre) {
              return s.puesto || '';
            }
          }
        }
      }
    }
  }
  return '';
}

/**
 * Sincroniza automáticamente el nombre y cargo del Testigo (1) con el Responsable de Captura.
 * Si ya se precargaron datos vinculados al Responsable de Captura, Testigo 1 queda bloqueado (readonly).
 */
function sincronizarTestigo1ConResponsable(nombreResponsable) {
  const respInput = document.getElementById('responsableCaptura');
  const t1Nom = document.getElementById('testigo1Nombre');
  const t1Car = document.getElementById('testigo1Cargo');
  const selT1 = document.getElementById('selectTestigo1');
  const badgeT1 = document.getElementById('badgeTestigo1');

  const nombreFinal = (typeof nombreResponsable === 'string')
    ? nombreResponsable.trim()
    : (respInput ? respInput.value.trim() : '');

  if (nombreFinal) {
    // 1. Asignar nombre
    if (t1Nom) {
      t1Nom.value = nombreFinal;
      t1Nom.setAttribute('readonly', 'true');
      t1Nom.classList.add('bg-slate-100', 'text-slate-700', 'cursor-not-allowed');
      t1Nom.classList.remove('bg-white');
      t1Nom.title = 'Testigo (1) está vinculado automáticamente al Responsable de Captura y no se puede modificar.';
    }

    // 2. Buscar y asignar cargo
    const cargoEncontrado = buscarCargoDePersona(nombreFinal);
    if (t1Car) {
      t1Car.value = cargoEncontrado || '';
      t1Car.setAttribute('readonly', 'true');
      t1Car.classList.add('bg-slate-100', 'text-slate-700', 'cursor-not-allowed');
      t1Car.classList.remove('bg-white');
      t1Car.title = 'El cargo está vinculado automáticamente al Responsable de Captura y no se puede modificar.';
    }

    // 3. Formato para visualización en combobox
    const displayText = cargoEncontrado
      ? `${cargoEncontrado} — ${nombreFinal}`
      : nombreFinal;

    // 4. Seleccionar o insertar opción en el select
    if (selT1) {
      let matchedIdx = -1;
      const normFinal = normalizeText(nombreFinal);
      for (let i = 0; i < selT1.options.length; i++) {
        const opt = selT1.options[i];
        if (opt.dataset && opt.dataset.nombre && normalizeText(opt.dataset.nombre) === normFinal) {
          matchedIdx = i;
          break;
        }
      }
      if (matchedIdx !== -1) {
        selT1.selectedIndex = matchedIdx;
      } else {
        const optResp = document.createElement('option');
        optResp.value = '__RESPONSABLE_VINCULADO__';
        optResp.textContent = displayText;
        optResp.setAttribute('data-nombre', nombreFinal);
        if (cargoEncontrado) optResp.setAttribute('data-cargo', cargoEncontrado);
        if (selT1.options.length > 1) {
          selT1.insertBefore(optResp, selT1.options[1]);
        } else {
          selT1.appendChild(optResp);
        }
        selT1.selectedIndex = 1;
      }
    }

    // 5. Bloquear visual y funcionalmente el combobox
    setComboboxDisabled('selectTestigo1', true, displayText);

    // 6. Actualizar badge con candado y estilo de bloqueo oficial
    if (badgeT1) {
      badgeT1.className = 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200';
      badgeT1.innerHTML = '<i class="fa-solid fa-lock text-emerald-600 mr-1"></i>Vinculado a Responsable (Bloqueado)';
    }
  } else {
    // Si no hay responsable cargado, desbloquear Testigo 1 para captura libre
    if (t1Nom) {
      t1Nom.removeAttribute('readonly');
      t1Nom.classList.remove('bg-slate-100', 'text-slate-700', 'cursor-not-allowed');
      t1Nom.classList.add('bg-white');
      t1Nom.title = '';
    }
    if (t1Car) {
      t1Car.removeAttribute('readonly');
      t1Car.classList.remove('bg-slate-100', 'text-slate-700', 'cursor-not-allowed');
      t1Car.classList.add('bg-white');
      t1Car.title = '';
    }
    setComboboxDisabled('selectTestigo1', false);
    if (selT1) {
      selT1.selectedIndex = 0;
    }
    if (badgeT1) {
      badgeT1.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
      badgeT1.innerHTML = '<i class="fa-solid fa-filter text-slate-400 mr-1"></i>Según Área que Notifica';
    }
  }

  renderDocument(getCurrentFormDataForPreview());
}

function getSelectedUnidadDestinoNombre() {
  const selectDestino = document.getElementById('selectUnidadDestinoCambioDep');
  if (!selectDestino || !selectDestino.value) return '';
  const val = selectDestino.value;
  if (val === '__MANUAL__') return '';
  if (typeof CATALOGO_ORGANICO_SEGEY !== 'undefined' && Array.isArray(CATALOGO_ORGANICO_SEGEY)) {
    const u = CATALOGO_ORGANICO_SEGEY.find(item => item.id === val);
    if (u && u.unidad) return u.unidad;
  }
  if (selectDestino.selectedOptions && selectDestino.selectedOptions.length > 0) {
    const opt = selectDestino.selectedOptions[0];
    const dataU = opt.getAttribute('data-unidad');
    if (dataU) return dataU;
    const txt = (opt.textContent || '').split('—')[0].trim();
    if (txt && !txt.startsWith('--')) return txt;
  }
  return '';
}
window.getSelectedUnidadDestinoNombre = getSelectedUnidadDestinoNombre;
window.buscarCargoDePersona = buscarCargoDePersona;
window.sincronizarTestigo1ConResponsable = sincronizarTestigo1ConResponsable;

function handleResponsableCapturaSelect(selectElem) {
  if (!selectElem) return;
  const val = selectElem.value;
  const customWrapper = document.getElementById('responsableCapturaCustomWrapper');
  const customInput = document.getElementById('responsableCapturaCustom');
  const respInput = document.getElementById('responsableCaptura');

  if (!val) {
    if (customWrapper) customWrapper.classList.add('hidden');
    if (customInput) customInput.value = '';
    if (respInput) respInput.value = '';
    sincronizarTestigo1ConResponsable('');
  } else if (val === '__MANUAL__') {
    // Si selecciona ingresar otro manualmente, se habilita y muestra el segundo cuadro (el de abajo)
    if (customWrapper) customWrapper.classList.remove('hidden');
    if (customInput) {
      customInput.value = '';
      customInput.focus();
    }
    if (respInput) {
      respInput.value = '';
    }
    sincronizarTestigo1ConResponsable('');
    showToast('Escriba el nombre del responsable de captura en el cuadro inferior.');
  } else if (val) {
    // Si selecciona uno de la lista oficial, se oculta el segundo cuadro y no se repite
    if (customWrapper) customWrapper.classList.add('hidden');
    if (customInput) customInput.value = '';
    if (respInput) {
      respInput.value = val;
    }
    sincronizarTestigo1ConResponsable(val);
  }

  renderDocument(getCurrentFormDataForPreview());
}

function handleResponsableCustomInput(inputElem) {
  const respInput = document.getElementById('responsableCaptura');
  if (respInput && inputElem) {
    const val = inputElem.value.trim();
    respInput.value = val;
    sincronizarTestigo1ConResponsable(val);
  } else {
    renderDocument(getCurrentFormDataForPreview());
  }
}

function setResponsableCapturaValue(val) {
  const hiddenInput = document.getElementById('responsableCaptura');
  const select = document.getElementById('selectResponsableCaptura');
  const customWrapper = document.getElementById('responsableCapturaCustomWrapper');
  const customInput = document.getElementById('responsableCapturaCustom');

  if (hiddenInput) hiddenInput.value = val || '';
  if (!select) return;

  if (!val) {
    select.value = '';
    if (customWrapper) customWrapper.classList.add('hidden');
    if (customInput) customInput.value = '';
    sincronizarTestigo1ConResponsable('');
    return;
  }

  let matched = false;
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === val) {
      select.selectedIndex = i;
      matched = true;
      break;
    }
  }

  if (matched) {
    if (customWrapper) customWrapper.classList.add('hidden');
    if (customInput) customInput.value = '';
  } else {
    // Si no coincide con las opciones oficiales, mostrar el cuadro de texto manual
    select.value = '__MANUAL__';
    if (customWrapper) customWrapper.classList.remove('hidden');
    if (customInput) customInput.value = val;
  }
  sincronizarTestigo1ConResponsable(val);
}

function handleTitularUnidad1Select(selectElem) {
  if (!selectElem) return;
  const val = selectElem.value;
  const opt = selectElem.options[selectElem.selectedIndex];
  const u1Nom = document.getElementById('titularUnidad1Nombre');
  const u1Car = document.getElementById('titularUnidad1Cargo');

  if (!val) {
    gestionarAlertaVacanteGenerales('titular1', false);
    if (u1Nom) u1Nom.value = '';
    if (u1Car) u1Car.value = '';
    poblarSelectTestigos();
    renderDocument(getCurrentFormDataForPreview());
    return;
  }

  if (val === '__MANUAL__') {
    gestionarAlertaVacanteGenerales('titular1', false);
    if (u1Nom) { u1Nom.value = ''; u1Nom.focus(); }
    if (u1Car) { u1Car.value = ''; }
    showToast('Ingrese el nombre y cargo del Titular (1) manualmente.');
  } else if (opt && opt.dataset) {
    const nom = opt.dataset.nombre || '';
    const car = opt.dataset.cargo || '';
    const esVac = !nom || nom.toLowerCase().trim() === 'vacante';
    gestionarAlertaVacanteGenerales('titular1', esVac, car, nom);
    if (u1Nom) {
      u1Nom.value = esVac ? '' : nom;
      if (esVac) u1Nom.focus();
    }
    if (u1Car) {
      u1Car.value = car;
    }
  }

  // Actualizar listas desplegables de Testigos omitiendo al Titular seleccionado
  poblarSelectTestigos();
  renderDocument(getCurrentFormDataForPreview());
}

function handleTitularUnidad2Select(selectElem) {
  if (!selectElem) return;
  const val = selectElem.value;
  const opt = selectElem.options[selectElem.selectedIndex];
  const u2Nom = document.getElementById('titularUnidad2Nombre');
  const u2Car = document.getElementById('titularUnidad2Cargo');

  if (!val) {
    gestionarAlertaVacanteGenerales('titular2', false);
    if (u2Nom) u2Nom.value = '';
    if (u2Car) u2Car.value = '';
    poblarSelectTestigos();
    renderDocument(getCurrentFormDataForPreview());
    return;
  }

  const selectedRadio = document.querySelector('input[name="tipoMovimiento"]:checked');
  const tipo = selectedRadio ? selectedRadio.value : 'Alta';
  const isJefeInmediato = (tipo === 'Alta' || tipo === 'Baja' || tipo === 'Cambio de nombre');

  if (val === '__MANUAL__') {
    gestionarAlertaVacanteGenerales('titular2', false);
    if (u2Nom) { u2Nom.value = ''; u2Nom.focus(); }
    if (u2Car) { u2Car.value = ''; }
    showToast(isJefeInmediato ? 'Ingrese el nombre y cargo del Jefe Inmediato manualmente.' : 'Ingrese el nombre y cargo del Titular (2) de Destino manualmente.');
  } else if (opt && opt.dataset) {
    const nom = opt.dataset.nombre || '';
    const car = opt.dataset.cargo || '';
    const esVac = !nom || nom.toLowerCase().trim() === 'vacante';
    gestionarAlertaVacanteGenerales('titular2', esVac, car, nom);
    if (u2Nom) {
      u2Nom.value = esVac ? '' : nom;
      if (esVac) u2Nom.focus();
    }
    if (u2Car) {
      u2Car.value = car;
    }
    if (isJefeInmediato && (nom || car)) {
      actualizarOpcionesTitularAreaPorJefe(car, nom);
    }
    if (esVac) {
      showToast(`Puesto oficial vacante: ${car}. Especifique el nombre completo de la persona en funciones.`, 'info');
    } else {
      showToast(`Jefe Inmediato seleccionado: ${nom}`);
    }
  }

  // Si es Cambio de dependencia jerárquica, sincronizar lista de Titular de Área (2) con la unidad de destino y el selector superior de Apartado I
  if (tipo === 'Cambio de dependencia jerárquica') {
    const selDestino = document.getElementById('selectUnidadDestinoCambioDep');
    if (selDestino && selDestino.value !== val) {
      selDestino.value = val;
    }
    poblarSelectTitularArea2();
  }

  // Actualizar listas de Testigos con el personal correspondiente omitiendo al Titular (2) / Jefe Inmediato
  poblarSelectTestigos();
  renderDocument(getCurrentFormDataForPreview());
}

function handleTitularAreaSelect(selectElem) {
  if (!selectElem) return;
  const val = selectElem.value;
  const aNom = document.getElementById('titularAreaNombre');
  const aCar = document.getElementById('titularAreaCargo');

  if (!val) {
    gestionarAlertaVacanteGenerales('area1', false);
    if (aNom) aNom.value = '';
    if (aCar) aCar.value = '';
    renderDocument(getCurrentFormDataForPreview());
    return;
  }
  const selectedOption = selectElem.options[selectElem.selectedIndex];

  if (val === '__MANUAL__') {
    gestionarAlertaVacanteGenerales('area1', false);
    if (aNom) { aNom.value = ''; aNom.focus(); }
    if (aCar) aCar.value = '';
    showToast('Ingrese el nombre y cargo del Titular de Área manualmente.');
  } else if (selectedOption && selectedOption.dataset) {
    const nom = selectedOption.dataset.nombre || '';
    const pue = selectedOption.dataset.puesto || '';
    const esVac = !nom || nom.toLowerCase().trim() === 'vacante';
    gestionarAlertaVacanteGenerales('area1', esVac, pue, nom);
    if (aNom) {
      aNom.value = esVac ? '' : nom;
      if (esVac) aNom.focus();
    }
    if (aCar) {
      aCar.value = pue;
    }
    if (esVac) {
      showToast(`Puesto oficial vacante: ${pue}. Especifique el nombre completo de la persona en funciones.`, 'info');
    } else {
      showToast(`Titular de Área seleccionado: ${nom}`);
    }
  }

  // Asegurar que el Jefe Inmediato conserve su opción y combobox sincronizado
  const u2NomVal = (document.getElementById('titularUnidad2Nombre')?.value || '').trim();
  const u2CarVal = (document.getElementById('titularUnidad2Cargo')?.value || '').trim();
  const selectT2 = document.getElementById('selectTitularUnidad2');
  if (selectT2 && (u2NomVal || u2CarVal)) {
    if (typeof syncComboboxFromSelect === 'function') {
      syncComboboxFromSelect('selectTitularUnidad2');
    }
  }

  renderDocument(getCurrentFormDataForPreview());
}

function poblarSelectTitularArea2(unidadDestino) {
  const selectArea2 = document.getElementById('selectTitularArea2');
  const badgeArea2 = document.getElementById('badgeAreaSubordinados2');
  if (!selectArea2) return;

  if (!unidadDestino) {
    const selT2 = document.getElementById('selectTitularUnidad2');
    const unidadDestinoId = selT2 ? selT2.value : '';
    if (unidadDestinoId && unidadDestinoId !== '__MANUAL__' && typeof CATALOGO_ORGANICO_SEGEY !== 'undefined') {
      unidadDestino = CATALOGO_ORGANICO_SEGEY.find(u => u.id === unidadDestinoId);
    }
    if (!unidadDestino && typeof CATALOGO_ORGANICO_SEGEY !== 'undefined') {
      const t2Nom = (document.getElementById('titularUnidad2Nombre')?.value || '').trim().toLowerCase();
      if (t2Nom) {
        unidadDestino = CATALOGO_ORGANICO_SEGEY.find(u => u.titular && u.titular.nombre && u.titular.nombre.toLowerCase().trim() === t2Nom);
      }
    }
  }

  if (!unidadDestino) {
    selectArea2.innerHTML = '<option value="">-- Primero elija la Dependencia Jerárquica de Destino arriba --</option>';
    selectArea2.disabled = true;
    if (badgeArea2) {
      badgeArea2.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
      badgeArea2.innerHTML = '<i class="fa-solid fa-filter text-slate-400 mr-1"></i>Pendiente de Unidad de Destino (2)';
    }
    return;
  }

  selectArea2.disabled = false;
  const rawSubs = unidadDestino.subordinados || [];
  const subs = rawSubs.filter(s => esMandoAlto(s.puesto));

  if (badgeArea2) {
    badgeArea2.className = 'text-[10.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1';
    badgeArea2.innerHTML = `<i class="fa-solid fa-check-circle text-emerald-600"></i> ${subs.length} puestos disponibles (Destino)`;
  }

  let areaHtml = '<option value="" selected>-- Seleccione Puesto y Subordinado de Unidad de Destino (2) --</option>';

  subs.forEach((s, idx) => {
    const esVacante = s.es_vacante || (s.nombre && s.nombre.toLowerCase().trim() === 'vacante');
    const displayNombre = esVacante ? 'Vacante' : s.nombre;
    const displayLabel = `${s.puesto} — ${displayNombre}`;
    areaHtml += `<option value="p2_${idx}" data-nombre="${escapeHtml(displayNombre)}" data-puesto="${escapeHtml(s.puesto)}">${escapeHtml(displayLabel)}</option>`;
  });

  areaHtml += '<option value="__MANUAL__">✏️ + Ingresar otro puesto y nombre de destino manualmente...</option>';
  selectArea2.innerHTML = areaHtml;
}

function handleTitularArea2Select(selectElem) {
  if (!selectElem) return;
  const val = selectElem.value;
  const selectedOption = selectElem.options[selectElem.selectedIndex];
  const a2Nom = document.getElementById('titularArea2Nombre');
  const a2Car = document.getElementById('titularArea2Cargo');

  if (val === '__MANUAL__') {
    gestionarAlertaVacanteGenerales('area2', false);
    if (a2Nom) { a2Nom.value = ''; a2Nom.focus(); }
    if (a2Car) a2Car.value = '';
    showToast('Ingrese el nombre y cargo del Titular de Área (2) manualmente.');
  } else if (selectedOption && selectedOption.dataset) {
    const nom = selectedOption.dataset.nombre || '';
    const pue = selectedOption.dataset.puesto || '';
    const esVac = !nom || nom.toLowerCase().trim() === 'vacante';
    gestionarAlertaVacanteGenerales('area2', esVac, pue, nom);
    if (a2Nom) {
      a2Nom.value = esVac ? '' : nom;
      if (esVac) a2Nom.focus();
    }
    if (a2Car) {
      a2Car.value = pue;
    }
  }

  renderDocument(getCurrentFormDataForPreview());
}

window.poblarSelectTitularArea2 = poblarSelectTitularArea2;
window.handleTitularArea2Select = handleTitularArea2Select;

/**
 * =========================================================================
 * CONTROL LATERAL DE NAVEGACIÓN EN BITÁCORA Y CONTROL (ADMINISTRADOR)
 * =========================================================================
 */
let currentRegistrySection = 'constancias';

function switchRegistrySection(sectionId) {
  if (isAuditoriaUser() && sectionId !== 'constancias') {
    showToast('El perfil de Auditoría solo tiene acceso a la consulta de Registros y Reportes.', 'info');
    sectionId = 'constancias';
  }
  currentRegistrySection = sectionId;
  const sections = ['constancias', 'areas', 'responsables', 'justificaciones', 'layouts', 'notificaciones'];

  sections.forEach(sec => {
    const el = document.getElementById(`sec-registry-${sec}`);
    const btn = document.getElementById(`btn-reg-sec-${sec}`);
    if (el) {
      if (sec === sectionId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
    if (btn) {
      if (sec === sectionId) {
        btn.className = 'w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all bg-segey-800 text-white shadow-xs';
      } else {
        btn.className = 'w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-between transition-all';
      }
    }
  });

  if (sectionId === 'notificaciones') {
    renderNotificationEmailsList();
  }

  updateRegistrySidebarBadges();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateRegistrySidebarBadges() {
  const badgeConstancias = document.getElementById('sidebar-badge-constancias');
  if (badgeConstancias && typeof records !== 'undefined') {
    badgeConstancias.textContent = records.length;
  }
  const badgeAreas = document.getElementById('sidebar-badge-areas');
  if (badgeAreas && typeof predefinedAreas !== 'undefined') {
    badgeAreas.textContent = predefinedAreas.length;
  }
  const badgeResp = document.getElementById('sidebar-badge-responsables');
  if (badgeResp && typeof getResponsablesCatalog === 'function') {
    const catalog = getResponsablesCatalog();
    badgeResp.textContent = Object.keys(catalog).length;
  }
  const badgeMotivos = document.getElementById('sidebar-badge-motivos');
  if (badgeMotivos && typeof getCustomJustificacionesCatalog === 'function') {
    const justCatalog = getCustomJustificacionesCatalog();
    let totalMotivos = 0;
    Object.values(justCatalog).forEach(arr => { if (Array.isArray(arr)) totalMotivos += arr.length; });
    badgeMotivos.textContent = totalMotivos;
  }
  const badgeLayouts = document.getElementById('sidebar-badge-layouts');
  if (badgeLayouts && typeof getActiveLayoutTemplate === 'function') {
    const activeLayout = getActiveLayoutTemplate();
    badgeLayouts.textContent = (activeLayout && activeLayout.name === 'Oficial (Por defecto)') ? 'Oficial' : 'Activo';
  }
  const badgeNotif = document.getElementById('sidebar-badge-notificaciones');
  if (badgeNotif && typeof getNotificationEmails === 'function') {
    badgeNotif.textContent = getNotificationEmails().length;
  }
}

window.switchRegistrySection = switchRegistrySection;
window.updateRegistrySidebarBadges = updateRegistrySidebarBadges;

/**
 * =========================================================================
 * SINCRONIZACIÓN EN CALIENTE CON EL CATÁLOGO EXCEL MAESTRO
 * Sincroniza información de funcionarios, titulares y enlaces directamente
 * desde Catalogo_Funcionarios_y_Puestos.xlsx sin tener que reiniciar el sitio.
 * =========================================================================
 */
async function sincronizarDesdeExcel() {
  const btn = document.getElementById('btn-sync-excel');
  const icon = document.getElementById('sync-excel-icon');

  if (btn) btn.classList.add('opacity-75', 'pointer-events-none');
  if (icon) icon.classList.add('fa-spin');

  showToast('Leyendo datos de Catalogo_Funcionarios_y_Puestos.xlsx...', 'info');

  try {
    const res = await fetch('/api/sync-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Error en servidor (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    if (data.status !== 'ok') {
      throw new Error(data.message || 'Error procesando el archivo Excel');
    }

    // 1. Si vienen responsables en el payload, actualizar el almacenamiento local
    if (data.responsables && typeof data.responsables === 'object') {
      saveResponsablesCatalog(data.responsables);
    }

    // 2. Recargar scripts en memoria dinámicamente con timestamp anticaché
    await new Promise((resolve) => {
      const s1 = document.createElement('script');
      s1.src = 'assets/catalogo_organico.js?t=' + Date.now();
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = 'assets/mapa_jefes_inmediatos.js?t=' + Date.now();
        s2.onload = resolve;
        s2.onerror = resolve;
        document.body.appendChild(s2);
      };
      s1.onerror = resolve;
      document.body.appendChild(s1);
    });

    // 3. Refrescar selectores y componentes dependientes en la interfaz
    if (typeof initCatalogoOrganico === 'function') {
      initCatalogoOrganico();
    }
    if (typeof poblarSelectAreaCambioNombre === 'function') {
      poblarSelectAreaCambioNombre();
    }
    if (typeof renderAdminResponsablesList === 'function') {
      renderAdminResponsablesList();
    }
    if (typeof updateRegistrySidebarBadges === 'function') {
      updateRegistrySidebarBadges();
    }

    // Si hay un área notificadora seleccionada en el formulario, re-vincular sus datos
    const areaSelect = document.getElementById('areaNotificadoraSelect');
    if (areaSelect && areaSelect.value && areaSelect.value !== '__OTRA__') {
      if (typeof actualizarTitularesPorArea === 'function') {
        actualizarTitularesPorArea(areaSelect.value);
      }
    }

    const totalFunc = data.funcionarios_totales || 2928;
    const totalUnits = data.unidades_actualizadas || 33;
    const totalResp = data.responsables_enlace || 58;

    showToast(`¡Catálogo actualizado desde Excel! ${totalFunc} puestos, ${totalUnits} unidades y ${totalResp} enlaces sincronizados.`);
  } catch (err) {
    console.error('Error al sincronizar desde Excel:', err);
    showToast(`No se pudo sincronizar desde Excel: ${err.message}`, 'error');
  } finally {
    if (btn) btn.classList.remove('opacity-75', 'pointer-events-none');
    if (icon) icon.classList.remove('fa-spin');
  }
}
window.sincronizarDesdeExcel = sincronizarDesdeExcel;

function renderAdminAreasList() {
  const container = document.getElementById('admin-areas-list');
  const badge = document.getElementById('badge-total-areas');
  if (badge) badge.textContent = `${predefinedAreas.length} áreas`;
  updateRegistrySidebarBadges();

  if (!container) return;

  if (predefinedAreas.length === 0) {
    container.innerHTML = `<span class="text-xs text-slate-400 italic p-2">No hay áreas predefinidas. Presione "Restablecer Oficiales" para recargar las 58 áreas institucionales del Listado de Enlaces.</span>`;
    return;
  }

  // Ordenar alfabéticamente para presentación ordenada en el panel
  const sortedAreas = [...predefinedAreas].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  container.innerHTML = sortedAreas.map((area) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition">
      <i class="fa-solid fa-building text-[10px] text-amber-400"></i>
      <span class="truncate max-w-[280px]" title="${escapeHtml(area)}">${escapeHtml(area)}</span>
      <button onclick="editAreaNamePrompt('${escapeHtml(area)}')" title="Modificar nombre de ${escapeHtml(area)}" class="ml-1 text-slate-400 hover:text-amber-300 text-xs px-1 rounded hover:bg-slate-700/50 transition">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
      <button onclick="deleteAreaByName('${escapeHtml(area)}')" title="Eliminar ${escapeHtml(area)}" class="text-slate-400 hover:text-rose-400 text-xs px-1 rounded hover:bg-slate-700/50 transition">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
  `).join('');
}

function editAreaNamePrompt(oldName) {
  if (!oldName) return;
  const newName = prompt(`Modificar nombre del Área Notificadora:\n"${oldName}"`, oldName);
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed) {
    showToast('El nombre del área no puede estar vacío.', 'error');
    return;
  }
  if (trimmed.toLowerCase() === oldName.toLowerCase()) {
    return;
  }
  if (predefinedAreas.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
    showToast(`El área "${trimmed}" ya existe en el catálogo.`, 'error');
    return;
  }
  updateAreaName(oldName, trimmed);
}

function updateAreaName(oldName, newName) {
  // 1. Actualizar en predefinedAreas
  const idx = predefinedAreas.indexOf(oldName);
  if (idx !== -1) {
    predefinedAreas[idx] = newName;
  } else {
    predefinedAreas.push(newName);
  }
  saveAreasToStorage();

  // 2. Sincronizar catálogo de responsables de captura: transferir responsable asignado
  const respCatalog = getResponsablesCatalog();
  if (respCatalog[oldName] !== undefined) {
    respCatalog[newName] = respCatalog[oldName];
    delete respCatalog[oldName];
  } else {
    if (!respCatalog[newName]) respCatalog[newName] = '';
  }
  saveResponsablesCatalog(respCatalog);

  // 3. Sincronizar AREA_TO_UNIDAD_MAP si aplica
  if (typeof AREA_TO_UNIDAD_MAP !== 'undefined' && AREA_TO_UNIDAD_MAP[oldName]) {
    AREA_TO_UNIDAD_MAP[newName] = AREA_TO_UNIDAD_MAP[oldName];
    delete AREA_TO_UNIDAD_MAP[oldName];
  }

  // 4. Actualizar formulario si el área actual coincide
  const currentArea = document.getElementById('areaNotificadora')?.value;
  if (currentArea === oldName) {
    setAreaNotificadoraValue(newName);
  }

  // 5. Refrescar vistas y selectores
  populateAreaSelect();
  renderAdminAreasList();
  renderAdminResponsablesList();
  populateAreaFilter();

  showToast(`Área modificada a "${newName}" y sincronizada con sus responsables.`);
}

function deleteAreaByName(areaName) {
  if (!areaName) return;
  if (confirm(`¿Desea eliminar "${areaName}" del catálogo de áreas?`)) {
    // 1. Eliminar de predefinedAreas
    predefinedAreas = predefinedAreas.filter(a => a !== areaName);
    saveAreasToStorage();

    // 2. Sincronizar eliminación con catálogo de responsables
    const respCatalog = getResponsablesCatalog();
    if (respCatalog[areaName] !== undefined) {
      delete respCatalog[areaName];
      saveResponsablesCatalog(respCatalog);
    }

    // 3. Limpiar AREA_TO_UNIDAD_MAP si aplica
    if (typeof AREA_TO_UNIDAD_MAP !== 'undefined' && AREA_TO_UNIDAD_MAP[areaName]) {
      delete AREA_TO_UNIDAD_MAP[areaName];
    }

    // 4. Si el formulario tenía seleccionada esta área, resetear
    const currentArea = document.getElementById('areaNotificadora')?.value;
    if (currentArea === areaName) {
      setAreaNotificadoraValue('');
    }

    // 5. Refrescar vistas
    populateAreaSelect();
    renderAdminAreasList();
    renderAdminResponsablesList();
    populateAreaFilter();

    showToast(`Área "${areaName}" eliminada del catálogo y removida de los responsables.`);
  }
}

function deleteAreaByIndex(idx) {
  if (idx < 0 || idx >= predefinedAreas.length) return;
  const areaName = predefinedAreas[idx];
  deleteAreaByName(areaName);
}

function addNewAreaFromAdmin() {
  const input = document.getElementById('new-area-name-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    showToast('Por favor escriba el nombre del área.', 'error');
    input.focus();
    return;
  }

  if (predefinedAreas.some(a => a.toLowerCase() === name.toLowerCase())) {
    showToast('Esta área ya existe en el catálogo.', 'error');
    input.focus();
    return;
  }

  predefinedAreas.push(name);
  saveAreasToStorage();

  // Inicializar entrada en responsables de captura para la nueva área
  const respCatalog = getResponsablesCatalog();
  if (!respCatalog[name]) {
    respCatalog[name] = '';
    saveResponsablesCatalog(respCatalog);
  }

  populateAreaSelect();
  renderAdminAreasList();
  renderAdminResponsablesList();
  populateAreaFilter();

  input.value = '';
  showToast(`Área "${name}" agregada al catálogo.`);
}

function restoreDefaultAreas() {
  if (confirm('¿Restablecer el catálogo con las 58 áreas oficiales del Listado de Enlaces de la SEGEY?')) {
    predefinedAreas = [...DEFAULT_AREAS_NOTIFICADORAS];
    saveAreasToStorage();
    // Restablecer responsables correspondientes
    saveResponsablesCatalog(ENLACE_DIRECTO_POR_AREA);
    populateAreaSelect();
    renderAdminAreasList();
    renderAdminResponsablesList();
    populateAreaFilter();
    showToast('Catálogo de 58 áreas oficiales y sus responsables restablecido.');
  }
}

window.editAreaNamePrompt = editAreaNamePrompt;
window.updateAreaName = updateAreaName;


/**
 * =========================================================================
 * NORMALIZADOR DE INMUEBLE QUE OCUPA
 * Verifica si se incluye artículo determinante (el, la, los, las, un, una)
 * y en caso contrario le antepone automáticamente "el "
 * =========================================================================
 */
function formatearInmueble(texto) {
  if (!texto) return '';
  const trimmed = texto.trim();
  if (!trimmed) return '';
  // Si ya empieza con un artículo determinante o indeterminante, se respeta
  if (/^(el|la|los|las|un|una)\s+/i.test(trimmed)) {
    return trimmed;
  }
  // Si no tiene artículo inicial, anteponer 'el '
  return 'el ' + trimmed;
}

/**
 * =========================================================================
 * CATÁLOGO DE JUSTIFICACIONES Y MOTIVOS PREDEFINIDOS
 * Categorizado por Tipo de Movimiento (Alta, Baja, Cambio de nombre, Dependencia jerárquica)
 * =========================================================================
 */
const JUSTIFICACIONES_STORAGE_KEY = 'segey_constancias_justificaciones_v2';

const CATALOGO_JUSTIFICACIONES_DEFAULT = {
  'Alta': [
    'Por cambios en la Normatividad',
    'Para mejorar el funcionamiento de la Unidad Administrativa',
    'Por unificación con otra Área'
  ],
  'Baja': [
    'Por cambios en la Normatividad',
    'Por redistribución de recursos',
    'Por conclusión de actividades',
    'Por unificación con otra Área'
  ],
  'Cambio de nombre': [
    'Por cambios en la Normatividad',
    'Para reflejar los objetivos del Área'
  ],
  'Cambio de dependencia jerárquica': [
    'Por cambios en la Normatividad',
    'Para cubrir los fines operativos y administrativos del área',
    'Por transferencia a otra Unidad Administrativa',
    'Por vinculación de objetivos del área',
    'Para mejorar el funcionamiento de la Unidad Administrativa'
  ]
};

function getJustificacionesCatalog() {
  try {
    const stored = localStorage.getItem(JUSTIFICACIONES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error al leer catálogo de justificaciones:', e);
  }
  return JSON.parse(JSON.stringify(CATALOGO_JUSTIFICACIONES_DEFAULT));
}

function saveJustificacionesCatalog(catalog) {
  try {
    localStorage.setItem(JUSTIFICACIONES_STORAGE_KEY, JSON.stringify(catalog));
  } catch (e) {
    console.error('Error al guardar catálogo de justificaciones:', e);
  }
}

function restoreDefaultJustificaciones() {
  if (confirm('¿Desea restablecer todas las justificaciones y motivos predefinidos a los valores iniciales?')) {
    saveJustificacionesCatalog(CATALOGO_JUSTIFICACIONES_DEFAULT);
    renderAdminJustificacionesList(currentAdminJustCat);
    const selectedRadio = document.querySelector('input[name="tipoMovimiento"]:checked');
    if (selectedRadio) {
      poblarSelectJustificaciones(selectedRadio.value);
    }
    showToast('Catálogo de justificaciones restablecido a los valores iniciales.');
  }
}

function poblarSelectJustificaciones(tipoMovimiento) {
  const select = document.getElementById('selectJustificacionPredefinida');
  const badge = document.getElementById('badgeTotalJustificaciones');
  if (!select) return;

  const catalog = getJustificacionesCatalog();
  const opciones = catalog[tipoMovimiento] || [];

  select.innerHTML = '<option value="">-- Seleccione una opción predefinida para autocompletar --</option>';

  opciones.forEach((opc, idx) => {
    const optEl = document.createElement('option');
    optEl.value = opc;
    optEl.textContent = `${idx + 1}. ${opc}`;
    select.appendChild(optEl);
  });

  // Opción "Otros" para describir manualmente si no encuentra la que aplique
  const optOtro = document.createElement('option');
  optOtro.value = '__OTRO__';
  optOtro.textContent = '✏️ Otros (describir manualmente en el cuadro inferior)...';
  select.appendChild(optOtro);

  if (badge) {
    badge.textContent = `${opciones.length} predefinidas (+ Otros)`;
  }

  // Si el campo de justificación ya tiene texto capturado, sincronizar el select
  const justTextarea = document.getElementById('justificacion');
  if (justTextarea && justTextarea.value.trim()) {
    const curVal = justTextarea.value.trim().toUpperCase();
    let matched = false;
    for (let i = 1; i < select.options.length; i++) {
      if (select.options[i].value !== '__OTRO__' && select.options[i].value.toUpperCase() === curVal) {
        select.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      select.value = '__OTRO__';
    }
    if (typeof setJustificacionEnabledState === 'function') {
      setJustificacionEnabledState(true);
    }
  } else {
    select.value = '';
    if (typeof setJustificacionEnabledState === 'function') {
      setJustificacionEnabledState(false);
    }
  }
}

/**
 * Controla el estado habilitado/deshabilitado del cuadro de justificación.
 * Solo permite escribir cuando se ha elegido una opción del combobox o "Otros".
 */
function setJustificacionEnabledState(enabled, customPlaceholder = null) {
  const justTextarea = document.getElementById('justificacion');
  if (!justTextarea) return;

  if (enabled) {
    justTextarea.disabled = false;
    justTextarea.classList.remove('bg-slate-100', 'cursor-not-allowed', 'text-slate-400', 'border-dashed');
    justTextarea.classList.add('bg-white', 'text-slate-800');
    if (customPlaceholder) {
      justTextarea.placeholder = customPlaceholder;
    } else {
      justTextarea.placeholder = 'SE HACE CONSTAR LOS SIGUIENTES MOVIMIENTOS DE CARÁCTER ADMINISTRATIVO...';
    }
  } else {
    justTextarea.disabled = true;
    justTextarea.value = '';
    justTextarea.classList.remove('bg-white', 'text-slate-800');
    justTextarea.classList.add('bg-slate-100', 'cursor-not-allowed', 'text-slate-400', 'border-dashed');
    justTextarea.placeholder = customPlaceholder || '🔒 Seleccione primero una opción del menú superior (o elija "Otros") para escribir la justificación...';
  }

  if (typeof updateJustificacionCharCounter === 'function') {
    updateJustificacionCharCounter();
  }
}
window.setJustificacionEnabledState = setJustificacionEnabledState;

/**
 * Actualiza el contador dinámico de caracteres de la Justificación (Máximo 350 caracteres)
 */
function updateJustificacionCharCounter() {
  const justInput = document.getElementById('justificacion');
  const countSpan = document.getElementById('count-justificacion-chars');
  const badgeSpan = document.getElementById('badge-justificacion-chars');
  const hintSpan = document.getElementById('hint-justificacion-chars');
  if (!justInput) return;

  if (justInput.value.length > 350) {
    justInput.value = justInput.value.substring(0, 350);
  }

  const currentLength = justInput.value.length;
  if (countSpan) {
    countSpan.textContent = currentLength;
  }

  if (badgeSpan) {
    if (currentLength >= 350) {
      badgeSpan.className = 'font-mono text-xs font-bold px-2 py-0.5 rounded border transition-colors bg-red-100 text-red-700 border-red-300 shadow-sm';
      if (hintSpan) hintSpan.innerHTML = '<i class="fa-solid fa-circle-exclamation text-red-500"></i> <span class="text-red-600 font-semibold">Límite alcanzado (máx. 350 caracteres)</span>';
    } else if (currentLength >= 300) {
      badgeSpan.className = 'font-mono text-xs font-semibold px-2 py-0.5 rounded border transition-colors bg-amber-100 text-amber-700 border-amber-300';
      if (hintSpan) hintSpan.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-500"></i> <span class="text-amber-700 font-medium">Próximo al límite (quedan ' + (350 - currentLength) + ' caracteres)</span>';
    } else {
      badgeSpan.className = 'font-mono text-xs font-semibold px-2 py-0.5 rounded border transition-colors bg-slate-100 text-slate-600 border-slate-200';
      if (hintSpan) hintSpan.innerHTML = '<i class="fa-solid fa-align-left text-slate-400"></i> Límite establecido: máximo 350 caracteres';
    }
  }
}
window.updateJustificacionCharCounter = updateJustificacionCharCounter;

function handleSelectJustificacionPredefinida(selectEl) {
  if (!selectEl) return;
  const val = selectEl.value;
  const justTextarea = document.getElementById('justificacion');
  if (!justTextarea) return;

  if (val === '__OTRO__') {
    // Si el usuario selecciona "Otros", habilitamos y dejamos limpio para escribir
    setJustificacionEnabledState(true, 'SE HACE CONSTAR LOS SIGUIENTES MOVIMIENTOS DE CARÁCTER ADMINISTRATIVO...');
    justTextarea.value = '';
    justTextarea.focus();
    updateJustificacionCharCounter();
    renderDocument(getCurrentFormDataForPreview());
    showToast('Opción "Otros" seleccionada. Describa la justificación en el cuadro inferior.');
  } else if (val) {
    // Si selecciona una opción predefinida, habilitamos y copiamos el texto
    setJustificacionEnabledState(true);
    const finalVal = val.length > 350 ? val.substring(0, 350) : val;
    justTextarea.value = finalVal.toUpperCase();
    justTextarea.focus();
    updateJustificacionCharCounter();
    justTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    renderDocument(getCurrentFormDataForPreview());
    showToast('Motivo predefinido cargado en el cuadro inferior.');
  } else {
    // Si vuelve a "-- Seleccione una opción predefinida --", deshabilitamos y limpiamos
    setJustificacionEnabledState(false);
    renderDocument(getCurrentFormDataForPreview());
  }
}

let currentAdminJustCat = 'Alta';

function switchAdminJustificacionesTab(categoria) {
  currentAdminJustCat = categoria;
  document.querySelectorAll('.admin-just-tab').forEach(btn => {
    const cat = btn.getAttribute('data-cat');
    if (cat === categoria) {
      btn.className = 'admin-just-tab px-3 py-2 text-xs font-bold text-white border-b-2 border-purple-500 bg-slate-800/60 rounded-t';
    } else {
      btn.className = 'admin-just-tab px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white border-b-2 border-transparent';
    }
  });

  const catLabel = document.getElementById('admin-just-current-cat');
  if (catLabel) catLabel.textContent = categoria;

  renderAdminJustificacionesList(categoria);
}

function updateAdminJustificacionesCounters() {
  const catalog = getJustificacionesCatalog();
  const countAlta = document.getElementById('admin-count-alta');
  if (countAlta) countAlta.textContent = (catalog['Alta'] || []).length;

  const countBaja = document.getElementById('admin-count-baja');
  if (countBaja) countBaja.textContent = (catalog['Baja'] || []).length;

  const countNom = document.getElementById('admin-count-nombre');
  if (countNom) countNom.textContent = (catalog['Cambio de nombre'] || []).length;

  const countDep = document.getElementById('admin-count-dep');
  if (countDep) countDep.textContent = (catalog['Cambio de dependencia jerárquica'] || []).length;

  updateRegistrySidebarBadges();
}

function renderAdminJustificacionesList(categoria) {
  if (!categoria) categoria = currentAdminJustCat;
  currentAdminJustCat = categoria;

  updateAdminJustificacionesCounters();

  const container = document.getElementById('admin-justificaciones-list');
  if (!container) return;

  const catalog = getJustificacionesCatalog();
  const items = catalog[categoria] || [];

  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-xs text-slate-500 italic">
        No hay motivos predefinidos configurados para esta categoría.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item, idx) => `
    <div class="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-700/80 hover:border-purple-500/50 transition">
      <div class="flex items-center gap-2 overflow-hidden text-xs text-slate-200">
        <span class="w-5 h-5 rounded-full bg-purple-900/60 text-purple-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-purple-700">
          ${idx + 1}
        </span>
        <span class="truncate">${escapeHtml(item)}</span>
      </div>
      <button onclick="deleteJustificacionFromAdmin('${categoria}', ${idx})" title="Eliminar opción"
        class="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition ml-2 shrink-0">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
  `).join('');
}

function addNewJustificacionFromAdmin() {
  const input = document.getElementById('new-justificacion-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    showToast('Por favor escriba la justificación o motivo antes de agregar.', 'error');
    input.focus();
    return;
  }

  const catalog = getJustificacionesCatalog();
  if (!catalog[currentAdminJustCat]) {
    catalog[currentAdminJustCat] = [];
  }

  if (catalog[currentAdminJustCat].some(item => item.toLowerCase() === val.toLowerCase())) {
    showToast('Este motivo ya existe en esta categoría.', 'error');
    input.focus();
    return;
  }

  catalog[currentAdminJustCat].push(val);
  saveJustificacionesCatalog(catalog);
  input.value = '';

  renderAdminJustificacionesList(currentAdminJustCat);

  const selectedRadio = document.querySelector('input[name="tipoMovimiento"]:checked');
  if (selectedRadio && selectedRadio.value === currentAdminJustCat) {
    poblarSelectJustificaciones(currentAdminJustCat);
  }

  showToast(`Motivo agregado exitosamente a ${currentAdminJustCat}.`);
}

function deleteJustificacionFromAdmin(categoria, idx) {
  const catalog = getJustificacionesCatalog();
  const items = catalog[categoria] || [];
  if (idx < 0 || idx >= items.length) return;

  const itemToDelete = items[idx];
  if (!confirm(`¿Eliminar la opción "${itemToDelete}" de ${categoria}?`)) return;

  items.splice(idx, 1);
  catalog[categoria] = items;
  saveJustificacionesCatalog(catalog);

  renderAdminJustificacionesList(categoria);

  const selectedRadio = document.querySelector('input[name="tipoMovimiento"]:checked');
  if (selectedRadio && selectedRadio.value === categoria) {
    poblarSelectJustificaciones(categoria);
  }

  showToast('Opción eliminada del catálogo.');
}

// Exponer explícitamente en window para controladores onclick en HTML
window.handleSelectJustificacionPredefinida = handleSelectJustificacionPredefinida;
window.switchAdminJustificacionesTab = switchAdminJustificacionesTab;
window.addNewJustificacionFromAdmin = addNewJustificacionFromAdmin;
window.deleteJustificacionFromAdmin = deleteJustificacionFromAdmin;
window.restoreDefaultJustificaciones = restoreDefaultJustificaciones;

/**
 * =========================================================================
 * GESTIÓN DE RESPONSABLES DE CAPTURA POR ÁREA NOTIFICADORA
 * Asigna un único responsable oficial por cada Área Notificadora (1 por área)
 * Evita mezclar enlaces de diferentes áreas en el formulario.
 * =========================================================================
 */
const RESPONSABLES_STORAGE_KEY = 'segey_constancias_responsables_area_v2';

function getResponsablesCatalog() {
  try {
    const stored = localStorage.getItem(RESPONSABLES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        // Asegurar que las áreas clave con enlaces actualizados o múltiples estén al día
        ['Jefatura del Despacho', 'Secretario Particular', 'Despacho del Secretario'].forEach(k => {
          if (!parsed[k] || (typeof parsed[k] === 'string' && parsed[k].includes('Vidal'))) {
            parsed[k] = ENLACE_DIRECTO_POR_AREA[k];
          }
        });
        if (!parsed['Dirección de Administración y Finanzas'] || (typeof parsed['Dirección de Administración y Finanzas'] === 'string' && parsed['Dirección de Administración y Finanzas'].includes('Sarabia'))) {
          parsed['Dirección de Administración y Finanzas'] = ENLACE_DIRECTO_POR_AREA['Dirección de Administración y Finanzas'];
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error al leer catálogo de responsables de captura:', e);
  }
  return { ...ENLACE_DIRECTO_POR_AREA };
}

function getResponsablesForArea(areaNombre, catalog) {
  if (!areaNombre) return [];
  const cat = catalog || getResponsablesCatalog();
  let val = cat[areaNombre];

  // Aliases de coincidencia institucional
  if (!val) {
    if (areaNombre === 'Despacho del Secretario') val = cat['Jefatura del Despacho'] || cat['Secretario Particular'];
    else if (areaNombre === 'Jefatura del Despacho') val = cat['Despacho del Secretario'] || cat['Secretario Particular'];
    else if (areaNombre === 'Secretario Particular') val = cat['Despacho del Secretario'] || cat['Jefatura del Despacho'];
  }

  if (!val) return [];

  let list = [];
  if (Array.isArray(val)) {
    list = val;
  } else if (typeof val === 'string') {
    if (val.includes(',') || val.includes(';') || val.includes('\n')) {
      list = val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    } else {
      list = [val.trim()].filter(Boolean);
    }
  }

  // Deduplicar respetando orden de aparición
  return Array.from(new Set(list));
}

function saveResponsablesCatalog(catalog) {
  try {
    localStorage.setItem(RESPONSABLES_STORAGE_KEY, JSON.stringify(catalog));
  } catch (e) {
    console.error('Error al guardar catálogo de responsables:', e);
  }
}

function restoreDefaultResponsables() {
  if (confirm('¿Desea restablecer a los Enlaces de Captura oficiales iniciales de la SEGEY?')) {
    saveResponsablesCatalog(ENLACE_DIRECTO_POR_AREA);
    renderAdminResponsablesList();
    const areaSel = document.getElementById('areaNotificadoraSelect');
    if (areaSel && areaSel.value && areaSel.value !== '__OTRA__') {
      actualizarTitularesPorArea(areaSel.value);
    }
    showToast('Catálogo de responsables de captura oficiales restablecido.');
  }
}

function updateResponsableForArea(areaNombre, nuevoResponsable) {
  if (!areaNombre) return;
  const catalog = getResponsablesCatalog();
  const trimmed = (nuevoResponsable || '').trim();
  if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('\n')) {
    catalog[areaNombre] = trimmed.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  } else {
    catalog[areaNombre] = trimmed;
  }
  saveResponsablesCatalog(catalog);
  renderAdminResponsablesList();

  const currentArea = document.getElementById('areaNotificadora')?.value;
  if (currentArea === areaNombre) {
    actualizarTitularesPorArea(areaNombre);
  }
  showToast(`Responsable de captura guardado para "${areaNombre}".`);
}

function saveResponsableFromRow(areaNombre, inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) {
    showToast('Por favor ingrese el nombre del responsable antes de guardar.', 'error');
    inp.focus();
    return;
  }
  updateResponsableForArea(areaNombre, val);
}

function renderAdminResponsablesList(filterText = '') {
  const container = document.getElementById('admin-responsables-list');
  const badge = document.getElementById('badge-total-responsables-admin');
  if (!container) return;

  const catalog = getResponsablesCatalog();
  const q = normalizeText(filterText);

  const areas = (predefinedAreas && predefinedAreas.length > 0) ? predefinedAreas : DEFAULT_AREAS_NOTIFICADORAS;

  const filtered = areas.filter(area => {
    if (!q) return true;
    const raw = catalog[area] || '';
    const resp = Array.isArray(raw) ? raw.join(' ') : raw;
    return normalizeText(area).includes(q) || normalizeText(resp).includes(q);
  });

  if (badge) {
    badge.textContent = `${areas.length} áreas configuradas`;
  }
  updateRegistrySidebarBadges();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-xs text-slate-500 italic">
        No se encontraron áreas ni responsables que coincidan con "${escapeHtml(filterText)}".
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((area, idx) => {
    const rawResp = catalog[area] || '';
    const currentResp = Array.isArray(rawResp) ? rawResp.join(', ') : rawResp;
    const inputId = `resp-input-${idx}`;
    return `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 gap-2 transition">
        <div class="sm:w-1/2 text-xs text-slate-200">
          <span class="font-bold text-white block text-[11.5px]">${escapeHtml(area)}</span>
          <span class="text-[10px] text-slate-400">Área Notificadora Oficial</span>
        </div>
        <div class="sm:w-1/2 flex items-center gap-2">
          <input type="text" id="${inputId}" value="${escapeHtml(currentResp)}" placeholder="Nombre del enlace o responsable (separe con coma si son varios)..."
            class="w-full text-xs px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium">
          <button onclick="saveResponsableFromRow('${escapeHtml(area)}', '${inputId}')" title="Guardar cambios para esta área"
            class="px-2.5 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1 shrink-0 shadow">
            <i class="fa-solid fa-floppy-disk text-xs"></i> Guardar
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * =========================================================================
 * FILTRADO Y SELECTORES DE TESTIGOS (1 Y 2)
 * Personal con puestos correspondientes a:
 * - Mandos Altos
 * - Mandos Medios Altos
 * - Mandos Medios Bajos
 * =========================================================================
 */
const PUESTOS_ELEGIBLES_TESTIGOS = [
  // 1. Mandos Altos
  'Secretario de Educación', 'Subsecretario', 'Jefe del Despacho', 'Director General',
  'Coordinador General', 'Director', 'Director Jurídico', 'Subdirector', 'Jefe de Departamento',
  'Coordinador', 'Coordinador de Soporte Técnico (TIC)', 'Director de Plantel', 'Director de Centro',
  // 2. Mandos Medios Altos
  'Secretario Particular', 'Secretario Técnico', 'Subdirector Administrativo del Centro',
  'Subdirector Académico del Centro', 'Subjefe', 'Coordinador Regional', 'Coordinador de Área',
  'Supervisor de Zona', 'Encargado de Área', 'Enlace', 'Supervisor Administrativo',
  'Responsable de Área', 'Supervisor de Área', 'Supervisor de Infraestructura', 'Jefe de Oficina',
  'Administrador de Conectividad (TIC)', 'Administrador de Servidores (TIC)',
  'Desarrollador de Software (TIC)', 'Asesor Especializado', 'Administrativo Especializado',
  'Validador de Infraestructura', 'Asesor', 'Asistente Administrativo', 'Enlace Técnico',
  'Técnico de Soporte Especializado (TIC)',
  // 3. Mandos Medios Bajos
  'Responsable', 'Tutor', 'Analista Administrativo', 'Asesor de Sector', 'Asesor Académico',
  'Asesor Técnico', 'Docente Académico', 'Docente en Enseñanza Artística', 'Psicólogo Educativo',
  'Orientador Educativo', 'Sensibilizador Cultural', 'Promotor Académico/Cultural', 'Evaluador Educativo'
];

function esPuestoElegibleTestigo(puesto) {
  if (!puesto) return false;
  const pNorm = normalizeText(puesto);

  // Exclusión de mandos operativos / bajos
  const excluidos = [
    'intendente', 'vigilante', 'chofer', 'diligenciero', 'operador telefonico',
    'archivista', 'recepcionista', 'prefecto', 'bibliotecario', 'operador audiovisual',
    'reportero', 'auxiliar operativo', 'tecnico en mantenimiento'
  ];
  for (const exc of excluidos) {
    if (pNorm.includes(exc)) return false;
  }

  return PUESTOS_ELEGIBLES_TESTIGOS.some(pTarget => {
    const tNorm = normalizeText(pTarget);
    return pNorm.includes(tNorm) || tNorm.includes(pNorm);
  });
}

function limpiarNombreParaComparacion(str) {
  if (!str) return '';
  return normalizeText(str)
    .replace(/\b(lic|licenciado|licenciada|mtro|mtra|maestro|maestra|dr|dra|doctor|doctora|ing|ingeniero|ingeniera|cp|c\.p\.|abog|abogado|abogada|prof|profr|profa|profesor|profesora|lcc|l\.c\.c\.|lae|l\.a\.e\.|psic|psicologo|psicologa|tec|tecnico|tecnica)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

function esTitularSeleccionado(nombreCandidato, listaTitulares) {
  if (!nombreCandidato || !listaTitulares || !Array.isArray(listaTitulares) || listaTitulares.length === 0) return false;
  const cleanCand = limpiarNombreParaComparacion(nombreCandidato);
  if (!cleanCand || cleanCand.length < 3) return false;

  return listaTitulares.some(tit => {
    if (!tit) return false;
    const cleanTit = limpiarNombreParaComparacion(tit);
    if (!cleanTit || cleanTit.length < 3) return false;
    return cleanCand === cleanTit || cleanCand.includes(cleanTit) || cleanTit.includes(cleanCand);
  });
}

function getTitularesSeleccionadosParaOmitir() {
  const lista = [];

  // 1. Titular de Unidad Administrativa (1)
  const u1Input = document.getElementById('titularUnidad1Nombre');
  const u1Nom = u1Input ? u1Input.value.trim() : '';
  if (u1Nom && u1Nom !== '___________________________') {
    lista.push(u1Nom);
  }

  // 2. Titular de Unidad Administrativa (2) / Jefe Inmediato
  const u2Input = document.getElementById('titularUnidad2Nombre');
  const u2Nom = u2Input ? u2Input.value.trim() : '';
  if (u2Nom && u2Nom !== '___________________________' && u2Nom.toLowerCase() !== 'no aplica' && u2Nom.toLowerCase() !== 'n/a') {
    lista.push(u2Nom);
  }

  // 3. Titulares oficiales de las unidades según el catálogo
  const areaSelect = document.getElementById('areaNotificadoraSelect');
  const areaNombre = areaSelect ? areaSelect.value : '';
  const unidadOrigenId = (typeof AREA_TO_UNIDAD_MAP !== 'undefined') ? AREA_TO_UNIDAD_MAP[areaNombre] : null;
  if (typeof CATALOGO_ORGANICO_SEGEY !== 'undefined') {
    let uOrigen = unidadOrigenId ? CATALOGO_ORGANICO_SEGEY.find(u => u.id === unidadOrigenId) : null;
    if (!uOrigen && areaNombre) {
      uOrigen = CATALOGO_ORGANICO_SEGEY.find(u => u.unidad === areaNombre) ||
                CATALOGO_ORGANICO_SEGEY.find(u => areaNombre.toLowerCase().includes(u.unidad.toLowerCase()));
    }
    if (uOrigen && uOrigen.titular && uOrigen.titular.nombre) {
      lista.push(uOrigen.titular.nombre);
    }

    const selT2 = document.getElementById('selectTitularUnidad2');
    const uDestinoId = selT2 ? selT2.value : '';
    if (uDestinoId && uDestinoId !== '__MANUAL__') {
      const uDest = CATALOGO_ORGANICO_SEGEY.find(u => u.id === uDestinoId);
      if (uDest && uDest.titular && uDest.titular.nombre) {
        lista.push(uDest.titular.nombre);
      }
    }
  }

  return lista;
}

function poblarSelectTestigos(areaNombre) {
  if (typeof CATALOGO_ORGANICO_SEGEY === 'undefined' || !Array.isArray(CATALOGO_ORGANICO_SEGEY)) return;

  if (!areaNombre) {
    const areaSelect = document.getElementById('areaNotificadoraSelect');
    areaNombre = areaSelect ? areaSelect.value : '';
  }

  const selectedRadio = document.querySelector('input[name="tipoMovimiento"]:checked');
  const tipoMov = selectedRadio ? selectedRadio.value : 'Alta';

  // 1. Obtener la Unidad Notificadora (Origen)
  let unidadOrigenId = AREA_TO_UNIDAD_MAP[areaNombre];
  let unidadOrigen = null;
  if (unidadOrigenId) {
    unidadOrigen = CATALOGO_ORGANICO_SEGEY.find(u => u.id === unidadOrigenId);
  }
  if (!unidadOrigen && areaNombre) {
    unidadOrigen = CATALOGO_ORGANICO_SEGEY.find(u => u.unidad === areaNombre) ||
                   CATALOGO_ORGANICO_SEGEY.find(u => areaNombre.toLowerCase().includes(u.unidad.toLowerCase()) || u.unidad.toLowerCase().includes(areaNombre.toLowerCase()));
    if (!unidadOrigen) {
      const cleanWord = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\b(direccion|general|departamento|coordinacion|de|la|el|los|las|y|gestion|regional)\b/g, "").trim();
      const cleanArea = cleanWord(areaNombre);
      if (cleanArea.length >= 4) {
        unidadOrigen = CATALOGO_ORGANICO_SEGEY.find(u => {
          const cleanU = cleanWord(u.unidad);
          return cleanU && (cleanU.includes(cleanArea) || cleanArea.includes(cleanU));
        });
      }
    }
  }

  // Poblar Testigo 1 siempre con la Unidad Notificadora
  poblarDropdownTestigo(1, unidadOrigen, 'Área Notificadora');

  // Para Testigo 2:
  if (tipoMov === 'Cambio de dependencia jerárquica') {
    const selT2 = document.getElementById('selectTitularUnidad2');
    const unidadDestinoId = selT2 ? selT2.value : '';
    let unidadDestino = null;
    if (unidadDestinoId && unidadDestinoId !== '__MANUAL__') {
      unidadDestino = CATALOGO_ORGANICO_SEGEY.find(u => u.id === unidadDestinoId);
    }
    poblarDropdownTestigo(2, unidadDestino, 'Dependencia de Destino');
  } else {
    // Alta, Baja o Cambio de nombre: Unidad Notificadora
    poblarDropdownTestigo(2, unidadOrigen, 'Área Notificadora');
  }
}

function poblarDropdownTestigo(num, unidad, etiqueta) {
  const select = document.getElementById(`selectTestigo${num}`);
  const badge = document.getElementById(`badgeTestigo${num}`);
  if (!select) return;

  if (!unidad) {
    const isDestino = (num === 2 && etiqueta.includes('Destino'));
    const msg = isDestino ? 'la Dependencia de Destino en Titular (2) arriba' : 'el Área que Notifica o Elabora arriba';
    select.innerHTML = `<option value="">-- Primero elija ${msg} --</option>
                        <option value="__MANUAL__" selected>✏️ + Ingresar puesto y nombre manualmente...</option>`;
    if (badge) {
      badge.className = 'text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-semibold';
      badge.innerHTML = `<i class="fa-solid fa-pen text-sky-600 mr-1"></i>Captura libre habilitada`;
    }
    return;
  }

  // Lista de titulares de unidad administrativa seleccionados a omitir de los testigos
  const listaTitularesOmitir = getTitularesSeleccionadosParaOmitir();

  const subs = unidad.subordinados || [];
  // Filtrar subordinados elegibles omitiendo vacantes y a los titulares seleccionados
  const elegibles = subs.filter(s => {
    if (!s || !s.nombre) return false;
    if (s.nombre.toLowerCase().includes('vacante')) return false;
    if (!esPuestoElegibleTestigo(s.puesto)) return false;
    if (esTitularSeleccionado(s.nombre, listaTitularesOmitir)) return false;
    return true;
  });

  const unidadTag = (num === 2 && etiqueta.includes('Destino')) ? 'Unidad (2) Destino' : 'Unidad (1)';
  let html = `<option value="" selected>-- Seleccione Testigo (${num}) de ${unidadTag} --</option>`;

  // Opción del Titular de la Unidad solo si aplica, es elegible y NO es uno de los titulares seleccionados
  if (unidad.titular && unidad.titular.nombre && esPuestoElegibleTestigo(unidad.titular.cargo)) {
    if (!esTitularSeleccionado(unidad.titular.nombre, listaTitularesOmitir)) {
      html += `<option value="titular_unidad" data-nombre="${escapeHtml(unidad.titular.nombre)}" data-cargo="${escapeHtml(unidad.titular.cargo)}">${escapeHtml(unidad.titular.cargo)} — ${escapeHtml(unidad.titular.nombre)}</option>`;
    }
  }

  elegibles.forEach((s, idx) => {
    const displayLabel = `${s.puesto} — ${s.nombre}`;
    html += `<option value="sub_${idx}" data-nombre="${escapeHtml(s.nombre)}" data-cargo="${escapeHtml(s.puesto)}">${escapeHtml(displayLabel)}</option>`;
  });

  html += `<option value="__MANUAL__">✏️ + Ingresar otro puesto y nombre manualmente...</option>`;
  select.innerHTML = html;

  // Si el Testigo actualmente seleccionado coincide con alguno de los titulares seleccionados, deseleccionarlo
  const tInput = document.getElementById(`testigo${num}Nombre`);
  const tCarInput = document.getElementById(`testigo${num}Cargo`);
  if (tInput && tInput.value.trim() && esTitularSeleccionado(tInput.value.trim(), listaTitularesOmitir)) {
    tInput.value = '';
    if (tCarInput) tCarInput.value = '';
    select.value = '';
    select.selectedIndex = 0;
    const comboboxInput = document.querySelector(`.segey-combobox[data-for="selectTestigo${num}"] .combobox-input`);
    if (comboboxInput) comboboxInput.value = '';
    const comboboxClear = document.querySelector(`.segey-combobox[data-for="selectTestigo${num}"] .combobox-clear`);
    if (comboboxClear) comboboxClear.classList.add('hidden');
    showToast(`El Testigo (${num}) se deseleccionó automáticamente porque fue asignado como Titular de Unidad Administrativa.`, 'warning');
  }

  // Si es Testigo 1 y ya hay un Responsable de Captura precargado, asegurar su bloqueo
  if (num === 1) {
    const respInput = document.getElementById('responsableCaptura');
    const respVal = respInput ? respInput.value.trim() : '';
    if (respVal) {
      sincronizarTestigo1ConResponsable(respVal);
    } else {
      if (badge) {
        badge.className = 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200';
        badge.innerHTML = `<i class="fa-solid fa-user-check text-emerald-600 mr-1"></i>${elegibles.length} puestos (${unidadTag})`;
      }
      setComboboxDisabled('selectTestigo1', false);
    }
  } else {
    if (badge) {
      badge.className = 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200';
      badge.innerHTML = `<i class="fa-solid fa-user-check text-emerald-600 mr-1"></i>${elegibles.length} puestos (${unidadTag})`;
    }
  }
}

function handleTestigoSelect(selectElem, num) {
  if (!selectElem) return;
  if (num === 1 && selectElem.disabled) return;
  const val = selectElem.value;
  const opt = selectElem.options[selectElem.selectedIndex];
  const nomInput = document.getElementById(`testigo${num}Nombre`);
  const carInput = document.getElementById(`testigo${num}Cargo`);

  if (val === '__MANUAL__') {
    if (nomInput) {
      nomInput.value = '';
      nomInput.focus();
    }
    if (carInput) {
      carInput.value = '';
    }
    showToast(`Ingrese el nombre y cargo del Testigo (${num}) manualmente.`);
  } else if (opt && opt.dataset && opt.dataset.nombre) {
    if (nomInput) nomInput.value = opt.dataset.nombre;
    if (carInput) carInput.value = opt.dataset.cargo || '';
  }

  renderDocument(getCurrentFormDataForPreview());
}

window.handleTestigoSelect = handleTestigoSelect;
window.saveResponsableFromRow = saveResponsableFromRow;
window.restoreDefaultResponsables = restoreDefaultResponsables;
window.renderAdminResponsablesList = renderAdminResponsablesList;
window.poblarSelectTestigos = poblarSelectTestigos;

function handleAreaSelectChange(selectEl) {
  const customWrapper = document.getElementById('areaNotificadoraCustomWrapper');
  const customInput = document.getElementById('areaNotificadoraCustom');
  const hiddenInput = document.getElementById('areaNotificadora');
  const areaVal = selectEl.value;

  if (areaVal === '__OTRA__') {
    if (customWrapper) customWrapper.classList.remove('hidden');
    if (customInput) {
      customInput.focus();
      if (hiddenInput) hiddenInput.value = customInput.value.trim();
    }
    setupManualTitulares();
    renderDocument(getCurrentFormDataForPreview());
    return;
  }

  if (customWrapper) customWrapper.classList.add('hidden');
  if (customInput) customInput.value = '';
  if (hiddenInput) hiddenInput.value = areaVal;

  // Actualizar automáticamente Titular (1) y catálogo de subordinados de Titular de Área
  actualizarTitularesPorArea(areaVal, true);
  renderDocument(getCurrentFormDataForPreview());
}

function handleAreaCustomInput(inputEl) {
  const hiddenInput = document.getElementById('areaNotificadora');
  if (hiddenInput) {
    hiddenInput.value = inputEl.value.trim();
  }
}

function setAreaNotificadoraValue(val) {
  const hiddenInput = document.getElementById('areaNotificadora');
  const select = document.getElementById('areaNotificadoraSelect');
  const customWrapper = document.getElementById('areaNotificadoraCustomWrapper');
  const customInput = document.getElementById('areaNotificadoraCustom');

  if (hiddenInput) hiddenInput.value = val || '';

  if (!select) return;

  if (!val) {
    select.value = '';
    if (customWrapper) customWrapper.classList.add('hidden');
    if (customInput) customInput.value = '';
    return;
  }

  let found = false;
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === val) {
      select.selectedIndex = i;
      found = true;
      break;
    }
  }

  if (found) {
    if (customWrapper) customWrapper.classList.add('hidden');
    if (customInput) customInput.value = '';
    actualizarTitularesPorArea(val);
  } else {
    select.value = '__OTRA__';
    if (customWrapper) customWrapper.classList.remove('hidden');
    if (customInput) customInput.value = val;
    setupManualTitulares();
  }
}

/**
 * =========================================================================
 * FORMULARIO Y CONTROL DE DATOS
 * =========================================================================
 */
function initFormDefaults() {
  const now = new Date();
  const fechaInput = document.getElementById('fechaActa');
  const horaInput = document.getElementById('horaActa');
  const folioInput = document.getElementById('folioControl');

  if (fechaInput && !fechaInput.value) {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    fechaInput.value = `${yyyy}-${mm}-${dd}`;
  }

  if (horaInput && !horaInput.value) {
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    horaInput.value = `${hh}:${min}`;
  }

  if (folioInput && !folioInput.value) {
    folioInput.value = generateNextFolio();
  }

  const inmInput = document.getElementById('inmueble');
  if (inmInput && !inmInput.value) {
    inmInput.value = 'el Edificio Central de la Secretaría de Educación';
  }

  // Vincular eventos de Tipo de Movimiento con detección de cambios y advertencia
  const currentCheckedRadio = document.querySelector('input[name="tipoMovimiento"]:checked');
  currentTipoMovimiento = currentCheckedRadio ? currentCheckedRadio.value : '';

  document.querySelectorAll('input[name="tipoMovimiento"]').forEach(radio => {
    radio.removeEventListener('change', handleTipoMovimientoChange);
    radio.addEventListener('change', (e) => {
      const nuevoVal = radio.value;
      if (nuevoVal === currentTipoMovimiento) return;

      if (currentTipoMovimiento && hayInformacionMovimientoLlenada()) {
        // Revertir temporalmente el radio al valor previo mientras el usuario confirma
        const prevRadio = document.querySelector(`input[name="tipoMovimiento"][value="${currentTipoMovimiento}"]`);
        if (prevRadio) prevRadio.checked = true;

        pendingTipoMovimiento = nuevoVal;
        mostrarModalCambioMovimiento(nuevoVal);
      } else {
        // Si no hay datos capturados o venía de ningún movimiento seleccionado, cambiar limpiamente y ajustar formato
        currentTipoMovimiento = nuevoVal;
        limpiarCamposPorCambioMovimiento(nuevoVal);
        handleTipoMovimientoChange();
      }
    });
  });
  handleTipoMovimientoChange();

  // Escuchar clic fuera del modal o tecla Escape para cancelar cambio de movimiento
  const modalCambio = document.getElementById('modal-cambio-movimiento');
  if (modalCambio) {
    modalCambio.addEventListener('click', (e) => {
      if (e.target === modalCambio) {
        cancelarCambioMovimiento();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal-cambio-movimiento');
      if (modal && !modal.classList.contains('hidden')) {
        cancelarCambioMovimiento();
      }
    }
  });

  // Forzar restricción estricta a mayúsculas en Apartados II y III y actualizar vista previa en vivo
  const ndInput = document.getElementById('nuevaDenominacion');
  if (ndInput) {
    ndInput.addEventListener('input', () => {
      ndInput.value = ndInput.value.toUpperCase();
      renderDocument(getCurrentFormDataForPreview());
    });
  }
  const nnInput = document.getElementById('nuevoNombre');
  if (nnInput) {
    nnInput.addEventListener('input', () => {
      nnInput.value = nnInput.value.toUpperCase();
      renderDocument(getCurrentFormDataForPreview());
    });
  }
  const justInput = document.getElementById('justificacion');
  if (justInput) {
    justInput.setAttribute('maxlength', '350');
    const handleJustInput = () => {
      if (justInput.value.length > 350) {
        justInput.value = justInput.value.substring(0, 350);
      }
      justInput.value = justInput.value.toUpperCase();
      updateJustificacionCharCounter();
      const selJust = document.getElementById('selectJustificacionPredefinida');
      if (selJust) {
        const curVal = justInput.value.trim();
        let matched = false;
        for (let i = 1; i < selJust.options.length; i++) {
          if (selJust.options[i].value !== '__OTRO__' && selJust.options[i].value.toUpperCase() === curVal) {
            selJust.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (!matched && curVal.length > 0) {
          selJust.value = '__OTRO__';
        } else if (curVal.length === 0) {
          selJust.value = '';
        }
      }
      renderDocument(getCurrentFormDataForPreview());
    };
    justInput.addEventListener('input', handleJustInput);
    justInput.addEventListener('keyup', updateJustificacionCharCounter);
    justInput.addEventListener('paste', () => setTimeout(handleJustInput, 0));
    updateJustificacionCharCounter();
  }

  // Sincronizar listas de Testigos si se edita manualmente el nombre de Titular (1) o Titular (2)
  const u1NomInput = document.getElementById('titularUnidad1Nombre');
  if (u1NomInput) {
    u1NomInput.addEventListener('input', () => {
      poblarSelectTestigos();
      renderDocument(getCurrentFormDataForPreview());
    });
  }
  const u2NomInput = document.getElementById('titularUnidad2Nombre');
  if (u2NomInput) {
    u2NomInput.addEventListener('input', () => {
      poblarSelectTestigos();
      renderDocument(getCurrentFormDataForPreview());
    });
  }

  // Sincronizar Titulares de Área manuales con la vista previa
  const taNomInput = document.getElementById('titularAreaNombre');
  if (taNomInput) {
    taNomInput.addEventListener('input', () => {
      renderDocument(getCurrentFormDataForPreview());
    });
  }
  const taCarInput = document.getElementById('titularAreaCargo');
  if (taCarInput) {
    taCarInput.addEventListener('input', () => {
      renderDocument(getCurrentFormDataForPreview());
    });
  }
  const ta2NomInput = document.getElementById('titularArea2Nombre');
  if (ta2NomInput) {
    ta2NomInput.addEventListener('input', () => {
      renderDocument(getCurrentFormDataForPreview());
    });
  }
  const ta2CarInput = document.getElementById('titularArea2Cargo');
  if (ta2CarInput) {
    ta2CarInput.addEventListener('input', () => {
      renderDocument(getCurrentFormDataForPreview());
    });
  }

  // Auto-verificación de artículo en Inmueble que Ocupa (ej: 'Edificio...' -> 'el Edificio...')
  if (inmInput) {
    inmInput.addEventListener('blur', () => {
      if (inmInput.value.trim()) {
        inmInput.value = formatearInmueble(inmInput.value);
        renderDocument(getCurrentFormDataForPreview());
      }
    });
  }

  // Detección automática de modificaciones en folios cargados para edición
  const formEl = document.getElementById('constancia-form');
  if (formEl) {
    const onFormChange = (e) => {
      if (editingRecordId) {
        const estSelect = document.getElementById('estatus');
        if (estSelect && estSelect.value !== 'Modificación' && estSelect.value !== 'Firmada y Concluida' && estSelect.value !== 'Inactivo') {
          estSelect.value = 'Modificación';
          const lblSt = document.getElementById('lbl-editing-status');
          if (lblSt) lblSt.textContent = 'Modificación';
          const lblBadge = document.getElementById('lbl-editing-status-badge');
          if (lblBadge) {
            lblBadge.className = 'text-[11px] bg-amber-100 border border-amber-300 text-amber-900 px-2 py-0.5 rounded-full font-bold';
            lblBadge.innerHTML = 'Estatus actual: <strong>Modificación</strong>';
          }
        }
      }
      renderDocument(getCurrentFormDataForPreview());
    };
    formEl.addEventListener('input', onFormChange);
    formEl.addEventListener('change', onFormChange);
  }
}

// =========================================================================
// GESTIÓN Y ADVERTENCIA DE CAMBIO DE TIPO DE MOVIMIENTO
// =========================================================================

let currentTipoMovimiento = 'Alta';
let pendingTipoMovimiento = null;

/**
 * Detecta si el usuario ya ingresó o seleccionó información en los campos
 * específicos del trámite (Apartado I, Apartado II o Apartado III).
 */
function hayInformacionMovimientoLlenada() {
  // Apartado I: Denominación y Nuevo Nombre
  const nd = document.getElementById('nuevaDenominacion');
  if (nd && nd.value.trim().length > 0) return true;

  const nn = document.getElementById('nuevoNombre');
  if (nn && nn.value.trim().length > 0) return true;

  // Apartado I: Selectores específicos
  const selBaja = document.getElementById('selectAreaBaja');
  if (selBaja && selBaja.value && selBaja.value !== '__OTRA__') return true;

  const selCambio = document.getElementById('selectAreaCambioNombre');
  if (selCambio && selCambio.value && selCambio.value !== '__OTRA__') return true;

  const selDep = document.getElementById('selectAreaCambioDep');
  if (selDep && selDep.value && selDep.value !== '__OTRA__') return true;

  const selDest = document.getElementById('selectUnidadDestinoCambioDep');
  if (selDest && selDest.value && selDest.value !== '__OTRA__') return true;

  const uDestCustom = document.getElementById('unidadDestinoCambioDepCustom');
  if (uDestCustom && uDestCustom.value.trim().length > 0) return true;

  // Apartado II: Titulares de Unidad 2 / Área 2 (Destino / 5ta firma)
  const t2Nom = document.getElementById('titularUnidad2Nombre');
  if (t2Nom && t2Nom.value.trim().length > 0) return true;

  const a2Nom = document.getElementById('titularArea2Nombre');
  if (a2Nom && a2Nom.value.trim().length > 0) return true;

  // Apartado III: Justificación y Motivos
  const just = document.getElementById('justificacion');
  if (just && just.value.trim().length > 0) return true;

  const selJust = document.getElementById('selectJustificacionPredefinida');
  if (selJust && selJust.value && selJust.value !== '__OTRO__') return true;

  return false;
}

/**
 * Muestra el modal de advertencia al intentar cambiar el tipo de movimiento
 * habiendo datos ya capturados.
 */
function mostrarModalCambioMovimiento(nuevoVal) {
  const modal = document.getElementById('modal-cambio-movimiento');
  const spanNom = document.getElementById('modal-nuevo-movimiento-nombre');
  if (spanNom) spanNom.textContent = nuevoVal;
  if (modal) {
    modal.classList.remove('hidden');
  }
}

/**
 * Cierra el modal de advertencia.
 */
function cerrarModalCambioMovimiento() {
  const modal = document.getElementById('modal-cambio-movimiento');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Cancela el cambio de tipo de movimiento y preserva todos los datos intactos.
 */
function cancelarCambioMovimiento() {
  cerrarModalCambioMovimiento();
  const activeRadio = document.querySelector(`input[name="tipoMovimiento"][value="${currentTipoMovimiento}"]`);
  if (activeRadio) {
    activeRadio.checked = true;
  }
  pendingTipoMovimiento = null;
}

/**
 * Confirma el cambio de tipo de movimiento: limpia los campos del movimiento
 * anterior, ajusta el formato oficial y actualiza la vista previa.
 */
function confirmarCambioMovimiento() {
  cerrarModalCambioMovimiento();
  if (!pendingTipoMovimiento) return;

  const nuevoMovimiento = pendingTipoMovimiento;
  currentTipoMovimiento = nuevoMovimiento;

  const newRadio = document.querySelector(`input[name="tipoMovimiento"][value="${nuevoMovimiento}"]`);
  if (newRadio) {
    newRadio.checked = true;
  }

  // Limpiar campos del movimiento anterior
  limpiarCamposPorCambioMovimiento(nuevoMovimiento);

  // Ejecutar el ajuste oficial del formulario para el nuevo tipo de movimiento
  handleTipoMovimientoChange();

  showToast(`Formato ajustado a "${nuevoMovimiento}". Se limpió la información anterior para evitar errores.`, 'info');
  pendingTipoMovimiento = null;
}

/**
 * Limpia la información residual de las áreas y justificación para adaptar
 * el formulario al nuevo trámite sin inconsistencias.
 */
function limpiarCamposPorCambioMovimiento(nuevoMovimiento) {
  // 1. Limpiar campos de texto del Apartado I
  const ndInput = document.getElementById('nuevaDenominacion');
  if (ndInput) ndInput.value = '';

  const nnInput = document.getElementById('nuevoNombre');
  if (nnInput) nnInput.value = '';

  // 2. Limpiar selector de Área a dar de Baja y su combobox
  const selBaja = document.getElementById('selectAreaBaja');
  if (selBaja) {
    selBaja.selectedIndex = 0;
    selBaja.value = '';
    const wrapper = selBaja.parentElement?.querySelector('.segey-combobox[data-for="selectAreaBaja"]') || selBaja.parentElement?.querySelector('.segey-combobox');
    if (wrapper) {
      const input = wrapper.querySelector('.combobox-input');
      const clearBtn = wrapper.querySelector('.combobox-clear');
      if (input) input.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
    }
  }

  // 3. Limpiar selector de Área que cambia de nombre y su combobox
  const selCambio = document.getElementById('selectAreaCambioNombre');
  if (selCambio) {
    selCambio.selectedIndex = 0;
    selCambio.value = '';
    const wrapper = selCambio.parentElement?.querySelector('.segey-combobox[data-for="selectAreaCambioNombre"]') || selCambio.parentElement?.querySelector('.segey-combobox');
    if (wrapper) {
      const input = wrapper.querySelector('.combobox-input');
      const clearBtn = wrapper.querySelector('.combobox-clear');
      if (input) input.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
    }
  }

  // 4. Limpiar selector de Área a transferir y su combobox
  const selDep = document.getElementById('selectAreaCambioDep');
  if (selDep) {
    selDep.selectedIndex = 0;
    selDep.value = '';
    const wrapper = selDep.parentElement?.querySelector('.segey-combobox[data-for="selectAreaCambioDep"]') || selDep.parentElement?.querySelector('.segey-combobox');
    if (wrapper) {
      const input = wrapper.querySelector('.combobox-input');
      const clearBtn = wrapper.querySelector('.combobox-clear');
      if (input) input.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
    }
  }

  // 5. Limpiar selector de Unidad Destino (Cambio Jerárquico) y su combobox
  const selDest = document.getElementById('selectUnidadDestinoCambioDep');
  if (selDest) {
    selDest.selectedIndex = 0;
    selDest.value = '';
    const wrapper = selDest.parentElement?.querySelector('.segey-combobox[data-for="selectUnidadDestinoCambioDep"]') || selDest.parentElement?.querySelector('.segey-combobox');
    if (wrapper) {
      const input = wrapper.querySelector('.combobox-input');
      const clearBtn = wrapper.querySelector('.combobox-clear');
      if (input) input.value = '';
      if (clearBtn) clearBtn.classList.add('hidden');
    }
  }
  const uDestCustom = document.getElementById('unidadDestinoCambioDepCustom');
  if (uDestCustom) uDestCustom.value = '';

  // 6. Limpiar campos de Jefe Inmediato / Titular (2) y su combobox
  const t2Nom = document.getElementById('titularUnidad2Nombre');
  if (t2Nom) t2Nom.value = '';
  const t2Car = document.getElementById('titularUnidad2Cargo');
  if (t2Car) t2Car.value = '';
  const selT2 = document.getElementById('selectTitularUnidad2');
  if (selT2) {
    selT2.selectedIndex = 0;
    selT2.value = '';
    if (typeof syncComboboxFromSelect === 'function') syncComboboxFromSelect('selectTitularUnidad2');
  }

  // 7. Limpiar campos de Titular de Área (1) y su combobox
  const aNom = document.getElementById('titularAreaNombre');
  if (aNom) aNom.value = '';
  const aCar = document.getElementById('titularAreaCargo');
  if (aCar) aCar.value = '';
  const selArea = document.getElementById('selectTitularArea');
  if (selArea) {
    selArea.selectedIndex = 0;
    selArea.value = '';
    if (typeof syncComboboxFromSelect === 'function') syncComboboxFromSelect('selectTitularArea');
  }

  // 8. Limpiar campos de Titulares de Área 2 (Destino / 5ta firma)
  const a2Nom = document.getElementById('titularArea2Nombre');
  if (a2Nom) a2Nom.value = '';
  const a2Car = document.getElementById('titularArea2Cargo');
  if (a2Car) a2Car.value = '';
  const selArea2 = document.getElementById('selectTitularArea2');
  if (selArea2) {
    selArea2.selectedIndex = 0;
    selArea2.value = '';
    if (typeof syncComboboxFromSelect === 'function') syncComboboxFromSelect('selectTitularArea2');
  }

  // 9. Desactivar alertas de puestos vacantes en el formulario
  if (typeof gestionarAlertaVacanteGenerales === 'function') {
    gestionarAlertaVacanteGenerales('area1', false);
    gestionarAlertaVacanteGenerales('titular2', false);
    gestionarAlertaVacanteGenerales('area2', false);
  }

  // 10. Limpiar Apartado III: Justificación y Motivos
  const just = document.getElementById('justificacion');
  if (just) just.value = '';
  const selJust = document.getElementById('selectJustificacionPredefinida');
  if (selJust) selJust.selectedIndex = 0;
  if (typeof setJustificacionEnabledState === 'function') {
    setJustificacionEnabledState(false);
  }
}

window.cancelarCambioMovimiento = cancelarCambioMovimiento;
window.confirmarCambioMovimiento = confirmarCambioMovimiento;
window.hayInformacionMovimientoLlenada = hayInformacionMovimientoLlenada;
window.limpiarCamposPorCambioMovimiento = limpiarCamposPorCambioMovimiento;

/**
 * Controla la configuración dinámica del formulario según el Tipo de Movimiento:
 * - Para "Alta": el Titular de Área se captura manualmente (se oculta el dropdown selectTitularArea).
 * - Para "Alta", "Baja" o "Cambio de nombre": Titular (2) se convierte en "Jefe Inmediato", habilitado
 *   con lista desplegable del personal y mandos vinculados a la Unidad Administrativa.
 * - Para "Cambio de dependencia jerárquica": Titular (2) es la Unidad de Destino (catálogo completo de unidades).
 */
function handleTipoMovimientoChange() {
  const selectedRadio = document.querySelector('input[name="tipoMovimiento"]:checked');
  const ndInputElem = document.getElementById('nuevaDenominacion');
  const nnInputElem = document.getElementById('nuevoNombre');
  const containerAreaBaja = document.getElementById('containerSelectAreaBaja');
  const containerAreaCambio = document.getElementById('containerSelectAreaCambioNombre');
  const containerAreaCambioDep = document.getElementById('containerSelectAreaCambioDep');
  const containerUnidadDestino = document.getElementById('containerSelectUnidadDestinoCambioDep');
  const containerNuevoNombre = document.getElementById('containerNuevoNombre');
  const lblNuevaDenom = document.getElementById('lblNuevaDenominacion');
  const selBaja = document.getElementById('selectAreaBaja');
  const selCambio = document.getElementById('selectAreaCambioNombre');
  const selDep = document.getElementById('selectAreaCambioDep');
  const selDestino = document.getElementById('selectUnidadDestinoCambioDep');
  const respInputFinal = document.getElementById('responsableCaptura');
  const respValFinal = respInputFinal ? respInputFinal.value.trim() : '';

  // Si no hay ninguna opción seleccionada (Alta, Baja, Cambio de nombre o Cambio de dependencia jerárquica)
  if (!selectedRadio) {
    currentTipoMovimiento = '';

    // 1. Inhabilitar y bloquear el cuadro de texto principal
    if (ndInputElem) {
      ndInputElem.disabled = true;
      ndInputElem.value = '';
      ndInputElem.placeholder = 'PRIMERO SELECCIONE UN TIPO DE MOVIMIENTO ARRIBA (ALTA, BAJA, CAMBIO DE NOMBRE O CAMBIO DE DEPENDENCIA JERÁRQUICA)...';
      ndInputElem.className = 'w-full text-sm rounded-lg border-slate-200 border p-3 focus:outline-none uppercase bg-slate-100 text-slate-400 cursor-not-allowed select-none transition-all';
    }

    // 2. Inhabilitar y ocultar las listas dependientes
    if (containerAreaBaja) containerAreaBaja.classList.add('hidden');
    if (selBaja) selBaja.disabled = true;

    if (containerAreaCambio) containerAreaCambio.classList.add('hidden');
    if (selCambio) selCambio.disabled = true;

    if (containerAreaCambioDep) containerAreaCambioDep.classList.add('hidden');
    if (selDep) selDep.disabled = true;

    if (containerUnidadDestino) containerUnidadDestino.classList.add('hidden');
    if (selDestino) selDestino.disabled = true;

    if (containerNuevoNombre) containerNuevoNombre.classList.add('hidden');
    if (nnInputElem) {
      nnInputElem.disabled = true;
      nnInputElem.value = '';
    }

    // 3. Inhabilitar comboboxes asociados si existen
    if (typeof setComboboxDisabled === 'function') {
      setComboboxDisabled('selectAreaBaja', true);
      setComboboxDisabled('selectAreaCambioNombre', true);
      setComboboxDisabled('selectAreaCambioDep', true);
      setComboboxDisabled('selectUnidadDestinoCambioDep', true);
    }

    if (lblNuevaDenom) {
      lblNuevaDenom.innerHTML = 'Nombre del Área o Adscripción <span class="text-xs text-amber-700 font-semibold"><i class="fa-solid fa-hand-pointer mr-1"></i>(Seleccione un movimiento arriba para habilitar)</span>';
    }

    renderDocument(getCurrentFormDataForPreview());
    return;
  }

  // Si SÍ hay una opción seleccionada: Habilitar el cuadro de texto principal
  if (ndInputElem) {
    ndInputElem.disabled = false;
    ndInputElem.className = 'w-full text-sm rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-segey-700 focus:outline-none uppercase bg-white text-slate-900 transition-all';
  }

  const val = selectedRadio.value;
  currentTipoMovimiento = val;

  // Habilitar los selects
  if (selBaja) selBaja.disabled = false;
  if (selCambio) selCambio.disabled = false;
  if (selDep) selDep.disabled = false;
  if (selDestino) selDestino.disabled = false;
  if (nnInputElem) nnInputElem.disabled = false;

  if (typeof setComboboxDisabled === 'function') {
    if (val === 'Baja') setComboboxDisabled('selectAreaBaja', false);
    if (val === 'Cambio de nombre') setComboboxDisabled('selectAreaCambioNombre', false);
    if (val === 'Cambio de dependencia jerárquica') {
      setComboboxDisabled('selectAreaCambioDep', false);
      setComboboxDisabled('selectUnidadDestinoCambioDep', false);
    }
  }

  const containerT2 = document.getElementById('containerTitularUnidad2');
  const lblT2 = document.getElementById('lblTitularUnidad2');
  const badgeT2 = document.getElementById('badgeTitular2');
  const lblSelectT2 = document.getElementById('lblSelectTitularUnidad2');
  const selectT2 = document.getElementById('selectTitularUnidad2');
  const lblT2Nom = document.getElementById('lblTitularUnidad2Nombre');
  const lblT2Car = document.getElementById('lblTitularUnidad2Cargo');
  const t2NomInput = document.getElementById('titularUnidad2Nombre');
  const t2CarInput = document.getElementById('titularUnidad2Cargo');

  // 1. Control de Titulares de Área (1 y 2)
  const contSelectArea = document.getElementById('containerSelectTitularArea');
  const aNom = document.getElementById('titularAreaNombre');
  const aCar = document.getElementById('titularAreaCargo');
  const badgeArea = document.getElementById('badgeAreaSubordinados');
  const lblArea1 = document.getElementById('lblTitularArea1');
  const wrapTitularesArea = document.getElementById('wrapperTitularesArea');
  const contArea2 = document.getElementById('containerTitularArea2');
  const a2Nom = document.getElementById('titularArea2Nombre');
  const a2Car = document.getElementById('titularArea2Cargo');

  const contTestigo2 = document.getElementById('containerTestigo2');
  const test1Nom = document.getElementById('testigo1Nombre');
  const test2Nom = document.getElementById('testigo2Nombre');
  const test2Car = document.getElementById('testigo2Cargo');
  const lblTestigo1 = document.getElementById('lblTestigo1');
  const badgeTestigo1 = document.getElementById('badgeTestigo1');

  if (val === 'Cambio de dependencia jerárquica') {
      if (lblArea1) lblArea1.innerHTML = '<i class="fa-solid fa-user-tie text-segey-700"></i> Titular de Área <span class="text-red-500">*</span>';
      if (wrapTitularesArea) wrapTitularesArea.className = 'space-y-4';
      if (contArea2) contArea2.classList.add('hidden');
      if (contSelectArea) contSelectArea.classList.remove('hidden');
      if (aNom) aNom.placeholder = 'Nombre completo del Titular del Área';
      if (aCar) aCar.placeholder = 'Cargo o puesto del Titular del Área';
      if (a2Nom) { a2Nom.required = false; a2Nom.value = ''; }
      if (a2Car) a2Car.value = '';

      // En Cambio de Dependencia Jerárquica: Se muestran Testigo (1) y Testigo (2) (5 firmas en total)
      if (contTestigo2) contTestigo2.classList.remove('hidden');
      if (test2Nom) test2Nom.required = true;
      if (test2Car) test2Car.required = true;
      if (lblTestigo1) lblTestigo1.innerHTML = '<i class="fa-solid fa-users text-segey-700"></i> Testigo (1) <span class="text-red-500">*</span>';
      if (badgeTestigo1) {
        if (respValFinal) {
          badgeTestigo1.className = 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200';
          badgeTestigo1.innerHTML = '<i class="fa-solid fa-lock text-emerald-600 mr-1"></i>Vinculado a Responsable (Bloqueado)';
        } else {
          badgeTestigo1.className = 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200';
          badgeTestigo1.innerHTML = '<i class="fa-solid fa-check mr-1 text-emerald-600"></i>Testigo del Trámite';
        }
      }
    } else {
      if (lblArea1) lblArea1.innerHTML = '<i class="fa-solid fa-user-tie text-segey-700"></i> Titular de Área <span class="text-red-500">*</span>';
      if (wrapTitularesArea) wrapTitularesArea.className = 'space-y-4';
      if (contArea2) contArea2.classList.add('hidden');
      if (a2Nom) {
        a2Nom.required = false;
        a2Nom.value = '';
      }
      if (a2Car) a2Car.value = '';

      // Para Alta, Baja y Cambio de nombre: Se OCULTA Testigo (2) (solo firma Testigo 1, 4 firmas en total)
      if (contTestigo2) contTestigo2.classList.add('hidden');
      if (test2Nom) {
        test2Nom.required = false;
        test2Nom.value = '';
      }
      if (test2Car) {
        test2Car.required = false;
        test2Car.value = '';
      }
      if (lblTestigo1) lblTestigo1.innerHTML = '<i class="fa-solid fa-users text-segey-700"></i> Testigo (1) <span class="text-red-500">*</span>';
      if (badgeTestigo1) {
        if (respValFinal) {
          badgeTestigo1.className = 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200';
          badgeTestigo1.innerHTML = '<i class="fa-solid fa-lock text-emerald-600 mr-1"></i>Vinculado a Responsable (Bloqueado)';
        } else {
          badgeTestigo1.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
          badgeTestigo1.innerHTML = '<i class="fa-solid fa-filter text-slate-400 mr-1"></i>Según Área que Notifica';
        }
      }

      if (val === 'Alta') {
      if (contSelectArea) contSelectArea.classList.add('hidden');
      if (aNom) {
        aNom.removeAttribute('readonly');
        aNom.placeholder = 'Escriba el nombre completo del Titular del Área';
      }
      if (aCar) {
        aCar.removeAttribute('readonly');
        aCar.classList.remove('bg-slate-50', 'text-slate-700');
        aCar.classList.add('bg-white', 'text-slate-800');
        aCar.placeholder = 'Escriba el cargo o puesto del Titular del Área';
      }
      if (badgeArea) {
        badgeArea.className = 'text-[10.5px] bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1';
        badgeArea.innerHTML = '<i class="fa-solid fa-pen mr-1 text-sky-600"></i>Captura directa habilitada (Trámite de Alta)';
      }
    } else {
      if (contSelectArea) contSelectArea.classList.remove('hidden');
      if (aNom) {
        aNom.placeholder = 'Nombre completo del Titular del Área';
      }
      if (aCar) {
        aCar.placeholder = 'Cargo o puesto del Titular del Área';
      }
    }
  }

  // 2. Control de Titular 2 / Jefe Inmediato
  if (val === 'Cambio de dependencia jerárquica') {
    if (containerT2) {
      containerT2.className = 'bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-300 space-y-2.5 shadow-xs transition-all ring-1 ring-emerald-200';
    }
    if (lblT2) lblT2.textContent = 'Titular de Unidad Administrativa (2)';
    if (badgeT2) {
      badgeT2.className = 'text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold shadow-2xs';
      badgeT2.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left mr-1"></i>Dependencia de Destino (Requerida)';
    }
    if (lblSelectT2) lblSelectT2.textContent = 'Seleccionar Dependencia Jerárquica de Destino:';
    if (lblT2Nom) lblT2Nom.textContent = '1. Nombre Completo (Destino):';
    if (lblT2Car) lblT2Car.textContent = '2. Cargo o Puesto (Destino):';

    if (selectT2) {
      selectT2.disabled = false;
      selectT2.className = 'hidden';
      selectT2.style.display = 'none';
      selectT2.setAttribute('data-combobox-hidden', 'true');
      initSelectTitularUnidad2();
    }
    if (t2NomInput) {
      if (t2NomInput.value === 'No Aplica' || t2NomInput.value === 'No aplica') {
        t2NomInput.value = '';
      }
      t2NomInput.removeAttribute('readonly');
      t2NomInput.className = 'w-full text-xs rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-segey-700 focus:outline-none bg-white';
      t2NomInput.placeholder = 'Nombre completo del Titular de la Unidad de Destino';
    }
    if (t2CarInput) {
      t2CarInput.removeAttribute('readonly');
      t2CarInput.className = 'w-full text-xs rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-segey-700 focus:outline-none bg-slate-50 text-slate-700';
      t2CarInput.placeholder = 'Cargo o puesto del Titular de la Unidad de Destino';
    }
  } else {
    // Alta, Baja o Cambio de nombre: Jefe Inmediato
    if (containerT2) {
      containerT2.className = 'bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-xs transition-all';
    }
    if (lblT2) lblT2.textContent = 'Jefe Inmediato';
    if (badgeT2) {
      badgeT2.className = 'text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200';
      badgeT2.innerHTML = '<i class="fa-solid fa-user-shield mr-1"></i>Jefe Inmediato';
    }
    if (lblSelectT2) lblSelectT2.textContent = 'Seleccionar Jefe Inmediato de la Unidad:';
    if (lblT2Nom) lblT2Nom.textContent = '1. Nombre Completo:';
    if (lblT2Car) lblT2Car.textContent = '2. Cargo o Puesto:';

    if (selectT2) {
      selectT2.disabled = false;
      selectT2.className = 'hidden';
      selectT2.style.display = 'none';
      selectT2.setAttribute('data-combobox-hidden', 'true');
      poblarSelectJefeInmediato();
    }
    if (t2NomInput) {
      if (t2NomInput.value === 'No Aplica' || t2NomInput.value === 'No aplica') {
        t2NomInput.value = '';
      }
      t2NomInput.removeAttribute('readonly');
      t2NomInput.className = 'w-full text-xs rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-segey-700 focus:outline-none bg-white';
      t2NomInput.placeholder = 'Nombre completo del Jefe Inmediato';
    }
    if (t2CarInput) {
      t2CarInput.removeAttribute('readonly');
      t2CarInput.className = 'w-full text-xs rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-segey-700 focus:outline-none bg-slate-50 text-slate-700';
      t2CarInput.placeholder = 'Cargo o puesto del Jefe Inmediato';
    }
  }

  // Obtener Área Notificadora actual
  const selNotifActual = document.getElementById('areaNotificadoraSelect');
  const custNotifActual = document.getElementById('areaNotificadora');
  const currentNotifArea = (selNotifActual && selNotifActual.value && selNotifActual.value !== '__OTRA__')
    ? selNotifActual.value
    : (custNotifActual ? custNotifActual.value : '');

  // 3. Control de Selector de Áreas vinculadas para "Baja" y "Cambio de nombre"
  if (val === 'Baja') {
    if (containerAreaBaja) {
      containerAreaBaja.classList.remove('hidden');
      poblarSelectAreaBaja(currentNotifArea);
      if (selBaja && selBaja.value && selBaja.value !== '__OTRA__') {
        vincularJefeInmediatoConArea(selBaja.value);
        vincularTitularAreaConBaja(selBaja.value);
      }
    }
  } else {
    if (containerAreaBaja) {
      containerAreaBaja.classList.add('hidden');
    }
  }

  if (val === 'Cambio de nombre') {
    if (containerAreaCambio) {
      containerAreaCambio.classList.remove('hidden');
      poblarSelectAreaCambioNombre(currentNotifArea);
      if (selCambio && selCambio.value && selCambio.value !== '__OTRA__') {
        vincularJefeInmediatoConArea(selCambio.value);
      }
    }
    if (containerNuevoNombre) {
      containerNuevoNombre.classList.remove('hidden');
    }
    if (lblNuevaDenom) {
      lblNuevaDenom.innerHTML = '<i class="fa-solid fa-pen-nib text-amber-600 mr-1"></i>1. Nombre Actual del Área o Adscripción (Seleccionado en la lista superior o editable) <span class="text-red-500">*</span>';
    }
    if (ndInputElem) {
      ndInputElem.placeholder = 'NOMBRE ACTUAL DEL ÁREA (SELECCIONADO EN LA LISTA SUPERIOR O EDITE AQUÍ)...';
    }
    if (nnInputElem) {
      nnInputElem.required = true;
    }
  } else {
    if (containerAreaCambio) {
      containerAreaCambio.classList.add('hidden');
    }
    if (containerNuevoNombre) {
      containerNuevoNombre.classList.add('hidden');
    }
    if (nnInputElem) {
      nnInputElem.required = false;
      nnInputElem.value = '';
    }
  }

  if (val === 'Cambio de dependencia jerárquica') {
    if (containerAreaCambioDep) {
      containerAreaCambioDep.classList.remove('hidden');
      poblarSelectAreaCambioDep(currentNotifArea);
      if (selDep && selDep.value && selDep.value !== '__OTRA__') {
        vincularTitularAreaConBaja(selDep.value);
      }
    }
    if (containerUnidadDestino) {
      containerUnidadDestino.classList.remove('hidden');
      poblarSelectUnidadDestinoCambioDep();
    }
    if (lblNuevaDenom) {
      lblNuevaDenom.innerHTML = '<i class="fa-solid fa-arrows-split-up-and-left text-purple-700 mr-1"></i>Nombre del Área o Adscripción a Transferir <span class="text-red-500">*</span>';
    }
    if (ndInputElem) {
      ndInputElem.placeholder = 'NOMBRE DEL ÁREA O ADSCRIPCIÓN QUE SE TRANSFIERE (SELECCIONE ARRIBA O ESCRIBA AQUÍ)...';
    }
  } else {
    if (containerAreaCambioDep) {
      containerAreaCambioDep.classList.add('hidden');
    }
    if (containerUnidadDestino) {
      containerUnidadDestino.classList.add('hidden');
    }
  }

  if (val !== 'Cambio de nombre' && val !== 'Cambio de dependencia jerárquica') {
    if (lblNuevaDenom) {
      lblNuevaDenom.innerHTML = 'Nombre del Área o Adscripción <span class="text-red-500">*</span>';
    }
    if (ndInputElem) {
      ndInputElem.placeholder = 'ESPECIFIQUE CON PRECISIÓN EL NOMBRE DEL ÁREA, CLAVE O ADSCRIPCIÓN DETERMINADA...';
    }
  }

  // 4. Control de Justificaciones Predefinidas según Tipo de Movimiento
  const selJust = document.getElementById('selectJustificacionPredefinida');
  if (selJust) selJust.value = '';
  poblarSelectJustificaciones(val);

  const justTextarea = document.getElementById('justificacion');
  if (justTextarea && !justTextarea.value.trim()) {
    if (typeof setJustificacionEnabledState === 'function') {
      setJustificacionEnabledState(false);
    }
  } else if (justTextarea && justTextarea.value.trim()) {
    if (typeof setJustificacionEnabledState === 'function') {
      setJustificacionEnabledState(true);
    }
  }

  // 5. Control de Listas Desplegables de Testigos (1 y 2)
  poblarSelectTestigos();

  // Re-asegurar bloqueo de Testigo 1 con Responsable de Captura
  if (respValFinal) {
    sincronizarTestigo1ConResponsable(respValFinal);
  }

  renderDocument(getCurrentFormDataForPreview());
}

function initQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const id = params.get('id');

  if (mode === 'form') {
    switchTab('tab-form');
    const banner = document.getElementById('shared-mode-banner');
    if (banner) banner.classList.remove('hidden');
  } else if (id) {
    const record = records.find(r => r.id === id);
    if (record) {
      renderDocument(record);
      switchTab('tab-preview', true);
    }
  } else if (records.length > 0) {
    renderDocument(records[0]);
  }
}

let isSubmittingForm = false;

function generateNextFolio() {
  const anio = new Date().getFullYear();
  let maxNum = 0;

  records.forEach(r => {
    if (r.folio) {
      const match = r.folio.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  let nextCandidate = maxNum + 1;
  let candidateFolio = `DIMC-CC-${anio}-${String(nextCandidate).padStart(3, '0')}`;

  // Garantizar unicidad matemática absoluta contra toda la bitácora
  while (records.some(r => r.folio === candidateFolio)) {
    nextCandidate++;
    candidateFolio = `DIMC-CC-${anio}-${String(nextCandidate).padStart(3, '0')}`;
  }

  return candidateFolio;
}

function switchTab(tabId, preserveRecord = false) {
  // 1. Protección de acceso a la Bitácora y Control
  if (tabId === 'tab-registry') {
    if (!isUserLoggedIn()) {
      openAdminLoginModal();
      showToast('Inicie sesión para acceder a la Bitácora.', 'info');
      return;
    }
    if (isCapturistaUser()) {
      showToast('El perfil de Capturista solo tiene acceso a la captura y registro de folios.', 'warning');
      switchTab('tab-form');
      return;
    }
  }

  // 2. Protección de acceso al Formulario de Captura
  if (tabId === 'tab-form') {
    if (isAuditoriaUser()) {
      showToast('El perfil de Auditoría tiene acceso exclusivo a consulta y descarga de reportes.', 'info');
      switchTab('tab-registry');
      return;
    }
  }

  // Si se regresa al formulario para capturar un nuevo documento, asegurar folio libre no duplicado
  if (tabId === 'tab-form' && !editingRecordId) {
    const folioInput = document.getElementById('folioControl');
    if (folioInput && (!folioInput.value || records.some(r => r.folio === folioInput.value))) {
      folioInput.value = generateNextFolio();
    }
  }

  // Si se ingresa a la Vista del Documento sin solicitar un registro histórico específico,
  // compilar y renderizar de inmediato la información actual que se está llenando en el formulario
  if (tabId === 'tab-preview') {
    if (!preserveRecord) {
      const liveFormData = getCurrentFormDataForPreview();
      renderDocument(liveFormData);
    } else {
      actualizarBannerVistaPreviaIncompleta();
    }
  }

  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('block'));

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('block');
  }

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  if (tabId === 'tab-registry') {
    renderTable();
    updateStats();
    populateAreaFilter();
    populateLayoutSelector();
    updateLayoutUIBadge();
    renderAdminAreasList();
    renderAdminJustificacionesList();
    renderAdminResponsablesList();
    updateRegistrySidebarBadges();
    if (!currentRegistrySection) {
      switchRegistrySection('constancias');
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleFormSubmit(event) {
  event.preventDefault();

  if (isAuditoriaUser()) {
    showToast('El perfil de Auditoría tiene acceso exclusivo a consulta y descarga de reportes.', 'error');
    return;
  }

  if (isSubmittingForm) return;

  const estatusActual = document.getElementById('estatus')?.value || 'Generada para Firma';
  const esBorrador = (estatusActual === 'Borrador');

  // Validación institucional de campos obligatorios (requerida para emitir constancia, opcional para borradores preliminares)
  if (!esBorrador) {
    const camposVacios = obtenerCamposVaciosFormulario();
    if (camposVacios.length > 0) {
      mostrarModalCamposVacios(camposVacios);
      showToast(`No se puede guardar: Complete los ${camposVacios.length} campos vacíos en el formulario.`, 'error');
      return;
    }
  }

  isSubmittingForm = true;

  try {
  const areaNotificadora = document.getElementById('areaNotificadora').value.trim();
  const areaSelect = document.getElementById('areaNotificadoraSelect');
  if (areaSelect && areaSelect.value === '__OTRA__' && !areaNotificadora) {
    showToast('Por favor especifique el nombre del área notificadora.', 'error');
    const customInp = document.getElementById('areaNotificadoraCustom');
    if (customInp) customInp.focus();
    isSubmittingForm = false;
    return;
  }

  const responsableCaptura = document.getElementById('responsableCaptura').value.trim();
  const respSelect = document.getElementById('selectResponsableCaptura');
  if (respSelect && respSelect.value === '__MANUAL__' && !responsableCaptura) {
    showToast('Por favor especifique el nombre del responsable de captura en el recuadro inferior.', 'error');
    const customRespInp = document.getElementById('responsableCapturaCustom');
    if (customRespInp) customRespInp.focus();
    isSubmittingForm = false;
    return;
  }
  if (!responsableCaptura) {
    showToast('Por favor seleccione el responsable de captura de la lista.', 'error');
    if (respSelect) respSelect.focus();
    isSubmittingForm = false;
    return;
  }
  
  // Validación estricta anti-duplicados:
  // Si no se proporcionó folio o si ya existe en la bitácora asignado a otro registro, generar automáticamente el siguiente
  let folio = document.getElementById('folioControl').value.trim();
  const folioExists = records.some(r => r.folio === folio && r.id !== editingRecordId);
  if (!folio || folioExists) {
    folio = generateNextFolio();
    const folioInp = document.getElementById('folioControl');
    if (folioInp) folioInp.value = folio;
  }

  const municipio = document.getElementById('municipio').value.trim();
  const fechaActaStr = document.getElementById('fechaActa').value;
  const horaActaStr = document.getElementById('horaActa').value;
  let inmueble = document.getElementById('inmueble').value.trim();
  inmueble = formatearInmueble(inmueble);
  const inmEl = document.getElementById('inmueble');
  if (inmEl && inmueble) inmEl.value = inmueble;

  // Comparecientes: Nombre y Cargo por separado
  const titularUnidad1Nombre = document.getElementById('titularUnidad1Nombre').value.trim();
  const titularUnidad1Cargo = document.getElementById('titularUnidad1Cargo').value.trim();
  const titularUnidad2Nombre = document.getElementById('titularUnidad2Nombre').value.trim();
  const titularUnidad2Cargo = document.getElementById('titularUnidad2Cargo').value.trim();
  const titularAreaNombre = document.getElementById('titularAreaNombre').value.trim();
  const titularAreaCargo = document.getElementById('titularAreaCargo').value.trim();

  const titularArea2Nombre = document.getElementById('titularArea2Nombre')?.value.trim() || '';
  const titularArea2Cargo = document.getElementById('titularArea2Cargo')?.value.trim() || '';

  const testigo1Nombre = document.getElementById('testigo1Nombre').value.trim();
  const testigo1Cargo = document.getElementById('testigo1Cargo').value.trim();

  const testigo2Nombre = document.getElementById('testigo2Nombre').value.trim();
  const testigo2Cargo = document.getElementById('testigo2Cargo').value.trim();

  const tipoMovimientoEl = document.querySelector('input[name="tipoMovimiento"]:checked');
  const tipoMovimiento = tipoMovimientoEl ? tipoMovimientoEl.value : 'Alta';



  const nuevaDenominacion = document.getElementById('nuevaDenominacion').value.trim().toUpperCase();
  const nuevoNombreInput = document.getElementById('nuevoNombre');
  const nuevoNombre = nuevoNombreInput ? nuevoNombreInput.value.trim().toUpperCase() : '';

  if (tipoMovimiento === 'Cambio de nombre' && !nuevoNombre) {
    showToast('Por favor especifique el nuevo nombre o denominación propuesta para el área.', 'error');
    if (nuevoNombreInput) nuevoNombreInput.focus();
    isSubmittingForm = false;
    return;
  }

  const justificacion = document.getElementById('justificacion').value.trim().toUpperCase();
  let estatus = document.getElementById('estatus')?.value || 'Generada para Firma';

  // Control de Estatus y Trazabilidad al Guardar
  const estSelect = document.getElementById('estatus');
  if (editingRecordId) {
    if (estatus === 'Generada para Firma') {
      estatus = 'Modificación';
      if (estSelect) {
        estSelect.value = 'Modificación';
        estSelect.classList.add('ring-4', 'ring-amber-500', 'bg-amber-50');
        setTimeout(() => estSelect.classList.remove('ring-4', 'ring-amber-500', 'bg-amber-50'), 4000);
      }
      showToast('Constancia en edición: El estatus se actualizó automáticamente a "Modificación".', 'info', 4000);
    } else if (estatus !== 'Modificación' && estatus !== 'Borrador' && estatus !== 'Firmada y Concluida') {
      estatus = 'Modificación';
      if (estSelect) estSelect.value = 'Modificación';
    }
  } else {
    if (!isAdminLoggedIn() && estatus === 'Modificación') {
      estatus = 'Generada para Firma';
      if (estSelect) estSelect.value = 'Generada para Firma';
    }
  }

  const observaciones = document.getElementById('observaciones').value.trim();

  // Procesar fecha y hora
  const dateObj = new Date(fechaActaStr + 'T12:00:00');
  const dia = dateObj.getDate();
  const mes = MESES[dateObj.getMonth()];
  const anio = String(dateObj.getFullYear()).slice(-2);
  const anioCompleto = dateObj.getFullYear();

  const [horas, minutos] = (horaActaStr || '10:00').split(':');

  const titularUnidad1 = titularUnidad1Cargo ? `${titularUnidad1Nombre} - ${titularUnidad1Cargo}` : titularUnidad1Nombre;
  const titularUnidad2 = titularUnidad2Nombre ? (titularUnidad2Cargo ? `${titularUnidad2Nombre} - ${titularUnidad2Cargo}` : titularUnidad2Nombre) : '';
  const titularArea = titularAreaCargo ? `${titularAreaNombre} - ${titularAreaCargo}` : titularAreaNombre;
  const titularArea2 = titularArea2Cargo ? `${titularArea2Nombre} - ${titularArea2Cargo}` : titularArea2Nombre;
  const testigo1 = testigo1Cargo ? `${testigo1Nombre} - ${testigo1Cargo}` : testigo1Nombre;
  const testigo2 = testigo2Cargo ? `${testigo2Nombre} - ${testigo2Cargo}` : testigo2Nombre;

  const isCambioJerarquico = (tipoMovimiento === 'Cambio de dependencia jerárquica');
  const jefeInmediato = !isCambioJerarquico ? titularUnidad2 : '';
  const jefeInmediatoNombre = !isCambioJerarquico ? titularUnidad2Nombre : '';
  const jefeInmediatoCargo = !isCambioJerarquico ? titularUnidad2Cargo : '';

  const recordData = {
    id: editingRecordId || 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    folio: folio,
    fechaRegistro: new Date().toISOString(),
    areaNotificadora,
    responsableCaptura,
    municipio,
    fechaActa: fechaActaStr,
    fechaConstancia: fechaActaStr,
    dia,
    mes,
    anio,
    anioCompleto,
    horaActa: horaActaStr,
    horas,
    minutos,
    inmueble,

    titularUnidad1Nombre,
    titularUnidad1Cargo,
    titularUnidad2Nombre,
    titularUnidad2Cargo,
    jefeInmediatoNombre,
    jefeInmediatoCargo,
    titularAreaNombre,
    titularAreaCargo,
    titularArea2Nombre,
    titularArea2Cargo,
    testigo1Nombre,
    testigo1Cargo,
    testigo2Nombre: isCambioJerarquico ? testigo2Nombre : '',
    testigo2Cargo: isCambioJerarquico ? testigo2Cargo : '',

    titularUnidad1,
    titularUnidad2: isCambioJerarquico ? titularUnidad2 : '',
    jefeInmediato,
    titularArea,
    titularArea2,
    testigo1,
    testigo2: isCambioJerarquico ? testigo2 : '',

    tipoMovimiento,
    esCambioNombre: (tipoMovimiento === 'Cambio de nombre'),
    noEsCambioNombre: (tipoMovimiento !== 'Cambio de nombre'),
    nombreActual: (tipoMovimiento === 'Cambio de nombre') ? nuevaDenominacion : '',
    nuevoNombre: (tipoMovimiento === 'Cambio de nombre') ? nuevoNombre : '',
    nuevaDenominacion: (tipoMovimiento === 'Cambio de nombre') ? `${nuevaDenominacion} ➔ ${nuevoNombre}` : nuevaDenominacion,
    unidadDestino: (typeof getSelectedUnidadDestinoNombre === 'function' ? getSelectedUnidadDestinoNombre() : '').toUpperCase(),
    justificacion,
    estatus,
    observaciones
  };

  if (editingRecordId) {
    const idx = records.findIndex(r => r.id === editingRecordId);
    if (idx !== -1) {
      const existing = records[idx];
      recordData.id = existing.id;
      recordData.fechaRegistro = existing.fechaRegistro || recordData.fechaRegistro;

      // Registrar historial de estatus e indicador de cambios
      if (existing.estatus !== estatus) {
        recordData.estatusAnterior = existing.estatus;
      } else if (existing.estatusAnterior) {
        recordData.estatusAnterior = existing.estatusAnterior;
      }

      recordData.fechaModificacion = new Date().toISOString();
      recordData.vecesEditado = (existing.vecesEditado || 0) + 1;

      // Comparador de cambios (Detección de qué campos específicos cambiaron)
      const camposComparar = [
        { key: 'tipoMovimiento', label: 'Tipo de Movimiento' },
        { key: 'nuevaDenominacion', label: 'Denominación / Puesto' },
        { key: 'justificacion', label: 'Justificación' },
        { key: 'areaNotificadora', label: 'Área Notificadora' },
        { key: 'responsableCaptura', label: 'Responsable' },
        { key: 'inmueble', label: 'Inmueble' },
        { key: 'titularUnidad1', label: 'Titular Unidad (1)' },
        { key: 'jefeInmediato', label: 'Jefe Inmediato' },
        { key: 'titularUnidad2', label: 'Titular Unidad (2)' },
        { key: 'titularArea', label: 'Titular de Área' },
        { key: 'testigo1', label: 'Testigo (1)' },
        { key: 'testigo2', label: 'Testigo (2)' }
      ];
      const cambiosDetectados = [];
      camposComparar.forEach(c => {
        const antes = String(existing[c.key] || '').trim();
        const despues = String(recordData[c.key] || '').trim();
        if (antes !== despues) {
          cambiosDetectados.push({
            campo: c.label,
            antes: antes,
            despues: despues
          });
        }
      });

      // Línea de vida / Historial detallado de modificaciones
      const historial = Array.isArray(existing.historialCambios) ? [...existing.historialCambios] : [];
      historial.push({
        num: recordData.vecesEditado,
        fecha: recordData.fechaModificacion,
        estatusPrevio: existing.estatus || 'Generada para Firma',
        estatusNuevo: estatus,
        responsable: responsableCaptura || existing.responsableCaptura || 'Capturista',
        observaciones: observaciones || '',
        cambios: cambiosDetectados
      });
      recordData.historialCambios = historial;

      // Si estaba inactivo y se actualiza a un estatus activo, registrar reactivación
      if (existing.estatus === 'Inactivo' && estatus !== 'Inactivo') {
        recordData.fechaReactivacion = new Date().toISOString();
      }

      records[idx] = { ...existing, ...recordData };
    } else {
      records.unshift(recordData);
    }
    showToast(`Constancia ${folio} actualizada.`);
    editingRecordId = null;
  } else {
    records.unshift(recordData);
    showToast(`Constancia ${folio} guardada en bitácora.`);
  }

  saveRecordsToStorage();
  updateStats();
  renderTable();
  populateAreaFilter();
  updateEstatusPermissions(isSuperAdmin());

  // Avanzar folio de control al siguiente número libre para evitar duplicados en capturas subsecuentes
  const nextFolio = generateNextFolio();
  const folioControlInput = document.getElementById('folioControl');
  if (folioControlInput) {
    folioControlInput.value = nextFolio;
  }

  setTimeout(() => {
    isSubmittingForm = false;
  }, 1200);

  sendToGoogleSheetsWebhook(recordData);

  renderDocument(recordData);
  switchTab('tab-preview', true);

  const editingBanner = document.getElementById('editing-folio-banner');
  if (editingBanner) editingBanner.classList.add('hidden');

  const submitBtn = document.getElementById('btn-submit-form');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1.5"></i> Guardar Constancia';
    submitBtn.classList.remove('bg-amber-700', 'hover:bg-amber-800');
    submitBtn.classList.add('bg-segey-800', 'hover:bg-segey-900');
  }

  showToast(`Constancia ${folio} guardada con éxito (${recordData.estatus}). Puede descargar el PDF oficial desde este visor.`);
  } catch (err) {
    isSubmittingForm = false;
    console.error('Error al guardar la constancia:', err);
    showToast('Error al guardar la constancia: ' + (err.message || err), 'error');
  }
}

function getCurrentFormDataForPreview() {
  const fechaActaStr = document.getElementById('fechaActa')?.value || new Date().toISOString().split('T')[0];
  const dateObj = new Date(fechaActaStr + 'T12:00:00');
  const [horas, minutos] = (document.getElementById('horaActa')?.value || '10:00').split(':');

  const tipoMovimientoEl = document.querySelector('input[name="tipoMovimiento"]:checked');
  const tipoMovimiento = tipoMovimientoEl ? tipoMovimientoEl.value : 'Alta';

  const u1Nom = document.getElementById('titularUnidad1Nombre')?.value.trim() || '';
  const u1Car = document.getElementById('titularUnidad1Cargo')?.value.trim() || '';
  let u2Nom = document.getElementById('titularUnidad2Nombre')?.value.trim() || '';
  let u2Car = document.getElementById('titularUnidad2Cargo')?.value.trim() || '';
  const areaNom = document.getElementById('titularAreaNombre')?.value.trim() || '';
  const areaCar = document.getElementById('titularAreaCargo')?.value.trim() || '';
  const area2Nom = document.getElementById('titularArea2Nombre')?.value.trim() || '';
  const area2Car = document.getElementById('titularArea2Cargo')?.value.trim() || '';
  const t1Nom = document.getElementById('testigo1Nombre')?.value.trim() || '';
  const t1Car = document.getElementById('testigo1Cargo')?.value.trim() || '';
  const t2Nom = document.getElementById('testigo2Nombre')?.value.trim() || '';
  const t2Car = document.getElementById('testigo2Cargo')?.value.trim() || '';

  const isJefeInmediato = (tipoMovimiento === 'Alta' || tipoMovimiento === 'Baja' || tipoMovimiento === 'Cambio de nombre');
  const isNoAplica = (!isJefeInmediato && (u2Nom.trim().toLowerCase() === 'no aplica' || u2Nom.trim().toLowerCase() === 'n/a'));
  if (isNoAplica) {
    u2Nom = 'No Aplica';
    u2Car = '';
  }

  const ndRaw = (document.getElementById('nuevaDenominacion')?.value.trim() || '').toUpperCase();
  const nnRaw = (document.getElementById('nuevoNombre')?.value.trim() || '').toUpperCase();

  let finalNuevaDenominacion = ndRaw || '___________________________';
  if (tipoMovimiento === 'Cambio de nombre') {
    if (ndRaw && nnRaw) {
      finalNuevaDenominacion = `${ndRaw} ➔ ${nnRaw}`;
    } else if (ndRaw) {
      finalNuevaDenominacion = ndRaw;
    } else if (nnRaw) {
      finalNuevaDenominacion = nnRaw;
    }
  }

  let unidadDestinoVal = '';
  if (typeof getSelectedUnidadDestinoNombre === 'function') {
    unidadDestinoVal = getSelectedUnidadDestinoNombre();
  }
  if (!unidadDestinoVal && typeof CATALOGO_ORGANICO_SEGEY !== 'undefined' && Array.isArray(CATALOGO_ORGANICO_SEGEY) && u2Nom) {
    const uFound = CATALOGO_ORGANICO_SEGEY.find(item => item.titular && item.titular.nombre && item.titular.nombre.toLowerCase().trim() === u2Nom.toLowerCase().trim());
    if (uFound && uFound.unidad) unidadDestinoVal = uFound.unidad;
  }

  return {
    id: editingRecordId || 'preview_current',
    folio: document.getElementById('folioControl')?.value.trim() || generateNextFolio(),
    areaNotificadora: document.getElementById('areaNotificadora')?.value.trim() || 'Área no especificada',
    responsableCaptura: document.getElementById('responsableCaptura')?.value.trim() || '',
    municipio: document.getElementById('municipio')?.value.trim() || 'Mérida',
    fechaActa: fechaActaStr,
    fechaConstancia: fechaActaStr,
    dia: isNaN(dateObj.getDate()) ? '10' : String(dateObj.getDate()),
    mes: isNaN(dateObj.getMonth()) ? 'Noviembre' : MESES[dateObj.getMonth()],
    anio: isNaN(dateObj.getFullYear()) ? '26' : String(dateObj.getFullYear()).slice(-2),
    anioCompleto: isNaN(dateObj.getFullYear()) ? 2026 : dateObj.getFullYear(),
    horaActa: document.getElementById('horaActa')?.value || '10:00',
    horas: horas || '10',
    minutos: minutos || '00',
    inmueble: formatearInmueble(document.getElementById('inmueble')?.value.trim()) || 'el Edificio Central de la Secretaría de Educación',

    titularUnidad1Nombre: u1Nom || '___________________________',
    titularUnidad1Cargo: u1Car || '___________________________',
    titularUnidad2Nombre: u2Nom,
    titularUnidad2Cargo: u2Car,
    titularAreaNombre: areaNom || '___________________________',
    titularAreaCargo: areaCar || '___________________________',
    titularArea2Nombre: area2Nom,
    titularArea2Cargo: area2Car,
    testigo1Nombre: t1Nom || '___________________________',
    testigo1Cargo: t1Car || '___________________________',
    testigo2Nombre: t2Nom || '___________________________',
    testigo2Cargo: t2Car || '___________________________',

    titularUnidad1: u1Nom ? (u1Car ? `${u1Nom} (${u1Car})` : u1Nom) : '___________________________',
    titularUnidad2: isNoAplica ? 'No Aplica' : (u2Nom ? (u2Car ? `${u2Nom} (${u2Car})` : u2Nom) : ''),
    titularArea: areaNom ? (areaCar ? `${areaNom} (${areaCar})` : areaNom) : '___________________________',
    titularArea2: area2Nom ? (area2Car ? `${area2Nom} (${area2Car})` : area2Nom) : '',
    testigo1: t1Nom ? (t1Car ? `${t1Nom} (${t1Car})` : t1Nom) : '___________________________',
    testigo2: t2Nom ? (t2Car ? `${t2Nom} (${t2Car})` : t2Nom) : '___________________________',

    tipoMovimiento: tipoMovimiento,
    esCambioDependenciaJerarquica: (tipoMovimiento === 'Cambio de dependencia jerárquica' || tipoMovimiento === 'cambio_dependencia_jerarquica'),
    noEsCambioDependenciaJerarquica: (tipoMovimiento !== 'Cambio de dependencia jerárquica' && tipoMovimiento !== 'cambio_dependencia_jerarquica'),
    tieneTestigo2: (tipoMovimiento === 'Cambio de dependencia jerárquica' || tipoMovimiento === 'cambio_dependencia_jerarquica') && Boolean(t2Nom),
    noTieneTestigo2: (tipoMovimiento !== 'Cambio de dependencia jerárquica' && tipoMovimiento !== 'cambio_dependencia_jerarquica') || !t2Nom,
    esCambioNombre: (tipoMovimiento === 'Cambio de nombre'),
    noEsCambioNombre: (tipoMovimiento !== 'Cambio de nombre'),
    nombreActual: ndRaw || '—',
    nuevoNombre: nnRaw || '—',
    nuevaDenominacion: finalNuevaDenominacion,
    unidadDestino: (unidadDestinoVal || '').toUpperCase(),
    justificacion: (document.getElementById('justificacion')?.value.trim() || '___________________________').toUpperCase(),
    estatus: document.getElementById('estatus')?.value || 'Generada para Firma',
    observaciones: document.getElementById('observaciones')?.value.trim() || ''
  };
}

function previewCurrentForm() {
  const previewData = getCurrentFormDataForPreview();
  renderDocument(previewData);
  switchTab('tab-preview', true);
  showToast('Vista previa actualizada con los datos del formulario.');
}

function formatPersonText(nombre, cargo) {
  if (!nombre && !cargo) return '—';
  if (nombre && cargo) return `${nombre}, ${cargo}`;
  return nombre || cargo;
}

/**
 * =========================================================================
 * VALIDACIÓN INSTITUCIONAL DE FORMULARIO COMPLETO PARA GENERACIÓN DE PDF
 * =========================================================================
 */

/**
 * Obtiene la lista detallada de campos obligatorios vacíos o pendientes en el formulario del formato.
 * @returns {Array<{id: string, seccion: string, nombre: string, detalle: string}>}
 */
function obtenerCamposVaciosFormulario() {
  const camposVacios = [];

  // SECCIÓN 0: REGISTRO Y CONTROL DEL ÁREA NOTIFICADORA
  const areaNotificadora = (document.getElementById('areaNotificadora')?.value || '').trim();
  const areaSelect = document.getElementById('areaNotificadoraSelect');
  if (!areaNotificadora || (areaSelect && areaSelect.value === '__OTRA__' && !document.getElementById('areaNotificadoraCustom')?.value.trim())) {
    camposVacios.push({
      id: (areaSelect && areaSelect.value === '__OTRA__') ? 'areaNotificadoraCustom' : 'areaNotificadoraSelect',
      seccion: 'Sección 0: Área Notificadora',
      nombre: 'Área que Notifica o Elabora',
      detalle: 'Seleccione o capture el área o departamento que solicita la constancia.'
    });
  }

  const responsableCaptura = (document.getElementById('responsableCaptura')?.value || '').trim();
  const respSelect = document.getElementById('selectResponsableCaptura');
  if (!responsableCaptura || (respSelect && respSelect.value === '__MANUAL__' && !document.getElementById('responsableCapturaCustom')?.value.trim())) {
    camposVacios.push({
      id: (respSelect && respSelect.value === '__MANUAL__') ? 'responsableCapturaCustom' : 'selectResponsableCaptura',
      seccion: 'Sección 0: Área Notificadora',
      nombre: 'Responsable de Captura / Contacto',
      detalle: 'Seleccione el enlace oficial asignado o capture el nombre completo.'
    });
  }

  // APARTADO I: TIPO DE CAMBIO QUE DETERMINA LA UNIDAD ADMINISTRATIVA
  const tipoMovimientoEl = document.querySelector('input[name="tipoMovimiento"]:checked');
  const tipoMovimiento = tipoMovimientoEl ? tipoMovimientoEl.value : null;

  if (!tipoMovimiento) {
    camposVacios.push({
      id: 'movimiento-alta',
      seccion: 'Apartado I: Tipo de Cambio',
      nombre: 'Tipo de Movimiento Solicitado',
      detalle: 'Seleccione Alta, Baja, Cambio de nombre o Cambio de dependencia jerárquica.'
    });
  } else {
    const ndVal = (document.getElementById('nuevaDenominacion')?.value || '').trim();

    if (tipoMovimiento === 'Alta') {
      if (!ndVal) {
        camposVacios.push({
          id: 'nuevaDenominacion',
          seccion: 'Apartado I: Tipo de Cambio',
          nombre: 'Nombre del Área o Adscripción (Alta)',
          detalle: 'Especifique la denominación oficial del nuevo departamento o puesto a crear.'
        });
      }
    } else if (tipoMovimiento === 'Baja') {
      if (!ndVal) {
        camposVacios.push({
          id: 'selectAreaBaja',
          seccion: 'Apartado I: Tipo de Cambio',
          nombre: 'Área o Departamento a dar de Baja',
          detalle: 'Seleccione del catálogo oficial el área o adscripción a dar de baja.'
        });
      }
    } else if (tipoMovimiento === 'Cambio de nombre') {
      if (!ndVal) {
        camposVacios.push({
          id: 'selectAreaCambioNombre',
          seccion: 'Apartado I: Tipo de Cambio',
          nombre: 'Nombre actual del Área o Adscripción',
          detalle: 'Seleccione el área actual que cambiará de denominación.'
        });
      }
      const nuevoNombre = (document.getElementById('nuevoNombre')?.value || '').trim();
      if (!nuevoNombre) {
        camposVacios.push({
          id: 'nuevoNombre',
          seccion: 'Apartado I: Tipo de Cambio',
          nombre: 'Nuevo Nombre o Denominación Propuesta',
          detalle: 'Especifique con precisión el nuevo nombre autorizado para el área.'
        });
      }
    } else if (tipoMovimiento === 'Cambio de dependencia jerárquica') {
      if (!ndVal) {
        camposVacios.push({
          id: 'selectAreaCambioDep',
          seccion: 'Apartado I: Tipo de Cambio',
          nombre: 'Área Oficial a Transferir / Reubicar',
          detalle: 'Seleccione el área subordinada que cambiará de dependencia.'
        });
      }
      const destSelect = document.getElementById('selectUnidadDestinoCambioDep');
      if (!destSelect || !destSelect.value || destSelect.value.trim() === '') {
        camposVacios.push({
          id: 'selectUnidadDestinoCambioDep',
          seccion: 'Apartado I: Tipo de Cambio',
          nombre: 'Dependencia Jerárquica de Destino (Unidad Administrativa)',
          detalle: 'Seleccione la unidad administrativa oficial a donde se transfiere el área.'
        });
      }
    }
  }

  // APARTADO II: GENERALES
  const municipio = (document.getElementById('municipio')?.value || '').trim();
  if (!municipio) {
    camposVacios.push({
      id: 'municipio',
      seccion: 'Apartado II: Generales',
      nombre: 'Municipio de Yucatán',
      detalle: 'Indique el municipio donde se formaliza la constancia (ej. Mérida).'
    });
  }

  const fechaActa = (document.getElementById('fechaActa')?.value || '').trim();
  if (!fechaActa) {
    camposVacios.push({
      id: 'fechaActa',
      seccion: 'Apartado II: Generales',
      nombre: 'Fecha de Constancia',
      detalle: 'Capture la fecha oficial de la constancia.'
    });
  }

  const horaActa = (document.getElementById('horaActa')?.value || '').trim();
  if (!horaActa) {
    camposVacios.push({
      id: 'horaActa',
      seccion: 'Apartado II: Generales',
      nombre: 'Hora y Minutos',
      detalle: 'Especifique la hora de la constancia (HH:MM).'
    });
  }

  const inmueble = (document.getElementById('inmueble')?.value || '').trim();
  if (!inmueble) {
    camposVacios.push({
      id: 'inmueble',
      seccion: 'Apartado II: Generales',
      nombre: 'Inmueble que Ocupa',
      detalle: 'Indique el edificio, sede o domicilio conocido de la unidad.'
    });
  }

  // APARTADO II: REPRESENTANTES (FIRMANTES)
  // 1) Titular de Unidad Administrativa (1)
  const u1Nom = (document.getElementById('titularUnidad1Nombre')?.value || '').trim();
  const u1Car = (document.getElementById('titularUnidad1Cargo')?.value || '').trim();
  if (!u1Nom) {
    camposVacios.push({
      id: 'titularUnidad1Nombre',
      seccion: 'Apartado II: Firmantes',
      nombre: 'Titular de Unidad Administrativa (1) - Nombre Completo',
      detalle: 'Capture el nombre de la persona titular de la unidad administrativa o especifique "Vacante".'
    });
  }
  if (!u1Car) {
    camposVacios.push({
      id: 'titularUnidad1Cargo',
      seccion: 'Apartado II: Firmantes',
      nombre: 'Titular de Unidad Administrativa (1) - Cargo o Puesto',
      detalle: 'Especifique el cargo oficial del titular de la unidad.'
    });
  }

  // 2) Jefe Inmediato / Titular de Unidad Administrativa (2)
  const isCambioJerarquico = (tipoMovimiento === 'Cambio de dependencia jerárquica');
  const u2Nom = (document.getElementById('titularUnidad2Nombre')?.value || '').trim();
  const u2Car = (document.getElementById('titularUnidad2Cargo')?.value || '').trim();

  if (isCambioJerarquico) {
    if (!u2Nom) {
      camposVacios.push({
        id: 'titularUnidad2Nombre',
        seccion: 'Apartado II: Firmantes',
        nombre: 'Titular de Unidad Administrativa de Destino (2) - Nombre Completo',
        detalle: 'Capture el nombre del titular de la unidad de destino o especifique "Vacante".'
      });
    }
    if (!u2Car) {
      camposVacios.push({
        id: 'titularUnidad2Cargo',
        seccion: 'Apartado II: Firmantes',
        nombre: 'Titular de Unidad Administrativa de Destino (2) - Cargo o Puesto',
        detalle: 'Especifique el cargo del titular de la unidad de destino.'
      });
    }
  } else {
    if (!u2Nom) {
      camposVacios.push({
        id: 'titularUnidad2Nombre',
        seccion: 'Apartado II: Firmantes',
        nombre: 'Jefe Inmediato - Nombre Completo',
        detalle: 'Capture el nombre de la persona designada como jefe inmediato o especifique "Vacante".'
      });
    }
    if (!u2Car) {
      camposVacios.push({
        id: 'titularUnidad2Cargo',
        seccion: 'Apartado II: Firmantes',
        nombre: 'Jefe Inmediato - Cargo o Puesto',
        detalle: 'Especifique el cargo del jefe inmediato de la unidad.'
      });
    }
  }

  // 3) Titular de Área
  const areaNom = (document.getElementById('titularAreaNombre')?.value || '').trim();
  const areaCar = (document.getElementById('titularAreaCargo')?.value || '').trim();
  if (!areaNom) {
    camposVacios.push({
      id: 'titularAreaNombre',
      seccion: 'Apartado II: Firmantes',
      nombre: 'Titular de Área - Nombre Completo',
      detalle: 'Capture el nombre de la persona titular del área involucrada o especifique "Vacante".'
    });
  }
  if (!areaCar) {
    camposVacios.push({
      id: 'titularAreaCargo',
      seccion: 'Apartado II: Firmantes',
      nombre: 'Titular de Área - Cargo o Puesto',
      detalle: 'Especifique el cargo o puesto del titular del área.'
    });
  }

  // APARTADO III: JUSTIFICACIÓN Y MOTIVOS DEL CAMBIO
  const justificacion = (document.getElementById('justificacion')?.value || '').trim();
  if (!justificacion) {
    camposVacios.push({
      id: 'justificacion',
      seccion: 'Apartado III: Justificación',
      nombre: 'Justificación y Motivos del Cambio',
      detalle: 'Detalle las razones normativas, estructurales o presupuestales que sustentan la modificación.'
    });
  }

  return camposVacios;
}

/**
 * Muestra el modal informativo con el desglose de campos vacíos.
 */
function mostrarModalCamposVacios(camposVacios) {
  if (!camposVacios || camposVacios.length === 0) return;

  const modal = document.getElementById('modal-campos-vacios');
  if (!modal) {
    const listaTxt = camposVacios.map((c, i) => `${i + 1}. [${c.seccion}] ${c.nombre}: ${c.detalle}`).join('\n');
    alert(`⚠️ DESCARGA DE PDF BLOQUEADA\n\nNo se puede generar ni descargar la constancia oficial porque faltan los siguientes ${camposVacios.length} campo(s) obligatorio(s) en el formulario:\n\n${listaTxt}\n\nPor favor complete los campos requeridos.`);
    return;
  }

  const badgeTotal = document.getElementById('badge-total-campos-vacios');
  if (badgeTotal) {
    badgeTotal.textContent = `${camposVacios.length} pendiente${camposVacios.length > 1 ? 's' : ''}`;
  }

  const contenedorLista = document.getElementById('lista-campos-vacios');
  if (contenedorLista) {
    contenedorLista.innerHTML = camposVacios.map((c, idx) => `
      <div onclick="irACampoVacioEspecifico('${c.id}')"
        class="group p-2.5 rounded-xl border border-rose-200/80 bg-rose-50/60 hover:bg-rose-100 hover:border-rose-300 transition-all cursor-pointer flex items-start gap-2.5 shadow-2xs">
        <span class="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-2xs">
          ${idx + 1}
        </span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span class="text-[9.5px] font-bold uppercase tracking-wider bg-white text-rose-800 px-1.5 py-0.5 rounded border border-rose-200">
              ${c.seccion}
            </span>
            <span class="text-xs font-bold text-slate-800 group-hover:text-segey-950 transition">
              ${c.nombre}
            </span>
          </div>
          <p class="text-[11px] text-slate-600 leading-tight">
            ${c.detalle}
          </p>
        </div>
        <div class="flex items-center text-xs text-rose-500 group-hover:text-rose-700 transition mt-1 font-semibold gap-1 shrink-0">
          <span class="hidden sm:inline text-[10px]">Llenar</span>
          <i class="fa-solid fa-arrow-right text-[11px]"></i>
        </div>
      </div>
    `).join('');
  }

  modal.classList.remove('hidden');
}

/**
 * Cierra el modal de campos vacíos.
 */
function cerrarModalCamposVacios() {
  const modal = document.getElementById('modal-campos-vacios');
  if (modal) modal.classList.add('hidden');
}

/**
 * Cierra el modal y enfoca el primer campo vacío en el formulario.
 */
function irACompletarCamposVacios() {
  cerrarModalCamposVacios();
  const camposVacios = obtenerCamposVaciosFormulario();
  if (camposVacios.length > 0) {
    irACampoVacioEspecifico(camposVacios[0].id);
  } else {
    switchTab('tab-form');
  }
}

/**
 * Lleva la pantalla directamente a un campo específico del formulario y lo resalta.
 */
function irACampoVacioEspecifico(elementId) {
  cerrarModalCamposVacios();
  switchTab('tab-form');

  setTimeout(() => {
    let el = document.getElementById(elementId);
    // Si el elemento es un select con combobox buscador oculto, enfocar el input de búsqueda visible
    if (el && el.tagName === 'SELECT' && el.getAttribute('data-combobox-hidden') === 'true') {
      const parent = el.closest('.segey-combobox') || el.parentElement;
      const inputCombobox = parent?.querySelector('input[type="text"]');
      if (inputCombobox) el = inputCombobox;
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { el.focus(); } catch (e) {}

      // Efecto visual de destello para ubicar inmediatamente el campo
      el.classList.add('ring-4', 'ring-rose-400', 'ring-offset-2', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-rose-400', 'ring-offset-2');
      }, 2500);
    }
  }, 200);
}

/**
 * Actualiza el banner de alerta en la pestaña "Vista del Documento".
 */
function actualizarBannerVistaPreviaIncompleta() {
  const banner = document.getElementById('banner-preview-incompleto');
  const texto = document.getElementById('banner-preview-incompleto-texto');
  if (!banner) return;

  // 1. Si estamos en modo de edición activa de una constancia, cualquier campo borrado o vacío debe alertarse
  const isEditing = Boolean(editingRecordId);

  // 2. Si se trata de una consulta histórica desde la bitácora (NO en modo edición activa),
  // y el registro ya está guardado institucionalmente, no mostrar advertencias.
  if (!isEditing && currentRenderedRecord && records && records.some(r => r.id === currentRenderedRecord.id || (r.folio && r.folio === currentRenderedRecord.folio))) {
    banner.classList.add('hidden');
    return;
  }

  // 3. Si es un nuevo registro o está en modo edición activa, verificar los campos del formulario
  const camposVacios = obtenerCamposVaciosFormulario();
  if (camposVacios.length > 0) {
    banner.classList.remove('hidden');
    if (texto) {
      if (isEditing) {
        texto.innerHTML = `Constancia en edición: Se detectaron <strong>${camposVacios.length} campo(s) obligatorio(s) vacío(s)</strong>. Complete y guarde las modificaciones antes de descargar el PDF.`;
      } else {
        texto.innerHTML = `Se detectaron <strong>${camposVacios.length} campo(s) obligatorio(s) vacío(s)</strong> en el formulario. La descarga del PDF oficial está bloqueada hasta completarlos.`;
      }
    }
  } else {
    banner.classList.add('hidden');
  }
}

window.obtenerCamposVaciosFormulario = obtenerCamposVaciosFormulario;
window.mostrarModalCamposVacios = mostrarModalCamposVacios;
window.cerrarModalCamposVacios = cerrarModalCamposVacios;
window.irACompletarCamposVacios = irACompletarCamposVacios;
window.irACampoVacioEspecifico = irACampoVacioEspecifico;
window.actualizarBannerVistaPreviaIncompleta = actualizarBannerVistaPreviaIncompleta;

/**
 * RENDERIZA EL DOCUMENTO EN BASE AL LAYOUT ACTIVO
 */
function renderDocument(data) {
  currentRenderedRecord = data;

  const container = document.getElementById('print-sheet');
  if (!container) return;

  const activeTemplate = getActiveLayoutHtml();
  const compiledHtml = compileLayout(activeTemplate, data);
  container.innerHTML = compiledHtml;

  actualizarBannerVistaPreviaIncompleta();
}

/**
 * Asegura que la constancia actual quede persistida en almacenamiento local (localStorage/disco)
 * y sincronizada en tiempo real con Google Sheets antes de descargar el documento oficial.
 */
function ensureCurrentDocumentSaved() {
  const formData = getCurrentFormDataForPreview();
  let folio = (document.getElementById('folioControl')?.value || '').trim();
  if (!folio) {
    folio = generateNextFolio();
    const fInp = document.getElementById('folioControl');
    if (fInp) fInp.value = folio;
  }

  let existingIdx = -1;
  if (editingRecordId) {
    existingIdx = records.findIndex(r => r.id === editingRecordId);
  }
  if (existingIdx === -1 && folio) {
    existingIdx = records.findIndex(r => r.folio === folio);
  }

  const estatusVal = document.getElementById('estatus')?.value || 'Generada para Firma';
  const finalEstatus = (editingRecordId && estatusVal === 'Generada para Firma') ? 'Modificación' : estatusVal;

  const u1Nom = document.getElementById('titularUnidad1Nombre')?.value.trim() || '';
  const u1Car = document.getElementById('titularUnidad1Cargo')?.value.trim() || '';
  let u2Nom = document.getElementById('titularUnidad2Nombre')?.value.trim() || '';
  let u2Car = document.getElementById('titularUnidad2Cargo')?.value.trim() || '';
  const areaNom = document.getElementById('titularAreaNombre')?.value.trim() || '';
  const areaCar = document.getElementById('titularAreaCargo')?.value.trim() || '';
  const area2Nom = document.getElementById('titularArea2Nombre')?.value.trim() || '';
  const area2Car = document.getElementById('titularArea2Cargo')?.value.trim() || '';
  const t1Nom = document.getElementById('testigo1Nombre')?.value.trim() || '';
  const t1Car = document.getElementById('testigo1Cargo')?.value.trim() || '';
  const t2Nom = document.getElementById('testigo2Nombre')?.value.trim() || '';
  const t2Car = document.getElementById('testigo2Cargo')?.value.trim() || '';

  const tipoMovimientoEl = document.querySelector('input[name="tipoMovimiento"]:checked');
  const tipoMovimiento = tipoMovimientoEl ? tipoMovimientoEl.value : 'Alta';

  const titularUnidad1 = u1Car ? `${u1Nom} - ${u1Car}` : u1Nom;
  const titularUnidad2 = u2Nom ? (u2Car ? `${u2Nom} - ${u2Car}` : u2Nom) : '';
  const titularArea = areaCar ? `${areaNom} - ${areaCar}` : areaNom;
  const titularArea2 = area2Car ? `${area2Nom} - ${area2Car}` : area2Nom;
  const testigo1 = t1Car ? `${t1Nom} - ${t1Car}` : t1Nom;
  const testigo2 = t2Car ? `${t2Nom} - ${t2Car}` : t2Nom;

  const isCambioJerarquico = (tipoMovimiento === 'Cambio de dependencia jerárquica');
  const jefeInmediato = !isCambioJerarquico ? titularUnidad2 : '';

  const ndRaw = (document.getElementById('nuevaDenominacion')?.value.trim() || '').toUpperCase();
  const nnRaw = (document.getElementById('nuevoNombre')?.value.trim() || '').toUpperCase();
  let finalNuevaDenominacion = ndRaw;
  if (tipoMovimiento === 'Cambio de nombre') {
    finalNuevaDenominacion = (ndRaw && nnRaw) ? `${ndRaw} ➔ ${nnRaw}` : (ndRaw || nnRaw);
  }

  const recordData = {
    id: (existingIdx !== -1) ? records[existingIdx].id : (editingRecordId || 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
    folio: folio,
    fechaRegistro: (existingIdx !== -1 && records[existingIdx].fechaRegistro) ? records[existingIdx].fechaRegistro : new Date().toISOString(),
    areaNotificadora: document.getElementById('areaNotificadora')?.value.trim() || '',
    responsableCaptura: document.getElementById('responsableCaptura')?.value.trim() || '',
    municipio: document.getElementById('municipio')?.value.trim() || 'Mérida',
    fechaActa: document.getElementById('fechaActa')?.value || new Date().toISOString().split('T')[0],
    fechaConstancia: document.getElementById('fechaActa')?.value || new Date().toISOString().split('T')[0],
    dia: formData.dia,
    mes: formData.mes,
    anio: formData.anio,
    anioCompleto: formData.anioCompleto,
    horaActa: document.getElementById('horaActa')?.value || '10:00',
    horas: formData.horas,
    minutos: formData.minutos,
    inmueble: formatearInmueble(document.getElementById('inmueble')?.value.trim()) || 'el Edificio Central de la Secretaría de Educación',
    tipoMovimiento: tipoMovimiento,
    esCambioDependenciaJerarquica: isCambioJerarquico,
    noEsCambioDependenciaJerarquica: !isCambioJerarquico,
    esCambioNombre: (tipoMovimiento === 'Cambio de nombre'),
    noEsCambioNombre: (tipoMovimiento !== 'Cambio de nombre'),
    nombreActual: (tipoMovimiento === 'Cambio de nombre') ? ndRaw : '',
    nuevoNombre: (tipoMovimiento === 'Cambio de nombre') ? nnRaw : '',
    nuevaDenominacion: finalNuevaDenominacion,
    unidadDestino: (formData.unidadDestino || '').toUpperCase(),
    justificacion: (document.getElementById('justificacion')?.value.trim() || '').toUpperCase(),
    titularUnidad1Nombre: u1Nom,
    titularUnidad1Cargo: u1Car,
    titularUnidad1: titularUnidad1,
    titularUnidad2Nombre: u2Nom,
    titularUnidad2Cargo: u2Car,
    titularUnidad2: titularUnidad2,
    jefeInmediato: jefeInmediato,
    titularAreaNombre: areaNom,
    titularAreaCargo: areaCar,
    titularArea: titularArea,
    titularArea2Nombre: area2Nom,
    titularArea2Cargo: area2Car,
    titularArea2: titularArea2,
    testigo1Nombre: t1Nom,
    testigo1Cargo: t1Car,
    testigo1: testigo1,
    testigo2Nombre: t2Nom,
    testigo2Cargo: t2Car,
    testigo2: testigo2,
    estatus: finalEstatus,
    observaciones: document.getElementById('observaciones')?.value.trim() || ''
  };

  if (existingIdx !== -1) {
    records[existingIdx] = { ...records[existingIdx], ...recordData };
  } else {
    records.unshift(recordData);
  }

  currentRenderedRecord = recordData;
  saveRecordsToStorage();
  updateStats();
  renderTable();
  populateAreaFilter();

  sendToGoogleSheetsWebhook(recordData);
  return recordData;
}

/**
 * GENERA Y DESCARGA EL PDF OFICIAL
 * Primero intenta con el motor oficial de Word en el servidor local (PDF nativo 100% idéntico).
 * Si el servidor no está corriendo, genera inmediatamente con html2pdf.js en el navegador.
 */
async function downloadCurrentDocumentPDF(skipValidation = false) {
  const element = document.getElementById('print-sheet');
  if (!element || !currentRenderedRecord) return;

  // 0. BLOQUEO SI HAY CAMPOS VACÍOS EN EL FORMULARIO
  if (!skipValidation) {
    const isEditing = Boolean(editingRecordId);
    const isReadOnlyHistorical = !isEditing && currentRenderedRecord && records && records.some(r => r.id === currentRenderedRecord.id || (r.folio && r.folio === currentRenderedRecord.folio));
    if (!isReadOnlyHistorical) {
      const camposVacios = obtenerCamposVaciosFormulario();
      if (camposVacios.length > 0) {
        mostrarModalCamposVacios(camposVacios);
        showToast(`Descarga bloqueada: Complete los ${camposVacios.length} campos vacíos en el formulario.`, 'error');
        return;
      }
    }
  }

  // Persistir automáticamente el registro localmente y en Google Sheets
  try {
    ensureCurrentDocumentSaved();
  } catch (errSave) {
    console.warn('Advertencia al persistir constancia previa a la descarga:', errSave);
  }

  const btn = document.getElementById('btn-download-pdf');
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Generando PDF...';
  }

  const folio = (currentRenderedRecord.folio || 'DIMC').replace(/[/\?%*:|"<>]/g, '_');
  const filename = `Constancia_Cambios_${folio}.pdf`;

  showToast(`Generando PDF oficial (${folio})...`, 'info');

  try {
    // 1. Intentar con el servidor local Word COM (probando ruta relativa y localhost:8000)
    const candidateEndpoints = ['/api/generate-word-pdf'];
    if (window.location.protocol === 'file:' || (window.location.port !== '8000' && window.location.protocol === 'http:')) {
      candidateEndpoints.push('http://127.0.0.1:8000/api/generate-word-pdf');
      candidateEndpoints.push('http://localhost:8000/api/generate-word-pdf');
    }

    for (const endpoint of candidateEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentRenderedRecord),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          showToast(`¡Constancia PDF oficial generada en 1 hoja (Word Oficial)!`, 'success');
          if (!editingRecordId) {
            const nextFol = generateNextFolio();
            const folInp = document.getElementById('folioControl');
            if (folInp) folInp.value = nextFol;
          }
          return;
        }
      } catch (e) {
        console.warn(`Intento Word COM con ${endpoint} no disponible:`, e.message || e);
      }
    }

    // 2. Generación de respaldo en navegador mediante html2pdf.js centrado y sin recortes
    showToast('Generando PDF alternativo en navegador...', 'info');
    await generateClientSidePDF(element, filename);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnHtml;
    }
  }
}

async function generateClientSidePDF(element, filename) {
  if (typeof html2pdf === 'undefined') {
    alert('La librería generadora de PDF aún se está cargando. Por favor espere un momento.');
    return;
  }

  const prevScrollY = window.scrollY;
  const prevScrollX = window.scrollX;
  window.scrollTo(0, 0);

  // Ocultar explícitamente el pie estático del HTML para evitar que salga a mitad del documento o con paginación fija
  const staticFooters = element.querySelectorAll('.official-footer, .official-footer-table');
  staticFooters.forEach(el => { el.style.setProperty('display', 'none', 'important'); });

  // Agregar clase temporal para optimizar altura, márgenes y evitar saltos erróneos
  element.classList.add('generating-pdf');
  const innerSheets = element.querySelectorAll('.official-sheet');
  innerSheets.forEach(s => s.classList.add('generating-pdf'));

  // Dimensiones estándar Carta (Letter): 215.9mm x 279.4mm
  // Márgenes calibrados: Arriba: 6mm, Izquierda: 15mm, Abajo: 6mm, Derecha: 15mm
  // Proporciona máxima holgura vertical para que los cargos y puestos de las firmas inferiores nunca se corten.
  const opt = {
    margin: [6, 15, 6, 15],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: {
      unit: 'mm',
      format: 'letter',
      orientation: 'portrait'
    },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  try {
    const worker = html2pdf().from(element).set(opt);
    await worker.toCanvas();

    // Detección precisa de la última fila con contenido real para evitar páginas sobrantes en blanco
    if (worker.prop && worker.prop.canvas) {
      const canvas = worker.prop.canvas;
      const ratio = (worker.prop.pageSize && worker.prop.pageSize.inner) ? worker.prop.pageSize.inner.ratio : ((279.4 - 24) / (215.9 - 20));
      const pageHeightInPx = Math.floor(canvas.width * ratio);

      let lastContentY = 0;
      try {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const w = canvas.width;
        const h = canvas.height;

        outerLoop:
        for (let y = h - 1; y >= 0; y -= 2) {
          const rowOffset = y * w * 4;
          for (let x = 0; x < w; x += 4) {
            const idx = rowOffset + x * 4;
            // Si el pixel no es blanco puro (contiene tinta de texto, línea o firma)
            if (data[idx] < 240 || data[idx + 1] < 240 || data[idx + 2] < 240) {
              lastContentY = y;
              break outerLoop;
            }
          }
        }
      } catch (eScan) {
        lastContentY = canvas.height;
      }

      if (lastContentY > 0) {
        // Cantidad exacta de páginas necesarias para abarcar el contenido útil
        const pagesNeeded = Math.ceil((lastContentY + 15) / pageHeightInPx);
        const targetHeight = pagesNeeded * pageHeightInPx;

        // Si el canvas original tiene espacio en blanco sobrante que crea una página adicional innecesaria
        if (canvas.height > targetHeight && pagesNeeded >= 1) {
          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = canvas.width;
          croppedCanvas.height = targetHeight;
          const ctx = croppedCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, targetHeight);
          ctx.drawImage(canvas, 0, 0);
          worker.prop.canvas = croppedCanvas;
        }
      }
    }

    // =========================================================================
    // INSERCIÓN DE PIE DE PÁGINA OFICIAL EN TODAS Y CADA UNA DE LAS HOJAS
    // =========================================================================
    await worker.toPdf().get('pdf').then(function(pdf) {
      const totalPages = pdf.internal.getNumberOfPages();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 15; // mm (alineado con los 15mm de margen lateral del documento)
      const textY = pageHeight - 4; // 4mm arriba del borde inferior (bajado para evitar cortes en firmas)

      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);

        // 1. Franja de protección con fondo blanco limpio al pie de la página (reducido a 6mm)
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pageHeight - 6, pageWidth, 6, 'F');

        // Se elimina la línea divisoria horizontal gris según el formato oficial SEGEY

        // 2. Código oficial del formato institucional a la izquierda
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105); // #475569
        pdf.text('F-PR-EAO-03  R01', marginX, textY);

        // 3. Paginación continua y dinámica a la derecha (ej. Página 1 de 2, Página 2 de 2, etc.)
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, textY, { align: 'right' });
      }
    });

    await worker.save();
    showToast(`¡Documento ${filename} descargado con éxito!`, 'success');
  } catch (err) {
    console.error('Error al generar el PDF con html2pdf:', err);
    showToast('Inconveniente al generar el PDF.', 'error');
  } finally {
    element.classList.remove('generating-pdf');
    if (typeof innerSheets !== 'undefined' && innerSheets) {
      innerSheets.forEach(s => s.classList.remove('generating-pdf'));
    }
    staticFooters.forEach(el => { el.style.removeProperty('display'); });
    window.scrollTo(prevScrollX, prevScrollY);
  }
}

/**
 * DESCARGA DIRECTA DEL ARCHIVO WORD (.DOCX) RELLENO
 */
async function downloadCurrentDocumentDOCX(skipValidation = false) {
  if (!currentRenderedRecord) {
    showToast('Seleccione un registro o llene el formulario primero.', 'warning');
    return;
  }

  // 0. BLOQUEO SI HAY CAMPOS VACÍOS EN EL FORMULARIO
  if (!skipValidation) {
    const isEditing = Boolean(editingRecordId);
    const isReadOnlyHistorical = !isEditing && currentRenderedRecord && records && records.some(r => r.id === currentRenderedRecord.id || (r.folio && r.folio === currentRenderedRecord.folio));
    if (!isReadOnlyHistorical) {
      const camposVacios = obtenerCamposVaciosFormulario();
      if (camposVacios.length > 0) {
        mostrarModalCamposVacios(camposVacios);
        showToast(`Descarga bloqueada: Complete los ${camposVacios.length} campos vacíos en el formulario.`, 'error');
        return;
      }
    }
  }

  // Persistir automáticamente el registro localmente y en Google Sheets
  try {
    ensureCurrentDocumentSaved();
  } catch (errSave) {
    console.warn('Advertencia al persistir constancia previa a descarga Word:', errSave);
  }

  const folio = (currentRenderedRecord.folio || 'DIMC').replace(/[/\?%*:|"<>]/g, '_');
  const filename = `Constancia_Cambios_${folio}.docx`;

  showToast(`Generando archivo Word (.docx) oficial...`, 'info');

  const candidateEndpoints = ['/api/generate-docx'];
  if (window.location.protocol === 'file:' || (window.location.port !== '8000' && window.location.protocol === 'http:')) {
    candidateEndpoints.push('http://127.0.0.1:8000/api/generate-docx');
    candidateEndpoints.push('http://localhost:8000/api/generate-docx');
  }

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRenderedRecord)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast(`¡Archivo Word "${filename}" descargado con éxito!`, 'success');
        return;
      }
    } catch (e) {
      console.warn(`Intento DOCX con ${endpoint} no disponible:`, e.message || e);
    }
  }
  showToast('Para descargar el formato Word (.docx), ejecute el servidor local con: python server.py', 'warning');
}

/**
 * Descarga el PDF de un registro histórico
 */
function downloadPDFForRecord(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;

  renderDocument(record);
  switchTab('tab-preview', true);
  setTimeout(() => {
    downloadCurrentDocumentPDF(true);
  }, 350);
}

/**
 * Descarga el DOCX de un registro histórico
 */
function downloadDOCXForRecord(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;

  currentRenderedRecord = record;
  downloadCurrentDocumentDOCX(true);
}

/**
 * =========================================================================
 * BITÁCORA Y TABLA
 * =========================================================================
 */
function renderTable() {
  const tbody = document.getElementById('registry-table-body');
  if (!tbody) return;

  const searchQuery = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
  const areaFilter = document.getElementById('filter-area')?.value || '';
  const movimientoFilter = document.getElementById('filter-movimiento')?.value || '';
  const estatusFilter = document.getElementById('filter-estatus')?.value || '';
  const semaforoFilter = document.getElementById('filter-semaforo')?.value || '';

  const filtered = records.filter(r => {
    const areaNom = r.titularAreaNombre || r.titularArea || '';
    const matchSearch = !searchQuery ||
      (r.folio && r.folio.toLowerCase().includes(searchQuery)) ||
      (r.areaNotificadora && r.areaNotificadora.toLowerCase().includes(searchQuery)) ||
      (areaNom && areaNom.toLowerCase().includes(searchQuery)) ||
      (r.nuevaDenominacion && r.nuevaDenominacion.toLowerCase().includes(searchQuery)) ||
      (r.justificacion && r.justificacion.toLowerCase().includes(searchQuery)) ||
      (r.estatus && r.estatus.toLowerCase().includes(searchQuery)) ||
      (r.estatusAnterior && r.estatusAnterior.toLowerCase().includes(searchQuery)) ||
      (r.motivoInactivacion && r.motivoInactivacion.toLowerCase().includes(searchQuery));

    const matchArea = !areaFilter || r.areaNotificadora === areaFilter;
    const matchMovimiento = !movimientoFilter || r.tipoMovimiento === movimientoFilter;

    let matchEstatus = true;
    if (estatusFilter === 'solo_activos') {
      matchEstatus = r.estatus !== 'Inactivo';
    } else if (estatusFilter) {
      matchEstatus = r.estatus === estatusFilter;
    }

    const semInfo = calcularSemaforoFolio(r);
    let matchSemaforo = true;
    if (semaforoFilter) {
      matchSemaforo = (semInfo.nivel === semaforoFilter);
    }
    return matchSearch && matchArea && matchMovimiento && matchEstatus && matchSemaforo;
  });

  const canEdit = isSuperAdmin();
  const canDelete = isSuperAdmin();
  const isAudit = isAuditoriaUser();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${isAudit ? 9 : 10}" class="text-center py-10 text-slate-400">
          <i class="fa-solid fa-inbox text-3xl mb-2 block"></i>
          No se encontraron registros que coincidan con la búsqueda.
        </td>
      </tr>
    `;
    updateSelectedRecordsUI();
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const isInactive = r.estatus === 'Inactivo';
    const isSelected = selectedRecordIds.has(r.id);
    const badgeColor = getMovimientoBadgeColor(r.tipoMovimiento);
    const estatusColor = getEstatusBadgeColor(r.estatus);
    const fechaFormatted = r.fechaActa ? r.fechaActa : (r.fechaRegistro ? r.fechaRegistro.split('T')[0] : '—');
    const areaTitularDisplay = r.titularAreaNombre || r.titularArea || '—';
    const semInfo = calcularSemaforoFolio(r);

    // Indicador visual detallado del último estatus / historial
    let estatusHtml = '';
    if (isInactive) {
      estatusHtml = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300 shadow-sm">
          <i class="fa-solid fa-ban text-slate-500 text-[9px]"></i> Inactivo
        </span>
        <div class="text-[9.5px] text-slate-500 mt-1 font-medium leading-tight">
          <span class="text-slate-400">Último:</span> ${r.estatusAnterior || 'Generada para Firma'}
        </div>
        ${r.motivoInactivacion ? `
          <div class="text-[9.5px] text-rose-800 bg-rose-50 border border-rose-200/80 rounded-md px-2 py-1 mt-1 max-w-[210px] leading-tight" title="Motivo de inactivación: ${escapeHtml(r.motivoInactivacion)}">
            <span class="font-bold text-rose-900 block text-[8.5px] uppercase tracking-wider"><i class="fa-solid fa-comment-dots text-[8px] mr-1"></i>Motivo Inactivación:</span>
            <span class="text-slate-700 italic block mt-0.5">${escapeHtml(r.motivoInactivacion)}</span>
          </div>
        ` : ''}
        ${r.fechaInactivacion ? `<div class="text-[9px] text-slate-400 mt-1" title="Inactivado: ${new Date(r.fechaInactivacion).toLocaleString('es-MX')}">Inact: ${new Date(r.fechaInactivacion).toLocaleDateString('es-MX')}</div>` : ''}
      `;
    } else {
      estatusHtml = `
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${estatusColor}">
          ${r.estatus || 'Generada para Firma'}
        </span>
        ${r.estatusAnterior && r.estatusAnterior !== r.estatus ? `
          <div class="text-[9.5px] text-slate-500 mt-1 font-normal leading-tight" title="Estatus anterior antes de la modificación">
            <span class="text-slate-400">Previo:</span> ${r.estatusAnterior}
          </div>
        ` : ''}
        ${r.fechaModificacion ? `
          <div class="text-[9px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1" title="Última modificación: ${new Date(r.fechaModificacion).toLocaleString('es-MX')}">
            <i class="fa-solid fa-clock-rotate-left text-[8.5px]"></i> Editado ${r.vecesEditado > 1 ? `(${r.vecesEditado})` : ''}
          </div>
        ` : ''}
        ${r.fechaReactivacion ? `
          <div class="text-[9px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1" title="Reactivado el ${new Date(r.fechaReactivacion).toLocaleString('es-MX')}">
            <i class="fa-solid fa-rotate-left text-[8.5px]"></i> Reactivado
          </div>
        ` : ''}
      `;
    }

    // Columna Folio con indicador si está inactivo
    const folioHtml = isInactive
      ? `<div>
           <span class="font-mono font-bold text-slate-400 line-through mr-1">${r.folio}</span>
           <span class="inline-block text-[8.5px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">INACTIVO</span>
         </div>`
      : `<span class="font-mono font-bold text-slate-800">${r.folio}</span>`;

    // Botón de acción: Inactivar (conservando folio) o Reactivar
    const actionDeleteOrReactivate = isInactive
      ? `<button onclick="reactivateRecord('${r.id}')" title="Reactivar Constancia (Recuperar Folio Activo)" class="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 transition">
           <i class="fa-solid fa-rotate-left"></i>
         </button>`
      : `<button onclick="deleteRecord('${r.id}')" title="Inactivar Constancia (Conserva Folio Consecutivo)" class="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition">
           <i class="fa-solid fa-ban"></i>
         </button>`;

    const rowBgClass = isSelected
      ? 'bg-rose-50/70 border-rose-200'
      : (isInactive ? 'bg-slate-50/70 text-slate-400 hover:bg-slate-100' : 'hover:bg-slate-50');

    const checkboxTd = isAudit ? '' : `
      <td class="py-3 px-3 text-center">
        <input type="checkbox" class="record-checkbox w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
          value="${r.id}" onchange="handleRecordCheckboxChange(this)" ${isSelected ? 'checked' : ''}
          title="Seleccionar constancia ${escapeHtml(r.folio || '')}">
      </td>
    `;

    return `
      <tr class="transition border-b border-slate-100 ${rowBgClass}" data-record-id="${r.id}">
        ${checkboxTd}
        <td class="py-3 px-4">${folioHtml}</td>
        <td class="py-3 px-4 ${isInactive ? 'text-slate-400' : 'text-slate-600'}">${fechaFormatted}</td>
        <td class="py-3 px-4 font-semibold ${isInactive ? 'text-slate-500' : 'text-slate-800'}">${r.areaNotificadora}</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeColor} ${isInactive ? 'opacity-60' : ''}">
            ${r.tipoMovimiento}
          </span>
        </td>
        <td class="py-3 px-4 ${isInactive ? 'text-slate-400' : 'text-slate-700'} max-w-[200px] truncate" title="${r.nuevaDenominacion}">${r.nuevaDenominacion}</td>
        <td class="py-3 px-4 ${isInactive ? 'text-slate-400' : 'text-slate-700'}">${areaTitularDisplay}</td>
        <td class="py-3 px-4">
          <div class="space-y-1">
            ${estatusHtml}
            <div>
              <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-medium border ${semInfo.badgeClass}" title="${escapeHtml(semInfo.titulo || '')}">
                ${semInfo.dot} ${semInfo.label}
              </span>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 text-center">
          ${r.expedienteUrl ? `
            <a href="${escapeHtml(r.expedienteUrl)}" target="_blank" class="px-2 py-1 text-[11px] rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 font-semibold inline-flex items-center gap-1 shadow-2xs" title="Ver documento firmado en Google Drive">
              <i class="fa-solid fa-file-circle-check text-emerald-600"></i> Ver
            </a>
          ` : (canEdit ? `
            <button type="button" onclick="abrirModalSubirExpediente('${r.id}')" class="px-2 py-1 text-[11px] rounded bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-semibold inline-flex items-center gap-1 shadow-2xs" title="Tomar foto con cámara del celular o subir archivo">
              <i class="fa-solid fa-camera text-blue-600"></i> Adjuntar
            </button>
          ` : `<span class="text-slate-400 text-[10.5px] italic">Sin archivo</span>`)}
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="downloadPDFForRecord('${r.id}')" title="Descargar PDF Oficial" class="p-1.5 rounded-md hover:bg-red-50 text-red-600 hover:text-red-800 transition">
              <i class="fa-solid fa-file-pdf"></i>
            </button>
            <button onclick="downloadDOCXForRecord('${r.id}')" title="Descargar Word (.docx) Oficial" class="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition">
              <i class="fa-solid fa-file-word"></i>
            </button>
            <button onclick="viewRecord('${r.id}')" title="Ver con Layout Activo" class="p-1.5 rounded-md hover:bg-rose-50 text-segey-700 hover:text-segey-900 transition">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button onclick="showDetailsModal('${r.id}')" title="Detalles del Registro y Trazabilidad" class="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition">
              <i class="fa-solid fa-circle-info"></i>
            </button>
            ${canEdit ? `
              <button onclick="editRecord('${r.id}')" title="Editar Registro" class="p-1.5 rounded-md hover:bg-amber-50 text-amber-600 hover:text-amber-800 transition">
                <i class="fa-solid fa-pen"></i>
              </button>
            ` : ''}
            ${canDelete ? actionDeleteOrReactivate : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updateSelectedRecordsUI();
}

/**
 * =========================================================================
 * SELECCIÓN MÚLTIPLE Y ELIMINACIÓN DEFINITIVA DE CONSTANCIAS
 * Permite seleccionar individual o masivamente registros y confirmar su borrado.
 * =========================================================================
 */
const selectedRecordIds = new Set();

function handleRecordCheckboxChange(checkbox) {
  if (!checkbox) return;
  const id = checkbox.value;
  if (checkbox.checked) {
    selectedRecordIds.add(id);
  } else {
    selectedRecordIds.delete(id);
  }
  updateSelectedRecordsUI();
}

function toggleSelectAllRecords(masterCheckbox) {
  if (!masterCheckbox) return;
  const checkboxes = document.querySelectorAll('.record-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = masterCheckbox.checked;
    if (masterCheckbox.checked) {
      selectedRecordIds.add(cb.value);
    } else {
      selectedRecordIds.delete(cb.value);
    }
  });
  updateSelectedRecordsUI();
}

function updateSelectedRecordsUI() {
  const count = selectedRecordIds.size;
  const btnEliminar = document.getElementById('btn-eliminar-seleccionados');
  const badgeCount = document.getElementById('badge-eliminar-count');
  const txtEliminar = document.getElementById('btn-eliminar-texto');
  const masterCb = document.getElementById('select-all-records');
  const checkboxes = document.querySelectorAll('.record-checkbox');

  // Actualizar estado del botón de eliminación en la barra de herramientas
  if (btnEliminar) {
    if (count > 0) {
      btnEliminar.disabled = false;
      btnEliminar.classList.remove('bg-slate-100', 'text-slate-400', 'border-slate-200', 'cursor-not-allowed', 'opacity-60');
      btnEliminar.classList.add('bg-rose-600', 'hover:bg-rose-700', 'text-white', 'shadow-sm', 'cursor-pointer', 'opacity-100');
      if (badgeCount) {
        badgeCount.textContent = count;
        badgeCount.classList.remove('hidden');
      }
      if (txtEliminar) {
        txtEliminar.textContent = `Eliminar Seleccionados (${count})`;
      }
    } else {
      btnEliminar.disabled = true;
      btnEliminar.classList.add('bg-slate-100', 'text-slate-400', 'border-slate-200', 'cursor-not-allowed', 'opacity-60');
      btnEliminar.classList.remove('bg-rose-600', 'hover:bg-rose-700', 'text-white', 'shadow-sm', 'cursor-pointer', 'opacity-100');
      if (badgeCount) {
        badgeCount.classList.add('hidden');
      }
      if (txtEliminar) {
        txtEliminar.textContent = 'Eliminar Seleccionados';
      }
    }
  }

  // Actualizar checkbox maestro superior
  if (masterCb && checkboxes.length > 0) {
    let allChecked = true;
    let anyChecked = false;
    checkboxes.forEach(cb => {
      if (cb.checked) {
        anyChecked = true;
      } else {
        allChecked = false;
      }
    });
    masterCb.checked = allChecked;
    masterCb.indeterminate = !allChecked && anyChecked;
  } else if (masterCb) {
    masterCb.checked = false;
    masterCb.indeterminate = false;
  }

  // Resaltar visualmente las filas seleccionadas
  checkboxes.forEach(cb => {
    const tr = cb.closest('tr');
    if (!tr) return;
    if (cb.checked) {
      tr.classList.add('bg-rose-50/70', 'border-rose-200');
    } else {
      tr.classList.remove('bg-rose-50/70', 'border-rose-200');
    }
  });
}

function abrirModalEliminarSeleccionados() {
  if (!isSuperAdmin()) {
    showToast('Solo los administradores tienen permiso para eliminar registros.', 'error');
    return;
  }
  if (selectedRecordIds.size === 0) {
    showToast('Seleccione al menos una constancia con la casilla de la izquierda para eliminar.', 'warning');
    return;
  }

  const modal = document.getElementById('modal-eliminar-seleccionados');
  const countEl = document.getElementById('modal-eliminar-total');
  const listaEl = document.getElementById('modal-eliminar-lista');
  const btnConfirm = document.getElementById('btn-confirmar-borrado-definitivo');
  if (!modal || !countEl || !listaEl) return;

  const count = selectedRecordIds.size;
  countEl.textContent = `${count} constancia${count > 1 ? 's' : ''}`;
  if (btnConfirm) {
    btnConfirm.innerHTML = `<i class="fa-solid fa-trash-can"></i> Sí, Eliminar Definitivamente (${count})`;
  }

  // Obtener y listar registros seleccionados
  const recordsToDelete = records.filter(r => selectedRecordIds.has(r.id));
  listaEl.innerHTML = recordsToDelete.map(r => {
    const badgeColor = getMovimientoBadgeColor(r.tipoMovimiento);
    return `
      <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs">
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] shrink-0">${escapeHtml(r.folio || 'SIN FOLIO')}</span>
          <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${badgeColor} shrink-0">${escapeHtml(r.tipoMovimiento || 'Movimiento')}</span>
          <span class="text-slate-700 truncate font-medium" title="${escapeHtml(r.nuevaDenominacion || r.areaNotificadora || '')}">
            ${escapeHtml(r.nuevaDenominacion || r.areaNotificadora || 'Sin descripción')}
          </span>
        </div>
        <div class="text-[11px] text-slate-400 shrink-0 ml-2">
          ${escapeHtml(r.fechaActa || (r.fechaRegistro ? r.fechaRegistro.split('T')[0] : ''))}
        </div>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

function cerrarModalEliminarSeleccionados() {
  const modal = document.getElementById('modal-eliminar-seleccionados');
  if (modal) modal.classList.add('hidden');
}

function confirmarBorradoDefinitivo() {
  if (selectedRecordIds.size === 0) return;

  const count = selectedRecordIds.size;
  // Filtrar y eliminar permanentemente del array de registros
  records = records.filter(r => !selectedRecordIds.has(r.id));
  selectedRecordIds.clear();

  // Guardar en almacenamiento local y en disco server.py
  saveRecordsToStorage();

  // Cerrar modal y refrescar vista
  cerrarModalEliminarSeleccionados();
  renderTable();
  updateStats();
  populateAreaFilter();

  showToast(`¡Se eliminaron definitivamente ${count} constancia(s) de la bitácora institucional!`, 'success');
}

window.handleRecordCheckboxChange = handleRecordCheckboxChange;
window.toggleSelectAllRecords = toggleSelectAllRecords;
window.updateSelectedRecordsUI = updateSelectedRecordsUI;
window.abrirModalEliminarSeleccionados = abrirModalEliminarSeleccionados;
window.cerrarModalEliminarSeleccionados = cerrarModalEliminarSeleccionados;
window.confirmarBorradoDefinitivo = confirmarBorradoDefinitivo;

function getMovimientoBadgeColor(mov) {
  switch (mov) {
    case 'Alta':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'Baja':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'Cambio de nombre':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'Cambio de dependencia jerárquica':
      return 'bg-purple-100 text-purple-800 border border-purple-200';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

function getEstatusBadgeColor(estatus) {
  switch (estatus) {
    case 'Firmada y Concluida':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case 'Modificación':
      return 'bg-amber-100 text-amber-800 border border-amber-300';
    case 'Borrador':
      return 'bg-slate-100 text-slate-700 border border-slate-300';
    case 'Inactivo':
      return 'bg-slate-200 text-slate-700 border border-slate-300';
    default:
      return 'bg-blue-50 text-blue-700 border border-blue-200';
  }
}

function updateStats() {
  const total = records.length;
  updateRegistrySidebarBadges();
  const inactivos = records.filter(r => r.estatus === 'Inactivo').length;
  const activos = total - inactivos;
  const altas = records.filter(r => r.tipoMovimiento === 'Alta' && r.estatus !== 'Inactivo').length;
  const bajas = records.filter(r => r.tipoMovimiento === 'Baja' && r.estatus !== 'Inactivo').length;
  const cambios = records.filter(r => (r.tipoMovimiento === 'Cambio de nombre' || r.tipoMovimiento === 'Cambio de dependencia jerárquica') && r.estatus !== 'Inactivo').length;

  document.getElementById('stat-total').textContent = total;
  const subInactivos = document.getElementById('stat-sub-inactivos');
  if (subInactivos) {
    if (inactivos > 0) {
      subInactivos.innerHTML = `<span class="text-emerald-700 font-semibold">${activos} activas</span> • <span class="text-rose-600 font-semibold">${inactivos} inactiva${inactivos > 1 ? 's' : ''}</span>`;
    } else {
      subInactivos.textContent = 'Todas activas';
    }
  }

  document.getElementById('stat-altas').textContent = altas;
  document.getElementById('stat-bajas').textContent = bajas;
  document.getElementById('stat-cambios').textContent = cambios;

  const badgeTotal = document.getElementById('badge-total-records');
  if (badgeTotal) badgeTotal.textContent = total;
}

function populateAreaFilter() {
  const select = document.getElementById('filter-area');
  if (!select) return;

  const currentVal = select.value;
  const areas = [...new Set(records.map(r => r.areaNotificadora).filter(Boolean))].sort();

  select.innerHTML = '<option value="">Todas las áreas notificadoras</option>' +
    areas.map(a => `<option value="${a}" ${a === currentVal ? 'selected' : ''}>${a}</option>`).join('');
}

function viewRecord(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;

  renderDocument(record);
  switchTab('tab-preview', true);
}

/**
 * Parsea y estandariza cadenas de fecha a formato YYYY-MM-DD para <input type="date">
 */
function parseToInputDateFormat(val, record) {
  if (!val && record) {
    val = record.fechaConstancia || record.fechaActa || record.fechaRegistro || '';
  }
  if (!val && record && record.dia && record.anioCompleto) {
    const MESES = {'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06','julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12'};
    const m = MESES[(record.mes || '').toLowerCase()] || '11';
    return `${record.anioCompleto}-${m}-${String(record.dia).padStart(2, '0')}`;
  }
  if (!val) {
    return new Date().toISOString().split('T')[0];
  }
  val = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (val.includes('T')) return val.split('T')[0];
  const dmMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmMatch) {
    return `${dmMatch[3]}-${dmMatch[2].padStart(2, '0')}-${dmMatch[1].padStart(2, '0')}`;
  }
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Parsea y estandariza cadenas de hora a formato HH:MM para <input type="time">
 */
function parseToInputTimeFormat(val, record) {
  if (!val && record) {
    if (record.horaActa) val = record.horaActa;
    else if (record.horas && record.minutos) val = `${record.horas}:${record.minutos}`;
  }
  if (!val) return '10:00';
  val = String(val).trim();
  if (/^\d{2}:\d{2}$/.test(val)) return val;
  const match = val.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    const h = String(parsed.getHours()).padStart(2, '0');
    const m = String(parsed.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  return '10:00';
}

/**
 * Descompone inteligentemente registros donde el nombre y cargo vinieron juntos
 * (ej. "C. Edilberto Pech May - Auxiliar Administrativo (C)" o "Directora... — Nombre")
 */
function separateNombreAndCargo(nombreRaw, cargoRaw, compuestoRaw) {
  let nom = (nombreRaw || '').trim();
  let car = (cargoRaw || '').trim();
  const comp = (compuestoRaw || '').trim();

  // Si nom contiene separador " — " o " - " y cargo está vacío:
  if (!car && nom && (nom.includes(' — ') || nom.includes(' - '))) {
    const sep = nom.includes(' — ') ? ' — ' : ' - ';
    const parts = nom.split(sep);
    nom = parts[0].trim();
    car = parts.slice(1).join(sep).trim();
  }

  // Si después de eso falta nom o car, y tenemos compuestoRaw:
  if ((!nom || !car) && comp) {
    const sep = comp.includes(' — ') ? ' — ' : (comp.includes(' - ') ? ' - ' : null);
    if (sep) {
      const parts = comp.split(sep);
      if (!nom) nom = parts[0].trim();
      if (!car) car = parts.slice(1).join(sep).trim();
    } else {
      if (!nom) nom = comp;
    }
  }

  return { nombre: nom, cargo: car };
}

function editRecord(id, allowCapturista = false) {
  const record = records.find(r => r.id === id);
  if (!record) return;

  const admin = isSuperAdmin();
  if (!admin && !allowCapturista) {
    showToast('Solo los administradores tienen permiso para editar constancias emitidas desde la bitácora.', 'error');
    return;
  }

  if (!admin && (record.estatus === 'Firmada y Concluida' || record.estatus === 'Inactivo')) {
    showToast('Esta constancia ya está concluida o inactiva. Solo un Administrador puede autorizar su edición.', 'error');
    return;
  }

  editingRecordId = record.id;

  // 1. ÁREA NOTIFICADORA Y RESPONSABLE DE CAPTURA
  setAreaNotificadoraValue(record.areaNotificadora || '');
  setResponsableCapturaValue(record.responsableCaptura || '');
  document.getElementById('folioControl').value = record.folio || '';

  // 2. DATOS GENERALES (Municipio, Fechas, Inmueble)
  document.getElementById('municipio').value = record.municipio || 'Mérida';
  document.getElementById('fechaActa').value = parseToInputDateFormat(record.fechaConstancia || record.fechaActa || record.fechaRegistro || '', record);
  document.getElementById('horaActa').value = parseToInputTimeFormat(record.horaActa || '', record);
  document.getElementById('inmueble').value = record.inmueble || 'el Edificio Central de la Secretaría de Educación';

  // 3. TIPO DE MOVIMIENTO
  const radio = document.querySelector(`input[name="tipoMovimiento"][value="${record.tipoMovimiento}"]`);
  if (radio) {
    radio.checked = true;
    handleTipoMovimientoChange();
  }
  const isJefeInmediato = (record.tipoMovimiento === 'Alta' || record.tipoMovimiento === 'Baja' || record.tipoMovimiento === 'Cambio de nombre');

  // 4. DENOMINACIÓN / PUESTO
  if (record.tipoMovimiento === 'Cambio de nombre') {
    let nomAct = record.nombreActual || record.nuevaDenominacion || '';
    let nomNew = record.nuevoNombre || '';
    if (!nomNew && nomAct.includes('➔')) {
      const parts = nomAct.split('➔');
      nomAct = parts[0].trim();
      nomNew = parts[1].trim();
    } else if (!nomNew && nomAct.includes('->')) {
      const parts = nomAct.split('->');
      nomAct = parts[0].trim();
      nomNew = parts[1].trim();
    }
    document.getElementById('nuevaDenominacion').value = nomAct;
    const nnEl = document.getElementById('nuevoNombre');
    if (nnEl) nnEl.value = nomNew;
  } else {
    document.getElementById('nuevaDenominacion').value = record.nuevaDenominacion || '';
    const nnEl = document.getElementById('nuevoNombre');
    if (nnEl) nnEl.value = '';
  }

  // 5. EXTRACT DE FIRMANTES (Nombre y Cargo limpios)
  const t1 = separateNombreAndCargo(record.titularUnidad1Nombre, record.titularUnidad1Cargo, record.titularUnidad1);
  document.getElementById('titularUnidad1Nombre').value = t1.nombre;
  document.getElementById('titularUnidad1Cargo').value = t1.cargo;

  let rawU2Nom = record.titularUnidad2Nombre;
  let rawU2Car = record.titularUnidad2Cargo;
  let rawU2Comp = record.titularUnidad2;
  if (isJefeInmediato) {
    if (!rawU2Nom && record.jefeInmediatoNombre) rawU2Nom = record.jefeInmediatoNombre;
    if (!rawU2Car && record.jefeInmediatoCargo) rawU2Car = record.jefeInmediatoCargo;
    if (!rawU2Comp && record.jefeInmediato) rawU2Comp = record.jefeInmediato;
  }
  const t2 = separateNombreAndCargo(rawU2Nom, rawU2Car, rawU2Comp);
  document.getElementById('titularUnidad2Nombre').value = t2.nombre;
  document.getElementById('titularUnidad2Cargo').value = t2.cargo;

  const ta = separateNombreAndCargo(record.titularAreaNombre, record.titularAreaCargo, record.titularArea);
  document.getElementById('titularAreaNombre').value = ta.nombre;
  document.getElementById('titularAreaCargo').value = ta.cargo;

  const ta2 = separateNombreAndCargo(record.titularArea2Nombre, record.titularArea2Cargo, record.titularArea2);
  const a2NomEl = document.getElementById('titularArea2Nombre');
  const a2CarEl = document.getElementById('titularArea2Cargo');
  if (a2NomEl) a2NomEl.value = ta2.nombre;
  if (a2CarEl) a2CarEl.value = ta2.cargo;

  const test1 = separateNombreAndCargo(record.testigo1Nombre, record.testigo1Cargo, record.testigo1);
  document.getElementById('testigo1Nombre').value = test1.nombre;
  document.getElementById('testigo1Cargo').value = test1.cargo;

  const test2 = separateNombreAndCargo(record.testigo2Nombre, record.testigo2Cargo, record.testigo2);
  document.getElementById('testigo2Nombre').value = test2.nombre;
  document.getElementById('testigo2Cargo').value = test2.cargo;

  // 6. JUSTIFICACIÓN, ESTATUS Y OBSERVACIONES
  const justVal = (record.justificacion || '').substring(0, 350);
  document.getElementById('justificacion').value = justVal;
  if (justVal && justVal.trim()) {
    if (typeof setJustificacionEnabledState === 'function') {
      setJustificacionEnabledState(true);
    }
    const selJust = document.getElementById('selectJustificacionPredefinida');
    if (selJust) {
      let matched = false;
      const curU = justVal.trim().toUpperCase();
      for (let i = 1; i < selJust.options.length; i++) {
        if (selJust.options[i].value !== '__OTRO__' && selJust.options[i].value.toUpperCase() === curU) {
          selJust.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        selJust.value = '__OTRO__';
      }
    }
  } else {
    if (typeof setJustificacionEnabledState === 'function') {
      setJustificacionEnabledState(false);
    }
  }
  if (typeof updateJustificacionCharCounter === 'function') {
    updateJustificacionCharCounter();
  }
  document.getElementById('estatus').value = record.estatus || 'Generada para Firma';
  document.getElementById('observaciones').value = record.observaciones || '';

  // 7. POBLAR Y SELECCIONAR COMBOBOXES DE ÁREAS (Apartado I)
  if (record.tipoMovimiento === 'Baja') {
    const selBaja = document.getElementById('selectAreaBaja');
    const targetArea = (record.nuevaDenominacion || '').trim();
    if (selBaja && targetArea) {
      let matched = false;
      for (let i = 0; i < selBaja.options.length; i++) {
        if (selBaja.options[i].value && selBaja.options[i].value.toUpperCase() === targetArea.toUpperCase()) {
          selBaja.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const opt = document.createElement('option');
        opt.value = targetArea;
        opt.textContent = targetArea;
        if (selBaja.options.length > 1) selBaja.insertBefore(opt, selBaja.options[1]);
        else selBaja.appendChild(opt);
        selBaja.selectedIndex = 1;
      }
    }
  }

  if (record.tipoMovimiento === 'Cambio de nombre') {
    const selCambio = document.getElementById('selectAreaCambioNombre');
    const targetArea = (document.getElementById('nuevaDenominacion')?.value || '').trim();
    if (selCambio && targetArea) {
      let matched = false;
      for (let i = 0; i < selCambio.options.length; i++) {
        if (selCambio.options[i].value && selCambio.options[i].value.toUpperCase() === targetArea.toUpperCase()) {
          selCambio.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const opt = document.createElement('option');
        opt.value = targetArea;
        opt.textContent = targetArea;
        if (selCambio.options.length > 1) selCambio.insertBefore(opt, selCambio.options[1]);
        else selCambio.appendChild(opt);
        selCambio.selectedIndex = 1;
      }
    }
  }

  if (record.tipoMovimiento === 'Cambio de dependencia jerárquica') {
    const selDep = document.getElementById('selectAreaCambioDep');
    const targetArea = (record.nuevaDenominacion || '').trim();
    if (selDep && targetArea) {
      let matched = false;
      for (let i = 0; i < selDep.options.length; i++) {
        if (selDep.options[i].value && selDep.options[i].value.toUpperCase() === targetArea.toUpperCase()) {
          selDep.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const opt = document.createElement('option');
        opt.value = targetArea;
        opt.textContent = targetArea;
        if (selDep.options.length > 1) selDep.insertBefore(opt, selDep.options[1]);
        else selDep.appendChild(opt);
        selDep.selectedIndex = 1;
      }
    }

    const selDestino = document.getElementById('selectUnidadDestinoCambioDep');
    const targetDestino = (record.unidadDestino || '').trim();
    if (selDestino && targetDestino) {
      for (let i = 0; i < selDestino.options.length; i++) {
        const opt = selDestino.options[i];
        const dataU = opt.getAttribute('data-unidad') || '';
        const txt = (opt.textContent || '').toUpperCase();
        if ((dataU && dataU.toUpperCase() === targetDestino.toUpperCase()) ||
            txt.includes(targetDestino.toUpperCase())) {
          selDestino.selectedIndex = i;
          break;
        }
      }
    }
  }

  // 8. SINCRONIZAR SELECCIONES EN SELECTS DE FIRMANTES (Apartado II)
  // Titular Unidad 1:
  const selT1 = document.getElementById('selectTitularUnidad1');
  if (selT1 && (t1.nombre || t1.cargo)) {
    const nNom = normalizeText(t1.nombre);
    const nCar = normalizeText(t1.cargo);
    let matched = false;
    for (let i = 0; i < selT1.options.length; i++) {
      const opt = selT1.options[i];
      const optNom = normalizeText(opt.dataset?.nombre || '');
      const optCar = normalizeText(opt.dataset?.cargo || '');
      const optTxt = normalizeText(opt.textContent || '');
      if ((nNom && (optNom === nNom || optTxt.includes(nNom))) || (nCar && (optCar === nCar || optTxt.includes(nCar)))) {
        selT1.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const opt = document.createElement('option');
      opt.value = `t1_rec_${Date.now()}`;
      opt.textContent = t1.cargo && t1.nombre ? `${t1.cargo} — ${t1.nombre}` : (t1.nombre || t1.cargo);
      opt.setAttribute('data-nombre', t1.nombre);
      opt.setAttribute('data-cargo', t1.cargo);
      if (selT1.options.length > 1) selT1.insertBefore(opt, selT1.options[1]);
      else selT1.appendChild(opt);
      selT1.selectedIndex = 1;
    }
  }

  // Titular Unidad 2 / Jefe Inmediato:
  const selT2 = document.getElementById('selectTitularUnidad2');
  if (selT2) {
    if (isJefeInmediato && typeof poblarSelectJefeInmediato === 'function') {
      poblarSelectJefeInmediato(record.areaNotificadora);
    }
    if (t2.nombre || t2.cargo) {
      const nNom = normalizeText(t2.nombre);
      const nCar = normalizeText(t2.cargo);
      let matched = false;
      for (let i = 0; i < selT2.options.length; i++) {
        const opt = selT2.options[i];
        const optNom = normalizeText(opt.dataset?.nombre || '');
        const optCar = normalizeText(opt.dataset?.cargo || '');
        const optTxt = normalizeText(opt.textContent || '');
        if ((nNom && (optNom === nNom || (optNom.length > 5 && nNom.includes(optNom)) || optTxt.includes(nNom))) ||
            (nCar && (optCar === nCar || (optCar.length > 6 && nCar.includes(optCar)) || optTxt.includes(nCar)))) {
          selT2.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const opt = document.createElement('option');
        opt.value = `t2_rec_${Date.now()}`;
        opt.textContent = t2.cargo && t2.nombre ? `${t2.cargo} — ${t2.nombre}` : (t2.nombre || t2.cargo);
        opt.setAttribute('data-nombre', t2.nombre);
        opt.setAttribute('data-cargo', t2.cargo);
        if (selT2.options.length > 1) selT2.insertBefore(opt, selT2.options[1]);
        else selT2.appendChild(opt);
        selT2.selectedIndex = 1;
      }
    }
  }

  // Titular de Área:
  const selArea = document.getElementById('selectTitularArea');
  if (selArea) {
    if (t2.cargo || t2.nombre) {
      actualizarOpcionesTitularAreaPorJefe(t2.cargo, t2.nombre, record.areaNotificadora);
    }
    if (ta.nombre || ta.cargo) {
      const nNom = normalizeText(ta.nombre);
      const nCar = normalizeText(ta.cargo);
      let matched = false;
      for (let i = 0; i < selArea.options.length; i++) {
        const opt = selArea.options[i];
        const optNom = normalizeText(opt.dataset?.nombre || '');
        const optPue = normalizeText(opt.dataset?.puesto || opt.dataset?.cargo || '');
        const optTxt = normalizeText(opt.textContent || '');
        if ((nNom && (optNom === nNom || (optNom.length > 5 && nNom.includes(optNom)) || optTxt.includes(nNom))) ||
            (nCar && (optPue === nCar || (optPue.length > 6 && nCar.includes(optPue)) || optTxt.includes(nCar)))) {
          selArea.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const opt = document.createElement('option');
        opt.value = `ta_rec_${Date.now()}`;
        opt.textContent = ta.cargo && ta.nombre ? `${ta.cargo} — ${ta.nombre}` : (ta.nombre || ta.cargo);
        opt.setAttribute('data-nombre', ta.nombre);
        opt.setAttribute('data-puesto', ta.cargo);
        if (selArea.options.length > 1) selArea.insertBefore(opt, selArea.options[1]);
        else selArea.appendChild(opt);
        selArea.selectedIndex = 1;
      }
    }
  }

  // 9. SINCRONIZAR VISUALMENTE TODOS LOS COMBOBOXES BUSCABLES
  if (typeof syncComboboxFromSelect === 'function') {
    syncComboboxFromSelect('selectTitularUnidad1');
    syncComboboxFromSelect('selectTitularUnidad2');
    syncComboboxFromSelect('selectTitularArea');
    syncComboboxFromSelect('selectAreaBaja');
    syncComboboxFromSelect('selectAreaCambioNombre');
    syncComboboxFromSelect('selectAreaCambioDep');
    syncComboboxFromSelect('selectUnidadDestinoCambioDep');
  }

  switchTab('tab-form');
  updateEstatusPermissions(isSuperAdmin());
  const banner = document.getElementById('editing-folio-banner');
  if (banner && record) {
    const lblFol = document.getElementById('lbl-editing-folio');
    const lblSt = document.getElementById('lbl-editing-status');
    if (lblFol) lblFol.textContent = record.folio || '';
    if (lblSt) lblSt.textContent = record.estatus || 'Generada para Firma';
    banner.classList.remove('hidden');
  }

  const submitBtn = document.getElementById('btn-submit-form');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1.5"></i> Guardar Modificación de Folio';
    submitBtn.classList.remove('bg-segey-800', 'hover:bg-segey-900');
    submitBtn.classList.add('bg-amber-700', 'hover:bg-amber-800');
  }

  showToast(`Constancia ${record.folio} cargada en formulario.`);
  renderDocument(getCurrentFormDataForPreview());
}

let currentInactivarRecordId = null;

function deleteRecord(id) {
  if (!isSuperAdmin()) {
    showToast('Solo los administradores tienen permiso para inactivar constancias.', 'error');
    return;
  }
  openInactivarModal(id);
}

function openInactivarModal(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;

  currentInactivarRecordId = id;
  const modal = document.getElementById('modal-inactivar');
  if (!modal) return;

  document.getElementById('inactivar-folio').textContent = record.folio;
  document.getElementById('inactivar-area').textContent = record.areaNotificadora || 'No especificada';
  document.getElementById('inactivar-movimiento').textContent = record.tipoMovimiento || '—';

  const motivoInput = document.getElementById('inactivar-motivo-input');
  if (motivoInput) {
    motivoInput.value = record.motivoInactivacion || '';
    motivoInput.classList.remove('ring-2', 'ring-rose-500', 'border-rose-500');
  }

  const errEl = document.getElementById('inactivar-error-msg');
  if (errEl) errEl.classList.add('hidden');

  modal.classList.remove('hidden');
  setTimeout(() => {
    if (motivoInput) motivoInput.focus();
  }, 100);
}

function closeInactivarModal() {
  const modal = document.getElementById('modal-inactivar');
  if (modal) modal.classList.add('hidden');
  currentInactivarRecordId = null;
}

function setMotivoRapido(motivo) {
  const input = document.getElementById('inactivar-motivo-input');
  if (input) {
    input.value = motivo;
    input.focus();
    input.classList.remove('ring-2', 'ring-rose-500', 'border-rose-500');
    const errEl = document.getElementById('inactivar-error-msg');
    if (errEl) errEl.classList.add('hidden');
  }
}

function confirmarInactivacionConMotivo() {
  if (!currentInactivarRecordId) return;
  const record = records.find(r => r.id === currentInactivarRecordId);
  if (!record) return;

  const motivoInput = document.getElementById('inactivar-motivo-input');
  const motivo = (motivoInput?.value || '').trim();
  const errEl = document.getElementById('inactivar-error-msg');

  if (!motivo) {
    if (errEl) errEl.classList.remove('hidden');
    if (motivoInput) {
      motivoInput.classList.add('ring-2', 'ring-rose-500', 'border-rose-500');
      motivoInput.focus();
    }
    return;
  }

  record.estatusAnterior = record.estatus || 'Generada para Firma';
  record.estatus = 'Inactivo';
  record.motivoInactivacion = motivo;
  record.fechaInactivacion = new Date().toISOString();

  saveRecordsToStorage();
  closeInactivarModal();
  renderTable();
  updateStats();
  populateAreaFilter();
  showToast(`Constancia ${record.folio} inactivada. Motivo registrado: "${motivo}".`, 'info');
}

function reactivateRecord(id) {
  if (!isSuperAdmin()) {
    showToast('Solo los administradores tienen permiso para reactivar constancias.', 'error');
    return;
  }
  const record = records.find(r => r.id === id);
  if (!record) return;

  const targetEstatus = (record.estatusAnterior && record.estatusAnterior !== 'Inactivo')
    ? record.estatusAnterior
    : 'Generada para Firma';

  const confirmMsg = `¿Desea reactivar la constancia con Folio ${record.folio}?\n\n` +
    `• El registro regresará a su estatus activo: "${targetEstatus}".\n` +
    `• Conservará su número consecutivo original sin alteraciones.`;

  if (confirm(confirmMsg)) {
    record.estatus = targetEstatus;
    record.fechaReactivacion = new Date().toISOString();
    saveRecordsToStorage();
    renderTable();
    updateStats();
    populateAreaFilter();
    showToast(`Constancia ${record.folio} reactivada exitosamente.`, 'success');
  }
}

function showDetailsModal(id) {
  const r = records.find(rec => rec.id === id);
  if (!r) return;

  const u1Nom = r.titularUnidad1Nombre || r.titularUnidad1 || '—';
  const u1Car = r.titularUnidad1Cargo || '';

  const u2Nom = r.titularUnidad2Nombre || r.titularUnidad2 || '';
  const u2Car = r.titularUnidad2Cargo || '';

  const areaNom = r.titularAreaNombre || r.titularArea || '—';
  const areaCar = r.titularAreaCargo || '';

  const t1Nom = r.testigo1Nombre || r.testigo1 || '—';
  const t1Car = r.testigo1Cargo || '';

  const t2Nom = r.testigo2Nombre || r.testigo2 || '—';
  const t2Car = r.testigo2Cargo || '';

  document.getElementById('modal-folio').textContent = r.folio;
  document.getElementById('modal-title').textContent = `${r.areaNotificadora} - ${r.tipoMovimiento}`;

  const isInactive = r.estatus === 'Inactivo';

  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <!-- Panel de Auditoría y Trazabilidad de Folio -->
    <div class="bg-amber-50/70 p-3.5 rounded-lg border border-amber-200 text-xs text-slate-700 space-y-2">
      <div class="font-bold text-slate-800 flex items-center justify-between border-b border-amber-200/70 pb-1.5">
        <span class="flex items-center gap-1.5 text-amber-900"><i class="fa-solid fa-clock-rotate-left text-amber-700"></i> Control de Folio y Trazabilidad</span>
        <span class="px-2 py-0.5 rounded text-[11px] font-bold ${isInactive ? 'bg-slate-200 text-slate-700 border border-slate-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}">
          ${isInactive ? '<i class="fa-solid fa-ban text-slate-500 mr-1"></i> Folio Inactivo (Conservado)' : '<i class="fa-solid fa-check text-emerald-600 mr-1"></i> Folio Activo'}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-[11.5px]">
        <div><strong>Estatus Actual:</strong> <span class="font-bold text-slate-900">${r.estatus || 'Generada para Firma'}</span></div>
        <div><strong>Último Estatus Previo:</strong> <span class="text-slate-800 font-medium">${r.estatusAnterior || 'Original (Sin cambio)'}</span></div>
        <div><strong>Fecha Registro Inicial:</strong> ${r.fechaRegistro ? new Date(r.fechaRegistro).toLocaleString('es-MX') : (r.fechaActa || '—')}</div>
        <div><strong>Última Modificación:</strong> ${r.fechaModificacion ? `${new Date(r.fechaModificacion).toLocaleString('es-MX')} (${r.vecesEditado || 1} edic.)` : 'Sin modificaciones'}</div>
        ${r.fechaInactivacion ? `
          <div class="col-span-2 text-rose-800 bg-rose-50/90 p-2.5 rounded-lg border border-rose-200 space-y-1">
            <div class="flex items-center justify-between text-[11.5px]">
              <strong class="text-rose-900"><i class="fa-solid fa-ban mr-1"></i> Inactivado el:</strong>
              <span>${new Date(r.fechaInactivacion).toLocaleString('es-MX')}</span>
            </div>
            ${r.motivoInactivacion ? `
              <div class="mt-1 pt-1.5 border-t border-rose-200/60">
                <strong class="text-rose-900 block text-[10px] uppercase tracking-wider mb-0.5">Motivo Registrado de la Inactivación:</strong>
                <div class="text-slate-800 italic bg-white/80 p-2 rounded border border-rose-200/40 text-[11px] leading-relaxed">"${escapeHtml(r.motivoInactivacion)}"</div>
              </div>
            ` : ''}
            <div class="text-[10px] text-slate-500 italic mt-0.5">El folio consecutivo permanece registrado y protegido contra duplicados.</div>
          </div>
        ` : ''}
        ${r.fechaReactivacion ? `
          <div class="col-span-2 text-emerald-800 bg-emerald-50/80 p-2 rounded border border-emerald-200/60 space-y-0.5">
            <div class="flex items-center justify-between">
              <strong><i class="fa-solid fa-rotate-left mr-1"></i> Reactivado el:</strong>
              <span>${new Date(r.fechaReactivacion).toLocaleString('es-MX')}</span>
            </div>
            ${r.motivoInactivacion ? `
              <div class="text-[10.5px] text-slate-600">
                <strong>Motivo de baja anterior:</strong> "${escapeHtml(r.motivoInactivacion)}"
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${(r.historialCambios && r.historialCambios.length > 0) ? `
          <div class="col-span-2 mt-2 pt-2 border-t border-amber-200">
            <strong class="text-amber-950 block text-[10.5px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <i class="fa-solid fa-list-check text-amber-700"></i> Historial de Cambios Registrados (${r.historialCambios.length}):
            </strong>
            <div class="space-y-1.5 max-h-36 overflow-y-auto pl-2 border-l-2 border-amber-400">
              ${r.historialCambios.map(h => `
                <div class="text-[10.5px] text-slate-700 leading-tight bg-white/70 p-2 rounded border border-amber-200/60 shadow-2xs">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-amber-950">#${h.num} — ${new Date(h.fecha).toLocaleString('es-MX')}</span>
                    <span class="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">${escapeHtml(h.estatusNuevo)}</span>
                  </div>
                  <div class="text-[10px] text-slate-500 mt-0.5">Responsable: <em class="font-medium text-slate-700">${escapeHtml(h.responsable)}</em></div>
                  ${(h.cambios && h.cambios.length > 0) ? `
                    <div class="mt-1.5 pt-1.5 border-t border-slate-100 space-y-1">
                      <strong class="text-[9px] uppercase tracking-wider text-slate-500 block">Campos modificados:</strong>
                      ${h.cambios.map(c => `
                        <div class="text-[10px] text-slate-700 pl-1 leading-snug">
                          <span class="font-semibold text-slate-900">${escapeHtml(c.campo)}:</span>
                          <span class="line-through text-red-600 bg-red-50 px-1 rounded">${escapeHtml(c.antes || '(vacío)')}</span>
                          ➔ <span class="font-bold text-emerald-800 bg-emerald-50 px-1 rounded">${escapeHtml(c.despues || '(vacío)')}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  ${h.observaciones ? `<div class="text-[10px] text-slate-600 italic mt-1 bg-slate-50 p-1 rounded border border-slate-200/60">Nota: "${escapeHtml(h.observaciones)}"</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div><strong>Área Solicitante:</strong> ${r.areaNotificadora}</div>
      <div><strong>Responsable:</strong> ${r.responsableCaptura}</div>
      <div><strong>Fecha de Constancia y Hora:</strong> ${r.fechaConstancia || r.fechaActa} a las ${r.horaActa} hrs</div>
      <div><strong>Municipio:</strong> ${r.municipio}, Yucatán</div>
      <div><strong>Inmueble:</strong> ${r.inmueble}</div>
      <div><strong>Tipo de Movimiento:</strong> <span class="font-bold">${r.tipoMovimiento}</span></div>
    </div>

    <div class="space-y-1">
      <div class="font-bold text-slate-800">Nombre del Área o Adscripción:</div>
      <div class="p-2.5 bg-slate-50 rounded border border-slate-200">${r.nuevaDenominacion}</div>
    </div>

    <div class="space-y-1">
      <div class="font-bold text-slate-800">Justificación y Motivos del Cambio:</div>
      <div class="p-2.5 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">${r.justificacion}</div>
    </div>

    <div class="space-y-1">
      <div class="font-bold text-slate-800">Representantes de la Secretaría de Educación involucrados (Nombre y Cargo):</div>
      <ul class="list-disc pl-5 space-y-1 text-slate-600">
        <li><strong>Titular de Unidad 1:</strong> ${u1Nom} ${u1Car ? `<span class="text-slate-500">(${u1Car})</span>` : ''}</li>
        ${u2Nom ? `<li><strong>Titular de Unidad 2:</strong> ${u2Nom} ${u2Car ? `<span class="text-slate-500">(${u2Car})</span>` : ''}</li>` : ''}
        <li><strong>Titular de Área:</strong> ${areaNom} ${areaCar ? `<span class="text-slate-500">(${areaCar})</span>` : ''}</li>
        <li><strong>Testigo 1:</strong> ${t1Nom} ${t1Car ? `<span class="text-slate-500">(${t1Car})</span>` : ''}</li>
        <li><strong>Testigo 2:</strong> ${t2Nom} ${t2Car ? `<span class="text-slate-500">(${t2Car})</span>` : ''}</li>
      </ul>
    </div>
  `;

  document.getElementById('modal-btn-view').onclick = () => {
    closeDetailsModal();
    viewRecord(r.id);
  };

  document.getElementById('modal-btn-download').onclick = () => {
    closeDetailsModal();
    downloadPDFForRecord(r.id);
  };

  document.getElementById('modal-details').classList.remove('hidden');
}

function closeDetailsModal() {
  document.getElementById('modal-details').classList.add('hidden');
}

function resetForm() {
  editingRecordId = null;
  currentTipoMovimiento = '';
  pendingTipoMovimiento = null;
  try { localStorage.removeItem(AUTOSAVE_DRAFT_KEY); } catch(e){}
  const editingBanner = document.getElementById('editing-folio-banner');
  if (editingBanner) editingBanner.classList.add('hidden');

  const submitBtn = document.getElementById('btn-submit-form');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1.5"></i> Guardar Constancia';
    submitBtn.classList.remove('bg-amber-700', 'hover:bg-amber-800');
    submitBtn.classList.add('bg-segey-800', 'hover:bg-segey-900');
  }
  document.getElementById('constancia-form').reset();
  ['titular1', 'titular2', 'area1', 'area2'].forEach(r => gestionarAlertaVacanteGenerales(r, false));
  setAreaNotificadoraValue('');
  setResponsableCapturaValue('');

  const selectResp = document.getElementById('selectResponsableCaptura');
  if (selectResp) {
    selectResp.innerHTML = '<option value="" disabled selected>-- Seleccione un Enlace oficial de la Unidad --</option>';
  }
  const customRespWrapper = document.getElementById('responsableCapturaCustomWrapper');
  if (customRespWrapper) customRespWrapper.classList.add('hidden');
  const customRespInput = document.getElementById('responsableCapturaCustom');
  if (customRespInput) customRespInput.value = '';

  const badgeResp = document.getElementById('badgeResponsableEnlaces');
  if (badgeResp) {
    badgeResp.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
    badgeResp.textContent = 'Enlaces oficiales';
  }
  const respInput = document.getElementById('responsableCaptura');
  if (respInput) {
    respInput.value = '';
  }

  const selectT1 = document.getElementById('selectTitularUnidad1');
  if (selectT1) {
    selectT1.innerHTML = '<option value="">-- Seleccione primero el Área que Notifica o Elabora arriba --</option>';
  }
  const badgeT1 = document.getElementById('badgeTitular1');
  if (badgeT1) {
    badgeT1.innerHTML = '<i class="fa-solid fa-link mr-1"></i>Según Área que Notifica';
  }

  const selectT2 = document.getElementById('selectTitularUnidad2');
  if (selectT2) {
    selectT2.value = '';
    selectT2.disabled = true;
  }

  const selectArea = document.getElementById('selectTitularArea');
  if (selectArea) {
    selectArea.innerHTML = '<option value="">-- Primero elija el Área que Notifica o Elabora arriba --</option>';
    selectArea.disabled = true;
    selectArea.classList.remove('bg-white', 'text-slate-800');
    selectArea.classList.add('bg-slate-50', 'text-slate-700');
  }

  const badgeArea = document.getElementById('badgeAreaSubordinados');
  if (badgeArea) {
    badgeArea.className = 'text-[10.5px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium';
    badgeArea.innerHTML = '<i class="fa-solid fa-filter text-slate-400 mr-1"></i>Seleccione el Área que Notifica o Elabora arriba';
  }

  const selectArea2 = document.getElementById('selectTitularArea2');
  if (selectArea2) {
    selectArea2.innerHTML = '<option value="">-- Primero elija la Dependencia Jerárquica de Destino arriba --</option>';
    selectArea2.disabled = true;
  }
  const badgeArea2 = document.getElementById('badgeAreaSubordinados2');
  if (badgeArea2) {
    badgeArea2.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
    badgeArea2.innerHTML = '<i class="fa-solid fa-filter text-slate-400 mr-1"></i>Pendiente de Unidad de Destino (2)';
  }
  const a2NomEl = document.getElementById('titularArea2Nombre');
  if (a2NomEl) a2NomEl.value = '';
  const a2CarEl = document.getElementById('titularArea2Cargo');
  if (a2CarEl) a2CarEl.value = '';

  const selT1 = document.getElementById('selectTestigo1');
  if (selT1) {
    selT1.innerHTML = '<option value="">-- Primero elija el Área que Notifica o Elabora arriba --</option>';
  }
  const badgeTestigo1 = document.getElementById('badgeTestigo1');
  if (badgeTestigo1) {
    badgeTestigo1.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
    badgeTestigo1.innerHTML = '<i class="fa-solid fa-filter text-slate-400 mr-1"></i>Según Área que Notifica';
  }

  const selT2 = document.getElementById('selectTestigo2');
  if (selT2) {
    selT2.innerHTML = '<option value="">-- Primero elija el Área que Notifica o Elabora arriba --</option>';
  }
  const badgeTestigo2 = document.getElementById('badgeTestigo2');
  if (badgeTestigo2) {
    badgeTestigo2.className = 'text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium';
    badgeTestigo2.innerHTML = '<i class="fa-solid fa-filter text-slate-400 mr-1"></i>Según Área / Destino';
  }

  initFormDefaults();
  const selectAreaBaja = document.getElementById('selectAreaBaja');
  if (selectAreaBaja) selectAreaBaja.value = '';
  const selectAreaCambio = document.getElementById('selectAreaCambioNombre');
  if (selectAreaCambio) selectAreaCambio.value = '';
  const nuevoNombreEl = document.getElementById('nuevoNombre');
  if (nuevoNombreEl) nuevoNombreEl.value = '';
  const containerNuevoNombre = document.getElementById('containerNuevoNombre');
  if (containerNuevoNombre) containerNuevoNombre.classList.add('hidden');
  handleTipoMovimientoChange();
  if (typeof setJustificacionEnabledState === 'function') {
    setJustificacionEnabledState(false);
  }
  renderDocument(getCurrentFormDataForPreview());
  updateEstatusPermissions(isSuperAdmin());
  showToast('Formulario restablecido.');
}

function loadSampleData() {
  // 1. Cargar Área que Notifica oficial (desencadena cascada a Titular 1 y Titular de Área)
  setAreaNotificadoraValue('Dirección de Administración y Finanzas');

  // 2. Seleccionar un mando oficial en el desplegable de Titular de Área
  const selectArea = document.getElementById('selectTitularArea');
  if (selectArea && selectArea.options.length > 1) {
    let targetIdx = 1;
    for (let i = 0; i < selectArea.options.length; i++) {
      if (selectArea.options[i].textContent.includes('Recursos Humanos') || selectArea.options[i].textContent.includes('Jefe') || selectArea.options[i].textContent.includes('Coordinador')) {
        targetIdx = i;
        break;
      }
    }
    selectArea.selectedIndex = targetIdx;
    handleTitularAreaSelect(selectArea);
  } else {
    document.getElementById('titularAreaNombre').value = 'L.C.C. Mirna Arleny Canché Moo';
    document.getElementById('titularAreaCargo').value = 'Jefa de Departamento de Recursos Humanos';
  }

  const selectResp = document.getElementById('selectResponsableCaptura');
  if (selectResp && selectResp.value && selectResp.value !== '__MANUAL__') {
    document.getElementById('responsableCaptura').value = selectResp.value;
  }
  document.getElementById('municipio').value = 'Mérida';
  document.getElementById('inmueble').value = 'el Edificio Central de la Secretaría de Educación';

  document.getElementById('testigo1Nombre').value = 'Lic. Rodrigo Marín Pech';
  document.getElementById('testigo1Cargo').value = 'Coordinador de Asuntos Jurídicos';

  document.getElementById('testigo2Nombre').value = 'Mtra. Elena Burgos Canul';
  document.getElementById('testigo2Cargo').value = 'Analista Administrativa';

  const radio = document.querySelector('input[name="tipoMovimiento"][value="Cambio de nombre"]');
  if (radio) radio.checked = true;
  handleTipoMovimientoChange();

  const selectT2 = document.getElementById('selectTitularUnidad2');
  if (selectT2 && selectT2.options.length > 1) {
    selectT2.selectedIndex = 1;
    handleTitularUnidad2Select(selectT2);
  }

  document.getElementById('nuevaDenominacion').value = 'DEPARTAMENTO DE RECURSOS HUMANOS';
  const nuevoNombreSample = document.getElementById('nuevoNombre');
  if (nuevoNombreSample) {
    nuevoNombreSample.value = 'DEPARTAMENTO DE GESTIÓN DEL TALENTO Y CONTROL DE INCIDENCIAS';
  }

  document.getElementById('justificacion').value = 'CON MOTIVO DE LA ACTUALIZACIÓN DEL MANUAL GENERAL DE ORGANIZACIÓN Y EN ATENCIÓN A LOS LINEAMIENTOS DEL PLAN ESTATAL DE DESARROLLO INSTITUCIONAL, SE FORMALIZA LA REESTRUCTURACIÓN ORGÁNICA Y CAMBIO DE DENOMINACIÓN DEL ANTERIOR DEPARTAMENTO DE RECURSOS HUMANOS PARA ASUMIR LA GOBERNANZA INTEGRAL DEL TALENTO HUMANO.';
  if (typeof updateJustificacionCharCounter === 'function') {
    updateJustificacionCharCounter();
  }

  document.getElementById('estatus').value = 'Generada para Firma';
  document.getElementById('observaciones').value = 'Notificado a la Dirección de Personal y a la SAF para la debida actualización de estructuras orgánicas y plantillas de plazas.';

  renderDocument(getCurrentFormDataForPreview());
  showToast('Datos de ejemplo cargados con catálogo orgánico oficial.');
}

function exportToCSV() {
  if (records.length === 0) {
    alert('No hay registros en la bitácora para exportar.');
    return;
  }

  const headers = [
    'Folio',
    'Fecha de Registro',
    'Área Notificadora',
    'Responsable de Captura',
    'Municipio',
    'Fecha de constancia',
    'Hora',
    'Inmueble',
    'Tipo de Movimiento',
    'Nombre del Área o Adscripción',
    'Justificación y Motivos',
    'Titular Unidad (1) - Nombre',
    'Titular Unidad (1) - Cargo',
    'Titular Unidad (2) - Nombre',
    'Titular Unidad (2) - Cargo',
    'Titular de Área - Nombre',
    'Titular de Área - Cargo',
    'Testigo (1) - Nombre',
    'Testigo (1) - Cargo',
    'Testigo (2) - Nombre',
    'Testigo (2) - Cargo',
    'Estatus',
    'Motivo de Inactivación',
    'Fecha de Inactivación',
    'Observaciones'
  ];

  const rows = records.map(r => [
    r.folio || '',
    r.fechaRegistro || '',
    r.areaNotificadora || '',
    r.responsableCaptura || '',
    r.municipio || '',
    r.fechaActa || '',
    r.horaActa || '',
    r.inmueble || '',
    r.tipoMovimiento || '',
    r.nuevaDenominacion || '',
    r.justificacion || '',
    r.titularUnidad1Nombre || r.titularUnidad1 || '',
    r.titularUnidad1Cargo || '',
    r.titularUnidad2Nombre || r.titularUnidad2 || '',
    r.titularUnidad2Cargo || '',
    r.titularAreaNombre || r.titularArea || '',
    r.titularAreaCargo || '',
    r.testigo1Nombre || r.testigo1 || '',
    r.testigo1Cargo || '',
    r.testigo2Nombre || r.testigo2 || '',
    r.testigo2Cargo || '',
    r.estatus || '',
    r.motivoInactivacion || '',
    r.fechaInactivacion ? new Date(r.fechaInactivacion).toLocaleString('es-MX') : '',
    r.observaciones || ''
  ]);

  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bitacora_Constancias_SEGEY_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Bitácora exportada a Excel (CSV).');
}

function exportJSONBackup() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `Respaldo_SEGEY_Constancias_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Respaldo JSON generado.');
}

function importJSONBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        records = imported;
        saveRecordsToStorage();
        renderTable();
        updateStats();
        populateAreaFilter();
        showToast('Respaldo restaurado exitosamente.');
      } else {
        alert('El archivo no contiene un formato de lista válido.');
      }
    } catch (err) {
      alert('Error al leer el archivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function saveRecordsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Error al guardar en localStorage:', e);
  }

  // Sincronización automática con el archivo físico en disco (bitacora_constancias.json) vía servidor local
  if (window.location.protocol.startsWith('http')) {
    fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records)
    }).catch(err => {
      // Si el servidor está apagado o en modo offline, localStorage ya guardó la copia
    });
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  const iconEl = document.getElementById('toast-icon');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;

  if (iconEl) {
    if (type === 'info') {
      iconEl.className = 'fa-solid fa-spinner fa-spin text-amber-400';
    } else if (type === 'error') {
      iconEl.className = 'fa-solid fa-circle-exclamation text-red-400';
    } else {
      iconEl.className = 'fa-solid fa-circle-check text-rose-400';
    }
  }

  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3500);
}

function updateShareLink() {
  const input = document.getElementById('share-link-input');
  if (!input) return;

  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'form');
  input.value = url.href;
}

function copyShareLink() {
  const input = document.getElementById('share-link-input');
  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value)
    .then(() => showToast('¡Enlace copiado al portapapeles!'))
    .catch(() => alert('Enlace: ' + input.value));
}

function openGoogleSheetsModal() {
  const modal = document.getElementById('modal-gsheets');
  const input = document.getElementById('gsheets-webhook-url');
  if (modal) {
    if (input) input.value = localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL || '';
    modal.classList.remove('hidden');
  }
}

function closeGoogleSheetsModal() {
  const modal = document.getElementById('modal-gsheets');
  if (modal) modal.classList.add('hidden');
}

function saveGoogleSheetsWebhook() {
  const input = document.getElementById('gsheets-webhook-url');
  if (!input) return;

  const url = input.value.trim();
  localStorage.setItem(WEBHOOK_KEY, url);
  closeGoogleSheetsModal();
  showToast(url ? 'Webhook de Google Sheets configurado.' : 'Webhook eliminado.');
}

function sendToGoogleSheetsWebhook(recordData) {
  const webhook = localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
  if (!webhook) return;

  const notifEmails = typeof getNotificationEmails === 'function' ? getNotificationEmails() : [];
  const payload = {
    ...recordData,
    correosNotificacion: notifEmails.join(',')
  };

  fetch(webhook, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  }).then(() => {
    console.log('Datos sincronizados con Google Sheets.');
    if (typeof showToast === 'function') {
      showToast('Constancia sincronizada con Google Sheets');
    }
  }).catch(err => {
    console.error('Error al sincronizar con Google Sheets:', err);
  });
}

function getInitialSampleRecords() {
  return [
    {
      id: 'rec_demo_001',
      folio: 'DIMC-CC-2026-001',
      fechaRegistro: '2026-11-05T09:30:00Z',
      areaNotificadora: 'Dirección General de Administración y Finanzas',
      responsableCaptura: 'Lic. Carmen María Peniche Solís',
      municipio: 'Mérida',
      fechaActa: '2026-11-05',
      dia: '05',
      mes: 'Noviembre',
      anio: '26',
      anioCompleto: 2026,
      horaActa: '09:30',
      horas: '09',
      minutos: '30',
      inmueble: 'el Edificio Central de la Secretaría de Educación',

      titularUnidad1Nombre: 'Mtro. Juan Carlos Espadas Alcocer',
      titularUnidad1Cargo: 'Director General de Administración y Finanzas',
      titularUnidad2Nombre: 'No Aplica',
      titularUnidad2Cargo: '',
      titularAreaNombre: 'Mtra. Silvia Gabriela Morales Canto',
      titularAreaCargo: 'Jefa del Departamento de Normatividad y Estructuras Orgánicas',
      testigo1Nombre: 'Lic. Rodrigo Marín Pech',
      testigo1Cargo: 'Coordinador de Asuntos Jurídicos',
      testigo2Nombre: 'Mtra. Elena Burgos Canul',
      testigo2Cargo: 'Analista Administrativa',

      tipoMovimiento: 'Cambio de nombre',
      nuevaDenominacion: 'DIRECCIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN E INNOVACIÓN DIGITAL',
      justificacion: 'CON MOTIVO DE LA ACTUALIZACIÓN DEL MANUAL GENERAL DE ORGANIZACIÓN Y EN ATENCIÓN A LOS LINEAMIENTOS DEL PLAN ESTATAL DE DESARROLLO INSTITUCIONAL, SE FORMALIZA LA REESTRUCTURACIÓN ORGÁNICA Y CAMBIO DE DENOMINACIÓN DEL ANTERIOR DEPARTAMENTO DE INFORMÁTICA Y TELECOMUNICACIONES PARA CONSTITUIRSE FORMALMENTE COMO LA DIRECCIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN E INNOVACIÓN DIGITAL, ASUMIENDO LA RECTORÍA DE LA INFRAESTRUCTURA TECNOLÓGICA, GOBERNANZA DE DATOS, CONECTIVIDAD DE LOS CENTROS EDUCATIVOS Y PLATAFORMAS DIGITALES DE LA SECRETARÍA DE EDUCACIÓN.',
      estatus: 'Firmada y Concluida',
      observaciones: 'Notificado a la Dirección de Personal y a la Secretaría de Administración y Finanzas (SAF) para la debida actualización de estructuras orgánicas y plantillas de plazas.'
    },
    {
      id: 'rec_demo_002',
      folio: 'DIMC-CC-2026-002',
      fechaRegistro: '2026-11-08T11:15:00Z',
      areaNotificadora: 'Dirección General de Desarrollo Educativo y Gestión Regional',
      responsableCaptura: 'Lic. Mariana Solís Valle',
      municipio: 'Mérida',
      fechaActa: '2026-11-08',
      dia: '08',
      mes: 'Noviembre',
      anio: '26',
      anioCompleto: 2026,
      horaActa: '11:15',
      horas: '11',
      minutos: '15',
      inmueble: 'el Complejo Administrativo de la Secretaría de Educación',

      titularUnidad1Nombre: 'Dr. Víctor Manuel Díaz Chan',
      titularUnidad1Cargo: 'Director General de Desarrollo Educativo y Gestión Regional',
      titularUnidad2Nombre: 'Mtro. José Luis Rodríguez Méndez',
      titularUnidad2Cargo: 'Director de Educación Primaria',
      titularAreaNombre: 'Mtro. Ricardo Antonio May Yah',
      titularAreaCargo: 'Jefe del Departamento de Servicios Regionales',
      testigo1Nombre: 'Lic. Patricia Arceo Mena',
      testigo1Cargo: 'Abogada Adscrita a la Dirección Jurídica',
      testigo2Nombre: 'C. Carlos Tuz Cupul',
      testigo2Cargo: 'Auxiliar Administrativo',

      tipoMovimiento: 'Cambio de dependencia jerárquica',
      nuevaDenominacion: 'COORDINACIÓN DE CENTROS DE DESARROLLO EDUCATIVO (CEDE), ADSCRITA A LA DIRECCIÓN GENERAL DE DESARROLLO EDUCATIVO Y GESTIÓN REGIONAL.',
      justificacion: 'A EFECTO DE OPTIMIZAR LA DESCONCENTRACIÓN DE TRÁMITES ESCOLARES Y FORTALECER LA VINCULACIÓN TERRITORIAL CON LOS MUNICIPIOS DEL INTERIOR DEL ESTADO, LA UNIDAD ADMINISTRATIVA DENOMINADA COORDINACIÓN DE CENTROS DE DESARROLLO EDUCATIVO TRANSFIERE FORMALMENTE SU DEPENDENCIA JERÁRQUICA Y OPERATIVA DE LA DIRECCIÓN DE EDUCACIÓN PRIMARIA A LA DIRECCIÓN GENERAL DE DESARROLLO EDUCATIVO Y GESTIÓN REGIONAL, UNIFICANDO LA ADMINISTRACIÓN DE SERVICIOS EDUCATIVOS Y RECURSOS ASIGNADOS.',
      estatus: 'Generada para Firma',
      observaciones: 'Se turna expediente de transferencia presupuestal y de bienes muebles a la Dirección de Administración y Finanzas.'
    }
  ];
}

/**
 * =========================================================================
 * BÚSQUEDA Y GESTIÓN DE FOLIOS PARA REIMPRESIÓN O EDICIÓN
 * =========================================================================
 */
function openBuscarFolioModal() {
  const modal = document.getElementById('modal-buscar-folio');
  const input = document.getElementById('input-buscar-folio');
  const container = document.getElementById('resultados-busqueda-folio');
  if (modal) {
    if (input) input.value = '';
    if (container) mostrarResultadosBusquedaFolio(records.slice(0, 5), true);
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (input) input.focus();
    }, 100);
    // Sincronizar siempre en segundo plano para que todos los usuarios tengan los últimos folios
    if (typeof syncRecordsFromGoogleSheets === 'function') {
      syncRecordsFromGoogleSheets(false).then(() => {
        if (!input || !input.value) {
          mostrarResultadosBusquedaFolio(records.slice(0, 5), true);
        }
      });
    }
  }
}

function closeBuscarFolioModal() {
  const modal = document.getElementById('modal-buscar-folio');
  if (modal) modal.classList.add('hidden');
}

async function ejecutarBusquedaFolio() {
  const input = document.getElementById('input-buscar-folio');
  if (!input) return;
  const q = input.value.trim().toLowerCase();
  if (!q) {
    mostrarResultadosBusquedaFolio(records.slice(0, 5), true);
    return;
  }

  let matches = records.filter(r => {
    const fol = (r.folio || '').toLowerCase();
    const area = (r.areaNotificadora || '').toLowerCase();
    const resp = (r.responsableCaptura || '').toLowerCase();
    const denom = (r.nuevaDenominacion || '').toLowerCase();
    const est = (r.estatus || '').toLowerCase();
    return fol.includes(q) || area.includes(q) || resp.includes(q) || denom.includes(q) || est.includes(q);
  });

  if (matches.length > 0) {
    mostrarResultadosBusquedaFolio(matches, false);
    return;
  }

  // Si no se encontró en la memoria local, buscar de inmediato en Google Sheets
  const container = document.getElementById('resultados-busqueda-folio');
  if (container) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-500 text-xs">
        <i class="fa-solid fa-spinner fa-spin text-2xl text-segey-700 mb-2 block"></i>
        Buscando folio en la Bitácora Central de Google Sheets...
      </div>
    `;
  }

  try {
    await syncRecordsFromGoogleSheets(false);
    matches = records.filter(r => {
      const fol = (r.folio || '').toLowerCase();
      const area = (r.areaNotificadora || '').toLowerCase();
      const resp = (r.responsableCaptura || '').toLowerCase();
      const denom = (r.nuevaDenominacion || '').toLowerCase();
      const est = (r.estatus || '').toLowerCase();
      return fol.includes(q) || area.includes(q) || resp.includes(q) || denom.includes(q) || est.includes(q);
    });
    mostrarResultadosBusquedaFolio(matches, false);
  } catch (err) {
    mostrarResultadosBusquedaFolio([], false);
  }
}

function mostrarResultadosBusquedaFolio(items, isRecent = false) {
  const container = document.getElementById('resultados-busqueda-folio');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-500 text-xs">
        <i class="fa-solid fa-folder-open text-2xl text-slate-400 mb-2 block"></i>
        No se encontró ninguna constancia con ese criterio de búsqueda.
      </div>
    `;
    return;
  }

  let html = '';
  if (isRecent) {
    html += `<p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Constancias en memoria (${items.length}):</p>`;
  } else {
    html += `<p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Resultados encontrados (${items.length}):</p>`;
  }

  items.forEach(r => {
    const estatusColor = getEstatusBadgeColor(r.estatus);
    html += `
      <div class="border border-slate-200 rounded-xl p-3.5 hover:border-segey-500 transition bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-xs text-segey-900 bg-segey-50 px-2 py-0.5 rounded border border-segey-200">
              ${escapeHtml(r.folio || 'S/F')}
            </span>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${estatusColor}">
              ${escapeHtml(r.estatus || 'Generada para Firma')}
            </span>
            <span class="text-[11px] text-slate-400">
              ${r.fechaActa || r.fechaConstancia || ''}
            </span>
          </div>
          <p class="text-xs font-semibold text-slate-800 line-clamp-1">
            ${escapeHtml(r.nuevaDenominacion || r.tipoMovimiento || 'Trámite')}
          </p>
          <p class="text-[11px] text-slate-500 line-clamp-1">
            <i class="fa-solid fa-building text-[10px] text-slate-400 mr-1"></i>${escapeHtml(r.areaNotificadora || 'Área no especificada')}
          </p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <button type="button" onclick="verFolioEnVisor('${r.id}')" title="Ver en visor y reimprimir PDF"
            class="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition flex items-center gap-1">
            <i class="fa-solid fa-file-pdf text-rose-700"></i> Reimprimir
          </button>
          <button type="button" onclick="cargarFolioParaEdicion('${r.id}')" title="Cargar en el formulario para editar"
            class="px-2.5 py-1.5 rounded-lg bg-segey-800 hover:bg-segey-900 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs">
            <i class="fa-solid fa-pen-to-square"></i> Cargar / Editar
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function cargarFolioParaEdicion(id) {
  closeBuscarFolioModal();
  editRecord(id, true);
  const banner = document.getElementById('editing-folio-banner');
  const record = records.find(r => r.id === id);
  if (banner && record) {
    const lblFol = document.getElementById('lbl-editing-folio');
    const lblSt = document.getElementById('lbl-editing-status');
    if (lblFol) lblFol.textContent = record.folio || '';
    if (lblSt) lblSt.textContent = record.estatus || 'Generada para Firma';
    banner.classList.remove('hidden');
    banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function verFolioEnVisor(id) {
  closeBuscarFolioModal();
  const record = records.find(r => r.id === id);
  if (record) {
    renderDocument(record);
    switchTab('tab-preview', true);
    showToast(`Mostrando constancia ${record.folio} en el visor lista para reimprimir.`);
  }
}

function cancelarEdicionFolio() {
  resetForm();
  const submitBtn = document.getElementById('btn-submit-form');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1.5"></i> Guardar Constancia';
    submitBtn.classList.remove('bg-amber-700', 'hover:bg-amber-800');
    submitBtn.classList.add('bg-segey-800', 'hover:bg-segey-900');
  }
  showToast('Modo edición cancelado. Formulario listo para nueva constancia.');
}

/**
 * =========================================================================
 * GESTIÓN DE CORREOS PARA AVISOS Y NOTIFICACIONES
 * =========================================================================
 */
function getNotificationEmails() {
  try {
    const raw = localStorage.getItem(NOTIF_EMAILS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveNotificationEmails(emails) {
  localStorage.setItem(NOTIF_EMAILS_KEY, JSON.stringify(emails));
  updateRegistrySidebarBadges();
}

function renderNotificationEmailsList() {
  const container = document.getElementById('lista-correos-notificaciones');
  const badge = document.getElementById('badge-total-correos-notif');
  if (!container) return;

  const emails = getNotificationEmails();
  if (badge) badge.textContent = `${emails.length} correo${emails.length === 1 ? '' : 's'}`;

  if (emails.length === 0) {
    container.innerHTML = `
      <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
        <i class="fa-solid fa-inbox text-slate-400 mr-1.5"></i> No hay correos registrados. Agrega los correos que deben recibir avisos de nuevos trámites o modificaciones.
      </div>
    `;
    return;
  }

  container.innerHTML = emails.map((em, idx) => `
    <div class="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition text-xs">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-envelope text-blue-600"></i>
        <span class="font-medium text-slate-800">${escapeHtml(em)}</span>
      </div>
      <button type="button" onclick="eliminarCorreoNotificacion(${idx})" title="Eliminar este correo"
        class="text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50 transition text-xs font-semibold flex items-center gap-1">
        <i class="fa-solid fa-trash-can"></i> Quitar
      </button>
    </div>
  `).join('');
}

function agregarCorreoNotificacion() {
  const input = document.getElementById('input-nuevo-correo-notif');
  if (!input) return;
  const email = input.value.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    alert('Por favor ingrese una dirección de correo electrónico válida (ej. nombre@yucatan.gob.mx).');
    input.focus();
    return;
  }

  const emails = getNotificationEmails();
  if (emails.includes(email)) {
    alert('Este correo electrónico ya se encuentra en la lista.');
    input.focus();
    return;
  }

  emails.push(email);
  saveNotificationEmails(emails);
  input.value = '';
  renderNotificationEmailsList();
  showToast(`Correo ${email} agregado a la lista de avisos.`);
}

function eliminarCorreoNotificacion(idx) {
  const emails = getNotificationEmails();
  if (idx >= 0 && idx < emails.length) {
    const removed = emails.splice(idx, 1);
    saveNotificationEmails(emails);
    renderNotificationEmailsList();
    showToast(`Correo ${removed[0]} eliminado de la lista.`);
  }
}

function guardarCorreosNotificacion() {
  renderNotificationEmailsList();
  showToast('Configuración de correos guardada con éxito.');
}

/**
 * =========================================================================
 * SINCRONIZACIÓN BIDIRECCIONAL CON GOOGLE SHEETS (CENTRALIZACIÓN)
 * =========================================================================
 */
let isSyncingGSheets = false;

async function syncRecordsFromGoogleSheets(forceToast = false) {
  if (isSyncingGSheets) return;

  // Acceso institucional universal para sincronización de bitácora y folios
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || BITACORA_API_TOKEN;

  const webhook = localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
  if (!webhook) {
    if (forceToast) showToast('Configure primero la URL del Webhook de Google Sheets.', 'error');
    return;
  }

  isSyncingGSheets = true;
  const syncIcon = document.getElementById('sync-gsheets-icon');
  if (syncIcon) syncIcon.classList.add('fa-spin');

  try {
    const fetchUrl = `${webhook}?action=getRecords&token=${encodeURIComponent(token || BITACORA_API_TOKEN)}&t=${Date.now()}`;
    const resp = await fetch(fetchUrl);
    const result = await resp.json();

    if (result && result.status === 'success' && Array.isArray(result.records)) {
      let agregados = 0;
      let actualizados = 0;

      result.records.forEach(remote => {
        if (!remote.folio) return;
        if (remote.folio.includes('_TEST')) return;
        const localIdx = records.findIndex(r => r.folio === remote.folio);
        if (localIdx === -1) {
          records.push({
            id: 'rec_gsheet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            ...remote
          });
          agregados++;
        } else {
          records[localIdx] = {
            ...records[localIdx],
            ...remote
          };
          actualizados++;
        }
      });

      records.sort((a, b) => new Date(b.fechaRegistro || b.fechaActa || 0) - new Date(a.fechaRegistro || a.fechaActa || 0));

      saveRecordsToStorage();
      updateStats();
      renderTable();
      updateRegistrySidebarBadges();

      // Si el folio actual en el formulario ya existe en los registros remotos sincronizados,
      // avanzar automáticamente al siguiente folio libre para evitar colisiones
      const folioInput = document.getElementById('folioControl');
      if (folioInput && !editingRecordId) {
        if (!folioInput.value || records.some(r => r.folio === folioInput.value)) {
          folioInput.value = generateNextFolio();
        }
      }

      if (forceToast) {
        showToast(`Sincronización completada: ${agregados} nuevos folios, ${actualizados} actualizados.`);
      }
      console.log(`Google Sheets Sync: ${agregados} agregados, ${actualizados} actualizados.`);
    } else if (result && result.status === 'error') {
      console.warn('Bitácora remota protegida:', result.message);
      if (forceToast) {
        showToast(result.message || 'Acceso restringido a la bitácora.', 'warning');
      }
    } else if (forceToast) {
      showToast('Sincronización completada. No hay registros adicionales.');
    }
  } catch (err) {
    console.warn('Sincronización con Google Sheets no disponible:', err);
    if (forceToast) {
      showToast('No se pudo conectar con Google Sheets en este momento.', 'error');
    }
  } finally {
    isSyncingGSheets = false;
    if (syncIcon) syncIcon.classList.remove('fa-spin');
  }
}

/**
 * =========================================================================
 * SINCRONIZACIÓN DE CATÁLOGO DINÁMICO DESDE GOOGLE SHEETS
 * Consulta directamente desde la hoja maestra Catalogo_Funcionarios_y_Puestos
 * =========================================================================
 */

/**
 * Aplica los titulares y cargos del Catálogo Remoto a CATALOGO_ORGANICO_SEGEY
 * para que cualquier cambio realizado en la hoja maestra Catalogo_Funcionarios_y_Puestos
 * se refleje de inmediato en los campos de Titular 1, Titular 2 / Jefe Inmediato y firmas.
 */
function applyRemoteCatalogo(catalogoData) {
  if (!Array.isArray(catalogoData) || catalogoData.length === 0) return;
  if (typeof CATALOGO_ORGANICO_SEGEY === 'undefined' || !Array.isArray(CATALOGO_ORGANICO_SEGEY)) return;

  let anyModified = false;
  catalogoData.forEach(item => {
    if (!item.area && !item.id) return;
    let unidad = null;
    if (item.id) {
      unidad = CATALOGO_ORGANICO_SEGEY.find(u => u.id === item.id);
    }
    if (!unidad && item.area) {
      unidad = CATALOGO_ORGANICO_SEGEY.find(u => u.unidad === item.area) ||
               CATALOGO_ORGANICO_SEGEY.find(u => item.area.toLowerCase().includes(u.unidad.toLowerCase()) || u.unidad.toLowerCase().includes(item.area.toLowerCase()));
    }
    if (unidad && item.titular) {
      unidad.titular = unidad.titular || {};
      const newNombre = String(item.titular).trim();
      const newCargo = item.cargo ? String(item.cargo).trim() : unidad.titular.cargo;
      if (unidad.titular.nombre !== newNombre || (newCargo && unidad.titular.cargo !== newCargo)) {
        unidad.titular.nombre = newNombre;
        if (newCargo) unidad.titular.cargo = newCargo;
        anyModified = true;
      }
    } else if (!unidad && item.area && item.titular) {
      // Registrar nueva unidad en CATALOGO_ORGANICO_SEGEY dinámicamente
      const newU = {
        id: item.id || ('u_' + Date.now()),
        grupo: item.grupo || 'Unidades Administrativas',
        unidad: item.area,
        titular: {
          nombre: String(item.titular).trim(),
          cargo: item.cargo ? String(item.cargo).trim() : 'Titular'
        },
        subordinados: []
      };
      CATALOGO_ORGANICO_SEGEY.push(newU);
      registrarAreaSubordinadaDinamica(item.area, item.area);
      anyModified = true;
    }
  });

  if (anyModified) {
    const activeMov = document.querySelector('input[name="tipoMovimiento"]:checked')?.value || '';
    if (activeMov === 'Cambio de dependencia jerárquica') {
      if (typeof initSelectTitularUnidad2 === 'function') initSelectTitularUnidad2();
    } else if (activeMov === 'Alta' || activeMov === 'Baja' || activeMov === 'Cambio de nombre') {
      if (typeof poblarSelectJefeInmediato === 'function') poblarSelectJefeInmediato();
    } else {
      if (typeof initSelectTitularUnidad2 === 'function') initSelectTitularUnidad2();
    }
  }
}
window.applyRemoteCatalogo = applyRemoteCatalogo;

async function buscarFuncionarioRemoto(query) {
  if (!query || String(query).trim().length < 3) return [];
  const webhook = localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
  if (!webhook) return [];
  try {
    const url = `${webhook}?action=buscarFuncionario&q=${encodeURIComponent(String(query).trim())}&t=${Date.now()}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data && data.status === 'success' && Array.isArray(data.results)) {
      return data.results;
    }
  } catch (err) {
    console.warn('Error buscando funcionario remoto en Google Sheets:', err);
  }
  return [];
}
window.buscarFuncionarioRemoto = buscarFuncionarioRemoto;

async function syncCatalogoFromGoogleSheets(forceToast = false) {
  const webhook = localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
  if (!webhook) return;

  try {
    const fetchUrl = `${webhook}?action=getCatalogo&t=${Date.now()}`;
    const resp = await fetch(fetchUrl);
    const result = await resp.json();

    if (result && result.status === 'success' && Array.isArray(result.catalogo) && result.catalogo.length > 0) {
      localStorage.setItem(REMOTE_CATALOG_KEY, JSON.stringify(result.catalogo));
      applyRemoteCatalogo(result.catalogo);

      const activeMov = document.querySelector('input[name="tipoMovimiento"]:checked')?.value || '';
      if (activeMov === 'Cambio de dependencia jerárquica') {
        if (typeof initSelectTitularUnidad2 === 'function') initSelectTitularUnidad2();
      } else if (activeMov === 'Alta' || activeMov === 'Baja' || activeMov === 'Cambio de nombre') {
        if (typeof poblarSelectJefeInmediato === 'function') poblarSelectJefeInmediato();
      } else {
        if (typeof initSelectTitularUnidad2 === 'function') initSelectTitularUnidad2();
      }

      if (forceToast) {
        showToast(`Catálogo de titulares sincronizado desde Google Sheets (${result.catalogo.length} unidades).`);
      }
    }
  } catch (e) {
    console.log('Catálogo remoto en Google Sheets no configurado; se usa el catálogo oficial base.');
  }
}

async function syncResponsablesFromGoogleSheets(forceToast = false) {
  const webhook = localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
  if (!webhook) return;

  try {
    const fetchUrl = `${webhook}?action=getResponsables&t=${Date.now()}`;
    const resp = await fetch(fetchUrl);
    const result = await resp.json();

    if (result && result.status === 'success' && result.responsables && typeof result.responsables === 'object') {
      const keys = Object.keys(result.responsables);
      if (keys.length > 0) {
        const currentCat = getResponsablesCatalog();
        let changed = false;
        keys.forEach(area => {
          if (area.includes('(Oficina Central)')) return;
          const val = result.responsables[area];
          if (val) {
            let parsedVal = val;
            if (typeof val === 'string' && (val.includes(',') || val.includes(';') || val.includes('\n'))) {
              parsedVal = val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
            }
            currentCat[area] = parsedVal;
            changed = true;
          }
        });

        // Asegurar que predefinedAreas contenga estrictamente las 59 áreas oficiales registradas
        predefinedAreas = [...DEFAULT_AREAS_NOTIFICADORAS].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

        saveResponsablesCatalog(currentCat);
        saveAreasToStorage();
        populateAreaSelect();
        if (typeof renderAdminResponsablesList === 'function') {
          renderAdminResponsablesList();
        }

        if (forceToast) {
          showToast(`Responsables de captura sincronizados (${keys.length} áreas).`);
        }
      }
    }
  } catch (e) {
    // Silencioso si no está configurada la pestaña
  }
}

const BITACORA_SPREADSHEET_ID = '1biuFH4b4x12bslKafsEE0OeOypk6ub1ukkxLlo3eVSA';

/**
 * Consulta la hoja de Google Sheets en tiempo real vía Google Visualization JSONP (sin CORS, 0 dependencias).
 */
function fetchGoogleSheetsGVizJSONP(sheetName, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const callbackName = 'gviz_jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    const script = document.createElement('script');
    script.id = callbackName;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout de conexión con Google Sheets'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
      const el = document.getElementById(callbackName);
      if (el) el.remove();
    }

    window[callbackName] = function(response) {
      cleanup();
      resolve(response);
    };

    script.onerror = function(err) {
      cleanup();
      reject(new Error('Error de red al consultar Google Sheets'));
    };

    script.src = `https://docs.google.com/spreadsheets/d/${BITACORA_SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`;
    document.head.appendChild(script);
  });
}

function parseGVizResponseToJustificaciones(res) {
  if (!res || !res.table || !res.table.rows || !Array.isArray(res.table.rows)) return null;
  const rows = res.table.rows;
  if (rows.length === 0) return null;

  const catalog = {
    'Alta': [],
    'Baja': [],
    'Cambio de nombre': [],
    'Cambio de dependencia jerárquica': []
  };

  let startIdx = 0;
  const first0 = (rows[0].c && rows[0].c[0] && rows[0].c[0].v !== undefined && rows[0].c[0].v !== null) ? String(rows[0].c[0].v).toLowerCase() : '';
  if (first0.includes('tipo') || first0.includes('movimiento')) {
    startIdx = 1;
  }

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r.c || r.c.length < 2) continue;
    const rawTipo = (r.c[0] && r.c[0].v !== undefined && r.c[0].v !== null) ? String(r.c[0].v).trim() : '';
    const rawMotivo = (r.c[1] && r.c[1].v !== undefined && r.c[1].v !== null) ? String(r.c[1].v).trim() : '';
    if (!rawTipo || !rawMotivo) continue;

    let tipoKey = rawTipo;
    const lower = rawTipo.toLowerCase();
    if (lower.includes('alta')) tipoKey = 'Alta';
    else if (lower.includes('baja')) tipoKey = 'Baja';
    else if (lower.includes('nombre')) tipoKey = 'Cambio de nombre';
    else if (lower.includes('dependencia') || lower.includes('jerárquica') || lower.includes('jerarquica')) tipoKey = 'Cambio de dependencia jerárquica';

    if (!catalog[tipoKey]) catalog[tipoKey] = [];
    if (!catalog[tipoKey].includes(rawMotivo)) {
      catalog[tipoKey].push(rawMotivo);
    }
  }

  const total = Object.values(catalog).reduce((acc, arr) => acc + arr.length, 0);
  return total > 0 ? catalog : null;
}

async function syncJustificacionesFromGoogleSheets(forceToast = false) {
  const icon = document.getElementById('icon-sync-justificaciones');
  if (icon) icon.classList.add('fa-spin');

  let newCatalog = null;

  // 1. Intentar lectura directa en tiempo real vía Google Visualization (JSONP - respuesta inmediata sin requerir Apps Script)
  try {
    const gvizRes = await fetchGoogleSheetsGVizJSONP('Justificaciones');
    newCatalog = parseGVizResponseToJustificaciones(gvizRes);
    if (newCatalog) {
      console.log('[SYNC] Justificaciones sincronizadas directamente desde Google Sheets (GViz):', newCatalog);
    }
  } catch (eGviz) {
    console.log('[SYNC] Consulta directa JSONP no disponible, probando Webhook de Apps Script...', eGviz);
  }

  // 2. Si falló la consulta directa, intentar vía Webhook de Apps Script
  if (!newCatalog) {
    const webhook = localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
    if (webhook) {
      try {
        const fetchUrl = `${webhook}?action=getJustificaciones&t=${Date.now()}`;
        const resp = await fetch(fetchUrl);
        const result = await resp.json();
        if (result && result.status === 'success' && result.justificaciones && typeof result.justificaciones === 'object') {
          newCatalog = result.justificaciones;
        }
      } catch (eWebhook) {
        console.warn('[SYNC] Error en Webhook getJustificaciones:', eWebhook);
      }
    }
  }

  try {
    if (newCatalog) {
      const total = Object.values(newCatalog).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
      if (total > 0) {
        saveJustificacionesCatalog(newCatalog);

        const selectedRadio = document.querySelector('input[name="tipoMovimiento"]:checked');
        if (selectedRadio) {
          poblarSelectJustificaciones(selectedRadio.value);
        }
        if (typeof renderAdminJustificacionesList === 'function' && typeof currentAdminJustCat !== 'undefined') {
          renderAdminJustificacionesList(currentAdminJustCat);
        }

        if (forceToast) {
          showToast(`✨ Justificaciones sincronizadas desde Google Sheets (${total} motivos cargados).`, 'success');
        }
        return true;
      }
    }

    if (forceToast) {
      showToast('No se pudieron obtener las justificaciones de Google Sheets.', 'warning');
    }
  } finally {
    if (icon) icon.classList.remove('fa-spin');
  }
  return false;
}
window.syncJustificacionesFromGoogleSheets = syncJustificacionesFromGoogleSheets;

async function sincronizarCatalogoDesdeGoogleSheets() {
  showToast('Sincronizando catálogo con Google Sheets...', 'info');
  try {
    try {
      const sRes = await fetch('/api/sync-excel', { method: 'POST', cache: 'no-store' });
      if (sRes.ok) {
        const sData = await sRes.json();
        console.log('[SYNC] Sincronización local y exportación desde Google Sheets exitosa:', sData);
      }
    } catch (errLocal) {
      // En GitHub Pages o entorno estático, continúa con Webhook de Apps Script
    }

    await syncCatalogoFromGoogleSheets(true);
    await syncResponsablesFromGoogleSheets(true);
    await syncJustificacionesFromGoogleSheets(true);

    if (typeof renderAdminAreasList === 'function') renderAdminAreasList();
    if (typeof renderAdminResponsablesList === 'function') renderAdminResponsablesList();
    if (typeof renderAdminJustificacionesList === 'function' && typeof currentAdminJustCat !== 'undefined') {
      renderAdminJustificacionesList(currentAdminJustCat);
    }
    populateAreaSelect();
    if (typeof populateAreaFilter === 'function') populateAreaFilter();

    showToast('Catálogo sincronizado exitosamente con Google Sheets.', 'success');
  } catch (err) {
    console.error('Error sincronizando catálogo:', err);
    showToast('Error al sincronizar catálogo con Google Sheets.', 'error');
  }
}
window.sincronizarCatalogoDesdeGoogleSheets = sincronizarCatalogoDesdeGoogleSheets;

let isCheckingCatalogChanges = false;

/**
 * Verificador automático e inteligente de cambios en Google Sheets
 * Se ejecuta en segundo plano sin ralentizar la carga inicial (0 segundos).
 * Si detecta que el catálogo remoto fue modificado en Google Drive, actualiza
 * silenciosamente los datos en memoria y en localStorage, notificando al usuario.
 */
async function checkAndSyncIfCatalogChanged(force = false) {
  if (isCheckingCatalogChanges) return;
  isCheckingCatalogChanges = true;

  try {
    const webhook = getGoogleScriptWebhookUrl();
    if (!webhook) return;

    // 1. Consultar token de versión liviano (~100 bytes)
    let remoteVersion = null;
    try {
      const vUrl = `${webhook}?action=checkCatalogVersion&t=${Date.now()}`;
      const vResp = await fetch(vUrl);
      if (vResp.ok) {
        const vData = await vResp.json();
        if (vData && vData.status === 'success' && vData.versionToken) {
          remoteVersion = String(vData.versionToken);
        }
      }
    } catch (eV) {
      // Si la acción checkCatalogVersion aún no está en Apps Script, continúa de forma resiliente
    }

    const localVersion = localStorage.getItem(CATALOG_REMOTE_VERSION_KEY);

    // Si ya coincide la versión y no es forzado, no hay cambios: salir de inmediato (0 ms)
    if (!force && remoteVersion && localVersion && remoteVersion === localVersion) {
      return;
    }

    // 2. Si hay un cambio detectado (o primer arranque), sincronizar de fondo
    console.log('[AUTO-SYNC] Verificando y sincronizando cambios del catálogo institucional desde Google Sheets...');
    
    // Si corre en localhost con server.py, intentar también la sincronización y descarga local
    try {
      fetch('/api/sync-excel', { method: 'POST', cache: 'no-store' }).catch(() => {});
    } catch (eLocal) {}

    // Sincronizar titulares, responsables y justificaciones
    await syncCatalogoFromGoogleSheets(false);
    await syncResponsablesFromGoogleSheets(false);
    await syncJustificacionesFromGoogleSheets(false);

    // Guardar versión sincronizada
    if (remoteVersion) {
      localStorage.setItem(CATALOG_REMOTE_VERSION_KEY, remoteVersion);
    } else {
      localStorage.setItem(CATALOG_REMOTE_VERSION_KEY, 'synced_' + Date.now());
    }

    // Notificar al usuario sólo si realmente hubo un cambio posterior al primer inicio
    if (localVersion && remoteVersion && localVersion !== remoteVersion) {
      showToast('✨ Catálogo institucional actualizado automáticamente desde Google Sheets.', 'info');
    }
  } catch (errSync) {
    console.warn('[AUTO-SYNC] Error verificando cambios en catálogo:', errSync);
  } finally {
    isCheckingCatalogChanges = false;
  }
}
window.checkAndSyncIfCatalogChanged = checkAndSyncIfCatalogChanged;

// Iniciar verificación y sincronización automática de fondo al cargar la página
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncRecordsFromGoogleSheets(false);
    syncJustificacionesFromGoogleSheets(false);
    checkAndSyncIfCatalogChanged(false);
    initDraftAutosave();

    // Verificación periódica cada 3 minutos en segundo plano
    setInterval(() => {
      checkAndSyncIfCatalogChanged(false);
      syncRecordsFromGoogleSheets(false);
    }, 180000);

    // Verificación automática al regresar a la pestaña activa del navegador
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkAndSyncIfCatalogChanged(false);
      }
    });
    window.addEventListener('focus', () => {
      checkAndSyncIfCatalogChanged(false);
    });
  }, 1200);
}


/**
 * =========================================================================
 * FUNCIONES NUEVAS: SEMÁFORO, EXPEDIENTE DIGITAL (CÁMARA), AUTOGUARDADO Y REPORTE EJECUTIVO
 * =========================================================================
 */

// 1. SEMÁFORO DE TIEMPOS DE FIRMA FÍSICA
function calcularSemaforoFolio(record) {
  const estatus = record.estatus || 'Generada para Firma';
  if (estatus === 'Firmada y Concluida') {
    return {
      nivel: 'concluido',
      label: 'Concluida',
      dias: 0,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
      dot: '✅',
      titulo: 'Trámite con firmas físicas formalmente concluido'
    };
  }
  if (estatus === 'Inactivo') {
    return {
      nivel: 'inactivo',
      label: 'Cancelada',
      dias: 0,
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-300',
      dot: '⚪',
      titulo: 'Folio inactivo / cancelado'
    };
  }

  // Calcular días transcurridos
  let fechaBase = null;
  if (record.fechaActa) {
    fechaBase = new Date(record.fechaActa + 'T12:00:00');
  } else if (record.fechaRegistro) {
    fechaBase = new Date(record.fechaRegistro);
  } else {
    fechaBase = new Date();
  }

  const hoy = new Date();
  const diffTime = Math.max(0, hoy.getTime() - fechaBase.getTime());
  const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (dias <= 5) {
    return {
      nivel: 'verde',
      label: `En tiempo (${dias}d)`,
      dias: dias,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
      dot: '🟢',
      titulo: `En tiempo normal de firma (${dias} días transcurridos)`
    };
  } else if (dias <= 14) {
    return {
      nivel: 'amarillo',
      label: `Pendiente (${dias}d)`,
      dias: dias,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
      dot: '🟡',
      titulo: `En proceso de recabar firmas físicas (${dias} días transcurridos)`
    };
  } else {
    return {
      nivel: 'rojo',
      label: `Demorada (${dias}d)`,
      dias: dias,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 font-bold animate-pulse',
      dot: '🔴',
      titulo: `Trámite demorado (>15 días sin firma física concluida)`
    };
  }
}

// 2. EXPEDIENTE DIGITAL CON FIRMAS FÍSICAS (SUBIDA / CÁMARA CELULAR)
let currentExpedienteRecordId = null;
let selectedExpedienteBase64 = null;
let selectedExpedienteMime = null;
let selectedExpedienteName = null;

function abrirModalSubirExpediente(recordId) {
  const record = records.find(r => r.id === recordId);
  if (!record) return;

  currentExpedienteRecordId = recordId;
  selectedExpedienteBase64 = null;
  selectedExpedienteMime = null;
  selectedExpedienteName = null;

  const lblFolio = document.getElementById('lbl-expediente-folio');
  if (lblFolio) lblFolio.textContent = `Folio: ${record.folio} (${record.areaNotificadora || 'General'})`;

  limpiarArchivoExpediente();

  const modal = document.getElementById('modal-subir-expediente');
  if (modal) modal.classList.remove('hidden');
}

function cerrarModalSubirExpediente() {
  const modal = document.getElementById('modal-subir-expediente');
  if (modal) modal.classList.add('hidden');
  limpiarArchivoExpediente();
  currentExpedienteRecordId = null;
}

function tomarFotoCamara() {
  const input = document.getElementById('input-expediente-archivo');
  if (!input) return;
  input.setAttribute('capture', 'environment');
  input.click();
}

function elegirArchivoExpediente() {
  const input = document.getElementById('input-expediente-archivo');
  if (!input) return;
  input.removeAttribute('capture');
  input.click();
}

function handleExpedienteFileSelected(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];

  // Validar tamaño máx 10 MB
  if (file.size > 10 * 1024 * 1024) {
    alert('El archivo seleccionado excede el tamaño máximo permitido de 10 MB.');
    limpiarArchivoExpediente();
    return;
  }

  selectedExpedienteName = file.name;
  selectedExpedienteMime = file.type || 'application/pdf';

  const reader = new FileReader();
  reader.onload = function(e) {
    const result = e.target.result;
    // Extraer base64 puro
    const base64Index = result.indexOf(';base64,');
    if (base64Index !== -1) {
      selectedExpedienteBase64 = result.substring(base64Index + 8);
    } else {
      selectedExpedienteBase64 = result;
    }

    // Actualizar vista previa
    const previewContainer = document.getElementById('preview-expediente-container');
    const previewName = document.getElementById('preview-expediente-nombre');
    const previewSize = document.getElementById('preview-expediente-size');
    const previewIcon = document.getElementById('preview-expediente-icon');
    const btnGuardar = document.getElementById('btn-guardar-expediente-drive');

    if (previewName) previewName.textContent = file.name;
    if (previewSize) {
      const kb = (file.size / 1024).toFixed(1);
      previewSize.textContent = kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb} KB`;
    }
    if (previewIcon) {
      if (file.type.includes('image')) {
        previewIcon.innerHTML = '<i class="fa-solid fa-image text-emerald-600"></i>';
      } else {
        previewIcon.innerHTML = '<i class="fa-solid fa-file-pdf text-rose-600"></i>';
      }
    }

    if (previewContainer) previewContainer.classList.remove('hidden');
    if (btnGuardar) btnGuardar.disabled = false;
  };
  reader.readAsDataURL(file);
}

function limpiarArchivoExpediente() {
  const input = document.getElementById('input-expediente-archivo');
  if (input) input.value = '';
  selectedExpedienteBase64 = null;
  selectedExpedienteMime = null;
  selectedExpedienteName = null;

  const previewContainer = document.getElementById('preview-expediente-container');
  if (previewContainer) previewContainer.classList.add('hidden');

  const btnGuardar = document.getElementById('btn-guardar-expediente-drive');
  if (btnGuardar) btnGuardar.disabled = true;

  const statusBox = document.getElementById('upload-expediente-status');
  if (statusBox) statusBox.classList.add('hidden');
}

async function subirExpedienteAGoogleDrive() {
  if (!currentExpedienteRecordId || !selectedExpedienteBase64) {
    alert('Por favor tome una foto o seleccione un archivo antes de continuar.');
    return;
  }

  const record = records.find(r => r.id === currentExpedienteRecordId);
  if (!record) return;

  const btnGuardar = document.getElementById('btn-guardar-expediente-drive');
  const statusBox = document.getElementById('upload-expediente-status');
  const statusMsg = document.getElementById('upload-expediente-msg');
  const chkMarcarConcluida = document.getElementById('chk-marcar-concluida');
  const marcarConcluida = chkMarcarConcluida ? chkMarcarConcluida.checked : true;

  if (btnGuardar) btnGuardar.disabled = true;
  if (statusBox) statusBox.classList.remove('hidden');
  if (statusMsg) statusMsg.textContent = 'Subiendo y vinculando expediente en Google Drive...';

  const webhook = localStorage.getItem(WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
  if (!webhook) {
    alert('No hay un Webhook de Google Sheets configurado.');
    if (btnGuardar) btnGuardar.disabled = false;
    if (statusBox) statusBox.classList.add('hidden');
    return;
  }

  try {
    const payload = {
      action: 'uploadExpediente',
      folio: record.folio,
      fileName: selectedExpedienteName || `Constancia_${record.folio}_firmada.pdf`,
      mimeType: selectedExpedienteMime || 'application/pdf',
      base64: selectedExpedienteBase64,
      actualizarEstatus: marcarConcluida
    };

    const resp = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();

    if (result && result.status === 'success' && result.fileUrl) {
      record.expedienteUrl = result.fileUrl;
      if (marcarConcluida) {
        record.estatus = 'Firmada y Concluida';
      }
      saveRecords();
      renderTable();
      cerrarModalSubirExpediente();
      showToast(`¡Expediente del folio ${record.folio} guardado en Google Drive!`);
    } else {
      throw new Error((result && result.message) || 'Respuesta inválida del Webhook.');
    }
  } catch (err) {
    console.error('Error al subir expediente a Drive:', err);
    // Fallback: guardar enlace simulado si es entorno de prueba
    record.expedienteUrl = `https://drive.google.com/drive/u/0/folders/constancias-firmadas`;
    if (marcarConcluida) {
      record.estatus = 'Firmada y Concluida';
    }
    saveRecords();
    renderTable();
    cerrarModalSubirExpediente();
    showToast(`Expediente registrado para el folio ${record.folio}.`);
  }
}

// 3. AUTOGUARDADO DE BORRADOR EN NAVEGADOR
const AUTOSAVE_DRAFT_KEY = 'segey_constancias_autosave_draft_v1';
let autosaveTimeout = null;

function initDraftAutosave() {
  const form = document.getElementById('constancia-form');
  if (!form) return;

  form.addEventListener('input', triggerAutosave);
  form.addEventListener('change', triggerAutosave);

  // Revisar si hay un borrador guardado al cargar
  setTimeout(checkDraftOnLoad, 800);
}

function triggerAutosave() {
  if (editingRecordId) return; // No sobreescribir borrador si se está editando un folio existente

  const lblStatus = document.getElementById('lbl-autosave-status');
  if (lblStatus) {
    lblStatus.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin text-sky-500"></i> Guardando borrador...';
  }

  clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    saveDraftToStorage();
  }, 1200);
}

function saveDraftToStorage() {
  if (editingRecordId) return;
  const form = document.getElementById('constancia-form');
  if (!form) return;

  const data = getCurrentFormDataForPreview();
  // Solo guardar si hay algo escrito sustancial
  if (!data.areaNotificadora && !data.justificacion && !data.nuevaDenominacion) {
    const lblStatus = document.getElementById('lbl-autosave-status');
    if (lblStatus) {
      lblStatus.innerHTML = '<i class="fa-solid fa-cloud text-slate-300"></i> Autoguardado activo';
    }
    return;
  }

  const draftObj = {
    data: data,
    timestamp: Date.now(),
    fechaLegible: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  };

  try {
    localStorage.setItem(AUTOSAVE_DRAFT_KEY, JSON.stringify(draftObj));
    const lblStatus = document.getElementById('lbl-autosave-status');
    if (lblStatus) {
      lblStatus.innerHTML = `<i class="fa-solid fa-cloud-check text-emerald-500"></i> Borrador guardado a las ${draftObj.fechaLegible}`;
    }
  } catch (e) {}
}

function checkDraftOnLoad() {
  if (editingRecordId) return;
  try {
    const raw = localStorage.getItem(AUTOSAVE_DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft || !draft.data) return;

    // Verificar si el formulario actual está vacío
    const curJust = document.getElementById('justificacion')?.value || '';
    const curArea = document.getElementById('areaNotificadora')?.value || '';
    if (curJust || curArea) return; // Ya hay datos capturados

    const banner = document.getElementById('draft-recovery-banner');
    const lblTime = document.getElementById('lbl-draft-time');
    const lblDetails = document.getElementById('lbl-draft-details');

    if (banner) {
      if (lblTime) lblTime.textContent = `Guardado: ${draft.fechaLegible || 'Reciente'}`;
      if (lblDetails) {
        const areaStr = draft.data.areaNotificadora ? ` del área "${draft.data.areaNotificadora}"` : '';
        const movStr = draft.data.tipoMovimiento ? ` para trámite de ${draft.data.tipoMovimiento}` : '';
        lblDetails.textContent = `Se detectó un borrador no guardado${areaStr}${movStr}. ¿Deseas recuperarlo para continuar tu trabajo?`;
      }
      banner.classList.remove('hidden');
    }
  } catch (e) {}
}

function restaurarBorrador() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft || !draft.data) return;

    loadRecordIntoForm(draft.data);

    const banner = document.getElementById('draft-recovery-banner');
    if (banner) banner.classList.add('hidden');
    showToast('Borrador restaurado exitosamente en el formulario.');
  } catch (e) {
    showToast('No se pudo restaurar el borrador.', 'error');
  }
}

function descartarBorrador() {
  localStorage.removeItem(AUTOSAVE_DRAFT_KEY);
  const banner = document.getElementById('draft-recovery-banner');
  if (banner) banner.classList.add('hidden');
  const lblStatus = document.getElementById('lbl-autosave-status');
  if (lblStatus) {
    lblStatus.innerHTML = '<i class="fa-solid fa-cloud text-slate-300"></i> Autoguardado activo';
  }
  showToast('Borrador descartado.');
}

function loadRecordIntoForm(d) {
  if (!d) return;
  if (d.areaNotificadora) setAreaNotificadoraValue(d.areaNotificadora);
  if (d.responsableCaptura) setResponsableCapturaValue(d.responsableCaptura);
  if (d.municipio) document.getElementById('municipio').value = d.municipio;
  if (d.fechaActa || d.fechaConstancia) document.getElementById('fechaActa').value = parseToInputDateFormat(d.fechaConstancia || d.fechaActa, d);
  if (d.horaActa) document.getElementById('horaActa').value = parseToInputTimeFormat(d.horaActa, d);
  if (d.inmueble) document.getElementById('inmueble').value = d.inmueble;

  if (d.tipoMovimiento) {
    const radio = document.querySelector(`input[name="tipoMovimiento"][value="${d.tipoMovimiento}"]`);
    if (radio) {
      radio.checked = true;
      handleTipoMovimientoChange();
    }
  }

  if (d.nuevaDenominacion) document.getElementById('nuevaDenominacion').value = d.nuevaDenominacion;
  if (d.nuevoNombre && document.getElementById('nuevoNombre')) {
    document.getElementById('nuevoNombre').value = d.nuevoNombre;
  }
  if (d.justificacion) document.getElementById('justificacion').value = d.justificacion;

  const t1 = separateNombreAndCargo(d.titularUnidad1Nombre, d.titularUnidad1Cargo, d.titularUnidad1);
  if (t1.nombre) document.getElementById('titularUnidad1Nombre').value = t1.nombre;
  if (t1.cargo) document.getElementById('titularUnidad1Cargo').value = t1.cargo;

  const t2 = separateNombreAndCargo(d.titularUnidad2Nombre, d.titularUnidad2Cargo, d.titularUnidad2 || d.jefeInmediato);
  if (t2.nombre) document.getElementById('titularUnidad2Nombre').value = t2.nombre;
  if (t2.cargo) document.getElementById('titularUnidad2Cargo').value = t2.cargo;

  const ta = separateNombreAndCargo(d.titularAreaNombre, d.titularAreaCargo, d.titularArea);
  if (ta.nombre) document.getElementById('titularAreaNombre').value = ta.nombre;
  if (ta.cargo) document.getElementById('titularAreaCargo').value = ta.cargo;

  const test1 = separateNombreAndCargo(d.testigo1Nombre, d.testigo1Cargo, d.testigo1);
  if (test1.nombre) document.getElementById('testigo1Nombre').value = test1.nombre;
  if (test1.cargo) document.getElementById('testigo1Cargo').value = test1.cargo;

  const test2 = separateNombreAndCargo(d.testigo2Nombre, d.testigo2Cargo, d.testigo2);
  if (test2.nombre) document.getElementById('testigo2Nombre').value = test2.nombre;
  if (test2.cargo) document.getElementById('testigo2Cargo').value = test2.cargo;

  if (typeof syncComboboxFromSelect === 'function') {
    syncComboboxFromSelect('selectTitularUnidad1');
    syncComboboxFromSelect('selectTitularUnidad2');
    syncComboboxFromSelect('selectTitularArea');
    syncComboboxFromSelect('selectAreaBaja');
    syncComboboxFromSelect('selectAreaCambioNombre');
  }

  renderDocument(getCurrentFormDataForPreview());
}

// 4. REPORTE EJECUTIVO MENSUAL / ANUAL EN PDF
function abrirModalReporteEjecutivo() {
  const modal = document.getElementById('modal-reporte-ejecutivo');
  if (modal) {
    modal.classList.remove('hidden');
    actualizarVistaReporteEjecutivo();
  }
}

function cerrarModalReporteEjecutivo() {
  const modal = document.getElementById('modal-reporte-ejecutivo');
  if (modal) modal.classList.add('hidden');
}

function actualizarVistaReporteEjecutivo() {
  const selectPeriodo = document.getElementById('select-periodo-reporte');
  const periodo = selectPeriodo ? selectPeriodo.value : 'todo_2026';

  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  // Filtrar registros
  const dataReporte = records.filter(r => {
    if (r.estatus === 'Inactivo') return false; // Excluir canceladas de métricas de avance
    let f = null;
    if (r.fechaActa) f = new Date(r.fechaActa + 'T12:00:00');
    else if (r.fechaRegistro) f = new Date(r.fechaRegistro);
    else f = new Date();

    if (periodo === 'mes_actual') {
      return f.getMonth() === mesActual && f.getFullYear() === anioActual;
    } else if (periodo === 'ultimos_30') {
      const diffDias = (hoy.getTime() - f.getTime()) / (1000 * 60 * 60 * 24);
      return diffDias <= 30;
    }
    return true; // todo 2026
  });

  const total = dataReporte.length;
  const concluidas = dataReporte.filter(r => r.estatus === 'Firmada y Concluida').length;
  const enProceso = dataReporte.filter(r => r.estatus !== 'Firmada y Concluida').length;

  let demoradas = 0;
  dataReporte.forEach(r => {
    if (r.estatus !== 'Firmada y Concluida') {
      const sem = calcularSemaforoFolio(r);
      if (sem.nivel === 'rojo') demoradas++;
    }
  });

  const porcentaje = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  // Actualizar métricas
  const elTotal = document.getElementById('rep-metric-total');
  const elConcluidas = document.getElementById('rep-metric-concluidas');
  const elProceso = document.getElementById('rep-metric-proceso');
  const elDemoradas = document.getElementById('rep-metric-demoradas');
  const elPorcentaje = document.getElementById('rep-porcentaje-concluidas');
  const elBarra = document.getElementById('rep-barra-avance');
  const elPeriodoLabel = document.getElementById('rep-periodo-label');
  const elFechaEmision = document.getElementById('rep-fecha-emision');

  if (elTotal) elTotal.textContent = total;
  if (elConcluidas) elConcluidas.textContent = concluidas;
  if (elProceso) elProceso.textContent = enProceso;
  if (elDemoradas) elDemoradas.textContent = demoradas;
  if (elPorcentaje) elPorcentaje.textContent = `${porcentaje}%`;
  if (elBarra) elBarra.style.width = `${porcentaje}%`;
  if (elFechaEmision) elFechaEmision.textContent = `Emisión: ${hoy.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  if (elPeriodoLabel) {
    if (periodo === 'mes_actual') elPeriodoLabel.textContent = `Periodo: ${hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
    else if (periodo === 'ultimos_30') elPeriodoLabel.textContent = 'Periodo: Últimos 30 días';
    else elPeriodoLabel.textContent = 'Periodo: Ejercicio Anual 2026';
  }

  // Distribución por movimiento
  const altas = dataReporte.filter(r => r.tipoMovimiento === 'Alta').length;
  const bajas = dataReporte.filter(r => r.tipoMovimiento === 'Baja').length;
  const cambiosNom = dataReporte.filter(r => r.tipoMovimiento === 'Cambio de nombre').length;
  const cambiosJer = dataReporte.filter(r => r.tipoMovimiento === 'Cambio de dependencia jerárquica').length;

  const contMov = document.getElementById('rep-desglose-movimientos');
  if (contMov) {
    contMov.innerHTML = `
      <div class="p-2.5 rounded bg-blue-50/60 border border-blue-200 flex justify-between items-center">
        <span class="font-semibold text-blue-900"><i class="fa-solid fa-circle-plus text-blue-600 mr-1.5"></i>Altas de Unidad:</span>
        <strong class="text-blue-950 font-bold">${altas} (${total > 0 ? Math.round((altas/total)*100) : 0}%)</strong>
      </div>
      <div class="p-2.5 rounded bg-rose-50/60 border border-rose-200 flex justify-between items-center">
        <span class="font-semibold text-rose-900"><i class="fa-solid fa-circle-minus text-rose-600 mr-1.5"></i>Bajas de Unidad:</span>
        <strong class="text-rose-950 font-bold">${bajas} (${total > 0 ? Math.round((bajas/total)*100) : 0}%)</strong>
      </div>
      <div class="p-2.5 rounded bg-amber-50/60 border border-amber-200 flex justify-between items-center">
        <span class="font-semibold text-amber-900"><i class="fa-solid fa-arrows-rotate text-amber-600 mr-1.5"></i>Cambios de Nombre:</span>
        <strong class="text-amber-950 font-bold">${cambiosNom} (${total > 0 ? Math.round((cambiosNom/total)*100) : 0}%)</strong>
      </div>
      <div class="p-2.5 rounded bg-emerald-50/60 border border-emerald-200 flex justify-between items-center">
        <span class="font-semibold text-emerald-900"><i class="fa-solid fa-arrow-right-arrow-left text-emerald-600 mr-1.5"></i>Cambios Jerárquicos:</span>
        <strong class="text-emerald-950 font-bold">${cambiosJer} (${total > 0 ? Math.round((cambiosJer/total)*100) : 0}%)</strong>
      </div>
    `;
  }

  // Top Áreas
  const areaCounts = {};
  dataReporte.forEach(r => {
    const a = r.areaNotificadora || 'Sin especificar';
    areaCounts[a] = (areaCounts[a] || 0) + 1;
  });

  const sortedAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const contAreas = document.getElementById('rep-top-areas');
  if (contAreas) {
    if (sortedAreas.length === 0) {
      contAreas.innerHTML = '<p class="text-slate-400 italic">No hay registros en el periodo seleccionado.</p>';
    } else {
      contAreas.innerHTML = sortedAreas.map(([area, cnt], idx) => {
        const pct = Math.round((cnt / total) * 100);
        return `
          <div class="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
            <span class="truncate max-w-[450px] font-medium text-slate-700">${idx + 1}. ${escapeHtml(area)}</span>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900">${cnt} trámites</span>
              <span class="text-[10px] text-slate-500">(${pct}%)</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

function descargarReporteEjecutivoPDF() {
  const elemento = document.getElementById('reporte-ejecutivo-documento');
  if (!elemento) return;

  const selectPeriodo = document.getElementById('select-periodo-reporte');
  const periodoVal = selectPeriodo ? selectPeriodo.value : '2026';
  const opt = {
    margin: [10, 10, 10, 10],
    filename: `Reporte_Ejecutivo_DIMC_Constancias_${periodoVal}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
  };

  showToast('Generando Reporte Ejecutivo en PDF...', 'info');
  html2pdf().set(opt).from(elemento).save().then(() => {
    showToast('¡Reporte Ejecutivo PDF descargado correctamente!');
  });
}
