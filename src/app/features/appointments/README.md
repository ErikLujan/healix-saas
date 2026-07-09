# Arquitectura del Dominio de Turnos y Agenda — Sprint 2

> **Modulo:** Appointments (Solicitudes, Dashboard y Disponibilidad)
>
> **Estado:** Sprint 2 completado
>
> **Responsable:** Frontend Angular 19 / Supabase SDK

---

## 1. Arquitectura General del Sistema de Agendas y Turnos

### 1.1 Separacion de capas

El modulo de turnos se organiza en tres capas claramente separadas:

```
┌─────────────────────────────────────────────────────────┐
│  Capa de Presentacion (Features/Appointments)           │
│  ├─ dashboard/        → Vista de gestion de turnos     │
│  ├─ request/          → Asistente de solicitud (wizard)│
│  └─ components/       → Cards, dialogos, steps         │
├─────────────────────────────────────────────────────────┤
│  Capa de Servicios (Core/Services)                      │
│  ├─ TurnosService     → Ciclo de vida de turnos        │
│  ├─ DisponibilidadService → Bloques horarios            │
│  ├─ AuthService       → Sesion y rol del usuario       │
│  └─ SupabaseService   → Cliente SDK unico              │
├─────────────────────────────────────────────────────────┤
│  Capa de Persistencia (Supabase / PostgreSQL)           │
│  ├─ public.turnos              → Registros de citas     │
│  ├─ public.disponibilidad_especialista → Bloques        │
│  ├─ public.especialista_especialidad  → M:N medico-esp  │
│  └─ public.specialties         → Catalogo de especialid │
└─────────────────────────────────────────────────────────┘
```

Los componentes presentacionales **nunca** llaman directamente a Supabase. Toda operacion de lectura o escritura pasa obligatoriamente por un servicio inyectado via `inject()`. Esto garantiza que la logica de negocio, validacion y manejo de errores se mantenga centralizada y testeable.

### 1.2 Rutas del modulo

| Ruta | Componente | Descripcion |
|------|-----------|-------------|
| `/appointments` | `DashboardPageComponent` | Panel de gestion de turnos del usuario actual |
| `/appointments/request` | `RequestPageComponent` | Asistente de 5 pasos para solicitar un turno |

Ambas rutas se cargan mediante lazy loading via `loadComponent()` en `appointments.routes.ts`.

---

## 2. Ciclo de Vida del Turno

### 2.1 Enum `turno_estado`

El estado de un turno esta definido por el tipo `TurnoEstado` en `database.types.ts`:

```typescript
type TurnoEstado =
  | 'pendiente'
  | 'confirmado'
  | 'rechazado'
  | 'cancelado'
  | 'finalizado';
```

### 2.2 Diagrama de transiciones

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
           │                          (terminal)
           ▼
     ┌────────────┐
     │ Finalizado │  (terminal)
     └────────────┘
           │
           ▼
     ┌────────────┐
     │ Cancelado  │  (solo desde confirmado)
     └────────────┘
