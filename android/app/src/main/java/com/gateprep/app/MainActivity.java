package com.gateprep.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.app.NotificationCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;

public class MainActivity extends BridgeActivity {

    public static final String CHANNEL_TASK_REMINDERS = "task-reminders";
    public static final String CHANNEL_APP_UPDATES    = "app-updates";
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Create BOTH notification channels before requesting permissions
        createTaskRemindersChannel();
        createAppUpdatesChannel();

        // Request POST_NOTIFICATIONS permission (Android 13+)
        requestNotificationPermissions();

        // Request exact alarm permission (Android 12+)
        requestExactAlarmPermission();
    }

    /**
     * Creates Channel 1: task-reminders (HIGH importance, USAGE_ALARM audio attributes, bypass DND, vibration enabled).
     * This is the primary channel for task start/end alarms.
     */
    private void createTaskRemindersChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_TASK_REMINDERS,
                "Task Reminders",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Task start & end time reminders for your study sessions");

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            channel.setSound(soundUri, audioAttributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.enableLights(true);
            channel.setShowBadge(true);
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d("[NotificationService]", "✓ Task Reminders channel created (task-reminders, IMPORTANCE_HIGH, USAGE_ALARM, bypassDnd)");
            }
        }
    }

    /**
     * Creates Channel 2: app-updates (HIGH importance).
     * Used for in-app update availability notifications.
     */
    private void createAppUpdatesChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_APP_UPDATES,
                "App Updates",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerts when a new version of GATE Prep is available");

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .build();

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            channel.setSound(soundUri, audioAttributes);
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d("[NotificationService]", "✓ App Updates channel created (app-updates, IMPORTANCE_HIGH)");
            }
        }
    }

    /**
     * Requests POST_NOTIFICATIONS runtime permission on Android 13+ (API 33).
     * This is required for notifications to fire on Android 13 and later.
     */
    private void requestNotificationPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_PERMISSION_REQUEST_CODE);
            }
        }
    }

    /**
     * Requests SCHEDULE_EXACT_ALARM permission on Android 12+ (API 31).
     * This allows notifications to fire at the precise user-selected time without Doze delay.
     */
    private void requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getSystemService(ALARM_SERVICE);
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                try {
                    Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    try {
                        Intent fallbackIntent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        fallbackIntent.setData(Uri.parse("package:" + getPackageName()));
                        fallbackIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(fallbackIntent);
                    } catch (Exception ex) {
                        Log.e("[NotificationService]", "Failed to request exact alarm permission", ex);
                    }
                }
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d("[NotificationService]", "POST_NOTIFICATIONS granted");
            }
        }
    }

    // Expose method to JavaScript to open exact alarm settings
    @PluginMethod()
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getSystemService(ALARM_SERVICE);
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                try {
                    Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    try {
                        Intent fallbackIntent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        fallbackIntent.setData(Uri.parse("package:" + getPackageName()));
                        fallbackIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(fallbackIntent);
                    } catch (Exception ex) {
                        Log.e("[NotificationService]", "Failed to open exact alarm settings", ex);
                    }
                }
                call.resolve();
                return;
            }
        }
        call.resolve();
    }
}
