import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@env/environment';
import { Database } from '../models/database.types';

/**
 * Cliente singleton de Supabase para toda la aplicacion.
 *
 * Centraliza la creacion del cliente SDK utilizando las credenciales
 * del environment y el tipado estricto del modelo Database.
 * Todos los servicios dependen de esta instancia unica.
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly client: SupabaseClient<Database>;

  constructor() {
    this.client = createClient<Database>(
      environment.supabaseUrl,
      environment.supabaseKey,
    );
  }

  /** Instancia tipada del cliente Supabase para operaciones de Auth, Database y Storage. */
  get supabase(): SupabaseClient<Database> {
    return this.client;
  }
}
