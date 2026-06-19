import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

describe("Calendar agenda view UI contract", () => {
  const source = readFileSync(join(process.cwd(), "src/components/calendar/calendar-view.tsx"), "utf8")
  const stylePath = join(process.cwd(), "src/components/calendar/calendar-view.css")
  const styleSource = existsSync(stylePath) ? readFileSync(stylePath, "utf8") : ""

  it("keeps the calendar visual system scoped outside SSR inline styles", () => {
    expect(source).toContain('import "./calendar-view.css"')
    expect(source).not.toContain("dangerouslySetInnerHTML")
    expect(source).not.toContain("<style")
    expect(styleSource).toContain(".calendar-view-scope .rbc-month-view")
    expect(styleSource).toContain("border-radius: 8px")
    expect(styleSource).toContain(".calendar-view-scope .rbc-event")
    expect(styleSource).toContain("border-radius: 8px !important")
    expect(styleSource).toContain("border: 1px solid color-mix(in srgb, var(--event-fg) 24%, transparent) !important")
    expect(styleSource).toContain("box-shadow: none !important")
    expect(styleSource).toContain(".calendar-view-scope .rbc-time-content")
    expect(styleSource).toContain("background: var(--card)")
  })

  it("keeps agenda items as compact semantic event rows without table dividers", () => {
    expect(source).not.toContain("function AgendaDateCell")
    expect(source).not.toContain("function AgendaTimeCell")
    expect(source).toContain("function AgendaEventPill")
    expect(source).toContain("agenda: {")
    expect(source).toContain("event: AgendaEventPill")
    expect(source).toContain("agenda-event-pill")
    expect(source).toContain("--agenda-event-bg")
    expect(source).toContain("--agenda-event-fg")
    expect(source).not.toContain("agenda-event-accent")
    expect(source).toContain("agenda-event-title")
    expect(styleSource).toContain(".calendar-view-scope .rbc-agenda-view table.rbc-agenda-table")
    expect(styleSource).toContain("border-spacing: 0 8px")
    expect(styleSource).toContain(".calendar-view-scope .rbc-agenda-view table.rbc-agenda-table tbody > tr > td")
    expect(styleSource).toContain("border: 0 !important")
    expect(styleSource).toContain(".calendar-view-scope .agenda-event-pill")
    expect(styleSource).toContain("border: 1px solid color-mix(in srgb, var(--agenda-event-fg) 24%, transparent)")
    expect(styleSource).toContain("background: var(--agenda-event-bg)")
    expect(styleSource).not.toContain(".calendar-view-scope .agenda-event-accent")
  })

  it("syncs the selected calendar view into the URL query", () => {
    expect(source).toContain("useRouter")
    expect(source).toContain("usePathname")
    expect(source).toContain("function handleViewChange(nextView: View)")
    expect(source).toContain('nextSearchParams.set("view", nextView)')
    expect(source).toContain("window.history.replaceState")
    expect(source).toContain("router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false })")
    expect(source).toContain("onView={handleViewChange}")
  })

  it("keeps the create event button aligned with the task primary CTA while compact", () => {
    expect(source).toContain("CALENDAR_CREATE_EVENT_BUTTON_CLASS")
    expect(source).toContain("h-[38px]")
    expect(source).toContain("bg-accent")
    expect(source).toContain("text-accent-foreground")
    expect(source).toContain("hover:bg-accent/90")
    expect(source).toContain("rounded-md")
    expect(source).not.toContain("rounded-xl bg-primary")
    expect(source).not.toContain("text-primary-foreground")
  })

  it("defers react-big-calendar until after mount to avoid SSR hydration mismatches", () => {
    expect(source).toContain("function CalendarLoadingState")
    expect(source).toContain("const [isMounted, setIsMounted] = React.useState(false)")
    expect(source).toContain("React.useEffect(() => {")
    expect(source).toContain("setIsMounted(true)")
    expect(source).toContain("if (!isMounted) return <CalendarLoadingState />")
  })
})
