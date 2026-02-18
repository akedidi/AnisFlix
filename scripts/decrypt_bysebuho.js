
import { createDecipheriv } from 'crypto';

// Data from /api/videos/4m0a4it8eu6q
const playback = {
    "algorithm": "AES-256-GCM",
    "iv": "iacAt79-S8LCBe4N",
    "payload": "vn7S6VXQ_nFUNlVMUIFJRLxqMAOlTlByQdaYU8Mt08J8q7SeFIxI-rTIp5CBWBWNon0D9Kd7gJ7V-0LjDo-3clGPcDPNkblnbwu5vBgPUKSVyXDtWi_rKMjp2gb8DbcwDWYny6XqvTQDzNyrAWGwwmMGaEAdVE8-4fPz9OQxb-3U_2mEKyvF6hS0IJLUg3Sha3EKcTfkRlyW5D38u20_CWXiGgZZGjzRW2H_uaNRLULILcuNuX2z1FVyupC0B9ZjteqFxVxegZaV8LFx9KTYBk4mrlnG0WPYBGBJ7pwN-dWKV9t31I4wYzRmoBP_nXuYI9LJppbH-xzmFbIOFIn-1bkuFqkib6fxQ1CY3C5FEOlfLOOPtFKNYMGGnEMpX6IS27GpbPAKR265B10UunRjzAzbSt_Ue7SMMZsurizh2ZAd0wXEOm09nnrIUjZN0hvtlg5e9jdWUPg2m1vAh_EiZYIPdOguU688tkqtYAI5DhhEi0ec_rEtifqYoqL_1cj_bTAMIzb4OH0c5oCiwzYaAgGjCkTe1ujfFX3sfHg6_PouioHka4Kg2Mgzik4cVrcBRt6YR9j8VKZQAtkiK__SdPPVqe7dx2IpcY6dTLyTyJoN6xjpOQjGFBM5D8TtDRUM0uzpB9YXjgzxgM9mzpPAJh3nslBSUCdcyUNo3UNeP4Kat0OoRoBjFwAyXsZfloaLn5zrQCQPXY3b79yZoiYGw9spaHRVN_L827-tt20ZNFJ3Zaupn8wruCFH7P4ZTXVgmfqN3PLkIHu5yoNqGrc3uhLN050bqD2S_oo8Yoqo68hXgVcr5K5FD-j8ScqlbEo2HVgs2qxQahaqBAQl",
    "key_parts": ["xCPduph_M4kp4mg_gJ8GDg", "8-Uy2JRh5l6rwMJ2MqBV_g"],
    "decrypt_keys": {
        "edge_1": "nFNfZ_gKgA7zrWXef-havA",
        "edge_2": "PJNCHXIcHaIisk8JBmypGA",
        "legacy_fallback": "yjYIFmJ6F-AA66Oao8fyFYS0sXTQO0TD"
    },
    "iv2": "kfmiIIQKE1-ATjyx",
    "payload2": "fCMueHANArDjfRJxE1vDbTyJvze9rXd0eFeLo8nqYCUJTZ56KHS4vVx_o3HpyFGdnLC1e2GPOHYcHonzWZ0nlzmuojwg6pjZWYd6OXeZltAQjuCi5ez3zoam6CaorCf1RJJjwoV9SPgg8HHkVt-1d58h-MDP0kd1_8q0HY05b93oRrsTF_zpeJzsXfp5zpfUXykLR461Zoe6w71W9p-uZyR90TGCMvhCMocFCx9i_C_CgHnPrOjAU2VZzXhgchvS7cr1XHjW6QOBfTDmWFbJoUtRL_X3GeBSNpzG53Ou3n1dOZ_e1AtvBclXl43Iu6xkcg3PSnxjPg8ju-KLt9EDQJ7CsXoymOizIATD63qgLe6g1VWlHYqEpCm7ZgRFSuOMSt-XUHmRbidW5WXWaVuZH3ThavMidjoME4T7jmuIty0O--c1brFZ36vSD-2VNKXN4vnTuD4LsV0nzZOfO7tiDEMBzjLiNRAXjrPoL60WH-epDlKWCq4V-YorVBGiO5NI5nmrj_-Jig9rX30KS9KCGhVofcY6uDDd_yD5GOBBH28kBowE0Efg3QQOP0SPf88Iznv7a7sEtF6Lzugo"
};

function b64urlDecode(str) {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return Buffer.from(padded, 'base64');
}

