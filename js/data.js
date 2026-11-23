/*
  Emerald City Karate: trial sign-up data.

  Everything here was read from the dojo's public pages in November 2026:
  - class times: the published schedule graphic and the live Zen Planner calendar
  - membership template ids: emeraldcitykarate.sites.zenplanner.com/sign-up-now.cfm
  - Little Dragons reservation counts: the Zen Planner month calendar (reserved / 18)

  In production the `reserved` numbers would come from Zen Planner at request time.
*/
window.ECK = {
  trial: { price: 29.99, days: 14 },

  dojo: {
    name: 'Emerald City Karate',
    address: '8314 Greenwood Avenue N, Seattle, WA 98103',
    phone: '206-437-3932',
    email: 'emeraldcitykaratestaff@gmail.com'
  },

  zen: {
    base: 'https://emeraldcitykarate.sites.zenplanner.com',
    calendar: 'https://emeraldcitykarate.sites.zenplanner.com/calendar.cfm',
    login: 'https://emeraldcitykarate.sites.zenplanner.com/login.cfm',
    registration: function (templateId) {
      return this.base + '/registration.cfm?payment=MEMBERSHIP&MembershipTemplateId=' + templateId;
    }
  },

  // dow: 0 = Sunday ... 6 = Saturday. Times are 24h, dojo local time.
  programs: [
    {
      id: 'dragons',
      name: 'Little Dragons',
      ages: 'Ages 4 to 6',
      minAge: 4,
      maxAge: 6,
      zenName: 'Two Week Trial (Ages 4 to 6)',
      zenTemplate: 'EFB2BBB3-B70D-4E5A-BB3D-D2C3D8412E67',
      capacity: 18,
      weekly: [
        { dow: 1, start: '17:00', end: '17:30', room: 'Front room' },
        { dow: 2, start: '17:00', end: '17:30', room: 'Front room' },
        { dow: 3, start: '17:00', end: '17:30', room: 'Front room' },
        { dow: 4, start: '17:00', end: '17:30', room: 'Front room' },
        { dow: 6, start: '09:00', end: '09:30', room: 'Front room' }
      ]
    },
    {
      id: 'beginners',
      name: 'Beginners',
      ages: 'Ages 7 to 11, and parents',
      minAge: 7,
      maxAge: 120,
      zenName: 'Two Week Trial (Youth & Adult) 7 Years & Older',
      zenTemplate: 'B2494C83-88AF-4D23-8691-B3865064F02E',
      capacity: null,
      weekly: [
        { dow: 1, start: '17:00', end: '17:30', room: 'Back room' },
        { dow: 2, start: '17:00', end: '17:30', room: 'Back room' },
        { dow: 3, start: '18:00', end: '18:30', room: 'Front room' },
        { dow: 4, start: '17:00', end: '17:30', room: 'Back room' },
        { dow: 6, start: '09:40', end: '10:10', room: 'Front room' }
      ]
    },
    {
      id: 'adults',
      name: 'Teens & Adults',
      ages: 'Ages 12 and up',
      minAge: 12,
      maxAge: 120,
      zenName: 'Two Week Trial (Youth & Adult) 7 Years & Older',
      zenTemplate: 'B2494C83-88AF-4D23-8691-B3865064F02E',
      capacity: null,
      weekly: [
        { dow: 2, start: '19:25', end: '20:15', room: 'Back room' },
        { dow: 4, start: '19:25', end: '20:15', room: 'Back room' }
      ]
    }
  ],

  // Dojo closed for evening classes (Thanksgiving, Christmas Eve/Day, New Year's Eve/Day).
  closures: ['2026-11-26', '2026-11-27', '2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01'],

  // Thanksgiving week runs a modified schedule. An empty list means no class that day.
  overrides: {
    '2026-11-23': {
      beginners: [{ start: '17:40', end: '18:20', room: 'Front room', note: 'Holiday week, combined with Novice' }]
    },
    '2026-11-24': {
      beginners: [{ start: '17:40', end: '18:20', room: 'Front room', note: 'Holiday week, combined with Novice' }],
      adults: []
    },
    '2026-11-25': {
      beginners: [{ start: '17:00', end: '17:45', room: 'Back room', note: 'Holiday week, combined with Novice' }]
    }
  },

  // Spots already reserved, by class date (capacity 18).
  reserved: {
    dragons: {
      '2026-11-23': 8, '2026-11-24': 2, '2026-11-25': 3, '2026-11-28': 8, '2026-11-30': 1,
      '2026-12-01': 1, '2026-12-02': 0, '2026-12-03': 0, '2026-12-05': 2, '2026-12-07': 1,
      '2026-12-08': 1, '2026-12-09': 0, '2026-12-10': 0, '2026-12-12': 1, '2026-12-14': 1,
      '2026-12-15': 1, '2026-12-16': 0, '2026-12-17': 0, '2026-12-19': 1, '2026-12-21': 1,
      '2026-12-22': 1, '2026-12-23': 0, '2026-12-26': 1, '2026-12-28': 0, '2026-12-29': 0,
      '2026-12-30': 0
    }
  },

  // The dojo's own counting sheet: romaji as they spell it, plus a say-it-like hint.
  count: [
    { n: 1, kanji: '一', romaji: 'Ichi', kana: 'いち', say: 'ee-chee' },
    { n: 2, kanji: '二', romaji: 'Ni', kana: 'に', say: 'nee' },
    { n: 3, kanji: '三', romaji: 'San', kana: 'さん', say: 'sahn' },
    { n: 4, kanji: '四', romaji: 'Yon', kana: 'よん', say: 'yohn' },
    { n: 5, kanji: '五', romaji: 'Go', kana: 'ご', say: 'goh' },
    { n: 6, kanji: '六', romaji: 'Roku', kana: 'ろく', say: 'roh-koo' },
    { n: 7, kanji: '七', romaji: 'Shichi', kana: 'しち', say: 'shee-chee' },
    { n: 8, kanji: '八', romaji: 'Hachi', kana: 'はち', say: 'hah-chee' },
    { n: 9, kanji: '九', romaji: 'Kyū', kana: 'きゅう', say: 'kyoo' },
    { n: 10, kanji: '十', romaji: 'Jyū', kana: 'じゅう', say: 'joo' }
  ],

  sources: ['Google', 'Friend or family', 'Walked or drove by', 'Facebook', 'Flyer', 'Event', 'Buddy Pass', 'Confidence Toolbox', 'Other']
};
