import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

describe("PomodoroTimer active focus task panel", () => {
  const source = readFileSync(join(process.cwd(), "src/components/focus/pomodoro-timer.tsx"), "utf8")

  it("keeps a task snapshot from the moment focus starts", () => {
    expect(source).toContain("type FocusPendingTask")
    expect(source).toContain("activeFocusTask")
    expect(source).toContain("setActiveFocusTask(selectedTaskId === FOCUS_FREE_SESSION_ID ? null : selectedTask)")
    expect(source).toContain("focusPanelTasks")
    expect(source).toContain("displayedActiveTaskLabel")
    expect(source).toContain("taskId: activeFocusTask?.id ?? null")
  })

  it("shows a minimal active focus task panel with a done action", () => {
    expect(source).toContain("FOCUS_ACTIVE_TASK_PANEL_CLASS")
    expect(source).toContain("Tarea seleccionada")
    expect(source).toContain("Pendientes")
    expect(source).toContain("Terminado")
    expect(source).toContain("aria-label=\"Marcar tarea seleccionada como terminada\"")
  })

  it("marks the selected focus task as completed through the tasks router", () => {
    expect(source).toContain("trpc.tasks.update.useMutation")
    expect(source).toContain("completeFocusedTask")
    expect(source).toContain("status: \"completed\"")
    expect(source).toContain("completed_at: completedAt")
    expect(source).toContain("utils.focus.pendingTasks.invalidate()")
    expect(source).toContain("utils.tasks.list.invalidate()")
  })
})
