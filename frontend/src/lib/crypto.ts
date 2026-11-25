// Web Crypto AES-GCM client-side encryption for Padly

export async function generateSalt(): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt);
}

async function getKey(password: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(text: string, password: string, saltBase64: string): Promise<string> {
  const enc = new TextEncoder();
  const saltBytes = base64ToBuffer(saltBase64);
  const key = await getKey(password, saltBytes);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    enc.encode(text) as any
  );

  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  return bufferToBase64(combined);
}

export async function decryptText(encryptedBase64: string, password: string, saltBase64: string): Promise<string> {
  const dec = new TextDecoder();
  const saltBytes = base64ToBuffer(saltBase64);
  const key = await getKey(password, saltBytes);
  const combined = base64ToBuffer(encryptedBase64);

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    data as any
  );

  return dec.decode(decryptedBuffer);
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
