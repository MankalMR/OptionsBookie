#!/bin/bash

# =====================================================
# Pre-commit Security Check Script
# =====================================================
# This script runs before each commit to ensure no sensitive
# data is accidentally committed to the repository
# =====================================================

echo "🔒 Running pre-commit security checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any issues are found
ISSUES_FOUND=0

# Function to check for hardcoded secrets
check_hardcoded_secrets() {
    echo "🔍 Checking for hardcoded secrets..."

    # Check for common secret patterns
    SECRET_PATTERNS=(
        "sk-[a-zA-Z0-9]{20,}"  # Stripe secret keys
        "pk_[a-zA-Z0-9]{20,}"  # Stripe publishable keys
        "eyJ[A-Za-z0-9+/=]{20,}"  # JWT tokens
        "AIza[0-9A-Za-z\\-_]{35}"  # Google API keys
        "AKIA[0-9A-Z]{16}"  # AWS access keys
        "-----BEGIN PRIVATE KEY-----"  # Private keys
        "-----BEGIN RSA PRIVATE KEY-----"  # RSA private keys
    )

    for pattern in "${SECRET_PATTERNS[@]}"; do
        if git diff --cached --name-only | xargs grep -l "$pattern" 2>/dev/null; then
            echo -e "${RED}❌ Found potential hardcoded secret matching pattern: $pattern${NC}"
            ISSUES_FOUND=1
        fi
    done

    if [ $ISSUES_FOUND -eq 0 ]; then
        echo -e "${GREEN}✅ No hardcoded secrets found${NC}"
    fi
}

# Function to check for environment files
check_env_files() {
    echo "🔍 Checking for environment files..."

    ENV_FILES=$(git diff --cached --name-only | grep -E "\.env")

    if [ -n "$ENV_FILES" ]; then
        echo -e "${RED}❌ Environment files detected in staged changes:${NC}"
        echo "$ENV_FILES"
        echo -e "${YELLOW}⚠️  Environment files should not be committed!${NC}"
        ISSUES_FOUND=1
    else
        echo -e "${GREEN}✅ No environment files in staged changes${NC}"
    fi
}

# Function to check for database files
check_database_files() {
    echo "🔍 Checking for database files..."

    DB_FILES=$(git diff --cached --name-only | grep -E "\.(db|sqlite|sqlite3)$")

    if [ -n "$DB_FILES" ]; then
        echo -e "${RED}❌ Database files detected in staged changes:${NC}"
        echo "$DB_FILES"
        echo -e "${YELLOW}⚠️  Database files should not be committed!${NC}"
        ISSUES_FOUND=1
    else
        echo -e "${GREEN}✅ No database files in staged changes${NC}"
    fi
}

# Function to check for sensitive file extensions
check_sensitive_files() {
    echo "🔍 Checking for sensitive file types..."

    SENSITIVE_FILES=$(git diff --cached --name-only | grep -E "\.(key|pem|p12|pfx|crt|cer|der|json)$" | grep -v package-lock.json | grep -v tsconfig.json)

    if [ -n "$SENSITIVE_FILES" ]; then
        echo -e "${YELLOW}⚠️  Potentially sensitive files detected:${NC}"
        echo "$SENSITIVE_FILES"
        echo -e "${YELLOW}Please verify these files don't contain secrets before committing.${NC}"
    else
        echo -e "${GREEN}✅ No sensitive file types detected${NC}"
    fi
}

# Function to check for console.log with sensitive data
check_console_logs() {
    echo "🔍 Checking for potentially sensitive console.log statements..."

    # Check for console.log with environment variables or sensitive patterns
    SENSITIVE_LOGS=$(git diff --cached --name-only | xargs grep -l "console\.log.*process\.env\|console\.log.*password\|console\.log.*secret\|console\.log.*key" 2>/dev/null)

    if [ -n "$SENSITIVE_LOGS" ]; then
        echo -e "${YELLOW}⚠️  Potentially sensitive console.log statements found in:${NC}"
        echo "$SENSITIVE_LOGS"
        echo -e "${YELLOW}Please review these console.log statements for sensitive data.${NC}"
    else
        echo -e "${GREEN}✅ No sensitive console.log statements found${NC}"
    fi
}

# Run all checks
check_hardcoded_secrets
check_env_files
check_database_files
check_sensitive_files
check_console_logs

# Final result
echo ""
if [ $ISSUES_FOUND -eq 1 ]; then
    echo -e "${RED}🚨 Security issues found! Commit blocked.${NC}"
    echo -e "${YELLOW}Please fix the issues above before committing.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    echo -e "${GREEN}🚀 Safe to commit.${NC}"
    exit 0
fi
