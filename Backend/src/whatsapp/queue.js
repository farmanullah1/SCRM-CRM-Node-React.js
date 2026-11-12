import { WhatsAppError, sleep } from "./errors.js";

/**
 * Serial send queue. WhatsApp Web runs in a single browser tab, so sending one
 * message at a time with a small randomized gap is both the fastest stable
 * throughput and the safest pattern against spam detection.
 */
export default class SendQueue {
  constructor({ delayMs, jitterMs, maxSize }) {
    this.delayMs = delayMs;
    this.jitterMs = jitterMs;
    this.maxSize = maxSize;
    this.jobs = [];
    this.running = false;
    this.lastRunAt = 0;
  }

  get size() {
    return this.jobs.length;
  }

  push(task) {
    if (this.jobs.length >= this.maxSize) {
      throw new WhatsAppError(429, "QUEUE_FULL", "Send queue is full, retry later.");
    }
    return new Promise((resolve, reject) => {
      this.jobs.push({ task, resolve, reject });
      this.#drain();
    });
  }

  clear(reason) {
    const pending = this.jobs.splice(0);
    for (const job of pending) job.reject(reason);
  }

  async #drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.jobs.length) {
        const gap = this.delayMs + Math.random() * this.jitterMs;
        const wait = this.lastRunAt + gap - Date.now();
        if (wait > 0) await sleep(wait);

        const job = this.jobs.shift();
        if (!job) break;
        try {
          job.resolve(await job.task());
        } catch (err) {
          job.reject(err);
        } finally {
          this.lastRunAt = Date.now();
        }
      }
    } finally {
      this.running = false;
    }
  }
}
