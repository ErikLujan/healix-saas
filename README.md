# Clinica Online 2026

Plataforma SaaS de administracion clinica digital, disenada para la gestion integral de pacientes, especialistas y personal administrativo en entornos de salud modernos.

---

## Vision General y Enfoque SaaS

Clinica Online 2026 es un sistema de administracion clinica construido sobre una arquitectura frontend modular y escalable. La plataforma resuelve la operacion diaria de centros medicos mediante un modelo multiperfil que segmenta funcionalidades por rol: pacientes, especialistas y administradores.

El sistema opera sobre un modelo de identidad centralizado donde Supabase Auth actua como proveedor de autenticacion unico, mientras que las tablas de extension en PostgreSQL almacenan los atributos especificos de cada perfil. Esta separacion permite escalar dominios funcionales de forma independiente sin comprometer la integridad referencial.

---

## Stack Tecnologico Core

| Capa | Tecnologia | Version |
|------|------------|---------|
| Framework | Angular (Standalone Components) | 19.x |
| Estado Reactivo | Angular Signals + Computed | Nativo |
| Control Flow | New Control Flow (@if, @for, @switch) | Nativo |
| Estilos | Tailwind CSS | 4.x |
| Backend即服务 | Supabase (Auth, Database, Storage, Realtime) | 2.109+ |
| Iconografia | Lucide Angular | 1.23+ |
| Notificaciones | ngx-sonner | 3.1+ |
| Lenguaje | TypeScript (strict mode) | 5.7+ |

---

## Arquitectura Frontend

La aplicacion sigue un patron de desacoplamiento por dominios funcionales, donde cada capa tiene responsabilidades exclusivas y comunicacion unidireccional.

```
src/app/
  core/          -- Servicios singleton, guards, interceptores, modelos y animaciones globales
  features/      -- Modulos de negocio lazy-loaded (administration, authentication, landing, etc.)
  shared/        -- Componentes, directivas, pipes y modelos reutilizables
  layouts/       -- Layouts shell (auth-layout, dashboard-layout)
```

### Path Aliases

El proyecto configura aliases de importacion en `tsconfig.json` para eliminar dependencias circulares y mejorar la legibilidad:

- `@core/*` -> `src/app/core/*`
- `@shared/*` -> `src/app/shared/*`
- `@layouts/*` -> `src/app/layouts/*`
- `@features/*` -> `src/app/features/*`
- `@env/*` -> `src/environments/*`

### Convenciones de Componentes

- Cada componente utiliza `templateUrl` y `styleUrl` con archivos externos (.html, .scss).
- Los componentes son Standalone (sin NgModule).
- El control de estado se realiza exclusivamente con Angular Signals.
- Los comentarios inline estan prohibidos; la documentacion utiliza JSDoc en espanol.

---

## Modelo de Identidad y Persistencia (Backend)

Supabase Auth gestiona el ciclo de vida de autenticacion. Al registrarse un usuario, el payload de metadatos (role, full_name, dni, edad) se envia dentro de `options.data` del metodo `signUp()`.

Un trigger de PostgreSQL (`handle_new_user_sync`) se ejecuta de forma sincronica sobre la tabla `auth.users` y popula las tablas de extension:

| Tabla | Campos | Proposito |
|-------|--------|-----------|
| `profiles` | id, email, full_name, avatar_url, role | Perfil base comun a todos los roles |
| `pacientes` | id, dni, edad, obra_social, avatar_url_frontal, avatar_url_secundario | Atributos exclusivos del paciente |
| `especialistas` | id, dni, edad, is_approved | Atributos del especialista + control de aprobacion |
| `administradores` | id, dni, edad | Atributos del administrador |

La subida de imagenes de perfil se gestiona mediante Supabase Storage con la ruta `avatars/{UUID}/avatar.{ext}`.

---

## Arquitectura de Gestion de Citas y Ciclo de Vida de Turnos

### Evolucion Modular

El modulo de turnos (`features/appointments/`) se organiza en dos dominios claramente separados, accesibles desde la ruta `/turnos`:

```
features/appointments/
├── dashboard/                -- Gestion y auditoria de turnos
│   ├── pages/dashboard-page/ -- Contenedor smart (filtros, busqueda, paginacion)
│   ├── components/turno-card/-- Tarjeta presentacional por turno
│   └── dialogs/              -- Modales de cancelacion, rechazo, resena, calificacion
├── request/                  -- Asistente de solicitud para pacientes
│   ├── pages/request-page/   -- Contenedor del wizard
│   ├── services/             -- WizardTurnoService (estado reactivo del wizard)
│   └── components/           -- 5 pasos: especialidad, especialista, fecha, hora, confirmacion
└── appointments.routes.ts    -- Enrutamiento lazy-loaded
```

