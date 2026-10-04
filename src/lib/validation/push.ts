import { z } from "zod";

/** The parts of a browser PushSubscription (subscription.toJSON()) we store. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export const pushEndpointSchema = z.url().startsWith("https://").max(1000);
