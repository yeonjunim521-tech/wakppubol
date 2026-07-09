# 왁뿌볼 Design System

## 1. Atmosphere & Identity

왁뿌볼은 손가락으로 누르는 촉감 장난감처럼 가볍고 즉각적이어야 한다. 방향은 진짜 왁스 캔디/코팅볼을 기본으로 하고, 깨진 뒤에는 말랑 젤리 장난감의 눌림감을 섞는다. 흰 갤러리 같은 무대 위에 분홍 왁스 공이 실제 물체처럼 놓여 있고, 표면에는 반투명 왁스의 림 라이트, 미세한 결, 바닥 접촉 그림자가 보여야 한다. 사용자가 기억할 장면은 탭할 때마다 껍질이 점차 눌리고 갈라지다가, 일곱 번째 탭에서 두꺼운 왁스 껍질이 벌어지고 민트색 말랑 속살이 드러나는 순간이다.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | --surface-primary | #FFFDF7 | #17130F | Main app canvas |
| Surface/secondary | --surface-secondary | #FFFFFF | #241F1A | Stage and ad surfaces |
| Surface/warm | --surface-warm | #FFF1B8 | #352A18 | Warm radial background |
| Text/primary | --text-primary | #17130F | #FFFDF7 | Headlines and controls |
| Text/secondary | --text-secondary | #696157 | #CFC6BA | Status and secondary text |
| Border/default | --border-default | #17130F | #FFFDF7 | Strong control borders |
| Border/subtle | --border-subtle | #D8CDBF | #4A4037 | Ad slots and dividers |
| Accent/wax | --accent-wax | #FF7CA8 | #FF9BBD | Wax ball body |
| Accent/wax-shadow | --accent-wax-shadow | #E94F89 | #C93470 | Wax ball depth |
| Accent/wax-deep | --accent-wax-deep | #B92566 | #85204D | Deep occlusion under wax |
| Accent/wax-rim | --accent-wax-rim | #FFD2E2 | #FFB5D2 | Translucent wax rim |
| Accent/wax-glint | --accent-wax-glint | #FFF7FB | #FFE6F2 | Wax highlight |
| Accent/wax-soft | --accent-wax-soft | #FFC5DC | #FFB0D0 | Wax secondary spot |
| Accent/inside | --accent-inside | #7DDDF5 | #8BE6F7 | Squish inside |
| Accent/inside-shadow | --accent-inside-shadow | #4FC2D1 | #3195A4 | Squish depth spot |
| Accent/inside-glint | --accent-inside-glint | #EFFCFF | #DDF9FF | Squish highlight |
| Accent/mint | --accent-mint | #89E8C9 | #70DDB8 | Reset button and highlights |
| Accent/mint-hover | --accent-mint-hover | #9FF1D7 | #89E8C9 | Reset hover |
| Accent/lemon | --accent-lemon | #FFE66D | #F7D845 | Break burst |
| Accent/crack | --accent-crack | #5B2840 | #341827 | Crack lines |
| Accent/crack-edge | --accent-crack-edge | #FFB9D1 | #FF94BC | Raised wax lip beside cracks |
| Atmosphere/pink | --atmosphere-pink | #FFE8F0 | #3D2630 | Page radial background |
| Atmosphere/mint | --atmosphere-mint | #EAFCF7 | #1C3932 | Page radial background |

### Rules

- Interface chrome stays mostly black, white, and soft warm surface.
- Color is concentrated in the toy object and tactile feedback.
- Every raw color in CSS must map to the palette above.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | clamp(48px, 16vw, 82px) | 900 | 0.95 | 0 | App title |
| H1 | 32px | 800 | 1.1 | 0 | Progress page title |
| Body | 16px | 500 | 1.45 | 0 | Default copy |
| Body/sm | 14px | 500 | 1.45 | 0 | Ads and secondary text |
| Caption | 12px | 800 | 1.3 | 0.04em | Eyebrow |

### Font Stack

- Primary: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Mono: ui-monospace, "SFMono-Regular", Consolas, monospace

### Rules

- Keep visible copy short enough to fit mobile portrait.
- Do not use negative letter spacing.
- No body text below 14px.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Tight state offsets |
| --space-2 | 8px | Small gaps |
| --space-3 | 12px | Control padding |
| --space-4 | 16px | App side padding |
| --space-5 | 20px | Stage gaps |
| --space-6 | 24px | Major local gaps |
| --space-8 | 32px | Section rhythm |
| --space-10 | 40px | Page padding |

### Grid

