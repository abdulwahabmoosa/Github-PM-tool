import { processUnprocessedEvents } from '../lib/ruleEngine.js';

const TICK_MS = 15 * 1000;
let isRunning = false;
let intervalHandle = null;

async function tick() {
  if (isRunning) return;
  isRunning = true;
  try {
    const result = await processUnprocessedEvents();
    if (result.processed > 0) {
      console.log(`[ruleEngine] processed ${result.processed} events: ${result.transitioned} transitioned, ${result.skipped} skipped`);
    }
  } catch (err) {
    console.error('[ruleEngine] tick error:', err);
  } finally {
    isRunning = false;
  }
}

export function startRuleEngine() {
  if (intervalHandle) return;
  console.log(`[ruleEngine] starting, tick interval ${TICK_MS}ms`);
  tick().catch((err) => console.error('[ruleEngine] initial tick error:', err));
  intervalHandle = setInterval(tick, TICK_MS);
}

export function stopRuleEngine() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[ruleEngine] stopped');
  }
}
