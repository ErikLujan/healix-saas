import { Component, output, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

/** Tipos de desafio disponibles para el captcha. */
type ChallengeType = 'math' | 'alphanumeric';

/** Representa un caracter alfanumrico con estilo visual distorsionado. */
interface DistortedChar {
  readonly char: string;
  readonly rotation: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly fontSize: number;
}

/** Conjunto de caracteres alfanumericos validos para generacion de desafios. */
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Cantidad de caracteres para el desafio alfanumerico. */
const ALCHA_LENGTH = 6;

/**
 * Componente compartido de validacion humana (Captcha) nativo y reutilizable.
 *
 * Genera desafios dinamicos aleatorios de dos tipos: operaciones matematicas
 * simples o cadenas alfanumericas con distorsion visual CSS. Expone un
 * output de tipo booleano que permite al formulario padre bloquear o
 * habilitar acciones criticas segun el estado de resolucion.
 *
 * Totalmente standalone, sin dependencias externas ni servicios de terceros.
 * Diseado mobile-first con Tailwind CSS v4.
 */
@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './captcha.component.html',
  styleUrl: './captcha.component.scss',
})
export class CaptchaComponent {
  /** Evento de salida que notifica al formulario padre el estado de resolucion. */
  resolved = output<boolean>();

  /** Tipo de desafio generado actualmente. */
  readonly challengeType = signal<ChallengeType>('math');

  /** Valor correcto del desafio matematico (suma de dos operandos). */
  readonly operandA = signal(0);
  readonly operandB = signal(0);

  /** Cadena alfanumerica correcta generada para el desafio. */
  readonly alphanumericValue = signal('');

  /** Caracteres alfanumericos con propiedades de distorsion visual. */
  readonly distortedChars = signal<readonly DistortedChar[]>([]);

  /** Control reactivo del input del usuario. */
  readonly control = new FormControl<string | number | null>(null);

  /** Indica si el captcha fue resuelto correctamente. */
  readonly isVerified = signal(false);

  /** Mensaje de error visible para el usuario. */
  readonly errorMessage = signal('');

  /** Texto del desafio matematico formateado para lectores de pantalla. */
  readonly mathLabel = computed(() =>
    `${this.operandA()} mas ${this.operandB()}`,
  );

  /** Texto del desafio alfanumerico para lectores de pantalla. */
  readonly alphaLabel = computed(() =>
    `Escriba los caracteres: ${this.alphanumericValue()}`,
  );

  constructor() {
    this.generarDesafio();
  }

  /**
   * Genera un nuevo desafio aleatorio. Alterna entre tipo matematico
   * y alfanumerico con probabilidad equilibrada.
   */
  generarDesafio(): void {
    const tipo: ChallengeType = Math.random() < 0.5 ? 'math' : 'alphanumeric';
    this.challengeType.set(tipo);

    if (tipo === 'math') {
      this.generarDesafioMatematico();
    } else {
      this.generarDesafioAlfanumerico();
    }

    this.control.reset();
    this.control.enable();
    this.isVerified.set(false);
    this.errorMessage.set('');
    this.resolved.emit(false);
  }

  /**
   * Verifica si la respuesta del usuario coincide con el desafio actual.
   * Emite el resultado al componente padre inmediatamente.
   */
  verificar(): void {
    const valor = this.control.value;

    if (valor === null || valor === undefined || valor === '') {
      this.errorMessage.set('Completa el campo para continuar');
      this.isVerified.set(false);
      this.resolved.emit(false);
      return;
    }

    const esCorrecto = this.challengeType() === 'math'
      ? Number(valor) === this.operandA() + this.operandB()
      : String(valor).toUpperCase().trim() === this.alphanumericValue();

    if (esCorrecto) {
      this.errorMessage.set('');
      this.isVerified.set(true);
      this.control.disable();
      this.resolved.emit(true);
    } else {
      this.errorMessage.set('Respuesta incorrecta, intenta de nuevo');
      this.isVerified.set(false);
      this.resolved.emit(false);
    }
  }

  /** Limpia el error visible cuando el usuario modifica el input. */
  onInput(): void {
    if (this.errorMessage()) {
      this.errorMessage.set('');
    }
  }

  /**
   * Genera dos operandos aleatorios entre 1 y 20 para una suma simple.
   */
  private generarDesafioMatematico(): void {
    this.operandA.set(Math.floor(Math.random() * 20) + 1);
    this.operandB.set(Math.floor(Math.random() * 20) + 1);
  }

  /**
   * Genera una cadena alfanumerica de longitud fija con propiedades
   * de distorsion visual aleatoria para cada caracter.
   */
  private generarDesafioAlfanumerico(): void {
    let cadena = '';
    const chars: DistortedChar[] = [];

    for (let i = 0; i < ALCHA_LENGTH; i++) {
      const c = CHARSET[Math.floor(Math.random() * CHARSET.length)];
      cadena += c;
      chars.push({
        char: c,
        rotation: Math.random() * 16 - 8,
        offsetX: Math.random() * 4 - 2,
        offsetY: Math.random() * 4 - 2,
        fontSize: 18 + Math.floor(Math.random() * 8),
      });
    }

    this.alphanumericValue.set(cadena);
    this.distortedChars.set(Object.freeze(chars));
  }
}
