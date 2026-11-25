// Registered Competing Teams Database (Fallback Defaults)
        const DEFAULT_TEAMS_LIST = [
            {
                id: 'team_it',
                name: 'IT Dragons',
                department: 'ฝ่ายเทคโนโลยีสารสนเทศ (IT & Cloud)',
                captain: 'คุณสมชาย วงศ์สวัสดิ์',
                members: ['คุณธีรเดช พิทักษ์ไทย', 'คุณวรวิทย์ สันติภาพ', 'คุณเอกชัย มั่นคง']
            },
            {
                id: 'team_mkt',
                name: 'Marketing Fire',
                department: 'ฝ่ายการตลาดและการสื่อสาร (Marketing)',
                captain: 'คุณกนกวรรณ จิตต์เที่ยง',
                members: ['คุณลลิตา ธนะโชค', 'คุณเบญจมาศ ทองดี', 'คุณนิภาวรรณ พิมานรัตน์']
            },
            {
                id: 'team_fin',
                name: 'Finance Hawks',
                department: 'ฝ่ายการเงินและบัญชี (Finance)',
                captain: 'คุณพิมพ์ใจ รุ่งเรือง',
                members: ['คุณจินตนา ศรีสวัสดิ์', 'คุณชลธิชา ประเสริฐยิ่ง', 'คุณทินกร บุญประสิทธิ์']
            },
            {
                id: 'team_sales',
                name: 'Sales & BD Thunder',
                department: 'ฝ่ายขายและพัฒนาธุรกิจ (Sales & BD)',
                captain: 'คุณธนากร บุณยรัตน์',
                members: ['คุณภานุเดช ฤกษ์งาม', 'คุณศิริชัย แสนสุข', 'คุณชัยพร มีสุวรรณ']
            },
            {
                id: 'team_hr',
                name: 'HR Superstars',
                department: 'ฝ่ายทรัพยากรบุคคล (HR & People)',
                captain: 'คุณณัฐพล อมรเลิศ',
                members: ['คุณปิยะมาศ ภักดีสุข', 'คุณเกศรินทร์ วงศ์อนันต์', 'คุณพัชราภรณ์ สุวรรณเวช']
            },
            {
                id: 'team_rnd',
                name: 'AI & Data Titans',
                department: 'ฝ่ายวิจัยและพัฒนา AI (R&D)',
                captain: 'คุณศศิธร เจริญศิลป์',
                members: ['คุณปวริศ ชัยวัฒนกุล', 'คุณธวัชชัย รัตนชัย', 'คุณศักดิ์ดา เลิศวิจิตร']
            }
        ];

        function getLiveTeamsList() {
            // ใช้ข้อมูลจากตาราง crsdg_team (ร่วมกับ crsdg_nameteam และ crsdg_member) สำหรับการแข่งขันเกม 4 ต่อ 4
            if (window.stateManager && typeof window.stateManager.getTeamsWithDetails === 'function') {
                try {
                    const detailed = window.stateManager.getTeamsWithDetails();
                    if (detailed && detailed.length > 0) {
                        // กรองเฉพาะทีมที่มีสถานะ Online (ทีม Offline ไม่ต้องแสดงรายชื่อทีมนี้)
                        const onlineTeams = detailed.filter(t => t.status !== 'offline');
                        const targetList = (onlineTeams.length > 0) ? onlineTeams : detailed;
                        return targetList.map(t => {
                            const capObj = t.captain;
                            const capName = capObj ? (capObj.EmpName || capObj.name || t.captainName || 'ยังไม่ระบุ') : 'ยังไม่ระบุหัวหน้าทีม';
                            return {
                                id: t.id,
                                name: t.name,
                                department: t.department || '',
                                color: t.color || '#3b82f6',
                                captain: capName,
                                captainData: capObj,
                                members: (t.members || []).map(m => m.EmpName || m.name || m),
                                membersData: t.members || [],
                                status: t.status || 'online'
                            };
                        });
                    }
                } catch (e) {
                    console.warn('Error reading teams from crsdg_team in game.html:', e);
                }
            }
            return DEFAULT_TEAMS_LIST;
        }

        // ========================================================
        // ฟังก์ชันจัดการรายชื่อทีมที่ตกรอบ (Eliminated Teams Storage)
        // ========================================================
        function getEliminatedTeamIds() {
            try {
                const raw = localStorage.getItem('crsdg_eliminated_teams');
                return new Set(raw ? JSON.parse(raw) : []);
            } catch (e) {
                return new Set();
            }
        }

        function addEliminatedTeamId(teamId) {
            if (!teamId) return;
            try {
                const set = getEliminatedTeamIds();
                set.add(teamId);
                localStorage.setItem('crsdg_eliminated_teams', JSON.stringify([...set]));
            } catch (e) {
                console.error('Error saving eliminated teams:', e);
            }
        }

        function clearEliminatedTeamIds() {
            try {
                localStorage.removeItem('crsdg_eliminated_teams');
            } catch (e) {
                console.error('Error clearing eliminated teams:', e);
            }
        }

        // ========================================================
        // ฟังก์ชันจัดการรายชื่อทีมที่ชนะ (Winner Teams Storage)
        // ========================================================
        function getWinnerTeamIds() {
            try {
                const raw = localStorage.getItem('crsdg_winner_teams');
                return new Set(raw ? JSON.parse(raw) : []);
            } catch (e) {
                return new Set();
            }
        }

        function addWinnerTeamId(teamId) {
            if (!teamId) return;
            try {
                const set = getWinnerTeamIds();
                set.add(teamId);
                localStorage.setItem('crsdg_winner_teams', JSON.stringify([...set]));
            } catch (e) {
                console.error('Error saving winner teams:', e);
            }
        }

        function clearWinnerTeamIds() {
            try {
                localStorage.removeItem('crsdg_winner_teams');
            } catch (e) {
                console.error('Error clearing winner teams:', e);
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const mainStageImg = document.getElementById('mainStageImg');
            const stageStartBox = document.getElementById('stageStartBox');
            const startCompBtn = document.getElementById('startCompBtn');
            const matchArenaOverlay = document.getElementById('matchArenaOverlay');
            const btnBackIntro = document.getElementById('btnBackIntro');
            const roundPillsBar = document.getElementById('roundPillsBar');
            const gridTeamsLeft = document.getElementById('gridTeamsLeft');
            const gridTeamsRight = document.getElementById('gridTeamsRight');
            const spotlightTeamLeft = document.getElementById('spotlightTeamLeft');
            const spotlightTeamRight = document.getElementById('spotlightTeamRight');
            const arenaSummaryText = document.getElementById('arenaSummaryText');
            const btnGoToQuizSelect = document.getElementById('btnGoToQuizSelect');
            const btnRandomTeams = document.getElementById('btnRandomTeams');
            const btnResetEliminated = document.getElementById('btnResetEliminated');
            const bottomHint = document.querySelector('.bottom-hint');

            // Quiz Selection Overlay Elements
            const quizSelectOverlay = document.getElementById('quizSelectOverlay');
            const btnBackToTeams = document.getElementById('btnBackToTeams');
            const btnResetUsedQuizzes = document.getElementById('btnResetUsedQuizzes');
            const quizCardsGrid = document.getElementById('quizCardsGrid');
            const btnRandomQuiz = document.getElementById('btnRandomQuiz');
            const btnStartQuizGame = document.getElementById('btnStartQuizGame');
            const quizTeamA = document.getElementById('quizTeamA');
            const quizTeamB = document.getElementById('quizTeamB');
            const quizMatchSummary = document.getElementById('quizMatchSummary');

            // 4 ต่อ 4 Question Game Stage Elements
            const quizGameStageOverlay = document.getElementById('quizGameStageOverlay');
            const btnBackToQuizSelect = document.getElementById('btnBackToQuizSelect');
            const gameStageRoundTitle = document.getElementById('gameStageRoundTitle');
            const matchGamesProgressBar = document.getElementById('matchGamesProgressBar');
            const matchGameBox1 = document.getElementById('matchGameBox1');
            const matchGameBox2 = document.getElementById('matchGameBox2');
            const matchGameBox3 = document.getElementById('matchGameBox3');
            const gameIntermissionModal = document.getElementById('gameIntermissionModal');
            const closeIntermissionBtn = document.getElementById('closeIntermissionBtn');
            const btnIntermissionNextGame = document.getElementById('btnIntermissionNextGame');
            const gameBlueTeamName = document.getElementById('gameBlueTeamName');
            const gameBlueCapName = document.getElementById('gameBlueCapName');
            const gameBlueAvatar = document.getElementById('gameBlueAvatar');
            const gameBlueScore = document.getElementById('gameBlueScore');
            const gameOrangeTeamName = document.getElementById('gameOrangeTeamName');
            const gameOrangeCapName = document.getElementById('gameOrangeCapName');
            const gameOrangeAvatar = document.getElementById('gameOrangeAvatar');
            const gameOrangeScore = document.getElementById('gameOrangeScore');
            const gameBankScore = document.getElementById('gameBankScore');
            const gameQuestionTitle = document.getElementById('gameQuestionTitle');
            const gameAnswersBoard = document.getElementById('gameAnswersBoard');
            const btnRevealAllAnswers = document.getElementById('btnRevealAllAnswers');
            const btnAwardBlue = document.getElementById('btnAwardBlue');
            const btnAwardOrange = document.getElementById('btnAwardOrange');
            const btnFinishMatch = document.getElementById('btnFinishMatch');
            const strikeBtns = [
                document.getElementById('strikeBtn1'),
                document.getElementById('strikeBtn2'),
                document.getElementById('strikeBtn3')
            ];
            const btnBluePlus10 = document.getElementById('btnBluePlus10');
            const btnBlueMinus10 = document.getElementById('btnBlueMinus10');
            const btnOrangePlus10 = document.getElementById('btnOrangePlus10');
            const btnOrangeMinus10 = document.getElementById('btnOrangeMinus10');

            // Modals: Quiz Result & Strike Buzzer
            const quizResultModal = document.getElementById('quizResultModal');
            const quizResultNumber = document.getElementById('quizResultNumber');
            const quizResultTitle = document.getElementById('quizResultTitle');
            const quizResultMeta = document.getElementById('quizResultMeta');
            const btnQuizResultClose = document.getElementById('btnQuizResultClose');
            const closeQuizResultBtn = document.getElementById('closeQuizResultBtn');
            const btnQuizResultStart = document.getElementById('btnQuizResultStart');

            const strikeBuzzerModal = document.getElementById('strikeBuzzerModal');
            const strikeBuzzerBox = document.getElementById('strikeBuzzerBox');
            const strikeIconsRow = document.getElementById('strikeIconsRow');
            const strikeBuzzerCaption = document.getElementById('strikeBuzzerCaption');
            let strikeBuzzerTimer = null;

            // Modals: Match Result & Custom Dialog
            const matchResultModal = document.getElementById('matchResultModal');
            const matchResultRoundBadge = document.getElementById('matchResultRoundBadge');
            const closeMatchResultBtn = document.getElementById('closeMatchResultBtn');
            const matchResultWinnerBanner = document.getElementById('matchResultWinnerBanner');
            const matchResultColBlue = document.getElementById('matchResultColBlue');
            const matchResultNameBlue = document.getElementById('matchResultNameBlue');
            const matchResultScoreBlue = document.getElementById('matchResultScoreBlue');
            const matchResultBadgeBlue = document.getElementById('matchResultBadgeBlue');
            const matchResultColOrange = document.getElementById('matchResultColOrange');
            const matchResultNameOrange = document.getElementById('matchResultNameOrange');
            const matchResultScoreOrange = document.getElementById('matchResultScoreOrange');
            const matchResultBadgeOrange = document.getElementById('matchResultBadgeOrange');
            const btnMatchResultClose = document.getElementById('btnMatchResultClose');
            const btnMatchResultNext = document.getElementById('btnMatchResultNext');

            const gameDialogModal = document.getElementById('gameDialogModal');
            const closeGameDialogBtn = document.getElementById('closeGameDialogBtn');
            const gameDialogIcon = document.getElementById('gameDialogIcon');
            const gameDialogTitle = document.getElementById('gameDialogTitle');
            const gameDialogMessage = document.getElementById('gameDialogMessage');
            const btnDialogCancel = document.getElementById('btnDialogCancel');
            const btnDialogConfirm = document.getElementById('btnDialogConfirm');

            // Modal: Award Score Confirmation Lightbox (ยืนยันการมอบคะแนน)
            const awardConfirmModal = document.getElementById('awardConfirmModal');
            const awardConfirmCard = document.getElementById('awardConfirmCard');
            const awardConfirmBadgeTop = document.getElementById('awardConfirmBadgeTop');
            const closeAwardConfirmBtn = document.getElementById('closeAwardConfirmBtn');
            const awardConfirmTeamTag = document.getElementById('awardConfirmTeamTag');
            const awardConfirmAvatarBox = document.getElementById('awardConfirmAvatarBox');
            const awardConfirmTeamName = document.getElementById('awardConfirmTeamName');
            const awardConfirmCapName = document.getElementById('awardConfirmCapName');
            const awardConfirmPointsVal = document.getElementById('awardConfirmPointsVal');
            const awardConfirmScoreCalc = document.getElementById('awardConfirmScoreCalc');
            const btnAwardConfirmCancel = document.getElementById('btnAwardConfirmCancel');
            const btnAwardConfirmProceed = document.getElementById('btnAwardConfirmProceed');

            // Modal: Award Score Lightbox
            const awardScoreModal = document.getElementById('awardScoreModal');
            const awardScoreCard = document.getElementById('awardScoreCard');
            const awardScoreBadgeTop = document.getElementById('awardScoreBadgeTop');
            const closeAwardScoreBtn = document.getElementById('closeAwardScoreBtn');
            const awardScoreIcon = document.getElementById('awardScoreIcon');
            const awardScoreTeamName = document.getElementById('awardScoreTeamName');
            const awardScorePointsVal = document.getElementById('awardScorePointsVal');
            const awardScoreTotalTxt = document.getElementById('awardScoreTotalTxt');
            const btnAwardScoreOk = document.getElementById('btnAwardScoreOk');
            let awardScoreTimer = null;

            // Modal: Turn Picker Lightbox (เลือกสิทธิ์การตอบคำถาม)
            const turnPickerModal = document.getElementById('turnPickerModal');
            const closeTurnPickerBtn = document.getElementById('closeTurnPickerBtn');
            const turnPickerTeamBlue = document.getElementById('turnPickerTeamBlue');
            const turnPickerTeamOrange = document.getElementById('turnPickerTeamOrange');
            const turnPickerAvatarBlue = document.getElementById('turnPickerAvatarBlue');
            const turnPickerAvatarOrange = document.getElementById('turnPickerAvatarOrange');
            const turnPickerCapBlue = document.getElementById('turnPickerCapBlue');
            const turnPickerCapOrange = document.getElementById('turnPickerCapOrange');
            const btnPickTurnBlue = document.getElementById('btnPickTurnBlue');
            const btnPickTurnOrange = document.getElementById('btnPickTurnOrange');

            // Modal: Steal Turn Lightbox (เปลี่ยนสิทธิ์ตอบคำถามเมื่อผิด 3 ครั้ง)
            const stealTurnModal = document.getElementById('stealTurnModal');
            const closeStealTurnBtn = document.getElementById('closeStealTurnBtn');
            const stealTurnModalDesc = document.getElementById('stealTurnModalDesc');
            const stealPanelBlue = document.getElementById('stealPanelBlue');
            const stealPanelOrange = document.getElementById('stealPanelOrange');
            const stealTagBlue = document.getElementById('stealTagBlue');
            const stealTagOrange = document.getElementById('stealTagOrange');
            const stealTeamBlue = document.getElementById('stealTeamBlue');
            const stealTeamOrange = document.getElementById('stealTeamOrange');
            const stealAvatarBlue = document.getElementById('stealAvatarBlue');
            const stealAvatarOrange = document.getElementById('stealAvatarOrange');
            const stealCapBlue = document.getElementById('stealCapBlue');
            const stealCapOrange = document.getElementById('stealCapOrange');
            const stealBannerBlue = document.getElementById('stealBannerBlue');
            const stealBannerOrange = document.getElementById('stealBannerOrange');
            const stealFailedBlue = document.getElementById('stealFailedBlue');
            const stealFailedOrange = document.getElementById('stealFailedOrange');
            const btnStealTurnStart = document.getElementById('btnStealTurnStart');
            const stealPhaseActionBar = document.getElementById('stealPhaseActionBar');
            const stealPhaseBannerTxt = document.getElementById('stealPhaseBannerTxt');
            const btnStealFailed = document.getElementById('btnStealFailed');
            const roundSummaryActionBar = document.getElementById('roundSummaryActionBar');
            const roundSummaryIcon = document.getElementById('roundSummaryIcon');
            const roundSummaryTxt = document.getElementById('roundSummaryTxt');
            const btnTriggerRoundSummary = document.getElementById('btnTriggerRoundSummary');
            let pendingRoundResultInfo = null;
            let pendingRoundActionCallback = null;
            let pendingStealTurnSide = null;
            let isStealPhase = false;
            let stealingSide = null;
            let initialTurnThisQuestion = 'blue';
            let bankScoreBeforeSteal = 0;
            let isStealProcessing = false;

            // Quiz & Match State (แข่ง 3 ครั้งในแต่ละรอบ สะสมคะแนนต่อเนื่อง)
            let selectedQuizId = null;
            let currentActiveQuiz = null;
            let isRandomizing = false;
            let blueTeamScore = 0;
            let orangeTeamScore = 0;
            let currentBankScore = 0;
            let hasAwardedThisRound = false;
            let pendingAwardSide = null;
            let currentMatchGameIndex = 1; // การแข่งขันครั้งที่ 1, 2, 3
            const completedMatchGames = new Set();
            window._currentActivePairKey = null;

            function getUsedQuizIds() {
                try {
                    const raw = localStorage.getItem('crsdg_used_quizzes');
                    return new Set(raw ? JSON.parse(raw) : []);
                } catch {
                    return new Set();
                }
            }

            function saveUsedQuizId(id) {
                const set = getUsedQuizIds();
                set.add(id);
                localStorage.setItem('crsdg_used_quizzes', JSON.stringify(Array.from(set)));
            }

            function clearUsedQuizIds() {
                localStorage.removeItem('crsdg_used_quizzes');
            }

            function getCaptainInfo(team) {
                if (!team) return { name: 'ยังไม่ระบุหัวหน้าทีม', photo: null, initials: '👑' };
                const cap = team.captainData || (typeof team.captain === 'object' ? team.captain : null);
                let name = cap ? (cap.EmpName || cap.name) : (typeof team.captain === 'string' ? team.captain : '');
                if (!name || name === 'ยังไม่ระบุ') name = 'ยังไม่ระบุหัวหน้าทีม';
                const photo = cap ? cap.photo : null;
                const nameParts = name.replace(/^(คุณ|นาย|นางสาว|นาง|ดร\.)\s*/, '').trim().split(' ');
                const initials = nameParts.length > 1
                    ? (nameParts[0].charAt(0) + nameParts[1].charAt(0))
                    : (name.length > 1 ? name.slice(0, 2) : '👑');
                return { name, photo, initials };
            }

            function renderCaptainAvatarNode(container, capInfo, isBlue = true) {
                if (!container) return;
                if (capInfo.photo && capInfo.photo.length > 30) {
                    container.innerHTML = `<img src="${capInfo.photo}" alt="${capInfo.name}" class="captain-avatar-img" style="border-radius: 8px;">`;
                } else {
                    const bg = isBlue
                        ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)'
                        : 'linear-gradient(135deg, #9a3412, #f97316)';
                    container.innerHTML = `<span class="podium-captain-initials" style="background: ${bg}; width:100%; height:100%; display:flex; align-items:center; justify-content:center; border-radius: 8px;">${capInfo.initials}</span>`;
                }
            }

            function getCaptainAvatarHtml(capInfo, isBlue = true) {
                if (capInfo && capInfo.photo && capInfo.photo.length > 30) {
                    return `<img src="${capInfo.photo}" alt="${capInfo.name}" class="captain-avatar-img">`;
                }
                const bg = isBlue
                    ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)'
                    : 'linear-gradient(135deg, #9a3412, #f97316)';
                const initials = capInfo ? capInfo.initials : '👑';
                return `<span class="podium-captain-initials" style="background: ${bg}; width:100%; height:100%; display:flex; align-items:center; justify-content:center; border-radius: 8px;">${initials}</span>`;
            }

            const fullscreenBtn = document.getElementById('fullscreenBtn');
            const fullscreenText = document.getElementById('fullscreenText');
            const fullscreenIcon = document.getElementById('fullscreenIcon');
            const leaderboardBtn = document.getElementById('leaderboardBtn');
            const leaderboardModal = document.getElementById('leaderboardModal');
            const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
            const teamsBtn = document.getElementById('teamsBtn');
            const sound = window.soundEffects;

            // Background Music & Sound Toggle Elements
            const bgmAudio = document.getElementById('bgmAudio');
            const soundToggleBtn = document.getElementById('soundToggleBtn');
            const soundIcon = document.getElementById('soundIcon');
            const soundText = document.getElementById('soundText');

            let isMuted = localStorage.getItem('crsdg_bgm_muted') === 'true';

            const iconSoundOn = `
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            `;

            const iconSoundOff = `
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
            `;

            function updateSoundUI() {
                if (!soundToggleBtn) return;
                if (isMuted) {
                    soundIcon.innerHTML = iconSoundOff;
                    soundText.textContent = 'เสียง: ปิด';
                    soundToggleBtn.classList.add('btn-sound-muted');
                } else {
                    soundIcon.innerHTML = iconSoundOn;
                    soundText.textContent = 'เสียง: เปิด';
                    soundToggleBtn.classList.remove('btn-sound-muted');
                }
            }

            function playBGM() {
                // ขอยกเลิกเสียง background ก่อน (Background music disabled)
                pauseBGM();
                return;
            }

            function pauseBGM() {
                if (bgmAudio) {
                    try {
                        bgmAudio.pause();
                        bgmAudio.currentTime = 0;
                    } catch (e) { }
                }
            }

            function toggleSound() {
                isMuted = !isMuted;
                localStorage.setItem('crsdg_bgm_muted', isMuted);
                if (sound) {
                    sound.muted = isMuted;
                }
                updateSoundUI();
                pauseBGM(); // ยังคงยกเลิกเสียง background
                if (!isMuted && sound) {
                    sound.playClick();
                }
            }

            if (soundToggleBtn) {
                soundToggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSound();
                });
            }

            // Initial audio state: ยกเลิกเสียง background
            if (sound) {
                sound.muted = isMuted;
            }
            updateSoundUI();
            pauseBGM();

            // ========================================================
            // Custom Lightbox Alert & Confirm Dialog System
            // ========================================================
            function showGameAlert(title, message, icon = '🔔', confirmText = 'เข้าใจแล้ว', onConfirm = null) {
                if (!gameDialogModal) return;
                if (gameDialogIcon) gameDialogIcon.textContent = icon;
                if (gameDialogTitle) gameDialogTitle.textContent = title;
                if (gameDialogMessage) gameDialogMessage.innerHTML = String(message).replace(/\n/g, '<br>');
                if (btnDialogCancel) btnDialogCancel.style.display = 'none';
                if (btnDialogConfirm) {
                    btnDialogConfirm.textContent = confirmText;
                    btnDialogConfirm.onclick = () => {
                        closeGameDialog();
                        if (typeof onConfirm === 'function') onConfirm();
                    };
                }
                gameDialogModal.classList.add('active');
                if (sound) sound.playClick();
            }

            function showGameConfirm(title, message, onConfirm, onCancel = null, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', icon = '❓') {
                if (!gameDialogModal) return;
                if (gameDialogIcon) gameDialogIcon.textContent = icon;
                if (gameDialogTitle) gameDialogTitle.textContent = title;
                if (gameDialogMessage) gameDialogMessage.innerHTML = String(message).replace(/\n/g, '<br>');
                if (btnDialogCancel) {
                    btnDialogCancel.style.display = 'inline-block';
                    btnDialogCancel.textContent = cancelText;
                    btnDialogCancel.onclick = () => {
                        closeGameDialog();
                        if (typeof onCancel === 'function') onCancel();
                    };
                }
                if (btnDialogConfirm) {
                    btnDialogConfirm.textContent = confirmText;
                    btnDialogConfirm.onclick = () => {
                        closeGameDialog();
                        if (typeof onConfirm === 'function') onConfirm();
                    };
                }
                gameDialogModal.classList.add('active');
                if (sound) sound.playClick();
            }

            function closeGameDialog() {
                if (gameDialogModal) gameDialogModal.classList.remove('active');
            }

            if (closeGameDialogBtn) closeGameDialogBtn.addEventListener('click', closeGameDialog);
            if (btnDialogCancel) btnDialogCancel.addEventListener('click', closeGameDialog);
            if (gameDialogModal) {
                gameDialogModal.addEventListener('click', (e) => {
                    if (e.target === gameDialogModal) closeGameDialog();
                });
            }

            // Override native alert to display Lightbox automatically
            window.alert = function (msg) {
                showGameAlert('แจ้งเตือน', String(msg), '🔔');
            };

            // ========================================================
            // Match Result Modal Functions
            // ========================================================
            let onMatchResultNextCallback = null;
            function showMatchResultModal(data) {
                if (!matchResultModal) return;
                const { roundTitle, teamA, teamB, scoreA, scoreB, onNext } = data;
                onMatchResultNextCallback = onNext;

                if (matchResultRoundBadge) {
                    matchResultRoundBadge.textContent = `🏆 ผลการแข่งขัน: ${roundTitle || ''}`;
                }
                if (matchResultNameBlue) matchResultNameBlue.textContent = teamA ? teamA.name : 'ทีมฝั่งซ้าย';
                if (matchResultScoreBlue) matchResultScoreBlue.textContent = scoreA;

                if (matchResultNameOrange) matchResultNameOrange.textContent = teamB ? teamB.name : 'ทีมฝั่งขวา';
                if (matchResultScoreOrange) matchResultScoreOrange.textContent = scoreB;

                if (matchResultColBlue) matchResultColBlue.className = 'match-result-team-col match-team-blue';
                if (matchResultColOrange) matchResultColOrange.className = 'match-result-team-col match-team-orange';

                let winnerTeam = null;
                let loserTeam = null;

                if (scoreA > scoreB) {
                    winnerTeam = teamA;
                    loserTeam = teamB;
                    if (matchResultWinnerBanner) {
                        matchResultWinnerBanner.innerHTML = `🎉 <strong>${teamA.name}</strong> เป็นฝ่ายชนะ (${scoreA} ต่อ ${scoreB} คะแนน)`;
                    }
                    if (matchResultBadgeBlue) matchResultBadgeBlue.innerHTML = '👑 ทีมชนะ';
                    if (matchResultBadgeOrange) matchResultBadgeOrange.innerHTML = 'ตกรอบ';
                    if (matchResultColBlue) matchResultColBlue.classList.add('is-winner');
                    if (matchResultColOrange) matchResultColOrange.classList.add('is-loser');
                } else if (scoreB > scoreA) {
                    winnerTeam = teamB;
                    loserTeam = teamA;
                    if (matchResultWinnerBanner) {
                        matchResultWinnerBanner.innerHTML = `🎉 <strong>${teamB.name}</strong> เป็นฝ่ายชนะ (${scoreB} ต่อ ${scoreA} คะแนน)`;
                    }
                    if (matchResultBadgeOrange) matchResultBadgeOrange.innerHTML = '👑 ทีมชนะ';
                    if (matchResultBadgeBlue) matchResultBadgeBlue.innerHTML = 'ตกรอบ';
                    if (matchResultColOrange) matchResultColOrange.classList.add('is-winner');
                    if (matchResultColBlue) matchResultColBlue.classList.add('is-loser');
                } else {
                    winnerTeam = teamA;
                    loserTeam = null;
                    if (matchResultWinnerBanner) {
                        matchResultWinnerBanner.innerHTML = `🤝 ผลการแข่งขัน เสมอกัน! (${scoreA} ต่อ ${scoreB} คะแนน)`;
                    }
                    if (matchResultBadgeBlue) matchResultBadgeBlue.textContent = 'เสมอ';
                    if (matchResultBadgeOrange) matchResultBadgeOrange.textContent = 'เสมอ';
                }

                if (btnMatchResultNext) {
                    if (winnerTeam && loserTeam) {
                        btnMatchResultNext.className = 'btn-match-modal-next btn-match-modal-winner';
                        btnMatchResultNext.innerHTML = `👑 ยืนยัน ${winnerTeam.name} ชนะผ่านเข้ารอบ ❯`;
                    } else {
                        btnMatchResultNext.className = 'btn-match-modal-next';
                        btnMatchResultNext.innerHTML = `กลับสู่หน้าเลือกทีม ❯`;
                    }
                }

                matchResultModal.classList.add('active');
                if (sound) sound.playWin();
                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            }

            function closeMatchResultModal() {
                if (matchResultModal) matchResultModal.classList.remove('active');
            }

            if (closeMatchResultBtn) closeMatchResultBtn.addEventListener('click', closeMatchResultModal);
            if (btnMatchResultClose) btnMatchResultClose.addEventListener('click', closeMatchResultModal);
            if (btnMatchResultNext) {
                btnMatchResultNext.addEventListener('click', () => {
                    closeMatchResultModal();
                    closeAllGameModals();
                    const liveTeams = getLiveTeamsList();
                    const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                    const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];

                    // ส่วนทีมที่ชนะให้ติดกรอบ "ทีมชนะ" และทีมที่แพ้ให้ disabled กล่องทีม และแสดงกรอบ "ตกรอบ"
                    if (blueTeamScore > orangeTeamScore) {
                        if (teamB) addEliminatedTeamId(teamB.id);
                        if (teamA) addWinnerTeamId(teamA.id);
                    } else if (orangeTeamScore > blueTeamScore) {
                        if (teamA) addEliminatedTeamId(teamA.id);
                        if (teamB) addWinnerTeamId(teamB.id);
                    }

                    // รีเซ็ตเพื่อเตรียมพร้อมสำหรับการแข่งขันของคู่ถัดไป
                    currentMatchGameIndex = 1;
                    completedMatchGames.clear();
                    blueTeamScore = 0;
                    orangeTeamScore = 0;
                    currentBankScore = 0;
                    window._currentActivePairKey = null;

                    if (quizGameStageOverlay) quizGameStageOverlay.classList.remove('active');
                    if (quizSelectOverlay) quizSelectOverlay.classList.remove('active');
                    if (matchArenaOverlay) matchArenaOverlay.classList.add('active');

                    renderTeamCards();
                    if (sound) sound.playWin();

                    if (typeof onMatchResultNextCallback === 'function') {
                        onMatchResultNextCallback();
                    }

                    closeAllGameModals();
                    if (typeof broadcastGameState === 'function') {
                        broadcastGameState();
                    }
                });
            }
            if (matchResultModal) {
                matchResultModal.addEventListener('click', (e) => {
                    if (e.target === matchResultModal) closeMatchResultModal();
                });
            }

            // ========================================================
            // Award Score Confirmation & State Functions
            // ========================================================
            function areAllAnswersRevealed() {
                const slots = document.querySelectorAll('.answer-card-slot');
                if (slots.length === 0) return false;
                const unrevealed = document.querySelectorAll('.answer-card-slot:not(.is-revealed)');
                return unrevealed.length === 0;
            }

            function updateAwardButtonsState() {
                const allRevealed = areAllAnswersRevealed();
                const canAward = allRevealed && !hasAwardedThisRound;

                if (btnAwardBlue) {
                    btnAwardBlue.disabled = !canAward;
                    btnAwardBlue.title = canAward
                        ? 'คลิกเพื่อขอยืนยันมอบคะแนนให้ทีมฝั่งซ้าย'
                        : (hasAwardedThisRound ? 'มอบคะแนนในข้อนี้เรียบร้อยแล้ว' : 'ต้องเฉลยคำตอบครบทุกข้อก่อน จึงจะสามารถมอบคะแนนได้');
                }
                if (btnAwardOrange) {
                    btnAwardOrange.disabled = !canAward;
                    btnAwardOrange.title = canAward
                        ? 'คลิกเพื่อขอยืนยันมอบคะแนนให้ทีมฝั่งขวา'
                        : (hasAwardedThisRound ? 'มอบคะแนนในข้อนี้เรียบร้อยแล้ว' : 'ต้องเฉลยคำตอบครบทุกข้อก่อน จึงจะสามารถมอบคะแนนได้');
                }
            }

            function showAwardConfirmLightbox(side) {
                if (!awardConfirmModal) return;
                pendingAwardSide = side;

                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                const targetTeam = (side === 'blue') ? teamA : teamB;
                const targetCap = getCaptainInfo(targetTeam);

                const points = currentBankScore;
                const currentScore = (side === 'blue') ? blueTeamScore : orangeTeamScore;
                const newTotal = currentScore + points;

                if (awardConfirmCard) {
                    awardConfirmCard.classList.remove('confirm-blue', 'confirm-orange');
                    awardConfirmCard.classList.add(side === 'blue' ? 'confirm-blue' : 'confirm-orange');
                }

                if (awardConfirmBadgeTop) {
                    awardConfirmBadgeTop.textContent = side === 'blue' ? '⭐ ยืนยันการมอบคะแนนให้ทีมฝั่งซ้าย' : '⭐ ยืนยันการมอบคะแนนให้ทีมฝั่งขวา';
                }

                if (awardConfirmTeamTag) {
                    awardConfirmTeamTag.textContent = side === 'blue' ? '🔵 ทีมฝั่งซ้าย' : '🟠 ทีมฝั่งขวา';
                }

                if (awardConfirmTeamName) {
                    awardConfirmTeamName.textContent = targetTeam ? targetTeam.name : (side === 'blue' ? 'ทีมฝั่งซ้าย' : 'ทีมฝั่งขวา');
                }

                if (awardConfirmCapName) {
                    awardConfirmCapName.textContent = `👑 ${targetCap ? targetCap.name : 'หัวหน้าทีม'}`;
                }

                renderCaptainAvatarNode(awardConfirmAvatarBox, targetCap, side === 'blue');

                if (awardConfirmPointsVal) {
                    awardConfirmPointsVal.textContent = (points > 0) ? `+${points} คะแนน` : `0 คะแนน`;
                }

                if (awardConfirmScoreCalc) {
                    awardConfirmScoreCalc.innerHTML = `คะแนนสะสมเดิม: <strong>${currentScore}</strong> &nbsp;➔&nbsp; คะแนนหลังมอบ: <strong class="new-total-highlight">${newTotal}</strong> คะแนน`;
                }

                if (btnAwardConfirmProceed) {
                    btnAwardConfirmProceed.className = 'btn-award-confirm-proceed ' + (side === 'blue' ? 'btn-confirm-blue' : 'btn-confirm-orange');
                    btnAwardConfirmProceed.textContent = `✓ ยืนยันมอบ ${points} คะแนนให้ทีมนี้`;
                }

                awardConfirmModal.classList.add('active');
                if (sound) sound.playClick();
            }

            function closeAwardConfirmLightbox() {
                if (awardConfirmModal) awardConfirmModal.classList.remove('active');
                pendingAwardSide = null;
            }

            function executeAwardTransfer() {
                if (!pendingAwardSide) return;
                const side = pendingAwardSide;
                const awarded = currentBankScore;
                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                const targetTeam = (side === 'blue') ? teamA : teamB;

                if (side === 'blue') {
                    blueTeamScore += currentBankScore;
                } else {
                    orangeTeamScore += currentBankScore;
                }
                const newTotal = (side === 'blue') ? blueTeamScore : orangeTeamScore;

                currentBankScore = 0;
                hasAwardedThisRound = true;
                updateScoresDisplay();
                updateAwardButtonsState();

                // บันทึกสถานะการแข่งขันครั้งปัจจุบันว่าเล่นเสร็จแล้ว
                completedMatchGames.add(currentMatchGameIndex);
                updateMatchGamesProgressBar();

                if (btnFinishMatch) btnFinishMatch.disabled = false;
                updateFinishMatchButtonState();

                closeAwardConfirmLightbox();

                // แสดง Lightbox สรุปผลครั้งนี้
                showSingleGameResultLightbox({
                    winnerSide: side,
                    winnerTeam: targetTeam,
                    reason: `🎉 ${targetTeam.name} ได้รับคะแนนสะสมในครั้งนี้!`,
                    pointsWon: awarded
                });
            }

            if (btnAwardConfirmCancel) btnAwardConfirmCancel.addEventListener('click', closeAwardConfirmLightbox);
            if (closeAwardConfirmBtn) closeAwardConfirmBtn.addEventListener('click', closeAwardConfirmLightbox);
            if (btnAwardConfirmProceed) btnAwardConfirmProceed.addEventListener('click', executeAwardTransfer);
            if (awardConfirmModal) {
                awardConfirmModal.addEventListener('click', (e) => {
                    if (e.target === awardConfirmModal) closeAwardConfirmLightbox();
                });
            }

            // ========================================================
            // Award Score Modal Functions (เมื่อกดมอบคะแนนให้ทีม)
            // ========================================================
            function showAwardScoreLightbox(info) {
                if (!awardScoreModal) return;
                const { side, teamName, pointsAwarded, totalScore } = info;

                if (awardScoreCard) {
                    awardScoreCard.classList.remove('award-blue', 'award-orange');
                    awardScoreCard.classList.add(side === 'blue' ? 'award-blue' : 'award-orange');
                }
                if (awardScoreBadgeTop) {
                    awardScoreBadgeTop.textContent = side === 'blue' ? '🔵 มอบคะแนนให้ทีมฝั่งซ้าย' : '🟠 มอบคะแนนให้ทีมฝั่งขวา';
                }
                if (awardScoreTeamName) awardScoreTeamName.textContent = teamName;
                if (awardScorePointsVal) {
                    awardScorePointsVal.textContent = (pointsAwarded > 0) ? `+${pointsAwarded} คะแนน` : `ได้รับคะแนน!`;
                }
                if (awardScoreTotalTxt) {
                    awardScoreTotalTxt.textContent = `คะแนนสะสมรวม: ${totalScore} คะแนน`;
                }

                awardScoreModal.classList.add('active');
                if (sound) sound.playWin();

                if (awardScoreTimer) clearTimeout(awardScoreTimer);
                awardScoreTimer = setTimeout(() => {
                    closeAwardScoreLightbox();
                }, 3000);
            }

            function closeAwardScoreLightbox() {
                if (awardScoreTimer) {
                    clearTimeout(awardScoreTimer);
                    awardScoreTimer = null;
                }
                if (awardScoreModal) awardScoreModal.classList.remove('active');

                // เมื่อแข่งขันครบแล้วทั้ง 3 ครั้ง และมีการให้คะแนนทีมที่ชนะครั้งที่ 3 แล้ว ให้ระบบแสดง lightbox สรุปผลการแข่งขัน
                if (currentMatchGameIndex === 3 && hasAwardedThisRound) {
                    const liveTeams = getLiveTeamsList();
                    const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                    const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                    setTimeout(() => {
                        showMatchResultModal({
                            roundTitle: `${currentSelectedRound} (สะสมคะแนนครบ 3 ครั้ง)`,
                            teamA: teamA,
                            teamB: teamB,
                            scoreA: blueTeamScore,
                            scoreB: orangeTeamScore
                        });
                    }, 350);
                }
            }

            if (closeAwardScoreBtn) closeAwardScoreBtn.addEventListener('click', closeAwardScoreLightbox);
            if (btnAwardScoreOk) btnAwardScoreOk.addEventListener('click', closeAwardScoreLightbox);
            if (awardScoreModal) {
                awardScoreModal.addEventListener('click', (e) => {
                    if (e.target === awardScoreModal) closeAwardScoreLightbox();
                });
            }

            // ========================================================
            // Turn Picker Modal Functions (เลือกทีมที่ได้สิทธิ์ตอบคำถาม)
            // ========================================================
            function showTurnPickerModal(teamA, teamB, capA, capB) {
                if (!turnPickerModal) return;
                if (turnPickerTeamBlue) turnPickerTeamBlue.textContent = teamA ? teamA.name : 'ทีมฝั่งซ้าย';
                if (turnPickerTeamOrange) turnPickerTeamOrange.textContent = teamB ? teamB.name : 'ทีมฝั่งขวา';

                if (turnPickerCapBlue) turnPickerCapBlue.textContent = `👑 ${capA ? capA.name : 'หัวหน้าทีม'}`;
                if (turnPickerCapOrange) turnPickerCapOrange.textContent = `👑 ${capB ? capB.name : 'หัวหน้าทีม'}`;

                renderCaptainAvatarNode(turnPickerAvatarBlue, capA, true);
                renderCaptainAvatarNode(turnPickerAvatarOrange, capB, false);

                turnPickerModal.classList.add('active');
            }

            function closeTurnPickerModal() {
                if (turnPickerModal) turnPickerModal.classList.remove('active');
            }

            // ========================================================
            // Turn Announcement Lightbox (แสดงทีมที่ได้สิทธิ์ตอบคำถาม)
            // ========================================================
            let turnAnnounceTimer = null;
            function showTurnAnnouncement(side) {
                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                const chosenTeam = (side === 'blue') ? teamA : teamB;
                const isBlue = (side === 'blue');
                const cap = getCaptainInfo(chosenTeam);

                const modal = document.getElementById('turnAnnounceModal');
                const sideTag = document.getElementById('turnAnnounceSideTag');
                const avatarEl = document.getElementById('turnAnnounceAvatar');
                const teamNameEl = document.getElementById('turnAnnounceTeamName');
                const capNameEl = document.getElementById('turnAnnounceCapName');
                const cardEl = document.getElementById('turnAnnounceCard');

                if (sideTag) {
                    sideTag.textContent = isBlue ? '🔵 ทีมฝั่งซ้าย (Blue)' : '🟠 ทีมฝั่งขวา (Orange)';
                    sideTag.className = 'turn-announce-side-tag ' + (isBlue ? 'tag-blue' : 'tag-orange');
                }
                if (teamNameEl) teamNameEl.textContent = chosenTeam ? chosenTeam.name : (isBlue ? 'ทีมฝั่งซ้าย' : 'ทีมฝั่งขวา');
                if (capNameEl) capNameEl.textContent = `👑 หัวหน้าทีม: ${cap ? cap.name : '-'}`;
                if (avatarEl && chosenTeam) {
                    renderCaptainAvatarNode(avatarEl, cap, isBlue);
                }
                if (cardEl) {
                    cardEl.className = 'turn-announce-card ' + (isBlue ? 'card-blue' : 'card-orange');
                }

                closeTurnPickerModal();
                initialTurnThisQuestion = side;
                isStealPhase = false;
                stealingSide = null;
                pendingRoundResultInfo = null;
                if (stealPhaseActionBar) stealPhaseActionBar.style.display = 'none';
                if (roundSummaryActionBar) roundSummaryActionBar.style.display = 'none';
                window.setActiveCompetingTurn(side);

                if (modal) {
                    modal.classList.add('active');
                    if (sound) {
                        if (typeof sound.playWin === 'function') sound.playWin();
                        else if (typeof sound.playDing === 'function') sound.playDing();
                    }

                    if (turnAnnounceTimer) clearTimeout(turnAnnounceTimer);
                    turnAnnounceTimer = setTimeout(() => {
                        closeTurnAnnouncement();
                    }, 2800);
                }

                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            }

            function closeTurnAnnouncement() {
                if (turnAnnounceTimer) {
                    clearTimeout(turnAnnounceTimer);
                    turnAnnounceTimer = null;
                }
                const modal = document.getElementById('turnAnnounceModal');
                if (modal) modal.classList.remove('active');
                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            }

            const btnTurnAnnounceClose = document.getElementById('btnTurnAnnounceClose');
            if (btnTurnAnnounceClose) {
                btnTurnAnnounceClose.addEventListener('click', closeTurnAnnouncement);
            }
            const turnAnnounceModal = document.getElementById('turnAnnounceModal');
            if (turnAnnounceModal) {
                turnAnnounceModal.addEventListener('click', (e) => {
                    if (e.target === turnAnnounceModal) closeTurnAnnouncement();
                });
            }

            function chooseFirstTurnTeam(side) {
                showTurnAnnouncement(side);
            }

            if (btnPickTurnBlue) {
                btnPickTurnBlue.addEventListener('click', () => {
                    chooseFirstTurnTeam('blue');
                });
            }
            if (btnPickTurnOrange) {
                btnPickTurnOrange.addEventListener('click', () => {
                    chooseFirstTurnTeam('orange');
                });
            }
            if (closeTurnPickerBtn) {
                closeTurnPickerBtn.addEventListener('click', () => {
                    if (!currentActiveTurn) window.setActiveCompetingTurn('blue');
                    initialTurnThisQuestion = currentActiveTurn || 'blue';
                    isStealPhase = false;
                    stealingSide = null;
                    if (stealPhaseActionBar) stealPhaseActionBar.style.display = 'none';
                    closeTurnPickerModal();
                });
            }
            if (turnPickerModal) {
                turnPickerModal.addEventListener('click', (e) => {
                    if (e.target === turnPickerModal) {
                        if (!currentActiveTurn) window.setActiveCompetingTurn('blue');
                        initialTurnThisQuestion = currentActiveTurn || 'blue';
                        isStealPhase = false;
                        stealingSide = null;
                        if (stealPhaseActionBar) stealPhaseActionBar.style.display = 'none';
                        closeTurnPickerModal();
                    }
                });
            }

            // ========================================================
            // Steal Turn Modal Functions (เปลี่ยนสิทธิ์ตอบคำถามเมื่อผิด 3 ครั้ง)
            // ========================================================
            function showStealTurnLightbox(stealingSideParam) {
                if (!stealTurnModal) return;

                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                const capA = getCaptainInfo(teamA);
                const capB = getCaptainInfo(teamB);

                if (stealTeamBlue) stealTeamBlue.textContent = teamA ? teamA.name : 'ทีมฝั่งซ้าย';
                if (stealTeamOrange) stealTeamOrange.textContent = teamB ? teamB.name : 'ทีมฝั่งขวา';
                if (stealCapBlue) stealCapBlue.textContent = `👑 ${capA ? capA.name : 'หัวหน้าทีม'}`;
                if (stealCapOrange) stealCapOrange.textContent = `👑 ${capB ? capB.name : 'หัวหน้าทีม'}`;

                renderCaptainAvatarNode(stealAvatarBlue, capA, true);
                renderCaptainAvatarNode(stealAvatarOrange, capB, false);

                const isBlueStealing = (stealingSideParam === 'blue');

                if (stealPanelBlue) {
                    stealPanelBlue.className = 'steal-panel-col ' + (isBlueStealing ? 'steal-panel-active steal-panel-blue' : 'steal-panel-failed');
                }
                if (stealPanelOrange) {
                    stealPanelOrange.className = 'steal-panel-col ' + (!isBlueStealing ? 'steal-panel-active steal-panel-orange' : 'steal-panel-failed');
                }

                if (stealTagBlue) {
                    stealTagBlue.textContent = isBlueStealing ? '🔵 ได้สิทธิ์ขโมยคะแนน' : '❌ ตอบผิดครบ 3 ครั้ง';
                    stealTagBlue.className = 'steal-panel-tag ' + (isBlueStealing ? 'tag-active-blue' : 'tag-failed');
                }
                if (stealTagOrange) {
                    stealTagOrange.textContent = !isBlueStealing ? '🟠 ได้สิทธิ์ขโมยคะแนน' : '❌ ตอบผิดครบ 3 ครั้ง';
                    stealTagOrange.className = 'steal-panel-tag ' + (!isBlueStealing ? 'tag-active-orange' : 'tag-failed');
                }

                if (stealBannerBlue) stealBannerBlue.style.display = isBlueStealing ? 'block' : 'none';
                if (stealFailedBlue) stealFailedBlue.style.display = isBlueStealing ? 'none' : 'block';

                if (stealBannerOrange) stealBannerOrange.style.display = !isBlueStealing ? 'block' : 'none';
                if (stealFailedOrange) stealFailedOrange.style.display = !isBlueStealing ? 'none' : 'block';

                if (stealTurnModalDesc) {
                    const stealingTeamName = isBlueStealing ? (teamA ? teamA.name : 'ทีมฝั่งซ้าย') : (teamB ? teamB.name : 'ทีมฝั่งขวา');
                    stealTurnModalDesc.innerHTML = `ตอบผิดครบ 3 ครั้งแล้ว — สิทธิ์ตอบคำถามตกเป็นของ <strong>${stealingTeamName}</strong> (มีโอกาส 1 ครั้งเพื่อขโมยคะแนนทั้งหมด)`;
                }

                if (btnStealTurnStart) {
                    btnStealTurnStart.className = 'btn-steal-turn-start ' + (isBlueStealing ? 'btn-steal-blue' : 'btn-steal-orange');
                    btnStealTurnStart.textContent = `เริ่มตอบคำถาม (${isBlueStealing ? 'ทีมฝั่งซ้าย' : 'ทีมฝั่งขวา'}) ❯`;
                }

                stealTurnModal.classList.add('active');
                if (sound) sound.playWin();
                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            }

            function startStealPhase() {
                closeStealTurnModal();
                isStealPhase = true;
                if (!bankScoreBeforeSteal || bankScoreBeforeSteal <= 0) {
                    bankScoreBeforeSteal = currentBankScore;
                }
                stealingSide = pendingStealTurnSide || ((initialTurnThisQuestion === 'blue') ? 'orange' : 'blue');
                window.setActiveCompetingTurn(stealingSide);

                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                const stealingTeam = (stealingSide === 'blue') ? teamA : teamB;

                if (stealPhaseActionBar) {
                    stealPhaseActionBar.style.display = 'flex';
                }
                if (stealPhaseBannerTxt && stealingTeam) {
                    stealPhaseBannerTxt.innerHTML = `สิทธิ์ขโมยคะแนน: <strong>${stealingTeam.name}</strong> ตอบคำตอบให้ถูกเพื่อรับ (${currentBankScore} คะแนน)`;
                }
                if (sound) sound.playWin();
                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            }

            function closeStealTurnModal() {
                if (stealTurnModal) stealTurnModal.classList.remove('active');
            }

            if (closeStealTurnBtn) closeStealTurnBtn.addEventListener('click', startStealPhase);
            if (btnStealTurnStart) btnStealTurnStart.addEventListener('click', startStealPhase);
            if (stealTurnModal) {
                stealTurnModal.addEventListener('click', (e) => {
                    if (e.target === stealTurnModal) startStealPhase();
                });
            }
            if (btnStealFailed) {
                btnStealFailed.addEventListener('click', () => {
                    handleStealFailed();
                });
            }

            // Current match selection state
            let currentSelectedRound = 'รอบที่ 1: คัดเลือกสาย A';
            let selectedTeamALeft = 'team_it';
            let selectedTeamBRight = 'team_mkt';

            function ensureValidSelectedTeams() {
                const liveTeams = getLiveTeamsList();
                if (liveTeams.length === 0) return;
                const elimSet = getEliminatedTeamIds();
                const activeTeams = liveTeams.filter(t => !elimSet.has(t.id));
                const pool = (activeTeams.length >= 2) ? activeTeams : (activeTeams.length === 1 ? activeTeams : liveTeams);

                const hasA = pool.some(t => t.id === selectedTeamALeft);
                const hasB = pool.some(t => t.id === selectedTeamBRight);
                if (!hasA) selectedTeamALeft = pool[0].id;
                if (!hasB) selectedTeamBRight = (pool[1] || pool[0]).id;
                if (selectedTeamALeft === selectedTeamBRight && pool.length > 1) {
                    selectedTeamBRight = pool.find(t => t.id !== selectedTeamALeft).id;
                }
            }

            // Function to open Arena selection view over background-game.jpg
            function openMatchArena() {
                if (sound) { sound.init(); sound.playClick(); }
                // Change background to background-game.jpg as requested
                mainStageImg.src = 'assets/images/background-game.jpg';
                if (stageStartBox) stageStartBox.style.display = 'none';
                if (matchArenaOverlay) matchArenaOverlay.classList.add('active');
                if (bottomHint) bottomHint.style.display = 'none';
                renderTeamCards();
                if (typeof broadcastGameState === 'function') broadcastGameState(true);
            }

            // Function to close Arena and return to background.jpg
            function closeMatchArena() {
                if (sound) { sound.init(); sound.playClick(); }
                mainStageImg.src = 'assets/images/background.jpg';
                if (stageStartBox) stageStartBox.style.display = 'flex';
                if (matchArenaOverlay) matchArenaOverlay.classList.remove('active');
                if (bottomHint) bottomHint.style.display = 'block';
                if (typeof broadcastGameState === 'function') broadcastGameState(true);
            }

            // Function to return to the very start of the game (หน้าแรกของจุดเริ่มต้นเกมทันที)
            function returnToStartHome() {
                if (sound) { sound.init(); sound.playClick(); }
                closeAllGameModals(true);

                // Hide overlays
                if (quizGameStageOverlay) quizGameStageOverlay.classList.remove('active');
                if (quizSelectOverlay) quizSelectOverlay.classList.remove('active');
                if (matchArenaOverlay) matchArenaOverlay.classList.remove('active');

                // Return to start home screen background and stage box
                if (mainStageImg) mainStageImg.src = 'assets/images/background.jpg';
                if (stageStartBox) stageStartBox.style.display = 'flex';
                if (bottomHint) bottomHint.style.display = 'block';

                // Hide action bars if visible
                const roundSummaryActionBar = document.getElementById('roundSummaryActionBar');
                if (roundSummaryActionBar) roundSummaryActionBar.classList.remove('active');
                const stealPhaseActionBar = document.getElementById('stealPhaseActionBar');
                if (stealPhaseActionBar) stealPhaseActionBar.classList.remove('active');

                // Reset scores & progress
                blueTeamScore = 0;
                orangeTeamScore = 0;
                currentBankScore = 0;
                bankScoreBeforeSteal = 0;
                currentMatchGameIndex = 1;
                if (completedMatchGames && typeof completedMatchGames.clear === 'function') {
                    completedMatchGames.clear();
                }
                hasAwardedThisRound = false;
                if (typeof window.resetStrikes === 'function') window.resetStrikes();
                if (typeof updateScoresDisplay === 'function') updateScoresDisplay();
                if (typeof updateAwardButtonsState === 'function') updateAwardButtonsState();
                if (typeof updateMatchGamesProgressBar === 'function') updateMatchGamesProgressBar();

                if (typeof broadcastGameState === 'function') broadcastGameState(true);
            }
            window.returnToStartHome = returnToStartHome;

            const btnRestartGameHome = document.getElementById('btnRestartGameHome');
            if (btnRestartGameHome) {
                btnRestartGameHome.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    returnToStartHome();
                });
            }

            if (btnBackIntro) {
                btnBackIntro.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeMatchArena();
                });
            }

            // Clicking "เริ่มการแข่งขัน" on the home stage floor opens the arena view
            if (startCompBtn) {
                startCompBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openMatchArena();
                });
            }

            // Top navigation "ทีมแข่งขัน" button also opens the arena view
            if (teamsBtn) {
                teamsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openMatchArena();
                });
            }

            // ปุ่มรีเซ็ตสถานะทีมตกรอบ
            if (btnResetEliminated) {
                btnResetEliminated.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const elimCount = getEliminatedTeamIds().size;
                    const winCount = getWinnerTeamIds().size;
                    if (elimCount === 0 && winCount === 0) {
                        showGameNotification('ไม่มีทีมที่อยู่ในสถานะตกรอบหรือชนะในขณะนี้', 'ℹ️');
                        return;
                    }
                    showGameConfirm(
                        'รีเซ็ตสถานะทีมแข่งขัน',
                        `ต้องการล้างสถานะทีมชนะ/ตกรอบทั้งหมด เพื่อให้ทุกทีมสามารถลงแข่งขันใหม่ได้ ใช่หรือไม่?`,
                        () => {
                            clearEliminatedTeamIds();
                            clearWinnerTeamIds();
                            renderTeamCards();
                            if (sound) sound.playWin();
                            showGameNotification('รีเซ็ตสถานะทีมแข่งขันทั้งหมดเรียบร้อยแล้ว ทุกทีมพร้อมแข่งขัน', '✓');
                        },
                        null,
                        '↺ ยืนยันรีเซ็ต',
                        'ยกเลิก',
                        '🏆'
                    );
                });
            }

            // Render selectable team cards in the two 50% columns (3 คอลัมน์ต่อฝั่ง กว้าง 33% ไม่มีปุ่มด้านล่าง)
            function renderTeamCards() {
                if (!gridTeamsLeft || !gridTeamsRight) return;
                ensureValidSelectedTeams();
                const liveTeams = getLiveTeamsList();
                const elimSet = getEliminatedTeamIds();
                const winSet = getWinnerTeamIds();

                // Render Left Column (50%) - การ์ดทีมฝั่งซ้าย (Blue Side) กว้าง 33%
                gridTeamsLeft.innerHTML = liveTeams.map(t => {
                    const isEliminated = elimSet.has(t.id);
                    const isWinner = winSet.has(t.id);
                    const isSelected = (t.id === selectedTeamALeft);
                    const isDisabled = (t.id === selectedTeamBRight) || isEliminated;
                    const cap = getCaptainInfo(t);
                    const avatarHtml = getCaptainAvatarHtml(cap, true);
                    return `
                        <button type="button" 
                                class="team-card-select-box side-blue ${isSelected ? 'is-selected-left' : ''} ${isDisabled ? 'is-disabled' : ''} ${isEliminated ? 'is-eliminated' : ''} ${isWinner ? 'is-winner-card' : ''}" 
                                onclick="selectTeamLeft('${t.id}')"
                                ${isDisabled ? `disabled title="${isEliminated ? 'ทีมนี้ตกรอบแล้ว' : 'ทีมนี้ถูกเลือกโดยทีมฝั่งขวาแล้ว'}"` : `title="คลิกเพื่อเลือก ${t.name}"`}>
                            ${isEliminated ? '<div class="badge-eliminated">ตกรอบ</div>' : (isWinner ? '<div class="badge-winner">ทีมชนะ</div>' : '')}
                            <div class="team-select-card-name">${t.name}</div>
                            <div class="team-select-card-avatar">
                                ${avatarHtml}
                            </div>
                            <div class="team-select-card-cap">👑 ${cap.name}</div>
                        </button>
                    `;
                }).join('');

                // Render Right Column (50%) - การ์ดทีมฝั่งขวา (Orange Side) กว้าง 33%
                gridTeamsRight.innerHTML = liveTeams.map(t => {
                    const isEliminated = elimSet.has(t.id);
                    const isWinner = winSet.has(t.id);
                    const isSelected = (t.id === selectedTeamBRight);
                    const isDisabled = (t.id === selectedTeamALeft) || isEliminated;
                    const cap = getCaptainInfo(t);
                    const avatarHtml = getCaptainAvatarHtml(cap, false);
                    return `
                        <button type="button" 
                                class="team-card-select-box side-orange ${isSelected ? 'is-selected-right' : ''} ${isDisabled ? 'is-disabled' : ''} ${isEliminated ? 'is-eliminated' : ''} ${isWinner ? 'is-winner-card' : ''}" 
                                onclick="selectTeamRight('${t.id}')"
                                ${isDisabled ? `disabled title="${isEliminated ? 'ทีมนี้ตกรอบแล้ว' : 'ทีมนี้ถูกเลือกโดยทีมฝั่งซ้ายแล้ว'}"` : `title="คลิกเพื่อเลือก ${t.name}"`}>
                            ${isEliminated ? '<div class="badge-eliminated">ตกรอบ</div>' : (isWinner ? '<div class="badge-winner">ทีมชนะ</div>' : '')}
                            <div class="team-select-card-name">${t.name}</div>
                            <div class="team-select-card-avatar">
                                ${avatarHtml}
                            </div>
                            <div class="team-select-card-cap">👑 ${cap.name}</div>
                        </button>
                    `;
                }).join('');

                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];

                if (spotlightTeamLeft && teamA) spotlightTeamLeft.textContent = teamA.name;
                if (spotlightTeamRight && teamB) spotlightTeamRight.textContent = teamB.name;

                // Update Captain Photo & Name for both teams!
                const capA = getCaptainInfo(teamA);
                const capB = getCaptainInfo(teamB);
                const capAvatarLeft = document.getElementById('spotlightCaptainAvatarLeft');
                const capNameLeft = document.getElementById('spotlightCaptainNameLeft');
                const capAvatarRight = document.getElementById('spotlightCaptainAvatarRight');
                const capNameRight = document.getElementById('spotlightCaptainNameRight');

                renderCaptainAvatarNode(capAvatarLeft, capA, true);
                if (capNameLeft) capNameLeft.textContent = capA.name;

                renderCaptainAvatarNode(capAvatarRight, capB, false);
                if (capNameRight) capNameRight.textContent = capB.name;

                if (arenaSummaryText && teamA && teamB) {
                    arenaSummaryText.innerHTML = `รอบ: <strong>${currentSelectedRound}</strong> • คู่แข่งขัน: <strong>${teamA.name} VS ${teamB.name}</strong>`;
                }
            }

            // Sync with state updates
            if (window.stateManager && typeof window.stateManager.subscribe === 'function') {
                window.stateManager.subscribe((msg) => {
                    if (msg.type === 'TEAMS_UPDATED' || msg.type === 'PARTICIPANTS_UPDATED' || msg.type === 'QUIZZES_UPDATED' || msg.type === 'PLAYERS_UPDATED') {
                        renderTeamCards();
                        if (quizSelectOverlay && quizSelectOverlay.classList.contains('active')) {
                            renderQuizCards();
                        }
                    }
                });
            }

            window.selectTeamLeft = function (id) {
                if (getEliminatedTeamIds().has(id)) return;
                if (id === selectedTeamBRight) return;
                selectedTeamALeft = id;
                if (sound) sound.playClick();
                renderTeamCards();
                if (typeof broadcastGameState === 'function') broadcastGameState();
            };

            window.selectTeamRight = function (id) {
                if (getEliminatedTeamIds().has(id)) return;
                if (id === selectedTeamALeft) return;
                selectedTeamBRight = id;
                if (sound) sound.playClick();
                renderTeamCards();
                if (typeof broadcastGameState === 'function') broadcastGameState();
            };

            // Round selector pills in Row 2
            if (roundPillsBar) {
                const roundButtons = roundPillsBar.querySelectorAll('.round-pill-btn');
                roundButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (sound) sound.playClick();
                        roundButtons.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        currentSelectedRound = btn.getAttribute('data-round');
                        renderTeamCards();
                    });
                });
            }

            // Navigation from Match Arena -> Quiz Selection Overlay
            function openQuizSelection() {
                closeAllGameModals();
                if (sound) { sound.init(); sound.playClick(); }
                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];

                // ตรวจสอบว่าเป็นการเปลี่ยนคู่แข่งขันใหม่หรือไม่
                const pairKey = (teamA ? teamA.id : '') + '_' + (teamB ? teamB.id : '');
                if (window._currentActivePairKey !== pairKey) {
                    window._currentActivePairKey = pairKey;
                    currentMatchGameIndex = 1;
                    completedMatchGames.clear();
                    blueTeamScore = 0;
                    orangeTeamScore = 0;
                }

                if (quizTeamA) quizTeamA.textContent = teamA.name;
                if (quizTeamB) quizTeamB.textContent = teamB.name;
                if (quizMatchSummary) {
                    const gameNumBadge = `<span class="quiz-game-num-badge">การแข่งขัน ครั้งที่ ${currentMatchGameIndex}/3</span>`;
                    const scoreText = (currentMatchGameIndex > 1) ? ` • คะแนนสะสม: <span style="color:#60a5fa; font-weight:600;">${blueTeamScore}</span> - <span style="color:#fb923c; font-weight:600;">${orangeTeamScore}</span>` : '';
                    quizMatchSummary.innerHTML = `รอบ: <strong>${currentSelectedRound}</strong> • คู่แข่งขัน: <span style="color:#60a5fa; font-weight:600;">${teamA.name}</span> VS <span style="color:#fb923c; font-weight:600;">${teamB.name}</span>${scoreText}${gameNumBadge}`;
                }

                // หากยังไม่เลือกหรือสุ่มคำถาม ให้ disabled ปุ่มเริ่มการแข่งขันไว้ก่อน
                selectedQuizId = null;
                if (btnStartQuizGame) btnStartQuizGame.disabled = true;

                if (matchArenaOverlay) matchArenaOverlay.classList.remove('active');
                if (quizSelectOverlay) quizSelectOverlay.classList.add('active');

                renderQuizCards();
                if (typeof broadcastGameState === 'function') broadcastGameState(true);
            }

            function backToTeamsSelection() {
                if (sound) { sound.init(); sound.playClick(); }
                if (quizSelectOverlay) quizSelectOverlay.classList.remove('active');
                if (matchArenaOverlay) matchArenaOverlay.classList.add('active');
                renderTeamCards();
                if (typeof broadcastGameState === 'function') broadcastGameState(true);
            }

            if (btnGoToQuizSelect) {
                btnGoToQuizSelect.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openQuizSelection();
                });
            }

            if (btnBackToTeams) {
                btnBackToTeams.addEventListener('click', (e) => {
                    e.stopPropagation();
                    backToTeamsSelection();
                });
            }

            // ========================================================
            // RANDOM TEAMS SELECTION (สุ่มเลือกทีมทั้งสองฝั่ง พร้อมสลับสีพื้นไปมา)
            // ========================================================
            let isRandomizingTeams = false;

            const teamRandomResultModal = document.getElementById('teamRandomResultModal');
            const closeTeamRandomResultBtn = document.getElementById('closeTeamRandomResultBtn');
            const btnTeamRandomClose = document.getElementById('btnTeamRandomClose');
            const btnTeamRandomGoQuiz = document.getElementById('btnTeamRandomGoQuiz');
            const teamRandomModalRoundTitle = document.getElementById('teamRandomModalRoundTitle');

            function showTeamRandomResultLightbox(teamA, teamB) {
                if (!teamRandomResultModal || !teamA || !teamB) return;

                if (teamRandomModalRoundTitle) {
                    teamRandomModalRoundTitle.textContent = currentSelectedRound || 'รอบการแข่งขัน';
                }

                const capA = getCaptainInfo(teamA);
                const capB = getCaptainInfo(teamB);

                const nameLeft = document.getElementById('teamRandomNameLeft');
                const capLeft = document.getElementById('teamRandomCapLeft');
                const avatarLeft = document.getElementById('teamRandomAvatarLeft');

                const nameRight = document.getElementById('teamRandomNameRight');
                const capRight = document.getElementById('teamRandomCapRight');
                const avatarRight = document.getElementById('teamRandomAvatarRight');

                if (nameLeft) nameLeft.textContent = teamA.name;
                if (capLeft) capLeft.textContent = `👑 ${capA.name}`;
                if (avatarLeft) renderCaptainAvatarNode(avatarLeft, capA, true);

                if (nameRight) nameRight.textContent = teamB.name;
                if (capRight) capRight.textContent = `👑 ${capB.name}`;
                if (avatarRight) renderCaptainAvatarNode(avatarRight, capB, false);

                teamRandomResultModal.classList.add('active');
            }

            function closeTeamRandomResultLightbox() {
                if (teamRandomResultModal) teamRandomResultModal.classList.remove('active');
            }

            if (closeTeamRandomResultBtn) closeTeamRandomResultBtn.addEventListener('click', closeTeamRandomResultLightbox);
            if (btnTeamRandomClose) btnTeamRandomClose.addEventListener('click', closeTeamRandomResultLightbox);
            if (btnTeamRandomGoQuiz) {
                btnTeamRandomGoQuiz.addEventListener('click', () => {
                    closeTeamRandomResultLightbox();
                    openQuizSelection();
                });
            }
            if (teamRandomResultModal) {
                teamRandomResultModal.addEventListener('click', (e) => {
                    if (e.target === teamRandomResultModal) closeTeamRandomResultLightbox();
                });
            }

            function randomizeTeamsMatch() {
                const liveTeams = getLiveTeamsList();
                const elimSet = getEliminatedTeamIds();
                const activeTeams = liveTeams.filter(t => !elimSet.has(t.id));

                if (activeTeams.length < 2) {
                    showGameNotification('ต้องมีทีมแข่งขันที่ยังไม่ตกรอบอย่างน้อย 2 ทีมขึ้นไปเพื่อทำการสุ่มคู่แข่งขัน', '⚠️');
                    return;
                }
                if (isRandomizingTeams) return;
                isRandomizingTeams = true;

                if (sound) sound.init();
                if (btnRandomTeams) btnRandomTeams.disabled = true;
                if (btnGoToQuizSelect) btnGoToQuizSelect.disabled = true;

                const leftCards = Array.from(gridTeamsLeft ? gridTeamsLeft.querySelectorAll('.team-card-select-box') : []);
                const rightCards = Array.from(gridTeamsRight ? gridTeamsRight.querySelectorAll('.team-card-select-box') : []);

                let step = 0;
                const totalSteps = 22 + Math.floor(Math.random() * 8); // 22-29 steps (~2 seconds)
                let delay = 55;

                function clearShuffleEffects() {
                    leftCards.forEach(c => {
                        c.classList.remove('is-shuffling-blue', 'is-shuffling-orange');
                    });
                    rightCards.forEach(c => {
                        c.classList.remove('is-shuffling-blue', 'is-shuffling-orange');
                    });
                }

                function nextTeamShuffle() {
                    clearShuffleEffects();

                    // สุ่มเลือก 2 ทีมจาก activeTeams ที่ยังไม่ตกรอบ
                    let idxA = Math.floor(Math.random() * activeTeams.length);
                    let idxB = Math.floor(Math.random() * activeTeams.length);
                    if (idxA === idxB) {
                        idxB = (idxA + 1 + Math.floor(Math.random() * (activeTeams.length - 1))) % activeTeams.length;
                    }

                    const tempTeamA = activeTeams[idxA];
                    const tempTeamB = activeTeams[idxB];
                    const cardIdxA = liveTeams.findIndex(t => t.id === tempTeamA.id);
                    const cardIdxB = liveTeams.findIndex(t => t.id === tempTeamB.id);

                    // Effect สลับสีพื้นไปมาของแต่ละฝั่ง (Alternate color highlighting)
                    const isEven = (step % 2 === 0);
                    if (cardIdxA >= 0 && leftCards[cardIdxA]) {
                        leftCards[cardIdxA].classList.add(isEven ? 'is-shuffling-blue' : 'is-shuffling-orange');
                    }
                    if (cardIdxB >= 0 && rightCards[cardIdxB]) {
                        rightCards[cardIdxB].classList.add(isEven ? 'is-shuffling-orange' : 'is-shuffling-blue');
                    }

                    // อัปเดต Spotlight ชั่วคราวระหว่างการสุ่ม
                    if (spotlightTeamLeft && tempTeamA) spotlightTeamLeft.textContent = tempTeamA.name;
                    if (spotlightTeamRight && tempTeamB) spotlightTeamRight.textContent = tempTeamB.name;
                    if (tempTeamA) {
                        const capA = getCaptainInfo(tempTeamA);
                        renderCaptainAvatarNode(document.getElementById('spotlightCaptainAvatarLeft'), capA, true);
                        const cnl = document.getElementById('spotlightCaptainNameLeft');
                        if (cnl) cnl.textContent = capA.name;
                    }
                    if (tempTeamB) {
                        const capB = getCaptainInfo(tempTeamB);
                        renderCaptainAvatarNode(document.getElementById('spotlightCaptainAvatarRight'), capB, false);
                        const cnr = document.getElementById('spotlightCaptainNameRight');
                        if (cnr) cnr.textContent = capB.name;
                    }

                    if (sound) sound.playClick();

                    step++;
                    if (step < totalSteps) {
                        // ค่อยๆ ชะลอความเร็ว (decelerate)
                        if (step > totalSteps - 10) {
                            delay += 25;
                        } else if (step > totalSteps - 5) {
                            delay += 40;
                        }
                        setTimeout(nextTeamShuffle, delay);
                    } else {
                        // สิ้นสุดการสุ่ม: ทำการเลือกทีมสุดท้าย (Final distinct selection from activeTeams)
                        clearShuffleEffects();

                        let finalIdxA = Math.floor(Math.random() * activeTeams.length);
                        let finalIdxB = (finalIdxA + 1 + Math.floor(Math.random() * (activeTeams.length - 1))) % activeTeams.length;

                        selectedTeamALeft = activeTeams[finalIdxA].id;
                        selectedTeamBRight = activeTeams[finalIdxB].id;

                        isRandomizingTeams = false;
                        if (btnRandomTeams) btnRandomTeams.disabled = false;
                        if (btnGoToQuizSelect) btnGoToQuizSelect.disabled = false;

                        renderTeamCards();
                        broadcastGameState();
                        if (sound) sound.playWin();

                        // แสดง Lightbox สรุปคู่แข่งขันที่สุ่มได้
                        showTeamRandomResultLightbox(activeTeams[finalIdxA], activeTeams[finalIdxB]);
                    }
                }

                nextTeamShuffle();
            }

            if (btnRandomTeams) {
                btnRandomTeams.addEventListener('click', (e) => {
                    e.stopPropagation();
                    randomizeTeamsMatch();
                });
            }

            // Render all Quiz Sets (from crsdg_quiz)
            function renderQuizCards() {
                if (!quizCardsGrid) return;
                const quizzes = window.stateManager ? window.stateManager.getQuizzes() : [];
                const usedSet = getUsedQuizIds();

                if (quizzes.length === 0) {
                    quizCardsGrid.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; color: rgba(255,255,255,0.7); padding: 40px; font-size: 1.1rem;">
                            ⚠️ ยังไม่มีชุดคำถามในระบบ กรุณาเพิ่มชุดคำถามในหน้า Admin ก่อน
                        </div>
                    `;
                    if (btnStartQuizGame) btnStartQuizGame.disabled = true;
                    return;
                }

                quizCardsGrid.innerHTML = quizzes.map((q, idx) => {
                    const isUsed = usedSet.has(q.id);
                    const isSelected = (q.id === selectedQuizId);
                    return `
                        <button type="button" 
                                class="quiz-card-btn ${isUsed ? 'is-used' : ''} ${isSelected ? 'is-selected' : ''}" 
                                data-quiz-id="${q.id}"
                                ${isUsed ? 'disabled title="ชุดคำถามนี้ถูกเลือกใช้แข่งขันไปแล้ว"' : 'title="คลิกเพื่อเลือกชุดคำถามนี้"'}
                                onclick="handleQuizCardClick('${q.id}')">
                            <div class="quiz-card-top">
                                <span class="quiz-badge-number">ชุดที่ ${idx + 1}</span>
                                <span class="quiz-status-badge ${isUsed ? 'status-used' : (isSelected ? 'status-selected' : 'status-available')}">
                                    ${isUsed ? '🔒 ถูกเลือกแล้ว' : (isSelected ? '✓ เลือกชุดนี้แล้ว' : 'พร้อมเลือก')}
                                </span>
                            </div>
                            ${q.category ? `<div class="quiz-card-category-sub">🏷️ ${q.category}</div>` : ''}
                            <div class="quiz-card-title">${q.title}</div>
                        </button>
                    `;
                }).join('');

                // หากยังไม่เลือกชุดคำถาม ให้ disabled ปุ่มเริ่มการแข่งขันไว้ก่อน
                if (btnStartQuizGame) {
                    btnStartQuizGame.disabled = !selectedQuizId || usedSet.has(selectedQuizId);
                }
            }

            window.handleQuizCardClick = function (quizId) {
                if (isRandomizing) return;
                const usedSet = getUsedQuizIds();
                if (usedSet.has(quizId)) return;
                selectedQuizId = quizId;
                if (sound) sound.playClick();
                renderQuizCards();
                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            };

            // Random Quiz Roulette Spinner with alternating highlight
            if (btnRandomQuiz) {
                btnRandomQuiz.addEventListener('click', (e) => {
                    e.stopPropagation();
                    randomizeQuiz();
                });
            }

            function randomizeQuiz() {
                const quizzes = window.stateManager ? window.stateManager.getQuizzes() : [];
                const usedSet = getUsedQuizIds();
                const available = quizzes.filter(q => !usedSet.has(q.id));

                if (available.length === 0) {
                    showGameConfirm(
                        'ชุดคำถามถูกเลือกใช้ครบแล้ว!',
                        'ชุดคำถามทั้งหมดถูกเลือกใช้ไปแล้วในการแข่งขัน\nต้องการรีเซ็ตคำถามทั้งหมดเพื่อเริ่มเลือกใหม่ตอนนี้เลยหรือไม่?',
                        () => {
                            clearUsedQuizIds();
                            selectedQuizId = null;
                            renderQuizCards();
                            if (sound) sound.playWin();
                        },
                        null,
                        '↺ รีเซ็ตคำถามทันที',
                        'ปิดหน้าต่าง',
                        '📋'
                    );
                    return;
                }

                if (isRandomizing) return;
                isRandomizing = true;
                btnRandomQuiz.disabled = true;
                if (btnStartQuizGame) btnStartQuizGame.disabled = true;

                // เมื่อมีการสุ่มใหม่ ให้ปรับสีพื้นที่สุ่มได้ก่อนหน้ากลับเป็นสีฟ้าเหมือนกล่องก่อนสุ่ม
                selectedQuizId = null;
                renderQuizCards();

                const availableCards = Array.from(document.querySelectorAll('.quiz-card-btn:not(.is-used)'));
                if (availableCards.length === 0) return;

                let lastIdx = -1;
                let step = 0;
                const totalSteps = 24 + Math.floor(Math.random() * 8); // 24-31 steps
                let delay = 50;
                let activeCard = null;

                function nextShuffle() {
                    availableCards.forEach(c => {
                        c.classList.remove('is-shuffling');
                        c.style.background = '';
                        c.style.borderColor = '';
                        c.style.boxShadow = '';
                    });

                    // ใช้วิธีการเลือกสลับไปมาไม่ต้องเรียงตามลำดับของชุดคำถาม
                    let pickIdx;
                    if (availableCards.length === 1) {
                        pickIdx = 0;
                    } else {
                        do {
                            pickIdx = Math.floor(Math.random() * availableCards.length);
                        } while (pickIdx === lastIdx);
                    }
                    lastIdx = pickIdx;

                    // กล่องที่กำลังถูกสุ่มถึงในจังหวะนั้นจะสว่างโดดเด่นด้วยแสงสีส้ม-ทอง
                    activeCard = availableCards[pickIdx];
                    activeCard.classList.add('is-shuffling');

                    if (sound) sound.playTick(1 + (step % 5) * 0.12);

                    step++;

                    if (step < totalSteps) {
                        if (step > totalSteps - 8) delay += 40;
                        else if (step > totalSteps - 4) delay += 80;
                        setTimeout(nextShuffle, delay);
                    } else {
                        // สุ่มเสร็จสิ้น: เลือกชุดคำถามนี้เป็นสีส้ม และเปิดใช้งานปุ่มเริ่มการแข่งขัน
                        const targetCard = activeCard;
                        const targetId = targetCard.getAttribute('data-quiz-id');
                        availableCards.forEach(c => {
                            c.classList.remove('is-shuffling');
                            c.style.background = '';
                            c.style.borderColor = '';
                            c.style.boxShadow = '';
                        });

                        selectedQuizId = targetId;
                        isRandomizing = false;
                        btnRandomQuiz.disabled = false;
                        renderQuizCards();
                        if (sound) sound.playWin();

                        // เมื่อสุ่มเลือกได้แล้วให้แสดง lightbox แสดงชื่อชุดคำถามที่สุ่มได้
                        showQuizResultLightbox(targetId);
                        if (typeof broadcastGameState === 'function') {
                            broadcastGameState();
                        }
                    }
                }

                nextShuffle();
            }

            // แสดง Lightbox ชุดคำถามที่สุ่มได้
            function showQuizResultLightbox(quizId) {
                const quizzes = window.stateManager ? window.stateManager.getQuizzes() : [];
                const foundIdx = quizzes.findIndex(q => q.id === quizId);
                const quiz = quizzes[foundIdx];
                if (!quiz || !quizResultModal) return;

                if (quizResultNumber) quizResultNumber.textContent = `ชุดที่ ${foundIdx >= 0 ? foundIdx + 1 : ''}`;
                const quizResultCategory = document.getElementById('quizResultCategory');
                if (quizResultCategory) {
                    if (quiz.category) {
                        quizResultCategory.textContent = `🏷️ ${quiz.category}`;
                        quizResultCategory.style.display = 'inline-flex';
                    } else {
                        quizResultCategory.style.display = 'none';
                    }
                }
                if (quizResultTitle) quizResultTitle.textContent = quiz.title;
                if (quizResultMeta) quizResultMeta.textContent = `📋 จำนวน ${(quiz.answers || []).length} คำตอบ`;

                quizResultModal.classList.add('active');
            }

            function closeQuizResultLightbox() {
                if (quizResultModal) quizResultModal.classList.remove('active');
            }

            if (btnQuizResultClose) btnQuizResultClose.addEventListener('click', closeQuizResultLightbox);
            if (closeQuizResultBtn) closeQuizResultBtn.addEventListener('click', closeQuizResultLightbox);
            if (btnQuizResultStart) {
                btnQuizResultStart.addEventListener('click', () => {
                    closeQuizResultLightbox();
                    launchQuizGameStage();
                    if (typeof broadcastGameState === 'function') {
                        broadcastGameState();
                    }
                });
            }
            if (quizResultModal) {
                quizResultModal.addEventListener('click', (e) => {
                    if (e.target === quizResultModal) {
                        closeQuizResultLightbox();
                    }
                });
            }

            if (btnResetUsedQuizzes) {
                btnResetUsedQuizzes.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showGameConfirm(
                        'ยืนยันการรีเซ็ตคำถาม',
                        'ต้องการรีเซ็ตสถานะคำถามที่ถูกเลือกแล้วทั้งหมด เพื่อเริ่มเลือกใหม่ ใช่หรือไม่?',
                        () => {
                            clearUsedQuizIds();
                            selectedQuizId = null;
                            renderQuizCards();
                            if (sound) sound.playClick();
                        },
                        null,
                        'ยืนยันรีเซ็ต',
                        'ยกเลิก',
                        '↺'
                    );
                });
            }

            // Launch Question Game Stage
            if (btnStartQuizGame) {
                btnStartQuizGame.addEventListener('click', (e) => {
                    e.stopPropagation();
                    launchQuizGameStage();
                    if (typeof broadcastGameState === 'function') {
                        broadcastGameState();
                    }
                });
            }

            function launchQuizGameStage() {
                if (!selectedQuizId) return;
                const quizzes = window.stateManager ? window.stateManager.getQuizzes() : [];
                currentActiveQuiz = quizzes.find(q => q.id === selectedQuizId);
                if (!currentActiveQuiz) return;

                // เรียงลำดับตัวเลือกคำตอบตามคะแนนจากมากไปน้อย เพื่อให้สัมพันธ์กับป้าย 1, 2, 3... บนกระดานแข่งขันเสมอ
                if (Array.isArray(currentActiveQuiz.answers)) {
                    currentActiveQuiz.answers.sort((a, b) => (parseInt(b.points, 10) || 0) - (parseInt(a.points, 10) || 0));
                }

                // Mark quiz as used
                saveUsedQuizId(selectedQuizId);

                // Save current match
                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                const matchConfig = {
                    round: currentSelectedRound,
                    teamA: teamA,
                    teamB: teamB,
                    quiz: currentActiveQuiz,
                    startedAt: new Date().toISOString()
                };
                localStorage.setItem('crsdg_current_match', JSON.stringify(matchConfig));

                // Switch overlay to question game stage
                if (quizSelectOverlay) quizSelectOverlay.classList.remove('active');
                if (quizGameStageOverlay) quizGameStageOverlay.classList.add('active');

                // Reset scores & strikes
                // ในแต่ละครั้งที่แข่งของแต่ละคู่ จะมีการเก็บสะสมคะแนนของการแข่งขันทั้ง 3 ครั้ง
                // รีเซ็ตคะแนนเป็น 0 เฉพาะเมื่อเริ่มครั้งที่ 1 ของคู่แข่งขันนี้
                if (currentMatchGameIndex === 1 && completedMatchGames.size === 0) {
                    blueTeamScore = 0;
                    orangeTeamScore = 0;
                }
                currentBankScore = 0;
                hasAwardedThisRound = false;
                pendingAwardSide = null;
                isStealPhase = false;
                stealingSide = null;
                pendingRoundResultInfo = null;
                pendingRoundActionCallback = null;
                initialTurnThisQuestion = null;
                currentActiveTurn = null;
                bankScoreBeforeSteal = 0;
                isStealProcessing = false;

                const cardBlueEl = document.getElementById('gameTeamCardBlue');
                const cardOrangeEl = document.getElementById('gameTeamCardOrange');
                if (cardBlueEl) cardBlueEl.classList.remove('turn-active', 'turn-inactive');
                if (cardOrangeEl) cardOrangeEl.classList.remove('turn-active', 'turn-inactive');
                const radioBlueEl = document.getElementById('turnRadioBlue');
                const radioOrangeEl = document.getElementById('turnRadioOrange');
                if (radioBlueEl) radioBlueEl.checked = false;
                if (radioOrangeEl) radioOrangeEl.checked = false;

                if (stealPhaseActionBar) stealPhaseActionBar.style.display = 'none';
                if (roundSummaryActionBar) roundSummaryActionBar.style.display = 'none';
                updateScoresDisplay();
                updateAwardButtonsState();
                window.resetStrikes();
                if (btnFinishMatch) btnFinishMatch.disabled = true;
                updateFinishMatchButtonState();
                updateMatchGamesProgressBar();

                // Setup header & teams
                if (gameStageRoundTitle) gameStageRoundTitle.textContent = currentSelectedRound;
                if (gameBlueTeamName) gameBlueTeamName.textContent = teamA.name;
                if (gameOrangeTeamName) gameOrangeTeamName.textContent = teamB.name;

                const capA = getCaptainInfo(teamA);
                const capB = getCaptainInfo(teamB);
                if (gameBlueCapName) gameBlueCapName.textContent = `👑 ${capA.name}`;
                if (gameOrangeCapName) gameOrangeCapName.textContent = `👑 ${capB.name}`;
                renderCaptainAvatarNode(gameBlueAvatar, capA, true);
                renderCaptainAvatarNode(gameOrangeAvatar, capB, false);

                // Setup question title
                const gameQuestionCategory = document.getElementById('gameQuestionCategory');
                if (gameQuestionCategory) {
                    if (currentActiveQuiz.category) {
                        gameQuestionCategory.textContent = `🏷️ ${currentActiveQuiz.category}`;
                        gameQuestionCategory.style.display = 'inline-flex';
                    } else {
                        gameQuestionCategory.style.display = 'none';
                    }
                }
                if (gameQuestionTitle) {
                    gameQuestionTitle.textContent = `${currentActiveQuiz.title}`;
                }

                // Render answer flip cards
                renderAnswerCards();

                // เมื่อได้ชุดคำถามแล้ว และคลิกเริ่มการแข่งขันทันที ให้เอา lightbox เลือกทีมที่ได้สิทธิ์ตอบคำถามออก ให้ไปที่หน้าเริ่มต้นการแข่งขันเลย โดยยังไม่ต้องเลือกทีม
                currentActiveTurn = null;
                initialTurnThisQuestion = null;
                closeTurnPickerModal();
                closeTurnAnnouncement();

                if (sound) sound.playClick();
                if (typeof broadcastGameState === 'function') broadcastGameState(true);
            }

            function renderAnswerCards() {
                if (!gameAnswersBoard || !currentActiveQuiz) return;
                // จัดเรียงตัวเลือกคำตอบตามลำดับคะแนนจากมากไปน้อย เพื่อให้สัมพันธ์กับป้ายที่ 1, 2, 3... เสมอ
                if (Array.isArray(currentActiveQuiz.answers)) {
                    currentActiveQuiz.answers.sort((a, b) => (parseInt(b.points, 10) || 0) - (parseInt(a.points, 10) || 0));
                }
                const answers = currentActiveQuiz.answers || [];

                gameAnswersBoard.innerHTML = answers.map((ans, idx) => `
                    <div class="answer-card-slot" id="ansSlot_${idx}" onclick="revealAnswer(${idx}, ${ans.points})">
                        <div class="answer-slot-inner">
                            <div class="answer-slot-front" title="คลิกเพื่อเปิดป้ายคำตอบที่ ${idx + 1}">
                                <span class="answer-slot-number">${idx + 1}</span>
                            </div>
                            <div class="answer-slot-back">
                                <span class="answer-text-content">${ans.text}</span>
                                <span class="answer-points-badge">${ans.points}</span>
                            </div>
                        </div>
                    </div>
                `).join('');

                hasAwardedThisRound = false;
                updateAwardButtonsState();
            }

            window.revealAnswer = function (idx, points) {
                const slot = document.getElementById(`ansSlot_${idx}`);
                if (!slot || slot.classList.contains('is-revealed')) return;

                // ตรวจสอบทีมที่เป็นผู้ตอบคำถาม (กรณีช่วงปกติ หรือช่วงโยน/ขโมยคะแนน)
                let answeringSide = isStealPhase ? (stealingSide || currentActiveTurn) : currentActiveTurn;
                if (!answeringSide && initialTurnThisQuestion) {
                    answeringSide = initialTurnThisQuestion;
                }

                slot.classList.add('is-revealed');
                if (answeringSide === 'blue') {
                    slot.classList.add('revealed-by-blue');
                    slot.classList.remove('revealed-by-red', 'revealed-by-orange', 'revealed-no-team', 'is-revealed-gray');
                } else if (answeringSide === 'orange' || answeringSide === 'red') {
                    slot.classList.add('revealed-by-red');
                    slot.classList.remove('revealed-by-blue', 'revealed-no-team', 'is-revealed-gray');
                } else {
                    // หากยังไม่มีการเลือกทีมแข่ง การคลิกที่ตัวเลือกให้ปรับกรอบให้เป็นสีเหลือง
                    slot.classList.add('revealed-no-team');
                    slot.classList.remove('revealed-by-blue', 'revealed-by-red', 'revealed-by-orange', 'is-revealed-gray');
                }
                
                let pts = parseInt(points, 10);
                if (isNaN(pts) || pts <= 0) {
                    if (currentActiveQuiz && currentActiveQuiz.answers && currentActiveQuiz.answers[idx]) {
                        pts = parseInt(currentActiveQuiz.answers[idx].points, 10) || 0;
                    }
                }

                // หากอยู่ในช่วงขโมยคะแนน (Steal Phase) แล้วทีมขโมยทายถูก 1 ข้อ ให้จบเกมครั้งนี้และขโมยคะแนนสำเร็จทันที
                // ผลคะแนนที่ได้ จะได้คะแนนรวมก่อนที่จะโยนมาให้ตอบ (ไม่บวกคะแนนของป้ายที่ขโมยเพิ่ม)
                if (isStealPhase) {
                    if (sound) sound.playWin();
                    handleStealSuccess();
                    if (typeof broadcastGameState === 'function') {
                        broadcastGameState();
                    }
                    return;
                }

                currentBankScore += (pts || 0);
                updateScoresDisplay();
                updateAwardButtonsState();
                if (sound) sound.playWin();

                // เมื่อทีมที่ได้สิทธิ์ในการตอบ สามารถตอบได้ครบทุกตัวเลือก (ตอบตัวเลือกสุดท้ายได้)
                // ให้ระบบหยุดรอเพื่อแจ้งผู้เข้าชมก่อน และมีปุ่มให้ดำเนินการต่อไป
                if (!hasAwardedThisRound) {
                    const allAnswerSlots = Array.from(document.querySelectorAll('.answer-card-slot'));
                    const unrevealedSlots = allAnswerSlots.filter(s => !s.classList.contains('is-revealed'));
                    if (allAnswerSlots.length > 0 && unrevealedSlots.length === 0) {
                        if (answeringSide) {
                            handleAllAnswersRevealedSuccess();
                            return;
                        }
                    }
                }

                // ส่งสัญญาณอัปเดตสถานะแบบ Real-time ไปยังรีโมตทันที
                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            };

            function handleAllAnswersRevealedSuccess() {
                if (hasAwardedThisRound) return;

                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                const winnerSide = currentActiveTurn || initialTurnThisQuestion || 'blue';
                const winnerTeam = (winnerSide === 'blue') ? teamA : teamB;
                const pointsWon = currentBankScore;

                // ได้รับคะแนนส่วนนี้ไปเลย
                if (winnerSide === 'blue') {
                    blueTeamScore += pointsWon;
                } else {
                    orangeTeamScore += pointsWon;
                }

                currentBankScore = 0;
                hasAwardedThisRound = true;
                completedMatchGames.add(currentMatchGameIndex);
                updateScoresDisplay();
                updateAwardButtonsState();
                updateMatchGamesProgressBar();

                if (btnFinishMatch) btnFinishMatch.disabled = false;
                updateFinishMatchButtonState();

                if (stealPhaseActionBar) stealPhaseActionBar.style.display = 'none';
                pendingRoundResultInfo = null;

                if (sound) sound.playWin();
                closeAllGameModals();

                // ตรวจสอบว่าเป็นการแข่งขันเกมสุดท้ายหรือไม่ (ครั้งที่ 3 ขึ้นไป)
                const isFinalGame = (currentMatchGameIndex >= 3);

                // ตั้ง callback สำหรับปุ่มกดเพื่อดำเนินการต่อไป (ก่อนเปิด Lightbox สรุปผล)
                pendingRoundActionCallback = () => {
                    if (roundSummaryActionBar) roundSummaryActionBar.style.display = 'none';
                    if (isFinalGame) {
                        // หากเป็นเกมสุดท้ายให้สรุปผลการแข่งขัน (Match Result Lightbox)
                        showMatchResultModal({
                            roundTitle: `${currentSelectedRound} (สะสมคะแนนครบ 3 ครั้ง)`,
                            teamA: teamA,
                            teamB: teamB,
                            scoreA: blueTeamScore,
                            scoreB: orangeTeamScore
                        });
                    } else {
                        // หากการแข่งขันยังต้องแข่งต่อให้สรุปผลคะแนนรวม (Intermission Lightbox)
                        showSingleGameResultLightbox({
                            winnerSide: winnerSide,
                            winnerTeam: winnerTeam,
                            reason: `🎯 ${winnerTeam ? winnerTeam.name : 'ทีมที่ตอบ'} ตอบถูกครบทุกตัวเลือก! (กวาดคะแนนทั้งหมด)`,
                            pointsWon: pointsWon
                        });
                    }
                    if (typeof broadcastGameState === 'function') {
                        broadcastGameState();
                    }
                };

                // ให้ระบบหยุดรอเพื่อแจ้งผู้เข้าชมก่อน โดยแสดงแถบข้อความและปุ่มกดเพื่อดำเนินการต่อไป
                if (roundSummaryActionBar) {
                    if (roundSummaryIcon) roundSummaryIcon.textContent = '🎉';
                    if (roundSummaryTxt) {
                        roundSummaryTxt.innerHTML = `🎉 <strong>${winnerTeam ? winnerTeam.name : 'ทีมแข่งขัน'}</strong> ตอบถูกตัวเลือกสุดท้ายครบทุกข้อ! ได้รับคะแนนสะสม <strong>${pointsWon}</strong> คะแนน`;
                    }
                    if (btnTriggerRoundSummary) {
                        btnTriggerRoundSummary.innerHTML = `<span>ดำเนินการต่อไป ❯</span>`;
                        btnTriggerRoundSummary.title = 'คลิกเพื่อดำเนินการสรุปผลการแข่งขันรอบนี้';
                    }
                    roundSummaryActionBar.style.display = 'flex';
                }

                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            }

            function updateScoresDisplay() {
                if (gameBlueScore) gameBlueScore.textContent = blueTeamScore;
                if (gameOrangeScore) gameOrangeScore.textContent = orangeTeamScore;
                if (gameBankScore) gameBankScore.textContent = currentBankScore;
            }

            // ========================================================
            // ฟังก์ชันเฉลยการ์ดคำตอบที่เหลือทั้งหมดโดยอัตโนมัติ (พร้อม animation & sound)
            // isGray: หากเป็น true จะเปิดเฉลยโดยให้สีพื้นเป็นสีเทา (.is-revealed-gray)
            // ========================================================
            function autoRevealRemainingCards(callback, isGray) {
                const unrevealed = Array.from(document.querySelectorAll('.answer-card-slot:not(.is-revealed)'));
                if (unrevealed.length === 0) {
                    if (typeof callback === 'function') callback();
                    return;
                }
                unrevealed.forEach((slot, i) => {
                    setTimeout(() => {
                        slot.classList.add('is-revealed');
                        if (isGray) {
                            slot.classList.add('is-revealed-gray');
                            slot.classList.remove('revealed-by-blue', 'revealed-by-red', 'revealed-by-orange');
                        }
                        if (sound) sound.playTick();
                        if (i === unrevealed.length - 1) {
                            setTimeout(() => {
                                if (typeof broadcastGameState === 'function') broadcastGameState();
                                if (typeof callback === 'function') callback();
                            }, 500);
                        }
                    }, (i + 1) * 250);
                });
            }

            // ========================================================
            // ขโมยคะแนนสำเร็จ (ทีมคู่แข่งขันตอบถูก 1 ตัวเลือก)
            // ========================================================
            function handleStealSuccess() {
                if (isStealProcessing) return;
                isStealProcessing = true;
                isStealPhase = false;
                if (stealPhaseActionBar) stealPhaseActionBar.style.display = 'none';

                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                const winnerSide = stealingSide || ((initialTurnThisQuestion === 'blue') ? 'orange' : 'blue');
                const winnerTeam = (winnerSide === 'blue') ? teamA : teamB;
                // ผลคะแนนที่ได้ จะได้คะแนนรวมก่อนที่จะโยนมาให้ตอบ
                const pointsWon = (bankScoreBeforeSteal > 0) ? bankScoreBeforeSteal : currentBankScore;

                if (sound && typeof sound.playWin === 'function') {
                    sound.playWin();
                }

                // แสดงแถบสรุปสถานะบนบอร์ดว่ากำลังเฉลย
                if (roundSummaryActionBar) {
                    if (roundSummaryIcon) roundSummaryIcon.textContent = '⚔️';
                    if (roundSummaryTxt) {
                        roundSummaryTxt.innerHTML = `⚔️ <strong>${winnerTeam ? winnerTeam.name : 'ทีมขโมย'}</strong> ขโมยคะแนนสำเร็จ! กำลังเฉลยคำตอบที่เหลือบนกระดาน...`;
                    }
                    roundSummaryActionBar.style.display = 'flex';
                }

                // ขั้นที่ 1: ให้แสดงเฉลยคำตอบที่เหลือบนกระดานแข่งขันให้หมดก่อน (สีปกติ)
                autoRevealRemainingCards(() => {
                    // ขั้นที่ 2: เมื่อเฉลยครบทุกข้อแล้ว หน่วงเวลา 900ms ให้ผู้เล่นและผู้ชมได้อ่านคำตอบบนกระดานทั้งหมด
                    setTimeout(() => {
                        // ขั้นที่ 3: โอนคะแนนสะสมก่อนโยนคำถาม ให้กับทีมที่ขโมยสำเร็จ
                        if (winnerSide === 'blue') {
                            blueTeamScore += pointsWon;
                        } else {
                            orangeTeamScore += pointsWon;
                        }
                        currentBankScore = 0;
                        bankScoreBeforeSteal = 0;
                        hasAwardedThisRound = true;
                        completedMatchGames.add(currentMatchGameIndex);
                        updateScoresDisplay();
                        updateAwardButtonsState();
                        updateMatchGamesProgressBar();

                        if (btnFinishMatch) btnFinishMatch.disabled = false;
                        updateFinishMatchButtonState();

                        if (sound && typeof sound.playWin === 'function') {
                            sound.playWin();
                        }

                        if (roundSummaryTxt) {
                            roundSummaryTxt.innerHTML = `⚔️ <strong>${winnerTeam ? winnerTeam.name : 'ทีมขโมย'}</strong> ขโมยคะแนนสำเร็จ! (+${pointsWon} คะแนน) — จบการแข่งขันครั้งนี้`;
                        }

                        // ขั้นที่ 4: แสดง Lightbox ได้รับคะแนน/สรุปผลการแข่งขันรอบนี้
                        const isFinalGame = (currentMatchGameIndex >= 3);
                        if (isFinalGame) {
                            showMatchResultModal({
                                roundTitle: `${currentSelectedRound} (สะสมคะแนนครบ 3 ครั้ง)`,
                                teamA: teamA,
                                teamB: teamB,
                                scoreA: blueTeamScore,
                                scoreB: orangeTeamScore
                            });
                        } else {
                            showSingleGameResultLightbox({
                                winnerSide: winnerSide,
                                winnerTeam: winnerTeam,
                                badgeText: `⚔️ ขโมยคะแนนสำเร็จ!`,
                                winnerTag: `⚔️ ทีมขโมยได้รับคะแนนสะสม (${winnerTeam ? winnerTeam.name : ''})`,
                                reason: `⚔️ ${winnerTeam ? winnerTeam.name : 'ทีมขโมย'} ทายคำตอบถูกต้อง — ได้รับคะแนนสะสมก่อนโยนคำถาม (+${pointsWon} คะแนน)!`,
                                pointsWon: pointsWon
                            });
                        }

                        isStealProcessing = false;
                        if (typeof broadcastGameState === 'function') {
                            broadcastGameState();
                        }
                    }, 900);
                }, false);
            }

            // ========================================================
            // ขโมยคะแนนไม่สำเร็จ (ทีมคู่แข่งขันตอบผิด -> ผู้ที่เป็นทีมที่เริ่มจะได้รับคะแนนสะสม)
            // ========================================================
            function handleStealFailed() {
                if (isStealProcessing) return;
                isStealProcessing = true;
                isStealPhase = false;
                if (stealPhaseActionBar) stealPhaseActionBar.style.display = 'none';

                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                const thiefSide = stealingSide || ((initialTurnThisQuestion === 'blue') ? 'orange' : 'blue');
                const thiefTeam = (thiefSide === 'blue') ? teamA : teamB;
                const winnerSide = initialTurnThisQuestion || ((thiefSide === 'blue') ? 'orange' : 'blue');
                const winnerTeam = (winnerSide === 'blue') ? teamA : teamB;
                // ผลคะแนนที่ได้ จะได้คะแนนรวมก่อนที่จะโยนมาให้ตอบ
                const pointsWon = (bankScoreBeforeSteal > 0) ? bankScoreBeforeSteal : currentBankScore;

                // ขั้นที่ 1: แสดง Lightbox กากบาท 1 รูป พร้อมเสียงออด
                showStrikeBuzzerLightbox(1, `ขโมยไม่สำเร็จ! (${thiefTeam ? thiefTeam.name : 'ทีมขโมย'} ตอบผิด ✕)`);

                if (roundSummaryActionBar) {
                    if (roundSummaryIcon) roundSummaryIcon.textContent = '🛡️';
                    if (roundSummaryTxt) {
                        roundSummaryTxt.innerHTML = `🛡️ ขโมยไม่สำเร็จ! กำลังเฉลยคำตอบที่เหลือบนกระดาน...`;
                    }
                    roundSummaryActionBar.style.display = 'flex';
                }

                // ขั้นที่ 2: รอให้ Lightbox กากบาท 1 รูป แสดงผล 1.5 วินาที แล้วปิดลง เพื่อเปิดกระดานให้เห็นเฉลย
                let revealExecuted = false;
                const executeRevealAndAward = () => {
                    if (revealExecuted) return;
                    revealExecuted = true;
                    closeStrikeBuzzerLightbox();

                    // ขั้นที่ 3: ให้แสดงเฉลยคำตอบที่เหลือบนกระดานแข่งขันก่อน (สีเทา .is-revealed-gray)
                    autoRevealRemainingCards(() => {
                        // ขั้นที่ 4: โอนคะแนนสะสมก่อนโยนคำถาม ไปหาทีมที่เป็นผู้เริ่มตอบ
                        if (winnerSide === 'blue') {
                            blueTeamScore += pointsWon;
                        } else {
                            orangeTeamScore += pointsWon;
                        }
                        currentBankScore = 0;
                        bankScoreBeforeSteal = 0;
                        hasAwardedThisRound = true;
                        completedMatchGames.add(currentMatchGameIndex);
                        updateScoresDisplay();
                        updateAwardButtonsState();
                        updateMatchGamesProgressBar();

                        if (btnFinishMatch) btnFinishMatch.disabled = false;
                        updateFinishMatchButtonState();

                        if (sound && typeof sound.playWin === 'function') {
                            sound.playWin();
                        }

                        // ขั้นที่ 5: ให้ระบบแสดงเฉลยบนกระดานก่อนเพื่อให้พิธีกรอธิบาย และแสดงปุ่มกดเพื่อดำเนินการสรุปผลต่อไป
                        const isFinalGame = (currentMatchGameIndex >= 3);
                        pendingRoundActionCallback = () => {
                            if (roundSummaryActionBar) roundSummaryActionBar.style.display = 'none';
                            if (isFinalGame) {
                                showMatchResultModal({
                                    roundTitle: `${currentSelectedRound} (สะสมคะแนนครบ 3 ครั้ง)`,
                                    teamA: teamA,
                                    teamB: teamB,
                                    scoreA: blueTeamScore,
                                    scoreB: orangeTeamScore
                                });
                            } else {
                                showSingleGameResultLightbox({
                                    winnerSide: winnerSide,
                                    winnerTeam: winnerTeam,
                                    badgeText: `🛡️ โอนคะแนนสะสมสำเร็จ!`,
                                    winnerTag: `🛡️ โอนคะแนนให้ทีมที่เริ่มตอบ (${winnerTeam ? winnerTeam.name : ''})`,
                                    reason: `🛡️ ${thiefTeam ? thiefTeam.name : 'ทีมขโมย'} ตอบผิด — โอนคะแนนสะสมก่อนโยนคำถาม (+${pointsWon} คะแนน) ให้กับ ${winnerTeam ? winnerTeam.name : 'ทีมที่เริ่ม'}!`,
                                    pointsWon: pointsWon
                                });
                            }
                            if (typeof broadcastGameState === 'function') {
                                broadcastGameState();
                            }
                        };

                        if (roundSummaryActionBar) {
                            if (roundSummaryIcon) roundSummaryIcon.textContent = '🛡️';
                            if (roundSummaryTxt) {
                                roundSummaryTxt.innerHTML = `🛡️ <strong>ขโมยไม่สำเร็จ!</strong> แสดงเฉลยคำตอบทั้งหมดแล้ว (สามารถอธิบายคำตอบก่อนได้ แล้วกดปุ่มเพื่อดำเนินการต่อ)`;
                            }
                            if (btnTriggerRoundSummary) {
                                btnTriggerRoundSummary.innerHTML = isFinalGame ? '🏆 สรุปผลการแข่งขันรอบนี้ ❯' : '📊 ดูผลคะแนน / ดำเนินการต่อ ❯';
                            }
                            roundSummaryActionBar.style.display = 'flex';
                        }

                        isStealProcessing = false;
                        if (typeof broadcastGameState === 'function') {
                            broadcastGameState();
                        }
                    }, true);
                };

                setTimeout(executeRevealAndAward, 1500);
            }

            // ========================================================
            // ฟังก์ชันจัดการความคืบหน้าการแข่งขัน 3 ครั้งในแต่ละรอบ
            // ========================================================
            function updateMatchGamesProgressBar() {
                const box1 = document.getElementById('matchGameBox1');
                const box2 = document.getElementById('matchGameBox2');
                const box3 = document.getElementById('matchGameBox3');
                const boxes = [box1, box2, box3];

                boxes.forEach((box, idx) => {
                    if (!box) return;
                    const gameNum = idx + 1;
                    box.className = 'match-game-box';
                    const dotSpan = box.querySelector('.match-game-dot');

                    if (completedMatchGames.has(gameNum)) {
                        // รอบที่แข่งแล้ว: สีพื้นเป็นสีเขียวแก่
                        box.classList.add('is-completed');
                        if (dotSpan) dotSpan.textContent = '✓';
                        box.title = `การแข่งขัน ครั้งที่ ${gameNum} (แข่งเสร็จแล้ว)`;
                    } else if (gameNum === currentMatchGameIndex) {
                        // รอบที่กำลังแข่งขัน: สีพื้นเป็นสีเขียว
                        box.classList.add('is-current');
                        if (dotSpan) dotSpan.textContent = '●';
                        box.title = `การแข่งขัน ครั้งที่ ${gameNum} (กำลังแข่งขัน)`;
                    } else {
                        // รอบที่ยังไม่แข่ง: สีพื้นเป็นสีเทา
                        box.classList.add('is-pending');
                        if (dotSpan) dotSpan.textContent = '○';
                        box.title = `การแข่งขัน ครั้งที่ ${gameNum} (ยังไม่ได้แข่ง)`;
                    }
                });
            }

            function updateFinishMatchButtonState() {
                if (!btnFinishMatch) return;
                if (pendingRoundResultInfo) {
                    btnFinishMatch.innerHTML = '<span>📊 สรุปผลรอบนี้ ❯</span>';
                    btnFinishMatch.title = 'คลิกเพื่อดูสรุปผลคะแนนรอบนี้';
                    return;
                }
                if (currentMatchGameIndex === 1) {
                    btnFinishMatch.innerHTML = '<span>🎲 สุ่มเลือกคำถามข้อต่อไป (ครั้งที่ 2) ❯</span>';
                    btnFinishMatch.title = hasAwardedThisRound ? 'จบครั้งที่ 1 และกลับไปสุ่มเลือกคำถามสำหรับการแข่งขัน ครั้งที่ 2' : 'มอบคะแนนให้ทีมใดทีมหนึ่งก่อนจบครั้งที่ 1';
                } else if (currentMatchGameIndex === 2) {
                    btnFinishMatch.innerHTML = '<span>🎲 สุ่มเลือกคำถามข้อต่อไป (ครั้งที่ 3) ❯</span>';
                    btnFinishMatch.title = hasAwardedThisRound ? 'จบครั้งที่ 2 และกลับไปสุ่มเลือกคำถามสำหรับการแข่งขัน ครั้งที่ 3' : 'มอบคะแนนให้ทีมใดทีมหนึ่งก่อนจบครั้งที่ 2';
                } else {
                    btnFinishMatch.innerHTML = '<span>🏆 สรุปผลการแข่งขัน / จบคู่นี้ ❯</span>';
                    btnFinishMatch.title = hasAwardedThisRound ? 'จบการแข่งขันครบทั้ง 3 ครั้ง และสรุปผลคะแนนสะสม' : 'มอบคะแนนให้ทีมใดทีมหนึ่งก่อนจบคู่นี้';
                }
            }

            function setMatchGame(gameNum) {
                if (gameNum < 1 || gameNum > 3) return;
                currentMatchGameIndex = gameNum;
                updateMatchGamesProgressBar();
                updateFinishMatchButtonState();
                if (sound) sound.playClick();
            }

            if (matchGameBox1) matchGameBox1.addEventListener('click', () => setMatchGame(1));
            if (matchGameBox2) matchGameBox2.addEventListener('click', () => setMatchGame(2));
            if (matchGameBox3) matchGameBox3.addEventListener('click', () => setMatchGame(3));

            // ========================================================
            // Lightbox แสดงทีมที่ชนะในแต่ละครั้ง และคะแนนสะสมของทั้ง 2 ทีม
            // ========================================================
            function showSingleGameResultLightbox(info) {
                if (!gameIntermissionModal) return;
                if (roundSummaryActionBar) roundSummaryActionBar.style.display = 'none';
                info = info || pendingRoundResultInfo || {};
                pendingRoundResultInfo = null;
                updateFinishMatchButtonState();
                const gameNum = currentMatchGameIndex;
                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];

                let winnerTeam = info.winnerTeam;
                if (!winnerTeam) {
                    if (info.winnerSide === 'blue') winnerTeam = teamA;
                    else if (info.winnerSide === 'orange') winnerTeam = teamB;
                    else winnerTeam = (blueTeamScore >= orangeTeamScore) ? teamA : teamB;
                }
                const pointsWon = (info.pointsWon !== undefined) ? info.pointsWon : 0;
                const reason = info.reason || (winnerTeam ? `🎉 ${winnerTeam.name} ได้รับคะแนนสะสมในครั้งนี้!` : 'จบการแข่งขันครั้งนี้แล้ว');

                const intermissionBadge = document.getElementById('intermissionBadge');
                const intermissionWinnerCard = document.getElementById('intermissionWinnerCard');
                const intermissionWinnerTag = document.getElementById('intermissionWinnerTag');
                const intermissionWinnerName = document.getElementById('intermissionWinnerName');
                const intermissionWinnerReason = document.getElementById('intermissionWinnerReason');
                const intermissionWinnerPoints = document.getElementById('intermissionWinnerPoints');
                const intermissionSubTitle = document.getElementById('intermissionSubTitle');
                const intermissionColLeft = document.getElementById('intermissionColLeft');
                const intermissionColRight = document.getElementById('intermissionColRight');
                const intermissionNameLeft = document.getElementById('intermissionNameLeft');
                const intermissionScoreLeft = document.getElementById('intermissionScoreLeft');
                const intermissionAvatarLeft = document.getElementById('intermissionAvatarLeft');
                const intermissionNameRight = document.getElementById('intermissionNameRight');
                const intermissionScoreRight = document.getElementById('intermissionScoreRight');
                const intermissionAvatarRight = document.getElementById('intermissionAvatarRight');
                const btnIntermissionNextGame = document.getElementById('btnIntermissionNextGame');

                if (intermissionBadge) {
                    intermissionBadge.textContent = info.badgeText || `🎉 จบการแข่งขัน ครั้งที่ ${gameNum} แล้ว!`;
                }
                if (intermissionWinnerTag) {
                    intermissionWinnerTag.textContent = info.winnerTag || `🏆 ทีมที่ชนะในการแข่งขัน ครั้งที่ ${gameNum}`;
                }
                if (intermissionWinnerName) {
                    intermissionWinnerName.textContent = winnerTeam ? winnerTeam.name : 'ทีมที่ชนะ';
                }
                if (intermissionWinnerReason) {
                    intermissionWinnerReason.textContent = reason;
                }
                if (intermissionWinnerPoints) {
                    intermissionWinnerPoints.textContent = `+${pointsWon} คะแนน`;
                }
                if (intermissionSubTitle) {
                    intermissionSubTitle.textContent = `สรุปคะแนนรวมสะสมของทั้ง 2 ทีม (แข่งขันทั้งหมด 3 ครั้ง)`;
                }

                if (intermissionNameLeft) intermissionNameLeft.textContent = teamA ? teamA.name : 'ทีมฝั่งซ้าย';
                if (intermissionScoreLeft) intermissionScoreLeft.textContent = blueTeamScore;
                if (intermissionAvatarLeft && teamA) {
                    renderCaptainAvatarNode(intermissionAvatarLeft, getCaptainInfo(teamA), true);
                }

                if (intermissionNameRight) intermissionNameRight.textContent = teamB ? teamB.name : 'ทีมฝั่งขวา';
                if (intermissionScoreRight) intermissionScoreRight.textContent = orangeTeamScore;
                if (intermissionAvatarRight && teamB) {
                    renderCaptainAvatarNode(intermissionAvatarRight, getCaptainInfo(teamB), false);
                }

                // ไฮไลต์กล่องทีมที่ชนะในรอบนี้
                if (intermissionColLeft && intermissionColRight) {
                    if (info.winnerSide === 'blue') {
                        intermissionColLeft.style.border = '2px solid #60a5fa';
                        intermissionColLeft.style.boxShadow = '0 0 18px rgba(59, 130, 246, 0.45)';
                        intermissionColRight.style.border = '1px solid rgba(255,255,255,0.12)';
                        intermissionColRight.style.boxShadow = 'none';
                    } else if (info.winnerSide === 'orange') {
                        intermissionColRight.style.border = '2px solid #f97316';
                        intermissionColRight.style.boxShadow = '0 0 18px rgba(249, 115, 22, 0.45)';
                        intermissionColLeft.style.border = '1px solid rgba(255,255,255,0.12)';
                        intermissionColLeft.style.boxShadow = 'none';
                    } else {
                        intermissionColLeft.style.border = '1px solid rgba(255,255,255,0.12)';
                        intermissionColLeft.style.boxShadow = 'none';
                        intermissionColRight.style.border = '1px solid rgba(255,255,255,0.12)';
                        intermissionColRight.style.boxShadow = 'none';
                    }
                }

                if (btnIntermissionNextGame) {
                    if (gameNum < 3) {
                        btnIntermissionNextGame.className = 'btn-quiz-modal-start';
                        btnIntermissionNextGame.innerHTML = `🎲 ไปสุ่มเลือกคำถามข้อต่อไป (ครั้งที่ ${gameNum + 1}) ❯`;
                    } else {
                        btnIntermissionNextGame.className = 'btn-quiz-modal-start btn-match-modal-winner';
                        btnIntermissionNextGame.innerHTML = `🏆 สรุปคะแนนรวมทั้งหมด (จบครบ 3 ครั้ง) ❯`;
                    }
                }

                gameIntermissionModal.classList.add('active');
                if (sound) sound.playWin();
                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            }

            function showIntermissionModal(finishedGameNum) {
                showSingleGameResultLightbox();
            }

            function closeIntermissionModal() {
                if (gameIntermissionModal) gameIntermissionModal.classList.remove('active');
            }

            function proceedFromIntermission() {
                closeIntermissionModal();
                closeAllGameModals();
                if (currentMatchGameIndex < 3) {
                    completedMatchGames.add(currentMatchGameIndex);
                    currentMatchGameIndex++;
                    if (sound) sound.playClick();
                    if (quizGameStageOverlay) quizGameStageOverlay.classList.remove('active');
                    if (quizSelectOverlay) quizSelectOverlay.classList.add('active');
                    openQuizSelection();
                    if (typeof broadcastGameState === 'function') {
                        broadcastGameState();
                    }
                } else {
                    const liveTeams = getLiveTeamsList();
                    const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                    const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                    showMatchResultModal({
                        roundTitle: `${currentSelectedRound} (สะสมคะแนนครบ 3 ครั้ง)`,
                        teamA: teamA,
                        teamB: teamB,
                        scoreA: blueTeamScore,
                        scoreB: orangeTeamScore
                    });
                    if (typeof broadcastGameState === 'function') {
                        broadcastGameState();
                    }
                }
            }

            if (closeIntermissionBtn) {
                closeIntermissionBtn.addEventListener('click', proceedFromIntermission);
            }
            if (btnIntermissionNextGame) {
                btnIntermissionNextGame.addEventListener('click', proceedFromIntermission);
            }
            if (gameIntermissionModal) {
                gameIntermissionModal.addEventListener('click', (e) => {
                    if (e.target === gameIntermissionModal) {
                        proceedFromIntermission();
                    }
                });
            }

            // ปุ่มกดสรุปผลรอบนี้ (กดก่อนที่จะแสดง lightbox สรุปผล)
            if (btnTriggerRoundSummary) {
                btnTriggerRoundSummary.addEventListener('click', () => {
                    if (roundSummaryActionBar) roundSummaryActionBar.style.display = 'none';
                    if (typeof pendingRoundActionCallback === 'function') {
                        const cb = pendingRoundActionCallback;
                        pendingRoundActionCallback = null;
                        cb();
                    } else if (pendingRoundResultInfo) {
                        showSingleGameResultLightbox(pendingRoundResultInfo);
                        pendingRoundResultInfo = null;
                    } else {
                        showSingleGameResultLightbox();
                    }
                    if (typeof broadcastGameState === 'function') {
                        broadcastGameState();
                    }
                });
            }

            window.adjustTeamScore = function (teamSide, delta) {
                if (teamSide === 'blue') {
                    blueTeamScore = Math.max(0, blueTeamScore + delta);
                } else {
                    orangeTeamScore = Math.max(0, orangeTeamScore + delta);
                }
                updateScoresDisplay();
                if (sound) sound.playClick();
            };

            if (btnBluePlus10) btnBluePlus10.addEventListener('click', () => window.adjustTeamScore('blue', 10));
            if (btnBlueMinus10) btnBlueMinus10.addEventListener('click', () => window.adjustTeamScore('blue', -10));
            if (btnOrangePlus10) btnOrangePlus10.addEventListener('click', () => window.adjustTeamScore('orange', 10));
            if (btnOrangeMinus10) btnOrangeMinus10.addEventListener('click', () => window.adjustTeamScore('orange', -10));

            // Award Bank Points (เปิด Lightbox เพื่อยืนยันการมอบคะแนนก่อนโอนคะแนนให้ทีมที่เลือก)
            if (btnAwardBlue) {
                btnAwardBlue.addEventListener('click', () => {
                    if (btnAwardBlue.disabled) return;
                    showAwardConfirmLightbox('blue');
                });
            }

            if (btnAwardOrange) {
                btnAwardOrange.addEventListener('click', () => {
                    if (btnAwardOrange.disabled) return;
                    showAwardConfirmLightbox('orange');
                });
            }

            // Reveal all answers (เฉลยคำตอบทั้งหมด เมื่อเฉลยครบทุกข้อแล้วจะเปิดใช้งานปุ่มมอบคะแนน)
            if (btnRevealAllAnswers) {
                btnRevealAllAnswers.addEventListener('click', () => {
                    const slots = Array.from(document.querySelectorAll('.answer-card-slot:not(.is-revealed)'));
                    if (slots.length === 0) {
                        updateAwardButtonsState();
                        return;
                    }
                    const activeSide = isStealPhase ? (stealingSide || currentActiveTurn) : currentActiveTurn;
                    slots.forEach((slot, i) => {
                        setTimeout(() => {
                            slot.classList.add('is-revealed');
                            if (activeSide === 'blue') {
                                slot.classList.add('revealed-by-blue');
                                slot.classList.remove('revealed-by-red', 'revealed-by-orange', 'revealed-no-team', 'is-revealed-gray');
                            } else if (activeSide === 'orange' || activeSide === 'red') {
                                slot.classList.add('revealed-by-red');
                                slot.classList.remove('revealed-by-blue', 'revealed-no-team', 'is-revealed-gray');
                            } else {
                                slot.classList.add('revealed-no-team');
                                slot.classList.remove('revealed-by-blue', 'revealed-by-red', 'revealed-by-orange', 'is-revealed-gray');
                            }
                            if (sound) sound.playTick();
                            if (i === slots.length - 1) {
                                updateAwardButtonsState();
                                if (typeof broadcastGameState === 'function') broadcastGameState();
                            }
                        }, i * 140);
                    });
                });
            }

            // Strike Buzzer Lightbox Functions
            function showStrikeBuzzerLightbox(strikeNum, customCaption) {
                if (!strikeBuzzerModal) return;
                const count = Math.max(1, Math.min(3, parseInt(strikeNum, 10) || 1));

                // สร้างรูปกากบาท ✕ ตามจำนวนครั้ง (1 รูป, 2 รูป หรือ 3 รูป)
                if (strikeIconsRow) {
                    strikeIconsRow.innerHTML = '';
                    for (let i = 0; i < count; i++) {
                        const x = document.createElement('div');
                        x.className = 'strike-huge-x-icon';
                        x.textContent = '✕';
                        strikeIconsRow.appendChild(x);
                    }
                }

                // ปรับ class ขนาดกล่องตามจำนวนกากบาท (strikes-1, strikes-2, strikes-3)
                if (strikeBuzzerBox) {
                    strikeBuzzerBox.classList.remove('strikes-1', 'strikes-2', 'strikes-3');
                    strikeBuzzerBox.classList.add(`strikes-${count}`);
                }

                if (strikeBuzzerCaption) {
                    if (customCaption) {
                        strikeBuzzerCaption.textContent = customCaption;
                    } else if (count === 1) {
                        strikeBuzzerCaption.textContent = 'คำตอบผิด! (✕)';
                    } else if (count === 2) {
                        strikeBuzzerCaption.textContent = 'คำตอบผิด! (✕ ✕)';
                    } else {
                        strikeBuzzerCaption.textContent = 'คำตอบผิดครบ 3 ครั้ง! (โยนสิทธิ์ให้ทีมคู่แข่ง)';
                    }
                }

                strikeBuzzerModal.classList.add('active');

                // มีเสียงออดตามจำนวนครั้ง
                if (count === 1) {
                    if (sound && typeof sound.playBuzzer === 'function') {
                        sound.playBuzzer();
                    }
                } else if (count === 2) {
                    if (sound && typeof sound.playBuzzerDouble === 'function') {
                        sound.playBuzzerDouble();
                    } else if (sound && typeof sound.playBuzzer === 'function') {
                        sound.playBuzzer();
                    }
                } else {
                    if (sound && typeof sound.playBuzzerTriple === 'function') {
                        sound.playBuzzerTriple();
                    } else if (sound && typeof sound.playBuzzerDouble === 'function') {
                        sound.playBuzzerDouble();
                    } else if (sound && typeof sound.playBuzzer === 'function') {
                        sound.playBuzzer();
                    }
                }

                // แสดงผล 1.5 วินาที (หากเป็น 3 ครั้งให้แสดง 2.4 วินาที) แล้วปิด lightbox
                if (strikeBuzzerTimer) clearTimeout(strikeBuzzerTimer);
                const displayMs = (count === 3) ? 2400 : 1500;
                strikeBuzzerTimer = setTimeout(() => {
                    closeStrikeBuzzerLightbox();
                }, displayMs);
            }

            function closeStrikeBuzzerLightbox() {
                if (strikeBuzzerTimer) {
                    clearTimeout(strikeBuzzerTimer);
                    strikeBuzzerTimer = null;
                }
                if (strikeBuzzerModal) strikeBuzzerModal.classList.remove('active');

                // เมื่อตอบผิดครบทั้ง 3 ครั้ง ให้แสดง Lightbox แจ้งทีมคู่แข่งขันได้สิทธิ์ตอบคำถาม (1 คำตอบที่จะได้คะแนนทั้งหมด)
                const struckCount = strikeBtns.filter(b => b && b.classList.contains('is-struck')).length;
                if (struckCount === 3 && pendingStealTurnSide) {
                    const nextSide = pendingStealTurnSide;
                    pendingStealTurnSide = null;
                    showStealTurnLightbox(nextSide);
                }
            }

            if (strikeBuzzerModal) {
                strikeBuzzerModal.addEventListener('click', () => {
                    closeStrikeBuzzerLightbox();
                });
            }

            // Strikes logic
            window.toggleStrike = function (strikeNum) {
                // หากอยู่ในช่วงขโมยคะแนน (Steal Phase) แล้วทีมขโมยทายผิด ให้จบเกมครั้งนี้และขโมยไม่สำเร็จทันที
                if (isStealPhase) {
                    handleStealFailed();
                    return;
                }

                const btn = strikeBtns[strikeNum - 1];
                if (!btn) return;
                const isStruck = btn.classList.contains('is-struck');
                if (isStruck) {
                    btn.classList.remove('is-struck');
                    pendingStealTurnSide = null;
                } else {
                    btn.classList.add('is-struck');

                    // หากมีการกดกากบาท 3 ครั้งให้ radio ย้ายไปที่อีกข้างเพื่อตอบคำถาม และเตรียมแสดง Lightbox
                    const struckCount = strikeBtns.filter(b => b && b.classList.contains('is-struck')).length;
                    if (struckCount === 3) {
                        const nextTurn = (initialTurnThisQuestion === 'blue') ? 'orange' : 'blue';
                        pendingStealTurnSide = nextTurn;
                        bankScoreBeforeSteal = currentBankScore;
                        window.setActiveCompetingTurn(nextTurn);
                    } else {
                        pendingStealTurnSide = null;
                    }

                    showStrikeBuzzerLightbox(strikeNum);
                }
            };

            window.resetStrikes = function () {
                pendingStealTurnSide = null;
                bankScoreBeforeSteal = 0;
                isStealProcessing = false;
                strikeBtns.forEach(btn => {
                    if (btn) btn.classList.remove('is-struck');
                });
                closeStrikeBuzzerLightbox();
                closeStealTurnModal();
            };

            strikeBtns.forEach((btn, idx) => {
                if (btn) {
                    btn.addEventListener('click', () => window.toggleStrike(idx + 1));
                }
            });

            // Active Competing Turn (Radio เลือกทีมที่กำลังแข่งขัน ซ้าย / ขวา)
            let currentActiveTurn = 'blue';
            window.setActiveCompetingTurn = function (side) {
                currentActiveTurn = side;
                if (!initialTurnThisQuestion) {
                    initialTurnThisQuestion = side;
                }
                const turnRadioBlue = document.getElementById('turnRadioBlue');
                const turnRadioOrange = document.getElementById('turnRadioOrange');
                const cardBlue = document.getElementById('gameTeamCardBlue');
                const cardOrange = document.getElementById('gameTeamCardOrange');

                if (turnRadioBlue) turnRadioBlue.checked = (side === 'blue');
                if (turnRadioOrange) turnRadioOrange.checked = (side === 'orange');

                if (cardBlue && cardOrange) {
                    if (side === 'blue') {
                        cardBlue.classList.add('turn-active');
                        cardBlue.classList.remove('turn-inactive');
                        cardOrange.classList.add('turn-inactive');
                        cardOrange.classList.remove('turn-active');
                    } else {
                        cardOrange.classList.add('turn-active');
                        cardOrange.classList.remove('turn-inactive');
                        cardBlue.classList.add('turn-inactive');
                        cardBlue.classList.remove('turn-active');
                    }
                }

                // สีกรอบของตัวเลือกที่เคยเปิดไว้ก่อนเลือกทีมแข่ง (กรอบสีเหลือง) จะเปลี่ยนเป็นสีของทีมที่เลือกทันที
                const yellowSlots = document.querySelectorAll('.answer-card-slot.revealed-no-team, .answer-card-slot.revealed-by-yellow');
                yellowSlots.forEach(slot => {
                    slot.classList.remove('revealed-no-team', 'revealed-by-yellow');
                    if (side === 'blue') {
                        slot.classList.add('revealed-by-blue');
                        slot.classList.remove('revealed-by-red', 'revealed-by-orange');
                    } else {
                        slot.classList.add('revealed-by-red');
                        slot.classList.remove('revealed-by-blue');
                    }
                });

                // หากเปิดครบทุกตัวเลือกแล้ว และเพิ่งเลือกทีม ให้ทำการสรุปผลพร้อมหยุดรอแจ้งผู้เข้าชม
                if (!hasAwardedThisRound) {
                    const allAnswerSlots = Array.from(document.querySelectorAll('.answer-card-slot'));
                    const unrevealedSlots = allAnswerSlots.filter(s => !s.classList.contains('is-revealed'));
                    if (allAnswerSlots.length > 0 && unrevealedSlots.length === 0) {
                        handleAllAnswersRevealedSuccess();
                    }
                }

                if (typeof broadcastGameState === 'function') {
                    broadcastGameState();
                }
            };

            const turnRadioBlue = document.getElementById('turnRadioBlue');
            const turnRadioOrange = document.getElementById('turnRadioOrange');
            if (turnRadioBlue) {
                turnRadioBlue.addEventListener('change', () => {
                    if (turnRadioBlue.checked) {
                        window.setActiveCompetingTurn('blue');
                        if (sound) sound.playClick();
                    }
                });
            }
            if (turnRadioOrange) {
                turnRadioOrange.addEventListener('change', () => {
                    if (turnRadioOrange.checked) {
                        window.setActiveCompetingTurn('orange');
                        if (sound) sound.playClick();
                    }
                });
            }

            const cardBlueEl = document.getElementById('gameTeamCardBlue');
            const cardOrangeEl = document.getElementById('gameTeamCardOrange');
            if (cardBlueEl) {
                cardBlueEl.addEventListener('click', () => {
                    window.setActiveCompetingTurn('blue');
                    if (sound) sound.playClick();
                });
            }
            if (cardOrangeEl) {
                cardOrangeEl.addEventListener('click', () => {
                    window.setActiveCompetingTurn('orange');
                    if (sound) sound.playClick();
                });
            }

            // Back from Quiz Game Stage to Quiz Selection
            if (btnBackToQuizSelect) {
                btnBackToQuizSelect.addEventListener('click', () => {
                    closeAllGameModals();
                    if (sound) sound.playClick();
                    if (quizGameStageOverlay) quizGameStageOverlay.classList.remove('active');
                    if (quizSelectOverlay) quizSelectOverlay.classList.add('active');
                    openQuizSelection();
                    if (typeof broadcastGameState === 'function') broadcastGameState();
                });
            }

            // Finish Match / Next Game in Match (แข่ง 3 ครั้งในแต่ละรอบ สะสมคะแนน)
            if (btnFinishMatch) {
                btnFinishMatch.addEventListener('click', () => {
                    // หากมี callback หรือผลการแข่งขันที่รอให้กดปุ่มสรุปผลรอบนี้ ให้เปิด lightbox สรุปผลก่อน
                    if (typeof pendingRoundActionCallback === 'function') {
                        if (roundSummaryActionBar) roundSummaryActionBar.style.display = 'none';
                        const cb = pendingRoundActionCallback;
                        pendingRoundActionCallback = null;
                        cb();
                        return;
                    }
                    if (pendingRoundResultInfo) {
                        if (roundSummaryActionBar) roundSummaryActionBar.style.display = 'none';
                        showSingleGameResultLightbox(pendingRoundResultInfo);
                        pendingRoundResultInfo = null;
                        return;
                    }

                    const liveTeams = getLiveTeamsList();
                    const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                    const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];

                    if (currentMatchGameIndex < 3) {
                        // เมื่อการแข่งขันจบในแต่ละครั้ง ระบบจะต้องกลับมาหน้าสุ่มเลือกคำถามข้อต่อไป ก่อนที่จะไปการแข่งขันครั้งที่ 2 และครั้งที่ 3
                        completedMatchGames.add(currentMatchGameIndex);
                        currentMatchGameIndex++;
                        if (sound) sound.playClick();
                        if (quizGameStageOverlay) quizGameStageOverlay.classList.remove('active');
                        if (quizSelectOverlay) quizSelectOverlay.classList.add('active');
                        openQuizSelection();
                    } else {
                        // เมื่อแข่งขันครบแล้วทั้ง 3 ครั้ง และมีการให้คะแนนทีมที่ชนะครั้งที่ 3 แล้ว ให้ระบบแสดง lightbox สรุปผลการแข่งขัน
                        completedMatchGames.add(3);
                        updateMatchGamesProgressBar();
                        showMatchResultModal({
                            roundTitle: `${currentSelectedRound} (สะสมคะแนนครบ 3 ครั้ง)`,
                            teamA: teamA,
                            teamB: teamB,
                            scoreA: blueTeamScore,
                            scoreB: orangeTeamScore
                        });
                    }
                });
            }

            // Leaderboard Modal
            function openLeaderboard() {
                if (sound) { sound.init(); sound.playClick(); }
                leaderboardModal.classList.add('active');
            }
            function closeLeaderboard() {
                leaderboardModal.classList.remove('active');
            }
            if (leaderboardBtn) leaderboardBtn.addEventListener('click', openLeaderboard);
            if (closeLeaderboardBtn) closeLeaderboardBtn.addEventListener('click', closeLeaderboard);

            // Close modals when clicking outside
            if (leaderboardModal) {
                leaderboardModal.addEventListener('click', (e) => {
                    if (e.target === leaderboardModal) {
                        leaderboardModal.classList.remove('active');
                    }
                });
            }

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' || e.code === 'Enter') {
                    if (quizGameStageOverlay && quizGameStageOverlay.classList.contains('active')) {
                        // In game stage
                    } else if (quizSelectOverlay && quizSelectOverlay.classList.contains('active')) {
                        if (selectedQuizId && btnStartQuizGame && !btnStartQuizGame.disabled) {
                            e.preventDefault();
                            launchQuizGameStage();
                        }
                    } else if (matchArenaOverlay && matchArenaOverlay.classList.contains('active')) {
                        e.preventDefault();
                        openQuizSelection();
                    } else if (leaderboardModal && !leaderboardModal.classList.contains('active')) {
                        e.preventDefault();
                        openMatchArena();
                    }
                } else if (e.key === 'f' || e.key === 'F') {
                    toggleFullscreen();
                } else if (e.key === 'm' || e.key === 'M') {
                    toggleSound();
                } else if (e.key === 'Escape') {
                    if (stealTurnModal && stealTurnModal.classList.contains('active')) {
                        closeStealTurnModal();
                        return;
                    }
                    if (awardConfirmModal && awardConfirmModal.classList.contains('active')) {
                        closeAwardConfirmLightbox();
                        return;
                    }
                    if (turnPickerModal && turnPickerModal.classList.contains('active')) {
                        if (!currentActiveTurn) window.setActiveCompetingTurn('blue');
                        closeTurnPickerModal();
                        return;
                    }
                    closeLeaderboard();
                    closeQuizResultLightbox();
                    closeStrikeBuzzerLightbox();
                    closeMatchResultModal();
                    closeGameDialog();
                    closeAwardScoreLightbox();
                    if (quizGameStageOverlay && quizGameStageOverlay.classList.contains('active')) {
                        quizGameStageOverlay.classList.remove('active');
                        quizSelectOverlay.classList.add('active');
                        renderQuizCards();
                    } else if (quizSelectOverlay && quizSelectOverlay.classList.contains('active')) {
                        quizSelectOverlay.classList.remove('active');
                        matchArenaOverlay.classList.add('active');
                        renderTeamCards();
                    } else if (matchArenaOverlay && matchArenaOverlay.classList.contains('active')) {
                        closeMatchArena();
                    }
                }
            });

            // Toggle Fullscreen logic
            function toggleFullscreen() {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.warn('Fullscreen request failed:', err);
                    });
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    }
                }
            }

            function updateFullscreenUI() {
                if (!fullscreenBtn) return;
                if (document.fullscreenElement) {
                    fullscreenText.textContent = 'ย่อจอ';
                    fullscreenIcon.innerHTML = `<path d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7M14 20v-6m0 0h6m-6 0l7 7M10 4v6m0 0H4m0 0l7-7"/>`;
                } else {
                    fullscreenText.textContent = 'เต็มจอ';
                    fullscreenIcon.innerHTML = `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>`;
                }
            }

            if (fullscreenBtn) {
                fullscreenBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFullscreen();
                });
            }

            document.addEventListener('fullscreenchange', () => {
                updateFullscreenUI();
                broadcastGameState();
            });

            // ========================================================
            // CRSDG REMOTE CONTROLLER SYNC BRIDGE (remote_crsdg.html)
            // ========================================================
            const remoteGameChannel = (typeof window.BroadcastChannel !== 'undefined') ? new BroadcastChannel('crsdg_game_channel') : null;

            function getFullGameState() {
                const liveTeams = getLiveTeamsList();
                const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0] || null;
                const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1] || null;

                let stage = 'home';
                if (quizGameStageOverlay && quizGameStageOverlay.classList.contains('active')) {
                    stage = 'game';
                } else if (quizSelectOverlay && quizSelectOverlay.classList.contains('active')) {
                    stage = 'quiz_select';
                } else if (matchArenaOverlay && matchArenaOverlay.classList.contains('active')) {
                    stage = 'arena';
                }

                const answersState = [];
                let totalQuizPoints = 0;
                let revealedAnswersCount = 0;
                if (currentActiveQuiz && currentActiveQuiz.answers) {
                    if (Array.isArray(currentActiveQuiz.answers)) {
                        currentActiveQuiz.answers.sort((a, b) => (parseInt(b.points, 10) || 0) - (parseInt(a.points, 10) || 0));
                    }
                    currentActiveQuiz.answers.forEach((ans, idx) => {
                        const slot = document.getElementById(`ansSlot_${idx}`);
                        const isRevealed = slot ? slot.classList.contains('is-revealed') : false;
                        const isGray = slot ? slot.classList.contains('is-revealed-gray') : false;
                        const teamSide = slot ? (slot.classList.contains('revealed-by-red') ? 'orange' : (slot.classList.contains('revealed-by-blue') ? 'blue' : null)) : null;
                        const pts = parseInt(ans.points, 10) || 0;
                        totalQuizPoints += pts;
                        if (isRevealed) revealedAnswersCount++;

                        answersState.push({
                            index: idx,
                            slotNumber: idx + 1,
                            rank: idx + 1,
                            text: ans.text,
                            points: pts,
                            isRevealed: isRevealed,
                            isGray: isGray,
                            teamSide: teamSide
                        });
                    });
                }

                const strikes = strikeBtns.map(btn => btn ? btn.classList.contains('is-struck') : false);
                const quizzes = window.stateManager ? window.stateManager.getQuizzes() : [];
                const usedQuizIds = Array.from(getUsedQuizIds());

                return {
                    stage: stage,
                    roundTitle: currentSelectedRound,
                    gameIndex: currentMatchGameIndex,
                    completedGames: Array.from(completedMatchGames),
                    selectedTeamALeft: selectedTeamALeft,
                    selectedTeamBRight: selectedTeamBRight,
                    teamA: teamA,
                    teamB: teamB,
                    allTeams: liveTeams,
                    eliminatedTeamIds: Array.from(getEliminatedTeamIds()),
                    winnerTeamIds: Array.from(getWinnerTeamIds()),
                    activeTurn: currentActiveTurn,
                    initialTurn: initialTurnThisQuestion,
                    blueScore: blueTeamScore,
                    orangeScore: orangeTeamScore,
                    bankScore: currentBankScore,
                    currentQuiz: currentActiveQuiz,
                    answers: answersState,
                    totalQuizPoints: totalQuizPoints,
                    revealedAnswersCount: revealedAnswersCount,
                    totalAnswersCount: answersState.length,
                    allQuizzes: quizzes,
                    usedQuizIds: usedQuizIds,
                    selectedQuizId: selectedQuizId,
                    strikes: strikes,
                    isStealPhase: isStealPhase,
                    stealingSide: stealingSide,
                    hasAwardedThisRound: hasAwardedThisRound,
                    pendingRoundResult: (pendingRoundResultInfo !== null || pendingRoundActionCallback !== null),
                    isGameStarted: (stage !== 'home' && stage !== 'intro'),
                    soundMuted: sound ? sound.isMuted() : false,
                    isFullscreen: !!document.fullscreenElement,
                    modals: {
                        turnPicker: turnPickerModal ? turnPickerModal.classList.contains('active') : false,
                        strikeBuzzer: strikeBuzzerModal ? strikeBuzzerModal.classList.contains('active') : false,
                        stealTurn: stealTurnModal ? stealTurnModal.classList.contains('active') : false,
                        awardConfirm: awardConfirmModal ? awardConfirmModal.classList.contains('active') : false,
                        intermission: gameIntermissionModal ? gameIntermissionModal.classList.contains('active') : false,
                        matchResult: matchResultModal ? matchResultModal.classList.contains('active') : false,
                        teamRandomResult: teamRandomResultModal ? teamRandomResultModal.classList.contains('active') : false,
                        roundSummaryBar: roundSummaryActionBar ? (roundSummaryActionBar.style.display !== 'none') : false
                    },
                    timestamp: Date.now()
                };
            }

            // Helper: ตรวจสอบว่าควรเปิดใช้งาน Network API (/api/...) หรือไม่
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

            let lastBroadcastStateSig = '';

            function broadcastGameState(forceCloud = false) {
                try {
                    const state = getFullGameState();
                    state.broadcastTime = Date.now();
                    if (remoteGameChannel) {
                        remoteGameChannel.postMessage({ type: 'GAME_STATE_UPDATE', state: state });
                    }
                    try {
                        localStorage.setItem('crsdg_game_state_sync', JSON.stringify(state));
                    } catch (e) {}

                    // Cloud Firestore Real-time Sync (Push game state to remote_crsdg across devices)
                    try {
                        const stateSig = `${state.stage}_${state.activeTurn}_${state.blueScore}_${state.orangeScore}_${state.bankScore}_${state.revealedAnswersCount}_${JSON.stringify(state.strikes)}_${state.isStealPhase}_${state.selectedQuizId}_${state.selectedTeamALeft}_${state.selectedTeamBRight}_${JSON.stringify(state.modals)}`;
                        if (forceCloud || stateSig !== lastBroadcastStateSig) {
                            lastBroadcastStateSig = stateSig;
                            const clean = JSON.parse(JSON.stringify(state));
                            delete clean.allQuizzes;
                            delete clean.allTeams;
                            clean.isClosed = false;
                            clean.timestamp = Date.now();
                            clean.broadcastTime = Date.now();

                            if (window.FirebaseSync && typeof window.FirebaseSync.saveVoteSettings === 'function') {
                                window.FirebaseSync.saveVoteSettings({
                                    game_state_sync: clean
                                }).catch(() => {});
                            } else if (typeof firebase !== 'undefined' && firebase.firestore) {
                                firebase.firestore().collection('crsdg_vote').doc('settings').set({
                                    game_state_sync: clean
                                }, { merge: true }).catch(() => {});
                            }
                        }
                    } catch (syncErr) {
                        console.warn('[Game] Cloud broadcast state error:', syncErr);
                    }

                    // Optional Network Sync Fallback (สำหรับกรณีมี backend server เฉพาะ)
                    if (window.__USE_LOCAL_API_SERVER__ && isNetworkSyncEnabled()) {
                        fetch('/api/game-state', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(state)
                        }).catch(() => {});
                    }
                } catch (e) {
                    console.warn('Error broadcasting game state:', e);
                }
            }
            window.broadcastGameState = broadcastGameState;

            function closeAllGameModals(includeAnnounce = false) {
                try {
                    document.querySelectorAll('.modal-overlay.active').forEach(m => {
                        if (!includeAnnounce && m.id === 'turnAnnounceModal') return;
                        m.classList.remove('active');
                    });
                    if (includeAnnounce) {
                        if (typeof turnAnnounceModal !== 'undefined' && turnAnnounceModal) turnAnnounceModal.classList.remove('active');
                    }
                    if (typeof teamRandomResultModal !== 'undefined' && teamRandomResultModal) teamRandomResultModal.classList.remove('active');
                    if (typeof turnPickerModal !== 'undefined' && turnPickerModal) turnPickerModal.classList.remove('active');
                    if (typeof strikeBuzzerModal !== 'undefined' && strikeBuzzerModal) strikeBuzzerModal.classList.remove('active');
                    if (typeof stealTurnModal !== 'undefined' && stealTurnModal) stealTurnModal.classList.remove('active');
                    if (typeof awardConfirmModal !== 'undefined' && awardConfirmModal) awardConfirmModal.classList.remove('active');
                    if (typeof gameIntermissionModal !== 'undefined' && gameIntermissionModal) gameIntermissionModal.classList.remove('active');
                    if (typeof matchResultModal !== 'undefined' && matchResultModal) matchResultModal.classList.remove('active');
                    if (typeof quizResultModal !== 'undefined' && quizResultModal) quizResultModal.classList.remove('active');
                    if (typeof awardScoreModal !== 'undefined' && awardScoreModal) awardScoreModal.classList.remove('active');
                    if (typeof leaderboardModal !== 'undefined' && leaderboardModal) leaderboardModal.classList.remove('active');
                    if (typeof gameDialogModal !== 'undefined' && gameDialogModal) gameDialogModal.classList.remove('active');
                } catch (e) {
                    console.warn('closeAllGameModals error:', e);
                }
            }
            window.closeAllGameModals = closeAllGameModals;

            // Airtight Processed Command Tracking & Deduplication (ป้องกันการทำงานวนซ้ำ 100%)
            const processedRemoteCmdIds = new Set();
            let isInitialCloudSnapshot = true;

            function handleRemoteCommand(msg) {
                if (!msg || !msg.action) return;

                // ตรวจสอบ Command ID: ห้ามรันคำสั่งเดิมซ้ำเด็ดขาด ไม่ว่าจะผ่านไปกี่วินาที
                const cmdId = msg.id || (msg.action + '_' + (msg.timestamp || '') + '_' + JSON.stringify(msg.payload || {}));
                if (processedRemoteCmdIds.has(cmdId)) {
                    return;
                }

                processedRemoteCmdIds.add(cmdId);
                if (processedRemoteCmdIds.size > 200) {
                    const first = processedRemoteCmdIds.values().next().value;
                    processedRemoteCmdIds.delete(first);
                }

                const { action, payload } = msg;

                switch (action) {
                    case 'PING':
                    case 'REQUEST_STATE':
                        broadcastGameState(true);
                        break;

                    // Arena Actions
                    case 'RETURN_TO_HOME':
                    case 'RESTART_GAME_HOME':
                        returnToStartHome();
                        break;
                    case 'OPEN_ARENA':
                    case 'START_COMPETITION':
                    case 'CLICK_START_COMPETITION':
                        if (typeof openMatchArena === 'function') {
                            openMatchArena();
                            closeAllGameModals();
                        } else if (startCompBtn) {
                            startCompBtn.click();
                        }
                        broadcastGameState(true);
                        break;
                    case 'SELECT_TEAM_LEFT':
                        if (payload && payload.teamId && typeof window.selectTeamLeft === 'function') {
                            window.selectTeamLeft(payload.teamId);
                        }
                        break;
                    case 'SELECT_TEAM_RIGHT':
                        if (payload && payload.teamId && typeof window.selectTeamRight === 'function') {
                            window.selectTeamRight(payload.teamId);
                        }
                        break;
                    case 'RANDOM_TEAMS':
                        randomizeTeamsMatch();
                        break;
                    case 'RESET_ELIMINATED':
                        clearEliminatedTeamIds();
                        clearWinnerTeamIds();
                        renderTeamCards();
                        broadcastGameState();
                        break;
                    case 'GO_TO_QUIZ_SELECT':
                        closeAllGameModals();
                        openQuizSelection();
                        broadcastGameState();
                        break;

                    // Quiz Select Actions
                    case 'SELECT_QUIZ':
                        if (payload && payload.quizId && typeof window.handleQuizCardClick === 'function') {
                            window.handleQuizCardClick(payload.quizId);
                        }
                        break;
                    case 'RANDOM_QUIZ':
                        randomizeQuiz();
                        break;
                    case 'RESET_USED_QUIZZES':
                        clearUsedQuizIds();
                        selectedQuizId = null;
                        renderQuizCards();
                        break;
                    case 'START_QUIZ_GAME':
                        closeAllGameModals();
                        launchQuizGameStage();
                        broadcastGameState();
                        break;
                    case 'BACK_TO_ARENA':
                        if (btnBackToTeams) btnBackToTeams.click();
                        else {
                            if (quizSelectOverlay) quizSelectOverlay.classList.remove('active');
                            if (matchArenaOverlay) matchArenaOverlay.classList.add('active');
                            renderTeamCards();
                        }
                        break;
                    case 'BACK_TO_QUIZ_SELECT':
                        closeAllGameModals();
                        if (btnBackToQuizSelect) btnBackToQuizSelect.click();
                        else {
                            if (quizGameStageOverlay) quizGameStageOverlay.classList.remove('active');
                            if (quizSelectOverlay) quizSelectOverlay.classList.add('active');
                            openQuizSelection();
                        }
                        broadcastGameState();
                        break;

                    // In-Game Actions
                    case 'SET_ACTIVE_TURN':
                        if (payload && payload.side && typeof window.setActiveCompetingTurn === 'function') {
                            const isFirstSelection = !initialTurnThisQuestion;
                            window.setActiveCompetingTurn(payload.side);
                            initialTurnThisQuestion = payload.side;
                            closeTurnPickerModal();
                            if (isFirstSelection) {
                                showTurnAnnouncement(payload.side);
                            }
                            broadcastGameState();
                        }
                        break;
                    case 'CHOOSE_FIRST_TURN':
                        if (payload && payload.side) {
                            chooseFirstTurnTeam(payload.side);
                        }
                        closeTurnPickerModal();
                        broadcastGameState();
                        break;
                    case 'CLOSE_TURN_PICKER':
                        closeTurnPickerModal();
                        broadcastGameState();
                        break;
                    case 'OPEN_TURN_PICKER_MODAL':
                        const actA = getLiveTeamsList().find(t => t.id === selectedTeamALeft);
                        const actB = getLiveTeamsList().find(t => t.id === selectedTeamBRight);
                        showTurnPickerModal(actA, actB, actA ? actA.captainData : null, actB ? actB.captainData : null);
                        break;
                    case 'REVEAL_ANSWER':
                        if (payload && typeof payload.index === 'number') {
                            window.revealAnswer(payload.index, payload.points || 0);
                        }
                        break;
                    case 'REVEAL_ALL':
                        if (btnRevealAllAnswers) btnRevealAllAnswers.click();
                        break;
                    case 'TOGGLE_STRIKE':
                        if (payload && typeof payload.strikeNum === 'number') {
                            window.toggleStrike(payload.strikeNum);
                        }
                        break;
                    case 'RESET_STRIKES':
                        window.resetStrikes();
                        break;
                    case 'ADJUST_SCORE':
                        if (payload && payload.side && typeof payload.delta === 'number') {
                            window.adjustTeamScore(payload.side, payload.delta);
                        }
                        break;
                    case 'START_STEAL_PHASE':
                        startStealPhase();
                        break;
                    case 'STEAL_SUCCESS':
                        handleStealSuccess();
                        break;
                    case 'STEAL_FAILED':
                        handleStealFailed();
                        break;
                    case 'AWARD_POINTS':
                        if (payload && payload.side) {
                            showAwardConfirmLightbox(payload.side);
                        }
                        break;
                    case 'EXECUTE_AWARD':
                        executeAwardTransfer();
                        break;
                    case 'TRIGGER_ROUND_SUMMARY':
                        if (btnTriggerRoundSummary && roundSummaryActionBar && roundSummaryActionBar.style.display !== 'none') {
                            btnTriggerRoundSummary.click();
                        } else if (typeof pendingRoundActionCallback === 'function') {
                            if (roundSummaryActionBar) roundSummaryActionBar.style.display = 'none';
                            const cb = pendingRoundActionCallback;
                            pendingRoundActionCallback = null;
                            cb();
                        } else {
                            showSingleGameResultLightbox(pendingRoundResultInfo);
                        }
                        break;
                    case 'PROCEED_INTERMISSION':
                        closeAllGameModals();
                        proceedFromIntermission();
                        broadcastGameState();
                        break;
                    case 'CONFIRM_MATCH_WINNER':
                        closeAllGameModals();
                        if (btnMatchResultNext) {
                            btnMatchResultNext.click();
                        } else {
                            closeMatchResultModal();
                            const liveTeams = getLiveTeamsList();
                            const teamA = liveTeams.find(t => t.id === selectedTeamALeft) || liveTeams[0];
                            const teamB = liveTeams.find(t => t.id === selectedTeamBRight) || liveTeams[1];
                            if (blueTeamScore > orangeTeamScore) {
                                if (teamB) addEliminatedTeamId(teamB.id);
                                if (teamA) addWinnerTeamId(teamA.id);
                            } else if (orangeTeamScore > blueTeamScore) {
                                if (teamA) addEliminatedTeamId(teamA.id);
                                if (teamB) addWinnerTeamId(teamB.id);
                            }
                            currentMatchGameIndex = 1;
                            completedMatchGames.clear();
                            blueTeamScore = 0;
                            orangeTeamScore = 0;
                            currentBankScore = 0;
                            window._currentActivePairKey = null;
                            if (quizGameStageOverlay) quizGameStageOverlay.classList.remove('active');
                            if (quizSelectOverlay) quizSelectOverlay.classList.remove('active');
                            if (matchArenaOverlay) matchArenaOverlay.classList.add('active');
                            renderTeamCards();
                        }
                        closeAllGameModals();
                        broadcastGameState();
                        break;
                    case 'CLOSE_MODAL':
                        closeAllGameModals();
                        break;

                    // Global & Sound Actions
                    case 'PLAY_CLICK':
                        if (sound) sound.playClick();
                        break;
                    case 'PLAY_BUZZER':
                        if (sound) sound.playBuzzer();
                        break;
                    case 'PLAY_WIN':
                        if (sound) sound.playWin();
                        break;
                    case 'TOGGLE_MUTE':
                        if (sound) {
                            sound.toggleMute();
                            updateSoundUI();
                        }
                        break;
                    case 'TOGGLE_FULLSCREEN':
                        toggleFullscreen();
                        break;
                }

                setTimeout(broadcastGameState, 60);
            }

            if (remoteGameChannel) {
                remoteGameChannel.onmessage = (event) => {
                    if (event && event.data) {
                        handleRemoteCommand(event.data);
                    }
                };
            }

            window.addEventListener('storage', (e) => {
                if (e.key === 'crsdg_remote_command' && e.newValue) {
                    try {
                        const data = JSON.parse(e.newValue);
                        handleRemoteCommand(data);
                    } catch (err) {}
                }
                if (e.key === 'crsdg_player' || e.key === 'crsdg_nameteam' || e.key === 'crsdg_team' || e.key === 'crsdg_member') {
                    renderTeamCards();
                    broadcastGameState();
                } else if (e.key === 'crsdg_quiz') {
                    if (quizSelectOverlay && quizSelectOverlay.classList.contains('active')) {
                        renderQuizCards();
                    }
                    broadcastGameState();
                }
            });

            // 3. Cloud Firestore Real-time Listener (Commands from remote_crsdg on iPad/phone)
            const handleCloudCommand = (cmd) => {
                if (!cmd || !cmd.action) return;
                // ใน snapshot แรกที่โหลดมา ถ้าเป็นคำสั่งเก่าที่เคยค้างอยู่ในฐานข้อมูล ไม่ต้องรันซ้ำ
                if (isInitialCloudSnapshot) {
                    isInitialCloudSnapshot = false;
                    const initId = cmd.id || (cmd.action + '_' + (cmd.timestamp || '') + '_' + JSON.stringify(cmd.payload || {}));
                    processedRemoteCmdIds.add(initId);
                    return;
                }
                handleRemoteCommand(cmd);
            };

            if (window.FirebaseSync && typeof window.FirebaseSync.subscribe === 'function') {
                window.FirebaseSync.subscribe((event) => {
                    if (!event) return;
                    if (event.type === 'VOTE_SETTINGS_UPDATED' && event.data && event.data.game_remote_cmd) {
                        handleCloudCommand(event.data.game_remote_cmd);
                    }
                });
            } else if (typeof firebase !== 'undefined' && firebase.firestore) {
                try {
                    firebase.firestore().collection('crsdg_vote').doc('settings').onSnapshot(doc => {
                        if (doc && doc.exists) {
                            const d = doc.data();
                            if (d && d.game_remote_cmd) {
                                handleCloudCommand(d.game_remote_cmd);
                            }
                        }
                    }, err => console.warn('[Game] Firestore settings onSnapshot notice:', err));
                } catch (e) {}
            }

            // Optional Network Command Polling for custom local backend (disabled by default on GitHub Pages)
            if (window.__USE_LOCAL_API_SERVER__ && isNetworkSyncEnabled()) {
                let lastPolledCmdId = null;
                setInterval(() => {
                    fetch('/api/remote-command')
                        .then(res => res.ok ? res.json() : null)
                        .then(cmd => {
                            if (cmd && cmd.id && cmd.id !== lastPolledCmdId) {
                                lastPolledCmdId = cmd.id;
                                handleRemoteCommand(cmd);
                            }
                        })
                        .catch(() => {});
                }, 800);
            }

            // Initial Broadcast on Load & periodic heartbeat across network (Push game state to Firestore every 3s)
            broadcastGameState(true);
            setTimeout(() => broadcastGameState(true), 500);
            setTimeout(() => broadcastGameState(true), 1500);
            setTimeout(() => broadcastGameState(true), 3000);
            setInterval(() => broadcastGameState(true), 3000);

            // แจ้งเตือนรีโมตทันทีเมื่อหน้าจอ game.html ถูกปิด
            function notifyGameScreenClosed() {
                try {
                    const closedMsg = {
                        type: 'GAME_SCREEN_CLOSED',
                        isClosed: true,
                        stage: 'closed',
                        timestamp: Date.now()
                    };
                    if (remoteGameChannel) {
                        remoteGameChannel.postMessage(closedMsg);
                    }
                    try {
                        localStorage.setItem('crsdg_game_state_sync', JSON.stringify(closedMsg));
                    } catch (e) {}
                    if (window.FirebaseSync && typeof window.FirebaseSync.saveVoteSettings === 'function') {
                        window.FirebaseSync.saveVoteSettings({
                            game_state_sync: closedMsg
                        }).catch(() => {});
                    }
                } catch (e) {}
            }
            window.addEventListener('beforeunload', notifyGameScreenClosed);
            window.addEventListener('pagehide', notifyGameScreenClosed);
        });
