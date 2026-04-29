import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const BUCKET = 'wedding-photos';
export const MAX_FILES = 50;
export const MAX_SIZE = 10 * 1024 * 1024;
export const SESSION_SECONDS = 12 * 60 * 60;

export const ALBUM_SLUGS: Record<string, string> = {
  'Mayra': 'mayra',
  'Mehendi': 'mehendi',
  'South Indian Carnival': 'south-indian-carnival',
  'Sangeet': 'sangeet',
  'Milni & Phera': 'milni-phera',
  'Reception': 'reception',
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const encoder = new TextEncoder();

export function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...corsHeaders, 'Content-Type': 'application/json'},
  });
}

export function fail(status: number, message: string, code = 'GALLERY_ERROR') {
  return ok({error: code, message}, status);
}

export function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders});
  }
  return null;
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw httpError(400, 'Invalid JSON body');
  }
}

export function httpError(status: number, message: string, code = 'GALLERY_ERROR') {
  const error = new Error(message) as Error & {status: number; code: string};
  error.status = status;
  error.code = code;
  return error;
}

export function errorResponse(error: unknown) {
  const e = error as Error & {status?: number; code?: string};
  console.error('[gallery]', e);
  return fail(e.status || 500, e.message || 'Gallery request failed', e.code || 'GALLERY_ERROR');
}

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw httpError(500, 'Supabase service credentials are not configured');
  return createClient(url, serviceKey, {auth: {persistSession: false}});
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function displayName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function uploaderSlug(nameKey: string) {
  const slug = nameKey
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'guest';
}

export function validateName(name: string) {
  const display = displayName(name || '');
  if (display.length < 2) throw httpError(400, 'Please enter your name');
  if (display.length > 80) throw httpError(400, 'Name is too long');
  return display;
}

export function validatePin(pin: string) {
  const value = String(pin || '').trim();
  if (!/^\d{4,6}$/.test(value)) throw httpError(400, 'Use a 4-6 digit PIN');
  return value;
}

export function assertAlbum(album: string) {
  if (!Object.prototype.hasOwnProperty.call(ALBUM_SLUGS, album)) {
    throw httpError(400, 'Choose a valid event album');
  }
  return album;
}

export function assertImageType(type: string) {
  const clean = String(type || '').toLowerCase();
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
  if (!allowed.has(clean)) throw httpError(400, 'Only image files are allowed');
  return clean;
}

export function extensionFor(fileName: string, contentType: string) {
  const byMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  const ext = String(fileName || '').split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return byMime[contentType] || 'jpg';
}

export function validateFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) throw httpError(400, 'File size is invalid');
  if (size > MAX_SIZE) throw httpError(400, 'Each photo must be 10 MB or smaller');
  return Math.round(size);
}

export function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

export function hex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, salt: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${pin}`));
  return hex(new Uint8Array(digest));
}

function base64url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  return atob(padded);
}

async function hmac(message: string) {
  const secret = Deno.env.get('GALLERY_JWT_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw httpError(500, 'Gallery session secret is not configured');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64url(new Uint8Array(sig));
}

export async function signSession(payload: Record<string, unknown>) {
  const fullPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };
  const encodedPayload = base64url(encoder.encode(JSON.stringify(fullPayload)));
  const signature = await hmac(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifySession(token: string) {
  if (!token || typeof token !== 'string') throw httpError(401, 'Please verify your name and PIN again');
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) throw httpError(401, 'Please verify your name and PIN again');
  const expected = await hmac(encodedPayload);
  if (signature !== expected) throw httpError(401, 'Please verify your name and PIN again');
  const payload = JSON.parse(decodeBase64url(encodedPayload));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw httpError(401, 'Your upload session expired. Please enter your PIN again');
  }
  return payload as {
    sub: string;
    displayName: string;
    nameKey: string;
    uploaderSlug: string;
    exp: number;
  };
}
