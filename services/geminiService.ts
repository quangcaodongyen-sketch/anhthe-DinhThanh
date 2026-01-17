import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { RestorationOptions } from '../types';

const getAi = (): GoogleGenAI => {
    // Ưu tiên lấy key người dùng đã nhập thủ công lưu trong trình duyệt
    const userApiKey = localStorage.getItem('GEMINI_API_KEY');
    const apiKey = userApiKey || process.env.API_KEY;
    
    if (!apiKey) {
        throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey });
};

const parseGeminiError = (error: unknown): string => {
    console.error("Gemini API Error:", error);
    if (error instanceof Error && error.message === "API_KEY_MISSING") {
        return "Vui lòng nhấn vào biểu tượng chìa khóa ở góc trên để nhập API Key Gemini.";
    }
    
    const defaultMessage = "Đã xảy ra lỗi không xác định từ AI.";
    if (error instanceof Error && error.message) {
        try {
            const jsonMatch = error.message.match(/{.*}/s);
            if (jsonMatch) {
                const parsedJson = JSON.parse(jsonMatch[0]);
                const apiError = parsedJson.error || parsedJson;
                if (apiError && apiError.message) {
                    const apiMessage: string = apiError.message;
                    if (apiError.code === 429 || apiMessage.toLowerCase().includes('quota')) {
                        return "Lỗi hạn ngạch: API Key này đã hết lượt sử dụng miễn phí hôm nay.";
                    }
                    if (apiMessage.toLowerCase().includes('api key not valid')) {
                        return "API Key không hợp lệ. Vui lòng kiểm tra lại trong mục cài đặt.";
                    }
                    return `Lỗi từ AI: ${apiMessage}`;
                }
            }
        } catch (e) {}
        return error.message;
    }
    return defaultMessage;
};

const UNBREAKABLE_DIRECTIVE = `
// YÊU CẦU TUYỆT ĐỐI:
// Bảo toàn 100% danh tính và cấu trúc khuôn mặt. Không thay đổi mắt, mũi, miệng.
// Kết quả phải là ảnh thực tế (photorealistic), chất lượng 8K, cực kỳ sắc nét để in ấn.
// Mặc định chủ thể là người Việt Nam. Tông màu da hồng hào tự nhiên.
`;

export const findSchoolLogo = async (schoolName: string): Promise<{ logoUrl: string | null; error: string | null; }> => {
    if (!schoolName || schoolName.trim().length < 5) return { logoUrl: null, error: "Tên trường quá ngắn." };
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Find official logo URL for: "${schoolName}". Return JSON: {"logoUrl": "direct_link" or null}`,
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
        const response = await getAi().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType: mimeType } }, { text: "Phân tích ảnh và tạo 1 đoạn prompt tiếng Việt để phục hồi ảnh này (xóa xước, làm nét, lên màu)." }] }
        });
        return { prompt: response.text?.trim() || null, error: null };
    } catch (error) {
        return { prompt: null, error: parseGeminiError(error) };
    }
};

/**
 * Analyzes an image to extract a concept description for style mimicry.
 */
// Fix: Added analyzeImageForConcept to resolve export error in HackConceptPage.tsx
export const analyzeImageForConcept = async (base64ImageData: string, mimeType: string): Promise<{ prompt: string | null; error: string | null; }> => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType: mimeType } }, { text: "Mô tả phong cách, bối cảnh, ánh sáng và màu sắc của bức ảnh này bằng tiếng Việt trong khoảng 2-3 câu để làm prompt AI." }] }
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
        let customParts = "";
        if (options.clothing && options.clothing !== 'auto') customParts += `\n- Mặc trang phục: ${options.clothing}`;
        if (options.background && options.background !== 'auto') customParts += `\n- Thay nền: ${options.background}`;
        if (options.customRequest) customParts += `\n- Yêu cầu riêng: ${options.customRequest}`;

        const prompt = `${UNBREAKABLE_DIRECTIVE}\nNhiệm vụ: Phục hồi ảnh cũ này thành ảnh màu hiện đại, siêu nét. ${customParts}`;

        const parts: any[] = [
            { text: prompt },
            { inlineData: { data: base64ImageData, mimeType } }
        ];
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
        throw new Error('AI không tạo ra ảnh. Hãy thử lại với yêu cầu đơn giản hơn.');
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
        let bgInstruction = options.backgroundMode === 'color' ? `nền màu trơn ${options.backgroundColor}` : options.backgroundPrompt;
        let clothInstruction = options.clothingDescription === 'none' ? "giữ nguyên áo" : `thay áo thành ${options.clothingDescription}`;

        const prompt = `${UNBREAKABLE_DIRECTIVE}
Nhiệm vụ: Tạo ảnh thẻ chuyên nghiệp.
- Phông nền: ${bgInstruction}
- Trang phục: ${clothInstruction}
- Hiệu ứng: Làm đẹp da, mắt sáng, nhìn thẳng, chuẩn studio.`;

        const parts: any[] = [{ text: prompt }, { inlineData: { data: base64SubjectData, mimeType: subjectMimeType } }];
        if (options.backgroundFile) parts.push({ inlineData: options.backgroundFile });
        if (options.clothingFile) parts.push({ inlineData: options.clothingFile });

        const response = await ai.models.generateContent({
            model: model,
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
        throw new Error('AI không trả về ảnh thẻ. Vui lòng kiểm tra lại ảnh gốc hoặc prompt.');
    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

export const changeImageBackground = async (base64ImageData: string, mimeType: string, color: 'white' | 'blue'): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Thay nền ảnh sang màu ${color === 'white' ? 'trắng' : 'xanh dương (#007bff)'}. Giữ nguyên 100% người.` }, { inlineData: { data: base64ImageData, mimeType } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không tạo ra ảnh phông nền mới." };
    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

export const upscaleImage = async (base64ImageData: string, mimeType: string, factor: number): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Upscale image x${factor}. Ultra detail, sharp focus.` }, { inlineData: { data: base64ImageData, mimeType } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không nâng cấp được ảnh." };
    } catch (error) { return { image: null, error: parseGeminiError(error) }; }
};

export const generate360Video = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const ai = getAi();
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: "360 degree parallax orbit animation, preserve identity.",
        image: { imageBytes: base64ImageData, mimeType: mimeType },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY}`);
    return URL.createObjectURL(await response.blob());
};

