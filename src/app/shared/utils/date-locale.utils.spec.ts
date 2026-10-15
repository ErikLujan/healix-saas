import {
  construirFechaHoraISO,
  extraerFechaCorta,
  extraerHora,
  fechaHoraLocalActual,
  fechaLocalHoy,
  formatearFechaCorta,
  formatearFechaCortaCapitalizadaEsAR,
  formatearFechaLegibleEsAR,
  nombreDiaCortoEsAR,
  nombreMesCortoEsAR,
  obtenerDiaSemanaLocal,
} from './date-locale.utils';

describe('date-locale.utils', () => {
  describe('construirFechaHoraISO', () => {
    it('compone la marca ISO de agenda desde fecha y hora locales', () => {
      expect(construirFechaHoraISO('2026-10-12', '15:30')).toBe('2026-10-12T15:30:00.000Z');
    });

    it('conserva la hora exacta sin conversión de zona', () => {
      expect(extraerHora(construirFechaHoraISO('2026-01-05', '08:00'))).toBe('08:00');
      expect(extraerHora(construirFechaHoraISO('2026-01-05', '19:45'))).toBe('19:45');
    });
  });

  describe('recorte sin conversión de zona', () => {
    it('extraerFechaCorta y extraerHora recortan la marca original', () => {
      const marca = '2026-10-12T15:30:00.000Z';
      expect(extraerFechaCorta(marca)).toBe('2026-10-12');
      expect(extraerHora(marca)).toBe('15:30');
    });

    it('devuelve cadena vacía para valores nulos', () => {
      expect(extraerFechaCorta(null)).toBe('');
      expect(extraerFechaCorta(undefined)).toBe('');
      expect(extraerHora(null)).toBe('');
      expect(extraerHora(undefined)).toBe('');
    });
  });

  describe('fecha local', () => {
    it('fechaLocalHoy coincide con el armado manual local', () => {
      const ahora = new Date();
      const esperada = [
        ahora.getFullYear(),
        String(ahora.getMonth() + 1).padStart(2, '0'),
        String(ahora.getDate()).padStart(2, '0'),
      ].join('-');
      expect(fechaLocalHoy()).toBe(esperada);
    });

    it('fechaHoraLocalActual incluye la hora local completa', () => {
      const marca = fechaHoraLocalActual();
      expect(marca).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(marca.startsWith(fechaLocalHoy())).toBeTrue();
    });

    it('formatearFechaCorta serializa un Date en hora local', () => {
      expect(formatearFechaCorta(new Date(2026, 9, 12))).toBe('2026-10-12');
      expect(formatearFechaCorta(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
  });

  describe('marcador de hoy (esHoy)', () => {
    it('la fecha local de hoy compara igual contra sí misma', () => {
      const hoy = fechaLocalHoy();
      expect(hoy === fechaLocalHoy()).toBeTrue();
      const ayer = formatearFechaCorta(new Date(new Date().setDate(new Date().getDate() - 1)));
      expect(ayer === hoy).toBeFalse();
    });
  });

  describe('nombres Intl es-AR', () => {
    it('nombreMesCortoEsAR capitaliza el mes corto', () => {
      expect(nombreMesCortoEsAR(10)).toBe('Oct');
      expect(nombreMesCortoEsAR('01')).toBe('Ene');
      expect(nombreMesCortoEsAR(13)).toBe('13');
    });

    it('nombreDiaCortoEsAR capitaliza el día corto', () => {
      expect(nombreDiaCortoEsAR(1)).toBe('Lun');
      expect(nombreDiaCortoEsAR(6)).toBe('Sáb');
      expect(nombreDiaCortoEsAR(9)).toBe('');
    });

    it('obtenerDiaSemanaLocal resuelve el día desde la fecha corta', () => {
      expect(obtenerDiaSemanaLocal('2026-01-05')).toBe(1);
      expect(obtenerDiaSemanaLocal('2026-01-10')).toBe(6);
    });
  });

  describe('formatos legibles', () => {
    it('formatearFechaLegibleEsAR produce la fecha larga en español', () => {
      expect(formatearFechaLegibleEsAR('2026-10-12T15:30:00.000Z')).toBe('12 de octubre de 2026');
    });

    it('formatearFechaCortaCapitalizadaEsAR capitaliza el mes', () => {
      const salida = formatearFechaCortaCapitalizadaEsAR('2026-10-12T15:30:00.000Z');
      expect(salida).toContain('Oct');
      expect(salida).toContain('2026');
      expect(salida).not.toContain('oct');
    });

    it('los formatos legibles devuelven vacío sin valor', () => {
      expect(formatearFechaLegibleEsAR(null)).toBe('');
      expect(formatearFechaCortaCapitalizadaEsAR(null)).toBe('');
    });
  });
});
