export interface GitInfo {
    service: 'github' | 'bitbucket' | 'gitlab' | 'unknown';
    owner: string;
    repo: string;
}
