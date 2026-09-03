/**
 * Notification Service for GATE Prep App
 * Supports Android notification channels with start/end task reminders.
 *
 * Key contracts:
 *  - Schedule a TASK START ALARM at task start time:
 *      title: "Task Time Arrived!"
 *      body:  "Your task '[Task Title]' is starting now."
 *  - Schedule a TASK END COMPLETION ALARM at task end time:
 *      title: "Task Time Finished!"
 *      body:  "Did you complete '[Task Title]'? Open app to confirm or reschedule."
 *  - Tapping a notification (or its action button) deep-links into the app and
 *    highlights the originating task with [Complete] or [Reschedule] options.
 */
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

export interface NotificationOptions {
  id: string | number;
  title: string;
  body: string;
  scheduleAt: Date;
  extraData?: Record<string, any>;
}

export type NotificationTapKind = 'start' | 'end';

export interface NotificationTapPayload {
  taskId: string;
  taskTitle: string;
  kind: NotificationTapKind;
  /** If user picked an action button (Complete / Reschedule) right from the notification. */
  action?: 'complete' | 'postpone';
}

const CHANNEL_ID = 'gate_prep_reminders';
const CHANNEL_NAME = 'GATE Prep Reminders';

// Track permission state to avoid repeated requests
let permissionChecked = false;
let permissionGranted = false;

/**
 * Check current permission state without prompting.
 */
export async function checkNotificationPermission(): Promise<PermissionStatus> {
  try {
    return await LocalNotifications.checkPermissions();
  } catch {
    return { display: 'prompt' } as PermissionStatus;
  }
}

/**
 * Proactively request Capacitor LocalNotifications permission.
 * Idempotent — safe to call on app launch and when opening the Add Task modal.
 */
export async function initializeNotifications(): Promise<boolean> {
  try {
    const status: PermissionStatus = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      permissionGranted = true;
      permissionChecked = true;
      return true;
    }
    const result: PermissionStatus = await LocalNotifications.requestPermissions();
    permissionGranted = result.display === 'granted';
    permissionChecked = true;
    return permissionGranted;
  } catch (e) {
    console.error('[Notifications] Failed to initialize:', e);
    return false;
  }
}

/** Returns true if notifications are currently granted. */
export function isPermissionGranted(): boolean {
  return permissionGranted;
}

/**
 * Generic notification scheduling helper used by start/end reminder helpers.
 */
export async function scheduleNotification(options: NotificationOptions): Promise<boolean> {
  try {
    const numId = typeof options.id === 'string'
      ? parseInt(options.id.replace(/\D/g, ''), 10) || Date.now()
      : options.id;

    await LocalNotifications.schedule({
      notifications: [{
        id: numId,
        title: options.title,
        body: options.body,
        schedule: { at: options.scheduleAt },
        channelId: CHANNEL_ID,
        extra: { ...(options.extraData || {}), id: String(numId) },
      }],
    });
    return true;
  } catch (e) {
    console.error('[Notifications] Failed to schedule:', e);
    return false;
  }
}

/**
 * Schedule the TASK START ALARM at the task's start time.
 * Title: "Task Time Arrived!"
 * Body:  "Your task '[Title]' is starting now."
 */
export async function scheduleTaskStartReminder(
  taskId: string,
  taskTitle: string,
  startTime: Date
): Promise<boolean> {
  return scheduleNotification({
    id: `start_${taskId}`,
    title: 'Task Time Arrived!',
    body: `Your task '${taskTitle}' is starting now.`,
    scheduleAt: startTime,
    extraData: { taskId, taskTitle, actionType: 'start' },
  });
}

/**
 * Schedule the TASK END COMPLETION ALARM at the task's end time.
 * Title: "Task Time Finished!"
 * Body:  "Did you complete '[Title]'? Open app to confirm or reschedule."
 *
 * The notification carries action buttons (Complete / Reschedule). Tapping the
 * notification (or a button) deep-links into the app, which highlights the
 * originating task with [Complete] / [Reschedule] choices.
 */
