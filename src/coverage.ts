import { type GitInfo } from './types/git.types.js';

export interface CoverageParams {
  gitInfo: GitInfo;
  apiKey: string;
}

export async function getCommitCoverageTotals({ gitInfo, apiKey }: CoverageParams) {
  const baseUrl = 'https://api.codecov.io/api/v2';
  const service = encodeURIComponent(gitInfo.service);
  const owner = encodeURIComponent(gitInfo.owner);
  const repo = encodeURIComponent(gitInfo.repo);

  const url = `${baseUrl}/${service}/${owner}/repos/${repo}/totals`;
  const headers: HeadersInit = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch Codecov coverage totals: ${response.statusText}`);
  }

  return await response.json();
}
