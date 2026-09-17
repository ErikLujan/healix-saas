# Healix — Plataforma de Gestión Médica Integral

> SaaS B2B para la operación diaria de centros de salud: agenda automatizada, historias clínicas dinámicas y control de acceso estricto por rol, todo en tiempo real.

![Angular 19](https://img.shields.io/badge/Angular-19-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

---

## Resumen

**Healix** es una plataforma SaaS de gestión médica que digitaliza el ciclo completo de atención de una clínica: captación del paciente desde la landing pública, reserva de turnos con disponibilidad en tiempo real, atención del especialista con historia clínica electrónica y auditoría administrativa con reportes exportables.

El producto está diseñado con una arquitectura frontend modular y un modelo Backend-as-a-Service, lo que permite desplegar rápidamente, escalar por dominios funcionales y mantener costos operativos predecibles.

**Propuesta de valor:**

- **Control de acceso basado en roles (RBAC):** Administrador, Especialista y Paciente, con permisos aplicados tanto en la interfaz como a nivel de base de datos.
- **Agenda automatizada:** generación de bloques de atención de 30 minutos, verificación de conflictos y liberación automática de horarios.
- **Historia clínica electrónica flexible:** signos vitales estructurados más datos clínicos dinámicos por especialidad (persistencia JSONB).
- **Reportes ejecutivos:** tableros analíticos con exportación a PDF y Excel.

---

## Showcase visual

### Landing page de Healix
<img width="1920" height="1080" alt="01-landing" src="https://github.com/user-attachments/assets/7dcc7cf7-48b4-40a8-835b-c1efc7358dce" />

| Panel de administración | Agenda del especialista |
|---|---|
| Panel de administración de Healix <img width="948" height="439" alt="01-panel-principal" src="https://github.com/user-attachments/assets/add8c6d0-9d5a-4437-a16a-40073f8c404a" />
| Agenda del especialista en Healix <img width="1920" height="1080" alt="05-disponibilidad" src="https://github.com/user-attachments/assets/31e7be1e-7203-4b06-adf1-5af17bec716d" /> |

### Historial clínico del paciente en Healix <img width="947" height="439" alt="04-historial-clinico" src="https://github.com/user-attachments/assets/60ade99c-3344-4487-ab92-81662ff9037f" />


---

## Características principales

- **RBAC estricto (Administrador, Especialista, Paciente):** guards funcionales de ruta, directiva estructural de acceso por rol y políticas de Row Level Security (RLS) en PostgreSQL. La interfaz solo ofrece acciones válidas; la base de datos deniega todo lo demás.
- **Historias clínicas dinámicas:** modelo híbrido con columnas tipadas para signos vitales (altura, peso, temperatura, presión arterial) y columna JSONB para indicadores específicos de cada especialidad, sin migraciones de esquema.
- **Agenda automatizada:** motor de generación de slots de 30 minutos con restricciones horarias por día, verificación de disponibilidad previa a la reserva y transiciones de estado auditadas (`pendiente → confirmado → finalizado`, con `rechazado` y `cancelado` como estados terminales).
- **Reportes en PDF y Excel:** exportación de historias clínicas y de tableros analíticos (turnos por especialidad, por día y por médico, más bitácora de accesos) con jsPDF y SheetJS.
- **UI reactiva con Angular Signals:** estado local con `signal()`, derivaciones con `computed()` y encapsulamiento con `asReadonly()`; componentes standalone, control flow nativo (`@if`, `@for`, `@switch`) y rutas lazy-loaded.
- **Seguridad por capas:** autenticación centralizada con Supabase Auth, RLS por propietario del recurso, validación humana con captcha nativo en el registro, y aislamiento total de credenciales: el frontend solo consume la clave pública `anon` vía configuración de entorno.
- **Diseño responsive y accesible:** Tailwind CSS v4 con design tokens, iconografía Lucide, skeleton loading en secciones dinámicas y navegación completa por teclado.

---

## Arquitectura y stack tecnológico

### Frontend

| Tecnología | Uso |
|---|---|
| Angular 19 (standalone, strict mode) | Framework SPA, componentes sin NgModules |
| Angular Signals + `computed()` | Estado reactivo y derivaciones en memoria |
| Angular Router (lazy loading) | Carga diferida por dominio funcional |
| Reactive Forms tipados | Registro multiperfil y formularios clínicos |
| Tailwind CSS v4 + SCSS aislado | Utilidades + estilos específicos por componente |
| Lucide Angular | Sistema único de iconografía |
| Chart.js + ng2-charts | Tableros analíticos interactivos |
| jsPDF + SheetJS (`xlsx`) | Exportación de reportes PDF/Excel |
| ngx-sonner | Notificaciones semánticas |

### Backend-as-a-Service (Supabase)

| Servicio | Uso |
|---|---|
| Supabase Auth | Identidad centralizada, sesiones y metadatos por rol |
| Supabase PostgreSQL | Persistencia relacional con triggers de sincronización de perfiles |
| Row Level Security (RLS) | Autorización a nivel de fila por propietario y rol |
| Supabase Storage | Avatares y documentos (`avatars/{UUID}/...`) |

### Calidad y pruebas

| Práctica | Detalle |
|---|---|
| TypeScript en modo estricto | Prohibido `any`; tipos de dominio explícitos |
| Suite E2E con Playwright | Cobertura de flujos críticos: autenticación, solicitud de turnos y reportes |
| Filtrado in-memory reactivo | Búsqueda instantánea (< 1 ms) sin round-trips innecesarios |
| Paginación compartida | Componente genérico reutilizado en turnos y administración |

### Estructura del proyecto

```text
src/app/
├── core/          # Servicios singleton, guards, modelos y animaciones globales
├── features/      # Dominios de negocio lazy-loaded (turnos, historias, administración, ...)
├── shared/        # Componentes, pipes y directivas reutilizables
└── layouts/       # Shells de navegación (dashboard, autenticación)
```

---

## Instalación local

### Requisitos previos

- Node.js 20+ y npm 10+
- Una cuenta y un proyecto en [Supabase](https://supabase.com)

### 1. Clonar e instalar dependencias

```bash
git clone <URL_DEL_REPOSITORIO>
cd healix
npm install
```

### 2. Configurar variables de entorno

Crear el archivo `src/environments/environment.ts` con las credenciales públicas del proyecto Supabase (solo clave `anon`, nunca la clave de servicio):

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://TU_PROYECTO.supabase.co',
  supabaseKey: 'TU_CLAVE_ANON_PUBLICA',
};
```

### 3. Ejecutar en desarrollo

```bash
ng serve
```

La aplicación queda disponible en `http://localhost:4200`.

### 4. Compilar para producción

```bash
ng build
```

Los artefactos se generan en `dist/` con sustitución automática de entorno productivo.
