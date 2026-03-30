import { useActStore } from '../store/act';

const FREE_MONTHLY_LIMIT = 3;

// Source of truth is the server (user.subscriptionTier + user.projectsThisMonth).
// The server enforces limits on POST /api/projects — this hook is for UI gating only.
export function usePaywall() {
  const user = useActStore((s) => s.user);
  const patchUser = useActStore((s) => s.patchUser);

  const isPlus = user?.subscriptionTier === 'PLUS';
  const projectsThisMonth = user?.projectsThisMonth ?? 0;
  const canStartProject = isPlus || projectsThisMonth < FREE_MONTHLY_LIMIT;
  const remaining = isPlus ? Infinity : Math.max(0, FREE_MONTHLY_LIMIT - projectsThisMonth);

  // Optimistic local unlock — real payment integration replaces this later.
  function activatePlus() {
    patchUser({ subscriptionTier: 'PLUS' });
  }

  return { isPlus, canStartProject, remaining, activatePlus };
}
