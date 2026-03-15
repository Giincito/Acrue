import { router, publicProcedure } from '../trpc';
import { taskRouter } from './tasks';
import { projectRouter } from './projects';
import { reminderRouter } from './reminders';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return 'ok';
  }),
  tasks: taskRouter,
  projects: projectRouter,
  reminders: reminderRouter,
});

export type AppRouter = typeof appRouter;


