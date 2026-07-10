import {
  createFracture,
  createSurfaceZones,
  gravityPosition,
} from "./surface.js";

const DEFAULT_COLORS = Object.freeze({
  light: "#fff7b9",
  mid: "#f5ca58",
  shadow: "#dc902d",
  deep: "#a95f1e",
  gel: "#9edaf7",
});

function rotateToView(point, rotation) {
  const yawCosine = Math.cos(rotation.yaw);
  const yawSine = Math.sin(rotation.yaw);
  const yawed = {
    x: point.x * yawCosine + point.z * yawSine,
    y: point.y,
    z: -point.x * yawSine + point.z * yawCosine,
  };
  const pitchCosine = Math.cos(rotation.pitch);
  const pitchSine = Math.sin(rotation.pitch);
  return {
    x: yawed.x,
    y: yawed.y * pitchCosine - yawed.z * pitchSine,
    z: yawed.y * pitchSine + yawed.z * pitchCosine,
  };
}

function seeded(index) {
  let value = (index + 11) * 0x85ebca6b;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

function cssColor(canvas, name, fallback) {
  if (typeof getComputedStyle !== "function") return fallback;
  return getComputedStyle(canvas).getPropertyValue(name).trim() || fallback;
}

function freezeCopies(items) {
  return items.map((item) => Object.freeze({ ...item }));
}

export function createWaxRenderer(canvas, options = {}) {
  const context = canvas?.getContext?.("2d");
  if (!context) return null;

  const pixelRatio = options.devicePixelRatio ?? globalThis.devicePixelRatio ?? 1;
  const requestFrame = options.requestFrame ?? globalThis.requestAnimationFrame?.bind(globalThis) ?? (() => 0);
  const cancelFrame = options.cancelFrame ?? globalThis.cancelAnimationFrame?.bind(globalThis) ?? (() => {});
  const now = options.now ?? (() => globalThis.performance?.now?.() ?? Date.now());
  const zones = createSurfaceZones(20);
  const texturePoints = createSurfaceZones(55);
  const brokenZones = new Set();
  const fragments = [];
  const rotation = { yaw: 0, pitch: 0 };
  let width = canvas.clientWidth || 300;
  let height = canvas.clientHeight || width;
  let frameId = 0;
  let destroyed = false;
  let collapseStartedAt = null;
  let shellOpacity = 1;

  function colors() {
    return {
      light: cssColor(canvas, "--wax-light", DEFAULT_COLORS.light),
      mid: cssColor(canvas, "--wax-mid", DEFAULT_COLORS.mid),
      shadow: cssColor(canvas, "--wax-shadow", DEFAULT_COLORS.shadow),
      deep: cssColor(canvas, "--wax-deep", DEFAULT_COLORS.deep),
      gel: cssColor(canvas, "--gel-mid", DEFAULT_COLORS.gel),
    };
  }

  function resize() {
    width = canvas.clientWidth || width;
    height = canvas.clientHeight || height;
    const targetWidth = Math.max(1, Math.round(width * pixelRatio));
    const targetHeight = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;
    render(now());
  }

  function project(zone) {
    const view = rotateToView(zone, rotation);
    const radius = Math.min(width, height) * 0.485;
    return {
      x: width / 2 + view.x * radius,
      y: height / 2 + view.y * radius,
      z: view.z,
      scale: 0.42 + Math.max(0, view.z) * 0.58,
    };
  }

  function beginPathFromRim(center, fracture, size) {
    fracture.rim.forEach((point, index) => {
      const x = center.x + Math.cos(point.angle) * point.radius * size;
      const y = center.y + Math.sin(point.angle) * point.radius * size;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
  }

  function drawWaxSphere(palette) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.485;
    context.save();
    context.globalAlpha = shellOpacity;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.clip();

    const base = context.createRadialGradient(
      centerX - radius * 0.34,
      centerY - radius * 0.4,
      radius * 0.04,
      centerX + radius * 0.12,
      centerY + radius * 0.16,
      radius * 1.12,
    );
    base.addColorStop(0, palette.light);
    base.addColorStop(0.42, palette.mid);
    base.addColorStop(0.78, palette.shadow);
    base.addColorStop(1, palette.deep);
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);

    context.globalAlpha = shellOpacity * 0.24;
    for (const point of texturePoints) {
      const spot = project(point);
      if (spot.z <= 0) continue;
      const random = seeded(point.index + 90);
      const spotRadius = (0.7 + random() * 1.7) * spot.scale;
      context.beginPath();
      context.arc(spot.x, spot.y, spotRadius, 0, Math.PI * 2);
      context.fillStyle = random() > 0.46 ? "#fffbea" : palette.deep;
      context.fill();
    }

    context.globalAlpha = shellOpacity * 0.18;
    context.lineWidth = 0.75;
    context.strokeStyle = palette.light;
    for (let line = 0; line < 7; line += 1) {
      context.beginPath();
      const y = centerY - radius * 0.64 + line * radius * 0.2;
      context.moveTo(centerX - radius * 0.74, y);
      context.bezierCurveTo(centerX - radius * 0.18, y - 5, centerX + radius * 0.22, y + 7, centerX + radius * 0.78, y - 2);
      context.stroke();
    }
    context.restore();
  }

  function drawDamage(palette) {
    const visible = [...brokenZones]
      .map((zoneIndex) => ({ zoneIndex, projection: project(zones[zoneIndex]) }))
      .filter(({ projection }) => projection.z > 0.015)
      .sort((a, b) => a.projection.z - b.projection.z);

    for (const { zoneIndex, projection } of visible) {
      const fracture = createFracture(zoneIndex);
      const size = Math.min(width, height) * (0.052 + 0.019 * projection.z);
      context.save();
      context.globalAlpha = shellOpacity * Math.min(1, projection.z * 1.8);

      context.beginPath();
      beginPathFromRim(projection, fracture, size * 1.18);
      context.fillStyle = "rgba(70, 35, 18, 0.48)";
      context.fill();

      context.beginPath();
      beginPathFromRim(projection, fracture, size);
      context.fillStyle = palette.gel;
      context.fill();
      context.lineWidth = Math.max(1.5, size * 0.1);
      context.strokeStyle = palette.light;
      context.stroke();

      context.lineWidth = Math.max(0.8, size * 0.055);
      context.lineCap = "round";
      context.lineJoin = "bevel";
      context.strokeStyle = "rgba(55, 31, 18, 0.82)";
      for (const branch of fracture.branches) {
        const angle = branch.angle;
        const startX = projection.x + Math.cos(angle) * size * 0.78;
        const startY = projection.y + Math.sin(angle) * size * 0.78;
        const endX = projection.x + Math.cos(angle + branch.bend * 0.18) * size * branch.length;
        const endY = projection.y + Math.sin(angle + branch.bend * 0.18) * size * branch.length;
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(
          (startX + endX) / 2 + Math.sin(angle) * branch.bend * size * 0.2,
          (startY + endY) / 2 - Math.cos(angle) * branch.bend * size * 0.2,
        );
        context.lineTo(endX, endY);
        context.stroke();
      }
      context.restore();
    }
  }

  function drawFragments(palette, timestamp) {
    for (const fragment of fragments) {
      const elapsed = Math.max(0, timestamp - fragment.createdAt) / 1000;
      if (elapsed > fragment.lifetime) continue;
      const position = gravityPosition(fragment, elapsed);
      const alpha = Math.max(0, 1 - elapsed / fragment.lifetime);
      context.save();
      context.translate(position.x, position.y);
      context.rotate(position.rotation);
      context.globalAlpha = alpha;
      context.beginPath();
      context.moveTo(-fragment.size * 0.65, -fragment.size * 0.24);
      context.lineTo(-fragment.size * 0.12, -fragment.size * 0.72);
      context.lineTo(fragment.size * 0.7, -fragment.size * 0.2);
      context.lineTo(fragment.size * 0.4, fragment.size * 0.63);
      context.lineTo(-fragment.size * 0.42, fragment.size * 0.48);
      context.closePath();
      context.fillStyle = palette.mid;
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = palette.light;
      context.stroke();
      context.restore();
    }
  }

  function render(timestamp = now()) {
    if (destroyed) return;
    const logicalWidth = canvas.width / pixelRatio;
    const logicalHeight = canvas.height / pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, logicalWidth, logicalHeight);
    if (collapseStartedAt !== null) {
      const collapseProgress = Math.min(1, (timestamp - collapseStartedAt) / 300);
      shellOpacity = 1 - collapseProgress;
    }
    const palette = colors();
    if (shellOpacity > 0) {
      drawWaxSphere(palette);
      drawDamage(palette);
    }
    drawFragments(palette, timestamp);
    for (let index = fragments.length - 1; index >= 0; index -= 1) {
      if ((timestamp - fragments[index].createdAt) / 1000 > fragments[index].lifetime) fragments.splice(index, 1);
    }
  }

  function tick(timestamp) {
    frameId = 0;
    render(timestamp);
    const collapseActive = collapseStartedAt !== null && timestamp - collapseStartedAt < 900;
    if (fragments.length > 0 || collapseActive) frameId = requestFrame(tick);
  }

  function schedule() {
    if (!frameId) frameId = requestFrame(tick);
  }

  function addFragments(zoneIndex, count = 3, collapse = false) {
    const projection = project(zones[zoneIndex]);
    const random = seeded(zoneIndex + (collapse ? 700 : 200));
    const createdAt = now();
    for (let index = 0; index < count; index += 1) {
      fragments.push({
        zoneIndex,
        x: projection.x + (random() - 0.5) * 12,
        y: projection.y + random() * 5,
        vx: (random() - 0.5) * (collapse ? 58 : 34),
        vy: random() * (collapse ? 28 : 18),
        gravity: 620 + random() * 160,
        rotation: random() * Math.PI,
        spin: (random() - 0.5) * 8,
        size: (collapse ? 7 : 5) + random() * (collapse ? 9 : 6),
        lifetime: 0.9,
        createdAt,
      });
    }
  }

  function breakZone(zoneIndex) {
    if (brokenZones.has(zoneIndex)) return false;
    brokenZones.add(zoneIndex);
    addFragments(zoneIndex, 2 + (zoneIndex % 3));
    render(now());
    schedule();
    return true;
  }

  function setRotation(nextRotation) {
    rotation.yaw = nextRotation.yaw;
    rotation.pitch = nextRotation.pitch;
    render(now());
  }

  function collapse() {
    if (collapseStartedAt !== null) return;
    collapseStartedAt = now();
    zones.forEach((zone) => {
      const projection = project(zone);
      if (projection.z > 0) addFragments(zone.index, 2, true);
    });
    schedule();
  }

  function reset() {
    brokenZones.clear();
    fragments.length = 0;
    collapseStartedAt = null;
    shellOpacity = 1;
    rotation.yaw = 0;
    rotation.pitch = 0;
    render(now());
  }

  function destroy() {
    destroyed = true;
    if (frameId) cancelFrame(frameId);
    frameId = 0;
  }

  function getDebugState() {
    return Object.freeze({
      brokenZones: Object.freeze([...brokenZones]),
      fragments: Object.freeze(freezeCopies(fragments)),
      rotation: Object.freeze({ ...rotation }),
      shellOpacity,
      collapsing: collapseStartedAt !== null,
    });
  }

  resize();
  return { resize, setRotation, breakZone, collapse, reset, render, destroy, getDebugState };
}
