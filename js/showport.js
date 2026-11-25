/**
 * ========================================================
 * SHOWPORT.JS - นักลงทุน AI แดชบอร์ดสรุปผลพอร์ตการลงทุน (showport.html)
 * ระบบเปรียบเทียบพอร์ตการลงทุน 2 ทีมแบบประกบคู่ (50% / 50%)
 * ========================================================
 */

(function () {
    'use strict';

    // Current State for Single Team Focus Dashboard
    let selectedTeamId = null;
    let allPlayersList = [];
    let state = null;

    // Helper: Format Number with commas
    function fmtNum(n) {
        return (parseFloat(n) || 0).toLocaleString();
    }

    // Helper: Compact currency representation (e.g. 2.7M, 500K)
    function fmtCompactMoney(val) {
        const num = parseFloat(val) || 0;
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K';
        }
        return num.toLocaleString();
    }

    // Helper: Escape HTML
    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Initialize Page
    function init() {
        state = window.stateManager || (typeof StateManager !== 'undefined' ? new StateManager() : null);
        if (!state) {
            console.error('[Showport] StateManager not found');
            return;
        }

        setupNavigationControls();
        renderDashboard();
        setupRealtimeListeners();
    }

    // Throttled Dashboard Render (120ms trailing batch + rAF) เพื่อความลื่นไหล รองรับผู้ใช้งาน 300 คนส่งพอร์ตพร้อมกันโดยไม่กระตุก
    let renderDashboardTimer = null;
    let renderDashboardRaf = null;
    function renderDashboardThrottled() {
        if (renderDashboardTimer) return;
        renderDashboardTimer = setTimeout(() => {
            renderDashboardTimer = null;
            if (renderDashboardRaf) cancelAnimationFrame(renderDashboardRaf);
            renderDashboardRaf = requestAnimationFrame(() => {
                renderDashboardRaf = null;
                renderDashboard();
            });
        }, 120);
    }

    // ========================================================
    // REALTIME LISTENERS: ตรวจสอบและอัปเดตการลงทุนตามทีมที่เลือกแบบ Realtime
    // ========================================================
    function setupRealtimeListeners() {
        console.log('[Showport] Activating Real-time investment sync...');

        // 1. Firebase Firestore onSnapshot สำหรับ crsdg_investments (Cloud Realtime)
        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.listenToUserInvestments === 'function') {
            FirebaseSync.listenToUserInvestments(() => {
                renderDashboardThrottled();
            });
        } else if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                const db = firebase.firestore();
                db.collection('crsdg_investments').onSnapshot(snapshot => {
                    const userInvMap = {};
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
                    if (state && typeof state.applyCloudUserInvestments === 'function') {
                        state.applyCloudUserInvestments(userInvMap);
                    }
                    renderDashboardThrottled();
                }, err => console.warn('[Showport] Firestore investments onSnapshot notice:', err.message));
            } catch (e) {
                console.warn('[Showport] Firestore onSnapshot init notice:', e);
            }
        }

        // 2. FirebaseSync Event Bus (PLAYERS_UPDATED, VOTE_SETTINGS_UPDATED, MEMBERS_UPDATED)
        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.subscribe === 'function') {
            FirebaseSync.subscribe((type) => {
                if (['INVESTMENTS_UPDATED', 'PLAYERS_UPDATED', 'VOTE_SETTINGS_UPDATED', 'MEMBERS_UPDATED'].includes(type)) {
                    renderDashboardThrottled();
                }
            });
        }

        // 3. Local StateManager BroadcastChannel / Events (Cross-tab sync บนเครื่องเดียวกัน)
        if (state && typeof state.subscribe === 'function') {
            state.subscribe((msg) => {
                if (['INVESTMENTS_UPDATED', 'PLAYERS_UPDATED', 'TEAMS_UPDATED', 'VOTE_STATUS_UPDATED', 'MEMBERS_UPDATED'].includes(msg.type)) {
                    renderDashboardThrottled();
                }
            });
        }

        // 4. Window Storage Event (ตรวจจับการเปลี่ยนแปลงใน localStorage ข้ามหน้าต่าง)
        window.addEventListener('storage', (e) => {
            if (['crsdg_all_user_investments', 'crsdg_player', 'crsdg_vote_status', 'crsdg_members_v2'].includes(e.key)) {
                renderDashboardThrottled();
            }
        });
    }

    // Top Navigation Controls (Refresh, Theme, Fullscreen)
    function setupNavigationControls() {
        const btnRefresh = document.getElementById('btnRefresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', async () => {
                btnRefresh.classList.add('rotating');
                if (typeof FirebaseSync !== 'undefined') {
                    try {
                        if (typeof FirebaseSync.fetchVoteSettingsFromCloud === 'function') await FirebaseSync.fetchVoteSettingsFromCloud();
                        if (typeof FirebaseSync.fetchUserInvestmentsFromCloud === 'function') await FirebaseSync.fetchUserInvestmentsFromCloud();
                        if (typeof FirebaseSync.fetchPlayersFromCloud === 'function') await FirebaseSync.fetchPlayersFromCloud();
                        if (typeof FirebaseSync.fetchMembersFromCloud === 'function') await FirebaseSync.fetchMembersFromCloud();
                    } catch (e) {
                        console.warn(e);
                    }
                }
                renderDashboard();
                setTimeout(() => btnRefresh.classList.remove('rotating'), 600);
            });
        }

        const btnThemeToggle = document.getElementById('btnThemeToggle');
        if (btnThemeToggle) {
            btnThemeToggle.addEventListener('click', () => {
                document.body.classList.toggle('light-theme');
            });
        }

        const btnFullscreen = document.getElementById('btnFullscreen');
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else {
                    document.exitFullscreen().catch(() => {});
                }
            });
        }

        // 4. ปุ่มประกาศผลพอร์ตการลงทุน AI -> แสดง Lightbox ยืนยันการปิดรับการลงทุน AI ก่อนเข้าสู่หน้าประกาศผล
        const btnAnnounceResult = document.getElementById('btnAnnounceResult');
        if (btnAnnounceResult) {
            btnAnnounceResult.addEventListener('click', () => {
                openConfirmCloseInvestmentModal();
            });
        }

        // ปุ่มยกเลิกใน Lightbox ยืนยัน (ปิด lightbox)
        const btnCancelCloseInvestment = document.getElementById('btnCancelCloseInvestment');
        if (btnCancelCloseInvestment) {
            btnCancelCloseInvestment.addEventListener('click', () => {
                closeConfirmCloseInvestmentModal();
            });
        }

        // ปุ่มยืนยันใน Lightbox ยืนยัน (สั่งปิดระบบการลงทุน ปิด lightbox และเปิดหน้าต่างประกาศผล)
        const btnConfirmCloseInvestment = document.getElementById('btnConfirmCloseInvestment');
        if (btnConfirmCloseInvestment) {
            btnConfirmCloseInvestment.addEventListener('click', () => {
                closeConfirmCloseInvestmentModal();
                openAnnounceResultModal();
            });
        }

        // คลิกพื้นหลัง Lightbox ยืนยันเพื่อยกเลิก
        const confirmCloseModal = document.getElementById('confirmCloseInvestmentModal');
        if (confirmCloseModal) {
            confirmCloseModal.addEventListener('click', (e) => {
                if (e.target === confirmCloseModal) {
                    closeConfirmCloseInvestmentModal();
                }
            });
        }

        // 5. ปุ่มปิดหน้าต่าง Lightbox ประกาศผล (ทั้ง Stage 1 และ Stage 2)
        const btnCloseAnnounceModal = document.getElementById('btnCloseAnnounceModal');
        if (btnCloseAnnounceModal) {
            btnCloseAnnounceModal.addEventListener('click', () => {
                closeAnnounceResultModal();
            });
        }

        // ปุ่มจุดพลุเฉลิมฉลอง (คลิกเพื่อจุดพลุเพิ่ม)
        const btnTriggerFireworks = document.getElementById('btnTriggerFireworks');
        if (btnTriggerFireworks) {
            btnTriggerFireworks.addEventListener('click', (e) => {
                e.preventDefault();
                triggerFireworksCelebration();
            });
        }

        // ปุ่มเริ่มประกาศผลอันดับทีละขั้น (อันดับ 6 -> 5 -> 4 -> 3 -> 2 & 1)
        const btnStartRankReveal = document.getElementById('btnStartRankReveal');
        if (btnStartRankReveal) {
            btnStartRankReveal.addEventListener('click', (e) => {
                e.preventDefault();
                handleStartRankRevealClick();
            });
        }

        const btnSkipRankReveal = document.getElementById('btnSkipRankReveal');
        if (btnSkipRankReveal) {
            btnSkipRankReveal.addEventListener('click', (e) => {
                e.preventDefault();
                skipRankRevealAnimation();
            });
        }

        const announcePodiumContainer = document.getElementById('announcePodiumContainer');
        if (announcePodiumContainer) {
            announcePodiumContainer.addEventListener('click', () => {
                // หากคลิกที่แท่นประกาศผลขณะรอลุ้นผล ให้เริ่มการประกาศผลทันที
                if (!_isRevealingRanks && _ranksRevealedSet.size < 3) {
                    handleStartRankRevealClick();
                }
            });
        }

        const btnCloseAnnounceWinners = document.getElementById('btnCloseAnnounceWinners');
        if (btnCloseAnnounceWinners) {
            btnCloseAnnounceWinners.addEventListener('click', () => {
                closeAnnounceResultModal();
            });
        }

        // 6. ปุ่มเปลี่ยนหน้าจอ: "🏆 ประกาศผลการแข่งขัน" (Stage 1 -> Stage 2)
        const btnGotoCompetitionAnnounce = document.getElementById('btnGotoCompetitionAnnounce');
        if (btnGotoCompetitionAnnounce) {
            btnGotoCompetitionAnnounce.addEventListener('click', () => {
                switchToWinnersStage();
            });
        }

        // 7. ปุ่มสลับกลับ: "← ดูสรุปผลการเข้าร่วมกิจกรรม" (Stage 2 -> Stage 1)
        const btnBackToSummary = document.getElementById('btnBackToSummary');
        if (btnBackToSummary) {
            btnBackToSummary.addEventListener('click', () => {
                switchToSummaryStage();
            });
        }

        // 8. คลิกพื้นหลัง Lightbox หรือกดปุ่ม Escape เพื่อปิด
        const announceResultModal = document.getElementById('announceResultModal');
        if (announceResultModal) {
            announceResultModal.addEventListener('click', (e) => {
                if (e.target === announceResultModal) {
                    closeAnnounceResultModal();
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAnnounceResultModal();
            }
        });
    }

    // Main Render Pipeline
    function renderDashboard() {
        if (!state) return;

        // 1. Render Top 5 KPI Cards (Image 1)
        renderTopKpis();

        // 2. Fetch Competing Teams
        allPlayersList = (typeof state.getPlayers === 'function') ? state.getPlayers() : [];
        if (typeof state.isDemoCompetitionTeam === 'function') {
            allPlayersList = allPlayersList.filter(p => !state.isDemoCompetitionTeam(p));
        }

        allPlayersList.sort((a, b) => (parseInt(a.orderNo, 10) || 0) - (parseInt(b.orderNo, 10) || 0));

        // Ensure selected team exists
        if (!selectedTeamId || !allPlayersList.some(p => p.id === selectedTeamId)) {
            selectedTeamId = allPlayersList[0] ? allPlayersList[0].id : null;
        }

        // 3. Render Team Selector Buttons (ทีมที่ 1 - ทีมสุดท้าย โดยไม่ต้องแสดงชื่อทีม)
        renderTeamButtons();

        // 4. Render Selected Team Details & Source of Funds
        renderTeamDetails(selectedTeamId);
    }

    // ========================================================
    // 1. TOP 5 KPI CARDS (Matching Image 1)
    // ========================================================
    function renderTopKpis() {
        const members = (typeof state.getMembers === 'function') ? state.getMembers() : [];
        const registered = members.filter(m => m.registered === true);
        const totalEligible = registered.length > 0 ? registered.length : (members.length || 1);

        const budgetPerPerson = (typeof state.getVoteBudget === 'function') ? state.getVoteBudget() : 1000000;
        const totalInitialBudget = totalEligible * budgetPerPerson;

        const allUserInv = (typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        let activeInvestorsCount = 0;
        let totalMoneyInvested = 0;

        Object.entries(allUserInv).forEach(([empId, userMap]) => {
            if (!userMap || typeof userMap !== 'object') return;
            let userTotal = 0;
            Object.values(userMap).forEach(amt => {
                const val = parseFloat(amt) || 0;
                if (val > 0) {
                    userTotal += val;
                    totalMoneyInvested += val;
                }
            });
            if (userTotal > 0) activeInvestorsCount++;
        });

        const totalRemainingBudget = Math.max(0, totalInitialBudget - totalMoneyInvested);
        const activePct = totalEligible > 0 ? Math.min(100, Math.round((activeInvestorsCount / totalEligible) * 100)) : 0;
        const investedMoneyPct = totalInitialBudget > 0 ? ((totalMoneyInvested / totalInitialBudget) * 100).toFixed(1) : '0.0';
        const remainingMoneyPct = totalInitialBudget > 0 ? ((totalRemainingBudget / totalInitialBudget) * 100).toFixed(1) : '0.0';

        // Update DOM
        const elTotalEligible = document.getElementById('kpiTotalEligibleInvestors');
        if (elTotalEligible) elTotalEligible.textContent = fmtNum(totalEligible);

        const elInitialBudget = document.getElementById('kpiTotalInitialBudget');
        if (elInitialBudget) elInitialBudget.textContent = fmtNum(totalInitialBudget);

        const elBudgetPerPerson = document.getElementById('kpiBudgetPerPersonHint');
        if (elBudgetPerPerson) elBudgetPerPerson.textContent = `(งบคนละ ${fmtNum(budgetPerPerson)} บาท)`;

        const elActiveCount = document.getElementById('kpiActiveInvestorsCount');
        if (elActiveCount) elActiveCount.textContent = fmtNum(activeInvestorsCount);

        const elActivePct = document.getElementById('kpiActiveInvestorsPct');
        if (elActivePct) elActivePct.textContent = `${activePct}%`;

        const elTotalInvested = document.getElementById('kpiTotalMoneyInvested');
        if (elTotalInvested) elTotalInvested.textContent = fmtNum(totalMoneyInvested);

        const elInvestedPct = document.getElementById('kpiTotalMoneyInvestedPct');
        if (elInvestedPct) elInvestedPct.textContent = `${investedMoneyPct}%`;

        const elRemaining = document.getElementById('kpiTotalRemainingBudget');
        if (elRemaining) elRemaining.textContent = fmtNum(totalRemainingBudget);

        const elRemainingPct = document.getElementById('kpiTotalRemainingBudgetPct');
        if (elRemainingPct) elRemainingPct.textContent = `${remainingMoneyPct}%`;
    }

    // ========================================================
    // 2. TEAM PICKER BUTTONS (ทีมที่ 1 - ทีมสุดท้าย โดยไม่ต้องแสดงชื่อทีม)
    // ========================================================
    // ========================================================
    // 2. TEAM PICKER BUTTONS (ทีมที่ 1 - ทีมสุดท้าย โดยไม่ต้องแสดงชื่อทีม)
    // ========================================================
    function renderTeamButtons() {
        const container = document.getElementById('teamButtonsContainer') || document.getElementById('teamButtonsCol1');
        const metaEl = document.getElementById('teamPickerMeta') || document.getElementById('teamPickerMetaCol1');
        if (!container) return;

        if (metaEl) {
            metaEl.textContent = `ทั้งหมด ${allPlayersList.length} ทีม`;
        }

        if (allPlayersList.length === 0) {
            container.innerHTML = '<div style="color: #94a3b8; font-size: 0.85rem;">ยังไม่มีข้อมูลทีมแข่งขัน</div>';
            return;
        }

        // In-place update to prevent buttons from flickering/destroying during realtime updates
        const existingBtns = container.querySelectorAll('.btn-team-pick');
        if (existingBtns.length === allPlayersList.length) {
            existingBtns.forEach((btn, idx) => {
                const p = allPlayersList[idx];
                if (!p) return;
                const isSelected = (p.id === selectedTeamId);
                btn.classList.toggle('active', isSelected);
                btn.setAttribute('data-team-id', p.id);
            });
            return;
        }

        // Render buttons strictly as ทีมที่ 1 - ทีมสุดท้าย without team names
        container.innerHTML = allPlayersList.map(p => {
            const order = p.orderNo || 1;
            const isSelected = (p.id === selectedTeamId);

            return `
                <button type="button" class="btn-team-pick ${isSelected ? 'active' : ''}" 
                    data-team-id="${p.id}" 
                    title="เลือกดูพอร์ตทีมที่ ${order}"
                    onclick="window.selectTeam('${p.id}')">
                    ทีมที่ ${order}
                </button>
            `;
        }).join('');
    }

    // Global Team Selection Handler (Single Team Focus Mode)
    window.selectTeam = function (teamId) {
        selectedTeamId = teamId;
        renderTeamButtons();
        renderTeamDetails(selectedTeamId);
    };

    // Backward compatibility for legacy selectTeamForCol
    window.selectTeamForCol = function (colIndex, teamId) {
        window.selectTeam(teamId);
    };

    // Toast notification for ShowPort
    let toastTimeout = null;
    function showToast(message, type = 'success') {
        let toast = document.getElementById('showportToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'showportToast';
            toast.className = 'showport-toast';
            document.body.appendChild(toast);
        }
        toast.className = `showport-toast toast-${type} active`;
        toast.innerHTML = `<span>${type === 'success' ? '🟢' : '🔒'}</span><span>${message}</span>`;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('active');
        }, 3200);
    }

    // Global Team Vote Toggle Handler (สั่งการเปิด/ปิดรับการลงทุนทีม และส่งสัญญาณไปยัง index)
    window.toggleTeamVoteFromShowport = function (colIndex) {
        if (!state) return;
        const targetTeamId = selectedTeamId;
        if (!targetTeamId) return;

        const players = (typeof state.getPlayers === 'function') ? state.getPlayers() : [];
        const target = players.find(p => p.id === targetTeamId);
        if (!target) return;

        const isCurrentlyClosed = (target.voteStatus === 'closed');
        const nextStatus = isCurrentlyClosed ? 'open' : 'closed';

        // ปรับสถานะทีมใน state และส่งสัญญาณทั้ง Local Broadcast และ Firebase Cloud Sync ไปยังหน้า index.html
        if (typeof state.setTeamVoteStatus === 'function') {
            state.setTeamVoteStatus(targetTeamId, nextStatus);
        }

        // เล่นเสียง Sound Effect
        const sound = window.sound || window.soundEffects || null;
        if (nextStatus === 'open') {
            if (sound && typeof sound.playWin === 'function') sound.playWin();
            else if (sound && typeof sound.playClick === 'function') sound.playClick();
        } else {
            if (sound && typeof sound.playClick === 'function') sound.playClick();
        }

        const tName = target.teamName || ('ทีมที่ ' + (target.orderNo || ''));
        showToast(nextStatus === 'open' ? `🟢 เปิดรับการลงทุน "${tName}" (ส่งสัญญาณ Lightbox แจ้งเตือนฝั่ง index แล้ว)` : `🔒 ปิดรับการลงทุน "${tName}" เรียบร้อยแล้ว`, nextStatus === 'open' ? 'success' : 'warning');

        // รีเฟรชหน้าจอแดชบอร์ดทันที
        renderDashboard();
    };

    // Compatibility shim: updateComparisonThemes is no longer needed in single-team dashboard
    function updateComparisonThemes() {}

    // ========================================================
    // 4. RENDER TEAM DETAILS & SOURCE OF FUNDS (Single Team Focus Dashboard)
    // แสดงรูปภาพ ชื่อทีม หัวหน้าทีม จำนวนผู้ลงทุน (Font 40px) จำนวนเงินลงทุน (Font 40px)
    // 3 Gauges และ ที่มาของเงินทุนทางขวามือ คำนวณผลรวมถูกต้อง 100%
    // ========================================================
    function renderTeamDetails(teamId) {
        if (!allPlayersList || allPlayersList.length === 0) return 0;

        const team = allPlayersList.find(p => p.id === teamId) || allPlayersList[0];
        if (!team) return 0;

        const orderNo = team.orderNo || 1;
        const teamName = team.teamName || team.name || `ทีมที่ ${orderNo}`;
        const teamPhoto = team.teamPhoto || team.photo || '';
        const isTeamOpen = (team.voteStatus !== 'closed');
        const teamMembers = Array.isArray(team.members) ? team.members : [];

        // All User Investments & Members data
        const allUserInv = (typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        const allMembers = (typeof state.getMembers === 'function') ? state.getMembers() : [];

        // Build member map for departments (matching with or without leading zeros)
        const memberDeptMap = new Map();
        allMembers.forEach(m => {
            const grp = (m.Group || m.department || m.Department || 'ไม่ระบุสังกัด').trim();
            const id1 = String(m.EmployeeID || '').trim().toLowerCase();
            const id2 = String(m.id || '').trim().toLowerCase();
            if (id1) {
                memberDeptMap.set(id1, grp);
                const noZero = id1.replace(/^0+/, '');
                if (noZero) memberDeptMap.set(noZero, grp);
            }
            if (id2) {
                memberDeptMap.set(id2, grp);
                const noZero = id2.replace(/^0+/, '');
                if (noZero) memberDeptMap.set(noZero, grp);
            }
        });

        // Set of departments for team members (for Bias calculation)
        const homeDepts = new Set(
            teamMembers.map(m => (m.department || m.Department || m.Group || '').trim().toLowerCase()).filter(Boolean)
        );

        // 1. Calculate Selected Team Investment & Voters Count with 100% Accuracy
        let teamTotalAmount = 0;
        const teamVotersSet = new Set();
        let totalMoneyInvestedAll = 0;
        let totalAllInvestorsCount = 0;
        let inGroupMoney = 0;
        const groupFunds = {}; // { [groupName]: { groupName, amount, voters: Set } }

        Object.entries(allUserInv).forEach(([empId, uMap]) => {
            if (!uMap || typeof uMap !== 'object') return;
            const cleanId = String(empId).trim().toLowerCase();
            const cleanNoZero = cleanId.replace(/^0+/, '');
            const grp = memberDeptMap.get(cleanId) || memberDeptMap.get(cleanNoZero) || 'ไม่ระบุสังกัด';

            let userInvestedAny = false;
            Object.entries(uMap).forEach(([tId, amt]) => {
                const val = Math.max(0, Math.round(parseFloat(amt) || 0));
                if (val > 0) {
                    totalMoneyInvestedAll += val;
                    userInvestedAny = true;

                    // Match current selected team
                    if (String(tId).trim() === String(team.id).trim()) {
                        teamTotalAmount += val;
                        teamVotersSet.add(cleanId);
                        if (homeDepts.has(grp.toLowerCase())) {
                            inGroupMoney += val;
                        }

                        // สรุปยอดเงินทุนและจำนวนผู้ลงทุนแยกตาม Group สำหรับทีมนี้
                        if (!groupFunds[grp]) {
                            groupFunds[grp] = { groupName: grp, amount: 0, voters: new Set() };
                        }
                        groupFunds[grp].amount += val;
                        groupFunds[grp].voters.add(cleanId);
                    }
                }
            });

            if (userInvestedAny) {
                totalAllInvestorsCount++;
            }
        });

        // Fallback to manual values if no direct user investment entries recorded
        if (teamTotalAmount === 0 && team.voteAmount > 0) {
            teamTotalAmount = parseFloat(team.voteAmount) || 0;
        }
        const votersCount = teamVotersSet.size > 0 ? teamVotersSet.size : (parseInt(team.voterCount, 10) || 0);

        // Helper to populate elements (matching both new IDs and legacy Col1 IDs)
        function setElem(id1, id2, callback) {
            const el = document.getElementById(id1) || (id2 ? document.getElementById(id2) : null);
            if (el) callback(el);
        }

        // -------------------------------------------------------------
        // ROW 1: รูปภาพ, ชื่อทีม, และกล่องหัวหน้าทีม
        // -------------------------------------------------------------
        setElem('dispTeamEpPill', 'dispTeamEpPillCol1', el => {
            el.textContent = `EP.${orderNo}`;
        });

        setElem('dispTeamStatusPill', 'dispTeamStatusPillCol1', el => {
            el.className = `team-status-pill ${isTeamOpen ? 'open' : 'closed'}`;
            el.innerHTML = isTeamOpen ? '🟢 เปิดรับการลงทุน' : '🔒 ปิดรับการลงทุน';
            el.title = isTeamOpen ? 'คลิกเพื่อปิดรับการลงทุนทีมนี้ (ส่งคำสั่งไปยังหน้าหลักทันที)' : 'คลิกเพื่อเปิดรับการลงทุนทีมนี้ (แสดง Lightbox แจ้งเตือนหน้าหลักทันที)';
        });

        setElem('dispTeamTitle', 'dispTeamTitleCol1', el => {
            el.textContent = teamName;
            el.title = teamName;
        });

        setElem('dispTeamPhotoWrap', 'dispTeamPhotoWrapCol1', el => {
            if (teamPhoto) {
                el.innerHTML = `<img src="${escHtml(teamPhoto)}" alt="${escHtml(teamName)}" class="team-hero-photo-img" onerror="this.outerHTML='<span class=\\'team-hero-photo-fallback\\'>🛡️</span>'">`;
            } else {
                el.innerHTML = `<span class="team-hero-photo-fallback">🛡️</span>`;
            }
        });

        // Render กล่องหัวหน้าทีมใต้ชื่อทีม
        setElem('dispTeamCaptainBox', 'dispTeamCaptainBoxCol1', elCaptainBox => {
            const captain = teamMembers.find(m => m.isCaptain) || (teamMembers.length > 0 ? teamMembers[0] : null);
            if (captain) {
                const capName = captain.name || captain.employeeId || 'ไม่ระบุชื่อ';
                const capDept = captain.department ? `<span class="captain-dept">(${escHtml(captain.department)})</span>` : '';
                const capPhoto = captain.photo ? `<img src="${escHtml(captain.photo)}" alt="${escHtml(capName)}" class="captain-avatar-img" onerror="this.outerHTML='<span class=\\'captain-avatar-fallback\\'>👤</span>'">` : `<span class="captain-avatar-fallback">👤</span>`;
                elCaptainBox.innerHTML = `
                    <div class="captain-badge-chip">
                        <span class="captain-crown-icon">👑</span>
                        <span class="captain-badge-text">หัวหน้าทีม</span>
                    </div>
                    <div class="captain-profile-row">
                        ${capPhoto}
                        <div class="captain-info-wrap">
                            <span class="captain-name-text">${escHtml(capName)}</span>
                            ${capDept}
                        </div>
                    </div>
                `;
            } else {
                elCaptainBox.innerHTML = `
                    <div class="captain-badge-chip">
                        <span class="captain-crown-icon">👑</span>
                        <span class="captain-badge-text">หัวหน้าทีม</span>
                    </div>
                    <div class="captain-profile-row">
                        <span class="captain-avatar-fallback">👤</span>
                        <div class="captain-info-wrap">
                            <span class="captain-name-text" style="color: #94a3b8; font-style: italic;">ยังไม่ได้ระบุหัวหน้าทีม</span>
                        </div>
                    </div>
                `;
            }
        });

        // -------------------------------------------------------------
        // ROW 2: จำนวนผู้ลงทุน (ความกว้าง 40%) และ จำนวนเงินลงทุน (ความกว้าง 60%)
        // ปรับลดขนาด Font ตัวเลขอัตโนมัติเมื่อตัวเลขมีความยาวเกินกำหนด
        // -------------------------------------------------------------
        setElem('dispTeamVotersCount', 'dispTeamVotersCountCol1', el => {
            const txt = `${fmtNum(votersCount)} คน`;
            el.textContent = txt;
            const len = txt.length;
            // สำหรับกล่อง 40% (แคบกว่า): ตัวเลขปกติ <= 7 ตัวอักษรใช้ 40px, หากยาวขึ้นให้ลดหลั่น
            if (len > 12) {
                el.style.fontSize = '22px';
            } else if (len > 9) {
                el.style.fontSize = '26px';
            } else if (len > 7) {
                el.style.fontSize = '32px';
            } else {
                el.style.fontSize = '40px';
            }
        });

        setElem('dispTeamFundAmount', 'dispTeamFundAmountCol1', el => {
            const txt = `${fmtNum(teamTotalAmount)} บาท`;
            el.textContent = txt;
            const len = txt.length;
            // สำหรับกล่อง 60% (กว้างกว่า): ตัวเลขปกติ <= 10 ตัวอักษรใช้ 40px, หากยาวขึ้นให้ลดหลั่น
            if (len > 16) {
                el.style.fontSize = '22px';
            } else if (len > 13) {
                el.style.fontSize = '27px';
            } else if (len > 10) {
                el.style.fontSize = '33px';
            } else {
                el.style.fontSize = '40px';
            }
        });

        // -------------------------------------------------------------
        // ROW 3: ดัชนีวิเคราะห์ความลำเอียงและสัดส่วนพอร์ต (3 Rings)
        // -------------------------------------------------------------
        // 1. ดัชนีลำเอียง (Bias Index)
        const biasPct = teamTotalAmount > 0 ? ((inGroupMoney / teamTotalAmount) * 100) : 0;
        setElem('gaugeValBias', 'gaugeValBiasCol1', el => { el.textContent = `${biasPct.toFixed(1)}%`; });
        setElem('gaugeCircleBias', 'gaugeCircleBiasCol1', el => {
            const deg = Math.min(360, Math.max(0, Math.round((biasPct / 100) * 360)));
            el.style.setProperty('--gauge-deg', `${deg}deg`);
        });
        setElem('gaugeSubBias', 'gaugeSubBiasCol1', el => { el.textContent = `${fmtNum(inGroupMoney)} บาท`; });

        // 2. ดัชนีเงินลงทุน (Fund Index)
        const fundPct = totalMoneyInvestedAll > 0 ? ((teamTotalAmount / totalMoneyInvestedAll) * 100) : 0;
        setElem('gaugeValFund', 'gaugeValFundCol1', el => { el.textContent = `${fundPct.toFixed(1)}%`; });
        setElem('gaugeCircleFund', 'gaugeCircleFundCol1', el => {
            const deg = Math.min(360, Math.max(0, Math.round((fundPct / 100) * 360)));
            el.style.setProperty('--gauge-deg', `${deg}deg`);
        });
        setElem('gaugeSubFund', 'gaugeSubFundCol1', el => { el.textContent = `เทียบรวม ${fmtCompactMoney(totalMoneyInvestedAll)}`; });

        // 3. ดัชนีผู้ลงทุน (Voters Index)
        const activeVotersPool = Math.max(totalAllInvestorsCount, 1);
        const votersPct = totalAllInvestorsCount > 0 ? ((votersCount / totalAllInvestorsCount) * 100) : 0;
        setElem('gaugeValVoters', 'gaugeValVotersCol1', el => { el.textContent = `${votersPct.toFixed(1)}%`; });
        setElem('gaugeCircleVoters', 'gaugeCircleVotersCol1', el => {
            const deg = Math.min(360, Math.max(0, Math.round((votersPct / 100) * 360)));
            el.style.setProperty('--gauge-deg', `${deg}deg`);
        });
        setElem('gaugeSubVoters', 'gaugeSubVotersCol1', el => { el.textContent = `จากรวม ${fmtNum(totalAllInvestorsCount)} คน`; });

        // -------------------------------------------------------------
        // ROW 4: ส่วนแสดงที่มาของเงินทุนทางขวามือ สรุปตาม Group (เรียงจากมากไปน้อย)
        // -------------------------------------------------------------
        const sortedGroups = Object.values(groupFunds)
            .filter(g => g.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        setElem('dispFundSourceCount', 'dispFundSourceCountCol1', el => {
            el.textContent = `${sortedGroups.length} กลุ่ม`;
        });

        setElem('dispFundSourceList', 'dispFundSourceListCol1', el => {
            if (sortedGroups.length === 0) {
                el.innerHTML = '<div class="fund-source-empty">ยังไม่มียอดเงินลงทุนจาก Group ใดในทีมนี้</div>';
            } else {
                el.innerHTML = sortedGroups.map((g, idx) => {
                    const rank = idx + 1;
                    const rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : 'rank-default'));
                    const rankIcon = rank === 1 ? '🥇 #1' : (rank === 2 ? '🥈 #2' : (rank === 3 ? '🥉 #3' : `#${rank}`));
                    const pct = teamTotalAmount > 0 ? ((g.amount / teamTotalAmount) * 100).toFixed(1) : '0.0';
                    const barWidth = teamTotalAmount > 0 ? Math.min(100, Math.max(3, parseFloat(pct))) : 0;

                    return `
                        <div class="fund-source-item" title="${escHtml(g.groupName)}: ${fmtNum(g.amount)} บาท (${pct}%)">
                            <div class="fund-source-item-top">
                                <div class="fund-source-group-info">
                                    <span class="fund-source-rank-badge ${rankClass}">${rankIcon}</span>
                                    <span class="fund-source-group-name">${escHtml(g.groupName)}</span>
                                    <span class="fund-source-voters-tag">👥 ${g.voters.size} ท่าน</span>
                                </div>
                                <div class="fund-source-amount-info">
                                    <span class="fund-source-amount-baht">${fmtNum(g.amount)} บาท</span>
                                    <span class="fund-source-pct-pill">${pct}%</span>
                                </div>
                            </div>
                            <div class="fund-source-progress-track">
                                <div class="fund-source-progress-bar" style="width: ${barWidth}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        });

        // Return calculated investment amount
        return teamTotalAmount;
    }

    // Alias for backwards compatibility
    function renderTeamColumn(colIndex, teamId) {
        return renderTeamDetails(teamId || selectedTeamId);
    }

    // ========================================================
    // 5. ANNOUNCE RESULT LIGHTBOX MODAL CONTROLLER (ขนาด 90% x 90%)
    // จัดอันดับพอร์ตการลงทุน AI เรียงจากมากไปน้อย กราฟแท่งแยกสี Group และกราฟเส้นประสีเขียว Smooth
    // ========================================================

    const GROUP_PALETTE = [
        '#38bdf8', // ฟ้าสว่าง (Sky)
        '#a855f7', // ม่วงสว่าง (Purple)
        '#f43f5e', // กุหลาบชมพู (Rose)
        '#f97316', // ส้มสดใส (Orange)
        '#eab308', // ทองอำพัน (Amber)
        '#14b8a6', // เขียวน้ำทะเล (Teal)
        '#ec4899', // ชมพูบานเย็น (Pink)
        '#6366f1', // น้ำเงินคราม (Indigo)
        '#84cc16', // เขียวมะนาว (Lime)
        '#06b6d4', // ฟ้าครามไซแอน (Cyan)
        '#d946ef', // ม่วงฟิวเชีย (Fuchsia)
        '#64748b', // เทาเงินสเลท (Slate)
        '#e11d48', // แดงชาด (Crimson)
        '#0284c7'  // น้ำเงินเข้ม (Deep Sky)
    ];

    /**
     * คำนวณเส้นโค้ง Catmull-Rom Spline ให้เป็นคำสั่ง SVG Path (Cubic Bezier)
     * เพื่อให้กราฟเส้นประสีเขียวโค้งมนสวยงาม (Smooth Spline)
     */
    function getCatmullRomSpline(points) {
        if (!points || points.length === 0) return '';
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
        if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

        let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        }
        return d;
    }

    /**
     * คำนวณและรวบรวมข้อมูลพอร์ตการลงทุนของทุกทีมในระบบ
     * และเรียงลำดับจากทีมที่มียอดเงินลงทุนสูงสุดไปน้อยสุด
     */
    function getAggregatedTeamsData() {
        const players = (state && typeof state.getPlayers === 'function') ? state.getPlayers() : (allPlayersList || []);
        const allUserInv = (state && typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        const allMembers = (state && typeof state.getMembers === 'function') ? state.getMembers() : [];

        // ทำดัชนี Map สังกัด Group ของพนักงาน
        const memberDeptMap = new Map();
        allMembers.forEach(m => {
            const grp = (m.Group || m.department || m.Department || 'ไม่ระบุสังกัด').trim();
            const id1 = String(m.EmployeeID || '').trim().toLowerCase();
            const id2 = String(m.id || '').trim().toLowerCase();
            if (id1) {
                memberDeptMap.set(id1, grp);
                const noZero = id1.replace(/^0+/, '');
                if (noZero) memberDeptMap.set(noZero, grp);
            }
            if (id2) {
                memberDeptMap.set(id2, grp);
                const noZero = id2.replace(/^0+/, '');
                if (noZero) memberDeptMap.set(noZero, grp);
            }
        });

        // ดึงรายชื่อทีม (กรอง Demo เก่าออกทั้งหมด)
        let list = (players && players.length > 0) ? players : (allPlayersList || []);
        if (typeof state.isDemoCompetitionTeam === 'function') {
            list = list.filter(p => !state.isDemoCompetitionTeam(p));
        }

        // คำนวณยอดเงิน ยอดผู้ลงทุน และยอดจำแนกตาม Group สำหรับแต่ละทีม
        const teamsData = list.map((team, idx) => {
            const orderNo = team.orderNo || (idx + 1);
            const teamName = team.teamName || team.name || `ทีมที่ ${orderNo}`;
            const teamPhoto = team.teamPhoto || team.photo || '';
            let totalAmount = 0;
            const votersSet = new Set();
            const groupFunds = {}; // { [groupName]: amount }

            Object.entries(allUserInv).forEach(([empId, uMap]) => {
                if (!uMap || typeof uMap !== 'object') return;
                const cleanId = String(empId).trim().toLowerCase();
                const cleanNoZero = cleanId.replace(/^0+/, '');
                const grp = memberDeptMap.get(cleanId) || memberDeptMap.get(cleanNoZero) || 'ไม่ระบุสังกัด';

                const rawAmt = uMap[team.id] !== undefined ? uMap[team.id] : uMap[String(team.id)];
                const amt = Math.max(0, Math.round(parseFloat(rawAmt) || 0));
                if (amt > 0) {
                    totalAmount += amt;
                    votersSet.add(cleanId);
                    groupFunds[grp] = (groupFunds[grp] || 0) + amt;
                }
            });

            // ค่าสำรองกรณีไม่ได้ลงข้อมูล user investments โดยตรง
            if (totalAmount === 0 && team.voteAmount > 0) {
                totalAmount = parseFloat(team.voteAmount) || 0;
            }
            const votersCount = votersSet.size > 0 ? votersSet.size : (parseInt(team.voterCount, 10) || 0);

            // ดึงข้อมูลหัวหน้าทีม / ผู้นำเสนอ สำหรับแสดงในทำเนียบผู้ชนะและตารางสรุปผล
            const teamMembers = (state && typeof state.getTeamMembers === 'function') ? state.getTeamMembers(team.id) : (team.members || []);
            const captainObj = (Array.isArray(teamMembers) ? teamMembers.find(m => m && m.isCaptain) : null) || (Array.isArray(teamMembers) && teamMembers.length > 0 ? teamMembers[0] : null);
            const captainName = captainObj ? (captainObj.name || captainObj.employeeId || 'ไม่ระบุชื่อ') : (team.captainName || team.leaderName || 'ไม่ระบุชื่อ');
            const captainDept = captainObj ? (captainObj.department || captainObj.dept || '') : (team.department || '');
            const captainPhoto = captainObj ? (captainObj.photo || '') : '';

            // แปลง groupFunds เป็น Array เรียงจากยอดเงินมากไปน้อย
            const groupList = Object.entries(groupFunds)
                .map(([name, amount]) => ({ name, amount }))
                .sort((a, b) => b.amount - a.amount);

            return {
                id: team.id,
                orderNo,
                teamName,
                teamPhoto,
                totalAmount,
                votersCount,
                groupFunds,
                groupList,
                captain: {
                    name: captainName,
                    department: captainDept,
                    photo: captainPhoto
                },
                rawTeam: team
            };
        });

        // เรียงลำดับจากทีมที่มียอดเงินลงทุนสูงสุดไปน้อยสุด (เรียงลำดับทีมที่มีการลงทุนสูงสุดไปน้อยสุด)
        teamsData.sort((a, b) => {
            if (b.totalAmount !== a.totalAmount) {
                return b.totalAmount - a.totalAmount;
            }
            return b.votersCount - a.votersCount;
        });

        return teamsData;
    }

    /**
     * สร้าง Map สีประจำแต่ละ Group จากข้อมูลที่เกิดขึ้นจริง
     */
    function buildGroupColorMap(teamsData) {
        const groupSet = new Set();
        teamsData.forEach(t => {
            t.groupList.forEach(g => {
                if (g.amount > 0) groupSet.add(g.name);
            });
        });

        const groupList = Array.from(groupSet);
        const colorMap = {};
        groupList.forEach((grp, idx) => {
            colorMap[grp] = GROUP_PALETTE[idx % GROUP_PALETTE.length];
        });
        return colorMap;
    }

    /**
     * ปิดระบบการลงทุนพอร์ต AI ทั้งหมด (ตามคำสั่ง: "และให้ระบบสั่งให้ปิดระบบการลงทุนพอร์ต ai ทั้งหมดด้วย")
     */
    function closeAllAiInvestments() {
        if (!state) return;

        // 1. ปิดสถานะการโหวต/ลงทุนหลักของระบบ
        if (typeof state.setVoteOpen === 'function') {
            state.setVoteOpen(false);
        } else {
            localStorage.setItem('crsdg_vote_open', 'false');
        }

        // 2. ปิดสถานะรับการลงทุนของทุกทีมในระบบเป็น 'closed'
        const players = (typeof state.getPlayers === 'function') ? state.getPlayers() : (allPlayersList || []);
        if (Array.isArray(players) && players.length > 0) {
            players.forEach(p => {
                p.voteStatus = 'closed';
                p.updatedAt = new Date().toISOString();
            });
            if (typeof state.savePlayers === 'function') {
                state.savePlayers(players);
            }
        }

        // 3. ซิงค์สถานะปิดระบบไปยัง Firebase Cloud Firestore เพื่อล็อกเครื่องผู้ใช้งานทุกคน
        if (typeof FirebaseSync !== 'undefined') {
            try {
                if (typeof FirebaseSync.saveVoteSettings === 'function') {
                    FirebaseSync.saveVoteSettings({ vote_open: false, current_step: 'ANNOUNCED' });
                }
                if (typeof FirebaseSync.savePlayersToCloud === 'function' && Array.isArray(players)) {
                    FirebaseSync.savePlayersToCloud(players);
                }
            } catch (e) {
                console.warn('[Showport] FirebaseSync closeAllAiInvestments error:', e);
            }
        }

        // 4. กระจายสัญญาณ BroadcastChannel ไปยังทุกแท็บ ทุกหน้าจอ (รวมถึง index.html)
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                const ch1 = new BroadcastChannel('crsdg_game_channel');
                ch1.postMessage({ type: 'VOTE_STATUS_UPDATED', isOpen: false, open: false });
                ch1.postMessage({ type: 'AI_PORT_CLOSED_ALL' });
                ch1.postMessage({ type: 'PLAYERS_UPDATED', players });

                const ch2 = new BroadcastChannel('crsdg_channel');
                ch2.postMessage({ type: 'VOTE_STATUS_UPDATED', isOpen: false, open: false });
            }
        } catch (e) {}

        // รีเฟรชหน้าจอแสดงผล
        renderDashboard();
    }

    /**
     * แยกข้อความชื่อทีมออกเป็น 2 บรรทัดสำหรับแสดงใต้แท่งกราฟ
     * เช่น "TTB 1 (แบบบ้านๆ)" -> บรรทัดที่ 1: "TTB 1", บรรทัดที่ 2: "(แบบบ้านๆ)"
     */
    function getTeamName2Lines(team) {
        const fullName = String(team.teamName || team.name || `ทีมที่ ${team.orderNo || ''}`).trim();

        // 1. กรณีมีวงเล็บ เช่น "TTB 1 (แบบบ้านๆ)" หรือ "TTB 2 (home)"
        const parenIdx = fullName.indexOf('(');
        if (parenIdx > 0) {
            return [fullName.slice(0, parenIdx).trim(), fullName.slice(parenIdx).trim()];
        }

        // 2. กรณีมีเว้นวรรค
        const words = fullName.split(/\s+/);
        if (words.length >= 2) {
            const mid = Math.ceil(words.length / 2);
            return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
        }

        // 3. กรณีเป็นคำยาวคำเดียวเกิน 9 ตัวอักษร
        if (fullName.length > 9) {
            return [fullName.slice(0, 8), fullName.slice(8, 18)];
        }

        return [fullName, ''];
    }

    /**
     * วาดกราฟแท่งแบบแยกสี Group + กราฟเส้นประสีเขียว Smooth แบบ Dual-Axis ใน SVG
     * ปรับความกว้าง (ความยาว) ให้กว้างขึ้น และแสดงชื่อทีม 2 บรรทัด
     * ใช้ font-weight: 500 สำหรับตัวหนา
     */
    function renderAnnounceResultChart(teamsData, groupColorMap) {
        const container = document.getElementById('announceChartContainer');
        if (!container) return;

        if (!teamsData || teamsData.length === 0) {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:1.05rem;font-weight:500;">ไม่พบข้อมูลทีมในระบบ</div>';
            return;
        }

        // ปรับสัดส่วน ViewBox และ Padding ของกราฟให้แสดงผลตัวอักษรขนาดใหญ่ได้อย่างชัดเจน
        const W = 1200;
        const H = 480;
        const padL = 105;
        const padR = 105;
        const padT = 52;
        const padB = 105;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;

        const maxAmt = Math.max(...teamsData.map(t => t.totalAmount), 10000);
        // เพิ่ม headroom 15% เพื่อให้ข้อความตัวเลขบนแท่งกราฟไม่ล้นขอบบน
        const niceMaxAmt = Math.ceil((maxAmt * 1.15) / 100000) * 100000 || (maxAmt * 1.15);

        const maxVoters = Math.max(...teamsData.map(t => t.votersCount), 2);
        // เพิ่ม headroom 25% เพื่อให้ป้ายจำนวนคนบนเส้นประไม่ชนเพดาน
        const niceMaxVoters = Math.max(5, Math.ceil(maxVoters * 1.25));

        const N = teamsData.length;
        const slotW = plotW / N;
        const barW = Math.min(Math.max(slotW * 0.46, 45), 78);

        // 1. เส้นสเกลและป้ายแกนซ้าย-ขวา (Gridlines & Axis Labels: ปรับขนาด Font ให้ใหญ่ชัดเจน 18-21px, Kanit)
        let gridSvg = '';
        const gridLevels = 5;
        for (let i = 0; i <= gridLevels; i++) {
            const ratio = i / gridLevels;
            const y = padT + plotH - (ratio * plotH);
            const amtVal = ratio * niceMaxAmt;
            const voterVal = Math.round(ratio * niceMaxVoters);

            gridSvg += `
                <line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="${i === 0 ? '0' : '4,4'}" />
                <text x="${padL - 14}" y="${y + 6}" text-anchor="end" fill="#94a3b8" font-size="18" font-weight="400" font-family="'Kanit', sans-serif">${fmtCompactMoney(amtVal)}</text>
                <text x="${padL + plotW + 14}" y="${y + 6}" text-anchor="start" fill="#34d399" font-size="18" font-weight="400" font-family="'Kanit', sans-serif">${voterVal} คน</text>
            `;
        }

        // หัวตารางแกนซ้ายและแกนขวา (ขยาย font ให้ใหญ่ชัดเจน 20px)
        gridSvg += `
            <text x="${padL}" y="${padT - 18}" text-anchor="start" fill="#fbbf24" font-size="20" font-weight="500" font-family="'Kanit', sans-serif">💰 ยอดเงินลงทุน (บาท)</text>
            <text x="${padL + plotW}" y="${padT - 18}" text-anchor="end" fill="#34d399" font-size="20" font-weight="500" font-family="'Kanit', sans-serif">👥 พนักงานที่ลงทุน (คน)</text>
        `;

        // 2. กราฟแท่งแยกสี Group และจุดพิกัดเส้นประ
        let barsSvg = '';
        const splinePoints = [];

        teamsData.forEach((team, idx) => {
            const cx = padL + (idx + 0.5) * slotW;
            const barX = cx - (barW / 2);
            const rank = idx + 1;
            const rankIcon = rank === 1 ? '🥇 #1' : (rank === 2 ? '🥈 #2' : (rank === 3 ? '🥉 #3' : `#${rank}`));
            const rankColor = rank === 1 ? '#f59e0b' : (rank === 2 ? '#94a3b8' : (rank === 3 ? '#b45309' : '#475569'));

            // พิกัดสำหรับเส้นกราฟจำนวนพนักงานที่ลงทุน (แกนขวา)
            const voterRatio = Math.min(team.votersCount / niceMaxVoters, 1);
            const py = padT + plotH - (voterRatio * plotH);
            splinePoints.push({ x: cx, y: py, voters: team.votersCount, teamName: team.teamName });

            // สร้างแท่งกราฟซ้อน (Stacked Group Segments)
            let currY = padT + plotH;
            let segmentsSvg = '';

            if (!team.groupList || team.groupList.length === 0 || team.totalAmount === 0) {
                // กรณีไม่มีข้อมูลเงินลงทุน
                segmentsSvg += `<rect x="${barX}" y="${currY - 5}" width="${barW}" height="5" rx="2" fill="rgba(255,255,255,0.15)" />`;
            } else {
                team.groupList.forEach((grp, sIdx) => {
                    if (grp.amount <= 0) return;
                    const segH = (grp.amount / niceMaxAmt) * plotH;
                    const segY = currY - segH;
                    const color = groupColorMap[grp.name] || '#38bdf8';
                    const isTop = (sIdx === team.groupList.length - 1);
                    const rx = isTop ? 'rx="6" ry="6"' : '';

                    segmentsSvg += `
                        <rect x="${barX}" y="${segY}" width="${barW}" height="${Math.max(segH, 1)}" fill="${color}" ${rx} opacity="0.95" style="transition: opacity 0.2s;">
                            <title>${escHtml(team.teamName)} | ${escHtml(grp.name)}: ${fmtNum(grp.amount)} บาท</title>
                        </rect>
                    `;
                    currY = segY;
                });
            }

            // แสดงยอดรวมเงินลงทุนบนแท่งกราฟ (เอา ฿ ออก, ขยาย font ให้ใหญ่ 20px พร้อมกล่องพื้นหลังชัดเจน)
            const labelY = Math.min(currY - 14, padT + plotH - 14);
            const [line1, line2] = getTeamName2Lines(team);
            const amtStr = fmtCompactMoney(team.totalAmount);
            const pillW = Math.max(74, amtStr.length * 15 + 24);

            barsSvg += `
                <g class="team-bar-group">
                    ${segmentsSvg}
                    <rect x="${cx - (pillW / 2)}" y="${labelY - 24}" width="${pillW}" height="30" rx="7" fill="rgba(15, 23, 42, 0.88)" stroke="rgba(251, 191, 36, 0.45)" stroke-width="1.2" />
                    <text x="${cx}" y="${labelY - 3}" text-anchor="middle" fill="#fde047" font-size="20" font-weight="500" font-family="'Kanit', sans-serif">
                        ${amtStr}
                    </text>
                    <!-- แถบแสดงอันดับบนแกน X (ขยายขนาด 64x26px, font 15px) -->
                    <rect x="${cx - 32}" y="${padT + plotH + 10}" width="64" height="26" rx="6" fill="${rankColor}" opacity="0.95" />
                    <text x="${cx}" y="${padT + plotH + 28}" text-anchor="middle" fill="#000000" font-size="15" font-weight="500" font-family="'Kanit', sans-serif">
                        ${rankIcon}
                    </text>
                    <!-- ชื่อทีม 2 บรรทัด (ขยาย font ให้ใหญ่ชัดเจน 18px / 16px, font Kanit) -->
                    <text x="${cx}" y="${padT + plotH + 60}" text-anchor="middle" fill="#f8fafc" font-size="18" font-weight="500" font-family="'Kanit', sans-serif" title="${escHtml(team.teamName)}">
                        ${escHtml(line1)}
                    </text>
                    ${line2 ? `
                        <text x="${cx}" y="${padT + plotH + 84}" text-anchor="middle" fill="#94a3b8" font-size="16" font-weight="500" font-family="'Kanit', sans-serif" title="${escHtml(team.teamName)}">
                            ${escHtml(line2)}
                        </text>
                    ` : ''}
                </g>
            `;
        });

        // 3. เส้นประสีเขียวแบบ Smooth (Catmull-Rom Spline Curve: ขยายความหนาเส้น 4px)
        const splineD = getCatmullRomSpline(splinePoints);
        const curveSvg = `
            <path d="${splineD}" fill="none" stroke="#10b981" stroke-width="4" stroke-dasharray="9,6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowGreen)" />
        `;

        // 4. จุดกลมและป้ายแสดงจำนวนพนักงานที่ลงทุน (ขยาย font ให้ใหญ่ชัดเจน 18px, font Kanit)
        let dotsSvg = '';
        splinePoints.forEach(p => {
            dotsSvg += `
                <g class="spline-dot-group">
                    <circle cx="${p.x}" cy="${p.y}" r="9" fill="rgba(16, 185, 129, 0.25)" />
                    <circle cx="${p.x}" cy="${p.y}" r="6" fill="#10b981" stroke="#ffffff" stroke-width="2.5" />
                    <rect x="${p.x - 45}" y="${p.y - 44}" width="90" height="34" rx="8" fill="#064e3b" stroke="#10b981" stroke-width="1.6" filter="drop-shadow(0 3px 8px rgba(0,0,0,0.6))" />
                    <text x="${p.x}" y="${p.y - 21}" text-anchor="middle" fill="#6ee7b7" font-size="18" font-weight="500" font-family="'Kanit', sans-serif">
                        👥 ${p.voters} คน
                    </text>
                </g>
            `;
        });

        // ประกอบร่าง SVG (W = 1200, H = 480, font-family Kanit ทั้งหมด)
        container.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="font-family: 'Kanit', sans-serif;">
                <defs>
                    <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                ${gridSvg}
                ${barsSvg}
                ${curveSvg}
                ${dotsSvg}
            </svg>
        `;
    }

    /**
     * แสดงกล่องข้อความ Group ให้อยู่ทางด้านซ้ายของกราฟ
     * แสดงรายการเรียงจากมากไปน้อย พร้อมแถบสีและยอดเงิน
     */
    function renderAnnounceGroupSideBox(teamsData, groupColorMap) {
        const countPill = document.getElementById('announceGroupCountPill');
        const itemsList = document.getElementById('announceGroupItemsList');
        if (!itemsList) return;

        // คำนวณยอดเงินรวมแยกตาม Group และยอดรวมทั้งหมด
        const groupTotals = {};
        let grandTotalInvested = 0;
        teamsData.forEach(t => {
            t.groupList.forEach(g => {
                groupTotals[g.name] = (groupTotals[g.name] || 0) + g.amount;
                grandTotalInvested += g.amount;
            });
        });

        const sortedGroups = Object.entries(groupTotals)
            .filter(([_, amt]) => amt > 0)
            .sort((a, b) => b[1] - a[1]);

        if (countPill) {
            countPill.textContent = `${sortedGroups.length} กลุ่ม`;
        }

        if (sortedGroups.length === 0) {
            itemsList.innerHTML = '<div style="color:#64748b;font-size:0.75rem;padding:8px 0;">(ยังไม่พบข้อมูล Group)</div>';
            return;
        }

        itemsList.innerHTML = sortedGroups.map(([name, amt]) => {
            const color = groupColorMap[name] || '#38bdf8';
            const pct = grandTotalInvested > 0 ? ((amt / grandTotalInvested) * 100).toFixed(1) : '0.0';
            const barW = Math.min(100, Math.max(4, parseFloat(pct)));

            return `
                <div class="announce-group-item-card" title="${escHtml(name)}: ยอดลงทุน ${fmtNum(amt)} บาท (${pct}%)">
                    <div class="announce-group-item-top">
                        <div class="announce-group-item-name-wrap">
                            <span class="announce-group-item-dot" style="background: ${color};"></span>
                            <span class="announce-group-item-name">${escHtml(name)}</span>
                        </div>
                        <span class="announce-group-item-amt">${fmtCompactMoney(amt)}</span>
                    </div>
                    <div class="announce-group-item-bottom">
                        <div class="announce-group-bar-track">
                            <div class="announce-group-bar-fill" style="width: ${barW}%; background: ${color};"></div>
                        </div>
                        <span class="announce-group-item-pct">${pct}%</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * แปลงชื่อทีมให้กระชับและสั้นลง เพื่อให้พอดีกับแถบแคปซูล ไม่ยาวเกินไป
     * และยังคงความหมายของทีมแข่งขันไว้อย่างชัดเจน
     */
    function formatShortTeamName(name) {
        if (!name) return '';
        const str = String(name).trim();

        // ตารางจับคู่ชื่อทีมหลักที่เป็นทางการให้สั้นและกระชับ
        const knownMap = {
            'team 1 : mr. agent : marketing launch guard': 'Team 1 : MR. Agent',
            'team 1: mr. agent : marketing launch guard': 'Team 1 : MR. Agent',
            'team 1: mr. agent': 'Team 1 : MR. Agent',
            'team 1 : mr. agent': 'Team 1 : MR. Agent',
            'team 2 : form marketer to ai-powered business transformer': 'Team 2 : Form Marketer',
            'team 2 : from marketer to ai-powered business transformer': 'Team 2 : From Marketer',
            'team 2: form marketer to ai-powered business transformer': 'Team 2 : Form Marketer',
            'team 2: from marketer to ai-powered business transformer': 'Team 2 : From Marketer',
            'team 3 : ttb wealth advisory 360 pro': 'Team 3 : ttb wealth Advisory',
            'team 3: ttb wealth advisory 360 pro': 'Team 3 : ttb wealth Advisory',
            'team 3 : ttb wealth advisory': 'Team 3 : ttb wealth Advisory',
            'team 4 : kpi analysis dashboard': 'Team 4 : KPI Analysis',
            'team 4: kpi analysis dashboard': 'Team 4 : KPI Analysis',
            'team 4 : kpi analysis': 'Team 4 : KPI Analysis',
            'team 5 : how ai could understand customers': 'Team 5 : Understand Customers',
            'team 5: how ai could understand customers': 'Team 5 : Understand Customers',
            'team 5 : understand customers': 'Team 5 : Understand Customers',
            'team 6 : ask-to-act ai': 'Team 6 : Ask-to-Act AI',
            'team 6: ask-to-act ai': 'Team 6 : Ask-to-Act AI'
        };

        const lower = str.toLowerCase();
        for (const [k, v] of Object.entries(knownMap)) {
            if (lower === k || lower.startsWith(k)) {
                return v;
            }
        }

        // กรณีชื่อทีมที่แอดมินแก้ไขเพิ่มเติม
        // ถ้ามี colon หลายช่วง เช่น "Team 1 : Name : Sub" -> ใช้ 2 ส่วนแรก
        const colonParts = str.split(':').map(p => p.trim());
        if (colonParts.length >= 3) {
            return `${colonParts[0]} : ${colonParts[1]}`;
        }
        if (colonParts.length === 2) {
            const prefix = colonParts[0];
            const body = colonParts[1];
            if (body.length > 20) {
                const words = body.split(' ');
                if (words.length > 3) {
                    return `${prefix} : ${words.slice(0, 3).join(' ')}`;
                }
                return `${prefix} : ${body.slice(0, 18)}...`;
            }
            return str;
        }

        return str.length > 24 ? str.slice(0, 22) + '...' : str;
    }

    let _announceTeamsData = [];
    let _announceTotalMoney = 0;
    let _revealTimeouts = [];
    let _isRevealingRanks = false;
    let _ranksRevealedSet = new Set();

    const CAPSULE_PALETTES = [
        { bg: 'linear-gradient(90deg, #15803d 0%, #22c55e 100%)', glow: 'rgba(34, 197, 94, 0.35)', rankBg: 'rgba(255, 255, 255, 0.28)' },
        { bg: 'linear-gradient(90deg, #6d28d9 0%, #8b5cf6 100%)', glow: 'rgba(139, 92, 246, 0.35)', rankBg: 'rgba(255, 255, 255, 0.28)' },
        { bg: 'linear-gradient(90deg, #c2410c 0%, #f97316 100%)', glow: 'rgba(249, 115, 22, 0.35)', rankBg: 'rgba(255, 255, 255, 0.28)' },
        { bg: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 100%)', glow: 'rgba(20, 184, 166, 0.35)', rankBg: 'rgba(255, 255, 255, 0.28)' },
        { bg: 'linear-gradient(90deg, #b45309 0%, #d97706 100%)', glow: 'rgba(217, 119, 6, 0.35)', rankBg: 'rgba(255, 255, 255, 0.28)' },
        { bg: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)', glow: 'rgba(59, 130, 246, 0.35)', rankBg: 'rgba(255, 255, 255, 0.28)' }
    ];

    function clearRevealTimers() {
        if (_revealTimeouts && _revealTimeouts.length > 0) {
            _revealTimeouts.forEach(t => clearTimeout(t));
            _revealTimeouts = [];
        }
    }

    function generateCapsuleRowHtml(team, idx, isRevealed) {
        const rank = idx + 1;
        const palette = CAPSULE_PALETTES[idx % CAPSULE_PALETTES.length];
        const rankIcon = `#${rank}`;
        const shortTeamName = formatShortTeamName(team.teamName);
        
        const pctVal = _announceTotalMoney > 0 ? ((team.totalAmount / _announceTotalMoney) * 100) : 0;
        const pctStr = `${pctVal.toFixed(1)}%`;

        const capName = team.captain ? team.captain.name : '';
        const capDept = (team.captain && team.captain.department) ? team.captain.department : '';

        if (!isRevealed) {
            return `
                <div class="announce-capsule-row is-hidden-rank" data-rank="${rank}" data-idx="${idx}" title="คลิกเพื่อเริ่มประกาศผลอันดับ">
                    <!-- ข้อมูลด้านซ้าย: อันดับ และ ข้อความรอลุ้นผล -->
                    <div class="capsule-left-cell">
                        <div class="capsule-rank-bubble" title="อันดับที่ ${rank}">
                            ${rankIcon}
                        </div>
                        <div class="capsule-team-info">
                            <div class="capsule-team-title">
                                🔒 รอลุ้นผลการแข่งขัน...
                            </div>
                            <div class="capsule-team-captain">
                                <span>👑</span>
                                <span>หัวหน้าทีม: <strong>••••••••</strong></span>
                            </div>
                        </div>
                    </div>

                    <!-- ค่าตัวเลขด้านขวา 3 กล่องสีขาวช่วงรอลุ้นผล -->
                    <div class="capsule-right-metrics">
                        <div class="capsule-metric-item col-investors">
                            <div class="capsule-white-pill">
                                <span class="pill-number">---</span>
                                <span class="pill-unit">คน</span>
                            </div>
                        </div>
                        <div class="capsule-metric-item col-amount">
                            <div class="capsule-white-pill">
                                <span class="pill-number">---</span>
                                <span class="pill-unit">บาท</span>
                            </div>
                        </div>
                        <div class="capsule-metric-item col-pct">
                            <div class="capsule-white-pill pill-gray-pct">
                                <span class="pill-dash">(-)</span>
                                <span class="pill-number">---%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        const championClass = (rank === 1) ? 'is-champion-glow' : (rank === 2 ? 'is-runnerup-glow' : '');

        return `
            <div class="announce-capsule-row is-revealed ${championClass}" data-rank="${rank}" data-idx="${idx}" style="background: ${palette.bg}; box-shadow: 0 4px 16px ${palette.glow};">
                <!-- ข้อมูลด้านซ้าย: อันดับ และ ชื่อทีม/หัวหน้าทีม -->
                <div class="capsule-left-cell">
                    <div class="capsule-rank-bubble" style="background: ${palette.rankBg};" title="อันดับที่ ${rank}">
                        ${rankIcon}
                    </div>
                    <div class="capsule-team-info">
                        <div class="capsule-team-title" title="${escHtml(team.teamName)}">
                            ${escHtml(shortTeamName)}
                        </div>
                        ${capName ? `
                            <div class="capsule-team-captain" title="หัวหน้าทีม: ${escHtml(capName)} ${capDept ? `(${escHtml(capDept)})` : ''}">
                                <span>👑</span>
                                <span>หัวหน้าทีม: <strong>${escHtml(capName)}</strong></span>
                                ${capDept ? `<span>(${escHtml(capDept)})</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- ค่าตัวเลขด้านขวา 3 กล่องสีขาวตามรูปที่ 2: ผู้ลงทุน | เงินลงทุน | สัดส่วน (%) -->
                <div class="capsule-right-metrics">
                    <!-- 1. ผู้ลงทุน -->
                    <div class="capsule-metric-item col-investors">
                        <div class="capsule-white-pill" title="จำนวนผู้ลงทุน: ${fmtNum(team.votersCount)} คน">
                            <span class="pill-number">${fmtNum(team.votersCount)}</span>
                            <span class="pill-unit">คน</span>
                        </div>
                    </div>

                    <!-- 2. เงินลงทุน -->
                    <div class="capsule-metric-item col-amount">
                        <div class="capsule-white-pill pill-gold-text" title="ยอดเงินลงทุนรวม: ${fmtNum(team.totalAmount)} บาท">
                            <span class="pill-number">${fmtNum(team.totalAmount)}</span>
                            <span class="pill-unit">บาท</span>
                        </div>
                    </div>

                    <!-- 3. สัดส่วน (%) -->
                    <div class="capsule-metric-item col-pct">
                        <div class="capsule-white-pill ${pctVal > 0 ? 'pill-green-pct' : 'pill-gray-pct'}" title="สัดส่วนพอร์ตการลงทุน: ${pctStr}">
                            ${pctVal > 0 ? '<span class="pill-arrow-up">▲</span>' : '<span class="pill-dash">(-)</span>'}
                            <span class="pill-number">${pctStr}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function buildAnnouncePodiumColHtml(team, rank, isRevealed) {
        const rankConfigs = {
            1: { badgeClass: 'badge-gold', cardClass: 'card-gold', icon: '🥇 อันดับ 1 ชนะเลิศ', baseNum: '1', textClass: 'gold-text', medal: '👑' },
            2: { badgeClass: 'badge-silver', cardClass: 'card-silver', icon: '🥈 อันดับ 2 รองชนะเลิศ #1', baseNum: '2', textClass: 'silver-text', medal: '🥈' },
            3: { badgeClass: 'badge-bronze', cardClass: 'card-bronze', icon: '🥉 อันดับ 3 รองชนะเลิศ #2', baseNum: '3', textClass: 'bronze-text', medal: '🥉' }
        };
        const cfg = rankConfigs[rank] || rankConfigs[3];

        if (!isRevealed) {
            return `
                <div class="podium-step-col rank-${rank}-col is-hidden-podium" data-podium-rank="${rank}">
                    <div class="podium-card ${cfg.cardClass} is-mystery-card" title="คลิกเพื่อเริ่มประกาศผล">
                        ${rank === 1 ? '<div class="podium-crown-float" title="Champion Crown">👑</div>' : ''}
                        <div class="podium-rank-badge ${cfg.badgeClass}">${cfg.icon}</div>
                        <div class="podium-avatar-wrap mystery-avatar">
                            <span class="podium-avatar-fallback">🔒</span>
                        </div>
                        <h4 class="podium-team-name mystery-text">รอลุ้นอันดับที่ ${rank}...</h4>
                        <div class="podium-captain-row">
                            <span class="podium-captain-crown">👑</span>
                            <span class="podium-captain-label">หัวหน้าทีม:</span>
                            <span class="podium-captain-name">••••••••</span>
                        </div>
                        <div class="podium-stats-box">
                            <div class="podium-stat-row">
                                <span class="podium-stat-label">💰 เงินลงทุนรวม:</span>
                                <span class="podium-stat-val">--- บ.</span>
                            </div>
                            <div class="podium-stat-row">
                                <span class="podium-stat-label">👥 ผู้ลงทุน:</span>
                                <span class="podium-stat-val">--- คน</span>
                            </div>
                            <div class="podium-stat-row">
                                <span class="podium-stat-label">📊 สัดส่วนพอร์ต:</span>
                                <span class="podium-stat-val">---%</span>
                            </div>
                        </div>
                    </div>
                    <div class="podium-step-base">${cfg.baseNum}</div>
                </div>
            `;
        }

        if (!team) {
            return `
                <div class="podium-step-col rank-${rank}-col is-revealed-podium" data-podium-rank="${rank}">
                    <div class="podium-card ${cfg.cardClass}" style="opacity: 0.55;">
                        <div class="podium-rank-badge ${cfg.badgeClass}">${cfg.icon}</div>
                        <div class="podium-team-name" style="color: #94a3b8; font-style: italic;">ไม่มีทีมแข่งขัน</div>
                    </div>
                    <div class="podium-step-base">${cfg.baseNum}</div>
                </div>
            `;
        }

        const pct = _announceTotalMoney > 0 ? ((team.totalAmount / _announceTotalMoney) * 100).toFixed(1) : '0.0';
        const shortTeamName = formatShortTeamName(team.teamName);
        const photo = team.teamPhoto
            ? `<img src="${escHtml(team.teamPhoto)}" alt="${escHtml(team.teamName)}" class="podium-avatar-img" onerror="this.outerHTML='<span class=\\'podium-avatar-fallback\\'>🏆</span>'">`
            : `<span class="podium-avatar-fallback">🏆</span>`;
        const capName = team.captain ? team.captain.name : 'ไม่ระบุชื่อ';
        const capDept = (team.captain && team.captain.department) ? `(${team.captain.department})` : '';

        return `
            <div class="podium-step-col rank-${rank}-col is-revealed-podium" data-podium-rank="${rank}">
                <div class="podium-card ${cfg.cardClass} podium-reveal-pop">
                    ${rank === 1 ? '<div class="podium-crown-float" title="Champion Crown">👑</div>' : ''}
                    <div class="podium-rank-badge ${cfg.badgeClass}">${cfg.icon}</div>
                    <div class="podium-avatar-wrap">
                        ${photo}
                    </div>
                    <h4 class="podium-team-name" title="${escHtml(team.teamName)}">${escHtml(shortTeamName)}</h4>
                    <div class="podium-captain-row" title="หัวหน้าทีม: ${escHtml(capName)} ${escHtml(capDept)}">
                        <span class="podium-captain-crown">👑</span>
                        <span class="podium-captain-label">หัวหน้าทีม:</span>
                        <span class="podium-captain-name">${escHtml(capName)}</span>
                        ${capDept ? `<span class="podium-captain-dept">${escHtml(capDept)}</span>` : ''}
                    </div>
                    <div class="podium-stats-box">
                        <div class="podium-stat-row">
                            <span class="podium-stat-label">💰 เงินลงทุนรวม:</span>
                            <span class="podium-stat-val ${cfg.textClass}">${fmtNum(team.totalAmount)} บ.</span>
                        </div>
                        <div class="podium-stat-row">
                            <span class="podium-stat-label">👥 ผู้ลงทุน:</span>
                            <span class="podium-stat-val">${fmtNum(team.votersCount)} คน</span>
                        </div>
                        <div class="podium-stat-row">
                            <span class="podium-stat-label">📊 สัดส่วนพอร์ต:</span>
                            <span class="podium-stat-val ${cfg.textClass}">${pct}%</span>
                        </div>
                    </div>
                </div>
                <div class="podium-step-base">${cfg.baseNum}</div>
            </div>
        `;
    }

    function renderPodiumInContainer(revealedRanksSet) {
        const container = document.getElementById('announcePodiumContainer');
        if (!container) return;

        if (!_announceTeamsData || _announceTeamsData.length === 0) {
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:1.05rem;">
                    ไม่พบข้อมูลทีมแข่งขันในระบบ
                </div>
            `;
            return;
        }

        const rank1Team = _announceTeamsData[0] || null;
        const rank2Team = _announceTeamsData[1] || null;
        const rank3Team = _announceTeamsData[2] || null;

        // จัดวางบนแท่น: อันดับ 2 (ซ้าย), อันดับ 1 (กลาง สูงสุด), อันดับ 3 (ขวา)
        container.innerHTML = `
            <div class="podium-wrapper announce-podium-wrapper">
                ${buildAnnouncePodiumColHtml(rank2Team, 2, revealedRanksSet.has(2))}
                ${buildAnnouncePodiumColHtml(rank1Team, 1, revealedRanksSet.has(1))}
                ${buildAnnouncePodiumColHtml(rank3Team, 3, revealedRanksSet.has(3))}
            </div>
        `;
    }

    function revealSingleRankInDom(rank) {
        _ranksRevealedSet.add(rank);
        const idx = rank - 1;
        const team = _announceTeamsData[idx] || null;

        const container = document.getElementById('announcePodiumContainer');
        if (!container) return;

        const col = container.querySelector(`.podium-step-col[data-podium-rank="${rank}"]`);
        if (col) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = buildAnnouncePodiumColHtml(team, rank, true);
            const newCol = tempDiv.firstElementChild;
            if (newCol) {
                col.replaceWith(newCol);
            }
        }
    }

    function openWinnerSpotlightModal(team, rank) {
        const modal = document.getElementById('winnerSpotlightModal');
        const card = document.getElementById('winnerSpotlightCard');
        if (!modal || !card || !team) return;

        const rankConfigs = {
            1: { theme: 'spotlight-gold', badge: '🥇 รางวัลชนะเลิศ อันดับที่ 1', crown: '<div class="spotlight-crown">👑</div>', textClass: 'gold-text' },
            2: { theme: 'spotlight-silver', badge: '🥈 รางวัลรองชนะเลิศ อันดับที่ 2', crown: '', textClass: 'silver-text' },
            3: { theme: 'spotlight-bronze', badge: '🥉 รางวัลรองชนะเลิศ อันดับที่ 3', crown: '', textClass: 'bronze-text' }
        };
        const cfg = rankConfigs[rank] || rankConfigs[3];

        const pct = _announceTotalMoney > 0 ? ((team.totalAmount / _announceTotalMoney) * 100).toFixed(1) : '0.0';
        const photo = team.teamPhoto
            ? `<img src="${escHtml(team.teamPhoto)}" alt="${escHtml(team.teamName)}" class="spotlight-avatar-img" onerror="this.outerHTML='<span class=\\'spotlight-avatar-fallback\\'>🏆</span>'">`
            : `<span class="spotlight-avatar-fallback">🏆</span>`;
        const capName = team.captain ? team.captain.name : 'ไม่ระบุชื่อ';
        const capDept = (team.captain && team.captain.department) ? `(${team.captain.department})` : '';

        const rawMembers = (state && typeof state.getTeamMembers === 'function')
            ? state.getTeamMembers(team.id)
            : (team.rawTeam && Array.isArray(team.rawTeam.members) ? team.rawTeam.members : []);
        const memberPillsHtml = (Array.isArray(rawMembers) && rawMembers.length > 0)
            ? rawMembers.map(m => {
                const mName = (m && (m.name || m.EmpName || m.employeeId)) ? String(m.name || m.EmpName || m.employeeId).trim() : '';
                if (!mName) return '';
                return `<span class="spotlight-member-pill">${m.isCaptain ? '👑 ' : ''}${escHtml(mName)}</span>`;
            }).filter(Boolean).join('')
            : '';

        card.className = `winner-spotlight-card ${cfg.theme}`;
        card.innerHTML = `
            ${cfg.crown}
            <div class="spotlight-rank-badge">${cfg.badge}</div>
            <div class="spotlight-avatar-wrap">${photo}</div>
            <h2 class="spotlight-team-name">${escHtml(team.teamName)}</h2>
            <div class="spotlight-captain-row">
                <span>👑 หัวหน้าทีม:</span>
                <strong>${escHtml(capName)}</strong>
                ${capDept ? `<span class="spotlight-dept">${escHtml(capDept)}</span>` : ''}
            </div>
            ${memberPillsHtml ? `<div class="spotlight-members-wrap">${memberPillsHtml}</div>` : ''}
            <div class="spotlight-stats-grid">
                <div class="spotlight-stat-box">
                    <span class="spotlight-stat-label">💰 เงินลงทุนรวม</span>
                    <strong class="spotlight-stat-val ${cfg.textClass}">${fmtNum(team.totalAmount)} บาท</strong>
                </div>
                <div class="spotlight-stat-box">
                    <span class="spotlight-stat-label">👥 ผู้ลงทุน</span>
                    <strong class="spotlight-stat-val">${fmtNum(team.votersCount)} คน</strong>
                </div>
                <div class="spotlight-stat-box">
                    <span class="spotlight-stat-label">📊 สัดส่วนพอร์ต</span>
                    <strong class="spotlight-stat-val ${cfg.textClass}">${pct}%</strong>
                </div>
            </div>
            <div class="spotlight-footer-hint">🎆 กำลังจุดพลุแสดงความยินดี...</div>
        `;

        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    function closeWinnerSpotlightModal() {
        const modal = document.getElementById('winnerSpotlightModal');
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
    }

    function startRankRevealSequence() {
        if (!_announceTeamsData || _announceTeamsData.length === 0) return;

        clearRevealTimers();
        closeWinnerSpotlightModal();
        _isRevealingRanks = true;
        _ranksRevealedSet.clear();

        // 1. เรนเดอร์แท่นประกาศผลในสถานะรอลุ้นผล (อันดับ 3, 2, 1)
        renderPodiumInContainer(_ranksRevealedSet);

        // 2. ปรับสถานะปุ่มประกาศผล
        const btnStart = document.getElementById('btnStartRankReveal');
        if (btnStart) {
            btnStart.classList.add('is-revealing');
            btnStart.innerHTML = `<span class="btn-reveal-icon">⏳</span> <span class="btn-reveal-text">กำลังประกาศผล...</span>`;
        }
        const btnSkip = document.getElementById('btnSkipRankReveal');
        if (btnSkip) btnSkip.style.display = 'inline-flex';

        const sound = window.sound || window.soundEffects;
        const rank3Team = _announceTeamsData[2] || null;
        const rank2Team = _announceTeamsData[1] || null;
        const rank1Team = _announceTeamsData[0] || null;

        // ลำดับการประกาศผล: แสดง Lightbox รายละเอียดทีม -> จุดพลุ -> ปิด Lightbox -> นำข้อมูลขึ้นแท่น (ไล่ 3 -> 2 -> 1)
        const triggerStep = (rank, team, startMs, holdMs, isChampion, onDone) => {
            _revealTimeouts.push(setTimeout(() => {
                if (team) {
                    openWinnerSpotlightModal(team, rank);
                    triggerFireworksCelebration();
                    if (isChampion) {
                        if (sound && typeof sound.playApplause === 'function') sound.playApplause(6.0);
                        else if (sound && typeof sound.playWin === 'function') sound.playWin();
                    } else if (sound && typeof sound.playDing === 'function') {
                        sound.playDing();
                    }
                }
            }, startMs));

            _revealTimeouts.push(setTimeout(() => {
                closeWinnerSpotlightModal();
                revealSingleRankInDom(rank);
                if (isChampion) {
                    triggerFireworksCelebration();
                }
                if (typeof onDone === 'function') onDone();
            }, startMs + holdMs));
        };

        // อันดับ 3 (t = 0 -> แสดง 3.5 วิ -> ขึ้นแท่น)
        triggerStep(3, rank3Team, 0, 3500, false);

        // อันดับ 2 (t = 4.2 วิ -> แสดง 3.5 วิ -> ขึ้นแท่น)
        triggerStep(2, rank2Team, 4200, 3500, false);

        // อันดับ 1 (t = 8.4 วิ -> แสดง 4.5 วิ -> ขึ้นแท่นพร้อมพลุเฉลิมฉลอง)
        triggerStep(1, rank1Team, 8400, 4500, true, () => {
            _isRevealingRanks = false;
            if (btnStart) {
                btnStart.classList.remove('is-revealing');
                btnStart.innerHTML = `<span class="btn-reveal-icon">🔄</span> <span class="btn-reveal-text">ประกาศผลอีกครั้ง</span>`;
            }
            if (btnSkip) btnSkip.style.display = 'none';
        });
    }

    function skipRankRevealAnimation() {
        clearRevealTimers();
        closeWinnerSpotlightModal();
        _isRevealingRanks = false;
        for (let r = 1; r <= 3; r++) {
            revealSingleRankInDom(r);
        }
        triggerFireworksCelebration();
        const sound = window.sound || window.soundEffects;
        if (sound && typeof sound.playApplause === 'function') {
            sound.playApplause(5.0);
        } else if (sound && typeof sound.playWin === 'function') {
            sound.playWin();
        }

        const btnStart = document.getElementById('btnStartRankReveal');
        if (btnStart) {
            btnStart.classList.remove('is-revealing');
            btnStart.innerHTML = `<span class="btn-reveal-icon">🔄</span> <span class="btn-reveal-text">ประกาศผลอีกครั้ง</span>`;
        }
        const btnSkip = document.getElementById('btnSkipRankReveal');
        if (btnSkip) btnSkip.style.display = 'none';
    }

    function handleStartRankRevealClick() {
        if (_isRevealingRanks) return;
        startRankRevealSequence();
    }

    /**
     * แสดงผลแท่นประกาศผลรางวัลผู้ชนะเลิศ อันดับ 3, 2, 1 ทางด้านขวามือ
     */
    function renderAnnounceCapsuleLeaderboard(teamsData, totalMoneyInvested) {
        const container = document.getElementById('announcePodiumContainer');
        if (!container) return;

        if (!teamsData || teamsData.length === 0) {
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:1.05rem;">
                    ไม่พบข้อมูลทีมแข่งขันในระบบ
                </div>
            `;
            return;
        }

        _announceTeamsData = teamsData;
        _announceTotalMoney = totalMoneyInvested;
        clearRevealTimers();
        _isRevealingRanks = false;
        _ranksRevealedSet.clear();

        // รีเซ็ตปุ่มเริ่มประกาศผล
        const btnStart = document.getElementById('btnStartRankReveal');
        if (btnStart) {
            btnStart.classList.remove('is-revealing');
            btnStart.innerHTML = `<span class="btn-reveal-icon">🎬</span> <span class="btn-reveal-text">เริ่มประกาศผล</span>`;
        }
        const btnSkip = document.getElementById('btnSkipRankReveal');
        if (btnSkip) btnSkip.style.display = 'none';

        // เรนเดอร์เริ่มต้นในสถานะรอลุ้นผลบนแท่นประกาศผล (3, 2, 1)
        renderPodiumInContainer(_ranksRevealedSet);
    }

    /**
     * เปิดหน้าต่าง Lightbox ยืนยันการปิดรับการลงทุน AI
     */
    function openConfirmCloseInvestmentModal() {
        const modal = document.getElementById('confirmCloseInvestmentModal');
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    /**
     * ปิดหน้าต่าง Lightbox ยืนยันการปิดรับการลงทุน AI
     */
    function closeConfirmCloseInvestmentModal() {
        const modal = document.getElementById('confirmCloseInvestmentModal');
        if (!modal) return;
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 250);
    }

    /**
     * เปิดหน้าต่าง Lightbox ประกาศผลพอร์ตการลงทุน AI แบบเต็มหน้าเพจ (100vw x 100vh)
     * แสดง Stage 1: สรุปผลการเข้าร่วมกิจกรรม (สมาชิกทั้งหมด, ผู้ร่วมกิจกรรม, เงินลงทุนรวม, เงินลงทุนทั้งหมดคิดเป็นสัดส่วน, เงินคงเหลือคิดเป็นสัดส่วน)
     * พร้อมปุ่ม "🏆 ประกาศผลการแข่งขัน" เพื่อเปิดดูทำเนียบผู้ชนะอันดับ 1-3 และตารางอันดับ 4-6
     * และสั่งปิดระบบการลงทุน AI ทั้งหมดทันที
     */
    function openAnnounceResultModal() {
        const modal = document.getElementById('announceResultModal');
        if (!modal) return;

        // 1. สั่งปิดระบบการลงทุนพอร์ต AI ทั้งหมด (Master Vote & ทุกทีม = closed)
        closeAllAiInvestments();

        // 2. คำนวณสรุปผลตามที่ระบุ:
        //    - สมาชิกทั้งหมด (พนักงานทั้งหมดในระบบ)
        //    - จำนวนผู้ร่วมกิจกรรม (ส่วนของสัดส่วนคิดจากสมาชิกทั้งหมดเทียบกับผู้ลงทะเบียน)
        //    - เงินลงทุนรวม
        //    - จำนวนเงินลงทุนทั้งหมด (คิดเป็นสัดส่วน)
        //    - จำนวนเงินคงเหลือ (คิดเป็นสัดส่วน)
        const members = (state && typeof state.getMembers === 'function') ? state.getMembers() : [];
        const totalMembersCount = Array.isArray(members) ? members.length : 0;
        const registered = Array.isArray(members) ? members.filter(m => m.registered === true) : [];
        const registeredCount = registered.length;
        const totalEligible = registeredCount > 0 ? registeredCount : (totalMembersCount || 1);

        const budgetPerPerson = (state && typeof state.getVoteBudget === 'function') ? state.getVoteBudget() : 1000000;
        const totalInitialBudget = totalEligible * budgetPerPerson;

        const allUserInv = (state && typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        let activeInvestorsCount = 0;
        let totalMoneyInvested = 0;

        Object.entries(allUserInv).forEach(([empId, userMap]) => {
            if (!userMap || typeof userMap !== 'object') return;
            let userTotal = 0;
            Object.values(userMap).forEach(amt => {
                const val = parseFloat(amt) || 0;
                if (val > 0) {
                    userTotal += val;
                    totalMoneyInvested += val;
                }
            });
            if (userTotal > 0) activeInvestorsCount++;
        });

        // กรณีสำรองถ้าไม่มีข้อมูลใน allUserInv โดยตรง
        if (totalMoneyInvested === 0) {
            const players = (state && typeof state.getPlayers === 'function') ? state.getPlayers() : (allPlayersList || []);
            players.forEach(p => {
                totalMoneyInvested += (parseFloat(p.voteAmount) || 0);
            });
        }

        // สัดส่วนคิดจากสมาชิกทั้งหมดเทียบกับผู้ลงทะเบียน:
        const regPct = totalMembersCount > 0 ? ((registeredCount / totalMembersCount) * 100).toFixed(1) : '0.0';
        const investedMoneyPct = totalInitialBudget > 0 ? ((totalMoneyInvested / totalInitialBudget) * 100).toFixed(1) : '0.0';
        const remainingMoney = Math.max(0, totalInitialBudget - totalMoneyInvested);
        const remainingMoneyPct = Math.max(0, (100 - parseFloat(investedMoneyPct))).toFixed(1);

        // กล่องที่ 1 (ใหม่): สมาชิกทั้งหมด
        const elTotalMembers = document.getElementById('announceKpiTotalMembers');
        if (elTotalMembers) elTotalMembers.textContent = fmtNum(totalMembersCount);

        const elTotalMembersHint = document.getElementById('announceKpiTotalMembersHint');
        if (elTotalMembersHint) elTotalMembersHint.textContent = `(พนักงานทั้งหมดในระบบ ${fmtNum(totalMembersCount)} ท่าน)`;

        // กล่องที่ 2: จำนวนผู้ร่วมกิจกรรม (ส่วนของสัดส่วนคิดจากสมาชิกทั้งหมดเทียบกับผู้ลงทะเบียน)
        const elActiveVoters = document.getElementById('announceKpiActiveVoters');
        if (elActiveVoters) elActiveVoters.textContent = fmtNum(activeInvestorsCount);

        const elActiveHint = document.getElementById('announceKpiActiveHint');
        if (elActiveHint) elActiveHint.textContent = `(ลงทะเบียน ${fmtNum(registeredCount)} จากสมาชิก ${fmtNum(totalMembersCount)} คน คิดเป็น ${regPct}%)`;

        // กล่องที่ 3: เงินลงทุนรวม
        const elTotalInvested = document.getElementById('announceKpiTotalInvested');
        if (elTotalInvested) elTotalInvested.textContent = fmtNum(totalMoneyInvested);

        // กล่องที่ 4: จำนวนเงินลงทุนทั้งหมด (บาท) (แก้ไขจากเดิมที่แสดงเป็นสัดส่วน)
        const elInvestedAmount = document.getElementById('announceKpiInvestedAmount') || document.getElementById('announceKpiInvestedPct');
        if (elInvestedAmount) elInvestedAmount.textContent = fmtNum(totalMoneyInvested);

        const elInvestedHint = document.getElementById('announceKpiInvestedHint');
        if (elInvestedHint) elInvestedHint.innerHTML = `(คิดเป็น <strong class="kpi-orange-highlight">${investedMoneyPct}%</strong> จากงบทั้งหมด <strong class="kpi-orange-highlight">${fmtNum(totalInitialBudget)}</strong> บาท)`;

        // กล่องที่ 5: จำนวนเงินคงเหลือ (บาท) (แก้ไขจากเดิมที่แสดงเป็นสัดส่วน)
        const elRemainingAmount = document.getElementById('announceKpiRemainingAmount') || document.getElementById('announceKpiRemainingPct');
        if (elRemainingAmount) elRemainingAmount.textContent = fmtNum(remainingMoney);

        const elRemainingHint = document.getElementById('announceKpiRemainingHint');
        if (elRemainingHint) elRemainingHint.innerHTML = `(คิดเป็น <strong class="kpi-orange-highlight">${remainingMoneyPct}%</strong> จากงบทั้งหมด <strong class="kpi-orange-highlight">${fmtNum(totalInitialBudget)}</strong> บาท)`;

        // แถบเปรียบเทียบสัดส่วนงบประมาณ (Dual Bar)
        const elDualInvestedLabel = document.getElementById('dualBarInvestedLabel');
        if (elDualInvestedLabel) elDualInvestedLabel.textContent = `${fmtNum(totalMoneyInvested)} บาท (${investedMoneyPct}%)`;

        const elDualRemainingLabel = document.getElementById('dualBarRemainingLabel');
        if (elDualRemainingLabel) elDualRemainingLabel.textContent = `${fmtNum(remainingMoney)} บาท (${remainingMoneyPct}%)`;

        const elDualFillInvested = document.getElementById('dualBarFillInvested');
        if (elDualFillInvested) elDualFillInvested.style.width = `${Math.min(parseFloat(investedMoneyPct), 100)}%`;

        const elDualFillRemaining = document.getElementById('dualBarFillRemaining');
        if (elDualFillRemaining) elDualFillRemaining.style.width = `${Math.min(parseFloat(remainingMoneyPct), 100)}%`;

        // 3. ดึงข้อมูลทีมและจัดอันดับจากมากที่สุดไปน้อยสุด
        const teamsData = getAggregatedTeamsData();

        // 4. แสดงผลรายการจัดอันดับทีมในรูปแบบแถบแคปซูลสีสดใสทางด้านขวามือ (ตามดีไซน์รูปที่ 2)
        renderAnnounceCapsuleLeaderboard(teamsData, totalMoneyInvested);

        // 6. กำหนดให้แสดง Stage 1 (สรุปผลการเข้าร่วมกิจกรรม) และซ่อน Stage 2
        const stageSummary = document.getElementById('announceStageSummary');
        if (stageSummary) stageSummary.style.display = 'flex';

        const stageWinners = document.getElementById('announceStageWinners');
        if (stageWinners) stageWinners.style.display = 'none';

        // 7. แสดง Modal แบบเต็มหน้าจอ (100vw x 100vh)
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        // 8. จุดพลุแสดงความยินดีทันทีเมื่อเปิดหน้านี้ (ตามคำขอ)
        setTimeout(() => {
            triggerFireworksCelebration();
        }, 250);

        // 9. แสดง Toast แจ้งเตือน
        showToast('🔒 ปิดระบบการลงทุนพอร์ต AI ทั้งหมด และสรุปผลเรียบร้อยแล้ว!', 'success');
    }

    /**
     * สลับหน้าจอไปยัง Stage 2: "ประกาศผลการแข่งขัน"
     * แสดงอันดับทีมที่ชนะ อันดับที่ 1, 2, 3 (Podium) และทีมที่ 4-6 เป็นตาราง
     * พร้อมเสียงเฉลิมฉลองและพลุ Confetti
     */
    function switchToWinnersStage() {
        const stageSummary = document.getElementById('announceStageSummary');
        const stageWinners = document.getElementById('announceStageWinners');
        if (stageSummary) stageSummary.style.display = 'none';
        if (stageWinners) stageWinners.style.display = 'flex';

        const teamsData = getAggregatedTeamsData();
        const totalMoneyInvested = teamsData.reduce((acc, t) => acc + (t.totalAmount || 0), 0);

        // เรนเดอร์โพเดียมอันดับ 1-3 และตารางอันดับ 4-6
        renderCompetitionWinners(teamsData, totalMoneyInvested);

        // เล่นเสียงเพลงแห่งชัยชนะและจุดพลุ Confetti
        triggerWinnerCelebration();
    }

    /**
     * สลับหน้าจอกลับไปยัง Stage 1: "สรุปผลการเข้าร่วมกิจกรรม"
     */
    function switchToSummaryStage() {
        const stageSummary = document.getElementById('announceStageSummary');
        const stageWinners = document.getElementById('announceStageWinners');
        if (stageWinners) stageWinners.style.display = 'none';
        if (stageSummary) stageSummary.style.display = 'flex';
    }

    /**
     * เรนเดอร์ผลการแข่งขัน:
     * - อันดับที่ 1, 2, 3 แสดงเป็นโพเดียม (Podium)
     * - อันดับที่ 4 - 6 แสดงเป็นตาราง (Table)
     */
    function renderCompetitionWinners(teamsData, totalMoneyInvested) {
        const podiumContainer = document.getElementById('podiumTop3Container');
        const tableBody = document.getElementById('winnersTableBody');

        if (!podiumContainer || !tableBody) return;

        // ฟังก์ชันย่อยสำหรับสร้าง HTML ของการ์ดในแต่ละอันดับของโพเดียม
        function buildPodiumCol(team, rank) {
            if (!team) {
                return `
                    <div class="podium-step-col rank-${rank}-col">
                        <div class="podium-card card-silver" style="opacity: 0.5;">
                            <div class="podium-rank-badge badge-silver">อันดับ #${rank}</div>
                            <div class="podium-team-name" style="color: #94a3b8; font-style: italic;">ไม่มีทีมแข่งขัน</div>
                        </div>
                        <div class="podium-step-base">${rank}</div>
                    </div>
                `;
            }

            const pct = totalMoneyInvested > 0 ? ((team.totalAmount / totalMoneyInvested) * 100).toFixed(1) : '0.0';
            const rankConfigs = {
                1: { class: 'badge-gold', cardClass: 'card-gold', icon: '🥇 อันดับ 1 ชนะเลิศ (Champion)', baseNum: '1', textClass: 'gold-text' },
                2: { class: 'badge-silver', cardClass: 'card-silver', icon: '🥈 อันดับ 2 รองชนะเลิศ #1', baseNum: '2', textClass: 'silver-text' },
                3: { class: 'badge-bronze', cardClass: 'card-bronze', icon: '🥉 อันดับ 3 รองชนะเลิศ #2', baseNum: '3', textClass: 'bronze-text' }
            };
            const cfg = rankConfigs[rank] || rankConfigs[3];
            const photo = team.teamPhoto ? `<img src="${escHtml(team.teamPhoto)}" alt="${escHtml(team.teamName)}" class="podium-avatar-img" onerror="this.outerHTML='<span class=\\'podium-avatar-fallback\\'>🏆</span>'">` : `<span class="podium-avatar-fallback">🏆</span>`;
            const capName = team.captain ? team.captain.name : 'ไม่ระบุชื่อ';
            const capDept = (team.captain && team.captain.department) ? `(${team.captain.department})` : '';

            return `
                <div class="podium-step-col rank-${rank}-col">
                    <div class="podium-card ${cfg.cardClass}">
                        ${rank === 1 ? '<div class="podium-crown-float" title="Champion Crown">👑</div>' : ''}
                        <div class="podium-rank-badge ${cfg.class}">${cfg.icon}</div>
                        <div class="podium-avatar-wrap">
                            ${photo}
                        </div>
                        <h4 class="podium-team-name" title="${escHtml(team.teamName)}">${escHtml(team.teamName)}</h4>
                        <div class="podium-captain-row" title="หัวหน้าทีม: ${escHtml(capName)} ${escHtml(capDept)}">
                            <span class="podium-captain-crown">👑</span>
                            <span class="podium-captain-label">หัวหน้าทีม:</span>
                            <span class="podium-captain-name">${escHtml(capName)}</span>
                            ${capDept ? `<span class="podium-captain-dept">${escHtml(capDept)}</span>` : ''}
                        </div>
                        <div class="podium-stats-box">
                            <div class="podium-stat-row">
                                <span class="podium-stat-label">💰 เงินลงทุนรวม:</span>
                                <span class="podium-stat-val ${cfg.textClass}">${fmtNum(team.totalAmount)} บ.</span>
                            </div>
                            <div class="podium-stat-row">
                                <span class="podium-stat-label">👥 ผู้ลงทุน:</span>
                                <span class="podium-stat-val">${fmtNum(team.votersCount)} คน</span>
                            </div>
                            <div class="podium-stat-row">
                                <span class="podium-stat-label">📊 สัดส่วนพอร์ต:</span>
                                <span class="podium-stat-val ${cfg.textClass}">${pct}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="podium-step-base">${cfg.baseNum}</div>
                </div>
            `;
        }

        // 1. จัดเรียงอันดับโพเดียม 3 ลำดับแรก:
        //    ซ้าย = อันดับ 2, กลาง = อันดับ 1 (เด่นสุด สูงสุด), ขวา = อันดับ 3
        const rank1Team = teamsData[0] || null;
        const rank2Team = teamsData[1] || null;
        const rank3Team = teamsData[2] || null;

        podiumContainer.innerHTML = `
            ${buildPodiumCol(rank2Team, 2)}
            ${buildPodiumCol(rank1Team, 1)}
            ${buildPodiumCol(rank3Team, 3)}
        `;

        // 2. จัดอันดับทีมที่ 4 - 6 เป็นตาราง
        const tableTeams = teamsData.slice(3);
        if (tableTeams.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 28px; color: #94a3b8; font-style: italic;">
                        ไม่มีทีมแข่งขันในอันดับที่ 4 - 6
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = tableTeams.map((team, idx) => {
                const rank = idx + 4;
                const pct = totalMoneyInvested > 0 ? ((team.totalAmount / totalMoneyInvested) * 100).toFixed(1) : '0.0';
                const photo = team.teamPhoto ? `<img src="${escHtml(team.teamPhoto)}" alt="${escHtml(team.teamName)}" class="table-team-avatar" onerror="this.outerHTML='<span class=\\'table-team-avatar\\' style=\\'display:flex;align-items:center;justify-content:center;font-size:1.4rem;\\'>👥</span>'">` : `<span class="table-team-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;">👥</span>`;
                const capName = team.captain ? team.captain.name : 'ไม่ระบุชื่อ';
                const capDept = (team.captain && team.captain.department) ? `(${team.captain.department})` : '';

                return `
                    <tr>
                        <td style="text-align: center;">
                            <span class="table-rank-pill">#${rank}</span>
                        </td>
                        <td>
                            <div class="table-team-cell">
                                ${photo}
                                <div class="table-team-info">
                                    <span class="table-team-name" title="${escHtml(team.teamName)}">${escHtml(team.teamName)}</span>
                                    <span class="table-team-sub">สัดส่วนพอร์ต ${pct}%</span>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="table-captain-cell" title="หัวหน้าทีม: ${escHtml(capName)} ${escHtml(capDept)}">
                                <span style="color: #fbbf24;">👑</span>
                                <span class="table-captain-name">${escHtml(capName)}</span>
                                ${capDept ? `<span class="table-captain-dept">${escHtml(capDept)}</span>` : ''}
                            </div>
                        </td>
                        <td style="text-align: center;">
                            <span style="font-weight: 500; color: #38bdf8;">👥 ${fmtNum(team.votersCount)}</span> <span style="font-size: 0.8rem; color: #94a3b8;">คน</span>
                        </td>
                        <td>
                            <div class="table-money-cell">💰 ${fmtNum(team.totalAmount)} <span style="font-size: 0.8rem; color: #94a3b8;">บาท</span></div>
                            <div class="table-pct-cell">คิดเป็น ${pct}% ของพอร์ต</div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    /**
     * เอฟเฟกต์เฉลิมฉลอง: เล่นเสียง Fanfare ชนะเลิศ และยิงพลุ Confetti
     */
    function triggerWinnerCelebration() {
        // 1. เล่นเสียง Victory Fanfare
        const sound = window.sound || window.soundEffects || (typeof SoundEffects !== 'undefined' ? new SoundEffects() : null);
        if (sound && typeof sound.playWin === 'function') {
            sound.playWin();
        }

        // 2. ยิงพลุเฉลิมฉลอง Confetti Fireworks หลากสีสัน
        if (typeof confetti === 'function') {
            const duration = 4.5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 42, spread: 360, ticks: 75, zIndex: 10000000 };

            function randomInRange(min, max) {
                return Math.random() * (max - min) + min;
            }

            const interval = setInterval(function() {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }
                const particleCount = 65 * (timeLeft / duration);
                try {
                    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.12, 0.38), y: Math.random() - 0.2 } }));
                    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.62, 0.88), y: Math.random() - 0.2 } }));
                } catch (_) {}
            }, 260);
        } else if (window.confettiSystem && typeof window.confettiSystem.celebrate === 'function') {
            try {
                window.confettiSystem.celebrate(4500);
            } catch (_) {}
        }
    }

    /**
     * จุดพลุเฉลิมฉลองการจัดสรรพอร์ตการลงทุน (Celebration Fireworks)
     * ยิงจรวดพลุขึ้นสู่ท้องฟ้าและแตกกระจาย พร้อมสะเก็ดดาวระยิบระยับรอบทิศทาง
     */
    function triggerFireworksCelebration() {
        // เล่นเสียงเพลงแห่งความสำเร็จ/ชัยชนะ
        const sound = window.sound || window.soundEffects || (typeof SoundEffects !== 'undefined' ? new SoundEffects() : null);
        if (sound && typeof sound.playWin === 'function') {
            try { sound.playWin(); } catch (_) {}
        }

        // 1. เรียกใช้งาน ConfettiSystem.fireworks() เพื่อยิงจรวดพลุวิถีโค้งขึ้นไปแตกกระจายบนท้องฟ้า
        if (window.confettiSystem) {
            try {
                if (typeof window.confettiSystem.init === 'function') {
                    window.confettiSystem.init();
                }
                const canvas = document.getElementById('confetti-canvas');
                if (canvas) {
                    canvas.style.zIndex = '10000005';
                    canvas.style.display = 'block';
                }
                if (typeof window.confettiSystem.fireworks === 'function') {
                    window.confettiSystem.fireworks(4500);
                } else if (typeof window.confettiSystem.celebrate === 'function') {
                    window.confettiSystem.celebrate(4500);
                }
            } catch (e) {
                console.warn('[Fireworks] confettiSystem error:', e);
            }
        }

        // 2. เสริมด้วย Canvas Confetti Fireworks กระจายรอบทิศทางทั้งด้านซ้าย ขวา และกลางจอ
        const cFunc = window.canvasConfetti || (typeof confetti === 'function' ? confetti : null);
        if (typeof cFunc === 'function') {
            try {
                const duration = 3.5 * 1000;
                const animationEnd = Date.now() + duration;
                const defaults = { startVelocity: 46, spread: 360, ticks: 70, zIndex: 10000005 };

                function randomInRange(min, max) {
                    return Math.random() * (max - min) + min;
                }

                // ระลอกแรกยิงออกพร้อมกันสองฟาก
                cFunc(Object.assign({}, defaults, {
                    particleCount: 80,
                    origin: { x: 0.18, y: 0.62 },
                    colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981', '#6366f1']
                }));
                cFunc(Object.assign({}, defaults, {
                    particleCount: 80,
                    origin: { x: 0.82, y: 0.62 },
                    colors: ['#ec4899', '#f97316', '#3b82f6', '#d946ef', '#ffffff']
                }));

                // ยิงลูกพลุต่อเนื่องตามระลอก
                const interval = setInterval(function() {
                    const timeLeft = animationEnd - Date.now();
                    if (timeLeft <= 0) {
                        return clearInterval(interval);
                    }
                    const particleCount = 55 * (timeLeft / duration);
                    cFunc(Object.assign({}, defaults, {
                        particleCount,
                        origin: { x: randomInRange(0.15, 0.45), y: Math.random() * 0.4 + 0.1 }
                    }));
                    cFunc(Object.assign({}, defaults, {
                        particleCount,
                        origin: { x: randomInRange(0.55, 0.85), y: Math.random() * 0.4 + 0.1 }
                    }));
                }, 280);
            } catch (err) {
                console.warn('[Fireworks] canvasConfetti error:', err);
            }
        }
    }

    /**
     * ปิดหน้าต่าง Lightbox ประกาศผล
     */
    function closeAnnounceResultModal() {
        clearRevealTimers();
        closeWinnerSpotlightModal();
        _isRevealingRanks = false;
        const modal = document.getElementById('announceResultModal');
        if (!modal) return;

        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    // Auto-run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
