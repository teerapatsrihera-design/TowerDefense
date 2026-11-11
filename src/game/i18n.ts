// Thai / English strings for the UI. Names of heroes, skills and stages carry their own {th, en} pair in data.ts.

export type Lang = 'th' | 'en';
export type Bi = { th: string; en: string };

let lang: Lang = 'th';

export const getLang = (): Lang => lang;
export function setLang(l: Lang) {
  lang = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

/** Picks the current language from a {th, en} pair. */
export const L = (o: Bi): string => o[lang];

const D = {
  // title
  subtitle: { th: 'ดวงดาวผลิบาน · Tower Defense', en: 'Blooming Stars · Tower Defense' },
  play: { th: 'เริ่มเกม', en: 'Play' },
  team: { th: 'ทีม', en: 'Team' },
  characters: { th: 'ตัวละคร', en: 'Gallery' },
  settings: { th: 'ตั้งค่า', en: 'Settings' },
  hintStart: { th: 'กด Enter หรือ Space เพื่อเริ่ม', en: 'Press Enter or Space to start' },
  version: { th: 'ต้นแบบ v0.2', en: 'Prototype v0.2' },
  // stage select
  stageSelect: { th: 'เลือกด่าน', en: 'Select Stage' },
  back: { th: '‹ กลับ', en: '‹ Back' },
  locked: { th: 'ผ่านด่านก่อนหน้าก่อน', en: 'Clear previous stage' },
  comingSoon: { th: 'เร็วๆ นี้', en: 'Coming soon' },
  yourTeam: { th: 'ทีมของคุณ', en: 'Your team' },
  editTeam: { th: 'แก้ไขทีม', en: 'Edit team' },
  totalStars: { th: 'ดาวรวม', en: 'Total stars' },
  // deck builder
  deckTitle: { th: 'จัดทีม', en: 'Build Your Team' },
  deckCount: { th: 'ตัวละครในทีม {n}/{max}', en: 'Team {n}/{max}' },
  deckHint: { th: 'แตะตัวละครเพื่อเพิ่ม/เอาออก', en: 'Tap a character to add / remove' },
  deckFull: { th: 'ทีมเต็มแล้ว (สูงสุด {max} ตัว)', en: 'Team is full (max {max})' },
  deckMin: { th: 'ต้องมีอย่างน้อย 1 ตัว', en: 'Keep at least 1 character' },
  deckReset: { th: 'ใช้ทีมเริ่มต้น', en: 'Default team' },
  emptySlot: { th: 'ว่าง', en: 'Empty' },
  // settings
  language: { th: 'ภาษา', en: 'Language' },
  sound: { th: 'เสียง', en: 'Sound' },
  on: { th: 'เปิด', en: 'On' },
  off: { th: 'ปิด', en: 'Off' },
  saveData: { th: 'ข้อมูลเซฟ', en: 'Save data' },
  exportSave: { th: 'ส่งออกเซฟ', en: 'Export' },
  importSave: { th: 'นำเข้าเซฟ', en: 'Import' },
  resetSave: { th: 'ลบเซฟ', en: 'Reset' },
  resetConfirm: { th: 'กดอีกครั้งเพื่อยืนยันการลบเซฟ', en: 'Press again to confirm deleting your save' },
  resetDone: { th: 'ลบเซฟแล้ว', en: 'Save deleted' },
  exportCopied: { th: 'คัดลอกโค้ดเซฟแล้ว เก็บไว้ที่ปลอดภัย', en: 'Save code copied. Keep it somewhere safe.' },
  exportPrompt: { th: 'คัดลอกโค้ดเซฟนี้เก็บไว้', en: 'Copy this save code and keep it' },
  importPrompt: { th: 'วางโค้ดเซฟที่นี่', en: 'Paste your save code here' },
  importOk: { th: 'นำเข้าเซฟสำเร็จ', en: 'Save imported' },
  importFail: { th: 'โค้ดเซฟไม่ถูกต้อง', en: 'Invalid save code' },
  storageNote: { th: 'เซฟเก็บในเบราว์เซอร์นี้ ถ้าล้างข้อมูลเบราว์เซอร์จะหาย ควรส่งออกไว้', en: 'Saves live in this browser. Clearing site data erases them, so export a backup.' },
  storageFail: { th: 'เบราว์เซอร์ไม่อนุญาตให้บันทึก (โหมดส่วนตัว?)', en: 'Browser blocked saving (private mode?)' },
  // battle HUD
  cost: { th: 'แต้มวางตัว', en: 'Deploy pts' },
  enemies: { th: 'ศัตรู', en: 'Enemies' },
  paused: { th: 'หยุดชั่วคราว — วางตัวละครได้', en: 'Paused — you can still deploy' },
  homeConfirm: { th: 'กดปุ่มบ้านอีกครั้งเพื่อออกจากด่าน', en: 'Press Home again to leave the stage' },
  spawn: { th: 'เข้า', en: 'IN' },
  base: { th: 'ฐาน', en: 'BASE' },
  pickDir: { th: 'เลือกทิศที่หัน', en: 'Choose facing' },
  inField: { th: 'ลงสนาม', en: 'Deployed' },
  block: { th: 'ขวาง', en: 'Block' },
  skill: { th: 'สกิล', en: 'Skill' },
  retreat: { th: 'ถอนตัว', en: 'Retreat' },
  useSkill: { th: 'ใช้สกิล ★', en: 'Use skill ★' },
  charging: { th: 'กำลังชาร์จ', en: 'Charging' },
  // deploy errors
  rCost: { th: 'แต้มวางตัวไม่พอ', en: 'Not enough deploy points' },
  rTile: { th: 'วางตรงนี้ไม่ได้ (ประชิดวางพื้นต่ำ · ระยะไกลวางที่สูง)', en: "Can't deploy here (melee: low ground · ranged: high ground)" },
  rOccupied: { th: 'ช่องนี้มีตัวละครอยู่แล้ว', en: 'Tile is occupied' },
  rLimit: { th: 'ลงสนามได้สูงสุด {n} ตัว', en: 'Max {n} characters in the field' },
  rCooldown: { th: 'ยังวางใหม่ไม่ได้ รอคูลดาวน์', en: 'Still on cooldown' },
  rAlready: { th: 'ตัวละครนี้อยู่ในสนามแล้ว', en: 'Already deployed' },
  reaction: { th: 'ปฏิกิริยา!', en: 'Reaction!' },
  fell: { th: 'ล้ม!', en: 'Down!' },
  boss: { th: 'บอส', en: 'BOSS' },
  // result
  win: { th: 'สำเร็จ!', en: 'Clear!' },
  lose: { th: 'พ่ายแพ้', en: 'Defeated' },
  loseSub: { th: 'ศัตรูเข้าถึงฐานมากเกินไป', en: 'Too many enemies reached the base' },
  summary: { th: 'ศัตรูที่ล้ม {k} · หลุดเข้าฐาน {l} · เวลา {s} วิ', en: 'Defeated {k} · Leaked {l} · Time {s}s' },
  retry: { th: 'เล่นใหม่', en: 'Retry' },
  stageList: { th: 'เลือกด่าน', en: 'Stages' },
  next: { th: 'ด่านถัดไป ›', en: 'Next ›' },
  newBest: { th: 'สถิติใหม่!', en: 'New best!' },
  // economy / gacha / upgrade
  recruit: { th: 'รับสมัคร', en: 'Recruit' },
  coins: { th: 'เหรียญดาว', en: 'Star Coins' },
  pull1: { th: 'สุ่ม ×1', en: 'Pull ×1' },
  pull10: { th: 'สุ่ม ×10', en: 'Pull ×10' },
  pityInfo: { th: 'การันตี ★5 ในอีก {n} ครั้ง', en: 'Guaranteed ★5 within {n} pulls' },
  rates: { th: '★5 6% · ★4 94% · ซ้ำ = เพิ่ม Rank (สูงสุด {max}) · เต็มแล้วคืนเหรียญ', en: '★5 6% · ★4 94% · duplicate = Rank up (max {max}) · refund when maxed' },
  topPrize: { th: 'ตัวละคร ★5', en: '★5 characters' },
  newTag: { th: 'ใหม่!', en: 'NEW!' },
  rankTag: { th: 'Rank +1', en: 'Rank +1' },
  refundTag: { th: 'คืน {n} เหรียญ', en: 'Refund {n}' },
  noCoins: { th: 'เหรียญดาวไม่พอ', en: 'Not enough Star Coins' },
  ok: { th: 'ตกลง', en: 'OK' },
  again: { th: 'สุ่มอีก', en: 'Pull again' },
  skipHint: { th: 'แตะเพื่อข้าม', en: 'Tap to skip' },
  notOwned: { th: 'ยังไม่มีตัวละครนี้ ไปรับสมัครที่กาชา', en: 'Not owned yet. Recruit via gacha.' },
  notOwnedToast: { th: 'ต้องรับสมัครตัวละครนี้ก่อน', en: 'Recruit this character first' },
  level: { th: 'เลเวล', en: 'Level' },
  rank: { th: 'Rank', en: 'Rank' },
  lvUp: { th: 'อัปเลเวล ({n})', en: 'Level up ({n})' },
  lvMax: { th: 'เลเวลสูงสุด', en: 'Max level' },
  lvUpDone: { th: 'เลเวลเพิ่มแล้ว!', en: 'Leveled up!' },
  addTeam: { th: 'เข้าทีม', en: 'Add to team' },
  removeTeam: { th: 'เอาออกจากทีม', en: 'Remove from team' },
  strongVs: { th: 'ได้เปรียบศัตรูธาตุ{e}', en: 'Strong vs {e} enemies' },
  weakVs: { th: 'โดนต้านโดยธาตุ{e}', en: 'Resisted by {e} enemies' },
  reward: { th: 'รางวัล', en: 'Reward' },
  firstClear: { th: 'ผ่านครั้งแรก!', en: 'First clear!' },
  skillLabel: { th: 'สกิล', en: 'Skill' },
  deployCost: { th: 'แต้มวาง', en: 'Cost' },
  // tutorial
  tutNext: { th: 'ต่อไป ›', en: 'Next ›' },
  tutSkip: { th: 'ข้าม', en: 'Skip' },
  tutReplay: { th: 'สอนเล่น', en: 'Tutorial' },
  tutReplayed: { th: 'จะแสดงสอนเล่นเมื่อเข้าด่าน 1-1 ครั้งหน้า', en: 'The tutorial will show next time you enter Stage 1-1.' },
  tutWelcome: { th: 'ยินดีต้อนรับ! ป้องกันฐานสีน้ำเงิน อย่าให้ศัตรูจากทางเข้าสีแดงเดินไปถึงฐาน ตัวที่หลุดเข้าไปจะทำให้เสียหัวใจ ♥', en: 'Welcome! Protect the blue base. Enemies enter from the red gate, and each one that reaches the base costs you a heart ♥.' },
  tutCost: { th: 'แต้มวางตัวจะค่อยๆ เพิ่มขึ้นเอง ตัวละครแต่ละตัวใช้แต้มไม่เท่ากัน (เลขสีเหลืองบนการ์ด)', en: 'Deploy points refill over time. Each character costs a different amount (the yellow number on its card).' },
  tutPickG: { th: 'แตะการ์ด {n} เป็นสายประชิด ใช้ขวางศัตรูไว้', en: "Tap {n}'s card. Melee characters block enemies in their path." },
  tutPlaceG: { th: 'วางบนพื้นต่ำสีเข้ม (ทางเดินของศัตรู) แล้วเลือกทิศที่หัน ตัวละครจะโจมตีช่องด้านหน้า', en: 'Place on the dark low ground (the enemy path), then choose a facing. They attack the tile in front of them.' },
  tutPickH: { th: 'ต่อไปแตะการ์ด {n} เป็นสายยิงไกล', en: "Now tap {n}'s card, a ranged character." },
  tutPlaceH: { th: 'สายยิงไกลวางบนพื้นสูงสีสว่าง ยิงได้ไกลและยิงศัตรูบินได้ ทิศที่หันกำหนดพื้นที่ยิง', en: 'Ranged characters go on the bright high ground. They reach far and can hit flyers. Their facing sets the firing area.' },
  tutOp: { th: 'แตะตัวละครในสนามเพื่อดูสกิลหรือถอนตัวกลับ เมื่อแถบสกิลเต็มจะกดใช้สกิลได้', en: 'Tap a deployed character to see its skill or retreat it. When the skill bar is full you can use the skill.' },
  tutElem: { th: 'ธาตุสำคัญ! ศัตรูที่มีจุดสีธาตุ โดนธาตุเดียวกันจะเจ็บน้อย (▼) แต่โดนธาตุตรงข้ามจะเจ็บหนัก (▲) ไฟ↔น้ำแข็ง สายฟ้า↔ลม', en: 'Elements matter! An enemy with an element dot takes less from the same element (▼) and more from its opposite (▲): Ember↔Frost, Volt↔Gale.' },
  tutGo: { th: 'พร้อมแล้ว! ปุ่ม ❚❚ หยุดเกม ปุ่ม ×2 เร่งความเร็ว ศัตรูกำลังมา ขอให้โชคดี!', en: 'Ready! ❚❚ pauses the game and ×2 speeds it up. Enemies are coming. Good luck!' },
} satisfies Record<string, Bi>;

export type Key = keyof typeof D;

export function t(key: Key, p?: Record<string, string | number>): string {
  let s: string = D[key][lang];
  if (p) for (const k of Object.keys(p)) s = s.split(`{${k}}`).join(String(p[k]));
  return s;
}

const ELEM_NAMES: Record<string, Bi> = {
  volt: { th: 'สายฟ้า', en: 'Volt' }, ember: { th: 'ไฟ', en: 'Ember' }, frost: { th: 'น้ำแข็ง', en: 'Frost' }, gale: { th: 'ลม', en: 'Gale' },
};
export const elemName = (e: string): string => L(ELEM_NAMES[e] ?? { th: e, en: e });