```

### 2.3 Reglas de transicion por rol

| Estado actual | Accion | Rol autorizado | Resultado |
|--------------|--------|----------------|-----------|
| `pendiente` | confirmar | especialista | `confirmado` |
| `pendiente` | rechazar | especialista | `rechazado` |
| `pendiente` | cancelar | paciente | `cancelado` |
| `confirmado` | finalizar | especialista | `finalizado` |
| `confirmado` | cancelar | especialista o paciente | `cancelado` |

Los estados `rechazado`, `cancelado` y `finalizado` son **terminales**: no permiten transiciones posteriores.

### 2.4 Liberacion de horario

Los estados `cancelado`, `rechazado` y `finalizado` liberan el bloque horario ocupado, permitiendo que otros pacientes lo reserven. Esto se controla mediante la constante `ESTADOS_LIBERAN_HORARIO` en `turno.model.ts`.

---

## 3. Algoritmo de Generacion de Slots

### 3.1 Fragmentacion en bloques de 30 minutos

El servicio `DisponibilidadService.generarSlotsDeAtencion()` convierte rangos de atencion continuos en bloques fijos e inmutables:

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

### 3.2 Restricciones de la clinica

| Dia | Rango permitido |
|-----|----------------|
| Lunes a Viernes | 08:00 - 19:00 |
| Sabado | 08:00 - 14:00 |
| Domingo | No configurable |

Estas restricciones estan definidas en `RESTRICCIONES_HORARIAS` y se validan tanto en la interfaz (edicion de disponibilidad) como en el servicio antes de persistir.

### 3.3 Proteccion contra condiciones de carrera

Cuando un paciente reserva un turno, `TurnosService.crearTurnoPendiente()` verifica que no exista ya un turno `confirmado` o `pendiente` para el mismo especialista, fecha y hora. Esta verificacion se ejecuta **antes** de la insercion, actuando como lock a nivel de cliente.

---

## 4. Buscador Global In-Memory

### 4.1 Estrategia de filtrado multidimensional

El `DashboardPageComponent` implementa un buscador que filtra turnos por especialidad, especialista, paciente y estado sin realizar consultas a la red.

```typescript
readonly turnosFiltrados = computed(() => {
  const query = this.searchQuery().toLowerCase().trim();
  const filtro = this.filtroEstado();
  const turnos = this.turnos();

  if (!query && filtro === 'todos') return turnos;

  return turnos.filter(t => {
    const coincideTexto = !query
      || t.especialidad_nombre?.toLowerCase().includes(query)
      || t.especialista_nombre?.toLowerCase().includes(query)
      || t.paciente_nombre?.toLowerCase().includes(query);
    const coincideEstado = filtro === 'todos' || t.estado === filtro;
    return coincideTexto && coincideEstado;
  });
});
```

### 4.2 Por que no consulta Supabase en cada tecla

- **Latencia:** Cada consulta PostgREST implica round-trip de red (50-200ms).
- **Carga innecesaria:** Los turnos ya estan cargados en memoria al acceder al dashboard.
- **Experiencia:** El filtrado instantaneo (< 1ms) produce una interfaz mucho mas fluida.
- **Economia:** Se evitan llamadas a la API que consumen cuota de Supabase.

Los turnos se cargan una sola vez al montar el componente y se almacenan en una signal. El `computed()` recalcula automaticamente el array filtrado solo cuando cambia `searchQuery` o `filtroEstado`.

---

## 5. Asistente de Solicitud de Turnos (Wizard)

### 5.1 Flujo de 5 pasos

| Paso | Componente | Descripcion |
|------|-----------|-------------|
| 1 | `StepSpecialtyComponent` | Seleccion visual de especialidad medica |
| 2 | `StepSpecialistComponent` | Tarjetas de especialistas con foto y especialidades |
| 3 | `StepDateComponent` | Calendario de proximos 15 dias agrupados por mes |
| 4 | `StepTimeComponent` | Grilla de slots de 30 min (libres vs ocupados) |
| 5 | `StepConfirmComponent` | Resumen y creacion del turno |

### 5.2 Estado del wizard

El estado se gestiona mediante `WizardTurnoService`, que expone signals para cada paso:

```typescript
readonly pasoActual = signal(1);
readonly especialidadSeleccionada = signal<EspecialidadWizard | null>(null);
readonly especialistaSeleccionado = signal<EspecialistaWizard | null>(null);
readonly fechaSeleccionada = signal<string>('');
readonly horaSeleccionada = signal<string>('');
readonly puedeAvanzar = computed(() => { /* validaciones por paso */ });
readonly tituloPasoActual = computed(() => { /* titulo dinamico */ });
```

### 5.3 Anti-conflicto

Antes de insertar el turno, `StepConfirmComponent` ejecuta una verificacion final de disponibilidad. Si el horario fue ocupado por otro paciente durante el proceso de seleccion, se informa al usuario y se le permite volver al paso 4 para elegir otro horario.

---

## 6. Dashboard de Gestion de Turnos

### 6.1 Deteccion de rol

El componente detecta el rol del usuario via `AuthService.userRole` y adapta la interfaz:

- **Paciente:** Ve sus turnos, puede cancelar y solicitar nuevos.
- **Especialista:** Ve turnos asignados, puede confirmar, rechazar o finalizar.
- **Administrador:** Vista de solo lectura de todos los turnos.

### 6.2 Dialogos modales

| Dialogo | Uso | Campos |
|---------|-----|--------|
| `ComentarioDialogComponent` | Cancelar o rechazar turno | Textarea obligatorio (motivo) |
| `ResenaMedicaDialogComponent` | Finalizar turno | Textarea obligatorio (resena clinica) |

Ambos dialogos usan patron `@ViewChild` desde el componente smart y se abren/cierran mediante metodos publicos.

### 6.3 Tarjeta de turno (`TurnoCardComponent`)

Cada turno se renderiza como una card con:
- Badge de estado con color codificado (`COLORES_ESTADO`)
- Fechas y horas formateadas
- Motivo de consulta (si aplica)
- Resena medica (si el turno esta finalizado)
- Botones de accion segun estado y rol

---

## 7. Modulo de Disponibilidad del Especialista

### 7.1 Estructura

```
specialist/availability/
├── pages/availability-page/     → Contenedor smart
├── components/
│   ├── availability-form/       → Edicion de bloques por dia
│   └── slots-preview/           → Vista previa de slots generados
```

### 7.2 Carga de especialidades

El componente carga las especialidades del medico mediante dos consultas secuenciales:

1. `especialista_especialidad` → obtiene los `especialidad_id` del usuario.
2. `specialties` → obtiene `id` y `name` de cada especialidad vinculada.

Este enfoque de dos pasos es necesario porque las relaciones foraneas no estan definidas en el esquema de tipos de Supabase, por lo que un join directo via `.select()` no retornaria datos.

### 7.3 Persistencia

`DisponibilidadService.guardarDisponibilidadSemanal()` ejecuta una operacion atomica:

1. **Elimina** todos los registros existentes del especialista.
2. **Inserta** los nuevos registros validados.
3. **Recarga** la disponibilidad desde la base de datos.

Si algun paso falla, la operacion se aborta y se notifica al usuario via toast.

---

## 8. Captcha Standalone

### 8.1 Descripcion

Componente nativo de validacion humana ubicado en `shared/components/captcha/`. Sin dependencias externas.

### 8.2 Modos de operacion

| Modo | Generacion | Validacion |
|------|-----------|------------|
| **Matematico** | Suma de dos operandos (1-20) | Comparacion numerica |
| **Alfanumerico** | 6 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` | Comparacion de cadena (case-insensitive) |

