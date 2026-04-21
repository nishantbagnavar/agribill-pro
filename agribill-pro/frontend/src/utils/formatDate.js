import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

const parse = (d) => (typeof d === 'string' ? parseISO(d) : new Date(d));

export const formatDate = (d, fmt = 'dd MMM yyyy') => {
  const date = parse(d);
  return isValid(date) ? format(date, fmt) : '—';
};

export const formatDateTime = (d) => formatDate(d, 'dd MMM yyyy, hh:mm a');

export const timeAgo = (d) => {
  const date = parse(d);
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : '—';
};

export const daysUntil = (d) => {
  const date = parse(d);
  if (!isValid(date)) return null;
  return Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
};