Los servicios core (`TurnosService`, `DisponibilidadService`) residen en `core/services/` y son consumidos por ambos dominios sin duplicacion de logica.

### Ciclo de Vida del Turno

El estado de un turno esta definido por el ENUM `turno_estado` en PostgreSQL, representado en TypeScript como:

```typescript
type TurnoEstado = 'pendiente' | 'confirmado' | 'rechazado' | 'cancelado' | 'finalizado';
```

#### Transiciones de Estado por Rol

| Estado Actual | Accion | Rol Autorizado | Estado Resultante | Campo Obligatorio |
|--------------|--------|----------------|-------------------|-------------------|
| `pendiente` | confirmar | especialista | `confirmado` | — |
| `pendiente` | rechazar | especialista | `rechazado` | `comentario_cancelacion_rechazo` |
| `pendiente` | cancelar | paciente | `cancelado` | `comentario_cancelacion_rechazo` |
| `confirmado` | finalizar | especialista | `finalizado` | `resena_diagnostico` |
| `confirmado` | cancelar | paciente o especialista | `cancelado` | `comentario_cancelacion_rechazo` |

Los estados `rechazado`, `cancelado` y `finalizado` son **terminales**: no permiten transiciones posteriores. Todos liberan el bloque horario ocupado, permitiendo que otros pacientes lo reserven.

### Diagrama de Transiciones

```
                    ┌──────────────┐
                    │  Pendiente   │  ← Estado inicial al crear
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌────────────┐  ┌──────────┐  ┌────────────┐
     │ Confirmado │  │Rechazado │  │ Cancelado  │
     └─────┬──────┘  └──────────┘  └────────────┘
           │                         (terminal)
           ▼
     ┌────────────┐
     │ Finalizado │  (terminal)
     └────────────┘
```

---

## Ingenieria de Algoritmos y Optimizacion Reactiva

### Algoritmo de Generacion de Slots (Bloques de 30 Minutos)

El servicio `DisponibilidadService.generarSlotsDeAtencion()` fragmenta intervalos horarios continuos en bloques fijos e inmutables:

```
Entrada:  hora_inicio = "08:00", hora_fin = "12:00"
Salida:   ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
```

**Algoritmo:**

1. Convertir ambas horas a minutos desde medianoche (entero).
2. Mientras el minuto actual sea menor que el minuto final:
   - Formatear el minuto como `"HH:mm"` y agregarlo al array.
   - Sumar `DURACION_SLOT_MINUTOS` (30) al acumulador.
3. Retornar el array congelado via `Object.freeze()`.

### Restricciones Horarias de la Clinica

| Dia | Rango Permitido |
|-----|----------------|
| Lunes a Viernes | 08:00 - 19:00 |
| Sabado | 08:00 - 14:00 |
| Domingo | No configurable (prohibido) |

Estas restricciones estan definidas en `RESTRICCIONES_HORARIAS` y se validan tanto en la interfaz (edicion de disponibilidad) como en el servicio antes de persistir.

### Integridad Temporal: Columna Unificada `fecha_hora`

Toda la persistencia temporal del sistema opera sobre la columna `fecha_hora` (TIMESTAMPTZ) de la tabla `turnos`. Las busquedas diarias se resuelven mediante operadores de rango PostgREST:

```typescript
// Buscar turnos de un dia especifico
.gte('fecha_hora', '2026-07-01T00:00:00')
.lte('fecha_hora', '2026-07-01T23:59:59')
```

Este enfoque unificado elimino las consultas por columnas duplicadas (`fecha` + `hora`) que generaban inconsistencias temporales.

### Filtrado Multidimensional In-Memory

El `DashboardPageComponent` implementa un buscador que filtra turnos por especialidad, especialista, paciente y estado sin realizar consultas a la red:

```typescript
readonly turnosFiltrados = computed(() => {
  let turnos = this._turnos();
  const query = this.searchQuery().toLowerCase().trim();
  const estado = this.filtroEstado();

  if (estado) {
    turnos = turnos.filter(t => t.estado === estado);
  }

  if (!query) return turnos;

  return turnos.filter(t => {
    const especialidad = t.especialidad?.name?.toLowerCase() ?? '';
    const especialista = t.especialista?.full_name?.toLowerCase() ?? '';
    const paciente = t.paciente?.full_name?.toLowerCase() ?? '';
    return especialidad.includes(query)
      || especialista.includes(query)
      || paciente.includes(query);
  });
});
```

**Por que no se consulta Supabase en cada tecla:**

