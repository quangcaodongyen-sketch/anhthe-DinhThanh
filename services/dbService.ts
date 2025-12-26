

// Fix: Removed IDBValidKey from idb import as it is a global DOM type and not exported by the library.
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'ImageArchiveDB';
const DB_VERSION = 6; // Incremented version for schema change
const STORE_NAME = 'images';
const CUSTOMER_STORE_NAME = 'customers';
const USER_STORE_NAME = 'local_users';
const PROMPT_STORE_NAME = 'custom_prompts';


export interface LocalUser {
  id?: number;
  username: string;
  passwordHash: string;
  createdAt: number;
}

export interface CustomerRecord {
  id?: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  userId: number; // Foreign key to LocalUser
}

export interface ImageRecord {
  id: number;
  imageData: Blob;
  thumbnailData: Blob;
  originalImage: Blob;
  timestamp: number;
  customerId?: number;
  userId: number; // Foreign key to LocalUser
}

export interface CustomPromptRecord {
  id?: number;
  promptText: string;
  createdAt: number;
  userId: number; // Foreign key to LocalUser
}

interface AppDB extends DBSchema {
  [STORE_NAME]: {
    key: number;
    value: ImageRecord;
    indexes: { 'timestamp': number; 'customerId': number; 'userId': number };
  };
  [CUSTOMER_STORE_NAME]: {
    key: number;
    value: CustomerRecord;
    indexes: { 'name': string; 'phone': string; 'updatedAt': number; 'userId': number };
  };
  [USER_STORE_NAME]: {
    key: number;
    value: LocalUser;
    indexes: { 'username': string };
  };
  [PROMPT_STORE_NAME]: {
    key: number;
    value: CustomPromptRecord;
    indexes: { 'userId': number; 'createdAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<AppDB>> => {
    if (!dbPromise) {
        dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, tx) {
                if (oldVersion < 1) {
                    const imageStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    imageStore.createIndex('timestamp', 'timestamp');
                }
                if (oldVersion < 2) {
                    const customerStore = db.createObjectStore(CUSTOMER_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    customerStore.createIndex('name', 'name');
                    customerStore.createIndex('phone', 'phone');
                    customerStore.createIndex('updatedAt', 'updatedAt');
                }
                if (oldVersion < 3) {
                    tx.objectStore(STORE_NAME).createIndex('customerId', 'customerId');
                }
                 if (oldVersion < 5) {
                    // Create user store
                    const userStore = db.createObjectStore(USER_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                    
                    // Add userId index to customers
                    tx.objectStore(CUSTOMER_STORE_NAME).createIndex('userId', 'userId');

                    // Add userId index to images
                    tx.objectStore(STORE_NAME).createIndex('userId', 'userId');
                }
                if (oldVersion < 6) {
                    const promptStore = db.createObjectStore(PROMPT_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    promptStore.createIndex('userId', 'userId');
                    promptStore.createIndex('createdAt', 'createdAt');
                }
            },
        });
    }
    return dbPromise;
};

// --- USER AUTHENTICATION ---

// Simple and fast hashing for client-side. Not for server security.
const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const createLocalUser = async (username: string, password: string): Promise<LocalUser> => {
    const db = await getDb();
    const existingUser = await db.getFromIndex(USER_STORE_NAME, 'username', username);
    if (existingUser) {
        throw new Error('Tên người dùng đã tồn tại.');
    }
    const passwordHash = await hashPassword(password);
    const newUser: Omit<LocalUser, 'id'> = {
        username,
        passwordHash,
        createdAt: Date.now()
    };
    const id = await db.add(USER_STORE_NAME, newUser as LocalUser);
    return { id, ...newUser };
};

export const authenticateLocalUser = async (username: string, password: string): Promise<LocalUser | null> => {
    const db = await getDb();
    const user = await db.getFromIndex(USER_STORE_NAME, 'username', username);
    if (!user) {
        return null; // User not found
    }
    const passwordHash = await hashPassword(password);
    if (user.passwordHash === passwordHash) {
        return user;
    }
    return null; // Incorrect password
};


// Helper to convert data URL to Blob
const dataURLtoBlob = (dataurl: string): Blob | null => {
    if (!dataurl || !dataurl.includes(',')) {
        console.error("Invalid data URL provided to dataURLtoBlob");
        return null;
    }
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        return null;
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

const createThumbnail = (imageDataUrl: string, maxWidth: number = 256): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed'));
                }
                resolve(blob);
            }, 'image/jpeg', 0.8);
        };
        img.onerror = reject;
    });
};

