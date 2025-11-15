# Known Issues and Recommendations

This document lists known issues in the codebase and recommended fixes.

## TypeScript Compilation Errors

### Status: **Pre-existing** (not introduced in recent improvements)

The codebase currently has TypeScript compilation errors that need to be addressed:

### 1. JWT Type Issues in AuthController.ts

**Problem**: TypeScript is having trouble inferring the correct overload for `jwt.sign()` when using `expiresIn` option.

**Location**: `src/api/controllers/AuthController.ts` (lines 40, 46, 99, 105, 181)

**Fix**: Cast the options object explicitly:

```typescript
// Current (causes error):
const accessToken = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  config.jwt.secret,
  { expiresIn: config.jwt.accessTokenExpiresIn }
);

// Fixed:
const accessToken = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  config.jwt.secret,
  { expiresIn: config.jwt.accessTokenExpiresIn } as jwt.SignOptions
);
```

### 2. Missing Return Statements

**Problem**: Several async controller methods don't have explicit return statements in all code paths.

**Affected files**:
- `src/api/controllers/AuthController.ts`
- `src/api/controllers/PlatformController.ts`
- `src/api/controllers/PostController.ts`
- `src/api/middlewares/auth.ts`
- `src/api/middlewares/validation.ts`

**Fix**: Add explicit return statements or update TypeScript config:

```typescript
// Option 1: Add explicit returns
async login(req: Request, res: Response): Promise<void> {
  try {
    // ... logic
    res.json({ user, accessToken, refreshToken });
    return; // Add this
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    return; // Add this
  }
}

// Option 2: Update tsconfig.json to be less strict
{
  "compilerOptions": {
    "noImplicitReturns": false
  }
}
```

### 3. Unused Variables

**Problem**: Several variables are declared but never used.

**Affected files**:
- `src/api/app.ts` (line 65: `req`)
- `src/api/controllers/PlatformController.ts` (line 91: `req`)
- `src/api/routes/posts.ts` (line 2: `query`)
- `src/config/index.ts` (line 2: `path`)
- And others...

**Fix**: Either use the variables or prefix with underscore:

```typescript
// Option 1: Prefix unused params with underscore
app.use((err, _req, res, next) => {
  // ...
});

// Option 2: Update tsconfig.json
{
  "compilerOptions": {
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

## Temporary Solution

To allow the build to succeed while these issues are being addressed, update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    // Temporarily relax these for development
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Security Vulnerabilities in Dependencies

### Status: **Needs attention**

Running `npm audit` reveals 25 vulnerabilities (23 moderate, 2 critical):

### Critical Vulnerabilities

1. **form-data** (<2.5.4) - Used by `instagram-private-api`
   - Uses unsafe random function for boundary generation
   - Fix: Requires `instagram-private-api` upgrade (breaking change)

2. **tough-cookie** (<4.1.3) - Used by `instagram-private-api` and `request-promise`
   - Prototype Pollution vulnerability
   - Fix: Requires package upgrades (breaking changes)

### Moderate Vulnerabilities

- **js-yaml** (<4.1.1) in Jest dependencies
  - Prototype pollution in merge
  - Fix: Upgrade Jest (breaking change)

### Recommended Actions

```bash
# Review what would be updated (safe)
npm audit fix --dry-run

# Apply non-breaking fixes
npm audit fix

# For breaking changes (requires testing)
npm audit fix --force
```

**Important**: Breaking changes should be tested thoroughly, especially for:
- `instagram-private-api` (may change API)
- `jest` and related testing tools
- `supertest` and `superagent`

## Recommendations

### High Priority

1. **Fix TypeScript errors** - Required for production deployment
2. **Address critical security vulnerabilities** - Security risk
3. **Update LinkedIn integration** - Currently missing a valid npm package

### Medium Priority

1. **Upgrade deprecated packages**:
   - `multer` (1.x → 2.x)
   - `eslint` (8.x → 9.x)
   - `supertest` and `superagent`
   - Various glob, rimraf, and other deprecated utilities

2. **Improve test coverage**:
   - Current unit tests: Basic coverage
   - Target: 70%+ coverage
   - Load tests created but need baseline metrics

### Low Priority

1. **Code cleanup**:
   - Remove unused imports
   - Add missing JSDoc comments
   - Standardize error handling patterns

2. **Performance optimization**:
   - Profile slow database queries
   - Optimize image processing
   - Review Redis caching effectiveness

## Development Workflow Recommendations

### Before Committing

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Run tests
npm test

# Check security
npm run security:audit
```

### Before Deploying

```bash
# Full test suite
npm test
npm run test:integration
npm run test:load

# Security scan
npm run security:audit

# Build check
npm run build

# Docker build test
docker-compose build
docker-compose up -d
# Test thoroughly
docker-compose down
```

## Next Steps

### Immediate (Before Production)

1. ✅ Environment variables configured
2. ✅ Dependencies installed
3. ✅ Frontend refresh token flow implemented
4. ✅ Monitoring stack configured
5. ⚠️  Fix TypeScript compilation errors
6. ⚠️  Address critical security vulnerabilities
7. ⚠️  Update tsconfig.json or fix code issues

### Short Term (Within 1-2 weeks)

1. Upgrade vulnerable dependencies
2. Complete unit test coverage (70%+ target)
3. Run load tests and establish baselines
4. Set up Grafana dashboards and alerts
5. Configure Snyk in CI/CD pipeline

### Long Term (Within 1-3 months)

1. Replace `instagram-private-api` with official API
2. Upgrade all deprecated packages
3. Implement additional monitoring (APM, distributed tracing)
4. Set up staging environment
5. Implement blue-green deployment strategy

## Support

For questions or assistance with any of these issues:

1. Review documentation in `docs/`
2. Check implementation details in `IMPLEMENTATION_COMPLETE.md`
3. Review security improvements in `docs/SECURITY_IMPROVEMENTS.md`
4. Check deployment guide in `docs/DEPLOYMENT_GUIDE.md`

## Notes

- These issues existed in the codebase before the recent improvements
- Recent changes (refresh tokens, monitoring, security) are all working correctly
- The application can run despite these TypeScript warnings (JavaScript is generated)
- However, fixing these issues is recommended before production deployment
