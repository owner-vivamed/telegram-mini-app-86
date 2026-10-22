// Telegram Mini App initData ni tekshiradi va Supabase uchun qisqa muddatli JWT beradi.
// Secrets: BOT_TOKEN (BotFather), JWT_SECRET (Project Settings → API → JWT Secret)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const enc = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
    const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return crypto.subtle.sign('HMAC', k, enc.encode(data));
}
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64url = (b: ArrayBuffer | string) => {
    const bytes = typeof b === 'string' ? enc.encode(b) : new Uint8Array(b);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function verifyInitData(initData: string, botToken: string) {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) throw new Error('hash yo\'q');
    params.delete('hash');
    const check = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
    const secret = await hmac(enc.encode('WebAppData'), botToken);
    const calc = hex(await hmac(secret, check));
    if (calc.length !== hash.length || calc !== hash) throw new Error('imzo noto\'g\'ri');
    const age = Date.now() / 1000 - Number(params.get('auth_date'));
    if (!(age >= 0 && age < 86400)) throw new Error('initData eskirgan');
    return JSON.parse(params.get('user') ?? 'null');
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
        const { initData } = await req.json();
        const user = await verifyInitData(initData, Deno.env.get('BOT_TOKEN')!);
        if (!user?.id) throw new Error('user yo\'q');

        const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const { error } = await admin.from('profiles').upsert({
            tg_id: user.id,
            first_name: user.first_name ?? '',
            last_name: user.last_name ?? '',
            username: user.username ?? null,
            photo_url: user.photo_url ?? null,
            last_seen: new Date().toISOString(),
        });
        if (error) throw error;

        const now = Math.floor(Date.now() / 1000);
        const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const body = b64url(JSON.stringify({
            aud: 'authenticated', role: 'authenticated',
            sub: String(user.id), tg_id: String(user.id),
            iat: now, exp: now + 12 * 3600,
        }));
        const sig = b64url(await hmac(enc.encode(Deno.env.get('JWT_SECRET')!), `${head}.${body}`));

        return new Response(JSON.stringify({ token: `${head}.${body}.${sig}`, user }), {
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
            status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
        });
    }
});