- **Latencia:** Cada consulta PostgREST implica round-trip de red (50-200ms).
- **Carga innecesaria:** Los turnos ya estan cargados en memoria al acceder al dashboard.
- **Experiencia:** El filtrado instantaneo (< 1ms) produce una interfaz mucho mas fluida.
- **Economia:** Se evitan llamadas a la API que consumen cuota de Supabase.

---

## Componentes Standalone Compartidos de Alta Densidad

### Componente de Paginacion Reactiva (`PaginationComponent`)

Componente generico de paginacion reutilizable en `shared/components/pagination/`. Opera enteramente en memoria sobre colecciones ya cargadas.

**Contrato del componente:**

```typescript
@Component({ selector: 'app-pagination', standalone: true })
export class PaginationComponent {
  readonly currentPage = input<number>(1);
  readonly totalItems = input<number>(0);
  readonly pageSize = input<number>(4);
  readonly pageChange = output<number>();

  readonly totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  readonly pageNumbers = computed(() => { /* array de 1..N */ });
  readonly isFirstPage = computed(() => this.currentPage() <= 1);
  readonly isLastPage = computed(() => this.currentPage() >= this.totalPages());
}
```

**Integracion en el dashboard de turnos:** Maximo 4 tarjetas por pagina. La signal `currentPage` se resetea automaticamente al cambiar filtros o busqueda.

```typescript
readonly turnosPaginados = computed(() => {
  const inicio = (this.currentPage() - 1) * PAGE_SIZE;
  const fin = inicio + PAGE_SIZE;
  return this.turnosFiltrados().slice(inicio, fin);
});
```

**Integracion en el panel de administracion:** Tabla de usuarios con 5 registros por pagina, reutilizando el mismo componente compartido.

### Componente Captcha Avanzado (`CaptchaComponent`)

Componente nativo de validacion humana en `shared/components/captcha/`, sin dependencias externas.

| Modo | Generacion | Validacion |
|------|-----------|------------|
| **Matematico** | Suma de dos operandos (1-20) | Comparacion numerica |
| **Alfanumerico** | 6 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin grafias ambiguas: I, O, 0, 1) | Comparacion case-insensitive |

**Distorsion visual (modo alfanumerico):** Rotacion aleatoria (-8 a +8 grados), desplazamiento X/Y irregular, tamano de fuente variable (18-26px) y lineas de interferencia CSS via pseudo-elementos.

**Accesibilidad:** `role="group"` con `aria-label` descriptivo, `role="alert"` en mensajes de error, navegacion completa via teclado.

### Componente de Carga de Archivos (`FileUploadComponent`)

Componente de arrastre y seleccion de imagenes en `shared/components/file-upload/`. Soporta drag-and-drop, validacion de tipo (PNG, JPG) y limite de tamano (5MB). Emite el `File` seleccionado para que el componente consumidor gestione la subida a Supabase Storage.

---

## Modulo "Mi Perfil" y Manejo de Imagenes

### Estructura Multiperfil

La pagina de perfil (`features/profile/pages/profile-page/`) es accesible desde el dropdown interactivo del Header y se carga bajo la ruta `/perfil`.

El componente detecta el rol del usuario y carga los datos extendidos desde la tabla hija correspondiente:

```typescript
private get tablaRol(): string {
  const rol = this.rol();
  if (rol === 'paciente') return 'pacientes';
  if (rol === 'especialista') return 'especialistas';
  return 'administradores';
}
```

### Pestanas por Rol

| Pestana | Visibilidad | Contenido |
|---------|-------------|-----------|
| Informacion Personal | Todos los roles | Datos del perfil, avatar, DNI, edad |
| Mis Horarios | Solo especialista | Formulario de disponibilidad reutilizado del modulo `availability/` |

### Pipeline de Subida de Avatares

1. El usuario selecciona una imagen via `FileUploadComponent`.
2. Se genera un `previewUrl` local para retroalimentacion inmediata.
3. Al confirmar, se sube a Supabase Storage en `avatars/{userId}/avatar.{ext}` con `upsert: true`.
4. Se obtiene la URL publica definitiva via `getPublicUrl()`.
5. Se actualiza la columna `avatar_url` en `public.profiles`.
6. Se actualiza el `userProfileSignal` en `AuthService` para reflejar el cambio en el Header en caliente.

### Reutilizacion de Interfaz (DRY)

La pestana "Mis Horarios" inyecta directamente los componentes `AvailabilityFormComponent` y `SlotsPreviewComponent` del modulo `specialist/availability/`, evitando duplicacion de codigo. El componente carga la disponibilidad existente y la adapta al formato de configuracion del formulario.

---

## Bitacora Tecnica de Hotfixes de Integridad Relacional

### 1. Bug de Registro de Especialistas: `.insert()` → `.update()`

