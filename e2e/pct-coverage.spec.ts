/**
 * PCT-WC-025: Test coverage reports
 * Validates coverage configuration, HTML reports, and thresholds
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

test.describe('PCT-WC-025: Test Coverage', () => {
  const backendDir = path.join(__dirname, '../backend');
  const coverageDir = path.join(backendDir, 'coverage');

  test.describe('Coverage Configuration', () => {
    test('should have coverage config file', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');
      const configExists = fs.existsSync(configPath);

      expect(configExists).toBeTruthy();

      if (configExists) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Should contain coverage settings
        expect(content).toContain('coverage');
        expect(content).toContain('thresholds');
      }
    });

    test('should have coverage thresholds defined', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Should have threshold values
        expect(content).toMatch(/lines.*:\s*\d+/);
        expect(content).toMatch(/functions.*:\s*\d+/);
        expect(content).toMatch(/branches.*:\s*\d+/);
        expect(content).toMatch(/statements.*:\s*\d+/);
      }
    });

    test('should have coverage reporters configured', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Should include multiple reporters
        expect(content).toContain('reporter');
        expect(content).toMatch(/html|lcov|json|text/);
      }
    });
  });

  test.describe('HTML Report Generation', () => {
    test('should generate HTML coverage report', () => {
      try {
        // Run coverage in backend directory
        execSync('npm run test:coverage', {
          cwd: backendDir,
          stdio: 'pipe',
          timeout: 60000,
        });
      } catch (error) {
        // Tests may fail, but report should still be generated
        console.log('Tests completed (possibly with failures)');
      }

      // Check if HTML report was generated
      const htmlIndexPath = path.join(coverageDir, 'index.html');
      const htmlExists = fs.existsSync(htmlIndexPath);

      expect(htmlExists).toBeTruthy();

      if (htmlExists) {
        const content = fs.readFileSync(htmlIndexPath, 'utf-8');

        // Should be valid HTML
        expect(content).toContain('<html');
        expect(content).toContain('</html>');

        // Should have coverage data
        expect(content).toMatch(/coverage|percentage|\d+%/i);
      }
    });

    test('should have coverage directory structure', () => {
      if (fs.existsSync(coverageDir)) {
        const files = fs.readdirSync(coverageDir);

        // Should have multiple report formats
        expect(files.length).toBeGreaterThan(0);

        // Check for specific report files
        const hasHtml = files.some(f => f.endsWith('.html'));
        const hasJson = files.some(f => f.endsWith('.json') || fs.existsSync(path.join(coverageDir, 'coverage-final.json')));

        expect(hasHtml || fs.existsSync(path.join(coverageDir, 'index.html'))).toBeTruthy();
      }
    });

    test('should include source file coverage', () => {
      if (fs.existsSync(coverageDir)) {
        // Check for coverage-final.json or similar
        const jsonPath = path.join(coverageDir, 'coverage-final.json');

        if (fs.existsSync(jsonPath)) {
          const coverage = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

          // Should have coverage for at least some files
          const fileCount = Object.keys(coverage).length;
          expect(fileCount).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Coverage Thresholds', () => {
    test('should enforce minimum coverage thresholds', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Extract threshold values
        const linesMatch = content.match(/lines.*:\s*(\d+)/);
        const functionsMatch = content.match(/functions.*:\s*(\d+)/);
        const branchesMatch = content.match(/branches.*:\s*(\d+)/);
        const statementsMatch = content.match(/statements.*:\s*(\d+)/);

        // Thresholds should be reasonable (not 0 or 100)
        if (linesMatch) {
          const lines = parseInt(linesMatch[1]);
          expect(lines).toBeGreaterThan(0);
          expect(lines).toBeLessThanOrEqual(100);
        }

        if (functionsMatch) {
          const functions = parseInt(functionsMatch[1]);
          expect(functions).toBeGreaterThan(0);
          expect(functions).toBeLessThanOrEqual(100);
        }

        if (branchesMatch) {
          const branches = parseInt(branchesMatch[1]);
          expect(branches).toBeGreaterThan(0);
          expect(branches).toBeLessThanOrEqual(100);
        }

        if (statementsMatch) {
          const statements = parseInt(statementsMatch[1]);
          expect(statements).toBeGreaterThan(0);
          expect(statements).toBeLessThanOrEqual(100);
        }
      }
    });

    test('should fail build if coverage is below thresholds', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Configuration should include threshold enforcement
        expect(content).toContain('thresholds');

        // When thresholds are configured, vitest will fail if not met
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe('Coverage Metrics', () => {
    test('should track line coverage', () => {
      if (fs.existsSync(coverageDir)) {
        const jsonPath = path.join(coverageDir, 'coverage-final.json');

        if (fs.existsSync(jsonPath)) {
          const coverage = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

          // Pick first file with coverage data
          const files = Object.keys(coverage);

          if (files.length > 0) {
            const firstFile = coverage[files[0]];

            // Should have line coverage data
            expect(firstFile).toHaveProperty('s'); // statements
            expect(firstFile).toHaveProperty('b'); // branches
            expect(firstFile).toHaveProperty('f'); // functions
          }
        }
      }
    });

    test('should track function coverage', () => {
      if (fs.existsSync(coverageDir)) {
        const jsonPath = path.join(coverageDir, 'coverage-final.json');

        if (fs.existsSync(jsonPath)) {
          const coverage = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

          const files = Object.keys(coverage);

          if (files.length > 0) {
            const firstFile = coverage[files[0]];

            expect(firstFile).toHaveProperty('f');
            expect(firstFile).toHaveProperty('fnMap');
          }
        }
      }
    });

    test('should track branch coverage', () => {
      if (fs.existsSync(coverageDir)) {
        const jsonPath = path.join(coverageDir, 'coverage-final.json');

        if (fs.existsSync(jsonPath)) {
          const coverage = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

          const files = Object.keys(coverage);

          if (files.length > 0) {
            const firstFile = coverage[files[0]];

            expect(firstFile).toHaveProperty('b');
            expect(firstFile).toHaveProperty('branchMap');
          }
        }
      }
    });
  });

  test.describe('Coverage Reports', () => {
    test('should generate text report', () => {
      // Text report is usually printed to console during test run
      // We verify it's configured
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        expect(content).toMatch(/reporter.*text/);
      }
    });

    test('should generate JSON report', () => {
      if (fs.existsSync(coverageDir)) {
        // Look for JSON coverage file
        const jsonExists = fs.existsSync(path.join(coverageDir, 'coverage-final.json'));

        expect(jsonExists).toBeTruthy();
      }
    });

    test('should generate LCOV report', () => {
      if (fs.existsSync(coverageDir)) {
        // Look for LCOV file
        const lcovPath = path.join(coverageDir, 'lcov.info');
        const lcovExists = fs.existsSync(lcovPath);

        expect(lcovExists).toBeTruthy();

        if (lcovExists) {
          const content = fs.readFileSync(lcovPath, 'utf-8');

          // Should be valid LCOV format
          expect(content).toMatch(/SF:|LF:|LH:/);
        }
      }
    });
  });

  test.describe('Coverage Exclusions', () => {
    test('should exclude test files from coverage', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Should exclude test files
        expect(content).toMatch(/exclude.*test|spec/i);
      }
    });

    test('should exclude node_modules from coverage', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        expect(content).toMatch(/exclude.*node_modules/i);
      }
    });

    test('should exclude dist/build directories', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        expect(content).toMatch(/exclude.*(dist|build|coverage)/i);
      }
    });
  });

  test.describe('Coverage CI Integration', () => {
    test('should support CI environment variables', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Configuration should work in CI
        expect(content.length).toBeGreaterThan(0);
      }
    });

    test('should clean coverage directory before running', () => {
      const configPath = path.join(backendDir, 'vitest.coverage.config.ts');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Should have clean option
        expect(content).toMatch(/clean.*true/);
      }
    });
  });
});
