/**
 * REMOTE REWARD CONTROLLER (remote-reward.html)
 * Mobile-First Remote Controller for Lucky Draw Stage
 */

(function () {
    'use strict';

    const state = window.state || new StateManager();
    const sound = window.sound || window.soundEffects || null;

    const rewardChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('crsdg_reward_channel') : null;

    let prizes = [];
    let currentPrizeIndex = 0;
    let isSpinning = false;
    let isMuted = false;

    // DOM Elements
    const connStatusTextEl = document.getElementById('connStatusText');
    const remoteEligibleCountEl = document.getElementById('remoteEligibleCount');
    const remotePrizeIndexTagEl = document.getElementById('remotePrizeIndexTag');

    const remoteSponsorImgEl = document.getElementById('remoteSponsorImg');
    const remoteSponsorNameEl = document.getElementById('remoteSponsorName');
    const remotePrizeTitleEl = document.getElementById('remotePrizeTitle');
    const remoteGroupBadgeEl = document.getElementById('remoteGroupBadge');
    const remoteDrawnBadgeEl = document.getElementById('remoteDrawnBadge');
    const remotePrizeSelectEl = document.getElementById('remotePrizeSelect');

    const btnPrevPrizeEl = document.getElementById('btnPrevPrize');
    const btnNextPrizeEl = document.getElementById('btnNextPrize');

    const btnRemoteSpinEl = document.getElementById('btnRemoteSpin');
    const giantBtnIconEl = document.getElementById('giantBtnIcon');
    const giantBtnLabelEl = document.getElementById('giantBtnLabel');
    const giantBtnSubEl = document.getElementById('giantBtnSub');

    const btnRemoteQuickDrawEl = document.getElementById('btnRemoteQuickDraw');
    const btnRemoteRerollEl = document.getElementById('btnRemoteReroll');
    const btnRemoteToggleSoundEl = document.getElementById('btnRemoteToggleSound');
    const remoteSoundIconEl = document.getElementById('remoteSoundIcon');

    const remoteWinnerIdEl = document.getElementById('remoteWinnerId');
    const remoteWinnerNameEl = document.getElementById('remoteWinnerName');
    const remoteWinnerDeptEl = document.getElementById('remoteWinnerDept');
    const remoteWinnerSponsorLabelEl = document.getElementById('remoteWinnerSponsorLabel');
    const btnCancelWinnerEl = document.getElementById('btnCancelWinner');

    const executiveGridPickerEl = document.getElementById('executiveGridPicker');
    const execCountTagEl = document.getElementById('execCountTag');

    // Cancel Winner Lightbox Modal Elements
    const cancelWinnerModalEl = document.getElementById('cancelWinnerModal');
    const modalCancelSponsorEl = document.getElementById('modalCancelSponsor');
    const modalCancelEmpInfoEl = document.getElementById('modalCancelEmpInfo');
    const modalCancelEmpDeptEl = document.getElementById('modalCancelEmpDept');
    const btnCloseCancelModalEl = document.getElementById('btnCloseCancelModal');
    const btnDismissCancelModalEl = document.getElementById('btnDismissCancelModal');
    const btnConfirmCancelWinnerEl = document.getElementById('btnConfirmCancelWinner');

    // ========================================================
    // INITIALIZATION
    // ========================================================
    function init() {
        prizes = state.getPrizes();
        if (prizes.length === 0) return;

        // Current prize lookup
        const curPrize = state.getCurrentPrize();
        if (curPrize) {
            currentPrizeIndex = prizes.findIndex(p => p.id === curPrize.id);
            if (currentPrizeIndex < 0) currentPrizeIndex = 0;
        }

        populatePrizeDropdown();
        renderExecutiveGrid();
        updatePrizeDisplay();
        updateEligibleCount();
        setupEventListeners();
        setupChannelListeners();

        // Request current stage sync
        sendCommand({ type: 'REMOTE_REQUEST_SYNC' });
    }

    function renderExecutiveGrid() {
        if (!executiveGridPickerEl) return;
        const winners = state.getWinners();
        const wonPrizeIds = new Set(winners.map(w => w.prizeId));
        const currentPrize = prizes[currentPrizeIndex];

        if (execCountTagEl) {
            execCountTagEl.textContent = `${prizes.length} ท่าน`;
        }

        executiveGridPickerEl.innerHTML = prizes.map((p, idx) => {
            const isSelected = (currentPrize && currentPrize.id === p.id) || (idx === currentPrizeIndex);
            const isDrawn = (p.drawn > 0) || wonPrizeIds.has(p.id);
            const sponsorName = p.sponsorName || 'ผู้บริหาร';
            const avatarSrc = resolveSponsorAvatar(sponsorName, p.sponsorPhoto);

            return `
                <div class="exec-card-item ${isSelected ? 'active' : ''} ${isDrawn ? 'drawn' : ''}" 
                     data-prize-id="${p.id}"
                     data-index="${idx}"
                     onclick="window.remoteSelectPrizeIndex(${idx})">
                    <img src="${avatarSrc}" 
                         class="exec-card-avatar" 
                         alt="${sponsorName}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='images/person.png'; this.onerror=function(){this.onerror=null; this.style.display='none';};">
                    <div class="exec-card-name" title="${sponsorName}">${sponsorName}</div>
                    <div class="exec-card-status ${isDrawn ? 'drawn' : 'waiting'}">
                        ${isDrawn ? '✓ สุ่มแล้ว' : 'รอลุ้น'}
                    </div>
                </div>
            `;
        }).join('');
    }

    function selectPrizeIndex(idx) {
        if (idx < 0 || idx >= prizes.length) return;
        currentPrizeIndex = idx;
        const p = prizes[currentPrizeIndex];
        updatePrizeDisplay();
        renderExecutiveGrid();
        sendCommand({ type: 'REMOTE_CMD_SELECT_PRIZE', prizeId: p.id });
    }

    window.remoteSelectPrizeIndex = (idx) => {
        selectPrizeIndex(idx);
    };

    function populatePrizeDropdown() {
        if (!remotePrizeSelectEl) return;
        remotePrizeSelectEl.innerHTML = prizes.map((p, idx) => {
            const sponsor = p.sponsorName || 'ผู้บริหาร';
            return `<option value="${p.id}" ${idx === currentPrizeIndex ? 'selected' : ''}>
                #${p.orderNo || (idx + 1)}: ${sponsor} - ${p.title}
            </option>`;
        }).join('');
    }

    // ========================================================
    // SPONSOR AVATAR RESOLVER (LOOP-PROOF)
    // ========================================================
    function resolveSponsorAvatar(sponsorName, sponsorPhoto) {
        if (typeof window !== 'undefined' && typeof window.resolveSponsorAvatar === 'function') {
            return window.resolveSponsorAvatar(sponsorName, sponsorPhoto);
        }
        const invalidPlaceholders = [
            'images/Khun Thakorn.png',
            'images/P Kim.png',
            'images/P Khao.png',
            'images/P Kaojao.png',
            'images/P Yai.png',
            'Khun Thakorn.png',
            'P Kim.png',
            'P Khao.png',
            'P Kaojao.png',
            'P Yai.png'
        ];
        if (sponsorPhoto && typeof sponsorPhoto === 'string' && sponsorPhoto.trim()) {
            const trimmed = sponsorPhoto.trim();
            if (!invalidPlaceholders.some(p => trimmed.endsWith(p))) {
                return trimmed;
            }
        }
        const name = String(sponsorName || '').trim();
        if (name.includes('โอเล่')) return 'images/P Ole.png';
        if (name.includes('เอก')) return 'images/P Eak.png';
        if (name.includes('ฝน')) return 'images/P Fon.png';
        if (name.includes('เป้ง')) return 'images/P Peng.png';
        if (name.includes('แนน')) return 'images/P Nan.png';
        if (name.includes('ต่าย')) return 'images/P Tai.png';
        if (name.includes('ปาล์ม')) return 'images/P Palm.png';
        if (name.includes('เพลิน')) return 'images/P Plearn.png';
        if (name.includes('อ้อม')) return 'images/P Aom.png';
        if (name.includes('วรรณ')) return 'images/P Wan.png';
        if (name.includes('ลอร์ด')) return 'images/P Lord.png';
        if (name.includes('พิมพ์')) return 'images/P Pim.png';
        if (name.includes('ยุ') || name.includes('ชุ')) return 'images/P Chu.png';
        if (name.includes('ติ่ง')) return 'images/P Ting.png';
        if (name.includes('ผู้บริหาร')) return 'images/logo@2.png';
        return 'images/person.png';
    }

    function updatePrizeDisplay() {
        if (prizes.length === 0) return;
        const prize = prizes[currentPrizeIndex];
        if (!prize) return;

        if (remotePrizeIndexTagEl) {
            remotePrizeIndexTagEl.textContent = `${currentPrizeIndex + 1}/${prizes.length}`;
        }
        if (remoteSponsorNameEl) remoteSponsorNameEl.textContent = prize.sponsorName || 'ผู้บริหาร';
        if (remotePrizeTitleEl) remotePrizeTitleEl.textContent = prize.title || 'Lucky Draw';
        if (remoteGroupBadgeEl) remoteGroupBadgeEl.textContent = prize.group || 'Management';

        const totalQty = parseInt(prize.quantity, 10) || 1;
        const drawnCount = parseInt(prize.drawn, 10) || 0;
        if (remoteDrawnBadgeEl) {
            remoteDrawnBadgeEl.textContent = `สุ่มแล้ว ${drawnCount}/${totalQty}`;
        }

        if (remotePrizeSelectEl) {
            remotePrizeSelectEl.value = prize.id;
        }

        // Sponsor image with loop-proof onerror
        const sponsorName = prize.sponsorName || '';
        const avatarSrc = resolveSponsorAvatar(sponsorName, prize.sponsorPhoto);
        if (remoteSponsorImgEl) {
            remoteSponsorImgEl.onerror = () => {
                remoteSponsorImgEl.onerror = null;
                remoteSponsorImgEl.src = 'images/person.png';
                remoteSponsorImgEl.onerror = () => {
                    remoteSponsorImgEl.onerror = null;
                    remoteSponsorImgEl.style.display = 'none';
                };
            };
            remoteSponsorImgEl.src = avatarSrc;
        }

        // Check if prize has winner in winners list
        const winners = state.getWinners();
        const existingWinner = winners.find(w => w.prizeId === prize.id);
        if (existingWinner) {
            displayWinnerFeedback(existingWinner, prize);
        } else {
            displayEmptyWinnerFeedback(prize);
        }

        // Highlight matching card in executive grid
        if (executiveGridPickerEl) {
            const cards = executiveGridPickerEl.querySelectorAll('.exec-card-item');
            cards.forEach((c) => {
                if (c.getAttribute('data-prize-id') === prize.id) {
                    c.classList.add('active');
                } else {
                    c.classList.remove('active');
                }
            });
        }

        // Update spin button enabled / disabled state based on whether this prize is already drawn
        setSpinButtonState(isSpinning);
    }

    function updateEligibleCount() {
        const eligible = state.getEligibleParticipants();
        if (remoteEligibleCountEl) {
            remoteEligibleCountEl.textContent = eligible.length;
        }
    }

    function displayWinnerFeedback(winner, prize) {
        if (!winner) return;
        const p = prize || (currentPrizeIndex >= 0 ? prizes[currentPrizeIndex] : null);
        if (remoteWinnerSponsorLabelEl && p) {
            remoteWinnerSponsorLabelEl.innerHTML = `🎁 รางวัลของ: <strong>${p.sponsorName || 'ผู้บริหาร'}</strong>`;
        }
        if (remoteWinnerIdEl) {
            remoteWinnerIdEl.textContent = winner.empId || (winner.participant && winner.participant.id) || '-----';
        }
        if (remoteWinnerNameEl) {
            remoteWinnerNameEl.textContent = winner.empName || (winner.participant && winner.participant.name) || '-';
        }
        if (remoteWinnerDeptEl) {
            const dept = winner.department || (winner.participant && winner.participant.department) || '-';
            remoteWinnerDeptEl.textContent = `สังกัด: ${dept}`;
        }
        if (btnCancelWinnerEl) {
            btnCancelWinnerEl.disabled = false;
        }
    }

    function displayEmptyWinnerFeedback(prize) {
        const p = prize || (currentPrizeIndex >= 0 ? prizes[currentPrizeIndex] : null);
        if (remoteWinnerSponsorLabelEl && p) {
            remoteWinnerSponsorLabelEl.innerHTML = `🎁 รางวัลของ: <strong>${p.sponsorName || 'ผู้บริหาร'}</strong>`;
        }
        if (remoteWinnerIdEl) {
            remoteWinnerIdEl.textContent = '-----';
        }
        if (remoteWinnerNameEl) {
            remoteWinnerNameEl.textContent = 'ยังไม่มีการสุ่มผู้โชคดี';
        }
        if (remoteWinnerDeptEl) {
            remoteWinnerDeptEl.textContent = 'สังกัด: -';
        }
        if (btnCancelWinnerEl) {
            btnCancelWinnerEl.disabled = true;
        }
    }

    // ========================================================
    // REMOTE COMMAND SENDER
    // ========================================================
    function sendCommand(cmd) {
        // Haptic feedback for touch devices
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(40); } catch (e) {}
        }
        if (sound && !isMuted && typeof sound.playClick === 'function') {
            sound.playClick();
        }

        if (rewardChannel) {
            try { rewardChannel.postMessage(cmd); } catch (e) {}
        }

        // Cross-window storage fallback
        localStorage.setItem('crsdg_reward_remote_cmd', JSON.stringify({
            ...cmd,
            timestamp: Date.now()
        }));
    }

    function setSpinButtonState(spinning) {
        isSpinning = spinning;
        if (!btnRemoteSpinEl) return;

        const prize = (prizes && currentPrizeIndex >= 0) ? prizes[currentPrizeIndex] : null;
        const winners = state.getWinners();
        const existingWinner = prize ? winners.find(w => w.prizeId === prize.id) : null;
        const totalQty = prize ? (parseInt(prize.quantity, 10) || 1) : 1;
        const drawnCount = prize ? (parseInt(prize.drawn, 10) || 0) : 0;
        const isAlreadyDrawn = (drawnCount >= totalQty) || !!existingWinner;
        const sponsorName = prize ? (prize.sponsorName || 'ผู้บริหาร') : 'ผู้บริหาร';

        if (isSpinning) {
            btnRemoteSpinEl.disabled = true;
            btnRemoteSpinEl.className = 'btn-giant-spin spinning';
            if (giantBtnIconEl) giantBtnIconEl.textContent = '🎲';
            if (giantBtnLabelEl) giantBtnLabelEl.textContent = 'กำลังสุ่มอัตโนมัติ...';
            if (giantBtnSubEl) giantBtnSubEl.textContent = 'SPINNING...';
            if (btnCancelWinnerEl) btnCancelWinnerEl.disabled = true;
        } else if (isAlreadyDrawn) {
            btnRemoteSpinEl.disabled = true;
            btnRemoteSpinEl.className = 'btn-giant-spin disabled';
            if (giantBtnIconEl) giantBtnIconEl.textContent = '✓';
            if (giantBtnLabelEl) giantBtnLabelEl.textContent = 'สุ่มครบแล้ว';
            if (giantBtnSubEl) giantBtnSubEl.textContent = 'ALREADY DRAWN';
            if (btnCancelWinnerEl) btnCancelWinnerEl.disabled = false;
        } else {
            btnRemoteSpinEl.disabled = false;
            btnRemoteSpinEl.className = 'btn-giant-spin';
            if (giantBtnIconEl) giantBtnIconEl.textContent = '🎲';
            if (giantBtnLabelEl) giantBtnLabelEl.textContent = `เริ่มสุ่มรางวัล - ${sponsorName}`;
            if (giantBtnSubEl) giantBtnSubEl.textContent = 'START SPIN';
            if (btnCancelWinnerEl) btnCancelWinnerEl.disabled = true;
        }
    }

    // ========================================================
    // EVENT LISTENERS
    // ========================================================
    function setupEventListeners() {
        // Big Spin Action (Auto-spin mode)
        if (btnRemoteSpinEl) {
            btnRemoteSpinEl.addEventListener('click', () => {
                if (btnRemoteSpinEl.disabled || isSpinning) return;
                const prize = (prizes && currentPrizeIndex >= 0) ? prizes[currentPrizeIndex] : null;
                if (prize) {
                    const totalQty = parseInt(prize.quantity, 10) || 1;
                    const drawnCount = parseInt(prize.drawn, 10) || 0;
                    const winners = state.getWinners();
                    if (drawnCount >= totalQty || winners.some(w => w.prizeId === prize.id)) {
                        return;
                    }
                }
                sendCommand({ type: 'REMOTE_CMD_SPIN', isFast: false });
                setSpinButtonState(true);
            });
        }

        // Quick Draw Action (if present)
        if (btnRemoteQuickDrawEl) {
            btnRemoteQuickDrawEl.addEventListener('click', () => {
                if (!isSpinning) {
                    sendCommand({ type: 'REMOTE_CMD_SPIN', isFast: true });
                    setSpinButtonState(true);
                }
            });
        }

        // Reroll Action
        if (btnRemoteRerollEl) {
            btnRemoteRerollEl.addEventListener('click', () => {
                sendCommand({ type: 'REMOTE_CMD_REROLL' });
                setSpinButtonState(true);
            });
        }

        // Sound Toggle
        if (btnRemoteToggleSoundEl) {
            btnRemoteToggleSoundEl.addEventListener('click', () => {
                isMuted = !isMuted;
                if (remoteSoundIconEl) remoteSoundIconEl.textContent = isMuted ? '🔇' : '🔊';
                sendCommand({ type: 'REMOTE_CMD_TOGGLE_SOUND' });
            });
        }

        // Prize Prev & Next
        if (btnPrevPrizeEl) {
            btnPrevPrizeEl.addEventListener('click', () => {
                if (currentPrizeIndex > 0) {
                    selectPrizeIndex(currentPrizeIndex - 1);
                }
            });
        }

        if (btnNextPrizeEl) {
            btnNextPrizeEl.addEventListener('click', () => {
                if (currentPrizeIndex < prizes.length - 1) {
                    selectPrizeIndex(currentPrizeIndex + 1);
                }
            });
        }

        // Dropdown selector (fallback)
        if (remotePrizeSelectEl) {
            remotePrizeSelectEl.addEventListener('change', (e) => {
                const prizeId = e.target.value;
                const idx = prizes.findIndex(p => p.id === prizeId);
                if (idx !== -1) {
                    selectPrizeIndex(idx);
                }
            });
        }

        // Cancel Winner Action with Lightbox Modal
        if (btnCancelWinnerEl) {
            btnCancelWinnerEl.addEventListener('click', () => {
                if (btnCancelWinnerEl.disabled || isSpinning) return;
                const prize = (prizes && currentPrizeIndex >= 0) ? prizes[currentPrizeIndex] : null;
                if (!prize) return;
                const winners = state.getWinners();
                const existing = winners.find(w => w.prizeId === prize.id);
                if (!existing) return;

                const sponsorName = prize.sponsorName || 'ผู้บริหาร';
                const winnerName = existing.empName || (existing.participant && existing.participant.name) || '-';
                const empId = existing.empId || (existing.participant && existing.participant.id) || '-';
                const dept = existing.department || (existing.participant && existing.participant.department) || '-';

                if (modalCancelSponsorEl) modalCancelSponsorEl.textContent = `รางวัลของ: ${sponsorName}`;
                if (modalCancelEmpInfoEl) modalCancelEmpInfoEl.textContent = `${empId} - ${winnerName}`;
                if (modalCancelEmpDeptEl) modalCancelEmpDeptEl.textContent = `สังกัด: ${dept}`;

                if (cancelWinnerModalEl) cancelWinnerModalEl.style.display = 'flex';
            });
        }

        // Modal Close / Dismiss Actions
        const closeCancelModal = () => {
            if (cancelWinnerModalEl) cancelWinnerModalEl.style.display = 'none';
        };

        if (btnCloseCancelModalEl) {
            btnCloseCancelModalEl.addEventListener('click', closeCancelModal);
        }
        if (btnDismissCancelModalEl) {
            btnDismissCancelModalEl.addEventListener('click', closeCancelModal);
        }
        if (cancelWinnerModalEl) {
            cancelWinnerModalEl.addEventListener('click', (e) => {
                if (e.target === cancelWinnerModalEl) closeCancelModal();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && cancelWinnerModalEl && cancelWinnerModalEl.style.display === 'flex') {
                closeCancelModal();
            }
        });

        // Modal Confirm Delete Action
        if (btnConfirmCancelWinnerEl) {
            btnConfirmCancelWinnerEl.addEventListener('click', () => {
                closeCancelModal();
                const prize = (prizes && currentPrizeIndex >= 0) ? prizes[currentPrizeIndex] : null;
                if (!prize) return;
                const winners = state.getWinners();
                const existing = winners.find(w => w.prizeId === prize.id);
                if (!existing) return;

                state.deleteWinner(existing.id);

                prizes = state.getPrizes();
                displayEmptyWinnerFeedback(prize);
                renderExecutiveGrid();
                updatePrizeDisplay();
                updateEligibleCount();

                sendCommand({
                    type: 'REMOTE_CMD_CANCEL_WINNER',
                    prizeId: prize.id,
                    winnerId: existing.id
                });
            });
        }
    }

    // ========================================================
    // CHANNEL & STORAGE LISTENERS
    // ========================================================
    function setupChannelListeners() {
        const handleSyncMessage = (data) => {
            if (!data || !data.type) return;

            if (data.type === 'STAGE_SYNC') {
                if (data.prize) {
                    prizes = state.getPrizes();
                    const idx = prizes.findIndex(p => p.id === data.prize.id);
                    if (idx !== -1) {
                        currentPrizeIndex = idx;
                    }
                }
                setSpinButtonState(!!data.isSpinning);
                renderExecutiveGrid();
                updatePrizeDisplay();
                if (typeof data.eligibleCount === 'number' && remoteEligibleCountEl) {
                    remoteEligibleCountEl.textContent = data.eligibleCount;
                }
                if (connStatusTextEl) {
                    connStatusTextEl.textContent = 'เชื่อมต่อกับเวทีสุ่มรางวัลแล้ว';
                }
            } else if (data.type === 'WINNER_REVEALED') {
                setSpinButtonState(false);
                prizes = state.getPrizes();
                renderExecutiveGrid();
                updatePrizeDisplay();
                updateEligibleCount();
            } else if (data.type === 'WINNERS_UPDATED' || data.type === 'PRIZES_UPDATED' || data.type === 'WINNER_CANCELLED' || data.type === 'REROLL_TRIGGERED') {
                prizes = state.getPrizes();
                populatePrizeDropdown();
                renderExecutiveGrid();
                updatePrizeDisplay();
                updateEligibleCount();
            }
        };

        if (rewardChannel) {
            rewardChannel.onmessage = (event) => handleSyncMessage(event.data);
        }

        window.addEventListener('storage', (e) => {
            if (e.key === 'crsdg_reward_sync_state' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    handleSyncMessage(parsed);
                } catch (err) {}
            } else if (e.key === 'crsdg_winners' || e.key === 'crsdg_prizes' || e.key === 'crsdg_member') {
                prizes = state.getPrizes();
                renderExecutiveGrid();
                updatePrizeDisplay();
                updateEligibleCount();
            }
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
