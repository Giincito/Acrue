import { withFallback } from '@/lib/integrations/resilience'
/**
 * Moodle UNICEN API client with graceful degradation.
 * Uses the moodle_mobile_app webservice endpoint.
 * @module lib/moodle/client
 */

const MOODLE_BASE_URL = process.env.MOODLE_URL || 'https://moodle.exa.unicen.edu.ar'
const MOODLE_SERVICE = 'moodle_mobile_app'

interface MoodleTokenResponse {
  token?: string
  error?: string
  errorcode?: string
}

interface MoodleCourse {
  id: number
  fullname: string
  shortname: string
  startdate: number
  enddate: number
}

interface MoodleAssignment {
  id: number
  cmid: number
  course: number
  name: string
  duedate: number
  intro: string
}

interface MoodleAssignmentCourse {
  id: number
  fullname: string
  assignments: MoodleAssignment[]
}

export interface MoodleForum {
  id: number
  course: number
  name: string
  intro: string
}

export interface MoodleDiscussion {
  id: number
  name: string
  subject: string
  message: string
  created: number
  modified: number
  userfullname: string
}

export interface MoodleCourseModule {
  id: number
  name: string
  modicon: string
  modname: string // "resource", "folder", "url", "assign", "quiz", "forum"
  url?: string
  contents?: {
    filename: string
    fileurl: string
    mimetype?: string
    timecreated?: number
    timemodified?: number
  }[]
}

export interface MoodleCourseSection {
  id: number
  name: string
  modules: MoodleCourseModule[]
}

export interface MoodleQuiz {
  id: number
  course: number
  name: string
  intro: string
  timeopen: number
  timeclose: number
}

/**
 * Authenticates with Moodle and returns a token.
 * @throws Error if authentication fails
 */
export async function getMoodleToken(
  username: string,
  password: string
): Promise<string> {
  const url = `${MOODLE_BASE_URL}/login/token.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&service=${MOODLE_SERVICE}`

  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(10000), // 10s timeout
  })

  if (!response.ok) {
    throw new Error(`Moodle auth failed: HTTP ${response.status}`)
  }

  const data: MoodleTokenResponse = await response.json()

  if (data.error || data.errorcode) {
    throw new Error(data.error || `Moodle error: ${data.errorcode}`)
  }

  if (!data.token) {
    throw new Error('No token in Moodle response')
  }

  return data.token
}

/**
 * Calls a Moodle webservice function.
 */
async function callMoodleWS<T>(
  token: string,
  wsfunction: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const url = new URL(`${MOODLE_BASE_URL}/webservice/rest/server.php`)
  url.searchParams.set('wstoken', token)
  url.searchParams.set('wsfunction', wsfunction)
  url.searchParams.set('moodlewsrestformat', 'json')

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15000), // 15s timeout
  })

  if (!response.ok) {
    throw new Error(`Moodle WS call failed: HTTP ${response.status}`)
  }

  const data = await response.json()

  if (data.exception || data.errorcode) {
    throw new Error(data.message || `Moodle WS error: ${data.errorcode}`)
  }

  return data as T
}

export interface MoodleCalendarEvent {
  id: number
  name: string
  description: string
  eventtype: string
  courseid: number
  timestart: number
  timeduration: number
}

/**
 * Fetches upcoming calendar events for the user.
 */
export async function fetchMoodleCalendarUpcoming(token: string): Promise<MoodleCalendarEvent[]> {
  const result = await callMoodleWS<{ events: MoodleCalendarEvent[] }>(
    token,
    'core_calendar_get_calendar_upcoming_view',
    {}
  )
  return result.events || []
}


/**
 * Fetches the user's enrolled courses.
 */
export async function fetchMoodleCourses(token: string): Promise<MoodleCourse[]> {
  // First get user info to get userId
  const siteInfo = await callMoodleWS<{ userid: number }>(
    token,
    'core_webservice_get_site_info'
  )

  const courses = await callMoodleWS<MoodleCourse[]>(
    token,
    'core_enrol_get_users_courses',
    { userid: siteInfo.userid }
  )

  return courses
}

/**
 * Fetches assignments for given course IDs.
 */
export async function fetchMoodleAssignments(
  token: string,
  courseIds: number[]
): Promise<MoodleAssignmentCourse[]> {
  const params: Record<string, string | number> = {}
  courseIds.forEach((id, i) => {
    params[`courseids[${i}]`] = id
  })

  const result = await callMoodleWS<{ courses: MoodleAssignmentCourse[] }>(
    token,
    'mod_assign_get_assignments',
    params
  )

  return result.courses || []
}

/**
 * Fetches forums for given course IDs.
 */
export async function fetchMoodleForums(
  token: string,
  courseIds: number[]
): Promise<MoodleForum[]> {
  const params: Record<string, string | number> = {}
  courseIds.forEach((id, i) => {
    params[`courseids[${i}]`] = id
  })

  // Returns array of forums
  const result = await callMoodleWS<MoodleForum[]>(
    token,
    'mod_forum_get_forums_by_courses',
    params
  )

  return result || []
}

/**
 * Fetches recent discussions for a specific forum.
 */
export async function fetchMoodleDiscussions(
  token: string,
  forumId: number,
  page: number = 0,
  perpage: number = 10
): Promise<MoodleDiscussion[]> {
  const result = await callMoodleWS<{ discussions: MoodleDiscussion[] }>(
    token,
    'mod_forum_get_forum_discussions_paginated',
    {
      forumid: forumId,
      sortby: 'modified',
      sortdirection: 'DESC',
      page,
      perpage,
    }
  )

  return result.discussions || []
}

/**
 * Fetches contents (sections and modules) for a specific course.
 */
export async function fetchMoodleCourseContents(
  token: string,
  courseId: number
): Promise<MoodleCourseSection[]> {
  const result = await callMoodleWS<MoodleCourseSection[]>(
    token,
    'core_course_get_contents',
    { courseid: courseId }
  )

  return result || []
}

/**
 * Fetches quizzes (exams/tests) for given course IDs.
 */
export async function fetchMoodleQuizzes(
  token: string,
  courseIds: number[]
): Promise<MoodleQuiz[]> {
  const params: Record<string, string | number> = {}
  courseIds.forEach((id, i) => {
    params[`courseids[${i}]`] = id
  })

  const result = await callMoodleWS<{ quizzes: MoodleQuiz[] }>(
    token,
    'mod_quiz_get_quizzes_by_courses',
    params
  )

  return result.quizzes || []
}

/**
 * Wraps a Moodle call with graceful degradation.
 * Returns null instead of throwing on network/timeout errors.
 */
export async function withMoodleFallback<T>(
  fn: () => Promise<T>,
  fallbackLabel: string
): Promise<T | null> {
  const result = await withFallback<T | null>(
    async () => {
      try {
        return await fn()
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        throw new Error(`[Moodle] ${fallbackLabel}: ${message}`)
      }
    },
    null
  )

  return result.data
}

/**
 * Tests Moodle connectivity with given credentials.
 * Returns { ok: true, token } on success, or { ok: false, error } on failure.
 */
export async function testMoodleConnection(
  username: string,
  password: string
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const result = await withFallback<string | null>(
    async () => {
      try {
        return await getMoodleToken(username, password)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno'
        throw new Error(`[Moodle] connection test: ${message}`)
      }
    },
    null
  )

  return result.data
    ? { ok: true, token: result.data }
    : { ok: false, error: result.error ?? 'Moodle no disponible' }
}
