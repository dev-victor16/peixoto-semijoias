import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Por favor, informe seu nome.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Por favor, informe um e-mail válido.' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const db = getDb();
    const existing = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(cleanEmail);

    if (existing) {
      return NextResponse.json({ message: 'E-mail já cadastrado em nossa lista de novidades!' });
    }

    db.prepare('INSERT INTO newsletter_subscribers (name, email) VALUES (?, ?)').run(cleanName, cleanEmail);

    return NextResponse.json({ success: true, message: 'Inscrição realizada com sucesso! Você receberá novidades em breve.' });
  } catch (error) {
    console.error('Erro ao registrar inscrição no newsletter:', error);
    return NextResponse.json({ error: 'Não foi possível processar a inscrição no momento.' }, { status: 500 });
  }
}
