/**
 * Shared State Management for CRS DG New Year Lucky Draw
 * Manages participants, prizes, winners, and BroadcastChannel sync
 */

const STORAGE_KEYS = {
    MEMBERS: 'crsdg_member', // ตาราง crsdg_member ตามที่ผู้ใช้กำหนด
    PARTICIPANTS: 'crsdg_member',
    NAMETEAM: 'crsdg_nameteam', // ตารางชื่อทีมแข่งขัน crsdg_nameteam
    TEAM: 'crsdg_team', // ตารางสมาชิกในแต่ละทีม crsdg_team
    PLAYER: 'crsdg_player', // ตารางทีมแข่งขัน crsdg_player
    PRIZES: 'crsdg_reward', // ตาราง crsdg_reward ตามที่ผู้ใช้กำหนด
    WINNERS: 'crsdg_winners',
    SETTINGS: 'crsdg_settings',
    CURRENT_PRIZE_ID: 'crsdg_current_prize_id',
    TEAMS: 'crsdg_nameteam', // Compatibility
    QUIZ: 'crsdg_quiz', // ตารางเกมคำถาม crsdg_quiz
    EVALUATIONS: 'crsdg_evaluations', // ตารางจัดเก็บข้อมูลแบบประเมินผล crsdg_evaluations
    CANCELED_DRAWS: 'crsdg_canceled_draw_ids' // รายชื่อพนักงานที่เคยสุ่มได้แล้วถูกยกเลิก (ไม่ให้สุ่มซ้ำ)
};

// ข้อมูลสมาชิกเริ่มต้น (กำหนดเป็นค่าว่าง [] เพื่อป้องกันไม่ให้ข้อมูล demo ไปปะปนกับข้อมูลจริง)

const DEFAULT_QUIZZES = [
    {
        id: 'quiz_1',
        title: 'ของขวัญปีใหม่ยอดนิยมที่พนักงาน CRS DG อยากได้มากที่สุด',
        score: 100,
        maxAnswers: 4,
        answers: [
            { id: 'ans_1_1', text: 'ทองคำ / สร้อยคอทองคำ', points: 40 },
            { id: 'ans_1_2', text: 'เงินสด / โบนัสพิเศษ', points: 30 },
            { id: 'ans_1_3', text: 'สมาร์ทโฟน iPhone / iPad', points: 20 },
            { id: 'ans_1_4', text: 'แพ็กเกจท่องเที่ยว / ตั๋วเครื่องบิน', points: 10 }
        ]
    },
    {
        id: 'quiz_2',
        title: 'กิจกรรมยอดฮิตในงานปาร์ตี้เลี้ยงส่งท้ายปีเก่าต้อนรับปีใหม่',
        score: 100,
        maxAnswers: 4,
        answers: [
            { id: 'ans_2_1', text: 'จับฉลากสุ่มรางวัล Lucky Draw', points: 45 },
            { id: 'ans_2_2', text: 'ร้องเพลงคาราโอเกะ / เต้นโชว์', points: 25 },
            { id: 'ans_2_3', text: 'รับประทานอาหารโต๊ะจีน / บุฟเฟต์', points: 20 },
            { id: 'ans_2_4', text: 'ประกวดแต่งกายแฟนซี', points: 10 }
        ]
    },
    {
        id: 'quiz_3',
        title: 'คำอวยพรวันปีใหม่ยอดฮิตที่ได้ยินบ่อยที่สุด',
        score: 100,
        maxAnswers: 4,
        answers: [
            { id: 'ans_3_1', text: 'ขอให้รวยๆ เฮงๆ มีเงินทองไหลมาเทมา', points: 40 },
            { id: 'ans_3_2', text: 'ขอให้สุขภาพร่างกายแข็งแรง ปราศจากโรคภัย', points: 35 },
            { id: 'ans_3_3', text: 'ขอให้การงานก้าวหน้า ได้เลื่อนขั้นเลื่อนตำแหน่ง', points: 15 },
            { id: 'ans_3_4', text: 'ขอให้มีความสุข สมหวังในทุกสิ่ง', points: 10 }
        ]
    },
    {
        id: 'quiz_4',
        title: 'สถานที่ท่องเที่ยวช่วงวันหยุดยาวปีใหม่ที่คนไทยนิยมไปมากที่สุด',
        score: 100,
        maxAnswers: 4,
        answers: [
            { id: 'ans_4_1', text: 'เชียงใหม่ / ภูเขา / ดอยภาคเหนือ', points: 45 },
            { id: 'ans_4_2', text: 'ทะเล / หัวหิน / พัทยา / ภูเก็ต', points: 30 },
            { id: 'ans_4_3', text: 'กลับบ้านเกิดต่างจังหวัด / เยี่ยมครอบครัว', points: 15 },
            { id: 'ans_4_4', text: 'เที่ยวต่างประเทศ (ญี่ปุ่น / เกาหลี)', points: 10 }
        ]
    }
];

const DEFAULT_MEMBERS = [];

// เมนูทีมแข่งขัน (crsdg_player) เริ่มต้นว่างเปล่า (ไม่มีข้อมูล Demo ตามคำสั่งผู้ใช้)
const DEFAULT_PLAYERS = [];

const DEFAULT_TEAM_NAMES = [
    {
        id: 'team_it',
        name: 'IT Dragons',
        department: 'ฝ่าย IT & Cloud',
        color: '#3b82f6'
    },
    {
        id: 'team_mkt',
        name: 'Marketing Fire',
        department: 'ฝ่าย Marketing',
        color: '#f97316'
    },
    {
        id: 'team_fin',
        name: 'Finance Hawks',
        department: 'ฝ่าย Finance',
        color: '#10b981'
    },
    {
        id: 'team_sales',
        name: 'Sales Thunder',
        department: 'ฝ่าย Sales & BD',
        color: '#eab308'
    },
    {
        id: 'team_hr',
        name: 'HR Superstars',
        department: 'ฝ่าย HR & People',
        color: '#a855f7'
    },
    {
        id: 'team_rnd',
        name: 'AI & Data Titans',
        department: 'ฝ่าย AI & Data',
        color: '#06b6d4'
    }
];

const DEFAULT_TEAMS = DEFAULT_TEAM_NAMES.map(t => ({
    ...t,
    captainId: '',
    memberIds: []
}));

