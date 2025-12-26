
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { RestorationOptions } from '../types';

const getAi = (): GoogleGenAI => {
    // Per Veo guidelines, create a new instance for each call
    // to ensure the latest API key is used.
    // The key is provided by the environment after user selection.
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const parseGeminiError = (error: unknown): string => {
    // Log the original error for debugging purposes
    console.error("Gemini API Error:", error);

    const defaultMessage = "Đã xảy ra lỗi không xác định từ AI.";

    if (error instanceof Error && error.message) {
        // The SDK sometimes throws errors with a JSON-like string in the message.
        // It can also be prefixed with text like "Error in ...: { ... }"
        try {
            const jsonMatch = error.message.match(/{.*}/s);
            if (jsonMatch) {
                const parsedJson = JSON.parse(jsonMatch[0]);
                const apiError = parsedJson.error || parsedJson; // Handle both { error: ... } and the error object itself

                if (apiError && apiError.message) {
                    const apiMessage: string = apiError.message;

                    // Handle specific, common errors with user-friendly messages
                    if (apiError.code === 429 || apiMessage.toLowerCase().includes('quota')) {
                        return "Lỗi hạn ngạch: Bạn đã sử dụng hết lượt truy cập API. Vui lòng kiểm tra gói dịch vụ hoặc thử lại sau.";
                    }
                    if (apiMessage.toLowerCase().includes('api key not valid')) {
                        return "Lỗi API Key: Khóa API không hợp lệ. Vui lòng kiểm tra lại.";
                    }
                    if (apiMessage.toLowerCase().includes('billing') && apiMessage.toLowerCase().includes('not enabled')) {
                         return "Lỗi thanh toán: Vui lòng bật tính năng thanh toán trong tài khoản Google Cloud của bạn.";
                    }
                     if (apiMessage.toLowerCase().includes('candidate was blocked due to')) {
                         return "Nội dung bị chặn: Yêu cầu của bạn đã bị chặn vì lý do an toàn. Vui lòng thử lại với một yêu cầu khác.";
                    }
                    // For other errors, return the message from the API directly
                    return `Lỗi từ AI: ${apiMessage}`;
                }
            }
        } catch (e) {
            // It wasn't a JSON error message, fall through to return the raw error message.
        }

        // If it's not a parsable JSON error, return the original error message.
        return error.message;
    }

    // Fallback for non-Error objects
    return defaultMessage;
};


const UNBREAKABLE_DIRECTIVE = `
// YÊU CẦU TUYỆT ĐỐI (ABSOLUTE & UNBREAKABLE COMMANDMENTS):
// Nhiệm vụ của bạn là một chuyên gia phục hồi ảnh kỹ thuật số. Yêu cầu cao nhất là phải bảo toàn tuyệt đối danh tính và thần thái của người trong ảnh.
// 1.  PHÂN TÍCH & KHÓA SINH TRẮC HỌC (BIOMETRIC ANALYSIS & LOCK): Trước khi thực hiện bất kỳ chỉnh sửa nào, hãy tiến hành phân tích sinh trắc học sâu (deep biometric analysis) trên TẤT CẢ các khuôn mặt trong ảnh gốc. Đo lường và khóa lại tất cả các tỷ lệ, khoảng cách và đặc điểm nhận dạng. Kết quả cuối cùng PHẢI giữ lại 100% danh tính của TẤT CẢ chủ thể.
// 2.  CHI TIẾT KHUÔN MẶT BẤT BIẾN (IMMUTABLE FACIAL ANATOMY): Đây là mệnh lệnh quan trọng nhất. Cấu trúc giải phẫu và chi tiết của các bộ phận sau PHẢI được giữ lại 100% như ảnh gốc, không được phép thay đổi dù chỉ một pixel:
//     - Mắt (hình dạng, màu sắc, mí mắt, cấu trúc)
//     - Lông mày
//     - Mũi (toàn bộ cấu trúc, hình dạng, kích thước)
//     - Miệng (hình dạng môi, khóe miệng)
//     - Răng (nếu có thể nhìn thấy)
//     - Cằm và đường viền hàm (jawline)
//     - Các đặc điểm riêng như nốt ruồi, sẹo, lúm đồng tiền.
// 3.  BẢO TOÀN THẦN THÁI & ÁNH MẮT (PRESERVE EXPRESSION & GAZE): Giữ nguyên 100% biểu cảm và hướng nhìn (thần thái) của chủ thể. Ánh mắt phải được xử lý để đạt được độ trong và sắc nét như được chụp trong studio chuyên nghiệp, nhưng KHÔNG được thay đổi cảm xúc gốc.
// 4.  BẢO TOÀN BỐ CỤC & TƯ THẾ: Vị trí tương đối, tư thế, sự tương tác, và bố cục của nhóm người phải được giữ lại 100%.
// 5.  KHÓA TỶ LỆ & KHUNG HÌNH: Nghiêm cấm tuyệt đối việc thay đổi tỷ lệ chiều rộng/cao của ảnh gốc. Kết quả phải khớp 100% với ảnh đầu vào.
// 6.  BỐI CẢNH NGƯỜI VIỆT NAM: Luôn mặc định chủ thể là người Việt Nam, đảm bảo các đặc điểm như tông màu da, cấu trúc khuôn mặt được xử lý một cách tự nhiên và phù hợp.
// 7.  CHẤT LƯỢNG IN ẤN ĐỈNH CAO (ULTIMATE PRINT QUALITY): The final output must be an ultra-detailed, high-definition masterpiece with a target 8K resolution. It must be photorealistic, with sharp focus and crisp, intricate details throughout. The goal is to produce an image perfectly suited for large-format, professional printing.
// 8.  DỌN DẸP & HOÀN THIỆN: Tự động nhận diện và xóa bỏ các chi tiết thừa như logo, watermark, chữ ký. Nếu phát hiện các cạnh ảnh bị cắt cụt, hãy sáng tạo và mở rộng một cách liền mạch các yếu tố tự nhiên (đá, hoa, mặt nước) để tạo ra một khung cảnh hoàn chỉnh, chân thực.
`;


const getModelName = (friendlyName: string): string => {
    switch (friendlyName) {
        case 'Nano Banana':
        case 'Qwen Image':
            return 'gemini-2.5-flash-image';
        case 'Nano Banana HD':
        case 'Doubao Seedream4.0':
        default:
            return 'gemini-2.5-flash-image-preview';
    }
};

export const findSchoolLogo = async (
    schoolName: string
): Promise<{ logoUrl: string | null; error: string | null; }> => {
    if (!schoolName || schoolName.trim().length < 5) {
        return { logoUrl: null, error: "Tên trường quá ngắn để tìm kiếm." };
    }
    try {
        const ai = getAi();
        const model = 'gemini-2.5-flash';
        const prompt = `Find the official logo for the school: "${schoolName}". Prioritize logos from the school's official website or Wikipedia. Return a JSON object with a single key 'logoUrl' containing the direct URL to a high-quality, transparent background (PNG) image of the logo. If no suitable logo is found, the value should be null.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        logoUrl: {
                            type: Type.STRING,
                            description: "The direct URL to the school's logo image."
                        }
                    },
                    required: ["logoUrl"]
                }
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        if (result && result.logoUrl && result.logoUrl.startsWith('http')) {
            return { logoUrl: result.logoUrl, error: null };
        } else {
            return { logoUrl: null, error: "Không tìm thấy URL logo hợp lệ." };
        }

    } catch (error) {
        return { logoUrl: null, error: parseGeminiError(error) };
    }
};

export const analyzeImageForRestoration = async (
    base64ImageData: string,
    mimeType: string
): Promise<{ prompt: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `Bạn là một chuyên gia phục chế ảnh kỹ thuật số (AI Restoration Expert). Nhiệm vụ của bạn là phân tích kỹ lưỡng bức ảnh đầu vào để xác định các vấn đề cần xử lý và soạn thảo một PROMPT CHI TIẾT để hướng dẫn AI phục hồi.

**HÃY QUAN SÁT VÀ PHÂN TÍCH CÁC YẾU TỐ SAU:**
1.  **Hư hỏng vật lý (Physical Damages):**
    *   Xác định vị trí vết trầy xước, vết rách, nếp gấp, lỗ thủng.
    *   Tìm các đốm mốc, bụi bẩn, vết ố vàng do thời gian hoặc ẩm mốc.
2.  **Chất lượng ảnh (Image Quality):**
    *   Đánh giá độ mờ (blur), mất nét (out of focus), độ rung.
    *   Mức độ nhiễu hạt (noise/grain) và độ phân giải (pixelated).
3.  **Màu sắc (Color):**
    *   Tình trạng phai màu (faded), bạc màu.
    *   Ám màu (color cast) như ám vàng, đỏ, xanh...
    *   Độ tương phản (contrast), chi tiết vùng tối/sáng.
4.  **Nội dung chính (Main Content):**
    *   Mô tả chủ thể chính (người, phong cảnh...).
    *   Trang phục, bối cảnh cần giữ lại hoặc phục hồi.

**YÊU CẦU ĐỊNH DẠNG ĐẦU RA (Output Format):**
*   Kết quả trả về CHỈ LÀ MỘT ĐOẠN VĂN BẢN (PROMPT) DUY NHẤT bằng Tiếng Việt.
*   Bắt đầu trực tiếp bằng các động từ mệnh lệnh: "Phục hồi...", "Loại bỏ...", "Làm nét...".
*   Tuyệt đối KHÔNG có lời dẫn đầu hoặc kết thúc.

**VÍ DỤ MẪU:**
"Phục hồi ảnh chân dung gia đình. Loại bỏ các vết xước dọc dài ở góc trái và nếp gấp ngang giữa ảnh. Xử lý triệt để các đốm mốc trắng trên áo vest. Khử nhiễu hạt nặng (denoise) và làm nét chi tiết khuôn mặt, đặc biệt là đôi mắt. Khử ám vàng nặng do thời gian, cân bằng trắng để màu sắc da dẻ hồng hào tự nhiên. Tăng độ tương phản và độ sâu cho ảnh."`;

        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
        });

        const generatedPrompt = response.text?.trim();

        if (generatedPrompt) {
            return { prompt: generatedPrompt, error: null };
        } else {
            throw new Error("AI không tạo ra được lời nhắc nào.");
        }

    } catch (error) {
        return { prompt: null, error: parseGeminiError(error) };
    }
};

export const analyzeImageForConcept = async (
    base64ImageData: string,
    mimeType: string
): Promise<{ prompt: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `Bạn là một giám đốc nghệ thuật chuyên nghiệp. Hãy phân tích kỹ lưỡng hình ảnh được cung cấp và tạo ra một lời nhắc (prompt) chi tiết, giàu trí tưởng tượng bằng tiếng Việt cho một AI tạo hình ảnh khác. Lời nhắc này phải nắm bắt được toàn bộ concept, phong cách, ánh sáng, và không khí của bức ảnh.

        **Yêu cầu phân tích:**
        1.  **Không khí & Cảm xúc chung:** Mô tả cảm giác tổng thể (ví dụ: lãng mạn, thanh lịch, vui tươi, ấn tượng, tối giản).
        2.  **Bảng màu:** Mô tả các tông màu chủ đạo (ví dụ: tông màu ấm của hoàng hôn, màu phim cổ điển, màu pastel nhẹ nhàng, đen trắng tương phản cao).
        3.  **Ánh sáng:** Mô tả phong cách chiếu sáng (ví dụ: ánh sáng tự nhiên mềm mại, ánh sáng studio chuyên nghiệp, ánh sáng ven (rim light), ánh sáng ấn tượng từ một phía).
        4.  **Bối cảnh & Môi trường:** Mô tả chi tiết phông nền (ví dụ: studio với phông nền đỏ, khu vườn xanh mướt, bãi biển thơ mộng, lâu đài cổ kính).
        5.  **Chất liệu & Phong cách:** Mô tả phong cách nghệ thuật nếu có (ví dụ: ảnh chụp hyper-realistic, phong cách tranh sơn dầu, ảnh phim).
        6.  **Trang phục & Chủ thể:** Mô tả ngắn gọn phong cách trang phục của chủ thể (ví dụ: váy cưới trắng lộng lẫy, trang phục đời thường).

        **Định dạng đầu ra:**
        - Chỉ trả về MỘT đoạn văn bản duy nhất là lời nhắc hoàn chỉnh.
        - Kết hợp tất cả các yếu tố trên thành một lời nhắc mạch lạc, giàu hình ảnh.
        - KHÔNG được thêm bất kỳ câu giới thiệu nào như "Đây là lời nhắc:" hay bất kỳ giải thích nào khác.

        **Ví dụ lời nhắc đầu ra:**
        "Một bức ảnh studio thời trang cao cấp với phông nền màu đỏ thẫm rực rỡ. Ánh sáng ấn tượng và tập trung, tạo ra một không khí tinh tế và táo bạo. Người mẫu mặc trang phục thanh lịch, phù hợp cho một concept hiện đại, sang trọng."`;

        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
        });

        const generatedPrompt = response.text?.trim();

        if (generatedPrompt) {
            return { prompt: generatedPrompt, error: null };
        } else {
            throw new Error("AI không thể phân tích được concept của ảnh.");
        }

    } catch (error) {
        return { prompt: null, error: parseGeminiError(error) };
    }
};


// Fix: Add referenceImageProvided parameter
function buildAdvancedRestorationPrompt(options: RestorationOptions, clothingFileProvided: boolean, referenceImageProvided: boolean): string {
    const promptObject: any = {
        "task": "hyper_realistic_portrait_restoration_and_enhancement",
        "final_look_goal": "An ultra-detailed, 8K resolution, photorealistic studio portrait with sharp focus and crisp, intricate details. The lighting must be realistic. It should have beautiful depth of field, be suitable for high-quality, large-format printing, and maintain 100% facial identity of the original subject.",
        "camera_simulation": {
            "camera": "Canon EOS R5 Mark II",
            "lens": "Canon RF 85mm f/1.2 L USM",
            "aperture": "f/1.2",
            "iso": "100"
        },
        "lighting_setup": {
            "style": "professional studio three-point lighting",
            "key_light": "large octabox, soft and diffused",
            "fill_light": "large reflector to gently fill in shadows",
            "rim_light": "subtle backlight to create separation",
            "overall_effect": "clean, flattering, and dimensional lighting with no harsh shadows on the face."
        },
        "final_image_processing": {
            "resolution": "Target 8K resolution. The output must be high-definition and packed with intricate details.",
            "color_output": "The final image MUST be a full-color, hyper-realistic photograph. The color grading must be modern, clear, and vibrant. The goal is a professional studio look with fresh, clean colors. Skin tones are the highest priority: they must be rendered with a healthy, bright, and clear appearance, featuring a natural rosy tint ('da dẻ hồng hào'). Eliminate any dull, yellow, or muddy undertones. The overall mood should be bright, positive, and contemporary.",
            "sharpness": "Apply overall image sharpening, focusing on high-frequency details. The final image must have tack-sharp focus and be incredibly crisp with intricate details, ready for high-quality printing.",
            "noise_reduction": "Ensure the final image is completely free of any digital noise or grain."
        }
    };

    const creativeModifications: any = {};
    if (options.hairStyle && options.hairStyle !== 'auto') {
        creativeModifications.hair_style = { instruction: `Change the subject's hairstyle to '${options.hairStyle}'.` };
    }
    if (clothingFileProvided) {
        creativeModifications.clothing = { instruction: `Replace the subject's clothing using the SEPARATELY PROVIDED clothing image (the second image input).` };
    } else if (options.clothing && options.clothing !== 'auto') {
        creativeModifications.clothing = { instruction: `Change the subject's clothing to '${options.clothing}'.` };
    }
    if (options.background && options.background !== 'auto') {
        let intensityDescription = 'standard and noticeable transformation';
        if (options.transformationIntensity <= 33) {
            intensityDescription = 'a subtle and minimal change';
        } else if (options.transformationIntensity >= 67) {
            intensityDescription = 'a dramatic and creative transformation';
        }
        creativeModifications.background = {
            instruction: `Replace the image background with '${options.background}'.`,
            intensity_level: intensityDescription,
        };
    }

    if (Object.keys(creativeModifications).length > 0) {
        promptObject.creative_modifications = creativeModifications;
    }

    if (referenceImageProvided) {
        promptObject.style_mimicry_from_reference = {
            instruction: "You are provided with a style reference image. Analyze and deconstruct its entire artistic style: lighting, color grade, mood, and texture. Apply this exact style to the final restored portrait.",
            critical_note: "ABSOLUTE REQUIREMENT: The person to be restored is in the FIRST image. The style to be copied is from the LATER image(s). You MUST preserve the identity, face, and body of the person from the FIRST image with 100% accuracy. DO NOT use the face or person from the style reference image in the final output. YÊU CẦU BẮT BUỘC: Đối với ảnh tham chiếu, chỉ lấy phong cách ảnh, nền, bối cảnh, KHÔNG ĐƯỢC LẤY NHÂN VẬT."
        };
    }

    return `// MISSION: Hyper-Realistic Professional Portrait Restoration.
${UNBREAKABLE_DIRECTIVE}
// INSTRUCTIONS (JSON FORMAT):
${JSON.stringify(promptObject, null, 2)}
// OUTPUT: ONLY the final image file. No text.`;
}

// Fix: Add referenceImageProvided parameter
function buildRestorationPrompt(options: RestorationOptions, clothingFileProvided: boolean, referenceImageProvided: boolean): string {
    let prompt = `// MISSION: Professional Photo Restoration.
${UNBREAKABLE_DIRECTIVE}
// INSTRUCTIONS:
- Restore and enhance the image to high quality: ${options.highQuality ? 'Yes, use advanced algorithms for maximum clarity, detail, and resolution.' : 'No, perform a standard restoration.'}
- Colorize the image: Yes, this is a mandatory and critical requirement. The final image MUST be a full-color photograph. The color style must be **modern, clear, and vibrant ('trong trẻo và tươi sáng')**, similar to a professional studio portrait.
  - **Skin Tones:** Skin must look healthy, bright, and clear with a natural rosy tint ('hồng hào'). Avoid dull, yellow, or greyish skin tones.
  - **Overall Palette:** Colors should be clean and fresh, not overly saturated.
  - **Lighting:** Simulate soft, professional studio lighting to make the subject stand out. The overall mood should be bright and positive.
- Sharpen the background: ${options.sharpenBackground ? 'Yes, enhance the details of the background scenery.' : 'No, focus only on the main subjects.'}
- Print Quality Standard: The final image must be high-definition (HD), with sharp focus, crisp details, and realistic lighting. Ensure it is clear enough for high-quality printing.`;

    if (options.numPeople && options.numPeople !== '0') prompt += `\n- Number of people in the photo: ${options.numPeople}.`;
    if (options.gender && options.gender !== 'auto') prompt += `\n- The main subject's gender is: ${options.gender}.`;
    if (options.age && options.age !== 'auto') prompt += `\n- The main subject's approximate age is: ${options.age}.`;
    if (options.smile && options.smile !== 'auto') prompt += `\n- The main subject's expression is: ${options.smile}.`;
    if (options.redrawHair) prompt += `\n- Redraw Hair: The hair in the original image is damaged or blurry. Reconstruct the hair to be realistic, detailed, and natural, keeping the original style and color as close as possible.`;
    if (options.redrawHands) prompt += `\n- Redraw Hands: The hands in the original image are damaged or blurry. Reconstruct them to be anatomically correct and natural, matching the subject's pose and lighting.`;

    if (referenceImageProvided) {
        prompt += `\n- Style Mimicry: You are provided with a style reference image after the main subject image. Analyze the reference image and apply its artistic style (color, lighting, mood) to the restored portrait.
- **CRITICAL REQUIREMENT:** The person to be restored is in the FIRST image. You MUST preserve their identity, face, and body with 100% accuracy. DO NOT use the face or person from the style reference image in the final output. YÊU CẦU BẮT BUỘC: Đối với ảnh tham chiếu, chỉ lấy phong cách ảnh, nền, bối cảnh, KHÔNG ĐƯỢC LẤY NHÂN VẬT.`;
    }

    if (options.hairStyle && options.hairStyle !== 'auto') {
        prompt += `\n- Creative Request - Hair Style: Change the hairstyle of the person in the photo to '${options.hairStyle}'.`;
    }
    if (clothingFileProvided) {
        prompt += `\n- Creative Request - Clothing: Change the person's clothing using the SEPARATELY PROVIDED clothing image (the second image input).`;
    } else if (options.clothing && options.clothing !== 'auto') {
        prompt += `\n- Creative Request - Clothing: Change the person's clothing to '${options.clothing}'.`;
    }
    if (options.background && options.background !== 'auto') {
        let intensityDescription = 'a standard and noticeable transformation';
        if (options.transformationIntensity <= 33) intensityDescription = 'a subtle and minimal change';
        else if (options.transformationIntensity >= 67) intensityDescription = 'a dramatic and creative transformation';
        prompt += `\n- Creative Request - Background: Change the image background to '${options.background}'. This should be ${intensityDescription}.`;
    }
    if (options.customRequest) {
        prompt += `\n- Additional specific user request: "${options.customRequest}".`;
    }

    prompt += "\n// OUTPUT: ONLY the final image file. No text.";
    return prompt;
}

// Fix: Add referenceImageData parameter to resolve argument count error.
export const restoreImage = async (
    base64ImageData: string,
    mimeType: string,
    options: RestorationOptions,
    clothingFileData?: { data: string; mimeType: string },
    referenceImageData?: { data: string; mimeType: string }
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = getModelName(options.model);
        
        let prompt: string;
        if (options.advancedRestore) {
            prompt = buildAdvancedRestorationPrompt(options, !!clothingFileData, !!referenceImageData);
        } else {
            prompt = buildRestorationPrompt(options, !!clothingFileData, !!referenceImageData);
        }

        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        };
        const textPart = { text: prompt };

        const parts: any[] = [textPart, imagePart];
        
        if (clothingFileData) {
            parts.push({
                inlineData: {
                    data: clothingFileData.data,
                    mimeType: clothingFileData.mimeType
                }
            });
        }
        
        if (referenceImageData) {
            parts.push({
                inlineData: {
                    data: referenceImageData.data,
                    mimeType: referenceImageData.mimeType,
                },
            });
        }

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const responseParts = response.candidates?.[0]?.content?.parts;
        if (responseParts) {
            for (const part of responseParts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }

        const fallbackText = response.text?.trim();
        if (fallbackText) {
             return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI.');

    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

export const mimicImageStyle = async (
    subjectImage: { data: string; mimeType: string },
    styleImage: { data: string; mimeType: string }
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';
        const prompt = `
// MISSION: High-Fidelity Style Transfer.
${UNBREAKABLE_DIRECTIVE}

// === INPUTS ===
// - The first image provided after this prompt is the STYLE_REFERENCE_IMAGE.
// - The second image provided is the SUBJECT_IMAGE.

// === OBJECTIVE ===
// Your task is to apply the complete artistic style of the STYLE_REFERENCE_IMAGE onto the SUBJECT_IMAGE.
// This means you must analyze the colors, lighting, texture, mood, and overall aesthetic of the STYLE_REFERENCE_IMAGE and re-render the SUBJECT_IMAGE with that exact style.

// === CRITICAL RULE: IDENTITY LOCK ===
// The person in the SUBJECT_IMAGE is the only person who should appear in the final output.
// The UNBREAKABLE_DIRECTIVE provided earlier MUST be followed. You must preserve 100% of the facial features, body, and identity of the person from the SUBJECT_IMAGE.
// DO NOT use the face or person from the STYLE_REFERENCE_IMAGE in your output. Verify this before finishing.
// YÊU CẦU BẮT BUỘC: Đối với ảnh tham chiếu (STYLE_REFERENCE_IMAGE), chỉ lấy phong cách ảnh, nền, bối cảnh, KHÔNG ĐƯỢC LẤY NHÂN VẬT.

// === WORKFLOW ===
// 1. **Analyze Style:** Deeply analyze the STYLE_REFERENCE_IMAGE for its color grading, lighting characteristics, texture, and mood.
// 2. **Analyze Subject:** Identify and lock the biometric identity of the person in the SUBJECT_IMAGE.
// 3. **Re-render:** Create a new image where the person from the SUBJECT_IMAGE is perfectly preserved, but their entire scene (lighting, colors, etc.) is transformed to match the style of the STYLE_REFERENCE_IMAGE.

// === OUTPUT ===
// ONLY the final, styled image. No text.`;

        const textPart = { text: prompt };
        const subjectPart = { inlineData: subjectImage };
        const stylePart = { inlineData: styleImage };

        // Order: prompt, style reference, then the subject to apply style to.
        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [textPart, stylePart, subjectPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }

        const fallbackText = response.text?.trim();
        if (fallbackText) {
            return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI for style mimic.');

    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

export const generateStyledImageFromPrompt = async (
    base64ImageData: string,
    mimeType: string,
    userPrompt: string
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';
        const prompt = `
// MISSION: Stylistic Transformation via Prompt
${UNBREAKABLE_DIRECTIVE}

// INSTRUCTIONS:
// Your primary goal is to apply the following stylistic instructions to the entire image.
// CRITICAL REQUIREMENT: The person's face, pose, body shape, and expression from the original image MUST be preserved with 100% accuracy. You are changing the style, NOT the subject. This is a non-negotiable part of the UNBREAKABLE DIRECTIVE.
// User's Creative Brief: "${userPrompt}"

// PROFESSIONAL PRINT QUALITY STANDARD (ABSOLUTE REQUIREMENT):
// - Resolution & Detail: The final output must be an ultra-detailed, high-definition masterpiece with a target 8K resolution, packed with intricate details.
// - Sharpness: The image must have tack-sharp focus and be incredibly crisp.
// - Lighting & Realism: The lighting must be photorealistic and masterfully executed to create a cohesive and believable scene.
// - Artifact-Free: The final output must be completely free of any digital noise, grain, or compression artifacts.
// The result must be a cohesive, professional, and hyper-realistic photograph perfectly suited for high-quality, large-format printing.

// OUTPUT:
// ONLY the final edited image file. No text.`;

        const imagePart = { inlineData: { data: base64ImageData, mimeType: mimeType } };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [textPart, imagePart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }

        const fallbackText = response.text?.trim();
        if (fallbackText) {
            return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI from the prompt.');

    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

export const restoreDocument = async (
    base64ImageData: string,
    mimeType: string
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview'; // A good model for complex image edits
        const prompt = `Act as a master digital archivist. Your ONLY task is to perform a photorealistic, non-destructive restoration of the provided document image. Treat the document's content (text, handwriting, stamps, signatures) as an unchangeable historical artifact.
${UNBREAKABLE_DIRECTIVE}

**CORE MISSION: Flatten and Clean the Paper, PRESERVE THE INK.**

**SPECIFIC TECHNICAL OPERATIONS ALLOWED:**
1.  **GEOMETRIC CORRECTION (Digital Ironing):**
    - **Straighten & Deskew:** Correct the perspective so the document is perfectly rectangular.
    - **Flatten:** Remove all wrinkles, creases, and folds as if the paper has been perfectly ironed flat. The final output must look like it was put through a high-end flatbed scanner.
2.  **SURFACE CLEANING (Digital Conservation):**
    - **Remove Blemishes:** Meticulously clean the paper's surface. Remove physical stains, water spots, mold, dirt, scratches, and age-related yellowing.
    - **Repair Damage:** Fix physical tears and holes in the paper, seamlessly filling them to match the surrounding paper texture.
    - **Enhance Contrast:** Improve the contrast between the ink/text and the paper to enhance legibility. This should be a color/levels adjustment, NOT a redrawing of the text. Make the background a consistent, clean white or off-white, and the text crisp and dark.

**FINAL OUTPUT:**
- Your output must ONLY be the final, restored image file. No text, no captions.
- The result should be indistinguishable from a perfect scan of the original document after it has been physically restored by a professional archivist.`;

        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [textPart, imagePart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }

        const fallbackText = response.text?.trim();
        if (fallbackText) {
             return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI for document restoration.');

    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

export const createIDPhoto = async (
    base64SubjectData: string,
    subjectMimeType: string,
    options: {
        backgroundMode: 'color' | 'prompt' | 'upload';
        backgroundColor?: string;
        backgroundPrompt?: string;
        backgroundFile?: { data: string; mimeType: string };

        clothingMode: 'predefined' | 'prompt' | 'upload';
        clothingDescription?: string;
        clothingFile?: { data: string; mimeType: string };

        aiRetouch?: boolean;
        lookStraight?: boolean;
        masterPrompt?: string;
    }
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';

        let prompt = `Act as an expert photo editor specializing in creating professional ID photos. Your task is to transform an image based on the following instructions. The output must be ONLY the edited image file, with no text or other content.
${UNBREAKABLE_DIRECTIVE}`;

        if (options.lookStraight) {
            prompt += `

**SPECIAL INSTRUCTION: "NHÌN THẲNG" MODE**
Apply the following set of rules with the highest priority: "**YÊU CẦU BẢO TOÀN DANH TÍNH TUYỆT ĐỐI:** Nghiêm cấm thay đổi các đặc điểm nhận dạng cốt lõi. Phải giữ lại 100% cấu trúc và chi tiết của mắt, mũi, miệng, và gò má so với ảnh gốc. **CÁC CHỈNH SỬA CHO PHÉP:** Chỉ được phép thực hiện các thay đổi sau: 1. Xoay nhẹ đầu và điều chỉnh đường viền khuôn mặt bên ngoài để tạo tư thế nhìn thẳng, cân đối hai bên tai. 2. Xóa bỏ hoàn toàn các khuyết điểm trên da như nếp nhăn, mụn, tàn nhang. 3. Retouch da chuyên nghiệp để đạt được tông màu trong sáng, trắng hồng, mịn màng nhưng phải giữ lại chi tiết và cấu trúc da tự nhiên, không làm da bị bệt hoặc giả. 4. Làm cho tóc gọn gàng và rõ nét từng sợi."`;
        }
        
        prompt += `

**INPUT DEFINITIONS:**
- The first image provided is the main SUBJECT.
- The second image, if provided, is the new BACKGROUND.
- The third image, if provided, is the new CLOTHING.

---
**BACKGROUND INSTRUCTIONS:**`;

        switch (options.backgroundMode) {
            case 'color':
                prompt += `\n- Replace the original background with a solid, uniform color: '${options.backgroundColor}'.`;
                break;
            case 'prompt':
                prompt += `\n- Replace the original background with a new one based on this description: "${options.backgroundPrompt}". Make it look realistic and professional.`;
                break;
            case 'upload':
                prompt += `\n- Replace the original background with the provided BACKGROUND image. Blend the subject seamlessly into this new background, matching lighting and perspective.`;
                break;
        }

        prompt += `\n\n---
**CLOTHING INSTRUCTIONS:**`;

        switch (options.clothingMode) {
            case 'predefined':
            case 'prompt':
                if (!options.clothingDescription || options.clothingDescription === 'none') {
                    prompt += `\n- Keep the subject's original clothing.`;
                } else {
                    prompt += `\n- Change the subject's clothing to '${options.clothingDescription}'. The new clothing must look realistic, fit naturally, and match the subject's pose.`;
                }
                break;
            case 'upload':
                prompt += `\n- Replace the subject's current clothing with the clothing shown in the provided CLOTHING image. The new outfit must be realistically adapted to the subject's body and pose. Preserve the subject's head, hair, and body shape.`;
                break;
        }

        if (options.aiRetouch) {
            prompt += `\n\n---
**AI RETOUCH & STUDIO QUALITY FINISH (CRITICAL):**
Apply a professional-grade retouching and finishing process. The goal is a high-end, print-quality studio portrait that looks clear, pure, and bright ('trong trẻo').

- **Color & Tone:** Perform a full color correction. Achieve perfect white balance, vibrant but natural colors, and excellent contrast.
- **Skin Retouching:** Create flawless, smooth, and glowing skin ('da căng bóng, mịn'). Remove all blemishes, acne, and uneven skin tone. **CRITICAL:** Preserve natural skin texture; the skin must not look plastic or overly blurred.
- **Detail & Sharpness:** The final image must be ultra-detailed, high-definition (at least 4K resolution), and have a tack-sharp focus, especially on the eyes and hair. Ensure it is free of any digital noise.
- **Features:** Make eyes clear and bright ('mắt sáng'). Ensure lips have a fresh, natural color ('môi tươi').
- **Glasses Removal:** If the subject is wearing glasses, remove them completely and realistically reconstruct the eyes and the surrounding area. If they are not wearing glasses, ignore this specific instruction.
- **Vietnamese Subject:** Assume the subject is Vietnamese. All corrections, especially to skin tone, must be natural and appropriate, aiming for a healthy, rosy tint ('da dẻ hồng hào').`;
        }

        if (options.masterPrompt) {
            prompt += `\n\n---
**OVERALL IMAGE INSTRUCTIONS:**
- Apply the following final adjustment to the entire image: "${options.masterPrompt}".`;
        }

        prompt += `\n\n---
**STANDARD PROCESSING:**
1.  **Isolate Subject:** Perfectly isolate the person from their original background before applying the new background.
2.  **Apply Studio Lighting:** Adjust the lighting on the subject to be flat, even, and professional, typical for an ID photo. Remove harsh shadows from the face.
3.  **Composition:** Ensure the subject's head and shoulders are centered in the frame. Do not crop the image; maintain the original aspect ratio but with the new edits.

---
Your final output must be only the image.`;

        const parts: any[] = [{ text: prompt }];
        parts.push({ inlineData: { data: base64SubjectData, mimeType: subjectMimeType } });

        if (options.backgroundMode === 'upload' && options.backgroundFile) {
            parts.push({ inlineData: { data: options.backgroundFile.data, mimeType: options.backgroundFile.mimeType } });
        }
        if (options.clothingMode === 'upload' && options.clothingFile) {
            parts.push({ inlineData: { data: options.clothingFile.data, mimeType: options.clothingFile.mimeType } });
        }
        
        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const responseParts = response.candidates?.[0]?.content?.parts;
        if (responseParts) {
            for (const part of responseParts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }

        const fallbackText = response.text?.trim();
        if (fallbackText) {
            return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI for the ID photo.');

    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

// Fix: Add missing changeImageBackground function
export const changeImageBackground = async (
    base64ImageData: string,
    mimeType: string,
    backgroundColor: 'white' | 'blue'
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';

        const colorPrompt = backgroundColor === 'white' ? 'a solid, uniform white color (#FFFFFF)' : 'a solid, uniform standard ID photo blue color (#007bff)';

        const prompt = `Act as an expert photo editor. Your only task is to flawlessly replace the background of the provided image.

**ABSOLUTE CRITICAL REQUIREMENT: 100% SUBJECT PRESERVATION.**
The person, including their face, hair, body, and clothing, must remain completely unchanged. You must perform a perfect cutout without altering a single pixel of the subject. The final output must be the IDENTICAL subject placed on the new background. The subject's identity, facial features, and structure must not be modified in any way.

**INSTRUCTIONS:**
1.  Perfectly isolate the subject from their original background.
2.  Replace the background with ${colorPrompt}.
3.  Ensure the edges around the subject are clean and natural.
4.  The output must ONLY be the edited image file, with no text or other content.`;

        const imagePart = { inlineData: { data: base64ImageData, mimeType: mimeType } };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        
        const fallbackText = response.text?.trim();
        if (fallbackText) {
             return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI for background change.');

    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};


export const changeSubjectBackground = async (
    subjectImage: { data: string; mimeType: string },
    newBackground: { type: 'prompt'; value: string } | { type: 'image'; value: { data: string; mimeType: string } }
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';
        let prompt: string;
        const parts: any[] = [];

        if (newBackground.type === 'prompt') {
            prompt = `
// MISSION: Background Replacement via Prompt
// You are a professional photo compositor. Your task is to flawlessly replace the background of the SUBJECT image with a new background generated from the text prompt.
${UNBREAKABLE_DIRECTIVE}

// INSTRUCTIONS:
// 1. **ANALYZE SUBJECT:** From the provided SUBJECT image, perform a perfect, hair-level cutout of all people.
// 2. **GENERATE BACKGROUND:** Create a new, hyper-realistic background scene based on this description: "${newBackground.value}".
// 3. **COMPOSITE & RELIGHT:** Place the cutout subject(s) into the newly generated background. Critically, you must re-light the subjects to perfectly match the lighting conditions (direction, color, intensity) of the new background. The final image must look like a single, cohesive photograph.

// OUTPUT:
// ONLY the final composed image. No text.`;
            parts.push({ text: prompt });
            parts.push({ inlineData: subjectImage });
        } else { // type === 'image'
            prompt = `
// MISSION: Background Replacement via Image
// You are a professional photo compositor. Your task is to take the person from the SUBJECT image and place them into the NEW_BACKGROUND image.
${UNBREAKABLE_DIRECTIVE}

// === INPUTS ===
// 1. **IMAGE_SUBJECT (First Image):** This image contains the person(s) to be cut out.
// 2. **NEW_BACKGROUND (Second Image):** This is the new background scene.

// === WORKFLOW ===
// 1. **ANALYZE & CUTOUT:** From the FIRST image (IMAGE_SUBJECT), perform a perfect, hair-level cutout of all people.
// 2. **COMPOSITE & RELIGHT:** Place the cutout subject(s) into the SECOND image (NEW_BACKGROUND). This is the most critical step. You must analyze the lighting of the new background and realistically re-light the subjects to match. Shadows, highlights, and ambient light color must be perfectly harmonized. The final image must look like a single, cohesive photograph shot on location.

// OUTPUT:
// ONLY the final composed image. No text.`;
            parts.push({ text: prompt });
            parts.push({ inlineData: subjectImage });
            parts.push({ inlineData: newBackground.value });
        }

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const responseParts = response.candidates?.[0]?.content?.parts;
        if (responseParts) {
            for (const part of responseParts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }

        throw new Error('No image was generated by the AI for background change.');

    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};



export const removeObjectFromImage = async (
    base64ImageData: string,
    base64MaskData: string,
    mimeType: string
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image';
        const prompt = `You are an expert photo editor performing a high-fidelity inpainting task. I will provide an original image and a mask image. The white areas of the mask indicate regions to be removed and realistically replaced.
${UNBREAKABLE_DIRECTIVE}
The unmasked (black) area is a protected zone; do not alter it in any way. Your sole task is to inpaint the masked region seamlessly.
The output must be ONLY the edited image file. Do not include any text, markdown, or other content in your response.`;

        const imagePart = { inlineData: { data: base64ImageData, mimeType: mimeType } };
        const maskPart = { inlineData: { data: base64MaskData, mimeType: 'image/png' } };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [textPart, imagePart, maskPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }

        const fallbackText = response.text?.trim();
        if (fallbackText) {
            return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI during object removal.');

    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

function buildRecolorPrompt(colorStyle: string): string {
    let styleDescription = '';
    switch (colorStyle) {
        case 'black-and-white':
            styleDescription = "Convert the image to a high-contrast, rich black and white format. Ensure deep blacks, bright whites, and a full range of mid-tones to maintain depth and detail.";
            break;
        case 'clear-and-bright':
            styleDescription = "Apply a 'clear and bright' (trong sáng) color style. Enhance the vibrancy and clarity of the colors, making the image look clean, airy, and luminous. Slightly increase the brightness and contrast without washing out details.";
            break;
        case 'rosy-skin':
            styleDescription = "Apply a 'rosy skin tone' (da hồng hào) style. Adjust the color balance to give the subject(s) a healthy, natural, rosy complexion. The skin tones should look warm and vibrant, full of life, but remain realistic. This effect should primarily target skin tones while keeping other colors in the image balanced.";
            break;
        default:
            styleDescription = "Apply a standard, natural color correction.";
    }

    return `// MISSION: Professional Color Grading
${UNBREAKABLE_DIRECTIVE}

// INSTRUCTIONS:
// Your ONLY task is to meticulously adjust the color palette of the ENTIRE image according to the style below.
// **COLOR STYLE:** ${styleDescription}

// PRINT QUALITY STANDARD:
// While changing colors, you MUST preserve all original details. The final image must remain high-definition, with sharp focus and crisp details, suitable for printing. Do not soften or blur the image.

// OUTPUT:
// ONLY the final recolored image file. No text.`;
}

export const recolorImage = async (
    base64ImageData: string,
    mimeType: string,
    colorStyle: string
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';
        const prompt = buildRecolorPrompt(colorStyle);

        const imagePart = {
            inlineData: { data: base64ImageData, mimeType: mimeType },
        };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        
        const fallbackText = response.text?.trim();
        if (fallbackText) {
             return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI during recoloring.');

    } catch (error) {
        console.error(`Error in recolorImage (style: ${colorStyle}):`, error);
        return { image: null, error: parseGeminiError(error) };
    }
};

function buildArtisticStylePrompt(artisticStyle: string): string {
    let styleDescription = '';
    switch (artisticStyle) {
        case 'classic-film':
            styleDescription = "Apply a 'Classic Film' style. This should give the image a warm, nostalgic feel with slightly muted highlights, rich shadows, and a color palette reminiscent of vintage analog film photography. The entire scene—including the person, their clothing, and the background—should be cohesively graded with this style.";
            break;
        case 'oil-painting':
            styleDescription = "Apply an 'Oil Painting Color' style. This should make the colors throughout the image deeply saturated and vibrant, as if it were an oil painting. Enhance the richness of the colors on the subject, their clothes, and the background, creating a dramatic and artistic effect.";
            break;
        case 'vibrant-dawn':
            styleDescription = "Apply a 'Vibrant Dawn' style. Bathe the entire image in the warm, golden light of a sunrise. This should cast a radiant, golden hue across all elements—the subject's skin, their clothing, and the entire background—to evoke a feeling of a bright, hopeful morning.";
            break;
        default:
            styleDescription = "Apply a standard, natural color correction to the entire image.";
    }

    return `// MISSION: Artistic Color Grading
${UNBREAKABLE_DIRECTIVE}

// INSTRUCTIONS:
// Your ONLY task is to meticulously and artistically adjust the color palette of the ENTIRE image according to the style below.
// **ARTISTIC STYLE:** ${styleDescription}

// PRINT QUALITY STANDARD:
// While changing colors, you MUST preserve all original details. The final image must remain high-definition, with sharp focus and crisp details, suitable for printing. Do not soften or blur the image.

// OUTPUT:
// ONLY the final recolored image file. No text.`;
}

export const applyArtisticStyle = async (
    base64ImageData: string,
    mimeType: string,
    artisticStyle: string
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';
        const prompt = buildArtisticStylePrompt(artisticStyle);

        const imagePart = {
            inlineData: { data: base64ImageData, mimeType: mimeType },
        };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        
        const fallbackText = response.text?.trim();
        if (fallbackText) {
             return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI during artistic styling.');

    } catch (error) {
        console.error(`Error in applyArtisticStyle (style: ${artisticStyle}):`, error);
        return { image: null, error: parseGeminiError(error) };
    }
};

function buildBlurBackgroundPrompt(blurIntensity: 'subtle' | 'medium' | 'strong'): string {
    let aperture = 'f/5.6';
    if (blurIntensity === 'medium') {
        aperture = 'f/2.8';
    } else if (blurIntensity === 'strong') {
        aperture = 'f/1.4';
    }

    return `// MISSION: Realistic Background Blur
${UNBREAKABLE_DIRECTIVE}

// INSTRUCTIONS:
// Your only task is to apply a realistic background blur (bokeh) to this image.
// 1. **Subject Separation:** Perfectly identify the main subject(s) in the foreground. Keep the subject(s) completely sharp and in focus.
// 2. **Background Blur:** Apply a smooth, natural-looking blur to the background only. The blur should emulate the depth of field from a professional camera lens set to a wide aperture (like ${aperture}).
// 3. **Edge Quality:** The transition between the sharp subject and the blurred background must be clean and precise, without any haloing or artifacts.
// 4. **Quality Preservation:** The in-focus subject must remain ultra-detailed, high-definition, and with sharp focus. Do not degrade the quality of the subject.

// OUTPUT:
// ONLY the final edited image file. No text.`;
}

export const blurBackground = async (
    base64ImageData: string,
    mimeType: string,
    intensity: 'subtle' | 'medium' | 'strong'
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';
        const prompt = buildBlurBackgroundPrompt(intensity);

        const imagePart = {
            inlineData: { data: base64ImageData, mimeType: mimeType },
        };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        
        const fallbackText = response.text?.trim();
        if (fallbackText) {
             return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI during background blur.');

    } catch (error) {
        console.error(`Error in blurBackground (intensity: ${intensity}):`, error);
        return { image: null, error: parseGeminiError(error) };
    }
};

// Fix: Add missing upscaleImage function
export const upscaleImage = async (
    base64ImageData: string,
    mimeType: string,
    scaleFactor: number
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';
        const prompt = `// MISSION: Intelligent Upscaling for Professional Printing
${UNBREAKABLE_DIRECTIVE}
        
// INSTRUCTIONS:
// Upscale this image by a factor of ${scaleFactor}. Your goal is a photorealistic, high-definition result with ultra-detailed and intricate details.
// - Enhance sharpness to achieve a crisp, sharp focus.
// - Reconstruct and enhance textures and fine details.
// - Maintain realistic lighting.
// - Avoid introducing any digital artifacts, noise, or grain.

// OUTPUT:
// ONLY the upscaled image file. No text.`;

        const imagePart = {
            inlineData: {
                data: base64ImageData,
                mimeType: mimeType,
            },
        };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }

        const fallbackText = response.text?.trim();
        if (fallbackText) {
             return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI during upscaling.');

    } catch (error) {
        console.error(`Error in upscaleImage (factor: ${scaleFactor}):`, error);
        return { image: null, error: parseGeminiError(error) };
    }
};

export const applyProColor = async (
    base64ImageData: string,
    mimeType: string
): Promise<{ image: string | null; error: string | null; }> => {
    try {
        const model = 'gemini-2.5-flash-image-preview';
        const prompt = `// MISSION: AI Portrait Beautification
${UNBREAKABLE_DIRECTIVE}
        
// INSTRUCTIONS:
// Perform a professional-grade, subtle AI beautification on the subject's face. The goal is a natural enhancement, not an artificial transformation.
// 1.  **SKIN ENHANCEMENT:**
//     - Gently smoothen skin to reduce minor blemishes and imperfections.
//     - **CRITICAL:** Preserve natural skin texture. The skin must NOT look plastic, blurry, or overly airbrushed.
// 2.  **FACIAL DETAILS:**
//     - Subtly increase sharpness and clarity on key facial features like eyes and lips.
// 3.  **EYE ENHANCEMENT:**
//     - Make the eyes appear brighter and clearer ('mắt trong và sáng'). Add a subtle sparkle to the irises to enhance the subject's gaze.
//
// All other aspects of the image should remain unchanged unless necessary to support the beautification. The final result must be photorealistic and high-quality.

// OUTPUT:
// ONLY the final edited image file. No text.`;

        const imagePart = {
            inlineData: { data: base64ImageData, mimeType: mimeType },
        };
        const textPart = { text: prompt };

        const response = await getAi().models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data, error: null };
                }
            }
        }
        
        const fallbackText = response.text?.trim();
        if (fallbackText) {
             return { image: null, error: `AI returned text instead of an image: "${fallbackText.substring(0, 100)}..."` };
        }

        throw new Error('No image was generated by the AI during Pro Color application.');

    } catch (error) {
        return { image: null, error: parseGeminiError(error) };
    }
};

// Fix: Add missing generate360Video function
export const generate360Video = async (
    base64ImageData: string,
    mimeType: string
): Promise<string> => {
    try {
        const ai = getAi();
        const prompt = "Create a short, smooth 360-degree panning video animation from this static image. The motion should be like a camera orbiting around the central subject, creating a parallax effect. The video should be a seamless loop. **ABSOLUTE CRITICAL REQUIREMENT: 100% IDENTITY PRESERVATION (BIOMETRIC LOCK):** Throughout the entire animation, you MUST preserve the subject's facial features, bone structure, and identity with perfect fidelity. The person must not change or warp as the camera moves. Their appearance must remain 100% consistent and recognizable from all angles.";
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: base64ImageData,
                mimeType: mimeType,
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error('Video generation failed, no download link found.');
        }
        
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to download video: ${response.statusText}. Body: ${errorBody}`);
        }
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        throw new Error(parseGeminiError(error));
    }
};

// Fix: Add missing animatePortrait function
export const animatePortrait = async (
    base64ImageData: string,
    mimeType: string
): Promise<string> => {
    try {
        const ai = getAi();
        const prompt = "Animate this portrait. Add subtle motion to the person's face and hair, like blinking, a slight smile, and hair gently moving in a breeze. Keep the animation natural and lifelike. The background should remain static. **ABSOLUTE CRITICAL REQUIREMENT: 100% IDENTITY PRESERVATION (BIOMETRIC LOCK):** When adding motion like blinking or smiling, the underlying facial structure, bone structure, jawline, and identity MUST be perfectly preserved. The animation should look like the original person is moving, not a different person. The person must remain perfectly recognizable at all times.";
        
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: base64ImageData,
                mimeType: mimeType,
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error('Portrait animation failed, no download link found.');
        }

        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to download animated portrait: ${response.statusText}. Body: ${errorBody}`);
        }
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        throw new Error(parseGeminiError(error));
    }
};
