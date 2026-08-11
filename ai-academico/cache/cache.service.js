const cache = new Map();
const TTL = 2 * 60 * 60 * 1000; // 2 horas

const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL) { cache.delete(key); return null; }
  return entry.data;
};

const set = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const invalidate = (key) => cache.delete(key);

module.exports = { get, set, invalidate };
