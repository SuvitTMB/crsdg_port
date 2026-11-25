/**
 * CRS DG New Year 2027 - Firebase Cloud Firestore Synchronization Module
 *
 * STRICT POLICIES:
 * 1. Sole collection for employee / member data is "crsdg_member".
 * 2. Absolutely NO syncing or fetching from "AL_Employee" (ยกเลิกการซิงค์ข้อมูลมาจากตาราง AL_Employee).
 * 3. On Excel file upload:
 *    - All records are saved directly to Firestore table "crsdg_member".
 *    - Status field "registered" / "registeredAt" is set to null.
 *    - Team vote field "chosenTeam" / "vote" is set to null.
 *    - Random prize result field "prize" / "wonPrize" is set to null.
 * 4. ALL Application Data Tables are connected to Firebase Cloud Firestore:
 *    - crsdg_member (พนักงาน / สมาชิก)
 *    - crsdg_nameteam (รายชื่อทีมหลัก 4 ต่อ 4)
 *    - crsdg_team (สมาชิกในทีมและกัปตันทีม 4 ต่อ 4)
 *    - crsdg_player (ทีมแข่งขัน AI Pitching / การลงทุน)
 *    - crsdg_quiz (ข้อคำถามและคะแนนเกม)
 *    - crsdg_evaluations (แบบประเมินผลความพึงพอใจ)
 *    - crsdg_vote (สถานะและงบประมาณการโหวต)
 * 5. Dual Engine Architecture:
 *    - Primary Engine: Direct Cloud Firestore REST API (Fast, CORS-enabled, runs on any protocol/file://, 100% reliable)
 *    - Secondary Engine: Firebase Web SDK 8 (Real-time onSnapshot listeners and live updates)
 *
 * Project: faifah-ttb | Database: (default)
 */

