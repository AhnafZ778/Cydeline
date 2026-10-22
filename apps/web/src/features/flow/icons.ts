import { Ban, Bot, FileLock2, FileText, Globe, KeyRound, Lock, LogIn, ShieldCheck, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IconKey } from "../../lib/flow";

export const ICONS: Record<IconKey, LucideIcon> = {
  bot: Bot,
  globe: Globe,
  key: KeyRound,
  shield: ShieldCheck,
  login: LogIn,
  file: FileText,
  lock: Lock,
  ban: Ban,
  filelock: FileLock2,
  zap: Zap,
};