export const saveImage = async (imageDataUrl: string, originalImageUrl: string, userId: number, customerId?: number): Promise<number> => {
    const db = await getDb();
    const imageBlob = dataURLtoBlob(imageDataUrl);
    const originalBlob = dataURLtoBlob(originalImageUrl);
    const thumbnailBlob = await createThumbnail(imageDataUrl);

    if (!imageBlob || !originalBlob) {
        throw new Error("Could not convert image data to Blob.");
    }

    const record: Omit<ImageRecord, 'id'> = {
        imageData: imageBlob,
        thumbnailData: thumbnailBlob,
        originalImage: originalBlob,
        timestamp: Date.now(),
        userId,
    };
    if (customerId) {
        record.customerId = customerId;
    }

    return db.add(STORE_NAME, record as any);
};

export interface ArchivedImage {
    id: number;
    imageDataUrl: string;
    thumbnailDataUrl: string;
    originalImageUrl: string;
    timestamp: number;
    customerId?: number;
    userId: number;
}

const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export const getImagesForCustomer = async (customerId: number, userId: number): Promise<ArchivedImage[]> => {
    const db = await getDb();
    const records = await db.getAllFromIndex(STORE_NAME, 'customerId', customerId);
    // Further filter by userId
    const userRecords = records.filter(r => r.userId === userId);
     const imagesWithDataUrls = await Promise.all(
      userRecords.map(async (record) => {
        const imageDataUrl = await blobToDataURL(record.imageData);
        return {
            id: record.id,
            imageDataUrl: imageDataUrl,
            thumbnailDataUrl: record.thumbnailData ? await blobToDataURL(record.thumbnailData) : imageDataUrl,
            originalImageUrl: await blobToDataURL(record.originalImage),
            timestamp: record.timestamp,
            customerId: record.customerId,
            userId: record.userId,
        };
      })
    );
    return imagesWithDataUrls.sort((a, b) => b.timestamp - a.timestamp);
};


export const getAllImages = async (userId: number): Promise<ArchivedImage[]> => {
    const db = await getDb();
    const records = await db.getAllFromIndex(STORE_NAME, 'userId', userId);
    const reversedRecords = records.sort((a,b) => b.timestamp - a.timestamp);

    const imagesWithDataUrls = await Promise.all(
        reversedRecords.map(async (record) => {
            const imageDataUrl = await blobToDataURL(record.imageData);
            return {
                id: record.id,
                imageDataUrl: imageDataUrl,
                thumbnailDataUrl: record.thumbnailData ? await blobToDataURL(record.thumbnailData) : imageDataUrl,
                originalImageUrl: await blobToDataURL(record.originalImage),
                timestamp: record.timestamp,
                customerId: record.customerId,
                userId: record.userId
            };
        })
    );
    return imagesWithDataUrls;
};


export const deleteImage = async (id: number): Promise<void> => {
    const db = await getDb();
    return db.delete(STORE_NAME, id);
};

export const addCustomer = async (customer: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
    const db = await getDb();
    const now = Date.now();
    return db.add(CUSTOMER_STORE_NAME, {
        ...customer,
        createdAt: now,
        updatedAt: now,
    });
};

export const getAllCustomers = async (userId: number): Promise<CustomerRecord[]> => {
    const db = await getDb();
    const allCustomers = await db.getAllFromIndex(CUSTOMER_STORE_NAME, 'userId', userId);
    return allCustomers.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const updateCustomer = async (customer: CustomerRecord): Promise<number> => {
    const db = await getDb();
    return db.put(CUSTOMER_STORE_NAME, {
        ...customer,
        updatedAt: Date.now(),
    });
};

export const deleteCustomer = async (id: number, userId: number): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction([CUSTOMER_STORE_NAME, STORE_NAME], 'readwrite');
    const imageStore = tx.objectStore(STORE_NAME);
    const customerStore = tx.objectStore(CUSTOMER_STORE_NAME);
    
    // Ensure we only delete for the correct user
    const customer = await customerStore.get(id);
    if (customer?.userId !== userId) {
        throw new Error("Permission denied to delete this customer.");
    }

    // Find all image keys associated with the customer
    const imageKeys = await imageStore.index('customerId').getAllKeys(id);

    // Delete all associated images
    await Promise.all(imageKeys.map(key => imageStore.delete(key)));
    
    // Delete the customer
    await customerStore.delete(id);

    await tx.done;
};

const GUEST_CUSTOMER_NAME = "Khách lẻ (Vãng Lai)";

export const findOrCreateGuestCustomer = async (userId: number): Promise<CustomerRecord> => {
    const allCustomers = await getAllCustomers(userId);
    const existingGuest = allCustomers.find(c => c.name === GUEST_CUSTOMER_NAME);

    if (existingGuest) {
        // Touch the updatedAt timestamp so it appears at the top of the list
        await updateCustomer({ ...existingGuest, updatedAt: Date.now() });
        return existingGuest;
    }

    const newGuestData: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        name: GUEST_CUSTOMER_NAME,
        phone: 'N/A',
        address: 'N/A',
        notes: 'Các ảnh được lưu nhanh không gán cho khách hàng cụ thể.',
        userId: userId,
    };
    
    const newId = await addCustomer(newGuestData);
    const db = await getDb();
    const newCustomerRecord = await db.get(CUSTOMER_STORE_NAME, newId);
    if (!newCustomerRecord) throw new Error("Failed to create or retrieve guest customer.");
    return newCustomerRecord;
};


