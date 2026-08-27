export type Lab = 'LAB_A' | 'LAB_B';

export const LAB_LABELS: Record<Lab, string> = {
  LAB_A: 'Lab A',
  LAB_B: 'Lab B',
};

export const LAB_BADGE_SEVERITY: Record<Lab, 'INFO' | 'SUCCESS'> = {
  LAB_A: 'INFO',
  LAB_B: 'SUCCESS',
};