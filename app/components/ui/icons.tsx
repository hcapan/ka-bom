"use client";

/**
 * Central icon registry.
 *
 * One import point for all UI icons across the app. If we swap an icon
 * library later, this is the only file to touch.
 *
 * Naming convention: semantic, not visual. Use "ConfigIcon" not "GearIcon".
 */

import {
  // Sections / categories
  Settings,
  Wrench,
  Tag,
  Layers,
  Zap,
  Cable,
  Shield,
  ScrollText,
  Package,
  Boxes,

  // Actions
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  Save,
  Upload,
  Download,
  RefreshCw,
  Copy,

  // Status / validation
  Check,
  CircleCheck,
  CircleAlert,
  TriangleAlert,
  Info,
  CircleHelp,

  // Hardware
  Server,
  HardDrive,
  Network,
  Wifi,
  Router,
  Cpu,

  // Layout / navigation
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,

  // Misc
  CableCar,
  ListChecks,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  Eye,
  EyeOff,

  type LucideProps,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Sections (used in Accordion / Field titles)
   ───────────────────────────────────────────── */
export const IdentityIcon       = Tag;
export const SlotConfigIcon     = Layers;
export const HardwareIcon       = Wrench;
export const PowerIcon          = Zap;
export const UplinkIcon         = Cable;
export const SmartnetIcon       = Shield;
export const LicenseIcon        = ScrollText;
export const BomPreviewIcon     = Package;
export const GroupIcon          = Boxes;

/* ─────────────────────────────────────────────
   Actions
   ───────────────────────────────────────────── */
export const CloseIcon          = X;
export const AddIcon            = Plus;
export const RemoveIcon         = Minus;
export const DeleteIcon         = Trash2;
export const SearchIcon         = Search;
export const SaveIcon           = Save;
export const UploadIcon         = Upload;
export const DownloadIcon       = Download;
export const RefreshIcon        = RefreshCw;
export const CopyIcon           = Copy;
export const ConfigureIcon      = Settings;

/* ─────────────────────────────────────────────
   Status
   ───────────────────────────────────────────── */
export const OkIcon             = Check;
export const OkBadgeIcon        = CircleCheck;
export const WarnIcon           = TriangleAlert;
export const ErrorIcon          = CircleAlert;
export const InfoIcon           = Info;
export const HelpIcon           = CircleHelp;

/* ─────────────────────────────────────────────
   Hardware semantics (for nodes / cards)
   ───────────────────────────────────────────── */
export const DeviceIcon         = Server;
export const StorageIcon        = HardDrive;
export const NetworkIcon        = Network;
export const WirelessIcon       = Wifi;
export const RouterIcon         = Router;
export const ProcessorIcon      = Cpu;

/* ─────────────────────────────────────────────
   Disclosure / direction
   ───────────────────────────────────────────── */
export const ChevronRightIcon   = ChevronRight;
export const ChevronDownIcon    = ChevronDown;
export const ChevronUpIcon      = ChevronUp;
export const ArrowRightIcon     = ArrowRight;
export const ExternalLinkIcon   = ExternalLink;

/* ─────────────────────────────────────────────
   Toolbar / view
   ───────────────────────────────────────────── */
export const InventoryIcon      = ListChecks;
export const FilesIcon          = FolderOpen;
export const HldIcon            = FileText;
export const ExcelIcon          = FileSpreadsheet;
export const BundledIcon        = CableCar;
export const UnbundledIcon      = Cable;
export const ShowIcon           = Eye;
export const HideIcon           = EyeOff;

export type IconProps = LucideProps;