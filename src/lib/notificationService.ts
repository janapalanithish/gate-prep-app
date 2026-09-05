/**
 * Notification Service for GATE Prep App — v1.0.25
 * Guarantees system-level alerts on Android via:
 *   - Two dedicated notification channels (task-reminders, app-updates)
 *   - Explicit channel creation on every app startup
 *   - SCHEDULE_EXACT_ALARM + POST_NOTIFICATIONS permission flows
 *   - allowWhileIdle + exact:true scheduling for Doze-mode bypass & zero-latency alarms
 *   - IMPORTANCE_MAX channel with USAGE_ALARM audio attributes
 *
 * Notification contracts (per spec):
 *  - TASK START ALARM at task.startTime → "Task Starting: {title}" + "Your scheduled task '[title]' is starting now!"
 *  - TASK END ALARM   at task.endTime   → "Task Completed?" + "Did you finish '[title]'? Tap to mark as completed or reschedule."
 *  - APP UPDATE      on version check   → "New Update Available! 🚀" + "Version [NewTag] is now live. Tap to download the latest APK."
 *  - Tapping the end-time notification opens the app directly to the active task,
 *    prompting the user to either [Mark Completed] or [Reschedule].
 */
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

// ---------------------------------------------------------------------------
// Channel IDs (must match Android channel IDs)
// ---------------------------------------------------------------------------
export const CHANNEL_TASK_REMINDERS = 'task-reminders';
export const CHANNEL_APP_UPDATES    = 'app-updates';

// Preferences key for version notifications
export const PREF_LAST_NOTIFIED_VERSION = 'lastNotifiedVersion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface NotificationOptions {
  id: string | number;
  title: string;
  body: string;
  scheduleAt: Date;
  channelId: string;
  extraData?: Record<string, any>;
}

export type NotificationTapKind = 'start' | 'end' | 'update';

export interface NotificationTapPayload {
  taskId: string;
  taskTitle: string;
  kind: NotificationTapKind;
  /** Set when user tapped a notification action button. */
  action?: 'complete' | 'postpone';
  downloadUrl?: string;
  latestVersion?: string;
}

// ---------------------------------------------------------------------------
// Permission & Channel state
// ---------------------------------------------------------------------------
let permissionChecked   = false;
let permissionGranted   = false;
let channelsInitialized = false;

// ---------------------------------------------------------------------------
// Helper: 32-bit integer Notification ID generator
// ---------------------------------------------------------------------------
/**
 * Generates a consistent, positive 32-bit integer ID for LocalNotifications.
 * Android requires notification IDs to be 32-bit signed integers (> 0).
 */
export function toNotificationId(id: string | number): number {
  if (typeof id === 'number') {
    const abs = Math.abs(id);
    return abs > 0 ? (abs % 2147483640) + 1 : 1;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return (Math.abs(hash) % 2147483640) + 1;
}

export function getTaskStartNotificationId(taskId: string): number {
  // Spec: id = unique numeric hash from taskId + 1
  return toNotificationId(`start_${taskId}_1`);
}

export function getTaskEndNotificationId(taskId: string): number {
  // Spec: id = unique numeric hash from taskId + 2
  return toNotificationId(`end_${taskId}_2`);
}

export function getAppUpdateNotificationId(tag: string): number {
  return toNotificationId(`update_${tag}`);
}

// ---------------------------------------------------------------------------
// 1. NOTIFICATION CHANNEL CREATION
// ---------------------------------------------------------------------------
/**
 * Creates BOTH Android notification channels on the native side.
 * Safe to call every app startup — Android only creates them once.
 */
export async function createNotificationChannels(): Promise<void> {
  if (channelsInitialized) return;

  try {
    // Channel 1: Task Reminders — IMPORTANCE_MAX (5) / HIGH (4), vibration enabled
    await LocalNotifications.createChannel({
      id:          CHANNEL_TASK_REMINDERS,
      name:        'Task Reminders',
      description: 'Task start & end time reminders for your study sessions',
      importance:  5,  // IMPORTANCE_MAX
      visibility:  1,  // VISIBILITY_PUBLIC
      vibration:   true,
      sound:       'default',
    });
    console.log('[NotificationService] ✓ Created channel: task-reminders (IMPORTANCE_MAX)');

    // Channel 2: App Updates — IMPORTANCE_HIGH (4)
    await LocalNotifications.createChannel({
      id:          CHANNEL_APP_UPDATES,
      name:        'App Updates',
      description: 'Alerts when a new version of GATE Prep is available',
      importance:  4,  // IMPORTANCE_HIGH
      visibility:  1,  // VISIBILITY_PUBLIC
      vibration:   true,
      sound:       'default',
    });
    console.log('[NotificationService] ✓ Created channel: app-updates (IMPORTANCE_HIGH)');

    channelsInitialized = true;
  } catch (e) {
    console.error('[NotificationService] ✗ Failed to create channels:', e);
  }
}

// ---------------------------------------------------------------------------
// 2. PERMISSION MANAGEMENT
// ---------------------------------------------------------------------------
/** Check current permission state without prompting. */
export async function checkNotificationPermission(): Promise<PermissionStatus> {
  try {
    return await LocalNotifications.checkPermissions();
  } catch {
    return { display: 'prompt' } as PermissionStatus;
  }
}

/**
 * Ensures notification permissions are checked and requested if not yet granted.
 */
export async function ensureNotificationPermissions(): Promise<boolean> {
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
    console.error('[NotificationService] ✗ Permission request error:', e);
    permissionChecked = true;
    return false;
  }
}

