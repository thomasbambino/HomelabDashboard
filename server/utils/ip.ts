async function getIpInfo(ip: string) {
  console.log('Getting IP info for:', ip);
  try {
    console.log('Making request to ipapi.co for IP:', ip);
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();

    console.log('Received IP info:', data);

    // Check for error responses from ipapi.co
    if (data.error) {
      console.error('ipapi.co error:', data.error);
      return {
        ip,
        isp: null,
        city: null,
        region: null,
        country: null,
      };
    }

    return {
      ip,
      isp: data.org,
      city: data.city,
      region: data.region,
      country: data.country_name,
    };
  } catch (error) {
    console.error('Failed to get IP info:', error);
    return {
      ip,
      isp: null,
      city: null,
      region: null,
      country: null,
    };
  }
}

export { getIpInfo };