import { create } from 'zustand';
import { CreateTaskInput, UpdateTaskInput, TaskStatus } from '@/server/schema/task';

// Since we use tRPC for the actual network requests, the Zustand store
// is mainly for optimistic UI updates and local caching of the active view.

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  context_tag: string | null;
  status: TaskStatus;
  priority: number;
  due_at: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  project_id: string | null;
  recurrence_rule: string | null;
  completed_at: string | null;
  created_at: string;
  color?: string | null;
  university_type?: string | null;
  is_recurring?: boolean | null;
  icon?: string | null;
};

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  isLoading: false,

  setTasks: (tasks) => set({ tasks }),
  
  addTask: (task) => set((state) => ({ 
    tasks: [task, ...state.tasks] 
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((task) => 
      task.id === id ? { ...task, ...updates } : task
    )
  })),

  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id)
  })),
}));
