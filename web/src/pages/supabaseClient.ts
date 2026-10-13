import { createClient } from '@supabase/supabase-js'

// Zde použij ty stejné údaje, co máš v Pythonu, ALE:
// Klíč musí být ten "anon" (public), NE service_role!
// Service_role patří jen na backend (Python), do Reactu patří anon.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jkmcddesnvjemymfsure.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.warn('⚠️ Supabase anon klíč nebyl nalezen v proměnných prostředí (VITE_SUPABASE_ANON_KEY). Vytvořte soubor web/.env.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);