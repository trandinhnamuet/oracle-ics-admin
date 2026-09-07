import type { NextRequest } from 'next/server'

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/
const IPV6 = /^[0-9a-f:]+(:\d{1,3}(\.\d{1,3}){3})?$/i

function isIpLiteral(value: string): boolean {
  if (IPV4.test(value)) return true
  return value.includes(':') && IPV6.test(value)
}

/**
 * Resolve the browser's IP address for a request that reached this admin app
 * through our own nginx, for forwarding to the backend's login-history.
 *
 * Trust model — unchanged from the round-8 hardening: the *client-supplied*
 * X-Forwarded-For / X-Real-IP must never be believed, because a browser can set
 * them to frame another IP in admin_login_history. What is trustworthy is what
 * OUR nginx writes:
 *
 *   proxy_set_header X-Real-IP        $remote_addr;              // overwrites
 *   proxy_set_header X-Forwarded-For  $proxy_add_x_forwarded_for; // appends
 *
 * nginx *overwrites* X-Real-IP with the peer address it actually saw, and
 * *appends* that address to X-Forwarded-For — so the last XFF element is the
 * real socket peer, while the leading elements are attacker-controlled.
 *
 * This replaces `NextRequest.ip`, which the previous version relied on:
 * that property is only populated by the Vercel adapter, so under self-hosted
 * `next start` it is always undefined. The result was that no IP header was
 * forwarded at all and every admin login was recorded from this proxy's own
 * loopback address ("Local / Localhost") instead of the operator's IP.
 *
 * Prerequisite: the Next.js port must be reachable only via nginx (bound to
 * localhost). If it were exposed directly, a client could set these headers.
 *
 * @returns a literal IP, or '' when none could be established.
 */
export function resolveClientIp(request: NextRequest): string {
  const platformIp = (request as NextRequest & { ip?: string }).ip
  if (platformIp && isIpLiteral(platformIp)) return platformIp

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp && isIpLiteral(realIp)) return realIp

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Last element only — appended by nginx, not by the client.
    const peer = forwardedFor.split(',').pop()?.trim()
    if (peer && isIpLiteral(peer)) return peer
  }

  return ''
}
