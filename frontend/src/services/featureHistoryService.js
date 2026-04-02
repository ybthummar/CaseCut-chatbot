const keyByUser = (scope, userId) => `${scope}_${userId || 'guest'}`;

const safeRead = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const safeWrite = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getSummaryHistory = (userId) => safeRead(keyByUser('summary_history', userId));

export const addSummaryHistory = (userId, entry) => {
  const key = keyByUser('summary_history', userId);
  const current = safeRead(key);
  const next = [entry, ...current].slice(0, 40);
  safeWrite(key, next);
  return next;
};

export const getPrecedentHistory = (userId) => safeRead(keyByUser('precedent_history', userId));

export const addPrecedentHistory = (userId, entry) => {
  const key = keyByUser('precedent_history', userId);
  const current = safeRead(key);
  const next = [entry, ...current].slice(0, 60);
  safeWrite(key, next);
  return next;
};
