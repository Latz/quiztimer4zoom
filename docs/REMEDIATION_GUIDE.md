# Security Remediation Guide - QuizTimer4Zoom

**Last Updated:** 2025-10-28
**Priority:** Critical - Complete before Zoom Beta submission

---

## Quick Start

To fix the most critical vulnerabilities quickly:

```bash
# 1. Install latest security patches
npm audit fix

# 2. Test your application
npm test

# 3. Address any remaining issues (see below)
```

---

## Priority 1: Critical Fixes (Must Do)

### 1.1 Update form-data Package

**Issue:** Unsafe random function for form boundaries (CRITICAL)

**Steps:**
```bash
npm install form-data@latest
```

**Verify:**
```bash
npm audit | grep form-data
```

---

## Priority 2: High-Severity Fixes

### 2.1 Update axios

**Issue:** SSRF vulnerability and DoS attacks

**Steps:**
```bash
npm install axios@latest
```

**Verification:**
```bash
npm audit | grep axios
```

---

### 2.2 Remove Sensitive Data Logging

**File:** `api/index.js`
**Line:** 65

**Current Code:**
```javascript
console.log('Cookies: ', decodeURI(req.cookies.verifier));
```

**Fix:** Replace with non-sensitive logging
```javascript
// REMOVED: Do not log authentication tokens
console.log('Auth request processed');
```

**Impact:** Prevents exposure of authentication credentials in logs

---

### 2.3 Add Security Headers

**File:** `api/index.js`

**Install helmet.js:**
```bash
npm install helmet
```

**Update your Express app (around line 29):**
```javascript
import helmet from 'helmet';

const app = express();

// Add security headers
app.use(helmet());

// Rest of your middleware...
app.use(express.static(path.join(__dirname, '.')));
```

**Alternatively, add headers manually:**
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

---

### 2.4 Fix Cookie Configuration

**File:** `api/index.js`
**Lines:** 45-51

**Current Code:**
```javascript
let session = cookieSession({
  name: 'session',
  httpOnly: true,
  keys: [zoomApp.sessionSecret],
  maxAge: 24 * 60 * 60 * 1000,
  secure: process.env.NODE_ENV === 'production',
});
```

**Fixed Code:**
```javascript
let session = cookieSession({
  name: 'session',
  httpOnly: true,
  secure: true, // Always use HTTPS
  sameSite: 'Strict', // Prevent CSRF
  keys: [zoomApp.sessionSecret],
  maxAge: 24 * 60 * 60 * 1000,
});
```

**Why:**
- `secure: true` ensures cookies only sent over HTTPS
- `sameSite: 'Strict'` prevents CSRF attacks

---

## Priority 3: Medium-Severity Fixes

### 3.1 Fix Environment Loading

**File:** `api/index.js`
**Lines:** 18-20

**Current Code:**
```javascript
if (os.hostname() === 'pascal') {
  dotenv.config();
}
```

**Fixed Code:**
```javascript
// Load environment variables consistently
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}
```

**Or better:**
```javascript
// Load .env in all environments
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
```

---

### 3.2 Fix Static File Serving

**File:** `api/index.js`
**Lines:** 30, 76

**Current Code:**
```javascript
app.use(express.static(path.join(__dirname, '.')));
// ...
app.use(express.static(path.join(__dirname, 'scripts')));
```

**Fixed Code:**
```javascript
// Only serve specific directories
app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts'), {
  dotfiles: 'deny' // Prevent access to hidden files
}));
```

**Steps:**
1. Create a `public/` directory
2. Move safe static files there
3. Keep sensitive files outside the served directories

---

### 3.3 Add CSRF Protection

**Install express-csrf-protect:**
```bash
npm install express-csrf-protect
```

**Add to your app:**
```javascript
import csrf from 'express-csrf-protect';

const app = express();

// After session middleware
app.use(session);
app.use(csrf());

// Add CSRF token to responses
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
```

---

## Priority 4: Dependency Updates

### 4.1 Update All Vulnerable Packages

Run the following command (be cautious with breaking changes):

```bash
npm audit fix --force
```

**After running, test thoroughly:**
```bash
npm test
npm start
```

**If issues occur, revert specific packages:**
```bash
npm install package-name@previous-version
```

### 4.2 Manual Updates for Breaking Changes

Some packages may have breaking changes. Update them individually:

```bash
# Cross-spawn
npm install cross-spawn@latest

# Path-to-regexp
npm install path-to-regexp@latest

# Semver
npm install semver@latest

# Others
npm install debug@latest
npm install tar@latest
npm install undici@latest
```

---

## Testing Checklist

After making security fixes, verify:

- [ ] Application starts without errors: `npm start`
- [ ] All routes work: Test `/`, `/install`, `/auth`
- [ ] Cookies are set correctly (check browser DevTools)
- [ ] No security warnings in browser console
- [ ] No sensitive data in server logs
- [ ] Environment variables load correctly
- [ ] Static files serve from correct directories
- [ ] HTTPS redirects work (if configured)

---

## Verification Commands

### Check for remaining vulnerabilities:
```bash
npm audit
npm audit --audit-level=moderate
```

### Check security headers:
```bash
# Test locally with curl
curl -i http://localhost:3000
# Check for security headers in response
```

### Verify cookie settings:
```javascript
// In browser console, check:
document.cookie
// Should see: secure, httponly flags
```

---

## Rollback Plan

If updates break your application:

1. **Revert changes:**
   ```bash
   git checkout package.json package-lock.json
   npm install
   ```

2. **Update packages individually:**
   ```bash
   npm install vulnerable-package@latest
   npm test
   ```

3. **Document incompatibilities:**
   If a package isn't compatible, document it and plan upgrade separately

---

## Additional Security Hardening

### 4.1 Add Request Validation

```javascript
import { query, body, validationResult } from 'express-validator';

app.get('/auth',
  query('code').isString().notEmpty(),
  session,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... proceed with auth
  }
);
```

### 4.2 Add Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 4.3 Add Input Sanitization

```bash
npm install express-sanitizer
```

---

## Compliance Checklist

- [ ] All critical vulnerabilities fixed
- [ ] Sensitive data logging removed
- [ ] Security headers added
- [ ] CSRF protection implemented
- [ ] Cookies properly configured
- [ ] Static files restricted
- [ ] Dependencies updated
- [ ] Tests pass
- [ ] Code review completed

---

## Before Submitting to Zoom

1. **Complete all Priority 1 & 2 fixes**
2. **Run full test suite**
3. **Perform security scan again:**
   ```bash
   npm audit
   ```
4. **Verify no high/critical vulnerabilities remain**
5. **Document changes in commit messages**
6. **Test in staging environment**

---

## Documentation to Prepare for Zoom

After fixes are complete, prepare:

1. **SSDLC Documentation** - Security Development Lifecycle
2. **Privacy Policy** - Data handling and storage
3. **Security Policy** - Security procedures and guidelines
4. **Incident Response Plan** - How you handle security incidents
5. **Vulnerability Management** - How you track/fix vulnerabilities

---

## Questions?

- **npm audit documentation:** https://docs.npmjs.com/cli/v9/commands/npm-audit
- **Express Security:** https://expressjs.com/en/advanced/best-practice-security.html
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/

---

## Contact Information

For questions or assistance with security remediation:
- **Company:** Fuzzy Monster
- **Email:** info@fuzzy.monster
- **Security Contact:** security@fuzzy.monster
- **Website:** https://fuzzy.monster

---

**Last Updated:** 2025-10-28
**Next Review:** After fixes are applied
**Prepared By:** Latz
