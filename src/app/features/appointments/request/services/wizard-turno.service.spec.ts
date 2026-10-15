import { TestBed } from '@angular/core/testing';
import { AdminUsersService } from '@features/administration/services/admin-users.service';
import { WizardTurnoService, EspecialistaWizard } from './wizard-turno.service';
import { EspecialidadInfo } from '@core/models/turno.model';

describe('WizardTurnoService', () => {
  let service: WizardTurnoService;

  const especialidad: EspecialidadInfo = { id: 'esp-1', name: 'Cardiología' };
  const especialista: EspecialistaWizard = {
    id: 'med-1',
    full_name: 'Dra. Prueba',
    avatar_url: null,
    especialidades: [especialidad],
  };
  const paciente = { id: 'pac-1', full_name: 'Paciente', email: 'p@p.com', avatar_url: null };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminUsersService,
          useValue: { users: () => [] },
        },
      ],
    });
    service = TestBed.inject(WizardTurnoService);
  });

  it('arranca en el paso 1 sin selecciones', () => {
    const estado = service.estado();
    expect(estado.pasoActual).toBe(1);
    expect(estado.especialidadSeleccionada).toBeNull();
    expect(estado.especialistaSeleccionado).toBeNull();
    expect(estado.fechaSeleccionada).toBeNull();
    expect(estado.horaSeleccionada).toBeNull();
  });

  it('flujo paciente: especialidad→2, especialista→3, fecha→4, hora→5', () => {
    service.seleccionarEspecialidad(especialidad);
    expect(service.pasoActual()).toBe(2);

    service.seleccionarEspecialista(especialista);
    expect(service.pasoActual()).toBe(3);

    service.seleccionarFecha('2026-11-10');
    expect(service.pasoActual()).toBe(4);
    expect(service.fechaSeleccionada()).toBe('2026-11-10');

    service.seleccionarHora('15:30');
    expect(service.pasoActual()).toBe(5);
    expect(service.horaSeleccionada()).toBe('15:30');
  });

  it('flujo admin: paciente→2, especialidad→3, especialista→4, fecha→5, hora→6', () => {
    service.seleccionarPaciente(paciente);
    expect(service.pasoActual()).toBe(2);

    service.seleccionarEspecialidad(especialidad);
    expect(service.pasoActual()).toBe(3);

    service.seleccionarEspecialista(especialista);
    expect(service.pasoActual()).toBe(4);

    service.seleccionarFecha('2026-11-10');
    expect(service.pasoActual()).toBe(5);

    service.seleccionarHora('15:30');
    expect(service.pasoActual()).toBe(6);
  });

  it('seleccionar fecha limpia la hora previamente elegida', () => {
    service.seleccionarEspecialidad(especialidad);
    service.seleccionarEspecialista(especialista);
    service.seleccionarFecha('2026-11-10');
    service.seleccionarHora('15:30');

    service.seleccionarFecha('2026-11-12');
    expect(service.horaSeleccionada()).toBeNull();
    expect(service.pasoActual()).toBe(4);
  });

  it('seleccionar especialista limpia fecha y hora previas', () => {
    service.seleccionarEspecialidad(especialidad);
    service.seleccionarEspecialista(especialista);
    service.seleccionarFecha('2026-11-10');
    service.seleccionarHora('15:30');
    expect(service.horaSeleccionada()).toBe('15:30');

    service.seleccionarEspecialista(especialista);
    expect(service.fechaSeleccionada()).toBeNull();
    expect(service.horaSeleccionada()).toBeNull();
    expect(service.pasoActual()).toBe(3);
  });

  it('seleccionar paciente (admin) reinicia las selecciones posteriores', () => {
    service.seleccionarEspecialidad(especialidad);
    service.seleccionarEspecialista(especialista);
    service.seleccionarFecha('2026-11-10');

    service.seleccionarPaciente(paciente);
    const estado = service.estado();
    expect(estado.pacienteSeleccionado?.id).toBe('pac-1');
    expect(estado.especialidadSeleccionada).toBeNull();
    expect(estado.especialistaSeleccionado).toBeNull();
    expect(estado.fechaSeleccionada).toBeNull();
    expect(estado.horaSeleccionada).toBeNull();
    expect(estado.pasoActual).toBe(2);
  });

  it('retrocederPaso baja un paso y no baja del 1', () => {
    service.seleccionarEspecialidad(especialidad);
    expect(service.pasoActual()).toBe(2);

    service.retrocederPaso();
    expect(service.pasoActual()).toBe(1);

    service.retrocederPaso();
    expect(service.pasoActual()).toBe(1);
  });

  it('irAPaso solo navega hacia pasos ya alcanzados', () => {
    service.seleccionarEspecialidad(especialidad);
    expect(service.pasoActual()).toBe(2);

    service.irAPaso(3);
    expect(service.pasoActual()).toBe(2);

    service.irAPaso(1);
    expect(service.pasoActual()).toBe(1);
  });

  it('reiniciar restaura el estado inicial completo', () => {
    service.seleccionarEspecialidad(especialidad);
    service.seleccionarEspecialista(especialista);
    service.seleccionarFecha('2026-11-10');
    service.seleccionarHora('15:30');

    service.reiniciar();
    const estado = service.estado();
    expect(estado.pasoActual).toBe(1);
    expect(estado.especialidadSeleccionada).toBeNull();
    expect(estado.especialistaSeleccionado).toBeNull();
    expect(estado.fechaSeleccionada).toBeNull();
    expect(estado.horaSeleccionada).toBeNull();
  });
});
