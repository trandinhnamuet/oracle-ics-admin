'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useAuthStore from '@/hooks/use-auth-store'
import { getTokenInfo } from '@/lib/token-expiry'
import Cookies from 'js-cookie'

export function AuthDebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const { user, token, isAuthenticated, isLoading, error } = useAuthStore()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const getLocalStorageAuth = () => {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      return authStorage ? JSON.parse(authStorage) : null
    } catch (error) {
      return { error: 'Invalid localStorage data' }
    }
  }

  const tokenInfo = token ? getTokenInfo(token) : null
  const localStorageAuth = getLocalStorageAuth()
  const accessTokenCookie = Cookies.get('access_token')
  const authTokenCookie = Cookies.get('auth-token')

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-blue-500 text-white border-blue-600 hover:bg-blue-600"
        >
          🔍 Auth Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto">
      <Card className="border-blue-500 shadow-lg">
        <CardHeader className="pb-2 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-blue-600">Auth Debug Panel</CardTitle>
            <Button 
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div>
            <strong>State:</strong>
            <div className="pl-2">
              <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
              <div>Loading: {isLoading ? '⏳' : '✅'}</div>
              <div>Error: {error ? `❌ ${error}` : '✅'}</div>
            </div>
          </div>
          
          <div>
            <strong>User:</strong>
            <div className="pl-2">
              {user ? (
                <div>
                  <div>ID: {user.id}</div>
                  <div>Email: {user.email}</div>
                  <div>Role: {user.role || 'No role'}</div>
                  <div>Active: {user.isActive ? '✅' : '❌'}</div>
                </div>
              ) : (
                <div className="text-red-500">❌ No user data</div>
              )}
            </div>
          </div>
          
          <div>
            <strong>Token (Store):</strong>
            <div className="pl-2">
              {token ? (
                <div className="text-green-500">✅ {token.substring(0, 20)}...</div>
              ) : (
                <div className="text-red-500">❌ No token in store</div>
              )}
            </div>
          </div>
          
          <div>
            <strong>Cookies:</strong>
            <div className="pl-2">
              <div>access_token: {accessTokenCookie ? (
                <span className="text-green-500">✅ {accessTokenCookie.substring(0, 15)}...</span>
              ) : (
                <span className="text-red-500">❌ None</span>
              )}</div>
              <div>auth-token: {authTokenCookie ? (
                <span className="text-yellow-500">⚠️ {authTokenCookie.substring(0, 15)}... (legacy)</span>
              ) : (
                <span className="text-gray-500">✅ None (good)</span>
              )}</div>
            </div>
          </div>
          
          <div>
            <strong>localStorage:</strong>
            <div className="pl-2">
              {localStorageAuth ? (
                localStorageAuth.error ? (
                  <div className="text-red-500">❌ {localStorageAuth.error}</div>
                ) : (
                  <div>
                    <div>User: {localStorageAuth.state?.user ? '✅' : '❌'}</div>
                    <div>Authenticated: {localStorageAuth.state?.isAuthenticated ? '✅' : '❌'}</div>
                  </div>
                )
              ) : (
                <div className="text-gray-500">No auth storage</div>
              )}
            </div>
          </div>
          
          {tokenInfo && (
            <div>
              <strong>Token Info:</strong>
              <div className="pl-2">
                {tokenInfo.isValid ? (
                  <div>
                    <div>Email: {tokenInfo.payload?.email}</div>
                    <div>Role: {tokenInfo.payload?.role}</div>
                    <div>
                      Expires: {tokenInfo.expiryTime?.toLocaleString()}
                    </div>
                    <div className={tokenInfo.isExpired ? 'text-red-500 font-bold' : tokenInfo.isExpiringSoon ? 'text-yellow-500 font-bold' : 'text-green-500'}>
                      Status: {tokenInfo.isExpired ? '❌ EXPIRED' : tokenInfo.isExpiringSoon ? '⚠️ EXPIRING SOON' : '✅ VALID'}
                    </div>
                    <div className="text-blue-600">
                      Time left: {tokenInfo.timeRemainingFormatted}
                    </div>
                  </div>
                ) : (
                  <div className="text-red-500">❌ Invalid token</div>
                )}
              </div>
            </div>
          )}
          
          {tokenInfo && tokenInfo.isValid && (
            <div>
              <strong>Token Progress:</strong>
              <div className="pl-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      tokenInfo.isExpired ? 'bg-red-500' : 
                      tokenInfo.isExpiringSoon ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.max(0, Math.min(100, (tokenInfo.timeRemaining / (24 * 60 * 60 * 1000)) * 100))}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs mt-1">
                  {tokenInfo.isExpired ? 'EXPIRED' : `${Math.round((tokenInfo.timeRemaining / (24 * 60 * 60 * 1000)) * 100)}% of 24h remaining`}
                </div>
              </div>
            </div>
          )}
          
          <div>
            <strong>Sync Status:</strong>
            <div className="pl-2">
              <div>Store ↔ Cookie: {
                (token && accessTokenCookie) ? '✅ Synced' :
                (!token && !accessTokenCookie) ? '✅ Both empty' :
                '❌ Out of sync'
              }</div>
              <div>User ↔ Auth: {
                (user && isAuthenticated) ? (token ? '✅ Consistent' : '⚠️ User without token') :
                (!user && !isAuthenticated) ? '✅ Both false' :
                '❌ Inconsistent'
              }</div>
            </div>
          </div>
          
          <div>
            <strong>Diagnostic:</strong>
            <div className="pl-2">
              {user && isAuthenticated && !token && (
                <div className="text-orange-500">⚠️ Login issue: User exists but no token saved</div>
              )}
              {!user && isAuthenticated && (
                <div className="text-red-500">❌ Auth state corrupted</div>
              )}
              {user && !isAuthenticated && (
                <div className="text-yellow-500">⚠️ User data persisted but not authenticated</div>
              )}
              {!user && !isAuthenticated && !token && (
                <div className="text-gray-500">ℹ️ Clean state - not logged in</div>
              )}
              {user && isAuthenticated && token && accessTokenCookie && tokenInfo && !tokenInfo.isExpired && (
                <div className="text-green-500">✅ Perfect login state</div>
              )}
              {tokenInfo && tokenInfo.isExpired && (
                <div className="text-red-500 font-bold">🔴 Token expired - should auto logout</div>
              )}
              {tokenInfo && tokenInfo.isExpiringSoon && !tokenInfo.isExpired && (
                <div className="text-yellow-500 font-bold">⚠️ Token expiring soon - should auto refresh</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
