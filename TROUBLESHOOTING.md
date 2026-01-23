# 🔧 Troubleshooting Guide - ACTRIGHT Chat System

## Common Issues and Solutions

### 404 Errors on API Endpoints

#### Issue: `Failed to load resource: the server responded with a status of 404`

**Possible Causes:**
1. Server not running
2. Wrong API URL configuration
3. Route not registered
4. Port mismatch

**Solutions:**

1. **Check if server is running:**
   ```bash
   cd server
   npm start
   # Should see: "🚀 Server running on port 3007"
   ```

2. **Verify API URL in frontend:**
   - Check `frontend/.env`:
     ```env
     VITE_API_BASE_URL="http://localhost:3007/api"
     ```
   - Make sure there's no trailing slash
   - Restart frontend dev server after changing .env

3. **Check server logs:**
   - Look for route registration messages
   - Check for any errors during startup
   - Verify all routes are loaded

4. **Test endpoints directly:**
   ```bash
   # Health check
   curl http://localhost:3007/api/health
   
   # With auth token
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3007/api/chat/sessions
   ```

### Authentication Issues

#### Issue: 401 Unauthorized errors

**Solutions:**
1. Check if token is being sent:
   - Open browser DevTools → Network tab
   - Check request headers for `Authorization: Bearer ...`

2. Verify JWT_SECRET matches:
   - `server/.env`: `JWT_SECRET=actright-secure-jwt-secret-2026`
   - Must match between server restarts

3. Token might be expired:
   - Try logging out and logging back in
   - Check token expiration in AuthContext

### Database Connection Issues

#### Issue: 503 Database connection errors

**Solutions:**
1. Check MongoDB connection:
   ```bash
   # Test connection string
   mongosh "mongodb+srv://codehub:Codehub123@cluster0.rrmywzh.mongodb.net/actright"
   ```

2. Verify MongoDB URI in `.env`:
   ```env
   MONGODB_URI=mongodb+srv://codehub:Codehub123@cluster0.rrmywzh.mongodb.net/actright?retryWrites=true&w=majority
   ```

3. Check network/firewall:
   - MongoDB Atlas IP whitelist
   - Internet connection

### GROQ API Connection Issues

#### Issue: GROQ API not responding

**Solutions:**
1. Verify GROQ_API_KEY:
   ```env
   GROQ_API_KEY=your-groq-api-key-here
   ```
   - Get your API key from: https://console.groq.com/keys
   - **NO SPACE** after `=` sign
   - Make sure key is valid and active

2. Test GROQ API:
   ```bash
   curl https://api.groq.com/openai/v1/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"Hello"}]}'
   ```

3. Check internet connection:
   - GROQ API requires internet access
   - Verify firewall allows HTTPS connections
   - Check if you can access https://api.groq.com

### Frontend Build Issues

#### Issue: Environment variables not loading

**Solutions:**
1. Restart dev server after changing `.env`:
   ```bash
   # Stop server (Ctrl+C)
   # Start again
   npm run dev
   ```

2. Check variable names:
   - Must start with `VITE_` prefix
   - No spaces around `=`
   - Use quotes for values with spaces

3. Clear cache:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### CORS Issues

#### Issue: CORS errors in browser console

**Solutions:**
1. Check CORS configuration in `server.js`:
   ```javascript
   app.use(cors()); // Should allow all origins in dev
   ```

2. For production, configure specific origins:
   ```javascript
   app.use(cors({
     origin: 'http://localhost:5173', // Your frontend URL
     credentials: true
   }));
   ```

## Debugging Steps

### 1. Check Server Status
```bash
# In server directory
npm start
# Look for:
# ✅ DATABASE CONNECTED SUCCESSFULLY
# 🚀 Server running on port 3007
```

### 2. Check Frontend Console
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests
- Look for 404, 401, 500 errors

### 3. Verify Environment Variables

**Backend (`server/.env`):**
```env
PORT=3007
MONGODB_URI=mongodb+srv://...
JWT_SECRET=actright-secure-jwt-secret-2026
MODEL_BASE_URL=http://192.168.137.37:7860
```

**Frontend (`frontend/.env`):**
```env
VITE_API_BASE_URL="http://localhost:3007/api"
VITE_SOCKET_URL="http://localhost:3007"
```

### 4. Test Endpoints Manually

**Health Check:**
```bash
curl http://localhost:3007/api/health
```

**With Authentication:**
```bash
# First, get token from login
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Then use token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3007/api/chat/sessions
```

## Quick Fixes

### Fix 404 on all routes:
1. Restart server
2. Check port number matches
3. Verify API_URL in frontend

### Fix authentication:
1. Clear localStorage: `localStorage.clear()`
2. Log out and log back in
3. Check token in DevTools → Application → Local Storage

### Fix database:
1. Check MongoDB Atlas dashboard
2. Verify connection string
3. Check IP whitelist

### Fix model server:
1. Verify MODEL_BASE_URL (no spaces!)
2. Test connection: `curl http://192.168.137.37:7860/health`
3. Check model server logs

## Still Having Issues?

1. **Check server logs** - Look for error messages
2. **Check browser console** - Look for JavaScript errors
3. **Check network tab** - See actual HTTP requests/responses
4. **Verify all environment variables** - No typos, no spaces
5. **Restart everything** - Server and frontend

## Contact Support

If issues persist:
- Check server logs for detailed error messages
- Share error messages from browser console
- Include network request/response details
- Verify all environment variables are set correctly

---

**Last Updated:** 2026-01-23
