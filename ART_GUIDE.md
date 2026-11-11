# คู่มือเตรียมภาพ — Stellar Bloom

> **ไม่จำเป็นต้องทำ** — ตอนนี้เกมสร้างภาพ pixel art ของตัวละครทุกตัวเองแล้ว (`src/art/pixel.ts`)
> คู่มือนี้เก็บไว้เผื่ออยากเปลี่ยนบางตัวเป็นภาพที่วาด/สร้างเองในอนาคต

วางไฟล์ภาพตามชื่อในคู่มือนี้ แล้วเกมจะใช้ภาพของคุณแทนภาพที่เกมสร้างทันที ไม่ต้องแก้โค้ด

---

## 1. ภาพที่ต้องเตรียม

### ตัวละคร → วางที่ `public/art/characters/`

| ไฟล์ | จำเป็น? | ใช้ทำอะไร |
|---|---|---|
| `<id>.png` | **จำเป็น** | ภาพชิบิเต็มตัว ใช้บนสนามและในเมนู (เกมทำให้หายใจ/เด้ง/ขยับเองจากภาพนี้) |
| `<id>_attack.png` | ไม่จำเป็น | ท่าโจมตี (ถ้าไม่มี เกมจะใช้ภาพหลักแล้วทำท่าพุ่ง/เหวี่ยงให้) |
| `<id>_blink.png` | ไม่จำเป็น | ภาพเดียวกันแต่ **หลับตา** (ทำให้กะพริบตาได้) |
| `<id>_portrait.png` | ไม่จำเป็น | ภาพครึ่งตัวสำหรับการ์ดกาชา/บทสนทนา (ถ้าไม่มี ใช้ภาพชิบิแทน) |

`<id>` คือรหัสตัวละครภาษาอังกฤษตัวเล็ก เช่น `raika.png`, `raika_attack.png`

### ศัตรู → วางที่ `public/art/enemies/`
`<id>.png` เช่น `slime.png` (รายชื่อศัตรูจะเพิ่มในคู่มือเมื่อออกแบบเสร็จ)

---

## 2. สเปกภาพ (สำคัญ — ทำให้ทุกตัวดูเข้าชุดกัน)

- **พื้นหลังโปร่งใส** (PNG transparent) — ถ้า AI ให้พื้นขาวมา ใช้เว็บ/แอปลบพื้นหลังฟรีได้
- **สัดส่วนภาพ 4:5** แนะนำ **512 × 640 px** (ใหญ่กว่านี้ได้ เกมย่อให้เอง)
- **เต็มตัว**, ตัวละครอยู่ **กึ่งกลาง**, **เท้าแตะขอบล่าง** (เว้นนิดเดียว ~3%)
- **หันหน้าเข้าหาคนดู** หรือเฉียงเล็กน้อย ไปทาง **ขวา** (เกมกลับซ้าย-ขวาให้เองตามทิศที่วาง)
- ไม่มีเงาที่พื้น ไม่มีตัวหนังสือ ไม่มีกรอบ
- ขนาดไฟล์ไม่ควรเกิน ~400 KB ต่อภาพ (เว็บโหลดเร็ว)

---

## 3. Prompt สำหรับ AI สร้างภาพ

ใช้ได้กับเครื่องมือสร้างภาพ AI ทั่วไป (ภาษาอังกฤษให้ผลดีที่สุด)
**เคล็ดลับให้ทุกตัวเป็นสไตล์เดียวกัน:** ใช้ "ส่วนสไตล์" ด้านล่างเหมือนเดิมทุกครั้ง เปลี่ยนแค่ "ส่วนตัวละคร"
ถ้าเครื่องมือรองรับ *ภาพอ้างอิง (style reference)* ให้ใส่ภาพตัวแรกที่ชอบเป็นอ้างอิงตอนสร้างตัวต่อๆ ไป

### ส่วนสไตล์ (ใช้ทุกตัว — ห้ามเปลี่ยน)
```
cute chibi anime character, super deformed, 2.5 heads tall, big round head, small body,
huge sparkling eyes with detailed gradient irises and multiple highlights, soft pink blush,
tiny mouth, soft clean lineart, pastel colors, soft cel shading with gentle gradients,
high quality gacha game chibi sprite, full body, standing idle pose, facing viewer,
centered, plain white background, no shadow, no text
```

### Negative prompt (ถ้าเครื่องมือมีช่องนี้)
```
realistic, 3d render, adult proportions, tall body, extra fingers, extra limbs, deformed hands,
text, watermark, logo, signature, background scenery, cropped, cut off feet, multiple characters, frame
```

### ส่วนตัวละคร (ต่อท้ายส่วนสไตล์)

**ลูมิ — `raika.png`** (จอมเวท · สายฟ้า)
```
girl with long pastel lavender twin tails and an ahoge, golden yellow eyes, star-shaped hair clip,
indigo and navy magical sci-fi dress with gold trim and a small star emblem, holding a long staff
topped with a glowing violet star, small sparks of purple lightning, cheerful smile
```

**ฮานะ — `akane.png`** (นักรบ · ไฟ)
```
girl with pink ponytail and fox ears, crimson red eyes, white top with orange trim and a red pleated
skirt, holding a short sword with an orange glowing blade, small embers floating around,
confident cat-like smile
```

**ยูกิ — `yuki.png`** (ผู้พิทักษ์ · น้ำแข็ง)
```
girl with very long white hair with light blue tint, cat ears, a big light blue ribbon,
bright blue eyes, blue and white winter knight outfit, holding a round crystal ice shield
with a star in the center, small snowflakes around, calm shy expression
```

**มิมิ — `wakaba.png`** (ผู้รักษา · ลม)
```
girl with mint green hair in two buns, heterochromia (one green eye, one orange eye), a golden halo,
pink flower hair accessory, white nurse-like dress with mint skirt and pink accents, holding a small
wand with a pink heart, soft green wind swirls and petals, gentle smile
```

### ท่าโจมตี (`<id>_attack.png`)
ใช้ prompt เดิมทั้งหมด แต่เปลี่ยน `standing idle pose` เป็น
```
dynamic attack pose, swinging weapon, determined expression
```

### ภาพหลับตา (`<id>_blink.png`)
วิธีที่ง่ายที่สุด: นำภาพหลักไปใช้ฟังก์ชัน *แก้ไขบางส่วน (inpaint)* เฉพาะตา แล้วพิมพ์ `closed eyes`
(ถ้าทำไม่ได้ ข้ามไปได้เลย — ไม่จำเป็น)

### ศัตรู (สไตล์เดียวกัน)
แทนส่วนสไตล์บรรทัดแรกด้วย
```
cute but slightly spooky chibi monster, round body,
```
ตามด้วยคำอธิบายศัตรูแต่ละตัว (จะให้ในคู่มือเวอร์ชันถัดไป)

---

## 4. ตรวจผล

1. วางไฟล์ในโฟลเดอร์ตามข้อ 1
2. รัน `npm run dev` แล้วเปิด `http://localhost:5173/preview.html`
3. การ์ดที่ใช้ภาพของคุณจะขึ้นป้าย **✅ ภาพของคุณ**

> ⚠️ เรื่องลิขสิทธิ์: อย่าใส่ชื่อตัวละครหรือชื่อเกมของบริษัทอื่นใน prompt และเช็กเงื่อนไขการใช้งานของเครื่องมือ AI ที่ใช้ว่าอนุญาตให้นำภาพไปเผยแพร่ได้
