require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:3000/api/auth/google/callback`
);

async function testPush() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const userId = '44a94f4e-b8fc-4120-bc33-95219702bf37'; // maxdibe07@gmail.com
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('settings')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }

  const refreshToken = user?.settings?.google_refresh_token;
  if (!refreshToken) {
    console.log('No refresh token found for user');
    return;
  }

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    console.log('1. Checking Calendar List...');
    const listRes = await calendar.calendarList.list();
    const calendars = listRes.data.items || [];
    let calendarId = null;

    const acrueCalendar = calendars.find(c => c.summary === 'Acrue');
    if (acrueCalendar && acrueCalendar.id) {
      console.log('Acrue calendar found:', acrueCalendar.id);
      calendarId = acrueCalendar.id;
    } else {
      console.log('2. Creating new Acrue calendar...');
      const insertRes = await calendar.calendars.insert({
        requestBody: {
          summary: 'Acrue',
          description: 'Tareas y Eventos sincronizados desde tu tablero de Acrue.'
        }
      });
      console.log('Acrue calendar created:', insertRes.data.id);
      calendarId = insertRes.data.id;
    }

    console.log('3. Pushing test event...');
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: {
        summary: 'TEST AUTONOMO ACRUE',
        description: 'Testing background push',
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      }
    });

    console.log('Success! Event ID:', response.data.id);

  } catch (error) {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPush();
