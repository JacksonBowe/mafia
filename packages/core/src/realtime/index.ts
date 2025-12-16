import z from "zod";

export const RealtimeMessageSchema = z.object({
    type: z.string(),
    properties: z.looseObject({}),
})

export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>;