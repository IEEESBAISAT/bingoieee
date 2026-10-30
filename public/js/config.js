// Embedded Supabase Configuration (Auto-Connected)
const SUPABASE_CONFIG = {
  url: 'https://zkznnmespsqsiiohqnvg.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprem5ubWVzcHNxc2lpb2hxbnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjY0ODQsImV4cCI6MjEwODk0MjQ4NH0.BkbDWJNl-gjDctFrNpl8ZB7yj4eprA6qIQXEUznUT7k',
  
  isConfigured() {
    return true;
  },

  save(url, key) {
    this.url = (url || '').trim();
    this.anonKey = (key || '').trim();
    localStorage.setItem('supabase_url', this.url);
    localStorage.setItem('supabase_key', this.anonKey);
  }
};

window.SUPABASE_CONFIG = SUPABASE_CONFIG;
