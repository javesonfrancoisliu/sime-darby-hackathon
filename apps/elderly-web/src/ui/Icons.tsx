import {
  Activity,
  AlertTriangle,
  TreeDeciduous,
  Ticket,
  Star,
  ShoppingCart,
  Recycle,
  Pencil,
  Medal,
  Leaf,
  Heart,
  Footprints,
  Droplet,
  Coffee,
  BookOpen,
  Bell,
  Calendar,
  Car,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Gamepad2,
  Gift,
  HandHeart,
  HeartHandshake,
  HeartPulse,
  House,
  IdCard,
  Info,
  LifeBuoy,
  List,
  MapPin,
  Phone,
  Pin,
  Plus,
  Settings,
  Shield,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sprout,
  Award,
  Sun,
  Thermometer,
  Trophy,
  User,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  Wrench,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

export type IconProps = LucideProps;

const DEFAULT_SIZE = 22;
const DEFAULT_STROKE_WIDTH = 2;

// Every icon comes from lucide-react, the same set the volunteer app uses, with this app's size and stroke defaults.
function withDefaults(Icon: LucideIcon) {
  return function AppIcon({
    size = DEFAULT_SIZE,
    strokeWidth = DEFAULT_STROKE_WIDTH,
    ...props
  }: IconProps) {
    return <Icon size={size} strokeWidth={strokeWidth} {...props} />;
  };
}

export const IconHome = withDefaults(House);
export const IconShield = withDefaults(Shield);
export const IconUsers = withDefaults(Users);
export const IconUser = withDefaults(User);
export const IconShoppingBag = withDefaults(ShoppingBag);
export const IconCar = withDefaults(Car);
export const IconDevice = withDefaults(Smartphone);
export const IconHeartHandshake = withDefaults(HeartHandshake);
export const IconHeartPulse = withDefaults(HeartPulse);
export const IconMapPin = withDefaults(MapPin);
export const IconWind = withDefaults(Wind);
export const IconWaves = withDefaults(Waves);
export const IconThermometer = withDefaults(Thermometer);
export const IconWrench = withDefaults(Wrench);
export const IconCalendar = withDefaults(Calendar);
export const IconAlertTriangle = withDefaults(AlertTriangle);
export const IconClock = withDefaults(Clock);
export const IconCheck = withDefaults(Check);
export const IconArrowRight = withDefaults(ArrowRight);
export const IconChevronLeft = withDefaults(ChevronLeft);
export const IconChevronRight = withDefaults(ChevronRight);
export const IconPlus = withDefaults(Plus);
export const IconList = withDefaults(List);
export const IconBell = withDefaults(Bell);
export const IconPin = withDefaults(Pin);
export const IconInfo = withDefaults(Info);
export const IconVolume2 = withDefaults(Volume2);
export const IconVolumeX = withDefaults(VolumeX);
export const IconSun = withDefaults(Sun);
export const IconPhone = withDefaults(Phone);
export const IconX = withDefaults(X);
export const IconTrophy = withDefaults(Trophy);
export const IconFlame = withDefaults(Flame);
export const IconGift = withDefaults(Gift);
export const IconGamepad = withDefaults(Gamepad2);
export const IconHandHeart = withDefaults(HandHeart);
export const IconIdCard = withDefaults(IdCard);
export const IconLifeBuoy = withDefaults(LifeBuoy);
export const IconSettings = withDefaults(Settings);
export const IconUserRound = withDefaults(UserRound);
export const IconSparkles = withDefaults(Sparkles);
export const IconSprout = withDefaults(Sprout);
export const IconAward = withDefaults(Award);
export const IconActivity = withDefaults(Activity);
export const IconBook = withDefaults(BookOpen);
export const IconCoffee = withDefaults(Coffee);
export const IconDroplet = withDefaults(Droplet);
export const IconFootprints = withDefaults(Footprints);
export const IconHeart = withDefaults(Heart);
export const IconLeaf = withDefaults(Leaf);
export const IconMedal = withDefaults(Medal);
export const IconPencil = withDefaults(Pencil);
export const IconRecycle = withDefaults(Recycle);
export const IconCart = withDefaults(ShoppingCart);
export const IconStar = withDefaults(Star);
export const IconTicket = withDefaults(Ticket);
export const IconTree = withDefaults(TreeDeciduous);
