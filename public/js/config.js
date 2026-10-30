// Configuration for Supabase & Backend Services
// You can enter your Supabase Project URL and Anon Key here,
// or configure them live from the Admin Dashboard settings modal!

const SUPABASE_CONFIG = {
  // Replace these with your Supabase Project details:
  url: window.ENV_SUPABASE_URL || localStorage.getItem('supabase_url') || '',
  anonKey: window.ENV_SUPABASE_ANON_KEY || localStorage.getItem('supabase_key') || '',
  
  // Is Supabase currently configured?
  isConfigured() {
    return Boolean(this.url && this.anonKey && this.url.startsWith('https://'));
  },

  // Save new credentials
  save(url, key) {
    this.url = (url || '').trim();
    this.anonKey = (key || '').trim();
    localStorage.setItem('supabase_url', this.url);
    localStorage.setItem('supabase_key', this.anonKey);
  }
};

window.SUPABASE_CONFIG = SUPABASE_CONFIG;
