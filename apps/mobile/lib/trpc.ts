import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@barber/shared';

export const trpc = createTRPCReact<AppRouter>();
