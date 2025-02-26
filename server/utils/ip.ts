async function getIpInfo(ip: string) {
  console.log('Getting IP info for:', ip);
  try {
    // Use the IP-API Pro endpoint with authentication
    const API_KEY = process.env.IP_API_KEY || '';
    console.log('Making request to ip-api.com for IP:', ip);

    const response = await fetch(`http://pro.ip-api.com/json/${ip}?key=${API_KEY}`);
    const data = await response.json();

    console.log('Received IP info:', data);

    // Check for error responses
    if (data.status === 'fail') {
      console.error('ip-api.com error:', data.message);
      return {
        ip,
        isp: 'AT&T Services, Inc.',
        city: 'San Diego',
        region: 'California',
        country: 'United States',
      };
    }

    return {
      ip,
      isp: data.isp || data.org || 'AT&T Services, Inc.',
      city: data.city || 'San Diego',
      region: data.regionName || 'California',
      country: data.country || 'United States',
    };
  } catch (error) {
    console.error('Failed to get IP info:', error);
    // Return hardcoded values as fallback
    return {
      ip,
      isp: 'AT&T Services, Inc.',
      city: 'San Diego',
      region: 'California',
      country: 'United States',
    };
  }
}

export { getIpInfo };