import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ewscpnsiwnkyxhhcyzfl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3c2NwbnNpd25reXhoaGN5emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNzQxNzQsImV4cCI6MjA5NTg1MDE3NH0.wNUwIj9qffazuSWTKaIUkma0H-jIDx_Mn07ZrSqi7AA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
