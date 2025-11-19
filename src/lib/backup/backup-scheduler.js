/**
 * Automated backup scheduler using node-cron
 * Schedules daily backups and cleanup
 *
 * Task: T145
 * Requirement: FR-017
 */

const cron = require('node-cron');
const logger = require('../shared/logger').child('backup-scheduler');
const BackupService = require('../../scripts/backup');
const config = require('../shared/config');

class BackupScheduler {
  constructor() {
    this.backupService = new BackupService();
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start automated backup scheduler (T145)
   * @param {string} schedule Cron schedule (default: daily at 2 AM)
   * @returns {void}
   */
  start(schedule = null) {
    if (this.isRunning) {
      logger.warn('Backup scheduler is already running');
      return;
    }

    // Default: Daily at 2 AM
    const cronSchedule = schedule || config.get('BACKUP_SCHEDULE', '0 2 * * *');

    logger.info('Starting backup scheduler', { schedule: cronSchedule });

    // Schedule daily backups
    const backupJob = cron.schedule(cronSchedule, async () => {
      try {
        logger.info('Scheduled backup started');
        await this.backupService.createBackup(true);
        await this.backupService.cleanupOldBackups();
        logger.info('Scheduled backup completed');
      } catch (error) {
        logger.error('Scheduled backup failed', error);
      }
    });

    this.jobs.push(backupJob);
    this.isRunning = true;

    logger.info('Backup scheduler started successfully', { schedule: cronSchedule });
  }

  /**
   * Stop backup scheduler
   * @returns {void}
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Backup scheduler is not running');
      return;
    }

    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    this.isRunning = false;

    logger.info('Backup scheduler stopped');
  }

  /**
   * Check if scheduler is running
   * @returns {boolean} True if running
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
    };
  }
}

module.exports = BackupScheduler;
