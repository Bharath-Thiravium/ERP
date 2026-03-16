# Athens Masters State & Storage Parity Documentation

## Overview
This document defines the exact auth storage fields and localStorage behavior that must be maintained for Athens Masters compatibility.

## Athens Auth Storage Requirements (from docs)

### localStorage Key Name
- **Key**: `auth-storage` (EXACT - do not change)
- **Storage Type**: localStorage (browser)

### Required Auth Storage Fields
Based on Athens docs, the auth storage must contain:

```typescript
interface AuthStorage {
  // Token fields
  token: string              // JWT access token
  refreshToken: string       // JWT refresh token
  
  // User identification
  usertype: string          // Must normalize to 'masteradmin' for Masters
  django_user_type: string  // Backend user type classification
  
  // Project context (Masters specific)
  projectId: null           // MUST be null for Masters (tenant scope)
  
  // User details
  user: {
    id: number
    username: string
    email: string
    // ... other user fields
  }
  
  // Company context (SAP addition)
  company: {
    id: number
    name: string
    company_prefix: string
  }
}
```

### Token Interceptor Behavior
All API requests must include:
- **Header**: `Authorization: Bearer <token>`
- **Automatic injection**: Axios interceptor adds token to every request
- **Token refresh**: Automatic refresh when token expires

## SAP Implementation Requirements

### Auth Store Integration
SAP's existing auth store must support:

1. **localStorage key**: Use exact key `auth-storage`
2. **Token management**: Same token/refreshToken structure
3. **User type normalization**: Map SAP company user to `usertype: 'masteradmin'`
4. **Project context**: Ensure `projectId: null` for Masters module

### State Management
```typescript
// SAP auth store must provide
interface SAP_AuthStore {
  // Athens compatibility fields
  token: string | null
  refreshToken: string | null
  usertype: 'masteradmin' | null  // For Athens Masters
  projectId: null                 // Always null for Masters
  
  // SAP specific fields
  user: CompanyUser | null
  company: Company | null
  
  // Methods
  login: (credentials) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  
  // Athens compatibility methods
  setProjectContext: (projectId: null) => void  // Masters always null
}
```

### Token Interceptor Implementation
```typescript
// Axios interceptor (existing SAP pattern)
apiClient.interceptors.request.use((config) => {
  const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}')
  if (authData.token) {
    config.headers.Authorization = `Bearer ${authData.token}`
  }
  return config
})

// Token refresh interceptor (existing SAP pattern)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      // Redirect to login if refresh fails
    }
    return Promise.reject(error)
  }
)
```

## Login Flow Requirements

### Athens Masters Login Sequence (from docs)
1. User submits credentials to `/authentication/login/`
2. Backend validates and returns JWT tokens
3. Frontend stores in `localStorage['auth-storage']`
4. User redirected to `/dashboard` (Masters landing page)
5. All subsequent requests include `Authorization: Bearer <token>`

### SAP Implementation Sequence
1. Company user submits credentials to `/api/auth/login/`
2. Backend validates company user and returns tokens
3. Frontend stores in `localStorage['auth-storage']` with Athens-compatible format
4. User redirected to `/company/athens-sustainability/dashboard`
5. All Athens API requests include Bearer token

## User Type Normalization

### Athens Masters Identification
- Athens identifies Masters by `usertype: 'masteradmin'`
- Masters have tenant-level access (no project filtering)

### SAP Company User Mapping
```typescript
// When company user accesses Athens Sustainability
const normalizeUserType = (companyUser: CompanyUser): string => {
  // All company users accessing Athens Sustainability are treated as Masters
  return 'masteradmin'
}

// Auth storage normalization
const createAuthStorage = (companyUser: CompanyUser, tokens: TokenPair) => {
  return {
    token: tokens.access,
    refreshToken: tokens.refresh,
    usertype: 'masteradmin',           // Always for Athens Masters
    django_user_type: 'company_user',  // SAP backend type
    projectId: null,                   // Always null for Masters
    user: {
      id: companyUser.user.id,
      username: companyUser.user.username,
      email: companyUser.user.email,
      // ... other fields
    },
    company: {
      id: companyUser.company.id,
      name: companyUser.company.name,
      company_prefix: companyUser.company.company_prefix
    }
  }
}
```

## Project Context Enforcement

### Masters Project Context Rules
- `projectId` must ALWAYS be `null` for Masters
- Masters see ALL projects in their company/tenant
- No project selector in Masters UI
- Project selection is for individual project operations only (modals)

### Implementation
```typescript
// Athens Sustainability hook
export const useAthensMastersContext = () => {
  const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}')
  
  // Enforce Masters context
  if (authData.projectId !== null) {
    // Reset to Masters context
    authData.projectId = null
    localStorage.setItem('auth-storage', JSON.stringify(authData))
  }
  
  return {
    isMaster: authData.usertype === 'masteradmin',
    projectId: null,  // Always null for Masters
    company: authData.company
  }
}
```

## Storage Persistence

### localStorage Management
- **Key**: `auth-storage` (exact match with Athens)
- **Format**: JSON string
- **Persistence**: Survives browser refresh/close
- **Cleanup**: Clear on logout

### Session Management
- Token expiration handling
- Automatic refresh before expiry
- Logout on refresh failure
- Redirect to login page

## Implementation Checklist
- [ ] Use exact localStorage key `auth-storage`
- [ ] Normalize company users to `usertype: 'masteradmin'`
- [ ] Ensure `projectId: null` for all Masters operations
- [ ] Implement Bearer token interceptor
- [ ] Handle token refresh automatically
- [ ] Maintain Athens-compatible auth storage structure
- [ ] Redirect flow: login → Athens dashboard