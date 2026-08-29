export const H3_STABLE_WORKFLOW_NAME = 'H3 Turbo Stable 4V4A';
export const H3_OFFICIAL_WORKFLOW_NAME = 'H3 官方加速优化版';

export const isH3VideoWorkflow = (name: string): boolean => (
  name === H3_STABLE_WORKFLOW_NAME || name === H3_OFFICIAL_WORKFLOW_NAME
);