- Max content width: 460px
- Primary layout: single centered mobile column
- Breakpoints: 390px mobile QA, 768px tablet, 1280px desktop QA

### Rules

- The toy always remains fully tappable on a 390px viewport.
- Bottom ad reserves height and does not overlap reset controls.

## 5. Components

### App Stage
- **Structure**: centered `main` with one `section.stage`
- **Variants**: wax phase, squish phase
- **Spacing**: `--space-4`, `--space-5`, `--space-6`
- **States**: default, active, focus
- **Accessibility**: semantic heading, status text, button label
- **Motion**: object-scale feedback only

### Ball Button
- **Structure**: native button with layered spans for wax, cracks, inside, burst
- **Variants**: exact crack counts 0 to 7, crack levels 0 to 5, squish phase, squish levels 0 to 5
- **Spacing**: fixed aspect ratio with responsive width
- **States**: default, active, focus
- **Accessibility**: native button, visible focus ring, Korean aria-label
- **Motion**: press squash, progressive crack reveal, shell-chip lift, squish pulse; transform and opacity only

### Reset Button
- **Structure**: native button
- **Variants**: default
- **Spacing**: min-height 48px, pill radius
- **States**: default, hover, active, focus
- **Accessibility**: high contrast black text on mint
- **Motion**: small press transform

### Ad Slot
- **Structure**: labeled `div`
- **Variants**: inline, bottom fixed
- **Spacing**: stable min-height
- **States**: empty only
- **Accessibility**: `aria-label` explains placeholder
- **Motion**: none

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 90ms | ease-out | Button press |
| Standard | 160ms | ease | Crack and squish transitions |
| Emphasis | 520ms | cubic-bezier(0.16, 1, 0.3, 1) | Break burst |
| Reset loop | 720ms | cubic-bezier(0.22, 1, 0.36, 1) | Final squish returning to a new ball |

### Rules

- Animate only `transform` and `opacity`.
- Respect `prefers-reduced-motion` by disabling non-essential animation.
- Pointer interactions use Pointer Events for tap and mouse parity.
- 말랑이는 5번 누르면 자동으로 새 왁뿌볼 상태로 돌아간다.

## 7. Depth & Surface

### Strategy

Use mixed depth: the page uses soft radial backgrounds, the toy uses inset highlights and shadows, controls use strong borders.

### Material Tokens

| Token | Value | Usage |
|-------|-------|-------|
| --material-contact-strong | rgb(80 35 58 / 0.34) | Floor contact shadow core |
| --material-contact-soft | rgb(80 35 58 / 0.17) | Floor contact shadow falloff |
| --material-white-strong | rgb(255 255 255 / 0.78) | Wax specular glint |
| --material-white-high | rgb(255 255 255 / 0.54) | Surface sheen |
| --material-white-mid | rgb(255 255 255 / 0.34) | Gel highlight and edge |
| --material-white-soft | rgb(255 255 255 / 0.24) | Inner rim light |
| --material-white-wax-fill | rgb(255 255 255 / 0.20) | Wax volume fill light |
| --material-white-faint | rgb(255 255 255 / 0.12) | Grain |
| --material-wax-ambient | rgb(112 21 68 / 0.16) | Wax ambient occlusion |
| --material-wax-deep | rgb(122 23 72 / 0.30) | Wax inner depth |
| --material-wax-shadow | rgb(108 47 77 / 0.30) | Wax cast shadow |
| --material-wax-lip | rgb(255 202 219 / 0.42) | Raised crack lip |
| --material-crack-shadow | rgb(88 22 56 / 0.28) | Crack groove shadow |
| --material-inside-deep | rgb(21 98 111 / 0.28) | Squish inner depth |
| --material-inside-shadow | rgb(60 115 120 / 0.24) | Squish cast shadow |
| --material-ad-surface | rgb(255 255 255 / 0.74) | Empty ad slot surface |

| Level | Value | Usage |
|-------|-------|-------|
| Toy | inset -30px -36px 44px rgb(122 23 72 / 0.30), inset 16px 18px 22px rgb(255 255 255 / 0.20), 0 24px 48px rgb(108 47 77 / 0.30) | Wax ball |
| Inside | inset -22px -24px 32px rgb(21 98 111 / 0.28), inset 14px 14px 20px rgb(255 255 255 / 0.34), 0 18px 34px rgb(60 115 120 / 0.24) | Squish inside |
| Contact | 0 28px 34px rgb(78 43 54 / 0.24) | Ball floor shadow |
| Surface | 0 10px 30px rgb(70 46 20 / 0.08) | Main stage |
