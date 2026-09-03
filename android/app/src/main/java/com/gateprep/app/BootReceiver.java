package com.gateprep.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Restores scheduled alarms after device reboot.
 * Capacitor's @capacitor/local-notifications plugin re-registers its own
 * BootReceiver at runtime when the app is launched, so this is a defensive
 * log to confirm the manifest entry fired.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "GatePrepBoot";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "[NotificationService] BootReceiver fired with action=" + action);
        // Capacitor Local Notifications plugin will re-schedule pending notifications
        // when the app is next launched. We simply log so logcat can confirm boot
        // completed was received.
    }
}
