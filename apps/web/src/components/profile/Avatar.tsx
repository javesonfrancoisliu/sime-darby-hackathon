export type AvatarProps = {
  name: string;
  size?: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// Initials scale with the circle but never drop below a readable size.
const AVATAR_FONT_RATIO = 0.4;
const AVATAR_MIN_FONT_PX = 13;

// Initials-based avatar. No image upload / external dependency.
export function Avatar({ name, size = 56 }: AvatarProps) {
  return (
    <span
      className="ui-avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(AVATAR_MIN_FONT_PX, Math.round(size * AVATAR_FONT_RATIO)),
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