// Helper to resolve sponsor avatar from real disk files with loop prevention
function resolveSponsorAvatar(sponsorName, sponsorPhoto) {
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
if (typeof window !== 'undefined') {
    window.resolveSponsorAvatar = resolveSponsorAvatar;
}

const DEFAULT_PRIZES = [
    {
        id: 'p_1',
        orderNo: 1,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่โอเล่',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Ole.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_2',
        orderNo: 2,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่เอก',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Eak.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_3',
        orderNo: 3,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่ฝน',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Fon.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_4',
        orderNo: 4,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่เป้ง',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Peng.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_5',
        orderNo: 5,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่แนน',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Nan.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_6',
        orderNo: 6,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่ต่าย',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Tai.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_7',
        orderNo: 7,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่ปาล์ม',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Palm.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_8',
        orderNo: 8,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่เพลิน',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Plearn.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_9',
        orderNo: 9,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่อ้อม',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Aom.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_10',
        orderNo: 10,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่วรรณ',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Wan.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_11',
        orderNo: 11,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่ลอร์ด',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Lord.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_12',
        orderNo: 12,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่พิมพ์',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Pim.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_13',
        orderNo: 13,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่ยุ',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Chu.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_14',
        orderNo: 14,
        title: 'Lucky Draw',
        group: 'Management',
        groupBadge: 'Group Extra',
        sponsorName: 'พี่ติ่ง',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/P Ting.png',
        prizePhoto: '',
        icon: '🎁',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_15',
        orderNo: 15,
        title: 'กระเป๋า (1)',
        group: 'Management',
        groupBadge: 'ผู้บริหาร',
        sponsorName: 'ผู้บริหาร',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/logo@2.png',
        prizePhoto: '',
        icon: '👜',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_16',
        orderNo: 16,
        title: 'กระเป๋า (2)',
        group: 'Management',
        groupBadge: 'ผู้บริหาร',
        sponsorName: 'ผู้บริหาร',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/logo@2.png',
        prizePhoto: '',
        icon: '👜',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_17',
        orderNo: 17,
        title: 'กระเป๋า (3)',
        group: 'Management',
        groupBadge: 'ผู้บริหาร',
        sponsorName: 'ผู้บริหาร',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/logo@2.png',
        prizePhoto: '',
        icon: '👜',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_18',
        orderNo: 18,
        title: 'กระเป๋า (4)',
        group: 'Management',
        groupBadge: 'ผู้บริหาร',
        sponsorName: 'ผู้บริหาร',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/logo@2.png',
        prizePhoto: '',
        icon: '👜',
        quantity: 1,
        drawn: 0
    },
    {
        id: 'p_19',
        orderNo: 19,
        title: 'พิเศษ',
        group: 'Management',
        groupBadge: 'ผู้บริหาร',
        sponsorName: 'ผู้บริหาร',
        sponsorPosition: 'ผู้บริหารระดับสูง',
        sponsorPhoto: 'images/logo@2.png',
        prizePhoto: '',
        icon: '⭐',
        quantity: 1,
        drawn: 0
    }
];

const DEFAULT_PARTICIPANTS = [];

class StateManager {
    constructor() {
        this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('crsdg_game_channel') : null;
        this.rewardChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('crsdg_reward_channel') : null;
        if (this.rewardChannel) {
            this.rewardChannel.onmessage = (event) => {
                this.notifyListeners(event.data);
            };
        }
        this.listeners = new Set();
        
        if (this.channel) {
            this.channel.onmessage = (event) => {
                this.notifyListeners(event.data);
            };
        }

        // Listen for storage changes across tabs
        window.addEventListener('storage', (e) => {
            if (Object.values(STORAGE_KEYS).includes(e.key)) {
                this.notifyListeners({ type: 'STORAGE_UPDATED', key: e.key });
            }
        });

        this.initDefaults();
    }

    initDefaults() {
        let existingPrizesRaw = localStorage.getItem(STORAGE_KEYS.PRIZES);
        if (!existingPrizesRaw) {
            // Check legacy crsdg_prizes for seamless migration
            const legacyRaw = localStorage.getItem('crsdg_prizes');
            if (legacyRaw) {
                existingPrizesRaw = legacyRaw;
                localStorage.setItem(STORAGE_KEYS.PRIZES, legacyRaw);
            }
        }
        if (!existingPrizesRaw) {
            localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(DEFAULT_PRIZES));
        } else {
            try {
                const parsedPrizes = JSON.parse(existingPrizesRaw);
                // If old demo 6 prizes or empty, initialize with the 19 prizes from AL_Reward
                if (!Array.isArray(parsedPrizes) || parsedPrizes.length <= 6 && parsedPrizes.some(p => p.id === 'p1')) {
                    localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(DEFAULT_PRIZES));
                }
            } catch (e) {
                localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(DEFAULT_PRIZES));
            }
        }

        // ลบข้อมูล Demo เก่าออกจากระบบทั้งหมด เพื่อป้องกันไม่ให้ข้อมูล demo ไปปนกับข้อมูลพนักงานจริง
        if (!localStorage.getItem('crsdg_demo_cleaned_v2')) {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
            localStorage.removeItem('crsdg_participants');
            const cleanTeams = DEFAULT_TEAMS.map(t => ({
                ...t,
                captainId: '',
                memberIds: []
            }));
            localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(cleanTeams));
            localStorage.setItem('crsdg_demo_cleaned_v2', 'true');
        } else if (!localStorage.getItem(STORAGE_KEYS.MEMBERS)) {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
        }

        if (!localStorage.getItem(STORAGE_KEYS.WINNERS)) {
            localStorage.setItem(STORAGE_KEYS.WINNERS, JSON.stringify([]));
        }

        // ตาราง crsdg_quiz (เกมคำถาม)
        if (!localStorage.getItem(STORAGE_KEYS.QUIZ)) {
            localStorage.setItem(STORAGE_KEYS.QUIZ, JSON.stringify(DEFAULT_QUIZZES));
        }
        // ตาราง crsdg_nameteam (รายชื่อทีม)
        if (!localStorage.getItem(STORAGE_KEYS.NAMETEAM)) {
            const legacyRaw = localStorage.getItem('crsdg_teams');
            if (legacyRaw) {
                try {
                    const legacy = JSON.parse(legacyRaw);
                    const names = legacy.map(t => ({
                        id: t.id,
                        name: t.name,
                        department: t.department || '',
                        color: t.color || '#3b82f6'
                    }));
                    localStorage.setItem(STORAGE_KEYS.NAMETEAM, JSON.stringify(names));
                } catch {
                    localStorage.setItem(STORAGE_KEYS.NAMETEAM, JSON.stringify(DEFAULT_TEAM_NAMES));
                }
            } else {
                localStorage.setItem(STORAGE_KEYS.NAMETEAM, JSON.stringify(DEFAULT_TEAM_NAMES));
            }
        }

        // ตาราง crsdg_team (สมาชิกในแต่ละทีม)
        if (!localStorage.getItem(STORAGE_KEYS.TEAM)) {
            const legacyRaw = localStorage.getItem('crsdg_teams');
            if (legacyRaw) {
                try {
                    const legacy = JSON.parse(legacyRaw);
                    const rosters = legacy.map(t => ({
                        teamId: t.id,
                        captainId: t.captainId || '',
                        memberIds: t.memberIds || []
                    }));
                    localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(rosters));
                } catch {
                    localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(DEFAULT_TEAM_NAMES.map(t => ({
                        teamId: t.id,
                        captainId: '',
                        memberIds: []
                    }))));
                }
            } else {
                localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(DEFAULT_TEAM_NAMES.map(t => ({
                    teamId: t.id,
                    captainId: '',
                    memberIds: []
                }))));
            }
        }
        // ตาราง crsdg_player (ทีมแข่งขัน) - ลบข้อมูล Demo เก่าออกจากระบบทั้งหมด
        if (!localStorage.getItem('crsdg_players_cleaned_demo_v4')) {
            const raw = localStorage.getItem(STORAGE_KEYS.PLAYER);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        const nonDemo = parsed.filter(p => p.id && !p.id.startsWith('team_player_1') && !p.id.startsWith('team_player_2') && !p.id.startsWith('team_player_3'));
                        localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(nonDemo));
                    }
                } catch (e) {}
            } else {
                localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify([]));
            }
            localStorage.setItem('crsdg_players_cleaned_demo_v4', 'true');
        }

        if (!localStorage.getItem(STORAGE_KEYS.CURRENT_PRIZE_ID)) {
            const prizes = this.getPrizes();
            if (prizes.length > 0) {
                localStorage.setItem(STORAGE_KEYS.CURRENT_PRIZE_ID, prizes[0].id);
            }
        }
        this.syncParticipantTeamRoles();
    }

    // Keep participant metadata in sync with teams
    syncParticipantTeamRoles() {
        const teams = this.getTeams();
        const participants = this.getParticipants();
        let changed = false;

        const captainMap = new Map();
        const memberMap = new Map();
        teams.forEach(t => {
            if (t.captainId) captainMap.set(t.captainId, t.id);
            (t.memberIds || []).forEach(mid => memberMap.set(mid, t.id));
        });

        participants.forEach(p => {
            const isCap = captainMap.has(p.id);
            const teamId = captainMap.get(p.id) || memberMap.get(p.id) || null;
            if (p.teamId !== teamId || p.isCaptain !== isCap) {
                p.teamId = teamId;
                p.isCaptain = isCap;
                changed = true;
            }
            if (p.photo === undefined) {
                p.photo = '';
                changed = true;
            }
        });

        if (changed) {
            this.saveParticipants(participants);
        }
    }

    // ========================================================
    // TEAMS & ROSTERS (crsdg_nameteam & crsdg_team)
    // ========================================================

    // ตาราง crsdg_nameteam: รายชื่อและข้อมูลทีม
    getTeamNames() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.NAMETEAM);
            if (raw) return JSON.parse(raw);
            return DEFAULT_TEAM_NAMES;
        } catch {
            return DEFAULT_TEAM_NAMES;
        }
    }

    saveTeamNames(teamNames) {
        localStorage.setItem(STORAGE_KEYS.NAMETEAM, JSON.stringify(teamNames));
        this.syncParticipantTeamRoles();
        this.broadcast({ type: 'TEAMS_UPDATED', teams: this.getTeams() });
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.syncAllTeamNames === 'function') {
            window.FirebaseSync.syncAllTeamNames(teamNames).catch(e => console.warn('[State] Cloud teamNames sync notice:', e));
        }
    }

    // ตาราง crsdg_team: สมาชิกในแต่ละทีม
    getTeamMembersTable() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.TEAM);
            if (raw) return JSON.parse(raw);
            return this.getTeamNames().map(t => ({
                teamId: t.id,
                captainId: '',
                memberIds: []
            }));
        } catch {
            return this.getTeamNames().map(t => ({
                teamId: t.id,
                captainId: '',
                memberIds: []
            }));
        }
    }

    saveTeamMembersTable(rosters) {
        localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(rosters));
        this.syncParticipantTeamRoles();
        this.broadcast({ type: 'TEAMS_UPDATED', teams: this.getTeams() });
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.syncAllTeamRosters === 'function') {
            window.FirebaseSync.syncAllTeamRosters(rosters).catch(e => console.warn('[State] Cloud team rosters sync notice:', e));
        }
    }

    // ดึงข้อมูลทีมรวมทั้งชื่อทีม (crsdg_nameteam) และสมาชิก (crsdg_team)
    getTeams() {
        const teamNames = this.getTeamNames();
        const rosters = this.getTeamMembersTable();
        const rosterMap = new Map();
        rosters.forEach(r => rosterMap.set(r.teamId, r));

        return teamNames.map(t => {
            const r = rosterMap.get(t.id) || { captainId: '', memberIds: [] };
            return {
                id: t.id,
                name: t.name,
                department: t.department || '',
                color: t.color || '#3b82f6',
                status: t.status || 'online',
                captainId: r.captainId || '',
                memberIds: r.memberIds || []
            };
        });
    }

    saveTeams(teams) {
        // บันทึกชื่อทีมลง crsdg_nameteam
        const teamNames = teams.map(t => ({
            id: t.id,
            name: t.name,
            department: t.department || '',
            color: t.color || '#3b82f6',
            status: t.status || 'online'
        }));
        localStorage.setItem(STORAGE_KEYS.NAMETEAM, JSON.stringify(teamNames));

        // บันทึกสมาชิกทีมลง crsdg_team
        const rosters = teams.map(t => ({
            teamId: t.id,
            captainId: t.captainId || '',
            memberIds: t.memberIds || []
        }));
        localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(rosters));

        this.syncParticipantTeamRoles();
        this.broadcast({ type: 'TEAMS_UPDATED', teams: this.getTeams() });

        if (typeof window !== 'undefined' && window.FirebaseSync) {
            if (typeof window.FirebaseSync.syncAllTeamNames === 'function') window.FirebaseSync.syncAllTeamNames(teamNames);
            if (typeof window.FirebaseSync.syncAllTeamRosters === 'function') window.FirebaseSync.syncAllTeamRosters(rosters);
        }
    }

    // เพิ่มทีมใหม่ลงตาราง crsdg_nameteam
    addTeam(teamData) {
        const teamNames = this.getTeamNames();
        const id = 'team_' + Date.now();
        const newTeam = {
            id,
            name: String(teamData.name || 'ทีมใหม่').trim(),
            department: String(teamData.department || '').trim(),
            color: teamData.color || '#3b82f6',
            status: teamData.status || 'online'
        };
        teamNames.push(newTeam);
        this.saveTeamNames(teamNames);

        // เพิ่มรายการว่างลง crsdg_team
        const rosters = this.getTeamMembersTable();
        rosters.push({
            teamId: id,
            captainId: '',
            memberIds: []
        });
        this.saveTeamMembersTable(rosters);

        return { success: true, message: `เพิ่มทีม "${newTeam.name}" ลงตาราง crsdg_nameteam เรียบร้อยแล้ว`, team: newTeam };
    }

    // แก้ไขข้อมูลและชื่อทีมในตาราง crsdg_nameteam
    updateTeam(teamId, updatedData) {
        const teamNames = this.getTeamNames();
        const idx = teamNames.findIndex(t => t.id === teamId);
        if (idx === -1) {
            return { success: false, message: `ไม่พบทีมที่ต้องการแก้ไข (${teamId})` };
        }

        teamNames[idx] = {
            ...teamNames[idx],
            name: String(updatedData.name || teamNames[idx].name).trim(),
            department: updatedData.department !== undefined ? String(updatedData.department).trim() : teamNames[idx].department,
            color: updatedData.color || teamNames[idx].color,
            status: updatedData.status || teamNames[idx].status || 'online'
        };

        this.saveTeamNames(teamNames);
        return { success: true, message: `แก้ไขข้อมูลทีม "${teamNames[idx].name}" ในตาราง crsdg_nameteam เรียบร้อยแล้ว`, team: teamNames[idx] };
    }

    // สลับสถานะ Online / Offline ของทีม
    toggleTeamStatus(teamId) {
        const teamNames = this.getTeamNames();
        const target = teamNames.find(t => t.id === teamId);
        if (target) {
            target.status = (target.status === 'offline') ? 'online' : 'offline';
            this.saveTeamNames(teamNames);
            return { success: true, team: target, status: target.status };
        }
        return { success: false, message: 'ไม่พบทีมที่ต้องการเปลี่ยนสถานะ' };
    }

    // ลบทีมออกจากตาราง crsdg_nameteam และ crsdg_team
    deleteTeam(teamId) {
        const teamNames = this.getTeamNames().filter(t => t.id !== teamId);
        this.saveTeamNames(teamNames);

        const rosters = this.getTeamMembersTable().filter(r => r.teamId !== teamId);
        this.saveTeamMembersTable(rosters);

        // ปลด teamId ของสมาชิกในตาราง crsdg_member
        const participants = this.getParticipants().map(p => {
            if (p.teamId === teamId) {
                return { ...p, teamId: null, isCaptain: false };
            }
            return p;
        });
        this.saveParticipants(participants);

        return { success: true, message: 'ลบทีมออกจากตาราง crsdg_nameteam เรียบร้อยแล้ว' };
    }

    getTeamsWithDetails() {
        const teams = this.getTeams();
        const participants = this.getParticipants();
        const partMap = new Map(participants.map(p => [p.id, p]));

        return teams.map(t => {
            const captain = t.captainId ? (partMap.get(t.captainId) || { id: t.captainId, name: t.captainId, department: '' }) : null;
            const members = (t.memberIds || []).map(mid => partMap.get(mid) || { id: mid, name: mid, department: '' });
            return {
                ...t,
                captain,
                members
            };
        });
    }

    assignMemberToTeam(employeeId, teamId, isCaptain = false) {
        const participants = this.getParticipants();
        const participant = participants.find(p => p.id === employeeId);
        if (!participant) {
            return { success: false, message: `ไม่พบรหัสพนักงาน "${employeeId}" ในระบบ กรุณาเพิ่มรายชื่อผู้ร่วมงานก่อน` };
        }

        const teams = this.getTeams();
        const targetTeam = teams.find(t => t.id === teamId);
        if (!targetTeam) {
            return { success: false, message: `ไม่พบทีมที่เลือก (${teamId})` };
        }

        // Remove from all teams first
        teams.forEach(t => {
            if (t.captainId === employeeId) {
                t.captainId = '';
            }
            t.memberIds = (t.memberIds || []).filter(mid => mid !== employeeId);
        });

        if (isCaptain) {
            if (targetTeam.captainId && targetTeam.captainId !== employeeId) {
                // Demote old captain to regular member
                if (!targetTeam.memberIds.includes(targetTeam.captainId)) {
                    targetTeam.memberIds.push(targetTeam.captainId);
                }
            }
            targetTeam.captainId = employeeId;
        } else {
            if (!targetTeam.memberIds.includes(employeeId)) {
                targetTeam.memberIds.push(employeeId);
            }
        }

        this.saveTeams(teams);
        return { success: true, message: `บันทึกคุณ ${participant.name} (${employeeId}) เข้าสู่ทีม ${targetTeam.name} เรียบร้อยแล้ว`, team: targetTeam };
    }

    removeMemberFromTeam(employeeId) {
        const teams = this.getTeams();
        let removed = false;
        teams.forEach(t => {
            if (t.captainId === employeeId) {
                t.captainId = '';
                removed = true;
            }
            const beforeLen = (t.memberIds || []).length;
            t.memberIds = (t.memberIds || []).filter(mid => mid !== employeeId);
            if (t.memberIds.length < beforeLen) removed = true;
        });

        if (removed) {
            this.saveTeams(teams);
        }
        return { success: removed };
    }

    setTeamCaptain(teamId, employeeId) {
        return this.assignMemberToTeam(employeeId, teamId, true);
    }

    updateParticipantPhoto(employeeId, base64Photo) {
        const participants = this.getParticipants();
        const participant = participants.find(p => p.id === employeeId);
        if (!participant) {
            return { success: false, message: `ไม่พบรหัสพนักงาน ${employeeId}` };
        }
        participant.photo = base64Photo;
        this.saveParticipants(participants);
        return { success: true, participant };
    }

    getPrizes() {
        try {
            let raw = localStorage.getItem(STORAGE_KEYS.PRIZES);
            if (!raw) {
                raw = localStorage.getItem('crsdg_prizes');
                if (raw) localStorage.setItem(STORAGE_KEYS.PRIZES, raw);
            }
            if (!raw) return DEFAULT_PRIZES;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PRIZES;
            if (parsed.length <= 6 && parsed.some(p => p.id === 'p1')) {
                localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(DEFAULT_PRIZES));
                return DEFAULT_PRIZES;
            }
            return parsed.map((p, idx) => ({
                id: p.id || ('p_' + (idx + 1)),
                orderNo: typeof p.orderNo === 'number' ? p.orderNo : (idx + 1),
                title: p.title || 'Lucky Draw',
                group: p.group || p.category || 'Management',
                groupBadge: p.groupBadge || (p.group === 'Management' ? 'Group Extra' : (p.group || 'Management')),
                sponsorName: p.sponsorName || p.sponsor || 'ผู้บริหาร',
                sponsorPosition: p.sponsorPosition || 'ผู้บริหารระดับสูง',
                sponsorPhoto: resolveSponsorAvatar(p.sponsorName || p.sponsor, p.sponsorPhoto),
                prizePhoto: p.prizePhoto || '',
                icon: p.icon || '🎁',
                quantity: parseInt(p.quantity, 10) || 1,
                drawn: parseInt(p.drawn, 10) || 0
            })).sort((a, b) => a.orderNo - b.orderNo);
        } catch {
            return DEFAULT_PRIZES;
        }
    }

    savePrizes(prizes) {
        localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
        localStorage.setItem('crsdg_prizes', JSON.stringify(prizes)); // Compatibility
        this.broadcast({ type: 'PRIZES_UPDATED', prizes });
        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.syncAllPrizes === 'function') {
            FirebaseSync.syncAllPrizes(prizes).catch(() => {});
        }
    }

    addPrize(prizeData) {
        const prizes = this.getPrizes();
        const maxOrder = prizes.reduce((max, p) => Math.max(max, p.orderNo || 0), 0);
        const newPrize = {
            id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            orderNo: maxOrder + 1,
            title: String(prizeData.title || 'Lucky Draw').trim(),
            group: String(prizeData.group || 'Management').trim(),
            groupBadge: String(prizeData.groupBadge || 'Group Extra').trim(),
            sponsorName: String(prizeData.sponsorName || 'ผู้บริหาร').trim(),
            sponsorPosition: String(prizeData.sponsorPosition || 'ผู้บริหารระดับสูง').trim(),
            sponsorPhoto: prizeData.sponsorPhoto || '',
            prizePhoto: prizeData.prizePhoto || '',
            icon: prizeData.icon || '🎁',
            quantity: parseInt(prizeData.quantity, 10) || 1,
            drawn: 0
        };
        prizes.push(newPrize);
        this.savePrizes(prizes);
        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.savePrize === 'function') {
            FirebaseSync.savePrize(newPrize).catch(() => {});
        }
        return newPrize;
    }

    updatePrize(id, updates) {
        const prizes = this.getPrizes();
        const target = prizes.find(p => p.id === id);
        if (!target) return false;
        Object.assign(target, updates);
        this.savePrizes(prizes);
        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.savePrize === 'function') {
            FirebaseSync.savePrize(target).catch(() => {});
        }
        return target;
    }

    deletePrize(id) {
        let prizes = this.getPrizes().filter(p => p.id !== id);
        prizes.forEach((p, idx) => { p.orderNo = idx + 1; });
        this.savePrizes(prizes);
        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.deletePrize === 'function') {
            FirebaseSync.deletePrize(id).catch(() => {});
        }
        return true;
    }

    movePrizeOrder(id, direction) {
        const prizes = this.getPrizes();
        const idx = prizes.findIndex(p => p.id === id);
        if (idx < 0) return false;
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= prizes.length) return false;

        const currentOrder = prizes[idx].orderNo;
        prizes[idx].orderNo = prizes[targetIdx].orderNo;
        prizes[targetIdx].orderNo = currentOrder;
        prizes.sort((a, b) => a.orderNo - b.orderNo);
        prizes.forEach((p, i) => { p.orderNo = i + 1; });
        this.savePrizes(prizes);
        return true;
    }

    // ========================================================
    // ตาราง crsdg_member (EmployeeID, EmpName, Group, Photo)
    // ========================================================
    getMembers() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
            if (!raw) return DEFAULT_MEMBERS;
            const parsed = JSON.parse(raw);
            return parsed.map(m => {
                const isReg = (m.registered === true || m.isRegistered === true) ? true : (m.registered === false ? false : null);
                const rawGrp = (m.Group !== undefined && m.Group !== null) ? String(m.Group).trim() : (m.department !== undefined && m.department !== null ? String(m.department).trim() : '');
                // Purge old dummy fallback 'Team A' if present
                const cleanGroup = (rawGrp.toLowerCase() === 'team a') ? '' : rawGrp;
                const rawMem = (m.Member !== undefined && m.Member !== null) ? m.Member : (m.member !== undefined && m.member !== null ? m.member : '');
                const memberStatus = (String(rawMem).trim().toLowerCase() === 'member' || (rawMem && String(rawMem).trim() !== '-' && String(rawMem).trim() !== '0' && String(rawMem).trim().toLowerCase() !== 'false')) ? 'Member' : '';
                return {
                    ...m,
                    EmployeeID: String(m.EmployeeID || m.id || ''),
                    EmpName: String(m.EmpName || m.name || ''),
                    Group: cleanGroup,
                    Member: memberStatus,
                    member: memberStatus,
                    id: String(m.EmployeeID || m.id || ''),
                    name: String(m.EmpName || m.name || ''),
                    department: cleanGroup,
                    photo: m.photo || '',
                    registered: isReg,
                    isRegistered: isReg,
                    registeredAt: isReg ? (m.registeredAt || null) : null,
                    chosenTeam: (m.chosenTeam && String(m.chosenTeam).trim()) ? String(m.chosenTeam).trim() : null,
                    vote: (m.vote && String(m.vote).trim()) ? String(m.vote).trim() : null,
                    prize: m.prize || null,
                    wonPrize: m.wonPrize || null,
                    prizeTitle: m.prizeTitle || null,
                    hasWon: m.hasWon || null,
                    drawCanceled: Boolean(m.drawCanceled || m.isDisqualified)
                };
            });
        } catch {
            return DEFAULT_MEMBERS;
        }
    }

    saveMembers(members) {
        const normalized = members.map(m => {
            const isReg = (m.registered === true || m.isRegistered === true) ? true : (m.registered === false ? false : null);
            // Clean up heavy originalPhoto if present
            const cleanM = { ...m };
            if (cleanM.originalPhoto && String(cleanM.originalPhoto).length > 2000) {
                delete cleanM.originalPhoto;
            }
            const rawGrp = (m.Group !== undefined && m.Group !== null) ? String(m.Group).trim() : (m.department !== undefined && m.department !== null ? String(m.department).trim() : '');
            const cleanGroup = (rawGrp.toLowerCase() === 'team a') ? '' : rawGrp;
            const rawMem = (m.Member !== undefined && m.Member !== null) ? m.Member : (m.member !== undefined && m.member !== null ? m.member : '');
            const memberStatus = (String(rawMem).trim().toLowerCase() === 'member' || (rawMem && String(rawMem).trim() !== '-' && String(rawMem).trim() !== '0' && String(rawMem).trim().toLowerCase() !== 'false')) ? 'Member' : '';
            return {
                ...cleanM,
                EmployeeID: String(m.EmployeeID || m.id || ''),
                EmpName: String(m.EmpName || m.name || ''),
                Group: cleanGroup,
                Member: memberStatus,
                member: memberStatus,
                id: String(m.EmployeeID || m.id || ''),
                name: String(m.EmpName || m.name || ''),
                department: cleanGroup,
                photo: m.photo || '',
                registered: isReg,
                isRegistered: isReg,
                registeredAt: isReg ? (m.registeredAt || new Date().toISOString()) : null,
                chosenTeam: (m.chosenTeam && String(m.chosenTeam).trim()) ? String(m.chosenTeam).trim() : null,
                vote: (m.vote && String(m.vote).trim()) ? String(m.vote).trim() : null,
                prize: m.prize || null,
                wonPrize: m.wonPrize || null,
                prizeTitle: m.prizeTitle || null,
                hasWon: m.hasWon || null,
                drawCanceled: Boolean(m.drawCanceled || m.isDisqualified)
            };
        });

        try {
            localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(normalized));
        } catch (err) {
            console.warn('[StateManager] saveMembers localStorage QuotaExceededError, executing emergency compression:', err);
            try {
                // Remove unused cache keys
                localStorage.removeItem('crsdg_demo_cleaned');
                localStorage.removeItem('crsdg_demo_cleaned_v2');
                localStorage.removeItem('crsdg_game_state_sync');
            } catch (_) {}

            // Compress heavy base64 strings in members
            const compressed = normalized.map(item => {
                const p = String(item.photo || '');
                if (p.startsWith('data:') && p.length > 20000) {
                    return { ...item, photo: item.photoPath || '' };
                }
                return item;
            });

            try {
                localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(compressed));
            } catch (err2) {
                console.warn('[StateManager] Second save attempt failed, stripping base64 images from localStorage:', err2);
                const minimal = normalized.map(item => {
                    const p = String(item.photo || '');
                    return {
                        ...item,
                        photo: p.startsWith('data:') ? (item.photoPath || '') : p
                    };
                });
                try {
                    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(minimal));
                } catch (err3) {
                    console.error('[StateManager] LocalStorage is full, saving in memory only:', err3);
                }
            }
        }

        this.broadcast({ type: 'MEMBERS_UPDATED', members: normalized });
        this.broadcast({ type: 'PARTICIPANTS_UPDATED', participants: normalized });
    }

    // Alias functions for backward compatibility
    getParticipants() {
        return this.getMembers();
    }

    saveParticipants(participants) {
        this.saveMembers(participants);
    }

    addMember(memberData) {
        const members = this.getMembers();
        const empId = String(memberData.EmployeeID || memberData.id || '').trim();
        const empName = String(memberData.EmpName || memberData.name || '').trim();
        const rawGroup = String(memberData.Group !== undefined ? memberData.Group : (memberData.department || '')).trim();
        const group = (rawGroup.toLowerCase() === 'team a') ? '' : rawGroup;

        if (!empId) return { success: false, message: 'กรุณากรอกรหัสพนักงาน (EmployeeID)' };
        if (!empName) return { success: false, message: 'กรุณากรอกชื่อพนักงาน (EmpName)' };

        if (members.some(m => (m.EmployeeID || m.id) === empId)) {
            return { success: false, message: `รหัสพนักงาน ${empId} มีอยู่ในตาราง crsdg_member แล้ว` };
        }

        const rawMember = memberData.Member !== undefined && memberData.Member !== null ? memberData.Member : (memberData.member !== undefined && memberData.member !== null ? memberData.member : '');
        const memberStatus = (String(rawMember).trim().toLowerCase() === 'member' || (rawMember && String(rawMember).trim() !== '-' && String(rawMember).trim() !== '0' && String(rawMember).trim().toLowerCase() !== 'false')) ? 'Member' : '';

        const isReg = (memberData.registered === true || memberData.isRegistered === true) ? true : (memberData.registered === false ? false : null);
        const newRecord = {
            EmployeeID: empId,
            EmpName: empName,
            Group: group,
            Member: memberStatus,
            member: memberStatus,
            id: empId,
            name: empName,
            department: group,
            photo: memberData.photo || '',
            registered: isReg,
            isRegistered: isReg,
            registeredAt: isReg ? (memberData.registeredAt || new Date().toISOString()) : null,
            chosenTeam: (memberData.chosenTeam && String(memberData.chosenTeam).trim()) ? String(memberData.chosenTeam).trim() : null,
            vote: (memberData.vote && String(memberData.vote).trim()) ? String(memberData.vote).trim() : null,
            prize: memberData.prize || null,
            wonPrize: memberData.wonPrize || null,
            prizeTitle: memberData.prizeTitle || null,
            hasWon: memberData.hasWon || null,
            teamId: memberData.teamId || null,
            isCaptain: !!memberData.isCaptain
        };

        members.push(newRecord);
        this.saveMembers(members);
        return { success: true, message: `บันทึกคุณ ${empName} (${empId}) ลงตาราง crsdg_member เรียบร้อยแล้ว`, member: newRecord };
    }

    updateMember(employeeId, updatedFields) {
        const members = this.getMembers();
        const idx = members.findIndex(m => (m.EmployeeID || m.id) === employeeId);
        if (idx === -1) return { success: false, message: `ไม่พบพนักงานรหัส ${employeeId}` };

        const old = members[idx];
        const newEmpId = String(updatedFields.EmployeeID || updatedFields.id || old.EmployeeID || old.id).trim();
        const newEmpName = String(updatedFields.EmpName || updatedFields.name || old.EmpName || old.name).trim();
        const newGroup = String(updatedFields.Group !== undefined ? updatedFields.Group : (updatedFields.department !== undefined ? updatedFields.department : old.Group)).trim();

        // Check if ID was changed and conflicts with another record
        if (newEmpId !== employeeId && members.some((m, i) => i !== idx && (m.EmployeeID || m.id) === newEmpId)) {
            return { success: false, message: `รหัสพนักงาน ${newEmpId} ซ้ำกับพนักงานท่านอื่นในระบบ` };
        }

        let newMember = old.Member !== undefined ? old.Member : (old.member || '');
        if (updatedFields.Member !== undefined || updatedFields.member !== undefined) {
            const rawM = updatedFields.Member !== undefined ? updatedFields.Member : updatedFields.member;
            newMember = (String(rawM).trim().toLowerCase() === 'member' || (rawM && String(rawM).trim() !== '-' && String(rawM).trim() !== '0' && String(rawM).trim().toLowerCase() !== 'false')) ? 'Member' : '';
        }

        members[idx] = {
            ...old,
            ...updatedFields,
            EmployeeID: newEmpId,
            EmpName: newEmpName,
            Group: newGroup,
            Member: newMember,
            member: newMember,
            id: newEmpId,
            name: newEmpName,
            department: newGroup,
            photo: updatedFields.photo !== undefined ? updatedFields.photo : old.photo
        };

        this.saveMembers(members);
        return { success: true, message: `อัปเดตข้อมูล ${newEmpName} (${newEmpId}) สำเร็จ`, member: members[idx] };
    }

    deleteMember(employeeId) {
        let members = this.getMembers();
        const before = members.length;
        members = members.filter(m => (m.EmployeeID || m.id) !== employeeId);
        if (members.length < before) {
            this.saveMembers(members);
            this.removeMemberFromTeam(employeeId);
            return { success: true, message: `ลบพนักงานรหัส ${employeeId} ออกจากตาราง crsdg_member เรียบร้อยแล้ว` };
        }
        return { success: false, message: `ไม่พบพนักงานรหัส ${employeeId}` };
    }

    clearAllMembers() {
        this.saveMembers([]);
        const teams = this.getTeams().map(t => ({
            ...t,
            captainId: '',
            memberIds: []
        }));
        this.saveTeams(teams);
        return { success: true, message: 'ลบข้อมูลพนักงานทั้งหมดออกจากตาราง crsdg_member เรียบร้อยแล้ว' };
    }

    importMembers(newList, mode = 'append') {
        let current = mode === 'replace' ? [] : this.getMembers();
        const existingMap = new Map();
        current.forEach((m, idx) => existingMap.set(m.EmployeeID || m.id, idx));

        // If mode === 'replace', clear all winners
        if (mode === 'replace') {
            this.saveWinners([]);
        }

        let addedCount = 0;
        let updatedCount = 0;
        const importedEmpIds = new Set();

        newList.forEach(item => {
            const empId = String(item.EmployeeID || item.id || '').trim();
            const empName = String(item.EmpName || item.name || '').trim();
            const rawGroup = item.Group !== undefined && item.Group !== null ? item.Group : (item.group !== undefined && item.group !== null ? item.group : (item.department || ''));
            const group = String(rawGroup || '').trim();
            const cleanGroup = (group.toLowerCase() === 'team a') ? '' : group;

            const rawMem = item.Member !== undefined && item.Member !== null ? item.Member : (item.member !== undefined && item.member !== null ? item.member : '');
            const memberStatus = (String(rawMem).trim().toLowerCase() === 'member' || (rawMem && String(rawMem).trim() !== '-' && String(rawMem).trim() !== '0' && String(rawMem).trim().toLowerCase() !== 'false')) ? 'Member' : '';

            if (empId && empName) {
                importedEmpIds.add(empId);
                // Requirement:
                // - registered = null, isRegistered = null, registeredAt = null
                // - chosenTeam = null, vote = null
                // - prize = null, wonPrize = null, prizeTitle = null, hasWon = null
                const record = {
                    EmployeeID: empId,
                    EmpName: empName,
                    Group: cleanGroup,
                    Member: memberStatus,
                    member: memberStatus,
                    id: empId,
                    name: empName,
                    department: cleanGroup,
                    photo: item.photo || '',
                    registered: null,
                    isRegistered: null,
                    registeredAt: null,
                    chosenTeam: null,
                    vote: null,
                    prize: null,
                    wonPrize: null,
                    prizeTitle: null,
                    hasWon: null
                };

                if (existingMap.has(empId)) {
                    const idx = existingMap.get(empId);
                    const prev = current[idx];
                    const prevMember = prev.Member !== undefined ? prev.Member : (prev.member || '');
                    const finalMember = (item.Member !== undefined || item.member !== undefined) ? memberStatus : prevMember;
                    current[idx] = {
                        ...prev,
                        ...record,
                        Member: finalMember,
                        member: finalMember,
                        photo: record.photo || prev.photo || '',
                        registered: null,
                        isRegistered: null,
                        registeredAt: null,
                        chosenTeam: null,
                        vote: null,
                        prize: null,
                        wonPrize: null,
                        prizeTitle: null,
                        hasWon: null
                    };
                    updatedCount++;
                } else {
                    current.push(record);
                    existingMap.set(empId, current.length - 1);
                    addedCount++;
                }
            }
        });

        // Also clean up any winners in crsdg_winners for the imported employee IDs (since prize is null)
        if (importedEmpIds.size > 0 && mode !== 'replace') {
            const winners = this.getWinners();
            const filteredWinners = winners.filter(w => {
                const wId = String(w.participant?.id || w.participantId || w.memberId || '').trim();
                return !importedEmpIds.has(wId);
            });
            if (filteredWinners.length !== winners.length) {
                this.saveWinners(filteredWinners);
            }
        }

        this.saveMembers(current);
        return { success: true, addedCount, updatedCount, total: current.length };
    }

    getWinners() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.WINNERS);
            let parsed = [];
            if (raw) {
                try {
                    const tmp = JSON.parse(raw);
                    if (Array.isArray(tmp)) parsed = tmp;
                } catch (e) {}
            }

            // Sync with crsdg_member: include any members with hasWon or wonPrize
            const members = this.getMembers();
            const existingEmpIds = new Set(parsed.map(w => String(w.empId || (w.participant && w.participant.id) || w.EmployeeID || '').trim()));

            members.forEach(m => {
                const empId = String(m.EmployeeID || m.id || '').trim();
                const hasWon = m.hasWon === true || !!m.wonPrize || !!m.prizeTitle || !!m.prizeResult;
                if (empId && hasWon && !existingEmpIds.has(empId)) {
                    parsed.push({
                        id: 'win_mem_' + empId,
                        orderNo: parsed.length + 1,
                        empId: empId,
                        empName: m.EmpName || m.name || '',
                        position: m.EmpPosition || m.position || '-',
                        department: m.Group || m.department || '-',
                        branch: m.EmpBranch || m.branch || '-',
                        zone: m.EmpZone || m.zone || '-',
                        prizeId: m.prizeId || '',
                        prizeTitle: m.wonPrize || m.prizeTitle || m.prizeResult || 'Lucky Draw',
                        sponsorName: m.sponsorName || '',
                        wonAt: m.wonAt || new Date().toISOString(),
                        delivered: m.delivered === true
                    });
                    existingEmpIds.add(empId);
                }
            });

            return parsed.map((w, idx) => {
                const empId = String(w.empId || (w.participant && w.participant.id) || w.EmployeeID || '').trim();
                const empName = String(w.empName || (w.participant && w.participant.name) || w.EmpName || '').trim();
                const department = String(w.department || (w.participant && w.participant.department) || w.Group || '-').trim();
                const prizeTitle = String(w.prizeTitle || (w.prize && w.prize.title) || '-').trim();
                return {
                    id: w.id || ('win_' + idx),
                    orderNo: typeof w.orderNo === 'number' ? w.orderNo : (idx + 1),
                    empId: empId,
                    empName: empName,
                    position: w.position || '-',
                    department: department,
                    branch: w.branch || '-',
                    zone: w.zone || '-',
                    prizeId: w.prizeId || (w.prize && w.prize.id) || '',
                    prizeTitle: prizeTitle,
                    sponsorName: w.sponsorName || (w.prize && (w.prize.sponsorName || w.prize.sponsor)) || '',
                    wonAt: w.wonAt || new Date().toISOString(),
                    delivered: w.delivered === true,
                    // Backward-compat aliases
                    participant: {
                        id: empId,
                        name: empName,
                        department: department
                    },
                    prize: {
                        id: w.prizeId || (w.prize && w.prize.id) || '',
                        title: prizeTitle,
                        category: w.group || 'Management',
                        icon: w.icon || '🎁'
                    }
                };
            });
        } catch {
            return [];
        }
    }

    saveWinners(winners) {
        localStorage.setItem(STORAGE_KEYS.WINNERS, JSON.stringify(winners));
        this.broadcast({ type: 'WINNERS_UPDATED', winners });
    }

    getCurrentPrize() {
        const prizes = this.getPrizes();
        const curId = localStorage.getItem(STORAGE_KEYS.CURRENT_PRIZE_ID);
        const found = prizes.find(p => p.id === curId);
        return found || prizes[0] || null;
    }

    setCurrentPrize(prizeId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_PRIZE_ID, prizeId);
        this.broadcast({ type: 'PRIZE_SELECTED', prizeId });
    }

    // ========================================================
    // CANCELED DRAWS (บันทึกรายชื่อผู้ที่สุ่มได้แล้วถูกยกเลิก/สุ่มใหม่ เพื่อไม่ให้สุ่มซ้ำ)
    // ========================================================
    getCanceledDrawEmpIds() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.CANCELED_DRAWS || 'crsdg_canceled_draw_ids');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(id => String(id).trim()) : [];
        } catch {
            return [];
        }
    }

    addCanceledDrawEmpId(empId) {
        if (!empId) return;
        const sId = String(empId).trim();
        const list = this.getCanceledDrawEmpIds();
        if (!list.some(x => x.toLowerCase() === sId.toLowerCase())) {
            list.push(sId);
            localStorage.setItem(STORAGE_KEYS.CANCELED_DRAWS || 'crsdg_canceled_draw_ids', JSON.stringify(list));
            this.broadcast({ type: 'CANCELED_DRAWS_UPDATED', canceledEmpIds: list });
        }
        // เอาค่าในฟิวด์ Member ออกตามเงื่อนไข
        const members = this.getMembers();
        const normalize = id => String(id || '').trim().replace(/^0+/, '');
        const targetMember = members.find(m => {
            const mId = normalize(m.EmployeeID || m.id);
            const wId = normalize(sId);
            return (mId && wId && mId === wId) || String(m.EmployeeID || m.id || '').trim() === sId;
        });
        if (targetMember && (targetMember.Member || targetMember.member)) {
            targetMember.Member = '';
            targetMember.member = '';
            targetMember.drawCanceled = true;
            this.saveMembers(members);
            if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.saveMember === 'function') {
                FirebaseSync.saveMember(targetMember).catch(() => {});
            }
        }
    }

    removeCanceledDrawEmpId(empId) {
        if (!empId) return;
        const sId = String(empId).trim().toLowerCase();
        const list = this.getCanceledDrawEmpIds().filter(x => x.toLowerCase() !== sId);
        localStorage.setItem(STORAGE_KEYS.CANCELED_DRAWS || 'crsdg_canceled_draw_ids', JSON.stringify(list));
        this.broadcast({ type: 'CANCELED_DRAWS_UPDATED', canceledEmpIds: list });
    }

    resetCanceledDrawEmpIds() {
        localStorage.removeItem(STORAGE_KEYS.CANCELED_DRAWS || 'crsdg_canceled_draw_ids');
        this.broadcast({ type: 'CANCELED_DRAWS_UPDATED', canceledEmpIds: [] });
    }

    getEligibleParticipants() {
        const members = this.getMembers();
        const winners = this.getWinners();
        const winnerEmpIds = new Set(
            winners.map(w => String(w.empId || (w.participant && w.participant.id) || '').trim().toLowerCase())
        );
        const canceledEmpIds = new Set(
            this.getCanceledDrawEmpIds().map(id => String(id).trim().toLowerCase())
        );

        return members.filter(m => {
            // 1. เงื่อนไข: พนักงานต้องมีรหัสพนักงาน (EmployeeID) และชื่อ-นามสกุล (EmpName) ครบถ้วน
            const empId = String(m.EmployeeID || m.id || '').trim();
            const empName = String(m.EmpName || m.name || '').trim();
            if (!empId || !empName) return false;

            const empIdLower = empId.toLowerCase();

            // 2. เงื่อนไข: ฟิวด์ Member ต้องมีข้อความ (ต้องไม่เป็นค่าว่าง และต้องมีสถานะเป็น Member)
            const rawMember = m.Member !== undefined && m.Member !== null ? m.Member : (m.member !== undefined && m.member !== null ? m.member : '');
            const memberStr = String(rawMember || '').trim();
            if (!memberStr) return false;
            const lowerMember = memberStr.toLowerCase();
            if (lowerMember === 'null' || lowerMember === 'undefined' || lowerMember === '-' || lowerMember === 'none' || lowerMember === 'false' || lowerMember === '0') {
                return false;
            }

            // 3. เงื่อนไขสถานะการได้รับรางวัล: ต้อง ยังไม่เคยได้รับรางวัลใดๆ มาก่อน (hasWon !== true, wonPrize == null และไม่อยู่ในรายการผู้ชนะเดิม)
            if (winnerEmpIds.has(empIdLower) || m.hasWon === true || !!m.wonPrize || !!m.prize || !!m.prizeTitle || !!m.prizeResult) {
                return false;
            }

            // 4. เงื่อนไขผู้สละสิทธิ์/ถูกยกเลิก: หากพนักงานท่านใดเคยถูกสุ่มได้แต่กดสละสิทธิ์หรือกดยกเลิก ระบบจะตัดออกทันทีเพื่อไม่ให้สุ่มซ้ำ
            if (canceledEmpIds.has(empIdLower) || m.drawCanceled === true || m.isDisqualified === true) {
                return false;
            }

            return true;
        });
    }

    recordWinner(prize, employee, isDelivered = false) {
        const winners = this.getWinners();
        const empId = String(employee.EmployeeID || employee.id || '').trim();
        const empName = String(employee.EmpName || employee.name || '').trim();
        const department = String(employee.Group || employee.department || '-').trim();
        const position = String(employee.EmpPosition || employee.position || '-').trim();
        const branch = String(employee.EmpBranch || employee.branch || '-').trim();
        const zone = String(employee.EmpZone || employee.zone || '-').trim();

        const newRecord = {
            id: 'win_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            orderNo: winners.length + 1,
            empId: empId,
            empName: empName,
            position: position,
            department: department,
            branch: branch,
            zone: zone,
            prizeId: prize.id,
            prizeTitle: prize.title,
            sponsorName: prize.sponsorName || prize.sponsor || '',
            wonAt: new Date().toISOString(),
            delivered: !!isDelivered,
            participant: {
                id: empId,
                name: empName,
                department: department
            },
            prize: {
                id: prize.id,
                title: prize.title,
                category: prize.group || 'Management',
                icon: prize.icon || '🎁'
            }
        };

        winners.unshift(newRecord);
        winners.forEach((w, i) => { w.orderNo = winners.length - i; });
        this.saveWinners(winners);

        // Update drawn count in prize
        const prizes = this.getPrizes();
        const targetPrize = prizes.find(p => p.id === prize.id);
        if (targetPrize) {
            targetPrize.drawn = (targetPrize.drawn || 0) + 1;
            this.savePrizes(prizes);
        }

        // Update member record in crsdg_member
        const members = this.getMembers();
        const normalize = id => String(id || '').trim().replace(/^0+/, '');
        const targetMember = members.find(m => {
            const mId = normalize(m.EmployeeID || m.id);
            const wId = normalize(empId);
            return (mId && wId && mId === wId) || String(m.EmployeeID || m.id || '').trim() === empId;
        });
        if (targetMember) {
            targetMember.hasWon = true;
            targetMember.wonPrize = prize.title || prize.name || 'Lucky Draw';
            targetMember.prizeTitle = prize.title || prize.name || 'Lucky Draw';
            targetMember.prizeResult = prize.title || prize.name || 'Lucky Draw';
            targetMember.prizeGroup = prize.group || 'Management';
            targetMember.wonAt = newRecord.wonAt;
            this.saveMembers(members);
            if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.saveMember === 'function') {
                FirebaseSync.saveMember(targetMember).catch(() => {});
            }
        }

        // Cloud sync winner
        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.saveWinner === 'function') {
            FirebaseSync.saveWinner(newRecord).catch(() => {});
        }

        this.broadcast({ type: 'WINNER_RECORDED', winner: newRecord });
        this.broadcast({ type: 'WINNERS_UPDATED', winners });
        this.broadcast({ type: 'MEMBERS_UPDATED', members });
        return newRecord;
    }

    toggleWinnerDelivered(winnerId) {
        const winners = this.getWinners();
        const winner = winners.find(w => w.id === winnerId);
        if (!winner) return false;
        winner.delivered = !winner.delivered;
        this.saveWinners(winners);
        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.saveWinner === 'function') {
            FirebaseSync.saveWinner(winner).catch(() => {});
        }
        this.broadcast({ type: 'WINNER_DELIVERY_TOGGLED', winnerId, delivered: winner.delivered });
        return winner.delivered;
    }

    deleteWinner(winnerId) {
        const winners = this.getWinners();
        const target = winners.find(w => w.id === winnerId);
        if (!target) return false;

        const newWinners = winners.filter(w => w.id !== winnerId);
        newWinners.forEach((w, i) => { w.orderNo = newWinners.length - i; });
        this.saveWinners(newWinners);

        // Decrement prize drawn count
        if (target.prizeId) {
            const prizes = this.getPrizes();
            const targetPrize = prizes.find(p => p.id === target.prizeId);
            if (targetPrize && targetPrize.drawn > 0) {
                targetPrize.drawn = Math.max(0, targetPrize.drawn - 1);
                this.savePrizes(prizes);
            }
        }

        // Clear member win status in crsdg_member
        if (target.empId) {
            const empIdStr = String(target.empId).trim();
            // บันทึกรหัสพนักงานลงในรายการ Canceled Draws เพื่อป้องกันการสุ่มซ้ำตามเงื่อนไขที่กำหนด
            this.addCanceledDrawEmpId(empIdStr);

            const members = this.getMembers();
            const normalize = id => String(id || '').trim().replace(/^0+/, '');
            const member = members.find(m => {
                const mId = normalize(m.EmployeeID || m.id);
                const wId = normalize(target.empId);
                return (mId && wId && mId === wId) || String(m.EmployeeID || m.id || '').trim() === empIdStr;
            });
            if (member) {
                member.hasWon = false;
                member.wonPrize = null;
                member.prizeTitle = null;
                member.prizeResult = null;
                member.prizeGroup = null;
                member.wonAt = null;
                member.drawCanceled = true;
                member.Member = '';
                member.member = '';
                this.saveMembers(members);
                if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.saveMember === 'function') {
                    FirebaseSync.saveMember(member).catch(() => {});
                }
            }
        }

        if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.deleteWinner === 'function') {
            FirebaseSync.deleteWinner(winnerId).catch(() => {});
        }

        this.broadcast({ type: 'WINNER_DELETED', winnerId });
        this.broadcast({ type: 'MEMBERS_UPDATED' });
        return true;
    }

    async resetWinners() {
        this.saveWinners([]);
        this.resetCanceledDrawEmpIds();
        const prizes = this.getPrizes().map(p => ({ ...p, drawn: 0 }));
        this.savePrizes(prizes);

        const members = this.getMembers().map(m => ({
            ...m,
            hasWon: false,
            wonPrize: null,
            prizeTitle: null,
            prizeResult: null,
            prizeGroup: null,
            wonAt: null,
            drawCanceled: false
        }));
        this.saveMembers(members);

        if (typeof FirebaseSync !== 'undefined') {
            try {
                if (typeof FirebaseSync.clearAllWinnersFromCloud === 'function') {
                    await FirebaseSync.clearAllWinnersFromCloud();
                }
                if (typeof FirebaseSync.resetAllMemberWinnerStatusesInCloud === 'function') {
                    await FirebaseSync.resetAllMemberWinnerStatusesInCloud();
                }
                if (typeof FirebaseSync.syncAllPrizes === 'function') {
                    await FirebaseSync.syncAllPrizes(prizes);
                }
            } catch (err) {
                console.warn('[State] Error syncing winner reset to cloud:', err);
            }
        }

        this.broadcast({ type: 'WINNERS_RESET' });
        this.broadcast({ type: 'MEMBERS_UPDATED', members });
        this.broadcast({ type: 'PRIZES_UPDATED', prizes });
    }

    // ========================================================
    // REGISTRATION RESET (crsdg_member)
    // ========================================================
    resetAllRegistrations() {
        const members = this.getMembers().map(m => ({
            ...m,
            registered: null,
            isRegistered: null,
            registeredAt: null
        }));
        this.saveMembers(members);
        // การรีเซ็ตการลงทะเบียน (crsdg_member) จะไม่รีเซ็ตเงินโหวตหรือเงินลงทุนของทีม (แยกการทำงานโดยเด็ดขาด)
        return { success: true, message: `รีเซ็ตสถานะการลงทะเบียนของพนักงานทั้งหมด ${members.length} ท่านเรียบร้อยแล้ว` };
    }

    resetAllMemberVotes() {
        const members = this.getMembers().map(m => ({
            ...m,
            chosenTeam: null,
            vote: null
        }));
        this.saveMembers(members);
        try {
            localStorage.removeItem('crsdg_vote_drawn_winners');
        } catch (e) {}
        this.broadcast({ type: 'ALL_MEMBER_VOTES_RESET' });
        return { success: true, count: members.length };
    }

    // ========================================================
    // CLOUD INTEGRATION (crsdg_member Sync from Firebase)
    // ========================================================
    applyCloudMembers(cloudMembers) {
        if (!Array.isArray(cloudMembers)) return;
        const validCloudMembers = cloudMembers.filter(m => m && String(m.EmployeeID || m.id || '').trim() && String(m.EmpName || m.name || '').trim());
        if (validCloudMembers.length === 0) return;

        const current = this.getMembers();
        const currentMap = new Map();
        current.forEach(m => currentMap.set(String(m.EmployeeID || m.id).trim(), m));

        let hasChange = false;
        const merged = validCloudMembers.map(cm => {
            const cId = String(cm.EmployeeID || cm.id).trim();
            const local = currentMap.get(cId);

            const isReg = (cm.registered === true || cm.isRegistered === true) ? true : (cm.registered === false ? false : null);
            const regAt = isReg ? (cm.registeredAt || (local && local.registeredAt) || null) : null;
            const chosen = (cm.chosenTeam && String(cm.chosenTeam).trim()) ? String(cm.chosenTeam).trim() : null;
            const photo = cm.photo || (local && local.photo) || '';

            const cloudHasWon = (cm.hasWon === true) ? true : null;
            const cloudWonPrize = cm.wonPrize ? String(cm.wonPrize).trim() : null;
            const cloudPrizeTitle = cm.prizeTitle ? String(cm.prizeTitle).trim() : null;
            const cloudPrize = cm.prize ? cm.prize : null;
            const rawMem = (cm.Member !== undefined && cm.Member !== null) ? cm.Member : (cm.member !== undefined && cm.member !== null ? cm.member : (local ? (local.Member || local.member) : ''));
            const memberStatus = (String(rawMem).trim().toLowerCase() === 'member' || (rawMem && String(rawMem).trim() !== '-' && String(rawMem).trim() !== '0' && String(rawMem).trim().toLowerCase() !== 'false')) ? 'Member' : '';

            if (!local || local.registered !== isReg || local.registeredAt !== regAt || local.chosenTeam !== chosen || local.hasWon !== cloudHasWon || local.wonPrize !== cloudWonPrize || (local.Member || '') !== memberStatus) {
                hasChange = true;
            }

            return {
                ...(local || {}),
                EmployeeID: cId,
                EmpName: String(cm.EmpName || cm.name || '').trim(),
                Group: String(cm.Group || cm.department || 'Team A').trim(),
                Member: memberStatus,
                member: memberStatus,
                id: cId,
                name: String(cm.EmpName || cm.name || '').trim(),
                department: String(cm.Group || cm.department || 'Team A').trim(),
                photo: photo,
                registered: isReg,
                isRegistered: isReg,
                registeredAt: regAt,
                chosenTeam: chosen,
                vote: (cm.vote && String(cm.vote).trim()) ? String(cm.vote).trim() : null,
                prize: cloudPrize,
                wonPrize: cloudWonPrize,
                prizeTitle: cloudPrizeTitle,
                hasWon: cloudHasWon
            };
        });

        if (hasChange || current.length !== merged.length) {
            this.saveMembers(merged);
        }
    }

    applyCloudTeamNames(cloudTeamNames) {
        if (!Array.isArray(cloudTeamNames) || cloudTeamNames.length === 0) return;
        const valid = cloudTeamNames.map(t => ({
            id: String(t.id || '').trim(),
            name: String(t.name || '').trim(),
            department: String(t.department || '').trim(),
            color: t.color || '#3b82f6',
            status: t.status || 'online'
        })).filter(t => t.id && t.name);
        if (valid.length === 0) return;
        localStorage.setItem(STORAGE_KEYS.NAMETEAM, JSON.stringify(valid));
        this.syncParticipantTeamRoles();
        this.broadcast({ type: 'TEAMS_UPDATED', teams: this.getTeams() });
    }

    applyCloudTeamsTable(cloudTeams) {
        if (!Array.isArray(cloudTeams) || cloudTeams.length === 0) return;
        const valid = cloudTeams.map(t => ({
            teamId: String(t.teamId || t.id || '').trim(),
            captainId: String(t.captainId || '').trim(),
            memberIds: Array.isArray(t.memberIds) ? t.memberIds : []
        })).filter(t => t.teamId);
        if (valid.length === 0) return;
        localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(valid));
        this.syncParticipantTeamRoles();
        this.broadcast({ type: 'TEAMS_UPDATED', teams: this.getTeams() });
    }

    applyCloudPlayers(cloudPlayers) {
        if (!Array.isArray(cloudPlayers) || cloudPlayers.length === 0) return;
        const valid = cloudPlayers.map(p => ({
            id: String(p.id || '').trim(),
            orderNo: parseInt(p.orderNo, 10) || 1,
            teamName: String(p.teamName || p.name || '').trim(),
            description: String(p.description || '').trim(),
            teamPhoto: p.teamPhoto || p.photo || '',
            photo: p.teamPhoto || p.photo || '',
            voteAmount: parseFloat(p.voteAmount || 0) || 0,
            voterCount: parseInt(p.voterCount || 0, 10) || 0,
            voteStatus: p.voteStatus || 'closed',
            members: Array.isArray(p.members) ? p.members : [],
            updatedAt: p.updatedAt || new Date().toISOString()
        })).filter(p => p.id && p.teamName);
        if (valid.length === 0) return;

        const current = this.getPlayers();
        const currentMap = new Map();
        current.forEach(p => currentMap.set(p.id, p));

        const merged = valid.map(cp => {
            const local = currentMap.get(cp.id);
            if (!local) return cp;
            const localTime = new Date(local.updatedAt || 0).getTime();
            const cloudTime = new Date(cp.updatedAt || 0).getTime();
            // ป้องกัน race condition: ถ้าสถานะในเครื่องเพิ่งถูกคลิกแก้ไขใหม่กว่า snapshot เก่าจาก Cloud
            // ให้ยึดสถานะในเครื่องไว้ ไม่ให้ Cloud ย้อนกลับไปเป็นสถานะเดิม
            if (localTime > cloudTime && local.voteStatus) {
                return {
                    ...cp,
                    voteStatus: local.voteStatus,
                    voteAmount: local.voteAmount,
                    voterCount: local.voterCount,
                    updatedAt: local.updatedAt
                };
            }
            return cp;
        });

        try {
            localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(merged));
        } catch (e) {
            console.warn('[State] LocalStorage write player notice:', e);
        }
        this.broadcast({ type: 'PLAYERS_UPDATED', players: merged });
    }

    applyCloudQuizzes(cloudQuizzes) {
        if (!Array.isArray(cloudQuizzes) || cloudQuizzes.length === 0) return;
        const valid = cloudQuizzes.map(q => ({
            id: String(q.id || '').trim(),
            title: String(q.title || '').trim(),
            score: parseInt(q.score, 10) || 100,
            maxAnswers: parseInt(q.maxAnswers, 10) || 4,
            answers: Array.isArray(q.answers) ? q.answers : []
        })).filter(q => q.id && q.title);
        if (valid.length === 0) return;
        localStorage.setItem(STORAGE_KEYS.QUIZ, JSON.stringify(valid));
        this.broadcast({ type: 'QUIZZES_UPDATED', quizzes: valid });
    }

    applyCloudEvaluations(cloudEvals) {
        if (!Array.isArray(cloudEvals)) return;
        if (cloudEvals.length === 0) {
            localStorage.setItem(STORAGE_KEYS.EVALUATIONS || 'crsdg_evaluations', '[]');
            localStorage.setItem('crsdg_evaluations_list', '[]');
            this.broadcast({ type: 'EVALUATIONS_UPDATED', evaluations: [] });
            return;
        }
        const valid = cloudEvals.map(e => ({
            id: String(e.id || '').trim(),
            empId: String(e.empId || 'guest').trim(),
            empName: String(e.empName || 'ผู้ร่วมกิจกรรม').trim(),
            department: String(e.department || '-').trim(),
            overallScore: parseInt(e.overallScore, 10) || 5,
            ratings: e.ratings || {},
            tags: Array.isArray(e.tags) ? e.tags : [],
            feedback: String(e.feedback || e.comment || '').trim(),
            submittedAt: e.submittedAt || e.createdAt || new Date().toISOString()
        })).filter(e => e.id);
        localStorage.setItem(STORAGE_KEYS.EVALUATIONS || 'crsdg_evaluations', JSON.stringify(valid));
        localStorage.setItem('crsdg_evaluations_list', JSON.stringify(valid));
        this.broadcast({ type: 'EVALUATIONS_UPDATED', evaluations: valid });
    }

    applyCloudPrizes(prizes) {
        if (!Array.isArray(prizes) || prizes.length === 0) return;
        localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
        this.notifyListeners({ type: 'PRIZES_UPDATED', prizes });
    }

    applyCloudWinners(winners) {
        if (!Array.isArray(winners)) return;
        localStorage.setItem(STORAGE_KEYS.WINNERS, JSON.stringify(winners));
        this.notifyListeners({ type: 'WINNERS_UPDATED', winners });
    }

    applyCloudVoteSettings(settings) {
        if (!settings || typeof settings !== 'object') return;
        if (settings.vote_open !== undefined) {
            localStorage.setItem('crsdg_vote_open', String(Boolean(settings.vote_open)));
        }
        if (settings.game_vote_open !== undefined) {
            localStorage.setItem('crsdg_game_vote_open', String(Boolean(settings.game_vote_open)));
        }
        if (settings.vote_budget !== undefined) {
            localStorage.setItem('crsdg_vote_budget', String(settings.vote_budget));
        }
        if (settings.eval_open !== undefined) {
            localStorage.setItem('crsdg_eval_open', String(Boolean(settings.eval_open)));
            this.broadcast({ type: 'EVAL_STATUS_UPDATED', isOpen: Boolean(settings.eval_open) });
        }
        if (settings.game_btn_open !== undefined) {
            localStorage.setItem('crsdg_game_btn_open', String(Boolean(settings.game_btn_open)));
            this.broadcast({ type: 'GAME_BTN_STATUS_UPDATED', isOpen: Boolean(settings.game_btn_open) });
        }
        // ตรวจสอบการเปิดรับการลงทุนของทีมล่าสุด เพื่อแจ้งเตือน Lightbox ไปยังทุกหน้าจอผ่าน Cloud Realtime (ไม่ยิงซ้ำถ้าเคยแจ้งเตือน timestamp นี้ไปแล้ว)
        if (settings.last_opened_team && typeof settings.last_opened_team === 'object') {
            const opTeam = settings.last_opened_team;
            const now = Date.now();
            const lastTs = parseInt(localStorage.getItem('crsdg_last_broadcast_opened_ts') || '0', 10);
            if (opTeam.timestamp && (now - opTeam.timestamp < 60000) && (opTeam.timestamp > lastTs)) {
                localStorage.setItem('crsdg_last_broadcast_opened_ts', String(opTeam.timestamp));
                this.broadcast({
                    type: 'TEAM_INVESTMENT_OPENED',
                    ...opTeam
                });
                try {
                    localStorage.setItem('crsdg_team_investment_opened_event', JSON.stringify(opTeam));
                } catch (e) {}
            }
        }
        // ตรวจสอบสัญญาณการ Reset เงินโหวตจากแอดมิน (Timestamp-based reset sync)
        if (settings.reset_votes_timestamp) {
            const resetTs = parseInt(settings.reset_votes_timestamp, 10) || 0;
            const localResetTs = parseInt(localStorage.getItem('crsdg_last_reset_votes_ts') || '0', 10);
            if (resetTs > localResetTs) {
                localStorage.setItem('crsdg_last_reset_votes_ts', String(resetTs));
                localStorage.setItem('crsdg_all_user_investments', '{}');
                this.recalculatePlayerTeamVoteTotals();
                this.broadcast({ type: 'INVESTMENTS_RESET', reset: true, timestamp: resetTs });
                this.broadcast({ type: 'INVESTMENTS_UPDATED', investments: {}, reset: true, timestamp: resetTs });
                this.broadcast({ type: 'PLAYERS_UPDATED', players: this.getPlayers() });
            }
        }
        this.broadcast({ type: 'VOTE_STATUS_UPDATED', isOpen: this.isVoteOpen() });
        this.broadcast({ type: 'GAME_VOTE_STATUS_UPDATED', isOpen: this.isGameVoteOpen() });
    }

    applyCloudUserInvestments(cloudUserInv) {
        if (!cloudUserInv || typeof cloudUserInv !== 'object') return;
        try {
            const keys = Object.keys(cloudUserInv);
            if (keys.length > 0) {
                const current = this.getAllUserInvestments();
                const merged = { ...current, ...cloudUserInv };
                // บันทึกเงินลงทุนรวมจาก crsdg_vote ลงใน localStorage
                localStorage.setItem('crsdg_all_user_investments', JSON.stringify(merged));
                this.recalculatePlayerTeamVoteTotals(true);
                this.broadcast({ type: 'INVESTMENTS_UPDATED', investments: merged, reset: false });
                this.broadcast({ type: 'PLAYERS_UPDATED', players: this.getPlayers() });
            }
        } catch (e) {
            console.warn('[State] applyCloudUserInvestments notice:', e);
        }
    }

    applyCloudData(cloudData) {
        if (!cloudData || typeof cloudData !== 'object') return;
        if (cloudData.members) this.applyCloudMembers(cloudData.members);
        if (cloudData.teamNames) this.applyCloudTeamNames(cloudData.teamNames);
        if (cloudData.teams) this.applyCloudTeamsTable(cloudData.teams);
        if (cloudData.players) this.applyCloudPlayers(cloudData.players);
        if (cloudData.quizzes) this.applyCloudQuizzes(cloudData.quizzes);
        if (cloudData.evaluations) this.applyCloudEvaluations(cloudData.evaluations);
        if (cloudData.voteSettings) this.applyCloudVoteSettings(cloudData.voteSettings);
        if (cloudData.userInvestments) this.applyCloudUserInvestments(cloudData.userInvestments);
        if (cloudData.prizes) this.applyCloudPrizes(cloudData.prizes);
        if (cloudData.winners) this.applyCloudWinners(cloudData.winners);
    }

    // ========================================================
    // QUIZ MANAGEMENT (crsdg_quiz)
    // ========================================================
    getQuizzes() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.QUIZ);
            if (!raw) return DEFAULT_QUIZZES;
            return JSON.parse(raw);
        } catch {
            return DEFAULT_QUIZZES;
        }
    }

    saveQuizzes(quizzes) {
        localStorage.setItem(STORAGE_KEYS.QUIZ, JSON.stringify(quizzes));
        this.broadcast({ type: 'QUIZZES_UPDATED', quizzes });
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.syncAllQuizzes === 'function') {
            window.FirebaseSync.syncAllQuizzes(quizzes).catch(e => console.warn('[State] Cloud quizzes sync notice:', e));
        }
    }

    addQuiz(quizData) {
        const quizzes = this.getQuizzes();
        const newId = 'quiz_' + Date.now();
        const newQuiz = {
            id: newId,
            title: String(quizData.title || 'คำถามใหม่').trim(),
            score: parseInt(quizData.score, 10) || 100,
            maxAnswers: parseInt(quizData.maxAnswers, 10) || 4,
            answers: Array.isArray(quizData.answers) ? quizData.answers : []
        };
        quizzes.push(newQuiz);
        this.saveQuizzes(quizzes);
        return { success: true, message: `เพิ่มข้อคำถาม "${newQuiz.title}" ลงตาราง crsdg_quiz สำเร็จ`, quiz: newQuiz };
    }

    updateQuiz(quizId, updatedData) {
        const quizzes = this.getQuizzes();
        const idx = quizzes.findIndex(q => q.id === quizId);
        if (idx === -1) return { success: false, message: 'ไม่พบข้อคำถามที่ต้องการแก้ไข' };

        quizzes[idx] = {
            ...quizzes[idx],
            title: updatedData.title !== undefined ? String(updatedData.title).trim() : quizzes[idx].title,
            score: updatedData.score !== undefined ? parseInt(updatedData.score, 10) : quizzes[idx].score,
            maxAnswers: updatedData.maxAnswers !== undefined ? parseInt(updatedData.maxAnswers, 10) : quizzes[idx].maxAnswers,
            answers: Array.isArray(updatedData.answers) ? updatedData.answers : quizzes[idx].answers
        };

        this.saveQuizzes(quizzes);
        return { success: true, message: `อัปเดตข้อคำถาม "${quizzes[idx].title}" สำเร็จ`, quiz: quizzes[idx] };
    }

    deleteQuiz(quizId) {
        let quizzes = this.getQuizzes();
        const before = quizzes.length;
        quizzes = quizzes.filter(q => q.id !== quizId);
        if (quizzes.length < before) {
            this.saveQuizzes(quizzes);
            if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.deleteQuiz === 'function') {
                window.FirebaseSync.deleteQuiz(quizId);
            }
            return { success: true, message: 'ลบข้อคำถามออกจากตาราง crsdg_quiz เรียบร้อยแล้ว' };
        }
        return { success: false, message: 'ไม่พบข้อคำถามที่ต้องการลบ' };
    }

    // ========================================================
    // VOTING & INVESTMENT SETTINGS (crsdg_vote_open, crsdg_vote_budget, crsdg_all_user_investments)
    // ========================================================
    syncVoteSettingsToCloud() {
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.saveVoteSettings === 'function') {
            window.FirebaseSync.saveVoteSettings({
                vote_open: this.isVoteOpen(),
                game_vote_open: this.isGameVoteOpen(),
                vote_budget: this.getVoteBudget(),
                eval_open: this.isEvalOpen(),
                game_btn_open: this.isGameButtonOpen(),
                updatedAt: new Date().toISOString()
            }).catch(e => console.warn('[State] Cloud voteSettings sync notice:', e));
        }
    }

    // ========================================================
    // EVALUATION BOX TOGGLE (crsdg_eval_open - index.html)
    // ========================================================
    isEvalOpen() {
        try {
            const raw = localStorage.getItem('crsdg_eval_open');
            if (raw === null) return true; // Default open
            return raw === 'true';
        } catch {
            return true;
        }
    }

    setEvalOpen(isOpen) {
        localStorage.setItem('crsdg_eval_open', String(Boolean(isOpen)));
        this.broadcast({ type: 'EVAL_STATUS_UPDATED', isOpen: Boolean(isOpen) });
        this.syncVoteSettingsToCloud();
        return { success: true, isOpen: Boolean(isOpen) };
    }

    // ========================================================
    // GAME 4v4 BUTTON TOGGLE (crsdg_game_btn_open - index.html)
    // ========================================================
    isGameButtonOpen() {
        try {
            const raw = localStorage.getItem('crsdg_game_btn_open');
            if (raw === null) return true; // Default open
            return raw === 'true';
        } catch {
            return true;
        }
    }

    setGameButtonOpen(isOpen) {
        localStorage.setItem('crsdg_game_btn_open', String(Boolean(isOpen)));
        this.broadcast({ type: 'GAME_BTN_STATUS_UPDATED', isOpen: Boolean(isOpen) });
        this.syncVoteSettingsToCloud();
        return { success: true, isOpen: Boolean(isOpen) };
    }

    isVoteOpen() {
        try {
            const raw = localStorage.getItem('crsdg_vote_open');
            if (raw === null) return true; // Default open
            return raw === 'true';
        } catch {
            return true;
        }
    }

    setVoteOpen(isOpen) {
        localStorage.setItem('crsdg_vote_open', String(isOpen));
        this.broadcast({ type: 'VOTE_STATUS_UPDATED', isOpen: Boolean(isOpen) });
        this.syncVoteSettingsToCloud();
        return { success: true, isOpen: Boolean(isOpen) };
    }

    // ========================================================
    // 4v4 GAME PREDICTION VOTING (crsdg_game_vote_open)
    // ========================================================
    isGameVoteOpen() {
        try {
            const raw = localStorage.getItem('crsdg_game_vote_open');
            if (raw === null) {
                const legacy = localStorage.getItem('crsdg_vote_open');
                return legacy === null ? true : (legacy === 'true');
            }
            return raw === 'true';
        } catch {
            return true;
        }
    }

    setGameVoteOpen(isOpen) {
        localStorage.setItem('crsdg_game_vote_open', String(Boolean(isOpen)));
        this.broadcast({ type: 'GAME_VOTE_STATUS_UPDATED', isOpen: Boolean(isOpen) });
        this.syncVoteSettingsToCloud();
        return { success: true, isOpen: Boolean(isOpen) };
    }

    setMemberChosenTeam(employeeId, teamName) {
        if (!this.isGameVoteOpen()) {
            return { success: false, message: 'ขณะนี้ระบบปิดรับโหวตแล้ว ไม่สามารถโหวตหรือแก้ไขการโหวตได้' };
        }
        const members = this.getMembers();
        const empId = String(employeeId || '').trim().toLowerCase();
        const idx = members.findIndex(m => String(m.EmployeeID || m.id || '').trim().toLowerCase() === empId);
        if (idx === -1) {
            return { success: false, message: 'ไม่พบข้อมูลพนักงานในระบบ กรุณาเข้าสู่ระบบก่อนทำการโหวต' };
        }
        const targetTeam = String(teamName || '').trim();
        members[idx].chosenTeam = targetTeam;
        this.saveMembers(members);
        this.broadcast({ type: 'MEMBER_VOTE_UPDATED', employeeId: empId, chosenTeam: targetTeam });
        return { success: true, chosenTeam: targetTeam, member: members[idx] };
    }

    getMemberChosenTeam(employeeId) {
        const members = this.getMembers();
        const empId = String(employeeId || '').trim().toLowerCase();
        const match = members.find(m => String(m.EmployeeID || m.id || '').trim().toLowerCase() === empId);
        return match ? (match.chosenTeam || '') : '';
    }

    getVoteBudget() {
        try {
            const raw = localStorage.getItem('crsdg_vote_budget');
            if (raw) {
                const val = parseFloat(raw);
                if (!isNaN(val) && val > 0) return val;
            }
            return 1000000; // Default 1,000,000 บาท
        } catch {
            return 1000000;
        }
    }

    setVoteBudget(amount) {
        const val = Math.max(0, parseFloat(amount) || 1000000);
        localStorage.setItem('crsdg_vote_budget', String(val));
        this.broadcast({ type: 'VOTE_BUDGET_UPDATED', budget: val });
        this.syncVoteSettingsToCloud();
        return { success: true, budget: val };
    }

    getAllUserInvestments() {
        try {
            const raw = localStorage.getItem('crsdg_all_user_investments');
            if (raw) return JSON.parse(raw);
            return {};
        } catch {
            return {};
        }
    }

    getUserInvestments(empId) {
        if (!empId) return {};
        const all = this.getAllUserInvestments();
        const key = String(empId).trim().toLowerCase();
        return all[key] || {};
    }

    getUserTotalInvested(empId) {
        const inv = this.getUserInvestments(empId);
        return Object.values(inv).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    }

    // นับจำนวนผู้ให้เงินรวมทั้งหมดโดย "ไม่นับซ้ำ" (Distinct Unique Investors)
    getDistinctInvestorCount(teamIdList = null) {
        const all = this.getAllUserInvestments();
        const targetTeamSet = (Array.isArray(teamIdList) && teamIdList.length > 0) ? new Set(teamIdList) : null;
        const uniqueUsers = new Set();

        Object.keys(all).forEach(uId => {
            const uInv = all[uId];
            if (uInv && typeof uInv === 'object') {
                const hasInvested = Object.keys(uInv).some(tId => {
                    if (targetTeamSet && !targetTeamSet.has(tId)) return false;
                    return (parseFloat(uInv[tId]) || 0) > 0;
                });
                if (hasInvested) {
                    uniqueUsers.add(String(uId).trim().toLowerCase());
                }
            }
        });

        if (uniqueUsers.size > 0) {
            return uniqueUsers.size;
        }

        const players = this.getPlayers();
        const relevant = targetTeamSet ? players.filter(p => targetTeamSet.has(p.id)) : players;
        return relevant.reduce((sum, p) => sum + (parseInt(p.voterCount, 10) || 0), 0);
    }

    setUserInvestment(empId, teamId, targetAmount) {
        if (!this.isVoteOpen()) {
            return { success: false, message: 'ระบบปิดรับการลงทุนแล้ว ไม่สามารถแก้ไขเงินทุนได้' };
        }
        if (!empId || !teamId) {
            return { success: false, message: 'ข้อมูลพนักงานหรือทีมไม่ถูกต้อง' };
        }

        const players = this.getPlayers();
        const targetTeam = players.find(p => p.id === teamId);
        if (targetTeam && targetTeam.voteStatus === 'closed') {
            return { success: false, message: `ทีม "${targetTeam.teamName}" ถูกปิดรับการลงทุนแล้วในขณะนี้` };
        }

        const cleanEmpId = String(empId).trim().toLowerCase();
        const maxBudget = this.getVoteBudget();
        const all = this.getAllUserInvestments();
        const userInv = all[cleanEmpId] || {};

        const cleanTarget = Math.max(0, Math.round(parseFloat(targetAmount) || 0));

        // คำนวณยอดเงินรวมใหม่ถ้ากำหนดทีมนี้เป็น cleanTarget
        let newTotal = 0;
        Object.keys(userInv).forEach(tId => {
            if (tId !== teamId) {
                newTotal += (parseFloat(userInv[tId]) || 0);
            }
        });
        newTotal += cleanTarget;

        if (newTotal > maxBudget) {
            const currentOther = newTotal - cleanTarget;
            const maxAllowed = Math.max(0, maxBudget - currentOther);
            return {
                success: false,
                message: `งบประมาณคงเหลือไม่เพียงพอ (งบสูงสุด ${maxBudget.toLocaleString()} บาท)`,
                maxAllowed: maxAllowed
            };
        }

        if (cleanTarget > 0) {
            userInv[teamId] = cleanTarget;
        } else {
            delete userInv[teamId];
        }
        all[cleanEmpId] = userInv;

        try {
            localStorage.setItem('crsdg_all_user_investments', JSON.stringify(all));
        } catch (e) {
            console.warn('Error saving user investments:', e);
        }

        // คำนวณยอดเงินโหวตรวมและจำนวนผู้ให้เงินของแต่ละทีมเฉพาะในเครื่องทันทีระดับ 60 FPS
        this.recalculatePlayerTeamVoteTotals(true);

        // บันทึกเฉพาะเอกสารของพนักงานรายนี้ไปยัง Firestore crsdg_investments/{cleanEmpId} (200 OK Atomic Write แยกอิสระ 100%)
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.saveUserInvestmentToCloud === 'function') {
            window.FirebaseSync.saveUserInvestmentToCloud(cleanEmpId, userInv).catch(() => {});
        }

        // Debounce ซิงค์สรุปยอดของ crsdg_player ไปยัง Cloud Firestore เพื่อให้ Dashboard อื่นๆ ได้รับข้อมูลล่าสุด
        this.debounceSyncPlayersToCloud();

        this.broadcast({
            type: 'INVESTMENTS_UPDATED',
            empId: cleanEmpId,
            teamId: teamId,
            userInvestments: userInv,
            totalInvested: newTotal,
            remainingBudget: maxBudget - newTotal
        });

        return {
            success: true,
            userInvestments: userInv,
            totalInvested: newTotal,
            remainingBudget: maxBudget - newTotal
        };
    }

    debounceSyncPlayersToCloud() {
        if (this._syncPlayersTimer) {
            clearTimeout(this._syncPlayersTimer);
        }
        this._syncPlayersTimer = setTimeout(() => {
            this._syncPlayersTimer = null;
            if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.syncAllPlayers === 'function') {
                const players = this.getPlayers();
                window.FirebaseSync.syncAllPlayers(players).catch(() => {});
            }
        }, 600);
    }

    recalculatePlayerTeamVoteTotals(skipCloudSync = false) {
        const all = this.getAllUserInvestments();
        const players = this.getPlayers();
        if (!players || players.length === 0) return;

        const teamAmounts = {};
        const teamVoters = {};

        Object.keys(all).forEach(uId => {
            const uInv = all[uId];
            if (uInv && typeof uInv === 'object') {
                Object.keys(uInv).forEach(tId => {
                    const amt = parseFloat(uInv[tId]) || 0;
                    if (amt > 0) {
                        teamAmounts[tId] = (teamAmounts[tId] || 0) + amt;
                        teamVoters[tId] = (teamVoters[tId] || 0) + 1;
                    }
                });
            }
        });

        const updated = players.map(p => ({
            ...p,
            voteAmount: teamAmounts[p.id] !== undefined ? teamAmounts[p.id] : 0,
            voterCount: teamVoters[p.id] !== undefined ? teamVoters[p.id] : 0
        }));

        if (skipCloudSync) {
            try {
                localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(updated));
            } catch (e) {}
            this.broadcast({ type: 'PLAYERS_UPDATED', players: updated });
        } else {
            this.savePlayers(updated);
        }
    }

    setTeamVoteStatus(teamId, status) {
        const players = this.getPlayers();
        const idx = players.findIndex(p => p.id === teamId);
        if (idx !== -1) {
            const nextStatus = (status === 'closed') ? 'closed' : 'open';
            const nowIso = new Date().toISOString();
            players[idx].voteStatus = nextStatus;
            players[idx].updatedAt = nowIso;

            // เมื่อกดเปิดโหวตของทีมนี้ ให้เปิดระบบรับการลงทุนหลักด้วย (ถ้ายังปิดอยู่)
            if (nextStatus === 'open') {
                if (!this.isVoteOpen()) {
                    this.setVoteOpen(true);
                }
            }

            this.savePlayers(players);

            // ซิงค์สถานะของทีมไปยัง Cloud Firestore ทันทีผ่าน Web SDK เพื่อความชัวร์และไม่เด้งกลับ
            if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.setPlayerVoteStatus === 'function') {
                window.FirebaseSync.setPlayerVoteStatus(teamId, nextStatus).catch(e => console.warn('[State] setPlayerVoteStatus cloud notice:', e));
            }

            this.broadcast({
                type: 'TEAM_VOTE_STATUS_UPDATED',
                teamId: teamId,
                status: nextStatus,
                team: players[idx]
            });

            // เมื่อกดเปิดโหวตของทีมนี้ ให้เปิดระบบรับการลงทุนหลักด้วย (ถ้ายังปิดอยู่) และแจ้งเตือนฝั่งผู้ใช้งาน
            if (nextStatus === 'open') {
                const eventPayload = {
                    teamId: players[idx].id,
                    teamName: players[idx].teamName || ('ทีมที่ ' + players[idx].orderNo),
                    orderNo: players[idx].orderNo || '',
                    teamPhoto: players[idx].teamPhoto || players[idx].photo || '',
                    membersCount: (players[idx].members || []).length,
                    timestamp: Date.now()
                };
                this.broadcast({
                    type: 'TEAM_INVESTMENT_OPENED',
                    ...eventPayload
                });
                try {
                    localStorage.setItem('crsdg_last_broadcast_opened_ts', String(eventPayload.timestamp));
                    localStorage.setItem('crsdg_team_investment_opened_event', JSON.stringify(eventPayload));
                } catch (e) {}

                // ซิงค์การแจ้งเตือนเปิดโหวตทีมไปยัง Cloud Firestore เพื่อให้มือถือและทุกอุปกรณ์แสดง Lightbox ทันที
                if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.saveVoteSettings === 'function') {
                    window.FirebaseSync.saveVoteSettings({
                        vote_open: true,
                        last_opened_team: eventPayload
                    }).catch(e => console.warn('[State] Cloud broadcast team opened notice:', e));
                }
            }

            return { success: true, team: players[idx], status: nextStatus };
        }
        return { success: false, message: 'ไม่พบทีมที่ต้องการ' };
    }

    closeAllTeamVotes() {
        const players = this.getPlayers();
        const nowIso = new Date().toISOString();
        const updated = players.map(p => ({
            ...p,
            voteStatus: 'closed',
            updatedAt: nowIso
        }));
        this.savePlayers(updated);
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.syncAllPlayers === 'function') {
            window.FirebaseSync.syncAllPlayers(updated).catch(() => {});
        }
        this.broadcast({
            type: 'ALL_TEAMS_VOTE_CLOSED',
            players: updated
        });
        return { success: true, count: updated.length };
    }

    // ========================================================
    // ตารางทีมแข่งขัน crsdg_player
    // ========================================================
    getPlayers() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PLAYER);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) return [];

            // กรองข้อมูล Demo เก่าออก
            const clean = parsed.filter(p => !p.id || (!p.id.startsWith('team_player_1') && !p.id.startsWith('team_player_2') && !p.id.startsWith('team_player_3')));

            const allMembers = this.getMembers();
            const memberMap = new Map();
            allMembers.forEach(m => memberMap.set(String(m.EmployeeID || m.id).toLowerCase(), m));

            return clean.map((p, idx) => {
                let membersList = [];
                if (Array.isArray(p.members)) {
                    membersList = p.members.map(m => {
                        const empId = String(m.employeeId || m.EmployeeID || m.id || '').trim();
                        const foundInDb = memberMap.get(empId.toLowerCase());
                        const realPhoto = (foundInDb && (foundInDb.photo || foundInDb.Photo || foundInDb.avatar)) || m.photo || '';
                        const realName = (foundInDb && (foundInDb.EmpName || foundInDb.name)) || m.name || empId;
                        const realDept = (foundInDb && (foundInDb.Group || foundInDb.department)) || m.department || '';

                        return {
                            employeeId: empId,
                            name: String(realName).trim(),
                            department: String(realDept).trim(),
                            photo: String(realPhoto),
                            isCaptain: Boolean(m.isCaptain)
                        };
                    });
                } else if (p.memberId || p.employeeId) {
                    const empId = String(p.memberId || p.employeeId || '').trim();
                    const foundInDb = memberMap.get(empId.toLowerCase());
                    const realPhoto = (foundInDb && (foundInDb.photo || foundInDb.Photo || foundInDb.avatar)) || p.photo || '';
                    const realName = (foundInDb && (foundInDb.EmpName || foundInDb.name)) || p.memberName || p.name || empId;
                    const realDept = (foundInDb && (foundInDb.Group || foundInDb.department)) || p.memberTeam || p.department || '';

                    membersList = [{
                        employeeId: empId,
                        name: String(realName).trim(),
                        department: String(realDept).trim(),
                        photo: String(realPhoto),
                        isCaptain: Boolean(p.isCaptain)
                    }];
                }

                const teamPhoto = String(p.teamPhoto || p.photo || '').trim();

                return {
                    id: String(p.id || 'comp_team_' + (idx + 1)),
                    orderNo: parseInt(p.orderNo, 10) || (idx + 1),
                    teamName: String(p.teamName || p.name || 'ทีม ' + (idx + 1)).trim(),
                    description: String(p.description || p.projectDesc || '').trim(),
                    teamPhoto: teamPhoto,
                    photo: teamPhoto,
                    voteAmount: parseFloat(p.voteAmount || p.amount || 0) || 0,
                    voterCount: parseInt(p.voterCount || p.voters || 0, 10) || 0,
                    voteStatus: (p.voteStatus === 'open') ? 'open' : 'closed',
                    members: membersList,
                    updatedAt: p.updatedAt || ''
                };
            });
        } catch {
            return [];
        }
    }

    savePlayers(players) {
        const normalized = players.map((p, idx) => {
            const teamPhoto = String(p.teamPhoto || p.photo || '').trim();
            // ไม่เก็บ base64 ขนาดยักษ์ซ้ำซ้อนใน members เนื่องจากดึงจาก crsdg_member ผ่าน employeeId อยู่แล้ว
            const sanitizedMembers = (p.members || []).map(m => {
                const pStr = String(m.photo || '').trim();
                const safePhoto = (pStr.startsWith('data:') && pStr.length > 2000) ? '' : pStr;
                return {
                    employeeId: String(m.employeeId || m.EmployeeID || m.id || '').trim(),
                    name: String(m.name || m.EmpName || '').trim(),
                    department: String(m.department || m.Group || m.team || '').trim(),
                    photo: safePhoto,
                    isCaptain: Boolean(m.isCaptain)
                };
            });

            return {
                id: String(p.id || 'comp_team_' + Date.now() + '_' + idx),
                orderNo: parseInt(p.orderNo, 10) || (idx + 1),
                teamName: String(p.teamName || '').trim(),
                description: String(p.description || p.projectDesc || '').trim(),
                teamPhoto: teamPhoto,
                photo: teamPhoto,
                voteAmount: parseFloat(p.voteAmount || 0) || 0,
                voterCount: parseInt(p.voterCount || 0, 10) || 0,
                voteStatus: (p.voteStatus === 'open') ? 'open' : 'closed',
                members: sanitizedMembers,
                updatedAt: p.updatedAt || new Date().toISOString()
            };
        });

        try {
            localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(normalized));
        } catch (err) {
            console.warn('savePlayers localStorage QuotaExceededError, executing emergency compression:', err);
            // กรณีพื้นที่ LocalStorage เต็ม ให้ตัด Base64 ขนาดใหญ่ออกเพื่อป้องกัน QuotaExceededError
            const minimal = normalized.map(item => ({
                ...item,
                teamPhoto: (item.teamPhoto && item.teamPhoto.startsWith('data:') && item.teamPhoto.length > 40000) ? '' : item.teamPhoto,
                photo: (item.photo && item.photo.startsWith('data:') && item.photo.length > 40000) ? '' : item.photo,
                members: (item.members || []).map(m => ({ ...m, photo: '' }))
            }));

            try {
                // ล้างคีย์แคชที่ไม่จำเป็นเพื่อคืนพื้นที่
                localStorage.removeItem('crsdg_demo_cleaned');
                localStorage.removeItem('crsdg_demo_cleaned_v2');
                localStorage.removeItem('crsdg_game_state_sync');
                localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(minimal));
            } catch (err2) {
                console.error('CRITICAL: LocalStorage is completely full:', err2);
            }
        }

        this.broadcast({ type: 'PLAYERS_UPDATED', players: normalized });

        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.syncAllPlayers === 'function') {
            window.FirebaseSync.syncAllPlayers(normalized).catch(e => console.warn('[State] Cloud players sync notice:', e));
        }

        return normalized;
    }

    resetAllPlayerVotes() {
        const nowTs = Date.now();
        try {
            localStorage.setItem('crsdg_last_reset_votes_ts', String(nowTs));
            localStorage.setItem('crsdg_all_user_investments', '{}');
            localStorage.removeItem('crsdg_all_user_investments');
        } catch (e) {}

        const players = this.getPlayers();
        const updated = players.map(p => ({
            ...p,
            voteAmount: 0,
            voterCount: 0,
            voteStatus: 'closed',
            updatedAt: new Date().toISOString()
        }));
        this.savePlayers(updated);
        // ไม่สั่งปิดการลงทุนหลัก ให้คงสถานะเดิมตามหน้า admin

        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.clearAllUserInvestmentsFromCloud === 'function') {
            window.FirebaseSync.clearAllUserInvestmentsFromCloud().catch(e => console.warn('[State] Cloud clear investments notice:', e));
        }

        this.broadcast({ type: 'INVESTMENTS_RESET', reset: true, timestamp: nowTs });
        this.broadcast({ type: 'INVESTMENTS_UPDATED', investments: {}, reset: true, timestamp: nowTs });
        this.broadcast({ type: 'PLAYERS_UPDATED', players: updated });
        return { success: true, count: updated.length };
    }

    addPlayer(teamData) {
        const players = this.getPlayers();
        const maxOrder = players.reduce((max, p) => Math.max(max, parseInt(p.orderNo, 10) || 0), 0);
        const teamPhoto = String(teamData.teamPhoto || teamData.photo || '').trim();

        const newTeam = {
            id: teamData.id || ('comp_team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
            orderNo: teamData.orderNo ? parseInt(teamData.orderNo, 10) : (maxOrder + 1),
            teamName: String(teamData.teamName || '').trim(),
            description: String(teamData.description || teamData.projectDesc || '').trim(),
            teamPhoto: teamPhoto,
            photo: teamPhoto,
            voteAmount: parseFloat(teamData.voteAmount || 0) || 0,
            voterCount: parseInt(teamData.voterCount || 0, 10) || 0,
            voteStatus: teamData.voteStatus || 'closed',
            members: (teamData.members || []).map(m => {
                const pStr = String(m.photo || '').trim();
                return {
                    employeeId: String(m.employeeId || m.EmployeeID || m.id || '').trim(),
                    name: String(m.name || m.EmpName || '').trim(),
                    department: String(m.department || m.Group || m.team || '').trim(),
                    photo: (pStr.startsWith('data:') && pStr.length > 2000) ? '' : pStr,
                    isCaptain: Boolean(m.isCaptain)
                };
            }),
            updatedAt: new Date().toISOString()
        };
        players.push(newTeam);
        this.savePlayers(players);
        return { success: true, player: newTeam };
    }

    updatePlayer(id, updatedData) {
        const players = this.getPlayers();
        const idx = players.findIndex(p => p.id === id);
        if (idx === -1) {
            return { success: false, message: 'ไม่พบรายการทีมที่ต้องการแก้ไข' };
        }
        const teamPhoto = updatedData.teamPhoto !== undefined ? String(updatedData.teamPhoto).trim() : (updatedData.photo !== undefined ? String(updatedData.photo).trim() : players[idx].teamPhoto);

        players[idx] = {
            ...players[idx],
            ...updatedData,
            orderNo: updatedData.orderNo !== undefined ? parseInt(updatedData.orderNo, 10) : players[idx].orderNo,
            teamName: updatedData.teamName !== undefined ? String(updatedData.teamName).trim() : players[idx].teamName,
            description: updatedData.description !== undefined ? String(updatedData.description).trim() : (players[idx].description || ''),
            teamPhoto: teamPhoto,
            photo: teamPhoto,
            voteAmount: updatedData.voteAmount !== undefined ? (parseFloat(updatedData.voteAmount) || 0) : players[idx].voteAmount,
            voterCount: updatedData.voterCount !== undefined ? (parseInt(updatedData.voterCount, 10) || 0) : players[idx].voterCount,
            voteStatus: updatedData.voteStatus !== undefined ? (updatedData.voteStatus === 'open' ? 'open' : 'closed') : (players[idx].voteStatus || 'closed'),
            members: updatedData.members !== undefined ? updatedData.members.map(m => {
                const pStr = String(m.photo || '').trim();
                return {
                    employeeId: String(m.employeeId || m.EmployeeID || m.id || '').trim(),
                    name: String(m.name || m.EmpName || '').trim(),
                    department: String(m.department || m.Group || m.team || '').trim(),
                    photo: (pStr.startsWith('data:') && pStr.length > 2000) ? '' : pStr,
                    isCaptain: Boolean(m.isCaptain)
                };
            }) : players[idx].members,
            updatedAt: new Date().toISOString()
        };
        this.savePlayers(players);
        return { success: true, player: players[idx] };
    }

    deletePlayer(id) {
        let players = this.getPlayers();
        const beforeLen = players.length;
        players = players.filter(p => p.id !== id);
        if (players.length === beforeLen) {
            return { success: false, message: 'ไม่พบรายการที่ต้องการลบ' };
        }
        this.savePlayers(players);
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.deletePlayer === 'function') {
            window.FirebaseSync.deletePlayer(id);
        }
        return { success: true };
    }

    getMemberById(id) {
        if (!id) return null;
        const sId = String(id).trim().toLowerCase();
        const members = this.getMembers();
        return members.find(m => String(m.EmployeeID || m.id).trim().toLowerCase() === sId) || null;
    }


    broadcast(message) {
        if (this.channel) {
            this.channel.postMessage(message);
        }
        this.notifyListeners(message);
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    // ========================================================
    // EVENT EVALUATIONS (ตารางจัดเก็บข้อมูลแบบประเมินผล crsdg_evaluations)
    // ========================================================
    getEvaluations() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.EVALUATIONS || 'crsdg_evaluations');
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) return list;
            }
            const legacy = localStorage.getItem('crsdg_evaluations_list');
            if (legacy) {
                const list = JSON.parse(legacy);
                if (Array.isArray(list)) return list;
            }
            return [];
        } catch {
            return [];
        }
    }

    saveEvaluations(evaluations) {
        const safe = Array.isArray(evaluations) ? evaluations : [];
        localStorage.setItem(STORAGE_KEYS.EVALUATIONS || 'crsdg_evaluations', JSON.stringify(safe));
        localStorage.setItem('crsdg_evaluations_list', JSON.stringify(safe));
        this.broadcast({ type: 'EVALUATIONS_UPDATED', evaluations: safe });
        return { success: true, count: safe.length };
    }

    addEvaluation(evalData) {
        const list = this.getEvaluations();
        const empId = String(evalData.empId || evalData.employeeId || '').trim();

        const existingIdx = empId && empId.toLowerCase() !== 'guest' ? 
            list.findIndex(item => String(item.empId || item.employeeId || '').trim().toLowerCase() === empId.toLowerCase()) : -1;

        const newRecord = {
            id: evalData.id || ('eval_' + Date.now() + '_' + (empId || 'guest')),
            empId: empId || 'guest',
            empName: evalData.empName || evalData.name || 'ผู้ร่วมกิจกรรม',
            department: evalData.department || evalData.group || '-',
            overallScore: Math.min(5, Math.max(1, parseInt(evalData.overallScore || evalData.score || 5, 10))),
            ratings: evalData.ratings || {
                pitch: 'ดีเยี่ยม',
                game: 'สนุกมากที่สุด',
                food: 'ประทับใจมาก',
                app: 'ใช้งานง่ายมาก'
            },
            tags: Array.isArray(evalData.tags) ? evalData.tags : [],
            feedback: String(evalData.feedback || '').trim(),
            submittedAt: evalData.submittedAt || new Date().toISOString()
        };

        if (existingIdx !== -1) {
            list[existingIdx] = { ...list[existingIdx], ...newRecord };
        } else {
            list.unshift(newRecord);
        }

        this.saveEvaluations(list);
        if (empId) {
            localStorage.setItem('crsdg_eval_submitted_' + empId.toLowerCase(), 'true');
        }
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.saveEvaluation === 'function') {
            window.FirebaseSync.saveEvaluation(newRecord).catch(e => console.warn('[State] Cloud eval sync notice:', e));
        }
        return { success: true, evaluation: newRecord, total: list.length };
    }

    deleteEvaluation(evalId) {
        let list = this.getEvaluations();
        const target = list.find(e => e.id === evalId);
        list = list.filter(e => e.id !== evalId);
        this.saveEvaluations(list);
        if (target && target.empId && target.empId !== 'guest') {
            localStorage.removeItem('crsdg_eval_submitted_' + String(target.empId).trim().toLowerCase());
        }
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.deleteEvaluation === 'function') {
            window.FirebaseSync.deleteEvaluation(evalId).catch(e => console.warn('[State] Cloud eval delete notice:', e));
        }
        return { success: true, remaining: list.length };
    }

    clearAllEvaluations() {
        const list = this.getEvaluations();
        list.forEach(e => {
            if (e.empId && e.empId !== 'guest') {
                localStorage.removeItem('crsdg_eval_submitted_' + String(e.empId).trim().toLowerCase());
            }
        });
        this.saveEvaluations([]);
        if (typeof window !== 'undefined' && window.FirebaseSync && typeof window.FirebaseSync.clearAllEvaluationsFromCloud === 'function') {
            window.FirebaseSync.clearAllEvaluationsFromCloud().catch(e => console.warn('[State] Cloud clearAllEvaluations notice:', e));
        }
        return { success: true };
    }

    getEvaluationStats() {
        const list = this.getEvaluations();
        const total = list.length;
        if (total === 0) {
            return {
                total: 0,
                avgOverall: '0.0',
                starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                tagCounts: {},
                ratingsBreakdown: { pitch: {}, game: {}, food: {}, app: {} },
                feedbackCount: 0
            };
        }

        let sumOverall = 0;
        let feedbackCount = 0;
        const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const tagCounts = {};
        const ratingsBreakdown = { pitch: {}, game: {}, food: {}, app: {} };

        list.forEach(e => {
            const sc = Math.min(5, Math.max(1, parseInt(e.overallScore, 10) || 5));
            sumOverall += sc;
            starCounts[sc] = (starCounts[sc] || 0) + 1;

            if (e.feedback && e.feedback.trim().length > 0) {
                feedbackCount++;
            }

            if (Array.isArray(e.tags)) {
                e.tags.forEach(t => {
                    const tagClean = t.trim();
                    if (tagClean) tagCounts[tagClean] = (tagCounts[tagClean] || 0) + 1;
                });
            }

            if (e.ratings) {
                ['pitch', 'game', 'food', 'app'].forEach(k => {
                    const v = e.ratings[k];
                    if (v) {
                        ratingsBreakdown[k][v] = (ratingsBreakdown[k][v] || 0) + 1;
                    }
                });
            }
        });

        return {
            total: total,
            avgOverall: (sumOverall / total).toFixed(2),
            starCounts: starCounts,
            tagCounts: tagCounts,
            ratingsBreakdown: ratingsBreakdown,
            feedbackCount: feedbackCount
        };
    }

    notifyListeners(data) {
        this.listeners.forEach(cb => {
            try {
                cb(data);
            } catch (err) {
                console.error('Error in state subscriber:', err);
            }
        });
    }
}

// Global state instance
window.stateManager = new StateManager();
window.state = window.stateManager;