// --- PROMPT FUNCTIONS ---
export const addCustomPrompt = async (promptText: string, userId: number): Promise<number> => {
    const db = await getDb();
    const newPrompt: Omit<CustomPromptRecord, 'id'> = {
        promptText,
        userId,
        createdAt: Date.now(),
    };
    return db.add(PROMPT_STORE_NAME, newPrompt as CustomPromptRecord);
};

export const getAllCustomPrompts = async (userId: number): Promise<CustomPromptRecord[]> => {
    const db = await getDb();
    const allPrompts = await db.getAllFromIndex(PROMPT_STORE_NAME, 'userId', userId);
    return allPrompts.sort((a, b) => b.createdAt - a.createdAt); // Sort by most recent
};

export const deleteCustomPrompt = async (id: number): Promise<void> => {
    const db = await getDb();
    return db.delete(PROMPT_STORE_NAME, id);
};


// --- IMPORT/EXPORT FUNCTIONS ---

interface ExportData {
    customers: CustomerRecord[];
    images: (Omit<ImageRecord, 'imageData' | 'thumbnailData' | 'originalImage' | 'id'> & {
        id?: number;
        imageData: string;
        thumbnailData: string;
        originalImage: string;
    })[];
}

export const exportAllData = async (userId: number): Promise<string> => {
    const db = await getDb();
    const customers = await db.getAllFromIndex(CUSTOMER_STORE_NAME, 'userId', userId);
    const imageRecords = await db.getAllFromIndex(STORE_NAME, 'userId', userId);

    const imagesWithBase64 = await Promise.all(imageRecords.map(async (record) => ({
        ...record,
        imageData: await blobToDataURL(record.imageData),
        thumbnailData: await blobToDataURL(record.thumbnailData),
        originalImage: await blobToDataURL(record.originalImage),
    })));

    const exportData: ExportData = {
        customers,
        images: imagesWithBase64,
    };

    return JSON.stringify(exportData, null, 2);
};

// This needs careful consideration in a multi-user context.
// A simple import would merge data, which might not be desired.
// For now, let's make it import INTO the current user's account.
export const importAllData = async (jsonString: string, userId: number): Promise<void> => {
    const db = await getDb();
    const data: ExportData = JSON.parse(jsonString);

    if (!data.customers || !data.images) {
        throw new Error("Invalid import file format.");
    }

    // Note: This does NOT clear old data, it merges.
    // This is safer than the previous implementation.

    const oldIdToNewIdMap = new Map<number, number>();
    const customerTx = db.transaction(CUSTOMER_STORE_NAME, 'readwrite');
    const addCustomerPromises: Promise<IDBValidKey>[] = [];

    for (const customer of data.customers) {
        const { id, ...customerData } = customer;
        const newCustomerRecord = { ...customerData, userId }; // Assign to current user
        addCustomerPromises.push(customerTx.store.add(newCustomerRecord as CustomerRecord));
    }
    
    await customerTx.done;
    const newCustomerIds = await Promise.all(addCustomerPromises);

    data.customers.forEach((oldCustomer, index) => {
        if (oldCustomer.id !== undefined && newCustomerIds[index] !== undefined) {
            oldIdToNewIdMap.set(oldCustomer.id, newCustomerIds[index] as number);
        }
    });

    const imageTx = db.transaction(STORE_NAME, 'readwrite');
    for (const image of data.images) {
        const imageBlob = dataURLtoBlob(image.imageData);
        const thumbnailBlob = dataURLtoBlob(image.thumbnailData);
        const originalBlob = dataURLtoBlob(image.originalImage);

        if (!imageBlob || !thumbnailBlob || !originalBlob) {
            console.warn("Skipping an image due to invalid base64 data.");
            continue;
        }
        
        const { id, imageData, thumbnailData, originalImage, ...imageDataWithoutBlobs } = image;

        const newRecord: Omit<ImageRecord, 'id'> = {
            ...imageDataWithoutBlobs,
            imageData: imageBlob,
            thumbnailData: thumbnailBlob,
            originalImage: originalBlob,
            userId, // Assign to current user
        };

        if (image.customerId && oldIdToNewIdMap.has(image.customerId)) {
            newRecord.customerId = oldIdToNewIdMap.get(image.customerId);
        }
        
        imageTx.store.add(newRecord as any);
    }
    await imageTx.done;
};