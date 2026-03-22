import api from './api';

const VAPID_PUBLIC_KEY_STORAGE = 'vapid_public_key';

class PushNotificationService {
    constructor() {
        this.swRegistration = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    }

    async init() {
        if (!this.isSupported) {
            console.log('Push notifications not supported');
            return false;
        }

        try {
            // Register service worker
            this.swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');
            return true;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return false;
        }
    }

    async getVapidPublicKey() {
        // Check cache first
        let key = localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE);
        if (key) return key;

        try {
            const res = await api.get('/push/vapid-public-key');
            key = res.data.publicKey;
            localStorage.setItem(VAPID_PUBLIC_KEY_STORAGE, key);
            return key;
        } catch (error) {
            console.error('Failed to get VAPID key:', error);
            return null;
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async subscribe() {
        if (!this.isSupported || !this.swRegistration) {
            throw new Error('Push notifications not supported or service worker not registered');
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Notification permission denied');
        }

        // Get VAPID key
        const vapidKey = await this.getVapidPublicKey();
        if (!vapidKey) {
            throw new Error('Failed to get VAPID key');
        }

        // Subscribe to push
        const subscription = await this.swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
        });

        // Send subscription to server
        const subJson = subscription.toJSON();
        await api.post('/push/subscribe', {
            endpoint: subJson.endpoint,
            keys: subJson.keys
        });

        console.log('Push notification subscribed');
        return true;
    }

    async unsubscribe() {
        if (!this.swRegistration) return false;

        const subscription = await this.swRegistration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            await api.delete('/push/unsubscribe', { params: { endpoint: subscription.endpoint } });
        }

        console.log('Push notification unsubscribed');
        return true;
    }

    async isSubscribed() {
        if (!this.swRegistration) return false;
        const subscription = await this.swRegistration.pushManager.getSubscription();
        return !!subscription;
    }

    async getPermissionState() {
        if (!this.isSupported) return 'unsupported';
        return Notification.permission;
    }
}

export const pushService = new PushNotificationService();
export default pushService;
