/**
 * Caché en memoria simple para respuestas GET.
 * TTL por defecto 60s. Usa Map + expiry. Suficiente para 500 productos (~2MB).
 * Invalida en escrituras (POST/PUT/DELETE) para no servir datos viejos.
 */
const store = new Map();

function now() { return Date.now(); }

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  const ttl = typeof ttlMs === 'number' ? ttlMs : 60 * 1000;
  store.set(key, { value, expiry: now() + ttl });
}

function delByPrefix(prefix) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

function clear() {
  store.clear();
}

function size() { return store.size; }

module.exports = { get, set, delByPrefix, clear, size };
