module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/api/**/*.test.ts', '**/tests/api/**/*.spec.ts'],
    setupFiles: ['dotenv/config'],
    testTimeout: 100000,
    maxWorkers: 1,
};