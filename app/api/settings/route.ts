import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, updateSettings } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET() {
  try {
    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase.from('settings').select('*');
      if (!error && data) {
        const settingsMap: Record<string, string> = {};
        data.forEach((row: { key: string; value: string }) => {
          settingsMap[row.key] = row.value;
        });
        return NextResponse.json(settingsMap);
      }
    }

    // 2. Fallback to SQLite
    const settings = getAllSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // 1. Supabase first
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const upserts = Object.entries(body).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
        updated_at: new Date().toISOString()
      }));

      await supabase.from('settings').upsert(upserts, { onConflict: 'key' });
      logAdminAction(user.userId, user.username, 'update_settings', 'settings', undefined, Object.keys(body).join(', '));
      return NextResponse.json({ success: true });
    }

    // 2. Fallback to SQLite
    updateSettings(body);
    logAdminAction(user.userId, user.username, 'update_settings', 'settings', undefined, Object.keys(body).join(', '));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
