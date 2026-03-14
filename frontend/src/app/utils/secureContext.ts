export interface SecureContextInfo {
  host: string;
  isLocalHost: boolean;
  isSecureContextOk: boolean;
  secureOriginUrl: string;
  protocol: string;
  message: string;
}

export function getSecureContextInfo(): SecureContextInfo {
  if (typeof window === 'undefined') {
    return {
      host: 'localhost',
      isLocalHost: true,
      isSecureContextOk: true,
      secureOriginUrl: '',
      protocol: 'http:',
      message: '',
    };
  }

  const host = window.location.hostname || 'localhost';
  const port = window.location.port ? `:${window.location.port}` : '';
  const path = `${window.location.pathname}${window.location.search}`;
  const protocol = window.location.protocol;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const isSecureContextOk = window.isSecureContext || isLocalHost;
  const secureOriginUrl = `https://${host}${port}${path}`;

  let message = '';
  if (!isSecureContextOk) {
    if (protocol === 'https:') {
      message = `Your HTTPS certificate is not trusted for ${host}. Install a trusted certificate or open the app on localhost.`;
    } else {
      message = `Camera and microphone need HTTPS on ${host}. Open the app on localhost or use HTTPS with a trusted certificate.`;
    }
  }

  return {
    host,
    isLocalHost,
    isSecureContextOk,
    secureOriginUrl,
    protocol,
    message,
  };
}
