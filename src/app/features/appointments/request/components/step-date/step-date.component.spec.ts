import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepDateComponent } from './step-date.component';
import { WizardTurnoService, EspecialistaWizard } from '../../services/wizard-turno.service';
import { AppointmentRequestService } from '../../services/appointment-request.service';
import { AdminUsersService } from '@features/administration/services/admin-users.service';
import { DiaSemana } from '@core/models/disponibilidad.model';
import {
  fechaLocalHoy,
  formatearFechaCorta,
  obtenerDiaSemanaLocal,
} from '@shared/utils/date-locale.utils';

describe('StepDateComponent', () => {
  let fixture: ComponentFixture<StepDateComponent>;
  let component: StepDateComponent;
  let wizard: WizardTurnoService;
  let hoy: string;
  let otroMes: string;

  const especialista: EspecialistaWizard = {
    id: 'med-1',
    full_name: 'Dra. Prueba',
    avatar_url: null,
    especialidades: [],
  };

  beforeEach(async () => {
    hoy = fechaLocalHoy();
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 40);
    otroMes = formatearFechaCorta(fechaFutura);

    const fechas = [
      { fecha: hoy, diaSemana: obtenerDiaSemanaLocal(hoy) as DiaSemana },
      { fecha: otroMes, diaSemana: obtenerDiaSemanaLocal(otroMes) as DiaSemana },
    ];

    await TestBed.configureTestingModule({
      providers: [
        { provide: AdminUsersService, useValue: { users: () => [] } },
        {
          provide: AppointmentRequestService,
          useValue: {
            cargarFechasDisponibles: () => Promise.resolve(fechas),
          } as unknown as AppointmentRequestService,
        },
      ],
    }).compileComponents();

    wizard = TestBed.inject(WizardTurnoService);
    wizard.seleccionarEspecialista(especialista);

    fixture = TestBed.createComponent(StepDateComponent);
    component = fixture.componentInstance;
  });

  it('marca como hoy solo la fecha local actual', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isLoading()).toBeFalse();
    const fechas = component.fechasDisponibles();
    expect(fechas.length).toBe(2);

    const deHoy = fechas.find(f => f.fecha === hoy);
    const deOtroMes = fechas.find(f => f.fecha === otroMes);
    expect(deHoy?.esHoy).toBeTrue();
    expect(deOtroMes?.esHoy).toBeFalse();
  });

  it('agrupa por mes con clave año-mes y etiqueta con año', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const grupos = component.agrupadasPorMes();
    expect(grupos.length).toBe(2);

    const claves = grupos.map(g => g.clave);
    expect(new Set(claves).size).toBe(2);

    const anioOtroMes = otroMes.substring(0, 4);
    const grupoOtro = grupos.find(g => g.fechas.some(f => f.fecha === otroMes));
    expect(grupoOtro).toBeDefined();
    expect(grupoOtro!.clave.startsWith(`${anioOtroMes}-`)).toBeTrue();
    expect(grupoOtro!.etiqueta).toContain(anioOtroMes);
  });

  it('resuelve nombres de día cortos capitalizados vía Intl', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    for (const fecha of component.fechasDisponibles()) {
      expect(fecha.diaNombre).toMatch(/^[A-ZÁÉÍÓÚ]/);
      expect(fecha.mesNombre).toMatch(/^[A-ZÁÉÍÓÚ]/);
    }
  });

  it('seleccionar delega en el wizard con la fecha elegida', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const deHoy = component.fechasDisponibles().find(f => f.fecha === hoy);
    component.seleccionar(deHoy!);

    expect(wizard.fechaSeleccionada()).toBe(hoy);
  });
});
