import { z } from 'zod';

export const PingSchema = z.object({
  message: z.string().min(1),
});

export type Ping = z.infer<typeof PingSchema>;
