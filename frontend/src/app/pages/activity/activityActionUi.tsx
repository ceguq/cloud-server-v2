import {
  Upload,
  Download,
  Share2,
  Trash2,
  Edit3,
  LogIn,
  ArrowRightLeft,
  RotateCcw,
  Clock,
  FileText,
  Image,
  Folder,
  Archive,
} from "lucide-react";

type LucideIcon = any;

type ActionUI = {
  icon: LucideIcon;
  color: string;
  fileIcon: LucideIcon;
  fileColor: string;
};

export function getActionUI(action: string | null, subjectType: string | null): ActionUI {
  const a = (action || "").toLowerCase();
  const st = (subjectType || "").toLowerCase();

  const hasAny = (needles: string[]) => needles.some((n) => a.includes(n));

  if (a.includes("upload")) {
    return { icon: Upload, color: "#22d3ee", fileIcon: FileText, fileColor: "#ef4444" };
  }
  if (a.includes("download")) {
    return { icon: Download, color: "#34d399", fileIcon: FileText, fileColor: "#22c55e" };
  }
  if (a.includes("share")) {
    return { icon: Share2, color: "#3b82f6", fileIcon: Folder, fileColor: "#f59e0b" };
  }
  if (
    hasAny([
      "login",
      "logged_in",
      "logged in",
      "sign in",
      "signed in",
      "auth.login",
      "user_login",
    ])
  ) {
    return { icon: LogIn, color: "#06b6d4", fileIcon: FileText, fileColor: "#22c55e" };
  }

  if (
    hasAny([
      "trash",
      "trashed",
      "move_to_trash",
      "moved_to_trash",
      "file_trashed",
      "folder_trashed",
    ])
  ) {
    return { icon: Trash2, color: "#ef4444", fileIcon: Archive, fileColor: "#f59e0b" };
  }

  if (
    hasAny(["restore", "restored", "file_restored", "folder_restored"])
  ) {
    return { icon: RotateCcw, color: "#10b981", fileIcon: Archive, fileColor: "#34d399" };
  }

  if (
    hasAny([
      "move",
      "moved",
      "file_moved",
      "folder_moved",
      "moved_file",
      "moved_folder",
      "parent changed",
      "folder changed",
    ])
  ) {
    return { icon: ArrowRightLeft, color: "#f59e0b", fileIcon: Folder, fileColor: "#f59e0b" };
  }

  if (a.includes("delete")) {
    return { icon: Trash2, color: "#ef4444", fileIcon: Archive, fileColor: "#64748b" };
  }
  if (a.includes("rename") || a.includes("edit")) {
    return { icon: Edit3, color: "#f59e0b", fileIcon: Image, fileColor: "#a78bfa" };
  }

  if (a.includes("view")) {
    return { icon: LogIn, color: "#94a3b8", fileIcon: FileText, fileColor: "#ef4444" };
  }

  if (st.includes("folder")) {
    return { icon: ArrowRightLeft, color: "#f59e0b", fileIcon: Folder, fileColor: "#f59e0b" };
  }

  return { icon: Clock, color: "#94a3b8", fileIcon: FileText, fileColor: "#94a3b8" };
}
