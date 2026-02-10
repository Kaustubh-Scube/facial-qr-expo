import { unpack } from "msgpackr";
import Pako from "pako";
import crypto from "react-native-quick-crypto";

function base64UrlToUint8Array(b64url: string) {
    const padded = b64url + "=".repeat((4 - (b64url.length % 4)) % 4);
    const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

function uint8ArrayToBase64(bytes: any) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return global.btoa(binary);
}

export async function decodeQRDataRN(
    qrData: string,
    keyBytes: Uint8Array
) {
    const encryptedBlob = base64UrlToUint8Array(qrData);

    const nonce = encryptedBlob.slice(0, 12);
    const ciphertext = encryptedBlob.slice(12);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const encryptedData = ciphertext.slice(0, ciphertext.length - 16);
    const authTag = ciphertext.slice(ciphertext.length - 16);

    const combined = new Uint8Array([
        ...encryptedData,
        ...authTag,
    ]);

    // 🔓 AES-GCM decrypt
    const decrypted = new Uint8Array(
        await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: nonce },
            cryptoKey,
            combined
        )
    );

    const exactBuffer = decrypted.buffer.slice(
        decrypted.byteOffset,
        decrypted.byteOffset + decrypted.byteLength
    );


    const decompressed = Pako.ungzip(decrypted);

    const payload = unpack(decompressed);

    return {
        other_data: payload.o,
        face_base64: uint8ArrayToBase64(payload.f)
    };
}