import type { Category } from "@sdh/contracts";
import {
  IconCar,
  IconDevice,
  IconHeartHandshake,
  IconHeartPulse,
  IconPlus,
  IconShoppingBag,
} from "./Icons";

export function CategoryIcon({ id, size = 22 }: { id: Category; size?: number }) {
  const props = { size, strokeWidth: 1.8 };
  switch (id) {
    case "groceries":
      return <IconShoppingBag {...props} />;
    case "transport":
      return <IconCar {...props} />;
    case "digital_literacy":
      return <IconDevice {...props} />;
    case "home_help":
      return <IconHeartHandshake {...props} />;
    case "health_literacy":
      return <IconHeartPulse {...props} />;
    default:
      return <IconPlus {...props} />;
  }
}
