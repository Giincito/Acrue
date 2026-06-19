import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { createClient } from '@/utils/supabase/server';

// We need to fetch the context for each tRPC request 
// (which gets the user session from Supabase)
export const createContext = async (opts: { req: Request }) => {
  void opts
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return {
    supabase,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