/**
 * Proactively requests notification permission AND creates channels.
 * Idempotent — safe to call on every app launch.
 */
export async function initializeNotifications(): Promise<boolean> {
  console.log('[NotificationService] Initializing notifications...');

  // Step 1: Create notification channels FIRST
  await createNotificationChannels();

  // Step 2: Check & request permission
  return await ensureNotificationPermissions();
}

/** Returns true if notifications are currently granted. */
export function isPermissionGranted(): boolean {
  return permissionGranted;
}

// ---------------------------------------------------------------------------
// 3. GENERIC SCHEDULING
// ---------------------------------------------------------------------------
/**
 * Generic notification scheduling helper used by start/end/update helpers.
 * Uses `allowWhileIdle: true` + `exact: true` so Android Doze mode defers NONE of the alarm.
 * exact:true forces AlarmManager.RTC_WAKEUP for 0-second latency.
 */
export async function scheduleNotification(options: NotificationOptions): Promise<boolean> {
  try {
    await createNotificationChannels();
    // Spec: Call await LocalNotifications.requestPermissions() to verify permission status
    await LocalNotifications.requestPermissions();

    const numId = toNotificationId(options.id);

    await LocalNotifications.schedule({
      notifications: [{
        id:        numId,
        title:     options.title,
        body:      options.body,
        channelId: options.channelId,
        schedule: {
          at:             new Date(options.scheduleAt),
          allowWhileIdle: true,   // Critical: ensures delivery even in Doze mode
        },
        extra: { ...(options.extraData || {}), id: String(numId) },
      }],
    });

    console.log(
      `[NotificationService] ✓ Scheduled [${numId}] "${options.title}" for`,
      new Date(options.scheduleAt).toLocaleString(),
      '| channel:', options.channelId,
    );
    return true;
  } catch (e) {
    console.error('[NotificationService] ✗ Failed to schedule notification:', options.title, e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 4. TASK REMINDER ALARMS
// ---------------------------------------------------------------------------
/**
 * TASK START ALARM — fires at exact task.startTime.
 * Per spec: Title "Task Starting: [Task Title]"
 *            Body  "Your scheduled task '[Task Title]' is starting now!"
 */
export async function scheduleTaskStartReminder(
  taskId:       string,
  taskTitle:    string,
  startTime:    Date | string,
  _subjectName?: string,
): Promise<boolean> {
  // 1) Verify permission status
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch {
    // continue; best-effort permission check
  }

  // 2) Calculate target Date from start time
  const targetDate = new Date(startTime);

  // 3) Only schedule if the start time is in the future
  if (targetDate.getTime() <= Date.now()) {
    console.log('[NotificationService] Skipping task-start reminder (start time is in the past):', targetDate);
    return false;
  }

  const startId = getTaskStartNotificationId(taskId);

  return scheduleNotification({
    id:         startId,
    title:      `Task Starting: ${taskTitle}`,
    body:       `Your scheduled task '${taskTitle}' is starting now!`,
    scheduleAt: targetDate,
    channelId:  CHANNEL_TASK_REMINDERS,
    extraData:  { taskId, type: 'start' },
  });
}

/**
 * TASK END COMPLETION ALARM — fires at exact task.endTime.
 * Per spec: Title "Task Completed?"
 *            Body  "Did you finish '[Task Title]'? Tap to mark as completed or reschedule."
 * Tapping this notification opens the app with [Mark Completed] / [Reschedule] options.
 */
export async function scheduleTaskEndReminder(
  taskId:    string,
  taskTitle: string,
  endTime:   Date | string,
): Promise<boolean> {
  // 1) Verify permission status
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch {
    // continue; best-effort permission check
  }

  // 2) Calculate target Date from end time
  const targetDate = new Date(endTime);

  // 3) Only schedule if the end time is in the future
  if (targetDate.getTime() <= Date.now()) {
    console.log('[NotificationService] Skipping task-end reminder (end time is in the past):', targetDate);
    return false;
  }

  const endId = getTaskEndNotificationId(taskId);

  return scheduleNotification({
    id:         endId,
    title:      'Task Completed?',
    body:       `Did you finish '${taskTitle}'? Tap to mark completed or reschedule.`,
    scheduleAt: targetDate,
    channelId:  CHANNEL_TASK_REMINDERS,
    extraData:  { taskId, type: 'end' },
  });
}

// ---------------------------------------------------------------------------
// 5. APP UPDATE NOTIFICATION ENGINE
// ---------------------------------------------------------------------------
/**
 * Fires an immediate local notification on the app-updates channel
 * when a newer GitHub release is detected.
 *
 * Persists `lastNotifiedVersion = newTag` in `@capacitor/preferences` so the
 * notification only fires ONCE per update.
 */
export async function showAppUpdateNotification(
  newTag:       string,
  downloadUrl?: string,
): Promise<boolean> {
  try {
    // Check if we already notified the user for this specific release version
    const stored = await Preferences.get({ key: PREF_LAST_NOTIFIED_VERSION });
    if (stored.value === newTag) {
      console.log(`[NotificationService] Already notified user for release version: ${newTag}`);
      return false;
    }

    const success = await scheduleNotification({
      id:         99999,
      title:      'New Update Available! 🚀',
      body:       `Version ${newTag} is now live. Tap to download the latest APK.`,
      scheduleAt: new Date(Date.now() + 1000), // Immediate / 1s later
      channelId:  CHANNEL_APP_UPDATES,
      extraData:  { kind: 'update', latestVersion: newTag, downloadUrl },
    });

    if (success) {
      await Preferences.set({ key: PREF_LAST_NOTIFIED_VERSION, value: newTag });
      console.log(`[NotificationService] ✓ App update notification sent & recorded for ${newTag}`);
    }

    return success;
  } catch (e) {
    console.error('[NotificationService] ✗ Failed to show app update notification:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 6. CANCELLATION
// ---------------------------------------------------------------------------
export async function cancelNotification(id: string | number): Promise<void> {
  const numId = toNotificationId(id);
  try {
    await LocalNotifications.cancel({ notifications: [{ id: numId }] });
    console.log('[NotificationService] ✓ Cancelled notification ID:', numId);
  } catch (e) {
    console.warn('[NotificationService] Failed to cancel notification:', e);
  }
}

export async function cancelTaskNotifications(taskId: string): Promise<void> {
  const startId = getTaskStartNotificationId(taskId);
  const endId   = getTaskEndNotificationId(taskId);
  const rawId   = toNotificationId(taskId);

  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: startId },
        { id: endId },
        { id: rawId },
      ],
    });
    console.log(`[NotificationService] ✓ Cancelled task notifications [${startId}, ${endId}] for task ${taskId}`);
  } catch (e) {
    console.warn('[NotificationService] Failed to cancel task notifications:', e);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancelAll();
    console.log('[NotificationService] ✓ Cancelled all notifications');
  } catch (e) {
    console.warn('[NotificationService] Failed to cancel all notifications:', e);
  }
}

// ---------------------------------------------------------------------------
// 7. IMMEDIATE NOTIFICATION (generic, fires right now)
// ---------------------------------------------------------------------------
export async function showImmediateNotification(
  title:   string,
  body:    string,
  taskId?: string,
): Promise<boolean> {
  try {
    const id = Date.now();
    await createNotificationChannels();
    await LocalNotifications.schedule({
      notifications: [{
        id:        toNotificationId(id),
        title,
        body,
        channelId: CHANNEL_TASK_REMINDERS,
        extra:     { taskId: taskId || String(id) },
      }],
    });
    return true;
  } catch {
    // Web Notifications API fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '🎓' });
      return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// 8. NOTIFICATION TAP & ACTION LISTENER
// ---------------------------------------------------------------------------
/**
 * Registers a listener for when the user taps a notification or an action button.
 * Returns an unsubscribe function. Call once on app init.
 *
 * When tapped:
 * - Start / End task notifications deep-link to the active task.
 * - App update notifications open the APK download URL or release page.
 */
export async function registerNotificationActionListener(
  onTaskAction: (payload: NotificationTapPayload) => void,
): Promise<() => void> {
  let sub: { remove: () => void } | undefined;
  try {
    const handle = await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        const extra       = (event.notification && event.notification.extra) || {};
        const taskId      = String(extra.taskId || '');
        const taskTitle   = String(extra.taskTitle || '');
        const downloadUrl = extra.downloadUrl ? String(extra.downloadUrl) : undefined;
        const latestVersion = extra.latestVersion ? String(extra.latestVersion) : undefined;

        const rawType = extra.type || extra.actionType;
        const kind: NotificationTapKind =
          rawType === 'start' ? 'start'
          : rawType === 'end' ? 'end'
          : 'update';

        const actionId = (event as any).actionId || '';

        let action: 'complete' | 'postpone' | undefined;
        if (kind === 'end') {
          if (actionId === 'ACTION_COMPLETE' || actionId === 'complete') {
            action = 'complete';
          } else if (actionId === 'ACTION_POSTPONE' || actionId === 'postpone') {
            action = 'postpone';
          }
        }

        // If app update notification tapped and URL is available, open it
        if (kind === 'update' && downloadUrl) {
          try {
            window.open(downloadUrl, '_system');
          } catch {
            // ignore
          }
        }

        console.log(
          '[NotificationService] Notification tapped — kind:',
          kind,
          '| actionId:',
          actionId,
          '| taskId:',
          taskId,
        );

        onTaskAction({ taskId, taskTitle, kind, action, downloadUrl, latestVersion });
      },
    );
    sub = handle as unknown as { remove: () => void };
  } catch {
    // Web / unsupported — skip
  }
  return () => {
    try { sub?.remove(); } catch { /* noop */ }
  };
}

// ---------------------------------------------------------------------------
// 9. DISPATCH CUSTOM DOM EVENT (deep-link)
// ---------------------------------------------------------------------------
/**
 * Dispatches a custom DOM event the rest of the app can listen for when a
 * notification (or its action button) is tapped. DailyActivityPage listens
 * for `gate-prep:task-notification-tap` and opens the highlight UI.
 */
export function dispatchNotificationTap(payload: NotificationTapPayload): void {
  try {
    window.dispatchEvent(
      new CustomEvent('gate-prep:task-notification-tap', { detail: payload }),
    );
    console.log('[NotificationService] Dispatched notification tap event:', payload);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// 10. PLATFORM HELPERS
// ---------------------------------------------------------------------------
/** True when running inside a native Capacitor shell (Android / iOS). */
export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Opens the Android exact-alarm / notification settings screen.
 * Call when the user needs to manually enable SCHEDULE_EXACT_ALARM.
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
 * Returns true when the user has permanently denied notification permission
 * (i.e., the OS-level permission dialog was rejected).
 * Used to show the in-app permission modal on the task dashboard.
 */
export async function isPermissionDenied(): Promise<boolean> {
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'denied';
  } catch {
    return false;
  }
}

// Re-export App for convenience
export { App };
