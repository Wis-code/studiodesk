export function projectHealth(project) {
  if (project.blockedReason) return { key: 'blocked', label: 'Blocked', reason: project.blockedReason };
  const deadline = new Date(project.deadline).getTime();
  const now = Date.now();
  if (deadline < now && project.progress < 100) return { key: 'overdue', label: 'Overdue', reason: 'Deadline has passed' };
  const hours = (deadline - now) / 36e5;
  if (hours < 36 && project.progress < 75) return { key: 'risk', label: 'At risk', reason: 'Deadline is near for current progress' };
  return { key: 'healthy', label: 'Healthy', reason: 'Project is moving normally' };
}

export function canReleaseFinal(project) {
  return Boolean(project.clientApproved && project.balance <= 0 && project.deliverablesComplete);
}

export function closeProject(project) {
  if (!canReleaseFinal(project) || !project.finalDelivered) return { ok: false, reason: 'Approval, payment, deliverables and final delivery are required.' };
  return {
    ok: true,
    project: {
      ...project,
      status: 'closed',
      archivedAt: new Date().toISOString(),
      hiddenPastProject: true,
      contributionSnapshot: [...(project.contributors || [])],
    }
  };
}
