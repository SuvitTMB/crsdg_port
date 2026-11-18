/**
 * CRSDG New Year 2027 - AI Investor Game Controller (investment.html)
 * Real-time synchronization of investment data, KPI cards, team profiles,
 * 5-Column Metrics Grid (20% each), Top 20 Investors Lightbox,
 * Alphabetically Sorted Department Breakdown Combo Chart,
 * and 100% Full-Width Grand Competition Summary with PIN Verification (111111).
 *
 * Graph Customizations:
 * - Font inside all charts is 'Kanit' in normal weight (400)
 * - Text under bar charts automatically wraps into 2 lines if long
 * - Grand competition summary sorted from highest investment to lowest
 * - Left axis font is bright white (#ffffff) & clear
 * - Dashed lines are smooth Catmull-Rom cubic Bezier splines
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const state = window.stateManager;
    const sound = window.soundEffects;

    // Default to 'none' (ปุ่มปิดการแสดงผลเป็น default ตามคำสั่ง)
    let selectedTeamId = 'none';

    // Track whether summary view has been unlocked with PIN 111111
    let isSummaryUnlocked = false;

    // Elements - Layout
    const elInvestMainSplit = document.getElementById('investMainSplit');
    const elInvestLeftPanel = document.getElementById('investLeftPanel');
    const elInvestRightPanel = document.getElementById('investRightPanel');
    const elInvestSummaryPanel = document.getElementById('investSummaryPanel');

    // Elements - KPIs
    const elKpiTotalEligible = document.getElementById('kpiTotalEligibleInvestors');
    const elKpiTotalInitialBudget = document.getElementById('kpiTotalInitialBudget');
    const elKpiActiveInvestorsCount = document.getElementById('kpiActiveInvestorsCount');
    const elKpiActiveInvestorsPct = document.getElementById('kpiActiveInvestorsPct');
    const elKpiTotalMoneyInvested = document.getElementById('kpiTotalMoneyInvested');
    const elKpiTotalMoneyInvestedPct = document.getElementById('kpiTotalMoneyInvestedPct');
    const elKpiTotalRemainingBudget = document.getElementById('kpiTotalRemainingBudget');
    const elKpiTotalRemainingBudgetPct = document.getElementById('kpiTotalRemainingBudgetPct');

    // Elements - Left Column (Selected Team Display)
    const elDispTeamName = document.getElementById('dispTeamName');
    const elDispTeamOrder = document.getElementById('dispTeamOrder');
    const elDispTeamStatus = document.getElementById('dispTeamStatus');
    const elDispTeamPhotoFrame = document.getElementById('dispTeamPhotoFrame');
    const elDispTeamPhotoImg = document.getElementById('dispTeamPhotoImg');
    const elDispTeamPhotoPh = document.getElementById('dispTeamPhotoPh');
    const elDispTeamInvestAmount = document.getElementById('dispTeamInvestAmount');
    const elDispTeamVotersCount = document.getElementById('dispTeamVotersCount');
    const elDispTeamDesc = document.getElementById('dispTeamDesc');
    const elDispTeamMembers = document.getElementById('dispTeamMembers');
    const elTeamsSelectorGrid = document.getElementById('teamsSelectorGrid');

    // Elements - Right Column: 5-Column Metrics Grid (20% each)
    const elMetricValBias = document.getElementById('metricValBias');
    const elBiasGaugeCircle1 = document.getElementById('biasGaugeCircle1');
    const elMetricSubBias = document.getElementById('metricSubBias');

    const elMetricValFundPct = document.getElementById('metricValFundPct');
    const elBiasGaugeCircle2 = document.getElementById('biasGaugeCircle2');
    const elMetricSubFundPct = document.getElementById('metricSubFundPct');

    const elMetricValVotersPct = document.getElementById('metricValVotersPct');
    const elBiasGaugeCircle3 = document.getElementById('biasGaugeCircle3');
    const elMetricSubVotersPct = document.getElementById('metricSubVotersPct');

    const elMetricValVotersCount = document.getElementById('metricValVotersCount');
    const elMetricSubVotersCount = document.getElementById('metricSubVotersCount');

    const elMetricValTeamFund = document.getElementById('metricValTeamFund');
    const elMetricSubTeamFund = document.getElementById('metricSubTeamFund');

    const elDeptComboChartContainer = document.getElementById('deptComboChartContainer');
    const elInGroupBiasNote = document.getElementById('inGroupBiasNote');

    // Elements - Top 20 Investors Lightbox Modal
    const btnOpenTopInvestors = document.getElementById('btnOpenTopInvestors');
    const topInvestorsModal = document.getElementById('topInvestorsModal');
    const btnCloseTopInvestors = document.getElementById('btnCloseTopInvestors');
    const btnDismissTopInvestors = document.getElementById('btnDismissTopInvestors');
    const topInvestorsTableBody = document.getElementById('topInvestorsTableBody');
    const modalTeamNameTag = document.getElementById('modalTeamNameTag');
    const modalFooterMeta = document.getElementById('modalFooterMeta');

    // Elements - Summary Confirmation Lightbox (PIN: 111111)
    const summaryAuthModal = document.getElementById('summaryAuthModal');
    const summaryPinInput = document.getElementById('summaryPinInput');
    const summaryAuthError = document.getElementById('summaryAuthError');
    const btnCloseSummaryAuth = document.getElementById('btnCloseSummaryAuth');
    const btnCancelSummaryAuth = document.getElementById('btnCancelSummaryAuth');
    const btnConfirmSummaryAuth = document.getElementById('btnConfirmSummaryAuth');
    const btnBackFromSummary = document.getElementById('btnBackFromSummary');

    // Elements - Chart Zoom Lightbox Modal (กว้าง 80% ตามคำสั่ง)
    const chartZoomModal = document.getElementById('chartZoomModal');
    const zoomModalTitle = document.getElementById('zoomModalTitle');
    const zoomModalSubtitle = document.getElementById('zoomModalSubtitle');
    const zoomModalIcon = document.getElementById('zoomModalIcon');
    const zoomModalBody = document.getElementById('zoomModalBody');
    const btnCloseChartZoom = document.getElementById('btnCloseChartZoom');
    const btnDismissChartZoom = document.getElementById('btnDismissChartZoom');

    // Helper: format number with commas
    function fmtNum(n) {
        return (parseFloat(n) || 0).toLocaleString('th-TH');
    }

    // Helper: format compact money for chart axis
    function fmtCompactMoney(val) {
        const num = parseFloat(val) || 0;
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'k';
        }
        return num.toString();
    }

    // Escape HTML to prevent XSS
    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Generate smooth Catmull-Rom cubic Bezier path for dashed line
    function buildSmoothPath(points, tension = 0.25) {
        if (!points || points.length === 0) return '';
        const getX = (p) => (typeof p.cx === 'number' ? p.cx : (typeof p.x === 'number' ? p.x : 0));
        const getY = (p) => (typeof p.cy === 'number' ? p.cy : (typeof p.y === 'number' ? p.y : 0));

        if (points.length === 1) return `M ${getX(points[0])} ${getY(points[0])}`;
        if (points.length === 2) {
            const p0x = getX(points[0]), p0y = getY(points[0]);
            const p1x = getX(points[1]), p1y = getY(points[1]);
            const dx = (p1x - p0x) * tension;
            return `M ${p0x} ${p0y} C ${(p0x + dx).toFixed(1)} ${p0y.toFixed(1)} ${(p1x - dx).toFixed(1)} ${p1y.toFixed(1)} ${p1x} ${p1y}`;
        }
        let d = `M ${getX(points[0])} ${getY(points[0])}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i < points.length - 2 ? points[i + 2] : p2;

            const p0x = getX(p0), p0y = getY(p0);
            const p1x = getX(p1), p1y = getY(p1);
            const p2x = getX(p2), p2y = getY(p2);
            const p3x = getX(p3), p3y = getY(p3);

            const cp1x = p1x + (p2x - p0x) * tension;
            const cp1y = p1y + (p2y - p0y) * tension;
            const cp2x = p2x - (p3x - p1x) * tension;
            const cp2y = p2y - (p3y - p1y) * tension;

            d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2x} ${p2y}`;
        }
        return d;
    }

    // Helper: Smart word/character wrap into max 2 lines for text under bar charts
    function wrapText2Lines(text, maxChars = 10) {
        if (!text) return { line1: '', line2: '' };
        const str = String(text).trim();
        if (str.length <= maxChars) {
            return { line1: str, line2: '' };
        }
        // Try breaking at a space or symbol closest to the midpoint
        const words = str.split(/\s+/);
        if (words.length > 1) {
            let mid = Math.ceil(words.length / 2);
            let l1 = words.slice(0, mid).join(' ');
            let l2 = words.slice(mid).join(' ');
            if (l1.length <= maxChars + 4 && l2.length <= maxChars + 4) {
                return { line1: l1, line2: l2 };
            }
        }
        // Split at midpoint near word/symbol break
        const half = Math.ceil(str.length / 2);
        let splitIdx = half;
        for (let i = 0; i <= 3; i++) {
            if (' /-'.includes(str[half + i])) {
                splitIdx = half + i + 1;
                break;
            }
            if (' /-'.includes(str[half - i])) {
                splitIdx = half - i + 1;
                break;
            }
        }
        return {
            line1: str.substring(0, splitIdx).trim(),
            line2: str.substring(splitIdx).trim()
        };
    }

    // Clean and validate players
    function getCleanTeams() {
        if (!state) return [];
        let teams = [];
        if (typeof state.getPlayers === 'function') {
            teams = state.getPlayers();
        } else if (typeof state.getTeamNames === 'function') {
            const rawNames = state.getTeamNames();
            teams = rawNames.map((name, i) => ({
                id: 'team_' + (i + 1),
                orderNo: i + 1,
                teamName: name,
                description: 'ยังไม่มีรายละเอียดโครงการ',
                voteStatus: 'open',
                members: []
            }));
        }
        return teams.filter(t => t && (t.teamName || t.id));
    }

    // Main Dashboard Render
    function renderDashboard() {
        if (!state) return;

        // KPI Calculations
        const members = (typeof state.getMembers === 'function') ? state.getMembers() : [];
        const registered = members.filter(m => m.registered === true);
        const totalEligible = registered.length > 0 ? registered.length : (members.length || 1);

        const budgetPerPerson = (typeof state.getVoteBudget === 'function') ? state.getVoteBudget() : 1000000;
        const totalInitialBudget = totalEligible * budgetPerPerson;

        const allUserInv = (typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        const teamAmounts = {};
        const teamVotersSet = {};
        let activeInvestorsCount = 0;
        let totalMoneyInvested = 0;

        Object.entries(allUserInv).forEach(([empId, userMap]) => {
            if (!userMap || typeof userMap !== 'object') return;
            let userTotal = 0;
            Object.entries(userMap).forEach(([tId, amt]) => {
                const val = parseFloat(amt) || 0;
                if (val > 0) {
                    userTotal += val;
                    totalMoneyInvested += val;
                    teamAmounts[tId] = (teamAmounts[tId] || 0) + val;
                    if (!teamVotersSet[tId]) teamVotersSet[tId] = new Set();
                    teamVotersSet[tId].add(empId);
                }
            });
            if (userTotal > 0) {
                activeInvestorsCount++;
            }
        });

        // 2. Fetch Teams & Fallback check if direct allUserInv is not yet present
        const teams = getCleanTeams();
        if (totalMoneyInvested === 0) {
            teams.forEach(t => {
                const amt = parseFloat(t.voteAmount) || 0;
                const vCount = parseInt(t.voterCount, 10) || 0;
                if (amt > 0) {
                    teamAmounts[t.id] = amt;
                    totalMoneyInvested += amt;
                    activeInvestorsCount = Math.max(activeInvestorsCount, vCount);
                }
            });
        }

        const totalRemainingBudget = Math.max(0, totalInitialBudget - totalMoneyInvested);
        const activePct = totalEligible > 0 ? Math.min(100, Math.round((activeInvestorsCount / totalEligible) * 100)) : 0;
        const investedMoneyPct = totalInitialBudget > 0 ? (totalMoneyInvested / totalInitialBudget) * 100 : 0;
        const remainingMoneyPct = totalInitialBudget > 0 ? (totalRemainingBudget / totalInitialBudget) * 100 : 0;

        const investedPctStr = (investedMoneyPct % 1 === 0)
            ? `${investedMoneyPct.toFixed(0)}%`
            : `${investedMoneyPct.toFixed(1)}%`;

        const remainingPctStr = (remainingMoneyPct % 1 === 0)
            ? `${remainingMoneyPct.toFixed(0)}%`
            : `${remainingMoneyPct.toFixed(1)}%`;

        // 1. Update 5 Top KPI Cards
        if (elKpiTotalEligible) elKpiTotalEligible.textContent = fmtNum(totalEligible);
        if (elKpiTotalInitialBudget) elKpiTotalInitialBudget.textContent = fmtNum(totalInitialBudget);
        if (elKpiActiveInvestorsCount) elKpiActiveInvestorsCount.textContent = fmtNum(activeInvestorsCount);
        if (elKpiActiveInvestorsPct) elKpiActiveInvestorsPct.textContent = `${activePct}%`;
        if (elKpiTotalMoneyInvested) elKpiTotalMoneyInvested.textContent = fmtNum(totalMoneyInvested);
        if (elKpiTotalMoneyInvestedPct) elKpiTotalMoneyInvestedPct.textContent = investedPctStr;
        if (elKpiTotalRemainingBudget) elKpiTotalRemainingBudget.textContent = fmtNum(totalRemainingBudget);
        if (elKpiTotalRemainingBudgetPct) elKpiTotalRemainingBudgetPct.textContent = remainingPctStr;

        // 3. Render Fixed Bottom Dock (ปุ่มสรุปผล + ปุ่มปิดการแสดงผล + ปุ่มทีมแข่งขัน)
        renderTeamSelectorGrid(teams, selectedTeamId);

        // 4. View Routing:
        // A) SUMMARY VIEW (100% Full Width)
        if (selectedTeamId === 'summary') {
            if (elInvestMainSplit) {
                elInvestMainSplit.classList.add('is-summary-mode');
                elInvestMainSplit.classList.remove('is-no-selection');
            }
            if (elInvestLeftPanel) elInvestLeftPanel.style.display = 'none';
            if (elInvestRightPanel) elInvestRightPanel.style.display = 'none';
            if (elInvestSummaryPanel) elInvestSummaryPanel.style.display = 'flex';
            if (btnOpenTopInvestors) btnOpenTopInvestors.style.display = 'none';

            renderCompetitionSummary(teams, members, allUserInv);
            return;
        }

        // B) RESET SUMMARY MODE IF NOT IN SUMMARY
        if (elInvestSummaryPanel) elInvestSummaryPanel.style.display = 'none';
        if (elInvestMainSplit) elInvestMainSplit.classList.remove('is-summary-mode');

        // C) STANDBY VIEW (ปุ่มปิดการแสดงผลเป็น Default)
        if (selectedTeamId === 'none' || !selectedTeamId) {
            if (elInvestLeftPanel) elInvestLeftPanel.style.display = 'block';
            if (elInvestRightPanel) elInvestRightPanel.style.display = 'none';
            if (elInvestMainSplit) elInvestMainSplit.classList.add('is-no-selection');
            if (btnOpenTopInvestors) btnOpenTopInvestors.style.display = 'none';

            renderStandbyLeftPanel();
            return;
        }

        // D) SELECTED TEAM VIEW (35% Left, 65% Right)
        const selectedTeam = teams.find(t => t.id === selectedTeamId);
        if (!selectedTeam) {
            selectedTeamId = 'none';
            renderDashboard();
            return;
        }

        if (elInvestLeftPanel) elInvestLeftPanel.style.display = 'block';
        if (elInvestRightPanel) elInvestRightPanel.style.display = 'flex';
        if (elInvestMainSplit) elInvestMainSplit.classList.remove('is-no-selection');
        if (btnOpenTopInvestors) btnOpenTopInvestors.style.display = 'inline-flex';

        // Render Left Column: Selected Team Details
        renderSelectedTeamDetail(selectedTeam, teamAmounts[selectedTeam.id] || 0, (teamVotersSet[selectedTeam.id] ? teamVotersSet[selectedTeam.id].size : 0));

        // Render Right Column: 5-Column Metrics Grid & Department Combo Chart
        renderBiasAnalytics(selectedTeam, teams, teamAmounts, totalMoneyInvested, teamVotersSet, members, allUserInv, totalEligible, activeInvestorsCount);
    }

    // Render Standby View when "ปิดการแสดงผล" is active
    function renderStandbyLeftPanel() {
        if (elDispTeamName) elDispTeamName.textContent = 'ยังไม่ได้เลือกทีมแข่งขัน';
        if (elDispTeamOrder) elDispTeamOrder.textContent = '🔒 ปิดการแสดงผล';
        if (elDispTeamStatus) {
            elDispTeamStatus.textContent = '⏳ รอเลือกทีมจากแถบด้านล่าง';
            elDispTeamStatus.className = 'team-status-tag status-closed';
        }

        updateTeamInvestToggleUI(null);

        if (elDispTeamPhotoImg) {
            elDispTeamPhotoImg.removeAttribute('src');
            elDispTeamPhotoImg.style.display = 'none';
        }
        if (elDispTeamPhotoPh) {
            elDispTeamPhotoPh.innerHTML = '<span class="ph-icon">🛡️</span><span>เลือกทีมแข่งขันจากแถบด้านล่างหน้าจอ</span>';
            elDispTeamPhotoPh.style.display = 'flex';
        }

        if (elDispTeamInvestAmount) elDispTeamInvestAmount.textContent = '-';
        if (elDispTeamVotersCount) elDispTeamVotersCount.textContent = '-';

        if (elDispTeamMembers) {
            elDispTeamMembers.innerHTML = '<span style="font-size: 0.85rem; color: var(--invest-text-muted);">กรุณาคลิกเลือกทีมแข่งขันที่ต้องการจากแถบเมนูด้านล่างหน้าจอ เพื่อแสดงรายละเอียดและกราฟการวิเคราะห์ความลำเอียง</span>';
        }
    }

    // Render Fixed Bottom Dock
    // [ปุ่มสรุปผล (หน้าสุด)] + [ปุ่มปิดการแสดงผล] + [ปุ่มทีมแข่งขัน...]
    function renderTeamSelectorGrid(teams, currentSelectedId) {
        if (!elTeamsSelectorGrid) return;

        const isSummaryActive = (currentSelectedId === 'summary');
        const isCloseActive = (currentSelectedId === 'none');

        // 1. ปุ่มหน้าสุด: ปุ่ม สรุปผล (คลิกเพื่อใส่รหัส 111111 และปิดโหวตอัตโนมัติ)
        const summaryBtnHtml = `
            <button type="button" 
                    class="bottom-dock-btn btn-dock-summary ${isSummaryActive ? 'is-active-summary' : 'is-inactive-other'}" 
                    id="btnDockSummary" 
                    title="สรุปผลการแข่งขันและการลงทุน (คลิกเพื่อยืนยันรหัสและปิดโหวต)">
                <span style="font-size: 1rem;">📊</span>
                <span>สรุปผล</span>
            </button>
        `;

        // 2. ปุ่มถัดมา: ปุ่ม ปิดการแสดงผล (Default)
        const closeBtnHtml = `
            <button type="button" 
                    class="bottom-dock-btn btn-close-display ${isCloseActive ? 'is-active-close' : 'is-inactive-other'}" 
                    data-team-id="none" 
                    title="คลิกเพื่อปิดการแสดงผลแถวขวามือ">
                <span style="font-size: 0.95rem;">✕</span>
                <span>ปิดการแสดงผล</span>
            </button>
        `;

        // 3. ปุ่มทีมแข่งขัน: แสดง "ทีมที่"
        const teamBtnsHtml = teams.map(t => {
            const isThisTeamActive = (t.id === currentSelectedId);
            let btnClass = 'bottom-dock-btn';
            if (isThisTeamActive) {
                btnClass += ' is-active-team';
            } else {
                btnClass += ' is-inactive-other';
            }

            const photo = t.teamPhoto || t.photo;
            const name = t.teamName || ('ทีมที่ ' + (t.orderNo || 1));

            return `
                <button type="button" 
                        class="${btnClass}" 
                        data-team-id="${t.id}" 
                        title="${escHtml(name)}">
                    <span class="dock-order-pill">ทีมที่ ${t.orderNo || 1}</span>
                    <div class="dock-thumb-circle">
                        ${photo && photo.length > 20 ? `<img src="${photo}" alt="${escHtml(name)}">` : '🛡️'}
                    </div>
                    <span class="dock-team-name">${escHtml(name)}</span>
                </button>
            `;
        }).join('');

        elTeamsSelectorGrid.innerHTML = summaryBtnHtml + closeBtnHtml + teamBtnsHtml;

        // Bind clicks: ปุ่ม สรุปผล
        const btnDockSummary = document.getElementById('btnDockSummary');
        if (btnDockSummary) {
            btnDockSummary.addEventListener('click', () => {
                if (selectedTeamId === 'summary') return;
                if (isSummaryUnlocked) {
                    selectedTeamId = 'summary';
                    if (sound) sound.playClick();
                    renderDashboard();
                } else {
                    openSummaryAuthModal();
                }
            });
        }

        // Bind clicks: ปุ่ม ปิดการแสดงผล และปุ่มทีม
        elTeamsSelectorGrid.querySelectorAll('.bottom-dock-btn[data-team-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tId = btn.getAttribute('data-team-id');
                if (tId && tId !== selectedTeamId) {
                    selectedTeamId = tId;
                    if (sound) sound.playClick();
                    renderDashboard();
                }
            });
        });
    }

    // Render Selected Team (Left Column Card)
    function renderSelectedTeamDetail(team, investedAmt, votersCount) {
        if (!team) return;

        const isTeamOpen = (team.voteStatus !== 'closed');

        if (elDispTeamName) elDispTeamName.textContent = team.teamName || 'ทีมแข่งขัน';
        if (elDispTeamOrder) elDispTeamOrder.textContent = `ทีมที่ ${team.orderNo || 1}`;
        if (elDispTeamStatus) {
            elDispTeamStatus.textContent = isTeamOpen ? '🟢 เปิดโหวต' : '🔒 ปิดโหวต';
            elDispTeamStatus.className = `team-status-tag ${isTeamOpen ? 'status-open' : 'status-closed'}`;
            elDispTeamStatus.title = 'คลิกเพื่อสลับเปิด/ปิดโหวตทีมนี้';
        }

        updateTeamInvestToggleUI(team);

        const photo = team.teamPhoto || team.photo;
        if (photo && photo.length > 20) {
            if (elDispTeamPhotoImg) {
                elDispTeamPhotoImg.src = photo;
                elDispTeamPhotoImg.style.display = 'block';
            }
            if (elDispTeamPhotoPh) elDispTeamPhotoPh.style.display = 'none';
        } else {
            if (elDispTeamPhotoImg) {
                elDispTeamPhotoImg.removeAttribute('src');
                elDispTeamPhotoImg.style.display = 'none';
            }
            if (elDispTeamPhotoPh) elDispTeamPhotoPh.style.display = 'flex';
        }

        if (elDispTeamInvestAmount) elDispTeamInvestAmount.textContent = fmtNum(investedAmt);
        if (elDispTeamVotersCount) elDispTeamVotersCount.textContent = fmtNum(votersCount);
        if (elDispTeamDesc) {
            elDispTeamDesc.textContent = team.description || team.projectDesc || 'ยังไม่มีรายละเอียดโครงการสำหรับทีมนี้';
        }

        // Render Members
        if (elDispTeamMembers) {
            const mList = Array.isArray(team.members) ? team.members : [];
            if (mList.length === 0) {
                elDispTeamMembers.innerHTML = '<span style="font-size: 0.8rem; color: var(--invest-text-muted);">ยังไม่ได้กำหนดรายชื่อสมาชิกทีม</span>';
            } else {
                elDispTeamMembers.innerHTML = mList.map(m => {
                    const isCap = !!m.isCaptain;
                    const name = m.name || m.employeeId || 'สมาชิก';
                    const dept = m.department || '';
                    const photoSrc = m.photo;
                    const initial = name.charAt(0) || '👤';

                    return `
                        <div class="member-chip ${isCap ? 'is-captain' : ''}">
                            <div class="member-chip-avatar">
                                ${photoSrc && photoSrc.length > 20 ? `<img src="${photoSrc}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : initial}
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <span class="member-chip-name">${escHtml(name)}</span>
                                    ${isCap ? '<span class="captain-tag">👑 หัวหน้าทีม</span>' : ''}
                                </div>
                                ${dept ? `<span class="member-chip-dept">${escHtml(dept)}</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    // Render Right Column: 5-Column Metrics Grid (20% each) & Department Combo Chart
    function renderBiasAnalytics(selectedTeam, teams, teamAmounts, totalMoneyInvested, teamVotersSet, members, allUserInv, totalEligible, activeInvestorsCount) {
        if (!selectedTeam) return;

        // 1. Prepare Department Data and Lookup Map
        const memberDeptMap = new Map();
        const allDeptsSet = new Set();

        if (Array.isArray(members)) {
            members.forEach(m => {
                const d = (m.Group || m.department || m.Department || '').trim();
                if (d) {
                    allDeptsSet.add(d);
                    if (m.EmployeeID) memberDeptMap.set(String(m.EmployeeID).trim().toLowerCase(), d);
                    if (m.employeeId) memberDeptMap.set(String(m.employeeId).trim().toLowerCase(), d);
                    if (m.id) memberDeptMap.set(String(m.id).trim().toLowerCase(), d);
                    if (m.Name) memberDeptMap.set(String(m.Name).trim().toLowerCase(), d);
                    if (m.name) memberDeptMap.set(String(m.name).trim().toLowerCase(), d);
                }
            });
        }

        if (Array.isArray(teams)) {
            teams.forEach(t => {
                if (Array.isArray(t.members)) {
                    t.members.forEach(m => {
                        const d = (m.department || '').trim();
                        if (d) {
                            allDeptsSet.add(d);
                            if (m.employeeId) memberDeptMap.set(String(m.employeeId).trim().toLowerCase(), d);
                            if (m.name) memberDeptMap.set(String(m.name).trim().toLowerCase(), d);
                        }
                    });
                }
            });
        }

        // Fallback default departments if none recorded yet
        if (allDeptsSet.size === 0) {
            ['ฝ่ายเทคโนโลยี', 'ฝ่ายการตลาด', 'ฝ่ายบัญชี', 'ฝ่ายบริหาร', 'ฝ่ายทรัพยากรบุคคล', 'ฝ่ายขาย'].forEach(d => allDeptsSet.add(d));
        }

        const departments = Array.from(allDeptsSet);

        // Aggregate statistics per department
        const deptStats = {};
        departments.forEach(dept => {
            deptStats[dept] = {
                name: dept,
                totalStaff: 0,
                investedInThisTeam: new Set(),
                investedInAnyTeam: new Set(),
                moneyInvested: 0
            };
        });

        // Count total staff per dept from members
        if (Array.isArray(members)) {
            members.forEach(m => {
                const d = (m.Group || m.department || m.Department || '').trim();
                if (d && deptStats[d]) {
                    deptStats[d].totalStaff++;
                }
            });
        }

        // Aggregate user investments
        Object.entries(allUserInv).forEach(([empId, userMap]) => {
            if (!userMap || typeof userMap !== 'object') return;
            const empDept = memberDeptMap.get(String(empId).trim().toLowerCase()) || departments[0];
            if (!deptStats[empDept]) {
                deptStats[empDept] = {
                    name: empDept,
                    totalStaff: 0,
                    investedInThisTeam: new Set(),
                    investedInAnyTeam: new Set(),
                    moneyInvested: 0
                };
                departments.push(empDept);
            }

            let hasAnyVote = false;
            Object.entries(userMap).forEach(([tId, amt]) => {
                const val = parseFloat(amt) || 0;
                if (val > 0) {
                    hasAnyVote = true;
                    if (tId === selectedTeam.id) {
                        deptStats[empDept].investedInThisTeam.add(empId);
                        deptStats[empDept].moneyInvested += val;
                    }
                }
            });

            if (hasAnyVote) {
                deptStats[empDept].investedInAnyTeam.add(empId);
            }
        });

        const selectedTeamAmount = teamAmounts[selectedTeam.id] || 0;
        const votersCount = teamVotersSet[selectedTeam.id] ? teamVotersSet[selectedTeam.id].size : 0;

        // -------------------------------------------------------------
        // Calculate and Update the 5-Column Metrics Grid (กว้างช่องละ 20%)
        // -------------------------------------------------------------

        // แถวที่ 1: ดัชนีลำเอียง (เปรียบเทียบเงินลงทุนของสมาชิกในสังกัดเดียวกันเทียบกับเงินลงทุนทั้งหมด)
        const teamMembers = selectedTeam.members || [];
        const homeDepts = new Set(teamMembers.map(m => (m.department || '').trim().toLowerCase()).filter(Boolean));
        let inGroupMoney = 0;
        departments.forEach(d => {
            if (homeDepts.has(d.toLowerCase())) {
                inGroupMoney += deptStats[d].moneyInvested;
            }
        });

        const biasPct = selectedTeamAmount > 0 ? ((inGroupMoney / selectedTeamAmount) * 100) : 0;
        if (elMetricValBias) elMetricValBias.textContent = `${biasPct.toFixed(1)}%`;
        if (elBiasGaugeCircle1) {
            const deg = Math.round((biasPct / 100) * 360);
            elBiasGaugeCircle1.style.setProperty('--gauge-deg', `${deg}deg`);
        }
        if (elMetricSubBias) elMetricSubBias.textContent = `${fmtNum(inGroupMoney)} บาท`;

        // แถวที่ 2: ดัชนีเงินลงทุน (แสดงจำนวนเงินทุนทั้งหมดของทีมนี้ที่ได้ เปรียบเทียบกับเงินลงทุนรวมทั้งหมด)
        const fundPct = totalMoneyInvested > 0 ? ((selectedTeamAmount / totalMoneyInvested) * 100) : 0;
        if (elMetricValFundPct) elMetricValFundPct.textContent = `${fundPct.toFixed(1)}%`;
        if (elBiasGaugeCircle2) {
            const deg = Math.round((fundPct / 100) * 360);
            elBiasGaugeCircle2.style.setProperty('--gauge-deg', `${deg}deg`);
        }
        if (elMetricSubFundPct) elMetricSubFundPct.textContent = `เทียบรวม ${fmtCompactMoney(totalMoneyInvested)}`;

        // แถวที่ 3: ดัชนีผู้ลงทุน (คำนวณจาก จำนวนผู้ลงทุนในทีมนี้ หารด้วย จำนวนผู้ลงทุนรวมทั้งหมด ตามคำสั่ง)
        const totalAllInvestors = Math.max(totalEligible || 0, activeInvestorsCount || 0, 1);
        const votersPct = totalAllInvestors > 0 ? ((votersCount / totalAllInvestors) * 100) : 0;
        if (elMetricValVotersPct) elMetricValVotersPct.textContent = `${votersPct.toFixed(1)}%`;
        if (elBiasGaugeCircle3) {
            const deg = Math.round((votersPct / 100) * 360);
            elBiasGaugeCircle3.style.setProperty('--gauge-deg', `${deg}deg`);
        }
        if (elMetricSubVotersPct) elMetricSubVotersPct.textContent = `จากรวม ${fmtNum(totalAllInvestors)} คน`;

        // แถวที่ 4: จำนวนผู้ลงทุนที่ลงทุนให้ (จำนวนคน) - เอา icon ออก
        if (elMetricValVotersCount) elMetricValVotersCount.textContent = fmtNum(votersCount);
        if (elMetricSubVotersCount) elMetricSubVotersCount.textContent = 'จำนวนผู้ลงทุน';

        // แถวที่ 5: จำนวนเงินที่ทีมได้รับทั้งหมด - เอา icon ออก
        if (elMetricValTeamFund) elMetricValTeamFund.textContent = fmtNum(selectedTeamAmount);
        if (elMetricSubTeamFund) elMetricSubTeamFund.textContent = 'ยอดเงินรวม';

        // -------------------------------------------------------------
        // 2. Prepare Data for Combo Chart
        // -------------------------------------------------------------
        // เรียงลำดับสังกัดตามตัวอักษร (ก-ฮ, A-Z)
        departments.sort((a, b) => a.localeCompare(b, 'th'));

        const deptData = departments.map(d => {
            const stat = deptStats[d];
            const votedThisTeamCount = stat.investedInThisTeam.size;
            let totalStaffInDept = stat.totalStaff;

            if (totalStaffInDept < votedThisTeamCount) {
                totalStaffInDept = votedThisTeamCount;
            }

            const part1_voted = votedThisTeamCount;
            const part2_remaining = Math.max(0, totalStaffInDept - votedThisTeamCount);

            return {
                dept: d,
                part1_voted: part1_voted,
                part2_remaining: part2_remaining,
                totalStaff: totalStaffInDept,
                moneyInvested: stat.moneyInvested
            };
        });

        // 3. Render SVG Combo Chart
        renderSvgComboChart(deptData);

        // 4. In-Group (Home Department) Bias Note
        if (elInGroupBiasNote) {
            const homeDeptsList = Array.from(new Set(teamMembers.map(m => (m.department || '').trim()).filter(Boolean)));
            if (homeDeptsList.length > 0) {
                const homeDeptsStr = homeDeptsList.join(', ');
                elInGroupBiasNote.innerHTML = `
                    💡 <strong>สังกัดของสมาชิกในทีม:</strong> <span style="color: #38bdf8;">${escHtml(homeDeptsStr)}</span>
                    | เงินลงทุนจากสังกัดนี้: <strong style="color: #f59e0b;">${fmtNum(inGroupMoney)} บาท</strong> (${biasPct.toFixed(1)}% ของเงินทุนทีม)
                `;
            } else {
                elInGroupBiasNote.innerHTML = `
                    💡 <strong>วิเคราะห์ความลำเอียงภายในสังกัด:</strong> ไม่พบข้อมูลสังกัดของสมาชิกทีมแข่งขันนี้
                `;
            }
        }
    }

    // Render SVG Interactive Combo Chart (Left Y: Headcount, Right Y: Money, Smooth Dashed Line)
    function renderSvgComboChart(deptData) {
        if (!elDeptComboChartContainer) return;

        const numDepts = deptData.length;
        if (numDepts === 0) {
            elDeptComboChartContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--invest-text-muted);">ไม่มีข้อมูลสังกัด</div>';
            return;
        }

        const colWidth = Math.max(105, Math.floor(720 / numDepts));
        const padLeft = 70;
        const padRight = 75;
        const padTop = 65; // เพิ่มระยะห่างด้านบน เพื่อไม่ให้ตัวเลขเงินทับหัวข้อแกน
        const padBottom = 75;
        const chartWidth = numDepts * colWidth;
        const svgWidth = chartWidth + padLeft + padRight;
        const svgHeight = 400;
        const chartHeight = svgHeight - padTop - padBottom;
        const yBaseline = padTop + chartHeight;

        let maxStaff = 0;
        let peakMoney = 0;
        deptData.forEach(d => {
            if (d.totalStaff > maxStaff) maxStaff = d.totalStaff;
            if (d.moneyInvested > peakMoney) peakMoney = d.moneyInvested;
        });

        if (maxStaff <= 0) maxStaff = 10;
        if (peakMoney <= 0) peakMoney = 100000;

        const staffStep = Math.ceil(maxStaff / 4) || 1;
        maxStaff = staffStep * 4;

        // เพิ่ม Headroom ~20% เพื่อให้จุดยอดเงินสูงสุดและป้ายตัวเลขเงินไม่ทับซ้อนกับหัวข้อแกนด้านบน
        const targetMaxMoney = peakMoney * 1.2;
        const moneyStep = Math.ceil(targetMaxMoney / 4 / 10000) * 10000 || 10000;
        const maxMoney = moneyStep * 4;

        let gridHtml = '';
        for (let i = 0; i <= 4; i++) {
            const y = yBaseline - (i / 4) * chartHeight;
            const staffVal = i * staffStep;
            const moneyVal = i * moneyStep;

            gridHtml += `
                <line x1="${padLeft}" y1="${y}" x2="${padLeft + chartWidth}" y2="${y}" class="chart-grid-line" />
                <text x="${padLeft - 10}" y="${y + 4}" class="chart-axis-val" text-anchor="end">${staffVal}</text>
                <text x="${padLeft + chartWidth + 10}" y="${y + 4}" class="chart-money-axis-val" text-anchor="start">${fmtCompactMoney(moneyVal)}</text>
            `;
        }

        const barWidth = Math.min(50, Math.max(26, Math.floor(colWidth * 0.48)));
        let barsHtml = '';

        deptData.forEach((d, idx) => {
            const cx = padLeft + (idx + 0.5) * colWidth;
            const barX = cx - barWidth / 2;

            const hBottom = (d.part1_voted / maxStaff) * chartHeight;
            const hTop = (d.part2_remaining / maxStaff) * chartHeight;

            const yBottom = yBaseline - hBottom;
            const yTop = yBottom - hTop;

            const hasTop = hTop > 0;
            const hasBottom = hBottom > 0;

            // ปรับข้อความใต้กราฟแท่งเป็น 2 บรรทัดหากยาวเกิน
            const wrapped = wrapText2Lines(d.dept, 9);
            const deptLabelsHtml = wrapped.line2 ? `
                <text x="${cx}" y="${yBaseline + 18}" class="chart-dept-label">${escHtml(wrapped.line1)}</text>
                <text x="${cx}" y="${yBaseline + 32}" class="chart-dept-label">${escHtml(wrapped.line2)}</text>
            ` : `
                <text x="${cx}" y="${yBaseline + 22}" class="chart-dept-label">${escHtml(wrapped.line1)}</text>
            `;

            barsHtml += `
                <g class="chart-column-group" tabindex="0">
                    <title>${escHtml(d.dept)}:
- ผู้โหวตให้ทีมนี้: ${d.part1_voted} คน
- ผู้ยังไม่โหวตให้ทีมนี้: ${d.part2_remaining} คน
- รวมพนักงานในสังกัด: ${d.totalStaff} คน
- เงินลงทุนรวม: ${fmtNum(d.moneyInvested)} บาท</title>

                    <rect x="${cx - colWidth / 2 + 2}" y="${padTop}" width="${colWidth - 4}" height="${chartHeight}" 
                          fill="rgba(56, 189, 248, 0.04)" rx="6" class="chart-track-bg" />

                    ${hasTop ? `
                        <rect x="${barX}" y="${yTop}" width="${barWidth}" height="${hTop}" 
                              fill="url(#investBarGradRemain)" rx="${hasBottom ? 0 : 4}" ry="${hasBottom ? 0 : 4}" />
                        ${hTop >= 18 ? `<text x="${cx}" y="${yTop + hTop / 2 + 4}" class="chart-val-bubble" fill="#94a3b8">${d.part2_remaining}</text>` : ''}
                    ` : ''}

                    ${hasBottom ? `
                        <rect x="${barX}" y="${yBottom}" width="${barWidth}" height="${hBottom}" 
                              fill="url(#investBarGradBlue)" rx="${hasTop ? 0 : 4}" ry="${hasTop ? 0 : 4}" />
                        ${hBottom >= 18 ? `<text x="${cx}" y="${yBottom + hBottom / 2 + 4}" class="chart-val-bubble">${d.part1_voted}</text>` : ''}
                    ` : ''}

                    ${d.totalStaff > 0 ? `
                        <text x="${cx}" y="${yTop - 6}" class="chart-dept-sub" fill="#38bdf8">${d.totalStaff} คน</text>
                    ` : ''}

                    ${deptLabelsHtml}
                </g>
            `;
        });

        const linePoints = deptData.map((d, idx) => {
            const cx = padLeft + (idx + 0.5) * colWidth;
            const y = yBaseline - (d.moneyInvested / maxMoney) * chartHeight;
            return { cx, cy: y, y, money: d.moneyInvested, dept: d.dept };
        });

        // Smooth cubic Bezier spline for dashed line
        const pathD = buildSmoothPath(linePoints, 0.25);

        let lineNodesHtml = '';
        linePoints.forEach(p => {
            lineNodesHtml += `
                <g class="chart-node-group">
                    <title>${p.dept}: เงินลงทุน ${fmtNum(p.money)} บาท</title>
                    <circle cx="${p.cx}" cy="${p.cy}" r="6" fill="#10b981" stroke="#ffffff" stroke-width="2" />
                    <text x="${p.cx}" y="${p.cy - 12}" class="chart-green-val">${fmtNum(p.money)} บาท</text>
                </g>
            `;
        });

        elDeptComboChartContainer.innerHTML = `
            <svg class="combo-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="investBarGradBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#38bdf8" />
                        <stop offset="100%" stop-color="#0056ff" />
                    </linearGradient>

                    <linearGradient id="investBarGradRemain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#64748b" />
                        <stop offset="100%" stop-color="#334155" />
                    </linearGradient>
                </defs>

                <!-- Left Axis Title (สีสว่างสดใส) -->
                <text x="${padLeft}" y="22" class="chart-axis-text" text-anchor="start">👥 จำนวนคน (คน)</text>
                <!-- Right Axis Title -->
                <text x="${padLeft + chartWidth}" y="22" class="chart-money-axis-text" text-anchor="end">💰 ปริมาณเงินลงทุน (บาท)</text>

                ${gridHtml}
                ${barsHtml}

                <!-- กราฟเส้นปะ smooth ทั้งหมด -->
                <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="6,4" stroke-linecap="round" stroke-linejoin="round" />
                ${lineNodesHtml}
            </svg>
        `;
    }

    // ========================================================
    // LIGHTBOX: ตารางนักลงทุนรายใหญ่ 20 อันดับแรก
    // ========================================================
    function openTopInvestorsModal() {
        if (!state) return;
        const teams = getCleanTeams();
        const currentTeam = teams.find(t => t.id === selectedTeamId);
        if (!currentTeam) {
            alert('กรุณาคลิกเลือกทีมแข่งขันจากแถบเมนูด้านล่างก่อนดูรายชื่อนักลงทุนรายใหญ่');
            return;
        }

        const members = (typeof state.getMembers === 'function') ? state.getMembers() : [];
        const memberMap = new Map();
        members.forEach(m => {
            const idKey = String(m.EmployeeID || m.employeeId || m.id || '').trim().toLowerCase();
            if (idKey) memberMap.set(idKey, m);
            if (m.Name) memberMap.set(String(m.Name).trim().toLowerCase(), m);
            if (m.name) memberMap.set(String(m.name).trim().toLowerCase(), m);
        });

        const allUserInv = (typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        const teamInvList = [];
        let teamTotalInvest = 0;

        Object.entries(allUserInv).forEach(([empId, uMap]) => {
            if (!uMap || typeof uMap !== 'object') return;
            const amt = parseFloat(uMap[currentTeam.id]) || 0;
            if (amt > 0) {
                teamTotalInvest += amt;
                const m = memberMap.get(String(empId).trim().toLowerCase()) || {};
                const name = m.Name || m.name || ('รหัสพนักงาน ' + empId);
                const dept = m.Group || m.department || m.Department || 'ไม่ระบุสังกัด';
                const photo = m.photo || '';
                teamInvList.push({
                    empId: empId,
                    name: name,
                    dept: dept,
                    amt: amt,
                    photo: photo
                });
            }
        });

        teamInvList.sort((a, b) => b.amt - a.amt);
        const top20 = teamInvList.slice(0, 20);

        const teamMembers = currentTeam.members || [];
        const homeDepts = new Set(teamMembers.map(m => (m.department || '').trim().toLowerCase()).filter(Boolean));

        if (modalTeamNameTag) {
            modalTeamNameTag.textContent = `${currentTeam.teamName || ('ทีมที่ ' + currentTeam.orderNo)}`;
        }

        if (topInvestorsTableBody) {
            if (top20.length === 0) {
                topInvestorsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--invest-text-muted);">
                            ยังไม่มีผู้จัดสรรเงินลงทุนในทีมนี้
                        </td>
                    </tr>
                `;
            } else {
                let sumTop20 = 0;
                topInvestorsTableBody.innerHTML = top20.map((inv, idx) => {
                    const rank = idx + 1;
                    sumTop20 += inv.amt;
                    const isSameDept = homeDepts.has(inv.dept.toLowerCase());
                    const sharePct = teamTotalInvest > 0 ? ((inv.amt / teamTotalInvest) * 100).toFixed(1) : '0.0';
                    const initial = inv.name.charAt(0) || '👤';

                    return `
                        <tr class="${isSameDept ? 'row-bias-orange' : ''}">
                            <td style="text-align: center;">
                                <span class="rank-badge rank-${rank}">${rank}</span>
                            </td>
                            <td>
                                <div class="investor-cell">
                                    <div class="investor-avatar-circle">
                                        ${inv.photo && inv.photo.length > 20 ? `<img src="${inv.photo}" alt="${escHtml(inv.name)}">` : initial}
                                    </div>
                                    <div>
                                        <div class="investor-name">${escHtml(inv.name)}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="investor-dept-tag">${escHtml(inv.dept)}</span>
                            </td>
                            <td style="text-align: right;">
                                <span class="investor-money-val">${fmtNum(inv.amt)} บาท</span>
                            </td>
                            <td style="text-align: center;">
                                <span class="investor-pct-val">${sharePct}%</span>
                            </td>
                            <td style="text-align: center;">
                                ${isSameDept ? `<span class="badge-bias-orange">ดัชนีลำเอียง</span>` : `<span class="badge-normal-dept">-</span>`}
                            </td>
                        </tr>
                    `;
                }).join('');

                if (modalFooterMeta) {
                    const top20Pct = teamTotalInvest > 0 ? ((sumTop20 / teamTotalInvest) * 100).toFixed(1) : '0.0';
                    modalFooterMeta.innerHTML = `
                        แสดง <strong>${top20.length}</strong> อันดับแรก จากผู้ร่วมลงทุนทั้งหมด <strong>${teamInvList.length}</strong> ท่าน | 
                        ยอดลงทุน 20 อันดับรวม: <strong style="color: #38bdf8;">${fmtNum(sumTop20)} บาท</strong> (${top20Pct}% ของทีม)
                    `;
                }
            }
        }

        if (topInvestorsModal) {
            topInvestorsModal.style.display = 'flex';
        }
        if (sound) sound.playClick();
    }

    function closeTopInvestorsModal() {
        if (topInvestorsModal) {
            topInvestorsModal.style.display = 'none';
        }
        if (sound) sound.playClick();
    }

    // ========================================================
    // LIGHTBOX: ยืนยันรหัสผ่าน 111111 และปิดโหวตอัตโนมัติ
    // ========================================================
    function openSummaryAuthModal() {
        if (!summaryAuthModal) return;
        if (summaryPinInput) {
            summaryPinInput.value = '';
            summaryPinInput.style.borderColor = '';
        }
        if (summaryAuthError) summaryAuthError.style.display = 'none';
        summaryAuthModal.style.display = 'flex';
        if (sound) sound.playClick();
        setTimeout(() => {
            if (summaryPinInput) summaryPinInput.focus();
        }, 120);
    }

    function closeSummaryAuthModal() {
        if (!summaryAuthModal) return;
        summaryAuthModal.style.display = 'none';
        if (sound) sound.playClick();
    }

    function handleConfirmSummaryAuth() {
        if (!summaryPinInput) return;
        const enteredPin = summaryPinInput.value.trim();
        if (enteredPin === '111111') {
            isSummaryUnlocked = true;
            if (summaryAuthError) summaryAuthError.style.display = 'none';
            closeSummaryAuthModal();

            // ปิดโหวตอัตโนมัติและปิดรับการลงทุนของทุกทีมทั้งหมด
            closeVotingAutomatically();

            // สลับเป็นโหมดแสดงผลสรุป 100%
            selectedTeamId = 'summary';
            if (sound) sound.playClick();
            renderDashboard();
            updateTeamInvestToggleUI(null);
            showInvestToast('🔒 สรุปผลการแข่งขันเรียบร้อยแล้ว: ปิดการลงทุนของทุกทีมทั้งหมดแล้ว', 'info');
        } else {
            if (summaryAuthError) summaryAuthError.style.display = 'block';
            summaryPinInput.style.borderColor = '#ef4444';
            summaryPinInput.focus();
            if (sound) sound.playClick();
        }
    }

    function closeVotingAutomatically() {
        if (state && typeof state.setVoteOpen === 'function') {
            state.setVoteOpen(false);
        }
        if (state && typeof state.getPlayers === 'function' && typeof state.savePlayers === 'function') {
            const players = state.getPlayers();
            let changed = false;
            players.forEach(p => {
                if (p.voteStatus !== 'closed') {
                    p.voteStatus = 'closed';
                    changed = true;
                }
            });
            if (changed) {
                state.savePlayers(players);
                if (typeof state.broadcast === 'function') {
                    state.broadcast({ type: 'PLAYERS_UPDATED', players });
                }
            }
        }
    }

    // ========================================================
    // GRAND COMPETITION SUMMARY (FULL WIDTH 100%)
    // - เรียงลำดับจากทีมที่มีเงินลงทุนสูงสุดไปต่ำสุด ตามคำสั่ง
    // - กราฟแท่งแสดงแท่งสีแยกตามสังกัด
    // - กราฟเส้นปะแสดงจำนวนนักลงทุน ปรับให้กราฟเส้น smooth ทั้งหมด
    // - ปรับสี font ด้านซ้ายให้สว่าง
    // - ข้อความใต้กราฟแท่งความยาวเกินปรับเป็น 2 บรรทัด
    // ========================================================
    function renderCompetitionSummary(teams, members, allUserInv) {
        if (!elInvestSummaryPanel) return;

        // 1. Prepare Department Data & Lookup
        const memberDeptMap = new Map();
        const allDeptsSet = new Set();

        if (Array.isArray(members)) {
            members.forEach(m => {
                const d = (m.Group || m.department || m.Department || '').trim();
                if (d) {
                    allDeptsSet.add(d);
                    const idKey = String(m.EmployeeID || m.employeeId || m.id || '').trim().toLowerCase();
                    if (idKey) memberDeptMap.set(idKey, d);
                    if (m.Name) memberDeptMap.set(String(m.Name).trim().toLowerCase(), d);
                    if (m.name) memberDeptMap.set(String(m.name).trim().toLowerCase(), d);
                }
            });
        }

        if (Array.isArray(teams)) {
            teams.forEach(t => {
                if (Array.isArray(t.members)) {
                    t.members.forEach(m => {
                        const d = (m.department || '').trim();
                        if (d) {
                            allDeptsSet.add(d);
                            if (m.employeeId) memberDeptMap.set(String(m.employeeId).trim().toLowerCase(), d);
                            if (m.name) memberDeptMap.set(String(m.name).trim().toLowerCase(), d);
                        }
                    });
                }
            });
        }

        if (allDeptsSet.size === 0) {
            ['ฝ่ายเทคโนโลยี', 'ฝ่ายการตลาด', 'ฝ่ายบัญชี', 'ฝ่ายบริหาร', 'ฝ่ายทรัพยากรบุคคล', 'ฝ่ายขาย'].forEach(d => allDeptsSet.add(d));
        }

        const departments = Array.from(allDeptsSet).sort((a, b) => a.localeCompare(b, 'th'));

        const DEPT_PALETTE = [
            '#38bdf8', // ฟ้าสดใส (Sky)
            '#f59e0b', // อำพันทอง (Amber)
            '#10b981', // เขียวมรกต (Emerald)
            '#ec4899', // ชมพูกุหลาบ (Pink)
            '#8b5cf6', // ม่วงสว่าง (Purple)
            '#f97316', // ส้มสด (Orange)
            '#06b6d4', // ไซแอน (Cyan)
            '#a855f7', // ไวโอเลต (Violet)
            '#eab308', // เหลืองสด (Yellow)
            '#14b8a6', // เขียวทีล (Teal)
            '#6366f1', // อินดิโก (Indigo)
            '#84cc16'  // เขียวมะนาว (Lime)
        ];

        const deptColorMap = {};
        departments.forEach((d, idx) => {
            deptColorMap[d] = DEPT_PALETTE[idx % DEPT_PALETTE.length];
        });

        // 2. Aggregate Team Investment Data by Department
        const teamStats = {};
        teams.forEach(t => {
            teamStats[t.id] = {
                team: t,
                totalMoney: 0,
                deptMoney: {},
                investorsSet: new Set()
            };
            departments.forEach(d => {
                teamStats[t.id].deptMoney[d] = 0;
            });
        });

        let grandTotalMoney = 0;
        const grandInvestorsSet = new Set();
        const deptOverallMoney = {};
        departments.forEach(d => { deptOverallMoney[d] = 0; });

        Object.entries(allUserInv).forEach(([empId, userMap]) => {
            if (!userMap || typeof userMap !== 'object') return;
            const empDept = memberDeptMap.get(String(empId).trim().toLowerCase()) || departments[0];

            let hasAny = false;
            Object.entries(userMap).forEach(([tId, amt]) => {
                const val = parseFloat(amt) || 0;
                if (val > 0 && teamStats[tId]) {
                    hasAny = true;
                    teamStats[tId].totalMoney += val;
                    teamStats[tId].deptMoney[empDept] = (teamStats[tId].deptMoney[empDept] || 0) + val;
                    teamStats[tId].investorsSet.add(empId);

                    grandTotalMoney += val;
                    deptOverallMoney[empDept] = (deptOverallMoney[empDept] || 0) + val;
                }
            });
            if (hasAny) {
                grandInvestorsSet.add(empId);
            }
        });

        // เรียงลำดับจากทีมที่มีเงินลงทุนสูงสุดไปต่ำสุด ตามคำสั่ง
        const sortedTeams = [...teams].sort((a, b) => {
            const moneyA = teamStats[a.id] ? teamStats[a.id].totalMoney : 0;
            const moneyB = teamStats[b.id] ? teamStats[b.id].totalMoney : 0;
            if (moneyB !== moneyA) return moneyB - moneyA;
            const invA = teamStats[a.id] ? teamStats[a.id].investorsSet.size : 0;
            const invB = teamStats[b.id] ? teamStats[b.id].investorsSet.size : 0;
            if (invB !== invA) return invB - invA;
            return (parseInt(a.orderNo, 10) || 999) - (parseInt(b.orderNo, 10) || 999);
        });

        // 3. Render Department Color Legend
        const summaryDeptLegendItems = document.getElementById('summaryDeptLegendItems');
        if (summaryDeptLegendItems) {
            let legendHtml = departments.map(d => {
                const c = deptColorMap[d];
                const dMoney = deptOverallMoney[d] || 0;
                return `
                    <span class="summary-legend-item">
                        <span class="summary-color-chip" style="background: ${c};"></span>
                        <strong>${escHtml(d)}</strong>
                        <span style="color: var(--invest-text-muted); font-size: 0.78rem;">(${fmtNum(dMoney)} บาท)</span>
                    </span>
                `;
            }).join('');

            legendHtml += `
                <span class="summary-legend-item" style="border-left: 1px solid var(--invest-card-border); padding-left: 14px;">
                    <span class="summary-line-chip"></span>
                    <strong style="color: #10b981;">---● จำนวนนักลงทุน (คน)</strong>
                </span>
            `;
            summaryDeptLegendItems.innerHTML = legendHtml;
        }

        // 4. Render SVG Grand Summary Combo Chart
        renderSvgSummaryChart(sortedTeams, teamStats, departments, deptColorMap);

        // 5. Render Key Statistics (ข้อมูลสถิติ 4 Donut Cards สไตล์ตามรูป media_1794664182875_3e3d2ff9)
        renderSummaryKeyStats(sortedTeams, teamStats, grandTotalMoney, grandInvestorsSet, members);

        // 6. Render Summary Ranking Table
        renderSummaryRankingTable(sortedTeams, teamStats, grandTotalMoney, departments, deptColorMap);
    }

    // Render SVG Grand Summary Combo Chart
    // - เรียงจากทีมที่มีเงินลงทุนสูงสุดไปต่ำสุด
    // - แท่งสีแยกตามสังกัด
    // - กราฟเส้นปะ smooth ทั้งหมด
    // - ปรับสี font ด้านซ้ายให้สว่าง
    // - ข้อความใต้กราฟแท่งปรับเป็น 2 บรรทัดเมื่อยาวเกิน
    function renderSvgSummaryChart(sortedTeams, teamStats, departments, deptColorMap) {
        const container = document.getElementById('summaryChartContainer');
        if (!container) return;

        const nTeams = sortedTeams.length;
        if (nTeams === 0) {
            container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--invest-text-muted);">ไม่มีข้อมูลทีมแข่งขัน</div>';
            return;
        }

        const colWidth = Math.max(130, Math.floor(1000 / nTeams));
        const padLeft = 85;
        const padRight = 85;
        const padTop = 45;
        const padBottom = 95; // เพิ่มพื้นที่ให้ข้อความ 2 บรรทัด
        const chartWidth = nTeams * colWidth;
        const svgWidth = chartWidth + padLeft + padRight;
        const svgHeight = 500;
        const chartHeight = svgHeight - padTop - padBottom;
        const yBaseline = padTop + chartHeight;

        let maxMoney = 0;
        let maxInvestors = 0;
        sortedTeams.forEach(t => {
            const st = teamStats[t.id];
            if (st.totalMoney > maxMoney) maxMoney = st.totalMoney;
            const invCount = st.investorsSet.size;
            if (invCount > maxInvestors) maxInvestors = invCount;
        });

        if (maxMoney <= 0) maxMoney = 100000;
        if (maxInvestors <= 0) maxInvestors = 5;

        const moneyStep = Math.ceil(maxMoney / 4 / 50000) * 50000 || 50000;
        maxMoney = moneyStep * 4;
        const invStep = Math.ceil(maxInvestors / 4) || 1;
        maxInvestors = invStep * 4;

        // Grid lines & Y Axis labels
        let gridHtml = '';
        for (let i = 0; i <= 4; i++) {
            const y = yBaseline - (i / 4) * chartHeight;
            const moneyVal = i * moneyStep;
            const invVal = i * invStep;

            gridHtml += `
                <line x1="${padLeft}" y1="${y}" x2="${padLeft + chartWidth}" y2="${y}" 
                      stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" stroke-dasharray="${i === 0 ? 'none' : '4,4'}" />
                <!-- Left Axis Numbers: ปรับสี font ด้านซ้ายให้สว่าง (#ffffff) -->
                <text x="${padLeft - 12}" y="${y + 4}" class="chart-axis-val" text-anchor="end">${fmtCompactMoney(moneyVal)}</text>
                <!-- Right Axis Numbers -->
                <text x="${padLeft + chartWidth + 12}" y="${y + 4}" class="chart-money-axis-val" text-anchor="start" fill="#10b981">${invVal} คน</text>
            `;
        }

        const barWidth = Math.min(64, Math.max(34, Math.floor(colWidth * 0.52)));
        let barsHtml = '';
        const linePoints = [];

        sortedTeams.forEach((t, idx) => {
            const cx = padLeft + (idx + 0.5) * colWidth;
            const barX = cx - barWidth / 2;
            const st = teamStats[t.id];
            const tMoney = st.totalMoney;
            const invCount = st.investorsSet.size;

            let curY = yBaseline;
            let segmentsHtml = '';
            let tooltipLines = [
                `ทีมที่ ${t.orderNo || (idx + 1)}: ${t.teamName || 'ทีมแข่งขัน'}`,
                `ยอดเงินลงทุนรวม: ${fmtNum(tMoney)} บาท`,
                `จำนวนนักลงทุน: ${invCount} คน`,
                '--- ยอดลงทุนแยกตามสังกัด ---'
            ];

            departments.forEach(dept => {
                const amt = st.deptMoney[dept] || 0;
                if (amt > 0) {
                    const segHeight = (amt / maxMoney) * chartHeight;
                    const yTop = curY - segHeight;
                    const c = deptColorMap[dept];
                    segmentsHtml += `
                        <rect x="${barX}" y="${yTop}" width="${barWidth}" height="${segHeight}" 
                              fill="${c}" opacity="0.95">
                            <title>${escHtml(dept)}: ${fmtNum(amt)} บาท</title>
                        </rect>
                    `;
                    tooltipLines.push(`• ${dept}: ${fmtNum(amt)} บาท`);
                    curY = yTop;
                }
            });

            if (tMoney === 0) {
                segmentsHtml = `
                    <rect x="${barX}" y="${yBaseline - 4}" width="${barWidth}" height="4" 
                          fill="rgba(148, 163, 184, 0.25)" rx="2" ry="2" />
                `;
            }

            const totalLabelY = curY - 8;
            const teamTitle = t.teamName || ('ทีมที่ ' + (t.orderNo || (idx + 1)));

            // ข้อความใต้กราฟแท่ง ปรับเป็น 2 บรรทัดหากมีความยาวเกิน
            const teamWrap = wrapText2Lines(teamTitle, 10);
            const teamLabelsHtml = teamWrap.line2 ? `
                <text x="${cx}" y="${yBaseline + 46}" class="chart-team-label-l1">${escHtml(teamWrap.line1)}</text>
                <text x="${cx}" y="${yBaseline + 60}" class="chart-team-label-l2">${escHtml(teamWrap.line2)}</text>
            ` : `
                <text x="${cx}" y="${yBaseline + 50}" class="chart-team-label-l1">${escHtml(teamWrap.line1)}</text>
            `;

            barsHtml += `
                <g class="summary-team-column" tabindex="0">
                    <title>${tooltipLines.join('\n')}</title>

                    <rect x="${cx - colWidth / 2 + 4}" y="${padTop}" width="${colWidth - 8}" height="${chartHeight}" 
                          fill="rgba(56, 189, 248, 0.04)" rx="8" class="chart-track-bg" />

                    ${segmentsHtml}

                    ${tMoney > 0 ? `
                        <text x="${cx}" y="${totalLabelY}" class="chart-dept-sub" fill="#38bdf8" text-anchor="middle">
                            ${fmtCompactMoney(tMoney)}
                        </text>
                    ` : `
                        <text x="${cx}" y="${yBaseline - 10}" class="chart-dept-sub" fill="var(--invest-text-muted)" text-anchor="middle">
                            0 บาท
                        </text>
                    `}

                    <!-- Badge: ทีมที่ X -->
                    <rect x="${cx - 30}" y="${yBaseline + 10}" width="60" height="20" rx="10" fill="rgba(56, 189, 248, 0.2)" />
                    <text x="${cx}" y="${yBaseline + 24}" class="chart-order-badge-txt" fill="#38bdf8" font-size="11" text-anchor="middle">
                        ทีมที่ ${t.orderNo || (idx + 1)}
                    </text>

                    <!-- ข้อความชื่อทีม (ปรับเป็น 2 บรรทัดเมื่อยาวเกิน) -->
                    ${teamLabelsHtml}
                </g>
            `;

            const ly = yBaseline - (invCount / maxInvestors) * chartHeight;
            linePoints.push({ cx, cy: ly, count: invCount, teamName: teamTitle });
        });

        // Smooth cubic Bezier spline for dashed line
        const pathD = buildSmoothPath(linePoints, 0.2);

        let lineNodesHtml = '';
        linePoints.forEach(p => {
            lineNodesHtml += `
                <g class="chart-node-group">
                    <title>${p.teamName}: นักลงทุน ${p.count} คน</title>
                    <circle cx="${p.cx}" cy="${p.cy}" r="7" fill="#10b981" stroke="#ffffff" stroke-width="2" />
                    <text x="${p.cx}" y="${p.cy - 12}" fill="#10b981" font-size="11" text-anchor="middle">
                        ${p.count} คน
                    </text>
                </g>
            `;
        });

        container.innerHTML = `
            <svg class="summary-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
                <!-- Left Axis Title (สีสว่างสดใส) -->
                <text x="${padLeft}" y="24" class="chart-money-axis-text" text-anchor="start">
                    💰 ยอดเงินลงทุนตามสังกัด (บาท)
                </text>
                <!-- Right Axis Title -->
                <text x="${padLeft + chartWidth}" y="24" class="chart-axis-text" text-anchor="end" fill="#10b981">
                    👥 จำนวนนักลงทุน (คน)
                </text>

                ${gridHtml}
                ${barsHtml}

                <!-- กราฟเส้นปะ smooth ทั้งหมด -->
                <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="6,4" stroke-linecap="round" stroke-linejoin="round" />
                ${lineNodesHtml}
            </svg>
        `;
    }

    // Render Summary Ranking Table (เรียงตามลำดับยอดเงินลงทุนสูงสุดไปต่ำสุด)
    function renderSummaryRankingTable(sortedTeams, teamStats, grandTotalMoney, departments, deptColorMap) {
        const tbody = document.getElementById('summaryRankTableBody');
        if (!tbody) return;

        tbody.innerHTML = sortedTeams.map((t, idx) => {
            const rank = idx + 1;
            const st = teamStats[t.id];
            const tMoney = st.totalMoney;
            const invCount = st.investorsSet.size;
            const pct = grandTotalMoney > 0 ? ((tMoney / grandTotalMoney) * 100).toFixed(1) : '0.0';

            let topDept = '-';
            let topDeptAmt = 0;
            departments.forEach(d => {
                const amt = st.deptMoney[d] || 0;
                if (amt > topDeptAmt) {
                    topDeptAmt = amt;
                    topDept = d;
                }
            });

            const isChamp = rank === 1 && tMoney > 0;

            return `
                <tr class="${isChamp ? 'row-champ' : ''}">
                    <td style="text-align: center;">
                        ${isChamp ? '<span class="rank-badge-champ">👑 1</span>' : `<span class="rank-badge rank-${rank}">${rank}</span>`}
                    </td>
                    <td style="text-align: center;">
                        <span class="dock-order-pill" style="font-size: 0.76rem;">ทีมที่ ${t.orderNo || rank}</span>
                    </td>
                    <td>
                        <div class="investor-name" style="color: ${isChamp ? '#fbbf24' : '#ffffff'};">
                            ${escHtml(t.teamName || ('ทีมที่ ' + t.orderNo))}
                        </div>
                    </td>
                    <td style="text-align: right; color: #10b981;">
                        ${fmtNum(invCount)} คน
                    </td>
                    <td style="text-align: right; color: #38bdf8;">
                        ${fmtNum(tMoney)} บาท
                    </td>
                    <td style="text-align: center;">
                        ${pct}%
                    </td>
                    <td>
                        ${topDeptAmt > 0 ? `
                            <span class="investor-dept-tag" style="border-left: 3px solid ${deptColorMap[topDept] || '#38bdf8'};">
                                ${escHtml(topDept)} (${fmtCompactMoney(topDeptAmt)})
                            </span>
                        ` : '<span style="color: var(--invest-text-muted);">-</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ========================================================
    // KEY STATISTICS DONUT CARDS & ZOOM LIGHTBOX MODAL (80% WIDTH)
    // ตรงตามรูป media_1794664182875_3e3d2ff9.png
    // Font Kanit ปกติ (font-weight: 400) และใช้หน่วย บาท
    // ========================================================

    const TEAM_DONUT_COLORS = [
        '#f59e0b', // Amber/Gold (อันดับ 1)
        '#38bdf8', // ฟ้าสดใส
        '#10b981', // เขียวมรกต
        '#ec4899', // ชมพู
        '#8b5cf6', // ม่วงสว่าง
        '#f97316', // ส้มสด
        '#06b6d4', // ไซแอน
        '#eab308', // เหลืองสด
        '#14b8a6', // เขียวทีล
        '#a855f7', // ไวโอเลต
        '#6366f1', // อินดิโก
        '#84cc16'  // เขียวมะนาว
    ];

    let currentSummaryStatsData = {
        investorPct: 0,
        activeInvestorsCount: 0,
        totalEligible: 0,
        totalInitialBudget: 0,
        grandTotalMoney: 0,
        moneyPct: 0,
        topTeam: null,
        teamSlices: [],
        sortedTeams: [],
        teamStats: {}
    };

    // Single Gauge Donut SVG (ตรงตามภาพ media_1794664182875_3e3d2ff9.png)
    function buildDonutGaugeSvg(pct, color = '#f59e0b', trackColor = '#232f48', size = 140, strokeWidth = 13, customCenterText = null) {
        const r = (size - strokeWidth) / 2 - 4;
        const cx = size / 2;
        const cy = size / 2;
        const C = 2 * Math.PI * r;
        const clampedPct = Math.max(0, Math.min(100, parseFloat(pct) || 0));
        const offset = C * (1 - clampedPct / 100);
        const centerText = customCenterText !== null ? customCenterText : `${clampedPct.toFixed(1)}%`;
        const fontSize = size >= 200 ? '38px' : '23px';

        return `
            <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke="${trackColor}" stroke-width="${strokeWidth}" />
                <circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
                        stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
                        stroke-linecap="butt" transform="rotate(-90 ${cx} ${cy})" />
                <text x="${cx}" y="${cy + 2}" text-anchor="middle" dominant-baseline="central"
                      fill="${color}" font-family="'Kanit', sans-serif" font-weight="400" font-size="${fontSize}">
                    ${centerText}
                </text>
            </svg>
        `;
    }

    // Multi-segment Team Donut SVG (สัดส่วนการลงทุนในแต่ละทีม)
    function buildTeamDonutSvg(slices, size = 140, strokeWidth = 13, centerText = null, centerColor = '#f59e0b') {
        const r = (size - strokeWidth) / 2 - 4;
        const cx = size / 2;
        const cy = size / 2;
        const C = 2 * Math.PI * r;
        const fontSize = size >= 200 ? '38px' : '23px';

        let slicesSvg = '';
        let currentOffset = 0;

        if (!slices || slices.length === 0 || slices.every(s => s.pct === 0)) {
            slicesSvg = `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke="#232f48" stroke-width="${strokeWidth}" />`;
        } else {
            slicesSvg += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke="#232f48" stroke-width="${strokeWidth}" />`;
            slices.forEach(s => {
                if (s.pct <= 0) return;
                const sliceLen = C * (s.pct / 100);
                slicesSvg += `
                    <circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="${strokeWidth}"
                            stroke-dasharray="${sliceLen.toFixed(2)} ${(C - sliceLen).toFixed(2)}"
                            stroke-dashoffset="${(-currentOffset).toFixed(2)}"
                            stroke-linecap="butt" transform="rotate(-90 ${cx} ${cy})">
                        <title>${escHtml(s.name)}: ${fmtNum(s.money)} บาท (${s.pct.toFixed(1)}%)</title>
                    </circle>
                `;
                currentOffset += sliceLen;
            });
        }

        return `
            <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                ${slicesSvg}
                <text x="${cx}" y="${cy + 2}" text-anchor="middle" dominant-baseline="central"
                      fill="${centerColor}" font-family="'Kanit', sans-serif" font-weight="400" font-size="${fontSize}">
                    ${centerText || '0.0%'}
                </text>
            </svg>
        `;
    }

    // Placeholder Donut SVG (กล่องที่ 4: เว้นไว้ก่อน)
    function buildPlaceholderDonutSvg(size = 140, strokeWidth = 8) {
        const r = (size - strokeWidth) / 2 - 6;
        const cx = size / 2;
        const cy = size / 2;
        const fontSize = size >= 200 ? '32px' : '20px';
        return `
            <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke="#334155" stroke-width="${strokeWidth}" stroke-dasharray="6,6" />
                <text x="${cx}" y="${cy + 2}" text-anchor="middle" dominant-baseline="central"
                      fill="#64748b" font-family="'Kanit', sans-serif" font-weight="400" font-size="${fontSize}">
                    - %
                </text>
            </svg>
        `;
    }

    // Render 4 Stat Donut Cards
    function renderSummaryKeyStats(sortedTeams, teamStats, grandTotalMoney, grandInvestorsSet, members) {
        // 1. Calculate Active Investors vs Registered
        const registered = Array.isArray(members) ? members.filter(m => m.registered === true) : [];
        const totalEligible = registered.length > 0 ? registered.length : (Array.isArray(members) && members.length ? members.length : 1);
        const activeInvestorsCount = grandInvestorsSet ? grandInvestorsSet.size : 0;
        const investorPct = totalEligible > 0 ? ((activeInvestorsCount / totalEligible) * 100) : 0;

        // 2. Calculate Total Invested Money vs Initial Budget
        const budgetPerPerson = (state && typeof state.getVoteBudget === 'function') ? state.getVoteBudget() : 1000000;
        const totalInitialBudget = totalEligible * budgetPerPerson;
        const moneyPct = totalInitialBudget > 0 ? ((grandTotalMoney / totalInitialBudget) * 100) : 0;

        // 3. Calculate Team Allocation Slices
        const teamSlices = sortedTeams.map((t, idx) => {
            const st = teamStats[t.id];
            const tMoney = st ? st.totalMoney : 0;
            const pct = grandTotalMoney > 0 ? ((tMoney / grandTotalMoney) * 100) : 0;
            const invCount = st ? st.investorsSet.size : 0;
            return {
                team: t,
                name: t.teamName || ('ทีมที่ ' + t.orderNo),
                orderNo: t.orderNo || (idx + 1),
                money: tMoney,
                pct: pct,
                invCount: invCount,
                color: TEAM_DONUT_COLORS[idx % TEAM_DONUT_COLORS.length]
            };
        });

        const topTeam = teamSlices.length > 0 ? teamSlices[0] : null;

        // Cache for Lightbox Zoom Modal
        currentSummaryStatsData = {
            investorPct,
            activeInvestorsCount,
            totalEligible,
            totalInitialBudget,
            grandTotalMoney,
            moneyPct,
            topTeam,
            teamSlices,
            sortedTeams,
            teamStats
        };

        // Render Card 1: นักลงทุนทั้งหมด (% ของผู้ลงทุน ต่อ ผู้ลงทะเบียนทั้งหมด)
        const donutWrapInvestors = document.getElementById('donutWrapInvestors');
        const statSubInvestors = document.getElementById('statSubInvestors');
        if (donutWrapInvestors) {
            donutWrapInvestors.innerHTML = buildDonutGaugeSvg(investorPct, '#f59e0b', '#232f48', 140, 13);
        }
        if (statSubInvestors) {
            statSubInvestors.textContent = `${fmtNum(activeInvestorsCount)} คน / ${fmtNum(totalEligible)} คน`;
        }

        // Render Card 2: สัดส่วนเงินลงทุนทั้งหมด (% จำนวนเงินลงทุนทั้งหมด ต่อ จำนวนเงินทั้งหมด)
        const donutWrapMoney = document.getElementById('donutWrapMoney');
        const statSubMoney = document.getElementById('statSubMoney');
        if (donutWrapMoney) {
            donutWrapMoney.innerHTML = buildDonutGaugeSvg(moneyPct, '#f59e0b', '#232f48', 140, 13);
        }
        if (statSubMoney) {
            statSubMoney.textContent = `${fmtNum(grandTotalMoney)} บาท / ${fmtNum(totalInitialBudget)} บาท`;
        }

        // Render Card 3: สัดส่วนการลงทุนในแต่ละทีม
        const donutWrapTeams = document.getElementById('donutWrapTeams');
        const statSubTeams = document.getElementById('statSubTeams');
        if (donutWrapTeams) {
            const topTeamPctText = topTeam && topTeam.pct > 0 ? `${topTeam.pct.toFixed(1)}%` : '0.0%';
            donutWrapTeams.innerHTML = buildTeamDonutSvg(teamSlices, 140, 13, topTeamPctText, '#f59e0b');
        }
        if (statSubTeams) {
            statSubTeams.textContent = `${sortedTeams.length} ทีมแข่งขัน (${topTeam ? topTeam.name : '-'})`;
        }

        // Render Card 4: เว้นไว้ก่อน
        const donutWrapReserved = document.getElementById('donutWrapReserved');
        const statSubReserved = document.getElementById('statSubReserved');
        if (donutWrapReserved) {
            donutWrapReserved.innerHTML = buildPlaceholderDonutSvg(140, 8);
        }
        if (statSubReserved) {
            statSubReserved.textContent = '(เตรียมข้อมูลสำหรับรอบถัดไป)';
        }
    }

    // Open 80% Lightbox Zoom Modal
    function openChartZoomModal(chartType) {
        if (!chartZoomModal || !zoomModalBody) return;

        let title = 'ข้อมูลสถิติ';
        let subtitle = 'รายละเอียดการวิเคราะห์และสถิติภาพรวม';
        let icon = '📊';
        let bodyHtml = '';

        const data = currentSummaryStatsData;

        if (chartType === 'investors') {
            title = 'ข้อมูลสถิติ: นักลงทุนทั้งหมด (Investor Participation)';
            subtitle = 'อัตราส่วนนักลงทุนที่ร่วมสนับสนุนงบประมาณ เปรียบเทียบกับจำนวนผู้ลงทะเบียนทั้งหมดในระบบ';
            icon = '👥';

            const remainingInvestors = Math.max(0, data.totalEligible - data.activeInvestorsCount);
            const largeDonut = buildDonutGaugeSvg(data.investorPct, '#f59e0b', '#232f48', 260, 22);

            bodyHtml = `
                <div class="zoom-chart-content-row">
                    <div class="zoom-chart-svg-wrap">
                        ${largeDonut}
                    </div>
                    <div class="zoom-metrics-grid">
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">นักลงทุนที่ร่วมลงทุนแล้ว</span>
                            <span class="zoom-metric-val highlight-emerald">${fmtNum(data.activeInvestorsCount)} คน</span>
                        </div>
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">ผู้มีสิทธิ์ลงทะเบียนทั้งหมด</span>
                            <span class="zoom-metric-val highlight-sky">${fmtNum(data.totalEligible)} คน</span>
                        </div>
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">ยังไม่ได้ร่วมลงทุน</span>
                            <span class="zoom-metric-val">${fmtNum(remainingInvestors)} คน</span>
                        </div>
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">สัดส่วนการมีส่วนร่วม (%)</span>
                            <span class="zoom-metric-val highlight-gold">${data.investorPct.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                <div style="background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; font-size: 0.88rem; color: #fbbf24;">
                    💡 <strong>สูตรคำนวณ:</strong> (จำนวนผู้ลงทุนจริง ${fmtNum(data.activeInvestorsCount)} คน ÷ ผู้ลงทะเบียนทั้งหมด ${fmtNum(data.totalEligible)} คน) × 100 = <strong>${data.investorPct.toFixed(1)}%</strong>
                </div>
            `;
        } else if (chartType === 'money') {
            title = 'ข้อมูลสถิติ: สัดส่วนเงินลงทุนทั้งหมด (Budget Utilization)';
            subtitle = 'ยอดเงินลงทุนรวมที่ถูกจัดสรรเข้าสู่การแข่งขัน เปรียบเทียบกับงบประมาณเริ่มต้นทั้งหมด';
            icon = '💰';

            const remainingBudget = Math.max(0, data.totalInitialBudget - data.grandTotalMoney);
            const largeDonut = buildDonutGaugeSvg(data.moneyPct, '#f59e0b', '#232f48', 260, 22);

            bodyHtml = `
                <div class="zoom-chart-content-row">
                    <div class="zoom-chart-svg-wrap">
                        ${largeDonut}
                    </div>
                    <div class="zoom-metrics-grid">
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">ยอดเงินลงทุนที่ใช้ไปแล้ว</span>
                            <span class="zoom-metric-val highlight-gold">${fmtNum(data.grandTotalMoney)} บาท</span>
                        </div>
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">งบประมาณเริ่มต้นทั้งหมด</span>
                            <span class="zoom-metric-val highlight-sky">${fmtNum(data.totalInitialBudget)} บาท</span>
                        </div>
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">งบประมาณคงเหลือในระบบ</span>
                            <span class="zoom-metric-val highlight-emerald">${fmtNum(remainingBudget)} บาท</span>
                        </div>
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">สัดส่วนการใช้งบประมาณ (%)</span>
                            <span class="zoom-metric-val highlight-gold">${data.moneyPct.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                <div style="background: rgba(56, 189, 248, 0.08); border-left: 4px solid #38bdf8; padding: 12px 16px; border-radius: 8px; font-size: 0.88rem; color: #38bdf8;">
                    💡 <strong>สูตรคำนวณ:</strong> (ยอดเงินลงทุนสะสม ${fmtNum(data.grandTotalMoney)} บาท ÷ งบประมาณทั้งหมด ${fmtNum(data.totalInitialBudget)} บาท) × 100 = <strong>${data.moneyPct.toFixed(1)}%</strong>
                </div>
            `;
        } else if (chartType === 'teams') {
            title = 'ข้อมูลสถิติ: สัดส่วนการลงทุนในแต่ละทีม (Team Allocation)';
            subtitle = 'การจัดสรรเงินลงทุนและสัดส่วนร้อยละในแต่ละทีมแข่งขัน เรียงลำดับจากเงินลงทุนสูงสุดไปต่ำสุด';
            icon = '🏆';

            const topPctText = data.topTeam && data.topTeam.pct > 0 ? `${data.topTeam.pct.toFixed(1)}%` : '100%';
            const largeDonut = buildTeamDonutSvg(data.teamSlices, 260, 22, topPctText, '#f59e0b');

            let tableRows = data.teamSlices.map((s, idx) => {
                const rank = idx + 1;
                return `
                    <tr>
                        <td style="text-align: center; font-weight: 400;">${rank === 1 ? '👑 1' : rank}</td>
                        <td style="text-align: center;"><span class="dock-order-pill" style="font-size: 0.76rem;">ทีมที่ ${s.orderNo}</span></td>
                        <td>
                            <span class="zoom-team-color-dot" style="background: ${s.color};"></span>
                            <strong style="color: ${rank === 1 ? '#fbbf24' : '#ffffff'}; font-weight: 400;">${escHtml(s.name)}</strong>
                        </td>
                        <td style="text-align: right; color: #38bdf8;">${fmtNum(s.money)} บาท</td>
                        <td style="text-align: center; color: #fbbf24;">${s.pct.toFixed(1)}%</td>
                        <td style="text-align: right; color: #10b981;">${fmtNum(s.invCount)} คน</td>
                    </tr>
                `;
            }).join('');

            bodyHtml = `
                <div class="zoom-chart-content-row">
                    <div class="zoom-chart-svg-wrap">
                        ${largeDonut}
                    </div>
                    <div class="zoom-metrics-grid">
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">ยอดเงินลงทุนรวมทุกทีม</span>
                            <span class="zoom-metric-val highlight-sky">${fmtNum(data.grandTotalMoney)} บาท</span>
                        </div>
                        <div class="zoom-metric-box">
                            <span class="zoom-metric-label">ทีมที่ได้รับเงินลงทุนสูงสุด</span>
                            <span class="zoom-metric-val highlight-gold">${data.topTeam ? escHtml(data.topTeam.name) : '-'}</span>
                        </div>
                    </div>
                </div>
                <div class="zoom-teams-table-wrap">
                    <table class="zoom-teams-table">
                        <thead>
                            <tr>
                                <th style="width: 60px; text-align: center;">อันดับ</th>
                                <th style="width: 80px; text-align: center;">ทีมที่</th>
                                <th>ชื่อทีมแข่งขัน</th>
                                <th style="text-align: right;">ยอดเงินลงทุน</th>
                                <th style="text-align: center; width: 100px;">สัดส่วน</th>
                                <th style="text-align: right; width: 110px;">จำนวนนักลงทุน</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows || '<tr><td colspan="6" style="text-align: center; padding: 20px;">ไม่มีข้อมูลทีม</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            // reserved
            title = 'ข้อมูลสถิติ: เว้นไว้ก่อน (Reserved Analytics)';
            subtitle = 'ช่องแสดงผลสถิตินี้ถูกจัดเตรียมไว้สำหรับรอบการแข่งขันหรือฟีเจอร์ถัดไป';
            icon = '⏳';

            const largeDonut = buildPlaceholderDonutSvg(260, 12);

            bodyHtml = `
                <div class="zoom-chart-content-row">
                    <div class="zoom-chart-svg-wrap">
                        ${largeDonut}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px; justify-content: center;">
                        <h4 style="margin: 0; color: #ffffff; font-size: 1.2rem; font-weight: 400;">อยู่ระหว่างการเตรียมข้อมูล (Coming Soon)</h4>
                        <p style="margin: 0; color: #94a3b8; font-size: 0.95rem; line-height: 1.6; font-weight: 400;">
                            ช่องข้อมูลสถิติลำดับที่ 4 นี้ ได้รับการสำรองไว้สำหรับแสดงผลการวิเคราะห์ขั้นสูงในรอบถัดไป อาทิเช่น อัตราผลตอบแทนจากการลงทุน (ROI Index), ดัชนีความหลากหลายของสังกัดผู้ร่วมลงทุน (Diversity Index), หรือสถิติมูลค่าการลงทุนเฉลี่ยต่อคน
                        </p>
                    </div>
                </div>
            `;
        }

        if (zoomModalTitle) zoomModalTitle.textContent = title;
        if (zoomModalSubtitle) zoomModalSubtitle.textContent = subtitle;
        if (zoomModalIcon) zoomModalIcon.textContent = icon;
        zoomModalBody.innerHTML = bodyHtml;

        chartZoomModal.style.display = 'flex';
        if (sound) sound.playClick();
    }

    function closeChartZoomModal() {
        if (!chartZoomModal) return;
        chartZoomModal.style.display = 'none';
        if (sound) sound.playClick();
    }

    // Bind Top 20 Investors Lightbox Listeners
    if (btnOpenTopInvestors) {
        btnOpenTopInvestors.addEventListener('click', openTopInvestorsModal);
    }
    if (btnCloseTopInvestors) {
        btnCloseTopInvestors.addEventListener('click', closeTopInvestorsModal);
    }
    if (btnDismissTopInvestors) {
        btnDismissTopInvestors.addEventListener('click', closeTopInvestorsModal);
    }
    if (topInvestorsModal) {
        topInvestorsModal.addEventListener('click', (e) => {
            if (e.target === topInvestorsModal) {
                closeTopInvestorsModal();
            }
        });
    }

    // Bind Summary Confirmation PIN Lightbox Listeners
    if (btnCloseSummaryAuth) {
        btnCloseSummaryAuth.addEventListener('click', closeSummaryAuthModal);
    }
    if (btnCancelSummaryAuth) {
        btnCancelSummaryAuth.addEventListener('click', closeSummaryAuthModal);
    }
    if (btnConfirmSummaryAuth) {
        btnConfirmSummaryAuth.addEventListener('click', handleConfirmSummaryAuth);
    }
    if (summaryPinInput) {
        summaryPinInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleConfirmSummaryAuth();
            }
        });
    }
    if (summaryAuthModal) {
        summaryAuthModal.addEventListener('click', (e) => {
            if (e.target === summaryAuthModal) {
                closeSummaryAuthModal();
            }
        });
    }

    // Back from Summary Button
    if (btnBackFromSummary) {
        btnBackFromSummary.addEventListener('click', () => {
            selectedTeamId = 'none';
            if (sound) sound.playClick();
            renderDashboard();
        });
    }

    // Bind Chart Zoom Lightbox Modal Listeners (80% Width)
    if (btnCloseChartZoom) {
        btnCloseChartZoom.addEventListener('click', closeChartZoomModal);
    }
    if (btnDismissChartZoom) {
        btnDismissChartZoom.addEventListener('click', closeChartZoomModal);
    }
    if (chartZoomModal) {
        chartZoomModal.addEventListener('click', (e) => {
            if (e.target === chartZoomModal) {
                closeChartZoomModal();
            }
        });
    }

    // Delegated click handler for .btn-zoom-chart buttons
    document.addEventListener('click', (e) => {
        const zoomBtn = e.target.closest('.btn-zoom-chart');
        if (zoomBtn) {
            e.preventDefault();
            e.stopPropagation();
            const chartType = zoomBtn.getAttribute('data-chart');
            openChartZoomModal(chartType);
        }
    });

    // Keyboard navigation (Escape to close any modal)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (chartZoomModal && chartZoomModal.style.display !== 'none') {
                closeChartZoomModal();
            }
            if (topInvestorsModal && topInvestorsModal.style.display !== 'none') {
                closeTopInvestorsModal();
            }
            if (summaryAuthModal && summaryAuthModal.style.display !== 'none') {
                closeSummaryAuthModal();
            }
        }
    });

    // Toast Notification Helper
    let investToastTimeout = null;
    function showInvestToast(message, type = 'success') {
        let toast = document.getElementById('investToastNotice');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'investToastNotice';
            toast.className = 'invest-toast-notice';
            document.body.appendChild(toast);
        }
        const icon = type === 'success' ? '✅' : (type === 'warning' ? '⚠️' : 'ℹ️');
        toast.className = `invest-toast-notice toast-${type} is-active`;
        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        if (investToastTimeout) clearTimeout(investToastTimeout);
        investToastTimeout = setTimeout(() => {
            toast.classList.remove('is-active');
        }, 3200);
    }

    // Update Toggle Buttons UI (เปิดให้ลงทุน: เขียว / ปิดการลงทุน: แดง)
    // Update Toggle Buttons UI (ตรงตามแบบ Image 2: 🟢 เปิดโหวต / 🔒 ปิดโหวต และซิงค์กับตาราง admin)
    function updateTeamInvestToggleUI(team) {
        const btnHero = document.getElementById('btnToggleTeamInvest');
        const btnTop = document.getElementById('btnToggleTeamInvestTop');
        const buttons = [btnHero, btnTop].filter(Boolean);

        // เมื่อกดปุ่มสรุปผลและผ่านการคีย์รหัสผ่านแล้ว ให้ปุ่มแสดงผล "🔒 ปิดโหวต" (หรือ "🔒 ปิดโหวตทั้งหมด")
        if (isSummaryUnlocked || selectedTeamId === 'summary') {
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.className = 'btn-team-invest-toggle status-pill-closed';
                btn.innerHTML = '<span class="btn-toggle-icon">🔒</span><span class="btn-toggle-text">ปิดโหวต</span>';
                btn.title = 'ระบบได้ทำการสรุปผลและปิดรับการโหวต/ลงทุนของทุกทีมเรียบร้อยแล้ว';
            });
            return;
        }

        if (!team || selectedTeamId === 'none') {
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.className = 'btn-team-invest-toggle status-pill-closed is-disabled';
                btn.innerHTML = '<span class="btn-toggle-icon">⏳</span><span class="btn-toggle-text">เลือกทีมแข่งขันก่อน</span>';
                btn.title = 'กรุณาคลิกเลือกทีมแข่งขันจากแถบด้านล่าง';
            });
            return;
        }

        buttons.forEach(btn => btn.disabled = false);

        // สถานะการแสดงผลให้ตรงกับหน้า admin เมนูทีมแข่งขัน ตารางข้อมูลทีมที่เข้าแข่งขัน (team.voteStatus !== 'closed')
        const isTeamOpen = (team.voteStatus !== 'closed');

        if (isTeamOpen) {
            // สถานะเปิดโหวต (แบบ Image 2: 🟢 เปิดโหวต)
            buttons.forEach(btn => {
                btn.className = 'btn-team-invest-toggle status-pill-open';
                btn.innerHTML = '<span class="btn-toggle-icon">🟢</span><span class="btn-toggle-text">เปิดโหวต</span>';
                btn.title = `คลิกเพื่อปิดโหวตสำหรับทีม "${team.teamName || ('ทีมที่ ' + team.orderNo)}"`;
            });
        } else {
            // สถานะปิดโหวต (แบบ Image 2: 🔒 ปิดโหวต)
            buttons.forEach(btn => {
                btn.className = 'btn-team-invest-toggle status-pill-closed';
                btn.innerHTML = '<span class="btn-toggle-icon">🔒</span><span class="btn-toggle-text">ปิดโหวต</span>';
                btn.title = `คลิกเพื่อเปิดโหวตสำหรับทีม "${team.teamName || ('ทีมที่ ' + team.orderNo)}" (แจ้งประกาศ Lightbox ไปยังหน้า index ของผู้ร่วมงาน)`;
            });
        }
    }

    // Toggle Team Investment Handler (คลิกเพื่อสลับไปมาระหว่าง 🟢 เปิดโหวต / 🔒 ปิดโหวต)
    function toggleSelectedTeamInvestment() {
        if (!state) return;
        if (isSummaryUnlocked || selectedTeamId === 'summary') {
            showInvestToast('🔒 สรุปผลการแข่งขันแล้ว ระบบปิดรับการโหวตทั้งหมดแล้ว', 'info');
            return;
        }
        if (!selectedTeamId || selectedTeamId === 'none') {
            showInvestToast('กรุณาคลิกเลือกทีมแข่งขันจากแถบด้านล่างก่อนทำรายการ', 'warning');
            return;
        }

        const teams = getCleanTeams();
        const currentTeam = teams.find(t => t.id === selectedTeamId);
        if (!currentTeam) {
            showInvestToast('ไม่พบข้อมูลทีมที่เลือก', 'warning');
            return;
        }

        // ตรวจสอบสถานะเดิม: ถ้าเปิดอยู่ (voteStatus !== 'closed') ให้สลับเป็น closed, ถ้าปิดอยู่ ให้สลับเป็น open
        const isCurrentlyOpen = (currentTeam.voteStatus !== 'closed');
        const nextStatus = isCurrentlyOpen ? 'closed' : 'open';

        if (nextStatus === 'open') {
            // เมื่อเปิดรับการโหวต ให้ตรวจสอบและเปิดระบบรับการลงทุนหลักด้วย
            if (typeof state.setVoteOpen === 'function' && !state.isVoteOpen()) {
                state.setVoteOpen(true);
            }
        }

        // บันทึกสถานะการโหวตของทีมในฐานข้อมูล
        if (typeof state.setTeamVoteStatus === 'function') {
            state.setTeamVoteStatus(currentTeam.id, nextStatus);
        }

        const tName = currentTeam.teamName || `ทีมที่ ${currentTeam.orderNo}`;
        if (nextStatus === 'open') {
            showInvestToast(`🟢 เปิดโหวตสำหรับ "${tName}" เรียบร้อยแล้ว (แจ้งประกาศ Lightbox ไปยังหน้า index แล้ว)`, 'success');
            if (sound && typeof sound.playWin === 'function') {
                sound.playWin();
            } else if (sound) {
                sound.playClick();
            }
        } else {
            showInvestToast(`🔒 ปิดโหวตสำหรับ "${tName}" แล้ว`, 'info');
            if (sound) sound.playClick();
        }

        renderDashboard();
    }

    // Bind Toggle Button Event Listeners
    const btnToggleTeamInvest = document.getElementById('btnToggleTeamInvest');
    if (btnToggleTeamInvest) {
        btnToggleTeamInvest.addEventListener('click', toggleSelectedTeamInvestment);
    }
    const btnToggleTeamInvestTop = document.getElementById('btnToggleTeamInvestTop');
    if (btnToggleTeamInvestTop) {
        btnToggleTeamInvestTop.addEventListener('click', toggleSelectedTeamInvestment);
    }
    const elDispTeamStatusTag = document.getElementById('dispTeamStatus');
    if (elDispTeamStatusTag) {
        elDispTeamStatusTag.addEventListener('click', toggleSelectedTeamInvestment);
    }

    // Globally exposed team selector
    window.selectInvestmentTeam = function (teamId) {
        if (!teamId) return;
        selectedTeamId = teamId;
        if (sound) sound.playClick();
        renderDashboard();
    };

    // Fullscreen Toggle
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

    // Theme Toggle
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('crsdg_theme_mode', isLight ? 'light' : 'dark');
            if (sound) sound.playClick();
        });
        if (localStorage.getItem('crsdg_theme_mode') === 'light') {
            document.body.classList.add('light-mode');
        }
    }

    // Manual Refresh Button
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            renderDashboard();
            if (sound) sound.playClick();
        });
    }

    // Real-time State Subscriptions
    if (state && typeof state.subscribe === 'function') {
        state.subscribe(() => {
            renderDashboard();
        });
    }

    if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.subscribe === 'function') {
        FirebaseSync.subscribe(() => {
            renderDashboard();
        });
    }

    // Auto Polling / Storage Event for live projector sync
    window.addEventListener('storage', (e) => {
        if (e.key === 'crsdg_all_user_investments' || e.key === 'crsdg_player' || e.key === 'crsdg_member' || e.key === 'crsdg_vote_open') {
            renderDashboard();
        }
    });

    setInterval(renderDashboard, 3000);

    // Initial render
    renderDashboard();
});
