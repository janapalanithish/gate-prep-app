/**
 * Notification Service for GATE Prep App
 * Supports Android notification channels with snooze/postpone actions
 */
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';

export interface NotificationOptions {
  id: string | number;
  title: string;
  body: string;
  scheduleAt: Date;
  extraData?: Record<string, any>;
}

const CHANNEL_ID = 'gate_prep_reminders';
const CHANNEL_NAME = 'GATE Prep Reminders';

// Track permission state to avoid repeated requests
let permissionChecked = false;
let permissionGranted = false;

export async function initializeNotifications(): Promise<boolean> {
  if (permissionChecked && permissionGranted) return true;

  try {
    // Check current permission status
    const status: PermissionStatus = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      permissionGranted = true;
      permissionChecked = true;
      return true;
    }

    // Request permission if not granted
    const result: PermissionStatus = await LocalNotifications.requestPermissions();
    permissionGranted = result.display === 'granted';
    permissionChecked = true;

    if (!permissionGranted) {
      console.warn('[Notifications] Permission denied — notifications will not fire on Android 13+');
    }

    return permissionGranted;
  } catch (e) {
    console.error('[Notifications] Failed to initialize:', e);
    return false;
  }
}

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
        extra: options.extraData || { id: String(numId) },
      }],
    });
    return true;
  } catch (e) {
    console.error('[Notifications] Failed to schedule:', e);
    return false;
  }
}

/**
 * Schedule an end-time completion-prompt notification with Snooze action.
 * The notification includes action buttons that the Android plugin handles.
 */
export async function scheduleTaskEndReminderWithSnooze(
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
        title: '⏰ Task Complete?',
        body: `Did you finish "${taskTitle}"?`,
        schedule: { at: endTime },
        channelId: CHANNEL_ID,
        actionTypeId: 'TASK_END_REMINDER',
        extra: {
          taskId,
          taskTitle,
          actionType: 'end_prompt',
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
  } catch (e) {
    // ignore
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancelAll();
  } catch (e) {
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
  } catch (e) {
    // Fallback to Web Notifications API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '🎓' });
      return true;
    }
    return false;
  }
}

// ---- Task reminder helpers ----

export async function scheduleTaskStartReminder(
  taskId: string,
  taskTitle: string,
  startTime: Date
): Promise<boolean> {
  return scheduleNotification({
    id: `start_${taskId}`,
    title: '🎯 Task Starting',
    body: `"${taskTitle}" is starting now!`,
    scheduleAt: startTime,
    extraData: { taskId, actionType: 'start' },
  });
}

export async function scheduleTaskEndReminder(
  taskId: string,
  taskTitle: string,
  endTime: Date
): Promise<boolean> {
  return scheduleTaskEndReminderWithSnooze(taskId, taskTitle, endTime);
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
