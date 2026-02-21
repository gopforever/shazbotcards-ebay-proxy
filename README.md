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
| `FRONTEND_URL` | Your frontend URL | `https://gopforever.github.io` |

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

## 🧪 Local Development

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
- Verify `FRONTEND_URL` matches your frontend domain exactly
- Check Vercel deployment logs for errors

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
