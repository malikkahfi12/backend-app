export type DatabaseHealth = {
  status: 'ok' | 'down';
  postgis: 'enabled' | 'unknown';
};
