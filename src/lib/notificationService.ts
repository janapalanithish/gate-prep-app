/**
 * Notification Service for GATE Prep App — v1.0.19
 * Guarantees system-level alerts on Android via:
 *   - Two dedicated notification channels (task-reminders, app-updates)
 *   - Explicit channel creation on every app startup
 *   - SCHEDULE_EXACT_ALARM + POST_NOTIFICATIONS permission flows
 *   - allowWhileIdle scheduling for Doze-mode reliability
 *
 * Notification contracts (per spec):
 *  - TASK START ALARM at task.startTime → "Task Starting: {title}" + "Your scheduled task '[title]' is starting now!"
 *  - TASK END ALARM   at task.endTime   → "Task Completed?" + "Did you finish '[title]'? Tap to mark completed or reschedule."
 *  - APP UPDATE      on version check   → "New GATE Prep Update Available!"
 *  - Tapping the end-time notification opens the app directly to the active task,
 *    prompting the user to either [Mark Completed] or [Reschedule].
 */
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

// ---------------------------------------------------------------------------
// Channel IDs (must match Android channel IDs)
// ---------------------------------------------------------------------------
const CHANNEL_TASK_REMINDERS = 'task-reminders';
const CHANNEL_APP_UPDATES    = 'app-updates';

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
}

// ---------------------------------------------------------------------------
// Permission state
// ---------------------------------------------------------------------------
let permissionChecked  = false;
let permissionGranted  = false;
let channelsInitialized = false;

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
    // Channel 1: Task Reminders — IMPORTANCE_MAX (5), vibration enabled
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
 * Proactively requests notification permission AND creates channels.
 * Idempotent — safe to call on every app launch.
 */
