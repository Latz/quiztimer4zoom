# Quiztimer4Zoom - Project Context

## Technology Stack

### WebView2 (Chromium-based)
- **Important**: This project is a Zoom App running in WebView2, which is Chromium-based
- Modern CSS features are fully supported: `:not()`, `:disabled`, `:is()`, Grid, Flexbox, etc.
- No need for browser compatibility fallbacks or polyfills for modern CSS/JavaScript features
- Prefer CSS-only solutions over JavaScript when possible for performance

### Backend
- Express.js server (api/index.js)
- Serves static files and handles OAuth callbacks
- Development: `vercel dev` or `node api/index.js`

### Frontend
- Plain JavaScript (no frameworks)
- Canvas API for rendering timer display
- LocalStorage for persisting user preferences
- Zoom SDK for integration with Zoom meetings

## Architecture

### Key Files
- **api/index.js** - Express server entry point
- **api/quiztimer.html** - Main HTML file (loaded in WebView2)
- **public/quiztimer-script.js** - Main application logic
- **api/styles.css** - Main stylesheet
- **scripts/zoom-api.js** - Zoom SDK integration

### Project Structure
```
/api/         - Backend and HTML/CSS
/public/      - Static files served by Express
/scripts/     - Zoom SDK and configuration
```

## Development Notes

### OAuth & Tunneling
- Local development uses tunnel: `localdev.fuzzy.monster`
- Requires `.env` with Zoom OAuth credentials:
  - `ZM_CLIENT_ID`
  - `ZM_CLIENT_SECRET`
  - `SESSION_SECRET`
  - `ZM_REDIRECT_URL=https://localdev.fuzzy.monster/auth`

### Styling Guidelines
- Use semantic CSS (`:disabled`, `:not(:disabled)`, `:hover`, `:active`, etc.)
- Buttons use tab indentation in styles.css
- Button animations use transitions for smooth effects
- Color schemes: Standard, Warning, Timeout states

### JavaScript Patterns
- Uses `state` variable for timer status: `running` or `stop`
- Button states managed through `disabled` property and CSS classes
- Keyboard shortcuts: Space for Start/Stop, 'c' for Continue
- Automatic reset after 5 seconds of pause (with progress bar)

### Known Issues & Solutions
- Zoom SDK errors suppressed in console (intentional - see api/quiztimer.html lines 21-41)
- Continue button:
  - Disabled initially and while timer is running
  - Enabled only when timer is paused
  - Uses CSS-only cursor styling (pointer when enabled, not-allowed when disabled)

## Performance Considerations
- Canvas-based rendering for timer (not DOM elements)
- Caches drawn images to avoid redrawing unchanged times
- Progress bar uses CSS width changes (performant)
- All animations use CSS transitions, not JavaScript

## Testing & Deployment
- Vercel configuration in `vercel.json`
- Build command: `npm run setup-public`
- Dev command: `node api/index.js`
- No build step for client code (served as-is)
