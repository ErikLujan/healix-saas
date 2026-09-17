import { Component, inject, input, output, signal, computed, effect, OnInit, OnDestroy, HostListener } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { NgClass } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { toast } from 'ngx-sonner';
import { LucideDynamicIcon } from '@lucide/angular';
import { ClinicalRangeComponent } from '@shared/components/clinical-controls/clinical-range.component';
import { ClinicalNumericComponent } from '@shared/components/clinical-controls/clinical-numeric.component';
import { ClinicalBooleanComponent } from '@shared/components/clinical-controls/clinical-boolean.component';
import { MedicalRecordsService } from '@core/services/medical-records.service';
import { AuthService } from '@core/services/auth.service';
import { TurnosService } from '@core/services/turnos.service';
import { TurnoConRelaciones } from '@core/models/turno.model';
import {
  MedicalRecordInsert,
  MAX_DATOS_DINAMICOS,
  CLAVES_OBLIGATORIAS,
} from '@core/models/medical-record.model';

/** Validador personalizado para formato de presión arterial (ej: "120/80"). */
function validarPresionArterial(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) return null;
  const patron = /^\d{2,3}\/\d{2,3}$/;
  return patron.test(valor) ? null : { formatoPresion: true };
}

/**
 * Diálogo modal para el formulario de alta médica del especialista.
 *
 * Implementa un formulario reactivo fuertemente tipado que captura:
 * - Reseña clínica (textarea obligatorio)
 * - Datos clínicos fijos: altura, peso, temperatura, presión arterial
 * - Hasta 3 datos dinámicos clave-valor (FormArray)
 *
 * La inserción exitosa dispara el trigger del backend que finaliza
 * el turno automáticamente, consolidando el alta médica en una
 * única operación transaccional.
 */
