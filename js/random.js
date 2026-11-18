/**
 * Random Display Logic (Game Show Lucky Draw Controller)
 * Powers random.html stage screen
 */

document.addEventListener('DOMContentLoaded', () => {
    const state = window.stateManager;
    const sound = window.soundEffects;
    const confetti = window.confettiSystem;
    const remote = window.remoteController;

    // DOM Elements
    const prizeBadge = document.getElementById('prizeBadge');
    const prizeTitle = document.getElementById('prizeTitle');
    const prizeQuantity = document.getElementById('prizeQuantity');
    const prizeRemaining = document.getElementById('prizeRemaining');
    const prevPrizeBtn = document.getElementById('prevPrizeBtn');
    const nextPrizeBtn = document.getElementById('nextPrizeBtn');

    // Slot display elements
    const slotCard = document.getElementById('slotCard');
    const slotEmpId = document.getElementById('slotEmpId');
    const slotName = document.getElementById('slotName');
    const slotDept = document.getElementById('slotDept');
    const actionBtn = document.getElementById('actionBtn');
    const actionBtnText = document.getElementById('actionBtnText');

    // Winner celebration modal
    const winnerModal = document.getElementById('winnerModal');
    const winPrizeTitle = document.getElementById('winPrizeTitle');
    const winEmpId = document.getElementById('winEmpId');
    const winName = document.getElementById('winName');
    const winDept = document.getElementById('winDept');
    const winCloseBtn = document.getElementById('winCloseBtn');
    const winNextBtn = document.getElementById('winNextBtn');

    // Header buttons
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const remoteBtn = document.getElementById('remoteBtn');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const historyToggleBtn = document.getElementById('historyToggleBtn');
    const historyDrawer = document.getElementById('historyDrawer');
    const historyCloseBtn = document.getElementById('historyCloseBtn');
    const historyList = document.getElementById('historyList');

    // State variables
    let isSpinning = false;
    let spinInterval = null;
    let currentPrize = null;
    let eligibleList = [];
    let currentWinner = null;

    // Initialize UI
    function init() {
        confetti.init();
        loadCurrentPrize();
        updateEligibleCount();
        renderHistoryList();
        updateSoundButton();
    }

    // Load active prize
    function loadCurrentPrize() {
        currentPrize = state.getCurrentPrize();
        if (!currentPrize) {
            prizeBadge.textContent = 'ยังไม่มีรางวัล';
            prizeTitle.textContent = 'กรุณาเพิ่มรางวัลในหน้า Admin';
            return;
        }

        prizeBadge.textContent = currentPrize.category || 'Lucky Draw';
        prizeTitle.textContent = currentPrize.title;
        const total = currentPrize.quantity || 1;
        const drawn = currentPrize.drawn || 0;
        const remaining = Math.max(0, total - drawn);

        if (prizeQuantity) prizeQuantity.textContent = `ทั้งหมด ${total} รางวัล`;
        if (prizeRemaining) {
            prizeRemaining.textContent = remaining > 0 ? `(เหลือ ${remaining} รางวัล)` : `(จับครบแล้ว)`;
            prizeRemaining.className = remaining > 0 ? 'remaining-badge active' : 'remaining-badge completed';
        }

        eligibleList = state.getEligibleParticipants();
        if (!isSpinning && eligibleList.length > 0) {
            // Check if current match was selected from index.html
            let matchSubtitle = `ผู้มีสิทธิ์ลุ้น ${eligibleList.length} ท่าน`;
            const savedMatch = localStorage.getItem('crsdg_current_match');
            if (savedMatch) {
                try {
                    const m = JSON.parse(savedMatch);
                    if (m && m.teamA && m.teamB) {
                        matchSubtitle = `${m.round || 'การแข่งขัน'}: ${m.teamA.name} ⚔️ ${m.teamB.name}`;
                    }
                } catch(e) {}
            }

            // Show prompt or first sample
            slotEmpId.textContent = 'CRS-XXXX';
            slotName.textContent = 'พร้อมเริ่มสุ่มรางวัล';
            slotDept.textContent = matchSubtitle;
        }
    }

    function updateEligibleCount() {
        eligibleList = state.getEligibleParticipants();
    }

    // Switch Prize
    function navigatePrize(direction) {
        if (isSpinning) return;
        const prizes = state.getPrizes();
        if (prizes.length === 0) return;

        const currentIndex = prizes.findIndex(p => p.id === (currentPrize ? currentPrize.id : null));
        let nextIndex = currentIndex + direction;
        if (nextIndex < 0) nextIndex = prizes.length - 1;
        if (nextIndex >= prizes.length) nextIndex = 0;

        state.setCurrentPrize(prizes[nextIndex].id);
        sound.playClick();
        loadCurrentPrize();
    }

    // Start Lucky Draw Spinning
    function startSpin() {
        eligibleList = state.getEligibleParticipants();
        if (eligibleList.length === 0) {
            alert('ไม่มีรายชื่อผู้มีสิทธิ์เหลืออยู่ (ทุกคนได้รับรางวัลแล้ว หรือยังไม่ได้เพิ่มรายชื่อ)');
            return;
        }

        if (currentPrize && (currentPrize.drawn || 0) >= (currentPrize.quantity || 1)) {
            const proceed = confirm('รางวัลนี้ถูกจับครบตามจำนวนแล้ว ต้องการสุ่มเพิ่มอีกหรือไม่?');
            if (!proceed) return;
        }

        isSpinning = true;
        slotCard.classList.add('is-spinning');
        actionBtn.classList.add('btn-stop');
        actionBtnText.textContent = 'หยุดสุ่ม (Spacebar)';

        sound.startDrumroll();

        let index = 0;
        spinInterval = setInterval(() => {
            const randomPerson = eligibleList[Math.floor(Math.random() * eligibleList.length)];
            slotEmpId.textContent = randomPerson.id;
            slotName.textContent = randomPerson.name;
            slotDept.textContent = randomPerson.department;
            index++;
        }, 50);
    }

    // Stop Lucky Draw & Pick Winner
    function stopSpin() {
        if (!isSpinning) return;

        clearInterval(spinInterval);
        sound.stopDrumroll();

        // Slow-down deceleration animation
        let count = 0;
        const maxDecelerations = 14;
        let delay = 60;

        function decelerate() {
            const randomPerson = eligibleList[Math.floor(Math.random() * eligibleList.length)];
            slotEmpId.textContent = randomPerson.id;
            slotName.textContent = randomPerson.name;
            slotDept.textContent = randomPerson.department;
            sound.playTick(1.2 + count * 0.05);

            count++;
            delay += 25;

            if (count < maxDecelerations) {
                setTimeout(decelerate, delay);
            } else {
                // Final Winner Selected!
                finalizeWinner(randomPerson);
            }
        }

        decelerate();
    }

    function finalizeWinner(winner) {
        isSpinning = false;
        currentWinner = winner;
        slotCard.classList.remove('is-spinning');
        slotCard.classList.add('is-winner');
        actionBtn.classList.remove('btn-stop');
        actionBtnText.textContent = 'เริ่มสุ่มรางวัล (Spacebar)';

        // Record in state
        const record = state.recordWinner(currentPrize, winner);

        // Sound & Confetti Celebration
        sound.playWin();
        confetti.celebrate(4500);

        // Update UI
        updateEligibleCount();
        loadCurrentPrize();
        renderHistoryList();

        // Show Winner Celebration Modal after brief suspense delay
        setTimeout(() => {
            showWinnerModal(winner, currentPrize);
            slotCard.classList.remove('is-winner');
        }, 800);
    }

    function showWinnerModal(winner, prize) {
        winPrizeTitle.textContent = prize.title;
        winEmpId.textContent = winner.id;
        winName.textContent = winner.name;
        winDept.textContent = winner.department;

        winnerModal.classList.add('active');
    }

    function hideWinnerModal() {
        winnerModal.classList.remove('active');
    }

    function toggleSpin() {
        if (isSpinning) {
            stopSpin();
        } else {
            startSpin();
        }
    }

    // Fullscreen Toggle
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Fullscreen error:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    function updateFullscreenIcon() {
        if (fullscreenBtn) {
            if (document.fullscreenElement) {
                fullscreenBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7M14 20v-6m0 0h6m-6 0l7 7M10 4v6m0 0H4m0 0l7-7"/></svg>
                    <span>ออกจอใหญ่</span>
                `;
            } else {
                fullscreenBtn.innerHTML = `
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    <span>เต็มจอ</span>
                `;
            }
        }
    }

    // Sound Toggle
    function updateSoundButton() {
        if (!soundToggleBtn) return;
        const isMuted = sound.isMuted();
        soundToggleBtn.innerHTML = isMuted 
            ? `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg><span>เสียง: ปิด</span>`
            : `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg><span>เสียง: เปิด</span>`;
    }

    // Render Winner History List
    function renderHistoryList() {
        if (!historyList) return;
        const winners = state.getWinners();
        if (winners.length === 0) {
            historyList.innerHTML = `<div class="history-empty">ยังไม่มีผู้ได้รับรางวัล</div>`;
            return;
        }

        historyList.innerHTML = winners.map((w, idx) => `
            <div class="history-item">
                <div class="history-item-badge">#${winners.length - idx}</div>
                <div class="history-item-info">
                    <div class="history-item-name">${w.participant.name} <span class="history-item-id">(${w.participant.id})</span></div>
                    <div class="history-item-dept">${w.participant.department}</div>
                </div>
                <div class="history-item-prize">
                    <span class="prize-tag">${w.prize.title}</span>
                </div>
            </div>
        `).join('');
    }

    // Listen to State changes and Remote actions
    state.subscribe((event) => {
        if (event.type === 'REMOTE_ACTION') {
            switch (event.action) {
                case 'START_SPIN':
                    if (!isSpinning) startSpin();
                    break;
                case 'STOP_SPIN':
                    if (isSpinning) stopSpin();
                    break;
                case 'TOGGLE_SPIN':
                    toggleSpin();
                    break;
                case 'NEXT_PRIZE':
                    navigatePrize(1);
                    break;
                case 'PREV_PRIZE':
                    navigatePrize(-1);
                    break;
                case 'CELEBRATE':
                    confetti.celebrate(3500);
                    sound.playWin();
                    break;
                case 'CLOSE_WINNER':
                    hideWinnerModal();
                    break;
                case 'TOGGLE_FULLSCREEN':
                    toggleFullscreen();
                    break;
                case 'TOGGLE_SOUND':
                    sound.toggleMute();
                    updateSoundButton();
                    break;
            }
        } else if (event.type === 'PRIZES_UPDATED' || event.type === 'PRIZE_SELECTED') {
            loadCurrentPrize();
        } else if (event.type === 'PARTICIPANTS_UPDATED') {
            updateEligibleCount();
            loadCurrentPrize();
        } else if (event.type === 'WINNERS_RESET') {
            loadCurrentPrize();
            renderHistoryList();
        }
    });

    // Event Listeners
    actionBtn.addEventListener('click', () => {
        sound.init();
        toggleSpin();
    });

    if (prevPrizeBtn) prevPrizeBtn.addEventListener('click', () => navigatePrize(-1));
    if (nextPrizeBtn) nextPrizeBtn.addEventListener('click', () => navigatePrize(1));

    if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => {
        sound.playClick();
        toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', updateFullscreenIcon);

    if (remoteBtn) remoteBtn.addEventListener('click', () => {
        sound.playClick();
        remote.toggleModal();
    });

    if (soundToggleBtn) soundToggleBtn.addEventListener('click', () => {
        sound.toggleMute();
        updateSoundButton();
    });

    if (historyToggleBtn) historyToggleBtn.addEventListener('click', () => {
        sound.playClick();
        historyDrawer.classList.toggle('active');
    });

    if (historyCloseBtn) historyCloseBtn.addEventListener('click', () => {
        historyDrawer.classList.remove('active');
    });

    if (winCloseBtn) winCloseBtn.addEventListener('click', () => {
        sound.playClick();
        hideWinnerModal();
    });

    if (winNextBtn) winNextBtn.addEventListener('click', () => {
        sound.playClick();
        hideWinnerModal();
        navigatePrize(1);
    });

    // Remote modal trigger buttons
    document.querySelectorAll('[data-remote-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-remote-action');
            remote.send(action);
        });
    });

    // Keyboard Shortcuts for Stage MC
    document.addEventListener('keydown', (e) => {
        // Ignore if user is inside an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            sound.init();
            toggleSpin();
        } else if (e.key === 'f' || e.key === 'F') {
            toggleFullscreen();
        } else if (e.key === 'm' || e.key === 'M') {
            sound.toggleMute();
            updateSoundButton();
        } else if (e.key === 'c' || e.key === 'C') {
            confetti.celebrate(3000);
            sound.playWin();
        } else if (e.key === 'ArrowRight') {
            navigatePrize(1);
        } else if (e.key === 'ArrowLeft') {
            navigatePrize(-1);
        } else if (e.key === 'Escape') {
            hideWinnerModal();
            remote.closeModal();
            if (historyDrawer) historyDrawer.classList.remove('active');
        }
    });

    // Run initial setup
    init();
});
