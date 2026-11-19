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

    // Auto-run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
