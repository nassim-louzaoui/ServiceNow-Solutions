export function relTime(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export function statusClass(status) {
  if (!status) return 'neutral';
  const s = status.toLowerCase();
  if (s === 'success' || s === 'completed' || s === 'complete') return 'success';
  if (s === 'running' || s === 'in_progress' || s === 'in progress') return 'running';
  if (s === 'failed' || s === 'error' || s === 'failure') return 'failed';
  if (s === 'pending' || s === 'queued' || s === 'waiting') return 'pending';
  if (s === 'warning' || s === 'warn') return 'warning';
  return 'neutral';
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export const ROLE_LABELS = {
  admin: 'Administrator',
  leadership: 'Leadership',
  creator: 'Creator',
  user: 'User',
};
