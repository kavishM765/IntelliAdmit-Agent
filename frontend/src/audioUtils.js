// src/audioUtils.js

export function floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    
    // 🔊 VOLUME BOOSTER: Multiply the signal so the AI can actually hear you!
    const volumeMultiplier = 3.0; 

    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        // Apply the volume boost and clamp it between -1 and 1 to prevent distortion
        let s = Math.max(-1, Math.min(1, float32Array[i] * volumeMultiplier));
        
        // Convert to 16-bit PCM (Little-Endian)
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); 
    }
    return buffer;
}

export function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000; // 32KB chunks for lightning-fast encoding

    // Process in chunks to prevent browser freezing and stack overflows
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return window.btoa(binary);
}

export function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export function pcm16ToFloat32(pcmBuffer) {
    const int16Array = new Int16Array(pcmBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0; 
    }
    return float32Array;
}   