export const animatePortrait = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const ai = getAi();
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: "Natural portrait animation, subtle blinking and smiling.",
        image: { imageBytes: base64ImageData, mimeType: mimeType },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
    });
    while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY}`);
    return URL.createObjectURL(await response.blob());
};

export const removeObjectFromImage = async (base64Image: string, base64Mask: string, mimeType: string) => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Inpaint/Remove object in white mask area." }, { inlineData: { data: base64Image, mimeType } }, { inlineData: { data: base64Mask, mimeType: 'image/png' } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không xóa được đối tượng." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const applyProColor = async (base64: string, mime: string) => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "AI Beauty Retouch. Smooth skin, bright eyes." }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không thực hiện được làm đẹp." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const recolorImage = async (base64: string, mime: string, style: string) => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Recolor image style: ${style}` }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không chỉnh màu được." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const applyArtisticStyle = async (base64: string, mime: string, style: string) => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Apply artistic style: ${style}` }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không áp dụng được phong cách nghệ thuật." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const blurBackground = async (base64: string, mime: string, intensity: string) => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Blur background intensity: ${intensity}` }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không làm mờ nền được." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const restoreDocument = async (base64: string, mime: string) => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Restore document. Flatten paper, clean stains, preserve ink." }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không phục hồi được văn bản." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const mimicImageStyle = async (subject: any, style: any) => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "Mimic style of first image onto second image. Preserve identity of second image." }, { inlineData: style }, { inlineData: subject }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không thực hiện được chuyển đổi phong cách." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const generateStyledImageFromPrompt = async (base64: string, mime: string, promptText: string) => {
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Style transformation: ${promptText}. Preserve identity.` }, { inlineData: { data: base64, mimeType: mime } }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        return { image: null, error: "AI không tạo được ảnh phong cách mới." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};

export const changeSubjectBackground = async (subject: any, bg: any) => {
    try {
        const parts: any[] = [{ text: "Flawless background replacement. Relight subject." }, { inlineData: subject }];
        if (bg.type === 'prompt') parts[0].text += ` New background: ${bg.value}`;
        else parts.push({ inlineData: bg.value });
        const response = await getAi().models.generateContent({
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
        return { image: null, error: "AI không thay nền được." };
    } catch (e) { return { image: null, error: parseGeminiError(e) }; }
};