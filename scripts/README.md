# OptionsBookie Database Scripts

This directory contains all database-related scripts for the OptionsBookie application.

## Directory Structure

- `setup/` - Initial database setup scripts
- `migration/` - Database migration scripts (run in order)
- `debug/` - Debug and testing scripts

## Setup Instructions

1. **Initial Setup**: Run `01-initial-database-setup.sql` in your Supabase SQL Editor
2. **Migrations**: If you have an existing database, run the migration scripts in order
3. **Debug**: Use debug scripts for troubleshooting

## Script Order

1. `01-initial-database-setup.sql` - Complete initial setup
2. `02-add-portfolio-support.sql` - Add portfolio functionality
3. `03-fix-user-id-schema.sql` - Fix user ID column type
4. `04-fix-rls-simple.sql` - Fix RLS policies

## Notes

- Always backup your database before running migration scripts
- Test scripts in a development environment first
- Some scripts may be obsolete if you're starting fresh
