import {
  UNIDADES_CLINICAS,
  clasesNivelDolor,
  formatearClaveDinamica,
  formatearNivelDolor,
} from './clinical-format.utils';

describe('clinical-format.utils', () => {
  describe('UNIDADES_CLINICAS', () => {
    it('define las unidades de los parámetros fijos', () => {
      expect(UNIDADES_CLINICAS.altura).toBe('cm');
      expect(UNIDADES_CLINICAS.peso).toBe('kg');
      expect(UNIDADES_CLINICAS.temperatura).toBe('°C');
      expect(UNIDADES_CLINICAS.frecuenciaCardiaca).toBe('lpm');
    });
  });

  describe('formatearNivelDolor (umbral EVA)', () => {
    it('clasifica niveles hasta 3 como leves', () => {
      expect(formatearNivelDolor('0')).toBe('0/10 - Leve');
      expect(formatearNivelDolor('3')).toBe('3/10 - Leve');
    });

    it('clasifica niveles 4 a 6 como moderados', () => {
      expect(formatearNivelDolor('4')).toBe('4/10 - Moderado');
      expect(formatearNivelDolor('6')).toBe('6/10 - Moderado');
    });

    it('clasifica niveles 7 o más como intensos', () => {
      expect(formatearNivelDolor('7')).toBe('7/10 - Intenso');
      expect(formatearNivelDolor('10')).toBe('10/10 - Intenso');
    });

    it('devuelve el valor original cuando no es numérico', () => {
      expect(formatearNivelDolor('abc')).toBe('abc');
    });
  });

  describe('clasesNivelDolor', () => {
    it('usa tokens del sistema según el umbral', () => {
      expect(clasesNivelDolor('2')).toBe('bg-emerald-100 text-emerald-700');
      expect(clasesNivelDolor('5')).toBe('bg-amber-100 text-amber-700');
      expect(clasesNivelDolor('9')).toBe('bg-red-100 text-red-700');
    });

    it('degrada a superficies neutras sin número', () => {
      expect(clasesNivelDolor('n/a')).toBe('bg-surface-sunken text-text-secondary');
    });
  });

  describe('formatearClaveDinamica', () => {
    it('resuelve claves conocidas desde el mapa', () => {
      expect(formatearClaveDinamica('colesterol')).toBe('Colesterol');
      expect(formatearClaveDinamica('saturacion de oxigeno')).toBe('Saturación O₂');
      expect(formatearClaveDinamica('frecuencia cardiaca')).toBe('Frec. Cardíaca');
    });

    it('capitaliza claves desconocidas separadas por guiones bajos', () => {
      expect(formatearClaveDinamica('perimetro_abdominal')).toBe('Perimetro Abdominal');
      expect(formatearClaveDinamica('acido_urico')).toBe('Acido Urico');
    });
  });
});
