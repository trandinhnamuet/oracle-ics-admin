'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AuthDebugPanel } from '@/components/auth/auth-debug-panel'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Auth context đã được set up ở app layout, không cần làm gì thêm ở đây
  useAuth() // Ensure context is available
  
  return (
    <>
      {children}
      <AuthDebugPanel />
    </>
  )
}

export default AuthProvider