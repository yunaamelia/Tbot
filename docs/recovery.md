# Database Recovery Procedures

**Task: T149**  
**Requirement: FR-017**

This document describes the procedures for recovering the database from backups.

## Overview

The backup and recovery system provides:
- Daily automated backups (encrypted by default)
- Manual backup creation
- Point-in-time recovery from backups
- Backup verification and integrity checks
- 30-day retention policy (configurable)

## Prerequisites

1. **Backup files**: Ensure backup files exist in the backup directory (default: `./backups/`)
2. **Database access**: Ensure database credentials are configured in `.env`
3. **Encryption key**: If restoring encrypted backups, ensure `ENCRYPTION_KEY` is set

## Recovery Procedures

### 1. List Available Backups

```bash
# List all available backups
node scripts/recovery.js --list
```

Or use the recovery service programmatically:

```javascript
const RecoveryService = require('./scripts/recovery');
const recoveryService = new RecoveryService();
const backups = await recoveryService.listAvailableBackups();
```

### 2. Restore from Latest Backup

**Recommended for most recovery scenarios**

```bash
# Restore from the most recent backup
node scripts/recovery.js
```

This will:
1. List available backups
2. Select the latest backup
3. Prompt for confirmation
4. Restore the database

### 3. Restore from Specific Backup

```bash
# Restore from a specific backup file
node scripts/recovery.js backup_database_2024-01-15T02-00-00-000Z.sql.encrypted
```

### 4. Automated Recovery (No Confirmation)

For automated recovery scripts:

```javascript
const RecoveryService = require('./scripts/recovery');
const recoveryService = new RecoveryService();

// Restore from latest without confirmation prompt
await recoveryService.restoreLatest(false);
```

## Recovery Steps

### Step 1: Stop Application

Before restoring, stop the application to prevent data corruption:

```bash
# Stop the bot/server
pm2 stop premium-store-bot
# or
systemctl stop premium-store-bot
```

### Step 2: Verify Backup

Ensure the backup file exists and is valid:

```bash
# Check backup file
ls -lh backups/backup_*.sql*

# Verify backup integrity (automatic during restore)
```

### Step 3: Restore Database

```bash
# Restore from latest backup
node scripts/recovery.js
```

Or restore from specific backup:

```bash
node scripts/recovery.js backups/backup_database_2024-01-15T02-00-00-000Z.sql.encrypted
```

### Step 4: Verify Restoration

After restoration, verify the data:

```bash
# Check database connection
npm run migrate:verify

# Verify critical tables
# (Connect to database and check row counts)
```

### Step 5: Restart Application

```bash
# Start the bot/server
pm2 start premium-store-bot
# or
systemctl start premium-store-bot
```

## Backup Types

### Encrypted Backups

- **Format**: `.sql.encrypted`
- **Encryption**: AES-256-GCM
- **Key**: `ENCRYPTION_KEY` environment variable
- **Usage**: Automatically decrypted during restore

### Unencrypted Backups

- **Format**: `.sql` (PostgreSQL SQL format) or custom format
- **Usage**: Direct restore without decryption

## Recovery Scenarios

### Scenario 1: Complete Database Loss

**Situation**: Database server crashed or database was accidentally deleted.

**Recovery Steps**:
1. Ensure database server is running
2. Create new database if needed: `CREATE DATABASE premium_store;`
3. Run migrations: `npm run migrate`
4. Restore from latest backup: `node scripts/recovery.js`
5. Verify data integrity
6. Restart application

### Scenario 2: Partial Data Corruption

**Situation**: Some tables are corrupted but database is accessible.

**Recovery Steps**:
1. Stop application
2. Identify corrupted tables
3. Restore from backup (will overwrite all data)
4. Verify restoration
5. Restart application

### Scenario 3: Point-in-Time Recovery

**Situation**: Need to restore to a specific point in time.

**Recovery Steps**:
1. Identify backup closest to desired time
2. Restore from that backup: `node scripts/recovery.js backup_database_YYYY-MM-DDTHH-MM-SS.sql.encrypted`
3. Verify data
4. Restart application

### Scenario 4: Testing Recovery Procedure

**Situation**: Regular testing of recovery procedures (recommended monthly).

**Recovery Steps**:
1. Create test database: `CREATE DATABASE premium_store_test;`
2. Update `.env` to point to test database
3. Restore backup to test database
4. Verify data integrity
5. Document any issues
6. Switch back to production database

## Backup Verification

Backups are automatically verified after creation:
- File size check (non-zero)
- Decryption test (for encrypted backups)
- Format validation (for PostgreSQL custom format)

Manual verification:

```javascript
const BackupService = require('./scripts/backup');
const backupService = new BackupService();

const isValid = await backupService.verifyBackup('backups/backup_file.sql.encrypted', true);
console.log('Backup valid:', isValid);
```

## Troubleshooting

### Error: "No backups available"

**Solution**: Check backup directory and ensure backups exist:
```bash
ls -la backups/
```

### Error: "Invalid signature" or "Decryption failed"

**Solution**: Ensure `ENCRYPTION_KEY` matches the key used for backup creation.

### Error: "Database connection failed"

**Solution**: Verify database credentials in `.env`:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

### Error: "Permission denied"

**Solution**: Ensure database user has restore permissions:
- PostgreSQL: User needs `CREATE` and `INSERT` privileges
- MySQL: User needs `CREATE`, `INSERT`, `DROP` privileges

### Error: "Backup file not found"

**Solution**: Use absolute path or ensure backup file is in backup directory:
```bash
node scripts/recovery.js /absolute/path/to/backup.sql.encrypted
```

## Best Practices

1. **Regular Testing**: Test recovery procedures monthly
2. **Multiple Backups**: Keep backups in multiple locations
3. **Documentation**: Document any custom recovery procedures
4. **Monitoring**: Monitor backup creation and verify backups regularly
5. **Retention**: Adjust retention policy based on business needs
6. **Encryption**: Always use encrypted backups for production
7. **Verification**: Always verify backups after creation

## Configuration

### Environment Variables

```env
# Backup directory
BACKUP_DIR=./backups

# Retention period (days)
BACKUP_RETENTION_DAYS=30

# Backup schedule (cron format)
BACKUP_SCHEDULE=0 2 * * *

# Database configuration
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=premium_store
DB_USER=postgres
DB_PASSWORD=your_password

# Encryption key (required for encrypted backups)
ENCRYPTION_KEY=your_encryption_key
```

## Support

For issues or questions:
1. Check logs: `logs/backup.log` and `logs/recovery.log`
2. Review error messages
3. Contact system administrator

## Related Documentation

- Backup Script: `scripts/backup.js`
- Recovery Script: `scripts/recovery.js`
- Backup Scheduler: `src/lib/backup/backup-scheduler.js`
- Encryption Service: `src/lib/security/encryption-service.js`

