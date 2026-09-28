module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: 'test/.*\\.spec\\.ts$',
  watchman: false,
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          skipLibCheck: true,
          paths: {
            '@/*': ['./src/*'],
          },
        },
      },
    ],
  },
};
