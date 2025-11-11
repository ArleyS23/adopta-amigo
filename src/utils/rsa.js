const algo = {
  name: "RSA-PSS",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

const encoder = new TextEncoder();

export async function generateKeyPair() {
  return crypto.subtle.generateKey(algo, true, ["sign", "verify"]);
}

export async function exportKeyToBase64(key) {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return btoa(JSON.stringify(jwk));
}

export async function importPrivateKey(base64) {
  const jwk = JSON.parse(atob(base64));
  return crypto.subtle.importKey("jwk", jwk, algo, true, ["sign"]);
}

export async function importPublicKey(base64) {
  const jwk = JSON.parse(atob(base64));
  return crypto.subtle.importKey("jwk", jwk, algo, true, ["verify"]);
}

export async function signText(privateKey, text) {
  const data = encoder.encode(text);
  const signature = await crypto.subtle.sign({ name: "RSA-PSS", saltLength: 32 }, privateKey, data);
  return bufferToBase64(signature);
}

export async function verifySignature(publicKey, text, signatureBase64) {
  if (!signatureBase64) return false;
  const data = encoder.encode(text);
  const signature = base64ToBuffer(signatureBase64);
  return crypto.subtle.verify({ name: "RSA-PSS", saltLength: 32 }, publicKey, signature, data);
}

export async function verifyWithBase64Key(publicKeyBase64, text, signatureBase64) {
  if (!publicKeyBase64) return false;
  const key = await importPublicKey(publicKeyBase64);
  return verifySignature(key, text, signatureBase64);
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