### 8.3 Distorsion visual

El modo alfanumerico aplica por cada caracter:
- Rotacion aleatoria (-8 a +8 grados)
- Desplazamiento X/Y irregular
- Tamano de fuente variable (18-26px)
- Lineas de interferencia CSS (pseudo-elementos `::before`/`::after`)

### 8.4 Accesibilidad

- `role="group"` con `aria-label` descriptivo por modo
- `role="alert"` en mensajes de error
- Navegacion completa via teclado (input + Enter para verificar)

---

## 9. Bitacora de Hotfixes

### 9.1 Registro de especialistas: `.insert()` → `.update()`

**Problema:** Al registrar un especialista, el componente insertaba en `public.especialistas` con `.insert()`. Sin embargo, el trigger `handle_new_user_sync` de Supabase ya crea la fila automaticamente al hacer `signUp()`, provocando un error de duplicidad de clave primaria.

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

### 9.2 Vinculacion de especialidades: control de errores 403

**Problema:** El `Promise.all()` de insercion en `especialista_especialidad` no verificaba el `{ error }` de cada operacion. Los errores 403 (RLS) se tragaban silenciosamente.

**Solucion:** Almacenar los resultados, filtrar los que tienen `error`, y abortar con toast si alguno falla.

### 9.3 Sincronizacion JWT post-signUp

**Problema:** Despues de `signUp()`, si la confirmacion de email esta habilitada, la sesion es `null` y RLS bloquea las escrituras en tablas secundarias con 403.

**Solucion:** Verificar `getSession()` imperativamente. Si la sesion es `null`, informar al usuario que verifique su correo y redirigir al login. Si existe sesion, esperar 300ms para que el JWT se propague antes de las inserciones.

### 9.4 Nombre de tabla: `disponibilidad` → `disponibilidad_especialista`

**Problema:** El servicio y los componentes del wizard apuntaban a `.from('disponibilidad')`, pero la tabla fisica se llama `disponibilidad_especialista`, generando errores 404.

**Solucion:** Reemplazar todas las ocurrencias del string `'disponibilidad'` por `'disponibilidad_especialista'` en el servicio, el componente de paso de fecha y el componente de paso de hora. Tambien se actualizo la key en `database.types.ts`.

### 9.5 Consulta de especialidades: join roto

**Problema:** La consulta `.select('especialidad_id, specialties(id, name)')` no retornaba datos porque las relaciones foraneas estan vacias en el esquema de tipos.

**Solucion:** Reemplazar el join por dos consultas secuenciales: primero obtener los IDs de `especialista_especialidad`, despues consultar `specialties` con `.in('id', ids)`.

### 9.6 Falsa consulta de perfil en recarga (406)

**Problema:** `onAuthStateChange` disparaba `loadUserProfile()` con el evento `INITIAL_SESSION` en recargas de pagina, usando tokens potencialmente obsoletos.

**Solucion:** Ignorar el evento `INITIAL_SESSION` y solo cargar el perfil en eventos `SIGNED_IN` o `TOKEN_REFRESHED`.

---

## 10. Angular Signals en la Arquitectura

### 10.1 Patron de signals en servicios

Todos los servicios core exponen estado reactivo mediante el patron de signal privada + lectura publica:

```typescript
private readonly _turnos = signal<Turno[]>([]);
readonly turnos = this._turnos.asReadonly();
```

