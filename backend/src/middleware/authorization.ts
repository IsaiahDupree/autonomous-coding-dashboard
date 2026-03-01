/**
 * Authorization Middleware (PCT-WC-040)
 * ======================================
 *
 * Implements API authorization checks:
 * - Own data only (resource ownership)
 * - Admin protected (role-based access)
 * - Role checks (RBAC)
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * User roles in the system
 */
export enum UserRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
    VIEWER = 'viewer',
}

/**
 * Role hierarchy for permission checks
 * Higher roles inherit permissions from lower roles
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.VIEWER]: 1,
    [UserRole.MEMBER]: 2,
    [UserRole.ADMIN]: 3,
    [UserRole.OWNER]: 4,
};

/**
 * Check if a user has at least the required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Require a specific role or higher
 * (PCT-WC-040: Role checks)
 */
export function requireRole(minRole: UserRole) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (!req.organizationId) {
            return res.status(400).json({
                error: { code: 'MISSING_ORG', message: 'Organization context required' }
            });
        }

        try {
            // Get user's role in the organization
            const membership = await prisma.orgMembership.findUnique({
                where: {
                    userId_orgId: {
                        userId: req.user.userId,
                        orgId: req.organizationId,
                    }
                },
            });

            if (!membership) {
                return res.status(403).json({
                    error: { code: 'FORBIDDEN', message: 'Not a member of this organization' }
                });
            }

            const userRole = membership.role as UserRole;

            if (!hasRole(userRole, minRole)) {
                return res.status(403).json({
                    error: {
                        code: 'INSUFFICIENT_PERMISSIONS',
                        message: `Requires ${minRole} role or higher`,
                        details: { userRole, requiredRole: minRole }
                    }
                });
            }

            // Attach role to request for later use
            (req as any).userRole = userRole;

            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Authorization check failed' } });
        }
    };
}

/**
 * Require admin role
 * (PCT-WC-040: Admin protected)
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Require owner role
 */
export const requireOwner = requireRole(UserRole.OWNER);

/**
 * Require member role (basic access)
 */
export const requireMember = requireRole(UserRole.MEMBER);

/**
 * Check if user owns a resource
 * (PCT-WC-040: Own data only)
 */
export function requireOwnership(
    resourceType: 'brand' | 'product' | 'usp' | 'hook' | 'campaign' | 'ad' | 'template',
    idParam: string = 'id'
) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        const resourceId = req.params[idParam];

        if (!resourceId) {
            return res.status(400).json({
                error: { code: 'BAD_REQUEST', message: `Missing ${idParam} parameter` }
            });
        }

        try {
            let resource: any = null;

            // Query the resource based on type
            switch (resourceType) {
                case 'brand':
                    resource = await prisma.brand.findUnique({
                        where: { id: resourceId },
                        select: { userId: true },
                    });
                    break;

                case 'product':
                    resource = await prisma.product.findUnique({
                        where: { id: resourceId },
                        select: { userId: true },
                    });
                    break;

                // Add other resource types as needed
                default:
                    return res.status(400).json({
                        error: { code: 'BAD_REQUEST', message: `Unknown resource type: ${resourceType}` }
                    });
            }

            if (!resource) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: `${resourceType} not found` }
                });
            }

            // Check ownership
            if (resource.userId !== req.user.userId) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have permission to access this resource'
                    }
                });
            }

            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Authorization check failed' } });
        }
    };
}

/**
 * Check if user has access to organization resource
 * More flexible than requireOwnership - allows org members to access shared resources
 */
export function requireOrgAccess(
    resourceType: 'brand' | 'product' | 'campaign',
    idParam: string = 'id'
) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (!req.organizationId) {
            return res.status(400).json({
                error: { code: 'MISSING_ORG', message: 'Organization context required' }
            });
        }

        const resourceId = req.params[idParam];

        if (!resourceId) {
            return res.status(400).json({
                error: { code: 'BAD_REQUEST', message: `Missing ${idParam} parameter` }
            });
        }

        try {
            let resource: any = null;

            // Query the resource based on type
            switch (resourceType) {
                case 'brand':
                    resource = await prisma.brand.findUnique({
                        where: { id: resourceId },
                        select: { orgId: true },
                    });
                    break;

                case 'product':
                    resource = await prisma.product.findUnique({
                        where: { id: resourceId },
                        select: { orgId: true },
                    });
                    break;

                case 'campaign':
                    resource = await prisma.campaign.findUnique({
                        where: { id: resourceId },
                        select: { orgId: true },
                    });
                    break;

                default:
                    return res.status(400).json({
                        error: { code: 'BAD_REQUEST', message: `Unknown resource type: ${resourceType}` }
                    });
            }

            if (!resource) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: `${resourceType} not found` }
                });
            }

            // Check organization access
            if (resource.orgId !== req.organizationId) {
                return res.status(403).json({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'This resource belongs to a different organization'
                    }
                });
            }

            next();
        } catch (error) {
            console.error('Organization access check error:', error);
            res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Authorization check failed' } });
        }
    };
}

/**
 * Combine multiple authorization checks
 * All checks must pass for the request to proceed
 */
export function requireAll(...middlewares: Function[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        let index = 0;

        const runNext = async () => {
            if (index >= middlewares.length) {
                return next();
            }

            const middleware = middlewares[index++];

            try {
                await new Promise<void>((resolve, reject) => {
                    middleware(req, res, (err?: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                await runNext();
            } catch (error) {
                // Error already handled by middleware
            }
        };

        await runNext();
    };
}

/**
 * Require any one of multiple authorization checks
 * At least one check must pass for the request to proceed
 */
export function requireAny(...middlewares: Function[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        let lastError: any = null;

        for (const middleware of middlewares) {
            try {
                await new Promise<void>((resolve, reject) => {
                    middleware(req, res, (err?: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // If we get here, the check passed
                return next();
            } catch (error) {
                lastError = error;
                continue;
            }
        }

        // If we get here, all checks failed
        return res.status(403).json({
            error: {
                code: 'FORBIDDEN',
                message: 'Insufficient permissions'
            }
        });
    };
}

/**
 * Export authorization utilities
 */
export const authorization = {
    requireRole,
    requireAdmin,
    requireOwner,
    requireMember,
    requireOwnership,
    requireOrgAccess,
    requireAll,
    requireAny,
    hasRole,
};
