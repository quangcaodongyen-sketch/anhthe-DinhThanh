import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { RestorationOptions } from '../types';

/**
 * Hàm lấy instance AI an toàn. 
 * Instance được tạo mới mỗi khi gọi để đảm bảo lấy được API Key mới nhất từ localStorage.
 */
const getAi = (): GoogleGenAI => {
    // 1. Ưu tiên lấy key người dùng đã nhập thủ công lưu trong trình duyệt
    const userApiKey = localStorage.getItem('GEMINI_API_KEY');
    
    // 2. Nếu không có, lấy từ biến môi trường (inject bởi Vercel)
    const apiKey = (userApiKey && userApiKey.trim() !== "") ? userApiKey : process.env.API_KEY;
    
    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "" || apiKey === "your_api_key_here") {
        throw new Error("API_KEY_MISSING");
    }
    
    return new GoogleGenAI({ apiKey });
};

/**
 * Xử lý các lỗi từ Gemini API sang tiếng Việt dễ hiểu
 */
const parseGeminiError = (error: unknown): string => {
    console.error("Gemini API Error details:", error);
    
    if (error instanceof Error && error.message === "API_KEY_MISSING") {
        return "CHƯA CÓ API KEY: Vui lòng nhấn vào biểu tượng chìa khóa vàng ở góc trên để nhập Key Gemini.";
    }
    
    const defaultMessage = "Lỗi kết nối AI. Vui lòng kiểm tra lại API Key hoặc yêu cầu của bạn.";
    if (error instanceof Error && error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes("api_key_invalid") || msg.includes("not valid") || msg.includes("key not found")) {
            return "API Key không hợp lệ hoặc đã bị vô hiệu hóa. Vui lòng lấy key mới từ Google AI Studio.";
        }
        if (msg.includes("quota") || msg.includes("429")) {
            return "API Key này đã hết hạn mức sử dụng miễn phí. Vui lòng thử lại sau hoặc đổi Key khác.";
        }
        return error.message;
    }
    return defaultMessage;
};

const UNBREAKABLE_DIRECTIVE = `
// YÊU CẦU TUYỆT ĐỐI CHO AI:
// Bảo toàn 100% danh tính và cấu trúc khuôn mặt của chủ thể.
// Không thay đổi vị trí mắt, mũi, miệng. Giữ nguyên thần thái.
// Kết quả PHẢI là ảnh thực tế (photorealistic), chất lượng 8K siêu sắc nét.
// Mặc định chủ thể là người Việt Nam.
`;

export const findSchoolLogo = async (schoolName: string): Promise<{ logoUrl: string | null; error: string | null; }> => {
    try {
        const ai = getAi();
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
        const ai = getAi();
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
        const model = 'gemini-2.5-flash-image';
        const prompt = `${UNBREAKABLE_DIRECTIVE}\nNhiệm vụ: Phục hồi ảnh cũ này thành ảnh màu hiện đại, siêu nét. Yêu cầu: ${options.customRequest || 'Lên màu tự nhiên'}`;

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
        throw new Error('AI không tạo được ảnh. Thử lại yêu cầu khác.');
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
            contents: { parts: [{ text: `Upscale x${factor}, cực nét.` }, { inlineData: { data: base64ImageData, mimeType } }] },
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
    const currentKey = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY;
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: "360 degree orbit animation.",
        image: { imageBytes: base64ImageData, mimeType },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${currentKey}`);
    return URL.createObjectURL(await response.blob());
};

export const animatePortrait = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const ai = getAi();
    const currentKey = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY;
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: "Subtle facial animation.",
        image: { imageBytes: base64ImageData, mimeType },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
    });
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${currentKey}`);
    return URL.createObjectURL(await response.blob());
};

export const removeObjectFromImage = async (base64Image: string, base64Mask: string, mimeType: string) => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Xóa vật thể." }, { inlineData: { data: base64Image, mimeType } }, { inlineData: { data: base64Mask, mimeType: 'image/png' } }] },
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
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Chỉnh màu ${style}` }, { inlineData: { data: base64, mimeType: mime } }] },
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
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Mờ nền ${intensity}` }, { inlineData: { data: base64, mimeType: mime } }] },
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
            contents: { parts: [{ text: "Làm sạch văn bản." }, { inlineData: { data: base64, mimeType: mime } }] },
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
            contents: { parts: [{ text: "Mimic style." }, { inlineData: style }, { inlineData: subject }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) return { image: part.inlineData.data, error: null };
            }
        }
        return { image: null, error: "Lỗi sao chép style." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const generateStyledImageFromPrompt = async (base64: string, mime: string, promptText: string) => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `${promptText}` }, { inlineData: { data: base64, mimeType: mime } }] },
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
        const ai = getAi();
        const parts: any[] = [{ text: "Thay nền." }, { inlineData: subject }];
        if (bg.type === 'prompt') parts[0].text += ` Nền mới: ${bg.value}`;
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