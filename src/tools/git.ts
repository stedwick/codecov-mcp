import { execSync } from 'child_process';
import { type GitInfo } from '../types/git.types.js';

export function getCurrentGitInfo(): GitInfo {
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();

  // Detect service from URL
  let service: GitInfo['service'] = 'unknown';
  if (remoteUrl.includes('github.com')) {
    service = 'github';
  } else if (remoteUrl.includes('bitbucket.org')) {
    service = 'bitbucket';
  } else if (remoteUrl.includes('gitlab.com')) {
    service = 'gitlab';
  } else {
    throw new Error('Unsupported git service');
  }

  // Extract owner/repo from remote URL (handles both HTTPS and SSH formats)
  const match = remoteUrl.match(/[:/]([^/]+)\/([^/]+?)(\.git)?$/);
  if (!match) {
    throw new Error('Could not parse git remote URL');
  }

  return {
    service,
    owner: match[1],
    repo: match[2],
  };
}

const gitInfo = getCurrentGitInfo();

export { gitInfo };
