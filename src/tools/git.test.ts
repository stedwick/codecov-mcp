import { parseGitUrl } from './git.js';

describe('parseGitUrl', () => {
    test('parses HTTPS GitHub URL', () => {
        const result = parseGitUrl('https://github.com/owner/repo.git');
        expect(result).toEqual({
            service: 'github',
            owner: 'owner',
            repo: 'repo'
        });
    });
});
