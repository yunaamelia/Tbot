/**
 * Performance monitoring and logging for all critical operations (T152)
 * Tracks operation timing, resource usage, and performance metrics
 */

const logger = require('./logger').child('performance');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      operations: {},
      resourceUsage: {
        memory: [],
        cpu: [],
      },
      errors: [],
    };
  }

  /**
   * Start timing an operation
   * @param {string} operationName Name of the operation
   * @returns {Function} Function to call when operation completes
   */
  startOperation(operationName) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    return (success = true, metadata = {}) => {
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      const operationMetrics = {
        duration,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external,
        },
        success,
        timestamp: new Date().toISOString(),
        ...metadata,
      };

      // Log performance metrics
      logger.info(`Operation: ${operationName}`, {
        duration: `${duration}ms`,
        memoryDelta: `${(operationMetrics.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        success,
        ...metadata,
      });

      // Track metrics
      if (!this.metrics.operations[operationName]) {
        this.metrics.operations[operationName] = {
          count: 0,
          totalDuration: 0,
          successCount: 0,
          errorCount: 0,
          avgDuration: 0,
        };
      }

      const opMetrics = this.metrics.operations[operationName];
      opMetrics.count++;
      opMetrics.totalDuration += duration;
      opMetrics.avgDuration = opMetrics.totalDuration / opMetrics.count;

      if (success) {
        opMetrics.successCount++;
      } else {
        opMetrics.errorCount++;
        this.metrics.errors.push({
          operation: operationName,
          timestamp: operationMetrics.timestamp,
          metadata,
        });
      }

      // Warn if operation is slow
      if (duration > 1000) {
        logger.warn(`Slow operation detected: ${operationName} took ${duration}ms`, metadata);
      }

      return operationMetrics;
    };
  }

  /**
   * Track resource usage
   * @returns {Object} Current resource usage metrics
   */
  trackResourceUsage() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    const resourceMetrics = {
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
      },
      cpu: {
        user: cpu.user,
        system: cpu.system,
      },
      timestamp: new Date().toISOString(),
    };

    this.metrics.resourceUsage.memory.push(resourceMetrics.memory);
    this.metrics.resourceUsage.cpu.push(resourceMetrics.cpu);

    // Keep only last 100 measurements
    if (this.metrics.resourceUsage.memory.length > 100) {
      this.metrics.resourceUsage.memory.shift();
      this.metrics.resourceUsage.cpu.shift();
    }

    return resourceMetrics;
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getSummary() {
    return {
      operations: this.metrics.operations,
      resourceUsage: {
        current: this.trackResourceUsage(),
        average: this.getAverageResourceUsage(),
      },
      errorCount: this.metrics.errors.length,
      recentErrors: this.metrics.errors.slice(-10),
    };
  }

  /**
   * Get average resource usage
   * @returns {Object} Average resource usage
   */
  getAverageResourceUsage() {
    if (this.metrics.resourceUsage.memory.length === 0) {
      return null;
    }

    const memoryCount = this.metrics.resourceUsage.memory.length;
    const avgMemory = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    };

    this.metrics.resourceUsage.memory.forEach((mem) => {
      avgMemory.heapUsed += mem.heapUsed;
      avgMemory.heapTotal += mem.heapTotal;
      avgMemory.external += mem.external;
      avgMemory.rss += mem.rss;
    });

    return {
      memory: {
        heapUsed: avgMemory.heapUsed / memoryCount,
        heapTotal: avgMemory.heapTotal / memoryCount,
        external: avgMemory.external / memoryCount,
        rss: avgMemory.rss / memoryCount,
      },
    };
  }

  /**
   * Get scalability recommendations for 1000+ concurrent interactions (T159, FR-042)
   * @returns {Object} Optimization recommendations
   */
  getScalabilityRecommendations() {
    const recommendations = [];
    const avgMemory = this.getAverageResourceUsage();

    // Check memory usage
    if (avgMemory && avgMemory.memory) {
      const heapUsedMB = avgMemory.memory.heapUsed / 1024 / 1024;
      if (heapUsedMB > 500) {
        recommendations.push({
          type: 'memory',
          severity: 'high',
          message: 'High memory usage detected. Consider optimizing memory-intensive operations.',
          suggestion:
            'Review caching strategies and implement memory cleanup for long-running operations.',
        });
      }
    }

    // Check for slow operations
    Object.keys(this.metrics.operations).forEach((opName) => {
      const op = this.metrics.operations[opName];
      if (op.avgDuration > 1000) {
        recommendations.push({
          type: 'performance',
          severity: 'medium',
          message: `Slow operation detected: ${opName} (avg: ${op.avgDuration.toFixed(2)}ms)`,
          suggestion: 'Consider optimizing database queries or implementing caching.',
        });
      }
    });

    // Check error rate
    const totalOps = Object.values(this.metrics.operations).reduce((sum, op) => sum + op.count, 0);
    const totalErrors = this.metrics.errors.length;
    if (totalOps > 0 && totalErrors / totalOps > 0.1) {
      recommendations.push({
        type: 'reliability',
        severity: 'high',
        message: `High error rate detected: ${((totalErrors / totalOps) * 100).toFixed(2)}%`,
        suggestion: 'Review error handling and retry logic for failed operations.',
      });
    }

    return {
      recommendations,
      metrics: {
        totalOperations: totalOps,
        errorRate: totalOps > 0 ? (totalErrors / totalOps) * 100 : 0,
        averageMemoryUsage: avgMemory,
      },
    };
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics = {
      operations: {},
      resourceUsage: {
        memory: [],
        cpu: [],
      },
      errors: [],
    };
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Track resource usage periodically
setInterval(() => {
  performanceMonitor.trackResourceUsage();
}, 60000); // Every minute

module.exports = performanceMonitor;
