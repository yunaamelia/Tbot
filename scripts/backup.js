/**
 * Backup script using pg_dump/mysqldump
 * Creates encrypted database backups with verification
 *
 * Task: T143, T146, T147, T148
 * Requirement: FR-017
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../src/lib/shared/config');
const logger = require('../src/lib/shared/logger').child('backup');
const EncryptionService = require('../src/lib/security/encryption-service');
const encryptionService = new EncryptionService();

const execAsync = promisify(exec);

// Backup configuration
const BACKUP_DIR = config.get('BACKUP_DIR', path.join(process.cwd(), 'backups'));
const RETENTION_DAYS = parseInt(config.get('BACKUP_RETENTION_DAYS', '30'), 10);
const DB_TYPE = config.get('DB_TYPE', 'postgresql');
const DB_HOST = config.require('DB_HOST');
const DB_PORT = parseInt(config.get('DB_PORT', DB_TYPE === 'postgresql' ? '5432' : '3306'), 10);
const DB_NAME = config.require('DB_NAME');
const DB_USER = config.require('DB_USER');
const DB_PASSWORD = config.get('DB_PASSWORD', '');

class BackupService {
  /**
   * Create database backup (T143)
   * @param {boolean} encrypt Whether to encrypt the backup (T146)
   * @returns {Promise<Object>} Backup information
   */
  async createBackup(encrypt = true) {
    try {
      // Ensure backup directory exists
      await fs.mkdir(BACKUP_DIR, { recursive: true });

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `backup_${DB_NAME}_${timestamp}.sql`;
      const backupPath = path.join(BACKUP_DIR, backupFilename);

      logger.info('Starting database backup', {
        dbType: DB_TYPE,
        dbName: DB_NAME,
        backupPath,
        encrypt,
      });

      // Create backup using pg_dump or mysqldump
      let backupCommand;
      if (DB_TYPE === 'postgresql') {
        const pgPassword = DB_PASSWORD ? `PGPASSWORD="${DB_PASSWORD}" ` : '';
        backupCommand = `${pgPassword}pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F c -f "${backupPath}"`;
      } else if (DB_TYPE === 'mysql') {
        backupCommand = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} ${DB_PASSWORD ? `-p${DB_PASSWORD}` : ''} ${DB_NAME} > "${backupPath}"`;
      } else {
        throw new Error(`Unsupported database type: ${DB_TYPE}`);
      }

      // Execute backup command
      await execAsync(backupCommand, {
        env: {
          ...process.env,
          PGPASSWORD: DB_PASSWORD, // For PostgreSQL
        },
      });

      logger.info('Database backup created', { backupPath });

      // Encrypt backup if requested (T146)
      let encryptedPath = backupPath;
      if (encrypt) {
        encryptedPath = await this.encryptBackup(backupPath);
        // Remove unencrypted backup
        await fs.unlink(backupPath);
        logger.info('Backup encrypted', { encryptedPath });
      }

      // Verify backup integrity (T148)
      const isValid = await this.verifyBackup(encryptedPath, encrypt);
      if (!isValid) {
        throw new Error('Backup verification failed');
      }

      // Get backup metadata
      const stats = await fs.stat(encryptedPath);
      const backupInfo = {
        filename: path.basename(encryptedPath),
        path: encryptedPath,
        size: stats.size,
        createdAt: stats.birthtime,
        encrypted: encrypt,
        verified: true,
      };

      // Save backup metadata
      await this.saveBackupMetadata(backupInfo);

      logger.info('Backup completed successfully', {
        filename: backupInfo.filename,
        size: backupInfo.size,
        encrypted: encrypt,
      });

      console.log(`✅ Backup created: ${backupInfo.filename} (${(backupInfo.size / 1024 / 1024).toFixed(2)} MB)`);

      return backupInfo;
    } catch (error) {
      logger.error('Error creating backup', error);
      throw error;
    }
  }

  /**
   * Encrypt backup file (T146)
   * @param {string} backupPath Path to unencrypted backup
   * @returns {Promise<string>} Path to encrypted backup
   */
  async encryptBackup(backupPath) {
    try {
      const backupData = await fs.readFile(backupPath);
      const encryptedData = encryptionService.encrypt(backupData.toString('base64'));

      const encryptedPath = backupPath + '.encrypted';
      await fs.writeFile(encryptedPath, encryptedData, 'utf8');

      return encryptedPath;
    } catch (error) {
      logger.error('Error encrypting backup', error, { backupPath });
      throw error;
    }
  }

  /**
   * Verify backup integrity (T148)
   * @param {string} backupPath Path to backup file
   * @param {boolean} isEncrypted Whether backup is encrypted
   * @returns {Promise<boolean>} True if backup is valid
   */
  async verifyBackup(backupPath, isEncrypted) {
    try {
      // Check if file exists and has content
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        logger.error('Backup file is empty', { backupPath });
        return false;
      }

      // For encrypted backups, verify decryption works
      if (isEncrypted) {
        try {
          const encryptedData = await fs.readFile(backupPath, 'utf8');
          const decryptedData = encryptionService.decrypt(encryptedData);
          if (!decryptedData || decryptedData.length === 0) {
            logger.error('Backup decryption failed', { backupPath });
            return false;
          }
        } catch (error) {
          logger.error('Error verifying encrypted backup', error, { backupPath });
          return false;
        }
      }

      // For PostgreSQL custom format, verify it's a valid archive
      if (DB_TYPE === 'postgresql' && !isEncrypted) {
        try {
          const { stdout } = await execAsync(`pg_restore --list "${backupPath}" 2>&1 | head -1`);
          if (stdout.includes('error') || stdout.includes('invalid')) {
            logger.error('Invalid PostgreSQL backup format', { backupPath });
            return false;
          }
        } catch (error) {
          // If pg_restore fails, backup might be in SQL format (which is also valid)
          logger.debug('Backup verification: pg_restore check skipped (may be SQL format)');
        }
      }

      logger.info('Backup verification passed', { backupPath, isEncrypted });
      return true;
    } catch (error) {
      logger.error('Error verifying backup', error, { backupPath });
      return false;
    }
  }

  /**
   * Save backup metadata
   * @param {Object} backupInfo Backup information
   * @returns {Promise<void>}
   */
  async saveBackupMetadata(backupInfo) {
    try {
      const metadataPath = path.join(BACKUP_DIR, 'backup_metadata.json');
      let metadata = [];

      try {
        const existingData = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
        metadata = [];
      }

      metadata.push({
        ...backupInfo,
        createdAt: backupInfo.createdAt.toISOString(),
      });

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    } catch (error) {
      logger.error('Error saving backup metadata', error);
      // Don't throw - metadata is not critical
    }
  }

  /**
   * Clean up old backups based on retention policy (T147)
   * @returns {Promise<number>} Number of backups deleted
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const now = new Date();
      const retentionDate = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

      let deletedCount = 0;

      for (const file of files) {
        if (!file.startsWith('backup_') || file === 'backup_metadata.json') {
          continue;
        }

        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);

        if (stats.birthtime < retentionDate) {
          await fs.unlink(filePath);
          deletedCount++;
          logger.info('Deleted old backup', {
            filename: file,
            age: Math.floor((now - stats.birthtime) / (24 * 60 * 60 * 1000)),
            days: 'days',
          });
        }
      }

      if (deletedCount > 0) {
        console.log(`🗑️  Cleaned up ${deletedCount} old backup(s) (retention: ${RETENTION_DAYS} days)`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old backups', error);
      throw error;
    }
  }

  /**
   * List available backups
   * @returns {Promise<Array>} List of backup files
   */
  async listBackups() {
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const backups = [];

      for (const file of files) {
        if (!file.startsWith('backup_') || file === 'backup_metadata.json') {
          continue;
        }

        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);

        backups.push({
          filename: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          encrypted: file.endsWith('.encrypted'),
        });
      }

      return backups.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error('Error listing backups', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const backupService = new BackupService();

  async function main() {
    try {
      // Create backup
      await backupService.createBackup(true);

      // Cleanup old backups
      await backupService.cleanupOldBackups();

      console.log('✅ Backup process completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      process.exit(1);
    }
  }

  main();
}

module.exports = BackupService;