export async function scheduleTaskEndReminder(
  taskId: string,
  taskTitle: string,
  endTime: Date
): Promise<boolean> {
  try {
    const numId = typeof taskId === 'string'
      ? parseInt(taskId.replace(/\D/g, ''), 10) || Date.now()
      : taskId;

    await LocalNotifications.schedule({
      notifications: [{
        id: numId,
        title: 'Task Time Finished!',
        body: `Did you complete '${taskTitle}'? Open app to confirm or reschedule.`,
        schedule: { at: endTime },
        channelId: CHANNEL_ID,
        actionTypeId: 'TASK_END_REMINDER',
        extra: {
          taskId,
          taskTitle,
          actionType: 'end',
          actionIds: ['ACTION_COMPLETE', 'ACTION_POSTPONE'],
          actionLabels: ['Complete', 'Reschedule'],
        },
      }],
    });
    return true;
  } catch (e) {
    console.error('[Notifications] Failed to schedule end reminder:', e);
    return false;
  }
}

export async function cancelNotification(id: string | number): Promise<void> {
  const numId = typeof id === 'string'
    ? parseInt(id.replace(/\D/g, ''), 10) || 0
    : id;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: numId }] });
  } catch {
    // ignore
  }
}

export async function cancelTaskNotifications(taskId: string): Promise<void> {
  // Cancel both the start and end reminders for a given task.
  await Promise.all([
    cancelNotification(`start_${taskId}`),
    cancelNotification(`end_${taskId}`),
    cancelNotification(taskId),
  ]);
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancelAll();
  } catch {
    // ignore
  }
}

export async function showImmediateNotification(
  title: string,
  body: string,
  taskId?: string
): Promise<boolean> {
  try {
    const id = Date.now();
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title,
        body,
        channelId: CHANNEL_ID,
        extra: { taskId: taskId || String(id) },
      }],
    });
    return true;
  } catch {
    // Fallback to Web Notifications API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '🎓' });
      return true;
    }
    return false;
  }
}

/**
 * Registers a listener for when the user taps a notification or one of its
 * action buttons. Returns an unsubscribe function. Call once on app init.
 */
export async function registerNotificationActionListener(
  onTaskAction: (payload: NotificationTapPayload) => void
): Promise<() => void> {
  let sub: { remove: () => void } | undefined;
  try {
    const handle = await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        const extra = (event.notification && event.notification.extra) || {};
        const taskId: string = extra.taskId || '';
        const taskTitle: string = extra.taskTitle || '';
        const kind: NotificationTapKind = extra.actionType === 'start' ? 'start' : 'end';
        const actionId = (event as any).actionId || '';

        let action: 'complete' | 'postpone' | undefined;
        if (kind === 'end') {
          if (actionId === 'ACTION_COMPLETE' || actionId === 'complete') {
            action = 'complete';
          } else if (actionId === 'ACTION_POSTPONE' || actionId === 'postpone') {
            action = 'postpone';
          }
        }
        onTaskAction({ taskId, taskTitle, kind, action });
      }
    );
    sub = handle as unknown as { remove: () => void };
  } catch {
    // Web / unsupported — skip
  }
  return () => {
    try {
      sub?.remove();
    } catch {
      /* noop */
    }
  };
}

/**
 * Check if the app is running on a native platform (Capacitor Android/iOS).
 */
export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Open the device's exact alarm / notification settings page.
 * Called when the user needs to grant SCHEDULE_EXACT_ALARM permission.
 */
export function openExactAlarmSettings(): void {
  if ('Android' in window) {
    try {
      (window as any).Android?.openExactAlarmSettings?.();
    } catch {
      // ignore
    }
  }
}

/**
 * Dispatch a custom DOM event the rest of the app can listen for when a
 * notification (or its action button) is tapped. The DailyActivityPage
 * listens for `gate-prep:task-notification-tap` and opens the highlight UI.
 */
export function dispatchNotificationTap(payload: NotificationTapPayload): void {
  try {
    window.dispatchEvent(
      new CustomEvent('gate-prep:task-notification-tap', { detail: payload })
    );
  } catch {
    // ignore
  }
}

// Re-export App for convenience to listeners that need to focus the app.
export { App };
