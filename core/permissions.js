export const ROLE_PERMISSIONS = {
  owner: new Set(['*']),
  admin: new Set(['projects.read','projects.write','clients.read','clients.write','tasks.manage','reviews.manage','team.read','finance.read','documents.manage','portfolio.manage']),
  lead: new Set(['projects.read','projects.write','clients.read','tasks.manage','reviews.manage','team.read','portfolio.read']),
  designer: new Set(['assigned.read','tasks.update','drafts.upload','progress.report','research.read','portfolio.own']),
  finance: new Set(['finance.read','finance.write','invoices.manage','payments.manage','clients.read']),
  client: new Set(['portal.read','reviews.comment','reviews.approve','brief.submit','delivery.read']),
};

export function can(role, permission) {
  const grants = ROLE_PERMISSIONS[role] || new Set();
  return grants.has('*') || grants.has(permission);
}
