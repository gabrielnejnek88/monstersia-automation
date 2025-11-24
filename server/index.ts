import { startScheduler } from './scheduler';

// Start the scheduler when server starts
startScheduler();

console.log('[Monsters.ia] Scheduler initialized');

// Export the scheduler functions for potential use in other modules
export { startScheduler, stopScheduler, getSchedulerStatus } from './scheduler';
