
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ehalayholvrcsvszqiuq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoYWxheWhvbHZyY3N2c3pxaXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTQxMDcsImV4cCI6MjA3Njg3MDEwN30.uFjLDf-plu1vmFpKPMPLaNU3MRurSKJDIaHdTi0zh38';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
