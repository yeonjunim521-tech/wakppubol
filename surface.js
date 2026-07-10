export const SURFACE_ZONE_COUNT = 20;

export function createSurfaceZones(count = SURFACE_ZONE_COUNT) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - ((index + 0.5) / count) * 2;
    const radius = Math.sqrt(1 - y * y);
    const angle = index * goldenAngle;
    return Object.freeze({
      index,
      x: Math.cos(angle) * radius,
      y,
      z: Math.sin(angle) * radius,
    });
  });
}

function rotateX(point, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x,
    y: point.y * cosine - point.z * sine,
    z: point.y * sine + point.z * cosine,
  };
}

function rotateY(point, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x * cosine + point.z * sine,
    y: point.y,
    z: -point.x * sine + point.z * cosine,
  };
}

export function screenPointToLocalVector(point, radius, rotation) {
  const normalizedX = Math.max(-radius, Math.min(radius, point.x)) / radius;
  const normalizedY = Math.max(-radius, Math.min(radius, point.y)) / radius;
  const length = Math.hypot(normalizedX, normalizedY);
  const x = length > 1 ? normalizedX / length : normalizedX;
  const y = length > 1 ? normalizedY / length : normalizedY;
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return rotateY(rotateX({ x, y, z }, -rotation.pitch), -rotation.yaw);
}

export function selectZone(zones, vector) {
  let bestIndex = 0;
  let bestDot = -Infinity;
  for (const zone of zones) {
    const dot = zone.x * vector.x + zone.y * vector.y + zone.z * vector.z;
    if (dot > bestDot) {
      bestDot = dot;
      bestIndex = zone.index;
    }
  }
  return bestIndex;
}

export function classifyGesture(start, end, threshold = 8) {
  return Math.hypot(end.x - start.x, end.y - start.y) < threshold ? "tap" : "drag";
}

function seeded(index) {
  let value = (index + 1) * 0x9e3779b1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

export function createFracture(zoneIndex) {
  const random = seeded(zoneIndex);
  const count = 7 + Math.floor(random() * 5);
  const rim = Array.from({ length: count }, (_, index) => ({
    angle: (index / count) * Math.PI * 2 + (random() - 0.5) * 0.24,
    radius: 0.7 + random() * 0.46,
  }));
  const branches = Array.from({ length: 2 + Math.floor(random() * 3) }, (_, index) => ({
    angle: (index / 4) * Math.PI * 2 + random() * 0.72,
    length: 1.08 + random() * 0.74,
    bend: (random() - 0.5) * 0.58,
  }));
  return { rim, branches };
}

export function gravityPosition(fragment, elapsedSeconds) {
  return {
    x: fragment.x + fragment.vx * elapsedSeconds,
    y: fragment.y + Math.max(0, fragment.vy) * elapsedSeconds + 0.5 * fragment.gravity * elapsedSeconds ** 2,
    rotation: fragment.rotation + fragment.spin * elapsedSeconds,
  };
}