@Component({
  selector: 'app-finish-appointment-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgClass,
    LucideDynamicIcon,
    ClinicalRangeComponent,
    ClinicalNumericComponent,
    ClinicalBooleanComponent,
  ],
  templateUrl: './finish-appointment.dialog.html',
})
export class FinishAppointmentDialogComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly authService = inject(AuthService);
  private readonly turnosService = inject(TurnosService);
  private readonly destroy$ = new Subject<void>();

  /** Turno seleccionado para finalizar. */
  readonly turno = input.required<TurnoConRelaciones>();

  /** Evento emitido al finalizar correctamente. */
  readonly onFinalizado = output<void>();

  /** Evento emitido al cerrar sin finalizar. */
  readonly onCerrar = output<void>();

  /** Indica si el dialogo esta visible. */
  readonly isVisible = signal(false);

  /** Indica si esta persistiendo el registro. */
  readonly isPersistiendo = signal(false);

  /** Indica si el registro clinico (paso 1) se persistio correctamente. */
  private readonly registroPersistido = signal(false);

  /** Indica si la resena diagnostico (paso 2) fallo y necesita reintento. */
  readonly necesitaReintentoResena = signal(false);

  /** Texto de resena pendiente de reintento. */
  private resenaPendiente = '';

  /** Formulario reactivo principal. */
  form!: FormGroup;

  /** Valor sincronizado del control de evaluacion de dolor (rango). */
  readonly evaluacionDolorValue = signal(5);

  /** Valor sincronizado del control de frecuencia cardiaca (numerico). */
  readonly frecuenciaCardiacaValue = signal('');

  /** Valor sincronizado del control de alergias referidas (booleano). */
  readonly alergiasValue = signal(false);

  /** Lista de especialidades del especialista para el select de claves dinamicas. */
  readonly clavesSugeridas = [
    'Colesterol',
    'Glucemia',
    'Saturacion',
    'Frecuencia cardiaca',
    'Frecuencia respiratoria',
    'Perimetro abdominal',
    'Agudeza visual',
    'Dolor (EVA)',
  ];

  /** Indica si se alcanzo el limite de datos dinamicos. */
  readonly alLimiteDinamicos = computed(() => this.datosDinamicos.length >= MAX_DATOS_DINAMICOS);

  /** Cantidad actual de datos dinamicos. */
  get cantidadDinamicos(): number {
    return this.datosDinamicos.length;
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.isVisible() && !this.isPersistiendo()) this.cerrar();
  }

  /** Acceso al FormArray de datos dinamicos. */
  get datosDinamicos(): FormArray {
    return this.form.get('datos_dinamicos') as FormArray;
  }

  ngOnInit(): void {
    this.construirFormulario();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Construye el formulario reactivo con todas las validaciones. */
  private construirFormulario(): void {
    this.form = this.fb.group({
      resena: ['', [Validators.required, Validators.minLength(10)]],
      altura: [null as number | null, [Validators.required, Validators.min(0.2), Validators.max(2.8)]],
      peso: [null as number | null, [Validators.required, Validators.min(1), Validators.max(300)]],
      temperatura: [null as number | null, [Validators.required, Validators.min(30), Validators.max(45)]],
      presion_arterial: ['', [Validators.required, validarPresionArterial]],
      evaluacion_dolor: [5, [Validators.required, Validators.min(0), Validators.max(10)]],
      frecuencia_cardiaca: ['', [Validators.required, Validators.pattern(/^\d{1,3}$/)]],
      alergias_refiridas: [false, Validators.required],
      datos_dinamicos: this.fb.array([]),
    });
  }

  /** Abre el dialogo y resetea el formulario. */
  abrir(): void {
    this.reiniciarFormulario();
    this.isVisible.set(true);
  }

  /** Cierra el dialogo y limpia el estado. */
  cerrar(): void {
    if (this.isPersistiendo()) return;
    this.isVisible.set(false);
    this.reiniciarFormulario();
    this.onCerrar.emit();
  }

  /** Reinicia el formulario a su estado inicial. */
  private reiniciarFormulario(): void {
    this.form?.reset({
      resena: '',
      altura: null,
      peso: null,
      temperatura: null,
      presion_arterial: '',
      evaluacion_dolor: 5,
      frecuencia_cardiaca: '',
      alergias_refiridas: false,
    });
    this.evaluacionDolorValue.set(5);
    this.frecuenciaCardiacaValue.set('');
    this.alergiasValue.set(false);
    this.registroPersistido.set(false);
    this.necesitaReintentoResena.set(false);
    this.resenaPendiente = '';
    while (this.datosDinamicos.length > 0) {
      this.datosDinamicos.removeAt(0);
    }
  }

  /** Agrega un nuevo par clave-valor dinamico al formulario. */
  agregarDatoDinamico(): void {
    if (this.alLimiteDinamicos()) return;

    const grupo = this.fb.group({
      clave: ['', Validators.required],
      valor: ['', Validators.required],
    });

    this.datosDinamicos.push(grupo);
  }

  /** Elimina un par clave-valor dinamico por indice. */
  eliminarDatoDinamico(indice: number): void {
    this.datosDinamicos.removeAt(indice);
  }

  /** Retorna el FormGroup de un dato dinamico por indice. */
  datoDinamicoEn(indice: number): FormGroup {
    return this.datosDinamicos.at(indice) as FormGroup;
  }

  /** Verifica si un campo del formulario tiene error y fue tocado. */
  campoInvalido(nombreCampo: string): boolean {
    const campo = this.form.get(nombreCampo);
    return !!(campo && campo.invalid && (campo.dirty || campo.touched));
  }

  /** Retorna el mensaje de error legible para un campo. */
  mensajeErrorCampo(nombreCampo: string): string {
    const campo = this.form.get(nombreCampo);
    if (!campo || !campo.errors) return '';

    if (campo.errors['required']) return 'Este campo es obligatorio.';
    if (campo.errors['minlength']) return 'Mínimo 10 caracteres.';
    if (campo.errors['min']) return `El valor mínimo es ${campo.errors['min'].min}.`;
    if (campo.errors['max']) return `El valor máximo es ${campo.errors['max'].max}.`;
    if (campo.errors['formatoPresion']) return 'Formato inválido. Ej: 120/80';
    return 'Valor no válido.';
  }

  /** Verifica si un campo dinamico tiene error y fue tocado. */
  campoDinamicoInvalido(indice: number, campo: string): boolean {
    const grupo = this.datoDinamicoEn(indice);
    const control = grupo.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /** Sincroniza el valor del slider de dolor con el FormControl. */
  onDolorChange(valor: number): void {
    this.evaluacionDolorValue.set(valor);
    this.form.get('evaluacion_dolor')?.setValue(valor);
  }

  /** Sincroniza el valor de frecuencia cardiaca con el FormControl. */
  onFrecuenciaChange(valor: string): void {
    this.frecuenciaCardiacaValue.set(valor);
    this.form.get('frecuencia_cardiaca')?.setValue(valor);
  }

  /** Sincroniza el valor de alergias referidas con el FormControl. */
  onAlergiasChange(valor: boolean): void {
    this.alergiasValue.set(valor);
    this.form.get('alergias_refiridas')?.setValue(valor);
  }

  /** Construye el payload de insercion y ejecuta la persistencia. */
  async confirmar(): Promise<void> {
    if (this.form.invalid || this.isPersistiendo()) return;

    this.isPersistiendo.set(true);
    this.necesitaReintentoResena.set(false);

    const turnoActual = this.turno();
    const perfil = this.authService.userProfile();

    if (!perfil) {
      toast.error('No se pudo identificar al profesional.');
      this.isPersistiendo.set(false);
      return;
    }

    const valores = this.form.value;
    const resenaTexto = valores.resena?.trim() ?? '';

    const datosLibres = (valores.datos_dinamicos ?? []).map((d: { clave: string; valor: string }) => ({
      clave: d.clave.trim(),
      valor: d.valor.trim(),
    }));

    const datosObligatorios = [
      { clave: CLAVES_OBLIGATORIAS.RANGO_DOLOR, valor: String(this.evaluacionDolorValue()) },
      { clave: CLAVES_OBLIGATORIAS.FRECUENCIA_CARDIACA, valor: String(this.frecuenciaCardiacaValue()) },
      { clave: CLAVES_OBLIGATORIAS.ALERGIAS_REFIRIDAS, valor: String(this.alergiasValue()) },
    ];

    const payload: MedicalRecordInsert = {
      turno_id: turnoActual.id,
      paciente_id: turnoActual.paciente_id,
      especialista_id: perfil.id,
      altura: Number(valores.altura),
      peso: Number(valores.peso),
      temperatura: Number(valores.temperatura),
      presion_arterial: String(valores.presion_arterial).trim(),
      datos_dinamicos: [...datosObligatorios, ...datosLibres],
    };

    this.medicalRecordsService.createMedicalRecord(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.registroPersistido.set(true);

          if (resenaTexto) {
            try {
              await this.turnosService.actualizarTurno(turnoActual.id, {
                resena_diagnostico: resenaTexto,
              });
            } catch {
              this.resenaPendiente = resenaTexto;
              this.necesitaReintentoResena.set(true);
              this.isPersistiendo.set(false);
              toast.warning('Registro clínico guardado. No se pudo actualizar la reseña. Podés reintentar.');
              return;
            }
          }

          toast.success('Turno finalizado e Historia Clínica registrada correctamente.');
          this.isVisible.set(false);
          this.isPersistiendo.set(false);
          this.onFinalizado.emit();
        },
        error: () => {
          this.isPersistiendo.set(false);
        },
      });
  }

  /** Reintenta persistir la resena diagnostico pendiente. */
  async reintentarResena(): Promise<void> {
    if (this.isPersistiendo() || !this.resenaPendiente) return;

    this.isPersistiendo.set(true);
    const turnoActual = this.turno();

    try {
      await this.turnosService.actualizarTurno(turnoActual.id, {
        resena_diagnostico: this.resenaPendiente,
      });

      this.necesitaReintentoResena.set(false);
      this.resenaPendiente = '';
      toast.success('Turno finalizado e Historia Clínica registrada correctamente.');
      this.isVisible.set(false);
      this.onFinalizado.emit();
    } catch {
      toast.error('No se pudo guardar la reseña. Intentá nuevamente.');
    } finally {
      this.isPersistiendo.set(false);
    }
  }
}
