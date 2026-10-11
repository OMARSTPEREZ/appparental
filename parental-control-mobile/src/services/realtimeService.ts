import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { ChildProfile, LocationData, CommandType, NotificationLog } from '../types';

export interface RemoteCommand {
  id: string;
  targetChildId: string;
  type: CommandType;
  payload?: any;
  timestamp: number;
}

type CommandListener = (command: RemoteCommand) => void;
type StatusListener = (childId: string, status: Partial<ChildProfile>) => void;
type LocationListener = (childId: string, location: LocationData) => void;
type NotificationLogListener = (log: NotificationLog) => void;
type SosAlertListener = (alert: { childId: string; latitude?: number; longitude?: number; timestamp: number }) => void;

class SupabaseRealtimeService {
  private activeChannels: Map<string, RealtimeChannel> = new Map();
  private commandListeners: Set<CommandListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private locationListeners: Set<LocationListener> = new Set();
  private notificationListeners: Set<NotificationLogListener> = new Set();
  private sosListeners: Set<SosAlertListener> = new Set();

  /**
   * Get or create a Supabase Realtime channel for a specific child device
   */
  private getChannel(childId: string): RealtimeChannel {
    const channelName = `kiboo_control_${childId}`;
    if (!this.activeChannels.has(channelName)) {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      });

      // Listen for commands broadcast
      channel
        .on('broadcast', { event: 'COMMAND' }, (payload) => {
          const cmd: RemoteCommand = payload.payload;
          this.commandListeners.forEach((listener) => {
            try {
              listener(cmd);
            } catch (err) {
              console.error('Error in command listener:', err);
            }
          });
        })
        // Listen for live location broadcast
        .on('broadcast', { event: 'LOCATION' }, (payload) => {
          const { childId: id, location } = payload.payload;
          this.locationListeners.forEach((listener) => {
            try {
              listener(id, location);
            } catch (err) {
              console.error('Error in location listener:', err);
            }
          });
        })
        // Listen for device telemetry status broadcast (battery %, GPS)
        .on('broadcast', { event: 'TELEMETRY' }, (payload) => {
          const { childId: id, status } = payload.payload;
          this.statusListeners.forEach((listener) => {
            try {
              listener(id, status);
            } catch (err) {
              console.error('Error in status listener:', err);
            }
          });
        })
        // Listen for intercepted notifications
        .on('broadcast', { event: 'NOTIFICATION_INTERCEPTED' }, (payload) => {
          const log: NotificationLog = payload.payload;
          this.notificationListeners.forEach((listener) => {
            try {
              listener(log);
            } catch (err) {
              console.error('Error in notification log listener:', err);
            }
          });
        })
        // Listen for emergency SOS alerts
        .on('broadcast', { event: 'SOS_ALERT' }, (payload) => {
          const alert = payload.payload;
          this.sosListeners.forEach((listener) => {
            try {
              listener(alert);
            } catch (err) {
              console.error('Error in SOS listener:', err);
            }
          });
        })
        .subscribe((status) => {
          console.log(`[Supabase Realtime] Channel ${channelName} status:`, status);
        });

