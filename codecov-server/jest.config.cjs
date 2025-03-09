/** @type {import('jest').Config} */
const config = {
    transform: {
        '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest',
    },
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.mjs'],
    verbose: true,
    transformIgnorePatterns: [
        '/node_modules/(?!(@modelcontextprotocol)/)'
    ]
};

module.exports = config;
