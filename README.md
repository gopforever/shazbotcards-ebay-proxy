# ShazbotCards eBay Proxy

Backend proxy server for ShazbotCards eBay OAuth and API integration.

## 🚀 Features

- OAuth 2.0 token exchange and refresh
- eBay Trading API proxy (solves CORS issues)
- Rate limiting (100 req/15min per IP)
- Security headers and CORS protection
- Vercel-ready serverless deployment

## 📋 Prerequisites

- Node.js 18+
- eBay Developer Account with:
  - App ID (Client ID)
  - Dev ID
  - Cert ID (Client Secret)
  - RuName (OAuth redirect URI)

## 🔧 Environment Variables

Set these in Vercel dashboard (Settings → Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `EBAY_APP_ID` | Your eBay App ID (Client ID) | `YourApp-PRD-...` |
| `EBAY_DEV_ID` | Your eBay Developer ID | `xxxxxxxx-xxxx-xxxx...` |
| `EBAY_CERT_ID` | Your eBay Certificate ID | `PRD-xxxxxx...` |
| `EBAY_RU_NAME` | Your eBay Redirect URI Name | `Your_Name-YourApp-...` |
| `FRONTEND_URL` | Single frontend URL (backwards-compat, merged into allowlist) | `https://projectebay.netlify.app` |
| `ALLOWED_ORIGINS` | Comma-separated extra allowed origins (optional) | `https://my-site.com,https://staging.netlify.app` |

## 🚢 Deployment to Vercel

### Via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Click "Add New Project"**
3. **Import your GitHub repository** (`shazbotcards-ebay-proxy`)
4. **Configure:**
   - Framework Preset: **Other**
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
5. **Add Environment Variables** (from table above)
6. **Click "Deploy"**
7. **Copy your deployment URL** (e.g., `https://shazbotcards-proxy.vercel.app`)

### Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T23:00:00.000Z",
  "service": "shazbotcards-ebay-proxy"
}
```

### OAuth Token Exchange
```
POST /auth/token
```

**Body:**
```json
{
  "code": "authorization_code_from_ebay",
  "redirect_uri": "https://yoursite.com/ebay-callback.html"
}
```

**Response:**
```json
{
  "access_token": "v^1.1#...",
  "refresh_token": "v^1.1#...",
  "expires_in": 7200,
  "token_type": "Bearer",
  "username": "ebay_username"
}
```

### Refresh Token
```
POST /auth/refresh
```

**Body:**
```json
{
  "refresh_token": "v^1.1#..."
}
```

**Response:**
```json
{
  "access_token": "v^1.1#...",
  "expires_in": 7200,
  "token_type": "Bearer"
}
```

### Trading API Sync
```
POST /trading/sync
```

Proxies an eBay **Trading API** call server-to-server, solving the CORS/CSP issues that arise when the browser tries to call `https://api.ebay.com/ws/api.dll` directly.