**Problema:** Al registrar un especialista, el componente intentaba insertar en `public.especialistas` con `.insert()`. Sin embargo, el trigger `handle_new_user_sync` de Supabase ya crea la fila automaticamente al ejecutar `signUp()`, provocando un error de duplicidad de clave primaria.

**Solucion:** Cambiar `.insert({ id, dni, edad })` por `.update({ dni, edad }).eq('id', userId)`. La fila ya existe; solo se actualizan los campos faltantes.

```typescript
// Antes (rompia):
await this.supabase.supabase
  .from('especialistas')
  .insert({ id: userId, dni, edad: Number(edad) });

// Despues (funciona):
await this.supabase.supabase
  .from('especialistas')
  .update({ dni, edad: Number(edad) })
  .eq('id', userId);
```

### 2. Bug de Sincronizacion JWT post-signUp

**Problema:** Despues de `signUp()`, si la confirmacion de email esta habilitada, la sesion es `null` y RLS bloquea las escrituras en tablas secundarias con error 403.

**Solucion:** Verificar `getSession()` imperativamente despues del registro. Si la sesion es `null`, informar al usuario que verifique su correo y redirigir al login. Si existe sesion, esperar 300ms para que el JWT se propague antes de las inserciones en `especialista_especialidad`.

### 3. Bug de Nombre de Tabla: `disponibilidad` → `disponibilidad_especialista`

**Problema:** El servicio y los componentes del wizard apuntaban a `.from('disponibilidad')`, pero la tabla fisica se llama `disponibilidad_especialista`, generando errores 404.

**Solucion:** Reemplazar todas las ocurrencias del string `'disponibilidad'` por `'disponibilidad_especialista'` en el servicio, los componentes de pasos del wizard y la key en `database.types.ts`.

### 4. Bug de Join Roto en Especialidades

**Problema:** La consulta `.select('especialidad_id, specialties(id, name)')` no retornaba datos porque las relaciones foraneas estan vacias en el esquema de tipos de Supabase.

**Solucion:** Reemplazar el join por dos consultas secuenciales: primero obtener los IDs de `especialista_especialidad`, despues consultar `specialties` con `.in('id', ids)`.

### 5. Bug de Falsa Consulta en Recarga de Pagina (406)

**Problema:** `onAuthStateChange` disparaba `loadUserProfile()` con el evento `INITIAL_SESSION` en recargas de pagina, usando tokens potencialmente obsoletos.

**Solucion:** Ignorar el evento `INITIAL_SESSION` y solo cargar el perfil en eventos `SIGNED_IN` o `TOKEN_REFRESHED`.

### 6. Bug de Logica de Rechazo: `'cancelado'` en vez de `'rechazado'`

**Problema:** Ambas acciones (cancelar y rechazar) abrian el mismo dialogo de comentario cuyo handler unico invocaba `cancelarTurno()`. El rechazo guardaba `'cancelado'` en la base de datos.

**Solucion:** Introducir signal `accionPendiente` (`'cancelar' | 'rechazar'`). El handler unico consulta la signal y despacha al metodo de servicio correspondiente (`cancelarTurno` o `rechazarTurno`).

---

## Modelo Relacional

### Diagrama de Entidades

```
profiles (1) ──────── (1) pacientes
    │                       │
    │                       │ turnos.paciente_id
    │                       ▼
    │                   turnos
    │                       │
    │                       │ turnos.especialista_id
    │                       ▼
    └─────────────── (1) especialistas
                        │           │
                        │           │ especialista_especialidad (M:N)
                        │           ▼
                        │       specialties
                        │
                        │ disponibilidad_especialista
                        ▼
                  disponibilidad_especialista
```

### Tablas Principales

| Tabla | Responsabilidad |
|-------|----------------|
| `profiles` | Datos base de autenticacion (id, email, nombre, avatar, rol) |
| `pacientes` | Extension de perfil: DNI, edad, obra social, fotos |
| `especialistas` | Extension de perfil: DNI, edad, estado de aprobacion |
| `administradores` | Extension de perfil: DNI, edad |
| `specialties` | Catalogo de especialidades medicas |
| `especialista_especialidad` | Relacion M:N entre especialistas y especialidades |
| `disponibilidad_especialista` | Bloques horarios configurados por el medico |
| `turnos` | Registros de citas medicas con ciclo de vida |

### Principios del Modelo

- **Normalizacion:** Los nombres de especialidades se almacenan una sola vez en `specialties`.
- **Claves foraneas:** Todas las relaciones usan UUID como clave.
- **Sin duplicacion:** La informacion de un especialista no se repite en cada turno.
- **Historia:** Los turnos finalizados permanecen para estadisticas y auditoria.