(function (window) {
    'use strict';

    // กรอง log แจ้งเตือน harmless multi-tab lease sub-millisecond future timestamp warning ของ Firestore SDK 8.10.1 ไม่ให้รกหน้า DevTools
    if (typeof window !== 'undefined' && !window.__firestoreLogFilterInstalled) {
        window.__firestoreLogFilterInstalled = true;
        const filterKeyword = 'Detected an update time that is in the future';
        const origWarn = console.warn;
        const origErr = console.error;
        console.warn = function (...args) {
            if (args.length > 0 && typeof args[0] === 'string' && args[0].includes(filterKeyword)) return;
            origWarn.apply(console, args);
        };
        console.error = function (...args) {
            if (args.length > 0 && typeof args[0] === 'string' && args[0].includes(filterKeyword)) return;
            origErr.apply(console, args);
        };
    }

    const PROJECT_ID = "faifah-ttb";
    const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
    const FIRESTORE_COMMIT_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

    const FIREBASE_CONFIG = window.firebaseConfig || {
        apiKey: "AIzaSyAciknEYhZU7AwOdfYytC1t_AnW2Ee11us",
        authDomain: "faifah-ttb.firebaseapp.com",
        projectId: "faifah-ttb",
        storageBucket: "faifah-ttb.appspot.com",
        messagingSenderId: "842980876200",
        appId: "1:842980876200:web:f33bfad2ccbf263075079d"
    };

    window.firebaseConfig = FIREBASE_CONFIG;

    let db = null;
    let auth = null;
    let isInitialized = false;
    let isOnline = true;
    let isBatchWriting = false;
    const listeners = new Set();

    // STRICT COLLECTION DEFINITIONS
    const COLS = {
        MEMBERS: 'crsdg_member',
        NAMETEAM: 'crsdg_nameteam',
        TEAM: 'crsdg_team',
        PLAYER: 'crsdg_player',
        QUIZ: 'crsdg_quiz',
        EVALUATIONS: 'crsdg_evaluations',
        VOTE: 'crsdg_vote',
        INVESTMENTS: 'crsdg_investments',
        PRIZES: 'crsdg_reward', // Table crsdg_reward
        WINNERS: 'crsdg_winners'
    };

    /**
     * Notify internal listeners
     */
    function notify(type, data) {
        listeners.forEach(fn => {
            try { fn({ type, data }); } catch (e) { console.warn('[FirebaseSync] Listener error:', e); }
        });
    }

    // ========================================================
    // UNIVERSAL FIRESTORE SERIALIZERS & DESERIALIZERS
    // ========================================================

    /**
     * Convert any JS object to Firestore typed fields
     */
    function objToFirestoreFields(obj) {
        if (!obj || typeof obj !== 'object') return {};
        const fields = {};
        for (const k in obj) {
            const v = obj[k];
            if (v === null || v === undefined) {
                fields[k] = { nullValue: null };
            } else if (typeof v === 'boolean') {
                fields[k] = { booleanValue: v };
            } else if (typeof v === 'number') {
                if (Number.isInteger(v)) {
                    fields[k] = { integerValue: String(v) };
                } else {
                    fields[k] = { doubleValue: v };
                }
            } else if (typeof v === 'string') {
                fields[k] = { stringValue: v };
            } else if (Array.isArray(v)) {
                fields[k] = {
                    arrayValue: {
                        values: v.map(item => {
                            if (item === null || item === undefined) return { nullValue: null };
                            if (typeof item === 'boolean') return { booleanValue: item };
                            if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
                            if (typeof item === 'string') return { stringValue: item };
                            if (typeof item === 'object') return { mapValue: { fields: objToFirestoreFields(item) } };
                            return { stringValue: String(item) };
                        })
                    }
                };
            } else if (typeof v === 'object') {
                fields[k] = { mapValue: { fields: objToFirestoreFields(v) } };
            }
        }
        return fields;
    }

    /**
     * Convert any Firestore document to a plain JS Object
     */
    function firestoreDocToObj(doc) {
        if (!doc || !doc.fields) return null;
        const res = {};
        for (const k in doc.fields) {
            const val = doc.fields[k];
            if (val.stringValue !== undefined) res[k] = val.stringValue;
            else if (val.integerValue !== undefined) res[k] = parseInt(val.integerValue, 10);
            else if (val.doubleValue !== undefined) res[k] = parseFloat(val.doubleValue);
            else if (val.booleanValue !== undefined) res[k] = val.booleanValue;
            else if (val.nullValue !== undefined) res[k] = null;
            else if (val.arrayValue !== undefined) {
                res[k] = (val.arrayValue.values || []).map(v => {
                    if (v.stringValue !== undefined) return v.stringValue;
                    if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
                    if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
                    if (v.booleanValue !== undefined) return v.booleanValue;
                    if (v.nullValue !== undefined) return null;
                    if (v.mapValue !== undefined) {
                        const sub = {};
                        for (const sk in v.mapValue.fields) {
                            const sv = v.mapValue.fields[sk];
                            if (sv.stringValue !== undefined) sub[sk] = sv.stringValue;
                            else if (sv.integerValue !== undefined) sub[sk] = parseInt(sv.integerValue, 10);
                            else if (sv.doubleValue !== undefined) sub[sk] = parseFloat(sv.doubleValue);
                            else if (sv.booleanValue !== undefined) sub[sk] = sv.booleanValue;
                            else if (sv.nullValue !== undefined) sub[sk] = null;
                        }
                        return sub;
                    }
                    return null;
                });
            } else if (val.mapValue !== undefined) {
                const sub = {};
                for (const sk in val.mapValue.fields) {
                    const sv = val.mapValue.fields[sk];
                    if (sv.stringValue !== undefined) sub[sk] = sv.stringValue;
                    else if (sv.integerValue !== undefined) sub[sk] = parseInt(sv.integerValue, 10);
                    else if (sv.doubleValue !== undefined) sub[sk] = parseFloat(sv.doubleValue);
                    else if (sv.booleanValue !== undefined) sub[sk] = sv.booleanValue;
                    else if (sv.nullValue !== undefined) sub[sk] = null;
                }
                res[k] = sub;
            }
        }
        if (!res.id && doc.name) res.id = doc.name.split('/').pop();
        return res;
    }

    /**
     * Retrieve all raw Firestore document objects for a collection across all pages
     */
    async function fetchAllRawDocuments(collectionName) {
        const docs = [];
        let pageToken = '';
        do {
            const url = `${FIRESTORE_BASE_URL}/${collectionName}?pageSize=300${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (data.documents && Array.isArray(data.documents)) {
                docs.push(...data.documents);
            }
            pageToken = data.nextPageToken || '';
        } while (pageToken);
        return docs;
    }

    /**
     * Commit batched writes in chunks of 300
     */
    async function commitBatchedWrites(writes) {
        if (!writes || writes.length === 0) return true;
        const batchSize = 300;
        for (let i = 0; i < writes.length; i += batchSize) {
            const chunk = writes.slice(i, i + batchSize);
            const res = await fetch(FIRESTORE_COMMIT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ writes: chunk })
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Firestore commit HTTP ${res.status}: ${errText.substring(0, 200)}`);
            }
        }
        return true;
    }

    /**
     * Universal document save/patch
     */
    async function saveDocument(collectionName, docId, data) {
        if (!collectionName || !docId) return false;
        const cleanId = String(docId).trim();

        // 1. Prefer Firebase Web SDK if initialized (handles auth, cache & online sync)
        if (db) {
            try {
                await db.collection(collectionName).doc(cleanId).set(data, { merge: true });
                return true;
            } catch (sdkErr) {
                console.warn(`[FirebaseSync] SDK save to ${collectionName}/${cleanId} fallback to REST:`, sdkErr.message);
            }
        }

        // 2. Direct REST API with optional Auth token
        try {
            const encId = encodeURIComponent(cleanId);
            const fields = objToFirestoreFields(data);
            fields.updatedAt = { stringValue: new Date().toISOString() };
            const fieldMasks = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
            const url = `${FIRESTORE_BASE_URL}/${collectionName}/${encId}?${fieldMasks}`;
            const headers = { 'Content-Type': 'application/json' };
            if (auth && auth.currentUser) {
                try {
                    const token = await auth.currentUser.getIdToken();
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                } catch (e) {}
            }
            const res = await fetch(url, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({ fields })
            });
            return res.ok;
        } catch (err) {
            console.error(`[FirebaseSync] Failed to save doc in ${collectionName}:`, err);
            return false;
        }
    }

    /**
     * Universal document delete
     */
    async function deleteDocument(collectionName, docId) {
        if (!collectionName || !docId) return false;
        const cleanId = String(docId).trim();

        // 1. Prefer Firebase Web SDK if initialized
        if (db) {
            try {
                await db.collection(collectionName).doc(cleanId).delete();
                return true;
            } catch (sdkErr) {
                console.warn(`[FirebaseSync] SDK delete from ${collectionName}/${cleanId} fallback to REST:`, sdkErr.message);
            }
        }

        // 2. Direct REST API
        try {
            const encId = encodeURIComponent(cleanId);
            const url = `${FIRESTORE_BASE_URL}/${collectionName}/${encId}`;
            const headers = {};
            if (auth && auth.currentUser) {
                try {
                    const token = await auth.currentUser.getIdToken();
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                } catch (e) {}
            }
            const res = await fetch(url, { method: 'DELETE', headers: headers });
            return res.ok;
        } catch (err) {
            console.error(`[FirebaseSync] Failed to delete doc in ${collectionName}:`, err);
            return false;
        }
    }

    // ========================================================
    // TABLE 1: crsdg_member (MEMBERS / EMPLOYEES)
    // ========================================================

    function parseFirestoreMemberDoc(doc) {
        if (!doc) return null;
        const f = doc.fields || {};
        const id = f.EmployeeID ? f.EmployeeID.stringValue : (f.id ? f.id.stringValue : doc.name.split('/').pop());
        const name = f.EmpName ? f.EmpName.stringValue : (f.name ? f.name.stringValue : '');
        const group = f.Group ? f.Group.stringValue : (f.department ? f.department.stringValue : 'Team A');

        const isReg = (f.registered && f.registered.booleanValue === true) || (f.isRegistered && f.isRegistered.booleanValue === true) ? true : null;
        const regAt = (isReg && f.registeredAt && f.registeredAt.stringValue) ? f.registeredAt.stringValue : null;
        const chosen = (f.chosenTeam && f.chosenTeam.stringValue) ? f.chosenTeam.stringValue.trim() : null;
        const photo = (f.photo && f.photo.stringValue) ? f.photo.stringValue : '';
        const prize = (f.prize && f.prize.stringValue) ? f.prize.stringValue : null;
        const memberVal = (f.Member && f.Member.stringValue) ? f.Member.stringValue : ((f.member && f.member.stringValue) ? f.member.stringValue : '');
        const memberStatus = (String(memberVal).trim().toLowerCase() === 'member' || String(memberVal).trim().toLowerCase() === 'mamber' || (memberVal && String(memberVal).trim() !== '-' && String(memberVal).trim() !== '0')) ? 'Member' : '';

        return {
            id: id,
            EmployeeID: id,
            EmpName: name,
            Group: group,
            Member: memberStatus,
            member: memberStatus,
            name: name,
            department: group,
            photo: photo,
            registered: isReg,
            isRegistered: isReg,
            registeredAt: regAt,
            chosenTeam: chosen,
            vote: (f.vote && f.vote.stringValue) ? f.vote.stringValue.trim() : null,
            prize: prize,
            wonPrize: (f.wonPrize && f.wonPrize.stringValue) ? f.wonPrize.stringValue : null,
            prizeTitle: (f.prizeTitle && f.prizeTitle.stringValue) ? f.prizeTitle.stringValue : null,
            hasWon: (f.hasWon && f.hasWon.booleanValue === true) ? true : null,
            ticketCode: (f.ticketCode && f.ticketCode.stringValue) ? f.ticketCode.stringValue : ''
        };
    }

    async function fetchMembersFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching latest members from Cloud Firestore collection "crsdg_member"...');
            const docs = await fetchAllRawDocuments(COLS.MEMBERS);
            const allMembers = [];
            docs.forEach(doc => {
                const m = parseFirestoreMemberDoc(doc);
                if (m && m.EmployeeID && m.EmpName) {
                    allMembers.push(m);
                }
            });

            console.log(`[FirebaseSync] Fetched ${allMembers.length} valid members from crsdg_member in Firebase.`);

            if (allMembers.length > 0) {
                if (window.state && typeof window.state.applyCloudMembers === 'function') {
                    window.state.applyCloudMembers(allMembers);
                }
                notify('MEMBERS_UPDATED', allMembers);
            }

            return allMembers;
        } catch (err) {
            console.warn('[FirebaseSync] fetchMembersFromCloud warning:', err.message);
            return [];
        }
    }

    async function importMembersToCloud(membersList, mode = 'append') {
        if (!Array.isArray(membersList) || membersList.length === 0) {
            return { success: false, message: 'ไม่มีข้อมูลพนักงานให้นำเข้า' };
        }

        isBatchWriting = true;

        try {
            console.log(`[FirebaseSync] Saving ${membersList.length} members to Cloud Firestore "crsdg_member" via REST Commit...`);

            const writes = [];

            if (mode === 'replace') {
                console.log('[FirebaseSync] Mode replace: querying existing documents in crsdg_member to delete...');
                try {
                    const existingDocs = await fetchAllRawDocuments(COLS.MEMBERS);
                    existingDocs.forEach(doc => {
                        writes.push({ delete: doc.name });
                    });
                } catch (delErr) {
                    console.warn('[FirebaseSync] Error querying old documents for replace:', delErr);
                }
            }

            membersList.forEach(m => {
                const empId = String(m.EmployeeID || m.id || '').trim();
                const empName = String(m.EmpName || m.name || '').trim();
                const group = String(m.Group || m.group || m.department || 'Team A').trim();
                const rawMem = (m.Member !== undefined && m.Member !== null) ? String(m.Member).trim() : ((m.member !== undefined && m.member !== null) ? String(m.member).trim() : '');
                const memberStatus = (rawMem.toLowerCase() === 'member' || rawMem.toLowerCase() === 'mamber' || (rawMem && rawMem !== '-' && rawMem !== '0')) ? 'Member' : '';

                if (empId && empName) {
                    writes.push({
                        update: {
                            name: `projects/${PROJECT_ID}/databases/(default)/documents/${COLS.MEMBERS}/${empId}`,
                            fields: {
                                EmployeeID: { stringValue: empId },
                                EmpName: { stringValue: empName },
                                Group: { stringValue: group },
                                Member: { stringValue: memberStatus },
                                member: { stringValue: memberStatus },
                                id: { stringValue: empId },
                                name: { stringValue: empName },
                                department: { stringValue: group },
                                photo: { stringValue: m.photo || '' },
                                registered: { nullValue: null },
                                isRegistered: { nullValue: null },
                                registeredAt: { nullValue: null },
                                chosenTeam: { nullValue: null },
                                vote: { nullValue: null },
                                prize: { nullValue: null },
                                wonPrize: { nullValue: null },
                                prizeTitle: { nullValue: null },
                                hasWon: { nullValue: null },
                                ticketCode: { stringValue: '' },
                                updatedAt: { stringValue: new Date().toISOString() }
                            }
                        }
                    });
                }
            });

            await commitBatchedWrites(writes);

            console.log(`[FirebaseSync] Successfully committed ${membersList.length} members to Firestore crsdg_member.`);
            return { success: true, count: membersList.length };
        } catch (err) {
            console.error('[FirebaseSync] Failed to save Excel members into crsdg_member:', err);
            return { success: false, error: err.message };
        } finally {
            isBatchWriting = false;
        }
    }

    async function saveMember(memberData) {
        if (!memberData) return false;
        const empId = String(memberData.EmployeeID || memberData.id || '').trim();
        const empName = String(memberData.EmpName || memberData.name || '').trim();
        const group = String(memberData.Group || memberData.department || 'Team A').trim();
        if (!empId || !empName) return false;

        const isReg = (memberData.registered === true || memberData.isRegistered === true);
        const chosen = (memberData.chosenTeam && String(memberData.chosenTeam).trim()) ? String(memberData.chosenTeam).trim() : null;
        const rawMem = (memberData.Member !== undefined && memberData.Member !== null) ? String(memberData.Member).trim() : ((memberData.member !== undefined && memberData.member !== null) ? String(memberData.member).trim() : '');
        const memberStatus = (rawMem.toLowerCase() === 'member' || rawMem.toLowerCase() === 'mamber' || (rawMem && rawMem !== '-' && rawMem !== '0')) ? 'Member' : '';

        if (db) {
            try {
                await db.collection(COLS.MEMBERS).doc(empId).set({
                    ...memberData,
                    EmployeeID: empId,
                    EmpName: empName,
                    Group: group,
                    Member: memberStatus,
                    member: memberStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                return true;
            } catch (sdkErr) {
                console.warn('[FirebaseSync] SDK saveMember fallback to REST:', sdkErr.message);
            }
        }

        const fields = {
            EmployeeID: { stringValue: empId },
            EmpName: { stringValue: empName },
            Group: { stringValue: group },
            Member: { stringValue: memberStatus },
            member: { stringValue: memberStatus },
            id: { stringValue: empId },
            name: { stringValue: empName },
            department: { stringValue: group },
            photo: { stringValue: memberData.photo || '' },
            registered: isReg ? { booleanValue: true } : { nullValue: null },
            isRegistered: isReg ? { booleanValue: true } : { nullValue: null },
            registeredAt: isReg ? { stringValue: memberData.registeredAt || new Date().toISOString() } : { nullValue: null },
            chosenTeam: chosen ? { stringValue: chosen } : { nullValue: null },
            vote: chosen ? { stringValue: chosen } : { nullValue: null },
            prize: memberData.prize ? { stringValue: memberData.prize } : { nullValue: null },
            wonPrize: memberData.wonPrize ? { stringValue: memberData.wonPrize } : { nullValue: null },
            prizeTitle: memberData.prizeTitle ? { stringValue: memberData.prizeTitle } : { nullValue: null },
            hasWon: memberData.hasWon ? { booleanValue: true } : { nullValue: null },
            updatedAt: { stringValue: new Date().toISOString() }
        };

        try {
            const url = `${FIRESTORE_BASE_URL}/${COLS.MEMBERS}/${encodeURIComponent(empId)}`;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields })
            });
            return res.ok;
        } catch (err) {
            console.error('[FirebaseSync] Failed to save member:', err);
            return false;
        }
    }

    async function deleteMember(empId) {
        return deleteDocument(COLS.MEMBERS, empId);
    }

    async function clearAllMembersFromCloud() {
        isBatchWriting = true;
        try {
            console.log('[FirebaseSync] Clearing all documents from crsdg_member...');
            const docs = await fetchAllRawDocuments(COLS.MEMBERS);
            if (!docs || !docs.length) return true;

            const writes = docs.map(d => ({ delete: d.name }));
            await commitBatchedWrites(writes);
            console.log(`[FirebaseSync] Successfully deleted ${docs.length} documents from crsdg_member`);
            return true;
        } catch (err) {
            console.error('[FirebaseSync] Failed to clear crsdg_member:', err);
            return false;
        } finally {
            isBatchWriting = false;
        }
    }

    async function resetAllMembersRegistrationInCloud() {
        isBatchWriting = true;
        try {
            console.log('[FirebaseSync] Resetting all members in crsdg_member to null...');
            if (db) {
                const snapshot = await db.collection(COLS.MEMBERS).get();
                if (!snapshot.empty) {
                    const batch = db.batch();
                    snapshot.forEach(doc => {
                        batch.update(doc.ref, {
                            registered: null,
                            isRegistered: null,
                            registeredAt: null,
                            chosenTeam: null,
                            vote: null,
                            prize: null,
                            wonPrize: null,
                            prizeTitle: null,
                            hasWon: null,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    await batch.commit();
                    console.log(`[FirebaseSync] SDK successfully reset status fields of ${snapshot.size} members to null in crsdg_member`);
                }
                return true;
            }

            const docs = await fetchAllRawDocuments(COLS.MEMBERS);
            if (!docs || !docs.length) return true;

            const updateWrites = docs.map(doc => {
                const f = doc.fields || {};
                return {
                    update: {
                        name: doc.name,
                        fields: {
                            ...f,
                            registered: { nullValue: null },
                            isRegistered: { nullValue: null },
                            registeredAt: { nullValue: null },
                            chosenTeam: { nullValue: null },
                            vote: { nullValue: null },
                            prize: { nullValue: null },
                            wonPrize: { nullValue: null },
                            prizeTitle: { nullValue: null },
                            hasWon: { nullValue: null },
                            updatedAt: { stringValue: new Date().toISOString() }
                        }
                    }
                };
            });

            await commitBatchedWrites(updateWrites);
            console.log(`[FirebaseSync] Successfully reset status fields of ${docs.length} members to null in crsdg_member`);
            return true;
        } catch (err) {
            console.error('[FirebaseSync] Failed to reset registrations in cloud:', err);
            return false;
        } finally {
            isBatchWriting = false;
        }
    }

    async function resetAllMemberVotesInCloud() {
        isBatchWriting = true;
        try {
            console.log('[FirebaseSync] Resetting all member chosenTeam/vote in crsdg_member to null...');
            if (db) {
                const snapshot = await db.collection(COLS.MEMBERS).get();
                if (!snapshot.empty) {
                    const batch = db.batch();
                    let count = 0;
                    snapshot.forEach(doc => {
                        const d = doc.data() || {};
                        if (d.chosenTeam || d.vote) {
                            batch.update(doc.ref, {
                                chosenTeam: null,
                                vote: null,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            count++;
                        }
                    });
                    if (count > 0) {
                        await batch.commit();
                        console.log(`[FirebaseSync] SDK successfully reset votes of ${count} members in crsdg_member`);
                    }
                }
                try {
                    await db.collection('crsdg_vote').doc('settings').set({
                        reset_game_votes_timestamp: Date.now(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                } catch (_) {}
                return true;
            }

            const docs = await fetchAllRawDocuments(COLS.MEMBERS);
            if (!docs || !docs.length) return true;

            const votedDocs = docs.filter(d => {
                const f = d.fields || {};
                return (f.chosenTeam && f.chosenTeam.stringValue) || (f.vote && f.vote.stringValue);
            });

            if (!votedDocs.length) return true;

            const updateWrites = votedDocs.map(doc => {
                const f = doc.fields || {};
                return {
                    update: {
                        name: doc.name,
                        fields: {
                            ...f,
                            chosenTeam: { nullValue: null },
                            vote: { nullValue: null },
                            updatedAt: { stringValue: new Date().toISOString() }
                        }
                    }
                };
            });

            await commitBatchedWrites(updateWrites);
            console.log(`[FirebaseSync] Successfully reset votes of ${votedDocs.length} members in crsdg_member`);
            return true;
        } catch (err) {
            console.error('[FirebaseSync] Failed to reset member votes in cloud:', err);
            return false;
        } finally {
            isBatchWriting = false;
        }
    }

    async function resetAllMemberWinnerStatusesInCloud() {
        isBatchWriting = true;
        try {
            console.log('[FirebaseSync] Resetting winner status fields of members in crsdg_member...');
            if (db) {
                const snapshot = await db.collection(COLS.MEMBERS).get();
                if (!snapshot.empty) {
                    const batch = db.batch();
                    let count = 0;
                    snapshot.forEach(doc => {
                        const d = doc.data() || {};
                        if (d.hasWon || d.wonPrize || d.prizeTitle || d.prizeResult || d.prizeGroup || d.wonAt || d.drawCanceled || d.prize) {
                            batch.update(doc.ref, {
                                hasWon: null,
                                wonPrize: null,
                                prize: null,
                                prizeTitle: null,
                                prizeResult: null,
                                prizeGroup: null,
                                wonAt: null,
                                drawCanceled: null,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            count++;
                        }
                    });
                    if (count > 0) {
                        await batch.commit();
                        console.log(`[FirebaseSync] SDK successfully reset winner status for ${count} members in crsdg_member`);
                    }
                }
                return true;
            } else {
                const docs = await fetchAllRawDocuments(COLS.MEMBERS);
                if (!docs || !docs.length) return true;
                const updateWrites = [];
                docs.forEach(doc => {
                    const f = doc.fields || {};
                    const hasWinnerData = f.hasWon || f.wonPrize || f.prize || f.prizeTitle || f.prizeResult || f.wonAt || f.drawCanceled;
                    if (hasWinnerData) {
                        updateWrites.push({
                            update: {
                                name: doc.name,
                                fields: {
                                    ...f,
                                    hasWon: { nullValue: null },
                                    wonPrize: { nullValue: null },
                                    prize: { nullValue: null },
                                    prizeTitle: { nullValue: null },
                                    prizeResult: { nullValue: null },
                                    prizeGroup: { nullValue: null },
                                    wonAt: { nullValue: null },
                                    drawCanceled: { nullValue: null },
                                    updatedAt: { stringValue: new Date().toISOString() }
                                }
                            }
                        });
                    }
                });
                if (updateWrites.length > 0) {
                    await commitBatchedWrites(updateWrites);
                }
                return true;
            }
        } catch (err) {
            console.error('[FirebaseSync] Failed to reset winner status on members:', err);
            return false;
        } finally {
            isBatchWriting = false;
        }
    }

    async function updateMemberRegistration(empId, regData) {
        if (!empId) return false;
        const cleanId = String(empId).trim();
        const nowIso = new Date().toISOString();

        const patchFields = {
            registered: { booleanValue: true },
            isRegistered: { booleanValue: true },
            registeredAt: { stringValue: nowIso },
            updatedAt: { stringValue: nowIso }
        };
        if (regData.photo) patchFields.photo = { stringValue: regData.photo };
        if (regData.chosenTeam) {
            patchFields.chosenTeam = { stringValue: regData.chosenTeam };
            patchFields.vote = { stringValue: regData.chosenTeam };
        }

        let updateMaskParams = 'updateMask.fieldPaths=registered&updateMask.fieldPaths=isRegistered&updateMask.fieldPaths=registeredAt&updateMask.fieldPaths=updatedAt';
        if (regData.photo) updateMaskParams += '&updateMask.fieldPaths=photo';
        if (regData.chosenTeam) updateMaskParams += '&updateMask.fieldPaths=chosenTeam&updateMask.fieldPaths=vote';

        try {
            const url = `${FIRESTORE_BASE_URL}/${COLS.MEMBERS}/${cleanId}?${updateMaskParams}`;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: patchFields })
            });
            return res.ok;
        } catch (err) {
            console.error('[FirebaseSync] Failed to update member registration:', err);
            return false;
        }
    }

    // ========================================================
    // TABLE 2: crsdg_nameteam (4v4 TEAM NAMES)
    // ========================================================

    async function fetchTeamNamesFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching team names from crsdg_nameteam...');
            const docs = await fetchAllRawDocuments(COLS.NAMETEAM);
            const list = docs.map(d => firestoreDocToObj(d)).filter(Boolean);
            if (list.length > 0) {
                if (window.state && typeof window.state.applyCloudTeamNames === 'function') {
                    window.state.applyCloudTeamNames(list);
                }
                notify('TEAMS_UPDATED', list);
            }
            return list;
        } catch (err) {
            console.warn('[FirebaseSync] fetchTeamNamesFromCloud warning:', err.message);
            return [];
        }
    }

    async function saveTeamName(team) {
        if (!team || !team.id) return false;
        return saveDocument(COLS.NAMETEAM, team.id, {
            id: team.id,
            name: team.name || '',
            department: team.department || '',
            color: team.color || '#3b82f6',
            status: team.status || 'online'
        });
    }

    async function deleteTeamName(teamId) {
        return deleteDocument(COLS.NAMETEAM, teamId);
    }

    async function syncAllTeamNames(namesList) {
        if (!Array.isArray(namesList)) return false;
        try {
            const writes = namesList.map(t => ({
                update: {
                    name: `projects/${PROJECT_ID}/databases/(default)/documents/${COLS.NAMETEAM}/${t.id}`,
                    fields: objToFirestoreFields({
                        id: t.id,
                        name: t.name || '',
                        department: t.department || '',
                        color: t.color || '#3b82f6',
                        status: t.status || 'online',
                        updatedAt: new Date().toISOString()
                    })
                }
            }));
            return await commitBatchedWrites(writes);
        } catch (err) {
            console.error('[FirebaseSync] Failed to sync team names:', err);
            return false;
        }
    }

    // ========================================================
    // TABLE 3: crsdg_team (4v4 TEAM ROSTERS)
    // ========================================================

    async function fetchTeamsFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching team rosters from crsdg_team...');
            const docs = await fetchAllRawDocuments(COLS.TEAM);
            const list = docs.map(d => firestoreDocToObj(d)).filter(Boolean);
            if (list.length > 0) {
                if (window.state && typeof window.state.applyCloudTeamsTable === 'function') {
                    window.state.applyCloudTeamsTable(list);
                }
                notify('TEAMS_UPDATED', list);
            }
            return list;
        } catch (err) {
            console.warn('[FirebaseSync] fetchTeamsFromCloud warning:', err.message);
            return [];
        }
    }

    async function saveTeamRoster(roster) {
        const teamId = roster.teamId || roster.id;
        if (!teamId) return false;
        return saveDocument(COLS.TEAM, teamId, {
            teamId: teamId,
            captainId: roster.captainId || '',
            memberIds: Array.isArray(roster.memberIds) ? roster.memberIds : []
        });
    }

    async function deleteTeamRoster(teamId) {
        return deleteDocument(COLS.TEAM, teamId);
    }

    async function syncAllTeamRosters(rostersList) {
        if (!Array.isArray(rostersList)) return false;
        try {
            const writes = rostersList.map(r => {
                const teamId = r.teamId || r.id;
                return {
                    update: {
                        name: `projects/${PROJECT_ID}/databases/(default)/documents/${COLS.TEAM}/${teamId}`,
                        fields: objToFirestoreFields({
                            teamId: teamId,
                            captainId: r.captainId || '',
                            memberIds: Array.isArray(r.memberIds) ? r.memberIds : [],
                            updatedAt: new Date().toISOString()
                        })
                    }
                };
            });
            return await commitBatchedWrites(writes);
        } catch (err) {
            console.error('[FirebaseSync] Failed to sync team rosters:', err);
            return false;
        }
    }

    // ========================================================
    // TABLE 4: crsdg_player (COMPETITION TEAMS / INVESTMENT)
    // ========================================================

    async function fetchPlayersFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching players from crsdg_player...');
            const docs = await fetchAllRawDocuments(COLS.PLAYER);
            const list = docs.map(d => firestoreDocToObj(d)).filter(Boolean);
            console.log(`[FirebaseSync] Fetched ${list.length} players from crsdg_player in Firebase.`);
            if (list.length > 0) {
                if (window.state && typeof window.state.applyCloudPlayers === 'function') {
                    window.state.applyCloudPlayers(list);
                }
                notify('PLAYERS_UPDATED', list);
            }
            return list;
        } catch (err) {
            console.warn('[FirebaseSync] fetchPlayersFromCloud warning:', err.message);
            return [];
        }
    }

    async function savePlayer(player) {
        if (!player || !player.id) return false;
        return saveDocument(COLS.PLAYER, player.id, player);
    }

    async function deletePlayer(playerId) {
        return deleteDocument(COLS.PLAYER, playerId);
    }

    async function syncAllPlayers(playersList) {
        if (!Array.isArray(playersList)) return false;
        try {
            const nowIso = new Date().toISOString();
            if (db) {
                const batch = db.batch();
                playersList.forEach(p => {
                    if (p && p.id) {
                        const ref = db.collection(COLS.PLAYER).doc(String(p.id).trim());
                        batch.set(ref, {
                            ...p,
                            updatedAt: nowIso
                        }, { merge: true });
                    }
                });
                await batch.commit();
                return true;
            } else {
                const writes = playersList.map(p => ({
                    update: {
                        name: `projects/${PROJECT_ID}/databases/(default)/documents/${COLS.PLAYER}/${p.id}`,
                        fields: objToFirestoreFields({
                            ...p,
                            updatedAt: nowIso
                        })
                    }
                }));
                return await commitBatchedWrites(writes);
            }
        } catch (err) {
            console.error('[FirebaseSync] Failed to sync players:', err);
            return false;
        }
    }

    async function setPlayerVoteStatus(playerId, status) {
        if (!playerId) return false;
        return saveDocument(COLS.PLAYER, playerId, {
            voteStatus: status,
            updatedAt: new Date().toISOString()
        });
    }

    // ========================================================
    // TABLE 5: crsdg_quiz (QUIZ GAME QUESTIONS)
    // ========================================================

    async function fetchQuizzesFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching quizzes from crsdg_quiz...');
            const docs = await fetchAllRawDocuments(COLS.QUIZ);
            const list = docs.map(d => firestoreDocToObj(d)).filter(Boolean);
            if (list.length > 0) {
                if (window.state && typeof window.state.applyCloudQuizzes === 'function') {
                    window.state.applyCloudQuizzes(list);
                }
                notify('QUIZ_UPDATED', list);
            }
            return list;
        } catch (err) {
            console.warn('[FirebaseSync] fetchQuizzesFromCloud warning:', err.message);
            return [];
        }
    }

    async function saveQuiz(quiz) {
        if (!quiz || !quiz.id) return false;
        return saveDocument(COLS.QUIZ, quiz.id, quiz);
    }

    async function deleteQuiz(quizId) {
        return deleteDocument(COLS.QUIZ, quizId);
    }

    async function syncAllQuizzes(quizzesList) {
        if (!Array.isArray(quizzesList)) return false;
        try {
            const writes = quizzesList.map(q => ({
                update: {
                    name: `projects/${PROJECT_ID}/databases/(default)/documents/${COLS.QUIZ}/${q.id}`,
                    fields: objToFirestoreFields({
                        ...q,
                        updatedAt: new Date().toISOString()
                    })
                }
            }));
            return await commitBatchedWrites(writes);
        } catch (err) {
            console.error('[FirebaseSync] Failed to sync quizzes:', err);
            return false;
        }
    }

    // ========================================================
    // TABLE 6: crsdg_evaluations (SATISFACTION EVALUATIONS)
    // ========================================================

    async function fetchEvaluationsFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching evaluations from crsdg_evaluations...');
            const docs = await fetchAllRawDocuments(COLS.EVALUATIONS);
            const list = docs.map(d => firestoreDocToObj(d)).filter(Boolean);
            if (list.length > 0) {
                if (window.state && typeof window.state.applyCloudEvaluations === 'function') {
                    window.state.applyCloudEvaluations(list);
                }
                notify('EVALUATIONS_UPDATED', list);
            }
            return list;
        } catch (err) {
            console.warn('[FirebaseSync] fetchEvaluationsFromCloud warning:', err.message);
            return [];
        }
    }

    async function saveEvaluation(evalData) {
        if (!evalData || !evalData.id) return false;
        return saveDocument(COLS.EVALUATIONS, evalData.id, evalData);
    }

    async function deleteEvaluation(evalId) {
        return deleteDocument(COLS.EVALUATIONS, evalId);
    }

    async function clearAllEvaluationsFromCloud() {
        try {
            console.log('[FirebaseSync] Clearing all documents from crsdg_evaluations...');
            const docs = await fetchAllRawDocuments(COLS.EVALUATIONS);
            if (!docs || !docs.length) return true;
            for (const doc of docs) {
                const docId = doc.name ? doc.name.split('/').pop() : null;
                if (docId) await deleteDocument(COLS.EVALUATIONS, docId);
            }
            return true;
        } catch (err) {
            console.error('[FirebaseSync] Failed to clear evaluations from cloud:', err);
            return false;
        }
    }

    // ========================================================
    // TABLE 7: crsdg_vote (VOTING & INVESTMENT SETTINGS)
    // ========================================================

    async function fetchVoteSettingsFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching vote settings from crsdg_vote/settings...');
            const url = `${FIRESTORE_BASE_URL}/${COLS.VOTE}/settings`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const doc = await res.json();
            const data = firestoreDocToObj(doc);
            if (data) {
                if (window.state && typeof window.state.applyCloudVoteSettings === 'function') {
                    window.state.applyCloudVoteSettings(data);
                }
            }
            return data;
        } catch (err) {
            console.warn('[FirebaseSync] fetchVoteSettingsFromCloud warning:', err.message);
            return null;
        }
    }

    async function saveVoteSettings(settings) {
        return saveDocument(COLS.VOTE, 'settings', settings);
    }

    async function saveUserInvestmentToCloud(empId, userInvestments) {
        if (!empId) return false;
        const cleanId = String(empId).trim().toLowerCase();
        const payload = {
            empId: cleanId,
            investments: userInvestments || {},
            updatedAt: new Date().toISOString()
        };

        // 1. Try Firebase Web SDK first (with 4s timeout safety)
        if (db) {
            try {
                const writePromise = db.collection(COLS.INVESTMENTS).doc(cleanId).set(payload);
                const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 4000));
                const raceRes = await Promise.race([writePromise, timeoutPromise]);
                if (raceRes === 'timeout') {
                    console.log('[FirebaseSync] SDK saveUserInvestmentToCloud queued in background');
                }
                return true;
            } catch (sdkErr) {
                console.warn('[FirebaseSync] SDK saveUserInvestmentToCloud fallback to REST:', sdkErr.message);
            }
        }

        // 2. Fallback to Direct Firestore REST API PATCH (reliable under heavy mobile concurrency)
        try {
            const encId = encodeURIComponent(cleanId);
            const fields = objToFirestoreFields(payload);
            const url = `${FIRESTORE_BASE_URL}/${COLS.INVESTMENTS}/${encId}`;
            const headers = { 'Content-Type': 'application/json' };
            if (auth && auth.currentUser) {
                try {
                    const token = await auth.currentUser.getIdToken();
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                } catch (e) {}
            }
            const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({ fields }),
                signal: controller ? controller.signal : undefined
            });
            if (timer) clearTimeout(timer);
            return res.ok;
        } catch (err) {
            console.warn('[FirebaseSync] saveUserInvestmentToCloud REST notice:', err.message);
            return false;
        }
    }

    async function fetchUserInvestmentsFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching user investments from crsdg_investments...');
            const userInvMap = {};
            if (db) {
                const snapshot = await db.collection(COLS.INVESTMENTS).get();
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (!d) return;
                    const empId = String(d.empId || doc.id).trim().toLowerCase();
                    let inv = d.investments;
                    if (typeof inv === 'string') {
                        try { inv = JSON.parse(inv); } catch (e) { inv = {}; }
                    }
                    if (empId && typeof inv === 'object') {
                        userInvMap[empId] = inv || {};
                    }
                });
            } else {
                const docs = await fetchAllRawDocuments(COLS.INVESTMENTS);
                (docs || []).forEach(doc => {
                    const d = firestoreDocToObj(doc);
                    if (!d) return;
                    const docName = doc.name ? doc.name.split('/').pop() : '';
                    const empId = String(d.empId || docName).trim().toLowerCase();
                    let inv = d.investments;
                    if (typeof inv === 'string') {
                        try { inv = JSON.parse(inv); } catch (e) { inv = {}; }
                    }
                    if (empId && typeof inv === 'object') {
                        userInvMap[empId] = inv || {};
                    }
                });
            }
            if (window.state && typeof window.state.applyCloudUserInvestments === 'function') {
                window.state.applyCloudUserInvestments(userInvMap, true);
            }
            return userInvMap;
        } catch (err) {
            console.warn('[FirebaseSync] fetchUserInvestmentsFromCloud warning:', err.message);
            return null;
        }
    }

    /**
     * Real-time Listener สำหรับติดตามการบันทึกเงินลงทุนใน crsdg_investments แบบ Real-time
     * เมื่อมีผู้ใช้งานกดบันทึกเงินลงทุน จะส่งสัญญาณและอัปเดต state ทันที
     */
    function listenToUserInvestments(callback) {
        if (!db && typeof firebase !== 'undefined' && firebase.firestore) {
            try { db = firebase.firestore(); } catch (e) {}
        }
        if (db && typeof db.collection === 'function') {
            try {
                let cachedMap = null;
                return db.collection(COLS.INVESTMENTS).onSnapshot(snapshot => {
                    if (cachedMap === null) {
                        // First snapshot: โหลดข้อมูลตั้งต้นทั้งหมด
                        cachedMap = {};
                        snapshot.forEach(doc => {
                            const d = doc.data();
                            if (!d) return;
                            const empId = String(d.empId || doc.id).trim().toLowerCase();
                            let inv = d.investments;
                            if (typeof inv === 'string') {
                                try { inv = JSON.parse(inv); } catch (e) { inv = {}; }
                            }
                            if (empId && typeof inv === 'object') {
                                cachedMap[empId] = inv || {};
                            }
                        });
                    } else {
                        // Subsequent snapshots: ประมวลผลเฉพาะเอกสารที่มีการเปลี่ยนแปลง (Delta O(1)) รองรับ 300 คนพร้อมกันสบายๆ
                        const changes = typeof snapshot.docChanges === 'function' ? snapshot.docChanges() : [];
                        if (changes.length > 0) {
                            changes.forEach(change => {
                                const doc = change.doc;
                                const d = doc.data();
                                const empId = String((d && d.empId) || doc.id).trim().toLowerCase();
                                if (change.type === 'removed') {
                                    delete cachedMap[empId];
                                } else if (d) {
                                    let inv = d.investments;
                                    if (typeof inv === 'string') {
                                        try { inv = JSON.parse(inv); } catch (e) { inv = {}; }
                                    }
                                    if (empId && typeof inv === 'object') {
                                        cachedMap[empId] = inv || {};
                                    }
                                }
                            });
                        } else {
                            snapshot.forEach(doc => {
                                const d = doc.data();
                                if (!d) return;
                                const empId = String(d.empId || doc.id).trim().toLowerCase();
                                let inv = d.investments;
                                if (typeof inv === 'string') {
                                    try { inv = JSON.parse(inv); } catch (e) { inv = {}; }
                                }
                                if (empId && typeof inv === 'object') {
                                    cachedMap[empId] = inv || {};
                                }
                            });
                        }
                    }
                    if (window.state && typeof window.state.applyCloudUserInvestments === 'function') {
                        window.state.applyCloudUserInvestments(cachedMap, true);
                    }
                    if (typeof callback === 'function') {
                        callback(cachedMap);
                    }
                    notify('INVESTMENTS_UPDATED', cachedMap);
                }, err => {
                    console.warn('[FirebaseSync] crsdg_investments onSnapshot notice:', err.message);
                });
            } catch (err) {
                console.warn('[FirebaseSync] listenToUserInvestments error:', err);
            }
        }
        return null;
    }

    async function clearAllUserInvestmentsFromCloud() {
        try {
            console.log('[FirebaseSync] Clearing all user investments from crsdg_investments...');
            if (db) {
                const snapshot = await db.collection(COLS.INVESTMENTS).get();
                if (!snapshot.empty) {
                    const batch = db.batch();
                    snapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    console.log(`[FirebaseSync] SDK deleted ${snapshot.size} investment docs from crsdg_investments`);
                }
            } else {
                const docs = await fetchAllRawDocuments(COLS.INVESTMENTS);
                if (docs && docs.length > 0) {
                    const writes = docs.map(d => ({ delete: d.name }));
                    await commitBatchedWrites(writes);
                    console.log(`[FirebaseSync] REST deleted ${docs.length} investment docs from crsdg_investments`);
                }
            }
            // Notify other clients via reset_votes_timestamp
            await saveVoteSettings({ reset_votes_timestamp: Date.now() });
            return true;
        } catch (err) {
            console.error('[FirebaseSync] Failed to clear crsdg_investments:', err);
            return false;
        }
    }

    // ========================================================
    // TABLE 8: crsdg_reward (Prize Management)
    // ========================================================

    async function fetchPrizesFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching prizes from crsdg_reward...');
            let docs = await fetchAllRawDocuments(COLS.PRIZES);
            if (!docs || docs.length === 0) {
                // Try legacy collection if new one is empty
                const legacyDocs = await fetchAllRawDocuments('crsdg_prizes');
                if (legacyDocs && legacyDocs.length > 0) docs = legacyDocs;
            }
            const prizes = docs.map(d => firestoreDocToObj(d)).filter(p => p && p.id);
            console.log(`[FirebaseSync] Fetched ${prizes.length} prizes from Firestore.`);
            if (prizes.length > 0 && window.state && typeof window.state.applyCloudPrizes === 'function') {
                window.state.applyCloudPrizes(prizes);
            }
            return prizes;
        } catch (err) {
            console.warn('[FirebaseSync] fetchPrizesFromCloud warning:', err.message);
            return [];
        }
    }

    async function savePrize(prize) {
        if (!prize || !prize.id) return false;
        return saveDocument(COLS.PRIZES, prize.id, prize);
    }

    async function deletePrize(prizeId) {
        return deleteDocument(COLS.PRIZES, prizeId);
    }

    async function syncAllPrizes(prizesList) {
        if (!Array.isArray(prizesList)) return false;
        try {
            if (db) {
                const batch = db.batch();
                prizesList.forEach(p => {
                    const cleanId = String(p.id).trim();
                    const ref = db.collection(COLS.PRIZES).doc(cleanId);
                    batch.set(ref, {
                        ...p,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                });
                await batch.commit();
                return true;
            } else {
                const writes = prizesList.map(p => {
                    const cleanId = encodeURIComponent(String(p.id).trim());
                    const fields = objToFirestoreFields(p);
                    fields.updatedAt = { stringValue: new Date().toISOString() };
                    return {
                        update: {
                            name: `projects/${PROJECT_ID}/databases/(default)/documents/${COLS.PRIZES}/${cleanId}`,
                            fields: fields
                        }
                    };
                });
                await commitBatchedWrites(writes);
                return true;
            }
        } catch (err) {
            console.error('[FirebaseSync] Failed to syncAllPrizes:', err);
            return false;
        }
    }

    // ========================================================
    // TABLE 9: crsdg_winners (PRIZE WINNERS ROSTER)
    // ========================================================

    async function fetchWinnersFromCloud() {
        try {
            console.log('[FirebaseSync] Fetching winners from crsdg_winners...');
            let winners = [];
            if (db) {
                const snapshot = await db.collection(COLS.WINNERS).get();
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d) winners.push({ id: doc.id, ...d });
                });
            } else {
                const docs = await fetchAllRawDocuments(COLS.WINNERS);
                winners = docs.map(d => firestoreDocToObj(d)).filter(w => w && w.id);
            }
            console.log(`[FirebaseSync] Fetched ${winners.length} winners from Firestore.`);
            if (window.state && typeof window.state.applyCloudWinners === 'function') {
                window.state.applyCloudWinners(winners);
            }
            return winners;
        } catch (err) {
            console.warn('[FirebaseSync] fetchWinnersFromCloud warning:', err.message);
            return [];
        }
    }

    async function saveWinner(winner) {
        if (!winner || !winner.id) return false;
        return saveDocument(COLS.WINNERS, winner.id, winner);
    }

    async function deleteWinner(winnerId) {
        return deleteDocument(COLS.WINNERS, winnerId);
    }

    async function clearAllWinnersFromCloud() {
        try {
            console.log('[FirebaseSync] Clearing all documents from crsdg_winners...');
            if (db) {
                const snapshot = await db.collection(COLS.WINNERS).get();
                if (!snapshot.empty) {
                    const batch = db.batch();
                    snapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    console.log(`[FirebaseSync] SDK successfully deleted ${snapshot.size} winner docs from crsdg_winners`);
                }
                return true;
            } else {
                const docs = await fetchAllRawDocuments(COLS.WINNERS);
                if (docs && docs.length > 0) {
                    const writes = docs.map(doc => ({ delete: doc.name }));
                    await commitBatchedWrites(writes);
                }
                return true;
            }
        } catch (err) {
            console.error('[FirebaseSync] Failed to clear crsdg_winners:', err);
            return false;
        }
    }

    async function syncAllWinners(winnersList) {
        if (!Array.isArray(winnersList)) return false;
        try {
            if (db) {
                const batch = db.batch();
                winnersList.forEach(w => {
                    const cleanId = String(w.id).trim();
                    const ref = db.collection(COLS.WINNERS).doc(cleanId);
                    batch.set(ref, {
                        ...w,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                });
                await batch.commit();
                return true;
            } else {
                const writes = winnersList.map(w => {
                    const cleanId = encodeURIComponent(String(w.id).trim());
                    const fields = objToFirestoreFields(w);
                    fields.updatedAt = { stringValue: new Date().toISOString() };
                    return {
                        update: {
                            name: `projects/${PROJECT_ID}/databases/(default)/documents/${COLS.WINNERS}/${cleanId}`,
                            fields: fields
                        }
                    };
                });
                await commitBatchedWrites(writes);
                return true;
            }
        } catch (err) {
            console.error('[FirebaseSync] Failed to syncAllWinners:', err);
            return false;
        }
    }

    // ========================================================
    // ALL TABLES PARALLEL SYNC
    // ========================================================

    function isAttendeeClientApp() {
        if (typeof window === 'undefined') return false;
        const path = (window.location.pathname || '').toLowerCase();
        if (path.includes('admin') || path.includes('showport')) {
            return false;
        }
        return true;
    }

    let activeFetchAllPromise = null;

    async function fetchAllDataFromCloud() {
        if (activeFetchAllPromise) {
            return activeFetchAllPromise;
        }

        activeFetchAllPromise = (async () => {
            const isClient = isAttendeeClientApp();
            console.log(`[FirebaseSync] ☁️ Fetching database tables from Cloud Firestore in parallel (mode: ${isClient ? 'attendee client' : 'admin/screen'})...`);
            try {
                // สำหรับหน้าจอผู้ร่วมกิจกรรม (index.html) จะไม่ดึงข้อมูลการลงทุนทั้งหมด 300 คน และไม่ดึงแบบประเมินทั้งหมด 300 คน
                // เพื่อประหยัด Firestore reads และเพิ่มความเร็วในการโหลดให้พร้อมรองรับผู้ใช้งาน 300 คนพร้อมกัน
                const fetchInvPromise = isClient ? Promise.resolve({}) : fetchUserInvestmentsFromCloud();
                const fetchEvalPromise = isClient ? Promise.resolve([]) : fetchEvaluationsFromCloud();

                const [members, teamNames, teams, players, quizzes, evaluations, voteSettings, userInvestments, prizes, winners] = await Promise.all([
                    fetchMembersFromCloud(),
                    fetchTeamNamesFromCloud(),
                    fetchTeamsFromCloud(),
                    fetchPlayersFromCloud(),
                    fetchQuizzesFromCloud(),
                    fetchEvalPromise,
                    fetchVoteSettingsFromCloud(),
                    fetchInvPromise,
                    fetchPrizesFromCloud(),
                    fetchWinnersFromCloud()
                ]);
                console.log('[FirebaseSync] ✅ Database tables synced from Firebase Cloud Firestore successfully.');
                const result = { members, teamNames, teams, players, quizzes, evaluations, voteSettings, userInvestments, prizes, winners };
                if (typeof window !== 'undefined' && window.state && typeof window.state.applyCloudData === 'function') {
                    window.state.applyCloudData(result);
                }
                return result;
            } catch (err) {
                console.error('[FirebaseSync] Error during fetchAllDataFromCloud:', err);
                return null;
            } finally {
                activeFetchAllPromise = null;
            }
        })();

        return activeFetchAllPromise;
    }

    // ========================================================
    // TARGETED SINGLE-DOCUMENT LOOKUPS (OPTIMIZED FOR 300 CONCURRENT USERS)
    // ========================================================

    async function fetchSingleUserInvestmentFromCloud(empId) {
        if (!empId) return {};
        const cleanId = String(empId).trim().toLowerCase();
        try {
            if (db) {
                const doc = await db.collection(COLS.INVESTMENTS).doc(cleanId).get();
                if (doc.exists) {
                    const d = doc.data();
                    let inv = d ? d.investments : {};
                    if (typeof inv === 'string') {
                        try { inv = JSON.parse(inv); } catch (e) { inv = {}; }
                    }
                    return inv || {};
                }
            } else {
                const encId = encodeURIComponent(cleanId);
                const url = `${FIRESTORE_BASE_URL}/${COLS.INVESTMENTS}/${encId}`;
                const res = await fetch(url);
                if (res.ok) {
                    const doc = await res.json();
                    const d = firestoreDocToObj(doc);
                    let inv = d ? d.investments : {};
                    if (typeof inv === 'string') {
                        try { inv = JSON.parse(inv); } catch (e) { inv = {}; }
                    }
                    return inv || {};
                }
            }
        } catch (err) {
            console.warn('[FirebaseSync] fetchSingleUserInvestmentFromCloud notice:', err.message);
        }
        return {};
    }

    async function fetchSingleMemberFromCloud(empId) {
        if (!empId) return null;
        const cleanId = String(empId).trim();
        const cleanNoZero = cleanId.replace(/^0+/, '');
        try {
            if (db) {
                // 1. ลองค้นหาตรงด้วย Document ID
                let doc = await db.collection(COLS.MEMBERS).doc(cleanId).get();
                if (doc && doc.exists) {
                    return parseFirestoreMemberDoc(doc);
                }
                // 2. ลองค้นหาผ่านฟิลด์ EmployeeID
                let snap = await db.collection(COLS.MEMBERS).where('EmployeeID', '==', cleanId).limit(1).get();
                if (snap && !snap.empty) {
                    return parseFirestoreMemberDoc(snap.docs[0]);
                }
                // 3. ลองค้นหาแบบตัดเลขศูนย์นำหน้า (Leading Zeros)
                if (cleanNoZero && cleanNoZero !== cleanId) {
                    snap = await db.collection(COLS.MEMBERS).where('EmployeeID', '==', cleanNoZero).limit(1).get();
                    if (snap && !snap.empty) {
                        return parseFirestoreMemberDoc(snap.docs[0]);
                    }
                    doc = await db.collection(COLS.MEMBERS).doc(cleanNoZero).get();
                    if (doc && doc.exists) {
                        return parseFirestoreMemberDoc(doc);
                    }
                }
            } else {
                const encId = encodeURIComponent(cleanId);
                const url = `${FIRESTORE_BASE_URL}/${COLS.MEMBERS}/${encId}`;
                const res = await fetch(url);
                if (res.ok) {
                    const rawDoc = await res.json();
                    return parseFirestoreMemberDoc(rawDoc);
                }
            }
        } catch (err) {
            console.warn('[FirebaseSync] fetchSingleMemberFromCloud error:', err.message);
        }
        return null;
    }

    async function checkUserEvaluationSubmitted(empId) {
        if (!empId) return false;
        const cleanId = String(empId).trim().toLowerCase();
        const local = localStorage.getItem('crsdg_eval_submitted_' + cleanId);
        if (local === 'true') return true;
        try {
            if (db) {
                const snap = await db.collection(COLS.EVALUATIONS).where('empId', '==', cleanId).limit(1).get();
                if (snap && !snap.empty) {
                    localStorage.setItem('crsdg_eval_submitted_' + cleanId, 'true');
                    return true;
                }
            }
        } catch (err) {
            console.warn('[FirebaseSync] checkUserEvaluationSubmitted notice:', err.message);
        }
        return false;
    }

    // ========================================================
    // SECONDARY ENGINE: WEB SDK REALTIME LISTENERS
    // ========================================================

    function initWebSDK() {
        if (typeof firebase === 'undefined' || !firebase.firestore) return;

        try {
            if (typeof firebase.firestore.setLogLevel === 'function') {
                firebase.firestore.setLogLevel('error');
            }
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            if (firebase.auth) {
                auth = firebase.auth();
                if (!auth.currentUser) {
                    auth.signInAnonymously().catch(() => {});
                }
            }
            db = firebase.firestore();

            // เปิด Offline Persistence (IndexedDB Cache) เพื่อลดการยิงเน็ตซ้ำและรองรับกรณีสัญญาณโทรศัพท์หน่วง
            try {
                db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
            } catch (e) {}

            const isClient = isAttendeeClientApp();

            // Realtime listener for crsdg_member
            // สำหรับหน้าจอผู้ร่วมกิจกรรม: หน่วงเวลา (Debounce) 3 วินาทีเพื่อป้องกันไม่ให้เครื่องกระตุกเมื่อพนักงาน 300 คนลงทะเบียนพร้อมกัน
            let memberDebounceTimer = null;
            db.collection(COLS.MEMBERS).onSnapshot(snapshot => {
                if (isBatchWriting) return;

                const processSnapshot = () => {
                    const members = [];
                    snapshot.forEach(doc => {
                        const d = doc.data();
                        if (!d) return;
                        const empId = String(d.EmployeeID || doc.id || '').trim();
                        const empName = String(d.EmpName || d.name || '').trim();
                        if (!empId || !empName) return;

                        const isReg = (d.registered === true || d.isRegistered === true) ? true : null;
                        const chosen = (d.chosenTeam && String(d.chosenTeam).trim()) ? String(d.chosenTeam).trim() : null;
                        const rawMem = d.Member || d.member || '';
                        const memberStatus = (String(rawMem).trim().toLowerCase() === 'member' || String(rawMem).trim().toLowerCase() === 'mamber' || (rawMem && String(rawMem).trim() !== '-' && String(rawMem).trim() !== '0')) ? 'Member' : '';

                        members.push({
                            id: empId,
                            EmployeeID: empId,
                            EmpName: empName,
                            Group: String(d.Group || d.department || 'Team A').trim(),
                            Member: memberStatus,
                            member: memberStatus,
                            name: empName,
                            department: String(d.Group || d.department || 'Team A').trim(),
                            photo: d.photo || '',
                            registered: isReg,
                            isRegistered: isReg,
                            registeredAt: isReg ? (d.registeredAt || null) : null,
                            chosenTeam: chosen,
                            vote: (d.vote && String(d.vote).trim()) ? String(d.vote).trim() : null,
                            prize: d.prize || null,
                            wonPrize: d.wonPrize || null,
                            prizeTitle: d.prizeTitle || null,
                            hasWon: d.hasWon || null,
                            ticketCode: d.ticketCode || ''
                        });
                    });

                    if (members.length > 0) {
                        if (window.state && typeof window.state.applyCloudMembers === 'function') {
                            window.state.applyCloudMembers(members);
                        }
                        notify('MEMBERS_UPDATED', members);
                    }
                };

                if (isClient) {
                    if (memberDebounceTimer) clearTimeout(memberDebounceTimer);
                    memberDebounceTimer = setTimeout(processSnapshot, 3000);
                } else {
                    processSnapshot();
                }
            }, err => console.warn('[FirebaseSync] crsdg_member onSnapshot notice:', err.message));

            // Realtime listener for crsdg_player
            db.collection(COLS.PLAYER).onSnapshot(snapshot => {
                const players = [];
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d) players.push({ id: doc.id, ...d });
                });
                if (players.length > 0 && window.state && typeof window.state.applyCloudPlayers === 'function') {
                    window.state.applyCloudPlayers(players);
                }
            }, err => console.warn('[FirebaseSync] crsdg_player onSnapshot notice:', err.message));

            // Realtime listener for crsdg_prizes
            db.collection(COLS.PRIZES).onSnapshot(snapshot => {
                const prizes = [];
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d) prizes.push({ id: doc.id, ...d });
                });
                if (prizes.length > 0 && window.state && typeof window.state.applyCloudPrizes === 'function') {
                    window.state.applyCloudPrizes(prizes);
                }
                notify('PRIZES_UPDATED', prizes);
            }, err => console.warn('[FirebaseSync] crsdg_prizes onSnapshot notice:', err.message));

            // Realtime listener for crsdg_winners
            db.collection(COLS.WINNERS).onSnapshot(snapshot => {
                const winners = [];
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d) winners.push({ id: doc.id, ...d });
                });
                if (window.state && typeof window.state.applyCloudWinners === 'function') {
                    window.state.applyCloudWinners(winners);
                }
                notify('WINNERS_UPDATED', winners);
            }, err => console.warn('[FirebaseSync] crsdg_winners onSnapshot notice:', err.message));

            // Realtime listener for crsdg_evaluations: รันเฉพาะหน้าจอ Admin / Stage Showcase เท่านั้น มือถือผู้ร่วมกิจกรรมไม่ต้องฟังสตรีมนี้
            if (!isClient) {
                db.collection(COLS.EVALUATIONS).onSnapshot(snapshot => {
                    const evals = [];
                    snapshot.forEach(doc => {
                        const d = doc.data();
                        if (d) evals.push({ id: doc.id, ...d });
                    });
                    if (window.state && typeof window.state.applyCloudEvaluations === 'function') {
                        window.state.applyCloudEvaluations(evals);
                    }
                    notify('EVALUATIONS_UPDATED', evals);
                }, err => console.warn('[FirebaseSync] crsdg_evaluations onSnapshot notice:', err.message));
            }

            // Realtime listener for crsdg_vote (settings)
            db.collection(COLS.VOTE).doc('settings').onSnapshot(doc => {
                if (!doc || !doc.exists) return;
                const d = doc.data();
                if (d) {
                    if (window.state && typeof window.state.applyCloudVoteSettings === 'function') {
                        window.state.applyCloudVoteSettings(d);
                    }
                    notify('VOTE_SETTINGS_UPDATED', d);
                }
            }, err => console.warn('[FirebaseSync] crsdg_vote settings onSnapshot notice:', err.message));

            // หมายเหตุ: เอา code realtime onSnapshot ของ crsdg_investments ออกถาวรเพื่อป้องกันการนำมาใช้งานและลดปัญหาความหน่วงของระบบ
            // การดึงข้อมูลพอร์ตลงทุนจะกระทำแบบ on-demand ผ่าน fetchUserInvestmentsFromCloud() และบันทึกผ่านการ Submit เท่านั้น

        } catch (err) {
            console.warn('[FirebaseSync] Web SDK initialization notice:', err);
        }
    }

    // Expose Public API
    window.FirebaseSync = {
        COLS: COLS,
        subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
        // Members
        fetchMembersFromCloud: fetchMembersFromCloud,
        importMembersToCloud: importMembersToCloud,
        saveMember: saveMember,
        deleteMember: deleteMember,
        clearAllMembersFromCloud: clearAllMembersFromCloud,
        resetAllMembersRegistrationInCloud: resetAllMembersRegistrationInCloud,
        resetAllMemberWinnerStatusesInCloud: resetAllMemberWinnerStatusesInCloud,
        resetAllMemberVotesInCloud: resetAllMemberVotesInCloud,
        updateMemberRegistration: updateMemberRegistration,
        fetchSingleMemberFromCloud: fetchSingleMemberFromCloud,
        // Teams 4v4
        fetchTeamNamesFromCloud: fetchTeamNamesFromCloud,
        saveTeamName: saveTeamName,
        deleteTeamName: deleteTeamName,
        syncAllTeamNames: syncAllTeamNames,
        fetchTeamsFromCloud: fetchTeamsFromCloud,
        saveTeamRoster: saveTeamRoster,
        deleteTeamRoster: deleteTeamRoster,
        syncAllTeamRosters: syncAllTeamRosters,
        // Players (Competition Teams)
        fetchPlayersFromCloud: fetchPlayersFromCloud,
        savePlayer: savePlayer,
        deletePlayer: deletePlayer,
        syncAllPlayers: syncAllPlayers,
        setPlayerVoteStatus: setPlayerVoteStatus,
        // Quizzes
        fetchQuizzesFromCloud: fetchQuizzesFromCloud,
        saveQuiz: saveQuiz,
        deleteQuiz: deleteQuiz,
        syncAllQuizzes: syncAllQuizzes,
        // Evaluations
        fetchEvaluationsFromCloud: fetchEvaluationsFromCloud,
        saveEvaluation: saveEvaluation,
        deleteEvaluation: deleteEvaluation,
        clearAllEvaluationsFromCloud: clearAllEvaluationsFromCloud,
        checkUserEvaluationSubmitted: checkUserEvaluationSubmitted,
        // Vote Settings
        fetchVoteSettingsFromCloud: fetchVoteSettingsFromCloud,
        saveVoteSettings: saveVoteSettings,
        // Investments
        saveUserInvestmentToCloud: saveUserInvestmentToCloud,
        fetchUserInvestmentsFromCloud: fetchUserInvestmentsFromCloud,
        fetchSingleUserInvestmentFromCloud: fetchSingleUserInvestmentFromCloud,
        listenToUserInvestments: listenToUserInvestments,
        clearAllUserInvestmentsFromCloud: clearAllUserInvestmentsFromCloud,
        // Prizes (AL_Reward)
        fetchPrizesFromCloud: fetchPrizesFromCloud,
        savePrize: savePrize,
        deletePrize: deletePrize,
        syncAllPrizes: syncAllPrizes,
        // Winners
        fetchWinnersFromCloud: fetchWinnersFromCloud,
        saveWinner: saveWinner,
        deleteWinner: deleteWinner,
        clearAllWinnersFromCloud: clearAllWinnersFromCloud,
        syncAllWinners: syncAllWinners,
        // Universal Parallel Sync
        fetchAllDataFromCloud: fetchAllDataFromCloud,
        isAttendeeClientApp: isAttendeeClientApp,
        isOnline: () => isOnline
    };

    // Auto-fetch all tables and initialize when DOM is ready
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initWebSDK();
                fetchAllDataFromCloud();
            });
        } else {
            initWebSDK();
            fetchAllDataFromCloud();
        }
    }

})(window);
