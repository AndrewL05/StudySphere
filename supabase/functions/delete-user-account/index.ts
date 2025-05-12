import { serve } from 'https://deno.land/std@0.177.0/http/server.ts' 
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const handleCorsAndRespond = (
  req: Request, 
  responseBody?: object | string | null,
  options?: ResponseInit,
  isOptionsRequest: boolean = false
): Response => {
  const headers = new Headers(options?.headers);

  const allowedOrigins = [
    'http://localhost:5173', 
    'https://andrewl-studysphere.netlify.app' 
  ];

  const requestOrigin = req.headers.get('Origin');
  let originToAllow = null;

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    originToAllow = requestOrigin;
  }

  if (originToAllow) {
    headers.set('Access-Control-Allow-Origin', originToAllow);
  }

  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Credentials', 'true');

  if (isOptionsRequest) {
    return new Response(null, { status: 204, headers });
  }

  const body = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
  const status = options?.status || (responseBody ? 200 : 204);

  return new Response(body, { ...options, status, headers });
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsAndRespond(req, null, {}, true);
  }

  let supabaseAdmin: SupabaseClient | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return handleCorsAndRespond(req, { error: 'Server configuration error.' }, { status: 500 });
    }

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return handleCorsAndRespond(req, { error: 'Missing Authorization header.' }, { status: 401 });
    }

    const { data: { user: requestingUser }, error: getUserError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (getUserError || !requestingUser) {
      return handleCorsAndRespond(req, { error: 'Invalid token or user not found.' }, { status: 401 });
    }

    const userIdToDelete = requestingUser.id;

    const { error: deleteAuthUserError } =
      await supabaseAdmin.auth.admin.deleteUser(userIdToDelete, false);

    if (deleteAuthUserError) {
      return handleCorsAndRespond(req, { error: 'Failed to delete user authentication record.' }, { status: 500 });
    }

    return handleCorsAndRespond(req, { message: 'Account successfully deleted.' }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    const errorStatus = (error as any).status || 500;
    return handleCorsAndRespond(req, { error: errorMessage }, { status: errorStatus });
  }
});