---

## Angular Signals en la Arquitectura

### Patron de Signals en Servicios

Todos los servicios core exponen estado reactivo mediante el patron de signal privada + lectura publica:

```typescript
private readonly _turnos = signal<TurnoConRelaciones[]>([]);
readonly turnos = this._turnos.asReadonly();
```

Esto garantiza inmutabilidad: los componentes solo pueden leer el estado, nunca mutarlo directamente.

### `computed()` para Derivaciones

Las senales derivadas recalculan automaticamente cuando cambian sus dependencias:

```typescript
readonly turnosPaginados = computed(() => {
  const inicio = (this.currentPage() - 1) * PAGE_SIZE;
  const fin = inicio + PAGE_SIZE;
  return this.turnosFiltrados().slice(inicio, fin);
});
```

Esto elimina la necesidad de metodos manuales de filtrado y sincronizacion.

### `asReadonly()` como Barrera de Encapsulamiento

Todos los signals expuestos por servicios usan `asReadonly()` para evitar que los componentes consumidores muten el estado interno. Solo el servicio propietario puede modificar sus signals.

### Inmutabilidad

Toda modificacion de estado sigue un enfoque inmutable:

- **Arrays:** Se reemplazan completamente con `.set()` o `.update()` usando spread operator.
- **Objetos:** Se clonan con spread antes de modificar.
- **Signals:** Se actualizan mediante `.set(nuevoValor)` o `.update(prev => ...)`.
- **Colecciones:** Se usan `.map()`, `.filter()`, `.reduce()` en lugar de `.push()`, `.splice()`.

---

## Seguridad y Control de Accesos

### Angular Functional Guards

El sistema implementa guards funcionales asincronos:

- **authGuard**: Verifica la existencia de sesion activa. Redirige a `/autenticacion` si no hay sesion.
- **roleGuard**: Valida que el rol del usuario coincida con la ruta solicitada.
- **specialistApprovalGuard**: Bloquea especialistas no aprobados redirigiendo a `/aprobacion-pendiente`.
- **sessionReady**: Promesa que se resuelve en el `finally` del metodo `initializeSession()`, garantizando que los guards no evaluen estado incompleto tras recarga de pagina.

### Row Level Security (RLS)

Supabase aplica politicas RLS a nivel de base de datos:

- Los pacientes solo pueden leer/escriturar sus propios registros.
- Los especialistas solo acceden a turnos asignados.
- Los administradores tienen acceso completo a la tabla `profiles` y pueden gestionar usuarios.

### Distribucion de Validacion

| Nivel | Responsabilidad |
|-------|----------------|
| **Frontend** | UX: ofrecer solo acciones validas, deshabilitar botones, mostrar errores |
| **Backend (RLS)** | Seguridad: denegar operaciones no autorizadas |
| **Backend (DB)** | Integridad: claves foraneas, constraints, uniques |

Ambos niveles trabajan de forma complementaria. El Frontend mejora la experiencia; el Backend garantiza la integridad.

### Aislamiento de Sesion en Creacion de Usuarios

El panel de administracion utiliza un cliente Supabase aislado (`tempClient`) con `persistSession: false` para crear usuarios sin afectar la sesion del administrador activo. Los metadatos de extension (dni, edad) se persisten mediante `.update()` sobre la tabla correspondiente.

---

## Diagrama Tecnico del Flujo de Registro

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Angular (Frontend)
    participant A as Supabase Auth
    participant DB as PostgreSQL
    participant T as Trigger
    participant S as Supabase Storage

    U->>UI: Completa formulario + captcha
    UI->>A: signUp(email, password, metadata)
    A->>DB: INSERT INTO auth.users
    A-->>UI: { user: { id, email } }
    DB->>T: Ejecuta handle_new_user_sync()
    T->>DB: INSERT INTO profiles (id, role, full_name)
    T->>DB: INSERT INTO pacientes/especialistas (id)

    alt Paciente
        UI->>DB: UPDATE pacientes SET dni, edad, obra_social
        UI->>S: Upload imagen frontal
        UI->>DB: UPDATE pacientes SET avatar_url_frontal
    else Especialista
        UI->>DB: UPDATE especialistas SET dni, edad
        UI->>S: Upload avatar
        UI->>DB: UPDATE profiles SET avatar_url
        UI->>DB: INSERT INTO especialista_especialidad
    else Administrador
        UI->>DB: UPDATE administradores SET dni, edad
        UI->>S: Upload avatar
        UI->>DB: UPDATE profiles SET avatar_url
    end

    UI->>UI: Navega segun rol
