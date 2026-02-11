import { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

import { auth } from '@/lib/auth'

const AUTH_MESSAGE = {
  UNAUTHORIZED: 'Unauthorized Access',
  FORBIDDEN: 'Insufficient permissions',
} as const

export const authMiddleware = async (c: Context, next: () => Promise<void>) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    c.set('user', null)
    c.set('session', null)

    return next()
  }

  c.set('user', session.user)
  c.set('session', session.session)
  return next()
}

export const authGuard = () => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, { message: AUTH_MESSAGE.UNAUTHORIZED })
    }

    await next()
  })
}

export const adminGuard = () => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user || user.role !== 'admin') {
      throw new HTTPException(!user ? 401 : 403, {
        message: !user ? AUTH_MESSAGE.UNAUTHORIZED : AUTH_MESSAGE.FORBIDDEN,
      })
    }

    await next()
  })
}

/**
 * Role-based guard that checks if user has specific role(s)
 * @param allowedRoles - Single role or array of roles that can access the route
 */
export const roleGuard = (allowedRoles: string | string[]) => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, { message: AUTH_MESSAGE.UNAUTHORIZED })
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    const userRole = user.role || 'user'

    if (!roles.includes(userRole)) {
      throw new HTTPException(403, { message: AUTH_MESSAGE.FORBIDDEN })
    }

    await next()
  })
}

/**
 * Permission-based guard that checks if user has specific permissions
 * @param permissions - Object with resource and actions to check
 * @example
 * permissionGuard({ patients: ['create', 'read'] })
 */
export const permissionGuard = (permissions: Record<string, string[]>) => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, { message: AUTH_MESSAGE.UNAUTHORIZED })
    }

    try {
      // Check user permissions using better-auth API
      const hasPermission = await auth.api.userHasPermission({
        body: {
          userId: user.id,
          permissions,
        },
      })

      if (!hasPermission) {
        throw new HTTPException(403, { message: AUTH_MESSAGE.FORBIDDEN })
      }

      await next()
    } catch {
      throw new HTTPException(403, { message: AUTH_MESSAGE.FORBIDDEN })
    }
  })
}

/**
 * Combines role and permission checks
 * Useful when you want to allow specific roles OR check detailed permissions
 * @param allowedRoles - Roles that bypass permission check
 * @param permissions - Permissions to check if role check fails
 */
export const roleOrPermissionGuard = (
  allowedRoles: string | string[],
  permissions: Record<string, string[]>
) => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, { message: AUTH_MESSAGE.UNAUTHORIZED })
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    const userRole = user.role || 'user'

    // If user has one of the allowed roles, proceed
    if (roles.includes(userRole)) {
      await next()
      return
    }

    // Otherwise, check permissions
    try {
      const hasPermission = await auth.api.userHasPermission({
        body: {
          userId: user.id,
          permissions,
        },
      })

      if (!hasPermission) {
        throw new HTTPException(403, { message: AUTH_MESSAGE.FORBIDDEN })
      }

      await next()
    } catch {
      throw new HTTPException(403, { message: AUTH_MESSAGE.FORBIDDEN })
    }
  })
}
