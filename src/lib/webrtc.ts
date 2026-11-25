// WebRTC Configuration with STUN and TURN Support for Cross-Network Connectivity

export const getIceServers = (): RTCConfiguration => {
  // 1. Check for complete custom JSON ICE servers configuration
  const customIceServers = (import.meta as any).env?.VITE_ICE_SERVERS;
  if (customIceServers) {
    try {
      return { iceServers: JSON.parse(customIceServers) };
    } catch (e) {
      console.warn('Invalid VITE_ICE_SERVERS JSON configuration, falling back to default:', e);
    }
  }

  // 2. Read explicit TURN environment variables
  const turnUrl = (import.meta as any).env?.VITE_TURN_URL;
  const turnUsername = (import.meta as any).env?.VITE_TURN_USERNAME;
  const turnCredential = (import.meta as any).env?.VITE_TURN_CREDENTIAL;

  // High-availability public STUN servers
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Append TURN server if provided (enables mobile data to Wi-Fi traversal)
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername || undefined,
      credential: turnCredential || undefined,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
};
