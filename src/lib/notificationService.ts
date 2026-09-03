/**
 * Notification Service for GATE Prep App - simplified with correct Capacitor 8 types
 */
import { LocalNotifications } from '@capacitor/local-notifications';

export interface NotificationOptions {
  id: string | number;
  title: string;
  body: string;
  scheduleAt: Date;
  extraData?: Record<string, any>;
}

const CHANNEL_ID = 'gate_prep_reminders';

export async function initializeNotifications(): Promise<boolean> {
  try {
    const result: any = await LocalNotifications.requestPermissions();
    if (result.granted) return true;
    console.warn('Notification permissions denied');
    return false;
  } catch (e) {
    console.error('Failed to initialize notifications:', e);
    return false;
  }
}

export async function scheduleNotification(options: NotificationOptions): Promise<boolean> {
  try {
    const numId = typeof options.id === 'string' ? parseInt(options.id.replace(/\D/g, ''), 10) || Date.now() : options.id;
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
    console.error('Failed to schedule notification:', e);
    return false;
  }
}

export async function cancelNotification(id: string | number): Promise<void> {
  const numId = typeof id === 'string' ? parseInt(id.replace(/\D/g, ''), 10) || 0 : id;
  try { await LocalNotifications.cancel({ notifications: [{ id: numId }] }); } catch (e) { /* ignore */ }
}

export async function cancelAllNotifications(): Promise<void> {
  try { await LocalNotifications.cancelAll(); } catch (e) { /* ignore */ }
}

export async function showImmediateNotification(title: string, body: string, taskId?: string): Promise<boolean> {
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
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '🎓' });
      return true;
    }
    return false;
  }
}

export async function scheduleTaskStartReminder(taskId: string, taskTitle: string, startTime: Date): Promise<boolean> {
  return scheduleNotification({ id: `start_${taskId}`, title: '🎯 Task Starting', body: `"${taskTitle}" is starting now!`, scheduleAt: startTime, extraData: { taskId, actionType: 'start' } });
}

export async function scheduleTaskEndReminder(taskId: string, taskTitle: string, endTime: Date): Promise<boolean> {
  return scheduleNotification({ id: `end_${taskId}`, title: `⏰ Time's Up!`, body: `Did you complete "${taskTitle}"?`, scheduleAt: endTime, extraData: { taskId, actionType: 'end_prompt' } });
}
