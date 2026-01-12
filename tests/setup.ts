import { fc } from 'fast-check';

// Configure fast-check for minimum 100 iterations per property test
fc.configureGlobal({
  numRuns: 100,
  verbose: false,
});
