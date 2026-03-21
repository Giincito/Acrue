import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { bot } from '@/lib/telegram';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('telegram_chat_id')
      .eq('id', user.id)
      .single();

    if (dbError || !userData?.telegram_chat_id) {
      return NextResponse.json({ error: 'El usuario no tiene un telegram_chat_id vinculado' }, { status: 400 });
    }

    if (!bot) {
      return NextResponse.json({ error: 'El bot de Telegram no está configurado (Falta TELEGRAM_BOT_TOKEN)' }, { status: 500 });
    }

    // Try sending the test message
    await bot.telegram.sendMessage(
      userData.telegram_chat_id, 
      "✅ *¡Prueba de conexión exitosa!*\n\nTu bot de Acrue está configurado correctamente y ya puede enviarte notificaciones directamente a tu teléfono.",
      { parse_mode: 'Markdown' }
    );

    return NextResponse.json({ success: true, message: 'Mensaje de prueba enviado correctamente a ' + userData.telegram_chat_id });
  } catch (err: any) {
    console.error("Test Telegram Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
