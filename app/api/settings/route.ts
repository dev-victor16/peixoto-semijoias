import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, updateSettings } from '@/lib/db';
import { requireAuth, logAdminAction } from '@/lib/auth';

export async function GET() {
  try {
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
    updateSettings(body);
    logAdminAction(user.userId, user.username, 'update_settings', 'settings', undefined, Object.keys(body).join(', '));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
