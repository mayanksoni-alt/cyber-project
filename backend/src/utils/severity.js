// Severity levels and scoring helpers.

export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
};

// How many points each finding subtracts from a perfect score of 100.
const WEIGHT = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

export function scoreFindings(findings) {
  let score = 100;
  for (const f of findings) score -= WEIGHT[f.severity] ?? 0;
  score = Math.max(0, Math.min(100, score));

  let grade = 'A';
  if (score < 50) grade = 'F';
  else if (score < 65) grade = 'D';
  else if (score < 80) grade = 'C';
  else if (score < 90) grade = 'B';

  return { score, grade };
}

export function summarize(findings) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: findings.length };
  for (const f of findings) summary[f.severity] = (summary[f.severity] || 0) + 1;
  return summary;
}
