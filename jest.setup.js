// Jest setup file for global test configuration

// Mock Next.js router if needed (but not required for utility tests)
// jest.mock('next/router', () => ({
//   useRouter() {
//     return {
//       route: '/',
//       pathname: '/',
//       query: {},
//       asPath: '/',
//       push: jest.fn(),
//       pop: jest.fn(),
//       reload: jest.fn(),
//       back: jest.fn(),
//       prefetch: jest.fn().mockResolvedValue(undefined),
//       beforePopState: jest.fn(),
//       events: {
//         on: jest.fn(),
//         off: jest.fn(),
//         emit: jest.fn(),
//       },
//       isFallback: false,
//     };
//   },
// }));

// Set test environment
process.env.NODE_ENV = 'test';

