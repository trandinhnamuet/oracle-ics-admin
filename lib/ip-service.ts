/**
 * IP Detection Service
 * Fetches client's public IP address from ipify API (same as Vietguard)
 */

export async function getClientIp(): Promise<{ ipv4?: string; ipv6?: string }> {
  const result: { ipv4?: string; ipv6?: string } = {};

  try {
    // Get IPv4
    try {
      const response = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      result.ipv4 = data.ip || "";
      console.log("IPv4 fetched:", result.ipv4);
    } catch (error) {
      console.warn("Failed to get IPv4:", error);
      result.ipv4 = "";
    }

    // Get IPv6
    try {
      const response = await fetch("https://api64.ipify.org?format=json", {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      result.ipv6 = data.ip || "";
      console.log("IPv6 fetched:", result.ipv6);
    } catch (error) {
      console.warn("Failed to get IPv6:", error);
      result.ipv6 = "";
    }

    return result;
  } catch (error) {
    console.error("Error in getClientIp:", error);
    return { ipv4: "", ipv6: "" };
  }
}
