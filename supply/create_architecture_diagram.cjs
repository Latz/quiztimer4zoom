#!/usr/bin/env node

const PDFDocument = require('pdfkit');
const fs = require('fs');

// Create PDF document - landscape
const doc = new PDFDocument({
  size: 'A3',
  margin: 30,
  bufferPages: true,
  layout: 'landscape'
});

const outputPath = 'ARCHITECTURE_DIAGRAM.pdf';
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Color scheme
const colors = {
  primary: '#0066CC',
  secondary: '#0088DD',
  accent: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FFA500',
  info: '#2196F3',
  text: '#333333',
  border: '#CCCCCC',
  lightBg: '#F5F5F5'
};

// Helper to draw rounded rectangle
function drawRoundedBox(x, y, w, h, r = 5) {
  doc.moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y);
}

// Helper to draw component box
function drawComponentBox(x, y, width, height, title, description, bgColor, textColor = '#FFFFFF') {
  // Background
  doc.fillColor(bgColor);
  drawRoundedBox(x, y, width, height, 4);
  doc.fill();

  // Border
  doc.strokeColor(colors.border);
  doc.lineWidth(1.5);
  drawRoundedBox(x, y, width, height, 4);
  doc.stroke();

  // Title
  doc.fontSize(10).font('Helvetica-Bold').fillColor(textColor);
  doc.text(title, x + 8, y + 8, { width: width - 16, height: 20 });

  // Description
  doc.fontSize(7).font('Helvetica').fillColor(textColor);
  doc.text(description, x + 8, y + 28, {
    width: width - 16,
    height: height - 36,
    align: 'left'
  });
}

// Helper to draw arrow
function drawArrowLine(fromX, fromY, toX, toY, label = '', style = 'solid') {
  const lineY = (fromY + toY) / 2;

  // Draw line
  doc.strokeColor(colors.border);
  doc.lineWidth(1.5);

  if (style === 'dashed') {
    doc.dash(4, { space: 2 });
  }

  doc.moveTo(fromX, fromY)
    .quadraticCurveTo(fromX, lineY, toX, toY)
    .stroke();

  if (style === 'dashed') {
    doc.undash();
  }

  // Draw arrow head
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowSize = 8;
  doc.fillColor(colors.border);
  doc.polygon(
    [toX, toY],
    [toX - arrowSize * Math.cos(angle - Math.PI / 6), toY - arrowSize * Math.sin(angle - Math.PI / 6)],
    [toX - arrowSize * Math.cos(angle + Math.PI / 6), toY - arrowSize * Math.sin(angle + Math.PI / 6)]
  );
  doc.fill();

  // Label
  if (label) {
    const labelX = (fromX + toX) / 2 - 15;
    const labelY = lineY - 8;
    doc.fontSize(7).font('Helvetica').fillColor(colors.text);
    doc.text(label, labelX, labelY, { width: 30 });
  }
}

// === PAGE 1: Main Architecture Diagram ===

// Title
doc.fontSize(26).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('QuizTimer4Zoom System Architecture', 40, 30);

doc.fontSize(11).font('Helvetica').fillColor(colors.text);
doc.text('Secure Zoom Application with OAuth 2.0 + PKCE, Serverless Backend, and Canvas Rendering', 40, 60);

// Draw main layers
const startY = 100;

// Layer 1: Zoom Meeting Context
doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('Zoom Meeting Environment', 40, startY);

drawComponentBox(40, startY + 20, 1130, 50,
  'Zoom Meeting Context',
  'User authenticated in Zoom meeting with permission to use QuizTimer4Zoom application',
  colors.accent, '#FFFFFF');

// Layer 2: Frontend (Browser)
doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('Frontend Layer (Browser)', 40, startY + 100);

// Frontend components
drawComponentBox(40, startY + 120, 220, 90,
  'quiztimer.html',
  'Main HTML container\nLoads Zoom SDK & scripts\nProvides canvas element',
  colors.secondary);

drawComponentBox(280, startY + 120, 220, 90,
  'Canvas 2D API',
  'Timer rendering\nDynamic font sizing\nImage updates to Zoom',
  colors.secondary);

drawComponentBox(520, startY + 120, 220, 90,
  'Zoom SDK v0.16.19',
  'Rendering context\nVideo overlay\nMeeting context API',
  colors.secondary);

drawComponentBox(760, startY + 120, 220, 90,
  'Settings UI',
  'Position selector\nSize/color controls\nlocalStorage persistence',
  colors.secondary);