Authentication uses the OAuth user access token via the `X-EBAY-API-IAF-TOKEN` header (no `RequesterCredentials` needed in the XML body).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body (all fields optional):**
```json
{
  "callName": "GetMyeBaySelling",
  "environment": "production",
  "pageNumber": 1,
  "body": {}
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `callName` | string | `GetMyeBaySelling` | Trading API call to make. Allowed: `GetMyeBaySelling`, `GetMyeBayBuying`, `GetSellerList`, `GetItem`, `GetOrders` |
| `environment` | string | `production` | `production` or `sandbox` |
| `pageNumber` | number | `1` | Shorthand to paginate ActiveList/SoldList/UnsoldList when using the default body |
| `body` | object | *(see below)* | Override the entire Trading API request body (merged as XML child elements) |

When `callName` is `GetMyeBaySelling` and no `body` is provided, the proxy sends sensible defaults that retrieve **active**, **sold**, and **unsold** listings (200 items per section per page):

```json
{
  "ActiveList": { "Include": true, "Pagination": { "EntriesPerPage": 200, "PageNumber": 1 } },
  "SoldList":   { "Include": true, "Pagination": { "EntriesPerPage": 200, "PageNumber": 1 } },
  "UnsoldList": { "Include": true, "Pagination": { "EntriesPerPage": 200, "PageNumber": 1 } }
}
```

**Success response (200):** Parsed JSON representation of the eBay Trading API XML response.

**Error response:**
```json
{
  "error": "Human-readable error message",
  "ebayErrors": [ { "SeverityCode": "Error", "ErrorCode": "21917053", "ShortMessage": "...", "LongMessage": "..." } ]
}
```

**Example (fetch all selling listings):**
```bash
curl -X POST https://shazbotcards-ebay-proxy.vercel.app/trading/sync \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"callName":"GetMyeBaySelling"}'
```

**Example (paginate to page 2):**
```bash
curl -X POST https://shazbotcards-ebay-proxy.vercel.app/trading/sync \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"callName":"GetMyeBaySelling","pageNumber":2}'
```

### Proxy eBay API
```
POST /api/ebay
```

**Headers:**
```
Authorization: Bearer your_access_token
Content-Type: application/json
```

**Body:**
```json
{
  "apiCall": "GetMyeBaySelling",
  "body": {
    "ActiveList": {
      "Include": true,
      "Pagination": {
        "EntriesPerPage": 200,
        "PageNumber": 1
      }
    }
  },
  "environment": "production"
}
```

## 🌐 CORS Configuration

The proxy uses an origin allowlist. The following origins are **always** permitted by default:

| Origin | Purpose |
|--------|---------|
| `https://projectebay.netlify.app` | Production Netlify frontend |
| `http://localhost:3000` | Local dev (Node server) |
| `http://localhost:8888` | Local dev (Netlify CLI) |

**Adding extra origins** – set the `ALLOWED_ORIGINS` env var (comma-separated):

```
ALLOWED_ORIGINS=https://my-other-site.com,https://staging.netlify.app
```

The value of `FRONTEND_URL` (if set) is also merged into the allowlist for backwards-compatibility.

All endpoints handle `OPTIONS` preflight requests automatically via the `cors` middleware. A successful preflight returns `200` with the appropriate `Access-Control-Allow-*` headers.

### Verifying CORS locally

```bash
# Preflight (should return 200 with Access-Control-Allow-Origin header)
curl -i -X OPTIONS http://localhost:3000/auth/token \
  -H "Origin: https://projectebay.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# Actual POST (should include Access-Control-Allow-Origin in response)
curl -i -X POST http://localhost:3000/auth/token \
  -H "Origin: https://projectebay.netlify.app" \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}'
```



```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start development server
npm run dev
```

Server runs on http://localhost:3000

## 🔒 Security Features

- ✅ HTTPS only (enforced by Vercel)
- ✅ CORS restricted to frontend domain
- ✅ Rate limiting (100 requests per 15 minutes per IP)
- ✅ Environment variables for sensitive data
- ✅ Client secret never exposed to frontend
- ✅ No logging of tokens or sensitive data

## 📝 Architecture

```
Frontend (GitHub Pages)
    ↓
Backend Proxy (Vercel)
    ↓
eBay API (api.ebay.com)
```

**Why a proxy?**
- Solves CORS issues (eBay API blocks browser requests)
- Keeps client secret secure (never exposed to frontend)
- Handles OAuth token exchange server-side
- Adds rate limiting and security

## 🐛 Troubleshooting

### CORS Errors
- Ensure the frontend origin is in the allowlist (see [CORS Configuration](#-cors-configuration)).
- To allow additional origins, set the `ALLOWED_ORIGINS` env var (comma-separated) in the Vercel dashboard.
- Check Vercel deployment logs for errors.

### OAuth Errors
- Verify all eBay credentials are correct
- Check RuName matches exactly (including hyphens)
- Ensure redirect URI in eBay Developer Portal matches frontend

### API Errors
- Check eBay API status: https://developer.ebay.com/support/api-status
- Verify access token hasn't expired
- Check Vercel function logs for detailed errors

## 📚 Resources

- [eBay OAuth Documentation](https://developer.ebay.com/api-docs/static/oauth-tokens.html)
- [eBay Trading API Reference](https://developer.ebay.com/DevZone/XML/docs/Reference/eBay/index.html)
- [Vercel Documentation](https://vercel.com/docs)

## 📄 License

MIT

---

**Built for [ShazbotCards](https://github.com/gopforever/ShazbotCards)** 🎴
