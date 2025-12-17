import { createSubjects } from '@openauthjs/openauth/subject';
import { z } from 'zod';

export const subjects = createSubjects({
    user: z.object({
        name: z.string().optional(),
        discordId: z.string().optional(),
        userId: z.string(),
        isAdmin: z.boolean().default(false),
    }),
});
