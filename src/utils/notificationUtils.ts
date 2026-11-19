/**
 * Utilities for managing real OS-level notifications via the Service Worker
 * and Web Notifications API, including iPhone (iOS Safari) standalone detection.
 */

export type NotificationStatus =
  | 'granted'
  | 'default'
  | 'denied'
  | 'ios-needs-install'
  | 'unsupported';

export interface PicoNotificationOptions {
  body?: string;
  tag?: string;
  requireInteraction?: boolean;
  renotify?: boolean;
  vibrate?: number[];
}

interface ServiceWorkerNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  vibrate?: number[];
}

/**
 * Detects if the device is an iPhone/iPad running inside a normal browser tab
 * rather than installed to the Home Screen (`display: standalone`).
 */
export function isIosBrowserTab(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as unknown as { standalone?: boolean }).standalone);

  return isIos && !isStandalone;
}

/**
 * Returns the current notification capability and permission state.
 */
export function getNotificationStatus(): NotificationStatus {
  if (isIosBrowserTab()) {
    return 'ios-needs-install';
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests OS notification permission inside a direct user click handler.
 */
export async function requestOsNotificationPermission(): Promise<NotificationStatus> {
  if (isIosBrowserTab()) {
    return 'ios-needs-install';
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  const result = await Notification.requestPermission();
  return result;
}

/**
 * Sends a real OS notification using the active Service Worker registration
 * (required on mobile Android/iOS PWAs), falling back to `new Notification()`
 * on desktop dev servers if no Service Worker is controlling the page yet.
 */
export async function sendOsNotification(
  title: string,
  options?: PicoNotificationOptions,
): Promise<boolean> {
  if (options?.vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(options.vibrate);
    } catch {
      // Ignore if vibration is blocked or unsupported
    }
  }

  if (getNotificationStatus() !== 'granted') {
    return false;
  }

  const swOptions: ServiceWorkerNotificationOptions = {
    body: options?.body ?? '',
    tag: options?.tag,
    icon: '/pwa-192x192.png',
    badge: '/notification-badge.png',
    requireInteraction: options?.requireInteraction ?? false,
    ...(options?.tag ? { renotify: options?.renotify ?? true } : {}),
    ...(options?.vibrate ? { vibrate: options.vibrate } : {}),
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, swOptions);
        return true;
      }
    }

    // Fallback for desktop browser tabs when Service Worker is not yet registered in dev mode
    const desktopOptions: NotificationOptions = {
      body: swOptions.body,
      tag: swOptions.tag,
      icon: swOptions.icon,
      badge: swOptions.badge,
      requireInteraction: swOptions.requireInteraction,
    };
    const notification = new Notification(title, desktopOptions);
    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        // Ignore
      }
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}
