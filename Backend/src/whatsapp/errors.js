export class WhatsAppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function withTimeout(promise, ms, label = "Operation") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new WhatsAppError(504, "TIMEOUT", `${label} timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
