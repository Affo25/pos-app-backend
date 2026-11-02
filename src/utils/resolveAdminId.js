/**
 * Tenant owner id for multi-tenant queries.
 * Treats admin + superAdmin as owners; staff use their admin_id.
 */
function resolveAdminId(user) {
  if (!user) return null;
  if (user.user_type === 'admin' || user.user_type === 'superAdmin') {
    return user._id;
  }
  return user.admin_id || user._id || null;
}

module.exports = { resolveAdminId };
