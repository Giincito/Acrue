import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { pushGoogleCalendarEvent } from './google-calendar';

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: vi.fn()
}));

const { mockInsert, mockUpdate, mockDelete, mockSetCredentials, mockCalendarList, mockCalendarInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockSetCredentials: vi.fn(),
  mockCalendarList: vi.fn(),
  mockCalendarInsert: vi.fn()
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(function() {
        return { setCredentials: mockSetCredentials };
      })
    },
    calendar: vi.fn().mockReturnValue({
      calendarList: {
        list: mockCalendarList
      },
      calendars: {
        insert: mockCalendarInsert
      },
      events: {
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete
      }
    })
  }
}));

describe('Google Calendar Sync Push', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('returns null if there is no Google integration token', async () => {
    const { createServiceClient } = await import('@/utils/supabase/service');
    (createServiceClient as Mock).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    const result = await pushGoogleCalendarEvent('test-user-id', {
      title: 'My Task',
      start_at: new Date().toISOString(),
      end_at: new Date().toISOString()
    });
    
    expect(result).toBeNull();
  });

  it('pushes the event to Google Calendar and returns the event id', async () => {
    const { createServiceClient } = await import('@/utils/supabase/service');
    (createServiceClient as Mock).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { refresh_token: 'valid-token' }, error: null })
    });

    mockInsert.mockResolvedValue({ data: { id: 'mock-gcal-id' } });

    const result = await pushGoogleCalendarEvent('test-user-id', {
      title: 'My Task',
      description: 'Test description',
      start_at: '2026-03-20T10:00:00Z',
      end_at: '2026-03-20T11:00:00Z',
      is_all_day: false
    });
    
    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: 'valid-token' });
    expect(mockInsert).toHaveBeenCalled();
    expect(result).toBe('mock-gcal-id');
  });

  describe('getOrCreateAcrueCalendar', () => {
    it('creates a new Acrue calendar if one does not exist', async () => {
      const { createServiceClient } = await import('@/utils/supabase/service');
      (createServiceClient as Mock).mockReturnValue({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { refresh_token: 'valid-token' }, error: null })
      });

      mockCalendarList.mockResolvedValue({ data: { items: [{ id: 'primary', summary: 'My Email' }] } });
      mockCalendarInsert.mockResolvedValue({ data: { id: 'new-acrue-cal-id' } });
      
      const { getOrCreateAcrueCalendar } = await import('./google-calendar');
      const authClient = new (await import('googleapis')).google.auth.OAuth2();
      
      const calendarId = await getOrCreateAcrueCalendar(authClient);
      
      expect(mockCalendarList).toHaveBeenCalled();
      expect(mockCalendarInsert).toHaveBeenCalledWith({ 
        requestBody: { 
          summary: 'Acrue',
          description: 'Tareas y Eventos sincronizados desde tu tablero de Acrue.'
        } 
      });
      expect(calendarId).toBe('new-acrue-cal-id');
    });

    it('returns existing Acrue calendar id if it exists', async () => {
      mockCalendarList.mockResolvedValue({ 
        data: { 
          items: [
            { id: 'primary', summary: 'My Email' },
            { id: 'existing-acrue-id', summary: 'Acrue' }
          ] 
        } 
      });
      
      const { getOrCreateAcrueCalendar } = await import('./google-calendar');
      const authClient = new (await import('googleapis')).google.auth.OAuth2();
      const calendarId = await getOrCreateAcrueCalendar(authClient);
      
      expect(mockCalendarInsert).not.toHaveBeenCalled();
      expect(calendarId).toBe('existing-acrue-id');
    });
  });
});
