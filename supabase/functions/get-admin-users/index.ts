import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they're an admin
    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminRole, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for optional userIds filter
    let userIds: string[] | null = null;
    try {
      const body = await req.json();
      if (body?.userIds && Array.isArray(body.userIds)) {
        userIds = body.userIds;
      }
    } catch {
      // No body or not JSON — fetch all users paginated
    }

    // Fetch users from auth.users with pagination (max 1000 per call)
    const userEmails: Record<string, string> = {};

    if (userIds && userIds.length > 0) {
      // Fetch specific users in batches of 50
      const batchSize = 50;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        for (const uid of batch) {
          try {
            const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(uid);
            if (authUser?.email) {
              userEmails[authUser.id] = authUser.email;
            }
          } catch {
            // Skip if user not found
          }
        }
      }
    } else {
      // Paginated listUsers for full list
      let page = 1;
      const perPage = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

        if (authError) {
          console.error('Error fetching auth users page', page, authError);
          break;
        }

        authUsers.forEach((u) => {
          userEmails[u.id] = u.email || '';
        });

        hasMore = authUsers.length === perPage;
        page++;
      }
    }

    return new Response(
      JSON.stringify({ userEmails }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-admin-users:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