```

---

## Diagrama del Flujo de Solicitud de Turnos

```mermaid
sequenceDiagram
    participant P as Paciente
    participant W as Wizard (Frontend)
    participant S as TurnosService
    participant D as DisponibilidadService
    participant DB as Supabase

    P->>W: Paso 1: Selecciona especialidad
    W->>DB: SELECT specialties (activas)
    DB-->>W: Lista de especialidades

    P->>W: Paso 2: Selecciona especialista
    W->>DB: SELECT especialista_especialidad + profiles
    DB-->>W: Especialistas disponibles

    P->>W: Paso 3: Selecciona fecha (prox. 15 dias)
    W->>DB: SELECT turnos (existentes)
    W->>D: Calcular slots ocupados por fecha
    D-->>W: Dias con disponibilidad

    P->>W: Paso 4: Selecciona hora
    W->>D: generarSlotsDeAtencion(inicio, fin)
    D-->>W: Array de slots de 30 min

    P->>W: Paso 5: Confirma resumen
    W->>S: verificarDisponibilidad(esp, fecha, hora)
    S->>DB: SELECT turnos (verificacion final)
    DB-->>S: Sin conflicto
    W->>S: crearTurnoPendiente(payload)
    S->>DB: INSERT INTO turnos
    DB-->>S: Turno creado
