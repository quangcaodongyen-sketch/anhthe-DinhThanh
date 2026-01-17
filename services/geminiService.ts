import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { RestorationOptions } from '../types';

/**
 * Hàm lấy instance AI. 
 * Phải được gọi bên trong các hàm thực thi (không để ở phạm vi toàn cục)
 * để đảm bảo lấy được API Key mới nhất từ localStorage.
 */
const getAi = (): GoogleGenAI => {
    const userApiKey = localStorage.getItem('GEMINI_API_KEY');
    // Ưu tiên key người dùng nhập, sau đó mới đến biến môi trường Vercel
    const apiKey = userApiKey || process.env.API_KEY;
    
    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
        throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey });
};

const parseGeminiError = (error: unknown): string => {
    console.error("Gemini API Error:", error);
    if (error instanceof Error && error.message === "API_KEY_MISSING") {
        return "Vui lòng nhấn vào biểu tượng chìa khóa vàng ở góc trên để nhập API Key Gemini miễn phí.";
    }
    
    const defaultMessage = "Đã xảy ra lỗi khi kết nối với AI. Vui lòng kiểm tra lại API Key.";
    if (error instanceof Error && error.message) {
        if (error.message.includes("API_KEY_INVALID") || error.message.includes("not valid")) {
            return "API Key không hợp lệ. Vui lòng lấy key mới từ Google AI Studio.";
        }
        return error.message;
    }
    return defaultMessage;
};

const UNBREAKABLE_DIRECTIVE = `
// YÊU CẦU TUYỆT ĐỐI:
// Bảo toàn 100% danh tính và cấu trúc khuôn mặt. Không thay đổi mắt, mũi, miệng.
// Kết quả phải là ảnh thực tế (photorealistic), chất lượng 8K.
// Mặc định chủ thể là người Việt Nam.
`;

export const findSchoolLogo = async (schoolName: string): Promise<{ logoUrl: string | null; error: string | null; }> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Tìm link URL logo chính thức cho trường: "${schoolName}". Trả về JSON: {"logoUrl": "link" hoặc null}`,
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
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: "Phân tích ảnh và tạo prompt tiếng Việt để phục hồi ảnh này." }] }
        });
        return { prompt: response.text?.trim() || null, error: null };
    } catch (error) {
        return { prompt: null, error: parseGeminiError(error) };
    }
};

export const analyzeImageForConcept = async (base64ImageData: string, mimeType: string): Promise<{ prompt: string | null; error: string | null; }> => {
    try {
        const ai = getAi();
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
        const ai = getAi();
        const model = options.model === 'Nano Banana HD' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
        
        const prompt = `${UNBREAKABLE_DIRECTIVE}\nNhiệm vụ: Phục hồi ảnh cũ này thành ảnh màu hiện đại, siêu nét. Yêu cầu thêm: ${options.customRequest || 'lên màu tự nhiên'}`;

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
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        throw new Error('AI không tạo ra ảnh. Hãy thử lại.');
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
        const ai = getAi();
        const prompt = `${UNBREAKABLE_DIRECTIVE}\nNhiệm vụ: Tạo ảnh thẻ chuyên nghiệp phông nền ${options.backgroundColor}, trang phục ${options.clothingDescription}.`;
        const parts: any[] = [{ text: prompt }, { inlineData: { data: base64SubjectData, mimeType: subjectMimeType } }];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] }
        });

        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        throw new Error('AI không trả về ảnh thẻ.');
    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

export const changeImageBackground = async (base64ImageData: string, mimeType: string, color: 'white' | 'blue'): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Thay nền ảnh sang màu ${color === 'white' ? 'trắng' : 'xanh'}.` }, { inlineData: { data: base64ImageData, mimeType } }] },
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
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Upscale x${factor}, làm nét cực hạn.` }, { inlineData: { data: base64ImageData, mimeType } }] },
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
    const ai = getAi();
    const userApiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY;
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: "360 degree parallax animation.",
        image: { imageBytes: base64ImageData, mimeType },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${userApiKey}`);
    return URL.createObjectURL(await response.blob());
};

export const animatePortrait = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const ai = getAi();
    const userApiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY;
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: "Natural portrait animation.",
        image: { imageBytes: base64ImageData, mimeType },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
    });
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${userApiKey}`);
    return URL.createObjectURL(await response.blob());
};

export const removeObjectFromImage = async (base64Image: string, base64Mask: string, mimeType: string) => {
    try {
        const ai = getAi();
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
        return { image: null, error: "Lỗi xóa vật thể." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const applyProColor = async (base64: string, mime: string) => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "AI Beauty Retouch, smooth skin." }, { inlineData: { data: base64, mimeType: mime } }] },
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
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Chỉnh màu phong cách ${style}` }, { inlineData: { data: base64, mimeType: mime } }] },
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
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Phong cách nghệ thuật: ${style}` }, { inlineData: { data: base64, mimeType: mime } }] },
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
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Làm mờ nền mức độ ${intensity}` }, { inlineData: { data: base64, mimeType: mime } }] },
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
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Restore document, clean ink." }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi phục hồi văn bản." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const mimicImageStyle = async (subject: any, style: any) => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Mimic style. Preserve identity." }, { inlineData: style }, { inlineData: subject }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi mimic style." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const generateStyledImageFromPrompt = async (base64: string, mime: string, promptText: string) => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `${promptText}. Preserve identity.` }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi tạo ảnh style." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const changeSubjectBackground = async (subject: any, bg: any) => {
    try {
        const ai = getAi();
        const parts: any[] = [{ text: "Background replacement." }, { inlineData: subject }];
        if (bg.type === 'prompt') parts[0].text += ` New background: ${bg.value}`;
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