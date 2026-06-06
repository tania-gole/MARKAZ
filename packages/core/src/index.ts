import { PingSchema, type Ping } from '@markaz/types';

export function validatePing(input: unknown): Ping {
  return PingSchema.parse(input);
}
