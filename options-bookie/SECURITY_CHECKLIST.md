# Security Checklist

## ✅ Environment Variables Security

- [x] All sensitive data uses environment variables (`process.env.*`)
- [x] No hardcoded API keys, secrets, or credentials in code
- [x] `.env.local` file is properly ignored by git (`.gitignore` line 34, 52)
- [x] Debug scripts use environment variables instead of hardcoded keys
- [x] Documentation shows placeholder values only

## ✅ Database Security

- [x] Row Level Security (RLS) enabled on all tables
- [x] Email-based authentication for user isolation
- [x] Portfolio ownership validation
- [x] Transaction ownership validation
- [x] Service role key only used server-side for admin operations

## ✅ API Security

- [x] All API routes require authentication
- [x] User data filtering at application level
- [x] Proper error handling without exposing sensitive information
- [x] Input validation and sanitization

## ✅ File Security

- [x] `.env*` files excluded from git
- [x] Database files (`.db`, `.sqlite`) excluded from git
- [x] Debug scripts use environment variables
- [x] No sensitive data in documentation
- [x] Migration scripts use environment variables

## ✅ Code Security

- [x] No console.log statements with sensitive data
- [x] Proper error handling without exposing internals
- [x] TypeScript for type safety
- [x] Input validation on all forms

## 🔒 Security Best Practices

### Environment Variables
```bash
# ✅ GOOD - Use environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

# ❌ BAD - Never hardcode secrets
const supabase = createClient(
  'https://your-project.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);
```

### Database Access
```typescript
// ✅ GOOD - Use proper RLS policies
CREATE POLICY "Users can view their own data" ON table_name
  FOR SELECT USING (user_id = auth.email());

// ❌ BAD - No RLS or overly permissive policies
CREATE POLICY "Anyone can view data" ON table_name
  FOR SELECT USING (true);
```

### Error Handling
```typescript
// ✅ GOOD - Generic error messages
catch (error) {
  console.error('Database error:', error);
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
}

// ❌ BAD - Exposing internal details
catch (error) {
  return NextResponse.json({
    error: `Database connection failed: ${error.message}`
  }, { status: 500 });
}
```

## 🚨 Critical Security Rules

1. **NEVER** commit `.env.local` or any file containing real secrets
2. **NEVER** hardcode API keys, passwords, or tokens in code
3. **ALWAYS** use environment variables for sensitive configuration
4. **ALWAYS** validate user input and sanitize data
5. **ALWAYS** use RLS policies for database access control
6. **ALWAYS** handle errors without exposing sensitive information

## 🔍 Security Audit Commands

Run these commands to check for security issues:

```bash
# Check for hardcoded secrets
grep -r "sk-\|pk_\|eyJ[A-Za-z0-9+/=]\{20,\}" src/ --exclude-dir=node_modules

# Check for environment variable usage
grep -r "process\.env\." src/ --exclude-dir=node_modules

# Verify .gitignore is working
git check-ignore .env.local

# Check for sensitive files
find . -name "*.env*" -o -name "*.key" -o -name "*.pem" | grep -v node_modules
```

## 📋 Pre-commit Checklist

Before committing any changes:

- [ ] No hardcoded secrets in code
- [ ] All sensitive data uses environment variables
- [ ] `.env.local` is not staged for commit
- [ ] No sensitive data in console.log statements
- [ ] Error messages don't expose internal details
- [ ] Database queries use proper RLS policies
- [ ] Input validation is in place

## 🆘 If Secrets Are Exposed

If you accidentally commit secrets:

1. **Immediately** revoke the exposed credentials
2. **Generate new** API keys and secrets
3. **Update** your environment variables
4. **Remove** the secrets from git history:
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch .env.local' \
   --prune-empty --tag-name-filter cat -- --all
   ```
5. **Force push** to update remote repository
6. **Notify** team members to update their local copies

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
