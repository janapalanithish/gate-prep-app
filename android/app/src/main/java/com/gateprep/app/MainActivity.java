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
     * Creates Channel 1: task-reminders (MAX importance, vibration enabled).
     * This is the primary channel for task start/end alarms.
     */
    private void createTaskRemindersChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_TASK_REMINDERS,
            "Task Reminders",
            NotificationManager.IMPORTANCE_MAX   // importance=5 — top priority, sound + vibration
        );
        channel.setDescription("Task start & end time reminders for your study sessions");
        channel.enableVibration(true);
        channel.enableLights(true);
        channel.setShowBadge(true);
        channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        if (notificationManager != null) {
            notificationManager.createNotificationChannel(channel);
            Log.d("[NotificationService]", "✓ Task Reminders channel created (task-reminders, IMPORTANCE_MAX)");
        }
    }

    /**
     * Creates Channel 2: app-updates (HIGH importance).
     * Used for in-app update availability notifications.
     */
    private void createAppUpdatesChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_APP_UPDATES,
            "App Updates",
            NotificationManager.IMPORTANCE_HIGH  // importance=4 — prominent but below reminders
        );
        channel.setDescription("Alerts when a new version of GATE Prep is available");
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
     * This allows notifications to fire at the precise user-selected time.
     */
    private void requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getSystemService(ALARM_SERVICE);
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Notifications are now enabled
            }
        }
    }

    // Expose method to JavaScript to open exact alarm settings
    @PluginMethod()
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getSystemService(ALARM_SERVICE);
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                call.resolve();
                return;
            }
        }
        call.resolve();
    }
}
