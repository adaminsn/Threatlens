// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Mapping status DB ke level feed
const statusToLevel = (status) => {
  switch (status) {
    case 'dangerous':  return 'high';
    case 'suspicious': return 'med';
    case 'safe':       return 'low';
    default:           return 'low';
  }
};

// Format threat untuk response API
const formatThreat = (t) => {
  return {
    id:          t.id,
    user_id:     t.user_id,
    title:       t.title,
    target:      t.indicator,
    indicator:   t.indicator,
    type:        t.type,
    category:    t.category,
    description: t.description,
    status:      t.status,
    level:       statusToLevel(t.status),
    verified:    !!t.verified,
    verification_count: t.verification_count || 0,
    verification_list: t.verification_list || '[]',
    virustotal_result: t.virustotal_result,
    user:        t.username || 'Unknown',
    username:    t.username || 'Unknown',
    votes:       Number(t.vote_count    || 0),
    comments:    Number(t.comment_count || 0),
    createdAt:   t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID', {
                   day: 'numeric', month: 'long', year: 'numeric',
                   hour: '2-digit', minute: '2-digit'
                 }) : '',
    created_at:  t.created_at,
  };
};

// Escape HTML untuk XSS protection
const escapeHtml = (str) => {
  if (!str) return '';
  return str.replace(/[&<>]/g, (m) => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
};

// Format tanggal
const formatDate = (dateStr) => {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr || '';
  }
};

module.exports = { statusToLevel, formatThreat, escapeHtml, formatDate };