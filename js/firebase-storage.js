/**
 * Firebase Storage & Image Optimization Module
 * Handles:
 *  1. Firebase SDK initialization (Bucket: faifah-ttb.appspot.com)
 *  2. Resizing images to max dimension <= 350px before storage
 *  3. Uploading to Firebase Storage folder "Member" with format: Member/faifah_<empId>
 *  4. In-memory URL caching to prevent repetitive network requests
 */

(function (window) {
    'use strict';

    const FIREBASE_CONFIG = window.firebaseConfig || {
        apiKey: "AIzaSyAciknEYhZU7AwOdfYytC1t_AnW2Ee11us",
        authDomain: "faifah-ttb.firebaseapp.com",
        projectId: "faifah-ttb",
        storageBucket: "faifah-ttb.appspot.com",
        messagingSenderId: "842980876200",
        appId: "1:842980876200:web:f33bfad2ccbf263075079d"
    };

    window.firebaseConfig = FIREBASE_CONFIG;

    // In-memory cache for photo download URLs to prevent continuous network requests
    const photoUrlCache = new Map();
    let isInitialized = false;

    // IndexedDB Fallback Storage for images to completely avoid localStorage QuotaExceededError
    const IDB_NAME = 'crsdg_photo_storage';
    const IDB_STORE = 'photos';
    let idbPromise = null;

    function getIndexedDB() {
        if (!idbPromise) {
            idbPromise = new Promise((resolve) => {
                if (typeof window === 'undefined' || !window.indexedDB) {
                    return resolve(null);
                }
                const req = indexedDB.open(IDB_NAME, 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(IDB_STORE)) {
                        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
        }
        return idbPromise;
    }

    async function savePhotoToIndexedDB(empId, dataUrl) {
        if (!empId || !dataUrl) return false;
        try {
            const db = await getIndexedDB();
            if (!db) return false;
            return new Promise((resolve) => {
                const tx = db.transaction([IDB_STORE], 'readwrite');
                const store = tx.objectStore(IDB_STORE);
                store.put({ id: String(empId).trim().toLowerCase(), dataUrl: dataUrl, updatedAt: Date.now() });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch (_) {
            return false;
        }
    }

    async function getPhotoFromIndexedDB(empId) {
        if (!empId) return null;
        try {
            const db = await getIndexedDB();
            if (!db) return null;
            return new Promise((resolve) => {
                const tx = db.transaction([IDB_STORE], 'readonly');
                const store = tx.objectStore(IDB_STORE);
                const req = store.get(String(empId).trim().toLowerCase());
                req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
                req.onerror = () => resolve(null);
            });
        } catch (_) {
            return null;
        }
    }

    async function deletePhotoFromIndexedDB(empId) {
        if (!empId) return false;
        try {
            const db = await getIndexedDB();
            if (!db) return false;
            return new Promise((resolve) => {
                const tx = db.transaction([IDB_STORE], 'readwrite');
                const store = tx.objectStore(IDB_STORE);
                store.delete(String(empId).trim().toLowerCase());
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch (_) {
            return false;
        }
    }

    async function ensureFirebaseAuth() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            try {
                const auth = firebase.auth();
                if (!auth.currentUser) {
                    await auth.signInAnonymously();
                    console.log('[FirebaseStorage] Authenticated anonymously successfully');
                }
                return true;
            } catch (authErr) {
                console.warn('[FirebaseStorage] Anonymous authentication note:', authErr.message);
                return false;
            }
        }
        return false;
    }

    function initFirebase() {
        if (isInitialized) return true;
        if (typeof firebase !== 'undefined') {
            try {
                if (!firebase.apps || !firebase.apps.length) {
                    firebase.initializeApp(FIREBASE_CONFIG);
                }
                isInitialized = true;
                // Attempt anonymous auth in background
                ensureFirebaseAuth().catch(() => {});
                return true;
            } catch (err) {
                console.warn('[FirebaseStorage] Initialization warning:', err);
                return false;
            }
        }
        return false;
    }

    /**
     * Resizes an image (file, dataUrl, canvas, or Image element) so that
     * neither width nor height exceeds maxDim (default 350px).
     * Maintains aspect ratio.
     *
     * @param {File|Blob|string|HTMLCanvasElement|HTMLImageElement} source
     * @param {number} maxDim default 350
     * @returns {Promise<{dataUrl: string, blob: Blob, width: number, height: number}>}
     */
    function resizeImageToMax350(source, maxDim = 350) {
        return new Promise((resolve, reject) => {
            if (!source) {
                return reject(new Error('No image source provided'));
            }

            // If source is already a canvas
            if (source instanceof HTMLCanvasElement) {
                processImageElement(source);
                return;
            }

            // If source is File or Blob
            if (source instanceof Blob || source instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => processImageElement(img);
                    img.onerror = (err) => reject(err);
                    img.src = e.target.result;
                };
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(source);
                return;
            }

            // If source is dataUrl or URL string
            if (typeof source === 'string') {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => processImageElement(img);
                img.onerror = (err) => reject(err);
                img.src = source;
                return;
            }

            // If source is HTMLImageElement
            if (source instanceof HTMLImageElement) {
                if (source.complete && source.naturalWidth > 0) {
                    processImageElement(source);
                } else {
                    source.onload = () => processImageElement(source);
                    source.onerror = (err) => reject(err);
                }
                return;
            }

            reject(new Error('Unsupported image source type'));

            function processImageElement(imgOrCanvas) {
                try {
                    const srcW = imgOrCanvas.naturalWidth || imgOrCanvas.width || maxDim;
                    const srcH = imgOrCanvas.naturalHeight || imgOrCanvas.height || maxDim;

                    let targetW = srcW;
                    let targetH = srcH;

                    // Calculate scale so max(w, h) <= maxDim
                    if (targetW > maxDim || targetH > maxDim) {
                        if (targetW >= targetH) {
                            targetH = Math.max(1, Math.round((targetH * maxDim) / targetW));
                            targetW = maxDim;
                        } else {
                            targetW = Math.max(1, Math.round((targetW * maxDim) / targetH));
                            targetH = maxDim;
                        }
                    }

                    const outCanvas = document.createElement('canvas');
                    outCanvas.width = targetW;
                    outCanvas.height = targetH;
                    const ctx = outCanvas.getContext('2d');

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(imgOrCanvas, 0, 0, targetW, targetH);

                    const dataUrl = outCanvas.toDataURL('image/jpeg', 0.88);

                    outCanvas.toBlob((blob) => {
                        resolve({
                            dataUrl: dataUrl,
                            blob: blob || new Blob([], { type: 'image/jpeg' }),
                            width: targetW,
                            height: targetH
                        });
                    }, 'image/jpeg', 0.88);
                } catch (e) {
                    reject(e);
                }
            }
        });
    }

    /**
     * Uploads member photo to Firebase Storage
     * Destination: Member/<empId> (File named strictly by Employee ID only, no prefix)
     * Image size strictly limited to max 350px x 350px before upload.
     *
     * @param {string} empId Employee ID
     * @param {File|Blob|string|HTMLCanvasElement} sourceImage
     * @returns {Promise<{success: boolean, downloadUrl: string, dataUrl: string, storagePath: string, fileName: string}>}
     */
    async function uploadMemberPhoto(empId, sourceImage) {
        initFirebase();

        if (!empId) {
            throw new Error('Employee ID is required for photo upload');
        }
        const cleanId = String(empId).trim();
        if (!cleanId || cleanId.toLowerCase() === 'null' || cleanId.toLowerCase() === 'undefined') {
            throw new Error('Invalid Employee ID: ' + empId);
        }

        // Strictly name the file by Employee ID only, without any prefix
        const fileName = cleanId;
        const storagePath = `Member/${fileName}`;

        // Step 1: Resize image to strictly not exceed 350px x 350px
        let resized;
        try {
            resized = await resizeImageToMax350(sourceImage, 350);
        } catch (resizeErr) {
            console.error('[FirebaseStorage] Resize error:', resizeErr);
            throw resizeErr;
        }

        const { dataUrl, blob } = resized;

        // Step 2: Upload to Firebase Storage
        if (typeof firebase !== 'undefined' && firebase.storage) {
            try {
                // Ensure auth if available
                await ensureFirebaseAuth();

                const storage = firebase.storage();
                const fileRef = storage.ref(storagePath);

                const metadata = {
                    contentType: 'image/jpeg',
                    customMetadata: {
                        employeeId: cleanId,
                        uploadedAt: new Date().toISOString()
                    }
                };

                const snapshot = await fileRef.put(blob, metadata);
                const downloadUrl = await snapshot.ref.getDownloadURL();

                // Cache the download URL
                photoUrlCache.set(cleanId.toLowerCase(), downloadUrl);
                // Also cache in IndexedDB
                savePhotoToIndexedDB(cleanId, downloadUrl).catch(() => {});

                return {
                    success: true,
                    downloadUrl: downloadUrl,
                    dataUrl: dataUrl,
                    storagePath: storagePath,
                    fileName: fileName
                };
            } catch (fbErr) {
                console.warn('[FirebaseStorage] Upload to Firebase Storage failed (' + fbErr.code + ': ' + fbErr.message + '), saving to IndexedDB fallback.');
                // Save full image into IndexedDB so localStorage never overflows
                await savePhotoToIndexedDB(cleanId, dataUrl);
                photoUrlCache.set(cleanId.toLowerCase(), dataUrl);
                return {
                    success: false,
                    downloadUrl: dataUrl, // Local fallback
                    dataUrl: dataUrl,
                    storagePath: storagePath,
                    fileName: fileName,
                    isIndexedDB: true,
                    error: fbErr.message
                };
            }
        } else {
            console.warn('[FirebaseStorage] Firebase SDK not loaded, saving to IndexedDB.');
            await savePhotoToIndexedDB(cleanId, dataUrl);
            photoUrlCache.set(cleanId.toLowerCase(), dataUrl);
            return {
                success: false,
                downloadUrl: dataUrl,
                dataUrl: dataUrl,
                storagePath: storagePath,
                fileName: fileName,
                isIndexedDB: true,
                error: 'Firebase SDK not loaded'
            };
        }
    }

    /**
     * Retrieves member photo URL strictly from the designated Firebase Storage location (Member/<empId>).
     * Prevents continuous requests to Google Cloud APIs via caching.
     *
     * @param {string} empId Employee ID
     * @returns {Promise<string|null>}
     */
    async function getMemberPhotoUrl(empId) {
        if (!empId) return null;
        const cleanId = String(empId).trim();
        const cacheKey = cleanId.toLowerCase();

        // 1. Check in-memory cache first
        if (photoUrlCache.has(cacheKey)) {
            const cached = photoUrlCache.get(cacheKey);
            if (cached) return cached;
        }

        initFirebase();

        // 2. Fetch directly from the designated Firebase Storage path: Member/<empId>
        if (typeof firebase !== 'undefined' && firebase.storage) {
            const storage = firebase.storage();
            try {
                // Strictly designated location: Member/<empId> (without prefix)
                const fileRef = storage.ref(`Member/${cleanId}`);
                const url = await fileRef.getDownloadURL();
                photoUrlCache.set(cacheKey, url);
                savePhotoToIndexedDB(cleanId, url).catch(() => {});
                return url;
            } catch (err) {
                // Backward-compatibility check: Member/faifah_<empId> for previously uploaded images
                try {
                    const legacyRef = storage.ref(`Member/faifah_${cleanId}`);
                    const legacyUrl = await legacyRef.getDownloadURL();
                    photoUrlCache.set(cacheKey, legacyUrl);
                    savePhotoToIndexedDB(cleanId, legacyUrl).catch(() => {});
                    return legacyUrl;
                } catch (_) {}
            }
        }

        // 3. Fallback to local IndexedDB
        const idbPhoto = await getPhotoFromIndexedDB(cleanId);
        if (idbPhoto) {
            photoUrlCache.set(cacheKey, idbPhoto);
            return idbPhoto;
        }

        photoUrlCache.set(cacheKey, null);
        return null;
    }

    /**
     * Deletes a member photo from Firebase Storage (Member/<empId>) and IndexedDB.
     *
     * @param {string} empIdOrFileName Employee ID or full filename
     * @returns {Promise<boolean>}
     */
    async function deleteMemberPhoto(empIdOrFileName) {
        if (!empIdOrFileName) return false;
        initFirebase();

        let cleanId = String(empIdOrFileName).trim();
        if (cleanId.startsWith('faifah_')) {
            cleanId = cleanId.replace('faifah_', '');
        }

        // Remove from IndexedDB & Cache
        await deletePhotoFromIndexedDB(cleanId);
        photoUrlCache.delete(cleanId.toLowerCase());

        // Remove from Firebase Storage
        if (typeof firebase !== 'undefined' && firebase.storage) {
            const storage = firebase.storage();
            // Delete designated file Member/<empId>
            try {
                const fileRef = storage.ref(`Member/${cleanId}`);
                await fileRef.delete();
                console.log(`[FirebaseStorage] Deleted Member/${cleanId} successfully`);
            } catch (_) {}

            // Also cleanup legacy Member/faifah_<empId> if present
            try {
                const legacyRef = storage.ref(`Member/faifah_${cleanId}`);
                await legacyRef.delete();
            } catch (_) {}

            return true;
        }
        return true;
    }

    // Expose module to window
    window.FirebaseStorageManager = {
        init: initFirebase,
        resizeImageToMax350: resizeImageToMax350,
        uploadMemberPhoto: uploadMemberPhoto,
        getMemberPhotoUrl: getMemberPhotoUrl,
        deleteMemberPhoto: deleteMemberPhoto,
        cache: photoUrlCache
    };

    // Auto-init on script load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFirebase);
    } else {
        initFirebase();
    }

})(window);
