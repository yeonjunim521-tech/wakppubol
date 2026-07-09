# 왁뿌볼 Design System

## 1. Atmosphere & Identity

왁뿌볼은 손가락으로 누르는 촉감 장난감처럼 가볍고 즉각적이어야 한다. 방향은 YouTube Shorts 레퍼런스처럼 버터색 게임 맵, 두꺼운 검정 외곽선 HUD, 크림색 반투명 왁스 코팅, 짧은 고음 팝 사운드를 기본으로 한다. 깨진 뒤에는 파스텔 블루 말랑 젤리 속살이 드러난다. 사용자가 기억할 장면은 탭할 때마다 얇은 왁스 껍질이 틱틱 갈라지다가, 일곱 번째 탭에서 크림색 껍질 조각이 튀고 말랑한 속이 드러나는 순간이다.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | --surface-primary | #FFF8D7 | #17130F | Main app canvas |
| Surface/secondary | --surface-secondary | #FFFEF2 | #241F1A | Stage and ad surfaces |
| Surface/warm | --surface-warm | #FFE36D | #352A18 | Butter-map radial background |
| Text/primary | --text-primary | #17130F | #FFFDF7 | Headlines and controls |
| Text/secondary | --text-secondary | #6E6046 | #CFC6BA | Status and secondary text |
| Border/default | --border-default | #17130F | #FFFDF7 | Strong control borders |
| Border/subtle | --border-subtle | #E1C996 | #4A4037 | Ad slots and dividers |
| Accent/wax | --accent-wax | #FFF1A8 | #FFE7A0 | Cream wax shell body |
| Accent/wax-shadow | --accent-wax-shadow | #F4B64D | #C93470 | Wax shell depth |
| Accent/wax-deep | --accent-wax-deep | #C97824 | #85204D | Deep occlusion under wax |
| Accent/wax-rim | --accent-wax-rim | #FFF9D8 | #FFE6BA | Translucent wax rim |
| Accent/wax-glint | --accent-wax-glint | #FFFEF7 | #FFF7E2 | Wax highlight |
| Accent/wax-soft | --accent-wax-soft | #FFD4C5 | #FFC5DC | Pastel wax secondary spot |
| Accent/inside | --accent-inside | #9EDAF7 | #8BE6F7 | Squish inside |
| Accent/inside-shadow | --accent-inside-shadow | #6BAED4 | #3195A4 | Squish depth spot |
| Accent/inside-glint | --accent-inside-glint | #F2FEFF | #DDF9FF | Squish highlight |
| Accent/mint | --accent-mint | #FF9FAB | #70DDB8 | Reset button and highlights |
| Accent/mint-hover | --accent-mint-hover | #FFB2BD | #89E8C9 | Reset hover |
| Accent/lemon | --accent-lemon | #FFF071 | #F7D845 | HUD counter and break burst |
| Accent/crack | --accent-crack | #3B2518 | #341827 | Crack lines |
| Accent/crack-edge | --accent-crack-edge | #FFF1C3 | #FF94BC | Raised wax lip beside cracks |
| Atmosphere/pink | --atmosphere-pink | #FFD0DC | #3D2630 | Page radial background |
| Atmosphere/mint | --atmosphere-mint | #DFF6FF | #1C3932 | Page radial background |

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

### Counter HUD
- **Structure**: thick black-outlined yellow pill, visually similar to the reference Shorts game HUD
- **Variants**: wax count, squish count
- **Spacing**: min-height 48px, responsive min-width
- **States**: text updates only
- **Accessibility**: mirrored into hidden `role="status"` live region
- **Motion**: no independent motion; the ball motion carries the feedback

### Reset Button
- **Structure**: native button
- **Variants**: default
- **Spacing**: min-height 48px, pill radius
- **States**: default, hover, active, focus
- **Accessibility**: high contrast black text on pink
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

### Sound

- Use procedural Web Audio instead of copying reference audio.
- Crack taps use 2 short high-frequency square ticks plus filtered noise and a tiny low pop.
- Final break uses 4 staggered ticks, louder filtered shell noise, and a lower pop.
- Squish uses a low sine bend plus muted filtered noise.
- Sound must start only from user interaction and fail silently if browser audio is unavailable.

## 7. Depth & Surface

### Strategy

Use mixed depth: the page uses soft radial backgrounds, the toy uses inset highlights and shadows, controls use strong borders.

### Material Tokens

| Token | Value | Usage |
|-------|-------|-------|
| --material-contact-strong | rgb(79 51 15 / 0.34) | Floor contact shadow core |
| --material-contact-soft | rgb(79 51 15 / 0.17) | Floor contact shadow falloff |
| --material-white-strong | rgb(255 255 255 / 0.78) | Wax specular glint |
| --material-white-high | rgb(255 255 255 / 0.54) | Surface sheen |
| --material-white-mid | rgb(255 255 255 / 0.34) | Gel highlight and edge |
| --material-white-soft | rgb(255 255 255 / 0.24) | Inner rim light |
| --material-white-wax-fill | rgb(255 255 255 / 0.20) | Wax volume fill light |
| --material-white-faint | rgb(255 255 255 / 0.12) | Grain |
| --material-wax-ambient | rgb(177 118 28 / 0.16) | Wax ambient occlusion |
| --material-wax-deep | rgb(166 95 18 / 0.30) | Wax inner depth |
| --material-wax-shadow | rgb(130 84 25 / 0.30) | Wax cast shadow |
| --material-wax-lip | rgb(255 245 196 / 0.58) | Raised crack lip |
| --material-crack-shadow | rgb(62 38 19 / 0.32) | Crack groove shadow |
| --material-inside-deep | rgb(21 98 111 / 0.28) | Squish inner depth |
| --material-inside-shadow | rgb(60 115 120 / 0.24) | Squish cast shadow |
| --material-ad-surface | rgb(255 255 255 / 0.74) | Empty ad slot surface |
| --material-hud-shadow | rgb(23 19 15 / 0.12) | Yellow HUD pill lower edge |

| Level | Value | Usage |
|-------|-------|-------|
| Toy | inset -30px -36px 44px rgb(122 23 72 / 0.30), inset 16px 18px 22px rgb(255 255 255 / 0.20), 0 24px 48px rgb(108 47 77 / 0.30) | Wax ball |
| Inside | inset -22px -24px 32px rgb(21 98 111 / 0.28), inset 14px 14px 20px rgb(255 255 255 / 0.34), 0 18px 34px rgb(60 115 120 / 0.24) | Squish inside |
| Contact | 0 28px 34px rgb(78 43 54 / 0.24) | Ball floor shadow |
| Surface | 0 10px 30px rgb(70 46 20 / 0.08) | Main stage |
