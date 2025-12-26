
export const generateMachineFingerprint = async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    let rendererInfo = 'n/a';
    if (gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            rendererInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
    }

    const fingerprintData = [
        navigator.userAgent,
        navigator.language,
        new Date().getTimezoneOffset(),
        window.screen.height,
        window.screen.width,
        window.screen.colorDepth,
        navigator.hardwareConcurrency,
        rendererInfo,
    ].join('~~~');

    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
