/**
 * CRSDG New Year 2027 - Mobile Portal & Registration Controller (js/app.js)
 * Features:
 *  1. Employee ID validation against crsdg_member
 *  2. Photo presence check & interactive cropper (zoom in/out, pan, scale)
 *  3. Storage in physical folder: storage/Member/<empId>.jpg
 *  4. Fixed Top Bar: Logo + "CRSDG New Year 2027", User Avatar + Logout Icon
 *  5. Fixed Bottom Navigation Bar (5 Tabs):
 *     - 🏠 หน้าหลัก (Home & Lucky Draw Real-time)
 *     - 👥 คุณและทีม (Your Team & Members)
 *     - ✨ โหวต AI (AI Voting for Teams)
 *     - 🎮 เกม 4 ต่อ 4 (4 vs 4 Match & Live Scores)
 *     - 👤 ข้อมูลคุณ (Your Profile, Edit Photo, Full Name, Logout Button)
 */

(function () {
  'use strict';

  // Active state
  let currentEmployee = null;
  let activeTab = 'home'; // 'home' | 'team' | 'vote' | 'game' | 'profile'
  let cropperImage = null;
  let cropperState = {
    zoom: 1.0,
    baseScale: 1.0,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    initialPinchDistance: null,
    initialPinchZoom: 1.0
  };

  // DOM Elements - Fixed Bars & Containers
  const appFixedTopBar = document.getElementById('appFixedTopBar');
  const appFixedBottomBar = document.getElementById('appFixedBottomBar');
  const appScrollContainer = document.querySelector('.app-scroll-container');

  // DOM Elements - Views
  const registrationView = document.getElementById('registrationView');
  const photoUploadView = document.getElementById('photoUploadView');
  const homePortalView = document.getElementById('homePortalView');

  // Top Bar Items
  const topbarUserAvatar = document.getElementById('topbarUserAvatar');
  const topbarAvatarImg = document.getElementById('topbarAvatarImg');
  const topbarAvatarLetter = document.getElementById('topbarAvatarLetter');
  const topbarBtnLogout = document.getElementById('topbarBtnLogout');

  // Bottom Navigation Buttons
  const btnNavHome = document.getElementById('btnNavHome');
  const btnNavTeam = document.getElementById('btnNavTeam');
  const btnNavVote = document.getElementById('btnNavVote');
  const btnNavGame = document.getElementById('btnNavGame');
  const btnNavProfile = document.getElementById('btnNavProfile');

  // Tab Panes
  const tabPaneHome = document.getElementById('tabPaneHome');
  const tabPaneTeam = document.getElementById('tabPaneTeam');
  const tabPaneVote = document.getElementById('tabPaneVote');
  const tabPaneGame = document.getElementById('tabPaneGame');
  const tabPaneProfile = document.getElementById('tabPaneProfile');

  // Tab 1 Elements (หน้าหลัก)
  const homeWelcomeName = document.getElementById('homeWelcomeName');
  const luckyDrawResultContainer = document.getElementById('luckyDrawResultContainer');
  const quickPillTeam = document.getElementById('quickPillTeam');
  const quickPillVote = document.getElementById('quickPillVote');
  const quickPillGame = document.getElementById('quickPillGame');
  const quickPillProfile = document.getElementById('quickPillProfile');

  // Tab 2 Elements (คุณและทีม)
  const myTeamContainer = document.getElementById('myTeamContainer');

  // Tab 3 Elements (โหวต AI)
  const votingTeamsList = document.getElementById('votingTeamsList');

  // Tab 4 Elements (เกม 4 ต่อ 4)
  const liveGameWidget = document.getElementById('liveGameWidget');
  const rosterTeamsGrid = document.getElementById('rosterTeamsGrid');

  // Tab 5 Elements (ข้อมูลคุณ)
  const profileAvatarCircle = document.getElementById('profileAvatarCircle');
  const profileAvatarImg = document.getElementById('profileAvatarImg');
  const profileAvatarLetter = document.getElementById('profileAvatarLetter');
  const btnEditProfilePhoto = document.getElementById('btnEditProfilePhoto');
  const btnChangePhotoAction = document.getElementById('btnChangePhotoAction');
  const profileEmpName = document.getElementById('profileEmpName');
  const profileEmpId = document.getElementById('profileEmpId');
  const profileEmpDept = document.getElementById('profileEmpDept');
  const btnLogoutProfile = document.getElementById('btnLogoutProfile');

  // Registration Form
  const regForm = document.getElementById('regForm');
  const empIdInput = document.getElementById('empId');
  const btnClear = document.getElementById('btnClear');
  const btnSubmit = document.getElementById('btnSubmit');
  const feedbackMsg = document.getElementById('feedbackMsg');
  const formGroupEmpId = document.getElementById('formGroupEmpId');
  const liveRegisteredCount = document.getElementById('liveRegisteredCount');

  // Photo Cropper & Scaler
  const photoDropzoneBox = document.getElementById('photoDropzoneBox');
  const photoCropperWorkspace = document.getElementById('photoCropperWorkspace');
  const memberPhotoFileInput = document.getElementById('memberPhotoFileInput');
  const photoCanvas = document.getElementById('photoCanvas');
  const zoomRangeSlider = document.getElementById('zoomRangeSlider');
  const zoomValueBadge = document.getElementById('zoomValueBadge');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnResetScale = document.getElementById('btnResetScale');
  const btnRotate90 = document.getElementById('btnRotate90');
  const btnChangePhoto = document.getElementById('btnChangePhoto');
  const btnSavePhoto = document.getElementById('btnSavePhoto');
  const btnSkipPhoto = document.getElementById('btnSkipPhoto');

  // Photo View Header
  const uploadAvatarInitial = document.getElementById('uploadAvatarInitial');
  const uploadEmpName = document.getElementById('uploadEmpName');
  const uploadEmpId = document.getElementById('uploadEmpId');
  const uploadEmpDept = document.getElementById('uploadEmpDept');

  // Claim Prize Modal
  const claimConfirmModal = document.getElementById('claimConfirmModal');
  const claimModalEmpId = document.getElementById('claimModalEmpId');
  const claimModalEmpName = document.getElementById('claimModalEmpName');
  const claimModalPrizeName = document.getElementById('claimModalPrizeName');
  const claimModalPrizeImg = document.getElementById('claimModalPrizeImg');
  const claimModalPrizeFallback = document.getElementById('claimModalPrizeFallback');
  const btnClaimModalConfirm = document.getElementById('btnClaimModalConfirm');
  const btnClaimModalCancel = document.getElementById('btnClaimModalCancel');
  let currentWinningPrize = null;

  // Canvas context
  const ctx = (photoCanvas && typeof photoCanvas.getContext === 'function') ? photoCanvas.getContext('2d') : null;
  const CANVAS_SIZE = 360;
  const CROP_RADIUS = 135; // 270px diameter circle

  // ========================================================
  // 1. INITIALIZATION & STATE SUBSCRIBERS (WITH RATE LIMITING)
  // ========================================================
  let pendingTabRefreshTimer = null;
  let lastTabRefreshTime = 0;
  const TAB_REFRESH_THROTTLE_MS = 600;
  let lastBadgeUpdateTime = 0;
  const BADGE_UPDATE_THROTTLE_MS = 1000;
  let hasPendingBackgroundUpdate = false;

  function throttledUpdateRegisteredCountBadge() {
    const now = Date.now();
    if (now - lastBadgeUpdateTime < BADGE_UPDATE_THROTTLE_MS) return;
    lastBadgeUpdateTime = now;
    updateRegisteredCountBadge();
  }

  function scheduleThrottledTabRefresh() {
    if (document.hidden) {
      hasPendingBackgroundUpdate = true;
      return;
    }
    const now = Date.now();
    const elapsed = now - lastTabRefreshTime;
    if (elapsed >= TAB_REFRESH_THROTTLE_MS) {
      if (pendingTabRefreshTimer) {
        clearTimeout(pendingTabRefreshTimer);
        pendingTabRefreshTimer = null;
      }
      lastTabRefreshTime = now;
      executeTabRefresh();
    } else {
      if (!pendingTabRefreshTimer) {
        pendingTabRefreshTimer = setTimeout(() => {
          pendingTabRefreshTimer = null;
          lastTabRefreshTime = Date.now();
          if (!document.hidden) {
            executeTabRefresh();
          }
        }, TAB_REFRESH_THROTTLE_MS - elapsed);
      }
    }
  }

  function executeTabRefresh() {
    if (!currentEmployee || !homePortalView || homePortalView.style.display === 'none') return;
    if (window.stateManager) {
      const members = window.stateManager.getMembers();
      const targetId = String(currentEmployee.EmployeeID || currentEmployee.id || '').trim().toLowerCase();
      if (targetId) {
        const fresh = members.find(m => String(m.EmployeeID || m.id || '').trim().toLowerCase() === targetId);
        if (fresh) currentEmployee = fresh;
      }
    }
    refreshActiveTabContent();
  }

  function initApp() {
    updateRegisteredCountBadge();

    // ซิงค์ตารางแบบประเมินผล crsdg_evaluations จาก Firebase Firestore
    if (window.FirebaseSync && typeof window.FirebaseSync.fetchEvaluationsFromCloud === 'function') {
      window.FirebaseSync.fetchEvaluationsFromCloud().catch(() => {});
    }

    // Subscribe to Firebase Cloud Sync Realtime Notifications
    if (window.FirebaseSync && typeof window.FirebaseSync.subscribe === 'function') {
      window.FirebaseSync.subscribe((event, data) => {
        if (event === 'VOTE_SETTINGS_UPDATED' && data && data.last_opened_team) {
          const op = data.last_opened_team;
          if (op && op.timestamp && (Date.now() - op.timestamp < 60000)) {
            if (typeof window.showTeamInvestOpenedModal === 'function') {
              window.showTeamInvestOpenedModal(op);
            }
          }
        }
      });
    }

    // Listen for tab visibility to avoid rendering when tab is hidden in background
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && hasPendingBackgroundUpdate) {
        hasPendingBackgroundUpdate = false;
        throttledUpdateRegisteredCountBadge();
        executeTabRefresh();
      }
    });

    window.addEventListener('focus', () => {
      if (hasPendingBackgroundUpdate) {
        hasPendingBackgroundUpdate = false;
        throttledUpdateRegisteredCountBadge();
        executeTabRefresh();
      }
    });

    // Subscribe to stateManager updates for real-time changes with rate-limiting & filtering
    if (window.stateManager && typeof window.stateManager.subscribe === 'function') {
      window.stateManager.subscribe((msg) => {
        if (!msg) return;

        // แจ้งเตือนเมื่อแอดมินเปิดโหวตของแต่ละทีม (แสดง Lightbox ฝั่งผู้ใช้งาน)
        if (msg.type === 'TEAM_INVESTMENT_OPENED') {
          if (typeof window.showTeamInvestOpenedModal === 'function') {
            window.showTeamInvestOpenedModal(msg);
          }
        } else if (msg.type === 'TEAM_VOTE_STATUS_UPDATED' && msg.status === 'open') {
          if (typeof window.showTeamInvestOpenedModal === 'function') {
            window.showTeamInvestOpenedModal({
              teamId: msg.teamId,
              teamName: msg.team ? msg.team.teamName : '',
              orderNo: msg.team ? msg.team.orderNo : '',
              teamPhoto: msg.team ? msg.team.teamPhoto : '',
              membersCount: msg.team && msg.team.members ? msg.team.members.length : 0,
              timestamp: Date.now()
            });
          }
        }

        // Throttled badge update
        throttledUpdateRegisteredCountBadge();

        if (!currentEmployee) return;

        // If tab is hidden, mark pending and do not execute expensive DOM work
        if (document.hidden) {
          hasPendingBackgroundUpdate = true;
          return;
        }

        // เมื่อมีการแจ้งเตือน Reset เงินโหวต (INVESTMENTS_RESET) หรือการอัปเดตเงินลงทุนข้ามเครื่อง (INVESTMENTS_UPDATED)
        if (msg.type === 'INVESTMENTS_RESET' || (msg.type === 'INVESTMENTS_UPDATED' && msg.reset)) {
          if (activeTab === 'vote' && currentEmployee) {
            renderVoteTab(currentEmployee);
            return;
          }
        } else if (msg.type === 'INVESTMENTS_UPDATED') {
          // หากเปิดใช้งาน 2 เครื่องด้วยรหัสพนักงานเดียวกัน และมีการปรับพอร์ตจากอีกเครื่อง ให้ซิงค์พอร์ตทันที
          if (activeTab === 'vote' && currentEmployee) {
            const isUserInteracting = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
            if (!isUserInteracting) {
              renderVoteTab(currentEmployee);
              return;
            }
          }
        }

        // Event filtering: only re-render if relevant to current activeTab
        const msgType = String(msg.type || '');
        let isRelevant = false;

        if (msgType.includes('MEMBER') || msgType.includes('RESET') || msgType.includes('SYSTEM')) {
          isRelevant = true;
        } else if (activeTab === 'home' && (msgType.includes('WINNER') || msgType.includes('PRIZE') || msgType.includes('DRAW'))) {
          isRelevant = true;
        } else if (activeTab === 'vote' && (msgType.includes('INVESTMENT') || msgType.includes('VOTE') || msgType.includes('TEAM') || msgType.includes('BUDGET') || msgType.includes('PLAYER'))) {
          isRelevant = true;
        } else if (activeTab === 'team' && (msgType.includes('PLAYER') || msgType.includes('TEAM'))) {
          isRelevant = true;
        } else if (activeTab === 'game' && (msgType.includes('GAME') || msgType.includes('SCORE') || msgType.includes('ROUND'))) {
          isRelevant = true;
        } else if (activeTab === 'profile' && msgType.includes('MEMBER')) {
          isRelevant = true;
        }

        if (!isRelevant) return;

        // If user is currently typing in an input or dragging a slider, avoid interrupting
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          hasPendingBackgroundUpdate = true;
          return;
        }

        scheduleThrottledTabRefresh();
      });
    }

    // Check if employee already logged in
    const cachedEmpId = localStorage.getItem('crsdg_active_user_emp_id');
    if (cachedEmpId && window.stateManager) {
      const members = window.stateManager.getMembers();
      const matched = members.find(m => String(m.EmployeeID || m.id).trim().toLowerCase() === String(cachedEmpId).trim().toLowerCase());
      if (matched) {
        currentEmployee = matched;
        checkPhotoAndNavigate(matched);
      }
    }

    bindRegistrationEvents();
    bindCropperEvents();
    bindPortalNavigationEvents();
    initPwaInstallHandlers();
  }

  function updateRegisteredCountBadge() {
    if (!liveRegisteredCount || !window.stateManager) return;
    try {
      const members = window.stateManager.getMembers();
      const count = members.filter(m => Boolean(m.registered)).length;
      liveRegisteredCount.textContent = count;
    } catch (e) {
      console.warn(e);
    }
  }

  // ========================================================
  // 2. VIEW NAVIGATION (Registration -> Photo -> Home Portal)
  // ========================================================
  function showView(viewName) {
    if (registrationView) registrationView.style.display = (viewName === 'registration') ? 'block' : 'none';
    if (photoUploadView) photoUploadView.style.display = (viewName === 'photo') ? 'block' : 'none';
    if (homePortalView) homePortalView.style.display = (viewName === 'home') ? 'block' : 'none';

    // Show/Hide Fixed Top Bar and Fixed Bottom Bar
    const mobileDeviceFrame = document.querySelector('.mobile-device-frame');
    if (viewName === 'home') {
      if (appFixedTopBar) appFixedTopBar.style.display = 'flex';
      if (appFixedBottomBar) appFixedBottomBar.style.display = 'grid';
      if (appScrollContainer) appScrollContainer.classList.add('has-fixed-bars');
      document.body.classList.add('portal-mode-white');
      if (mobileDeviceFrame) mobileDeviceFrame.classList.add('portal-mode-white');
      renderTopBar(currentEmployee);
      switchHomeTab(activeTab || 'home');
    } else {
      if (appFixedTopBar) appFixedTopBar.style.display = 'none';
      if (appFixedBottomBar) appFixedBottomBar.style.display = 'none';
      if (appScrollContainer) appScrollContainer.classList.remove('has-fixed-bars');
      document.body.classList.remove('portal-mode-white');
      if (mobileDeviceFrame) mobileDeviceFrame.classList.remove('portal-mode-white');
    }

    // Scroll to top
    if (appScrollContainer) appScrollContainer.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ========================================================
  // 3. HOME PORTAL TAB SWITCHING (5 Tabs)
  // ========================================================
  function switchHomeTab(tabName) {
    activeTab = tabName;

    // Expose switchHomeTab globally
    window.switchHomeTab = switchHomeTab;

    // Update bottom nav button active states
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });

    // Update pane visibility
    const panes = {
      home: tabPaneHome,
      team: tabPaneTeam,
      vote: tabPaneVote,
      game: tabPaneGame,
      profile: tabPaneProfile
    };

    Object.keys(panes).forEach(key => {
      if (panes[key]) {
        panes[key].style.display = (key === tabName) ? 'flex' : 'none';
      }
    });

    refreshActiveTabContent();

    // Scroll to top of tab
    if (appScrollContainer) appScrollContainer.scrollTop = 0;
  }

  function refreshActiveTabContent() {
    if (!currentEmployee) return;

    renderTopBar(currentEmployee);

    switch (activeTab) {
      case 'home':
        renderHomeTab(currentEmployee);
        break;
      case 'team':
        renderTeamTab(currentEmployee);
        break;
      case 'vote':
        renderVoteTab(currentEmployee);
        break;
      case 'game':
        renderGameTab(currentEmployee);
        break;
      case 'profile':
        renderProfileTab(currentEmployee);
        break;
      default:
        renderHomeTab(currentEmployee);
        break;
    }
  }

  // ========================================================
  // 4. TOP BAR RENDERING & LOGOUT
  // ========================================================
  function renderTopBar(employee) {
    if (!employee) return;
    const photo = employee.photo || employee.photoPath;
    const name = employee.EmpName || employee.name || 'พนักงาน';

    if (photo && photo.length > 5) {
      if (topbarAvatarImg) {
        topbarAvatarImg.src = photo;
        topbarAvatarImg.style.display = 'block';
      }
      if (topbarAvatarLetter) topbarAvatarLetter.style.display = 'none';
    } else {
      if (topbarAvatarImg) topbarAvatarImg.style.display = 'none';
      if (topbarAvatarLetter) {
        topbarAvatarLetter.textContent = name.charAt(0) || 'พ';
        topbarAvatarLetter.style.display = 'block';
      }
    }
  }

  function handleLogout() {
    const isConfirmed = confirm('คุณต้องการออกจากระบบ (Logout) ใช่หรือไม่?');
    if (!isConfirmed) return;

    localStorage.removeItem('crsdg_active_user_emp_id');
    currentEmployee = null;
    activeTab = 'home';
    if (empIdInput) empIdInput.value = '';
    hideFeedback();
    document.body.classList.remove('portal-mode-white');
    const mobileDeviceFrame = document.querySelector('.mobile-device-frame');
    if (mobileDeviceFrame) mobileDeviceFrame.classList.remove('portal-mode-white');
    showView('registration');
  }

  // ========================================================
  // 5. TAB 1: หน้าหลัก (HOME & REAL-TIME LUCKY DRAW)
  // ========================================================
  function renderHomeTab(employee) {
    if (!employee) return;
    const empName = employee.EmpName || employee.name || 'พนักงาน';
    if (homeWelcomeName) homeWelcomeName.textContent = empName;

    renderLuckyDrawResult(employee);
  }

  function renderLuckyDrawResult(employee) {
    if (!luckyDrawResultContainer) return;
    const empId = String(employee.EmployeeID || employee.id).trim().toLowerCase();

    // Check crsdg_winner in stateManager
    let winningRecord = null;
    if (window.stateManager && typeof window.stateManager.getWinners === 'function') {
      const winners = window.stateManager.getWinners();
      winningRecord = winners.find(w => {
        const wId = String(w.employeeId || w.EmployeeID || w.id || '').trim().toLowerCase();
        return wId === empId;
      });
    }

    if (winningRecord) {
      currentWinningPrize = winningRecord;
      const prizeName = winningRecord.prizeName || winningRecord.prizeTitle || 'ของรางวัลสุดพิเศษ';
      const prizeIcon = winningRecord.prizeIcon || '🎁';
      const prizeImg = winningRecord.prizeImg || winningRecord.image || '';
      const isClaimed = Boolean(winningRecord.claimed);
      const sponsor = winningRecord.sponsor || winningRecord.donor || '';

      luckyDrawResultContainer.innerHTML = `
        <div class="lucky-card-winner animate-gold-glow">
          <div class="winner-congrats-tag">🎉 ยินดีด้วย! คุณได้รับรางวัล</div>
          
          <div class="winner-prize-visual">
            ${prizeImg ? `<img src="${prizeImg}" alt="${prizeName}" class="winner-prize-img">` : `<div class="winner-prize-fallback">${prizeIcon}</div>`}
          </div>

          <div class="winner-prize-name">${prizeName}</div>
          ${sponsor ? `<div class="winner-prize-sponsor">ผู้สนับสนุน: <strong>${sponsor}</strong></div>` : ''}

          <div class="winner-status-wrapper">
            ${isClaimed ? `
              <div class="medal-status-pill claimed">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>ยืนยันรับของรางวัลแล้ว</span>
              </div>
              <div class="medal-time-stamp">ขอบคุณที่ร่วมกิจกรรม AL Drive Forum Special</div>
            ` : `
              <button type="button" class="btn-claim-medal" id="btnOpenClaimModal">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>กดรับของรางวัล</span>
              </button>
            `}
          </div>
        </div>
      `;

      const btnOpen = document.getElementById('btnOpenClaimModal');
      if (btnOpen) {
        btnOpen.addEventListener('click', () => {
          openClaimModal(winningRecord);
        });
      }
    } else {
      // Waiting for Lucky Draw
      currentWinningPrize = null;
      luckyDrawResultContainer.innerHTML = `
        <div class="lucky-waiting-card">
          <div class="waiting-icon-pulse">
            <span class="waiting-emoji">🎁</span>
          </div>
          <h4 class="waiting-title">กำลังรอการจับสลากรางวัล</h4>
          <p class="waiting-desc">ระบบจะทำการอัปเดตผลการจับรางวัลแบบ Real-time ทันทีเมื่อมีการสุ่มของรางวัลบนเวที</p>
          <div class="waiting-realtime-badge">
            <span class="live-pulse-dot"></span>
            <span>รอสัญญาณผลสลากแบบสด</span>
          </div>
        </div>
      `;
    }
  }

  // ========================================================
  // 6. TAB 2: คุณและทีม (YOU & TEAM MEMBERS IN AFFILIATION)
  // ========================================================
  let currentTeamTabPage = 1;
  const TEAM_TAB_PAGE_SIZE = 20;

  function renderTeamTab(employee) {
    if (!myTeamContainer || !employee) return;
    const empId = String(employee.EmployeeID || employee.id || '').trim();
    const empName = String(employee.EmpName || employee.name || 'พนักงาน').trim();
    const empDept = String(employee.Group || employee.department || 'สายงานทั่วไป').trim();
    const empPhoto = employee.photo || employee.photoPath || '';

    // Fetch all members from stateManager
    const sm = window.stateManager;
    const allMembers = (sm && typeof sm.getMembers === 'function') ? sm.getMembers() : [];

    // Filter members belonging to the same affiliation (ใต้สังกัดเดียวกัน)
    let deptMembers = allMembers.filter(m => {
      const mDept = String(m.Group || m.department || '').trim().toLowerCase();
      return mDept === empDept.toLowerCase();
    });

    // If none found by exact group, show at least the current employee
    if (deptMembers.length === 0) {
      deptMembers = [employee];
    }

    // Sort: Current logged-in member first, then by EmployeeID
    deptMembers.sort((a, b) => {
      const aId = String(a.EmployeeID || a.id || '').trim().toLowerCase();
      const bId = String(b.EmployeeID || b.id || '').trim().toLowerCase();
      if (aId === empId.toLowerCase()) return -1;
      if (bId === empId.toLowerCase()) return 1;
      return aId.localeCompare(bId);
    });

    const totalCount = deptMembers.length;
    const registeredCount = deptMembers.filter(m => Boolean(m.registered) || Boolean(m.registeredAt)).length;
    const unregCount = totalCount - registeredCount;

    // ระบบการแบ่งหน้าเพจ (Pagination)
    const totalPages = Math.max(1, Math.ceil(totalCount / TEAM_TAB_PAGE_SIZE));
    if (currentTeamTabPage > totalPages) currentTeamTabPage = totalPages;
    if (currentTeamTabPage < 1) currentTeamTabPage = 1;

    const startIndex = (currentTeamTabPage - 1) * TEAM_TAB_PAGE_SIZE;
    const endIndex = Math.min(startIndex + TEAM_TAB_PAGE_SIZE, totalCount);
    const pagedMembers = deptMembers.slice(startIndex, endIndex);

    // Render Banner on Top + Table of Members Below
    myTeamContainer.innerHTML = `
      <div class="dept-overview-container">
        <!-- ข้อความ สังกัดทีม : xxx วางไว้ตรงกลางใต้ข้อความของ header -->
        <div class="dept-affiliation-center-badge">
          <span>สังกัดทีม : <strong>${empDept}</strong></span>
        </div>

        <!-- กล่องสถิติ 2 กล่อง: เอา icon ออก ปรับขนาดกล่องให้มีความสูงลดลง สวยงาม กว้าง 40% -->
        <div class="dept-kpi-row">
          <div class="dept-kpi-card kpi-total-box">
            <div class="dept-kpi-num">${totalCount}</div>
            <div class="dept-kpi-label">สมาชิกทั้งหมด</div>
          </div>
          <div class="dept-kpi-card kpi-registered-box">
            <div class="dept-kpi-num">${registeredCount}</div>
            <div class="dept-kpi-label">ลงทะเบียนแล้ว</div>
          </div>
        </div>

        <!-- 2. ส่วนด้านล่าง: ตารางข้อมูลสมาชิกใต้สังกัด (มีเส้นกั้น ไม่สไลด์ออกข้าง มีแบ่งหน้าเพจ) -->
        <div class="glass-card dept-table-card">
          <div class="dept-table-top-bar">
            <div class="dept-table-title">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <span>ตารางข้อมูลสมาชิกใต้สังกัด</span>
            </div>
            <span class="dept-table-count">${totalCount} ท่าน</span>
          </div>

          <div class="dept-table-wrapper">
            <table class="dept-members-table">
              <thead>
                <tr>
                  <th class="th-num" style="width: 38px; text-align: center;">#</th>
                  <th class="th-name" style="text-align: left;">ชื่อ - นามสกุล</th>
                  <th class="th-status" style="width: 118px; text-align: center;">ลงทะเบียน</th>
                </tr>
              </thead>
              <tbody>
                ${pagedMembers.map((m, idx) => {
      const mId = String(m.EmployeeID || m.id || '').trim();
      const mName = String(m.EmpName || m.name || mId).trim();
      const isMe = mId.toLowerCase() === empId.toLowerCase();
      const isReg = Boolean(m.registered) || Boolean(m.registeredAt);

      // กำหนดสีพื้นตามเงื่อนไข:
      // 1. ผู้ใช้งานเป็นผู้ลงทะเบียน -> สีพื้นเป็นสีฟ้าอ่อน
      // 2. เพื่อนร่วมงานลงทะเบียนแล้ว -> สีพื้นเป็นสีส้มอ่อน
      // 3. คนที่ยังไม่ลงทะเบียน -> สีพื้นเป็นสีเทา
      let rowColorClass = 'row-unregistered';
      let badgeColorClass = 'pill-unregistered';
      let statusText = 'ยังไม่ลงทะเบียน';

      if (isMe && isReg) {
        rowColorClass = 'row-user-registered';
        badgeColorClass = 'pill-user-registered';
        statusText = '✓ ลงทะเบียนแล้ว';
      } else if (isReg) {
        rowColorClass = 'row-colleague-registered';
        badgeColorClass = 'pill-colleague-registered';
        statusText = '✓ ลงทะเบียนแล้ว';
      }

      const rowNumber = startIndex + idx + 1;

      return `
                    <tr class="dept-table-tr ${rowColorClass} ${isMe ? 'tr-is-me' : ''}">
                      <td class="td-num" style="text-align: center;">${rowNumber}</td>
                      <td class="td-name">
                        <span class="member-fullname-text" style="font-size: 13px; font-weight: 400;">${mName}</span>
                        ${isMe ? '<span class="you-indicator-pill">(คุณ)</span>' : ''}
                      </td>
                      <td class="td-status" style="text-align: center;">
                        <span class="reg-status-pill ${badgeColorClass}">
                          ${statusText}
                        </span>
                      </td>
                    </tr>
                  `;
    }).join('')}
              </tbody>
            </table>
          </div>

          <!-- ระบบการแบ่งหน้าเพจ (Pagination) -->
          ${totalPages > 1 ? `
            <div class="team-pagination-container">
              <div class="team-pagination-info">
                แสดง <strong>${startIndex + 1} - ${endIndex}</strong> จาก <strong>${totalCount}</strong> ท่าน
              </div>
              <div class="team-pagination-controls">
                <button type="button" class="btn-page-step" onclick="window.changeTeamTabPage(${currentTeamTabPage - 1})" ${currentTeamTabPage <= 1 ? 'disabled' : ''} title="หน้าก่อนหน้า">
                  ❮ ก่อนหน้า
                </button>
                <div class="team-pagination-numbers">
                  ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
                    <button type="button" class="btn-page-number ${p === currentTeamTabPage ? 'is-active' : ''}" onclick="window.changeTeamTabPage(${p})">
                      ${p}
                    </button>
                  `).join('')}
                </div>
                <button type="button" class="btn-page-step" onclick="window.changeTeamTabPage(${currentTeamTabPage + 1})" ${currentTeamTabPage >= totalPages ? 'disabled' : ''} title="หน้าถัดไป">
                  ถัดไป ❯
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Global Handler สำหรับเปลี่ยนหน้าเพจตารางสมาชิกใต้สังกัด
  window.changeTeamTabPage = function (page) {
    currentTeamTabPage = page;
    if (currentEmployee) {
      renderTeamTab(currentEmployee);
    }
  };

  // ========================================================
  // 7. TAB 3: โหวต AI & การลงทุนทีมแข่งขัน (AI VOTE & INVESTMENT)
  // ========================================================
  function renderVoteTab(employee) {
    if (!votingTeamsList) return;
    const empId = employee ? String(employee.EmployeeID || employee.id).trim().toLowerCase() : '';
    if (!empId) return;

    const sm = window.stateManager;
    const maxBudget = sm ? sm.getVoteBudget() : 1000000;
    const isVoteOpen = sm ? sm.isVoteOpen() : true;
    const userInvestments = sm ? sm.getUserInvestments(empId) : {};
    const totalInvested = sm ? sm.getUserTotalInvested(empId) : 0;
    const remainingBudget = Math.max(0, maxBudget - totalInvested);
    const investedPct = Math.min(100, Math.round((totalInvested / maxBudget) * 100));

    // 1. Render Portfolio Overview Banner
    const portfolioContainer = document.getElementById('aiVotePortfolioContainer');
    if (portfolioContainer) {
      portfolioContainer.innerHTML = `
        <div class="ai-vote-portfolio-banner">
          <div class="portfolio-header-row">
            <div class="portfolio-title-group">
              <div class="portfolio-icon-badge">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </div>
              <div>
                <div class="portfolio-title-text">พอร์ตเงินทุนของคุณ</div>
                <div class="portfolio-subtitle-text">จัดสรรเงินลงทุนเชียร์ทีมแข่งขันที่คุณมั่นใจ</div>
              </div>
            </div>
            <div class="portfolio-status-pill ${isVoteOpen ? 'status-open' : 'status-closed'}" style="display:none;">
              <span class="live-pulse-dot" style="background:${isVoteOpen ? '#10b981' : '#ef4444'};"></span>
              <span>${isVoteOpen ? '🟢 เปิดให้ลงทุน1' : '🔒 ปิดรับการลงทุน'}</span>
            </div>
          </div>

          <div class="portfolio-stats-grid">
            <div class="portfolio-stat-box">
              <span class="portfolio-stat-label">💰 เงินลงทุน</span>
              <span class="portfolio-stat-num num-budget">${maxBudget.toLocaleString()}</span>
            </div>
            <div class="portfolio-stat-box">
              <span class="portfolio-stat-label">💼 ลงทุนไปแล้ว</span>
              <span class="portfolio-stat-num num-invested" id="userTotalInvestedNum">${totalInvested.toLocaleString()}</span>
            </div>
            <div class="portfolio-stat-box">
              <span class="portfolio-stat-label">🪙 คงเหลือ</span>
              <span class="portfolio-stat-num num-remaining ${remainingBudget === 0 ? 'is-zero' : ''}" id="userRemainingBudgetNum">${remainingBudget.toLocaleString()}</span>
            </div>
          </div>

          <div class="portfolio-progress-bar-wrap">
            <div class="portfolio-progress-info">
              <span>จัดสรรงบลงทุน</span>
              <strong id="userInvestedPctText">${investedPct}% (${totalInvested.toLocaleString()} / ${maxBudget.toLocaleString()} บ.)</strong>
            </div>
            <div class="portfolio-progress-track">
              <div class="portfolio-progress-fill" id="userInvestedProgressFill" style="width: ${investedPct}%;"></div>
            </div>
          </div>

          ${!isVoteOpen ? `
            <div class="invest-closed-notice">
              🔒 ขณะนี้ระบบปิดรับการลงทุนแล้ว ไม่สามารถปรับเปลี่ยนเงินลงทุนได้ 
            </div>
          ` : `
          `}
        </div>
      `;
    }

    // 2. Render Competing Teams list from crsdg_player
    let players = [];
    if (sm && typeof sm.getPlayers === 'function') {
      players = sm.getPlayers();
    }

    if (!players || players.length === 0) {
      votingTeamsList.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 28px 16px;">
          <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">⏳</span>
          <h4 style="font-size: 1rem; color: #0f172a; font-weight: 600;">ยังไม่มีรายการทีมสำหรับการลงทุน</h4>
          <p style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">ฝ่ายจัดการแข่งขันจะเปิดระบบนักลงทุน AI เร็วๆ นี้</p>
        </div>
      `;
      return;
    }

    // Sort teams by orderNo
    players.sort((a, b) => (parseInt(a.orderNo, 10) || 0) - (parseInt(b.orderNo, 10) || 0));

    votingTeamsList.innerHTML = players.map(p => {
      const pId = p.id;
      const order = p.orderNo || 1;
      const name = p.teamName || p.name || `ทีมที่ ${order}`;
      const photo = p.teamPhoto || p.photo;
      const members = p.members || [];
      const captain = members.find(m => m.isCaptain);
      const capName = captain ? (captain.name || captain.employeeId) : (members[0] ? (members[0].name || members[0].employeeId) : 'ยังไม่ระบุหัวหน้า');

      const myInvested = Math.round(parseFloat(userInvestments[pId]) || 0);
      const hasMyInvestment = myInvested > 0;
      const isTeamOpen = (p.voteStatus !== 'closed') && isVoteOpen;
      // ปรับให้สไลด์คำนวณเป็นจำนวนเต็มของเงินที่ได้รับ (maxBudget) คงที่ไม่เปลี่ยนเป็น % เพื่อไม่ให้สไลด์ไปมาตลอดเวลา
      const fullBudget = Math.round(maxBudget);
      const sliderPct = fullBudget > 0 ? Math.min(100, Math.max(0, (myInvested / fullBudget) * 100)) : 0;

      return `
        <div class="invest-team-card ${hasMyInvestment ? 'has-investment' : ''} ${!isTeamOpen ? 'is-team-locked' : ''}" id="investCard_${pId}">
          <!-- Team Header (คลิกแถวชื่อทีมเพื่อดู Lightbox แสดงข้อมูลทีม รูปรวม และสมาชิก) -->
          <div class="invest-team-header" onclick="window.openTeamDetailLightbox('${pId}')" title="คลิกดูข้อมูลทีม รูปรวม และสมาชิก">
            <div class="invest-team-avatar">
              ${photo ? `<img src="${photo}" alt="${name}">` : `<span>🛡️</span>`}
            </div>
            <div class="invest-team-meta">
              <div class="invest-team-badge-row">
                <span class="invest-order-pill">ทีมที่ ${order}</span>
                <button type="button" class="btn-team-info-pill" onclick="event.stopPropagation(); window.openTeamDetailLightbox('${pId}')" title="คลิกดูข้อมูลและรายละเอียดโครงการ">
                  🔍 ข้อมูลทีม ❯
                </button>
              </div>
              <div class="invest-team-name">${name}</div>
            </div>
          </div>

          <!-- User's Allocation Section (เอากล่องผู้ลงทุนทั้งหมดออก, ปรับการกรอกข้อมูลเป็นแถบสไลด์ และเอากล่องจำนวนเงินออก) -->
          <div class="invest-user-allocation-box">
            <div class="invest-allocation-header">
              <span class="invest-allocation-title">
                <span>💼 เงินที่คุณลงทุนในทีมนี้:</span>
              </span>
              <span class="invest-allocation-badge ${myInvested === 0 ? 'is-zero' : ''}" id="myAllocBadge_${pId}">
                ${myInvested.toLocaleString()} บาท
              </span>
            </div>

            ${isTeamOpen ? `
              <!-- Range Slider Control: สเกลจำนวนเต็มคงที่ตามเงินงบประมาณที่ได้รับ ไม่คำนวณย่อขยายเป็น % -->
              <div class="invest-slider-container">
                <div class="invest-slider-labels">
                  <span>0 บาท</span>
                  <span class="slider-curr-value" id="sliderValDisplay_${pId}">${myInvested.toLocaleString()} บาท</span>
                  <span>${fullBudget.toLocaleString()} บาท</span>
                </div>
                <input type="range" class="invest-range-slider" id="rangeSlider_${pId}"
                  min="0" max="${fullBudget}" step="10000" value="${myInvested}"
                  style="background: linear-gradient(to right, #38bdf8 0%, #38bdf8 ${sliderPct}%, #e2e8f0 ${sliderPct}%, #e2e8f0 100%);"
                  oninput="window.onSliderLiveInput('${pId}', this.value)"
                  onchange="window.onSliderCommitChange('${pId}', this.value)">
              </div>
            ` : `
              <div class="invest-closed-notice">
                ${!isVoteOpen ? '🔒 ปิดรับการลงทุนทั้งระบบแล้ว' : '🔒 ยังไม่เปิดให้ลงทุนในทีมนี้'} ${myInvested > 0 ? `(คุณได้ลงทุนในทีมนี้ <strong>${myInvested.toLocaleString()} บาท</strong>)` : ''}
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  // Interactive Investment Handlers for Registered Employees
  let sliderCommitDebounceTimers = {};
  window.onSliderLiveInput = function (teamId, val) {
    if (!currentEmployee || !window.stateManager) return;
    const empId = currentEmployee.EmployeeID || currentEmployee.id;
    const sm = window.stateManager;
    const maxBudget = sm.getVoteBudget();
    const currentInv = sm.getUserInvestments(empId);
    const myInvested = Math.round(parseFloat(currentInv[teamId]) || 0);
    const totalInvested = sm.getUserTotalInvested(empId);
    const remainingBudget = Math.max(0, maxBudget - totalInvested);
    const maxAllowed = myInvested + remainingBudget;

    let num = Math.round(Math.max(0, parseFloat(val) || 0));
    // Clamp smoothly to available budget without altering the slider max scale
    if (num > maxAllowed) {
      num = maxAllowed;
      const sliderEl = document.getElementById(`rangeSlider_${teamId}`);
      if (sliderEl) sliderEl.value = num;
    }

    const slider = document.getElementById(`rangeSlider_${teamId}`);
    if (slider) {
      const pct = maxBudget > 0 ? Math.min(100, Math.max(0, (num / maxBudget) * 100)) : 0;
      slider.style.background = `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
    }
    const valEl = document.getElementById(`sliderValDisplay_${teamId}`);
    if (valEl) valEl.textContent = num.toLocaleString() + ' บาท';
    const badgeEl = document.getElementById(`myAllocBadge_${teamId}`);
    if (badgeEl) {
      badgeEl.textContent = num.toLocaleString() + ' บาท';
      if (num === 0) badgeEl.classList.add('is-zero');
      else badgeEl.classList.remove('is-zero');
    }

    // Live update top banner stats
    const otherInvested = totalInvested - myInvested;
    const liveTotal = otherInvested + num;
    const liveRemaining = Math.max(0, maxBudget - liveTotal);
    const livePct = maxBudget > 0 ? Math.round((liveTotal / maxBudget) * 100) : 0;

    const userTotalNum = document.getElementById('userTotalInvestedNum');
    if (userTotalNum) userTotalNum.textContent = liveTotal.toLocaleString();
    const userRemNum = document.getElementById('userRemainingBudgetNum');
    if (userRemNum) {
      userRemNum.textContent = liveRemaining.toLocaleString();
      if (liveRemaining === 0) userRemNum.classList.add('is-zero');
      else userRemNum.classList.remove('is-zero');
    }
    const progressFill = document.getElementById('userInvestedProgressFill');
    if (progressFill) progressFill.style.width = `${livePct}%`;
    const pctText = document.getElementById('userInvestedPctText');
    if (pctText) pctText.textContent = `${livePct}% (${liveTotal.toLocaleString()} / ${maxBudget.toLocaleString()} บ.)`;

    // Debounce commit (350ms) to support high concurrency and eliminate network overhead
    if (sliderCommitDebounceTimers[teamId]) {
      clearTimeout(sliderCommitDebounceTimers[teamId]);
    }
    sliderCommitDebounceTimers[teamId] = setTimeout(() => {
      delete sliderCommitDebounceTimers[teamId];
      window.setTeamInvestmentExact(teamId, num);
    }, 350);
  };

  window.onSliderCommitChange = function (teamId, val) {
    if (sliderCommitDebounceTimers[teamId]) {
      clearTimeout(sliderCommitDebounceTimers[teamId]);
      delete sliderCommitDebounceTimers[teamId];
    }
    window.setTeamInvestmentExact(teamId, val);
  };

  window.adjustTeamInvestment = function (teamId, delta) {
    if (!currentEmployee || !window.stateManager) return;
    const empId = currentEmployee.EmployeeID || currentEmployee.id;
    const sm = window.stateManager;
    const currentInv = sm.getUserInvestments(empId);
    const curAmt = parseFloat(currentInv[teamId]) || 0;
    const newAmt = Math.max(0, curAmt + delta);

    const res = sm.setUserInvestment(empId, teamId, newAmt);
    if (!res.success) {
      alert(res.message || 'ไม่สามารถปรับเปลี่ยนเงินลงทุนได้');
      return;
    }

    // เมื่อมีการปรับการลงทุนไม่ต้องแสดงพลุ
    renderVoteTab(currentEmployee);
  };

  window.setTeamInvestmentExact = function (teamId, targetValue) {
    if (!currentEmployee || !window.stateManager) return;
    const empId = currentEmployee.EmployeeID || currentEmployee.id;
    const sm = window.stateManager;
    const val = Math.max(0, parseFloat(targetValue) || 0);

    const res = sm.setUserInvestment(empId, teamId, val);
    if (!res.success) {
      alert(res.message || 'ไม่สามารถปรับเปลี่ยนเงินลงทุนได้');
      renderVoteTab(currentEmployee);
      return;
    }

    renderVoteTab(currentEmployee);
  };

  window.investAllRemaining = function (teamId) {
    if (!currentEmployee || !window.stateManager) return;
    const empId = currentEmployee.EmployeeID || currentEmployee.id;
    const sm = window.stateManager;
    const maxBudget = sm.getVoteBudget();
    const currentInv = sm.getUserInvestments(empId);
    const curAmt = parseFloat(currentInv[teamId]) || 0;
    const totalInvested = sm.getUserTotalInvested(empId);
    const remaining = Math.max(0, maxBudget - totalInvested);

    if (remaining <= 0) {
      alert('คุณใช้งบประมาณเต็มจำนวน ' + maxBudget.toLocaleString() + ' บาทแล้ว');
      return;
    }

    const newTarget = curAmt + remaining;
    const res = sm.setUserInvestment(empId, teamId, newTarget);
    if (!res.success) {
      alert(res.message || 'ไม่สามารถปรับเปลี่ยนเงินลงทุนได้');
      return;
    }

    // เมื่อมีการปรับการลงทุนไม่ต้องแสดงพลุ
    renderVoteTab(currentEmployee);
  };

  window.withdrawTeamInvestment = function (teamId) {
    if (!currentEmployee || !window.stateManager) return;
    const empId = currentEmployee.EmployeeID || currentEmployee.id;
    const sm = window.stateManager;
    const res = sm.setUserInvestment(empId, teamId, 0);
    if (res.success) {
      renderVoteTab(currentEmployee);
    }
  };

  // Lightbox: Team Details Modal (ข้อมูลทีม รูปรวม และสมาชิกในทีม)
  window.openTeamDetailLightbox = function (teamId) {
    const sm = window.stateManager;
    if (!sm) return;
    const players = (typeof sm.getPlayers === 'function') ? sm.getPlayers() : [];
    let team = players.find(p => String(p.id).trim() === String(teamId).trim());
    if (!team) {
      team = players.find(p => String(p.orderNo).trim() === String(teamId).trim());
    }
    if (!team) {
      const allTeams = (typeof sm.getTeams === 'function') ? sm.getTeams() : [];
      team = allTeams.find(t => String(t.id).trim() === String(teamId).trim() || String(t.teamName || t.name).trim() === String(teamId).trim());
    }
    if (!team) return;

    const modal = document.getElementById('teamDetailModal');
    if (!modal) return;

    const orderPill = document.getElementById('modalTeamOrderPill');
    const nameDisplay = document.getElementById('modalTeamNameDisplay');
    const photoSection = document.getElementById('modalTeamPhotoSection');
    const photoImg = document.getElementById('modalTeamPhotoImg');
    const photoTeamName = document.getElementById('modalPhotoTeamName');
    const projectDescEl = document.getElementById('modalTeamProjectDesc');
    const countDisplay = document.getElementById('modalTeamMembersCount');
    const membersList = document.getElementById('modalTeamMembersList');

    if (orderPill) orderPill.textContent = `ทีมที่ ${team.orderNo || 1}`;
    if (nameDisplay) nameDisplay.textContent = team.teamName || 'ทีมแข่งขัน';
    if (photoTeamName) photoTeamName.textContent = team.teamName || 'ทีมแข่งขัน';

    // รูปทีมรวม (แสดงรูปภาพตรงกลาง เอาทั้งแถวรูปภาพกล้องออก)
    const teamPhotoSrc = team.teamPhoto || team.photo;
    if (teamPhotoSrc && teamPhotoSrc.length > 20) {
      if (photoSection) photoSection.style.display = 'block';
      if (photoImg) {
        photoImg.src = teamPhotoSrc;
        photoImg.style.display = 'block';
      }
    } else {
      if (photoSection) photoSection.style.display = 'none';
      if (photoImg) {
        photoImg.removeAttribute('src');
        photoImg.style.display = 'none';
      }
    }

    // รายละเอียดโครงการ (ดึงข้อมูลโครงการมาแสดง)
    if (projectDescEl) {
      projectDescEl.textContent = team.description || team.projectDesc || 'ยังไม่มีรายละเอียดโครงการสำหรับทีมนี้';
    }

    // รายชื่อสมาชิกทีม (ดึงรูป ชื่อ-นามสกุล สังกัด จาก crsdg_member และกำหนดหัวหน้าทีม)
    const allMembers = (typeof sm.getMembers === 'function') ? sm.getMembers() : [];
    const memberMap = new Map();
    allMembers.forEach(m => memberMap.set(String(m.EmployeeID || m.id).toLowerCase(), m));

    let rawMembers = Array.isArray(team.members) ? [...team.members] : [];
    if (rawMembers.length === 0) {
      const allTeams = (typeof sm.getTeams === 'function') ? sm.getTeams() : [];
      const matchTeam = allTeams.find(t => String(t.teamName || t.name).trim().toLowerCase() === String(team.teamName || '').trim().toLowerCase() || String(t.id).trim() === String(team.id).trim());
      if (matchTeam) {
        if (matchTeam.captainId) {
          rawMembers.push({ employeeId: matchTeam.captainId, isCaptain: true });
        }
        (matchTeam.memberIds || []).forEach(mid => {
          if (mid !== matchTeam.captainId) {
            rawMembers.push({ employeeId: mid, isCaptain: false });
          }
        });
      }
    }

    let members = rawMembers.map(m => {
      const empId = String(m.employeeId || m.EmployeeID || m.id || '').trim();
      const inDb = memberMap.get(empId.toLowerCase());
      const photoUrl = (inDb && (inDb.photo || inDb.Photo || inDb.avatar)) || m.photo || '';
      const name = (inDb && (inDb.EmpName || inDb.name)) || m.name || empId;
      const dept = (inDb && (inDb.Group || inDb.department)) || m.department || '-';
      return {
        employeeId: empId,
        name: name,
        department: dept,
        photo: photoUrl,
        isCaptain: Boolean(m.isCaptain)
      };
    });

    // เรียงลำดับให้หัวหน้าทีมอยู่บนสุด
    members.sort((a, b) => (b.isCaptain ? 1 : 0) - (a.isCaptain ? 1 : 0));

    if (countDisplay) countDisplay.textContent = members.length;

    if (membersList) {
      if (members.length === 0) {
        membersList.innerHTML = `
          <div style="text-align: center; padding: 24px 12px; color: #94a3b8; font-size: 0.85rem;">
            🛡️ ยังไม่มีข้อมูลสมาชิกในทีมนี้
          </div>
        `;
      } else {
        membersList.innerHTML = members.map((m) => {
          const isCap = Boolean(m.isCaptain);
          const photoUrl = m.photo || '';
          return `
            <div class="team-modal-member-row ${isCap ? 'is-captain-row' : ''}">
              <div class="modal-member-avatar-thumb" style="width: 44px; height: 44px; min-width: 44px; max-width: 44px; min-height: 44px; max-height: 44px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #e2e8f0; border: 2px solid #cbd5e1;">
                ${photoUrl ? `<img src="${photoUrl}" alt="${m.name || m.employeeId}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">` : `<span style="font-size: 1.2rem;">👤</span>`}
              </div>
              <div class="modal-member-info" style="flex: 1; min-width: 0; text-align: left;">
                <div class="modal-member-name-row" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span class="modal-member-name" style="font-size: 0.88rem; font-weight: 700; color: #0f172a;">${m.name || 'พนักงาน'}</span>
                  ${isCap ? '<span class="modal-member-captain-badge" style="background: #f59e0b; color: #ffffff; font-size: 0.65rem; font-weight: 800; padding: 1px 7px; border-radius: 6px;">👑 หัวหน้าทีม</span>' : ''}
                </div>
                <div class="modal-member-meta" style="font-size: 0.76rem; color: #475569; margin-top: 2px;">
                  สังกัด: <strong>${m.department || '-'}</strong>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    modal.classList.add('is-active');
  };

  window.closeTeamDetailLightbox = function () {
    const modal = document.getElementById('teamDetailModal');
    if (modal) modal.classList.remove('is-active');
  };

  // Close lightbox on backdrop click or Escape key
  const teamDetailModalEl = document.getElementById('teamDetailModal');
  if (teamDetailModalEl) {
    teamDetailModalEl.addEventListener('click', function (e) {
      if (e.target === this) {
        window.closeTeamDetailLightbox();
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      window.closeTeamDetailLightbox();
      window.closeTeamInvestOpenedModal();
    }
  });

  // ========================================================
  // LIGHTBOX: ANNOUNCEMENT TEAM INVESTMENT OPENED
  // แสดง Lightbox ฝั่งผู้ใช้งาน เมื่อแอดมินเปิดโหวตของแต่ละทีม
  // ========================================================
  let lastAnnouncedOpenedTeamId = null;
  let lastAnnouncedTimestamp = 0;

  window.showTeamInvestOpenedModal = function (team) {
    if (!team) return;
    const modal = document.getElementById('teamInvestOpenedModal');
    if (!modal) return;

    // ป้องกันการแจ้งเตือนซ้ำซ้อนภายใน 2 วินาทีสำหรับทีมเดียวกัน
    const now = Date.now();
    if (lastAnnouncedOpenedTeamId === team.teamId && (now - lastAnnouncedTimestamp < 2000)) {
      return;
    }
    lastAnnouncedOpenedTeamId = team.teamId;
    lastAnnouncedTimestamp = now;

    const orderEl = document.getElementById('investOpenedTeamOrder');
    const nameEl = document.getElementById('investOpenedTeamName');
    const photoFrame = document.getElementById('investOpenedPhotoFrame');
    const photoImg = document.getElementById('investOpenedPhotoImg');

    if (orderEl) orderEl.textContent = team.orderNo ? `ทีมที่ ${team.orderNo}` : 'ทีมแข่งขัน';
    if (nameEl) nameEl.textContent = team.teamName || team.name || 'ทีมแข่งขัน';

    const photo = team.teamPhoto || team.photo;
    if (photo && photoFrame && photoImg) {
      photoImg.src = photo;
      photoFrame.style.display = 'block';
    } else if (photoFrame) {
      photoFrame.style.display = 'none';
    }

    modal.style.display = 'flex';
    modal.classList.add('is-active');

    if (window.soundManager && typeof window.soundManager.playWin === 'function') {
      window.soundManager.playWin();
    } else if (window.soundManager && typeof window.soundManager.playClick === 'function') {
      window.soundManager.playClick();
    }
  };

  window.closeTeamInvestOpenedModal = function () {
    const modal = document.getElementById('teamInvestOpenedModal');
    if (!modal) return;
    modal.classList.remove('is-active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 250);
  };

  window.goToInvestPortfolioFromModal = function () {
    window.closeTeamInvestOpenedModal();
    if (typeof switchHomeTab === 'function') {
      switchHomeTab('vote');
    }
  };

  // Close Team Investment Opened Lightbox on backdrop click
  const teamInvestOpenedModalEl = document.getElementById('teamInvestOpenedModal');
  if (teamInvestOpenedModalEl) {
    teamInvestOpenedModalEl.addEventListener('click', function (e) {
      if (e.target === this) {
        window.closeTeamInvestOpenedModal();
      }
    });
  }

  // Cross-tab synchronization via localStorage storage event
  window.addEventListener('storage', function (e) {
    if (e.key === 'crsdg_team_investment_opened_event' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data && (Date.now() - (data.timestamp || 0) < 30000)) {
          window.showTeamInvestOpenedModal(data);
        }
      } catch (err) { }
    }
    if (e.key === 'crsdg_all_user_investments' || e.key === 'crsdg_player' || e.key === 'crsdg_vote_open' || e.key === 'crsdg_vote_budget' || e.key === 'crsdg_last_reset_votes_ts') {
      if (activeTab === 'vote' && currentEmployee) {
        renderVoteTab(currentEmployee);
      }
    }
  });

  // ========================================================
  // 8. TAB 4: เกม 4 ต่อ 4 (4 vs 4 GAME)
  // ========================================================
  function renderGameTab(employee) {
    if (liveGameWidget) {
      let state = null;
      try {
        const raw = localStorage.getItem('crsdg_game_state_sync');
        if (raw) state = JSON.parse(raw);
      } catch (e) { }

      const teamAName = (state && state.teamA && state.teamA.name) || 'ทีมฝั่งซ้าย (Blue)';
      const teamBName = (state && state.teamB && state.teamB.name) || 'ทีมฝั่งขวา (Orange)';
      const scoreA = (state && state.blueScore) || 0;
      const scoreB = (state && state.orangeScore) || 0;
      const bankScore = (state && state.bankScore) || 0;
      const roundTitle = (state && state.roundTitle) || 'รอบการแข่งขัน 4 ต่อ 4';

      liveGameWidget.innerHTML = `
        <div class="game-widget-header">
          <span>🏆 ${roundTitle}</span>
          <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 0.72rem;">
            ● ถ่ายทอดสด
          </span>
        </div>

        <div class="game-match-vs-grid">
          <div class="game-side-box game-side-blue">
            <div class="game-side-name">${teamAName}</div>
            <div class="game-side-score">${scoreA}</div>
          </div>
          <div class="game-vs-badge">VS</div>
          <div class="game-side-box game-side-orange">
            <div class="game-side-name">${teamBName}</div>
            <div class="game-side-score">${scoreB}</div>
          </div>
        </div>

        <div class="game-bank-row">
          <span>💰 คะแนนกองกลาง (BANK):</span>
          <strong style="color: #ffd700; font-size: 1rem;">${bankScore} คะแนน</strong>
        </div>
      `;
    }

    renderGameVotingSection(employee);
  }

  // ========================================================
  // 9. TAB 5: ข้อมูลคุณ (YOUR PROFILE, EDIT PHOTO, LOGOUT)
  // ========================================================
  function renderProfileTab(employee) {
    if (!employee) return;
    const name = employee.EmpName || employee.name || 'พนักงาน';
    const id = employee.EmployeeID || employee.id || '-';
    const dept = employee.Group || employee.department || 'ฝ่ายงานทั่วไป';
    const photo = employee.photo || employee.photoPath;

    if (profileEmpName) profileEmpName.textContent = name;
    if (profileEmpId) profileEmpId.textContent = id;
    if (profileEmpDept) profileEmpDept.textContent = dept;

    if (photo && photo.length > 5) {
      if (profileAvatarImg) {
        profileAvatarImg.src = photo;
        profileAvatarImg.style.display = 'block';
      }
      if (profileAvatarLetter) profileAvatarLetter.style.display = 'none';
    } else {
      if (profileAvatarImg) profileAvatarImg.style.display = 'none';
      if (profileAvatarLetter) {
        profileAvatarLetter.textContent = name.charAt(0) || 'พ';
        profileAvatarLetter.style.display = 'block';
      }
    }
  }

  // ========================================================
  // 10. EVENT BINDING FOR PORTAL NAVIGATION
  // ========================================================
  function bindPortalNavigationEvents() {
    // Bottom Nav items
    if (btnNavHome) btnNavHome.addEventListener('click', () => switchHomeTab('home'));
    if (btnNavTeam) btnNavTeam.addEventListener('click', () => switchHomeTab('team'));
    if (btnNavVote) btnNavVote.addEventListener('click', () => switchHomeTab('vote'));
    if (btnNavGame) btnNavGame.addEventListener('click', () => switchHomeTab('game'));
    if (btnNavProfile) btnNavProfile.addEventListener('click', () => switchHomeTab('profile'));

    // Top Bar items
    if (topbarUserAvatar) {
      topbarUserAvatar.addEventListener('click', () => {
        switchHomeTab('profile');
      });
    }
    if (topbarBtnLogout) {
      topbarBtnLogout.addEventListener('click', () => {
        handleLogout();
      });
    }

    // Tab 1 Quick Pills
    if (quickPillTeam) quickPillTeam.addEventListener('click', () => switchHomeTab('team'));
    if (quickPillVote) quickPillVote.addEventListener('click', () => switchHomeTab('vote'));
    if (quickPillGame) quickPillGame.addEventListener('click', () => switchHomeTab('game'));
    if (quickPillProfile) quickPillProfile.addEventListener('click', () => switchHomeTab('profile'));

    // Tab 5 Profile actions (แก้ไขรูปภาพ / ออกจากระบบ)
    if (profileAvatarCircle) {
      profileAvatarCircle.addEventListener('click', () => {
        if (currentEmployee) openPhotoUploadView(currentEmployee);
      });
    }
    if (btnEditProfilePhoto) {
      btnEditProfilePhoto.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentEmployee) openPhotoUploadView(currentEmployee);
      });
    }
    if (btnChangePhotoAction) {
      btnChangePhotoAction.addEventListener('click', () => {
        if (currentEmployee) openPhotoUploadView(currentEmployee);
      });
    }
    if (btnLogoutProfile) {
      btnLogoutProfile.addEventListener('click', () => {
        handleLogout();
      });
    }

    // Modal Claim confirmation
    if (btnClaimModalCancel) {
      btnClaimModalCancel.addEventListener('click', closeClaimModal);
    }
    if (btnClaimModalConfirm) {
      btnClaimModalConfirm.addEventListener('click', confirmClaimPrize);
    }
  }

  // ========================================================
  // 11. REGISTRATION FORM LOGIC
  // ========================================================
  function bindRegistrationEvents() {
    if (btnClear && empIdInput) {
      btnClear.addEventListener('click', () => {
        empIdInput.value = '';
        empIdInput.focus();
        hideFeedback();
      });
    }

    if (empIdInput) {
      empIdInput.addEventListener('input', () => {
        hideFeedback();
      });
    }

    if (regForm) {
      regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleRegistrationSubmit();
      });
    }
  }

  function showFeedback(message, isError = true) {
    if (!feedbackMsg) return;
    feedbackMsg.textContent = message;
    feedbackMsg.className = isError ? 'feedback-msg is-error' : 'feedback-msg is-success';
    feedbackMsg.style.display = 'block';

    if (formGroupEmpId && isError) {
      formGroupEmpId.classList.add('has-error');
      formGroupEmpId.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' }
      ], { duration: 350 });
    }
  }

  function hideFeedback() {
    if (!feedbackMsg) return;
    feedbackMsg.textContent = '';
    feedbackMsg.style.display = 'none';
    if (formGroupEmpId) formGroupEmpId.classList.remove('has-error');
  }

  function handleRegistrationSubmit() {
    if (!empIdInput) return;
    const inputVal = empIdInput.value.trim();

    if (!inputVal) {
      showFeedback('กรุณากรอกรหัสพนักงาน', true);
      empIdInput.focus();
      return;
    }

    if (!window.stateManager) {
      showFeedback('ไม่พบระบบฐานข้อมูล กรุณารีเฟรชหน้าเว็บใหม่อีกครั้ง', true);
      return;
    }

    const members = window.stateManager.getMembers();
    const queryId = inputVal.toLowerCase();
    const matched = members.find(m => {
      const idVal = String(m.EmployeeID || m.id || '').trim().toLowerCase();
      return idVal === queryId;
    });

    if (!matched) {
      showFeedback(`❌ ไม่พบรหัสพนักงาน "${inputVal}" ในระบบ (crsdg_member) กรุณาตรวจสอบรหัสพนักงานอีกครั้ง`, true);
      return;
    }

    if (btnSubmit) btnSubmit.classList.add('is-loading');

    const empId = String(matched.EmployeeID || matched.id).trim();
    const regTimestamp = new Date().toISOString();
    window.stateManager.updateMember(empId, {
      registered: true,
      registeredAt: regTimestamp
    });
    if (window.FirebaseSync && typeof window.FirebaseSync.updateMemberRegistration === 'function') {
      window.FirebaseSync.updateMemberRegistration(empId, { registered: true, registeredAt: regTimestamp });
    }

    currentEmployee = {
      ...matched,
      registered: true,
      registeredAt: regTimestamp
    };
    localStorage.setItem('crsdg_active_user_emp_id', empId);

    setTimeout(() => {
      if (btnSubmit) btnSubmit.classList.remove('is-loading');
      checkPhotoAndNavigate(currentEmployee);
    }, 400);
  }

  // ========================================================
  // 12. PHOTO VERIFICATION & TRANSITION
  // ========================================================
  async function checkPhotoAndNavigate(employee) {
    if (!employee) return;
    const empId = String(employee.EmployeeID || employee.id || '').trim();
    if (!empId || empId.toLowerCase() === 'null') {
      showView('registration');
      return;
    }

    // 1. Fetch photo strictly from the designated Firebase Storage location: Member/<empId>
    if (window.FirebaseStorageManager && typeof window.FirebaseStorageManager.getMemberPhotoUrl === 'function') {
      try {
        const fbUrl = await window.FirebaseStorageManager.getMemberPhotoUrl(empId);
        if (fbUrl) {
          employee.photo = fbUrl;
          employee.photoPath = `Member/${empId}`;
          if (window.stateManager) {
            window.stateManager.updateMember(empId, { photo: fbUrl, photoPath: employee.photoPath });
          }
          showView('home');
          triggerConfetti();
          return;
        }
      } catch (err) {
        console.warn('[CheckPhoto] Firebase lookup notice:', err);
      }
    }

    // 2. If employee record already contains a valid Firebase download URL
    const photo = employee.photo || '';
    if (photo && (photo.startsWith('https://firebasestorage.googleapis.com') || photo.startsWith('data:image/'))) {
      showView('home');
      triggerConfetti();
      return;
    }

    // 3. No photo found at designated location: prompt user to upload & crop photo (max 350x350)
    openPhotoUploadView(employee);
  }

  function openPhotoUploadView(employee) {
    currentEmployee = employee;
    const empName = employee.EmpName || employee.name || 'พนักงาน';
    const empId = employee.EmployeeID || employee.id || '';
    const dept = employee.Group || employee.department || '';

    if (uploadEmpName) uploadEmpName.textContent = empName;
    if (uploadEmpId) uploadEmpId.textContent = `รหัส: ${empId}`;
    if (uploadEmpDept) uploadEmpDept.textContent = dept ? `ฝ่าย: ${dept}` : '';
    if (uploadAvatarInitial) uploadAvatarInitial.textContent = empName.charAt(0) || 'พ';

    if (photoDropzoneBox) photoDropzoneBox.style.display = 'block';
    if (photoCropperWorkspace) photoCropperWorkspace.style.display = 'none';
    if (memberPhotoFileInput) memberPhotoFileInput.value = '';

    showView('photo');
  }

  // ========================================================
  // 13. INTERACTIVE CROPPER & ZOOM/SCALE
  // ========================================================
  function bindCropperEvents() {
    if (memberPhotoFileInput) {
      memberPhotoFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) loadCropperFile(file);
      });
    }

    if (btnChangePhoto) {
      btnChangePhoto.addEventListener('click', () => {
        if (memberPhotoFileInput) memberPhotoFileInput.click();
      });
    }

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => adjustZoom(0.1));
    }

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => adjustZoom(-0.1));
    }

    if (zoomRangeSlider) {
      zoomRangeSlider.addEventListener('input', () => {
        cropperState.zoom = parseFloat(zoomRangeSlider.value) || 1.0;
        updateZoomBadge();
        drawCropper();
      });
    }

    if (btnResetScale) {
      btnResetScale.addEventListener('click', () => {
        cropperState.zoom = 1.0;
        cropperState.offsetX = 0;
        cropperState.offsetY = 0;
        cropperState.rotation = 0;
        if (zoomRangeSlider) zoomRangeSlider.value = '1.0';
        updateZoomBadge();
        drawCropper();
      });
    }

    if (btnRotate90) {
      btnRotate90.addEventListener('click', () => {
        cropperState.rotation = (cropperState.rotation + 90) % 360;
        drawCropper();
      });
    }

    if (btnSavePhoto) {
      btnSavePhoto.addEventListener('click', saveCroppedPhoto);
    }

    if (btnSkipPhoto) {
      btnSkipPhoto.addEventListener('click', () => {
        if (currentEmployee) showView('home');
      });
    }

    // Touch & Mouse Drag on Canvas
    const viewport = document.getElementById('cropperViewportWrapper');
    if (viewport) {
      viewport.addEventListener('mousedown', (e) => {
        cropperState.isDragging = true;
        cropperState.dragStartX = e.clientX - cropperState.offsetX;
        cropperState.dragStartY = e.clientY - cropperState.offsetY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!cropperState.isDragging) return;
        cropperState.offsetX = e.clientX - cropperState.dragStartX;
        cropperState.offsetY = e.clientY - cropperState.dragStartY;
        drawCropper();
      });

      window.addEventListener('mouseup', () => {
        cropperState.isDragging = false;
      });

      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = (e.deltaY < 0) ? 0.08 : -0.08;
        adjustZoom(delta);
      }, { passive: false });

      viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          cropperState.isDragging = true;
          cropperState.dragStartX = e.touches[0].clientX - cropperState.offsetX;
          cropperState.dragStartY = e.touches[0].clientY - cropperState.offsetY;
        } else if (e.touches.length === 2) {
          cropperState.isDragging = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          cropperState.initialPinchDistance = Math.hypot(dx, dy);
          cropperState.initialPinchZoom = cropperState.zoom;
        }
      }, { passive: true });

      viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && cropperState.isDragging) {
          cropperState.offsetX = e.touches[0].clientX - cropperState.dragStartX;
          cropperState.offsetY = e.touches[0].clientY - cropperState.dragStartY;
          drawCropper();
        } else if (e.touches.length === 2 && cropperState.initialPinchDistance) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          const factor = dist / cropperState.initialPinchDistance;
          let newZoom = cropperState.initialPinchZoom * factor;
          newZoom = Math.max(0.2, Math.min(3.0, newZoom));
          cropperState.zoom = newZoom;
          if (zoomRangeSlider) zoomRangeSlider.value = newZoom.toFixed(2);
          updateZoomBadge();
          drawCropper();
        }
      }, { passive: true });

      viewport.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) cropperState.initialPinchDistance = null;
        if (e.touches.length === 0) cropperState.isDragging = false;
      });
    }
  }

  function adjustZoom(delta) {
    let nextZoom = cropperState.zoom + delta;
    nextZoom = Math.max(0.2, Math.min(3.0, nextZoom));
    cropperState.zoom = nextZoom;
    if (zoomRangeSlider) zoomRangeSlider.value = nextZoom.toFixed(2);
    updateZoomBadge();
    drawCropper();
  }

  function updateZoomBadge() {
    if (zoomValueBadge) {
      zoomValueBadge.textContent = `${Math.round(cropperState.zoom * 100)}%`;
    }
  }

  function loadCropperFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        cropperImage = img;
        const minDimension = Math.min(img.width, img.height);
        cropperState.baseScale = (CROP_RADIUS * 2) / minDimension;
        cropperState.zoom = 1.0;
        cropperState.offsetX = 0;
        cropperState.offsetY = 0;
        cropperState.rotation = 0;

        if (zoomRangeSlider) zoomRangeSlider.value = '1.0';
        updateZoomBadge();

        if (photoDropzoneBox) photoDropzoneBox.style.display = 'none';
        if (photoCropperWorkspace) photoCropperWorkspace.style.display = 'flex';

        drawCropper();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function drawCropper() {
    if (!ctx || !cropperImage) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.save();
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;

    ctx.translate(cx + cropperState.offsetX, cy + cropperState.offsetY);
    ctx.rotate((cropperState.rotation * Math.PI) / 180);

    const scale = cropperState.baseScale * cropperState.zoom;
    const w = cropperImage.width * scale;
    const h = cropperImage.height * scale;

    ctx.drawImage(cropperImage, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  async function saveCroppedPhoto() {
    if (!cropperImage || !currentEmployee) {
      alert('ไม่พบรูปภาพสำหรับการบันทึก');
      return;
    }

    const empId = String(currentEmployee.EmployeeID || currentEmployee.id || '').trim();
    if (!empId || empId.toLowerCase() === 'null' || empId.toLowerCase() === 'undefined') {
      alert('ไม่พบรหัสพนักงานสำหรับการจัดเก็บรูปภาพ');
      return;
    }

    if (btnSavePhoto) {
      btnSavePhoto.classList.add('is-loading');
      btnSavePhoto.disabled = true;
    }

    try {
      // Export size max 350px per requirement
      const exportSize = 350;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const expCtx = exportCanvas.getContext('2d');

      const expCenter = exportSize / 2;
      const scaleRatio = exportSize / (CROP_RADIUS * 2);

      expCtx.save();
      expCtx.translate(
        expCenter + cropperState.offsetX * scaleRatio,
        expCenter + cropperState.offsetY * scaleRatio
      );
      expCtx.rotate((cropperState.rotation * Math.PI) / 180);

      const scale = cropperState.baseScale * cropperState.zoom * scaleRatio;
      const w = cropperImage.width * scale;
      const h = cropperImage.height * scale;

      expCtx.drawImage(cropperImage, -w / 2, -h / 2, w, h);
      expCtx.restore();

      const localDataUrl = exportCanvas.toDataURL('image/jpeg', 0.88);
      let finalPhotoUrl = localDataUrl;
      let storedPath = `Member/${empId}`;

      // Upload directly to designated Firebase Storage location (Member/<empId>)
      if (window.FirebaseStorageManager && typeof window.FirebaseStorageManager.uploadMemberPhoto === 'function') {
        try {
          const uploadRes = await window.FirebaseStorageManager.uploadMemberPhoto(empId, exportCanvas);
          if (uploadRes && (uploadRes.downloadUrl || uploadRes.dataUrl)) {
            finalPhotoUrl = uploadRes.downloadUrl || uploadRes.dataUrl;
            storedPath = uploadRes.storagePath || storedPath;
          }
        } catch (uploadErr) {
          console.warn('[PhotoCropper] Firebase upload warning, using local fallback:', uploadErr);
        }
      }

      const regTimestamp = new Date().toISOString();
      if (window.stateManager) {
        window.stateManager.updateMember(empId, {
          photo: finalPhotoUrl,
          photoPath: storedPath,
          registered: true,
          registeredAt: regTimestamp
        });
      }
      if (window.FirebaseSync && typeof window.FirebaseSync.updateMemberRegistration === 'function') {
        window.FirebaseSync.updateMemberRegistration(empId, {
          registered: true,
          registeredAt: regTimestamp,
          photo: finalPhotoUrl
        });
      }

      currentEmployee.photo = finalPhotoUrl;
      currentEmployee.photoPath = storedPath;
      currentEmployee.registered = true;

      showView('home');
      switchHomeTab('profile');
      triggerConfetti();

    } catch (err) {
      console.error('[SaveCroppedPhoto] Error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกรูปภาพ กรุณาลองใหม่อีกครั้ง');
    } finally {
      if (btnSavePhoto) {
        btnSavePhoto.classList.remove('is-loading');
        btnSavePhoto.disabled = false;
      }
    }
  }

  // ========================================================
  // 14. CLAIM PRIZE MODAL
  // ========================================================
  function openClaimModal(winningRecord) {
    if (!claimConfirmModal || !winningRecord || !currentEmployee) return;

    if (claimModalEmpId) claimModalEmpId.textContent = currentEmployee.EmployeeID || currentEmployee.id || '-';
    if (claimModalEmpName) claimModalEmpName.textContent = currentEmployee.EmpName || currentEmployee.name || '-';

    const prizeName = winningRecord.prizeName || winningRecord.prizeTitle || 'ของรางวัล';
    if (claimModalPrizeName) claimModalPrizeName.textContent = prizeName;

    const prizeImg = winningRecord.prizeImg || winningRecord.image || '';
    if (prizeImg && claimModalPrizeImg) {
      claimModalPrizeImg.src = prizeImg;
      claimModalPrizeImg.style.display = 'block';
      if (claimModalPrizeFallback) claimModalPrizeFallback.style.display = 'none';
    } else {
      if (claimModalPrizeImg) claimModalPrizeImg.style.display = 'none';
      if (claimModalPrizeFallback) {
        claimModalPrizeFallback.textContent = winningRecord.prizeIcon || '🎁';
        claimModalPrizeFallback.style.display = 'block';
      }
    }

    claimConfirmModal.classList.add('is-active');
  }

  function closeClaimModal() {
    if (claimConfirmModal) claimConfirmModal.classList.remove('is-active');
  }

  function confirmClaimPrize() {
    if (!currentWinningPrize) return;

    const winnerId = currentWinningPrize.id;
    if (window.stateManager && typeof window.stateManager.claimPrize === 'function' && winnerId) {
      window.stateManager.claimPrize(winnerId);
    } else if (window.stateManager && typeof window.stateManager.getWinners === 'function') {
      const winners = window.stateManager.getWinners();
      const idx = winners.findIndex(w => w.id === winnerId || (w.employeeId === currentEmployee.EmployeeID));
      if (idx !== -1) {
        winners[idx].claimed = true;
        winners[idx].claimedAt = new Date().toISOString();
        if (typeof window.stateManager.saveWinners === 'function') {
          window.stateManager.saveWinners(winners);
        }
      }
    }

    closeClaimModal();
    if (currentEmployee) {
      renderLuckyDrawResult(currentEmployee);
    }
    triggerConfetti();
  }

  function triggerConfetti() {
    if (typeof confetti === 'function') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) { }
    }
  }


  // ========================================================
  // 4v4 GAME VOTING (ระบบการโหวต ทีมที่คุณคิดว่าเป็นผู้ชนะ)
  // ========================================================
  function renderGameVotingSection(employee) {
    const bannerEl = document.getElementById('gameVoteStatusBanner');
    const teamsListEl = document.getElementById('gameVoteTeamsList');
    if (!teamsListEl) return;

    let emp = employee || currentEmployee;
    if (!emp && window.stateManager) {
      const cachedEmpId = localStorage.getItem('crsdg_active_user_emp_id');
      if (cachedEmpId) {
        emp = window.stateManager.getMembers().find(m => String(m.EmployeeID || m.id).trim().toLowerCase() === String(cachedEmpId).trim().toLowerCase());
        if (emp) currentEmployee = emp;
      }
    }
    const empId = emp ? String(emp.EmployeeID || emp.id || '').trim().toLowerCase() : '';

    const sm = window.stateManager;
    const isGameVoteOpen = sm && typeof sm.isGameVoteOpen === 'function' ? sm.isGameVoteOpen() : true;

    let myVote = '';
    if (emp) {
      myVote = (emp.chosenTeam || (sm && typeof sm.getMemberChosenTeam === 'function' ? sm.getMemberChosenTeam(empId) : '') || '').trim();
    }
    if (!myVote && empId) {
      myVote = (localStorage.getItem('crsdg_user_game_vote_' + empId) || '').trim();
    }

    // Render Status Banner
    if (bannerEl) {
      if (isGameVoteOpen) {
        bannerEl.innerHTML = `
          <div class="game-vote-banner-box banner-open">
            <div class="vote-banner-info-row">
              <span class="pulse-status-dot dot-green"></span>
              <strong class="banner-status-title">🟢 ขณะนี้ระบบกำลังเปิดรับโหวต</strong>
            </div>
            <div class="vote-banner-choice-row">
              ${myVote ? `คุณได้โหวตทายผลให้: <span class="user-voted-team-badge">🏆 ${myVote}</span> <span class="change-vote-hint">(สามารถคลิกโหวตทีมอื่นเพื่อเปลี่ยนได้)</span>` : `โปรดคลิกปุ่ม <strong>"โหวต"</strong> ด้านหลังทีมที่คุณคิดว่าจะคว้าแชมป์ (โหวตได้ 1 ทีม)`}
            </div>
          </div>
        `;
      } else {
        bannerEl.innerHTML = `
          <div class="game-vote-banner-box banner-closed">
            <div class="vote-banner-info-row">
              <span class="pulse-status-dot dot-red"></span>
              <strong class="banner-status-title">🔒 ขณะนี้ระบบปิดรับโหวตแล้ว</strong>
            </div>
            <div class="vote-banner-choice-row">
              ${myVote ? `คุณได้ทายผลไว้ที่ทีม: <span class="user-voted-team-badge closed-badge">🏆 ${myVote}</span>` : `หมดเวลาการลงคะแนนทายผลเกม 4 ต่อ 4 ไม่สามารถโหวตหรือแก้ไขได้แล้ว`}
            </div>
          </div>
        `;
      }
    }

    // Get 4v4 Competing Teams (Robust Multi-tier Fallback)
    let teams = [];
    if (sm && typeof sm.getTeamsWithDetails === 'function') {
      teams = sm.getTeamsWithDetails();
    }
    if (!teams || teams.length === 0) {
      if (sm && typeof sm.getTeamNames === 'function') {
        teams = sm.getTeamNames();
      }
    }
    if (!teams || teams.length === 0) {
      if (sm && typeof sm.getTeams === 'function') {
        teams = sm.getTeams();
      }
    }
    if (!teams || teams.length === 0) {
      teams = [
        { id: 'team_it', name: 'IT Dragons', department: 'ฝ่ายเทคโนโลยีสารสนเทศ (IT & Cloud)', color: '#3b82f6' },
        { id: 'team_mkt', name: 'Marketing Fire', department: 'ฝ่ายการตลาดและการสื่อสาร (Marketing)', color: '#f97316' },
        { id: 'team_fin', name: 'Finance Hawks', department: 'ฝ่ายการเงินและการบัญชี (Finance)', color: '#10b981' },
        { id: 'team_hr', name: 'HR Warriors', department: 'ฝ่ายทรัพยากรบุคคล (HR & People)', color: '#f59e0b' },
        { id: 'team_ops', name: 'Operations Stars', department: 'ฝ่ายปฏิบัติการและบริการลูกค้า (Operations)', color: '#8b5cf6' },
        { id: 'team_sales', name: 'Sales Champions', department: 'ฝ่ายบริหารงานขายและช่องทางจำหน่าย (Sales)', color: '#ec4899' }
      ];
    }

    teamsListEl.innerHTML = teams.map((t, idx) => {
      const order = idx + 1;
      const teamName = t.name || t.teamName || `ทีมที่ ${order}`;
      const dept = t.department || 'สังกัดทีม';
      const color = t.color || '#3b82f6';
      const isSelected = myVote && (String(myVote).trim().toLowerCase() === String(teamName).trim().toLowerCase());

      return `
        <div class="game-vote-team-row ${isSelected ? 'is-my-selected-team' : ''}" style="border-left: 4px solid ${color};">
          <div class="team-row-left">
            <div class="team-order-badge" style="background: ${color}18; color: ${color};">${order}</div>
            <div class="team-info-group">
              <div class="team-row-name">${teamName}</div>
              <div class="team-row-dept">${dept}</div>
            </div>
          </div>
          <div class="team-row-right">
            ${isSelected ? `
              <button type="button" class="btn-game-vote-action btn-voted-active" ${!isGameVoteOpen ? 'disabled' : ''} onclick="window.onGameVoteClick('${teamName}')" title="ทีมที่คุณได้ลงคะแนนโหวต">
                ✓ โหวตแล้ว
              </button>
            ` : `
              ${isGameVoteOpen ? `
                <button type="button" class="btn-game-vote-action btn-vote-default" onclick="window.onGameVoteClick('${teamName}')" title="คลิกเพื่อโหวตทีมนี้">
                  โหวต
                </button>
              ` : `
                <button type="button" class="btn-game-vote-action btn-vote-closed" disabled title="ปิดรับโหวตแล้ว">
                  ปิดโหวต
                </button>
              `}
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  window.onGameVoteClick = function (teamName) {
    const sm = window.stateManager;
    const isGameVoteOpen = sm && typeof sm.isGameVoteOpen === 'function' ? sm.isGameVoteOpen() : true;
    if (!isGameVoteOpen) {
      alert('🔒 ขณะนี้ระบบปิดรับโหวตแล้ว ไม่สามารถโหวตหรือแก้ไขการโหวตได้');
      return;
    }

    let emp = currentEmployee;
    if (!emp && sm) {
      const cachedEmpId = localStorage.getItem('crsdg_active_user_emp_id');
      if (cachedEmpId) {
        emp = sm.getMembers().find(m => String(m.EmployeeID || m.id).trim().toLowerCase() === String(cachedEmpId).trim().toLowerCase());
        if (emp) currentEmployee = emp;
      }
    }

    if (!emp) {
      alert('กรุณาลงทะเบียนหรือเข้าสู่ระบบก่อนทำการโหวต');
      return;
    }

    const empId = String(emp.EmployeeID || emp.id || '').trim().toLowerCase();
    const oldVote = (emp.chosenTeam || (sm && typeof sm.getMemberChosenTeam === 'function' ? sm.getMemberChosenTeam(empId) : '') || '').trim();

    if (oldVote && oldVote.toLowerCase() === String(teamName).trim().toLowerCase()) {
      return;
    }

    if (sm && typeof sm.setMemberChosenTeam === 'function') {
      const res = sm.setMemberChosenTeam(empId, teamName);
      if (!res.success) {
        alert(res.message || 'ไม่สามารถทำการโหวตได้');
        return;
      }
      if (window.FirebaseSync && typeof window.FirebaseSync.updateMemberRegistration === 'function') {
        window.FirebaseSync.updateMemberRegistration(empId, { chosenTeam: teamName });
      }
    }

    if (currentEmployee) currentEmployee.chosenTeam = teamName;
    localStorage.setItem('crsdg_user_game_vote_' + empId, teamName);

    // Re-render Game Tab
    renderGameTab(currentEmployee);

    triggerConfetti();
  };


  // Start on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // ========================================================
  // QR CODE & EVALUATION LIGHTBOX HANDLERS
  // ========================================================
  window.openQrLightbox = function () {
    const modal = document.getElementById('qrLightboxModal');
    if (modal) {
      modal.classList.add('is-active');
      modal.style.display = 'flex';
    }
  };

  window.closeQrLightbox = function () {
    const modal = document.getElementById('qrLightboxModal');
    if (modal) {
      modal.classList.remove('is-active');
      modal.style.display = 'none';
    }
  };

  // ========================================================
  // COMPREHENSIVE EVALUATION HANDLERS
  // ========================================================
  window.openEvalLightbox = function () {
    const modal = document.getElementById('evalLightboxModal');
    if (!modal) return;

    let emp = currentEmployee;
    if (!emp && window.stateManager) {
      const cachedEmpId = localStorage.getItem('crsdg_active_user_emp_id');
      if (cachedEmpId) {
        emp = window.stateManager.getMembers().find(m => String(m.EmployeeID || m.id).trim().toLowerCase() === String(cachedEmpId).trim().toLowerCase());
        if (emp) currentEmployee = emp;
      }
    }

    const empId = emp ? String(emp.EmployeeID || emp.id || '').trim().toLowerCase() : '';
    const empName = emp ? (emp.EmpName || emp.name || 'ผู้ร่วมกิจกรรม') : 'ผู้ร่วมกิจกรรม';
    const empDept = emp ? (emp.Group || emp.department || 'ทั่วไป') : 'ทั่วไป';
    const evalsList = (window.stateManager && typeof window.stateManager.getEvaluations === 'function')
      ? window.stateManager.getEvaluations()
      : [];
    const hasSubmittedInList = empId ? evalsList.some(e => {
      const eId = String(e.empId || e.employeeId || '').trim().toLowerCase();
      return eId && eId !== 'guest' && eId === empId;
    }) : false;

    // Check submission status:
    // Only true if the record actually exists in the evaluations list, or explicitly submitted in this browser session
    let hasSubmitted = false;
    if (empId) {
      if (hasSubmittedInList) {
        hasSubmitted = true;
      } else {
        // If not in cloud/state evaluations, clear stale local flag
        localStorage.removeItem('crsdg_eval_submitted_' + empId);
        hasSubmitted = false;
      }
    }

    // Populate Respondent Header Card
    const nameEl = document.getElementById('evalRespondentName');
    const deptEl = document.getElementById('evalRespondentDept');
    const avatarEl = document.getElementById('evalRespondentAvatar');
    const successBadgeEl = document.getElementById('successRespondentBadge');

    if (nameEl) nameEl.textContent = empName;
    if (deptEl) deptEl.textContent = empDept;
    if (avatarEl) {
      const photo = emp && (emp.photo || emp.photoPath);
      if (photo && photo.length > 10) {
        avatarEl.innerHTML = `<img src="${photo}" alt="${empName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        avatarEl.textContent = empName.charAt(0) || '👤';
      }
    }
    if (successBadgeEl) successBadgeEl.textContent = `✓ บันทึกผลสำเร็จสำหรับ: คุณ${empName} (${empDept})`;

    const formBody = document.getElementById('evalFormBody');
    const successView = document.getElementById('evalSuccessView');

    if (hasSubmitted && formBody && successView) {
      formBody.style.setProperty('display', 'none', 'important');
      formBody.classList.add('is-hidden');
      successView.style.setProperty('display', 'flex', 'important');
      successView.classList.add('is-visible', 'is-active');
    } else if (formBody && successView) {
      if (typeof window.resetEvalForm === 'function') window.resetEvalForm();
      formBody.style.setProperty('display', 'block', 'important');
      formBody.classList.remove('is-hidden');
      successView.style.setProperty('display', 'none', 'important');
      successView.classList.remove('is-visible', 'is-active');
    }

    modal.classList.add('is-active');
    modal.style.display = 'flex';
    modal.style.setProperty('display', 'flex', 'important');
    document.body.style.overflow = 'hidden'; // lock background scrolling
  };

  window.closeEvalLightbox = function () {
    const modal = document.getElementById('evalLightboxModal');
    if (modal) {
      modal.classList.remove('is-active');
      modal.style.display = 'none';
      modal.style.setProperty('display', 'none', 'important');
    }
    document.body.style.overflow = ''; // restore background scrolling

    // Return to home tab
    try {
      switchHomeTab('home');
    } catch (_) {
      if (typeof window.switchHomeTab === 'function') {
        window.switchHomeTab('home');
      }
    }
  };

  window.resetEvalForm = function () {
    const hidden = document.getElementById('evalScoreOverall');
    if (hidden) hidden.value = '';

    const container = document.getElementById('evalStarContainer');
    if (container) {
      container.querySelectorAll('.star-btn').forEach(s => s.classList.remove('is-active'));
    }

    const textEl = document.getElementById('evalScoreText');
    if (textEl) {
      textEl.textContent = 'กรุณาแตะเพื่อให้คะแนนดาว (1 - 5 ดาว)';
      textEl.style.color = '#94a3b8';
    }

    // Reset option pills
    document.querySelectorAll('.eval-option-pill').forEach(p => p.classList.remove('is-selected'));

    // Reset tag chips
    document.querySelectorAll('.eval-tag-chip').forEach(t => t.classList.remove('is-selected'));

    // Reset feedback textarea
    const feedback = document.getElementById('evalFeedbackText');
    if (feedback) feedback.value = '';
  };

  window.reopenEvalForm = function () {
    if (typeof window.resetEvalForm === 'function') window.resetEvalForm();
    const formBody = document.getElementById('evalFormBody');
    const successView = document.getElementById('evalSuccessView');
    if (formBody) {
      formBody.style.setProperty('display', 'block', 'important');
      formBody.classList.remove('is-hidden');
    }
    if (successView) {
      successView.style.setProperty('display', 'none', 'important');
      successView.classList.remove('is-visible', 'is-active');
    }
  };

  window.setEvalStar = function (score) {
    const num = Math.min(5, Math.max(1, parseInt(score, 10) || 5));
    const hidden = document.getElementById('evalScoreOverall');
    if (hidden) hidden.value = num;

    const container = document.getElementById('evalStarContainer');
    if (container) {
      const stars = container.querySelectorAll('.star-btn');
      stars.forEach(s => {
        const val = parseInt(s.getAttribute('data-star'), 10) || 1;
        if (val <= num) {
          s.classList.add('is-active');
        } else {
          s.classList.remove('is-active');
        }
      });
    }

    const textEl = document.getElementById('evalScoreText');
    const texts = ['', 'ต้องปรับปรุง (1 / 5 ดาว)', 'พอใช้ (2 / 5 ดาว)', 'ปานกลาง (3 / 5 ดาว)', 'ดีมาก (4 / 5 ดาว)', 'ยอดเยี่ยมมากที่สุด (5 / 5 ดาว)'];
    if (textEl) {
      textEl.textContent = texts[num] || `${num} / 5 ดาว`;
      textEl.style.color = '#fbbf24';
    }
  };

  window.selectEvalOption = function (btn, val) {
    if (!btn || !btn.parentElement) return;
    const siblings = btn.parentElement.querySelectorAll('.eval-option-pill');
    siblings.forEach(s => s.classList.remove('is-selected'));
    btn.classList.add('is-selected');
  };

  window.toggleEvalTag = function (btn) {
    if (!btn) return;
    btn.classList.toggle('is-selected');
  };

  window.handleEvalFormSubmit = function (e) {
    if (e && e.preventDefault) e.preventDefault();

    let emp = currentEmployee;
    if (!emp && window.stateManager) {
      const cachedEmpId = localStorage.getItem('crsdg_active_user_emp_id');
      if (cachedEmpId) {
        emp = window.stateManager.getMembers().find(m => String(m.EmployeeID || m.id).trim().toLowerCase() === String(cachedEmpId).trim().toLowerCase());
        if (emp) currentEmployee = emp;
      }
    }

    const empId = emp ? String(emp.EmployeeID || emp.id || '').trim().toLowerCase() : 'guest';
    const empName = emp ? (emp.EmpName || emp.name || 'ผู้ร่วมกิจกรรม') : 'ผู้ร่วมกิจกรรม';
    const empDept = emp ? (emp.Group || emp.department || 'ทั่วไป') : 'ทั่วไป';

    const hiddenScore = document.getElementById('evalScoreOverall');
    const scoreVal = hiddenScore && hiddenScore.value ? parseInt(hiddenScore.value, 10) : 0;
    if (!scoreVal || scoreVal < 1) {
      alert('กรุณาแตะเพื่อให้คะแนนดาวความพึงพอใจในภาพรวมของกิจกรรม (ข้อ 1)');
      const starContainer = document.getElementById('evalStarContainer');
      if (starContainer) starContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const feedbackVal = document.getElementById('evalFeedbackText') ? document.getElementById('evalFeedbackText').value.trim() : '';

    // Extract selected sub-ratings (Question 2)
    const getSubRating = (qKey) => {
      const group = document.querySelector(`.eval-pill-group[data-q="${qKey}"]`);
      if (!group) return '';
      const sel = group.querySelector('.eval-option-pill.is-selected');
      return sel ? sel.textContent.trim() : '';
    };

    const ratings = {
      pitch: getSubRating('eval_pitch'),
      game: getSubRating('eval_game'),
      food: getSubRating('eval_food'),
      app: getSubRating('eval_app')
    };

    if (!ratings.pitch || !ratings.game || !ratings.food || !ratings.app) {
      alert('กรุณาเลือกประเมินความพึงพอใจในกิจกรรมย่อยให้ครบทั้ง 4 ด้าน (ข้อ 2)');
      const subGroup = document.querySelector('.eval-sub-questions-list');
      if (subGroup) subGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const selectedTags = [];
    const activeTags = document.querySelectorAll('.eval-tag-chip.is-selected');
    activeTags.forEach(t => selectedTags.push(t.textContent.trim()));

    const evalRecord = {
      id: 'eval_' + Date.now() + '_' + (empId || 'guest'),
      empId: empId,
      empName: empName,
      department: empDept,
      overallScore: scoreVal,
      ratings: ratings,
      tags: selectedTags,
      feedback: feedbackVal,
      submittedAt: new Date().toISOString()
    };

    try {
      if (window.stateManager && typeof window.stateManager.addEvaluation === 'function') {
        window.stateManager.addEvaluation(evalRecord);
      } else {
        localStorage.setItem('crsdg_eval_submitted_' + empId, 'true');
        const allEvalsRaw = localStorage.getItem('crsdg_evaluations') || localStorage.getItem('crsdg_evaluations_list') || '[]';
        const allEvals = JSON.parse(allEvalsRaw);
        allEvals.unshift(evalRecord);
        localStorage.setItem('crsdg_evaluations', JSON.stringify(allEvals));
        localStorage.setItem('crsdg_evaluations_list', JSON.stringify(allEvals));
      }

      // ส่งข้อมูลขึ้น Firebase Firestore ตาราง crsdg_evaluations โดยตรงทันที
      if (window.FirebaseSync && typeof window.FirebaseSync.saveEvaluation === 'function') {
        window.FirebaseSync.saveEvaluation(evalRecord).then(success => {
          if (success) {
            console.log('[Index] ✅ บันทึกแบบประเมินผลลง Firebase crsdg_evaluations สำเร็จ');
          } else {
            console.warn('[Index] ⚠️ บันทึกแบบประเมินผลลง Firebase crsdg_evaluations ไม่สำเร็จ');
          }
        }).catch(err => {
          console.warn('[Index] Firebase saveEvaluation error:', err);
        });
      }
    } catch (err) {
      console.warn('Failed to persist eval record:', err);
    }

    const successBadgeEl = document.getElementById('successRespondentBadge');
    if (successBadgeEl) successBadgeEl.textContent = `✓ บันทึกผลสำเร็จสำหรับ: คุณ${empName} (${empDept})`;

    const formBody = document.getElementById('evalFormBody');
    const successView = document.getElementById('evalSuccessView');
    if (formBody) {
      formBody.style.setProperty('display', 'none', 'important');
      formBody.classList.add('is-hidden');
    }
    if (successView) {
      successView.style.setProperty('display', 'flex', 'important');
      successView.classList.add('is-visible', 'is-active');
    }

    if (window.confetti && typeof window.confetti.fire === 'function') {
      window.confetti.fire();
    } else if (typeof confetti === 'function') {
      try { confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } }); } catch (_) { }
    }
  };

  // ========================================================
  // PWA SERVICE WORKER REGISTRATION (ซ่อน Address Bar ใน Standalone Mode)
  // ========================================================
  function initPwaInstallHandlers() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          console.log('[PWA] Service Worker registered successfully:', reg.scope);
        }).catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
      });
    }
  }

})();
