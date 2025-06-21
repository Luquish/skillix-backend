module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
    setupFiles: ['dotenv/config'],
    testTimeout: 100000,
    maxWorkers: 1,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};