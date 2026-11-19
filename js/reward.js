/**
 * REWARD STAGE CONTROLLER (reward.html)
 * High-Energy Lucky Draw Game Show Stage - Image 3
 */

(function () {
    'use strict';

    // State & Sound dependencies
    const state = window.state || new StateManager();
    const sound = window.sound || window.soundEffects || null;
    const confetti = window.confetti || window.confettiSystem || null;

    // BroadcastChannel for instant stage & remote sync
    const rewardChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('crsdg_reward_channel') : null;

    // Stage State
    let currentPrize = null;
    let isSpinning = false;
    let spinInterval = null;
    let spinTimeout = null;
    let isMuted = false;
    let isFastMode = false;

    // DOM Elements
    const stageGroupIndicatorEl = document.getElementById('stageGroupIndicator');
    const currentGroupTagEl = document.getElementById('currentGroupTag');
    const eligibleCountTagEl = document.getElementById('eligibleCountTag');
    const soundToggleBtnEl = document.getElementById('soundToggleBtn');
    const soundIconEl = document.getElementById('soundIcon');
    const fullscreenToggleBtnEl = document.getElementById('fullscreenToggleBtn');
    const btnOpenQrModalEl = document.getElementById('btnOpenQrModal');
    const qrModalEl = document.getElementById('qrModal');
    const closeQrModalBtnEl = document.getElementById('closeQrModalBtn');

    // Reroll Lightbox Modal Elements
    const rerollModalEl = document.getElementById('rerollModal');
    const closeRerollModalBtnEl = document.getElementById('closeRerollModalBtn');
    const btnCancelRerollModalEl = document.getElementById('btnCancelRerollModal');
    const btnConfirmRerollModalEl = document.getElementById('btnConfirmRerollModal');
    const rerollModalWinnerNameEl = document.getElementById('rerollModalWinnerName');
    const rerollModalEmpIdEl = document.getElementById('rerollModalEmpId');
    const rerollModalPrizeNameEl = document.getElementById('rerollModalPrizeName');

    // System Alert Lightbox Modal Elements
    const alertModalEl = document.getElementById('alertModal');
    const alertModalTitleEl = document.getElementById('alertModalTitle');
    const alertModalIconEl = document.getElementById('alertModalIcon');
    const alertModalIconLargeEl = document.getElementById('alertModalIconLarge');
    const alertModalMessageEl = document.getElementById('alertModalMessage');
    const closeAlertModalBtnEl = document.getElementById('closeAlertModalBtn');
    const btnConfirmAlertModalEl = document.getElementById('btnConfirmAlertModal');
    let alertCloseCallback = null;

    // Stage Sponsor Showcase Elements
    const sponsorAvatarImgEl = document.getElementById('sponsorAvatarImg');
    const sponsorAvatarFallbackEl = document.getElementById('sponsorAvatarFallback');
    const sponsorNameTextEl = document.getElementById('sponsorNameText');
    const sponsorPositionTextEl = document.getElementById('sponsorPositionText');

    // Stage Draw Card Elements
    const cardGroupBadgeEl = document.getElementById('cardGroupBadge');
    const cardPrizeTitleEl = document.getElementById('cardPrizeTitle');
    const cardPrizeSubtitleEl = document.getElementById('cardPrizeSubtitle');
    const digitEls = [
        document.getElementById('d0'),
        document.getElementById('d1'),
        document.getElementById('d2'),
        document.getElementById('d3'),
        document.getElementById('d4')
    ];
    const winnerNameBoxEl = document.getElementById('winnerNameBox');
    const winnerNameTextEl = document.getElementById('winnerNameText');
    const winnerMetaPillEl = document.getElementById('winnerMetaPill');
    const winnerMetaDeptEl = document.getElementById('winnerMetaDept');
    const winnerMetaTimeEl = document.getElementById('winnerMetaTime');

    // Buttons
    const spinActionBtnEl = document.getElementById('spinActionBtn');
    const spinBtnIconEl = document.getElementById('spinBtnIcon');
    const spinBtnTextEl = document.getElementById('spinBtnText');
    const rerollActionBtnEl = document.getElementById('rerollActionBtn');
    const cardActionBarEl = document.getElementById('cardActionBar');
    const btnCardRerollTopEl = document.getElementById('btnCardRerollTop');
    const btnTopRerollEl = document.getElementById('btnTopReroll');
    const fastDrawModeCheckboxEl = document.getElementById('fastDrawModeCheckbox');

    // Bottom Carousel Elements
    const carouselGroupTitleEl = document.getElementById('carouselGroupTitle');
    const carouselCountBadgeEl = document.getElementById('carouselCountBadge');
    const prizeCarouselStripEl = document.getElementById('prizeCarouselStrip');
    const carouselScrollWrapperEl = document.getElementById('carouselScrollWrapper');

    // ========================================================
    // INITIALIZATION
    // ========================================================
    function init() {
        // Load initial prize
        const prizes = state.getPrizes();
        if (prizes.length === 0) return;

        // Check URL param or stored current prize
        const urlParams = new URLSearchParams(window.location.search);
        const queryPrizeId = urlParams.get('prizeId');
        if (queryPrizeId) {
            currentPrize = prizes.find(p => p.id === queryPrizeId) || prizes[0];
        } else {
            currentPrize = state.getCurrentPrize() || prizes[0];
        }

        renderCarousel();
        loadPrizeToStage(currentPrize);
        updateEligibleCount();
        setupEventListeners();
        setupRemoteListeners();
        syncStageStateToRemote();
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

    // ========================================================
    // STAGE RENDERING
    // ========================================================
    function loadPrizeToStage(prize) {
        if (!prize) return;
        currentPrize = prize;
        state.setCurrentPrize(prize.id);

        const prizes = state.getPrizes();
        const prizeIndex = prizes.findIndex(p => p.id === prize.id) + 1;
        const totalPrizes = prizes.length;

        // 1. Header indicators
        if (stageGroupIndicatorEl) {
            stageGroupIndicatorEl.textContent = `${prize.group || 'Management'} (${prizeIndex}/${totalPrizes})`;
        }
        if (currentGroupTagEl) {
            currentGroupTagEl.textContent = `🏷️ ${prize.group || 'Management'}`;
        }
        if (carouselGroupTitleEl) {
            carouselGroupTitleEl.textContent = `รายการของรางวัลในกลุ่ม ${prize.group || 'Management'}`;
        }
        if (carouselCountBadgeEl) {
            carouselCountBadgeEl.textContent = `${totalPrizes} รายการ`;
        }

        // 2. Left Sponsor Showcase
        const sponsorName = prize.sponsorName || 'ผู้บริหาร';
        if (sponsorNameTextEl) sponsorNameTextEl.textContent = sponsorName;
        if (sponsorPositionTextEl) sponsorPositionTextEl.textContent = prize.sponsorPosition || 'ผู้บริหารระดับสูง';

        // Avatar logic: Resolve real image path with loop-proof fallback
        const avatarSrc = resolveSponsorAvatar(sponsorName, prize.sponsorPhoto);

        if (sponsorAvatarImgEl) {
            sponsorAvatarImgEl.onerror = () => {
                sponsorAvatarImgEl.onerror = null;
                sponsorAvatarImgEl.style.display = 'none';
                if (sponsorAvatarFallbackEl) {
                    sponsorAvatarFallbackEl.textContent = sponsorName.replace(/^(พี่|คุณ)/, '').slice(0, 2) || 'ผบ';
                    sponsorAvatarFallbackEl.style.display = 'flex';
                }
            };
            sponsorAvatarImgEl.src = avatarSrc;
            sponsorAvatarImgEl.style.display = 'block';
            if (sponsorAvatarFallbackEl) sponsorAvatarFallbackEl.style.display = 'none';
        } else if (sponsorAvatarFallbackEl) {
            sponsorAvatarFallbackEl.textContent = sponsorName.replace(/^(พี่|คุณ)/, '').slice(0, 2) || 'ผบ';
            sponsorAvatarFallbackEl.style.display = 'flex';
        }

        // 3. Right Draw Card Info
        if (cardGroupBadgeEl) cardGroupBadgeEl.textContent = (prize.group || 'MANAGEMENT').toUpperCase();
        if (cardPrizeTitleEl) cardPrizeTitleEl.textContent = prize.title || 'Lucky Draw';

        const totalQty = parseInt(prize.quantity, 10) || 1;
        const drawnCount = parseInt(prize.drawn, 10) || 0;
        const isFull = drawnCount >= totalQty;

        if (cardPrizeSubtitleEl) {
            cardPrizeSubtitleEl.textContent = isFull
                ? `จำนวนทั้งหมด ${totalQty} รางวัล • สุ่มครบแล้ว (${drawnCount}/${totalQty})`
                : `จำนวนทั้งหมด ${totalQty} รางวัล • ยังไม่สุ่ม (${drawnCount}/${totalQty})`;
        }

        // Check if prize already has a winner
        const winners = state.getWinners();
        const existingWinner = winners.find(w => w.prizeId === prize.id);

        if (existingWinner && isFull) {
            // Display already won info
            displayWinnerData(existingWinner);
            setButtonStateCompleted(drawnCount, totalQty);
            // Hide bottom buttons when drawn
            if (spinActionBtnEl) spinActionBtnEl.style.display = 'none';
            if (rerollActionBtnEl) rerollActionBtnEl.style.display = 'none';
            if (cardActionBarEl) cardActionBarEl.style.display = 'none';
            // Show top-right reroll icon
            if (btnCardRerollTopEl) btnCardRerollTopEl.style.display = 'inline-flex';
            if (btnTopRerollEl) btnTopRerollEl.style.display = 'inline-flex';
        } else {
            // Idle ready state
            resetSlotDisplay();
            setButtonStateReady();
            if (cardActionBarEl) cardActionBarEl.style.display = 'flex';
            if (spinActionBtnEl) spinActionBtnEl.style.display = 'inline-flex';
            if (rerollActionBtnEl) rerollActionBtnEl.style.display = 'none';
            if (btnCardRerollTopEl) btnCardRerollTopEl.style.display = 'none';
            if (btnTopRerollEl) btnTopRerollEl.style.display = 'none';
        }

        // 4. Update active card in bottom carousel
        highlightCarouselCard(prize.id);
        updateEligibleCount();
        syncStageStateToRemote();
    }

    function renderCarousel() {
        if (!prizeCarouselStripEl) return;
        const prizes = state.getPrizes();
        const winners = state.getWinners();
        const wonPrizeIds = new Set(winners.map(w => w.prizeId));

        prizeCarouselStripEl.innerHTML = prizes.map(p => {
            const isDrawn = (p.drawn > 0) || wonPrizeIds.has(p.id);
            const sponsorName = p.sponsorName || 'ผู้บริหาร';

            const avatarSrc = resolveSponsorAvatar(sponsorName, p.sponsorPhoto);

            return `
                <div class="prize-card-item ${currentPrize && currentPrize.id === p.id ? 'active' : ''} ${isDrawn ? 'drawn' : ''}" 
                     data-prize-id="${p.id}" 
                     onclick="window.selectPrize('${p.id}')">
                    <img src="${avatarSrc}" 
                         class="prize-card-avatar" 
                         alt="${sponsorName}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='images/person.png'; this.onerror=function(){this.onerror=null; this.style.display='none';};">
                    <div class="prize-card-sponsor">${sponsorName}</div>
                    <div class="prize-card-status-pill ${isDrawn ? 'drawn' : 'waiting'}">
                        ${isDrawn ? '✓ สุ่มแล้ว' : 'รอลุ้น'}
                    </div>
                </div>
            `;
        }).join('');
    }

    function highlightCarouselCard(prizeId) {
        if (!prizeCarouselStripEl) return;
        const cards = prizeCarouselStripEl.querySelectorAll('.prize-card-item');
        cards.forEach(c => {
            if (c.getAttribute('data-prize-id') === prizeId) {
                c.classList.add('active');
                c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                c.classList.remove('active');
            }
        });
    }

    window.selectPrize = function (prizeId) {
        if (isSpinning) return;
        const prizes = state.getPrizes();
        const target = prizes.find(p => p.id === prizeId);
        if (target) {
            if (sound && !isMuted) sound.playClick();
            loadPrizeToStage(target);
        }
    };

    function updateEligibleCount() {
        const eligible = state.getEligibleParticipants();
        if (eligibleCountTagEl) {
            eligibleCountTagEl.textContent = `ผู้มีสิทธิ์: ${eligible.length} คน`;
        }
    }

    function displayWinnerData(winner) {
        const empId = String(winner.empId || (winner.participant && winner.participant.id) || '').padStart(5, '0');
        for (let i = 0; i < 5; i++) {
            if (digitEls[i]) digitEls[i].textContent = empId[i] || '0';
        }

        const empName = winner.empName || (winner.participant && winner.participant.name) || '-';
        if (winnerNameTextEl) winnerNameTextEl.textContent = empName;
        if (winnerNameBoxEl) winnerNameBoxEl.classList.add('celebrate');

        if (winnerMetaPillEl) {
            winnerMetaPillEl.style.display = 'flex';
            const dept = winner.department || (winner.participant && winner.participant.department) || 'QC';
            if (winnerMetaDeptEl) winnerMetaDeptEl.textContent = `สังกัด: ${dept}`;
            if (winnerMetaTimeEl) {
                const timeStr = winner.wonAt ? new Date(winner.wonAt).toISOString().replace('T', ' ').slice(0, 19) : '';
                winnerMetaTimeEl.textContent = `เวลาสุ่ม: ${timeStr}`;
            }
        }
    }

    function resetSlotDisplay() {
        for (let i = 0; i < 5; i++) {
            if (digitEls[i]) digitEls[i].textContent = '0';
        }
        if (winnerNameTextEl) winnerNameTextEl.textContent = '---- รอลุ้นผู้โชคดี ----';
        if (winnerNameBoxEl) winnerNameBoxEl.classList.remove('celebrate');
        if (winnerMetaPillEl) winnerMetaPillEl.style.display = 'none';
        if (cardActionBarEl) cardActionBarEl.style.display = 'flex';
        if (spinActionBtnEl) spinActionBtnEl.style.display = 'inline-flex';
        if (rerollActionBtnEl) rerollActionBtnEl.style.display = 'none';
        if (btnCardRerollTopEl) btnCardRerollTopEl.style.display = 'none';
        if (btnTopRerollEl) btnTopRerollEl.style.display = 'none';
    }

    function setButtonStateReady() {
        if (!spinActionBtnEl) return;
        spinActionBtnEl.className = 'btn-spin-action';
        if (spinBtnIconEl) spinBtnIconEl.textContent = '🎲';
        const sponsor = currentPrize ? (currentPrize.sponsorName || 'ผู้บริหาร') : '';
        if (spinBtnTextEl) {
            spinBtnTextEl.textContent = sponsor ? `เริ่มสุ่มรางวัล - ${sponsor}` : 'เริ่มสุ่มรางวัล (START SPIN)';
        }
    }

    function setButtonStateSpinning() {
        if (!spinActionBtnEl) return;
        spinActionBtnEl.className = 'btn-spin-action spinning';
        if (spinBtnIconEl) spinBtnIconEl.textContent = '🎲';
        if (spinBtnTextEl) spinBtnTextEl.textContent = 'กำลังหมุนสุ่มรางวัล... (SPINNING)';
    }

    function setButtonStateCompleted(drawn, total) {
        if (!spinActionBtnEl) return;
        spinActionBtnEl.className = 'btn-spin-action completed';
        if (spinBtnIconEl) spinBtnIconEl.textContent = '✓';
        if (spinBtnTextEl) spinBtnTextEl.textContent = `สุ่มครบแล้ว (${drawn}/${total})`;
    }

    // ========================================================
    // SYSTEM ALERT LIGHTBOX MODAL (REPLACES BROWSER ALERT)
    // ========================================================
    function showRewardAlert(message, options = {}) {
        const title = options.title || 'แจ้งเตือนระบบ';
        const icon = options.icon || '⚠️';
        alertCloseCallback = typeof options.onClose === 'function' ? options.onClose : null;

        if (alertModalTitleEl) alertModalTitleEl.textContent = title;
        if (alertModalIconEl) alertModalIconEl.textContent = icon;
        if (alertModalIconLargeEl) alertModalIconLargeEl.textContent = icon;
        if (alertModalMessageEl) alertModalMessageEl.textContent = message || '';

        if (alertModalEl) {
            alertModalEl.style.display = 'flex';
        }
        if (sound && !isMuted) {
            if (typeof sound.playClick === 'function') sound.playClick();
        }
    }

    function closeAlertModal() {
        if (alertModalEl) {
            alertModalEl.style.display = 'none';
        }
        if (alertCloseCallback) {
            const cb = alertCloseCallback;
            alertCloseCallback = null;
            try { cb(); } catch (e) { console.warn(e); }
        }
        if (sound && !isMuted) {
            if (typeof sound.playClick === 'function') sound.playClick();
        }
    }

    // Expose globally and override window.alert in reward.html context
    window.showRewardAlert = showRewardAlert;
    window.closeRewardAlert = closeAlertModal;
    window.alert = function (msg) {
        showRewardAlert(String(msg || ''));
    };

    // ========================================================
    // LUCKY DRAW SPINNING ENGINE (AUTO-SPIN WITH SOUND & CONFETTI)
    // ========================================================
    function startSpin() {
        if (isSpinning) return;

        const eligible = state.getEligibleParticipants();
        if (eligible.length === 0) {
            showRewardAlert('ไม่มีผู้มีสิทธิ์ร่วมสุ่มรางวัลเหลืออยู่ในระบบ\n(ผู้ร่วมงานทุกคนได้รับรางวัลไปแล้ว หรือยังไม่มีผู้ลงทะเบียน)', {
                title: 'แจ้งเตือนระบบสุ่มรางวัล',
                icon: '⚠️'
            });
            return;
        }

        isSpinning = true;
        setButtonStateSpinning();
        if (cardActionBarEl) cardActionBarEl.style.display = 'flex';
        if (spinActionBtnEl) spinActionBtnEl.style.display = 'inline-flex';
        if (rerollActionBtnEl) rerollActionBtnEl.style.display = 'none';
        if (btnCardRerollTopEl) btnCardRerollTopEl.style.display = 'none';
        if (btnTopRerollEl) btnTopRerollEl.style.display = 'none';
        if (winnerMetaPillEl) winnerMetaPillEl.style.display = 'none';
        if (winnerNameBoxEl) winnerNameBoxEl.classList.remove('celebrate');

        // Play suspense spinning wheel click audio (mechanical ratchet/ticker)
        if (sound && !isMuted) {
            if (typeof sound.startWheelSpin === 'function') sound.startWheelSpin();
            else if (typeof sound.startDrumroll === 'function') sound.startDrumroll();
            else if (typeof sound.playWheelClick === 'function') sound.playWheelClick();
            else if (typeof sound.playTick === 'function') sound.playTick();
        }

        // Add rolling glow to digit boxes
        digitEls.forEach(el => {
            if (el && el.parentElement) el.parentElement.classList.add('rolling');
        });

        // Fast rapid roll animation
        spinInterval = setInterval(() => {
            // Rapid numbers
            for (let i = 0; i < 5; i++) {
                if (digitEls[i]) digitEls[i].textContent = Math.floor(Math.random() * 10);
            }
            // Rapid names from eligible
            if (winnerNameTextEl && eligible.length > 0) {
                const randomPick = eligible[Math.floor(Math.random() * eligible.length)];
                winnerNameTextEl.textContent = randomPick.EmpName || randomPick.name || 'กำลังสุ่ม...';
            }
        }, 50);

        syncStageStateToRemote();

        // Automatic spin: runs for ~3.0s then decelerates and stops automatically!
        spinTimeout = setTimeout(() => {
            if (isSpinning) stopSpin();
        }, 3000);
    }

    function stopSpin() {
        if (!isSpinning) return;
        clearInterval(spinInterval);
        clearTimeout(spinTimeout);

        const eligible = state.getEligibleParticipants();
        if (eligible.length === 0) {
            isSpinning = false;
            setButtonStateReady();
            if (sound) {
                if (typeof sound.stopWheelSpin === 'function') sound.stopWheelSpin();
                else if (typeof sound.stopDrumroll === 'function') sound.stopDrumroll();
            }
            return;
        }

        // Randomly pick winning candidate
        const winnerIndex = Math.floor(Math.random() * eligible.length);
        const chosenEmployee = eligible[winnerIndex];
        const winnerEmpId = String(chosenEmployee.EmployeeID || chosenEmployee.id || '').padStart(5, '0');

        // Sequential deceleration lock of the 5 digits with rising lock tone
        let digitIndex = 0;
        const lockInterval = setInterval(() => {
            if (digitIndex < 5) {
                if (digitEls[digitIndex]) {
                    digitEls[digitIndex].textContent = winnerEmpId[digitIndex] || '0';
                    if (digitEls[digitIndex].parentElement) {
                        digitEls[digitIndex].parentElement.classList.remove('rolling');
                    }
                }
                if (sound && !isMuted) {
                    if (typeof sound.playDigitLock === 'function') {
                        sound.playDigitLock(digitIndex);
                    } else if (typeof sound.playTick === 'function') {
                        sound.playTick(1 + digitIndex * 0.15);
                    }
                }
                digitIndex++;
            } else {
                clearInterval(lockInterval);
                finishSpinWinner(chosenEmployee);
            }
        }, 130);
    }

    function finishSpinWinner(winner) {
        isSpinning = false;

        // Stop continuous wheel spinning sound
        if (sound) {
            if (typeof sound.stopWheelSpin === 'function') sound.stopWheelSpin();
            else if (typeof sound.stopDrumroll === 'function') sound.stopDrumroll();
        }

        // Record winner to state & Firestore
        const recordedWinner = state.recordWinner(currentPrize, winner);

        // Update winner box with celebration
        if (winnerNameTextEl) {
            winnerNameTextEl.textContent = winner.EmpName || winner.name || '-';
        }
        if (winnerNameBoxEl) {
            winnerNameBoxEl.classList.add('celebrate');
        }

        // Show metadata pill
        if (winnerMetaPillEl) {
            winnerMetaPillEl.style.display = 'flex';
            if (winnerMetaDeptEl) {
                winnerMetaDeptEl.textContent = `สังกัด: ${winner.Group || winner.department || 'QC'}`;
            }
            if (winnerMetaTimeEl) {
                const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
                winnerMetaTimeEl.textContent = `เวลาสุ่ม: ${nowStr}`;
            }
        }

        // Confetti & Fireworks Rockets Explosion!
        if (confetti) {
            try {
                if (typeof confetti.fireworks === 'function') confetti.fireworks(5000);
                if (typeof confetti.celebrate === 'function') confetti.celebrate(4500);
            } catch (e) {
                console.warn('Confetti error:', e);
            }
        }

        // Fanfare Win Audio + sparkles
        if (sound && !isMuted) {
            if (typeof sound.playWin === 'function') sound.playWin();
            setTimeout(() => {
                if (typeof sound.playSparkle === 'function') sound.playSparkle();
            }, 350);
        }

        // Update button & card states
        const totalQty = parseInt(currentPrize.quantity, 10) || 1;
        const drawnCount = (parseInt(currentPrize.drawn, 10) || 0);

        if (cardPrizeSubtitleEl) {
            cardPrizeSubtitleEl.textContent = `จำนวนทั้งหมด ${totalQty} รางวัล • สุ่มครบแล้ว (${drawnCount}/${totalQty})`;
        }
        setButtonStateCompleted(drawnCount, totalQty);
        // Hide bottom buttons when drawn
        if (spinActionBtnEl) spinActionBtnEl.style.display = 'none';
        if (rerollActionBtnEl) rerollActionBtnEl.style.display = 'none';
        if (cardActionBarEl) cardActionBarEl.style.display = 'none';
        // Show top-right reroll icon
        if (btnCardRerollTopEl) btnCardRerollTopEl.style.display = 'inline-flex';
        if (btnTopRerollEl) btnTopRerollEl.style.display = 'inline-flex';

        // Refresh bottom carousel and eligible counter
        renderCarousel();
        updateEligibleCount();
        syncStageStateToRemote();

        // Broadcast to remote
        broadcastRewardEvent({
            type: 'WINNER_REVEALED',
            prize: currentPrize,
            winner: recordedWinner
        });
    }

    // ========================================================
    // REROLL LIGHTBOX CONFIRMATION & EXECUTION
    // ========================================================
    function openRerollModal() {
        if (isSpinning) return;
        const winners = state.getWinners();
        const existing = currentPrize ? winners.find(w => w.prizeId === currentPrize.id) : null;

        if (rerollModalWinnerNameEl) {
            rerollModalWinnerNameEl.textContent = existing ? (existing.empName || existing.EmpName || 'ผู้ได้รับรางวัล') : (winnerNameTextEl ? winnerNameTextEl.textContent : 'ผู้ได้รับรางวัลปัจจุบัน');
        }
        if (rerollModalEmpIdEl) {
            const empId = existing ? (existing.empId || existing.employeeId || existing.EmployeeID || '') : '';
            rerollModalEmpIdEl.textContent = empId ? `(รหัส: ${empId})` : '';
        }
        if (rerollModalPrizeNameEl && currentPrize) {
            rerollModalPrizeNameEl.textContent = `รางวัล: ${currentPrize.name || 'Lucky Draw'} (${currentPrize.sponsorName || 'ผู้บริหาร'})`;
        }

        if (rerollModalEl) rerollModalEl.style.display = 'flex';
    }

    function closeRerollModal() {
        if (rerollModalEl) rerollModalEl.style.display = 'none';
    }

    function confirmReroll() {
        closeRerollModal();
        executeReroll();
    }

    function executeReroll() {
        if (isSpinning) return;

        // 1. Delete previous winner for this prize from state & Firestore
        const winners = state.getWinners();
        const existing = currentPrize ? winners.find(w => w.prizeId === currentPrize.id) : null;
        if (existing) {
            state.deleteWinner(existing.id);
        }

        // 2. Re-fetch current prize from state to sync drawn count
        const prizes = state.getPrizes();
        const updatedPrize = prizes.find(p => p.id === currentPrize.id);
        if (updatedPrize) {
            currentPrize = updatedPrize;
        }

        // 3. Reset slot display and update carousel
        resetSlotDisplay();
        renderCarousel();
        updateEligibleCount();
        syncStageStateToRemote();

        // 4. Broadcast reroll event
        broadcastRewardEvent({
            type: 'REROLL_TRIGGERED',
            prize: currentPrize
        });

        // 5. Immediately start auto-spinning for the new winner!
        setTimeout(() => {
            startSpin();
        }, 220);
    }

    function cancelCurrentPrizeWinner(targetPrizeId, targetWinnerId) {
        if (isSpinning) return;
        const prizeId = targetPrizeId || (currentPrize ? currentPrize.id : null);
        if (!prizeId) return;

        const winners = state.getWinners();
        const existing = targetWinnerId
            ? winners.find(w => w.id === targetWinnerId)
            : winners.find(w => w.prizeId === prizeId);

        if (existing) {
            state.deleteWinner(existing.id);
        }

        // Re-fetch current prize from state to sync drawn count
        const prizes = state.getPrizes();
        const updatedPrize = prizes.find(p => p.id === (currentPrize ? currentPrize.id : prizeId));
        if (updatedPrize && currentPrize && currentPrize.id === updatedPrize.id) {
            currentPrize = updatedPrize;
        }

        if (currentPrize && currentPrize.id === prizeId) {
            resetSlotDisplay();
        }

        renderCarousel();
        updateEligibleCount();
        syncStageStateToRemote();

        broadcastRewardEvent({
            type: 'WINNER_CANCELLED',
            prizeId: prizeId
        });
    }

    // ========================================================
    // REMOTE & CROSS-TAB SYNCHRONIZATION
    // ========================================================
    function broadcastRewardEvent(data) {
        const payload = {
            ...data,
            timestamp: Date.now()
        };

        if (rewardChannel) {
            try { rewardChannel.postMessage(payload); } catch (e) {}
        }
        // Also persist in localStorage for multi-browser support
        try {
            localStorage.setItem('crsdg_reward_sync_state', JSON.stringify(payload));
        } catch (e) {}

        // Cloud Firestore sync (Remote iPad to Stage PC across network)
        if (window.FirebaseSync && typeof window.FirebaseSync.saveVoteSettings === 'function') {
            window.FirebaseSync.saveVoteSettings({
                stage_reward_state: payload
            }).catch(() => {});
        } else if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                firebase.firestore().collection('crsdg_vote').doc('settings').set({
                    stage_reward_state: payload
                }, { merge: true }).catch(() => {});
            } catch (e) {}
        }
    }

    function syncStageStateToRemote() {
        const eligible = state.getEligibleParticipants();
        const winners = state.getWinners();
        const existingWinner = currentPrize ? winners.find(w => w.prizeId === currentPrize.id) : null;

        broadcastRewardEvent({
            type: 'STAGE_SYNC',
            prize: currentPrize,
            isSpinning: isSpinning,
            winner: existingWinner || null,
            eligibleCount: eligible.length,
            isMuted: isMuted
        });
    }

    function setupRemoteListeners() {
        let lastProcessedCmdTs = Date.now() - 3000;

        const handleRemoteMessage = (data) => {
            if (!data || !data.type) return;

            // Timestamp deduplication
            if (data.timestamp) {
                if (data.timestamp <= lastProcessedCmdTs) return;
                lastProcessedCmdTs = data.timestamp;
            }

            switch (data.type) {
                case 'REMOTE_CMD_SELECT_PRIZE':
                    if (data.prizeId && !isSpinning) {
                        const prizes = state.getPrizes();
                        const p = prizes.find(x => x.id === data.prizeId);
                        if (p) loadPrizeToStage(p);
                    }
                    break;

                case 'REMOTE_CMD_SPIN':
                    if (!isSpinning) {
                        isFastMode = !!data.isFast;
                        startSpin();
                    }
                    break;

                case 'REMOTE_CMD_STOP':
                    if (isSpinning) {
                        stopSpin();
                    }
                    break;

                case 'REMOTE_CMD_QUICK_DRAW':
                    if (!isSpinning) {
                        isFastMode = true;
                        startSpin();
                    }
                    break;

                case 'REMOTE_CMD_REROLL':
                    executeReroll();
                    break;

                case 'REMOTE_CMD_CANCEL_WINNER':
                    cancelCurrentPrizeWinner(data.prizeId, data.winnerId);
                    break;

                case 'REMOTE_CMD_TOGGLE_SOUND':
                    toggleSound();
                    break;

                case 'REMOTE_REQUEST_SYNC':
                    syncStageStateToRemote();
                    break;
            }
        };

        if (rewardChannel) {
            rewardChannel.onmessage = (event) => handleRemoteMessage(event.data);
        }

        window.addEventListener('storage', (e) => {
            if (e.key === 'crsdg_reward_remote_cmd' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    handleRemoteMessage(parsed);
                } catch (err) {}
            } else if (e.key === 'crsdg_reward' || e.key === 'crsdg_prizes' || e.key === 'crsdg_winners') {
                renderCarousel();
                if (currentPrize) {
                    const prizes = state.getPrizes();
                    const updated = prizes.find(p => p.id === currentPrize.id);
                    if (updated) loadPrizeToStage(updated);
                }
                updateEligibleCount();
            }
        });

        // Cloud Firestore Realtime Sync (Receives commands from iPad remote)
        if (window.FirebaseSync && typeof window.FirebaseSync.subscribe === 'function') {
            window.FirebaseSync.subscribe((event) => {
                if (!event) return;
                if (event.type === 'VOTE_SETTINGS_UPDATED' && event.data && event.data.remote_reward_cmd) {
                    handleRemoteMessage(event.data.remote_reward_cmd);
                } else if (event.type === 'PRIZES_UPDATED' || event.type === 'WINNERS_UPDATED' || event.type === 'MEMBERS_UPDATED') {
                    renderCarousel();
                    if (currentPrize) {
                        const prizes = state.getPrizes();
                        const updated = prizes.find(p => p.id === currentPrize.id);
                        if (updated) loadPrizeToStage(updated);
                    }
                    updateEligibleCount();
                }
            });
        } else if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                firebase.firestore().collection('crsdg_vote').doc('settings').onSnapshot(doc => {
                    if (doc && doc.exists) {
                        const d = doc.data();
                        if (d && d.remote_reward_cmd) {
                            handleRemoteMessage(d.remote_reward_cmd);
                        }
                    }
                }, () => {});
            } catch (e) {}
        }
    }

    // ========================================================
    // EVENT LISTENERS
    // ========================================================
    function toggleSound() {
        isMuted = !isMuted;
        if (soundIconEl) soundIconEl.textContent = isMuted ? '🔇' : '🔊';
        syncStageStateToRemote();
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            if (fullscreenToggleBtnEl) fullscreenToggleBtnEl.title = 'ออกจากเต็มจอ';
        } else {
            if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
            if (fullscreenToggleBtnEl) fullscreenToggleBtnEl.title = 'ขยายเต็มจอ';
        }
    }

    function setupEventListeners() {
        if (spinActionBtnEl) {
            spinActionBtnEl.addEventListener('click', () => {
                if (isSpinning) return; // In auto-spin mode, runs automatically
                const totalQty = parseInt(currentPrize.quantity, 10) || 1;
                const drawnCount = parseInt(currentPrize.drawn, 10) || 0;
                if (drawnCount < totalQty) {
                    startSpin();
                } else {
                    showRewardAlert(`รางวัลนี้ได้รับการสุ่มครบจำนวนแล้ว (${drawnCount}/${totalQty} รางวัล)\nหากต้องการสุ่มใหม่ สามารถกดปุ่ม "สุ่มใหม่" ได้ครับ`, {
                        title: 'สุ่มรางวัลครบตามจำนวนแล้ว',
                        icon: '✓'
                    });
                }
            });
        }

        if (rerollActionBtnEl) {
            rerollActionBtnEl.addEventListener('click', openRerollModal);
        }

        if (btnCardRerollTopEl) {
            btnCardRerollTopEl.addEventListener('click', openRerollModal);
        }

        if (btnTopRerollEl) {
            btnTopRerollEl.addEventListener('click', openRerollModal);
        }

        if (closeRerollModalBtnEl) {
            closeRerollModalBtnEl.addEventListener('click', closeRerollModal);
        }
        if (btnCancelRerollModalEl) {
            btnCancelRerollModalEl.addEventListener('click', closeRerollModal);
        }
        if (btnConfirmRerollModalEl) {
            btnConfirmRerollModalEl.addEventListener('click', confirmReroll);
        }
        if (rerollModalEl) {
            rerollModalEl.addEventListener('click', (e) => {
                if (e.target === rerollModalEl) closeRerollModal();
            });
        }

        // Alert Modal Events
        if (closeAlertModalBtnEl) {
            closeAlertModalBtnEl.addEventListener('click', closeAlertModal);
        }
        if (btnConfirmAlertModalEl) {
            btnConfirmAlertModalEl.addEventListener('click', closeAlertModal);
        }
        if (alertModalEl) {
            alertModalEl.addEventListener('click', (e) => {
                if (e.target === alertModalEl) closeAlertModal();
            });
        }

        // Escape Key to close modals
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (alertModalEl && alertModalEl.style.display === 'flex') {
                    closeAlertModal();
                } else if (rerollModalEl && rerollModalEl.style.display === 'flex') {
                    closeRerollModal();
                } else if (qrModalEl && qrModalEl.style.display === 'flex') {
                    qrModalEl.style.display = 'none';
                }
            }
        });

        if (soundToggleBtnEl) {
            soundToggleBtnEl.addEventListener('click', toggleSound);
        }

        if (fullscreenToggleBtnEl) {
            fullscreenToggleBtnEl.addEventListener('click', toggleFullscreen);
        }

        if (btnOpenQrModalEl && qrModalEl) {
            btnOpenQrModalEl.addEventListener('click', () => {
                qrModalEl.style.display = 'flex';
            });
        }
        if (closeQrModalBtnEl && qrModalEl) {
            closeQrModalBtnEl.addEventListener('click', () => {
                qrModalEl.style.display = 'none';
            });
        }

        window.cancelPrizeWinner = cancelCurrentPrizeWinner;
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
