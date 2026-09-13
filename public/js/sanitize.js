const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

export function safeImageUrl(value = '') {
  try {
    const url = new URL(value, window.location.origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : FALLBACK_IMAGE;
  } catch {
    return FALLBACK_IMAGE;
  }
}