      this.activeChannels.set(channelName, channel);
    }

    return this.activeChannels.get(channelName)!;
  }

  /**
   * Dispatch a remote command from Parent to Child via Supabase Realtime and database insert
   */
  async sendCommand(targetChildId: string, type: CommandType, payload?: any): Promise<boolean> {
    const command: RemoteCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      targetChildId,
      type,
      payload,
      timestamp: Date.now(),
    };

    const channel = this.getChannel(targetChildId);

    // 1. Instant broadcast over Supabase WebSocket channel
    await channel.send({
      type: 'broadcast',
      event: 'COMMAND',
      payload: command,
    });

    if (type === 'SOS_ALERT') {
      await channel.send({
        type: 'broadcast',
        event: 'SOS_ALERT',
        payload: {
          childId: targetChildId,
          latitude: payload?.latitude,
          longitude: payload?.longitude,
          timestamp: command.timestamp,
        },
      });
    }

    // 2. Persist to Supabase commands table
    try {
      await supabase.from('commands').insert({
        child_id: targetChildId,
        command_type: type,
        payload: payload || {},
        status: 'PENDING',
      });
    } catch (err) {
      console.warn('[Supabase commands] Broadcast delivered, db fallback note:', err);
    }

    return true;
  }

  /**
   * Broadcast location update from Child to Parent
   */
  async publishLocation(childId: string, location: LocationData): Promise<void> {
    const channel = this.getChannel(childId);
    await channel.send({
      type: 'broadcast',
      event: 'LOCATION',
      payload: { childId, location },
    });

    try {
      await supabase.from('locations').insert({
        child_id: childId,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Broadcast telemetry status (battery level, GPS state, online status)
   */
  async publishTelemetry(childId: string, batteryLevel: number, isGpsOn: boolean): Promise<void> {
    const channel = this.getChannel(childId);
    const status: Partial<ChildProfile> = {
      device: {
        id: `dev_${childId}`,
        name: 'Dispositivo Supervisado',
        model: 'Android',
        batteryLevel,
        isGpsOn,
        isOnline: true,
        lastSeen: 'Ahora',
      },
    };

    await channel.send({
      type: 'broadcast',
      event: 'TELEMETRY',
      payload: { childId, status },
    });

    try {
      await supabase.from('devices').upsert({
        child_id: childId,
        battery_level: batteryLevel,
        is_gps_on: isGpsOn,
        last_seen: new Date().toISOString(),
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Log intercepted notifications from Child into Supabase
   */
  async logInterceptedNotification(childId: string, appName: string, title: string, message: string): Promise<void> {
    const log: NotificationLog = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      childId,
      appName,
      title,
      message,
      receivedAt: new Date().toISOString(),
    };

    const channel = this.getChannel(childId);
    await channel.send({
      type: 'broadcast',
      event: 'NOTIFICATION_INTERCEPTED',
      payload: log,
    });

    try {
      await supabase.from('notifications_log').insert({
        child_id: childId,
        app_name: appName,
        title,
        message,
      });
    } catch (err) {
      console.warn('Notification log db note:', err);
    }
  }

  /**
   * Subscribe to commands (used by Child device)
   */
  subscribeToCommands(childId: string, listener: CommandListener): () => void {
    this.getChannel(childId);
    this.commandListeners.add(listener);
    return () => {
      this.commandListeners.delete(listener);
    };
  }

  /**
   * Subscribe to status updates (used by Parent Dashboard)
   */
  subscribeToStatusUpdates(childId: string, listener: StatusListener): () => void {
    this.getChannel(childId);
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Subscribe to location updates (used by Parent Monitor)
   */
  subscribeToLocation(childId: string, listener: LocationListener): () => void {
    this.getChannel(childId);
    this.locationListeners.add(listener);
    return () => {
      this.locationListeners.delete(listener);
    };
  }

  /**
   * Subscribe to intercepted notifications (used by Parent Dashboard/Monitor)
   */
  subscribeToNotificationLogs(childId: string, listener: NotificationLogListener): () => void {
    this.getChannel(childId);
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  /**
   * Subscribe to Emergency SOS Alerts (used by Parent Dashboard)
   */
  subscribeToSosAlerts(childId: string, listener: SosAlertListener): () => void {
    this.getChannel(childId);
    this.sosListeners.add(listener);
    return () => {
      this.sosListeners.delete(listener);
    };
  }

  /**
   * Leave and unsubscribe all channels
   */
  cleanup(): void {
    this.activeChannels.forEach((ch) => {
      supabase.removeChannel(ch);
    });
    this.activeChannels.clear();
  }
}

export const realtimeService = new SupabaseRealtimeService();
