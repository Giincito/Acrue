import { router, publicProcedure } from '../trpc';
import { taskRouter } from './tasks';
import { projectRouter } from './projects';
import { reminderRouter } from './reminders';
import { integrationRouter } from './integrations';
import { subjectRouter } from './subjects';
import { assignmentRouter } from './assignments';
import { moodleRouter } from './moodle';
import { expenseRouter } from './expenses';
import { categoryRouter } from './categories';
import { subscriptionRouter } from './subscriptions';
import { savingGoalRouter } from './savingGoals';
import { debtRouter } from './debts';
import { pantryItemRouter } from './pantryItems';
import { shoppingListRouter } from './shoppingList';
import { storeRouter } from './stores';
import { recipeRouter } from './recipes';
import { mealLogRouter } from './mealLog';
import { habitRouter } from './habits';
import { wishlistRouter } from './wishlist';
import { xpRouter } from './xp';
import { focusRouter } from './focus';
import { cerebroRouter } from './cerebro';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return 'ok';
  }),
  tasks: taskRouter,
  projects: projectRouter,
  reminders: reminderRouter,
  integrations: integrationRouter,
  subjects: subjectRouter,
  assignments: assignmentRouter,
  moodle: moodleRouter,
  expenses: expenseRouter,
  categories: categoryRouter,
  subscriptions: subscriptionRouter,
  savingGoals: savingGoalRouter,
  debts: debtRouter,
  pantryItems: pantryItemRouter,
  shoppingList: shoppingListRouter,
  stores: storeRouter,
  recipes: recipeRouter,
  mealLog: mealLogRouter,
  habits: habitRouter,
  wishlist: wishlistRouter,
  xp: xpRouter,
  focus: focusRouter,
  cerebro: cerebroRouter,
});

export type AppRouter = typeof appRouter;