// Connect frontend components
drawArrowLine(150, startY + 120, 370, startY + 120, '', 'solid');
drawArrowLine(390, startY + 120, 630, startY + 120, '', 'solid');
drawArrowLine(630, startY + 120, 870, startY + 120, '', 'solid');

// Connection from meeting context
drawArrowLine(600, startY + 70, 600, startY + 120, 'HTTPS', 'solid');

// Layer 3: Backend (Express.js)
doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('Backend Layer (Node.js / Express.js)', 40, startY + 240);

drawComponentBox(40, startY + 260, 280, 100,
  'Express.js Server',
  'HTTP routing\nOAuth endpoints\nStatic file serving\nContext validation',
  colors.success);

drawComponentBox(340, startY + 260, 280, 100,
  'OAuth 2.0 + PKCE',
  'Authorization flow\nPKCE challenge/verifier\nToken exchange\nSession creation',
  colors.success);

drawComponentBox(640, startY + 260, 280, 100,
  'Session Manager',
  'Secure cookies\nhttpOnly, secure flags\nsameSite=Strict\n24h expiration',
  colors.success);

drawComponentBox(940, startY + 260, 230, 100,
  'Middleware Stack',
  'Helmet.js (headers)\nInput validation\nError handling\nLogging',
  colors.warning);

// Connections
drawArrowLine(150, startY + 210, 180, startY + 260, 'HTTPS\nRequest', 'solid');
drawArrowLine(600, startY + 210, 600, startY + 260, 'Request', 'solid');

// Layer 4: External Services
doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('External Services & APIs', 40, startY + 400);

drawComponentBox(40, startY + 420, 220, 90,
  'Zoom OAuth',
  '/authorize\n/token endpoints\nToken validation',
  colors.accent);

drawComponentBox(280, startY + 420, 220, 90,
  'Zoom Apps SDK',
  'Context API\nRendering API\nCapability negotiation',
  colors.accent);

drawComponentBox(520, startY + 420, 220, 90,
  'Zoom Meeting API',
  'User information\nMeeting context\nPermissions',
  colors.accent);

drawComponentBox(760, startY + 420, 220, 90,
  'Vercel Platform',
  'Serverless hosting\nAuto-scaling\nGlobal CDN',
  colors.info);

// Connections from backend to APIs
drawArrowLine(180, startY + 360, 150, startY + 420, 'Token\nExchange', 'solid');
drawArrowLine(600, startY + 360, 630, startY + 420, 'API Calls', 'solid');

// Layer 5: Data Storage
doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('Data & Storage Layer', 40, startY + 540);

drawComponentBox(40, startY + 560, 280, 90,
  'Session Store',
  'Encrypted cookies\nUser authentication\n24h auto-expiration',
  colors.primary);

drawComponentBox(340, startY + 560, 280, 90,
  'Browser localStorage',
  'Settings persistence\nUser preferences\nCanvas configuration',
  colors.primary);

drawComponentBox(640, startY + 560, 280, 90,
  'Zoom Context Header',
  'Encrypted (AES-256-GCM)\nMeeting validation\nUser identification',
  colors.primary);

// Connection to storage
drawArrowLine(180, startY + 360, 180, startY + 560, 'Store\nSession', 'dashed');
drawArrowLine(480, startY + 360, 480, startY + 560, 'Save\nSettings', 'dashed');

// Data flow annotation
doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('Data Flow:', 40, startY + 680);

doc.fontSize(8).font('Helvetica').fillColor(colors.text);
doc.text('1. OAuth: Authorization Code → Token Exchange → Secure Session', 60, startY + 700);
doc.text('2. Timer: JavaScript interval → Canvas rendering → Zoom drawImage() → Video overlay', 60, startY + 716);
doc.text('3. Settings: User input → localStorage → Canvas configuration → Persistent across sessions', 60, startY + 732);

// Security box
const secY = startY + 760;
doc.rect(40, secY, 1130, 80);
doc.strokeColor(colors.success);
doc.lineWidth(2);
doc.stroke();

doc.fontSize(11).font('Helvetica-Bold').fillColor(colors.success);
doc.text('🔒 Security Architecture', 50, secY + 8);

doc.fontSize(8).font('Helvetica').fillColor(colors.text);
const securityItems = [
  '✓ OAuth 2.0 PKCE: Prevents authorization code interception attacks',
  '✓ Secure Cookies: httpOnly (XSS), secure (HTTPS), sameSite=Strict (CSRF)',
  '✓ TLS 1.2+: All traffic encrypted end-to-end',
  '✓ AES-256-GCM: Zoom context validation and encryption'
];

