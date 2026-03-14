import { router, publicProcedure } from '../trpc';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return 'ok';
  }),
});

export type AppRouter = typeof appRouter;
