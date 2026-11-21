/**
 * ========================================================
 * SHOWPORT.JS - นักลงทุน AI แดชบอร์ดสรุปผลพอร์ตการลงทุน (showport.html)
 * ระบบเปรียบเทียบพอร์ตการลงทุน 2 ทีมแบบประกบคู่ (50% / 50%)
 * ========================================================
 */

(function () {
    'use strict';

    // Current State for Dual Comparison Columns
    let selectedTeamId1 = null;
    let selectedTeamId2 = null;
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

        // Real-time synchronization listeners
        // 1. LocalStorage cross-tab sync
        window.addEventListener('storage', (e) => {
            if (e.key === 'crsdg_all_user_investments' || e.key === 'crsdg_player' || e.key === 'crsdg_member' || e.key === 'crsdg_vote_open' || e.key === 'crsdg_vote_budget') {
                renderDashboard();
            }
        });

        // 2. BroadcastChannel across all tabs & windows (matches state.js crsdg_game_channel)
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const gameChannel = new BroadcastChannel('crsdg_game_channel');
                gameChannel.onmessage = () => {
                    renderDashboard();
                };
                const legacyChannel = new BroadcastChannel('crsdg_channel');
                legacyChannel.onmessage = () => {
                    renderDashboard();
                };
            } catch (err) {
                console.warn('[Showport] BroadcastChannel notice:', err);
            }
        }

        // 3. StateManager Subscription (same page / active state events)
        if (state && typeof state.subscribe === 'function') {
            state.subscribe((evt) => {
                renderDashboard();
            });
        }

        // 4. Firebase Cloud Real-time Subscription (multi-device live updates)
        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.subscribe === 'function') {
            FirebaseSync.subscribe((evt) => {
                renderDashboard();
            });
        }

        // 5. Periodic polling fallback (every 2.5 seconds to guarantee live projector/dashboard freshness)
        setInterval(() => {
            renderDashboard();
        }, 2500);
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

        // 4. ปุ่มประกาศผลพอร์ตการลงทุน AI (Announce Result Modal & Close AI Investments)
        const btnAnnounceResult = document.getElementById('btnAnnounceResult');
        if (btnAnnounceResult) {
            btnAnnounceResult.addEventListener('click', () => {
                openAnnounceResultModal();
            });
        }

        // 5. ปุ่มปิดหน้าต่าง Lightbox ประกาศผล
        const btnCloseAnnounceModal = document.getElementById('btnCloseAnnounceModal');
        if (btnCloseAnnounceModal) {
            btnCloseAnnounceModal.addEventListener('click', () => {
                closeAnnounceResultModal();
            });
        }

        // 6. คลิกพื้นหลัง Lightbox หรือกดปุ่ม Escape เพื่อปิด
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
        if (!allPlayersList || allPlayersList.length === 0) {
            const teamNames = (typeof state.getTeamNames === 'function') ? state.getTeamNames() : [];
            allPlayersList = teamNames.map((t, idx) => ({
                id: t.id || ('team_' + idx),
                teamName: t.name,
                orderNo: idx + 1,
                teamPhoto: '',
                description: '',
                voteAmount: 0,
                voterCount: 0,
                voteStatus: 'open',
                members: []
            }));
        }

        allPlayersList.sort((a, b) => (parseInt(a.orderNo, 10) || 0) - (parseInt(b.orderNo, 10) || 0));

        // Ensure selected teams exist for Column 1 & Column 2
        if (!selectedTeamId1 || !allPlayersList.some(p => p.id === selectedTeamId1)) {
            selectedTeamId1 = allPlayersList[0] ? allPlayersList[0].id : null;
        }

        if (!selectedTeamId2 || !allPlayersList.some(p => p.id === selectedTeamId2)) {
            // Pick second team by default if exists, else first team
            selectedTeamId2 = allPlayersList.length > 1 ? allPlayersList[1].id : (allPlayersList[0] ? allPlayersList[0].id : null);
        }

        // 3. Render Team Selector Buttons for Column 1 & Column 2
        // (โดยปุ่มจะแสดง ทีมที่ 1-ทีมสุดท้าย ไม่ต้องแสดงชื่อทีม)
        renderTeamButtons(1);
        renderTeamButtons(2);

        // 4. Render Team Details for Column 1 & Column 2 & Dynamic Theme Comparison
        const amt1 = renderTeamColumn(1, selectedTeamId1);
        const amt2 = renderTeamColumn(2, selectedTeamId2);
        updateComparisonThemes(amt1, amt2);
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
    function renderTeamButtons(colIndex) {
        const container = document.getElementById(`teamButtonsCol${colIndex}`);
        const metaEl = document.getElementById(`teamPickerMetaCol${colIndex}`);
        if (!container) return;

        const currentActiveId = (colIndex === 1) ? selectedTeamId1 : selectedTeamId2;

        if (metaEl) {
            metaEl.textContent = `ทั้งหมด ${allPlayersList.length} ทีม`;
        }

        if (allPlayersList.length === 0) {
            container.innerHTML = '<div style="color: #94a3b8; font-size: 0.85rem;">ยังไม่มีข้อมูลทีมแข่งขัน</div>';
            return;
        }

        // Render buttons strictly as ทีมที่ 1 - ทีมสุดท้าย without team names
        container.innerHTML = allPlayersList.map(p => {
            const order = p.orderNo || 1;
            const isSelected = (p.id === currentActiveId);

            return `
                <button type="button" class="btn-team-pick ${isSelected ? 'active' : ''}" 
                    data-team-id="${p.id}" 
                    title="เลือกเปรียบเทียบทีมที่ ${order}"
                    onclick="window.selectTeamForCol(${colIndex}, '${p.id}')">
                    ทีมที่ ${order}
                </button>
            `;
        }).join('');
    }

    // Global Team Selection Handler for each column
    window.selectTeamForCol = function (colIndex, teamId) {
        if (colIndex === 1) {
            selectedTeamId1 = teamId;
        } else if (colIndex === 2) {
            selectedTeamId2 = teamId;
        }
        renderTeamButtons(1);
        renderTeamButtons(2);
        const amt1 = renderTeamColumn(1, selectedTeamId1);
        const amt2 = renderTeamColumn(2, selectedTeamId2);
        updateComparisonThemes(amt1, amt2);
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
        const targetTeamId = (colIndex === 1) ? selectedTeamId1 : selectedTeamId2;
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

    // ========================================================
    // 3. COMPARISON THEME CONTROLLER
    // หากทีมที่เปรียบเทียบกันทีมไหนมีเงินลงทุนมากกว่าอีกทีม ให้แสดงสีพื้นเป็นสีม่วง
    // หากทีมที่แพ้ให้เป็นสีพื้นปกติที่แสดงผลอยู่
    // ========================================================
    function updateComparisonThemes(amt1, amt2) {
        const col1 = document.getElementById('compareCol1');
        const col2 = document.getElementById('compareCol2');
        const badge1 = document.getElementById('colIndicatorBadge1');
        const badge2 = document.getElementById('colIndicatorBadge2');

        if (!col1 || !col2) return;

        const val1 = parseFloat(amt1) || 0;
        const val2 = parseFloat(amt2) || 0;

        if (val1 > val2) {
            // ทีมที่ 1 มีเงินลงทุนมากกว่า -> สีม่วง (.theme-higher-purple)
            // ทีมที่ 2 เงินลงทุนน้อยกว่า (ทีมที่แพ้) -> สีพื้นปกติ (.theme-normal-default)
            col1.classList.add('theme-higher-purple');
            col1.classList.remove('theme-normal-default');

            col2.classList.remove('theme-higher-purple');
            col2.classList.add('theme-normal-default');

            if (badge1) badge1.innerHTML = 'ทีมเปรียบเทียบที่ 1 <span class="winner-crown-tag">👑 เงินลงทุนมากกว่า</span>';
            if (badge2) badge2.textContent = 'ทีมเปรียบเทียบที่ 2';
        } else if (val2 > val1) {
            // ทีมที่ 2 มีเงินลงทุนมากกว่า -> สีม่วง (.theme-higher-purple)
            // ทีมที่ 1 เงินลงทุนน้อยกว่า (ทีมที่แพ้) -> สีพื้นปกติ (.theme-normal-default)
            col2.classList.add('theme-higher-purple');
            col2.classList.remove('theme-normal-default');

            col1.classList.remove('theme-higher-purple');
            col1.classList.add('theme-normal-default');

            if (badge2) badge2.innerHTML = 'ทีมเปรียบเทียบที่ 2 <span class="winner-crown-tag">👑 เงินลงทุนมากกว่า</span>';
            if (badge1) badge1.textContent = 'ทีมเปรียบเทียบที่ 1';
        } else {
            // ยอดเงินลงทุนเท่ากัน -> แสดงสีพื้นปกติทั้ง 2 ทีม
            col1.classList.remove('theme-higher-purple');
            col1.classList.add('theme-normal-default');

            col2.classList.remove('theme-higher-purple');
            col2.classList.add('theme-normal-default');

            if (badge1) badge1.textContent = 'ทีมเปรียบเทียบที่ 1';
            if (badge2) badge2.textContent = 'ทีมเปรียบเทียบที่ 2';
        }
    }

    // ========================================================
    // 4. RENDER TEAM COLUMN DETAIL (Reusable for Col 1 & Col 2)
    // แสดงรูปภาพ ชื่อทีม หัวหน้าทีม และผลตามรูป (จำนวนผู้ลงทุน, จำนวนเงินลงทุน, 3 Gauges)
    // ========================================================
    function renderTeamColumn(colIndex, teamId) {
        if (!allPlayersList || allPlayersList.length === 0) return 0;

        const team = allPlayersList.find(p => p.id === teamId) || allPlayersList[0];
        if (!team) return 0;

        const orderNo = team.orderNo || 1;
        const teamName = team.teamName || team.name || `ทีมที่ ${orderNo}`;
        const teamPhoto = team.teamPhoto || team.photo || '';
        const teamDesc = team.description || team.projectDesc || 'ทีมแข่งขันเวที AI Pitching';
        const isTeamOpen = (team.voteStatus !== 'closed');
        const teamMembers = Array.isArray(team.members) ? team.members : [];

        // All User Investments & Members data
        const allUserInv = (typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        const allMembers = (typeof state.getMembers === 'function') ? state.getMembers() : [];

        // Build member map for departments
        const memberDeptMap = new Map();
        allMembers.forEach(m => {
            const grp = (m.Group || m.department || m.Department || 'ไม่ระบุสังกัด').trim();
            const id1 = String(m.EmployeeID || '').trim().toLowerCase();
            const id2 = String(m.id || '').trim().toLowerCase();
            if (id1) memberDeptMap.set(id1, grp);
            if (id2) memberDeptMap.set(id2, grp);
        });

        // 1. Calculate Selected Team Investment & Voters Count
        let teamTotalAmount = 0;
        const teamVotersSet = new Set();
        let totalMoneyInvestedAll = 0;
        let totalAllInvestorsCount = 0;
        let inGroupMoney = 0;
        const groupFunds = {}; // { [groupName]: { groupName, amount, voters: Set } }

        // Set of departments for team members (for Bias calculation)
        const homeDepts = new Set(
            teamMembers.map(m => (m.department || m.Group || '').trim().toLowerCase()).filter(Boolean)
        );

        Object.entries(allUserInv).forEach(([empId, uMap]) => {
            if (!uMap || typeof uMap !== 'object') return;
            const cleanId = String(empId).trim().toLowerCase();
            const grp = memberDeptMap.get(cleanId) || 'ไม่ระบุสังกัด';

            let userInvestedAny = false;
            Object.entries(uMap).forEach(([tId, amt]) => {
                const val = parseFloat(amt) || 0;
                if (val > 0) {
                    totalMoneyInvestedAll += val;
                    userInvestedAny = true;

                    if (tId === team.id) {
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

        // Fallback to manual values if no direct user investment entries
        if (teamTotalAmount === 0 && team.voteAmount > 0) {
            teamTotalAmount = parseFloat(team.voteAmount) || 0;
        }
        const votersCount = teamVotersSet.size > 0 ? teamVotersSet.size : (parseInt(team.voterCount, 10) || 0);

        // -------------------------------------------------------------
        // ROW 1: รูปภาพ, ชื่อทีม, และกล่องหัวหน้าทีม (ไม่มีรายละเอียดกิจกรรม และไม่มีแถวสมาชิก)
        // -------------------------------------------------------------
        const elTeamEpPill = document.getElementById(`dispTeamEpPillCol${colIndex}`);
        if (elTeamEpPill) elTeamEpPill.textContent = `EP.${orderNo}`;

        const elTeamStatus = document.getElementById(`dispTeamStatusPillCol${colIndex}`);
        if (elTeamStatus) {
            elTeamStatus.className = `team-status-pill ${isTeamOpen ? 'open' : 'closed'}`;
            elTeamStatus.innerHTML = isTeamOpen ? '🟢 เปิดรับการลงทุน' : '🔒 ปิดรับการลงทุน';
            elTeamStatus.title = isTeamOpen ? 'คลิกเพื่อปิดรับการลงทุนทีมนี้ (ส่งคำสั่งไปยังฝั่ง index)' : 'คลิกเพื่อเปิดรับการลงทุนทีมนี้ (แสดง Lightbox แจ้งเตือนฝั่ง index ทันที)';
        }

        const elTeamTitle = document.getElementById(`dispTeamTitleCol${colIndex}`);
        if (elTeamTitle) {
            elTeamTitle.textContent = teamName;
            elTeamTitle.title = teamName; // ชี้เพื่อดูชื่อทีมเต็มกรณีตัดด้วย ...
        }

        const elPhotoWrap = document.getElementById(`dispTeamPhotoWrapCol${colIndex}`);
        if (elPhotoWrap) {
            if (teamPhoto) {
                elPhotoWrap.innerHTML = `<img src="${escHtml(teamPhoto)}" alt="${escHtml(teamName)}" class="team-hero-photo-img" onerror="this.outerHTML='<span class=\\'team-hero-photo-fallback\\'>🛡️</span>'">`;
            } else {
                elPhotoWrap.innerHTML = `<span class="team-hero-photo-fallback">🛡️</span>`;
            }
        }

        // Render กล่องหัวหน้าทีมใต้ชื่อทีม
        const elCaptainBox = document.getElementById(`dispTeamCaptainBoxCol${colIndex}`);
        if (elCaptainBox) {
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
        }

        // -------------------------------------------------------------
        // ROW 2: จำนวนผู้ลงทุน และ จำนวนเงินลงทุน (ตามรูปที่ผู้ใช้อัปโหลด)
        // -------------------------------------------------------------
        const elVotersCount = document.getElementById(`dispTeamVotersCountCol${colIndex}`);
        if (elVotersCount) elVotersCount.textContent = `${fmtNum(votersCount)} คน`;

        const elFundAmount = document.getElementById(`dispTeamFundAmountCol${colIndex}`);
        if (elFundAmount) elFundAmount.textContent = `${fmtNum(teamTotalAmount)} บาท`;

        // -------------------------------------------------------------
        // ROW 3: ดัชนีวิเคราะห์ความลำเอียงและสัดส่วนพอร์ต (ตามรูปที่ 2)
        // -------------------------------------------------------------
        // 1. ดัชนีลำเอียง (Bias Index)
        const biasPct = teamTotalAmount > 0 ? ((inGroupMoney / teamTotalAmount) * 100) : 0;
        const elValBias = document.getElementById(`gaugeValBiasCol${colIndex}`);
        const elCircleBias = document.getElementById(`gaugeCircleBiasCol${colIndex}`);
        const elSubBias = document.getElementById(`gaugeSubBiasCol${colIndex}`);

        if (elValBias) elValBias.textContent = `${biasPct.toFixed(1)}%`;
        if (elCircleBias) {
            const deg = Math.round((biasPct / 100) * 360);
            elCircleBias.style.setProperty('--gauge-deg', `${deg}deg`);
        }
        if (elSubBias) elSubBias.textContent = `${fmtNum(inGroupMoney)} บาท`;

        // 2. ดัชนีเงินลงทุน (Fund Index)
        const fundPct = totalMoneyInvestedAll > 0 ? ((teamTotalAmount / totalMoneyInvestedAll) * 100) : 0;
        const elValFund = document.getElementById(`gaugeValFundCol${colIndex}`);
        const elCircleFund = document.getElementById(`gaugeCircleFundCol${colIndex}`);
        const elSubFund = document.getElementById(`gaugeSubFundCol${colIndex}`);

        if (elValFund) elValFund.textContent = `${fundPct.toFixed(1)}%`;
        if (elCircleFund) {
            const deg = Math.round((fundPct / 100) * 360);
            elCircleFund.style.setProperty('--gauge-deg', `${deg}deg`);
        }
        if (elSubFund) elSubFund.textContent = `เทียบรวม ${fmtCompactMoney(totalMoneyInvestedAll)}`;

        // 3. ดัชนีผู้ลงทุน (Voters Index)
        const activeVotersPool = Math.max(totalAllInvestorsCount, 1);
        const votersPct = activeVotersPool > 0 ? ((votersCount / activeVotersPool) * 100) : 0;
        const elValVoters = document.getElementById(`gaugeValVotersCol${colIndex}`);
        const elCircleVoters = document.getElementById(`gaugeCircleVotersCol${colIndex}`);
        const elSubVoters = document.getElementById(`gaugeSubVotersCol${colIndex}`);

        if (elValVoters) elValVoters.textContent = `${votersPct.toFixed(1)}%`;
        if (elCircleVoters) {
            const deg = Math.round((votersPct / 100) * 360);
            elCircleVoters.style.setProperty('--gauge-deg', `${deg}deg`);
        }
        if (elSubVoters) elSubVoters.textContent = `จากรวม ${fmtNum(activeVotersPool)} คน`;

        // -------------------------------------------------------------
        // ROW 4: ส่วนแสดงที่มาของเงินทุน สรุปตาม Group (เรียงจากมากไปน้อย)
        // -------------------------------------------------------------
        const elFundSourceCount = document.getElementById(`dispFundSourceCountCol${colIndex}`);
        const elFundSourceList = document.getElementById(`dispFundSourceListCol${colIndex}`);

        const sortedGroups = Object.values(groupFunds)
            .filter(g => g.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        if (elFundSourceCount) {
            elFundSourceCount.textContent = `${sortedGroups.length} กลุ่ม`;
        }

        if (elFundSourceList) {
            if (sortedGroups.length === 0) {
                elFundSourceList.innerHTML = '<div class="fund-source-empty">ยังไม่มียอดเงินลงทุนจาก Group ใดในทีมนี้</div>';
            } else {
                elFundSourceList.innerHTML = sortedGroups.map((g, idx) => {
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
        }

        // Return calculated investment amount for comparison
        return teamTotalAmount;
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
            if (id1) memberDeptMap.set(id1, grp);
            if (id2) memberDeptMap.set(id2, grp);
        });

        // ดึงรายชื่อทีม
        let list = (players && players.length > 0) ? players : (allPlayersList || []);
        if (!list || list.length === 0) {
            const teamNames = (state && typeof state.getTeamNames === 'function') ? state.getTeamNames() : [];
            list = teamNames.map((t, idx) => ({
                id: t.id || ('team_' + idx),
                teamName: t.name,
                orderNo: idx + 1,
                teamPhoto: '',
                description: '',
                voteAmount: 0,
                voterCount: 0,
                voteStatus: 'closed'
            }));
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
                const grp = memberDeptMap.get(cleanId) || 'ไม่ระบุสังกัด';

                const amt = parseFloat(uMap[team.id]) || 0;
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
                groupList
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
     * เปิดหน้าต่าง Lightbox ประกาศผลพอร์ตการลงทุน AI (ขนาดกว้าง 90% สูง 90%)
     * พร้อมสรุปผล 5 กล่องด้านบน, กล่อง Group ด้านซ้าย, และกราฟด้านขวา
     * สั่งปิดระบบการลงทุน AI ทั้งหมดทันที
     */
    function openAnnounceResultModal() {
        const modal = document.getElementById('announceResultModal');
        if (!modal) return;

        // 1. สั่งปิดระบบการลงทุนพอร์ต AI ทั้งหมด (Master Vote & ทุกทีม = closed)
        closeAllAiInvestments();

        // 2. คำนวณสรุปผล 5 กล่องด้านบน:
        //    จำนวนนักลงทุน, กล่องจำนวนผู้ลงทุน (ไม่นับซ้ำ), จำนวนเงินทุนทั้งหมด, จำนวนเงินที่ลงทุน, สัดส่วนการลงทุน
        const members = (state && typeof state.getMembers === 'function') ? state.getMembers() : [];
        const registered = members.filter(m => m.registered === true);
        const totalEligible = registered.length > 0 ? registered.length : (members.length || 1);

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

        const investedMoneyPct = totalInitialBudget > 0 ? ((totalMoneyInvested / totalInitialBudget) * 100).toFixed(1) : '0.0';

        // อัปเดตตัวเลขในกล่องสรุป 5 กล่องด้านบน (font-weight: 500)
        const elTotalEligible = document.getElementById('announceKpiTotalEligible');
        if (elTotalEligible) elTotalEligible.textContent = fmtNum(totalEligible);

        const elActiveVoters = document.getElementById('announceKpiActiveVoters');
        if (elActiveVoters) elActiveVoters.textContent = fmtNum(activeInvestorsCount);

        const elTotalBudget = document.getElementById('announceKpiTotalBudget');
        if (elTotalBudget) elTotalBudget.textContent = fmtNum(totalInitialBudget);

        const elTotalInvested = document.getElementById('announceKpiTotalInvested');
        if (elTotalInvested) elTotalInvested.textContent = fmtNum(totalMoneyInvested);

        const elInvestedPct = document.getElementById('announceKpiInvestedPct');
        if (elInvestedPct) elInvestedPct.textContent = `${investedMoneyPct}%`;

        // 3. ดึงข้อมูลทีมและจัดอันดับจากมากที่สุดไปน้อยสุด
        const teamsData = getAggregatedTeamsData();
        const groupColorMap = buildGroupColorMap(teamsData);

        // 4. แสดงกล่องข้อความ Group ทางด้านซ้ายของกราฟ
        renderAnnounceGroupSideBox(teamsData, groupColorMap);

        // 5. แสดงกราฟพอร์ตการลงทุนทางด้านขวา (ชื่อทีม 2 บรรทัด และความกว้างขยายยาวขึ้น)
        renderAnnounceResultChart(teamsData, groupColorMap);

        // 6. เล่นเสียงเฉลิมฉลอง (Victory Fanfare)
        const sound = window.sound || window.soundEffects || (typeof SoundEffects !== 'undefined' ? new SoundEffects() : null);
        if (sound && typeof sound.playWin === 'function') {
            sound.playWin();
        }

        // 7. แสดง Modal Lightbox
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        // 8. แสดง Toast แจ้งเตือน
        showToast('🔒 ปิดระบบการลงทุนพอร์ต AI ทั้งหมด และประกาศผลเรียบร้อยแล้ว!', 'success');
    }

    /**
     * ปิดหน้าต่าง Lightbox ประกาศผล
     */
    function closeAnnounceResultModal() {
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
