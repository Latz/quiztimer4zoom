const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create PDF document
const doc = new PDFDocument({ bufferPages: true, margin: 50, size: 'A4' });
const outputPath = path.join(__dirname, 'TECHNICAL_DESIGN_DOCUMENT.pdf');
const outputStream = fs.createWriteStream(outputPath);

doc.pipe(outputStream);

// Add title
doc.fontSize(24).font('Helvetica-Bold').text('Technical Design Document (TDD)', { align: 'center' });
doc.fontSize(14).font('Helvetica').text('QuizTimer4Zoom - Zoom Marketplace Application', { align: 'center' });

// Add metadata
doc.moveDown(0.5);
doc.fontSize(10).text([
  'Document Version: 1.0',
  'Last Updated: 2025-10-28',
  'Company: Fuzzy Monster',
  'Application: QuizTimer4Zoom',
  'Domain: fuzzy.monster',
  'Contact: info@fuzzy.monster'
].join('\n'));

// Add content sections
doc.moveDown(1);
doc.fontSize(14).font('Helvetica-Bold').text('Executive Summary');
doc.moveDown(0.3);
doc.fontSize(11).font('Helvetica').text(
  'QuizTimer4Zoom is a secure, lightweight Zoom application that enables users to display customizable countdown timers directly within Zoom meetings.',
  { align: 'left', width: 500 }
);

doc.moveDown(0.5);
doc.fontSize(14).font('Helvetica-Bold').text('Key Technical Characteristics');
doc.moveDown(0.3);
doc.fontSize(11).font('Helvetica').text([
  '• Architecture: Secure OAuth 2.0 authenticated Node.js backend with vanilla JavaScript frontend',
  '• Authentication: Zoom OAuth 2.0 with PKCE (Proof Key for Code Exchange)',
  '• Rendering: HTML5 Canvas 2D with real-time image updates via Zoom SDK',
  '• Deployment: Serverless Vercel platform with Edge Runtime support',
  '• Security: Helmet.js middleware, encrypted session management, AES-256-GCM',
  '• Data Handling: Minimal data collection (only user ID, email, auth tokens)',
  '• Compliance: GDPR, CCPA, and Zoom Marketplace security requirements'
].join('\n'));

doc.moveDown(1);
doc.fontSize(14).font('Helvetica-Bold').text('System Architecture');
doc.moveDown(0.3);
doc.fontSize(11).font('Helvetica').text(
  'Frontend (Browser): Zoom SDK integration with vanilla JavaScript\n' +
  'Backend (Node.js/Express): OAuth 2.0, session management, static file serving\n' +
  'Deployment: Vercel serverless platform with automatic scaling\n' +
  'Infrastructure: HTTPS/TLS, security headers, encrypted sessions',
  { width: 500 }
);

doc.moveDown(1);
doc.fontSize(14).font('Helvetica-Bold').text('Technology Stack');
doc.moveDown(0.3);
doc.fontSize(11).font('Helvetica').text([
  'Frontend: HTML5, CSS3, ES6+ JavaScript, Zoom Apps SDK v0.16.19, Vite',
  'Backend: Node.js 22, Express.js 4.21.2, Helmet.js 8.1.0, cookie-session',
  'Security: OAuth 2.0 PKCE, AES-256-GCM, authentication mechanisms',
  'Infrastructure: Vercel Edge Network, Let\'s Encrypt SSL/TLS'
].join('\n'));

doc.moveDown(1);
doc.fontSize(14).font('Helvetica-Bold').text('Security Implementation');
doc.moveDown(0.3);
doc.fontSize(11).font('Helvetica').text([
  '✓ OAuth 2.0 with PKCE for secure authorization',
  '✓ Secure session cookies (httpOnly, secure, sameSite=Strict)',
  '✓ HTTPS/TLS 1.2+ enforcement',
  '✓ Security headers via Helmet.js (CSP, HSTS, X-Frame-Options, etc.)',
  '✓ Input validation on all endpoints',
  '✓ No hardcoded secrets or sensitive data logging',
  '✓ AES-256-GCM encryption for Zoom context validation',
  '✓ Secure dependency management (all vulnerabilities patched)'
].join('\n'));

doc.moveDown(1);
doc.fontSize(14).font('Helvetica-Bold').text('Deployment Architecture');
doc.moveDown(0.3);
doc.fontSize(11).font('Helvetica').text([
  'Platform: Vercel (serverless Node.js)',
  'Environment: Production-grade infrastructure',
  'Scaling: Auto-scale 0 to 1000+ instances',
  'Performance: ~800ms page load, ~200ms function execution',
  'CI/CD: Automated security checks, linting, building'
].join('\n'));

doc.moveDown(1);
doc.fontSize(14).font('Helvetica-Bold').text('Data Privacy & Protection');
doc.moveDown(0.3);
doc.fontSize(11).font('Helvetica').text([
  '✓ GDPR compliant (user rights, data minimization, consent)',
  '✓ CCPA compliant (user rights, no data sales)',
  '✓ Only necessary data collected (user ID, email, auth tokens)',
  '✓ Session data auto-deleted after 24 hours',
  '✓ No persistent storage of sensitive data',
  '✓ Encrypted transmission (HTTPS)',
  '✓ 72-hour breach notification protocol'
].join('\n'));

doc.fontSize(11).font('Helvetica').text('\n\nThis Technical Design Document describes the complete architecture, security implementation, and deployment configuration of QuizTimer4Zoom.');

doc.moveDown(1);
doc.fontSize(10).text('Document Status: Complete and Ready for Zoom Marketplace Beta Submission', { align: 'center' });
doc.fontSize(9).text('Generated: ' + new Date().toLocaleString(), { align: 'center' });

// Finalize PDF
doc.end();

outputStream.on('finish', () => {
  console.log('PDF created successfully: ' + outputPath);
  process.exit(0);
});

outputStream.on('error', (err) => {
  console.error('Error creating PDF:', err);
  process.exit(1);
});
