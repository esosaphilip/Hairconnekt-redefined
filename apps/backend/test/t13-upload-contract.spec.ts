import * as fs from 'fs';
import * as path from 'path';

describe('T13: Upload Field-Name Contract (static, no database)', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const backendSrc = path.join(rootDir, 'apps/backend/src');
  const mobileSrc = path.join(rootDir, 'apps/mobile/src');
  const adminSrc = path.join(rootDir, 'apps/admin/src');

  function findFiles(dir: string, pattern: RegExp): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...findFiles(fullPath, pattern));
      } else if (pattern.test(file)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  function extractBackendInterceptors(): Set<string> {
    const files = findFiles(backendSrc, /\.(ts|js)$/);
    const interceptors = new Set<string>();

    const regex = /File(?:s)?Interceptor\s*\(\s*['"]([^'"]+)['"]/g;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = regex.exec(content)) !== null) {
        interceptors.add(match[1]);
      }
    }
    return interceptors;
  }

  function extractFrontendFormDataUploadFields(): { mobileFields: Set<string>; adminFields: Set<string> } {
    const mobileFiles = findFiles(mobileSrc, /\.(ts|tsx|js|jsx)$/);
    const adminFiles = findFiles(adminSrc, /\.(ts|tsx|js|jsx)$/);

    const mobileFields = new Set<string>();
    const adminFields = new Set<string>();

    const regex = /\.append\s*\(\s*['"]([^'"]+)['"]/g;

    for (const file of mobileFiles) {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = regex.exec(content)) !== null) {
        mobileFields.add(match[1]);
      }
    }

    for (const file of adminFiles) {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = regex.exec(content)) !== null) {
        adminFields.add(match[1]);
      }
    }

    return { mobileFields, adminFields };
  }

  it('asserts every file field appended by front-ends exists in backend controllers', () => {
    const backendInterceptors = extractBackendInterceptors();
    const { mobileFields, adminFields } = extractFrontendFormDataUploadFields();

    // Known file upload field names expected in mobile / admin
    const knownFileFields = ['avatar', 'idDocument', 'portfolio', 'chatMedia', 'styleImage'];

    // Verify all known file upload fields exist in backend interceptors
    for (const field of knownFileFields) {
      expect(backendInterceptors.has(field)).toBe(true);
    }

    // Verify mobile file uploads match backend interceptors
    for (const field of mobileFields) {
      // Skip non-file form fields like 'caption', 'styleTags', 'status', 'limit', 'page'
      if (['caption', 'styleTags', 'status', 'limit', 'page', 'providerId', 'clientId'].includes(field)) {
        continue;
      }
      expect(backendInterceptors.has(field)).toBe(true);
    }

    // Verify admin file uploads match backend interceptors
    for (const field of adminFields) {
      expect(backendInterceptors.has(field)).toBe(true);
    }
  });

  it('validates upload size limits and allowed file types across endpoints', () => {
    // 1. Providers controller limits
    const providersControllerPath = path.join(backendSrc, 'providers/providers.controller.ts');
    const providersContent = fs.readFileSync(providersControllerPath, 'utf8');

    expect(providersContent).toContain('5 * 1024 * 1024');
    expect(providersContent).toContain('10 * 1024 * 1024');
    expect(providersContent).toContain('jpeg');
    expect(providersContent).toContain('png');

    // 2. Portfolio controller limits
    const portfolioControllerPath = path.join(backendSrc, 'portfolio/portfolio.controller.ts');
    const portfolioContent = fs.readFileSync(portfolioControllerPath, 'utf8');

    expect(portfolioContent).toContain('10 * 1024 * 1024');
    expect(portfolioContent).toContain('FileTypeValidator');
  });
});
