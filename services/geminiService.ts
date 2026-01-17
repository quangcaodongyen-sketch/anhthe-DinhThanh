import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { RestorationOptions } from '../types';

/**
 * Hàm khởi tạo AI instance một cách an toàn.
 * Nó sẽ được gọi bên trong mỗi hàm nghiệp vụ để đảm bảo lấy được API Key mới nhất.
 */
const getAiInstance = (): GoogleGenAI => {
    // 1. Kiểm tra Key người dùng nhập (ưu tiên hàng đầu)
    const userApiKey = localStorage.getItem('GEMINI_API_KEY');
    
    // 2. Kiểm tra Key từ biến môi trường Vercel (dùng cho chủ App)
    const envKey = process.env.API_KEY;

    const finalKey = (userApiKey && userApiKey.trim() !== "") ? userApiKey : envKey;

    if (!finalKey || finalKey === "undefined" || finalKey === "your_api_key_here") {
        throw new Error("API_KEY_MISSING");
    }

    return new GoogleGenAI({ apiKey: finalKey });
};

/**
 * Chuyển đổi lỗi kỹ thuật sang thông báo tiếng Việt thân thiện
 */
const parseGeminiError = (error: unknown): string => {
    console.error("Gemini Error Detail:", error);
    
    if (error instanceof Error && error.message === "API_KEY_MISSING") {
        return "Lỗi: Chưa cấu hình API Key. Vui lòng nhấn vào biểu tượng chìa khóa vàng ở trên để nhập Key.";
    }
    
    if (error instanceof Error && error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes("api_key_invalid") || msg.includes("not valid")) {
            return "Lỗi: API Key không chính xác hoặc đã hết hạn.";
        }
        if (msg.includes("quota") || msg.includes("429")) {
            return "Lỗi: Key này đã hết lượt sử dụng miễn phí trong hôm nay.";
        }
        return error.message;
    }
    return "Đã xảy ra lỗi kết nối AI. Vui lòng thử lại.";
};

const UNBREAKABLE_DIRECTIVE = `
// YÊU CẦU: Bảo toàn danh tính khuôn mặt. Chất lượng ảnh thực tế, sắc nét 8K. Mặc định là người Việt Nam.
`;

export const findSchoolLogo = async (schoolName: string): Promise<{ logoUrl: string | null; error: string | null; }> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Tìm link logo chính thức cho: "${schoolName}". Trả về JSON: {"logoUrl": "link" hoặc null}`,
            config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(response.text);
        return { logoUrl: result.logoUrl, error: null };
    } catch (error) {
        return { logoUrl: null, error: parseGeminiError(error) };
    }
};

export const analyzeImageForRestoration = async (base64ImageData: string, mimeType: string): Promise<{ prompt: string | null; error: string | null; }> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: "Phân tích ảnh cũ này và đề xuất prompt tiếng Việt để phục hồi nó." }] }
        });
        return { prompt: response.text?.trim() || null, error: null };
    } catch (error) {
        return { prompt: null, error: parseGeminiError(error) };
    }
};

export const analyzeImageForConcept = async (base64ImageData: string, mimeType: string): Promise<{ prompt: string | null; error: string | null; }> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: "Mô tả phong cách ảnh này để làm prompt AI." }] }
        });
        return { prompt: response.text?.trim() || null, error: null };
    } catch (error) {
        return { prompt: null, error: parseGeminiError(error) };
    }
};

export const restoreImage = async (
    base64ImageData: string,
    mimeType: string,
    options: RestorationOptions,
    clothingFileData?: { data: string; mimeType: string },
    referenceImageData?: { data: string; mimeType: string }
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const ai = getAiInstance();
        const model = 'gemini-2.5-flash-image';
        const prompt = `${UNBREAKABLE_DIRECTIVE}\nNhiệm vụ: Phục hồi ảnh cũ thành ảnh màu sắc nét. Yêu cầu: ${options.customRequest || 'Lên màu tự nhiên'}`;

        const parts: any[] = [{ text: prompt }, { inlineData: { data: base64ImageData, mimeType } }];
        if (clothingFileData) parts.push({ inlineData: clothingFileData });
        if (referenceImageData) parts.push({ inlineData: referenceImageData });

        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] } 
        });

        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        throw new Error('AI không tạo được ảnh.');
    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

export const createIDPhoto = async (
    base64SubjectData: string,
    subjectMimeType: string,
    options: any
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const ai = getAiInstance();
        const model = 'gemini-2.5-flash-image';
        const prompt = `${UNBREAKABLE_DIRECTIVE}\nTạo ảnh thẻ phông nền ${options.backgroundColor}, trang phục ${options.clothingDescription}.`;
        const parts: any[] = [{ text: prompt }, { inlineData: { data: base64SubjectData, mimeType: subjectMimeType } }];

        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] }
        });

        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        throw new Error('AI không trả về ảnh thẻ.');
    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

export const changeImageBackground = async (base64ImageData: string, mimeType: string, color: 'white' | 'blue'): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Thay nền ảnh màu ${color === 'white' ? 'trắng' : 'xanh'}.` }, { inlineData: { data: base64ImageData, mimeType } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi thay nền." };
    } catch (error) { return { image: null, error: parseGeminiError(error) }; }
};

export const upscaleImage = async (base64ImageData: string, mimeType: string, factor: number): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Làm nét ảnh x${factor}.` }, { inlineData: { data: base64ImageData, mimeType } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi nâng cấp." };
    } catch (error) { return { image: null, error: parseGeminiError(error) }; }
};

export const generate360Video = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const ai = getAiInstance();
    const userKey = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY || "";
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: "360 degree orbit.",
        image: { imageBytes: base64ImageData, mimeType },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${userKey}`);
    return URL.createObjectURL(await response.blob());
};

export const animatePortrait = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const ai = getAiInstance();
    const userKey = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY || "";
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: "Facial animation.",
        image: { imageBytes: base64ImageData, mimeType },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
    });
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${userKey}`);
    return URL.createObjectURL(await response.blob());
};

export const removeObjectFromImage = async (base64Image: string, base64Mask: string, mimeType: string) => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Xóa vật thể vùng trắng." }, { inlineData: { data: base64Image, mimeType } }, { inlineData: { data: base64Mask, mimeType: 'image/png' } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi xóa." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const applyProColor = async (base64: string, mime: string) => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Beauty Retouch." }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi làm đẹp." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const recolorImage = async (base64: string, mime: string, style: string) => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Color style ${style}` }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi chỉnh màu." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const applyArtisticStyle = async (base64: string, mime: string, style: string) => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Style ${style}` }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi áp dụng style." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const blurBackground = async (base64: string, mime: string, intensity: string) => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Blur background ${intensity}` }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi làm mờ." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const restoreDocument = async (base64: string, mime: string) => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Clean document." }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi văn bản." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const mimicImageStyle = async (subject: any, style: any) => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Mimic style." }, { inlineData: style }, { inlineData: subject }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi mimic." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const generateStyledImageFromPrompt = async (base64: string, mime: string, promptText: string) => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: promptText }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi tạo ảnh." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const changeSubjectBackground = async (subject: any, bg: any) => {
    try {
        const ai = getAiInstance();
        const parts: any[] = [{ text: "Change background." }, { inlineData: subject }];
        if (bg.type === 'prompt') parts[0].text += ` New bg: ${bg.value}`;
        else parts.push({ inlineData: bg.value });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi thay nền." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};