# P50 Mobile Native Qualification

P50 is a defect-only pass over the P47 phone/tablet architecture after P48 material cleanup and P49 motion.

## Defects fixed

### 1. Narrow-phone full-bleed overflow

**Problem:** several sticky regions used `margin-inline: -12px`, while the native gutter resolves to 10px on common 360–430px phones. That can create a 2px horizontal overflow.

**Fixed in:** Play start actions, Review workstation header, Library workspace header.

**Resolution:** full-bleed edges now negate the shared safe inline start/end gutter independently.

### 2. Landscape display-cutout intrusion

**Problem:** the phone shell accounted for top/bottom safe areas, but ordinary horizontal app gutters did not universally include `safe-area-inset-left/right`.

**Resolution:** shared safe inline start/end tokens now drive mobile topbar and main-content padding.

### 3. Focused-workspace bottom-nav overlap

**Problem:** Learn, Review and Library deliberately hide the topbar in low-height landscape, but the bottom navigation remained fixed. Workspace height calculations could therefore extend behind it.

**Resolution:** constrained-landscape lesson, review workstation and library workspace hide the global bottom navigation. Each retains route-local navigation/back controls.

### 4. Review narrow-landscape overflow

**Problem:** the P47 Review workstation used three columns down to 568–667px-class landscape phones. Its minimum tracks could exceed available safe width.

**Resolution:** at <=720px landscape, Review becomes:

`board | notation/insight`

The board spans both right-side rows, notation is bounded above, and teaching insight occupies the remaining right-side height.

### 5. Touch-target regression

**Problem:** a later Review mobile rule set preview controls to 42px, overriding the intended 44px coarse-pointer minimum.

**Resolution:** it now uses `--chess-touch-min`. Small-screen Learn actions also encode the same token explicitly.

### 6. Repeated mobile chrome math

**Problem:** route files repeated 50px/52px + safe-area calculations and nav-height calculations.

**Resolution:** centralized:

- `--chess-mobile-topbar-safe-height`
- `--chess-mobile-nav-safe-height`
- `--chess-native-inline-start`
- `--chess-native-inline-end`

## Device-class targets

The P47 matrix remains authoritative. P50 specifically protects:

- 360 × 800 portrait;
- 393 × 852 portrait;
- 430 × 932 portrait;
- 568–667px-class low-height landscape;
- 844 × 390 landscape;
- 768 × 1024 tablet portrait;
- 820–834 × 1180–1194 tablet portrait;
- 1024 × 768 tablet landscape;
- 1180 × 820 large-tablet landscape.

## Automated gate

Run:

```bash
npm run mobile:audit
```

The audit checks:

- `viewport-fit=cover`;
- safe mobile shell tokens;
- removal of hard-coded -12px full-bleed phone margins;
- removal of repeated 50px/52px safe topbar calculations;
- safe inline shell padding;
- focused-landscape bottom-nav suppression;
- narrow Review fallback;
- explicit Review/Learn touch minimums.

## What this does not claim

This phase does **not** claim a physical iPhone, iPad, Samsung, Pixel or OEM browser was operated if no physical-device/browser runner was available.

The following still belong to release qualification:

- Safari dynamic address-bar behavior;
- installed-PWA standalone-mode chrome;
- Android OEM webview differences;
- real keyboard opening/closing behavior;
- physical haptic intensity;
- device font rasterization;
- GPU-specific animation smoothness.

Those should be treated as defect-only follow-up observations, not reasons to redesign the interface.