Esto garantiza inmutabilidad: los componentes solo pueden leer el estado, nunca mutarlo directamente.

### 10.2 `computed()` para derivaciones

Las señales derivadas recalculan automaticamente cuando cambian sus dependencias:

```typescript
readonly turnosFiltrados = computed(() =>
  this.turnos().filter(t => this.filtroEstado() === 'todos' || t.estado === this.filtroEstado())
);
```

Esto elimina la necesidad de metodos manuales de filtrado y sincronizacion.

### 10.3 `asReadonly()` como barrera de encapsulamiento

Todos los signals expuestos por servicios usan `asReadonly()` para evitar que los componentes consumidores muten el estado interno. Solo el servicio propietario puede modificar sus signals.

---

## 11. Inmutabilidad

Toda modificacion de estado en la aplicacion sigue un enfoque inmutable:

- **Arrays:** Se reemplazan completamente con `.set()` o `.update()` usando spread operator.
- **Objetos:** Se clonan con `Object.assign({}, ...)` o spread antes de modificar.
- **Signals:** Se actualizan mediante `.set(nuevoValor)` o `.update(prev => ...)`.
- **Colecciones:** Se usan `.map()`, `.filter()`, `.reduce()` en lugar de `.push()`, `.splice()`.

Este enfoque garantiza que Angular detecte los cambios correctamente y que el estado siempre sea predecible.

---

## 12. Modelo Relacional

### 12.1 Diagrama de entidades

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
                        │           │ especialista_especialidad
                        │           ▼
                        │       specialties
                        │
                        │ disponibilidad_especialista
                        ▼
                  disponibilidad_especialista
```

### 12.2 Tablas principales

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

### 12.3 Principios del modelo

- **Normalizacion:** Los nombres de especialidades se almacenan una sola vez en `specialties`.
- **Claves foraneas:** Todas las relaciones usan UUID como clave.
- **Sin duplicacion:** La informacion de un especialista no se repite en cada turno.
- **Historia:** Los turnos finalizados permanecen para estadisticas y auditoria.

---

## 13. Seguridad

### 13.1 Autenticacion

- Supabase Auth gestiona sesiones con JWT.
- `AuthService` gestiona el ciclo de vida: `getSession()`, `onAuthStateChange()`, `signOut()`.
- La sesion se restaura automaticamente en recargas de pagina.

### 13.2 Autorizacion por roles

- `roleGuard` verifica el rol del usuario antes de cargar rutas.
- Los roles son: `paciente`, `especialista`, `administrador`.
- Cada rol accede exclusivamente a sus rutas autorizadas.

### 13.3 Row Level Security (RLS)

- Todas las tablas tienen politicas RLS que restringen el acceso segun el rol.
- Las consultas se ejecutan con las credenciales del usuario autenticado.
- El Frontend no puede leer ni modificar datos fuera de su permiso.

### 13.4 Distribucion de validacion

| Nivel | Responsabilidad |
|-------|----------------|
| **Frontend** | UX: ofrecer solo acciones validas, deshabilitar botones, mostrar errores |
| **Backend (RLS)** | Seguridad: denegar operaciones no autorizadas |
| **Backend (DB)** | Integridad: claves foraneas, constraints, uniques |

Ambos niveles trabajan de forma complementaria. El Frontend mejora la experiencia; el Backend garantiza la integridad.

---

## 14. Organizacion del Codigo

```
src/app/
├── core/                          # Servicios, modelos, guards, animaciones
│   ├── models/                    # Interfaces de dominio y database.types.ts
│   ├── services/                  # AuthService, TurnosService, DisponibilidadService, etc.
│   ├── guards/                    # roleGuard, specialistApprovalGuard
│   └── animations/                # slideUp y otras animaciones de ruta
│
├── shared/                        # Componentes reutilizables
│   └── components/                # CaptchaComponent, FileUploadComponent, etc.
│
├── layouts/                       # Layouts de navegacion
│   ├── dashboard-layout/          # Sidebar + navbar para area autenticada
│   └── auth-layout/               # Layout para login/registro
│
├── features/                      # Modulos funcionales
│   ├── auth/                      # Login y registro
│   ├── appointments/              # Turnos: dashboard + wizard de solicitud
│   │   ├── dashboard/             # Gestion de turnos (Mis Turnos)
│   │   └── request/               # Solicitud de turno (5 pasos)
│   ├── specialist/                # Area del medico
│   │   └── availability/          # Configuracion de disponibilidad
│   ├── patients/                  # Area del paciente
│   └── admin/                     # Area del administrador
│
└── app.routes.ts                  # Enrutamiento principal
```
