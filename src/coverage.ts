import { type GitInfo } from './types/git.types.js';

export interface CoverageParams {
  gitInfo: GitInfo;
  apiKey: string;
}

export async function getCommitCoverageTotals({ gitInfo, apiKey }: CoverageParams) {
  const response = await fetch(`https://api.codecov.io/api/v2/${gitInfo.service}/${gitInfo.owner}/repos/${gitInfo.repo}/totals`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Codecov coverage totals: ${response.statusText}`);
  }

  return await response.json();
}
