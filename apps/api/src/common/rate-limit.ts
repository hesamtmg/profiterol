import { HttpException, HttpStatus } from '@nestjs/common';

/** A small in-memory limiter: at most `max` hits per key within `windowMs`. Good enough for one API instance. */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly message = 'Too many messages. Please try again in a few minutes.',
  ) {}

  check(key: string) {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      throw new HttpException(this.message, HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10000) this.hits.clear();
  }
}
