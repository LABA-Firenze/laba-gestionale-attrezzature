// backend/utils/supabaseStorage.js - Gestione Supabase Storage
// Nessuna credenziale in codice: usare variabili d'ambiente (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_STORAGE_S3_*).
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return { supabaseUrl, supabaseKey };
}

function getS3Config() {
  const endpoint = process.env.SUPABASE_STORAGE_S3_ENDPOINT;
  const region = process.env.SUPABASE_STORAGE_S3_REGION || 'eu-north-1';
  const accessKeyId = process.env.SUPABASE_STORAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, region, accessKeyId, secretAccessKey };
}

let _supabase = null;
let _s3Client = null;

function getSupabase() {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  if (!_supabase) _supabase = createClient(cfg.supabaseUrl, cfg.supabaseKey);
  return _supabase;
}

function getS3Client() {
  const cfg = getS3Config();
  if (!cfg) return null;
  if (!_s3Client) {
    _s3Client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      forcePathStyle: true,
    });
  }
  return _s3Client;
}

// Upload file a Supabase Storage tramite S3
export async function uploadFile(bucket, filePath, fileBuffer, contentType) {
  const s3 = getS3Client();
  if (!s3) {
    throw new Error('Storage S3 non configurato (imposta SUPABASE_STORAGE_S3_* in env).');
  }
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      Body: fileBuffer,
      ContentType: contentType
    });
    const result = await s3.send(command);
    return {
      path: filePath,
      fullPath: `${bucket}/${filePath}`,
      etag: result.ETag
    };
  } catch (error) {
    console.error('Errore upload file:', error);
    throw error;
  }
}

// Download file da Supabase Storage tramite S3
export async function downloadFile(bucket, filePath) {
  const s3 = getS3Client();
  if (!s3) throw new Error('Storage S3 non configurato (imposta SUPABASE_STORAGE_S3_* in env).');
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: filePath }));
    return result.Body;
  } catch (error) {
    console.error('Errore download file:', error);
    throw error;
  }
}

// Elimina file da Supabase Storage tramite S3
export async function deleteFile(bucket, filePath) {
  const s3 = getS3Client();
  if (!s3) throw new Error('Storage S3 non configurato (imposta SUPABASE_STORAGE_S3_* in env).');
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: filePath }));
    return true;
  } catch (error) {
    console.error('Errore eliminazione file:', error);
    throw error;
  }
}

// Ottieni URL pubblico del file
export function getPublicUrl(bucket, filePath) {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  return `${cfg.supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

// Export: usa getSupabase() per ottenere il client (null se env non configurata)
export default getSupabase;
