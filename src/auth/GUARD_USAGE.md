# Route Guards Usage Guide

This guide explains how to use the role-based and permission-based guards in your Hono application.

## Available Guards

### 1. `authGuard()`

Basic authentication check - ensures user is logged in.

```typescript
app.get('/protected', authGuard(), (c) => {
  // User is authenticated
})
```

### 2. `adminGuard()`

Ensures user has admin role.

```typescript
app.get('/admin/dashboard', adminGuard(), (c) => {
  // User is admin
})
```

### 3. `roleGuard(allowedRoles)`

Checks if user has specific role(s).

**Single role:**

```typescript
app.get('/doctors/dashboard', roleGuard('doctor'), (c) => {
  // Only doctors can access
})
```

**Multiple roles:**

```typescript
app.get('/clinical/notes', roleGuard(['doctor', 'nurse']), (c) => {
  // Doctors OR nurses can access
})
```

### 4. `permissionGuard(permissions)`

Checks if user has specific permissions based on their role's access control.

**Single resource:**

```typescript
app.post('/patients', permissionGuard({ patients: ['create'] }), (c) => {
  // User must have 'create' permission on 'patients'
})
```

**Multiple actions on one resource:**

```typescript
app.put(
  '/patients/:id',
  permissionGuard({ patients: ['read', 'update'] }),
  (c) => {
    // User must have BOTH 'read' AND 'update' permissions
  }
)
```

**Multiple resources:**

```typescript
app.post(
  '/appointments/with-billing',
  permissionGuard({
    appointments: ['create'],
    billing: ['create'],
  }),
  (c) => {
    // User must have permissions on BOTH resources
  }
)
```

### 5. `roleOrPermissionGuard(allowedRoles, permissions)`

Allows access if user has specified role(s) OR required permissions.

**Single role or permissions:**

```typescript
app.delete(
  '/patients/:id',
  roleOrPermissionGuard('admin', { patients: ['delete'] }),
  (c) => {
    // Admins can access OR users with delete permission
  }
)
```

**Multiple roles or permissions:**

```typescript
app.get(
  '/reports/financial',
  roleOrPermissionGuard(['admin', 'management'], {
    reports: ['read', 'generate'],
  }),
  (c) => {
    // Admin OR management roles can access
    // OR users with report permissions
  }
)
```

## Real-World Examples

### Example 1: Patient Management Routes

```typescript
import { permissionGuard, roleGuard } from '@/auth/auth-guard'
import { createRouter } from '@/lib/create-app'

const patientRouter = createRouter()

// List patients - multiple roles can access
patientRouter.get('/', roleGuard(['doctor', 'nurse', 'staff']), (c) => {
  // Handler code
})

// Create patient - needs specific permission
patientRouter.post('/', permissionGuard({ patients: ['create'] }), (c) => {
  // Handler code
})

// Update patient - needs read and update permissions
patientRouter.put(
  '/:id',
  permissionGuard({ patients: ['read', 'update'] }),
  (c) => {
    // Handler code
  }
)

// Delete patient - only admin or users with delete permission
patientRouter.delete(
  '/:id',
  roleOrPermissionGuard('admin', { patients: ['delete'] }),
  (c) => {
    // Handler code
  }
)

export default patientRouter
```

### Example 2: Laboratory Routes

```typescript
import { permissionGuard, roleGuard } from '@/auth/auth-guard'
import { createRouter } from '@/lib/create-app'

const labRouter = createRouter()

// View lab results - doctors and lab staff
labRouter.get('/results', roleGuard(['doctor', 'lab']), (c) => {
  // Handler code
})

// Create lab order
labRouter.post('/orders', permissionGuard({ laboratory: ['create'] }), (c) => {
  // Handler code
})

// Sign off on results - only lab staff with signoff permission
labRouter.post(
  '/results/:id/signoff',
  roleGuard('lab'),
  permissionGuard({ laboratory: ['signoff'] }),
  (c) => {
    // Handler code
  }
)

export default labRouter
```

### Example 3: Pharmacy Routes

```typescript
import { permissionGuard, roleGuard } from '@/auth/auth-guard'
import { createRouter } from '@/lib/create-app'

const pharmacyRouter = createRouter()

// View prescriptions - pharmacists and doctors
pharmacyRouter.get(
  '/prescriptions',
  roleGuard(['pharmacist', 'doctor']),
  (c) => {
    // Handler code
  }
)

// Dispense medication - needs multiple permissions
pharmacyRouter.post(
  '/dispense',
  permissionGuard({
    pharmacy: ['issue'],
    prescriptions: ['update'],
  }),
  (c) => {
    // Handler code
  }
)

// Manage inventory - pharmacist only
pharmacyRouter.put(
  '/inventory',
  permissionGuard({ pharmacy: ['manageInventory'] }),
  (c) => {
    // Handler code
  }
)

export default pharmacyRouter
```

### Example 4: Billing Routes

```typescript
import {
  permissionGuard,
  roleGuard,
  roleOrPermissionGuard,
} from '@/auth/auth-guard'
import { createRouter } from '@/lib/create-app'

const billingRouter = createRouter()

// View invoices - multiple roles
billingRouter.get(
  '/invoices',
  roleGuard(['finance', 'staff', 'admin']),
  (c) => {
    // Handler code
  }
)

// Create invoice - staff or users with billing create permission
billingRouter.post(
  '/invoices',
  permissionGuard({ billing: ['create'], invoices: ['create'] }),
  (c) => {
    // Handler code
  }
)

// Process payment - finance role or permission
billingRouter.post(
  '/payments',
  roleOrPermissionGuard('finance', { payments: ['create'] }),
  (c) => {
    // Handler code
  }
)

// Refund - only finance or admin
billingRouter.post(
  '/payments/:id/refund',
  roleOrPermissionGuard(['finance', 'admin'], { payments: ['refund'] }),
  (c) => {
    // Handler code
  }
)

export default billingRouter
```

## Chaining Multiple Guards

You can chain guards for stricter access control:

```typescript
// Must be authenticated, have doctor role, AND have specific permissions
app.post(
  '/patients/:id/prescribe',
  authGuard(),
  roleGuard('doctor'),
  permissionGuard({ prescriptions: ['create'] }),
  (c) => {
    // Very strict access control
  }
)
```

## How Permissions Work

The guards use the better-auth access control system defined in `src/auth/permissions.ts`:

1. Each role has specific permissions defined
2. `permissionGuard` checks the user's role against their allowed permissions
3. The check happens via `auth.api.userHasPermission()`

## Available Roles

Based on your `permissions.ts`:

- `admin` - Full access to all resources
- `doctor` - Clinical and patient management
- `nurse` - Patient care and clinical notes
- `staff` - Front desk operations
- `pharmacist` - Pharmacy and prescriptions
- `lab` - Laboratory operations
- `finance` - Billing and payments
- `management` - Reports and analytics
- `itSupport` - System administration
- `patient` - Self-service patient portal

## Error Responses

All guards throw `HTTPException` with appropriate status codes:

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User authenticated but lacks required permissions

## Tips

1. **Use `roleGuard`** when you want simple role-based access
2. **Use `permissionGuard`** when you need fine-grained control based on the permission system
3. **Use `roleOrPermissionGuard`** when you want to give blanket access to certain roles but also allow specific permissions
4. **Chain guards** when you need multiple layers of security

## Testing

To test guards, ensure your user object has the correct role:

```typescript
// In your tests
const mockUser = {
  id: 'user-123',
  role: 'doctor',
  // other user properties
}
```
