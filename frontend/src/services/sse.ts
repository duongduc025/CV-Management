import { Notification } from '@/contexts/NotificationContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface SSEMessage {
  id: string;
  event: string;
  data: any;
}

export interface SSENotificationData {
  type: string;
  title: string;
  message: string;
  cv_id?: string;
  request_id?: string;
  requested_by?: string;
  timestamp: number;
}

export class SSEService {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private onNotificationCallback?: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  // Set callback for when notifications are received
  setNotificationCallback(callback: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void) {
    this.onNotificationCallback = callback;
  }

  // Connect to SSE endpoint
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
          reject(new Error('SSE not supported in this environment'));
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
          reject(new Error('No authentication token found'));
          return;
        }

        // Close existing connection if any
        this.disconnect();

        // Create new EventSource connection with token as query parameter
        const url = `${API_URL}/sse/connect?token=${encodeURIComponent(token)}`;
        this.eventSource = new EventSource(url, {
          withCredentials: false
        });

        this.eventSource.onopen = () => {
          console.log('SSE connection established');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };

        this.eventSource.onmessage = this.handleMessage;
        this.eventSource.onerror = this.handleError;

        // Listen for specific events
        this.eventSource.addEventListener('connected', (event) => {
          console.log('SSE connected event:', event.data);
          try {
            const data = JSON.parse(event.data);
            console.log('SSE connection established for user:', data.user_id);
          } catch (error) {
            console.error('Error parsing connected event data:', error);
          }
        });

        this.eventSource.addEventListener('cv_update_request', (event) => {
          console.log('CV update request notification received:', event.data);
          this.handleCVUpdateRequest(event.data);
        });

        this.eventSource.addEventListener('ping', () => {
          // Silent ping handling - just log for debugging if needed
          // console.log('SSE ping received');
        });

        // Handle any other notification events
        this.eventSource.addEventListener('notification', (event) => {
          console.log('General notification received:', event.data);
          this.handleGeneralNotification(event.data);
        });

      } catch (error) {
        console.error('Error connecting to SSE:', error);
        reject(error);
      }
    });
  }

  // Disconnect from SSE
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('SSE connection closed');
    }
  }

  // Handle incoming messages
  private handleMessage(event: MessageEvent) {
    try {
      console.log('SSE message received:', event.data);
      const data = JSON.parse(event.data);

      // Handle different types of messages
      if (data.type === 'cv_update_request') {
        this.handleCVUpdateRequest(event.data);
      }
    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  }

  // Handle CV update request notifications
  private handleCVUpdateRequest(data: string) {
    try {
      const notificationData: SSENotificationData = JSON.parse(data);

      if (this.onNotificationCallback) {
        const notification: Omit<Notification, 'id' | 'createdAt' | 'read'> = {
          title: notificationData.title,
          message: notificationData.message,
          type: 'warning' // CV update requests are typically warnings/reminders
        };

        this.onNotificationCallback(notification);
        console.log('CV update request notification added to UI');
      }
    } catch (error) {
      console.error('Error handling CV update request notification:', error);
    }
  }

  // Handle general notifications
  private handleGeneralNotification(data: string) {
    try {
      const notificationData: SSENotificationData = JSON.parse(data);

      if (this.onNotificationCallback) {
        // Determine notification type based on the notification data
        let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';

        switch (notificationData.type) {
          case 'cv_update_request':
            notificationType = 'warning';
            break;
          case 'success':
            notificationType = 'success';
            break;
          case 'error':
            notificationType = 'error';
            break;
          default:
            notificationType = 'info';
        }

        const notification: Omit<Notification, 'id' | 'createdAt' | 'read'> = {
          title: notificationData.title,
          message: notificationData.message,
          type: notificationType
        };

        this.onNotificationCallback(notification);
        console.log('General notification added to UI:', notificationData.type);
      }
    } catch (error) {
      console.error('Error handling general notification:', error);
    }
  }

  // Handle connection errors
  private handleError(event: Event) {
    console.error('SSE connection error:', event);

    if (this.eventSource?.readyState === EventSource.CLOSED) {
      console.log('SSE connection closed, attempting to reconnect...');
      this.attemptReconnect();
    }
  }

  // Attempt to reconnect with exponential backoff
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
      });
    }, this.reconnectDelay);
  }

  // Check if connected
  isConnected(): boolean {
    if (typeof EventSource === 'undefined') return false;
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  // Get connection state
  getConnectionState(): number {
    if (typeof EventSource === 'undefined') return 2; // CLOSED
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }

  // Test function to simulate receiving a notification (for debugging)
  testNotification() {
    if (this.onNotificationCallback) {
      const testNotification: Omit<Notification, 'id' | 'createdAt' | 'read'> = {
        title: 'Test Notification',
        message: 'This is a test notification from SSE service',
        type: 'info'
      };

      this.onNotificationCallback(testNotification);
      console.log('Test notification sent');
    }
  }
}

// Create singleton instance
export const sseService = new SSEService();

// Export connection states for reference (with SSR safety)
export const SSE_STATES = {
  CONNECTING: typeof EventSource !== 'undefined' ? EventSource.CONNECTING : 0,
  OPEN: typeof EventSource !== 'undefined' ? EventSource.OPEN : 1,
  CLOSED: typeof EventSource !== 'undefined' ? EventSource.CLOSED : 2
};

// Make SSE service available globally for debugging (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).sseService = sseService;
  console.log('SSE service available globally as window.sseService for debugging');
}
