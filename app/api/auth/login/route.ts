import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }
    const db = getDb();
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ? AND active = 1').get(username) as {
      id: number; username: string; password_hash: string; name: string; role: string;
    } | undefined;
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
