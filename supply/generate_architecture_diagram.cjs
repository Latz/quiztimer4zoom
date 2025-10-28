#!/usr/bin/env node

const PDFDocument = require('pdfkit');
const fs = require('fs');

// Create PDF document
const doc = new PDFDocument({
  size: 'A4',
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
  background: '#F5F5F5',
  border: '#CCCCCC',
  text: '#333333'
};

// Helper functions
function drawBox(x, y, width, height, text, color = colors.primary, textColor = '#FFFFFF') {
  // Draw box
  doc.rect(x, y, width, height);
  doc.fillAndStroke(color);

  // Draw text
  doc.fontSize(10).font('Helvetica-Bold').fillColor(textColor);
  const textX = x + width / 2;
  const textY = y + height / 2 - 10;
  doc.text(text, x + 10, y + 10, {
    width: width - 20,
    height: height - 20,
    align: 'center',
    valign: 'center'
  });

  doc.fillColor(colors.text);
}

function drawArrow(fromX, fromY, toX, toY, label = '', dashed = false) {
  doc.strokeColor(colors.border);
  doc.lineWidth(2);

  if (dashed) {
    doc.dash(5, { space: 5 });
  }

  // Draw line
  doc.moveTo(fromX, fromY).lineTo(toX, toY).stroke();
  doc.undash();

  // Draw arrow head
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowSize = 10;
  doc.fillColor(colors.border);
  doc.polygon(
    [toX, toY],
    [toX - arrowSize * Math.cos(angle - Math.PI / 6), toY - arrowSize * Math.sin(angle - Math.PI / 6)],
    [toX - arrowSize * Math.cos(angle + Math.PI / 6), toY - arrowSize * Math.sin(angle + Math.PI / 6)]
  );
  doc.fill();

  // Draw label if provided
  if (label) {
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    doc.fontSize(8).fillColor(colors.text).text(label, midX - 20, midY - 10, { width: 40 });
  }
}

function drawLabel(x, y, text, bold = false) {
  if (bold) {
    doc.fontSize(12).font('Helvetica-Bold');
  } else {
    doc.fontSize(10).font('Helvetica');
  }
  doc.fillColor(colors.text).text(text, x, y);
}

// Title
doc.fontSize(24).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('QuizTimer4Zoom - System Architecture', { align: 'center' });
doc.moveDown(0.3);
doc.fontSize(10).font('Helvetica').fillColor(colors.text);
doc.text('Complete application architecture showing components, data flows, and integrations', { align: 'center' });
doc.moveDown(1);

// Layer 1: Zoom Meeting Context
drawLabel(50, 100, 'Layer 1: Zoom Meeting Context', true);
drawBox(50, 120, 700, 60, 'Zoom Meeting Environment\n(User authenticated in Zoom meeting)', colors.accent);

// Layer 2: Frontend
drawLabel(50, 200, 'Layer 2: Frontend (Browser)', true);

// Frontend components
drawBox(60, 220, 140, 80, 'HTML/DOM\nquiztimer.html', colors.secondary);
drawBox(220, 220, 140, 80, 'Canvas 2D API\nTimer Rendering', colors.secondary);
drawBox(380, 220, 140, 80, 'Zoom SDK\nv0.16.19', colors.secondary);
drawBox(540, 220, 140, 80, 'Settings UI\nquiztimer-options\n-script.js', colors.secondary);

// Frontend styling & logic
drawBox(70, 320, 130, 60, 'Styles\n.css', '#9C27B0');
drawBox(220, 320, 130, 60, 'Main Script\nquiztimer-script.js\n(620 lines)', '#9C27B0');
drawBox(370, 320, 130, 60, 'localStorage\nSettings', '#9C27B0');
drawBox(520, 320, 130, 60, 'Event Handlers\nKeyboard & Buttons', '#9C27B0');

// Arrows from frontend to rendering
drawArrow(130, 300, 130, 320, '', false);
drawArrow(290, 300, 290, 320, '', false);
drawArrow(440, 300, 440, 320, '', false);
drawArrow(585, 300, 585, 320, '', false);

// Layer 3: Backend
drawLabel(50, 410, 'Layer 3: Backend (Node.js / Express.js)', true);

drawBox(60, 430, 160, 80, 'Express.js\nServer\napi/index.js', colors.primary);
drawBox(240, 430, 160, 80, 'OAuth Flow\nPKCE Challenge\nToken Exchange', colors.success);
drawBox(420, 430, 160, 80, 'Session Manager\nhttpOnly Cookies\nSecure Session', colors.success);
drawBox(600, 430, 140, 80, 'Static File Server\nAssets & Scripts', colors.success);

// Backend middleware
drawBox(70, 530, 140, 50, 'Helmet.js\nSecurity Headers', colors.warning);
drawBox(230, 530, 140, 50, 'Cookie-Session\nMiddleware', colors.warning);
drawBox(390, 530, 140, 50, 'Context Validator\nAES-256-GCM', colors.warning);
drawBox(550, 530, 140, 50, 'Input Validation\nError Handling', colors.warning);

// Arrows from backend to middleware
drawArrow(140, 510, 140, 530, '', false);
drawArrow(320, 510, 300, 530, '', false);
drawArrow(500, 510, 460, 530, '', false);
drawArrow(670, 510, 620, 530, '', false);

// Layer 4: External Services & APIs
drawLabel(50, 610, 'Layer 4: External Services & APIs', true);

drawBox(60, 630, 140, 70, 'Zoom OAuth\nEndpoints\n/authorize\n/token', colors.accent);
drawBox(220, 630, 140, 70, 'Zoom Apps SDK\nContext API\nRendering API', colors.accent);
drawBox(380, 630, 140, 70, 'Zoom Meeting API\nUser Info\nContext Data', colors.accent);
drawBox(540, 630, 140, 70, 'Vercel\nDeployment\nInfrastructure', '#FF9800');

// Layer 5: Data & Storage
drawLabel(50, 730, 'Layer 5: Data & Storage', true);

drawBox(60, 750, 160, 70, 'Session Store\nEncrypted Cookies\n24h Expiration', colors.primary);
drawBox(240, 750, 160, 70, 'Browser\nLocalStorage\nUser Settings\nPreferences', colors.primary);
drawBox(420, 750, 160, 70, 'Zoom Context\nEncrypted Header\nAES-256-GCM', colors.primary);

// Connection arrows (vertical flow)
drawArrow(400, 180, 400, 220, 'HTTPS', false);
drawArrow(400, 380, 400, 430, 'HTTPS Request', false);
drawArrow(400, 580, 400, 630, 'API Calls', false);
drawArrow(250, 700, 250, 750, 'Storage', false);

// Side annotations
doc.fontSize(8).fillColor(colors.text);
doc.text('OAuth 2.0 + PKCE', 720, 450, { width: 40 });
doc.text('Secure Session', 720, 520, { width: 40 });
doc.text('Token Exchange', 720, 480, { width: 40 });

// Data flow legend
drawLabel(50, 830, 'Data Flow Legend:', true);
drawArrow(200, 840, 240, 840, 'HTTPS/Encrypted');
drawArrow(320, 840, 360, 840, 'Unencrypted', true);

// Security features box
doc.rect(50, 870, 700, 100);
doc.stroke(colors.border);

drawLabel(60, 880, 'Security Features Implemented:', true);
doc.fontSize(9).fillColor(colors.text);
const securityFeatures = [
  '✓ Zoom OAuth 2.0 with PKCE for secure authorization code exchange',
  '✓ Secure session cookies: httpOnly, secure, sameSite=Strict',
  '✓ HTTPS/TLS 1.2+ enforcement on all connections',
  '✓ AES-256-GCM encryption for Zoom app context header validation',
  '✓ Helmet.js middleware for security headers (CSP, HSTS, X-Frame-Options, etc.)',
  '✓ Input validation on all endpoints, no sensitive data logging',
  '✓ Zero-trust architecture with context validation on every request'
];

let yPos = 905;
securityFeatures.forEach(feature => {
  doc.text(feature, 65, yPos, { width: 680 });
  yPos += 15;
});

// Footer
doc.fontSize(8).fillColor('#999999');
doc.text('QuizTimer4Zoom Architecture Diagram | Version 1.0 | Generated: ' + new Date().toLocaleString(),
  50, 1000, { align: 'center' });

// Add new page for detailed component description
doc.addPage();

// Page 2: Component Details
doc.fontSize(24).font('Helvetica-Bold').fillColor(colors.primary);
doc.text('Component Details & Responsibilities', { align: 'center' });
doc.moveDown(0.5);

// Frontend Components
drawLabel(50, 80, 'Frontend Components', true);
doc.fontSize(10).font('Helvetica').fillColor(colors.text);

const components = [
  {
    name: 'quiztimer.html',
    desc: 'Main HTML container for the application. Loads Zoom SDK, application scripts, and provides canvas element for timer rendering.'
  },
  {
    name: 'quiztimer-script.js (620 lines)',
    desc: 'Core application logic: timer state management, canvas rendering with dynamic font sizing, Zoom SDK integration, event handling, and settings management via localStorage.'
  },
  {
    name: 'quiztimer-options-script.js',
    desc: 'Settings UI handler: position selection, size adjustment sliders, color picker integration, and settings persistence.'
  },
  {
    name: 'Canvas 2D API',
    desc: 'HTML5 rendering engine: dynamic font sizing via binary search algorithm, color state management, and real-time image updates to Zoom video feed.'
  },
  {
    name: 'Zoom Apps SDK v0.16.19',
    desc: 'Official Zoom SDK providing: renderingContext management, drawImage/clearImage for video overlay, meeting context access, and capability negotiation.'
  }
];

let yComponent = 110;
components.forEach(comp => {
  doc.fontSize(11).font('Helvetica-Bold').fillColor(colors.primary);
  doc.text(comp.name, 60, yComponent);
  yComponent += 18;
  doc.fontSize(9).font('Helvetica').fillColor(colors.text);
  doc.text(comp.desc, 70, yComponent, { width: 680 });
  yComponent += 35;
});

// Backend Components
drawLabel(50, 350, 'Backend Components', true);

const backendComps = [
  {
    name: 'api/index.js (Express.js)',
    desc: 'Main server: OAuth endpoints (/install, /auth), request routing, middleware orchestration, Zoom context validation, and static file serving with security restrictions.'
  },
  {
    name: 'OAuth 2.0 PKCE Handler',
    desc: 'Secure authentication: PKCE challenge/verifier generation, authorization code exchange, token validation, session creation with encrypted storage.'
  },
  {
    name: 'Session Manager',
    desc: 'Secure cookie management: httpOnly flag (XSS protection), secure flag (HTTPS only), sameSite=Strict (CSRF protection), 24-hour expiration.'
  },
  {
    name: 'Helmet.js Middleware',
    desc: 'Security headers: Content-Security-Policy, HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, preventing common attacks.'
  },
  {
    name: 'Context Validator (cipher.js)',
    desc: 'AES-256-GCM decryption: validates Zoom app context header, verifies meeting environment, prevents unauthorized access.'
  }
];

let yBack = 380;
backendComps.forEach(comp => {
  doc.fontSize(11).font('Helvetica-Bold').fillColor(colors.success);
  doc.text(comp.name, 60, yBack);
  yBack += 18;
  doc.fontSize(9).font('Helvetica').fillColor(colors.text);
  doc.text(comp.desc, 70, yBack, { width: 680 });
  yBack += 35;
});

// Data Flow
drawLabel(50, 650, 'Data Flow Summary', true);

const dataFlows = [
  '1. User Authorization: User clicks install → Browser redirects to Zoom OAuth → User authenticates and grants permissions → Zoom returns authorization code',
  '2. Token Exchange: Server validates code with PKCE verifier → Exchanges for access token → Creates encrypted session cookie → Returns deeplink',
  '3. App Initialization: Browser launches app in Zoom → Zoom sends encrypted context header → Server validates context → Serves authenticated app',
  '4. Timer Operation: User starts timer → JavaScript setInterval updates canvas → Canvas rendered as ImageData → Sent to Zoom via SDK drawImage()',
  '5. Settings Persistence: User modifies settings → Saved to browser localStorage → Settings applied on next session load'
];

let yFlow = 680;
doc.fontSize(9).fillColor(colors.text);
dataFlows.forEach(flow => {
  doc.text(flow, 60, yFlow, { width: 720 });
  yFlow += 30;
});

// Footer
doc.fontSize(8).fillColor('#999999');
doc.text('QuizTimer4Zoom Component Details | Page 2 | Generated: ' + new Date().toLocaleString(),
  50, 1020, { align: 'center' });

// Finalize PDF
doc.end();

stream.on('finish', () => {
  console.log('✓ Architecture diagram PDF created successfully!');
  console.log('  File: ' + outputPath);

  const stats = fs.statSync(outputPath);
  console.log('  Size: ' + (stats.size / 1024).toFixed(1) + ' KB');

  // Verify with pdfinfo if available
  try {
    const { execSync } = require('child_process');
    const info = execSync('pdfinfo ' + outputPath + ' 2>/dev/null', { encoding: 'utf8' });
    const pages = info.match(/Pages:\s+(\d+)/);
    if (pages) {
      console.log('  Pages: ' + pages[1]);
    }
  } catch (e) {
    // pdfinfo not available
  }

  process.exit(0);
});

stream.on('error', (err) => {
  console.error('✗ Error creating PDF:', err.message);
  process.exit(1);
});
