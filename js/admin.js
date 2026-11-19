/**
 * Admin Dashboard Controller
 * Powers crsdg_member management, Excel upload/export (.xlsx),
 * interactive photo zoom/crop/scale, team rosters, prizes, and winners.
 */

document.addEventListener('DOMContentLoaded', () => {
    const state = window.stateManager;
    const sound = window.soundEffects;

    // ========================================================
    // TOAST NOTIFICATIONS
    // ========================================================
    let toastTimeout = null;
    function showToast(message, type = 'success') {
        let toast = document.getElementById('adminToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adminToast';
            toast.className = 'admin-toast';
            document.body.appendChild(toast);
        }
        toast.className = `admin-toast toast-${type} active`;
        toast.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span><span>${message}</span>`;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('active');
        }, 3200);
    }

    // ========================================================
    // DOM ELEMENTS
    // ========================================================
    // Metric Elements
    // Sort State for crsdg-member-table
    let currentSortColumn = 'idx';
    let currentSortDirection = 'asc';

    window.handleTableSort = function(sortKey) {
        if (!sortKey) return;
        if (currentSortColumn === sortKey) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortColumn = sortKey;
            currentSortDirection = 'asc';
        }
        if (sound) sound.playClick();
        renderParticipants();
    };

    // Format Thai Date & Time helper (พ.ศ. / เวลา)
    function formatThaiDateTime(isoString) {
        if (!isoString) return '-';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return String(isoString);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear() + 543;
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${mins}`;
        } catch {
            return String(isoString);
        }
    }

    const editChosenTeamSelect = document.getElementById('editChosenTeamSelect');
    const editRegisteredStatusSelect = document.getElementById('editRegisteredStatusSelect');

    // Reset Registration Modal Elements
    const btnOpenResetRegModal = document.getElementById('btnOpenResetRegModal');
    const resetRegModal = document.getElementById('resetRegModal');
    const closeResetRegModalBtn = document.getElementById('closeResetRegModalBtn');
    const cancelResetRegModalBtn = document.getElementById('cancelResetRegModalBtn');
    const confirmResetRegBtn = document.getElementById('confirmResetRegBtn');
    const resetRegModalCount = document.getElementById('resetRegModalCount');

    // Quiz Game Elements (crsdg_quiz)
    const quizQuestionsGrid = document.getElementById('quizQuestionsGrid');
    const statQuizCountBadge = document.getElementById('statQuizCountBadge');
    const btnOpenAddQuizModal = document.getElementById('btnOpenAddQuizModal');
    const quizModal = document.getElementById('quizModal');
    const closeQuizModalBtn = document.getElementById('closeQuizModalBtn');
    const cancelQuizModalBtn = document.getElementById('cancelQuizModalBtn');
    const quizForm = document.getElementById('quizForm');
    const quizIdInput = document.getElementById('quizIdInput');
    const quizTitleInput = document.getElementById('quizTitleInput');
    const quizScoreInput = document.getElementById('quizScoreInput');
    const quizMaxAnswersInput = document.getElementById('quizMaxAnswersInput');
    const quizAnswersRowsContainer = document.getElementById('quizAnswersRowsContainer');
    const btnAddQuizAnswerRow = document.getElementById('btnAddQuizAnswerRow');
    const quizModalTitle = document.getElementById('quizModalTitle');

    const confirmDeleteQuizModal = document.getElementById('confirmDeleteQuizModal');
    const closeDeleteQuizModalBtn = document.getElementById('closeDeleteQuizModalBtn');
    const cancelDeleteQuizModalBtn = document.getElementById('cancelDeleteQuizModalBtn');
    const confirmDeleteQuizBtn = document.getElementById('confirmDeleteQuizBtn');
    const deleteQuizTitleHighlight = document.getElementById('deleteQuizTitleHighlight');
    const deleteTargetQuizId = document.getElementById('deleteTargetQuizId');

    const statParticipants = document.getElementById('statParticipants');
    const statAssignedTeams = document.getElementById('statAssignedTeams');
    const statPrizes = document.getElementById('statPrizes');
    const statWinners = document.getElementById('statWinners');
    const statRemaining = document.getElementById('statRemaining');

    // Tab buttons & panes
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    const tabPanes = document.querySelectorAll('.admin-tab-pane');

    // Tab 1 Elements: crsdg_member & Actions Bar
    const btnOpenExcelModal = document.getElementById('btnOpenExcelModal');
    const btnToggleSingleAdd = document.getElementById('btnToggleSingleAdd');
    const btnOpenDeleteModal = document.getElementById('btnOpenDeleteModal');
    const btnExportExcel = document.getElementById('btnExportExcel');
    const singleAddBox = document.getElementById('singleAddBox');
    const btnCloseSingleAdd = document.getElementById('btnCloseSingleAdd');
    const addParticipantForm = document.getElementById('addParticipantForm');
    const partPhotoInput = document.getElementById('partPhotoInput');
    const btnChoosePhoto = document.getElementById('btnChoosePhoto');
    const btnRemovePhoto = document.getElementById('btnRemovePhoto');
    const avatarPreviewBox = document.getElementById('avatarPreviewBox');
    const avatarPreviewImg = document.getElementById('avatarPreviewImg');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const participantsTableBody = document.getElementById('participantsTableBody');
    const tableCountBadge = document.getElementById('tableCountBadge');
    const searchParticipantInput = document.getElementById('searchParticipant');
    const filterTeamSelect = document.getElementById('filterTeamSelect');
    const filterStatusSelect = document.getElementById('filterStatusSelect');
    const tablePhotoInput = document.getElementById('tablePhotoInput');

    // Lightbox 1: Excel Upload Modal Elements
    const excelUploadModal = document.getElementById('excelUploadModal');
    const closeExcelUploadModalBtn = document.getElementById('closeExcelUploadModalBtn');
    const cancelExcelUploadBtn = document.getElementById('cancelExcelUploadBtn');
    const excelModalDropzone = document.getElementById('excelModalDropzone');
    const btnBrowseExcelFile = document.getElementById('btnBrowseExcelFile');
    const excelFileInput = document.getElementById('excelFileInput');
    const selectedFileBadge = document.getElementById('selectedFileBadge');
    const selectedFileName = document.getElementById('selectedFileName');
    const selectedFileSize = document.getElementById('selectedFileSize');
    const excelParsedPreview = document.getElementById('excelParsedPreview');
    const excelParsedSummary = document.getElementById('excelParsedSummary');
    const excelModalPreviewTableBody = document.getElementById('excelModalPreviewTableBody');
    const confirmExcelUploadBtn = document.getElementById('confirmExcelUploadBtn');
    const btnSwitchToTextPaste = document.getElementById('btnSwitchToTextPaste');

    // Lightbox 2: Delete All Members Confirmation Modal Elements
    const confirmDeleteAllModal = document.getElementById('confirmDeleteAllModal');
    const closeDeleteAllModalBtn = document.getElementById('closeDeleteAllModalBtn');
    const cancelDeleteAllModalBtn = document.getElementById('cancelDeleteAllModalBtn');
    const confirmDeleteAllBtn = document.getElementById('confirmDeleteAllBtn');
    const deleteModalCount = document.getElementById('deleteModalCount');

    // Integrated Photo Cropper in Edit Member Modal
    const editCropCanvas = document.getElementById('editCropCanvas');
    const editCropCanvasWrapper = document.getElementById('editCropCanvasWrapper');
    const editCropPreviewCanvas = document.getElementById('editCropPreviewCanvas');
    const editPhotoFileInput = document.getElementById('editPhotoFileInput');
    const btnEditBrowsePhoto = document.getElementById('btnEditBrowsePhoto');
    const btnEditRemovePhoto = document.getElementById('btnEditRemovePhoto');
    const editZoomRangeInput = document.getElementById('editZoomRangeInput');
    const btnEditZoomIn = document.getElementById('btnEditZoomIn');
    const btnEditZoomOut = document.getElementById('btnEditZoomOut');
    const editZoomLevelText = document.getElementById('editZoomLevelText');
    const btnEditRotateCrop = document.getElementById('btnEditRotateCrop');
    const btnEditResetCrop = document.getElementById('btnEditResetCrop');
    const editPreviewNameDisplay = document.getElementById('editPreviewNameDisplay');

    // Team Management Elements (crsdg_nameteam & crsdg_team)
    const btnOpenAddTeamModal = document.getElementById('btnOpenAddTeamModal');
    const statTeamsCountBadge = document.getElementById('statTeamsCountBadge');
    const addTeamModal = document.getElementById('addTeamModal');
    const closeAddTeamModalBtn = document.getElementById('closeAddTeamModalBtn');
    const cancelAddTeamModalBtn = document.getElementById('cancelAddTeamModalBtn');
    const addTeamForm = document.getElementById('addTeamForm');
    const newTeamNameInput = document.getElementById('newTeamNameInput');
    const newTeamDeptInput = document.getElementById('newTeamDeptInput');
    const newTeamColorInput = document.getElementById('newTeamColorInput');
    const newTeamColorCode = document.getElementById('newTeamColorCode');

    const editTeamModal = document.getElementById('editTeamModal');
    const closeEditTeamModalBtn = document.getElementById('closeEditTeamModalBtn');
    const cancelEditTeamModalBtn = document.getElementById('cancelEditTeamModalBtn');
    const editTeamForm = document.getElementById('editTeamForm');
    const editTeamIdInput = document.getElementById('editTeamIdInput');
    const editTeamNameInput = document.getElementById('editTeamNameInput');
    const editTeamDeptInput = document.getElementById('editTeamDeptInput');
    const editTeamColorInput = document.getElementById('editTeamColorInput');
    const editTeamColorCode = document.getElementById('editTeamColorCode');

    const confirmDeleteTeamModal = document.getElementById('confirmDeleteTeamModal');
    const closeDeleteTeamModalBtn = document.getElementById('closeDeleteTeamModalBtn');
    const cancelDeleteTeamModalBtn = document.getElementById('cancelDeleteTeamModalBtn');
    const confirmDeleteTeamBtn = document.getElementById('confirmDeleteTeamBtn');
    const deleteTargetTeamId = document.getElementById('deleteTargetTeamId');
    const deleteTeamNameHighlight = document.getElementById('deleteTeamNameHighlight');
    const deleteTeamMemberCountText = document.getElementById('deleteTeamMemberCountText');

    // Bulk Import Text/CSV Modal Elements
    const importCsvBtn = document.getElementById('importCsvBtn');
    const importModal = document.getElementById('importModal');
    const importCloseBtn = document.getElementById('importCloseBtn');
    const importCancelBtn = document.getElementById('importCancelBtn');
    const importSubmitBtn = document.getElementById('importSubmitBtn');
    const importTextarea = document.getElementById('importTextarea');

    // Edit Member Modal Elements
    const editMemberModal = document.getElementById('editMemberModal');
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');
    const editMemberForm = document.getElementById('editMemberForm');
    const editOriginalEmpId = document.getElementById('editOriginalEmpId');
    const editEmpIdInput = document.getElementById('editEmpIdInput');
    const editEmpNameInput = document.getElementById('editEmpNameInput');
    const editGroupInput = document.getElementById('editGroupInput');
    const editAvatarBox = document.getElementById('editAvatarBox');
    const btnEditChangePhoto = document.getElementById('btnEditChangePhoto');

    // Photo Crop, Zoom & Scale Modal Elements
    const photoCropModal = document.getElementById('photoCropModal');
    const closeCropModalBtn = document.getElementById('closeCropModalBtn');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    const saveCropBtn = document.getElementById('saveCropBtn');
    const btnChooseAnotherPhoto = document.getElementById('btnChooseAnotherPhoto');
    const modalCropFileInput = document.getElementById('modalCropFileInput');
    const cropCanvas = document.getElementById('cropCanvas');
    const cropCanvasWrapper = document.getElementById('cropCanvasWrapper');
    const cropPreviewCanvas = document.getElementById('cropPreviewCanvas');
    const zoomRangeInput = document.getElementById('zoomRangeInput');
    const zoomLevelText = document.getElementById('zoomLevelText');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnRotateCrop = document.getElementById('btnRotateCrop');
    const btnResetCrop = document.getElementById('btnResetCrop');
    const cropEmpName = document.getElementById('cropEmpName');
    const cropEmpId = document.getElementById('cropEmpId');

    // Tab 2 Elements: Teams Roster
    const quickAssignForm = document.getElementById('quickAssignForm');
    const assignEmpIdInput = document.getElementById('assignEmpIdInput');
    const assignTargetTeamSelect = document.getElementById('assignTargetTeamSelect');
    const assignRoleSelect = document.getElementById('assignRoleSelect');
    const empLookupPreview = document.getElementById('empLookupPreview');
    const previewAvatarBox = document.getElementById('previewAvatarBox');
    const previewEmpName = document.getElementById('previewEmpName');
    const previewEmpId = document.getElementById('previewEmpId');
    const previewEmpDept = document.getElementById('previewEmpDept');
    const previewEmpCurrentTeam = document.getElementById('previewEmpCurrentTeam');
    const participantsDatalist = document.getElementById('participantsDatalist');
    const teamsRosterGrid = document.getElementById('teamsRosterGrid');

    // Tab 3 & 4 Elements: Prizes & Winners
    const addPrizeForm = document.getElementById('addPrizeForm');
    const prizesTableBody = document.getElementById('prizesTableBody');
    const winnersTableBody = document.getElementById('winnersTableBody');
    const resetWinnersBtn = document.getElementById('resetWinnersBtn');
    const exportWinnersBtn = document.getElementById('exportWinnersBtn');

    // ========================================================
    // STATE FOR PHOTO CROPPER & PENDING EXCEL
    // ========================================================
    let currentNewPhotoBase64 = '';
    let pendingExcelRows = [];

    // Cropper State
    const cropperState = {
        targetEmpId: null,
        targetMember: null,
        img: null,
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        imgBaseX: 0,
        imgBaseY: 0,
        cropSize: 220, // size of circular crop guide
        canvasSize: 280
    };

    // ========================================================
    // AVATAR HTML GENERATOR
    // ========================================================
    function getAvatarHTML(participant, size = 36) {
        if (!participant) return '';
        const name = participant.EmpName || participant.name || 'พนักงาน';
        const empId = participant.EmployeeID || participant.id || '';

        if (participant.photo && participant.photo.length > 30) {
            return `
                <div class="employee-avatar-wrapper" style="width: ${size}px; height: ${size}px;" title="คลิกเพื่อซูม/ตัด/เปลี่ยนรูปภาพ">
                    <img src="${participant.photo}" alt="${name}" class="employee-avatar-img">
                    <div class="avatar-cam-overlay">📷</div>
                </div>
            `;
        }

        const nameParts = name.replace(/^(คุณ|นาย|นางสาว|นาง|ดร\.)\s*/, '').trim().split(' ');
        const initials = nameParts.length > 1
            ? (nameParts[0].charAt(0) + nameParts[1].charAt(0))
            : name.slice(0, 2);

        let hash = 0;
        for (let i = 0; i < empId.length; i++) {
            hash = empId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = [
            'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            'linear-gradient(135deg, #10b981, #047857)',
            'linear-gradient(135deg, #f59e0b, #b45309)',
            'linear-gradient(135deg, #ec4899, #be185d)',
            'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            'linear-gradient(135deg, #06b6d4, #0e7490)'
        ];
        const bg = colors[Math.abs(hash) % colors.length];

        return `
            <div class="employee-avatar-wrapper" style="width: ${size}px; height: ${size}px; background: ${bg};" title="คลิกเพื่อซูม/ตัด/อัปโหลดรูปภาพ">
                <span class="avatar-initials-badge">${initials}</span>
                <div class="avatar-cam-overlay">📷</div>
            </div>
        `;
    }

    // ========================================================
    // RENDER FUNCTIONS
    // ========================================================

    // ========================================================
    // LIGHTBOX: RESET REGISTRATION MODAL
    // ========================================================
    if (btnOpenResetRegModal && resetRegModal) {
        btnOpenResetRegModal.addEventListener('click', () => {
            const members = state.getMembers();
            if (resetRegModalCount) resetRegModalCount.textContent = members.length;
            resetRegModal.style.display = 'flex';
            if (sound) sound.playClick();
        });
    }

    if (closeResetRegModalBtn && resetRegModal) {
        closeResetRegModalBtn.addEventListener('click', () => resetRegModal.style.display = 'none');
    }
    if (cancelResetRegModalBtn && resetRegModal) {
        cancelResetRegModalBtn.addEventListener('click', () => resetRegModal.style.display = 'none');
    }

    if (confirmResetRegBtn) {
        confirmResetRegBtn.addEventListener('click', async () => {
            const res = state.resetAllRegistrations();
            showToast(res.message);
            if (sound) sound.playClick();
            if (resetRegModal) resetRegModal.style.display = 'none';

            if (window.FirebaseSync) {
                try {
                    if (typeof window.FirebaseSync.resetAllMembersRegistrationInCloud === 'function') {
                        await window.FirebaseSync.resetAllMembersRegistrationInCloud();
                        console.log('[Admin] Reset all member registrations in Firebase crsdg_member');
                    }
                } catch (err) {
                    console.error('[Admin] Error resetting registrations in Firebase:', err);
                }
            }
            renderAll();
        });
    }

    // ========================================================
    // TAB: QUIZ MANAGEMENT (crsdg_quiz)
    // ========================================================
    function renderQuizzes() {
        if (!quizQuestionsGrid) return;
        const quizzes = state.getQuizzes();
        if (statQuizCountBadge) statQuizCountBadge.textContent = quizzes.length;

        if (quizzes.length === 0) {
            quizQuestionsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: rgba(13, 21, 38, 0.6); border: 1px dashed rgba(255,255,255,0.15); border-radius: 16px;">
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">❓</div>
                    <div style="font-size: 1.1rem; color: #ffffff; font-weight: 500;">ยังไม่มีชุดข้อคำถามในตาราง crsdg_quiz</div>
                    <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 4px; margin-bottom: 16px;">
                        คลิกปุ่ม "+ เพิ่มข้อคำถามใหม่" เพื่อสร้างคำถาม ตัวเลือกคำตอบ และกำหนดคะแนน
                    </div>
                    <button type="button" class="btn-primary" onclick="openAddQuizModal()">+ เพิ่มข้อคำถามใหม่</button>
                </div>
            `;
            return;
        }

        quizQuestionsGrid.innerHTML = quizzes.map((q, idx) => {
            const answers = Array.isArray(q.answers) ? q.answers : [];
            return `
                <div class="quiz-card">
                    <div>
                        <div class="quiz-card-header">
                            <div>
                                <span class="quiz-number-tag">ข้อที่ ${idx + 1}</span>
                                <h3 class="quiz-card-title">${q.title}</h3>
                            </div>
                        </div>

                        <div class="quiz-badges-row" style="margin-bottom: 12px;">
                            <span class="quiz-badge-score">🏆 ${q.score} คะแนน</span>
                            <span class="quiz-badge-answers">📝 กำหนด ${q.maxAnswers || answers.length} คำตอบ</span>
                            <span style="font-size: 0.72rem; color: var(--text-secondary); opacity: 0.8;">(มีคำตอบทั้งหมด ${answers.length} ตัวเลือก)</span>
                        </div>

                        <div class="quiz-answers-box">
                            <div class="quiz-answers-box-title">
                                <span>ตัวเลือกคำตอบ</span>
                                <span>คะแนน</span>
                            </div>
                            <table class="quiz-answers-table">
                                <tbody>
                                    ${answers.map((ans, aIdx) => `
                                        <tr>
                                            <td style="width: 28px;">
                                                <span class="ans-rank-badge">${aIdx + 1}</span>
                                            </td>
                                            <td style="color: #ffffff;">
                                                <strong>${ans.text}</strong>
                                            </td>
                                            <td class="ans-points-badge">
                                                ${ans.points} คะแนน
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="quiz-card-actions">
                        <button type="button" class="btn-action-sm btn-secondary" onclick="openEditQuizModal('${q.id}')" title="แก้ไขหัวข้อและตัวเลือกคำตอบ">
                            ✏️ แก้ไข
                        </button>
                        <button type="button" class="btn-action-sm btn-action-del" onclick="confirmDeleteQuiz('${q.id}')" title="ลบข้อคำถามนี้">
                            🗑️ ลบ
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Dynamic Answer Row Helper for Modal with Live Auto-Calculation
    function recalculateQuizTotalScore() {
        if (!quizAnswersRowsContainer || !quizScoreInput) return 0;
        const pointsInputs = quizAnswersRowsContainer.querySelectorAll('.quiz-ans-points');
        let total = 0;
        pointsInputs.forEach(inp => {
            const val = parseInt(inp.value, 10);
            if (!isNaN(val) && val > 0) total += val;
        });
        quizScoreInput.value = total;
        return total;
    }
    window.recalculateQuizTotalScore = recalculateQuizTotalScore;

    window.deleteQuizAnswerRow = function(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
            recalculateQuizTotalScore();
        }
    };

    function createAnswerRowHTML(text = '', points = '') {
        const rowId = 'ans_row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        return `
            <div class="quiz-builder-row" id="${rowId}">
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-align: center;">●</span>
                <input type="text" class="form-input quiz-ans-text" placeholder="คำตอบ เช่น ทองคำ / เงินสด" value="${text}" required>
                <input type="number" class="form-input quiz-ans-points" placeholder="คะแนน" min="0" step="1" value="${points}" oninput="recalculateQuizTotalScore()" required>
                <button type="button" class="btn-action-sm btn-action-del" onclick="deleteQuizAnswerRow('${rowId}')" title="ลบตัวเลือกนี้" style="padding: 2px 6px;">✕</button>
            </div>
        `;
    }

    function openAddQuizModal() {
        if (!quizModal || !quizForm) return;
        quizForm.reset();
        quizIdInput.value = '';
        if (quizModalTitle) quizModalTitle.innerHTML = 'เพิ่มข้อคำถามใหม่ (<code class="table-name-badge">crsdg_quiz</code>)';
        if (quizAnswersRowsContainer) {
            quizAnswersRowsContainer.innerHTML = '';
            // Add 4 default empty rows with descending points (40, 30, 20, 10)
            const defaultScores = [40, 30, 20, 10];
            for (let i = 0; i < 4; i++) {
                quizAnswersRowsContainer.insertAdjacentHTML('beforeend', createAnswerRowHTML('', defaultScores[i]));
            }
            recalculateQuizTotalScore();
        }
        quizModal.style.display = 'flex';
        if (sound) sound.playClick();
    }
    window.openAddQuizModal = openAddQuizModal;

    if (btnOpenAddQuizModal) {
        btnOpenAddQuizModal.addEventListener('click', openAddQuizModal);
    }

    if (closeQuizModalBtn && quizModal) {
        closeQuizModalBtn.addEventListener('click', () => quizModal.style.display = 'none');
    }
    if (cancelQuizModalBtn && quizModal) {
        cancelQuizModalBtn.addEventListener('click', () => quizModal.style.display = 'none');
    }

    if (btnAddQuizAnswerRow && quizAnswersRowsContainer) {
        btnAddQuizAnswerRow.addEventListener('click', () => {
            quizAnswersRowsContainer.insertAdjacentHTML('beforeend', createAnswerRowHTML('', 10));
            recalculateQuizTotalScore();
        });
    }

    // Open Edit Quiz Modal
    window.openEditQuizModal = function(quizId) {
        const quizzes = state.getQuizzes();
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz || !quizModal) return;

        quizIdInput.value = quiz.id;
        quizTitleInput.value = quiz.title;
        quizMaxAnswersInput.value = quiz.maxAnswers || 4;
        if (quizModalTitle) quizModalTitle.innerHTML = 'แก้ไขข้อคำถาม (<code class="table-name-badge">crsdg_quiz</code>)';

        if (quizAnswersRowsContainer) {
            quizAnswersRowsContainer.innerHTML = '';
            (quiz.answers || []).forEach(ans => {
                quizAnswersRowsContainer.insertAdjacentHTML('beforeend', createAnswerRowHTML(ans.text, ans.points));
            });
            if (!quiz.answers || quiz.answers.length === 0) {
                quizAnswersRowsContainer.insertAdjacentHTML('beforeend', createAnswerRowHTML('', 10));
            }
            recalculateQuizTotalScore();
        }

        quizModal.style.display = 'flex';
        if (sound) sound.playClick();
    };

    // Save Quiz Form Submit
    if (quizForm) {
        quizForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = quizIdInput.value;
            const title = quizTitleInput.value.trim();
            const score = recalculateQuizTotalScore() || parseInt(quizScoreInput.value, 10) || 0;
            const maxAnswers = parseInt(quizMaxAnswersInput.value, 10) || 4;

            // Collect answer rows
            const answerRows = quizAnswersRowsContainer ? quizAnswersRowsContainer.querySelectorAll('.quiz-builder-row') : [];
            const answers = [];
            answerRows.forEach((row, rIdx) => {
                const textInput = row.querySelector('.quiz-ans-text');
                const pointsInput = row.querySelector('.quiz-ans-points');
                if (textInput && textInput.value.trim()) {
                    answers.push({
                        id: 'ans_' + (rIdx + 1),
                        text: textInput.value.trim(),
                        points: parseInt(pointsInput ? pointsInput.value : 0, 10) || 0
                    });
                }
            });

            if (answers.length === 0) {
                alert('กรุณาระบุตัวเลือกคำตอบอย่างน้อย 1 รายการ');
                return;
            }

            let res;
            if (id) {
                res = state.updateQuiz(id, { title, score, maxAnswers, answers });
            } else {
                res = state.addQuiz({ title, score, maxAnswers, answers });
            }

            if (res.success) {
                showToast(res.message);
                if (sound) sound.playClick();
                quizModal.style.display = 'none';
                renderAll();
            }
        });
    }

    // Confirm Delete Quiz
    window.confirmDeleteQuiz = function(quizId) {
        const quizzes = state.getQuizzes();
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz || !confirmDeleteQuizModal) return;

        deleteTargetQuizId.value = quiz.id;
        if (deleteQuizTitleHighlight) deleteQuizTitleHighlight.textContent = quiz.title;
        confirmDeleteQuizModal.style.display = 'flex';
        if (sound) sound.playClick();
    };

    if (closeDeleteQuizModalBtn && confirmDeleteQuizModal) {
        closeDeleteQuizModalBtn.addEventListener('click', () => confirmDeleteQuizModal.style.display = 'none');
    }
    if (cancelDeleteQuizModalBtn && confirmDeleteQuizModal) {
        cancelDeleteQuizModalBtn.addEventListener('click', () => confirmDeleteQuizModal.style.display = 'none');
    }

    if (confirmDeleteQuizBtn) {
        confirmDeleteQuizBtn.addEventListener('click', () => {
            const id = deleteTargetQuizId.value;
            const res = state.deleteQuiz(id);
            if (res.success) {
                showToast(res.message);
                if (sound) sound.playClick();
                confirmDeleteQuizModal.style.display = 'none';
                renderAll();
            }
        });
    }

    // ========================================================
    // THEME TOGGLE (LIGHT / DARK MODE - DEFAULT: DARK)
    // ========================================================
    function initThemeToggle() {
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const themeIconDark = document.getElementById('themeIconDark');
        const themeIconLight = document.getElementById('themeIconLight');
        const themeLabelText = document.getElementById('themeLabelText');

        function applyTheme(theme) {
            const isLight = theme === 'light';
            if (isLight) {
                document.documentElement.classList.add('light-mode');
                document.body.classList.add('light-mode');
                if (themeIconDark) themeIconDark.style.display = 'none';
                if (themeIconLight) themeIconLight.style.display = 'inline-block';
                if (themeLabelText) themeLabelText.textContent = 'โหมดสว่าง';
            } else {
                document.documentElement.classList.remove('light-mode');
                document.body.classList.remove('light-mode');
                if (themeIconDark) themeIconDark.style.display = 'inline-block';
                if (themeIconLight) themeIconLight.style.display = 'none';
                if (themeLabelText) themeLabelText.textContent = 'โหมดมืด';
            }
        }

        const savedTheme = localStorage.getItem('crsdg_theme') || 'dark';
        applyTheme(savedTheme);

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const currentIsLight = document.body.classList.contains('light-mode');
                const nextTheme = currentIsLight ? 'dark' : 'light';
                localStorage.setItem('crsdg_theme', nextTheme);
                applyTheme(nextTheme);
                showToast(`เปลี่ยนเป็น${nextTheme === 'light' ? 'โหมดสว่าง ☀️' : 'โหมดมืด 🌙'}`);
                if (sound) sound.playClick();
            });
        }
    }

    // ========================================================
    // FULLSCREEN TOGGLE (ขยายจอ / ย่อจอ)
    // ========================================================
    function initFullscreenToggle() {
        const fsBtn = document.getElementById('fullscreenToggleBtn');
        const fsIcon = document.getElementById('fsIcon');
        const fsLabel = document.getElementById('fsLabelText');
        if (!fsBtn) return;

        const expandSvg = `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />`;
        const compressSvg = `<path d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7M14 20v-6m0 0h6m-6 0l7 7M10 4v6m0 0H4m0 0l7-7" />`;

        function updateFullscreenUI() {
            const isFs = !!document.fullscreenElement;
            if (fsIcon) fsIcon.innerHTML = isFs ? compressSvg : expandSvg;
            if (fsLabel) fsLabel.textContent = isFs ? 'ย่อจอ' : 'ขยายจอ';
            fsBtn.setAttribute('title', isFs ? 'ย่อจอ (F)' : 'ขยายเต็มจอ (F)');
        }

        function toggleFs() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.warn('Fullscreen request failed:', err);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
            }
        }

        fsBtn.addEventListener('click', () => {
            toggleFs();
            if (sound) sound.playClick();
        });

        document.addEventListener('fullscreenchange', updateFullscreenUI);

        // Keyboard shortcut 'F' (only when not typing in an input/textarea)
        document.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
                return;
            }
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                toggleFs();
            }
        });

        updateFullscreenUI();

        // รักษาและส่งต่อสถานะการเปิด/ปิดลงทุนของหน้า admin เมื่อกดปุ่ม "แสดงพอร์ต"
        const btnNavShowPort = document.getElementById('btnNavShowPort');
        if (btnNavShowPort) {
            btnNavShowPort.addEventListener('click', () => {
                if (state && typeof state.syncVoteSettingsToCloud === 'function') {
                    state.syncVoteSettingsToCloud();
                }
            });
        }
    }

    // ========================================================
    // TAB 0: REGISTRATION DASHBOARD (crsdg_member)
    // ========================================================
    function formatShortGroupLabel(name) {
        if (!name) return '-';
        const trimmed = String(name).trim();
        const abbrevMap = {
            'Performance and Rewards': 'P&R',
            'Sales Strategy and Planning': 'Sales Strat.',
            'AL Channel Partner': 'AL Partner',
            'AL QA': 'AL QA',
            'Academy': 'Academy'
        };
        if (abbrevMap[trimmed]) return abbrevMap[trimmed];
        let short = trimmed
            .replace(/^กลุ่มที่\s*/i, 'กลุ่ม ')
            .replace(/^ฝ่าย\s*/i, '')
            .replace(/^แผนก\s*/i, '');
        if (short.length > 14) {
            short = short.substring(0, 12) + '...';
        }
        return short;
    }

    function renderRegistrationDashboard() {
        const members = state.getMembers();
        const total = members.length;
        const registered = members.filter(m => m.registered === true && m.registeredAt).length;
        const pending = Math.max(0, total - registered);
        const regPct = total > 0 ? Math.round((registered / total) * 100) : 0;
        const pendingPct = total > 0 ? (100 - regPct) : 0;

        // Group by group
        const groupMap = new Map();
        members.forEach(m => {
            const grp = (m.Group || m.department || 'ไม่ระบุกลุ่ม').trim();
            if (!groupMap.has(grp)) {
                groupMap.set(grp, { name: grp, total: 0, registered: 0, pending: 0 });
            }
            const g = groupMap.get(grp);
            g.total++;
            if (m.registered === true && m.registeredAt) {
                g.registered++;
            } else {
                g.pending++;
            }
        });

        const groups = Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));

        // Update metrics
        const regTotalCount = document.getElementById('regTotalCount');
        const regSuccessCount = document.getElementById('regSuccessCount');
        const regSuccessPct = document.getElementById('regSuccessPct');
        const regPendingCount = document.getElementById('regPendingCount');
        const regPendingPct = document.getElementById('regPendingPct');
        const regGroupsCount = document.getElementById('regGroupsCount');

        if (regTotalCount) regTotalCount.textContent = total.toLocaleString();
        if (regSuccessCount) regSuccessCount.textContent = registered.toLocaleString();
        if (regSuccessPct) regSuccessPct.textContent = `(${regPct}%)`;
        if (regPendingCount) regPendingCount.textContent = pending.toLocaleString();
        if (regPendingPct) regPendingPct.textContent = `(${pendingPct}%)`;
        if (regGroupsCount) regGroupsCount.textContent = groups.length.toLocaleString();

        // Render Stacked Bar Chart
        const chartContainer = document.getElementById('regStackedBarChart');
        if (chartContainer) {
            if (groups.length === 0) {
                chartContainer.innerHTML = `
                    <div style="text-align: center; color: var(--text-secondary); padding: 40px; width: 100%;">
                        ยังไม่มีข้อมูลพนักงานในระบบ (กรุณานำเข้าข้อมูลในเมนูผู้ร่วมงาน)
                    </div>
                `;
            } else {
                const maxGroupTotal = Math.max(...groups.map(g => g.total), 1);
                const trackMaxHeightPx = 200;

                chartContainer.innerHTML = groups.map(g => {
                    const groupPct = g.total > 0 ? Math.round((g.registered / g.total) * 100) : 0;
                    const barHeightPx = Math.max(50, Math.round((g.total / maxGroupTotal) * trackMaxHeightPx));
                    const regHeightPx = Math.round((g.registered / g.total) * barHeightPx);
                    const unregHeightPx = barHeightPx - regHeightPx;
                    const shortName = formatShortGroupLabel(g.name);

                    return `
                        <div class="stacked-bar-col">
                            <div style="font-size: 0.74rem; color: #00e5ff; font-weight: 400; margin-bottom: 4px;">
                                ${g.total} คน
                            </div>
                            <div class="stacked-bar-track" style="height: ${barHeightPx}px;" title="${g.name}: ลงทะเบียน ${g.registered}/${g.total} คน (${groupPct}%)">
                                ${unregHeightPx > 0 ? `
                                    <div class="bar-seg-unreg" style="height: ${unregHeightPx}px;" title="ยังไม่ลงทะเบียน: ${g.pending} คน">
                                        ${unregHeightPx > 18 ? g.pending : ''}
                                    </div>
                                ` : ''}
                                ${regHeightPx > 0 ? `
                                    <div class="bar-seg-reg" style="height: ${regHeightPx}px;" title="ลงทะเบียนแล้ว: ${g.registered} คน">
                                        ${regHeightPx > 18 ? g.registered : ''}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="bar-group-label" title="${g.name}">${shortName}</div>
                            <span class="bar-group-pct">${groupPct}%</span>
                        </div>
                    `;
                }).join('');
            }
        }

        // Render 24-Hour Registration Timeline Line Chart
        render24hRegistrationLineChart(members);

        // Render Summary Breakdown Table
        const tableBody = document.getElementById('regGroupSummaryTableBody');
        const countTag = document.getElementById('regTableCountTag');
        if (countTag) countTag.textContent = `ทั้งหมด ${groups.length} กลุ่ม`;

        if (tableBody) {
            if (groups.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">ยังไม่มีข้อมูลกลุ่ม</td></tr>`;
            } else {
                tableBody.innerHTML = groups.map(g => {
                    const groupPct = g.total > 0 ? Math.round((g.registered / g.total) * 100) : 0;
                    return `
                        <tr>
                            <td>
                                <strong style="color: #ffffff; font-size: 0.85rem;">${g.name}</strong>
                            </td>
                            <td style="text-align: center;">
                                <span class="badge" style="background: rgba(255,255,255,0.08);">${g.total} คน</span>
                            </td>
                            <td style="text-align: center;">
                                <span class="badge" style="background: rgba(16,185,129,0.15); color: #34d399; font-weight: 600;">
                                    ${g.registered} คน
                                </span>
                            </td>
                            <td style="text-align: center;">
                                <span class="badge" style="background: rgba(245,158,11,0.15); color: #fbbf24; font-weight: 600;">
                                    ${g.pending} คน
                                </span>
                            </td>
                            <td>
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; color: var(--text-secondary);">
                                    <span>${g.registered}/${g.total} คน</span>
                                    <strong style="color: ${groupPct === 100 ? '#10b981' : '#00e5ff'};">${groupPct}%</strong>
                                </div>
                                <div class="table-progress-bar">
                                    <div class="table-progress-fill" style="width: ${groupPct}%;"></div>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    // ========================================================
    // 24-HOUR REGISTRATION TIMELINE LINE CHART
    // ========================================================
    function render24hRegistrationLineChart(members) {
        const container = document.getElementById('reg24hLineChartContainer');
        const peakBadgeText = document.getElementById('regPeakHourText');
        if (!container) return;

        // 24-hour buckets (00:00 to 23:00)
        const hourlyCounts = new Array(24).fill(0);
        let validCount = 0;

        members.forEach(m => {
            if (m.registered === true && m.registeredAt) {
                const d = new Date(m.registeredAt);
                if (!isNaN(d.getTime())) {
                    const hour = d.getHours();
                    if (hour >= 0 && hour < 24) {
                        hourlyCounts[hour]++;
                        validCount++;
                    }
                }
            }
        });

        // Find peak registration hour
        let maxVal = 0;
        let peakHour = -1;
        hourlyCounts.forEach((cnt, h) => {
            if (cnt > maxVal) {
                maxVal = cnt;
                peakHour = h;
            }
        });

        if (peakBadgeText) {
            if (maxVal > 0 && peakHour !== -1) {
                const startStr = String(peakHour).padStart(2, '0') + ':00';
                const endStr = String((peakHour + 1) % 24).padStart(2, '0') + ':00';
                peakBadgeText.textContent = `ช่วงเวลาสูงสุด: ${startStr} - ${endStr} น. (${maxVal} คน)`;
            } else {
                peakBadgeText.textContent = `ช่วงเวลาสูงสุด: -`;
            }
        }

        if (validCount === 0 && members.every(m => !m.registeredAt)) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 40px; width: 100%;">
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">⏱️</div>
                    <div style="font-size: 0.92rem; font-weight: 500; color: #cbd5e1;">ยังไม่มีข้อมูลช่วงเวลาลงทะเบียน 24 ชั่วโมง</div>
                    <div style="font-size: 0.8rem; margin-top: 4px; color: var(--text-secondary); opacity: 0.85;">
                        เมื่อพนักงานเริ่มลงทะเบียนในระบบ กราฟเส้นจะคำนวณและแสดงความถี่ตามช่วงเวลาจริง (00:00 - 23:00 น.)
                    </div>
                </div>
            `;
            return;
        }

        // SVG Dimensions
        const svgW = 540;
        const svgH = 220;
        const padLeft = 36;
        const padRight = 24;
        const padTop = 26;
        const padBottom = 32;

        const plotW = svgW - padLeft - padRight;
        const plotH = svgH - padTop - padBottom;
        const baselineY = padTop + plotH;

        // Y-axis scaling
        const maxY = Math.max(maxVal, 4);
        const niceMaxY = maxY <= 4 ? 4 : (maxY <= 10 ? Math.ceil(maxY / 2) * 2 : Math.ceil(maxY / 5) * 5);

        // Calculate (x, y) coordinates for all 24 hours
        const points = [];
        for (let h = 0; h < 24; h++) {
            const x = padLeft + (h / 23) * plotW;
            const y = baselineY - (hourlyCounts[h] / niceMaxY) * plotH;
            points.push({ x, y, val: hourlyCounts[h], hour: h });
        }

        // Smooth Cubic Bezier Spline
        let linePath = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i === 0 ? 0 : i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            linePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
        }

        const areaPath = `${linePath} L ${points[23].x.toFixed(1)},${baselineY} L ${points[0].x.toFixed(1)},${baselineY} Z`;

        // Horizontal Grid Lines & Y labels (4 lines)
        let gridLinesHTML = '';
        const ySteps = 4;
        for (let step = 0; step <= ySteps; step++) {
            const stepVal = Math.round((niceMaxY / ySteps) * step);
            const yPos = baselineY - (stepVal / niceMaxY) * plotH;
            gridLinesHTML += `
                <line x1="${padLeft}" y1="${yPos.toFixed(1)}" x2="${svgW - padRight}" y2="${yPos.toFixed(1)}" class="reg-line-grid" />
                <text x="${padLeft - 8}" y="${(yPos + 3.5).toFixed(1)}" text-anchor="end" class="reg-line-axis-text">${stepVal}</text>
            `;
        }

        // X-axis Time Labels: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00, 23:00
        const xIntervals = [0, 4, 8, 12, 16, 20, 23];
        let xLabelsHTML = '';
        xIntervals.forEach(h => {
            const pt = points[h];
            const timeLabel = String(h).padStart(2, '0') + ':00';
            xLabelsHTML += `
                <text x="${pt.x.toFixed(1)}" y="${svgH - 12}" text-anchor="middle" class="reg-line-axis-text">${timeLabel}</text>
                <line x1="${pt.x.toFixed(1)}" y1="${baselineY}" x2="${pt.x.toFixed(1)}" y2="${baselineY + 4}" stroke="rgba(255,255,255,0.2)" />
            `;
        });

        // Interactive Data Points (Dots and Counts)
        let dotsHTML = '';
        points.forEach(pt => {
            const timeRange = `${String(pt.hour).padStart(2, '0')}:00 - ${String((pt.hour + 1) % 24).padStart(2, '0')}:00 น.`;
            const hasData = pt.val > 0;
            const isPeak = pt.val === maxVal && maxVal > 0;

            dotsHTML += `
                <g class="reg-line-dot-group">
                    <title>${timeRange}: ลงทะเบียน ${pt.val} คน</title>
                    ${isPeak ? `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="7" fill="#00e5ff" opacity="0.2" />` : ''}
                    <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${hasData ? 3.5 : 2}" class="reg-dot-point ${hasData ? 'has-data' : ''}" />
                    ${hasData ? `
                        <text x="${pt.x.toFixed(1)}" y="${(pt.y - 7).toFixed(1)}" text-anchor="middle" class="reg-dot-label">${pt.val}</text>
                    ` : ''}
                </g>
            `;
        });

        container.innerHTML = `
            <svg class="reg-line-svg" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.38"/>
                        <stop offset="60%" stop-color="#00e5ff" stop-opacity="0.10"/>
                        <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>
                <!-- Grid Lines -->
                ${gridLinesHTML}
                <!-- X Axis Baseline -->
                <line x1="${padLeft}" y1="${baselineY}" x2="${svgW - padRight}" y2="${baselineY}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                <!-- Area Fill -->
                <path d="${areaPath}" class="reg-area-path" />
                <!-- Smooth Line (บางลง) -->
                <path d="${linePath}" class="reg-line-path" stroke-width="1.5" />
                <!-- X Labels -->
                ${xLabelsHTML}
                <!-- Dots & Labels -->
                ${dotsHTML}
            </svg>
        `;
    }

    // ========================================================
    // REGISTRATION QR CODE MODAL
    // ========================================================
    function initRegistrationQrModal() {
        const btnOpenRegQrModal = document.getElementById('btnOpenRegQrModal');
        const registrationQrModal = document.getElementById('registrationQrModal');
        const closeRegQrModalBtn = document.getElementById('closeRegQrModalBtn');
        const regQrCodeImg = document.getElementById('regQrCodeImg');
        const regPageUrlInput = document.getElementById('regPageUrlInput');
        const btnCopyRegUrl = document.getElementById('btnCopyRegUrl');
        const btnDownloadQr = document.getElementById('btnDownloadQr');
        const btnPrintQr = document.getElementById('btnPrintQr');
        const btnOpenRegDirect = document.getElementById('btnOpenRegDirect');

        function openQrModal() {
            if (!registrationQrModal) return;
            const origin = window.location.origin;
            const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
            const regUrl = `${origin}${path}register.html`;

            if (regPageUrlInput) regPageUrlInput.value = regUrl;
            if (btnOpenRegDirect) btnOpenRegDirect.href = regUrl;

            // Generate crisp QR Code via high-resolution QR API
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(regUrl)}`;
            if (regQrCodeImg) regQrCodeImg.src = qrApiUrl;
            if (btnDownloadQr) btnDownloadQr.href = qrApiUrl;

            registrationQrModal.style.display = 'flex';
            if (sound) sound.playClick();
        }

        if (btnOpenRegQrModal) btnOpenRegQrModal.addEventListener('click', openQrModal);
        if (closeRegQrModalBtn && registrationQrModal) {
            closeRegQrModalBtn.addEventListener('click', () => registrationQrModal.style.display = 'none');
        }

        const btnCloseQrModalAction = document.getElementById('btnCloseQrModalAction');
        if (btnCloseQrModalAction && registrationQrModal) {
            btnCloseQrModalAction.addEventListener('click', () => {
                registrationQrModal.style.display = 'none';
                if (sound) sound.playClick();
            });
        }

        if (btnCopyRegUrl && regPageUrlInput) {
            btnCopyRegUrl.addEventListener('click', () => {
                const text = regPageUrlInput.value;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(() => {
                        showToast('คัดลอกลิงก์ลงทะเบียนเรียบร้อยแล้ว ✅');
                    }).catch(() => {
                        regPageUrlInput.select();
                        document.execCommand('copy');
                        showToast('คัดลอกลิงก์ลงทะเบียนเรียบร้อยแล้ว ✅');
                    });
                } else {
                    regPageUrlInput.select();
                    document.execCommand('copy');
                    showToast('คัดลอกลิงก์ลงทะเบียนเรียบร้อยแล้ว ✅');
                }
            });
        }

        if (btnPrintQr) {
            btnPrintQr.addEventListener('click', () => {
                const printWin = window.open('', '_blank');
                if (!printWin) return;
                const regUrl = regPageUrlInput ? regPageUrlInput.value : '';
                printWin.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>QR Code ลงทะเบียนเข้าร่วมงาน - CRSDG NEW YEAR 2026</title>
                        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&display=swap" rel="stylesheet">
                        <style>
                            body { font-family: 'Kanit', sans-serif; text-align: center; padding: 40px; color: #000; }
                            h1 { font-size: 26px; margin-bottom: 6px; }
                            p { font-size: 16px; color: #555; margin-bottom: 24px; }
                            img { width: 320px; height: 320px; border: 2px solid #ccc; padding: 12px; border-radius: 16px; }
                            .url { margin-top: 20px; font-size: 14px; color: #2563eb; word-break: break-all; }
                        </style>
                    </head>
                    <body>
                        <h1>🎉 CRSDG NEW YEAR 2026</h1>
                        <p>สแกน QR Code ด้วยมือถือเพื่อลงทะเบียนเข้าร่วมกิจกรรม & โหวตทีมชนะ</p>
                        <img src="${regQrCodeImg ? regQrCodeImg.src : ''}" alt="QR Code">
                        <div class="url">${regUrl}</div>
                        <script>window.onload = function() { window.print(); };</script>
                    </body>
                    </html>
                `);
                printWin.document.close();
            });
        }
    }

    // ========================================================
    // TAB 0.5: VOTE PREDICTION DASHBOARD (crsdg_vote)
    // ========================================================
    // TAB: GAME VOTES BAR CHART (กราฟแท่งแสดงผลคะแนนโหวตทีมแข่งขัน)
    // ========================================================
    let cachedVoteList = [];
    let cachedTotalVotes = 0;

    // Render Vertical Bar Chart for Vote Tab (ทั้งการ์ดหลัก และ Lightbox ขยายขนาด)
    function renderVoteBarChart(container, voteList, totalVotes, isExpanded = false) {
        if (!container) return;

        if (!voteList || voteList.length === 0) {
            container.innerHTML = `
                <div class="vote-barchart-empty">
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">📊</div>
                    <div style="font-size: 1rem; font-weight: 600; color: #ffffff;">ยังไม่มีรายชื่อทีมแข่งขันในระบบ</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">กรุณาเพิ่มทีมแข่งขันในเมนู "ทีมแข่งขัน"</div>
                </div>
            `;
            return;
        }

        const maxCount = Math.max(...voteList.map(item => item.count || 0), 1);
        const hasVotes = totalVotes > 0;

        const columnsHtml = voteList.map((item) => {
            const count = item.count || 0;
            const pct = item.pct || 0;
            const isLeader = hasVotes && count === maxCount && count > 0;

            // Bar fill height (percentage) relative to leader team
            let heightPct = 0;
            if (hasVotes && count > 0) {
                heightPct = Math.max(8, Math.round((count / maxCount) * 100));
            }

            const color = item.color || '#3b82f6';
            const shortName = item.name.length > (isExpanded ? 20 : 13)
                ? (item.name.substring(0, isExpanded ? 19 : 12) + '…')
                : item.name;

            return `
                <div class="vote-bar-col" title="${item.name}: ${count.toLocaleString()} โหวต (${pct}%)">
                    <div class="vote-bar-top-tag ${isLeader ? 'is-lead' : ''}">
                        ${isLeader ? '👑 ' : ''}${hasVotes ? `${pct}%` : '0%'}
                    </div>
                    <div class="vote-bar-track-box">
                        <div class="vote-bar-fill" style="
                            height: ${heightPct}%;
                            background: linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(0,0,0,0.28) 100%), ${color};
                            box-shadow: 0 4px 14px ${color}66;
                        ">
                            ${heightPct >= 20 ? `<span class="vote-bar-inner-count">${count > 0 ? count.toLocaleString() : ''}</span>` : ''}
                        </div>
                    </div>
                    <div class="vote-bar-bottom-info">
                        <div class="vote-bar-team-header">
                            <span class="vote-bar-team-dot" style="background: ${color}; box-shadow: 0 0 6px ${color}aa;"></span>
                            <span class="vote-bar-team-name" title="${item.name}">${shortName}</span>
                        </div>
                        <div class="vote-bar-score">
                            <strong>${count.toLocaleString()}</strong> โหวต
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="vote-bars-stage">
                ${columnsHtml}
            </div>
        `;
    }

    function renderExpandedVoteDonut(voteList, totalVotes) {
        const container = document.getElementById('expandVoteBarChartContainer') || document.getElementById('expandDonutSvgContainer');
        if (!container) return;
        renderVoteBarChart(container, voteList, totalVotes, true);
    }

    function initVoteDashboard() {
        const voteToggleCheckbox = document.getElementById('voteToggleCheckbox');
        if (voteToggleCheckbox) {
            voteToggleCheckbox.addEventListener('change', (e) => {
                const isOpen = e.target.checked;
                if (typeof state.setGameVoteOpen === 'function') {
                    state.setGameVoteOpen(isOpen);
                }
                renderVoteDashboard();
                renderTeamRosters();
                showToast(isOpen ? 'เปิดระบบรับโหวตเกม 4 ต่อ 4 เรียบร้อยแล้ว 🟢' : 'ปิดระบบรับโหวตเกม 4 ต่อ 4 แล้ว 🔴');
                if (sound) sound.playClick();
            });
        }

        // Vote Budget Input & Save in Tab Vote
        const tabVoteBudgetInput = document.getElementById('tabVoteBudgetInput');
        const btnSaveTabVoteBudget = document.getElementById('btnSaveTabVoteBudget');
        if (btnSaveTabVoteBudget && tabVoteBudgetInput) {
            btnSaveTabVoteBudget.addEventListener('click', () => {
                const val = parseFloat(tabVoteBudgetInput.value) || 1000000;
                state.setVoteBudget(val);
                showToast(`บันทึกงบลงทุน AI เป็น ${val.toLocaleString()} บาท/คน เรียบร้อยแล้ว 💰`);
                renderPlayers();
                if (sound) sound.playSuccess();
            });
        }

        // Expand Vote Donut Modal
        const btnExpandVoteDonut = document.getElementById('btnExpandVoteDonut');
        const expandVoteDonutModal = document.getElementById('expandVoteDonutModal');
        const closeExpandVoteDonutBtn = document.getElementById('closeExpandVoteDonutBtn');
        const btnCloseExpandDonutAction = document.getElementById('btnCloseExpandDonutAction');

        if (btnExpandVoteDonut && expandVoteDonutModal) {
            btnExpandVoteDonut.addEventListener('click', () => {
                renderExpandedVoteDonut(cachedVoteList, cachedTotalVotes);
                expandVoteDonutModal.style.display = 'flex';
                if (sound) sound.playClick();
            });
        }

        if (closeExpandVoteDonutBtn && expandVoteDonutModal) {
            closeExpandVoteDonutBtn.addEventListener('click', () => {
                expandVoteDonutModal.style.display = 'none';
            });
        }

        if (btnCloseExpandDonutAction && expandVoteDonutModal) {
            btnCloseExpandDonutAction.addEventListener('click', () => {
                expandVoteDonutModal.style.display = 'none';
                if (sound) sound.playClick();
            });
        }

        // Initialize Vote Winning Team Lucky Draw Modal (90% Width)
        initVoteDrawModal();
    }

    // ========================================================
    // VOTE WINNING TEAM LUCKY DRAW MODAL CONTROLLER (Lightbox 90%)
    // ========================================================
    let voteDrawSelectedTeamId = '';
    let voteDrawWinnersMap = {};

    function loadSavedVoteDrawnWinners() {
        try {
            const raw = localStorage.getItem('crsdg_vote_drawn_winners');
            if (raw) voteDrawWinnersMap = JSON.parse(raw);
            else voteDrawWinnersMap = {};
        } catch (e) {
            voteDrawWinnersMap = {};
        }
    }

    function saveVoteDrawnWinnersToStorage() {
        try {
            localStorage.setItem('crsdg_vote_drawn_winners', JSON.stringify(voteDrawWinnersMap));
        } catch (e) {
            console.warn('Error saving vote drawn winners:', e);
        }
    }

    function getTeamListForDraw() {
        const players = (typeof state.getPlayers === 'function') ? state.getPlayers() : [];
        if (players.length > 0) {
            return players.map(p => ({
                id: p.id,
                name: p.teamName || ('ทีม ' + (p.orderNo || '')),
                orderNo: p.orderNo || 0,
                photo: p.teamPhoto || p.photo || '',
                voteAmount: parseFloat(p.voteAmount) || 0,
                voterCount: parseInt(p.voterCount, 10) || 0,
                members: p.members || []
            }));
        }
        const teamNames = (typeof state.getTeamNames === 'function') ? state.getTeamNames() : [];
        return teamNames.map((t, idx) => ({
            id: t.id || ('team_' + idx),
            name: t.name,
            orderNo: idx + 1,
            photo: '',
            voteAmount: 0,
            voterCount: 0,
            members: []
        }));
    }

    function getEligibleCandidatesForTeam(teamId, teamName) {
        const allUserInv = (typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        const members = (typeof state.getMembers === 'function') ? state.getMembers() : [];
        const memberMap = new Map();
        members.forEach(m => {
            const idKey = String(m.EmployeeID || m.id || '').trim().toLowerCase();
            if (idKey) memberMap.set(idKey, m);
        });

        const candidates = [];
        const addedIds = new Set();

        // 1. All users with investment in this teamId
        if (teamId) {
            Object.entries(allUserInv).forEach(([empId, uMap]) => {
                if (!uMap || typeof uMap !== 'object') return;
                const amt = parseFloat(uMap[teamId]) || 0;
                if (amt > 0) {
                    const cleanId = String(empId).trim().toLowerCase();
                    const m = memberMap.get(cleanId) || {};
                    candidates.push({
                        employeeId: m.EmployeeID || m.id || empId,
                        name: m.EmpName || m.name || ('พนักงาน ' + empId),
                        department: m.Group || m.department || m.Department || '-',
                        amount: amt,
                        photo: m.photo || ''
                    });
                    addedIds.add(cleanId);
                }
            });
        }

        // 2. Members who chose this team in chosenTeam
        const targetName = String(teamName || '').trim().toLowerCase();
        const targetId = String(teamId || '').trim().toLowerCase();
        members.forEach(m => {
            const cTeam = String(m.chosenTeam || '').trim().toLowerCase();
            if (cTeam && (cTeam === targetName || cTeam === targetId)) {
                const cleanId = String(m.EmployeeID || m.id || '').trim().toLowerCase();
                if (!addedIds.has(cleanId)) {
                    candidates.push({
                        employeeId: m.EmployeeID || m.id || cleanId,
                        name: m.EmpName || m.name || ('พนักงาน ' + cleanId),
                        department: m.Group || m.department || m.Department || '-',
                        amount: 0,
                        photo: m.photo || ''
                    });
                    addedIds.add(cleanId);
                }
            }
        });

        // 3. Fallback: team members if neither #1 nor #2 found
        if (candidates.length === 0 && teamId) {
            const players = (typeof state.getPlayers === 'function') ? state.getPlayers() : [];
            const t = players.find(p => p.id === teamId);
            if (t && Array.isArray(t.members) && t.members.length > 0) {
                t.members.forEach(tm => {
                    const cleanId = String(tm.employeeId || tm.id || '').trim().toLowerCase();
                    const m = memberMap.get(cleanId) || {};
                    candidates.push({
                        employeeId: tm.employeeId || tm.id || '-',
                        name: tm.name || m.EmpName || m.name || '-',
                        department: tm.department || m.Group || '-',
                        amount: 0,
                        photo: tm.photo || m.photo || ''
                    });
                });
            }
        }

        return candidates;
    }

    function getTeamInvestmentTotal(teamId, fallbackAmount = 0) {
        const allUserInv = (typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        let sum = 0;
        let found = false;
        Object.values(allUserInv).forEach(uMap => {
            if (uMap && typeof uMap === 'object') {
                const val = parseFloat(uMap[teamId]) || 0;
                if (val > 0) {
                    sum += val;
                    found = true;
                }
            }
        });
        return found ? sum : (parseFloat(fallbackAmount) || 0);
    }

    function updateVoteDrawView() {
        const teamSelect = document.getElementById('voteDrawTeamSelect');
        const teamNameEl = document.getElementById('voteDrawTeamName');
        const teamSubEl = document.getElementById('voteDrawTeamSub');
        const teamAvatarEl = document.getElementById('voteDrawTeamAvatar');
        const eligibleCountEl = document.getElementById('voteDrawEligibleCount');
        const totalInvestedEl = document.getElementById('voteDrawTotalInvested');

        const teams = getTeamListForDraw();
        const selectedId = teamSelect ? teamSelect.value : voteDrawSelectedTeamId;
        voteDrawSelectedTeamId = selectedId;
        const currentTeam = teams.find(t => t.id === selectedId);

        if (!currentTeam) {
            if (teamNameEl) teamNameEl.textContent = 'ยังไม่ได้เลือกทีม';
            if (teamSubEl) teamSubEl.textContent = 'กรุณาเลือกทีมด้านบน';
            if (teamAvatarEl) teamAvatarEl.innerHTML = '🛡️';
            if (eligibleCountEl) eligibleCountEl.textContent = '0';
            if (totalInvestedEl) totalInvestedEl.textContent = '0';
            renderVoteDrawnWinnersList();
            return;
        }

        const candidates = getEligibleCandidatesForTeam(currentTeam.id, currentTeam.name);
        const totalInvested = getTeamInvestmentTotal(currentTeam.id, currentTeam.voteAmount);
        const eligibleCount = candidates.length > 0 ? candidates.length : (currentTeam.voterCount || 0);

        if (teamNameEl) teamNameEl.textContent = currentTeam.name;
        if (teamSubEl) teamSubEl.textContent = currentTeam.orderNo ? `ทีมลำดับที่ ${currentTeam.orderNo}` : 'ทีมเข้าแข่งขัน';
        if (teamAvatarEl) {
            teamAvatarEl.innerHTML = currentTeam.photo
                ? `<img src="${currentTeam.photo}" alt="${currentTeam.name}">`
                : '🛡️';
        }
        if (eligibleCountEl) eligibleCountEl.textContent = eligibleCount.toLocaleString();
        if (totalInvestedEl) totalInvestedEl.textContent = totalInvested.toLocaleString();

        renderVoteDrawnWinnersList();
    }

    function renderVoteDrawnWinnersList() {
        const container = document.getElementById('voteDrawnListContainer');
        const badgeEl = document.getElementById('voteDrawnCountBadge');
        const countInput = document.getElementById('voteDrawCountInput');
        if (!container) return;

        const drawnList = (voteDrawSelectedTeamId && voteDrawWinnersMap[voteDrawSelectedTeamId]) || [];
        const targetQty = countInput ? (parseInt(countInput.value, 10) || 1) : 1;

        if (badgeEl) {
            badgeEl.textContent = `${drawnList.length} / ${targetQty} ท่าน`;
            if (drawnList.length >= targetQty && targetQty > 0) {
                badgeEl.style.background = 'rgba(16, 185, 129, 0.2)';
                badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                badgeEl.style.color = '#34d399';
            } else {
                badgeEl.style.background = 'rgba(59, 130, 246, 0.2)';
                badgeEl.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                badgeEl.style.color = '#93c5fd';
            }
        }

        if (drawnList.length === 0) {
            container.innerHTML = `
                <div class="vote-draw-empty-state">
                    <div style="font-size: 2.5rem; margin-bottom: 8px;">🎁</div>
                    <div style="font-size: 1rem; font-weight: 600; color: #f8fafc;">ยังไม่มีผลการสุ่มรายชื่อ</div>
                    <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 4px;">
                        กรุณากำหนดจำนวนผู้โชคดีทางด้านซ้ายมือ แล้วกดปุ่ม <strong>"ทำการสุ่มรายชื่อ"</strong>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = drawnList.map((w, idx) => {
            const initial = (w.name || 'พ').replace(/^(นาย|นางสาว|นาง|คุณ|พี่)/, '').charAt(0) || '👤';
            const avatarHtml = w.photo
                ? `<img src="${w.photo}" alt="${w.name}" onerror="this.outerHTML='<span>${initial}</span>'">`
                : `<span>${initial}</span>`;
            const amtText = (w.amount && w.amount > 0)
                ? ` | 💰 ยอดลงทุน: ฿${w.amount.toLocaleString()} บาท`
                : '';

            return `
                <div class="drawn-winner-row">
                    <div class="drawn-winner-rank">#${idx + 1}</div>
                    <div class="drawn-winner-avatar">${avatarHtml}</div>
                    <div class="drawn-winner-info">
                        <div class="drawn-winner-name">
                            <span>${w.name}</span>
                            <span class="drawn-winner-empid">${w.employeeId}</span>
                        </div>
                        <div class="drawn-winner-dept">
                            <span>กลุ่ม/ฝ่าย: ${w.department || '-'}</span>${amtText}
                        </div>
                    </div>
                    <button type="button" class="btn-del-winner-item" onclick="removeVoteDrawnWinner('${w.employeeId}')" title="ลบรายชื่อนี้ออก (เพื่อกดสุ่มใหม่แทนที่)">
                        🗑️
                    </button>
                </div>
            `;
        }).join('');
    }

    window.removeVoteDrawnWinner = function(empId) {
        if (!voteDrawSelectedTeamId) return;
        let list = voteDrawWinnersMap[voteDrawSelectedTeamId] || [];
        const beforeLen = list.length;
        list = list.filter(w => String(w.employeeId).trim().toLowerCase() !== String(empId).trim().toLowerCase());
        if (list.length < beforeLen) {
            voteDrawWinnersMap[voteDrawSelectedTeamId] = list;
            saveVoteDrawnWinnersToStorage();
            renderVoteDrawnWinnersList();
            showToast('ลบรายชื่อเรียบร้อยแล้ว (กด "ทำการสุ่มรายชื่อ" เพื่อสุ่มใหม่เฉพาะรายการที่ยังไม่ครบ)');
            if (sound) sound.playClick();
        }
    };

    function executeVoteDrawAction() {
        if (!voteDrawSelectedTeamId) {
            alert('กรุณาเลือกทีมที่จะทำการสุ่มรางวัลก่อน');
            return;
        }
        const team = getTeamListForDraw().find(t => t.id === voteDrawSelectedTeamId);
        if (!team) return;

        const countInput = document.getElementById('voteDrawCountInput');
        const targetQty = countInput ? parseInt(countInput.value, 10) : 1;
        if (isNaN(targetQty) || targetQty < 1) {
            alert('กรุณาระบุจำนวนผู้ที่จะสุ่มอย่างน้อย 1 คน');
            return;
        }

        let drawnList = voteDrawWinnersMap[voteDrawSelectedTeamId] || [];
        const currentCount = drawnList.length;

        // หากลบแล้วเมื่อกดสุ่มใหม่ให้สุ่มเฉพาะรายการที่ยังไม่ครบเท่านั้น
        if (currentCount >= targetQty) {
            showToast(`รายชื่อครบตามจำนวนแล้ว (${currentCount} ท่าน) หากต้องการสุ่มเพิ่ม กรุณาปรับเพิ่มจำนวน หรือกดลบรายการที่ไม่ต้องการ`);
            if (sound) sound.playClick();
            return;
        }

        const needed = targetQty - currentCount;
        const allCandidates = getEligibleCandidatesForTeam(team.id, team.name);

        if (allCandidates.length === 0) {
            alert(`ทีม "${team.name}" ยังไม่มีรายชื่อผู้มีสิทธิ์โหวตหรือสมาชิกในทีมให้ทำการสุ่ม`);
            return;
        }

        // Exclude already drawn winners
        const drawnIds = new Set(drawnList.map(w => String(w.employeeId).trim().toLowerCase()));
        const available = allCandidates.filter(c => !drawnIds.has(String(c.employeeId).trim().toLowerCase()));

        if (available.length === 0) {
            alert(`ไม่มีรายชื่อผู้มีสิทธิ์คงเหลือให้สุ่มแล้ว (สุ่มไปแล้ว ${currentCount} จากทั้งหมด ${allCandidates.length} คน)`);
            return;
        }

        const drawCount = Math.min(needed, available.length);

        // Random pick drawCount
        const pool = [...available];
        const newlyDrawn = [];
        for (let i = 0; i < drawCount; i++) {
            const randIdx = Math.floor(Math.random() * pool.length);
            const picked = pool.splice(randIdx, 1)[0];
            newlyDrawn.push({
                ...picked,
                drawnAt: new Date().toISOString()
            });
        }

        drawnList = [...drawnList, ...newlyDrawn];
        voteDrawWinnersMap[voteDrawSelectedTeamId] = drawnList;
        saveVoteDrawnWinnersToStorage();

        renderVoteDrawnWinnersList();

        if (drawCount < needed) {
            showToast(`สุ่มเพิ่ม ${drawCount} ท่าน (ครบจำนวนผู้มีสิทธิ์ทั้งหมดของทีมแล้ว)`);
        } else {
            showToast(`🎉 สุ่มเพิ่ม ${drawCount} ท่านเรียบร้อยแล้ว (รวม ${drawnList.length}/${targetQty} ท่าน)`);
        }

        if (sound) sound.playSuccess();
    }

    function clearVoteDrawAction() {
        if (!voteDrawSelectedTeamId) return;
        const drawnList = voteDrawWinnersMap[voteDrawSelectedTeamId] || [];
        if (drawnList.length === 0) {
            showToast('ยังไม่มีผลการสุ่มให้ล้าง');
            return;
        }
        if (!confirm('ยืนยันการล้างผลสุ่มรายชื่อของทีมนี้ทั้งหมดหรือไม่?')) return;
        delete voteDrawWinnersMap[voteDrawSelectedTeamId];
        saveVoteDrawnWinnersToStorage();
        renderVoteDrawnWinnersList();
        showToast('ล้างผลการสุ่มของทีมนี้เรียบร้อยแล้ว');
        if (sound) sound.playClick();
    }

    function exportVoteDrawExcelAction() {
        const drawnList = (voteDrawSelectedTeamId && voteDrawWinnersMap[voteDrawSelectedTeamId]) || [];
        if (drawnList.length === 0) {
            alert('ยังไม่มีรายชื่อผู้ได้รับรางวัลจากการสุ่มให้ส่งออก');
            return;
        }
        const team = getTeamListForDraw().find(t => t.id === voteDrawSelectedTeamId);
        const teamTitle = team ? team.name : 'Vote_Winners';

        const exportData = drawnList.map((w, idx) => ({
            'ลำดับ': idx + 1,
            'ทีมที่ชนะ': teamTitle,
            'รหัสพนักงาน': w.employeeId || '-',
            'ชื่อ - นามสกุล': w.name || '-',
            'กลุ่ม/ฝ่าย': w.department || '-',
            'ยอดเงินลงทุน (บาท)': w.amount || 0,
            'เวลาที่สุ่ม': formatThaiDateTime(w.drawnAt || new Date().toISOString())
        }));

        if (typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Vote_Prize_Winners');
            XLSX.writeFile(wb, `Vote_Winners_${teamTitle.replace(/[^\w\u0E00-\u0E7F]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showToast('ส่งออกไฟล์ Excel รายชื่อผู้รับรางวัลเรียบร้อยแล้ว');
        } else {
            alert('ไม่พบโมดูล XLSX สำหรับส่งออกไฟล์');
        }
    }

    function openVoteDrawModal() {
        loadSavedVoteDrawnWinners();
        const modal = document.getElementById('voteDrawModal');
        const teamSelect = document.getElementById('voteDrawTeamSelect');
        const teams = getTeamListForDraw();

        if (teamSelect) {
            if (teams.length === 0) {
                teamSelect.innerHTML = `<option value="">-- ยังไม่มีรายชื่อทีมแข่งขันในระบบ --</option>`;
                voteDrawSelectedTeamId = '';
            } else {
                teamSelect.innerHTML = teams.map((t, idx) => {
                    const invText = t.voteAmount > 0 ? ` [ยอดลงทุน ฿${t.voteAmount.toLocaleString()}]` : '';
                    const voteCountText = t.voterCount > 0 ? ` (${t.voterCount} คนโหวต)` : '';
                    return `<option value="${t.id}">🏆 ${t.name}${invText}${voteCountText}</option>`;
                }).join('');

                if (!voteDrawSelectedTeamId || !teams.some(t => t.id === voteDrawSelectedTeamId)) {
                    voteDrawSelectedTeamId = teams[0].id;
                }
                teamSelect.value = voteDrawSelectedTeamId;
            }
        }

        updateVoteDrawView();

        if (modal) {
            modal.style.display = 'flex';
            if (sound) sound.playClick();
        }
    }

    function initVoteDrawModal() {
        const btnOpenVoteDrawModal = document.getElementById('btnOpenVoteDrawModal');
        const btnCloseVoteDrawModal = document.getElementById('btnCloseVoteDrawModal');
        const voteDrawModal = document.getElementById('voteDrawModal');
        const teamSelect = document.getElementById('voteDrawTeamSelect');
        const btnExecuteVoteDraw = document.getElementById('btnExecuteVoteDraw');
        const btnClearVoteDrawList = document.getElementById('btnClearVoteDrawList');
        const btnExportVoteDrawExcel = document.getElementById('btnExportVoteDrawExcel');
        const countInput = document.getElementById('voteDrawCountInput');
        const btnMinus = document.getElementById('btnVoteDrawMinus');
        const btnPlus = document.getElementById('btnVoteDrawPlus');
        const btnAll = document.getElementById('btnVoteDrawAll');

        if (btnOpenVoteDrawModal) {
            btnOpenVoteDrawModal.addEventListener('click', openVoteDrawModal);
        }

        if (btnCloseVoteDrawModal && voteDrawModal) {
            btnCloseVoteDrawModal.addEventListener('click', () => {
                voteDrawModal.style.display = 'none';
            });
        }

        if (voteDrawModal) {
            voteDrawModal.addEventListener('click', (e) => {
                if (e.target === voteDrawModal) {
                    voteDrawModal.style.display = 'none';
                }
            });
        }

        if (teamSelect) {
            teamSelect.addEventListener('change', () => {
                voteDrawSelectedTeamId = teamSelect.value;
                updateVoteDrawView();
                if (sound) sound.playClick();
            });
        }

        if (countInput) {
            countInput.addEventListener('input', () => {
                renderVoteDrawnWinnersList();
            });
        }

        if (btnMinus && countInput) {
            btnMinus.addEventListener('click', () => {
                const cur = parseInt(countInput.value, 10) || 1;
                countInput.value = Math.max(1, cur - 1);
                renderVoteDrawnWinnersList();
            });
        }

        if (btnPlus && countInput) {
            btnPlus.addEventListener('click', () => {
                const cur = parseInt(countInput.value, 10) || 1;
                countInput.value = cur + 1;
                renderVoteDrawnWinnersList();
            });
        }

        document.querySelectorAll('.btn-preset-pill[data-qty]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (countInput) {
                    countInput.value = btn.dataset.qty;
                    renderVoteDrawnWinnersList();
                }
            });
        });

        if (btnAll && countInput) {
            btnAll.addEventListener('click', () => {
                const team = getTeamListForDraw().find(t => t.id === voteDrawSelectedTeamId);
                if (team) {
                    const cands = getEligibleCandidatesForTeam(team.id, team.name);
                    const qty = cands.length > 0 ? cands.length : (team.voterCount || 1);
                    countInput.value = Math.max(1, qty);
                    renderVoteDrawnWinnersList();
                }
            });
        }

        if (btnExecuteVoteDraw) {
            btnExecuteVoteDraw.addEventListener('click', executeVoteDrawAction);
        }

        if (btnClearVoteDrawList) {
            btnClearVoteDrawList.addEventListener('click', clearVoteDrawAction);
        }

        if (btnExportVoteDrawExcel) {
            btnExportVoteDrawExcel.addEventListener('click', exportVoteDrawExcelAction);
        }
    }

    function renderVoteDashboard() {
        const isOpen = (typeof state.isGameVoteOpen === 'function') ? state.isGameVoteOpen() : false;
        const voteToggleCheckbox = document.getElementById('voteToggleCheckbox');
        const voteStatusBadge = document.getElementById('voteStatusBadge');
        const voteToggleLabel = document.getElementById('voteToggleLabel');

        if (voteToggleCheckbox) voteToggleCheckbox.checked = isOpen;
        if (voteStatusBadge) {
            if (isOpen) {
                voteStatusBadge.textContent = '🟢 เปิดรับโหวตอยู่';
                voteStatusBadge.classList.remove('closed');
            } else {
                voteStatusBadge.textContent = '🔴 ปิดรับโหวตแล้ว';
                voteStatusBadge.classList.add('closed');
            }
        }
        if (voteToggleLabel) voteToggleLabel.textContent = isOpen ? 'เปิดรับโหวต' : 'ปิดรับโหวต';

        const tabVoteBudgetInput = document.getElementById('tabVoteBudgetInput');
        if (tabVoteBudgetInput && document.activeElement !== tabVoteBudgetInput) {
            tabVoteBudgetInput.value = state.getVoteBudget();
        }

        const members = state.getMembers();
        const teamNames = state.getTeamNames();

        // 1. Left Column: Horizontal Stacked Bar Chart by Group (Total Employees & Green Bar for Voted)
        const groupMap = new Map();
        members.forEach(m => {
            const grp = (m.Group || m.department || 'ไม่ระบุกลุ่ม').trim();
            if (!groupMap.has(grp)) {
                groupMap.set(grp, { name: grp, total: 0, voted: 0, pending: 0 });
            }
            const g = groupMap.get(grp);
            g.total++;
            const hasVoted = !!(m.chosenTeam && m.chosenTeam.trim());
            if (hasVoted) {
                g.voted++;
            } else {
                g.pending++;
            }
        });
        const groups = Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));

        const hbarsContainer = document.getElementById('voteHorizontalBarsContainer');
        if (hbarsContainer) {
            if (groups.length === 0) {
                hbarsContainer.innerHTML = `
                    <div style="text-align: center; color: var(--text-secondary); padding: 30px;">
                        ยังไม่มีข้อมูลกลุ่มพนักงาน
                    </div>
                `;
            } else {
                hbarsContainer.innerHTML = groups.map(g => {
                    const groupPct = g.total > 0 ? Math.round((g.voted / g.total) * 100) : 0;
                    const votedPct = g.total > 0 ? ((g.voted / g.total) * 100).toFixed(1) : '0';
                    const unvotedPct = g.total > 0 ? ((g.pending / g.total) * 100).toFixed(1) : '0';

                    return `
                        <div class="hbar-row">
                            <div class="hbar-meta">
                                <span class="hbar-group-name">${g.name} (${g.total} คน)</span>
                                <span class="hbar-counts">
                                    <span style="color: #34d399;">● โหวตแล้ว ${g.voted}</span> &nbsp;|&nbsp; 
                                    <span style="color: #fbbf24;">● ยังไม่โหวต ${g.pending}</span> (${groupPct}%)
                                </span>
                            </div>
                            <div class="hbar-track" title="${g.name}: พนักงานทั้งหมด ${g.total} คน (โหวตเลือกทีมแล้ว ${g.voted} คน, ยังไม่โหวต ${g.pending} คน)">
                                ${g.voted > 0 ? `
                                    <div class="hbar-seg-reg" style="width: ${votedPct}%;" title="โหวตเลือกทีมแล้ว ${g.voted} คน (${votedPct}%)">
                                        ${g.voted > 0 ? `${g.voted} คน` : ''}
                                    </div>
                                ` : ''}
                                ${g.pending > 0 ? `
                                    <div class="hbar-seg-unreg" style="width: ${unvotedPct}%;" title="ยังไม่โหวต ${g.pending} คน (${unvotedPct}%)">
                                        ${g.pending > 0 ? `${g.pending} คน` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 2. Right Column (60%): Circular Donut Chart showing all teams and employee voting choices
        const teamVoteMap = new Map();
        const teamColorMap = new Map();
        const teamDeptMap = new Map();
        const DEFAULT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];

        (teamNames || []).forEach((t, i) => {
            teamVoteMap.set(t.name, 0);
            teamColorMap.set(t.name, t.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
            if (t.department) teamDeptMap.set(t.name, t.department);
        });

        let totalVotes = 0;
        members.forEach(m => {
            if (m.chosenTeam && m.chosenTeam.trim()) {
                const cTeam = m.chosenTeam.trim();
                const cur = teamVoteMap.get(cTeam) || 0;
                teamVoteMap.set(cTeam, cur + 1);
                totalVotes++;
                if (!teamColorMap.has(cTeam)) {
                    teamColorMap.set(cTeam, DEFAULT_COLORS[teamVoteMap.size % DEFAULT_COLORS.length]);
                }
            }
        });

        const voteTotalBadgeTag = document.getElementById('voteTotalBadgeTag');
        const totalVotedPct = members.length > 0 ? Math.round((totalVotes / members.length) * 100) : 0;
        if (voteTotalBadgeTag) {
            voteTotalBadgeTag.textContent = totalVotes > 0 
                ? `${totalVotes.toLocaleString()} / ${members.length.toLocaleString()} คนโหวต (${totalVotedPct}%)` 
                : `0 / ${members.length.toLocaleString()} คนโหวต`;
        }

        const voteList = Array.from(teamVoteMap.entries())
            .map(([name, count]) => ({
                name,
                count,
                color: teamColorMap.get(name) || '#3b82f6',
                department: teamDeptMap.get(name) || '',
                pct: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
                pctExact: totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0'
            }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th'));

        cachedVoteList = voteList;
        cachedTotalVotes = totalVotes;

        // If expanded modal is currently open, keep it updated live
        const expandVoteDonutModal = document.getElementById('expandVoteDonutModal');
        if (expandVoteDonutModal && expandVoteDonutModal.style.display !== 'none') {
            renderExpandedVoteDonut(voteList, totalVotes);
        }

        const barChartContainer = document.getElementById('voteTeamBarChartContainer') || document.getElementById('donutSvgContainer');
        if (barChartContainer) {
            renderVoteBarChart(barChartContainer, voteList, totalVotes, false);
        }
    }

    function renderAll() {
        renderStats();
        renderRegistrationDashboard();
        renderVoteDashboard();
        renderGroupFilterOptions();
        renderTargetTeamSelectOptions();
        renderParticipants();
        renderTeamRosters();
        renderPlayers();
        renderQuizzes();
        renderDatalist();
        renderPrizes();
        renderWinners();
        renderEvaluations();
        if (statTeamsCountBadge) statTeamsCountBadge.textContent = state.getTeams().length;
    }

    function renderStats() {
        const members = state.getMembers();
        const prizes = state.getPrizes();
        const winners = state.getWinners();
        const eligible = state.getEligibleParticipants();
        const teams = state.getTeams();

        const assignedSet = new Set();
        teams.forEach(t => {
            if (t.captainId) assignedSet.add(t.captainId);
            (t.memberIds || []).forEach(mid => assignedSet.add(mid));
        });

        if (statParticipants) statParticipants.textContent = `${members.length} ท่าน`;
        if (statAssignedTeams) statAssignedTeams.textContent = `${assignedSet.size} คน`;
        if (statPrizes) statPrizes.textContent = prizes.reduce((sum, p) => sum + (parseInt(p.quantity) || 1), 0);
        if (statWinners) statWinners.textContent = winners.length;
        if (statRemaining) statRemaining.textContent = eligible.length;
        if (tableCountBadge) tableCountBadge.textContent = members.length;
    }

    function renderGroupFilterOptions() {
        if (!filterTeamSelect) return;
        const members = state.getMembers();
        const currentVal = filterTeamSelect.value;
        const groups = Array.from(new Set(members.map(m => m.Group || m.department || '').filter(Boolean))).sort();

        let optionsHTML = `<option value="all">กลุ่ม Group: ทั้งหมด</option>`;
        groups.forEach(g => {
            optionsHTML += `<option value="${g}">${g}</option>`;
        });

        filterTeamSelect.innerHTML = optionsHTML;
        if (groups.includes(currentVal) || currentVal === 'all') {
            filterTeamSelect.value = currentVal;
        }
    }

    function renderDatalist() {
        if (!participantsDatalist) return;
        const members = state.getMembers();
        participantsDatalist.innerHTML = members.map(m => {
            const id = m.EmployeeID || m.id;
            const name = m.EmpName || m.name;
            const grp = m.Group || m.department ? ` (${m.Group || m.department})` : '';
            return `<option value="${id} - ${name}${grp}">`;
        }).join('');
    }

    // ========================================================
    // TAB 1: RENDER crsdg_member TABLE
    // ========================================================
    function renderParticipants() {
        if (!participantsTableBody) return;
        const members = state.getMembers();
        const winners = state.getWinners();
        const winnerIds = new Set();
        const winnerPrizeMap = new Map();
        winners.forEach(w => {
            const wId = String(w.empId || (w.participant && w.participant.id) || '').trim();
            if (wId) {
                winnerIds.add(wId);
                winnerIds.add(wId.replace(/^0+/, ''));
                winnerIds.add(wId.padStart(5, '0'));
                const prizeObj = w.prize || { title: w.prizeTitle || 'Lucky Draw', icon: '🎁' };
                winnerPrizeMap.set(wId, prizeObj);
                winnerPrizeMap.set(wId.replace(/^0+/, ''), prizeObj);
                winnerPrizeMap.set(wId.padStart(5, '0'), prizeObj);
            }
        });

        // Build Team Membership Map (crsdg_team & crsdg_nameteam)
        const teams = state.getTeams();
        const memberTeamMap = new Map();
        teams.forEach(t => {
            if (t.captainId) {
                memberTeamMap.set(t.captainId, {
                    id: t.id,
                    name: t.name,
                    color: t.color || '#3b82f6',
                    isCaptain: true
                });
            }
            (t.memberIds || []).forEach(mid => {
                memberTeamMap.set(mid, {
                    id: t.id,
                    name: t.name,
                    color: t.color || '#3b82f6',
                    isCaptain: false
                });
            });
        });

        const searchQuery = (searchParticipantInput ? searchParticipantInput.value : '').toLowerCase().trim();
        const groupFilter = filterTeamSelect ? filterTeamSelect.value : 'all';
        const statusFilter = filterStatusSelect ? filterStatusSelect.value : 'all';

        const filtered = members.filter(m => {
            const empId = String(m.EmployeeID || m.id || '').toLowerCase();
            const empName = String(m.EmpName || m.name || '').toLowerCase();
            const group = String(m.Group || m.department || '').toLowerCase();
            const teamName = (memberTeamMap.get(m.EmployeeID || m.id)?.name || '').toLowerCase();
            const chosen = String(m.chosenTeam || '').toLowerCase();

            // Search Filter across all identifiable attributes
            if (searchQuery && !empId.includes(searchQuery) && !empName.includes(searchQuery) && !group.includes(searchQuery) && !teamName.includes(searchQuery) && !chosen.includes(searchQuery)) {
                return false;
            }

            // Group Filter
            if (groupFilter !== 'all' && (m.Group || m.department) !== groupFilter) {
                return false;
            }

            // Winner Status Filter
            const isWinner = winnerIds.has(m.EmployeeID || m.id);
            if (statusFilter === 'winner' && !isWinner) return false;
            if (statusFilter === 'eligible' && isWinner) return false;

            return true;
        });

        if (tableCountBadge) tableCountBadge.textContent = filtered.length;

        // Sorting Logic (Ascending / Descending)
        if (currentSortColumn && currentSortColumn !== 'none') {
            filtered.sort((a, b) => {
                const idA = String(a.EmployeeID || a.id || '');
                const idB = String(b.EmployeeID || b.id || '');

                if (currentSortColumn === 'idx') {
                    const idxA = members.findIndex(m => (m.EmployeeID || m.id) === idA);
                    const idxB = members.findIndex(m => (m.EmployeeID || m.id) === idB);
                    return currentSortDirection === 'asc' ? idxA - idxB : idxB - idxA;
                }

                if (currentSortColumn === 'id') {
                    const numA = parseInt(idA, 10);
                    const numB = parseInt(idB, 10);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return currentSortDirection === 'asc' ? numA - numB : numB - numA;
                    }
                    const cmp = idA.localeCompare(idB, 'th', { numeric: true });
                    return currentSortDirection === 'asc' ? cmp : -cmp;
                }

                if (currentSortColumn === 'name') {
                    const nameA = String(a.EmpName || a.name || '');
                    const nameB = String(b.EmpName || b.name || '');
                    const cmp = nameA.localeCompare(nameB, 'th');
                    return currentSortDirection === 'asc' ? cmp : -cmp;
                }

                if (currentSortColumn === 'group') {
                    const grpA = String(a.Group || a.department || '');
                    const grpB = String(b.Group || b.department || '');
                    const cmp = grpA.localeCompare(grpB, 'th');
                    return currentSortDirection === 'asc' ? cmp : -cmp;
                }

                if (currentSortColumn === 'team') {
                    const teamA = memberTeamMap.get(idA)?.name || '';
                    const teamB = memberTeamMap.get(idB)?.name || '';
                    const cmp = teamA.localeCompare(teamB, 'th');
                    return currentSortDirection === 'asc' ? cmp : -cmp;
                }

                if (currentSortColumn === 'registered') {
                    const regA = (a.registered === true && a.registeredAt) ? a.registeredAt : '';
                    const regB = (b.registered === true && b.registeredAt) ? b.registeredAt : '';
                    const cmp = regA.localeCompare(regB);
                    return currentSortDirection === 'asc' ? cmp : -cmp;
                }

                if (currentSortColumn === 'chosen') {
                    const chA = String(a.chosenTeam || '');
                    const chB = String(b.chosenTeam || '');
                    const cmp = chA.localeCompare(chB, 'th');
                    return currentSortDirection === 'asc' ? cmp : -cmp;
                }

                if (currentSortColumn === 'prize') {
                    const pzA = winnerPrizeMap.get(idA)?.title || '';
                    const pzB = winnerPrizeMap.get(idB)?.title || '';
                    const cmp = pzA.localeCompare(pzB, 'th');
                    return currentSortDirection === 'asc' ? cmp : -cmp;
                }

                return 0;
            });
        }

        // Update Sorting Indicators in Table Headers
        const sortHeaders = document.querySelectorAll('.crsdg-member-table th.sortable-th');
        sortHeaders.forEach(th => {
            const key = th.getAttribute('data-sort');
            const iconEl = th.querySelector('.sort-icon');
            th.classList.remove('sort-asc', 'sort-desc');
            if (key === currentSortColumn) {
                th.classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
                if (iconEl) iconEl.textContent = currentSortDirection === 'asc' ? '▲' : '▼';
            } else {
                if (iconEl) iconEl.textContent = '⇅';
            }
        });

        if (filtered.length === 0) {
            const allMembers = state.getMembers();
            if (allMembers.length === 0) {
                participantsTableBody.innerHTML = `
                    <tr>
                        <td colspan="10">
                            <div class="table-empty-container">
                                <div class="table-empty-icon">👥</div>
                                <div class="table-empty-title">ยังไม่มีข้อมูลพนักงานในตาราง crsdg_member</div>
                                <div class="table-empty-desc">
                                    เริ่มนำเข้าข้อมูลพนักงานจากไฟล์ Excel (.xlsx / .xls / .csv) หรือคลิกเพิ่มพนักงานรายบุคคล
                                </div>
                                <button type="button" class="btn-primary btn-empty-upload" onclick="openExcelUploadModal()">
                                    <svg class="btn-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="17 8 12 3 7 8"/>
                                        <line x1="12" y1="3" x2="12" y2="15"/>
                                    </svg>
                                    <span>อัปโหลดไฟล์ Excel (.xlsx)</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                participantsTableBody.innerHTML = `
                    <tr>
                        <td colspan="10" class="table-empty" style="text-align: center; padding: 24px; color: var(--text-secondary);">
                            🔍 ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไขการค้นหา
                        </td>
                    </tr>
                `;
            }
            return;
        }

        participantsTableBody.innerHTML = filtered.map((m, idx) => {
            const empId = m.EmployeeID || m.id;
            const empName = m.EmpName || m.name;
            const group = m.Group || m.department || 'Team A';
            const isWinner = winnerIds.has(empId);

            // Deterministic badge color for group
            let grpColor = '#3b82f6';
            if (group.toLowerCase().includes('b')) grpColor = '#f97316';
            else if (group.toLowerCase().includes('c')) grpColor = '#10b981';
            else if (group.toLowerCase().includes('d')) grpColor = '#eab308';

            // ทีมแข่งขัน (crsdg_team & crsdg_nameteam)
            const tInfo = memberTeamMap.get(empId);
            let teamHTML = `<span class="empty-cell-dash">-</span>`;
            if (tInfo) {
                const roleIcon = tInfo.isCaptain ? '👑 ' : '';
                teamHTML = `
                    <span class="team-pill-badge" style="border: 1px solid ${tInfo.color || '#3b82f6'}; color: #ffffff; background: rgba(255,255,255,0.06);" title="${tInfo.name} (${tInfo.isCaptain ? 'กัปตันทีม' : 'สมาชิก'})">
                        <span class="team-dot" style="background: ${tInfo.color || '#3b82f6'};"></span>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${roleIcon}${tInfo.name}</span>
                    </span>
                `;
            }

            // ลงทะเบียน (วันและเวลา) - หากยังไม่มีข้อมูลใส่วันและเวลาให้แสดงสถานะ "ยังไม่ลงทะเบียน"
            let registeredHTML = `<span class="badge badge-neutral" style="font-size: 0.7rem; opacity: 0.55; padding: 2px 6px;">ยังไม่ลงทะเบียน</span>`;
            if (m.registered === true && m.registeredAt) {
                registeredHTML = `<span class="reg-time-badge" title="เวลาลงทะเบียน: ${m.registeredAt}"><span style="color: #10b981; margin-right: 3px;">●</span>${formatThaiDateTime(m.registeredAt)}</span>`;
            }

            // เลือกทีม (ทายผลชนะ)
            let chosenTeamHTML = `<span class="empty-cell-dash">-</span>`;
            if (m.chosenTeam) {
                chosenTeamHTML = `
                    <span class="chosen-team-badge" title="ทายผลทีมชนะ: ${m.chosenTeam}">
                        <span>🎯</span>
                        <span>${m.chosenTeam}</span>
                    </span>
                `;
            }

            // ผลสุ่มรางวัล (บันทึกลง crsdg_member และแสดงผล: หากได้รับรางวัล แสดงชื่อรางวัล, หากลงทะเบียนแล้ว รอสุ่ม, ยังไม่ลงทะเบียน แสดง -)
            const cleanEmpId = String(empId || '').trim();
            const pzFromMap = winnerPrizeMap.get(cleanEmpId) || winnerPrizeMap.get(cleanEmpId.padStart(5, '0')) || winnerPrizeMap.get(cleanEmpId.replace(/^0+/, ''));
            const pzTitle = (pzFromMap ? (pzFromMap.title || pzFromMap) : null) || m.wonPrize || m.prizeTitle || m.prizeResult || (isWinner ? 'ได้รับรางวัลแล้ว' : null);

            let prizeHTML = `<span class="empty-cell-dash">-</span>`;
            if (isWinner || m.hasWon || pzTitle) {
                const finalTitle = pzTitle || 'ได้รับรางวัลแล้ว';
                const pzIcon = (pzFromMap && pzFromMap.icon) ? pzFromMap.icon : '🎁';
                prizeHTML = `
                    <span class="badge badge-success winner-prize-pill" title="${finalTitle}">
                        <span>${pzIcon}</span>
                        <span class="winner-prize-name">${finalTitle}</span>
                    </span>
                `;
            } else if (m.registered === true && m.registeredAt) {
                prizeHTML = `<span class="badge badge-neutral" style="font-size: 0.72rem; padding: 2px 7px; color: #93c5fd; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3);">รอผลการสุ่ม</span>`;
            } else {
                prizeHTML = `<span class="empty-cell-dash">-</span>`;
            }

            return `
                <tr>
                    <td class="col-td-num" style="text-align: center; color: var(--text-secondary); font-size: 0.76rem; font-family: 'Kanit', sans-serif;">${idx + 1}</td>
                    <td class="col-td-photo" style="text-align: center;" onclick="openCropperForMember('${empId}')">
                        ${getAvatarHTML(m, 28)}
                    </td>
                    <td class="col-td-id">
                        <span class="empid-badge">${empId}</span>
                    </td>
                    <td class="col-td-name" title="${empName}">
                        <strong>${empName}</strong>
                    </td>
                    <td class="col-td-group" title="สังกัด: ${group}">
                        <span class="team-pill-badge" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); color: #ffffff;" title="${group}">
                            <span class="team-dot" style="background: ${grpColor};"></span>
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${group}</span>
                        </span>
                    </td>
                    <td class="col-td-team" title="${tInfo ? ('ทีมแข่งขัน: ' + tInfo.name) : '-'}">
                        ${teamHTML}
                    </td>
                    <td class="col-td-registered">
                        ${registeredHTML}
                    </td>
                    <td class="col-td-chosen">
                        ${chosenTeamHTML}
                    </td>
                    <td class="col-td-status" style="text-align: left;">
                        ${prizeHTML}
                    </td>
                    <td class="col-td-actions" style="text-align: center;">
                        <div style="display: inline-flex; gap: 5px; align-items: center; justify-content: center;">
                            <button type="button" class="btn-action-sm btn-secondary" onclick="openEditMemberModal('${empId}')" title="แก้ไขข้อมูลและรูปภาพพนักงาน">
                                ✏️ แก้ไข
                            </button>
                            <button type="button" class="btn-action-sm btn-action-del" onclick="deleteMemberItem('${empId}')" title="ลบข้อมูล">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Filter event listeners & Clear Controls
    const btnClearSearchParticipant = document.getElementById('btnClearSearchParticipant');
    const btnClearParticipantFilter = document.getElementById('btnClearParticipantFilter');

    if (searchParticipantInput) {
        searchParticipantInput.value = ''; // Always clear on load
        searchParticipantInput.addEventListener('input', () => {
            if (btnClearSearchParticipant) {
                btnClearSearchParticipant.style.display = searchParticipantInput.value.trim() ? 'flex' : 'none';
            }
            renderParticipants();
        });
    }

    if (btnClearSearchParticipant && searchParticipantInput) {
        btnClearSearchParticipant.addEventListener('click', () => {
            searchParticipantInput.value = '';
            btnClearSearchParticipant.style.display = 'none';
            renderParticipants();
            searchParticipantInput.focus();
        });
    }

    if (btnClearParticipantFilter) {
        btnClearParticipantFilter.addEventListener('click', () => {
            if (searchParticipantInput) {
                searchParticipantInput.value = '';
                if (btnClearSearchParticipant) btnClearSearchParticipant.style.display = 'none';
            }
            if (filterTeamSelect) filterTeamSelect.value = 'all';
            if (filterStatusSelect) filterStatusSelect.value = 'all';
            renderParticipants();
            showToast('ล้างการค้นหาและตัวกรองพนักงานทั้งหมดแล้ว 🔄');
            if (sound) sound.playClick();
        });
    }

    if (filterTeamSelect) filterTeamSelect.addEventListener('change', () => renderParticipants());
    if (filterStatusSelect) filterStatusSelect.addEventListener('change', () => renderParticipants());

    // Toggle Single Add Box
    if (btnToggleSingleAdd && singleAddBox) {
        btnToggleSingleAdd.addEventListener('click', () => {
            const isHidden = singleAddBox.style.display === 'none';
            singleAddBox.style.display = isHidden ? 'block' : 'none';
            btnToggleSingleAdd.innerHTML = isHidden ? '✕ ปิดฟอร์ม' : '<span>+ เพิ่มพนักงาน</span>';
        });
    }
    if (btnCloseSingleAdd && singleAddBox) {
        btnCloseSingleAdd.addEventListener('click', () => {
            singleAddBox.style.display = 'none';
            if (btnToggleSingleAdd) btnToggleSingleAdd.innerHTML = '<span>+ เพิ่มพนักงาน</span>';
        });
    }

    // ========================================================
    // LIGHTBOX 1: EXCEL UPLOAD MODAL (.xlsx, .xls, .csv)
    // ========================================================
    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function openExcelUploadModal() {
        if (!excelUploadModal) return;
        // Reset modal form
        if (excelFileInput) excelFileInput.value = '';
        if (selectedFileBadge) selectedFileBadge.style.display = 'none';
        if (excelParsedPreview) excelParsedPreview.style.display = 'none';
        if (confirmExcelUploadBtn) confirmExcelUploadBtn.disabled = true;
        pendingExcelRows = [];
        excelUploadModal.style.display = 'flex';
        if (sound) sound.playClick();
    }
    window.openExcelUploadModal = openExcelUploadModal;

    function closeExcelUploadModal() {
        if (excelUploadModal) excelUploadModal.style.display = 'none';
        pendingExcelRows = [];
    }
    window.closeExcelUploadModal = closeExcelUploadModal;

    if (btnOpenExcelModal) {
        btnOpenExcelModal.addEventListener('click', openExcelUploadModal);
    }
    if (closeExcelUploadModalBtn) {
        closeExcelUploadModalBtn.addEventListener('click', closeExcelUploadModal);
    }
    if (cancelExcelUploadBtn) {
        cancelExcelUploadBtn.addEventListener('click', closeExcelUploadModal);
    }
    if (excelUploadModal) {
        excelUploadModal.addEventListener('click', (e) => {
            if (e.target === excelUploadModal) closeExcelUploadModal();
        });
    }

    if (btnBrowseExcelFile && excelFileInput) {
        btnBrowseExcelFile.addEventListener('click', (e) => {
            e.stopPropagation();
            excelFileInput.click();
        });
    }

    if (excelModalDropzone && excelFileInput) {
        excelModalDropzone.addEventListener('click', (e) => {
            if (e.target !== btnBrowseExcelFile && !btnBrowseExcelFile.contains(e.target)) {
                excelFileInput.click();
            }
        });

        excelModalDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            excelModalDropzone.classList.add('dragover');
        });
        excelModalDropzone.addEventListener('dragleave', () => {
            excelModalDropzone.classList.remove('dragover');
        });
        excelModalDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            excelModalDropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleExcelFile(e.dataTransfer.files[0]);
            }
        });

        excelFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleExcelFile(e.target.files[0]);
            }
        });
    }

    function handleExcelFile(file) {
        if (!file) return;
        if (typeof XLSX === 'undefined') {
            alert('กำลังโหลดไลบรารี Excel กรุณาลองใหม่อีกครั้ง');
            return;
        }

        // Show selected file badge
        if (selectedFileBadge && selectedFileName && selectedFileSize) {
            selectedFileName.textContent = file.name;
            selectedFileSize.textContent = `(${formatFileSize(file.size)})`;
            selectedFileBadge.style.display = 'inline-flex';
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (!rawRows || rawRows.length === 0) {
                    alert('ไฟล์ Excel ว่างเปล่า');
                    return;
                }

                // Detect headers and row mapping
                parseAndPreviewExcelRows(rawRows);
            } catch (err) {
                console.error('Excel parse error:', err);
                alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function parseAndPreviewExcelRows(rawRows) {
        if (!rawRows || rawRows.length < 2) {
            alert('ไฟล์ Excel ต้องมีแถวหัวตารางและข้อมูลอย่างน้อย 1 รายการ');
            return;
        }

        // Find header row (look for EmployeeID, EmpName, Group)
        let headerRowIdx = 0;
        let colEmpId = 0;
        let colEmpName = 1;
        let colGroup = 2;

        for (let r = 0; r < Math.min(5, rawRows.length); r++) {
            const row = rawRows[r].map(c => String(c).toLowerCase().trim().replace(/[\s_-]/g, ''));
            const foundId = row.findIndex(c => c.includes('employeeid') || c.includes('empid') || c.includes('รหัส'));
            const foundName = row.findIndex(c => c.includes('empname') || c.includes('name') || c.includes('ชื่อ'));
            const foundGroup = row.findIndex(c => c.includes('group') || c.includes('team') || c.includes('กลุ่ม') || c.includes('ฝ่าย') || c.includes('ทีม'));

            if (foundId !== -1 && foundName !== -1) {
                headerRowIdx = r;
                colEmpId = foundId;
                colEmpName = foundName;
                if (foundGroup !== -1) colGroup = foundGroup;
                break;
            }
        }

        const parsedMembers = [];
        for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!row || row.length === 0) continue;

            const id = String(row[colEmpId] || '').trim();
            const name = String(row[colEmpName] || '').trim();
            const rawGroup = (row[colGroup] !== undefined && row[colGroup] !== null) ? String(row[colGroup]).trim() : '';
            const group = (rawGroup.toLowerCase() === 'team a' || rawGroup.toLowerCase() === 'none' || rawGroup.toLowerCase() === 'null') ? '' : rawGroup;

            if (id && name) {
                parsedMembers.push({
                    EmployeeID: id,
                    EmpName: name,
                    Group: group
                });
            }
        }

        if (parsedMembers.length === 0) {
            alert('ไม่พบข้อมูลพนักงานที่ถูกต้องในไฟล์ Excel (ต้องมีรหัสและชื่อพนักงาน)');
            return;
        }

        pendingExcelRows = parsedMembers;

        if (excelParsedSummary) {
            excelParsedSummary.innerHTML = `พบข้อมูลพนักงานทั้งหมด <strong>${parsedMembers.length}</strong> รายการ จากไฟล์ Excel:`;
        }
        if (excelModalPreviewTableBody) {
            excelModalPreviewTableBody.innerHTML = parsedMembers.slice(0, 8).map((m, idx) => `
                <tr>
                    <td style="text-align: center; color: var(--text-secondary);">${idx + 1}</td>
                    <td><span class="empid-badge">${m.EmployeeID}</span></td>
                    <td><strong>${m.EmpName}</strong></td>
                    <td><span class="badge badge-info" style="font-size: 0.72rem;">${m.Group}</span></td>
                </tr>
            `).join('') + (parsedMembers.length > 8 ? `<tr><td colspan="4" style="text-align:center; color: var(--text-secondary); padding: 8px;">... และอีก ${parsedMembers.length - 8} รายการ</td></tr>` : '');
        }

        if (excelParsedPreview) {
            excelParsedPreview.style.display = 'block';
        }

        if (confirmExcelUploadBtn) {
            confirmExcelUploadBtn.disabled = false;
        }
    }

    // Confirm Excel Import
    if (confirmExcelUploadBtn) {
        confirmExcelUploadBtn.addEventListener('click', () => {
            if (!pendingExcelRows || pendingExcelRows.length === 0) return;

            const modeRadios = document.getElementsByName('importModeRadio');
            let mode = 'append';
            for (let r of modeRadios) {
                if (r.checked) {
                    mode = r.value;
                    break;
                }
            }

            const rowsToImport = [...pendingExcelRows];

            // 1. ปิดหน้า Lightbox ทันที ไม่ให้ค้างบนหน้าจอ
            closeExcelUploadModal();
            if (excelFileInput) excelFileInput.value = '';
            pendingExcelRows = [];

            // 2. บันทึกลงตาราง crsdg_member ใน Local State เพื่อแสดงผลทันที
            state.importMembers(rowsToImport, mode);
            renderAll();
            if (sound) sound.playClick();

            showToast(`กำลังบันทึกข้อมูล ${rowsToImport.length} ท่านลงใน Firebase (crsdg_member)...`);

            // 3. บันทึกตรงไปยัง Firebase Cloud Firestore ตาราง crsdg_member
            if (window.FirebaseSync && typeof window.FirebaseSync.importMembersToCloud === 'function') {
                window.FirebaseSync.importMembersToCloud(rowsToImport, mode).then(res => {
                    if (res && res.success) {
                        showToast(`✅ บันทึกข้อมูล ${rowsToImport.length} ท่านลงใน Firebase ตาราง crsdg_member เรียบร้อยแล้ว`);
                        renderAll();
                    } else {
                        showToast(`⚠️ บันทึกข้อมูลในเครื่องแล้ว (Firebase: ${res?.error || 'เชื่อมต่อขัดข้อง'})`);
                    }
                }).catch(err => {
                    console.error('[Admin] Firebase write error:', err);
                    showToast(`⚠️ บันทึกในเครื่องเรียบร้อย (Firebase: ${err.message})`);
                });
            } else {
                showToast(`นำเข้าสำเร็จ ${rowsToImport.length} ท่าน! (บันทึกลงตาราง crsdg_member เรียบร้อย)`);
            }
        });
    }

    if (btnSwitchToTextPaste) {
        btnSwitchToTextPaste.addEventListener('click', () => {
            closeExcelUploadModal();
            if (importModal) importModal.style.display = 'flex';
        });
    }

    // ========================================================
    // LIGHTBOX 2: CONFIRM DELETE ALL MEMBERS MODAL (PASSWORD: 111111)
    // ========================================================
    const deleteAdminPasswordInput = document.getElementById('deleteAdminPasswordInput');
    const deletePasswordErrorMsg = document.getElementById('deletePasswordErrorMsg');

    function resetDeleteModalState() {
        if (deleteAdminPasswordInput) {
            deleteAdminPasswordInput.value = '';
        }
        if (deletePasswordErrorMsg) {
            deletePasswordErrorMsg.style.display = 'none';
        }
        if (confirmDeleteAllBtn) {
            confirmDeleteAllBtn.disabled = true;
            confirmDeleteAllBtn.style.opacity = '0.45';
            confirmDeleteAllBtn.style.cursor = 'not-allowed';
        }
    }

    function openDeleteAllModal() {
        const members = state.getMembers();
        if (members.length === 0) {
            alert('ไม่มีข้อมูลพนักงานในตาราง crsdg_member ให้ลบ');
            return;
        }
        if (deleteModalCount) {
            deleteModalCount.textContent = members.length;
        }
        resetDeleteModalState();
        if (confirmDeleteAllModal) {
            confirmDeleteAllModal.style.display = 'flex';
        }
        if (deleteAdminPasswordInput) {
            setTimeout(() => deleteAdminPasswordInput.focus(), 120);
        }
        if (sound) sound.playClick();
    }
    window.openDeleteAllModal = openDeleteAllModal;

    function closeDeleteAllModal() {
        if (confirmDeleteAllModal) {
            confirmDeleteAllModal.style.display = 'none';
        }
        resetDeleteModalState();
    }
    window.closeDeleteAllModal = closeDeleteAllModal;

    if (btnOpenDeleteModal) {
        btnOpenDeleteModal.addEventListener('click', openDeleteAllModal);
    }
    if (closeDeleteAllModalBtn) {
        closeDeleteAllModalBtn.addEventListener('click', closeDeleteAllModal);
    }
    if (cancelDeleteAllModalBtn) {
        cancelDeleteAllModalBtn.addEventListener('click', closeDeleteAllModal);
    }
    if (confirmDeleteAllModal) {
        confirmDeleteAllModal.addEventListener('click', (e) => {
            if (e.target === confirmDeleteAllModal) closeDeleteAllModal();
        });
    }

    if (deleteAdminPasswordInput && confirmDeleteAllBtn) {
        deleteAdminPasswordInput.addEventListener('input', () => {
            const pwd = deleteAdminPasswordInput.value.trim();
            if (pwd === '111111') {
                confirmDeleteAllBtn.disabled = false;
                confirmDeleteAllBtn.style.opacity = '1';
                confirmDeleteAllBtn.style.cursor = 'pointer';
                if (deletePasswordErrorMsg) deletePasswordErrorMsg.style.display = 'none';
            } else {
                confirmDeleteAllBtn.disabled = true;
                confirmDeleteAllBtn.style.opacity = '0.45';
                confirmDeleteAllBtn.style.cursor = 'not-allowed';
                if (pwd.length >= 6 && deletePasswordErrorMsg) {
                    deletePasswordErrorMsg.style.display = 'block';
                } else if (deletePasswordErrorMsg) {
                    deletePasswordErrorMsg.style.display = 'none';
                }
            }
        });

        deleteAdminPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !confirmDeleteAllBtn.disabled) {
                confirmDeleteAllBtn.click();
            }
        });
    }

    if (confirmDeleteAllBtn) {
        confirmDeleteAllBtn.addEventListener('click', () => {
            if (deleteAdminPasswordInput && deleteAdminPasswordInput.value.trim() !== '111111') {
                if (deletePasswordErrorMsg) deletePasswordErrorMsg.style.display = 'block';
                deleteAdminPasswordInput.focus();
                return;
            }
            const res = state.clearAllMembers();
            closeDeleteAllModal();
            showToast(res.message || 'ลบข้อมูลพนักงานทั้งหมดออกจากตาราง crsdg_member เรียบร้อยแล้ว');
            if (sound) sound.playClick();
            renderAll();

            if (window.FirebaseSync && typeof window.FirebaseSync.clearAllMembersFromCloud === 'function') {
                window.FirebaseSync.clearAllMembersFromCloud().then(() => {
                    console.log('[Admin] Cleared all members in Firebase crsdg_member');
                }).catch(err => {
                    console.error('[Admin] Error clearing members from Firebase:', err);
                });
            }
        });
    }

    // Export current members to Excel
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            const members = state.getMembers();
            if (members.length === 0) {
                alert('ยังไม่มีข้อมูลสมาชิกในตาราง crsdg_member ให้ส่งออก');
                return;
            }

            // Build Teams & Winners map for export
            const teams = state.getTeams();
            const memberTeamMap = new Map();
            teams.forEach(t => {
                if (t.captainId) memberTeamMap.set(t.captainId, t.name + ' (กัปตัน)');
                (t.memberIds || []).forEach(mid => memberTeamMap.set(mid, t.name));
            });
            const winners = state.getWinners();
            const winnerPrizeMap = new Map();
            winners.forEach(w => {
                if (w.participant?.id) winnerPrizeMap.set(w.participant.id, w.prize.title);
            });

            const exportData = members.map((m, idx) => ({
                'ลำดับ': idx + 1,
                'EmployeeID': m.EmployeeID || m.id,
                'EmpName': m.EmpName || m.name,
                'Group': m.Group || m.department || 'Team A',
                'ทีมแข่งขัน': memberTeamMap.get(m.EmployeeID || m.id) || '-',
                'ลงทะเบียน': (m.registered === true && m.registeredAt) ? formatThaiDateTime(m.registeredAt) : (m.registered === true ? 'ลงทะเบียนแล้ว' : 'ยังไม่ลงทะเบียน'),
                'เลือกทีม': m.chosenTeam || '-',
                'ผลสุ่มรางวัล': winnerPrizeMap.get(m.EmployeeID || m.id) || 'มีสิทธิ์ลุ้น'
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'crsdg_member');
            XLSX.writeFile(wb, `crsdg_member_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showToast(`ส่งออกข้อมูลสมาชิก ${members.length} ท่านเป็นไฟล์ Excel สำเร็จ`);
        });
    }

    // ========================================================
    // BULK IMPORT TEXT / CSV MODAL
    // ========================================================
    if (importCsvBtn && importModal) {
        importCsvBtn.addEventListener('click', () => importModal.style.display = 'flex');
    }
    if (importCloseBtn && importModal) {
        importCloseBtn.addEventListener('click', () => importModal.style.display = 'none');
    }
    if (importCancelBtn && importModal) {
        importCancelBtn.addEventListener('click', () => importModal.style.display = 'none');
    }
    if (importSubmitBtn && importTextarea) {
        importSubmitBtn.addEventListener('click', () => {
            const raw = importTextarea.value.trim();
            if (!raw) return;

            const lines = raw.split('\n');
            const newMembers = [];

            lines.forEach((line) => {
                const parts = line.split(/[,\t]/).map(s => s.trim().replace(/^["']|["']$/g, ''));
                if (parts.length >= 2) {
                    const id = parts[0];
                    const name = parts[1];
                    const grp = parts[2] || 'Team A';

                    if (id && name) {
                        newMembers.push({
                            EmployeeID: id,
                            EmpName: name,
                            Group: grp
                        });
                    }
                }
            });

            if (newMembers.length > 0) {
                state.importMembers(newMembers, 'append');
                showToast(`นำเข้ารายชื่อสำเร็จ ${newMembers.length} ท่าน!`);
                importTextarea.value = '';
                importModal.style.display = 'none';
                renderAll();
            } else {
                alert('ไม่พบข้อมูล หรือรูปแบบข้อมูลไม่ถูกต้อง (ต้องมีอย่างน้อย: EmployeeID, EmpName)');
            }
        });
    }

    // ========================================================
    // SINGLE ADD MEMBER FORM (crsdg_member)
    // ========================================================
    if (avatarPreviewBox && btnChoosePhoto && partPhotoInput) {
        avatarPreviewBox.addEventListener('click', () => partPhotoInput.click());
        btnChoosePhoto.addEventListener('click', () => partPhotoInput.click());

        partPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            openCropperForFile(file, null, (croppedBase64) => {
                currentNewPhotoBase64 = croppedBase64;
                avatarPreviewImg.src = croppedBase64;
                avatarPreviewImg.style.display = 'block';
                avatarPlaceholder.style.display = 'none';
                if (btnRemovePhoto) btnRemovePhoto.style.display = 'inline-block';
            });
        });
    }

    if (btnRemovePhoto) {
        btnRemovePhoto.addEventListener('click', () => {
            currentNewPhotoBase64 = '';
            partPhotoInput.value = '';
            avatarPreviewImg.src = '';
            avatarPreviewImg.style.display = 'none';
            avatarPlaceholder.style.display = 'flex';
            btnRemovePhoto.style.display = 'none';
        });
    }

    if (addParticipantForm) {
        addParticipantForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const empId = document.getElementById('partId').value.trim();
            const empName = document.getElementById('partName').value.trim();
            const group = document.getElementById('partDept').value.trim() || 'Team A';

            if (!empId) {
                alert('กรุณากรอกรหัสพนักงาน');
                document.getElementById('partId').focus();
                return;
            }
            if (!empName) {
                alert('กรุณากรอกชื่อ-นามสกุลพนักงาน');
                document.getElementById('partName').focus();
                return;
            }

            let finalPhoto = currentNewPhotoBase64 || '';
            if (finalPhoto && window.FirebaseStorageManager) {
                try {
                    showToast('กำลังปรับขนาดและอัปโหลดรูปภาพสู่ Firebase Storage...');
                    const uploadRes = await window.FirebaseStorageManager.uploadMemberPhoto(empId, finalPhoto);
                    finalPhoto = uploadRes.downloadUrl || uploadRes.dataUrl;
                } catch (fbErr) {
                    console.warn('[Admin] Firebase upload warning:', fbErr);
                }
            }

            const res = state.addMember({
                EmployeeID: empId,
                EmpName: empName,
                Group: group,
                photo: finalPhoto
            });

            if (!res.success) {
                alert(res.message);
                return;
            }

            if (window.FirebaseSync && typeof window.FirebaseSync.saveMember === 'function') {
                window.FirebaseSync.saveMember({
                    EmployeeID: empId,
                    EmpName: empName,
                    Group: group,
                    photo: finalPhoto,
                    registered: null,
                    registeredAt: null,
                    chosenTeam: null,
                    prize: null
                }).catch(err => console.error('[Admin] Firebase saveMember error:', err));
            }

            // Reset form
            addParticipantForm.reset();
            currentNewPhotoBase64 = '';
            if (avatarPreviewImg) avatarPreviewImg.style.display = 'none';
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'flex';
            if (btnRemovePhoto) btnRemovePhoto.style.display = 'none';

            renderAll();
            showToast(res.message);
            if (sound) sound.playClick();
        });
    }

    // ========================================================
    // INTEGRATED EDIT MEMBER MODAL & INLINE PHOTO CROPPER
    // ========================================================
    const editCropper = {
        ctx: null,
        previewCtx: null,
        img: null,
        originalImgSrc: '',
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        imgBaseX: 0,
        imgBaseY: 0,
        canvasSize: 260,
        cropSize: 200,
        hasPhoto: false
    };

    function initEditCropperCanvas() {
        if (!editCropCanvas) return;
        editCropper.ctx = editCropCanvas.getContext('2d');
        editCropper.previewCtx = editCropPreviewCanvas ? editCropPreviewCanvas.getContext('2d') : null;
    }

    function updateEditZoomLabel(scale) {
        if (!editZoomLevelText) return;
        const pct = Math.round(scale * 100);
        if (pct < 100) {
            const shrink = 100 - pct;
            editZoomLevelText.textContent = `${pct}% (ย่อ -${shrink}%)`;
        } else if (pct > 100) {
            const grow = pct - 100;
            editZoomLevelText.textContent = `${pct}% (+${grow}%)`;
        } else {
            editZoomLevelText.textContent = '100%';
        }
    }

    function renderEditCropper() {
        if (!editCropper.ctx) return;
        const ctx = editCropper.ctx;
        const w = editCropper.canvasSize;
        const h = editCropper.canvasSize;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#050b18';
        ctx.fillRect(0, 0, w, h);

        if (!editCropper.hasPhoto || !editCropper.img) {
            // Placeholder when no photo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.font = '36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👤', w / 2, h / 2 - 10);
            ctx.font = '12px "Kanit", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillText('ยังไม่มีรูปภาพ (คลิกเลือกรูปภาพ)', w / 2, h / 2 + 25);
            renderEditCropperPreview();
            return;
        }

        ctx.save();
        ctx.translate(w / 2 + editCropper.offsetX, h / 2 + editCropper.offsetY);
        ctx.rotate((editCropper.rotation * Math.PI) / 180);
        ctx.scale(editCropper.scale, editCropper.scale);

        const imgW = editCropper.img.width;
        const imgH = editCropper.img.height;
        ctx.drawImage(editCropper.img, -imgW / 2, -imgH / 2);
        ctx.restore();

        renderEditCropperPreview();
    }

    function renderEditCropperPreview() {
        if (!editCropper.previewCtx) return;
        const pCtx = editCropper.previewCtx;
        const pw = 48;
        const ph = 48;

        pCtx.clearRect(0, 0, pw, ph);

        if (!editCropper.hasPhoto || !editCropper.img) {
            pCtx.fillStyle = '#1e293b';
            pCtx.fillRect(0, 0, pw, ph);
            pCtx.fillStyle = '#94a3b8';
            pCtx.font = '20px sans-serif';
            pCtx.textAlign = 'center';
            pCtx.textBaseline = 'middle';
            pCtx.fillText('👤', pw / 2, ph / 2);
            return;
        }

        pCtx.save();
        pCtx.beginPath();
        pCtx.arc(pw / 2, ph / 2, pw / 2, 0, Math.PI * 2);
        pCtx.closePath();
        pCtx.clip();

        const sourceSize = editCropper.cropSize;
        const sourceX = (editCropper.canvasSize - sourceSize) / 2;
        const sourceY = (editCropper.canvasSize - sourceSize) / 2;

        pCtx.drawImage(editCropCanvas, sourceX, sourceY, sourceSize, sourceSize, 0, 0, pw, ph);
        pCtx.restore();
    }

    function setEditCropperZoom(newScale) {
        // Allow zooming out down to 0.30 (-70% shrink) up to 3.0x zoom
        editCropper.scale = Math.min(3.0, Math.max(0.30, newScale));
        if (editZoomRangeInput) editZoomRangeInput.value = editCropper.scale.toFixed(2);
        updateEditZoomLabel(editCropper.scale);
        renderEditCropper();
    }

    // Auto-detect and trim baked-in black sidebars from previously cropped images
    function trimBakedBlackBorders(img) {
        try {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, img.width, img.height);
            const d = imgData.data;
            const w = img.width;
            const h = img.height;

            const isDarkPixel = (x, y) => {
                const idx = (y * w + x) * 4;
                return d[idx] < 28 && d[idx + 1] < 28 && d[idx + 2] < 42;
            };

            const isColDark = (x) => {
                let darkCount = 0;
                const step = 2;
                const samples = Math.floor(h / step);
                for (let y = 0; y < h; y += step) {
                    if (isDarkPixel(x, y)) darkCount++;
                }
                return (darkCount / samples) > 0.85;
            };

            let left = 0;
            while (left < w * 0.35 && isColDark(left)) left++;

            let right = w - 1;
            while (right > w * 0.65 && isColDark(right)) right--;

            if (left > 3 || right < w - 4) {
                const trimmedW = right - left + 1;
                const outCanvas = document.createElement('canvas');
                outCanvas.width = trimmedW;
                outCanvas.height = h;
                const outCtx = outCanvas.getContext('2d');
                outCtx.drawImage(c, left, 0, trimmedW, h, 0, 0, trimmedW, h);
                return outCanvas.toDataURL('image/jpeg', 0.95);
            }
        } catch (e) {
            console.warn('trimBakedBlackBorders error', e);
        }
        return null;
    }

    // Auto-scale and center photo so it covers the circular crop guide completely without black sidebars
    function autoFitAndCenterCropper(img) {
        editCropper.offsetX = 0;
        editCropper.offsetY = 0;
        editCropper.rotation = 0;

        const cropSize = editCropper.cropSize; // 200
        const minDim = Math.min(img.width, img.height);
        const coverScale = cropSize / minDim;
        editCropper.scale = Math.max(1.0, Math.round(coverScale * 100) / 100);

        if (editZoomRangeInput) {
            editZoomRangeInput.value = editCropper.scale.toFixed(2);
        }
        updateEditZoomLabel(editCropper.scale);
        renderEditCropper();
    }

    function resetEditCropper() {
        if (editCropper.img) {
            autoFitAndCenterCropper(editCropper.img);
        } else {
            editCropper.offsetX = 0;
            editCropper.offsetY = 0;
            editCropper.rotation = 0;
            editCropper.scale = 1.0;
            if (editZoomRangeInput) editZoomRangeInput.value = '1.0';
            updateEditZoomLabel(1.0);
            renderEditCropper();
        }
    }

    function loadEditCropperImage(src) {
        initEditCropperCanvas();
        if (!src || src.length < 30) {
            editCropper.img = null;
            editCropper.originalImgSrc = '';
            editCropper.hasPhoto = false;
            renderEditCropper();
            return;
        }

        editCropper.originalImgSrc = src;
        const img = new Image();
        img.onload = () => {
            const trimmedDataUrl = trimBakedBlackBorders(img);
            if (trimmedDataUrl) {
                const cleanedImg = new Image();
                cleanedImg.onload = () => {
                    editCropper.img = cleanedImg;
                    editCropper.hasPhoto = true;
                    autoFitAndCenterCropper(cleanedImg);
                };
                cleanedImg.src = trimmedDataUrl;
            } else {
                editCropper.img = img;
                editCropper.hasPhoto = true;
                autoFitAndCenterCropper(img);
            }
        };
        img.onerror = () => {
            editCropper.img = null;
            editCropper.originalImgSrc = '';
            editCropper.hasPhoto = false;
            renderEditCropper();
        };
        img.src = src;
    }

    // Drag / Pan interaction on editCropCanvasWrapper
    if (editCropCanvasWrapper) {
        const handleStart = (clientX, clientY) => {
            if (!editCropper.hasPhoto) return;
            editCropper.isDragging = true;
            editCropper.dragStartX = clientX;
            editCropper.dragStartY = clientY;
            editCropper.imgBaseX = editCropper.offsetX;
            editCropper.imgBaseY = editCropper.offsetY;
        };

        const handleMove = (clientX, clientY) => {
            if (!editCropper.isDragging) return;
            const dx = clientX - editCropper.dragStartX;
            const dy = clientY - editCropper.dragStartY;
            editCropper.offsetX = editCropper.imgBaseX + dx;
            editCropper.offsetY = editCropper.imgBaseY + dy;
            renderEditCropper();
        };

        const handleEnd = () => {
            editCropper.isDragging = false;
        };

        editCropCanvasWrapper.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => {
            if (editCropper.isDragging) handleMove(e.clientX, e.clientY);
        });
        window.addEventListener('mouseup', handleEnd);

        editCropCanvasWrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && editCropper.isDragging) handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        window.addEventListener('touchend', handleEnd);

        editCropCanvasWrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.08 : -0.08;
            setEditCropperZoom(editCropper.scale + delta);
        }, { passive: false });
    }

    if (editZoomRangeInput) {
        editZoomRangeInput.addEventListener('input', (e) => setEditCropperZoom(parseFloat(e.target.value)));
    }
    if (btnEditZoomIn) btnEditZoomIn.addEventListener('click', () => setEditCropperZoom(editCropper.scale + 0.1));
    if (btnEditZoomOut) btnEditZoomOut.addEventListener('click', () => setEditCropperZoom(editCropper.scale - 0.1));
    if (btnEditResetCrop) btnEditResetCrop.addEventListener('click', resetEditCropper);
    if (btnEditRotateCrop) {
        btnEditRotateCrop.addEventListener('click', () => {
            editCropper.rotation = (editCropper.rotation + 90) % 360;
            renderEditCropper();
        });
    }

    if (btnEditBrowsePhoto && editPhotoFileInput) {
        btnEditBrowsePhoto.addEventListener('click', () => editPhotoFileInput.click());
    }

    if (editPhotoFileInput) {
        editPhotoFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (re) => loadEditCropperImage(re.target.result);
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    if (btnEditRemovePhoto) {
        btnEditRemovePhoto.addEventListener('click', () => {
            editCropper.img = null;
            editCropper.hasPhoto = false;
            editCropper.originalImgSrc = '';
            if (editPhotoFileInput) editPhotoFileInput.value = '';
            renderEditCropper();
            showToast('นำรูปภาพออกเรียบร้อย (คลิกบันทึกเพื่อยืนยัน)');
        });
    }

    window.openEditMemberModal = function(empId) {
        const members = state.getMembers();
        const member = members.find(m => (m.EmployeeID || m.id) === empId);
        if (!member) return;

        editOriginalEmpId.value = empId;
        editEmpIdInput.value = member.EmployeeID || member.id;
        editEmpNameInput.value = member.EmpName || member.name;
        editGroupInput.value = member.Group || member.department || 'Team A';
        if (editPreviewNameDisplay) editPreviewNameDisplay.textContent = member.EmpName || member.name;

        // Populate Chosen Team Select
        if (editChosenTeamSelect) {
            const teamNames = state.getTeamNames();
            editChosenTeamSelect.innerHTML = `<option value="">-- ยังไม่ได้เลือกทีม --</option>` +
                teamNames.map(t => `<option value="${t.name}">${t.name} (${t.department || 'ฝ่าย'})</option>`).join('');
            editChosenTeamSelect.value = member.chosenTeam || '';
        }

        // Set Registration Status Select
        if (editRegisteredStatusSelect) {
            editRegisteredStatusSelect.value = member.registered === true ? 'yes' : 'no';
        }

        // Load member photo into the integrated cropper (prefer uncropped originalPhoto if available)
        const photoSrc = member.originalPhoto || member.photo || '';
        loadEditCropperImage(photoSrc);

        if (editMemberModal) editMemberModal.style.display = 'flex';
        if (sound) sound.playClick();
    };

    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', () => editMemberModal.style.display = 'none');
    if (cancelEditModalBtn) cancelEditModalBtn.addEventListener('click', () => editMemberModal.style.display = 'none');

    if (editMemberForm) {
        editMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const origId = editOriginalEmpId.value;
            const newId = editEmpIdInput.value.trim();
            const newName = editEmpNameInput.value.trim();
            const newGroup = editGroupInput.value.trim() || 'Team A';

            if (!newId) {
                alert('กรุณากรอกรหัสพนักงาน');
                editEmpIdInput.focus();
                return;
            }
            if (!newName) {
                alert('กรุณากรอกชื่อ-นามสกุลพนักงาน');
                editEmpNameInput.focus();
                return;
            }

            // Export photo from canvas if photo is loaded
            let photoData = '';
            let origPhotoData = editCropper.originalImgSrc || '';
            if (editCropper.hasPhoto && editCropper.img) {
                const outCanvas = document.createElement('canvas');
                const outSize = 350; // Strictly 350px x 350px
                outCanvas.width = outSize;
                outCanvas.height = outSize;
                const oCtx = outCanvas.getContext('2d');
                const sourceSize = editCropper.cropSize;
                const sourceX = (editCropper.canvasSize - sourceSize) / 2;
                const sourceY = (editCropper.canvasSize - sourceSize) / 2;
                oCtx.drawImage(editCropCanvas, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outSize, outSize);
                const rawCropped = outCanvas.toDataURL('image/jpeg', 0.88);

                photoData = rawCropped;
                if (window.FirebaseStorageManager) {
                    try {
                        showToast('กำลังปรับขนาดและอัปโหลดรูปภาพสู่ Firebase Storage...');
                        const uploadRes = await window.FirebaseStorageManager.uploadMemberPhoto(newId, outCanvas);
                        photoData = uploadRes.downloadUrl || uploadRes.dataUrl;
                    } catch (fbErr) {
                        console.warn('[Admin] Firebase upload warning:', fbErr);
                    }
                }

                if (!origPhotoData || origPhotoData.length < 50) {
                    origPhotoData = (editCropper.img && editCropper.img.src && editCropper.img.src.length < 2000) ? editCropper.img.src : '';
                }
            } else {
                photoData = '';
                origPhotoData = '';
            }

            const newChosenTeam = editChosenTeamSelect ? editChosenTeamSelect.value : '';
            const isReg = editRegisteredStatusSelect ? (editRegisteredStatusSelect.value === 'yes') : false;
            const existingMember = state.getMembers().find(m => (m.EmployeeID || m.id) === origId);
            let regTime = existingMember ? existingMember.registeredAt : null;
            if (isReg && !regTime) {
                regTime = new Date().toISOString();
            } else if (!isReg) {
                regTime = null;
            }

            // Do not store multi-megabyte base64 strings in localStorage to avoid QuotaExceededError
            const safeOrigPhoto = (origPhotoData && origPhotoData.length < 2000) ? origPhotoData : '';

            const res = state.updateMember(origId, {
                EmployeeID: newId,
                EmpName: newName,
                Group: newGroup,
                photo: photoData,
                originalPhoto: safeOrigPhoto,
                chosenTeam: newChosenTeam || null,
                registered: isReg ? true : null,
                registeredAt: regTime
            });

            if (!res.success) {
                alert(res.message);
                return;
            }

            if (window.FirebaseSync && typeof window.FirebaseSync.saveMember === 'function') {
                window.FirebaseSync.saveMember({
                    EmployeeID: newId,
                    EmpName: newName,
                    Group: newGroup,
                    photo: photoData,
                    chosenTeam: newChosenTeam || null,
                    registered: isReg ? true : null,
                    registeredAt: regTime
                }).catch(err => console.error('[Admin] Save to Firebase error:', err));
            }

            showToast(res.message);
            if (sound) sound.playClick();
            if (editMemberModal) editMemberModal.style.display = 'none';
            renderAll();
        });
    }

    // Delete Member
    window.deleteMemberItem = function(empId) {
        if (!confirm(`ยืนยันการลบพนักงานรหัส ${empId} ออกจากตาราง crsdg_member หรือไม่?`)) return;
        const res = state.deleteMember(empId);
        if (res.success) {
            if (window.FirebaseSync && typeof window.FirebaseSync.deleteMember === 'function') {
                window.FirebaseSync.deleteMember(empId).catch(err => console.error('[Admin] Firebase deleteMember error:', err));
            }
            showToast(res.message);
            renderAll();
        }
    };

    // ========================================================
    // INTERACTIVE PHOTO ZOOM, SCALE & CROP MODAL
    // ========================================================
    let cropCallback = null;

    function initCropperCanvas() {
        if (!cropCanvas) return;
        cropperState.ctx = cropCanvas.getContext('2d');
        cropperState.previewCtx = cropPreviewCanvas ? cropPreviewCanvas.getContext('2d') : null;
    }

    function renderCropper() {
        if (!cropperState.ctx || !cropperState.img) return;
        const ctx = cropperState.ctx;
        const w = cropCanvas.width;
        const h = cropCanvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        // Translate to center + pan offset
        ctx.translate(w / 2 + cropperState.offsetX, h / 2 + cropperState.offsetY);
        ctx.rotate((cropperState.rotation * Math.PI) / 180);
        ctx.scale(cropperState.scale, cropperState.scale);

        // Draw image centered
        const imgW = cropperState.img.width;
        const imgH = cropperState.img.height;
        ctx.drawImage(cropperState.img, -imgW / 2, -imgH / 2);
        ctx.restore();

        // Render Circular Live Preview
        renderCropperPreview();
    }

    function renderCropperPreview() {
        if (!cropperState.previewCtx || !cropperState.img) return;
        const pCtx = cropperState.previewCtx;
        const pw = cropPreviewCanvas.width;
        const ph = cropPreviewCanvas.height;

        pCtx.clearRect(0, 0, pw, ph);

        // Clip circle
        pCtx.save();
        pCtx.beginPath();
        pCtx.arc(pw / 2, ph / 2, pw / 2, 0, Math.PI * 2);
        pCtx.clip();

        // Source crop rect from main canvas center (220px diameter)
        const sourceSize = cropperState.cropSize;
        const sourceX = (cropperState.canvasSize - sourceSize) / 2;
        const sourceY = (cropperState.canvasSize - sourceSize) / 2;

        pCtx.drawImage(cropCanvas, sourceX, sourceY, sourceSize, sourceSize, 0, 0, pw, ph);
        pCtx.restore();
    }

    function resetCropperZoomAndPan() {
        if (!cropperState.img) return;
        cropperState.offsetX = 0;
        cropperState.offsetY = 0;
        cropperState.rotation = 0;

        // Auto-scale so image comfortably covers crop circle (220px)
        const minDim = Math.min(cropperState.img.width, cropperState.img.height);
        cropperState.scale = Math.max(0.6, (cropperState.cropSize / minDim) * 1.05);

        if (zoomRangeInput) {
            zoomRangeInput.value = cropperState.scale.toFixed(2);
        }
        if (zoomLevelText) {
            zoomLevelText.textContent = `${Math.round(cropperState.scale * 100)}%`;
        }
        renderCropper();
    }

    // Open cropper for an existing member
    window.openCropperForMember = function(empId) {
        const members = state.getMembers();
        const member = members.find(m => (m.EmployeeID || m.id) === empId);
        if (!member) return;

        cropperState.targetEmpId = empId;
        cropperState.targetMember = member;
        cropCallback = null;

        if (cropEmpName) cropEmpName.textContent = member.EmpName || member.name;
        if (cropEmpId) cropEmpId.textContent = member.EmployeeID || member.id;

        if (member.photo && member.photo.length > 30) {
            loadCropperImage(member.photo);
        } else {
            // Trigger file picker
            modalCropFileInput.value = '';
            modalCropFileInput.click();
        }
    };

    // Open cropper for a new file
    function openCropperForFile(file, empId = null, onSaved = null) {
        if (!file || !file.type.startsWith('image/')) {
            alert('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง');
            return;
        }

        cropperState.targetEmpId = empId;
        cropCallback = onSaved;

        const reader = new FileReader();
        reader.onload = (e) => {
            loadCropperImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    function loadCropperImage(dataUrl) {
        initCropperCanvas();
        const img = new Image();
        img.onload = () => {
            cropperState.img = img;
            resetCropperZoomAndPan();
            if (photoCropModal) photoCropModal.style.display = 'flex';
        };
        img.onerror = () => {
            alert('ไม่สามารถเปิดรูปภาพได้');
        };
        img.src = dataUrl;
    }

    // Drag / Pan interaction on Crop Viewport
    if (cropCanvasWrapper) {
        const handleStart = (clientX, clientY) => {
            cropperState.isDragging = true;
            cropperState.dragStartX = clientX;
            cropperState.dragStartY = clientY;
            cropperState.imgBaseX = cropperState.offsetX;
            cropperState.imgBaseY = cropperState.offsetY;
        };

        const handleMove = (clientX, clientY) => {
            if (!cropperState.isDragging) return;
            const dx = clientX - cropperState.dragStartX;
            const dy = clientY - cropperState.dragStartY;
            cropperState.offsetX = cropperState.imgBaseX + dx;
            cropperState.offsetY = cropperState.imgBaseY + dy;
            renderCropper();
        };

        const handleEnd = () => {
            cropperState.isDragging = false;
        };

        cropCanvasWrapper.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', handleEnd);

        // Touch support
        cropCanvasWrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                handleStart(e.touches[0].clientX, e.touches[0].clientY);
            }
        });
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && cropperState.isDragging) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        });
        window.addEventListener('touchend', handleEnd);

        // Mouse wheel zoom
        cropCanvasWrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            setCropperZoom(cropperState.scale + delta);
        });
    }

    function setCropperZoom(newScale) {
        cropperState.scale = Math.min(3.5, Math.max(0.30, newScale));
        if (zoomLevelText) {
            const pct = Math.round(cropperState.scale * 100);
            if (pct < 100) {
                zoomLevelText.textContent = `${pct}% (ย่อ -${100 - pct}%)`;
            } else if (pct > 100) {
                zoomLevelText.textContent = `${pct}% (+${pct - 100}%)`;
            } else {
                zoomLevelText.textContent = '100%';
            }
        }
        if (zoomRangeInput) zoomRangeInput.value = cropperState.scale.toFixed(2);
        if (zoomLevelText) zoomLevelText.textContent = `${Math.round(cropperState.scale * 100)}%`;
        renderCropper();
    }

    if (zoomRangeInput) {
        zoomRangeInput.addEventListener('input', (e) => {
            setCropperZoom(parseFloat(e.target.value));
        });
    }
    if (btnZoomIn) btnZoomIn.addEventListener('click', () => setCropperZoom(cropperState.scale + 0.1));
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => setCropperZoom(cropperState.scale - 0.1));
    if (btnResetCrop) btnResetCrop.addEventListener('click', resetCropperZoomAndPan);
    if (btnRotateCrop) {
        btnRotateCrop.addEventListener('click', () => {
            cropperState.rotation = (cropperState.rotation + 90) % 360;
            renderCropper();
        });
    }

    if (btnChooseAnotherPhoto && modalCropFileInput) {
        btnChooseAnotherPhoto.addEventListener('click', () => {
            modalCropFileInput.value = '';
            modalCropFileInput.click();
        });
        modalCropFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                openCropperForFile(e.target.files[0], cropperState.targetEmpId, cropCallback);
            }
        });
    }

    if (closeCropModalBtn) closeCropModalBtn.addEventListener('click', () => photoCropModal.style.display = 'none');
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', () => photoCropModal.style.display = 'none');

    // Save Cropped Photo into crsdg_member & Firebase Storage
    if (saveCropBtn) {
        saveCropBtn.addEventListener('click', async () => {
            if (!cropperState.img) return;

            // Render high-res cropped output (strictly 350px x 350px JPEG)
            const outCanvas = document.createElement('canvas');
            const outSize = 350; // Strictly 350px x 350px
            outCanvas.width = outSize;
            outCanvas.height = outSize;
            const oCtx = outCanvas.getContext('2d');

            const sourceSize = cropperState.cropSize;
            const sourceX = (cropperState.canvasSize - sourceSize) / 2;
            const sourceY = (cropperState.canvasSize - sourceSize) / 2;

            oCtx.drawImage(cropCanvas, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outSize, outSize);
            const base64Jpeg = outCanvas.toDataURL('image/jpeg', 0.88);

            let finalPhotoUrl = base64Jpeg;

            const validTargetEmpId = cropperState.targetEmpId ? String(cropperState.targetEmpId).trim() : '';
            if (validTargetEmpId && validTargetEmpId.toLowerCase() !== 'null' && validTargetEmpId.toLowerCase() !== 'undefined') {
                if (window.FirebaseStorageManager) {
                    try {
                        showToast('กำลังปรับขนาดและอัปโหลดรูปภาพสู่ Firebase Storage...');
                        const uploadRes = await window.FirebaseStorageManager.uploadMemberPhoto(validTargetEmpId, outCanvas);
                        finalPhotoUrl = uploadRes.downloadUrl || uploadRes.dataUrl;
                    } catch (fbErr) {
                        console.warn('[Admin] Firebase upload warning:', fbErr);
                    }
                }

                // Update member record in crsdg_member
                state.updateParticipantPhoto(validTargetEmpId, finalPhotoUrl);
                showToast(`บันทึกรูปภาพของ ${validTargetEmpId} สู่ Firebase Storage และตาราง crsdg_member สำเร็จ`);
                if (sound) sound.playClick();
                if (photoCropModal) photoCropModal.style.display = 'none';
                renderAll();
            } else if (cropCallback) {
                cropCallback(finalPhotoUrl);
                if (photoCropModal) photoCropModal.style.display = 'none';
            }
        });
    }

    // ========================================================
    // TAB 2: TEAMS ROSTERS & ASSIGNMENT
    // ========================================================
    if (assignEmpIdInput && empLookupPreview) {
        assignEmpIdInput.addEventListener('input', (e) => {
            const raw = e.target.value.trim().split(' ')[0];
            const members = state.getMembers();
            const matched = members.find(m => (m.EmployeeID || m.id).toLowerCase() === raw.toLowerCase());

            if (matched) {
                empLookupPreview.style.display = 'flex';
                previewAvatarBox.innerHTML = getAvatarHTML(matched, 42);
                previewEmpName.textContent = matched.EmpName || matched.name;
                previewEmpId.textContent = matched.EmployeeID || matched.id;
                previewEmpDept.textContent = matched.Group || matched.department || '-';

                if (matched.teamId) {
                    previewEmpCurrentTeam.textContent = `สังกัดปัจจุบัน: ${matched.teamId}${matched.isCaptain ? ' (กัปตัน 👑)' : ''}`;
                    previewEmpCurrentTeam.style.color = '#fbbf24';
                } else {
                    previewEmpCurrentTeam.textContent = 'สังกัดปัจจุบัน: ยังไม่มีทีมแข่งขัน';
                    previewEmpCurrentTeam.style.color = '#94a3b8';
                }
            } else {
                empLookupPreview.style.display = 'none';
            }
        });
    }

    if (quickAssignForm) {
        quickAssignForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const rawId = assignEmpIdInput.value.trim().split(' ')[0];
            const targetTeamId = assignTargetTeamSelect.value;
            const isCaptain = assignRoleSelect.value === 'captain';

            if (!rawId) {
                alert('กรุณาระบุรหัสพนักงาน');
                return;
            }

            const result = state.assignMemberToTeam(rawId, targetTeamId, isCaptain);
            if (!result.success) {
                alert(result.message);
                return;
            }

            showToast(result.message);
            if (sound) sound.playClick();
            assignEmpIdInput.value = '';
            if (empLookupPreview) empLookupPreview.style.display = 'none';
            renderAll();
        });
    }

    function renderTeamRosters() {
        // Update Game Vote Status in Teams Tab
        const isGameVoteOpen = (typeof state.isGameVoteOpen === 'function') ? state.isGameVoteOpen() : true;
        const teamsTabGameVoteBadge = document.getElementById('teamsTabGameVoteBadge');
        const btnToggleGameVoteTeamsTab = document.getElementById('btnToggleGameVoteTeamsTab');
        if (teamsTabGameVoteBadge) {
            teamsTabGameVoteBadge.textContent = isGameVoteOpen ? '🟢 เปิดรับโหวต' : '🔴 ปิดรับโหวตแล้ว';
            teamsTabGameVoteBadge.style.background = isGameVoteOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            teamsTabGameVoteBadge.style.color = isGameVoteOpen ? '#34d399' : '#f87171';
            teamsTabGameVoteBadge.style.border = isGameVoteOpen ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)';
        }
        if (btnToggleGameVoteTeamsTab) {
            btnToggleGameVoteTeamsTab.textContent = isGameVoteOpen ? '🔒 ปิดรับโหวต' : '🔓 เปิดรับโหวต';
            btnToggleGameVoteTeamsTab.className = isGameVoteOpen ? 'btn-sm btn-danger' : 'btn-sm btn-primary';
        }

        if (!teamsRosterGrid) return;
        const teams = state.getTeamsWithDetails();

        teamsRosterGrid.innerHTML = teams.map(t => {
            const isOffline = (t.status === 'offline');
            const members = t.members || [];
            const totalCount = (t.captain ? 1 : 0) + members.length;
            const maxPlayers = 4;
            const emptySlotsCount = Math.max(0, maxPlayers - totalCount);

            return `
                <div class="team-roster-card ${isOffline ? 'team-card-offline' : ''}" style="border-top: 3px solid ${isOffline ? '#64748b' : (t.color || '#3b82f6')};">
                    <div class="team-card-header">
                        <div class="team-card-title-group">
                            <span class="team-color-indicator" style="background: ${isOffline ? '#64748b' : (t.color || '#3b82f6')}; color: ${isOffline ? '#64748b' : (t.color || '#3b82f6')};"></span>
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <h3 class="team-card-name">${t.name}</h3>
                                    <button type="button" 
                                            class="btn-team-status-toggle ${isOffline ? 'is-offline' : 'is-online'}" 
                                            onclick="toggleTeamOnlineStatus('${t.id}')" 
                                            title="คลิกเพื่อสลับสถานะ Online / Offline (หากเป็น Offline จะปิดการใช้งานกล่อง และไม่แสดงในรายชื่อทีมแข่งขัน)">
                                        ${isOffline ? '🔴 Offline' : '🟢 Online'}
                                    </button>
                                    <button type="button" class="btn-team-action btn-team-edit" onclick="openEditTeamModal('${t.id}')" title="แก้ไขชื่อทีมและข้อมูลทีม">✏️ แก้ไขชื่อทีม</button>
                                    <button type="button" class="btn-team-action btn-team-del" onclick="confirmDeleteTeam('${t.id}')" title="ลบทีมนี้">🗑️</button>
                                </div>
                                <div class="team-card-dept">${t.department} ${isOffline ? '<span style="color:#f87171; font-weight:600; font-size:0.75rem;">(สถานะ: ปิดการใช้งาน Offline)</span>' : ''}</div>
                            </div>
                        </div>
                        <span class="team-card-count-badge">${totalCount}/${maxPlayers} คน</span>
                    </div>

                    <!-- Captain Box -->
                    <div class="roster-captain-box">
                        <div class="captain-info-group">
                            <div onclick="openCropperForMember('${t.captain ? (t.captain.EmployeeID || t.captain.id) : ''}')">
                                ${t.captain ? getAvatarHTML(t.captain, 40) : `
                                    <div class="employee-avatar-wrapper" style="width: 40px; height: 40px; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.3);">
                                        👑
                                    </div>
                                `}
                            </div>
                            <div class="captain-text-box">
                                <div class="captain-badge-title">👑 กัปตันทีม (Team Captain)</div>
                                ${t.captain ? `
                                    <div class="captain-name" style="display: flex; align-items: center; gap: 6px; margin-top: 3px; flex-wrap: wrap;">
                                        <span class="empid-badge" style="font-size: 0.72rem; padding: 1px 6px;">${t.captain.EmployeeID || t.captain.id}</span>
                                        <span>${t.captain.EmpName || t.captain.name}</span>
                                    </div>
                                ` : `
                                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.4); font-style: italic; margin-top: 3px;">ยังไม่ได้แต่งตั้งกัปตัน</div>
                                `}
                            </div>
                        </div>

                        ${t.captain ? `
                            <button type="button" class="btn-action-sm btn-secondary" onclick="demoteCaptain('${t.id}', '${t.captain.EmployeeID || t.captain.id}')" title="เปลี่ยนสถานะเป็นสมาชิกทั่วไป">
                                🔄 สลับเป็นสมาชิก
                            </button>
                        ` : ''}
                    </div>

                    <!-- Members List -->
                    <div class="roster-members-list">
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px; font-weight: 500;">
                            👥 สมาชิกในทีม (${members.length} คน)
                        </div>

                        ${members.map(m => {
                            const empId = m.EmployeeID || m.id;
                            const empName = m.EmpName || m.name;
                            return `
                                <div class="member-row-card">
                                    <div class="member-info-left">
                                        <div onclick="openCropperForMember('${empId}')">
                                            ${getAvatarHTML(m, 32)}
                                        </div>
                                        <div class="member-name" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                            <span class="empid-badge" style="font-size: 0.7rem; padding: 1px 5px;">${empId}</span>
                                            <span>${empName}</span>
                                        </div>
                                    </div>
                                    <div class="member-actions-right">
                                        <button type="button" class="btn-action-sm btn-secondary" onclick="promoteToCaptain('${t.id}', '${empId}')" title="แต่งตั้งเป็นกัปตันทีม">
                                            👑 เป็นกัปตัน
                                        </button>
                                        <button type="button" class="btn-action-sm btn-action-del" onclick="removeFromTeam('${empId}')" title="ปลดออกจากทีมนี้">
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}

                        ${Array.from({ length: emptySlotsCount }).map(() => `
                            <div class="empty-member-slot">
                                <span>+ ช่องว่างสำหรับสมาชิก (ยังว่าง)</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Bottom Quick Add by EmployeeID -->
                    <div class="team-card-quick-add">
                        <input type="text" 
                               id="quickAddInput_${t.id}" 
                               class="form-input" 
                               list="participantsDatalist" 
                               placeholder="ใส่รหัส เช่น 14065..."
                               onkeydown="if(event.key==='Enter'){ event.preventDefault(); quickAddMemberToTeam('${t.id}'); }">
                        <button type="button" class="btn-primary" onclick="quickAddMemberToTeam('${t.id}')">
                            + เพิ่มเข้าทีม
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.toggleTeamOnlineStatus = function(teamId) {
        if (state && typeof state.toggleTeamStatus === 'function') {
            const res = state.toggleTeamStatus(teamId);
            if (res.success) {
                renderTeamRosters();
                showToast(`ทีม "${res.team.name}" เปลี่ยนสถานะเป็น ${res.status === 'offline' ? 'Offline 🔴 (ไม่แสดงในรายชื่อทีมแข่งขัน)' : 'Online 🟢 (พร้อมแข่งขัน)'}`);
            }
        }
    };

    window.quickAddMemberToTeam = function(teamId) {
        const input = document.getElementById(`quickAddInput_${teamId}`);
        if (!input) return;
        const rawVal = input.value.trim();
        if (!rawVal) {
            alert('กรุณากรอกรหัสพนักงาน');
            return;
        }

        let rawId = rawVal.split(/[\s\-]+/)[0].trim();
        const members = state.getMembers();
        const matched = members.find(m => {
            const eid = String(m.EmployeeID || m.id).trim();
            const fullStr = `${eid} - ${m.EmpName || m.name}`.trim();
            return eid === rawVal || eid === rawId || rawVal.startsWith(eid) || fullStr.startsWith(rawVal);
        });
        if (matched) {
            rawId = String(matched.EmployeeID || matched.id).trim();
        }

        const res = state.assignMemberToTeam(rawId, teamId, false);
        if (!res.success) {
            alert(res.message);
            return;
        }

        input.value = '';
        showToast(res.message);
        if (sound) sound.playClick();
        renderAll();
    };

    window.promoteToCaptain = function(teamId, empId) {
        state.setTeamCaptain(teamId, empId);
        showToast('แต่งตั้งเป็นกัปตันทีมเรียบร้อยแล้ว');
        if (sound) sound.playClick();
        renderAll();
    };

    window.demoteCaptain = function(teamId, empId) {
        const teams = state.getTeams();
        const targetTeam = teams.find(t => t.id === teamId);
        if (targetTeam && targetTeam.captainId === empId) {
            targetTeam.captainId = '';
            if (!targetTeam.memberIds.includes(empId)) {
                targetTeam.memberIds.unshift(empId);
            }
            state.saveTeams(teams);
            showToast('ปรับสถานะเป็นสมาชิกในทีมเรียบร้อยแล้ว');
            if (sound) sound.playClick();
            renderAll();
        }
    };

    window.removeFromTeam = function(empId) {
        state.removeMemberFromTeam(empId);
        showToast(`นำรหัส ${empId} ออกจากทีมแล้ว`);
        if (sound) sound.playClick();
        renderAll();
    };

    // ========================================================
    // TAB 2: TEAM MANAGEMENT (crsdg_nameteam & crsdg_team)
    // ========================================================
    function renderTargetTeamSelectOptions() {
        if (!assignTargetTeamSelect) return;
        const teams = state.getTeams();
        const currentVal = assignTargetTeamSelect.value;
        assignTargetTeamSelect.innerHTML = teams.map(t => `
            <option value="${t.id}">${t.name} (${t.department || 'ฝ่าย'})</option>
        `).join('');
        if (teams.some(t => t.id === currentVal)) {
            assignTargetTeamSelect.value = currentVal;
        }
    }

    // Game Vote Toggle in Teams Tab
    const btnToggleGameVoteTeamsTab = document.getElementById('btnToggleGameVoteTeamsTab');
    if (btnToggleGameVoteTeamsTab) {
        btnToggleGameVoteTeamsTab.addEventListener('click', () => {
            const current = (typeof state.isGameVoteOpen === 'function') ? state.isGameVoteOpen() : true;
            const next = !current;
            if (typeof state.setGameVoteOpen === 'function') {
                state.setGameVoteOpen(next);
            }
            renderTeamRosters();
            renderVoteDashboard();
            showToast(next ? 'เปิดระบบรับโหวต 4 ต่อ 4 เรียบร้อยแล้ว 🟢' : 'ปิดระบบรับโหวต 4 ต่อ 4 แล้ว 🔴');
            if (sound) sound.playClick();
        });
    }

    // Open Add Team Modal
    if (btnOpenAddTeamModal) {
        btnOpenAddTeamModal.addEventListener('click', () => {
            if (addTeamForm) addTeamForm.reset();
            if (newTeamColorCode) newTeamColorCode.textContent = '#3b82f6';
            if (addTeamModal) addTeamModal.style.display = 'flex';
            if (sound) sound.playClick();
        });
    }
    if (closeAddTeamModalBtn) closeAddTeamModalBtn.addEventListener('click', () => addTeamModal.style.display = 'none');
    if (cancelAddTeamModalBtn) cancelAddTeamModalBtn.addEventListener('click', () => addTeamModal.style.display = 'none');

    if (newTeamColorInput && newTeamColorCode) {
        newTeamColorInput.addEventListener('input', (e) => {
            newTeamColorCode.textContent = e.target.value;
            newTeamColorCode.style.color = e.target.value;
        });
    }

    if (addTeamForm) {
        addTeamForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = newTeamNameInput.value.trim();
            const department = newTeamDeptInput.value.trim();
            const color = newTeamColorInput.value;

            if (!name) return;
            const res = state.addTeam({ name, department, color });
            if (res.success) {
                showToast(res.message);
                if (sound) sound.playClick();
                if (addTeamModal) addTeamModal.style.display = 'none';
                renderAll();
            }
        });
    }

    // Open Edit Team Modal
    window.openEditTeamModal = function(teamId) {
        const teams = state.getTeamNames();
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        editTeamIdInput.value = team.id;
        editTeamNameInput.value = team.name;
        editTeamDeptInput.value = team.department || '';
        editTeamColorInput.value = team.color || '#3b82f6';
        if (editTeamColorCode) {
            editTeamColorCode.textContent = team.color || '#3b82f6';
            editTeamColorCode.style.color = team.color || '#3b82f6';
        }

        if (editTeamModal) editTeamModal.style.display = 'flex';
        if (sound) sound.playClick();
    };

    if (closeEditTeamModalBtn) closeEditTeamModalBtn.addEventListener('click', () => editTeamModal.style.display = 'none');
    if (cancelEditTeamModalBtn) cancelEditTeamModalBtn.addEventListener('click', () => editTeamModal.style.display = 'none');

    if (editTeamColorInput && editTeamColorCode) {
        editTeamColorInput.addEventListener('input', (e) => {
            editTeamColorCode.textContent = e.target.value;
            editTeamColorCode.style.color = e.target.value;
        });
    }

    if (editTeamForm) {
        editTeamForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const teamId = editTeamIdInput.value;
            const name = editTeamNameInput.value.trim();
            const department = editTeamDeptInput.value.trim();
            const color = editTeamColorInput.value;

            const res = state.updateTeam(teamId, { name, department, color });
            if (res.success) {
                showToast(res.message);
                if (sound) sound.playClick();
                if (editTeamModal) editTeamModal.style.display = 'none';
                renderAll();
            }
        });
    }

    // Confirm Delete Team Modal
    window.confirmDeleteTeam = function(teamId) {
        const teams = state.getTeamsWithDetails();
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        deleteTargetTeamId.value = team.id;
        deleteTeamNameHighlight.textContent = team.name;
        const totalMembers = (team.captain ? 1 : 0) + (team.members ? team.members.length : 0);
        deleteTeamMemberCountText.textContent = `ปัจจุบันมีสมาชิกในทีม ${totalMembers} คน (จะถูกปลดออกจากทีมนี้)`;

        if (confirmDeleteTeamModal) confirmDeleteTeamModal.style.display = 'flex';
        if (sound) sound.playClick();
    };

    if (closeDeleteTeamModalBtn) closeDeleteTeamModalBtn.addEventListener('click', () => confirmDeleteTeamModal.style.display = 'none');
    if (cancelDeleteTeamModalBtn) cancelDeleteTeamModalBtn.addEventListener('click', () => confirmDeleteTeamModal.style.display = 'none');

    if (confirmDeleteTeamBtn) {
        confirmDeleteTeamBtn.addEventListener('click', () => {
            const teamId = deleteTargetTeamId.value;
            const res = state.deleteTeam(teamId);
            if (res.success) {
                showToast(res.message);
                if (sound) sound.playClick();
                if (confirmDeleteTeamModal) confirmDeleteTeamModal.style.display = 'none';
                renderAll();
            }
        });
    }

    // ========================================================
    // TAB 3: PRIZES MANAGEMENT
    // ========================================================
    // ========================================================
    // TAB 3: จัดการรายการของรางวัล (crsdg_reward)
    // ========================================================
    const prizeGroupFilterEl = document.getElementById('prizeGroupFilter');
    const btnRefreshPrizesEl = document.getElementById('btnRefreshPrizes');
    const btnOpenAddPrizeModalEl = document.getElementById('btnOpenAddPrizeModal');
    const prizeEditModalEl = document.getElementById('prizeEditModal');
    const closePrizeModalBtnEl = document.getElementById('closePrizeModalBtn');
    const cancelPrizeModalBtnEl = document.getElementById('cancelPrizeModalBtn');
    const prizeModalFormEl = document.getElementById('prizeModalForm');
    const badgePrizesCountEl = document.getElementById('badgePrizesCount');

    // Modal Form Input Elements
    const editPrizeIdEl = document.getElementById('editPrizeId');
    const editPrizeOrderEl = document.getElementById('editPrizeOrder');
    const editPrizeQuantityEl = document.getElementById('editPrizeQuantity');
    const editPrizeGroupSelectEl = document.getElementById('editPrizeGroupSelect');
    const customGroupInputRowEl = document.getElementById('customGroupInputRow');
    const editPrizeGroupCustomEl = document.getElementById('editPrizeGroupCustom');
    const editPrizeGroupNameEl = document.getElementById('editPrizeGroupName');
    const editPrizeTitleEl = document.getElementById('editPrizeTitle');
    const editSponsorNameEl = document.getElementById('editSponsorName');
    const editSponsorPositionEl = document.getElementById('editSponsorPosition');
    const editSponsorPhotoEl = document.getElementById('editSponsorPhoto');
    const sponsorPreviewImgEl = document.getElementById('sponsorPreviewImg');
    const sponsorPreviewFallbackEl = document.getElementById('sponsorPreviewFallback');
    const editPrizePhotoEl = document.getElementById('editPrizePhoto');
    const prizePreviewImgEl = document.getElementById('prizePreviewImg');
    const prizePreviewFallbackEl = document.getElementById('prizePreviewFallback');

    function updateSponsorLivePreview(photoUrl, name) {
        if (!sponsorPreviewImgEl || !sponsorPreviewFallbackEl) return;
        const cleanUrl = String(photoUrl || '').trim();
        const cleanName = String(name || '').trim();
        const initials = cleanName.replace(/^(พี่|คุณ)/, '').slice(0, 2) || 'ผบ';
        sponsorPreviewFallbackEl.textContent = initials;

        if (cleanUrl) {
            sponsorPreviewImgEl.src = cleanUrl;
            sponsorPreviewImgEl.style.display = 'block';
            sponsorPreviewFallbackEl.style.display = 'none';
            sponsorPreviewImgEl.onerror = () => {
                sponsorPreviewImgEl.onerror = null;
                sponsorPreviewImgEl.style.display = 'none';
                sponsorPreviewFallbackEl.style.display = 'flex';
            };
        } else {
            sponsorPreviewImgEl.style.display = 'none';
            sponsorPreviewFallbackEl.style.display = 'flex';
        }
    }

    function updatePrizePhotoLivePreview(photoOrIcon) {
        if (!prizePreviewImgEl || !prizePreviewFallbackEl) return;
        const val = String(photoOrIcon || '').trim();
        const isImgUrl = val.includes('/') || val.startsWith('http') || val.includes('.png') || val.includes('.jpg') || val.includes('.svg');

        if (isImgUrl) {
            prizePreviewImgEl.src = val;
            prizePreviewImgEl.style.display = 'block';
            prizePreviewFallbackEl.style.display = 'none';
            prizePreviewImgEl.onerror = () => {
                prizePreviewImgEl.onerror = null;
                prizePreviewImgEl.style.display = 'none';
                prizePreviewFallbackEl.style.display = 'flex';
                prizePreviewFallbackEl.textContent = '🎁';
            };
        } else {
            prizePreviewImgEl.style.display = 'none';
            prizePreviewFallbackEl.style.display = 'flex';
            prizePreviewFallbackEl.textContent = val || '🎁';
        }
    }

    if (editSponsorPhotoEl) {
        editSponsorPhotoEl.addEventListener('input', () => {
            updateSponsorLivePreview(editSponsorPhotoEl.value, editSponsorNameEl ? editSponsorNameEl.value : '');
        });
    }
    if (editSponsorNameEl) {
        editSponsorNameEl.addEventListener('input', () => {
            updateSponsorLivePreview(editSponsorPhotoEl ? editSponsorPhotoEl.value : '', editSponsorNameEl.value);
        });
    }
    if (editPrizePhotoEl) {
        editPrizePhotoEl.addEventListener('input', () => {
            updatePrizePhotoLivePreview(editPrizePhotoEl.value);
        });
    }
    if (editPrizeGroupSelectEl) {
        editPrizeGroupSelectEl.addEventListener('change', () => {
            if (customGroupInputRowEl) {
                customGroupInputRowEl.style.display = editPrizeGroupSelectEl.value === 'custom' ? 'block' : 'none';
            }
        });
    }

    function renderPrizes() {
        if (!prizesTableBody) return;
        const allPrizes = state.getPrizes();
        if (badgePrizesCountEl) badgePrizesCountEl.textContent = allPrizes.length;

        // Update Prizes KPI summary cards
        const kpiPrizeItemsCountEl = document.getElementById('kpiPrizeItemsCount');
        const kpiPrizeTotalQtyEl = document.getElementById('kpiPrizeTotalQty');
        const kpiPrizeDrawnQtyEl = document.getElementById('kpiPrizeDrawnQty');
        const kpiPrizeRemainingQtyEl = document.getElementById('kpiPrizeRemainingQty');
        const kpiPrizeDrawnPercentEl = document.getElementById('kpiPrizeDrawnPercent');

        let totalQtySum = 0;
        let drawnQtySum = 0;
        let remainingQtySum = 0;
        allPrizes.forEach(p => {
            const tot = parseInt(p.quantity, 10) || 1;
            const drw = parseInt(p.drawn, 10) || 0;
            totalQtySum += tot;
            drawnQtySum += drw;
            remainingQtySum += Math.max(0, tot - drw);
        });
        const prizeDrawnPct = totalQtySum > 0 ? Math.round((drawnQtySum / totalQtySum) * 100) : 0;

        if (kpiPrizeItemsCountEl) kpiPrizeItemsCountEl.textContent = allPrizes.length;
        if (kpiPrizeTotalQtyEl) kpiPrizeTotalQtyEl.textContent = totalQtySum;
        if (kpiPrizeDrawnQtyEl) kpiPrizeDrawnQtyEl.textContent = drawnQtySum;
        if (kpiPrizeRemainingQtyEl) kpiPrizeRemainingQtyEl.textContent = remainingQtySum;
        if (kpiPrizeDrawnPercentEl) kpiPrizeDrawnPercentEl.textContent = `${prizeDrawnPct}% สุ่มรางวัลแล้ว`;

        const filterGroup = prizeGroupFilterEl ? prizeGroupFilterEl.value : 'all';
        const filteredPrizes = allPrizes.filter(p => {
            if (filterGroup === 'all') return true;
            return (p.group === filterGroup || p.groupBadge === filterGroup);
        });

        if (filteredPrizes.length === 0) {
            prizesTableBody.innerHTML = '<tr><td colspan="12" class="table-empty">ไม่พบรายการของรางวัลในกลุ่มนี้</td></tr>';
            return;
        }

        prizesTableBody.innerHTML = filteredPrizes.map((p, idx) => {
            const total = parseInt(p.quantity, 10) || 1;
            const drawn = parseInt(p.drawn, 10) || 0;
            const remaining = Math.max(0, total - drawn);

            const sponsorInitial = p.sponsorName ? p.sponsorName.replace(/^(พี่|คุณ)/, '').slice(0, 2) : 'ผบ';
            const sponsorAvatarHtml = p.sponsorPhoto
                ? `<img src="${p.sponsorPhoto}" class="sponsor-avatar-img" alt="${p.sponsorName}" onerror="this.outerHTML='<span class=\'sponsor-avatar-placeholder\'>${sponsorInitial}</span>'">`
                : `<span class="sponsor-avatar-placeholder">${sponsorInitial}</span>`;

            const prizeVisualHtml = p.prizePhoto
                ? `<span class="prize-photo-box"><img src="${p.prizePhoto}" alt="${p.title}"></span>`
                : `<span class="prize-photo-box">${p.icon || '🎁'}</span>`;

            return `
                <tr>
                    <td style="text-align: center;"><span class="badge-order-num">#${p.orderNo || (idx + 1)}</span></td>
                    <td style="text-align: center;">${prizeVisualHtml}</td>
                    <td>
                        <div class="group-badge-duo">
                            <span class="badge-group-extra">${p.groupBadge || 'Group Extra'}</span>
                            <span class="badge-group-management">🏷️ ${p.group || 'Management'}</span>
                        </div>
                    </td>
                    <td><strong style="color: #f8fafc; font-size: 0.88rem;">${p.title}</strong></td>
                    <td style="text-align: center;">${sponsorAvatarHtml}</td>
                    <td><span style="font-weight: 500; color: #e2e8f0;">${p.sponsorName || 'ผู้บริหาร'}</span></td>
                    <td style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${p.sponsorPosition || '-'}</td>
                    <td style="text-align: center;"><span class="pill-badge-total">${total} ชิ้น</span></td>
                    <td style="text-align: center;"><span class="pill-badge-drawn">${drawn} ชิ้น</span></td>
                    <td style="text-align: center;"><span class="pill-badge-remaining ${remaining === 0 ? 'zero' : 'positive'}">${remaining} ชิ้น</span></td>
                    <td style="text-align: center;">
                        <div class="order-btn-group">
                            <button type="button" class="btn-order-arrow" onclick="movePrizeOrderUp('${p.id}')" title="เลื่อนขึ้น">▲</button>
                            <button type="button" class="btn-order-arrow" onclick="movePrizeOrderDown('${p.id}')" title="เลื่อนลง">▼</button>
                        </div>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button type="button" class="btn-action-icon btn-action-edit" onclick="openEditPrizeModal('${p.id}')" title="แก้ไขข้อมูล">✏️</button>
                        <button type="button" class="btn-action-icon btn-action-del" onclick="deletePrizeRecord('${p.id}')" title="ลบรางวัล">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (prizeGroupFilterEl) {
        prizeGroupFilterEl.addEventListener('change', () => renderPrizes());
    }

    if (btnRefreshPrizesEl) {
        btnRefreshPrizesEl.addEventListener('click', async () => {
            if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.fetchPrizesFromCloud === 'function') {
                await FirebaseSync.fetchPrizesFromCloud();
            }
            renderPrizes();
            showToast('รีเฟรชข้อมูลของรางวัลจาก crsdg_reward แล้ว');
            if (sound) sound.playClick();
        });
    }

    if (btnOpenAddPrizeModalEl) {
        btnOpenAddPrizeModalEl.addEventListener('click', () => {
            const prizes = state.getPrizes();
            const nextOrder = prizes.reduce((max, p) => Math.max(max, p.orderNo || 0), 0) + 1;

            document.getElementById('prizeModalTitle').textContent = 'เพิ่มของรางวัลใหม่';
            if (editPrizeIdEl) editPrizeIdEl.value = '';
            if (editPrizeOrderEl) editPrizeOrderEl.value = nextOrder;
            if (editPrizeQuantityEl) editPrizeQuantityEl.value = 1;
            if (editPrizeGroupSelectEl) editPrizeGroupSelectEl.value = 'Group Extra';
            if (customGroupInputRowEl) customGroupInputRowEl.style.display = 'none';
            if (editPrizeGroupCustomEl) editPrizeGroupCustomEl.value = '';
            if (editPrizeGroupNameEl) editPrizeGroupNameEl.value = 'Management';
            if (editPrizeTitleEl) editPrizeTitleEl.value = 'Lucky Draw';
            if (editSponsorNameEl) editSponsorNameEl.value = '';
            if (editSponsorPositionEl) editSponsorPositionEl.value = '';
            if (editSponsorPhotoEl) editSponsorPhotoEl.value = '';
            if (editPrizePhotoEl) editPrizePhotoEl.value = '';

            updateSponsorLivePreview('', '');
            updatePrizePhotoLivePreview('');

            if (prizeEditModalEl) prizeEditModalEl.style.display = 'flex';
        });
    }

    function closePrizeModal() {
        if (prizeEditModalEl) prizeEditModalEl.style.display = 'none';
    }
    if (closePrizeModalBtnEl) closePrizeModalBtnEl.addEventListener('click', closePrizeModal);
    if (cancelPrizeModalBtnEl) cancelPrizeModalBtnEl.addEventListener('click', closePrizeModal);

    if (prizeModalFormEl) {
        prizeModalFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = editPrizeIdEl ? editPrizeIdEl.value.trim() : '';
            const orderNo = editPrizeOrderEl ? (parseInt(editPrizeOrderEl.value, 10) || 1) : 1;
            const quantity = editPrizeQuantityEl ? (parseInt(editPrizeQuantityEl.value, 10) || 1) : 1;

            let groupBadge = editPrizeGroupSelectEl ? editPrizeGroupSelectEl.value : 'Group Extra';
            if (groupBadge === 'custom' && editPrizeGroupCustomEl && editPrizeGroupCustomEl.value.trim()) {
                groupBadge = editPrizeGroupCustomEl.value.trim();
            }

            const group = editPrizeGroupNameEl ? (editPrizeGroupNameEl.value.trim() || 'Management') : 'Management';
            const title = editPrizeTitleEl ? (editPrizeTitleEl.value.trim() || 'Lucky Draw') : 'Lucky Draw';
            const sponsorName = editSponsorNameEl ? editSponsorNameEl.value.trim() : '';
            const sponsorPosition = editSponsorPositionEl ? editSponsorPositionEl.value.trim() : '';
            const sponsorPhoto = editSponsorPhotoEl ? editSponsorPhotoEl.value.trim() : '';
            const prizePhotoInput = editPrizePhotoEl ? editPrizePhotoEl.value.trim() : '';

            let prizePhoto = '';
            let icon = '🎁';
            if (prizePhotoInput.includes('/') || prizePhotoInput.startsWith('http')) {
                prizePhoto = prizePhotoInput;
            } else if (prizePhotoInput) {
                icon = prizePhotoInput;
            }

            if (!title) return;

            if (id) {
                state.updatePrize(id, {
                    orderNo,
                    quantity,
                    groupBadge,
                    group,
                    title,
                    sponsorName,
                    sponsorPosition,
                    sponsorPhoto,
                    prizePhoto,
                    icon
                });
                showToast(`แก้ไขรางวัล ${title} เรียบร้อยแล้ว`);
            } else {
                state.addPrize({
                    orderNo,
                    quantity,
                    groupBadge,
                    group,
                    title,
                    sponsorName,
                    sponsorPosition,
                    sponsorPhoto,
                    prizePhoto,
                    icon
                });
                showToast(`เพิ่มรางวัล ${title} เรียบร้อยแล้ว`);
            }

            closePrizeModal();
            renderPrizes();
            if (sound) sound.playClick();
        });
    }

    window.openEditPrizeModal = function(id) {
        const prizes = state.getPrizes();
        const p = prizes.find(x => x.id === id);
        if (!p) return;

        document.getElementById('prizeModalTitle').textContent = 'แก้ไขข้อมูลของรางวัล';
        if (editPrizeIdEl) editPrizeIdEl.value = p.id;
        if (editPrizeOrderEl) editPrizeOrderEl.value = p.orderNo || 1;
        if (editPrizeQuantityEl) editPrizeQuantityEl.value = p.quantity || 1;

        const knownGroups = ['Group Extra', 'Group-1', 'Group-2', 'Group-3', 'Group-4', 'Group-5', 'Group-6', 'Group-7', 'Group-8', 'Group-9'];
        const badgeVal = p.groupBadge || 'Group Extra';
        if (editPrizeGroupSelectEl) {
            if (knownGroups.includes(badgeVal)) {
                editPrizeGroupSelectEl.value = badgeVal;
                if (customGroupInputRowEl) customGroupInputRowEl.style.display = 'none';
            } else {
                editPrizeGroupSelectEl.value = 'custom';
                if (customGroupInputRowEl) {
                    customGroupInputRowEl.style.display = 'block';
                    if (editPrizeGroupCustomEl) editPrizeGroupCustomEl.value = badgeVal;
                }
            }
        }

        if (editPrizeGroupNameEl) editPrizeGroupNameEl.value = p.group || 'Management';
        if (editPrizeTitleEl) editPrizeTitleEl.value = p.title || 'Lucky Draw';
        if (editSponsorNameEl) editSponsorNameEl.value = p.sponsorName || '';
        if (editSponsorPositionEl) editSponsorPositionEl.value = p.sponsorPosition || '';
        if (editSponsorPhotoEl) editSponsorPhotoEl.value = p.sponsorPhoto || '';
        if (editPrizePhotoEl) editPrizePhotoEl.value = p.prizePhoto || p.icon || '';

        updateSponsorLivePreview(p.sponsorPhoto, p.sponsorName);
        updatePrizePhotoLivePreview(p.prizePhoto || p.icon);

        if (prizeEditModalEl) prizeEditModalEl.style.display = 'flex';
    };

    window.movePrizeOrderUp = function(id) {
        state.movePrizeOrder(id, -1);
        renderPrizes();
    };

    window.movePrizeOrderDown = function(id) {
        state.movePrizeOrder(id, 1);
        renderPrizes();
    };

    window.deletePrizeRecord = function(id) {
        if (!confirm('ยืนยันการลบรายการของรางวัลนี้หรือไม่?')) return;
        state.deletePrize(id);
        renderPrizes();
        showToast('ลบของรางวัลเรียบร้อยแล้ว');
    };

    // ========================================================
    // TAB 4: รายชื่อผู้ได้รับรางวัลทั้งหมด (Prize Winners Roster) - Image 2
    // ========================================================
    const kpiTotalWinnersEl = document.getElementById('kpiTotalWinners');
    const kpiEligibleCountEl = document.getElementById('kpiEligibleCount');
    const kpiDeliveredCountEl = document.getElementById('kpiDeliveredCount');
    const kpiDeliveredPercentEl = document.getElementById('kpiDeliveredPercent');
    const badgeWinnersCountEl = document.getElementById('badgeWinnersCount');
    const btnExportWinnersExcelEl = document.getElementById('btnExportWinnersExcel');
    const btnResetWinnersEl = document.getElementById('btnResetWinners');

    function formatThaiDateTime(isoStr) {
        if (!isoStr) return '-';
        try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return isoStr;
            const monthsThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const day = d.getDate();
            const month = monthsThai[d.getMonth()];
            const year = d.getFullYear() + 543;
            const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `${day} ${month} ${year} เวลา ${time} น.`;
        } catch {
            return isoStr;
        }
    }

    function renderWinners() {
        const prizesWinnersTableBody = document.getElementById('prizesWinnersTableBody');
        const winnerBodies = [winnersTableBody, prizesWinnersTableBody].filter(Boolean);
        if (winnerBodies.length === 0) return;

        const winners = state.getWinners();
        const eligible = state.getEligibleParticipants();
        const deliveredCount = winners.filter(w => w.delivered === true).length;
        const deliveredPercent = winners.length > 0 ? Math.round((deliveredCount / winners.length) * 100) : 0;

        // Update KPIs matching Image 2
        if (kpiTotalWinnersEl) kpiTotalWinnersEl.textContent = winners.length;
        if (kpiEligibleCountEl) kpiEligibleCountEl.textContent = eligible.length;
        if (kpiDeliveredCountEl) kpiDeliveredCountEl.textContent = deliveredCount;
        if (kpiDeliveredPercentEl) kpiDeliveredPercentEl.textContent = `${deliveredPercent}% รับของรางวัลแล้ว`;
        if (badgeWinnersCountEl) badgeWinnersCountEl.textContent = winners.length;

        if (winners.length === 0) {
            winnerBodies.forEach(tbody => {
                tbody.innerHTML = '<tr><td colspan="10" class="table-empty">ยังไม่มีบันทึกผู้ได้รับรางวัล</td></tr>';
            });
            return;
        }

        const rowsHtml = winners.map((w, idx) => {
            const formattedTime = formatThaiDateTime(w.wonAt);
            const isDelivered = w.delivered === true;
            const statusHtml = isDelivered
                ? `<span class="delivery-status-pill status-delivered" onclick="toggleWinnerDelivery('${w.id}')" title="คลิกเพื่อเปลี่ยนเป็นยังไม่ได้รับ">✓ รับรางวัลแล้ว</span>`
                : `<span class="delivery-status-pill status-pending" onclick="toggleWinnerDelivery('${w.id}')" title="คลิกเพื่อเปลี่ยนเป็นรับรางวัลแล้ว">🕒 ยังไม่ได้รับ</span>`;

            return `
                <tr>
                    <td style="text-align: center; color: #94a3b8; font-size: 0.82rem;">${idx + 1}</td>
                    <td style="color: #cbd5e1; font-size: 0.8rem; white-space: nowrap;">${formattedTime}</td>
                    <td><span class="empid-badge">${w.empId || '-'}</span></td>
                    <td><strong style="color: #f8fafc; font-size: 0.88rem;">${w.empName || '-'}</strong></td>
                    <td style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${w.position || '-'}</td>
                    <td><span class="badge-group-pill">${w.department || '-'}</span></td>
                    <td style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${w.branch && w.branch !== '-' ? w.branch : (w.zone || '-')}</td>
                    <td><span class="badge-prize-orange">🎁 ${w.prizeTitle || 'Lucky Draw'}</span></td>
                    <td style="text-align: center;">${statusHtml}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-sm btn-action-del" onclick="deleteWinnerItem('${w.id}')" title="ลบรายการและคืนสิทธิ์">
                            ✕
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        winnerBodies.forEach(tbody => {
            tbody.innerHTML = rowsHtml;
        });
    }

    window.toggleWinnerDelivery = function(id) {
        const newStatus = state.toggleWinnerDelivered(id);
        renderWinners();
        showToast(newStatus ? 'เปลี่ยนสถานะเป็น: รับรางวัลแล้ว' : 'เปลี่ยนสถานะเป็น: ยังไม่ได้รับ');
        if (sound) sound.playClick();
    };

    window.deleteWinnerItem = function(id) {
        if (!confirm('ยืนยันการลบผู้ได้รับรางวัลท่านนี้หรือไม่?\n(ของรางวัลจะถูกคืนสิทธิ์ และพนักงานจะสามารถร่วมสุ่มรางวัลได้อีกครั้ง)')) return;
        state.deleteWinner(id);
        renderWinners();
        renderPrizes();
        showToast('ลบรายการผู้ได้รับรางวัลเรียบร้อยแล้ว');
    };

    if (btnResetWinnersEl) {
        btnResetWinnersEl.addEventListener('click', () => {
            const confirmed = confirm('⚠️ คำเตือน: คุณต้องการรีเซ็ตผลรางวัลทั้งหมดใช่หรือไม่?\n(ประวัติผู้โชคดีจะถูกลบทั้งหมด และของรางวัลทั้งหมดจะกลับมามีสิทธิ์สุ่มใหม่)');
            if (confirmed) {
                state.resetWinners();
                renderWinners();
                renderPrizes();
                showToast('รีเซ็ตผลรางวัลทั้งหมดเรียบร้อยแล้ว');
            }
        });
    }

    const btnExportWinnersExcelFromPrizes = document.getElementById('btnExportWinnersExcelFromPrizes');
    const btnResetWinnersFromPrizes = document.getElementById('btnResetWinnersFromPrizes');

    function exportWinnersExcelAction() {
        const winners = state.getWinners();
        if (winners.length === 0) {
            alert('ยังไม่มีข้อมูลผู้ได้รับรางวัลให้ส่งออก');
            return;
        }
        const exportData = winners.map((w, idx) => ({
            'ลำดับ': idx + 1,
            'เวลาที่สุ่ม': formatThaiDateTime(w.wonAt),
            'รหัสพนักงาน': w.empId || '-',
            'ชื่อ - นามสกุล': w.empName || '-',
            'ตำแหน่ง': w.position || '-',
            'กลุ่ม': w.department || '-',
            'สาขา/โซน': w.branch && w.branch !== '-' ? w.branch : (w.zone || '-'),
            'ชื่อของรางวัล': w.prizeTitle || 'Lucky Draw',
            'สถานะรับรางวัล': w.delivered ? 'รับรางวัลแล้ว' : 'ยังไม่ได้รับ'
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'crsdg_winners');
        XLSX.writeFile(wb, `crsdg_winners_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('ส่งออกไฟล์ Excel รายชื่อผู้รับรางวัลเรียบร้อยแล้ว');
    }

    function resetWinnersAction() {
        const confirmed = confirm('คำเตือน: คุณต้องการรีเซ็ตผลการสุ่มรางวัลทั้งหมดหรือไม่?\n(ของรางวัลจะถูกคืนสิทธิ์ และพนักงานจะสามารถร่วมสุ่มรางวัลได้อีกครั้ง)');
        if (!confirmed) return;
        state.resetWinners();
        renderWinners();
        renderPrizes();
        renderParticipants();
        renderStats();
        showToast('รีเซ็ตผลการสุ่มรางวัลทั้งหมดเรียบร้อยแล้ว');
    }

    if (btnExportWinnersExcelEl) {
        btnExportWinnersExcelEl.addEventListener('click', exportWinnersExcelAction);
    }
    if (btnExportWinnersExcelFromPrizes) {
        btnExportWinnersExcelFromPrizes.addEventListener('click', exportWinnersExcelAction);
    }
    if (btnResetWinnersFromPrizes) {
        btnResetWinnersFromPrizes.addEventListener('click', resetWinnersAction);
    }

    // Real-time listener for reward draw stage (reward.html & remote-reward.html)
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const rewardSyncChannel = new BroadcastChannel('crsdg_reward_channel');
            rewardSyncChannel.onmessage = (event) => {
                if (event.data && (
                    event.data.type === 'WINNER_REVEALED' || 
                    event.data.type === 'STAGE_SYNC' || 
                    event.data.type === 'REROLL_TRIGGERED' ||
                    event.data.type === 'WINNER_RECORDED' ||
                    event.data.type === 'WINNERS_UPDATED'
                )) {
                    renderWinners();
                    renderPrizes();
                    renderParticipants();
                    renderStats();
                }
            };
        } catch (e) {
            console.warn('[Admin] BroadcastChannel error:', e);
        }
    }

    // Cross-tab storage update listener for winners, members, prizes, players, investments
    window.addEventListener('storage', (e) => {
        if (e.key === 'crsdg_winners' || e.key === 'crsdg_member' || e.key === 'crsdg_reward' || e.key === 'crsdg_reward_sync_state') {
            renderWinners();
            renderPrizes();
            renderParticipants();
            renderStats();
        }
        if (e.key === 'crsdg_all_user_investments' || e.key === 'crsdg_player' || e.key === 'crsdg_vote_open' || e.key === 'crsdg_vote_budget') {
            renderPlayers();
            renderStats();
        }
    });

    // Auto-refresh when admin window receives focus or tab becomes visible
    window.addEventListener('focus', () => {
        renderWinners();
        renderPrizes();
        renderStats();
        renderPlayers();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            renderWinners();
            renderPrizes();
            renderStats();
            renderPlayers();
        }
    });



    // ========================================================
    // ========================================================
    // TAB 1.5: ทีมแข่งขัน (COMPETITION TEAMS - crsdg_player)
    // 2 Columns 50% / 50% Split Screen
    // ========================================================
    let selectedPlayerId = null;
    let currentEditingTeamMembers = [];
    let playerSearchKeyword = '';

    // Left Table DOM Elements
    const playerTotalCountEl = document.getElementById('playerTotalCount');
    const playerCaptainCountEl = document.getElementById('playerCaptainCount');
    const playerTotalVoteMoneyEl = document.getElementById('playerTotalVoteMoney');
    const playerTotalVoterCountEl = document.getElementById('playerTotalVoterCount');
    const playerTableBadgeEl = document.getElementById('playerTableBadge');
    const playerTableBodyEl = document.getElementById('playerTableBody');
    const compFooterCountEl = document.getElementById('compFooterCount');
    const compFooterMembersEl = document.getElementById('compFooterMembers');
    const compFooterMoneyEl = document.getElementById('compFooterMoney');
    const compFooterVotersEl = document.getElementById('compFooterVoters');
    const searchPlayerInput = document.getElementById('searchPlayerInput');
    const btnExportPlayersExcel = document.getElementById('btnExportPlayersExcel');

    // Right Form DOM Elements & View States
    const playerEmptyPlaceholderBox = document.getElementById('playerEmptyPlaceholderBox');
    const playerFormContainer = document.getElementById('playerFormContainer');
    const btnEmptyAddNewPlayer = document.getElementById('btnEmptyAddNewPlayer');
    const playerSaveSuccessModal = document.getElementById('playerSaveSuccessModal');
    const playerSaveSuccessMsg = document.getElementById('playerSaveSuccessMsg');
    const btnClosePlayerSaveSuccessModal = document.getElementById('btnClosePlayerSaveSuccessModal');
    const playerProjectDesc = document.getElementById('playerProjectDesc');

    const btnAddNewPlayer = document.getElementById('btnAddNewPlayer');
    const playerFormModePill = document.getElementById('playerModePill');
    const playerFormModeDesc = document.getElementById('playerFormModeDesc');
    const playerModeSelectedName = document.getElementById('playerModeSelectedName');
    const playerDetailForm = document.getElementById('playerDetailForm');
    const playerEditIdInput = document.getElementById('playerEditId');
    const playerOrderNoInput = document.getElementById('playerOrderNo');
    const playerTeamNameInput = document.getElementById('playerTeamName');
    const playerVoteAmountInput = document.getElementById('playerVoteAmount');
    const previewVoteAmountEl = document.getElementById('previewVoteAmount');
    const playerVoterCountInput = document.getElementById('playerVoterCount');
    const previewVoterCountEl = document.getElementById('previewVoterCount');

    // Team Photo Cropper DOM Elements
    const teamCropCanvasWrapper = document.getElementById('teamCropCanvasWrapper');
    const teamCropCanvas = document.getElementById('teamCropCanvas');
    const teamCropEmptyHint = document.getElementById('teamCropEmptyHint');
    const teamCropControlsBar = document.getElementById('teamCropControlsBar');
    const btnTeamZoomOut = document.getElementById('btnTeamZoomOut');
    const teamZoomRangeInput = document.getElementById('teamZoomRangeInput');
    const btnTeamZoomIn = document.getElementById('btnTeamZoomIn');
    const teamZoomLevelText = document.getElementById('teamZoomLevelText');
    const btnTeamRotateCrop = document.getElementById('btnTeamRotateCrop');
    const btnTeamResetCrop = document.getElementById('btnTeamResetCrop');

    const compTeamPhotoFileInput = document.getElementById('compTeamPhotoFileInput');
    const btnUploadTeamPhoto = document.getElementById('btnUploadTeamPhoto');
    const btnRemoveTeamPhoto = document.getElementById('btnRemoveTeamPhoto');
    const compTeamPhotoBase64 = document.getElementById('compTeamPhotoBase64');

    // Members Section Elements
    const teamMembersCountBadge = document.getElementById('teamMembersCountBadge');
    const teamMembersAvatarsRow = document.getElementById('teamMembersAvatarsRow');
    const compNewMemberEmpId = document.getElementById('compNewMemberEmpId');
    const compNewMemberIsCaptain = document.getElementById('compNewMemberIsCaptain');
    const btnAddMemberToTeam = document.getElementById('btnAddMemberToTeam');
    const addMemberLookupHint = document.getElementById('addMemberLookupHint');
    const playerMemberDatalist = document.getElementById('playerMemberDatalist');
    const teamMembersTableBody = document.getElementById('teamMembersTableBody');
    const btnSavePlayer = document.getElementById('btnSavePlayer');
    const btnDeletePlayer = document.getElementById('btnDeletePlayer');
    const btnResetPlayer = document.getElementById('btnResetPlayer');

    // Right Column View State Helpers (กล่องว่างรอการคลิกแก้ไข)
    function showPlayerEmptyState() {
        if (playerEmptyPlaceholderBox) playerEmptyPlaceholderBox.style.display = 'flex';
        if (playerFormContainer) playerFormContainer.style.display = 'none';
        selectedPlayerId = null;
        if (playerTableBodyEl) {
            const rows = playerTableBodyEl.querySelectorAll('tr[data-player-id]');
            rows.forEach(r => r.classList.remove('is-selected-row'));
        }
    }

    function showPlayerFormState() {
        if (playerEmptyPlaceholderBox) playerEmptyPlaceholderBox.style.display = 'none';
        if (playerFormContainer) playerFormContainer.style.display = 'block';
    }

    // ========================================================
    // TEAM PHOTO CROPPER ENGINE (ครอป / ย่อ-ขยาย / บีบอัด <= 200KB)
    // ========================================================
    const teamCropper = {
        canvas: null,
        ctx: null,
        img: null,
        originalSrc: '',
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        imgBaseX: 0,
        imgBaseY: 0,
        canvasW: 400,
        canvasH: 400,
        cropSize: 320,
        hasPhoto: false
    };

    function initTeamCropperCanvas() {
        if (!teamCropCanvas) return;
        teamCropper.canvas = teamCropCanvas;
        teamCropper.ctx = teamCropCanvas.getContext('2d');
    }

    function updateTeamZoomLabel(scale) {
        if (!teamZoomLevelText) return;
        const pct = Math.round(scale * 100);
        if (pct < 100) {
            teamZoomLevelText.textContent = `${pct}% (-${100 - pct}%)`;
        } else if (pct > 100) {
            teamZoomLevelText.textContent = `${pct}% (+${pct - 100}%)`;
        } else {
            teamZoomLevelText.textContent = '100%';
        }
    }

    function renderTeamCropper() {
        if (!teamCropper.ctx) return;
        const ctx = teamCropper.ctx;
        const w = teamCropper.canvasW;
        const h = teamCropper.canvasH;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#050b18';
        ctx.fillRect(0, 0, w, h);

        if (!teamCropper.hasPhoto || !teamCropper.img) {
            if (teamCropEmptyHint) teamCropEmptyHint.style.display = 'flex';
            if (teamCropControlsBar) teamCropControlsBar.style.display = 'none';
            if (btnRemoveTeamPhoto) btnRemoveTeamPhoto.style.display = 'none';
            return;
        }

        if (teamCropEmptyHint) teamCropEmptyHint.style.display = 'none';
        if (teamCropControlsBar) teamCropControlsBar.style.display = 'flex';
        if (btnRemoveTeamPhoto) btnRemoveTeamPhoto.style.display = 'inline-flex';

        ctx.save();
        ctx.translate(w / 2 + teamCropper.offsetX, h / 2 + teamCropper.offsetY);
        ctx.rotate((teamCropper.rotation * Math.PI) / 180);
        ctx.scale(teamCropper.scale, teamCropper.scale);

        const imgW = teamCropper.img.width;
        const imgH = teamCropper.img.height;
        ctx.drawImage(teamCropper.img, -imgW / 2, -imgH / 2);
        ctx.restore();
    }

    function setTeamCropperZoom(newScale) {
        teamCropper.scale = Math.min(3.0, Math.max(0.30, newScale));
        if (teamZoomRangeInput) teamZoomRangeInput.value = teamCropper.scale.toFixed(2);
        updateTeamZoomLabel(teamCropper.scale);
        renderTeamCropper();
    }

    function autoFitTeamPhoto(img) {
        teamCropper.offsetX = 0;
        teamCropper.offsetY = 0;
        teamCropper.rotation = 0;
        const cropSize = teamCropper.cropSize;
        const minDim = Math.min(img.width, img.height);
        const fitScale = (cropSize / minDim) || 1.0;
        teamCropper.scale = Math.max(0.3, Math.round(fitScale * 100) / 100);
        if (teamZoomRangeInput) teamZoomRangeInput.value = teamCropper.scale.toFixed(2);
        updateTeamZoomLabel(teamCropper.scale);
        renderTeamCropper();
    }

    function resetTeamCropper() {
        if (teamCropper.img) {
            autoFitTeamPhoto(teamCropper.img);
        } else {
            teamCropper.offsetX = 0;
            teamCropper.offsetY = 0;
            teamCropper.rotation = 0;
            teamCropper.scale = 1.0;
            if (teamZoomRangeInput) teamZoomRangeInput.value = '1.0';
            updateTeamZoomLabel(1.0);
            renderTeamCropper();
        }
    }

    function loadTeamCropperImage(src) {
        initTeamCropperCanvas();
        if (!src || src.length < 30) {
            teamCropper.img = null;
            teamCropper.originalSrc = '';
            teamCropper.hasPhoto = false;
            if (compTeamPhotoBase64) compTeamPhotoBase64.value = '';
            renderTeamCropper();
            return;
        }

        teamCropper.originalSrc = src;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            teamCropper.img = img;
            teamCropper.hasPhoto = true;
            if (compTeamPhotoBase64) compTeamPhotoBase64.value = src;
            autoFitTeamPhoto(img);
        };
        img.onerror = () => {
            teamCropper.img = null;
            teamCropper.hasPhoto = false;
            renderTeamCropper();
        };
        img.src = src;
    }

    // Function to compress canvas output to strictly <= 200KB (204,800 bytes)
    function compressCanvasToTarget(sourceCanvas, maxBytes = 200 * 1024) {
        let quality = 0.88;
        let dataUrl = sourceCanvas.toDataURL('image/jpeg', quality);

        function getByteSize(b64) {
            const head = b64.indexOf(',') + 1;
            return Math.round((b64.length - head) * 3 / 4);
        }

        // Loop reduce quality
        while (getByteSize(dataUrl) > maxBytes && quality > 0.30) {
            quality -= 0.08;
            dataUrl = sourceCanvas.toDataURL('image/jpeg', quality);
        }

        // If still > maxBytes, downscale dimensions
        let curCanvas = sourceCanvas;
        while (getByteSize(dataUrl) > maxBytes && curCanvas.width > 280) {
            const nextCanvas = document.createElement('canvas');
            nextCanvas.width = Math.round(curCanvas.width * 0.82);
            nextCanvas.height = Math.round(curCanvas.height * 0.82);
            const ctx = nextCanvas.getContext('2d');
            ctx.drawImage(curCanvas, 0, 0, nextCanvas.width, nextCanvas.height);
            curCanvas = nextCanvas;
            quality = 0.80;
            dataUrl = curCanvas.toDataURL('image/jpeg', quality);
            while (getByteSize(dataUrl) > maxBytes && quality > 0.30) {
                quality -= 0.08;
                dataUrl = curCanvas.toDataURL('image/jpeg', quality);
            }
        }
        return dataUrl;
    }

    function getCroppedTeamPhotoDataUrl() {
        if (!teamCropper.hasPhoto || !teamCropper.img || !teamCropper.canvas) {
            return '';
        }
        const outCanvas = document.createElement('canvas');
        const targetSize = 400; // STRICTLY 400px x 400px
        outCanvas.width = targetSize;
        outCanvas.height = targetSize;
        const outCtx = outCanvas.getContext('2d');

        const cropSize = teamCropper.cropSize; // 320
        const cropX = (teamCropper.canvasW - cropSize) / 2;
        const cropY = (teamCropper.canvasH - cropSize) / 2;

        outCtx.drawImage(
            teamCropper.canvas,
            cropX, cropY, cropSize, cropSize,
            0, 0, targetSize, targetSize
        );

        return compressCanvasToTarget(outCanvas, 200 * 1024);
    }

    // Render Players Table & Stats (Left Panel)
    function renderPlayers() {
        if (!playerTableBodyEl) return;

        const teamsList = (typeof state.getPlayers === 'function') ? state.getPlayers() : [];
        const members = state.getMembers();

        // 1. Update Top Stats & Process Live Team Investment Totals
        const totalTeams = teamsList.length;
        let totalCaptainsCount = 0;

        // ประมวลผลยอดเงินลงทุนและจำนวนผู้ให้เงินตามข้อมูลจริงที่เข้ามาในระบบแบบ Real-time
        const allUserInv = (typeof state.getAllUserInvestments === 'function') ? state.getAllUserInvestments() : {};
        const teamAmounts = {};
        const teamVoters = {};
        let totalVoteMoney = 0;

        Object.keys(allUserInv).forEach(uId => {
            const uInv = allUserInv[uId];
            if (uInv && typeof uInv === 'object') {
                Object.keys(uInv).forEach(tId => {
                    const amt = parseFloat(uInv[tId]) || 0;
                    if (amt > 0) {
                        teamAmounts[tId] = (teamAmounts[tId] || 0) + amt;
                        teamVoters[tId] = (teamVoters[tId] || 0) + 1;
                        totalVoteMoney += amt;
                    }
                });
            }
        });

        teamsList.forEach(t => {
            const mList = t.members || [];
            totalCaptainsCount += mList.filter(m => m.isCaptain).length;
        });

        // สมาชิกทั้งหมด: คือ จำนวนพนักงานที่ลงทะเบียนใน crsdg_member
        const registeredMembersCount = members.filter(m => (m.registered === true || m.registered === 'true') || Boolean(m.registeredAt)).length;

        // ผู้ให้เงินรวม: ไม่นับซ้ำ (Distinct Unique Investors)
        const totalDistinctVoters = (typeof state.getDistinctInvestorCount === 'function')
            ? state.getDistinctInvestorCount()
            : totalVoters;

        if (playerTotalCountEl) playerTotalCountEl.textContent = registeredMembersCount.toLocaleString();
        if (playerCaptainCountEl) playerCaptainCountEl.textContent = totalCaptainsCount.toLocaleString();
        if (playerTotalVoteMoneyEl) playerTotalVoteMoneyEl.textContent = totalVoteMoney.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        if (playerTotalVoterCountEl) playerTotalVoterCountEl.textContent = totalDistinctVoters.toLocaleString();

        // Update Budget Toolbar in Comp Teams Tab
        const adminCompVoteBudgetInput = document.getElementById('adminCompVoteBudgetInput');
        const adminCompVoteStatusBadge = document.getElementById('adminCompVoteStatusBadge');
        const btnToggleCompVoteOpen = document.getElementById('btnToggleCompVoteOpen');
        const isVoteOpen = state.isVoteOpen();
        const currentBudget = state.getVoteBudget();

        if (adminCompVoteBudgetInput && document.activeElement !== adminCompVoteBudgetInput) {
            adminCompVoteBudgetInput.value = currentBudget;
        }
        if (adminCompVoteStatusBadge) {
            adminCompVoteStatusBadge.style.display = 'none';
        }
        if (btnToggleCompVoteOpen) {
            if (isVoteOpen) {
                btnToggleCompVoteOpen.className = 'btn-invest-master-toggle is-open';
                btnToggleCompVoteOpen.textContent = '🟢 เปิดการลงทุน';
                btnToggleCompVoteOpen.title = 'สถานะ: เปิดรับการลงทุนอยู่ (คลิกเพื่อปิดการลงทุน)';
            } else {
                btnToggleCompVoteOpen.className = 'btn-invest-master-toggle is-closed';
                btnToggleCompVoteOpen.textContent = '🔴 ปิดการลงทุน';
                btnToggleCompVoteOpen.title = 'สถานะ: ปิดรับการลงทุนอยู่ (คลิกเพื่อเปิดการลงทุน)';
            }
        }

        // 2. Update Member Datalist with all employees from crsdg_member
        if (playerMemberDatalist) {
            playerMemberDatalist.innerHTML = members.map(m => {
                const empId = m.EmployeeID || m.id;
                const empName = m.EmpName || m.name;
                const grp = m.Group || m.department || '';
                return `<option value="${empId}">${empId} - ${empName} (${grp})</option>`;
            }).join('');
        }

        // 3. Filter & Sort Teams
        const term = (playerSearchKeyword || '').trim().toLowerCase();
        const filtered = teamsList.filter(t => {
            if (!term) return true;
            const matchTeam = (t.teamName || '').toLowerCase().includes(term);
            const matchMember = (t.members || []).some(m =>
                (m.name || '').toLowerCase().includes(term) ||
                (m.employeeId || '').toLowerCase().includes(term) ||
                (m.department || '').toLowerCase().includes(term)
            );
            return matchTeam || matchMember;
        });

        filtered.sort((a, b) => (parseInt(a.orderNo, 10) || 0) - (parseInt(b.orderNo, 10) || 0));

        if (playerTableBadgeEl) {
            playerTableBadgeEl.textContent = `พบ ${filtered.length} ทีม`;
        }

        // 4. Render Table Rows (แสดงรูปทีมรวม และสมาชิกในทีมแสดงเฉพาะจำนวนสมาชิกเท่านั้น)
        if (filtered.length === 0) {
            playerTableBodyEl.innerHTML = `
                <tr>
                    <td colspan="8" class="table-empty">
                        <div style="font-size: 1.8rem; margin-bottom: 6px;">🛡️</div>
                        <div>ไม่พบข้อมูลทีมที่เข้าแข่งขัน</div>
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 4px;">
                            คลิกปุ่ม "+ เพิ่มรายการใหม่" ทางขวามือบน เพื่อสร้างทีมแข่งขันใหม่
                        </div>
                    </td>
                </tr>
            `;
        } else {
            playerTableBodyEl.innerHTML = filtered.map(t => {
                const isSelected = (t.id === selectedPlayerId);
                const tMembers = t.members || [];

                // รูปทีมรวม (1 ภาพ ไม่เกี่ยวกับรูปของสมาชิก)
                let teamPhotoHtml = '';
                if (t.teamPhoto) {
                    teamPhotoHtml = `<img src="${t.teamPhoto}" class="team-group-photo-thumb" alt="${t.teamName || 'ทีม'}">`;
                } else {
                    teamPhotoHtml = `<div class="team-group-photo-thumb placeholder" title="ยังไม่มีรูปภาพทีมรวม">🛡️</div>`;
                }

                const actualMoney = teamAmounts[t.id] !== undefined ? teamAmounts[t.id] : (parseFloat(t.voteAmount) || 0);
                const formattedMoney = actualMoney.toLocaleString();
                const actualVoters = teamVoters[t.id] !== undefined ? teamVoters[t.id] : (parseInt(t.voterCount, 10) || 0);
                const voterCountStr = actualVoters + ' คน';
                const isTeamOpen = (t.voteStatus !== 'closed');

                return `
                    <tr class="${isSelected ? 'is-selected-row' : ''}" data-player-id="${t.id}" onclick="selectPlayerForEdit('${t.id}')">
                        <td style="text-align: center; font-weight: 700; color: #94a3b8; font-size: 0.8rem;">${t.orderNo}</td>
                        <td style="text-align: center;">${teamPhotoHtml}</td>
                        <td style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.teamName || ''}">
                            <strong style="color: #ffffff; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">${t.teamName || 'ไม่ระบุชื่อทีม'}</strong>
                        </td>
                        <td style="text-align: center; color: #60a5fa; font-weight: 600; font-size: 0.82rem;">
                            ${tMembers.length} คน
                        </td>
                        <td style="text-align: right; font-weight: 700; color: #34d399; font-family: monospace; font-size: 0.82rem;">${formattedMoney}</td>
                        <td style="text-align: center; color: #60a5fa; font-weight: 600; font-size: 0.82rem;">${voterCountStr}</td>
                        <td style="text-align: center;">
                            <button type="button" class="btn-vote-toggle-pill"
                                title="คลิกเพื่อสลับเปิด/ปิดการโหวตทีมนี้แบบ Real-time"
                                onclick="event.stopPropagation(); window.toggleTeamVoteStatus('${t.id}');"
                                style="padding: 2px 6px; border-radius: 999px; font-size: 0.68rem; font-weight: 700; cursor: pointer; white-space: nowrap; border: 1px solid ${isTeamOpen ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}; background: ${isTeamOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${isTeamOpen ? '#34d399' : '#f87171'};">
                                ${isTeamOpen ? '🟢 เปิดโหวต' : '🔒 ปิดโหวต'}
                            </button>
                        </td>
                        <td style="text-align: center;">
                            <div style="display: flex; gap: 2px; justify-content: center;">
                                <button type="button" class="btn-action-icon-only" title="แก้ไขทีมนี้"
                                    style="padding: 2px 4px; font-size: 0.72rem;"
                                    onclick="event.stopPropagation(); selectPlayerForEdit('${t.id}');">
                                    ✏️
                                </button>
                                <button type="button" class="btn-action-icon-only" title="ลบทีมนี้" style="color: #f87171; padding: 2px 4px; font-size: 0.72rem;"
                                    onclick="event.stopPropagation(); deletePlayerItem('${t.id}');">
                                    🗑️
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // 5. Update Footer Stats
        const filteredMoney = filtered.reduce((sum, t) => sum + (parseFloat(t.voteAmount) || 0), 0);
        const filteredTeamIds = filtered.map(t => t.id);
        const filteredDistinctVoters = (typeof state.getDistinctInvestorCount === 'function')
            ? state.getDistinctInvestorCount(filteredTeamIds)
            : filtered.reduce((sum, t) => sum + (parseInt(t.voterCount, 10) || 0), 0);

        if (compFooterCountEl) compFooterCountEl.textContent = filtered.length;
        if (compFooterMembersEl) compFooterMembersEl.textContent = registeredMembersCount.toLocaleString();
        if (compFooterMoneyEl) compFooterMoneyEl.textContent = filteredMoney.toLocaleString('th-TH') + ' บาท';
        if (compFooterVotersEl) compFooterVotersEl.textContent = filteredDistinctVoters.toLocaleString();

        // 6. Right Column State: If no team selected, show empty placeholder box
        if (!selectedPlayerId) {
            showPlayerEmptyState();
        }
    }

    // Select Player / Team For Edit (Load into right form)
    window.selectPlayerForEdit = function (id, shouldPlayClick = true) {
        selectedPlayerId = id;
        const teamsList = (typeof state.getPlayers === 'function') ? state.getPlayers() : [];
        const team = teamsList.find(t => t.id === id);

        if (!team) return;

        // Switch Right Column to Form View
        showPlayerFormState();

        // UI Indicators
        if (playerFormModePill) {
            playerFormModePill.className = 'mode-pill mode-edit';
            playerFormModePill.textContent = '✏️ กำลังแก้ไขทีม';
        }
        if (playerFormModeDesc) {
            playerFormModeDesc.textContent = `กำลังแก้ไขข้อมูล: ${team.teamName} (ลำดับที่ ${team.orderNo})`;
        }
        if (playerModeSelectedName) {
            playerModeSelectedName.textContent = `${team.teamName}`;
        }

        // Populate Form Fields
        if (playerEditIdInput) playerEditIdInput.value = team.id;
        if (playerOrderNoInput) playerOrderNoInput.value = team.orderNo;
        if (playerTeamNameInput) playerTeamNameInput.value = team.teamName || '';

        // Project Description (textarea)
        if (playerProjectDesc) {
            playerProjectDesc.value = team.description || team.projectDesc || '';
        }

        // Vote Status Dropdown
        const playerVoteStatus = document.getElementById('playerVoteStatus');
        if (playerVoteStatus) {
            playerVoteStatus.value = team.voteStatus || 'open';
        }

        // Vote Amount & Voter Count
        if (playerVoteAmountInput) playerVoteAmountInput.value = team.voteAmount || 0;
        if (previewVoteAmountEl) previewVoteAmountEl.textContent = (parseFloat(team.voteAmount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';

        if (playerVoterCountInput) playerVoterCountInput.value = team.voterCount || 0;
        if (previewVoterCountEl) previewVoterCountEl.textContent = (team.voterCount || 0) + ' คน';

        // Load Team Group Photo into Cropper
        loadTeamCropperImage(team.teamPhoto || team.photo || '');

        // Load Team Members into working list
        currentEditingTeamMembers = JSON.parse(JSON.stringify(team.members || []));
        renderTeamMembersRosterUI();

        // Action Buttons
        if (btnSavePlayer) btnSavePlayer.innerHTML = '💾 บันทึกข้อมูลทีม';
        if (btnDeletePlayer) btnDeletePlayer.style.display = 'inline-flex';

        // Highlight Row in Table
        if (playerTableBodyEl) {
            const rows = playerTableBodyEl.querySelectorAll('tr[data-player-id]');
            rows.forEach(r => {
                if (r.getAttribute('data-player-id') === id) {
                    r.classList.add('is-selected-row');
                } else {
                    r.classList.remove('is-selected-row');
                }
            });
        }

        if (shouldPlayClick && sound) sound.playClick();
    };

    // Toggle Vote Status for Specific Team (Real-time)
    window.toggleTeamVoteStatus = function (teamId) {
        const players = state.getPlayers();
        const target = players.find(p => p.id === teamId);
        if (!target) return;
        const nextStatus = (target.voteStatus === 'closed') ? 'open' : 'closed';
        state.setTeamVoteStatus(teamId, nextStatus);
        const isSystemVoteOpen = (typeof state.isVoteOpen === 'function') ? state.isVoteOpen() : true;
        if (nextStatus === 'open' && isSystemVoteOpen) {
            showToast(`ทีม "${target.teamName}": 🟢 เปิดรับการลงทุนแล้ว (แสดง Lightbox ฝั่งผู้ใช้งาน)`);
        } else {
            showToast(`ทีม "${target.teamName}": ${nextStatus === 'open' ? '🟢 เปิดรับโหวตแล้ว' : '🔒 ปิดรับโหวตแล้ว'}`);
        }
        renderPlayers();
        if (selectedPlayerId === teamId) {
            const pvs = document.getElementById('playerVoteStatus');
            if (pvs) pvs.value = nextStatus;
        }
        if (sound) sound.playClick();
    };

    // Reset Form for New Team Entry
    window.resetPlayerForm = function (shouldPlayClick = true) {
        selectedPlayerId = null;
        showPlayerFormState();

        const teamsList = (typeof state.getPlayers === 'function') ? state.getPlayers() : [];
        const nextOrder = teamsList.reduce((max, t) => Math.max(max, parseInt(t.orderNo, 10) || 0), 0) + 1;

        if (playerFormModePill) {
            playerFormModePill.className = 'mode-pill mode-new';
            playerFormModePill.textContent = '✨ เพิ่มทีมแข่งขันใหม่';
        }
        if (playerFormModeDesc) {
            playerFormModeDesc.textContent = 'กรอกชื่อทีม เพิ่มสมาชิกในทีม แล้วกดบันทึกข้อมูล';
        }
        if (playerModeSelectedName) {
            playerModeSelectedName.textContent = 'เตรียมเพิ่มทีมใหม่';
        }

        if (playerEditIdInput) playerEditIdInput.value = '';
        if (playerOrderNoInput) playerOrderNoInput.value = nextOrder;
        if (playerTeamNameInput) playerTeamNameInput.value = '';
        if (playerProjectDesc) playerProjectDesc.value = '';
        const playerVoteStatus = document.getElementById('playerVoteStatus');
        if (playerVoteStatus) playerVoteStatus.value = 'open';
        if (playerVoteAmountInput) playerVoteAmountInput.value = '';
        if (previewVoteAmountEl) previewVoteAmountEl.textContent = '0.00 บาท';
        if (playerVoterCountInput) playerVoterCountInput.value = '';
        if (previewVoterCountEl) previewVoterCountEl.textContent = '0 คน';

        // Reset Team Photo Cropper
        loadTeamCropperImage('');
        if (compTeamPhotoFileInput) compTeamPhotoFileInput.value = '';

        // Reset members working array
        currentEditingTeamMembers = [];
        renderTeamMembersRosterUI();

        if (btnSavePlayer) btnSavePlayer.innerHTML = '➕ บันทึกทีมแข่งขันใหม่';
        if (btnDeletePlayer) btnDeletePlayer.style.display = 'none';

        if (compNewMemberEmpId) compNewMemberEmpId.value = '';
        if (compNewMemberIsCaptain) compNewMemberIsCaptain.checked = false;
        if (addMemberLookupHint) {
            addMemberLookupHint.className = 'add-member-preview-box';
            addMemberLookupHint.innerHTML = '💡 กรอกรหัสพนักงาน ระบบจะดึงชื่อ-นามสกุลและสังกัดจากตาราง crsdg_member มาแสดงอัตโนมัติ';
        }

        // Unhighlight all rows in table
        if (playerTableBodyEl) {
            const rows = playerTableBodyEl.querySelectorAll('tr[data-player-id]');
            rows.forEach(r => r.classList.remove('is-selected-row'));
        }

        if (playerTeamNameInput) playerTeamNameInput.focus();
        if (shouldPlayClick && sound) sound.playClick();
    };

    // Render Members Roster in Right Form
    function renderTeamMembersRosterUI() {
        if (teamMembersCountBadge) {
            teamMembersCountBadge.textContent = currentEditingTeamMembers.length;
        }

        const allDbMembers = state.getMembers();
        const memberMap = new Map();
        allDbMembers.forEach(m => memberMap.set(String(m.EmployeeID || m.id).toLowerCase(), m));

        // 1. เหนือแถวสมาชิก ให้แสดงรูปสมาชิกทีม (ดึงรูปจริงจาก crsdg_member)
        if (teamMembersAvatarsRow) {
            if (currentEditingTeamMembers.length === 0) {
                teamMembersAvatarsRow.innerHTML = '';
            } else {
                teamMembersAvatarsRow.innerHTML = currentEditingTeamMembers.map(m => {
                    const empId = String(m.employeeId || '').toLowerCase();
                    const foundDb = memberMap.get(empId);
                    const photoSrc = (foundDb && (foundDb.photo || foundDb.Photo || foundDb.avatar)) || m.photo || '';
                    const displayName = (foundDb && (foundDb.EmpName || foundDb.name)) || m.name || m.employeeId;

                    return `
                        <div class="team-member-avatar-chip ${m.isCaptain ? 'is-captain' : ''}" title="${displayName} (${m.employeeId}) ${m.isCaptain ? '- 👑 หัวหน้าทีม' : ''}">
                            ${m.isCaptain ? '<span class="chip-crown">👑</span>' : ''}
                            <div class="chip-img">
                                ${photoSrc ? `<img src="${photoSrc}" alt="${displayName}">` : `<span style="font-size: 0.72rem; font-weight: 700; color: #60a5fa;">${displayName.slice(0, 2)}</span>`}
                            </div>
                            <div class="chip-name">${displayName}</div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 2. แถวต่อไปแสดงรายชื่อสมาชิก สามารถลบได้ (ดึงรูปจริงจาก crsdg_member และคลิกเพื่อซูม/ตัด/เปลี่ยนรูปได้)
        if (teamMembersTableBody) {
            if (currentEditingTeamMembers.length === 0) {
                teamMembersTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: rgba(255,255,255,0.4); padding: 18px;">
                            ยังไม่มีสมาชิกในทีม กรุณากรอกรหัสพนักงานด้านบนแล้วกด "➕ เพิ่มสมาชิก"
                        </td>
                    </tr>
                `;
            } else {
                teamMembersTableBody.innerHTML = currentEditingTeamMembers.map(m => {
                    const empId = String(m.employeeId || '').toLowerCase();
                    const foundDb = memberMap.get(empId);
                    const photoSrc = (foundDb && (foundDb.photo || foundDb.Photo || foundDb.avatar)) || m.photo || '';
                    const displayName = (foundDb && (foundDb.EmpName || foundDb.name)) || m.name || m.employeeId;
                    const displayDept = (foundDb && (foundDb.Group || foundDb.department)) || m.department || '-';

                    return `
                        <tr>
                            <td style="text-align: center;">
                                <div class="player-avatar-mini" style="border: 1.5px solid ${m.isCaptain ? '#ffd700' : 'rgba(255,255,255,0.2)'}; width: 34px; height: 34px; border-radius: 50%; overflow: hidden; margin: 0 auto; display: flex; align-items: center; justify-content: center; background: #1e293b; cursor: pointer;" title="คลิกเพื่อซูม/ตัด/เปลี่ยนรูปภาพพนักงาน (${displayName})" onclick="openCropperForMember('${m.employeeId}')">
                                    ${photoSrc ? `<img src="${photoSrc}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size: 0.72rem; font-weight: 700; color: #60a5fa;">${displayName.slice(0, 2)}</span>`}
                                </div>
                            </td>
                            <td style="font-family: monospace; font-weight: 600; color: #60a5fa;">${m.employeeId}</td>
                            <td><strong style="color: #ffffff;">${displayName}</strong></td>
                            <td style="color: #94a3b8; font-size: 0.78rem;">${displayDept}</td>
                            <td style="text-align: center;">
                                <button type="button" class="btn-toggle-captain ${m.isCaptain ? 'is-captain' : ''}"
                                    onclick="toggleMemberCaptain('${m.employeeId}')"
                                    title="คลิกเพื่อกำหนดให้คนนี้เป็นหัวหน้าทีม">
                                    ${m.isCaptain ? '👑 หัวหน้าทีม' : 'ตั้งเป็นหัวหน้า'}
                                </button>
                            </td>
                            <td style="text-align: center;">
                                <button type="button" class="btn-del-member"
                                    onclick="removeMemberFromCurrentTeam('${m.employeeId}')"
                                    title="ลบสมาชิกคนนี้ออกจากทีม">
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    // Toggle Captain status of member
    window.toggleMemberCaptain = function (empId) {
        currentEditingTeamMembers.forEach(m => {
            if (m.employeeId === empId) {
                m.isCaptain = !m.isCaptain;
            } else {
                if (!m.isCaptain) return;
                m.isCaptain = false;
            }
        });
        renderTeamMembersRosterUI();
        if (sound) sound.playClick();
    };

    // Remove member from current editing team
    window.removeMemberFromCurrentTeam = function (empId) {
        currentEditingTeamMembers = currentEditingTeamMembers.filter(m => m.employeeId !== empId);
        renderTeamMembersRosterUI();
        if (sound) sound.playClick();
    };

    // Delete Team Item
    window.deletePlayerItem = function (id) {
        const teamsList = state.getPlayers();
        const target = teamsList.find(t => t.id === id);
        if (!target) return;

        const confirmMsg = `ต้องการลบทีมแข่งขัน:
"${target.teamName}" (ลำดับที่: ${target.orderNo})
ใช่หรือไม่?`;
        if (confirm(confirmMsg)) {
            state.deletePlayer(id);
            if (selectedPlayerId === id) {
                resetPlayerForm();
            }
            renderPlayers();
            if (sound) sound.playWin();
        }
    };

    // Initialize Competition Players / Teams Section
    function initCompetitionPlayersSection() {
        if (!playerDetailForm) return;

        // Search input
        if (searchPlayerInput) {
            searchPlayerInput.addEventListener('input', (e) => {
                playerSearchKeyword = e.target.value;
                renderPlayers();
            });
        }

        // Button: Add New Player (Top-Right)
        if (btnAddNewPlayer) {
            btnAddNewPlayer.addEventListener('click', resetPlayerForm);
        }

        // Button: Empty state Add New Player
        if (btnEmptyAddNewPlayer) {
            btnEmptyAddNewPlayer.addEventListener('click', () => resetPlayerForm());
        }

        // Save Success Lightbox Modal Controls
        if (btnClosePlayerSaveSuccessModal) {
            btnClosePlayerSaveSuccessModal.addEventListener('click', () => {
                if (playerSaveSuccessModal) playerSaveSuccessModal.style.display = 'none';
            });
        }
        if (playerSaveSuccessModal) {
            playerSaveSuccessModal.addEventListener('click', (e) => {
                if (e.target === playerSaveSuccessModal) {
                    playerSaveSuccessModal.style.display = 'none';
                }
            });
        }

        // Button: Reset Form
        if (btnResetPlayer) {
            btnResetPlayer.addEventListener('click', resetPlayerForm);
        }

        // Button: Delete Team
        if (btnDeletePlayer) {
            btnDeletePlayer.addEventListener('click', () => {
                if (selectedPlayerId) {
                    deletePlayerItem(selectedPlayerId);
                }
            });
        }

        // Setup Team Photo Cropper Mouse/Touch/Wheel Drag & Pan
        if (teamCropCanvasWrapper) {
            function handleTeamDragStart(cx, cy) {
                if (!teamCropper.hasPhoto) return;
                teamCropper.isDragging = true;
                teamCropper.dragStartX = cx;
                teamCropper.dragStartY = cy;
                teamCropper.imgBaseX = teamCropper.offsetX;
                teamCropper.imgBaseY = teamCropper.offsetY;
            }

            function handleTeamDragMove(cx, cy) {
                if (!teamCropper.isDragging) return;
                const dx = cx - teamCropper.dragStartX;
                const dy = cy - teamCropper.dragStartY;
                teamCropper.offsetX = teamCropper.imgBaseX + dx;
                teamCropper.offsetY = teamCropper.imgBaseY + dy;
                renderTeamCropper();
            }

            function handleTeamDragEnd() {
                teamCropper.isDragging = false;
            }

            teamCropCanvasWrapper.addEventListener('mousedown', (e) => handleTeamDragStart(e.clientX, e.clientY));
            window.addEventListener('mousemove', (e) => {
                if (teamCropper.isDragging) handleTeamDragMove(e.clientX, e.clientY);
            });
            window.addEventListener('mouseup', handleTeamDragEnd);

            teamCropCanvasWrapper.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) handleTeamDragStart(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: true });

            window.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1 && teamCropper.isDragging) handleTeamDragMove(e.touches[0].clientX, e.touches[0].clientY);
            }, { passive: true });

            window.addEventListener('touchend', handleTeamDragEnd);

            teamCropCanvasWrapper.addEventListener('wheel', (e) => {
                if (!teamCropper.hasPhoto) return;
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.08 : -0.08;
                setTeamCropperZoom(teamCropper.scale + delta);
            }, { passive: false });
        }

        // Team Cropper Controls (Zoom, Rotate, Reset)
        if (teamZoomRangeInput) {
            teamZoomRangeInput.addEventListener('input', (e) => setTeamCropperZoom(parseFloat(e.target.value)));
        }
        if (btnTeamZoomIn) btnTeamZoomIn.addEventListener('click', () => setTeamCropperZoom(teamCropper.scale + 0.1));
        if (btnTeamZoomOut) btnTeamZoomOut.addEventListener('click', () => setTeamCropperZoom(teamCropper.scale - 0.1));
        if (btnTeamResetCrop) btnTeamResetCrop.addEventListener('click', resetTeamCropper);
        if (btnTeamRotateCrop) {
            btnTeamRotateCrop.addEventListener('click', () => {
                teamCropper.rotation = (teamCropper.rotation + 90) % 360;
                renderTeamCropper();
            });
        }

        // Team Photo Upload & Removal Handlers
        if (btnUploadTeamPhoto && compTeamPhotoFileInput) {
            btnUploadTeamPhoto.addEventListener('click', () => compTeamPhotoFileInput.click());
        }

        if (compTeamPhotoFileInput) {
            compTeamPhotoFileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                    alert('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPG, PNG, WebP)');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (re) => {
                    loadTeamCropperImage(re.target.result);
                };
                reader.readAsDataURL(file);
                if (sound) sound.playClick();
            });
        }

        if (btnRemoveTeamPhoto) {
            btnRemoveTeamPhoto.addEventListener('click', () => {
                if (confirm('ต้องการลบรูปภาพทีมรวมนี้ใช่หรือไม่?')) {
                    loadTeamCropperImage('');
                    if (compTeamPhotoFileInput) compTeamPhotoFileInput.value = '';
                    if (sound) sound.playClick();
                }
            });
        }

        // Real-time Lookup for Member ID Input in "เพิ่มสมาชิก"
        if (compNewMemberEmpId) {
            const handleMemberLookup = function () {
                const val = (compNewMemberEmpId.value || '').trim();
                if (!val) {
                    if (addMemberLookupHint) {
                        addMemberLookupHint.className = 'add-member-preview-box';
                        addMemberLookupHint.innerHTML = '💡 กรอกรหัสพนักงาน ระบบจะดึงชื่อ-นามสกุลและสังกัดจากตาราง crsdg_member มาแสดงอัตโนมัติ';
                    }
                    return;
                }

                const members = state.getMembers();
                const found = members.find(m => String(m.EmployeeID || m.id).trim().toLowerCase() === val.toLowerCase());

                if (found) {
                    if (addMemberLookupHint) {
                        addMemberLookupHint.className = 'add-member-preview-box is-found';
                        addMemberLookupHint.innerHTML = `✓ พบ: <strong>${found.EmpName || found.name}</strong> [สังกัด: ${found.Group || found.department || 'ไม่ระบุ'}]`;
                    }
                } else {
                    if (addMemberLookupHint) {
                        addMemberLookupHint.className = 'add-member-preview-box';
                        addMemberLookupHint.innerHTML = `ℹ️ ไม่พบรหัส "${val}" ใน crsdg_member (จะใช้รหัสนี้เป็นชื่อสมาชิกโดยตรง)`;
                    }
                }
            };

            compNewMemberEmpId.addEventListener('input', handleMemberLookup);
            compNewMemberEmpId.addEventListener('change', handleMemberLookup);
            compNewMemberEmpId.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (btnAddMemberToTeam) btnAddMemberToTeam.click();
                }
            });
        }

        // Button: Add Member To Team
        if (btnAddMemberToTeam) {
            btnAddMemberToTeam.addEventListener('click', function () {
                const empId = (compNewMemberEmpId ? compNewMemberEmpId.value : '').trim();
                if (!empId) {
                    alert('กรุณากรอกรหัสพนักงาน');
                    if (compNewMemberEmpId) compNewMemberEmpId.focus();
                    return;
                }

                // Check duplicate
                if (currentEditingTeamMembers.some(m => m.employeeId.toLowerCase() === empId.toLowerCase())) {
                    alert(`รหัสพนักงาน "${empId}" อยู่ในทีมนี้แล้ว`);
                    return;
                }

                // Lookup in crsdg_member
                const members = state.getMembers();
                const found = members.find(m => String(m.EmployeeID || m.id).trim().toLowerCase() === empId.toLowerCase());

                const name = found ? (found.EmpName || found.name) : empId;
                const department = found ? (found.Group || found.department || '') : '';
                const rawPhoto = found ? (found.photo || found.Photo || found.avatar || '') : '';
                const photo = (rawPhoto && !rawPhoto.startsWith('data:image')) ? rawPhoto : '';
                const isCaptain = Boolean(compNewMemberIsCaptain && compNewMemberIsCaptain.checked);

                // If this new member is captain, demote other captains
                if (isCaptain) {
                    currentEditingTeamMembers.forEach(m => { m.isCaptain = false; });
                }

                currentEditingTeamMembers.push({
                    employeeId: empId,
                    name,
                    department,
                    photo,
                    isCaptain
                });

                // Clear input
                if (compNewMemberEmpId) {
                    compNewMemberEmpId.value = '';
                    compNewMemberEmpId.focus();
                }
                if (compNewMemberIsCaptain) {
                    compNewMemberIsCaptain.checked = false;
                }
                if (addMemberLookupHint) {
                    addMemberLookupHint.className = 'add-member-preview-box';
                    addMemberLookupHint.innerHTML = '💡 กรอกรหัสพนักงาน ระบบจะดึงชื่อ-นามสกุลและสังกัดจากตาราง crsdg_member มาแสดงอัตโนมัติ';
                }

                renderTeamMembersRosterUI();
                if (sound) sound.playClick();
            });
        }

        // Vote Amount Currency Preview
        if (playerVoteAmountInput) {
            playerVoteAmountInput.addEventListener('input', function () {
                const val = parseFloat(this.value) || 0;
                if (previewVoteAmountEl) {
                    previewVoteAmountEl.textContent = val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
                }
            });
        }

        // Voter Count Preview
        if (playerVoterCountInput) {
            playerVoterCountInput.addEventListener('input', function () {
                const val = parseInt(this.value, 10) || 0;
                if (previewVoterCountEl) {
                    previewVoterCountEl.textContent = val.toLocaleString() + ' คน';
                }
            });
        }

        // Form Submit: Save or Update Team
        playerDetailForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const editId = playerEditIdInput.value;
            const orderNo = parseInt(playerOrderNoInput.value, 10) || 1;
            const teamName = (playerTeamNameInput ? playerTeamNameInput.value : '').trim();

            if (!teamName) {
                alert('กรุณากรอกชื่อทีมแข่งขัน');
                if (playerTeamNameInput) playerTeamNameInput.focus();
                return;
            }

            // Export cropped & compressed team photo (Strictly <= 200KB)
            let teamPhoto = '';
            if (teamCropper.hasPhoto && teamCropper.img) {
                teamPhoto = getCroppedTeamPhotoDataUrl();
            } else if (compTeamPhotoBase64 && compTeamPhotoBase64.value) {
                teamPhoto = compTeamPhotoBase64.value;
            }

            const description = (playerProjectDesc ? playerProjectDesc.value : '').trim();
            const voteAmount = parseFloat(playerVoteAmountInput.value) || 0;
            const voterCount = parseInt(playerVoterCountInput.value, 10) || 0;
            const playerVoteStatusEl = document.getElementById('playerVoteStatus');
            const voteStatus = playerVoteStatusEl ? playerVoteStatusEl.value : 'open';
            const members = currentEditingTeamMembers;

            if (editId) {
                state.updatePlayer(editId, {
                    orderNo,
                    teamName,
                    description,
                    teamPhoto,
                    photo: teamPhoto,
                    voteAmount,
                    voterCount,
                    voteStatus,
                    members
                });
            } else {
                state.addPlayer({
                    orderNo,
                    teamName,
                    description,
                    teamPhoto,
                    photo: teamPhoto,
                    voteAmount,
                    voterCount,
                    voteStatus,
                    members
                });
            }

            // Optional Server file sync if running over HTTP
            if (window.location.protocol.startsWith('http') && teamPhoto && teamPhoto.startsWith('data:')) {
                const targetId = editId || ('comp_team_' + Date.now());
                fetch('/api/upload-team-photo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        teamId: targetId,
                        photoBase64: teamPhoto
                    })
                }).catch(() => {});
            }

            // Refresh left table
            renderPlayers();

            // Show Save Success Lightbox Modal
            if (playerSaveSuccessModal) {
                if (playerSaveSuccessMsg) {
                    playerSaveSuccessMsg.textContent = `บันทึกข้อมูลทีม "${teamName}" และรายละเอียดโครงการเรียบร้อยแล้ว`;
                }
                playerSaveSuccessModal.style.display = 'flex';
            } else {
                showToast(`✓ บันทึกข้อมูลทีม "${teamName}" สำเร็จ`);
            }

            // Reset right side to empty box waiting for click on the left!
            showPlayerEmptyState();

            if (sound) sound.playWin();
        });

        // Export Players / Teams to Excel
        if (btnExportPlayersExcel) {
            btnExportPlayersExcel.addEventListener('click', function () {
                const teamsList = state.getPlayers();
                if (teamsList.length === 0) {
                    alert('ยังไม่มีข้อมูลทีมแข่งขันในตาราง crsdg_player ให้ส่งออก');
                    return;
                }
                if (typeof XLSX !== 'undefined') {
                    const rows = [];
                    teamsList.forEach(t => {
                        const tMembers = t.members || [];
                        if (tMembers.length === 0) {
                            rows.push({
                                'ลำดับ': t.orderNo,
                                'ชื่อทีมแข่งขัน': t.teamName,
                                'รายละเอียดโครงการ': t.description || '-',
                                'รูปภาพทีมรวม': t.teamPhoto ? 'มีรูปภาพ' : 'ไม่มีรูปภาพ',
                                'จำนวนสมาชิก (คน)': 0,
                                'รหัสสมาชิก': '-',
                                'ชื่อ-นามสกุล': '-',
                                'สังกัดเดิม (Group)': '-',
                                'บทบาท': '-',
                                'จำนวนเงินที่ได้จากผู้โหวต (บาท)': t.voteAmount,
                                'จำนวนผู้ให้เงิน (คน)': t.voterCount
                            });
                        } else {
                            tMembers.forEach(m => {
                                rows.push({
                                    'ลำดับ': t.orderNo,
                                    'ชื่อทีมแข่งขัน': t.teamName,
                                    'รายละเอียดโครงการ': t.description || '-',
                                    'รูปภาพทีมรวม': t.teamPhoto ? 'มีรูปภาพ' : 'ไม่มีรูปภาพ',
                                    'จำนวนสมาชิก (คน)': tMembers.length,
                                    'รหัสสมาชิก': m.employeeId,
                                    'ชื่อ-นามสกุล': m.name,
                                    'สังกัดเดิม (Group)': m.department,
                                    'บทบาท': m.isCaptain ? 'หัวหน้าทีม' : 'สมาชิก',
                                    'จำนวนเงินที่ได้จากผู้โหวต (บาท)': t.voteAmount,
                                    'จำนวนผู้ให้เงิน (คน)': t.voterCount
                                });
                            });
                        }
                    });

                    const wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.json_to_sheet(rows);
                    XLSX.utils.book_append_sheet(wb, ws, 'crsdg_player');
                    XLSX.writeFile(wb, `CRSDG_Player_Teams_${new Date().toISOString().slice(0, 10)}.xlsx`);
                }
            });
        }

        // ========================================================
        // RESET PLAYER VOTES MODAL HANDLERS
        // ========================================================
        const btnOpenResetPlayerVotesModal = document.getElementById('btnOpenResetPlayerVotesModal');
        const confirmResetPlayerVotesModal = document.getElementById('confirmResetPlayerVotesModal');
        const closeResetPlayerVotesModalBtn = document.getElementById('closeResetPlayerVotesModalBtn');
        const cancelResetPlayerVotesBtn = document.getElementById('cancelResetPlayerVotesBtn');
        const confirmResetPlayerVotesBtn = document.getElementById('confirmResetPlayerVotesBtn');
        const resetPlayerVotesHighlightText = document.getElementById('resetPlayerVotesHighlightText');
        const inputConfirmResetVotesText = document.getElementById('inputConfirmResetVotesText');

        const updateResetConfirmButtonState = () => {
            if (!confirmResetPlayerVotesBtn) return;
            const typed = inputConfirmResetVotesText ? inputConfirmResetVotesText.value.trim().toLowerCase() : '';
            if (typed === 'reset') {
                confirmResetPlayerVotesBtn.disabled = false;
                confirmResetPlayerVotesBtn.style.opacity = '1';
                confirmResetPlayerVotesBtn.style.cursor = 'pointer';
            } else {
                confirmResetPlayerVotesBtn.disabled = true;
                confirmResetPlayerVotesBtn.style.opacity = '0.45';
                confirmResetPlayerVotesBtn.style.cursor = 'not-allowed';
            }
        };

        if (inputConfirmResetVotesText) {
            inputConfirmResetVotesText.addEventListener('input', updateResetConfirmButtonState);
            inputConfirmResetVotesText.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !confirmResetPlayerVotesBtn.disabled) {
                    confirmResetPlayerVotesBtn.click();
                }
            });
        }

        if (btnOpenResetPlayerVotesModal && confirmResetPlayerVotesModal) {
            btnOpenResetPlayerVotesModal.addEventListener('click', () => {
                const players = state.getPlayers();
                if (resetPlayerVotesHighlightText) {
                    resetPlayerVotesHighlightText.textContent = `พบทั้งหมด ${players.length} ทีมแข่งขันในระบบ (จะถูกรีเซ็ตเงินโหวตและเงินลงทุนเป็น 0 ทั้งหมด)`;
                }
                if (inputConfirmResetVotesText) {
                    inputConfirmResetVotesText.value = '';
                }
                updateResetConfirmButtonState();
                confirmResetPlayerVotesModal.style.display = 'flex';
                if (inputConfirmResetVotesText) {
                    setTimeout(() => inputConfirmResetVotesText.focus(), 60);
                }
                if (sound) sound.playClick();
            });

            const hideResetVotesModal = () => {
                confirmResetPlayerVotesModal.style.display = 'none';
                if (inputConfirmResetVotesText) inputConfirmResetVotesText.value = '';
                updateResetConfirmButtonState();
                if (sound) sound.playClick();
            };

            if (closeResetPlayerVotesModalBtn) closeResetPlayerVotesModalBtn.addEventListener('click', hideResetVotesModal);
            if (cancelResetPlayerVotesBtn) cancelResetPlayerVotesBtn.addEventListener('click', hideResetVotesModal);

            if (confirmResetPlayerVotesBtn) {
                confirmResetPlayerVotesBtn.addEventListener('click', async () => {
                    const typed = inputConfirmResetVotesText ? inputConfirmResetVotesText.value.trim().toLowerCase() : '';
                    if (typed !== 'reset') {
                        alert('กรุณาพิมพ์คำว่า "Reset" ในช่องข้อความเพื่อยืนยัน');
                        if (inputConfirmResetVotesText) inputConfirmResetVotesText.focus();
                        return;
                    }

                    confirmResetPlayerVotesBtn.disabled = true;
                    confirmResetPlayerVotesBtn.textContent = '⏳ กำลัง Reset...';

                    const res = state.resetAllPlayerVotes();
                    if (window.FirebaseSync && typeof window.FirebaseSync.clearAllUserInvestmentsFromCloud === 'function') {
                        try {
                            await window.FirebaseSync.clearAllUserInvestmentsFromCloud();
                        } catch (e) {
                            console.warn('[Admin] Cloud clear error:', e);
                        }
                    }

                    confirmResetPlayerVotesBtn.textContent = '🔄 ยืนยันการ Reset การโหวตเป็น 0';
                    hideResetVotesModal();
                    renderPlayers();
                    if (playerEditId && playerEditId.value) {
                        selectPlayerForEdit(playerEditId.value, false);
                    }
                    if (sound) sound.playSuccess();
                    showToast(`รีเซ็ตเงินโหวตทุกทีม (${res.count} ทีม) และเงินลงทุนของผู้ใช้งานทุกคนเป็น 0 เรียบร้อยแล้ว 💰`);
                });
            }
        }

        // Budget Save & Voting Status Toggle in Comp Teams Tab
        const adminCompVoteBudgetInput = document.getElementById('adminCompVoteBudgetInput');
        const btnSaveCompVoteBudget = document.getElementById('btnSaveCompVoteBudget');
        const btnToggleCompVoteOpen = document.getElementById('btnToggleCompVoteOpen');

        if (btnSaveCompVoteBudget && adminCompVoteBudgetInput) {
            btnSaveCompVoteBudget.addEventListener('click', () => {
                const val = parseFloat(adminCompVoteBudgetInput.value) || 1000000;
                state.setVoteBudget(val);
                showToast(`บันทึกงบลงทุน AI เริ่มต้นเป็น ${val.toLocaleString()} บาท/คน เรียบร้อยแล้ว 💰`);
                renderPlayers();
                renderVoteDashboard();
                if (sound) sound.playSuccess();
            });
        }

        if (btnToggleCompVoteOpen) {
            btnToggleCompVoteOpen.addEventListener('click', () => {
                const nextOpen = !state.isVoteOpen();
                state.setVoteOpen(nextOpen);
                if (!nextOpen) {
                    // เมื่อสั่งปิดการลงทุนให้ปุ่มด้านล่างปรับสถานะเป็น ปิดโหวต ทั้งหมด
                    if (typeof state.closeAllTeamVotes === 'function') {
                        state.closeAllTeamVotes();
                    } else {
                        const players = state.getPlayers();
                        const updated = players.map(p => ({ ...p, voteStatus: 'closed' }));
                        state.savePlayers(updated);
                    }
                }
                renderPlayers();
                renderVoteDashboard();
                showToast(nextOpen ? '🟢 เปิดการลงทุนเรียบร้อยแล้ว' : '🔴 ปิดการลงทุน และปิดโหวตทีมทั้งหมดแล้ว');
                if (sound) sound.playClick();
            });
        }
    }

    // ========================================================
    // TAB: EVENT EVALUATIONS DASHBOARD (crsdg_evaluations)
    // ========================================================
    function escapeEvalHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderEvaluations() {
        const tableBody = document.getElementById('evaluationsTableBody');
        if (!tableBody) return;

        const evals = (typeof state.getEvaluations === 'function') ? state.getEvaluations() : [];
        const stats = (typeof state.getEvaluationStats === 'function') ? state.getEvaluationStats() : {
            total: 0,
            avgOverall: '0.0',
            feedbackCount: 0,
            tagCounts: {},
            ratingsBreakdown: {}
        };

        // 1. Update KPI Cards & Top Stat Badge
        const badge = document.getElementById('statEvalsCountBadge');
        if (badge) badge.textContent = stats.total;

        const kpiTotal = document.getElementById('kpiEvalTotalCount');
        if (kpiTotal) kpiTotal.textContent = stats.total;

        const kpiAvg = document.getElementById('kpiEvalAvgScore');
        if (kpiAvg) kpiAvg.textContent = stats.avgOverall;

        const kpiFeedback = document.getElementById('kpiEvalFeedbackCount');
        if (kpiFeedback) kpiFeedback.textContent = stats.feedbackCount;

        const kpiTopHighlight = document.getElementById('kpiEvalTopHighlight');
        if (kpiTopHighlight) {
            let maxTag = '-';
            let maxCount = 0;
            for (const [tag, count] of Object.entries(stats.tagCounts || {})) {
                if (count > maxCount) {
                    maxCount = count;
                    maxTag = `${tag} (${count})`;
                }
            }
            kpiTopHighlight.textContent = maxTag;
            kpiTopHighlight.title = maxTag;
        }

        // 2. Chart Question 1: Overall Star Rating Distribution (1 - 5 Stars)
        const starDistContainer = document.getElementById('evalStarDistributionChartContainer');
        const avgOverallEl = document.getElementById('chartAvgScoreOverall');
        if (avgOverallEl) avgOverallEl.textContent = stats.avgOverall;

        if (starDistContainer) {
            if (stats.total === 0) {
                starDistContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 18px; font-size: 0.85rem;">ยังไม่มีข้อมูลผลการประเมิน</div>';
            } else {
                const starConfigs = [
                    { star: 5, label: '⭐⭐⭐⭐⭐ 5 ดาว', grad: 'linear-gradient(90deg, #10b981, #059669)' },
                    { star: 4, label: '⭐⭐⭐⭐ 4 ดาว', grad: 'linear-gradient(90deg, #06b6d4, #0891b2)' },
                    { star: 3, label: '⭐⭐⭐ 3 ดาว', grad: 'linear-gradient(90deg, #f59e0b, #d97706)' },
                    { star: 2, label: '⭐⭐ 2 ดาว', grad: 'linear-gradient(90deg, #f97316, #ea580c)' },
                    { star: 1, label: '⭐ 1 ดาว', grad: 'linear-gradient(90deg, #ef4444, #dc2626)' }
                ];

                starDistContainer.innerHTML = starConfigs.map(c => {
                    const count = (stats.starCounts && stats.starCounts[c.star]) || 0;
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return `
                        <div style="display: flex; align-items: center; gap: 10px; font-size: 0.82rem;">
                            <span style="width: 105px; font-weight: 600; color: #cbd5e1; font-size: 0.78rem;">${c.label}</span>
                            <div style="flex: 1; height: 12px; background: rgba(255, 255, 255, 0.08); border-radius: 999px; overflow: hidden; position: relative;">
                                <div style="width: ${pct}%; height: 100%; background: ${c.grad}; border-radius: 999px; transition: width 0.4s ease;"></div>
                            </div>
                            <span style="width: 75px; font-weight: 700; color: #f8fafc; font-family: monospace; font-size: 0.8rem; text-align: right;">${count} คน (${pct}%)</span>
                        </div>
                    `;
                }).join('');
            }
        }

        // 3. Chart Question 3: Highlight Tags Popularity Ranking
        const hlContainer = document.getElementById('evalHighlightsAdminContainer');
        const totalTagVotesEl = document.getElementById('chartTotalTagVotes');
        const allPossibleTags = [
            '💡 นวัตกรรมและไอเดีย AI',
            '💰 ระบบพอร์ตลงทุน Real-time',
            '🎮 เกมเวที 4 ต่อ 4 สนุกสนาน',
            '🎁 รางวัลและของขวัญโดนใจ',
            '🍱 อาหารและเครื่องดื่มอร่อย',
            '🤝 บรรยากาศอบอุ่นและความสามัคคี'
        ];
        const tagEntries = allPossibleTags.map(tag => [tag, (stats.tagCounts && stats.tagCounts[tag]) || 0]);
        tagEntries.sort((a, b) => b[1] - a[1]);
        const sumVotes = tagEntries.reduce((sum, item) => sum + item[1], 0);
        if (totalTagVotesEl) totalTagVotesEl.textContent = sumVotes.toLocaleString();

        if (hlContainer) {
            if (stats.total === 0 || sumVotes === 0) {
                hlContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 18px; font-size: 0.85rem;">ยังไม่มีข้อมูลสิ่งที่ประทับใจ</div>';
            } else {
                const rankIcons = ['🥇', '🥈', '🥉', '#4', '#5', '#6'];
                hlContainer.innerHTML = tagEntries.map(([tag, count], idx) => {
                    const pct = stats.total > 0 ? Math.min(100, Math.round((count / stats.total) * 100)) : 0;
                    return `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                                <span style="font-size: 0.82rem; font-weight: 700; width: 22px; text-align: center;">${rankIcons[idx] || (idx + 1)}</span>
                                <span style="font-size: 0.82rem; color: #e2e8f0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeEvalHtml(tag)}">${escapeEvalHtml(tag)}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                <div style="width: 80px; height: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); overflow: hidden;">
                                    <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #10b981, #059669); border-radius: 999px; transition: width 0.4s ease;"></div>
                                </div>
                                <span style="font-size: 0.78rem; font-weight: 700; color: #34d399; min-width: 52px; text-align: right; font-family: monospace;">${count} (${pct}%)</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 4. Chart Question 2: 4 Sub-dimensions Breakdown Charts
        const dimContainer = document.getElementById('evalDimensionsStatsContainer');
        if (dimContainer) {
            const dimDefs = [
                { key: 'pitch', label: '2.1 AI Pitching & พอร์ตลงทุน', icon: '💡' },
                { key: 'game', label: '2.2 แข่งขันเกม 4 ต่อ 4 CRSDG Game', icon: '🎮' },
                { key: 'food', label: '2.3 อาหาร เครื่องดื่ม & การต้อนรับ', icon: '🍱' },
                { key: 'app', label: '2.4 เว็บแอป & กิจกรรมดิจิทัล', icon: '📱' }
            ];

            if (stats.total === 0) {
                dimContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 18px; font-size: 0.85rem;">ยังไม่มีข้อมูลผลการประเมิน</div>';
            } else {
                dimContainer.innerHTML = dimDefs.map(d => {
                    const breakdown = (stats.ratingsBreakdown && stats.ratingsBreakdown[d.key]) || {};
                    const tierConfigs = [
                        { color: '#10b981', labelKey: ['ดีเยี่ยม', 'สนุกมากที่สุด', 'ประทับใจมาก', 'ใช้งานง่ายมาก'], label: 'ดีเยี่ยม/มากสุด' },
                        { color: '#38bdf8', labelKey: ['ดีมาก', 'สนุกมาก', 'ดี', 'สะดวกดี'], label: 'ดีมาก/ดี' },
                        { color: '#f59e0b', labelKey: ['ปานกลาง'], label: 'ปานกลาง' },
                        { color: '#f87171', labelKey: ['ควรปรับปรุง'], label: 'ควรปรับปรุง' }
                    ];

                    let segmentsHtml = '';
                    let badgesHtml = '';

                    tierConfigs.forEach(t => {
                        let cCount = 0;
                        let foundName = '';
                        t.labelKey.forEach(k => {
                            if (breakdown[k]) {
                                cCount += breakdown[k];
                                foundName = k;
                            }
                        });
                        const pct = stats.total > 0 ? Math.round((cCount / stats.total) * 100) : 0;
                        if (pct > 0) {
                            segmentsHtml += `<div style="width: ${pct}%; height: 100%; background: ${t.color};" title="${foundName || t.label}: ${cCount} คน (${pct}%)"></div>`;
                        }
                        badgesHtml += `
                            <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #cbd5e1; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                                <span style="width: 7px; height: 7px; border-radius: 50%; background: ${t.color};"></span>
                                ${foundName || t.label}: <strong style="color: #ffffff;">${cCount}</strong> (${pct}%)
                            </span>
                        `;
                    });

                    return `
                        <div style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px 16px;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                                <span style="font-size: 1.1rem;">${d.icon}</span>
                                <strong style="font-size: 0.88rem; color: #f8fafc;">${d.label}</strong>
                            </div>
                            <!-- Stacked bar chart -->
                            <div style="height: 12px; width: 100%; background: rgba(255, 255, 255, 0.08); border-radius: 999px; overflow: hidden; display: flex; margin-bottom: 10px;">
                                ${segmentsHtml || '<div style="width: 100%; background: rgba(255,255,255,0.04);"></div>'}
                            </div>
                            <!-- Breakdown details pills -->
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                ${badgesHtml}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 5. Question 4: Feedback Stream Container
        const feedbackContainer = document.getElementById('evalFeedbackStreamContainer');
        const feedbackCountEl = document.getElementById('chartFeedbackUserCount');
        const feedbackList = evals.filter(e => e.feedback && String(e.feedback).trim().length > 0);
        if (feedbackCountEl) feedbackCountEl.textContent = feedbackList.length.toLocaleString();

        if (feedbackContainer) {
            if (feedbackList.length === 0) {
                feedbackContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 18px; font-size: 0.85rem;">ยังไม่มีข้อคิดเห็นเพิ่มเติมจากผู้ร่วมกิจกรรม</div>';
            } else {
                feedbackContainer.innerHTML = feedbackList.map(item => {
                    const stars = '⭐'.repeat(Math.min(5, Math.max(1, parseInt(item.overallScore, 10) || 5)));
                    const timeStr = item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
                    return `
                        <div style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 10px 14px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <strong style="color: #60a5fa; font-size: 0.85rem;">คุณ${escapeEvalHtml(item.empName || 'ผู้ร่วมกิจกรรม')}</strong>
                                    <span style="font-size: 0.72rem; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px;">${escapeEvalHtml(item.department || '-')}</span>
                                    <span style="font-size: 0.75rem;">${stars}</span>
                                </div>
                                <span style="font-size: 0.72rem; color: var(--text-secondary);">${timeStr}</span>
                            </div>
                            <div style="font-size: 0.82rem; color: #f1f5f9; line-height: 1.4; background: rgba(0, 0, 0, 0.2); padding: 8px 10px; border-radius: 6px; border-left: 3px solid #8b5cf6;">
                                "${escapeEvalHtml(item.feedback)}"
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 4. Data Table Rendering with Filters
        const searchInput = document.getElementById('evalSearchInput');
        const starSelect = document.getElementById('evalStarFilterSelect');
        const term = searchInput ? (searchInput.value || '').trim().toLowerCase() : '';
        const starVal = starSelect ? (starSelect.value || '') : '';

        const filtered = evals.filter(e => {
            if (starVal) {
                const sc = String(e.overallScore || 5);
                if (starVal === '1-2') {
                    if (sc !== '1' && sc !== '2') return false;
                } else if (sc !== starVal) {
                    return false;
                }
            }
            if (term) {
                const matchName = String(e.empName || '').toLowerCase().includes(term);
                const matchId = String(e.empId || '').toLowerCase().includes(term);
                const matchDept = String(e.department || '').toLowerCase().includes(term);
                const matchFeedback = String(e.feedback || '').toLowerCase().includes(term);
                const matchTags = Array.isArray(e.tags) ? e.tags.some(t => String(t).toLowerCase().includes(term)) : false;
                if (!matchName && !matchId && !matchDept && !matchFeedback && !matchTags) return false;
            }
            return true;
        });

        const showingCountBadge = document.getElementById('evalShowingCountBadge');
        if (showingCountBadge) showingCountBadge.textContent = filtered.length;

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 32px 16px; color: var(--text-secondary);">
                        ${evals.length === 0 ? '📝 ยังไม่มีผู้ส่งแบบประเมินผลกิจกรรมในระบบ' : '🔍 ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map((e, idx) => {
            const timeFormatted = e.submittedAt ? new Date(e.submittedAt).toLocaleString('th-TH') : '-';
            const sc = Math.min(5, Math.max(1, parseInt(e.overallScore || 5, 10)));
            const starsText = '⭐'.repeat(sc);
            const tagsArr = Array.isArray(e.tags) ? e.tags : [];

            return `
                <tr>
                    <td style="text-align: center; color: var(--text-secondary); font-size: 0.85rem;">${idx + 1}</td>
                    <td style="font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap;">${timeFormatted}</td>
                    <td>
                        <div style="display: flex; flex-direction: column;">
                            <strong style="color: #ffffff; font-size: 0.88rem;">${escapeEvalHtml(e.empName)}</strong>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span style="background: rgba(0, 86, 255, 0.15); color: #60a5fa; padding: 1px 7px; border-radius: 4px; border: 1px solid rgba(0, 86, 255, 0.25);">${escapeEvalHtml(e.department || '-')}</span>
                                ${(e.empId && e.empId !== 'guest') ? `<span style="opacity: 0.75;">(รหัส: ${escapeEvalHtml(e.empId)})</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 999px; padding: 2px 10px;">
                            <span style="color: #fbbf24; font-size: 0.85rem;">${starsText}</span>
                            <strong style="color: #fbbf24; font-size: 0.88rem;">${sc}</strong>
                            <span style="color: var(--text-secondary); font-size: 0.72rem;">/5</span>
                        </div>
                    </td>
                    <td style="font-size: 0.78rem;">
                        <div style="display: flex; flex-direction: column; gap: 3px;">
                            <div><span style="color: var(--text-secondary);">AI Pitch:</span> <strong style="color: #93c5fd;">${escapeEvalHtml((e.ratings && e.ratings.pitch) || '-')}</strong></div>
                            <div><span style="color: var(--text-secondary);">เกม 4 ต่อ 4:</span> <strong style="color: #a7f3d0;">${escapeEvalHtml((e.ratings && e.ratings.game) || '-')}</strong></div>
                            <div><span style="color: var(--text-secondary);">อาหาร/สถานที่:</span> <strong style="color: #fde68a;">${escapeEvalHtml((e.ratings && e.ratings.food) || '-')}</strong></div>
                            <div><span style="color: var(--text-secondary);">ระบบเว็บ:</span> <strong style="color: #e9d5ff;">${escapeEvalHtml((e.ratings && e.ratings.app) || '-')}</strong></div>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${tagsArr.length > 0 ? tagsArr.map(t => `<span style="font-size: 0.72rem; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 2px 7px;">${escapeEvalHtml(t)}</span>`).join('') : '<span style="color: var(--text-secondary); font-size: 0.75rem;">-</span>'}
                        </div>
                    </td>
                    <td style="font-size: 0.82rem; color: #cbd5e1; max-width: 250px;">
                        ${e.feedback ? `<div style="white-space: pre-wrap; word-break: break-word;">${escapeEvalHtml(e.feedback)}</div>` : '<span style="color: var(--text-secondary);">-</span>'}
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-icon-only btn-danger" onclick="window.handleDeleteEvaluation('${e.id}')" title="ลบผลการประเมินนี้" style="padding: 5px 8px; border-radius: 6px; font-size: 0.85rem; border: none; cursor: pointer;">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function initEvaluationsSection() {
        const searchInput = document.getElementById('evalSearchInput');
        const starSelect = document.getElementById('evalStarFilterSelect');
        const btnExportExcel = document.getElementById('btnExportEvaluationsExcel');
        const btnClearAll = document.getElementById('btnClearAllEvaluations');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                renderEvaluations();
            });
        }

        if (starSelect) {
            starSelect.addEventListener('change', () => {
                renderEvaluations();
            });
        }

        if (btnExportExcel) {
            btnExportExcel.addEventListener('click', () => {
                if (typeof XLSX === 'undefined') {
                    alert('กำลังโหลดไลบรารี Excel กรุณาลองใหม่อีกครั้ง');
                    return;
                }
                const list = state.getEvaluations();
                if (!list || list.length === 0) {
                    showToast('ยังไม่มีข้อมูลแบบประเมินผลสำหรับส่งออก Excel');
                    return;
                }
                const rows = list.map((e, idx) => ({
                    'ลำดับ': idx + 1,
                    'วันเวลาที่ส่ง': e.submittedAt ? new Date(e.submittedAt).toLocaleString('th-TH') : '-',
                    'รหัสพนักงาน': (e.empId && e.empId !== 'guest') ? e.empId : '-',
                    'ชื่อ-นามสกุล ผู้ประเมิน': e.empName || '-',
                    'ฝ่าย / สังกัด': e.department || '-',
                    'คะแนนความพึงพอใจภาพรวม (1-5)': e.overallScore || 5,
                    'เวที AI Pitching & พอร์ตลงทุน': (e.ratings && e.ratings.pitch) || '-',
                    'เกม 4 ต่อ 4 CRSDG Game': (e.ratings && e.ratings.game) || '-',
                    'อาหาร เครื่องดื่ม และการต้อนรับ': (e.ratings && e.ratings.food) || '-',
                    'ระบบเว็บแอปพลิเคชัน & กิจกรรม': (e.ratings && e.ratings.app) || '-',
                    'สิ่งที่ประทับใจมากที่สุด': Array.isArray(e.tags) ? e.tags.join(', ') : '-',
                    'ข้อคิดเห็นและข้อเสนอแนะเพิ่มเติม': e.feedback || '-'
                }));

                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(rows);
                ws['!cols'] = [
                    { wch: 8 },
                    { wch: 22 },
                    { wch: 14 },
                    { wch: 24 },
                    { wch: 16 },
                    { wch: 28 },
                    { wch: 28 },
                    { wch: 24 },
                    { wch: 28 },
                    { wch: 28 },
                    { wch: 40 },
                    { wch: 50 }
                ];
                XLSX.utils.book_append_sheet(wb, ws, 'crsdg_evaluations');
                XLSX.writeFile(wb, `CRSDG_Evaluations_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
                showToast(`ส่งออกรายงานผลการประเมิน ${list.length} รายการเป็นไฟล์ Excel สำเร็จ`);
            });
        }

        const btnSyncEvaluations = document.getElementById('btnSyncEvaluationsFirebase');
        if (btnSyncEvaluations) {
            btnSyncEvaluations.addEventListener('click', async () => {
                if (sound) sound.playClick();
                btnSyncEvaluations.disabled = true;
                showToast('☁️ กำลังเชื่อมต่อและดึงข้อมูลจากตาราง crsdg_evaluations บน Firebase...');
                try {
                    if (window.FirebaseSync && typeof window.FirebaseSync.fetchEvaluationsFromCloud === 'function') {
                        const list = await window.FirebaseSync.fetchEvaluationsFromCloud();
                        renderEvaluations();
                        showToast(`✅ เชื่อมต่อ Firebase ตาราง crsdg_evaluations สำเร็จ (พบ ${list.length} รายการ)`);
                    } else {
                        showToast('⚠️ ไม่พบการเชื่อมต่อกับ FirebaseSync');
                    }
                } catch (err) {
                    showToast('⚠️ การเชื่อมต่อ Firebase ล้มเหลว: ' + err.message);
                } finally {
                    btnSyncEvaluations.disabled = false;
                }
            });
        }

        if (btnClearAll) {
            btnClearAll.addEventListener('click', () => {
                const evals = state.getEvaluations();
                if (!evals || evals.length === 0) {
                    showToast('ไม่มีข้อมูลแบบประเมินผลที่จะล้าง');
                    return;
                }
                if (confirm(`คุณต้องการล้างข้อมูลแบบประเมินผลทั้งหมด (${evals.length} รายการ) ใช่หรือไม่?\nการดำเนินการนี้จะล้างข้อมูลออกจาก Firebase ตาราง crsdg_evaluations ด้วย`)) {
                    state.clearAllEvaluations();
                    showToast('ล้างข้อมูลแบบประเมินผลทั้งหมดเรียบร้อยแล้ว');
                    renderEvaluations();
                }
            });
        }

        window.handleDeleteEvaluation = function(evalId) {
            if (!evalId) return;
            if (confirm('คุณต้องการลบผลการประเมินนี้ใช่หรือไม่?')) {
                state.deleteEvaluation(evalId);
                showToast('ลบผลการประเมินเรียบร้อยแล้ว');
                renderEvaluations();
            }
        };
    }

    // ========================================================
    // TAB SWITCHING
    // ========================================================
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(tabId);
            if (targetPane) targetPane.classList.add('active');
            if (tabId === 'tab-participants') {
                renderParticipants();
            }
            if (tabId === 'tab-registration') {
                renderRegistrationDashboard();
            }
            if (tabId === 'tab-prizes') {
                renderPrizes();
                renderWinners();
            }
            if (tabId === 'tab-winners') {
                renderWinners();
                if (window.FirebaseSync && typeof window.FirebaseSync.fetchWinnersFromCloud === 'function') {
                    window.FirebaseSync.fetchWinnersFromCloud().then(() => renderWinners()).catch(() => {});
                }
            }
            if (tabId === 'tab-vote') {
                renderVoteDashboard();
            }
            if (tabId === 'tab-evaluations') {
                renderEvaluations();
                if (window.FirebaseSync && typeof window.FirebaseSync.fetchEvaluationsFromCloud === 'function') {
                    window.FirebaseSync.fetchEvaluationsFromCloud().then(() => renderEvaluations()).catch(() => {});
                }
            }
            if (sound) sound.playClick();
        });
    });

    // Subscribe to state broadcasts
    state.subscribe((event) => {
        if (event.type === 'MEMBERS_UPDATED' || event.type === 'PARTICIPANTS_UPDATED' || event.type === 'TEAMS_UPDATED' || event.type === 'PRIZES_UPDATED' || event.type === 'WINNERS_UPDATED' || event.type === 'WINNER_RECORDED' || event.type === 'WINNERS_RESET' || event.type === 'WINNER_DELETED' || event.type === 'VOTE_STATUS_UPDATED' || event.type === 'STORAGE_UPDATED' || event.type === 'PLAYERS_UPDATED' || event.type === 'EVALUATIONS_UPDATED' || event.type === 'TEAM_VOTE_STATUS_UPDATED' || event.type === 'INVESTMENTS_UPDATED') {
            renderAll();
        }
    });

    // Initial render & Dashboard controls setup
    initThemeToggle();
    initFullscreenToggle();
    initRegistrationQrModal();
    initVoteDashboard();
    initCompetitionPlayersSection();
    initEvaluationsSection();

    // Setup sortable header click listeners
    const sortHeaders = document.querySelectorAll('.crsdg-member-table th.sortable-th');
    sortHeaders.forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', (e) => {
            const sortKey = th.getAttribute('data-sort');
            if (sortKey) window.handleTableSort(sortKey);
        });
    });

    // Setup Firebase Sync Button (All Database Tables)
    const btnSyncFirebaseMembers = document.getElementById('btnSyncFirebaseMembers');
    if (btnSyncFirebaseMembers) {
        btnSyncFirebaseMembers.addEventListener('click', async () => {
            if (sound) sound.playClick();
            showToast('☁️ กำลังดึงข้อมูลทุกตารางจาก Firebase Firestore (crsdg_member, crsdg_nameteam, crsdg_team, crsdg_player, crsdg_quiz, crsdg_evaluations, crsdg_vote)...');
            btnSyncFirebaseMembers.disabled = true;
            try {
                if (window.FirebaseSync && typeof window.FirebaseSync.fetchAllDataFromCloud === 'function') {
                    const allData = await window.FirebaseSync.fetchAllDataFromCloud();
                    if (allData) {
                        state.applyCloudData(allData);
                        renderAll();
                        showToast(`✅ ซิงค์ข้อมูลทุกตารางจาก Firebase สำเร็จเรียบร้อยแล้ว (${allData.members?.length || 0} พนักงาน, ${allData.players?.length || 0} ทีม)`);
                    } else {
                        showToast('ℹ️ ดึงข้อมูลจาก Firebase สำเร็จ');
                    }
                } else if (window.FirebaseSync && typeof window.FirebaseSync.fetchMembersFromCloud === 'function') {
                    const cloudList = await window.FirebaseSync.fetchMembersFromCloud();
                    if (cloudList && cloudList.length > 0) {
                        state.applyCloudMembers(cloudList);
                        renderAll();
                        showToast(`✅ ดึงข้อมูลสำเร็จ ${cloudList.length} ท่านจาก Firebase (crsdg_member) เรียบร้อยแล้ว`);
                    }
                } else {
                    showToast('⚠️ ไม่พบโมดูล FirebaseSync ในระบบ');
                }
            } catch (err) {
                console.error('[Admin] Manual Firebase sync error:', err);
                showToast(`⚠️ เกิดข้อผิดพลาดในการดึงข้อมูลจาก Firebase: ${err.message}`);
            } finally {
                btnSyncFirebaseMembers.disabled = false;
            }
        });
    }

    // Auto-fetch ALL latest database tables from Firebase Firestore on load
    if (window.FirebaseSync && typeof window.FirebaseSync.fetchAllDataFromCloud === 'function') {
        window.FirebaseSync.fetchAllDataFromCloud().then(allData => {
            if (allData) {
                console.log(`[Admin] Auto-synced all tables from Firebase Firestore.`, allData);
                state.applyCloudData(allData);
                renderAll();
            }
        }).catch(err => {
            console.warn('[Admin] Initial Firebase sync notice:', err.message);
        });
    } else if (window.FirebaseSync && typeof window.FirebaseSync.fetchMembersFromCloud === 'function') {
        window.FirebaseSync.fetchMembersFromCloud().then(cloudList => {
            if (cloudList && cloudList.length > 0) {
                state.applyCloudMembers(cloudList);
                renderAll();
            }
        }).catch(() => {});
    }

    renderAll();
});
