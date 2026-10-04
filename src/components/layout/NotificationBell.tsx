import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "../../lib/toast";

import { useAuth } from "../../app/AuthContext";
import { supabase } from "../../lib/supabase";

type NotificationItem = {
  id: string;
  type: string;
  booking_id: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

const notificationTitles: Record<string, string> = {
  booking_requested: "New booking request",
  booking_accepted: "Your request was accepted",
  booking_declined: "Your request was declined",
  booking_cancelled: "A booking was cancelled",
  booking_completed: "Your booking was completed",
};

function notificationTitle(notification: NotificationItem) {
  const title = notification.payload.listing_title;
  const base = notificationTitles[notification.type] ?? "Booking update";
  return typeof title === "string" ? `${base}: ${title}` : base;
}

type NotificationBellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemClick: () => void;
};

export function NotificationBell({
  open,
  onOpenChange,
  onItemClick,
}: NotificationBellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    refetchInterval: 30_000,
    queryFn: async () => {
      const [listResult, unreadResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, type, booking_id, payload, read_at, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .is("read_at", null),
      ]);
      if (listResult.error) throw listResult.error;
      if (unreadResult.error) throw unreadResult.error;
      return {
        items: (listResult.data ?? []) as NotificationItem[],
        unreadCount: unreadResult.count ?? 0,
      };
    },
  });

  if (!user) return null;

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  async function openNotification(notification: NotificationItem) {
    onItemClick();
    if (!user) return;
    if (!notification.read_at) {
      setMarkingId(notification.id);
      const { error } = await supabase.rpc("mark_notifications_read", {
        p_notification_id: notification.id,
      });
      setMarkingId(null);
      if (error) {
        toast.error("Could not mark this notification as read.");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["notifications", user.id],
      });
    }

    if (notification.booking_id) {
      navigate(`/bookings/${notification.booking_id}`);
    }
  }

  return (
    <div className="relative" data-header-menu="notifications">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        title="Notifications"
        onClick={() => onOpenChange(!open)}
        className="relative grid min-h-11 min-w-11 cursor-pointer list-none place-items-center rounded-xl border border-white/20 hover:bg-white/10"
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          onClick={onItemClick}
          className="absolute right-0 z-30 mt-2 max-h-[min(70vh,32rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-cream-100 bg-white p-2 text-ink shadow-lg"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <h2 className="font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="text-xs text-slate-600">
                {unreadCount} unread
              </span>
            )}
          </div>
          {notificationsQuery.isPending ? (
            <p className="px-3 py-4 text-sm text-slate-600" role="status">
              Loading notifications...
            </p>
          ) : notificationsQuery.isError ? (
            <div className="px-3 py-4" role="alert">
              <p className="text-sm text-slate-600">
                Notifications couldn’t be loaded.
              </p>
              <button
                type="button"
                onClick={() => void notificationsQuery.refetch()}
                className="mt-3 min-h-10 rounded-lg border border-ink/20 px-3 text-sm font-medium"
              >
                Try again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-600">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-cream-100">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    disabled={markingId === notification.id}
                    onClick={() => void openNotification(notification)}
                    className={`w-full rounded-lg px-3 py-3 text-left hover:bg-cream-50 disabled:opacity-60 ${notification.read_at ? "" : "bg-teal-50/70"}`}
                  >
                    <span className="block text-sm font-medium">
                      {notificationTitle(notification)}
                    </span>
                    <time
                      className="mt-1 block text-xs text-slate-600"
                      dateTime={notification.created_at}
                    >
                      {format(new Date(notification.created_at), "MMM d, p")}
                    </time>
                    {markingId === notification.id && (
                      <span className="sr-only">Marking as read...</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
