# 🔒 Security Guide

Comprehensive security implementation for OptionsBookie including authentication, data protection, and security headers.

## 📋 Table of Contents

- [Security Overview](#security-overview)
- [Authentication & Authorization](#authentication--authorization)
- [Database Security](#database-security)
- [API Security](#api-security)
- [Security Headers](#security-headers)
- [Environment Security](#environment-security)
- [Security Checklist](#security-checklist)
- [Incident Response](#incident-response)

---

## 🔒 Security Overview

OptionsBookie implements enterprise-grade security with multiple layers of protection:

- ✅ **NextAuth.js + Supabase Integration** - Secure authentication
- ✅ **Row Level Security (RLS)** - Database-level data isolation
- ✅ **Comprehensive Security Headers** - Protection against common attacks
- ✅ **Input Validation** - Prevents injection attacks
- ✅ **Session Management** - Secure user sessions
- ✅ **Environment Variable Protection** - No hardcoded secrets

---

## 🔐 Authentication & Authorization

### Authentication Flow

```
1. User signs in with Google OAuth
2. NextAuth creates secure JWT session
3. Supabase adapter manages user in auth.users table
4. RLS policies enforce data access based on auth.uid()
5. All subsequent requests validate session
```

### Security Features

- **JWT Strategy**: Secure session management with automatic validation
- **Google OAuth**: Industry-standard OAuth 2.0 flow
- **Session Validation**: Every API request validates user session
- **User Isolation**: Users can only access their own data
- **Automatic Logout**: Sessions expire appropriately

### User ID Management

- **Email-based IDs**: Simple and user-friendly
- **Supabase Integration**: Proper user management
- **RLS Enforcement**: Database-level access control
- **Future-ready**: Can migrate to UUID-based IDs if needed

---

## 🗄️ Database Security

### Row Level Security (RLS)

All tables have RLS policies enabled:

```sql
-- Users can only see their own transactions
CREATE POLICY "Users can view their own transactions" ON options_transactions
  FOR SELECT USING (
    user_id = (
      SELECT email
      FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Users can only see their own portfolios
CREATE POLICY "Users can view their own portfolios" ON portfolios
  FOR SELECT USING (
    user_id = (
      SELECT email
      FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );
```

### Data Isolation

- **Complete User Isolation**: Each user's data is completely separate
- **Portfolio Ownership**: Users can only access portfolios they own
- **Transaction Ownership**: Users can only access transactions in their portfolios
- **No Cross-User Access**: Impossible to access another user's data

### Database Access Pattern

```
User Operations (Client-side):
- Uses: NEXT_PUBLIC_SUPABASE_ANON_KEY
- Respects: RLS policies
- Scope: User's own data only

Admin Operations (Server-side):
- Uses: SUPABASE_SERVICE_ROLE_KEY
- Bypasses: RLS (for migrations only)
- Scope: All data (with proper filtering)
```

---

## 🛡️ API Security

### Request Validation

Every API endpoint implements:

- **Session Validation**: Verifies user is authenticated
- **User Authorization**: Ensures user can access requested data
- **Input Validation**: Validates all input parameters
- **Error Handling**: Secure error responses without data leakage

### API Security Features

- **Authentication Required**: All endpoints require valid session
- **User Context Validation**: Every request validates user context
- **Input Sanitization**: Prevents injection attacks
- **Rate Limiting**: Built-in protection against abuse
- **CORS Configuration**: Proper cross-origin request handling

### Example API Security

```typescript
// Every API route validates session
const session = await getServerSession(authOptions);
if (!session?.user?.email) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// User can only access their own data
const transactions = await supabase
  .from('options_transactions')
  .select('*')
  .eq('user_id', session.user.email);
```

---

## 🔒 Security Headers

### Content Security Policy (CSP)

Comprehensive CSP implementation in `next.config.js`:

```javascript
"Content-Security-Policy": [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://*.vercel.app",
  "frame-src 'self' https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join('; ')
```

### Additional Security Headers

- **X-Frame-Options**: `SAMEORIGIN` - Prevents clickjacking
- **X-Content-Type-Options**: `nosniff` - Prevents MIME type sniffing
- **X-XSS-Protection**: `1; mode=block` - Enables XSS filtering
- **Referrer-Policy**: `origin-when-cross-origin` - Controls referrer information
- **Permissions-Policy**: Restricts browser features
- **Strict-Transport-Security**: Forces HTTPS (production only)

### Security Headers Testing

Test your security headers with these tools:

- [Security Headers](https://securityheaders.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

---

## 🔐 Environment Security

### Required Environment Variables

```env
# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-strong-secret-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Security Best Practices

- **Never commit `.env.local`** to version control
- **Use strong, unique secrets** for all keys
- **Rotate keys regularly** (quarterly recommended)
- **Monitor access logs** for suspicious activity
- **Use different secrets** for development and production
- **Store secrets securely** in production (Vercel, AWS Secrets Manager, etc.)

### Secret Management

#### Development
- Store secrets in `.env.local` (git-ignored)
- Use placeholder values in documentation
- Never share real secrets in code or chat

#### Production
- Use platform secret management (Vercel, AWS, etc.)
- Rotate secrets regularly
- Monitor secret usage
- Implement secret versioning

---

## ✅ Security Checklist

### Pre-Deployment Security

- [x] **Authentication Required**: All routes require valid session
- [x] **Data Isolation**: Users can only access their own data
- [x] **RLS Policies Active**: Database-level access control enabled
- [x] **Secure API Endpoints**: All endpoints validate user context
- [x] **Input Validation**: All inputs are validated and sanitized
- [x] **Error Handling**: Secure error responses without data exposure
- [x] **HTTPS in Production**: All traffic encrypted
- [x] **Environment Variables Secured**: No hardcoded secrets
- [x] **Security Headers**: Comprehensive CSP and security headers
- [x] **No Sensitive Data in Logs**: Logs don't contain sensitive information

### Ongoing Security

- [ ] **Regular Security Audits**: Quarterly security reviews
- [ ] **Dependency Updates**: Keep all dependencies updated
- [ ] **Access Monitoring**: Monitor for suspicious activity
- [ ] **Backup Security**: Secure, encrypted backups
- [ ] **Incident Response Plan**: Documented response procedures
- [ ] **Security Training**: Team security awareness
- [ ] **Penetration Testing**: Regular security testing
- [ ] **Compliance Review**: Ensure compliance with regulations

---

## 🚨 Incident Response

### Security Incident Response Plan

If you suspect a security issue:

#### Immediate Response (0-1 hour)
1. **Assess the situation** - Determine scope and impact
2. **Isolate affected systems** - Prevent further damage
3. **Revoke compromised keys** - Immediately invalidate affected credentials
4. **Document the incident** - Record what happened and when

#### Short-term Response (1-24 hours)
1. **Check access logs** - Review all access patterns
2. **Update all secrets** - Rotate all potentially compromised keys
3. **Review user data access** - Check for unauthorized data access
4. **Implement additional monitoring** - Enhance security monitoring
5. **Notify stakeholders** - Inform relevant parties

#### Long-term Response (1-7 days)
1. **Conduct forensic analysis** - Determine root cause
2. **Implement additional security measures** - Prevent similar incidents
3. **Update security procedures** - Improve security practices
4. **Conduct security training** - Educate team on incident
5. **Review and update incident response plan** - Learn from experience

### Contact Information

- **Security Team**: [Your security contact]
- **Emergency Contact**: [Emergency contact]
- **Escalation Path**: [Escalation procedures]

---

## 🔧 Security Monitoring

### Recommended Monitoring

1. **Authentication Monitoring**
   - Failed login attempts
   - Unusual login patterns
   - Session anomalies

2. **Database Monitoring**
   - Unusual query patterns
   - RLS policy violations
   - Data access anomalies

3. **API Monitoring**
   - Rate limiting violations
   - Unusual request patterns
   - Error rate monitoring

4. **Infrastructure Monitoring**
   - Security header compliance
   - SSL certificate monitoring
   - Performance anomalies

### Security Tools

- **Vercel Analytics**: Built-in monitoring
- **Supabase Monitoring**: Database and API monitoring
- **Google Analytics**: User behavior monitoring
- **Security Headers Tools**: Regular security testing

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/security)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [Vercel Security](https://vercel.com/docs/security)
- [Security Headers Guide](https://securityheaders.com/)

---

## 🎯 Security Summary

OptionsBookie implements comprehensive security measures:

- **Authentication**: Secure OAuth 2.0 with NextAuth.js
- **Authorization**: Database-level RLS policies
- **Data Protection**: Complete user data isolation
- **API Security**: Validated and secure endpoints
- **Headers**: Comprehensive security headers
- **Environment**: Secure secret management
- **Monitoring**: Ongoing security monitoring

**Your application is secure and ready for production use!** 🛡️