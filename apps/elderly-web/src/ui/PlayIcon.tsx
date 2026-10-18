import type { ComponentType } from "react";
import type { PlayIconName } from "../types/challenges";
import {
  IconCheck,
  IconDevice,
  IconFlame,
  IconGift,
  IconHeartHandshake,
  IconHeartPulse,
  IconMapPin,
  IconShieldCheck,
  IconShoppingBag,
  IconSparkles,
  IconSun,
  IconTrophy,
  IconUser,
  type IconProps,
} from "./Icons";

const PLAY_ICONS: Record<PlayIconName, ComponentType<IconProps>> = {
  walk: IconMapPin,
  plant: IconSparkles,
  device: IconDevice,
  check: IconCheck,
  streak: IconFlame,
  neighbour: IconHeartHandshake,
  sun: IconSun,
  trophy: IconTrophy,
  groceries: IconShoppingBag,
  health: IconHeartPulse,
  gift: IconGift,
  pharmacy: IconShieldCheck,
  person: IconUser,
};

export function PlayIcon({ name, className }: { name: PlayIconName; className?: string }) {
  const Icon = PLAY_ICONS[name];
  return <Icon size={28} strokeWidth={1.8} className={className} aria-hidden="true" />;
}
