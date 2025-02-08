// 将 ArrayBuffer 转换为 Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// 生成随机十六进制字符串
export const randomHexString = (len: number) => {
    const t = []
    for (let n = 0; n < len; n++) {
        t.push(((16 * Math.random()) | 0).toString(16))
    }
    return t.join('')
}

// 生成随机ID
export function generateId(): string {
    return randomHexString(16);
} 