```

---

## Modulo de Historias Clinicas

### Modelo de Datos Fisico

La tabla `public.historias_clinicas` almacena el registro clinico generado durante cada atencion medica finalizada. Cada fila corresponde estrictamente a un turno finalizado (cardinalidad 1:1).

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | UUID | Identificador unico del registro |
| `turno_id` | UUID (FK) | Referencia al turno finalizado (unicidad estricta) |
| `paciente_id` | UUID (FK) | Referencia al paciente atendido |
| `especialista_id` | UUID (FK) | Referencia al especialista que realizo la atencion |
| `altura` | NUMERIC | Altura del paciente en centimetros |
| `peso` | NUMERIC | Peso del paciente en kilogramos |
| `temperatura` | NUMERIC | Temperatura corporal en grados Celsius |
| `presion_arterial` | TEXT | Presion arterial (ej: "120/80") |
| `datos_dinamicos` | JSONB | Array de pares clave-valor para informacion adicional |
| `created_at` | TIMESTAMPTZ | Fecha y hora de creacion del registro |

### Integracion con el Ciclo de Vida del Turno

La historia clinica se genera durante la finalizacion de una consulta. El flujo operativo es:

1. El especialista completa el formulario de atencion en el dialogo de finalizacion.
2. Se inserta el registro en `historias_clinicas` con los signos vitales y datos dinamicos.
3. Un trigger de PostgreSQL (`trigger_sync_medical_history`) actualiza automaticamente el estado del turno a `finalizado`.
4. La reseña diagnostica se persiste en la tabla `turnos.resena_diagnostico` (no en historias_clinicas).

Este enfoque garantiza que la insercion exitosa de la historia clinica consolide el alta medica en una unica operacion transaccional.

### Acceso por Roles

| Rol | Acceso |
|-----|--------|
| Paciente | Visualiza exclusivamente su propio historial clinico |
| Especialista | Visualiza historiales de pacientes que ha atendido |
| Administrador | Acceso completo para auditoria |

### Proteccion RLS

Las politicas de Row Level Security en Supabase garantizan que:

- Los pacientes solo pueden consultar historias clinicas donde `paciente_id` coincide con su UUID autenticado.
- Los especialistas solo acceden a historias clinicas donde `especialista_id` coincide con su UUID.
- Los administradores poseen acceso completo para funciones de auditoria.

---

## Modelo de Datos Dinamico (JSONB)

### Enfoque Hibrido: Datos Fijos + Datos Dinamicos

La medicina es una disciplina donde cada especialidad puede requerir informacion clinica diferente. Para abordar esta realidad sin sacrificar la integridad del esquema, la plataforma implementa un modelo hibrido:

**Datos fijos:** Los signos vitales obligatorios (altura, peso, temperatura, presion arterial) se almacenan como columnas tipadas en la tabla. Esto permite consultas SQL directas y agregaciones estadisticas.

**Datos dinamicos:** La columna JSONB `datos_dinamicos` almacena pares clave-valor para informacion especifica de cada consulta. Ejemplos:

```json
[
  { "clave": "colesterol", "valor": "200 mg/dl" },
  { "clave": "frecuencia cardiaca", "valor": "72 bpm" },
  { "clave": "saturacion de oxigeno", "valor": "98%" }
}
```

### Ventajas Arquitectonicas

- **Flexibilidad:** Cada especialidad puede registrar indicadores clinicos sin modificar el esquema de la base de datos.
- **Escalabilidad:** Nuevos tipos de datos clinicos se incorporan como datos, no como codigo.
- **Consistencia:** Los campos obligatorios permanecen estructurados y validados.
- **Limite operativo:** Maximo 3 datos dinamicos por historia clinica (validado en el servicio y en la interfaz).

### Procesamiento en el Frontend

Los componentes recorren dinamicamente el array JSONB para construir la interfaz:

```typescript
@for (dato of record.datos_dinamicos; track dato.clave) {
  <div class="flex items-center justify-between">
    <span>{{ dato.clave }}</span>
    <span>{{ dato.valor }}</span>
  </div>
}
```

Este enfoque permite incorporar nuevos indicadores clinicos sin modificar el codigo existente.

---

## Filtrado Global Avanzado

### Optimizacion Reactiva con Angular Signals

El `DashboardPageComponent` implementa un sistema de filtrado avanzado que opera sobre historias clinicas enriquecidas con datos de turnos, pacientes y especialistas:

```typescript
readonly turnosFiltrados = computed(() => {
  let turnos = this._turnos();
  const query = this.searchQuery().toLowerCase().trim();
  const estado = this.filtroEstado();

  if (estado) {
    turnos = turnos.filter(t => t.estado === estado);
  }

  if (!query) return turnos;

  return turnos.filter(t => {
    const especialidad = t.especialidad?.name?.toLowerCase() ?? '';
    const especialista = t.especialista?.full_name?.toLowerCase() ?? '';
    const paciente = t.paciente?.full_name?.toLowerCase() ?? '';
    return especialidad.includes(query)
      || especialista.includes(query)
      || paciente.includes(query);
  });
});
```

El filtrado se extiende a los campos de la historia clinica (altura, peso, temperatura, presion) y a los datos dinamicos JSONB, permitiendo busquedas cruzadas sin consultas adicionales a la base de datos.

---

## Modulos de Exportacion Local

### PdfExportService

Servicio de exportacion de historias clinicas a formato PDF utilizando jsPDF. Caracteristicas:

- **Logo institucional:** Carga asincrona de `assets/images/icono.png` via fetch y conversion a base64.
- **Membrete:** Nombre de la clinica, titulo del informe, fecha y hora de emision formateada.
- **Datos del titular:** Nombre completo, DNI, email y edad del paciente.
- **Cuerpo de consultas:** Recorrido cronologico con especialista, especialidad, resena clinica, signos vitales y datos dinamicos JSONB.
- **Generacion asincrona:** El servicio retorna una Promise para soportar carga de logo antes de generar el documento.

### ExcelExportService

Servicio de exportacion a formato Excel (XLSX) utilizando la libreria SheetJS. Funcionalidades:

- **Exportacion de historial clinico:** Grilla tabular con todas las columnas clinicas del paciente.
- **Exportacion de usuarios (admin):** Grilla de auditoria con datos de usuario para el panel administrativo.
- **Formato profesional:** Anchos de columna auto-ajustados, encabezados en negrita.

---

## Arquitectura de Navegacion y Lazy Loading

### Estrategia de Carga Diferida

La totalidad de las paginas principales utilizan carga diferida (Lazy Loading). Angular genera archivos JavaScript independientes (chunks) que se descargan unicamente cuando el usuario navega hacia la ruta correspondiente.

### Rutas Localizadas en Espanol

Todas las URLs visibles en el navegador estan localizadas al idioma espanol:

| Ruta | Descripcion |
|------|-------------|
| `/` | Pagina de inicio publica |
| `/autenticacion` | Layout de autenticacion (login/registro) |
| `/autenticacion/registro` | Formulario de registro |
| `/aprobacion-pendiente` | Pendiente de aprobacion (especialistas) |
| `/terminos` | Terminos y condiciones |
| `/privacidad` | Politica de privacidad |
| `/panel-principal` | Panel principal del dashboard |
| `/turnos` | Gestion de turnos |
| `/turnos/solicitar` | Solicitud de turno (pacientes) |
| `/pacientes` | Listado de pacientes |
| `/especialistas` | Gestion de especialistas (admin) |
| `/disponibilidad` | Configuracion de disponibilidad (especialista) |
| `/historial-clinico` | Historial clinico (paciente) |
| `/administracion` | Panel de administracion |
| `/administracion/usuarios` | Gestion de usuarios (admin) |
| `/estadisticas` | Estadisticas y reportes |
| `/perfil` | Mi perfil (todos los roles) |

### Code Splitting

Angular divide automaticamente el codigo durante la compilacion:

- **Bundle inicial:** Framework core, polyfills, estilos y bootstrap de la aplicacion.
- **Chunks lazy:** Cada feature genera su propio chunk independiente que se descarga bajo demanda.
- **Chunks compartidos:** Dependencias de terceros compartidas entre multiples features se optimizan automaticamente.

### Beneficios de la Arquitectura

- **Menor tiempo de carga inicial:** Solo se descarga el codigo estrictamente necesario para la primera pantalla.
- **Mejor escalabilidad:** Nuevas features no incrementan el peso del bundle inicial.
- **Independencia entre dominios:** Cada feature puede evolucionar sin afectar a las demas.
- **Mantenimiento simplificado:** Los cambios se localizan en un solo modulo funcional.
- **Crecimiento controlado:** El proyecto puede incorporar funcionalidades sin degradar el rendimiento.

---

## Organizacion del Codigo

```
src/app/
├── core/                          # Servicios, modelos, guards, animaciones
│   ├── models/                    # Interfaces de dominio y database.types.ts
│   ├── services/                  # AuthService, TurnosService, DisponibilidadService, etc.
│   ├── guards/                    # roleGuard, specialistApprovalGuard
│   └── animations/                # Animaciones de ruta
│
├── shared/                        # Componentes reutilizables
│   └── components/
│       ├── pagination/            # Paginacion reactiva generica
│       ├── captcha/               # Validacion humana (2 modos)
│       ├── file-upload/           # Arrastre y seleccion de imagenes
│       ├── image-cropper/         # Recorte de imagenes
│       ├── page-loader/           # Indicador de carga de pagina
│       └── loading/               # Spinner generico
│
├── layouts/                       # Layouts de navegacion
│   ├── dashboard-layout/          # Sidebar + navbar para area autenticada
│   └── auth-layout/               # Layout para login/registro
│
├── features/                      # Modulos funcionales
│   ├── authentication/            # Login y registro (3 perfiles)
│   ├── appointments/              # Turnos: dashboard + wizard de solicitud
│   │   ├── dashboard/             # Gestion de turnos (Mis Turnos)
│   │   └── request/               # Solicitud de turno (5 pasos)
│   ├── specialist/                # Area del medico
│   │   └── availability/          # Configuracion de disponibilidad
│   ├── profile/                   # Mi Perfil (multiperfil) + historial clinico
│   ├── patients/                  # Area del paciente
│   ├── specialists/               # Gestion de especialistas (admin)
│   ├── administration/            # Panel de administracion de usuarios
│   ├── statistics/                # Estadisticas y reportes
│   ├── medical-history/           # Historia clinica
│   │   ├── components/            # MedicalHistoryListComponent (presentacional)
│   │   ├── pages/medical-record/  # Vista del paciente
│   │   ├── services/              # MedicalRecordsService, PdfExportService, ExcelExportService
│   │   └── models/                # MedicalRecord, MedicalRecordConRelaciones
│   ├── dashboard/                 # Panel principal
│   ├── landing/                   # Pagina de inicio publica
│   ├── approval-pending/          # Pendiente de aprobacion
│   └── legal/                     # Terminos y politicas
│
└── app.routes.ts                  # Enrutamiento principal
```

---

## Estado del Roadmap

| Sprint | Nombre | Estado | Componentes |
|--------|--------|--------|-------------|
| Sprint 0 | Configuracion de Entorno | Completado | Angular 19, Tailwind CSS v4, Supabase SDK, Path Aliases, Estructura de carpetas |
| Sprint 1 | Autenticacion y Sistema Multiperfil | Completado | Landing, Login, Register (3 perfiles), Guards, Dashboard Layout, Admin Users Panel, Toasts semanticos, Realtime |
| Sprint 2 | Gestion de Turnos y Agenda | Completado | Disponibilidad, Wizard de solicitud (5 pasos), Dashboard de turnos, Tarjetas semanticas, Paginacion reactiva, Captcha nativo, Mi Perfil, Calificacion, Resena medica |
| Sprint 3 | Historia Clinica y Optimizacion | Completado | Historia clinica, datos dinamicos JSONB, filtrado avanzado, exportacion PDF/Excel, Lazy Loading, rutas localizadas en espanol, animaciones de transicion |
| Sprint 4 | Estadisticas y Reportes | Planificado | Dashboard administrativo, graficos, exportacion |
| Sprint 5 | Optimizacion y Despliegue | Planificado | Performance, testing e2e, CI/CD, despliegue |

---

## Inicio Rapido

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Ejecutar en modo desarrollo
ng serve

# Construir para produccion
ng build --configuration=production
```

### Variables de Entorno

Configurar el archivo `src/environments/environment.ts` con las credenciales de Supabase:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://tu-proyecto.supabase.co',
  supabaseKey: 'tu-anon-key',
};
```

---

## Licencia

Proyecto privado. Todos los derechos reservados.
