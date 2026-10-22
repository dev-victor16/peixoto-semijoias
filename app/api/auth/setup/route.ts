import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, setupToken } = await request.json();
    const expectedToken = process.env.ADMIN_SETUP_TOKEN;
    if (!expectedToken || setupToken !== expectedToken) {
      return NextResponse.json({ error: 'Token de configuração inválido' }, { status: 403 });
    }
    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }
    const db = getDb();
    const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json({ error: 'Usuário já existe' }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    db.prepare('INSERT INTO admin_users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run(username, passwordHash, name, 'admin');
    return NextResponse.json({ success: true, message: 'Administrador criado com sucesso' });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
