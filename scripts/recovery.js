/**
 * Recovery script for data restoration
 * Restores database from encrypted or unencrypted backups
 *
 * Task: T144
 * Requirement: FR-017
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const config = require('../src/lib/shared/config');
const logger = require('../src/lib/shared/logger').child('recovery');
const EncryptionService = require('../src/lib/security/encryption-service');
const encryptionService = new EncryptionService();

const execAsync = promisify(exec);

// Database configuration
const BACKUP_DIR = config.get('BACKUP_DIR', path.join(process.cwd(), 'backups'));
const DB_TYPE = config.get('DB_TYPE', 'postgresql');
const DB_HOST = config.require('DB_HOST');
const DB_PORT = parseInt(config.get('DB_PORT', DB_TYPE === 'postgresql' ? '5432' : '3306'), 10);
const DB_NAME = config.require('DB_NAME');
const DB_USER = config.require('DB_USER');
const DB_PASSWORD = config.get('DB_PASSWORD', '');

class RecoveryService {
  /**
   * List available backups for recovery
   * @returns {Promise<Array>} List of available backups
   */
  async listAvailableBackups() {
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

  /**
   * Restore database from backup (T144)
   * @param {string} backupPath Path to backup file
   * @param {boolean} isEncrypted Whether backup is encrypted
   * @param {boolean} confirmRestore Whether to skip confirmation (for automated recovery)
   * @returns {Promise<boolean>} True if restore successful
   */
  async restoreFromBackup(backupPath, isEncrypted = false, confirmRestore = true) {
    try {
      // Verify backup exists
      await fs.access(backupPath);

      // Decrypt backup if needed
      let restorePath = backupPath;
      let tempDecryptedPath = null;

      if (isEncrypted) {
        logger.info('Decrypting backup for restoration', { backupPath });
        const encryptedData = await fs.readFile(backupPath, 'utf8');
        const decryptedData = encryptionService.decrypt(encryptedData);
        const backupData = Buffer.from(decryptedData, 'base64');

        tempDecryptedPath = path.join(
          BACKUP_DIR,
          `temp_restore_${Date.now()}.sql`
        );
        await fs.writeFile(tempDecryptedPath, backupData);
        restorePath = tempDecryptedPath;

        logger.info('Backup decrypted', { restorePath });
      }

      // Confirm restoration (unless automated)
      if (confirmRestore) {
        const confirmed = await this.confirmRestore(backupPath);
        if (!confirmed) {
          if (tempDecryptedPath) {
            await fs.unlink(tempDecryptedPath);
          }
          console.log('❌ Recovery cancelled by user');
          return false;
        }
      }

      logger.info('Starting database restoration', {
        dbType: DB_TYPE,
        dbName: DB_NAME,
        backupPath: restorePath,
      });

      // Restore database
      let restoreCommand;
      if (DB_TYPE === 'postgresql') {
        // PostgreSQL restore
        const pgPassword = DB_PASSWORD ? `PGPASSWORD="${DB_PASSWORD}" ` : '';
        if (restorePath.endsWith('.sql')) {
          // SQL format
          restoreCommand = `${pgPassword}psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${restorePath}"`;
        } else {
          // Custom format
          restoreCommand = `${pgPassword}pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "${restorePath}"`;
        }
      } else if (DB_TYPE === 'mysql') {
        // MySQL restore
        restoreCommand = `mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} ${DB_PASSWORD ? `-p${DB_PASSWORD}` : ''} ${DB_NAME} < "${restorePath}"`;
      } else {
        throw new Error(`Unsupported database type: ${DB_TYPE}`);
      }

      // Execute restore command
      await execAsync(restoreCommand, {
        env: {
          ...process.env,
          PGPASSWORD: DB_PASSWORD, // For PostgreSQL
        },
      });

      // Cleanup temporary decrypted file
      if (tempDecryptedPath) {
        await fs.unlink(tempDecryptedPath);
      }

      logger.info('Database restoration completed', {
        dbName: DB_NAME,
        backupPath,
      });

      console.log('✅ Database restored successfully');
      return true;
    } catch (error) {
      logger.error('Error restoring database', error, { backupPath });
      throw error;
    }
  }

  /**
   * Confirm restoration with user
   * @param {string} backupPath Path to backup file
   * @returns {Promise<boolean>} True if user confirms
   */
  async confirmRestore(backupPath) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log('\n⚠️  WARNING: This will overwrite the current database!');
      console.log(`Backup file: ${path.basename(backupPath)}`);
      console.log(`Database: ${DB_NAME}`);
      rl.question('\nAre you sure you want to proceed? (yes/no): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Restore from latest backup
   * @param {boolean} confirmRestore Whether to skip confirmation
   * @returns {Promise<boolean>} True if restore successful
   */
  async restoreLatest(confirmRestore = true) {
    try {
      const backups = await this.listAvailableBackups();
      if (backups.length === 0) {
        throw new Error('No backups available for restoration');
      }

      const latestBackup = backups[0];
      console.log(`📦 Restoring from latest backup: ${latestBackup.filename}`);
      console.log(`   Created: ${latestBackup.createdAt.toISOString()}`);
      console.log(`   Size: ${(latestBackup.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Encrypted: ${latestBackup.encrypted ? 'Yes' : 'No'}`);

      return await this.restoreFromBackup(
        latestBackup.path,
        latestBackup.encrypted,
        confirmRestore
      );
    } catch (error) {
      logger.error('Error restoring from latest backup', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const recoveryService = new RecoveryService();

  async function main() {
    try {
      const args = process.argv.slice(2);
      const backupFile = args[0];

      if (backupFile) {
        // Restore from specific backup file
        const backupPath = path.isAbsolute(backupFile)
          ? backupFile
          : path.join(BACKUP_DIR, backupFile);
        const isEncrypted = backupFile.endsWith('.encrypted');

        await recoveryService.restoreFromBackup(backupPath, isEncrypted, true);
      } else {
        // List backups and restore from latest
        const backups = await recoveryService.listAvailableBackups();

        if (backups.length === 0) {
          console.log('❌ No backups found');
          process.exit(1);
        }

        console.log('\n📋 Available backups:');
        backups.forEach((backup, index) => {
          console.log(
            `  ${index + 1}. ${backup.filename} (${backup.createdAt.toISOString().split('T')[0]}, ${(backup.size / 1024 / 1024).toFixed(2)} MB)`
          );
        });

        await recoveryService.restoreLatest(true);
      }

      process.exit(0);
    } catch (error) {
      console.error('❌ Recovery failed:', error.message);
      process.exit(1);
    }
  }

  main();
}

module.exports = RecoveryService;

