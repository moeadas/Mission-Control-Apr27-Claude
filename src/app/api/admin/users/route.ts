import { NextRequest, NextResponse } from 'next/server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSuperAdminEmail, resolveAuthContextFromToken } from '@/lib/supabase/auth'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

async function requireSuperAdmin(request: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(request))
  if (!auth || auth.role !== 'super_admin') {
    return null
  }
  return auth
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })
    }

    const [{ data: authData, error: authError }, { data: profiles, error: profilesError }] = await Promise.all([
      supabase.auth.admin.listUsers(),
      supabase.from('profiles').select('*').order('email', { ascending: true }),
    ])

    if (authError) throw authError
    if (profilesError) throw profilesError

    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]))
    const users = (authData.users || []).map((user) => {
      const profile = profilesById.get(user.id)
      const superAdminEmail = getSuperAdminEmail()
      return {
        id: user.id,
        email: user.email || profile?.email || '',
        fullName: profile?.full_name || user.user_metadata?.full_name || '',
        role: profile?.role || (user.email?.toLowerCase() === superAdminEmail ? 'super_admin' : 'member'),
        isActive: profile?.is_active ?? true,
        confirmed: Boolean(user.email_confirmed_at),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
      }
    })

    const [{ data: clients }, { data: tasks }] = await Promise.all([
      supabase.from('clients').select('id, name, owner_user_id').order('name', { ascending: true }),
      supabase.from('tasks').select('id, title, owner_user_id, status').order('updated_at', { ascending: false }),
    ])

    return NextResponse.json({
      users,
      clients: clients || [],
      tasks: tasks || [],
    })
  } catch (error) {
    console.error('Failed to load admin users:', error)
    return NextResponse.json({ error: 'Failed to load admin users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })
    }

    const body = (await request.json()) as {
      mode?: 'create' | 'invite'
      email?: string
      fullName?: string
      password?: string
      role?: 'super_admin' | 'member'
    }

    const email = body.email?.trim().toLowerCase()
    const superAdminEmail = getSuperAdminEmail()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const mode = body.mode === 'invite' ? 'invite' : 'create'
    const fullName = body.fullName?.trim() || null
    const role = email === superAdminEmail ? 'super_admin' : body.role === 'super_admin' ? 'super_admin' : 'member'

    let userId: string | null = null
    let temporaryPassword: string | null = null

    if (mode === 'invite') {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: fullName ? { full_name: fullName } : undefined,
      })
      if (error) throw error
      userId = data.user?.id || null
    } else {
      temporaryPassword = body.password?.trim() || `${Math.random().toString(36).slice(2, 8)}A!9${Math.random().toString(36).slice(2, 6)}`
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      })
      if (error) throw error
      userId = data.user?.id || null
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unable to create user' }, { status: 500 })
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role,
        is_active: true,
      },
      { onConflict: 'id' }
    )

    if (profileError) throw profileError

    return NextResponse.json({
      ok: true,
      mode,
      user: {
        id: userId,
        email,
        fullName,
        role,
      },
      temporaryPassword,
    })
  } catch (error) {
    console.error('Failed to create or invite user:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create or invite user' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not available' }, { status: 503 })
    }

    const body = (await request.json()) as {
      userId?: string
      role?: 'super_admin' | 'member'
      isActive?: boolean
      fullName?: string
    }

    if (!body.userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(body.userId)
    if (authUserError) throw authUserError

    const email = authUserData.user?.email?.toLowerCase() || ''
    const lockedSuperAdmin = email === getSuperAdminEmail()
    const nextRole = lockedSuperAdmin ? 'super_admin' : body.role === 'super_admin' ? 'super_admin' : 'member'
    const nextIsActive = lockedSuperAdmin ? true : body.isActive ?? true

    if (typeof body.fullName === 'string') {
      const { error: updateUserError } = await supabase.auth.admin.updateUserById(body.userId, {
        user_metadata: {
          ...(authUserData.user?.user_metadata || {}),
          full_name: body.fullName,
        },
      })
      if (updateUserError) throw updateUserError
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: body.userId,
        email: authUserData.user?.email || '',
        full_name:
          typeof body.fullName === 'string'
            ? body.fullName
            : authUserData.user?.user_metadata?.full_name || null,
        role: nextRole,
        is_active: nextIsActive,
      },
      { onConflict: 'id' }
    )

    if (profileError) throw profileError

    return NextResponse.json({
      ok: true,
      user: {
        id: body.userId,
        email: authUserData.user?.email || '',
        role: nextRole,
        isActive: nextIsActive,
      },
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update user' }, { status: 500 })
  }
}
