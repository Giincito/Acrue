import { router, publicProcedure } from '../trpc';
import { taskRouter } from './tasks';
import { projectRouter } from './projects';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return 'ok';
  }),
  tasks: taskRouter,
  projects: projectRouter,
});

export type AppRouter = typeof appRouter;

