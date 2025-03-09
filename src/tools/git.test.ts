const { execSync } = require('child_process');

test('git remote get-url origin', () => {
    const output = execSync('git remote get-url origin').toString().trim();
    expect(output).toMatch(/^(https:\/\/|git@).*\.git$/);
});
