import { createSubjects } from '@openauthjs/openauth/subject';
import { z } from 'zod';

export const subjects = createSubjects({
    user: z.object({
        email: z.string(),
        name: z.string().optional(),
        discordId: z.string().optional(),
        userId: z.string()
    }),
});
