# Quiz Timer for Zoom - Architecture Diagram

## System Architecture Overview

```mermaid
graph TB
    subgraph "Zoom Ecosystem"
        ZM[Zoom Client Application]
        ZM_API[Zoom App SDK]
    end

    subgraph "Quiz Timer Application"
        subgraph "Frontend Layer"
            HTML[quiztimer.html]
            CSS[styles.css]
            JS_SDK[sdk.js - Zoom SDK]
            JS_APP[quiztimer-script.js]
        end

        subgraph "Backend Layer"
            BE[Express.js Server]
            V[api/index.js]
        end
        
        subgraph "Static Assets"
            PUB[Public Directory]
            SDK_JS[sdk.js]
            QT_JS[quiztimer-script.js]
            ST_CSS[styles.css]
            FAV[favicon.ico]
        end
    end

    subgraph "Infrastructure"
        VERCEL[Vercel Deployment Platform]
        CDN[CDN for Static Assets]
    end

    subgraph "Zoom Authentication & API"
        Z_AUTH[Zoom OAuth 2.0]
        Z_MEETING[Zoom Meeting Context]
        Z_RT[Zoom Rendering Context]
    end

    ZM -.-> ZM_API
    ZM_API -.->|context| BE
    ZM_API -.->|drawImage| BE
    ZM_API -.->|clearImage| BE
    
    HTML --> JS_SDK
    HTML --> JS_APP
    HTML --> CSS
    JS_APP --> ZM_API
    
    BE -->|serves| HTML
    BE -->|serves| JS_SDK
    BE -->|serves| JS_APP
    BE -->|serves| CSS
    
    PUB --> SDK_JS
    PUB --> QT_JS
    PUB --> ST_CSS
    PUB --> FAV
    
    BE --> PUB
    VERCEL --> BE
    CDN -->|caches| PUB
    
    BE --> Z_AUTH
    BE --> Z_MEETING
    Z_RT <---> ZM
    
    Z_AUTH -.->|OAuth| Z_MEETING
    Z_MEETING -.->|context| ZM
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant Z as Zoom Client
    participant A as Quiz Timer App
    participant S as Server
    participant ZAPI as Zoom API

    U->>Z: Clicks to open Quiz Timer app in Zoom
    Z->>S: HTTP GET with x-zoom-app-context header
    S-->>Z: Returns index.html
    Z->>S: Request sdk.js
    S-->>Z: Returns sdk.js with application/javascript mimetype
    Z->>S: Request quiztimer-script.js
    S-->>Z: Returns quiztimer-script.js with application/javascript mimetype
    Z->>A: Loads app in Zoom client
    A->>S: Configure Zoom SDK
    S->>ZAPI: SDK Configuration
    ZAPI-->>A: Return configuration (renderTarget, etc.)
    A->>ZAPI: Run rendering context
    ZAPI-->>A: Context established
    U->>A: Interact with timer (start, stop, etc.)
    A->>ZAPI: Draw image on video feed
    ZAPI-->>Z: Render timer on video stream
```

## Component Interaction Flow

1. **Initialization Flow**
   - User opens app in Zoom meeting
   - Zoom client requests HTML from server with app context header
   - Server serves HTML and required static assets
   - App initializes Zoom SDK and sets up drawing context

2. **Runtime Flow**
   - User interacts with timer UI
   - JavaScript app calls Zoom SDK APIs
   - SDK communicates with Zoom client
   - Timer image is drawn on video feed

3. **Authentication Flow**
   - If app requires authentication, redirects to Zoom OAuth
   - After successful authentication, redirects back to Zoom meeting context

## Deployment Architecture

```mermaid
graph LR
    subgraph "Client Side"
        ZOOM[Zoom Client]
        BROWSER[Browser Context in Zoom]
    end

    subgraph "Vercel Infrastructure"
        CDN[CDN]
        ROUTER[Vercel Router]
        FUNCTION[Vercel Serverless Function]
    end

    subgraph "App Backend"
        API[api/index.js - Express Server]
        STATIC[Static File Serving]
    end

    subgraph "Zoom Platform"
        ZOOM_APP[Zoom App Platform]
        ZOOM_SDK[Zoom App SDK API]
    end

    BROWSER --> CDN
    CDN -->|sdk.js| BROWSER
    CDN -->|quiztimer-script.js| BROWSER
    CDN -->|quiztimer.html| BROWSER

    BROWSER --> ROUTER
    ROUTER --> FUNCTION
    FUNCTION --> API
    API -->|static files| STATIC

    BROWSER --> ZOOM_APP
    ZOOM_APP --> ZOOM_SDK
    ZOOM_SDK --> BROWSER

    ZOOM -.-> BROWSER
```

## Key Components

- **Zoom App SDK**: Provides APIs for interacting with Zoom video rendering
- **Express.js Server**: Handles HTTP requests and serves static assets
- **Static Assets**: JavaScript, CSS, and HTML files for the application
- **Vercel Platform**: Deployment and hosting platform with CDN capabilities
- **Zoom Client**: The actual Zoom application running the app in a meeting
- **OAuth Integration**: For authentication with Zoom APIs if needed

## Security Considerations

- Server-side security headers (Helmet.js)
- Rate limiting for authentication endpoints
- Secure session handling
- Proper MIME type enforcement for static assets
- Context validation for Zoom app environment