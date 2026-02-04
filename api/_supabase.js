const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function getSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase env vars missing");
  }
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}

async function supabaseFetch(path, { method = "GET", body, query = "", prefer } = {}) {
  const { url, key } = getSupabaseConfig();
  const endpoint = `${url}/rest/v1/${path}${query}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  if (prefer) {
    headers.Prefer = prefer;
  }
  const options = { method, headers };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(endpoint, options);
  return response;
}

module.exports = {
  getSupabaseConfig,
  supabaseFetch
};
