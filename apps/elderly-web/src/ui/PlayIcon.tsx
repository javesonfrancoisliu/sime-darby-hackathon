import type { ComponentType } from "react";
import type { IconKey } from "@sdh/contracts";
import {
  IconActivity,
  IconBook,
  IconCart,
  IconCoffee,
  IconDroplet,
  IconFootprints,
  IconGift,
  IconHeart,
  IconLeaf,
  IconMedal,
  IconRecycle,
  IconShield,
  IconStar,
  IconSun,
  IconTicket,
  IconTree,
  IconTrophy,
  IconUsers,
  type IconProps,
} from "./Icons";

const PLAY_ICONS: Record<IconKey, ComponentType<IconProps>> = {
  walk: IconFootprints,
  run: IconActivity,
  tree: IconTree,
  recycle: IconRecycle,
  leaf: IconLeaf,
  droplet: IconDroplet,
  sun: IconSun,
  heart: IconHeart,
  users: IconUsers,
  book: IconBook,
  trophy: IconTrophy,
  medal: IconMedal,
  star: IconStar,
  shield: IconShield,
  gift: IconGift,
  ticket: IconTicket,
  coffee: IconCoffee,
  cart: IconCart,
};

export function PlayIcon({ name, className }: { name: IconKey; className?: string }) {
  const Icon = PLAY_ICONS[name];
  return <Icon size={28} strokeWidth={1.8} className={className} aria-hidden="true" />;
}
