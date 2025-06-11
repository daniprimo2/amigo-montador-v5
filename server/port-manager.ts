/**
 * Port Management System
 * Ensures only necessary ports are used and prevents conflicts
 */

import { execSync } from 'child_process';

export class PortManager {
  private readonly REQUIRED_PORT = 5000;
  private readonly CONFLICTING_PORTS = [3000, 3001, 3002, 5001, 6000, 6001, 7000, 8000, 8080, 9000, 9999];

  /**
   * Validates that only the required port is in use
   */
  validatePortConfiguration(): void {
    console.log('🔍 Validating port configuration...');
    
    // Check if required port is available
    const isRequiredPortFree = this.isPortAvailable(this.REQUIRED_PORT);
    if (!isRequiredPortFree) {
      const processInfo = this.getPortProcess(this.REQUIRED_PORT);
      if (!processInfo.includes('node') && !processInfo.includes('npm')) {
        throw new Error(`Port ${this.REQUIRED_PORT} is occupied by non-application process: ${processInfo}`);
      }
    }

    // Check for conflicts on other ports
    const conflictingProcesses = this.findConflictingProcesses();
    if (conflictingProcesses.length > 0) {
      console.warn('⚠️ Found processes on conflicting ports:', conflictingProcesses);
    }

    console.log('✅ Port configuration validated');
  }

  /**
   * Checks if a port is available
   */
  private isPortAvailable(port: number): boolean {
    try {
      execSync(`lsof -i :${port}`, { stdio: 'ignore' });
      return false; // Port is in use
    } catch {
      return true; // Port is available
    }
  }

  /**
   * Gets information about process using a port
   */
  private getPortProcess(port: number): string {
    try {
      return execSync(`lsof -i :${port} -t | head -1 | xargs ps -p | tail -1`, { encoding: 'utf8' }).trim();
    } catch {
      return 'Unknown process';
    }
  }

  /**
   * Finds processes running on conflicting ports
   */
  private findConflictingProcesses(): Array<{ port: number; process: string }> {
    const conflicts: Array<{ port: number; process: string }> = [];

    this.CONFLICTING_PORTS.forEach(port => {
      try {
        execSync(`lsof -i :${port}`, { stdio: 'ignore' });
        const process = this.getPortProcess(port);
        conflicts.push({ port, process });
      } catch {
        // Port is free, no conflict
      }
    });

    return conflicts;
  }

  /**
   * Ensures server runs on correct port with proper configuration
   */
  getOptimalServerConfig() {
    const port = parseInt(process.env.PORT || '5000');
    const host = '0.0.0.0';

    // Validate port is the expected one
    if (port !== this.REQUIRED_PORT) {
      console.warn(`⚠️ Port mismatch: Expected ${this.REQUIRED_PORT}, got ${port}`);
    }

    return {
      port,
      host,
      reusePort: true,
      options: {
        keepAlive: true,
        keepAliveInitialDelay: 30000
      }
    };
  }

  /**
   * Logs current port status
   */
  logPortStatus(): void {
    console.log(`📊 Port Status Report:`);
    const isAvailable = this.isPortAvailable(this.REQUIRED_PORT);
    console.log(`   Required Port: ${this.REQUIRED_PORT} (${isAvailable ? 'Available' : 'In Use'})`);
    
    const conflicts = this.findConflictingProcesses();
    if (conflicts.length > 0) {
      console.log(`   Conflicting Processes: ${conflicts.length}`);
      conflicts.forEach(({ port, process }) => {
        console.log(`     Port ${port}: ${process.substring(0, 50)}...`);
      });
    } else {
      console.log(`   No conflicting processes detected`);
    }
  }
}

export const portManager = new PortManager();