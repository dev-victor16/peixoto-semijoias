import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const fileType = (file.type || '').toLowerCase();
    const fileExt = path.extname(file.name || '').toLowerCase();
    const isHeic = fileType.includes('heic') || fileType.includes('heif') || fileExt === '.heic' || fileExt === '.heif';

    // Tipos de arquivo aceitos (inclui HEIC/HEIF nativos de iPhone)
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'
    ];

    if (!allowedTypes.includes(fileType) && !isHeic && !['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(fileExt)) {
      return NextResponse.json({ error: 'Formato de foto não suportado. Envie JPG, PNG, WEBP ou HEIC.' }, { status: 400 });
    }

    // Limite de 20MB para fotos diretas de câmera de celular
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 20MB)' }, { status: 400 });
    }

    let buffer = Buffer.from(await file.arrayBuffer());
    let finalContentType = fileType || 'image/jpeg';
    let ext = fileExt || '.jpg';

    // Se for formato HEIC/HEIF (padrão iPhone), converte automaticamente para JPEG otimizado
    if (isHeic) {
      try {
        buffer = await sharp(buffer)
          .rotate() // Mantém a rotação e orientação correta tirada pelo iPhone
          .jpeg({ quality: 90 })
          .toBuffer();
        finalContentType = 'image/jpeg';
        ext = '.jpg';
      } catch (sharpErr) {
        console.error('Erro ao converter HEIC via sharp:', sharpErr);
        // Fallback: tenta converter para webp
        try {
          buffer = await sharp(buffer).rotate().webp({ quality: 90 }).toBuffer();
          finalContentType = 'image/webp';
          ext = '.webp';
        } catch (fallbackErr) {
          console.error('Falha na conversão de imagem:', fallbackErr);
          return NextResponse.json({ error: 'Não foi possível processar esta foto HEIC. Tente exportá-la como JPEG.' }, { status: 400 });
        }
      }
    }

    const filename = `${uuidv4()}${ext}`;

    // 1. Supabase Storage first (Permanente e em nuvem)
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase.storage
        .from('products')
        .upload(filename, buffer, {
          contentType: finalContentType,
          upsert: true
        });

      if (!error && data) {
        const { data: pubData } = supabase.storage.from('products').getPublicUrl(filename);
        return NextResponse.json({ url: pubData.publicUrl, filename });
      }
      console.error('Supabase storage upload error:', error);
    }

    // 2. Fallback para disco local
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url, filename });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'Unauthorized') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    console.error('Upload error:', e);
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 });
  }
}
