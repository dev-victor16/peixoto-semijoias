import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    let user: { id: number; username: string; password_hash: string; name: string; role: string } | null = null;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('active', 1)
        .single();
      if (data) {
        user = data as { id: number; username: string; password_hash: string; name: string; role: string };
      }
    }

    if (!user) {
      const db = getDb();
      user = db.prepare('SELECT * FROM admin_users WHERE username = ? AND active = 1').get(username) as {
        id: number; username: string; password_hash: string; name: string; role: string;
      } | null;
    }

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }
    const token = createToken({ id: user.id, username: user.username, name: user.name, role: user.role });
    const response = NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return response;
  } catch (err: unknown) {
    console.error('Erro no login:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno no servidor' }, { status: 500 });
  }
}
