/**
 * 4 ต่อ 4 CRSDG - Remote Controller Client Script (js/remote_crsdg.js)
 * Real-time bidirectional communication via BroadcastChannel & LocalStorage fallback
 */

(function () {
    'use strict';

    // Channel for real-time sync with game.html
    const CHANNEL_NAME = 'crsdg_game_channel';
    const channel = (typeof window.BroadcastChannel !== 'undefined') ? new BroadcastChannel(CHANNEL_NAME) : null;

    let latestGameState = null;
    let lastHeartbeatTime = 0;
    let currentSelectedTab = 'game'; // 'arena' | 'quiz' | 'game'
    let isUserManuallySwitchedTab = false;
    let previousStage = null;

    // Helper: ตรวจสอบว่าควรเปิดใช้งาน Network API (/api/...) หรือไม่
    // บน Live Server (127.0.0.1:5500) ให้ปิดไว้เพื่อไม่ให้เกิด 404 / 405 error
    // และใช้ BroadcastChannel + localStorage ซึ่งทำงานได้อย่างรวดเร็วและสมบูรณ์ 100%
    function isNetworkSyncEnabled() {
        if (typeof window === 'undefined' || !window.location || !window.location.protocol.startsWith('http')) {
            return false;
        }
        if (window.location.search && (new URLSearchParams(window.location.search).has('wifi') || new URLSearchParams(window.location.search).has('network'))) {
            return true;
        }
        const isLoopback = (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '::1'
        );
        if (!isLoopback) {
            return true;
        }
        if (typeof document !== 'undefined' && document.cookie && document.cookie.includes('crsdg_server=1')) {
            return true;
        }
        return false;
    }

    // Haptic feedback for touch devices (เฉพาะเมื่อผู้ใช้มีการกดหรือสัมผัสหน้าจอจริง)
    function triggerHaptic(duration = 40) {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
                return;
            }
            try { navigator.vibrate(duration); } catch (e) {}
        }
    }

    // Send command to game.html
    function sendCommand(action, payload = {}, isUserAction = false) {
        if (isUserAction && action !== 'REQUEST_STATE') {
            triggerHaptic(40);
        }
        const msg = {
            id: 'cmd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            action: action,
            payload: payload || {},
            timestamp: Date.now()
        };

        // 1. BroadcastChannel for fast local cross-tab communication
        if (channel) {
            try { channel.postMessage(msg); } catch (e) { console.warn(e); }
        }

        // 2. LocalStorage for multi-window fallback on same origin
        try {
            localStorage.setItem('crsdg_remote_command', JSON.stringify(msg));
        } catch (e) {
            console.warn(e);
        }

        // 3. Cloud Firestore Real-time Sync (Cross-device, remote on iPad/mobile to server game.html)
        if (action !== 'PING') {
            try {
                const cleanMsg = JSON.parse(JSON.stringify(msg));
                if (window.FirebaseSync && typeof window.FirebaseSync.saveVoteSettings === 'function') {
                    window.FirebaseSync.saveVoteSettings({
                        game_remote_cmd: cleanMsg
                    }).catch(err => console.warn('[GameRemote] Cloud save notice:', err));
                } else if (typeof firebase !== 'undefined' && firebase.firestore) {
                    firebase.firestore().collection('crsdg_vote').doc('settings').set({
                        game_remote_cmd: cleanMsg
                    }, { merge: true }).catch(err => console.warn('[GameRemote] Direct set notice:', err));
                }
            } catch (e) {}
        }

        // Network Command Dispatch for custom backend server (if explicitly configured)
        if (window.__USE_LOCAL_API_SERVER__ && isNetworkSyncEnabled()) {
            fetch('/api/remote-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(msg)
            }).catch(() => {});
        }
    }

    // Request full state from game.html (throttled to at most once per 2s)
    let lastRequestStateSentTs = 0;
    function requestGameState() {
        const now = Date.now();
        if (now - lastRequestStateSentTs < 2000) return;
        lastRequestStateSentTs = now;
        sendCommand('REQUEST_STATE', {}, false);
    }

    // Handle incoming messages from game.html
    function handleIncomingMessage(data) {
        if (!data) return;
        if (data.type === 'GAME_SCREEN_CLOSED' || (data.state && data.state.isClosed)) {
            lastHeartbeatTime = 0;
            latestGameState = { isClosed: true, isGameStarted: false, stage: 'closed' };
            updateConnectionStatus(false);
            return;
        }
        if (data.type === 'GAME_STATE_UPDATE' && data.state) {
            lastHeartbeatTime = Date.now();
            latestGameState = data.state;
            updateConnectionStatus(true);
            renderRemoteUI(latestGameState);
        }
    }

    if (channel) {
        channel.onmessage = (event) => {
            if (event && event.data) {
                handleIncomingMessage(event.data);
            }
        };
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'crsdg_game_state_sync') {
            if (!e.newValue) {
                lastHeartbeatTime = 0;
                updateConnectionStatus(false);
                return;
            }
            try {
                const state = JSON.parse(e.newValue);
                if (state.isClosed) {
                    lastHeartbeatTime = 0;
                    latestGameState = { isClosed: true, isGameStarted: false, stage: 'closed' };
                    updateConnectionStatus(false);
                    return;
                }
                lastHeartbeatTime = Date.now();
                latestGameState = state;
                updateConnectionStatus(true);
                renderRemoteUI(state);
            } catch (err) {}
        } else if (e.key === 'crsdg_player' || e.key === 'crsdg_nameteam' || e.key === 'crsdg_team' || e.key === 'crsdg_member') {
            renderArenaPanel(latestGameState);
        } else if (e.key === 'crsdg_quiz') {
            renderQuizPanel(latestGameState);
        }
    });

    // Cloud Firestore Real-time Sync for game_state_sync across devices
    let lastProcessedBroadcastTime = 0;

    function handleCloudGameState(cloudState) {
        if (!cloudState) return;

        // เมื่อหน้าจอหลักส่งสถานะปิดจอมาชัดเจน
        if (cloudState.isClosed === true) {
            lastHeartbeatTime = 0;
            latestGameState = { isClosed: true, isGameStarted: false, stage: 'closed' };
            updateConnectionStatus(false);
            return;
        }

        const bTime = cloudState.broadcastTime || cloudState.timestamp || 0;
        if (bTime && bTime <= lastProcessedBroadcastTime && latestGameState && !latestGameState.isClosed) {
            // อัปเดตเฉพาะ Heartbeat ประจำรอบ (ตามเวลารีโมต)
            lastHeartbeatTime = Date.now();
            return;
        }
        if (bTime) lastProcessedBroadcastTime = bTime;

        // Merge database teams/quizzes if not attached to cloudState
        const fullState = {
            allTeams: getDatabaseTeams(),
            allQuizzes: getDatabaseQuizzes(),
            ...cloudState,
            isClosed: false
        };

        lastHeartbeatTime = Date.now();
        latestGameState = fullState;
        updateConnectionStatus(true);
        renderRemoteUI(fullState);
    }

    if (window.FirebaseSync && typeof window.FirebaseSync.subscribe === 'function') {
        window.FirebaseSync.subscribe((event) => {
            if (!event) return;
            if (event.type === 'VOTE_SETTINGS_UPDATED' && event.data && event.data.game_state_sync) {
                handleCloudGameState(event.data.game_state_sync);
            } else if (event.type === 'TEAMS_UPDATED' || event.type === 'NAMETEAM_UPDATED' || event.type === 'PLAYERS_UPDATED') {
                renderArenaPanel(latestGameState);
            } else if (event.type === 'QUIZZES_UPDATED' || event.type === 'QUIZ_UPDATED') {
                renderQuizPanel(latestGameState);
            }
        });
    } else if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
            firebase.firestore().collection('crsdg_vote').doc('settings').onSnapshot(doc => {
                if (doc && doc.exists) {
                    const d = doc.data();
                    if (d && d.game_state_sync) {
                        handleCloudGameState(d.game_state_sync);
                    }
                }
            }, err => console.warn('[GameRemote] Firestore onSnapshot notice:', err));
        } catch (e) {}
    }

    // Real-time listener for database updates via StateManager (admin or Excel imports)
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', () => {
            if (typeof window.stateManager !== 'undefined' && typeof window.stateManager.subscribe === 'function') {
                window.stateManager.subscribe((msg) => {
                    if (!msg) return;
                    if (msg.type === 'TEAMS_UPDATED' || msg.type === 'NAMETEAM_UPDATED' || msg.type === 'PARTICIPANTS_UPDATED' || msg.type === 'PLAYERS_UPDATED') {
                        renderArenaPanel(latestGameState);
                    } else if (msg.type === 'QUIZZES_UPDATED') {
                        renderQuizPanel(latestGameState);
                    }
                });
            }
        });
    }

    // Optional Network State Polling for custom local backend (disabled by default on GitHub Pages)
    if (window.__USE_LOCAL_API_SERVER__ && isNetworkSyncEnabled()) {
        let lastPolledBroadcastTime = 0;
        setInterval(() => {
            fetch('/api/game-state')
                .then(res => res.ok ? res.json() : null)
                .then(state => {
                    if (state && state.broadcastTime && state.broadcastTime !== lastPolledBroadcastTime) {
                        lastPolledBroadcastTime = state.broadcastTime;
                        lastHeartbeatTime = Date.now();
                        latestGameState = state;
                        updateConnectionStatus(true);
                        renderRemoteUI(state);
                    }
                })
                .catch(() => {});
        }, 1000);
    }

    // Update Online/Offline status badge & Connection Banner
    function updateConnectionStatus(isConnected) {
        const badge = document.getElementById('remoteConnStatus');
        const txt = document.getElementById('remoteConnText');
        const bannerIcon = document.getElementById('connBannerIcon');
        const bannerText = document.getElementById('connBannerText');
        const introIcon = document.getElementById('introModalIcon');
        const introBadge = document.getElementById('introModalBadge');
        const btnStart = document.getElementById('btnRemoteStartComp');
        const btnOpenGame = document.getElementById('btnModalOpenGame');
        const introSubhint = document.getElementById('introModalSubhint');
        const introModal = document.getElementById('remoteStartIntroModal');

        if (isConnected) {
            if (badge) badge.className = 'remote-conn-status is-connected';
            if (txt) txt.textContent = 'ออนไลน์ (Online)';
            if (bannerIcon) bannerIcon.textContent = '🟢';
            if (bannerText) bannerText.innerHTML = 'เชื่อมต่อหน้าจอหลัก <strong>game.html</strong> เรียบร้อย (Real-time Sync)';
            if (introIcon) introIcon.textContent = '🎮';
            if (introBadge) introBadge.textContent = '4 ต่อ 4 CRSDG GAME';
            if (btnStart) btnStart.style.display = 'inline-flex';
            if (btnOpenGame) btnOpenGame.style.display = 'none';
            if (introSubhint) introSubhint.innerHTML = '💡 หน้าจอหลักพร้อมแล้ว — กดปุ่มด้านบนเพื่อเริ่มการแข่งขัน';
        } else {
            if (badge) badge.className = 'remote-conn-status is-disconnected';
            if (txt) txt.textContent = 'จอหลักปิดอยู่';
            if (bannerIcon) bannerIcon.textContent = '🔴';
            if (bannerText) bannerText.innerHTML = 'หน้าจอหลัก (game.html) ปิดอยู่ • กรุณาคลิก <strong>"เปิดจอหลัก"</strong> ด้านบน';
            if (introIcon) introIcon.textContent = '🖥️';
            if (introBadge) introBadge.textContent = 'หน้าจอหลัก game.html ปิดอยู่';
            if (btnStart) btnStart.style.display = 'none';
            if (btnOpenGame) btnOpenGame.style.display = 'inline-flex';
            if (introSubhint) introSubhint.innerHTML = '⚠️ กรุณาคลิกปุ่มเพื่อเปิดหน้าจอหลัก <strong>game.html</strong> หรือเปิดหน้าจอบนคอมพิวเตอร์';

            // เมื่อหน้าจอหลักปิดอยู่ ให้ disabled ทั้ง 3 แถว และแสดง modal แจ้งเตือนอย่างชัดเจน ไม่ให้สลับไปมา
            disableAllThreeColumns();
            if (introModal) introModal.style.display = 'flex';
        }
    }

    // ปิดการใช้งานทั้ง 3 แถวเมื่อเกมยังไม่เริ่มต้น
    function disableAllThreeColumns() {
        const panels = [
            { el: document.getElementById('panelArena'), pill: document.getElementById('statusPillArena') },
            { el: document.getElementById('panelQuiz'), pill: document.getElementById('statusPillQuiz') },
            { el: document.getElementById('panelGame'), pill: document.getElementById('statusPillGame') }
        ];
        panels.forEach(p => {
            if (!p.el) return;
            p.el.classList.remove('is-active-stage');
            p.el.classList.add('is-disabled-col');
            if (p.pill) {
                p.pill.innerHTML = '<span class="col-status-dot"></span><span>รอเริ่มการแข่งขัน</span>';
                p.pill.title = 'กรุณากดปุ่ม เริ่มการแข่งขัน';
            }
        });
    }

    // Switch tabs on remote (พร้อม Two-way Synchronization สั่งให้หน้า game.html สลับตามอย่างสมบูรณ์)
    function switchTab(tabName, isManual = true, syncGame = true) {
        // หากเกมยังไม่เริ่มต้น หรือจอหลักปิดอยู่ ห้ามสลับแถวและให้คงสถานะ disabled ทั้ง 3 แถวไว้ พร้อมแสดง lightbox
        const isGameNotStarted = (!latestGameState || latestGameState.isClosed || latestGameState.stage === 'home' || latestGameState.stage === 'intro' || !latestGameState.isGameStarted);
        if (isGameNotStarted && tabName !== 'arena_force') {
            disableAllThreeColumns();
            const introModal = document.getElementById('remoteStartIntroModal');
            if (introModal) introModal.style.display = 'flex';
            return;
        }

        if (tabName === 'arena_force') tabName = 'arena';
        currentSelectedTab = tabName;
        if (isManual) isUserManuallySwitchedTab = true;

        // สั่งให้หน้าจอหลัก game.html สลับตามเมื่อผู้ใช้คลิกสลับแถวบนรีโมต (Strict Two-Way Sync)
        if (isManual && syncGame && latestGameState && latestGameState.isGameStarted && !latestGameState.isClosed) {
            if (tabName === 'arena') {
                if (latestGameState.stage === 'home') {
                    sendCommand('CLICK_START_COMPETITION', {}, true);
                } else if (latestGameState.stage !== 'arena') {
                    sendCommand('BACK_TO_ARENA', {}, true);
                }
            } else if (tabName === 'quiz') {
                if (latestGameState.stage === 'arena') {
                    sendCommand('GO_TO_QUIZ_SELECT', {}, true);
                } else if (latestGameState.stage === 'game') {
                    sendCommand('BACK_TO_QUIZ_SELECT', {}, true);
                }
            } else if (tabName === 'game') {
                if (latestGameState.stage === 'quiz_select' && latestGameState.selectedQuizId) {
                    sendCommand('START_QUIZ_GAME', {}, true);
                }
            }
        }

        document.querySelectorAll('.stage-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        });

        const panels = [
            { id: 'arena', el: document.getElementById('panelArena'), pill: document.getElementById('statusPillArena') },
            { id: 'quiz', el: document.getElementById('panelQuiz'), pill: document.getElementById('statusPillQuiz') },
            { id: 'game', el: document.getElementById('panelGame'), pill: document.getElementById('statusPillGame') }
        ];

        const isMobileStacked = typeof window !== 'undefined' && window.innerWidth <= 1024;

        panels.forEach(p => {
            if (!p.el) return;
            const isActive = (p.id === tabName);

            if (isMobileStacked) {
                p.el.style.display = isActive ? 'flex' : 'none';
            } else {
                // บนจอเดสก์ท็อป/จอใหญ่ แสดงผลพร้อมกันทั้ง 3 แถว/คอลัมน์ (กว้าง 33% แต่ละแถว)
                p.el.style.display = 'flex';
            }

            if (isActive) {
                p.el.classList.add('is-active-stage');
                p.el.classList.remove('is-disabled-col');
                if (p.pill) {
                    p.pill.innerHTML = '<span class="col-status-dot"></span><span>ทำงานอยู่</span>';
                    p.pill.title = 'แถวนี้กำลังเปิดใช้งานและรับคำสั่งอยู่';
                }
            } else {
                p.el.classList.remove('is-active-stage');
                p.el.classList.add('is-disabled-col');
                if (p.pill) {
                    p.pill.innerHTML = '<span class="col-status-dot"></span><span>คลิกเพื่อเลือก</span>';
                    p.pill.title = 'คลิกที่หัวแถวเพื่อสลับมาทำงานที่แถวนี้';
                }
            }
        });
    }

    // Render full remote UI from state
    function renderRemoteUI(state) {
        if (!state) return;

        // เมื่อหน้า game ถูกปิดอยู่
        if (state.isClosed) {
            updateConnectionStatus(false);
            disableAllThreeColumns();
            const introModal = document.getElementById('remoteStartIntroModal');
            if (introModal) introModal.style.display = 'flex';
            return;
        }

        // เมื่อหน้า game ยังอยู่ในหน้าแรกและยังไม่ได้เริ่มทำการแข่งขัน ให้ disabled แถวทั้ง 3 แถว และแสดง lightbox เริ่มการแข่งขัน
        const isGameNotStarted = (state.stage === 'home' || state.stage === 'intro' || !state.isGameStarted);
        const introModal = document.getElementById('remoteStartIntroModal');

        if (isGameNotStarted) {
            if (introModal) introModal.style.display = 'flex';
            disableAllThreeColumns();
            previousStage = state.stage;
            return;
        } else {
            if (introModal) introModal.style.display = 'none';
        }

        // Auto-switch tab to match stage:
        // เมื่อจอหลักเปลี่ยนหน้า ให้รีโมตสลับตามอัตโนมัติอย่างแม่นยำ
        if (state.stage !== previousStage) {
            isUserManuallySwitchedTab = false;
            if (state.stage === 'game') {
                switchTab('game', false, false);
            } else if (state.stage === 'quiz_select') {
                switchTab('quiz', false, false);
            } else if (state.stage === 'arena') {
                switchTab('arena', false, false);
            }
            previousStage = state.stage;
        }

        // Overview Header
        const roundTitleEl = document.getElementById('overviewRoundTitle');
        const gameBadgeEl = document.getElementById('overviewGameBadge');
        if (roundTitleEl) roundTitleEl.textContent = state.roundTitle || 'รอบการแข่งขัน';
        if (gameBadgeEl) gameBadgeEl.textContent = `แข่งครั้งที่ ${state.gameIndex || 1} / 3`;

        // Bank Score
        const bankScoreEl = document.getElementById('bankScoreNum');
        if (bankScoreEl) bankScoreEl.textContent = state.bankScore || 0;

        // Team Blue (Left)
        const teamBlueCard = document.getElementById('cardTeamBlue');
        const nameBlue = document.getElementById('nameTeamBlue');
        const capBlue = document.getElementById('capTeamBlue');
        const scoreBlue = document.getElementById('scoreTeamBlue');
        const turnBlue = document.getElementById('turnTeamBlue');

        if (teamBlueCard) {
            teamBlueCard.classList.toggle('is-active-turn', state.activeTurn === 'blue');
        }
        if (nameBlue) nameBlue.textContent = state.teamA ? state.teamA.name : 'ทีมฝั่งซ้าย (Blue)';
        if (capBlue && state.teamA) capBlue.textContent = `👑 ${state.teamA.captain || (state.teamA.members && state.teamA.members[0]) || 'หัวหน้าทีม'}`;
        if (scoreBlue) scoreBlue.textContent = state.blueScore || 0;
        if (turnBlue) turnBlue.textContent = (state.activeTurn === 'blue') ? '● กำลังตอบ' : 'รอตอบ';

        // Team Orange (Right)
        const teamOrangeCard = document.getElementById('cardTeamOrange');
        const nameOrange = document.getElementById('nameTeamOrange');
        const capOrange = document.getElementById('capTeamOrange');
        const scoreOrange = document.getElementById('scoreTeamOrange');
        const turnOrange = document.getElementById('turnTeamOrange');

        if (teamOrangeCard) {
            teamOrangeCard.classList.toggle('is-active-turn', state.activeTurn === 'orange');
        }
        if (nameOrange) nameOrange.textContent = state.teamB ? state.teamB.name : 'ทีมฝั่งขวา (Orange)';
        if (capOrange && state.teamB) capOrange.textContent = `👑 ${state.teamB.captain || (state.teamB.members && state.teamB.members[0]) || 'หัวหน้าทีม'}`;
        if (scoreOrange) scoreOrange.textContent = state.orangeScore || 0;
        if (turnOrange) turnOrange.textContent = (state.activeTurn === 'orange') ? '● กำลังตอบ' : 'รอตอบ';

        // ========================================================
        // Question Showcase Section (กล่องแสดงคำถามและตัวเลือกตามลำดับคะแนน)
        // ========================================================
        const questionLiveStatusText = document.getElementById('questionLiveStatusText');
        const questionNumPill = document.getElementById('questionNumPill');
        const questionTotalPointsBadge = document.getElementById('questionTotalPointsBadge');
        const currentQuestionTitle = document.getElementById('currentQuestionTitle');
        const answersProgressStats = document.getElementById('answersProgressStats');
        const answersProgressFill = document.getElementById('answersProgressFill');

        const isGameMode = (state.stage === 'game');
        if (questionLiveStatusText) {
            if (isGameMode) {
                questionLiveStatusText.textContent = `🔴 กำลังแข่งขันคำถามข้อนี้ (แข่งครั้งที่ ${state.gameIndex || 1} / 3)`;
            } else if (state.stage === 'quiz_select') {
                questionLiveStatusText.textContent = '📋 หน้าจอหลักอยู่ที่: เลือกชุดคำถาม';
            } else {
                questionLiveStatusText.textContent = '👥 หน้าจอหลักอยู่ที่: เลือกทีมแข่งขัน';
            }
        }

        const totalAnswers = (state.answers && Array.isArray(state.answers)) ? state.answers.length : 0;
        const revealedCount = (state.answers && Array.isArray(state.answers)) ? state.answers.filter(a => a.isRevealed).length : 0;
        const totalPts = state.totalQuizPoints || (state.currentQuiz && state.currentQuiz.score) || (state.answers ? state.answers.reduce((acc, a) => acc + (parseInt(a.points, 10) || 0), 0) : 100);

        if (questionNumPill) {
            if (isGameMode && state.currentQuiz) {
                questionNumPill.textContent = '❓ คำถามข้อแข่งขัน';
            } else {
                questionNumPill.textContent = '⏳ คำถาม';
            }
        }

        if (questionTotalPointsBadge) {
            questionTotalPointsBadge.textContent = `คะแนนเต็ม ${totalPts} คะแนน`;
        }

        const questionCategoryPill = document.getElementById('questionCategoryPill');
        if (currentQuestionTitle) {
            if (isGameMode && state.currentQuiz && state.currentQuiz.title) {
                currentQuestionTitle.textContent = state.currentQuiz.title;
                if (questionCategoryPill) {
                    if (state.currentQuiz.category) {
                        questionCategoryPill.textContent = `🏷️ ${state.currentQuiz.category}`;
                        questionCategoryPill.style.display = 'inline-block';
                    } else {
                        questionCategoryPill.style.display = 'none';
                    }
                }
            } else if (state.stage === 'quiz_select') {
                currentQuestionTitle.textContent = 'กรุณาเลือกชุดคำถามบนจอหลัก หรือใช้แท็บ "เลือกคำถาม" ด้านบนเพื่อเริ่มแข่ง';
                if (questionCategoryPill) questionCategoryPill.style.display = 'none';
            } else {
                currentQuestionTitle.textContent = 'กรุณาสุ่มเลือกทีมและเลือกชุดคำถามบนจอหลักเพื่อเริ่มการแข่งขัน';
                if (questionCategoryPill) questionCategoryPill.style.display = 'none';
            }
        }

        if (answersProgressStats) {
            if (isGameMode && totalAnswers > 0) {
                const remaining = totalAnswers - revealedCount;
                answersProgressStats.textContent = `เปิดแล้ว ${revealedCount} / ${totalAnswers} ป้าย (เหลืออีก ${remaining} ป้าย)`;
            } else {
                answersProgressStats.textContent = 'ยังไม่มีป้ายคำตอบ';
            }
        }

        if (answersProgressFill) {
            const pct = (totalAnswers > 0) ? Math.round((revealedCount / totalAnswers) * 100) : 0;
            answersProgressFill.style.width = `${pct}%`;
        }

        // Answer Flip Cards Controller List - เรียงตามลำดับคะแนน สัมพันธ์กับป้ายบนกระดานแข่งขัน
        renderAnswersList(state.answers || []);

        // Strikes
        renderStrikes(state.strikes || [false, false, false]);

        // Steal Phase Banner & Controls
        renderStealControls(state);

        // Turn Picker (Face-off: เลือกทีมที่ได้สิทธิ์ตอบคำถาม)
        renderTurnPicker(state);

        // Round Summary Action Button
        renderSummaryButton(state);

        // System Icons Sync (Mute & Fullscreen in Top Bar)
        const topBtnMute = document.getElementById('topBtnMute');
        const topMuteIcon = document.getElementById('topMuteIcon');
        if (topBtnMute && topMuteIcon) {
            const isMuted = !!state.soundMuted;
            topBtnMute.classList.toggle('is-muted', isMuted);
            topMuteIcon.textContent = isMuted ? '🔇' : '🔊';
        }

        const topBtnFullscreen = document.getElementById('topBtnFullscreen');
        if (topBtnFullscreen) {
            topBtnFullscreen.classList.toggle('is-fullscreen', !!state.isFullscreen);
        }

        // Arena & Quiz Panels Data
        renderArenaPanel(state);
        renderQuizPanel(state);
    }

    // Render Answer Cards in remote - เรียงตามลำดับคะแนนจากมากไปน้อย และสัมพันธ์กับป้ายบนกระดานแข่งขัน
    function renderAnswersList(answers) {
        const list = document.getElementById('remoteAnswersList');
        if (!list) return;

        if (!answers || answers.length === 0) {
            list.innerHTML = `
                <div class="remote-ans-empty-state">
                    <span class="empty-icon">⏳</span>
                    <span class="empty-text">ยังไม่มีตัวเลือกคำตอบ หรือยังไม่ได้เปิดหน้ากระดานแข่งขัน</span>
                </div>
            `;
            return;
        }

        // คัดลอกและจัดเรียงตัวเลือกคำตอบตามคะแนน (Points) จากมากไปน้อย
        // คงค่า ans.index เดิมไว้เสมอเพื่อให้สัมพันธ์กับป้ายบนกระดานแข่งขัน (ansSlot_${ans.index})
        const sortedAnswers = [...answers].sort((a, b) => {
            const pA = parseInt(a.points, 10) || 0;
            const pB = parseInt(b.points, 10) || 0;
            return pB - pA;
        });

        list.innerHTML = sortedAnswers.map((ans, sortedRankIdx) => {
            // slotNum: หมายเลขป้ายบนกระดานแข่งขัน (ป้ายที่ 1, 2, 3...)
            const slotNum = (typeof ans.slotNumber === 'number') ? ans.slotNumber : (ans.index + 1);
            const rankNum = (typeof ans.rank === 'number') ? ans.rank : (sortedRankIdx + 1);

            let statusClass = 'status-hidden';
            let statusText = `🔓 แตะเฉลยป้าย ${slotNum}`;
            let itemExtraClass = '';

            if (ans.isRevealed) {
                if (ans.isGray) {
                    statusClass = 'status-gray';
                    statusText = 'เฉลยสีเทา (+0)';
                    itemExtraClass = 'is-revealed is-revealed-gray';
                } else if (ans.teamSide === 'orange' || ans.teamSide === 'red') {
                    statusClass = 'status-red';
                    statusText = `✓ ทีมแดง (+${ans.points})`;
                    itemExtraClass = 'is-revealed revealed-by-red';
                } else if (ans.teamSide === 'blue') {
                    statusClass = 'status-blue';
                    statusText = `✓ ทีมน้ำเงิน (+${ans.points})`;
                    itemExtraClass = 'is-revealed revealed-by-blue';
                } else {
                    statusClass = 'status-revealed';
                    statusText = `✓ เปิดแล้ว (+${ans.points})`;
                    itemExtraClass = 'is-revealed';
                }
            }

            const clickAttr = ans.isRevealed
                ? `title="ป้ายที่ ${slotNum} เปิดบนกระดานแข่งขันแล้ว"`
                : `onclick="remoteController.revealAnswer(${ans.index}, ${ans.points})" title="แตะเพื่อเฉลยป้ายที่ ${slotNum} (${ans.points} คะแนน) บนกระดานแข่งขัน"`;

            return `
                <div class="remote-ans-item ${itemExtraClass}" ${clickAttr}>
                    <div class="ans-board-card-badge" title="ป้ายที่ ${slotNum} บนกระดานแข่งขัน">
                        <span class="board-card-label">ป้าย</span>
                        <span class="board-card-num">${slotNum}</span>
                    </div>
                    <div class="ans-content-col">
                        <div class="ans-rank-row">
                            <span class="ans-rank-pill">อันดับ ${rankNum}</span>
                            <span class="ans-points-pill">💰 ${ans.points} คะแนน</span>
                        </div>
                        <div class="ans-text-preview" title="${ans.text}">${ans.text}</div>
                    </div>
                    <div class="ans-action-col">
                        <div class="ans-status-btn ${statusClass}">
                            ${statusText}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render Strikes
    function renderStrikes(strikes) {
        const btn1 = document.getElementById('remoteStrike1');
        const btn2 = document.getElementById('remoteStrike2');
        const btn3 = document.getElementById('remoteStrike3');

        if (btn1) btn1.classList.toggle('is-struck', !!strikes[0]);
        if (btn2) btn2.classList.toggle('is-struck', !!strikes[1]);
        if (btn3) btn3.classList.toggle('is-struck', !!strikes[2]);
    }

    // Render Steal Controls (2 ขั้นตอน: 1. กดยืนยันเปลี่ยนทีมขโมยคะแนน -> 2. แสดงปุ่มผลการตอบ)
    function renderStealControls(state) {
        const container = document.getElementById('remoteStealContainer');
        const confirmBox = document.getElementById('remoteStealConfirmBox');
        const outcomeBox = document.getElementById('remoteStealBox');
        const confirmDesc = document.getElementById('stealConfirmDesc');
        const btnConfirmText = document.getElementById('btnConfirmStealText');
        const bannerTxt = document.getElementById('remoteStealTxt');
        if (!container || !confirmBox || !outcomeBox) return;

        const stealStrikeBox = document.getElementById('remoteStealStrikeBox');

        // หากรอบนี้จบการแข่งขันหรือมอบคะแนนแล้ว ไม่ต้องแสดงกล่องขโมยคะแนน
        if (state.hasAwardedThisRound || state.pendingRoundResult) {
            container.style.display = 'none';
            confirmBox.style.display = 'none';
            outcomeBox.style.display = 'none';
            if (stealStrikeBox) stealStrikeBox.style.display = 'none';
            return;
        }

        if (stealStrikeBox) {
            stealStrikeBox.style.display = state.isStealPhase ? 'block' : 'none';
        }

        const strikes = state.strikes || [false, false, false];
        const struckCount = strikes.filter(Boolean).length;
        const isStealModalOpen = !!(state.modals && state.modals.stealTurn);
        const has3Strikes = (struckCount === 3);

        // หาฝั่งที่ได้สิทธิ์ขโมยคะแนน (ทีมคู่แข่งของทีมที่เริ่มตอบ)
        const stealingSide = state.stealingSide || (state.initialTurn === 'blue' ? 'orange' : 'blue');
        const stealingTeam = (stealingSide === 'blue') ? state.teamA : state.teamB;
        const failedTeam = (stealingSide === 'blue') ? state.teamB : state.teamA;
        const stealingTeamName = stealingTeam ? stealingTeam.name : (stealingSide === 'blue' ? 'ทีมฝั่งซ้าย (Blue)' : 'ทีมฝั่งขวา (Orange)');
        const failedTeamName = failedTeam ? failedTeam.name : 'ทีมตอบคำถาม';

        if (state.isStealPhase) {
            // ขั้นที่ 2: อยู่ในสถานะขโมยคะแนนแล้ว -> แสดงปุ่มผลการตอบ (ขโมยสำเร็จ / ไม่สำเร็จ)
            container.style.display = 'flex';
            confirmBox.style.display = 'none';
            outcomeBox.style.display = 'flex';

            if (bannerTxt) {
                bannerTxt.innerHTML = `⚔️ สิทธิ์ขโมยคะแนน: <strong>${stealingTeamName}</strong> (${state.bankScore || 0} คะแนน)`;
            }
        } else if (has3Strikes || isStealModalOpen) {
            // ขั้นที่ 1: ตอบคำถามผิดครบ 3 ครั้ง -> แสดงปุ่มกดยืนยันการเปลี่ยนทีมเพื่อขโมยคะแนน
            container.style.display = 'flex';
            confirmBox.style.display = 'flex';
            outcomeBox.style.display = 'none';

            if (confirmDesc) {
                confirmDesc.innerHTML = `<strong>${failedTeamName}</strong> ตอบผิดครบ 3 ครั้ง — สิทธิ์ตกเป็นของ <strong>${stealingTeamName}</strong>`;
            }
            if (btnConfirmText) {
                btnConfirmText.textContent = `กดยืนยันการเปลี่ยนทีม (${stealingTeamName}) เพื่อขโมยคะแนน ❯`;
            }
        } else {
            // ซ่อนเมื่อไม่ได้อยู่ในสถานะ 3 ครั้ง หรือขโมยคะแนน
            container.style.display = 'none';
            confirmBox.style.display = 'none';
            outcomeBox.style.display = 'none';
        }
    }

    // Render Turn Picker (Face-off: เลือกทีมที่ได้สิทธิ์ตอบคำถาม)
    function renderTurnPicker(state) {
        const card = document.getElementById('remoteTurnPickerCard');
        const pickNameBlue = document.getElementById('pickNameBlueRemote');
        const pickNameOrange = document.getElementById('pickNameOrangeRemote');
        if (!card) return;

        // แสดงเมื่อจอหลักกำลังเปิด Modal เลือกสิทธิ์การตอบคำถาม (Face-off)
        // หรือเมื่ออยู่ใน Stage 'game' และยังไม่มีการกำหนดผู้เริ่มตอบในข้อนี้
        const isTurnPickerActive = !!(
            (state.modals && state.modals.turnPicker) ||
            (state.stage === 'game' && !state.initialTurn)
        );

        if (isTurnPickerActive) {
            card.style.display = 'block';
            if (pickNameBlue) {
                pickNameBlue.textContent = state.teamA ? state.teamA.name : 'ทีมฝั่งซ้าย (Blue)';
            }
            if (pickNameOrange) {
                pickNameOrange.textContent = state.teamB ? state.teamB.name : 'ทีมฝั่งขวา (Orange)';
            }
        } else {
            card.style.display = 'none';
        }
    }

    // Render Round Summary Trigger Button
    function renderSummaryButton(state) {
        const box = document.getElementById('remoteSummaryTriggerBox');
        if (!box) return;

        // Show when pending round result is true or roundSummaryBar is open
        const shouldShow = state.pendingRoundResult || (state.modals && state.modals.roundSummaryBar);
        box.style.display = shouldShow ? 'block' : 'none';
    }

    // ========================================================
    // DATABASE TABLES CONNECTOR (crsdg_nameteam, crsdg_team, crsdg_member, crsdg_quiz)
    // ========================================================
    function getDatabaseTeams() {
        // ใช้ข้อมูลจากตาราง crsdg_team (ร่วมกับ crsdg_nameteam & crsdg_member) สำหรับการแข่งขันเกม 4 ต่อ 4
        if (typeof window.stateManager !== 'undefined' && typeof window.stateManager.getTeamsWithDetails === 'function') {
            try {
                const detailed = window.stateManager.getTeamsWithDetails();
                if (detailed && detailed.length > 0) {
                    const onlineTeams = detailed.filter(t => t.status !== 'offline');
                    const targetList = (onlineTeams.length > 0) ? onlineTeams : detailed;
                    return targetList.map(t => {
                        const capObj = t.captain;
                        const capName = capObj ? (capObj.EmpName || capObj.name || t.captainName || 'ยังไม่ระบุ') : 'ยังไม่ระบุหัวหน้าทีม';
                        return {
                            id: t.id,
                            name: t.name,
                            department: t.department || '',
                            captain: capName,
                            captainData: capObj,
                            members: (t.members || []).map(m => m.EmpName || m.name || m),
                            color: t.color || '#3b82f6',
                            status: t.status || 'online'
                        };
                    });
                }
            } catch (e) {
                console.warn('Error reading teams from crsdg_team in remote_crsdg.js:', e);
            }
        }

        try {
            const rawNames = localStorage.getItem('crsdg_nameteam');
            if (rawNames) {
                const teams = JSON.parse(rawNames);
                if (Array.isArray(teams) && teams.length > 0) {
                    return teams.map(t => ({
                        id: t.id,
                        name: t.name,
                        department: t.department || '',
                        captain: t.captain || 'ยังไม่ระบุ',
                        members: t.members || [],
                        color: t.color || '#3b82f6',
                        status: t.status || 'online'
                    }));
                }
            }
        } catch (e) {}

        // Fallback default teams
        return [
            { id: 'team_it', name: 'IT Dragons', department: 'ฝ่ายเทคโนโลยีสารสนเทศ (IT & Cloud)', captain: 'คุณสมชาย วงศ์สวัสดิ์', members: ['คุณธีรเดช', 'คุณวรวิทย์', 'คุณเอกชัย'], color: '#3b82f6', status: 'online' },
            { id: 'team_mkt', name: 'Marketing Fire', department: 'ฝ่ายการตลาดและการสื่อสาร (Marketing)', captain: 'คุณกนกวรรณ จิตต์เที่ยง', members: ['คุณลลิตา', 'คุณเบญจมาศ', 'คุณนิภาวรรณ'], color: '#f97316', status: 'online' },
            { id: 'team_fin', name: 'Finance Hawks', department: 'ฝ่ายการเงินและบัญชี (Finance)', captain: 'คุณปิยะพร รัตนวงศ์', members: ['คุณสุรศักดิ์', 'คุณชลิตา', 'คุณณัฐพล'], color: '#10b981', status: 'online' },
            { id: 'team_sales', name: 'Sales & BD Thunder', department: 'ฝ่ายขายและพัฒนาธุรกิจ (Sales & BD)', captain: 'คุณอรรถพล กุลบุตร', members: ['คุณศิริพร', 'คุณกิตติศักดิ์', 'คุณปวีณา'], color: '#eab308', status: 'online' },
            { id: 'team_hr', name: 'HR Superstars', department: 'ฝ่ายทรัพยากรบุคคล (HR & People)', captain: 'คุณรุสนานี วาหะมะ', members: ['คุณปรียานุช', 'คุณธนภรณ์', 'คุณกมลฉัตร'], color: '#a855f7', status: 'online' },
            { id: 'team_rnd', name: 'AI & Data Titans', department: 'ฝ่ายวิจัยและพัฒนา AI (R&D)', captain: 'คุณจีรวรรณ์ ประจงมูล', members: ['คุณอนุชา', 'คุณวิภาดา', 'คุณพงศกร'], color: '#06b6d4', status: 'online' }
        ];
    }

    function getDatabaseQuizzes() {
        if (typeof window.stateManager !== 'undefined' && typeof window.stateManager.getQuizzes === 'function') {
            try {
                const list = window.stateManager.getQuizzes();
                if (list && list.length > 0) return list;
            } catch (e) {}
        }

        try {
            const raw = localStorage.getItem('crsdg_quiz');
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list) && list.length > 0) return list;
            }
        } catch (e) {}

        return [
            {
                id: 'quiz_1',
                title: 'ของขวัญปีใหม่ยอดนิยมที่พนักงาน CRS DG อยากได้มากที่สุด',
                score: 100,
                maxAnswers: 4,
                answers: [
                    { id: 'ans_1_1', text: 'ทองคำ / สร้อยคอทองคำ', points: 40 },
                    { id: 'ans_1_2', text: 'เงินสด / โบนัสพิเศษ', points: 30 },
                    { id: 'ans_1_3', text: 'สมาร์ทโฟน iPhone / iPad', points: 20 },
                    { id: 'ans_1_4', text: 'แพ็กเกจท่องเที่ยว / ตั๋วเครื่องบิน', points: 10 }
                ]
            },
            {
                id: 'quiz_2',
                title: 'กิจกรรมยอดฮิตในงานปาร์ตี้เลี้ยงส่งท้ายปีเก่าต้อนรับปีใหม่',
                score: 100,
                maxAnswers: 4,
                answers: [
                    { id: 'ans_2_1', text: 'จับฉลากสุ่มรางวัล Lucky Draw', points: 45 },
                    { id: 'ans_2_2', text: 'ร้องเพลงคาราโอเกะ / เต้นโชว์', points: 25 },
                    { id: 'ans_2_3', text: 'เล่นเกมแข่งขันชิงของรางวัล', points: 20 },
                    { id: 'ans_2_4', text: 'รับประทานบุฟเฟ่ต์ร่วมกัน', points: 10 }
                ]
            }
        ];
    }

    function getEliminatedTeamIdsLocal() {
        try {
            const raw = localStorage.getItem('crsdg_eliminated_teams');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function getUsedQuizIdsLocal() {
        try {
            const raw = localStorage.getItem('crsdg_used_quizzes');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    // Render Arena Selectors & Teams Database Table
    function renderArenaPanel(state) {
        const selectLeft = document.getElementById('arenaSelectLeft');
        const selectRight = document.getElementById('arenaSelectRight');
        const tableContainer = document.getElementById('remoteTeamsTableContainer');
        const countBadge = document.getElementById('teamsDbCountBadge');

        // Always get available teams from state, or fallback to database/localStorage
        const teams = (state && state.allTeams && state.allTeams.length > 0) ? state.allTeams : getDatabaseTeams();
        const elimSet = new Set((state && state.eliminatedTeamIds) || getEliminatedTeamIdsLocal());
        const selectedLeftId = (state && state.selectedTeamALeft) || (teams[0] ? teams[0].id : '');
        const selectedRightId = (state && state.selectedTeamBRight) || (teams[1] ? teams[1].id : (teams[0] ? teams[0].id : ''));

        if (countBadge) {
            countBadge.textContent = `พบ ${teams.length} ทีมในตารางข้อมูล`;
        }

        if (selectLeft) {
            if (teams.length === 0) {
                selectLeft.innerHTML = '<option value="">-- ไม่พบทีมแข่งขันในระบบ --</option>';
            } else {
                selectLeft.innerHTML = teams.map(t => {
                    const isElim = elimSet.has(t.id);
                    const isSelected = (t.id === selectedLeftId);
                    return `<option value="${t.id}" ${isSelected ? 'selected' : ''} ${isElim ? 'disabled style="color:#ef4444;"' : ''}>
                        ${t.name} ${t.department ? ' (' + t.department + ')' : ''} ${isElim ? ' [ตกรอบ]' : ''}
                    </option>`;
                }).join('');
                if (selectedLeftId) selectLeft.value = selectedLeftId;
            }
        }

        if (selectRight) {
            if (teams.length === 0) {
                selectRight.innerHTML = '<option value="">-- ไม่พบทีมแข่งขันในระบบ --</option>';
            } else {
                selectRight.innerHTML = teams.map(t => {
                    const isElim = elimSet.has(t.id);
                    const isSelected = (t.id === selectedRightId);
                    return `<option value="${t.id}" ${isSelected ? 'selected' : ''} ${isElim ? 'disabled style="color:#ef4444;"' : ''}>
                        ${t.name} ${t.department ? ' (' + t.department + ')' : ''} ${isElim ? ' [ตกรอบ]' : ''}
                    </option>`;
                }).join('');
                if (selectedRightId) selectRight.value = selectedRightId;
            }
        }

        // Render Teams Database Cards / Roster Grid
        if (tableContainer) {
            tableContainer.innerHTML = teams.map(t => {
                const isElim = elimSet.has(t.id);
                const isLeft = (t.id === selectedLeftId);
                const isRight = (t.id === selectedRightId);
                const color = t.color || '#3b82f6';
                const membersStr = (Array.isArray(t.members) && t.members.length > 0) ? t.members.join(', ') : (typeof t.members === 'string' && t.members ? t.members : 'ไม่มีสมาชิก');

                let cardClass = 'remote-team-db-card';
                if (isLeft) cardClass += ' is-selected-blue';
                if (isRight) cardClass += ' is-selected-orange';
                if (isElim) cardClass += ' is-eliminated';

                return `
                    <div class="${cardClass}">
                        <div class="db-team-header">
                            <div class="db-team-title-group">
                                <span class="db-team-color-indicator" style="background:${color};"></span>
                                <span class="db-team-name">${t.name}</span>
                            </div>
                            <span class="db-team-status-tag ${isElim ? 'status-eliminated' : 'status-ready'}">
                                ${isElim ? 'ตกรอบ' : (isLeft ? '🔵 ทีมฝั่งซ้าย' : (isRight ? '🟠 ทีมฝั่งขวา' : '🟢 พร้อมแข่ง'))}
                            </span>
                        </div>
                        <div class="db-team-dept">${t.department || 'ไม่ระบุแผนก/สังกัด'}</div>
                        <div class="db-team-meta-row">
                            <span>👑 หัวหน้า: <strong>${t.captain || 'ยังไม่ระบุ'}</strong></span>
                            <span>👥 สมาชิก: ${membersStr}</span>
                        </div>
                        <div class="db-team-actions-row">
                            <button type="button" class="btn-pick-side btn-pick-side-blue"
                                onclick="remoteController.selectTeamLeft('${t.id}')"
                                ${isElim ? 'disabled' : ''}>
                                ${isLeft ? '✓ เป็นทีมซ้ายแล้ว' : '🔵 เลือกเป็นทีมซ้าย'}
                            </button>
                            <button type="button" class="btn-pick-side btn-pick-side-orange"
                                onclick="remoteController.selectTeamRight('${t.id}')"
                                ${isElim ? 'disabled' : ''}>
                                ${isRight ? '✓ เป็นทีมขวาแล้ว' : '🟠 เลือกเป็นทีมขวา'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Render Quiz Panel
    function renderQuizPanel(state) {
        const list = document.getElementById('remoteQuizItemsList');
        if (!list) return;

        const quizzes = (state && state.allQuizzes && state.allQuizzes.length > 0) ? state.allQuizzes : getDatabaseQuizzes();
        const usedSet = new Set((state && state.usedQuizIds) || getUsedQuizIdsLocal());
        const selectedId = (state && state.selectedQuizId) || null;

        // อัปเดตสถานะปุ่มเริ่มแข่งขัน (แถวที่ 2: หากยังไม่เลือกคำถาม ให้ disabled ปุ่ม เริ่มแข่งขัน)
        const btnStart = document.getElementById('btnStartGameAction');
        const hasValidSelectedQuiz = !!(selectedId && !usedSet.has(selectedId));
        if (btnStart) {
            btnStart.disabled = !hasValidSelectedQuiz;
            btnStart.title = hasValidSelectedQuiz ? 'เริ่มการแข่งขันข้อนี้ทันที' : 'กรุณาเลือกหรือสุ่มชุดคำถามก่อนเริ่มการแข่งขัน';
        }

        if (quizzes.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 16px;">ยังไม่มีชุดคำถามในระบบ</div>`;
            return;
        }

        list.innerHTML = quizzes.map((q, idx) => {
            const isUsed = usedSet.has(q.id);
            const isSelected = (q.id === selectedId);
            return `
                <div class="remote-quiz-item ${isUsed ? 'is-used' : ''} ${isSelected ? 'is-selected' : ''}" 
                     onclick="remoteController.selectQuiz('${q.id}')">
                    <div class="quiz-item-top">
                        <span style="color:#ffd700; font-weight:700;">ชุดที่ ${idx + 1}</span>
                        <span style="color:${isUsed ? '#94a3b8' : (isSelected ? '#34d399' : '#00e5ff')};">
                            ${isUsed ? '🔒 ถูกเลือกแล้ว' : (isSelected ? '✓ เลือกชุดนี้แล้ว' : 'พร้อมแข่งขัน')}
                        </span>
                    </div>
                    ${q.category ? `<div style="font-size:0.75rem; color:#38bdf8; font-weight:500; margin-bottom:2px;">🏷️ ${q.category}</div>` : ''}
                    <div class="quiz-item-title">${q.title}</div>
                    <div style="font-size:0.75rem; color:rgba(255,255,255,0.6); margin-top:2px;">
                        📋 ${(q.answers || []).length} คำตอบ • คะแนนเต็ม ${q.score || 100} คะแนน
                    </div>
                </div>
            `;
        }).join('');
    }

    // Public Remote Controller API
    window.remoteController = {
        // Navigation & Stage
        switchTab: switchTab,
        restartGameHome: () => {
            triggerHaptic(40);
            // สั่งให้หน้าจอ game.html รีเซ็ตและกลับสู่หน้าเริ่มต้น
            sendCommand('RESTART_GAME_HOME', {}, true);

            // รีเซ็ตสถานะภายในของรีโมตให้สอดคล้องกันทันที
            if (latestGameState) {
                latestGameState.stage = 'home';
                latestGameState.isGameStarted = false;
                latestGameState.blueScore = 0;
                latestGameState.orangeScore = 0;
                latestGameState.bankScore = 0;
                latestGameState.strikes = [false, false, false];
                latestGameState.isStealPhase = false;
                latestGameState.currentQuiz = null;
                latestGameState.selectedQuizId = null;
                latestGameState.selectedTeamALeft = null;
                latestGameState.selectedTeamBRight = null;
                if (latestGameState.modals) {
                    Object.keys(latestGameState.modals).forEach(k => { latestGameState.modals[k] = false; });
                }
            } else {
                latestGameState = { stage: 'home', isGameStarted: false };
            }
            previousStage = 'home';
            currentSelectedTab = 'arena';
            isUserManuallySwitchedTab = false;

            // ล็อคทั้ง 3 คอลัมน์ และแสดง lightbox เริ่มการแข่งขัน
            disableAllThreeColumns();
            const introModal = document.getElementById('remoteStartIntroModal');
            if (introModal) introModal.style.display = 'flex';
            renderRemoteUI(latestGameState);
        },
        clickStartCompetition: () => {
            // สั่งให้หน้า game ทำการกดปุ่มเริ่มการแข่งขัน
            sendCommand('CLICK_START_COMPETITION', {}, true);

            // ปิด lightbox บนรีโมต
            const modal = document.getElementById('remoteStartIntroModal');
            if (modal) modal.style.display = 'none';

            // ส่วนของ remote_crsdg ให้แสดงและเปิดใช้งานแถวที่ 1 (หน้าเลือกทีม)
            if (latestGameState) {
                latestGameState.stage = 'arena';
                latestGameState.isGameStarted = true;
            } else {
                latestGameState = { stage: 'arena', isGameStarted: true };
            }
            switchTab('arena_force', true);
            renderRemoteUI(latestGameState);
        },
        enterArenaStage: () => {
            window.remoteController.clickStartCompetition();
        },
        goToQuizSelect: () => {
            isUserManuallySwitchedTab = false;
            if (latestGameState) {
                latestGameState.isGameStarted = true;
                latestGameState.stage = 'quiz_select';
                latestGameState.selectedQuizId = null;
            } else {
                latestGameState = { stage: 'quiz_select', isGameStarted: true, selectedQuizId: null };
            }
            sendCommand('GO_TO_QUIZ_SELECT', {}, true);
            switchTab('quiz', true);
            renderRemoteUI(latestGameState);
        },
        backToArena: () => {
            sendCommand('BACK_TO_ARENA', {}, true);
            isUserManuallySwitchedTab = false;
            switchTab('arena', true);
            if (latestGameState) {
                latestGameState.stage = 'arena';
                renderRemoteUI(latestGameState);
            }
        },
        backToQuizSelect: () => {
            sendCommand('BACK_TO_QUIZ_SELECT', {}, true);
            isUserManuallySwitchedTab = false;
            switchTab('quiz', true);
            if (latestGameState) {
                latestGameState.stage = 'quiz_select';
                renderRemoteUI(latestGameState);
            }
        },

        // Arena
        selectTeamLeft: (id) => sendCommand('SELECT_TEAM_LEFT', { teamId: id }),
        selectTeamRight: (id) => sendCommand('SELECT_TEAM_RIGHT', { teamId: id }),
        randomTeams: () => sendCommand('RANDOM_TEAMS'),
        resetEliminated: () => sendCommand('RESET_ELIMINATED'),

        // Quiz Select
        selectQuiz: (id) => {
            if (latestGameState) {
                latestGameState.selectedQuizId = id;
                renderQuizPanel(latestGameState);
            }
            sendCommand('SELECT_QUIZ', { quizId: id }, true);
        },
        randomQuiz: () => sendCommand('RANDOM_QUIZ', {}, true),
        resetUsedQuizzes: () => {
            if (latestGameState) {
                latestGameState.selectedQuizId = null;
                latestGameState.usedQuizIds = [];
                renderQuizPanel(latestGameState);
            }
            sendCommand('RESET_USED_QUIZZES', {}, true);
        },
        startQuizGame: () => {
            const btnStart = document.getElementById('btnStartGameAction');
            if (btnStart && btnStart.disabled) return;
            const usedSet = new Set((latestGameState && latestGameState.usedQuizIds) || getUsedQuizIdsLocal());
            const selectedId = (latestGameState && latestGameState.selectedQuizId) || null;
            if (!selectedId || usedSet.has(selectedId)) return;

            sendCommand('START_QUIZ_GAME', {}, true);
            isUserManuallySwitchedTab = false;
            switchTab('game', true);
            const panelGame = document.getElementById('panelGame');
            if (panelGame) {
                const scrollEl = panelGame.querySelector('.col-inner-scroll');
                if (scrollEl) scrollEl.scrollTop = 0;
            }
            const card = document.getElementById('remoteTurnPickerCard');
            if (card) {
                card.style.display = 'block';
                if (latestGameState) {
                    const pBlue = document.getElementById('pickNameBlueRemote');
                    const pOrange = document.getElementById('pickNameOrangeRemote');
                    if (pBlue && latestGameState.teamA) pBlue.textContent = latestGameState.teamA.name;
                    if (pOrange && latestGameState.teamB) pOrange.textContent = latestGameState.teamB.name;
                }
            }
            if (latestGameState) {
                latestGameState.stage = 'game';
                latestGameState.isGameStarted = true;
                if (!latestGameState.modals) latestGameState.modals = {};
                latestGameState.modals.turnPicker = true;
                latestGameState.initialTurn = null;
                latestGameState.activeTurn = null;
                renderRemoteUI(latestGameState);
            }
        },

        // In-Game
        setActiveTurn: (side) => {
            sendCommand('SET_ACTIVE_TURN', { side });
            const card = document.getElementById('remoteTurnPickerCard');
            if (card) card.style.display = 'none';
            if (latestGameState) {
                latestGameState.activeTurn = side;
                if (!latestGameState.initialTurn) latestGameState.initialTurn = side;
                if (latestGameState.modals) latestGameState.modals.turnPicker = false;
                renderRemoteUI(latestGameState);
            }
        },
        chooseFirstTurn: (side) => {
            sendCommand('CHOOSE_FIRST_TURN', { side });
            const card = document.getElementById('remoteTurnPickerCard');
            if (card) card.style.display = 'none';
            if (latestGameState) {
                latestGameState.activeTurn = side;
                latestGameState.initialTurn = side;
                if (latestGameState.modals) latestGameState.modals.turnPicker = false;
                renderRemoteUI(latestGameState);
            }
        },
        openTurnPickerModal: () => {
            sendCommand('OPEN_TURN_PICKER_MODAL');
            const card = document.getElementById('remoteTurnPickerCard');
            if (card) {
                card.style.display = 'block';
                if (latestGameState) {
                    const pBlue = document.getElementById('pickNameBlueRemote');
                    const pOrange = document.getElementById('pickNameOrangeRemote');
                    if (pBlue && latestGameState.teamA) pBlue.textContent = latestGameState.teamA.name;
                    if (pOrange && latestGameState.teamB) pOrange.textContent = latestGameState.teamB.name;
                }
            }
        },
        adjustScore: (side, delta) => sendCommand('ADJUST_SCORE', { side, delta }),
        awardPoints: (side) => sendCommand('AWARD_POINTS', { side }),
        executeAward: () => sendCommand('EXECUTE_AWARD'),
        revealAnswer: (index, points) => sendCommand('REVEAL_ANSWER', { index, points }),
        revealAllAnswers: () => sendCommand('REVEAL_ALL'),
        toggleStrike: (strikeNum) => {
            sendCommand('TOGGLE_STRIKE', { strikeNum });
            if (latestGameState && Array.isArray(latestGameState.strikes)) {
                latestGameState.strikes[strikeNum - 1] = !latestGameState.strikes[strikeNum - 1];
                renderStrikes(latestGameState.strikes);
                renderStealControls(latestGameState);
            }
        },
        resetStrikes: () => {
            sendCommand('RESET_STRIKES');
            const container = document.getElementById('remoteStealContainer');
            if (container) container.style.display = 'none';
            if (latestGameState) {
                latestGameState.strikes = [false, false, false];
                latestGameState.isStealPhase = false;
                renderRemoteUI(latestGameState);
            }
        },

        // Steal Phase (ขั้นที่ 1: กดยืนยันเปลี่ยนทีมขโมยคะแนน -> ขั้นที่ 2: ปุ่มผลการตอบ)
        confirmStealTurn: () => {
            sendCommand('START_STEAL_PHASE');
            const confirmBox = document.getElementById('remoteStealConfirmBox');
            const outcomeBox = document.getElementById('remoteStealBox');
            if (confirmBox) confirmBox.style.display = 'none';
            if (outcomeBox) outcomeBox.style.display = 'flex';
            if (latestGameState) {
                latestGameState.isStealPhase = true;
                const stealingSide = latestGameState.stealingSide || (latestGameState.initialTurn === 'blue' ? 'orange' : 'blue');
                latestGameState.stealingSide = stealingSide;
                latestGameState.activeTurn = stealingSide;
                renderRemoteUI(latestGameState);
            }
        },
        startStealPhase: () => {
            window.remoteController.confirmStealTurn();
        },
        stealSuccess: () => {
            sendCommand('STEAL_SUCCESS');
            const container = document.getElementById('remoteStealContainer');
            if (container) container.style.display = 'none';
            if (latestGameState) {
                latestGameState.isStealPhase = false;
                latestGameState.hasAwardedThisRound = true;
                latestGameState.pendingRoundResult = true;
                renderRemoteUI(latestGameState);
            }
        },
        stealFailed: () => {
            sendCommand('STEAL_FAILED');
            const container = document.getElementById('remoteStealContainer');
            if (container) container.style.display = 'none';
            if (latestGameState) {
                latestGameState.isStealPhase = false;
                latestGameState.hasAwardedThisRound = true;
                latestGameState.pendingRoundResult = true;
                renderRemoteUI(latestGameState);
            }
        },

        // Summary & Progression
        triggerRoundSummary: () => sendCommand('TRIGGER_ROUND_SUMMARY', {}, true),
        proceedIntermission: () => {
            sendCommand('PROCEED_INTERMISSION', {}, true);
            isUserManuallySwitchedTab = false;
            switchTab('quiz', true);
            if (latestGameState) {
                latestGameState.isGameStarted = true;
                latestGameState.stage = 'quiz_select';
                latestGameState.selectedQuizId = null;
                renderRemoteUI(latestGameState);
            }
        },
        confirmMatchWinner: () => {
            sendCommand('CONFIRM_MATCH_WINNER', {}, true);
            sendCommand('CLOSE_MODAL', {}, true);
            isUserManuallySwitchedTab = false;
            switchTab('arena', true);
            if (latestGameState) {
                latestGameState.stage = 'arena';
                if (latestGameState.modals) {
                    latestGameState.modals.matchResult = false;
                    latestGameState.modals.intermission = false;
                }
                renderRemoteUI(latestGameState);
            }
        },
        closeModal: () => sendCommand('CLOSE_MODAL', {}, true),

        // System Tools
        toggleMute: () => sendCommand('TOGGLE_MUTE'),
        toggleFullscreen: () => {
            try {
                const doc = document;
                const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
                if (!isFs) {
                    const el = doc.documentElement;
                    if (el.requestFullscreen) {
                        el.requestFullscreen().catch(err => console.warn('Fullscreen request failed:', err));
                    } else if (el.webkitRequestFullscreen) {
                        el.webkitRequestFullscreen();
                    } else if (el.mozRequestFullScreen) {
                        el.mozRequestFullScreen();
                    } else if (el.msRequestFullscreen) {
                        el.msRequestFullscreen();
                    }
                } else {
                    if (doc.exitFullscreen) {
                        doc.exitFullscreen().catch(err => console.warn('Exit fullscreen failed:', err));
                    } else if (doc.webkitExitFullscreen) {
                        doc.webkitExitFullscreen();
                    } else if (doc.mozCancelFullScreen) {
                        doc.mozCancelFullScreen();
                    } else if (doc.msExitFullscreen) {
                        doc.msExitFullscreen();
                    }
                }
            } catch (err) {
                console.warn('Local toggleFullscreen error:', err);
            }
            sendCommand('TOGGLE_FULLSCREEN', {}, true);
        },
        playClick: () => sendCommand('PLAY_CLICK'),
        playBuzzer: () => sendCommand('PLAY_BUZZER'),
        playWin: () => sendCommand('PLAY_WIN'),
        requestState: requestGameState,
        openMainScreen: () => {
            window.open('game.html', 'crsdg_main_game');
            setTimeout(requestGameState, 400);
        }
    };

    // Heartbeat check every 3s
    setInterval(() => {
        const now = Date.now();
        // หากไม่ได้รับสัญญาณจากจอหลักเกิน 12 วินาที จึงจะแสดงสถานะออฟไลน์
        if (lastHeartbeatTime > 0 && now - lastHeartbeatTime > 12000) {
            updateConnectionStatus(false);
            requestGameState();
        }
    }, 3000);

    // Synchronize Fullscreen button and icon on remote_crsdg
    function updateLocalFullscreenUI() {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        const topBtnFs = document.getElementById('topBtnFullscreen');
        const topFsIcon = document.getElementById('topFsIcon');
        if (topBtnFs) {
            topBtnFs.classList.toggle('is-fullscreen', isFs);
            topBtnFs.title = isFs ? 'ออกจากเต็มจอ (Exit Fullscreen)' : 'เปิดเต็มจอ (Fullscreen)';
        }
        if (topFsIcon) {
            topFsIcon.textContent = isFs ? '🗗' : '⛶';
        }
    }

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
        document.addEventListener(evt, updateLocalFullscreenUI);
    });

    // Initial load sync
    document.addEventListener('DOMContentLoaded', () => {
        updateLocalFullscreenUI();
        // เริ่มต้น: ตรวจสอบสถานะ หากเกมยังไม่เริ่ม ให้ disabled ทั้ง 3 แถว และแสดง lightbox เริ่มการแข่งขัน
        disableAllThreeColumns();
        const introModal = document.getElementById('remoteStartIntroModal');
        if (introModal) introModal.style.display = 'flex';

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => {
                if (latestGameState && latestGameState.isGameStarted && latestGameState.stage !== 'home') {
                    switchTab(currentSelectedTab || 'arena', false);
                } else {
                    disableAllThreeColumns();
                }
            });
        }

        // Render from database immediately so team dropdowns and quiz list are NEVER blank
        renderArenaPanel(latestGameState);
        renderQuizPanel(latestGameState);

        // Try reading cached state from localStorage only if fresh (< 8s) and not closed
        try {
            const raw = localStorage.getItem('crsdg_game_state_sync');
            if (raw) {
                const cached = JSON.parse(raw);
                const now = Date.now();
                if (!cached.isClosed && cached.timestamp && (now - cached.timestamp < 8000)) {
                    latestGameState = cached;
                    renderRemoteUI(cached);
                }
            }
        } catch (e) {}

        requestGameState();
        setTimeout(requestGameState, 400);
        setTimeout(requestGameState, 1200);
    });

})();

