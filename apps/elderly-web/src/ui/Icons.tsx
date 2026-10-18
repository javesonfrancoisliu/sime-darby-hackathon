import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

const defaultProps = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconHome({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  );
}

export function IconShield({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function IconUsers({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconUser({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconShoppingBag({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export function IconCar({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.5L6 3h12l1.5 4H21a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M9 17h6" />
    </svg>
  );
}

export function IconDevice({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

export function IconHeartHandshake({
  size = 22,
  strokeWidth = 1.8,
  className,
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9" />
      <path d="m14 13 1.5-1.5a2 2 0 0 1 2.82 0v0a2 2 0 0 1 0 2.83L15 17" />
    </svg>
  );
}

export function IconHeartPulse({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H7l2-5 3 10 2-7 1.5 3 1.28-1" />
    </svg>
  );
}

export function IconMapPin({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconWind({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
  );
}

export function IconWaves({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  );
}

export function IconThermometer({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}

export function IconWrench({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function IconCalendar({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function IconAlertTriangle({
  size = 22,
  strokeWidth = 1.8,
  className,
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function IconClock({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconCheck({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconShieldCheck({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconChevronLeft({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function IconChevronRight({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function IconPlus({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconList({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export function IconBell({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function IconPin({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M21.42 10.92l-8.34-8.34a2.25 2.25 0 0 0-3.18 0L7.54 4.94l5.3 5.3-7.07 7.07H2v-3.77l7.07-7.07 5.3 5.3 2.36-2.36a2.25 2.25 0 0 0 0-3.19z" />
      <line x1="2" y1="22" x2="8" y2="16" />
    </svg>
  );
}

export function IconInfo({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function IconVolume2({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

export function IconVolumeX({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export function IconSun({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export function IconPhone({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function IconX({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconSliders({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export function IconTrophy({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M6 4h12v4a6 6 0 0 1-12 0V4z" />
      <path d="M6 6H4a2 2 0 0 0 0 4h2M18 6h2a2 2 0 0 1 0 4h-2" />
      <path d="M9 14.5V17M15 14.5V17M8 21h8M10 17h4" />
    </svg>
  );
}

export function IconFlame({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .4-1.8 1-2.5C8.8 10 9 11 10 11c0-2 .5-4 2-8z" />
    </svg>
  );
}

export function IconGift({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9zM3 7h18v4H3zM12 7v14" />
      <path d="M12 7S10.5 3 8.5 3 6 5 8 7M12 7s1.5-4 3.5-4S18 5 16 7" />
    </svg>
  );
}

export function IconSparkles({ size = 22, strokeWidth = 1.8, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      {...defaultProps}
      {...props}
    >
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z" />
    </svg>
  );
}