function tryDecrypt(keyBuf, ivBuf, payloadBuf, label) {
    // Try different auth tag sizes (16 is standard for GCM)
    for (const tagSize of [16, 12, 8]) {
        try {
            const authTag = payloadBuf.slice(-tagSize);
            const ciphertext = payloadBuf.slice(0, -tagSize);

            const algo = keyBuf.length === 16 ? 'aes-128-gcm' : keyBuf.length === 24 ? 'aes-192-gcm' : 'aes-256-gcm';
            const decipher = createDecipheriv(algo, keyBuf, ivBuf);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            const result = decrypted.toString('utf-8');
            console.log(`✅ [${label}] [${algo}] [tag=${tagSize}] Decrypted: ${result.substring(0, 200)}`);
            return result;
        } catch (e) {
            // silent
        }
    }
    return null;
}

console.log('=== Attempting Decryption with correct key sizes ===\n');

const edge1 = b64urlDecode(playback.decrypt_keys.edge_1);
const edge2 = b64urlDecode(playback.decrypt_keys.edge_2);
const legacy = b64urlDecode(playback.decrypt_keys.legacy_fallback);
const kp1 = b64urlDecode(playback.key_parts[0]);
const kp2 = b64urlDecode(playback.key_parts[1]);
const iv = b64urlDecode(playback.iv);
const iv2 = b64urlDecode(playback.iv2);
const payload = b64urlDecode(playback.payload);
const payload2 = b64urlDecode(playback.payload2);

console.log(`Key sizes: edge_1=${edge1.length}, edge_2=${edge2.length}, legacy=${legacy.length}, kp1=${kp1.length}, kp2=${kp2.length}`);
console.log(`IV sizes: iv=${iv.length}, iv2=${iv2.length}`);
console.log(`Payload sizes: payload=${payload.length}, payload2=${payload2.length}\n`);

// AES-128-GCM with edge keys
tryDecrypt(edge1, iv, payload, 'edge_1 + iv + payload');
tryDecrypt(edge2, iv, payload, 'edge_2 + iv + payload');
tryDecrypt(edge1, iv2, payload, 'edge_1 + iv2 + payload');
tryDecrypt(edge2, iv2, payload, 'edge_2 + iv2 + payload');
tryDecrypt(edge1, iv, payload2, 'edge_1 + iv + payload2');
tryDecrypt(edge2, iv, payload2, 'edge_2 + iv + payload2');
tryDecrypt(edge1, iv2, payload2, 'edge_1 + iv2 + payload2');
tryDecrypt(edge2, iv2, payload2, 'edge_2 + iv2 + payload2');

// AES-192-GCM with legacy
tryDecrypt(legacy, iv, payload, 'legacy + iv + payload');
tryDecrypt(legacy, iv2, payload, 'legacy + iv2 + payload');
tryDecrypt(legacy, iv, payload2, 'legacy + iv + payload2');
tryDecrypt(legacy, iv2, payload2, 'legacy + iv2 + payload2');

// Combine key_parts (kp1 + kp2 = 16+16=32 bytes = AES-256)
const combinedKey = Buffer.concat([kp1, kp2]);
console.log(`\nCombined key_parts size: ${combinedKey.length}`);
tryDecrypt(combinedKey, iv, payload, 'kp1+kp2 + iv + payload');
tryDecrypt(combinedKey, iv2, payload, 'kp1+kp2 + iv2 + payload');
tryDecrypt(combinedKey, iv, payload2, 'kp1+kp2 + iv + payload2');
tryDecrypt(combinedKey, iv2, payload2, 'kp1+kp2 + iv2 + payload2');

// Try edge1 XOR edge2 as 16-byte key
const xorKey = Buffer.alloc(16);
for (let i = 0; i < 16; i++) xorKey[i] = edge1[i] ^ edge2[i];
tryDecrypt(xorKey, iv, payload, 'edge1 XOR edge2 + iv + payload');
tryDecrypt(xorKey, iv2, payload, 'edge1 XOR edge2 + iv2 + payload');

// Try edge1 + edge2 as 32-byte key
const edge12 = Buffer.concat([edge1, edge2]);
tryDecrypt(edge12, iv, payload, 'edge1+edge2 + iv + payload');
tryDecrypt(edge12, iv2, payload, 'edge1+edge2 + iv2 + payload');
tryDecrypt(edge12, iv, payload2, 'edge1+edge2 + iv + payload2');
tryDecrypt(edge12, iv2, payload2, 'edge1+edge2 + iv2 + payload2');

console.log('\n=== Done ===');
