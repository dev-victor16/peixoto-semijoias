import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { getSupabaseAdmin } from './supabase';

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'peixoto-semijoias-secret-key-change-in-production-2024';
};

const TOKEN_EXPIRY = '24h';
const COOKIE_NAME = 'peixoto_admin_token';

export interface AdminUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  name: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(user: AdminUser): string {
  return jwt.sign(
    { userId: user.id, username: user.username, name: user.name, role: user.role },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<JWTPayload> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Check Supabase if configured
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: dbUser } = await supabase
      .from('admin_users')
      .select('id, active')
      .eq('id', user.userId)
      .single();
    if (!dbUser || !dbUser.active) {
      throw new Error('Unauthorized');
    }
    return user;
  }

  // Verify user still exists and is active in local db
  const db = getDb();
  const dbUser = db.prepare('SELECT id, active FROM admin_users WHERE id = ?').get(user.userId) as { id: number; active: number } | undefined;
  if (!dbUser || !dbUser.active) {
    throw new Error('Unauthorized');
  }
  return user;
}

export function logAdminAction(
  userId: number | null,
  username: string | null,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: string
) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO admin_logs (user_id, username, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, username, action, entityType || null, entityId || null, details || null);
  } catch {
    // Ignore logging errors
  }
}

export { COOKIE_NAME };