let secYPos = secY + 28;
securityItems.forEach((item, idx) => {
  if (idx === 2) {
    secYPos = secY + 28;
    doc.text(item, 600, secYPos);
  } else if (idx < 2) {
    doc.text(item, 50, secYPos);
  } else {
    doc.text(item, 600, secYPos);
  }
  secYPos += 16;
});

// === PAGE 2: Request-Response Cycle ===
doc.addPage();

doc.fontSize(24).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('Request-Response Cycle & Data Flow', 40, 40);

const cycleY = 100;

// OAuth Flow
doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('1. Installation & OAuth Flow', 40, cycleY);

drawComponentBox(40, cycleY + 30, 1130, 20, 'User clicks install link', '', colors.lightBg);

drawArrowLine(600, cycleY + 50, 600, cycleY + 80, '');

drawComponentBox(40, cycleY + 80, 1130, 20, 'Server generates PKCE challenge/verifier and redirects to Zoom OAuth', '', colors.lightBg);

drawArrowLine(600, cycleY + 100, 600, cycleY + 130, '');

drawComponentBox(40, cycleY + 130, 1130, 20, 'User authenticates with Zoom and grants app permissions', '', colors.lightBg);

drawArrowLine(600, cycleY + 150, 600, cycleY + 180, '');

drawComponentBox(40, cycleY + 180, 1130, 20, 'Zoom redirects to /auth callback with authorization code', '', colors.lightBg);

drawArrowLine(600, cycleY + 200, 600, cycleY + 230, '');

drawComponentBox(40, cycleY + 230, 1130, 20, 'Server exchanges code for token using stored PKCE verifier', '', colors.lightBg);

drawArrowLine(600, cycleY + 250, 600, cycleY + 280, '');

drawComponentBox(40, cycleY + 280, 1130, 20, 'Server creates encrypted session with secure flags and redirects to Zoom deeplink', '', colors.lightBg);

// Timer Operation Flow
const timerY = cycleY + 350;
doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('2. Timer Operation & Rendering', 40, timerY);

drawComponentBox(40, timerY + 30, 1130, 20, 'User starts timer in Zoom app', '', colors.lightBg);

drawArrowLine(600, timerY + 50, 600, timerY + 80, '');

drawComponentBox(40, timerY + 80, 1130, 20, 'JavaScript setInterval (every 1 second) calculates remaining time', '', colors.lightBg);

drawArrowLine(600, timerY + 100, 600, timerY + 130, '');

drawComponentBox(40, timerY + 130, 1130, 20, 'Canvas renders timer number with dynamic font sizing and color state', '', colors.lightBg);

drawArrowLine(600, timerY + 150, 600, timerY + 180, '');

drawComponentBox(40, timerY + 180, 1130, 20, 'Canvas ImageData sent to Zoom SDK drawImage() for video overlay', '', colors.lightBg);

drawArrowLine(600, timerY + 200, 600, timerY + 230, '');

drawComponentBox(40, timerY + 230, 1130, 20, 'Timer displays on meeting video feed in real-time (visible to all participants)', '', colors.lightBg);

// Settings Flow
const settingsY = timerY + 300;
doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('3. Settings Persistence', 40, settingsY);

drawComponentBox(40, settingsY + 30, 1130, 20, 'User modifies timer settings (position, size, color)', '', colors.lightBg);

drawArrowLine(600, settingsY + 50, 600, settingsY + 80, '');

drawComponentBox(40, settingsY + 80, 1130, 20, 'Settings saved to browser localStorage as JSON', '', colors.lightBg);

drawArrowLine(600, settingsY + 100, 600, settingsY + 130, '');

drawComponentBox(40, settingsY + 130, 1130, 20, 'On next session, settings loaded from localStorage and applied to canvas', '', colors.lightBg);

// Footer
doc.fontSize(8).fillColor('#999999');
doc.text('QuizTimer4Zoom Architecture | Page 2 | ' + new Date().toLocaleString(),
  40, 1050, { align: 'left' });

// Finalize
doc.end();

stream.on('finish', () => {
  console.log('✓ Architecture diagram created successfully!');
  console.log('  File: ' + outputPath);

  const stats = fs.statSync(outputPath);
  console.log('  Size: ' + (stats.size / 1024).toFixed(1) + ' KB');

  try {
    const { execSync } = require('child_process');
    const info = execSync('pdfinfo ' + outputPath, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const pages = info.match(/Pages:\s+(\d+)/);
    if (pages) {
      console.log('  Pages: ' + pages[1]);
    }
  } catch (e) {
    // pdfinfo not available
  }

  console.log('✓ Ready for submission!');
  process.exit(0);
});

stream.on('error', (err) => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