export async function initializeNotifications(): Promise<boolean> {
  console.log('[NotificationService] Initializing notifications...');

  // Step 1: Create notification channels FIRST
  await createNotificationChannels();

  // Step 2: Check current permission
  try {
    const status: PermissionStatus = await LocalNotifications.checkPermissions();
    console.log('[NotificationService] Permission status:', status.display);

    if (status.display === 'granted') {
      permissionGranted  = true;
      permissionChecked  = true;
      console.log('[NotificationService] ✓ Notifications already granted');
      return true;
    }

    // Step 3: Request permission
    const result: PermissionStatus = await LocalNotifications.requestPermissions();
    permissionGranted = result.display === 'granted';
    permissionChecked = true;
    console.log('[NotificationService] Permission result:', result.display);

    return permissionGranted;
  } catch (e) {
    console.error('[NotificationService] ✗ Failed to initialize:', e);
    permissionChecked = true;
    return false;
  }
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
 * Uses `allowWhileIdle: true` so Android Doze mode does NOT defer the alarm.
 */
async function scheduleNotification(options: NotificationOptions): Promise<boolean> {
  try {
    const numId = typeof options.id === 'string'
      ? parseInt(options.id.replace(/\D/g, ''), 10) || Date.now()
      : options.id;

    await LocalNotifications.schedule({
      notifications: [{
        id:       numId,
        title:    options.title,
        body:     options.body,
        channelId: options.channelId,
        schedule: {
          at:             new Date(options.scheduleAt),
          allowWhileIdle: true,   // Critical: ensures delivery even in Doze mode
        },
        extra: { ...(options.extraData || {}), id: String(numId) },
      }],
    });

    console.log(
      `[NotificationService] ✓ Scheduled "${options.title}" for`,
      new Date(options.scheduleAt).toLocaleString(),
      '| channel:', options.channelId,
    );
    return true;
  } catch (e) {
    console.error('[NotificationService] ✗ Failed to schedule:', options.title, e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 4. TASK REMINDER ALARMS
// ---------------------------------------------------------------------------
/**
 * TASK START ALARM — fires at exact task.startTime.
 * Per spec: Title "Task Starting: {taskTitle}"
 *            Body  "Your scheduled task '[taskTitle]' is starting now!"
 */
export async function scheduleTaskStartReminder(
  taskId:    string,
  taskTitle: string,
  startTime: Date,
  _subjectName?: string, // unused in new spec
): Promise<boolean> {
  return scheduleNotification({
    id:       `start_${taskId}`,
    title:    `Task Starting: ${taskTitle}`,
    body:     `Your scheduled task '${taskTitle}' is starting now!`,
    scheduleAt: startTime,
    channelId:  CHANNEL_TASK_REMINDERS,
    extraData:  { taskId, taskTitle, actionType: 'start' },
  });
}

/**
 * TASK END COMPLETION ALARM — fires at exact task.endTime.
 * Per spec: Title "Task Completed?"
 *            Body  "Did you finish '[taskTitle]'? Tap to mark completed or reschedule."
 * Tapping this notification opens the app with [Mark Completed] / [Reschedule] options.
 */
export async function scheduleTaskEndReminder(
  taskId:    string,
  taskTitle: string,
  endTime:   Date,
): Promise<boolean> {
  return scheduleNotification({
    id:        `end_${taskId}`,
    title:     'Task Completed?',
    body:      `Did you finish '${taskTitle}'? Tap to mark completed or reschedule.`,
    scheduleAt: new Date(endTime),
    channelId:  CHANNEL_TASK_REMINDERS,
    extraData:  {
      taskId,
      taskTitle,
      actionType: 'end',
    },
  });
}

// ---------------------------------------------------------------------------
// 5. APP UPDATE NOTIFICATION
// ---------------------------------------------------------------------------
/**
 * Fires an immediate local notification on the app-updates channel
 * when a newer GitHub release is detected.
 */
export async function showAppUpdateNotification(
  latestVersion: string,
  downloadUrl?:  string,
): Promise<boolean> {
  return scheduleNotification({
    id:        `update_${Date.now()}`,
    title:     'New GATE Prep Update Available!',
    body:      `Version ${latestVersion} is available. Tap to download and install.`,
    scheduleAt: new Date(), // Fire immediately
    channelId:  CHANNEL_APP_UPDATES,
    extraData:  { kind: 'update', latestVersion, downloadUrl },
  });
}

// ---------------------------------------------------------------------------
// 6. CANCELLATION
// ---------------------------------------------------------------------------
export async function cancelNotification(id: string | number): Promise<void> {
  const numId = typeof id === 'string'
    ? parseInt(id.replace(/\D/g, ''), 10) || 0
    : id;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: numId }] });
    console.log('[NotificationService] ✓ Cancelled notification:', numId);
  } catch {
    // ignore
  }
}

export async function cancelTaskNotifications(taskId: string): Promise<void> {
  await Promise.all([
    cancelNotification(`start_${taskId}`),
    cancelNotification(`end_${taskId}`),
    cancelNotification(taskId),
  ]);
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancelAll();
    console.log('[NotificationService] ✓ Cancelled all notifications');
  } catch {
    // ignore
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
    await LocalNotifications.schedule({
      notifications: [{
        id,
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
// 8. NOTIFICATION TAP LISTENER
// ---------------------------------------------------------------------------
/**
 * Registers a listener for when the user taps a notification or an action button.
 * Returns an unsubscribe function. Call once on app init.
 *
 * On tap → dispatches `gate-prep:task-notification-tap` custom DOM event so
 * the DailyActivityPage can show the [Complete] / [Reschedule] modal.
 */
export async function registerNotificationActionListener(
  onTaskAction: (payload: NotificationTapPayload) => void,
): Promise<() => void> {
  let sub: { remove: () => void } | undefined;
  try {
    const handle = await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        const extra      = (event.notification && event.notification.extra) || {};
        const taskId     = String(extra.taskId || '');
        const taskTitle  = String(extra.taskTitle || '');
        const kind: NotificationTapKind =
          extra.actionType === 'start' ? 'start'
          : extra.actionType === 'end' ? 'end'
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

        console.log(
          '[NotificationService] Notification tapped — kind:',
          kind,
          '| actionId:',
          actionId,
          '| taskId:',
          taskId,
        );

        onTaskAction({ taskId, taskTitle, kind, action });
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
