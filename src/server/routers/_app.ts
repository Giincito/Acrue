import { router, publicProcedure } from '../trpc';
import { taskRouter } from './tasks';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return 'ok';
  }),
  tasks: taskRouter,
});

export type AppRouter = typeof appRouter;
