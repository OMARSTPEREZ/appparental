export type UserRole = 'parent' | 'child' | null;

export type CommandType =
  | 'LOCK'
  | 'UNLOCK'
  | 'PAUSE_DEVICE'
  | 'CAM_FRONT'
  | 'CAM_BACK'
  | 'START_AUDIO'
  | 'STOP_AUDIO'
  | 'START_SCREEN_STREAM'
  | 'STOP_SCREEN_STREAM'
  | 'SOS_ALERT'
  | 'REMOTE_TOUCH'
  | 'EVENT_SCREENSHOT'
  | 'TOGGLE_HIDE_ICON'
  | 'UPDATE_ADMIN_PIN';

export interface InstalledApp {
  packageName: string;
  appName: string;
  iconName: string;
  category: string;
  isBlocked?: boolean;
  timeLimitMinutes?: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  batteryLevel: number;
  isGpsOn: boolean;
  isOnline: boolean;
  lastSeen: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  device: DeviceInfo;
  dailyTimeLimitMinutes: number;
  timeUsedTodayMinutes: number;
  isLocked: boolean;
  activeRulesCount: number;
}

export interface Rule {
  id: string;
  title: string;
  type: 'app_block' | 'bedtime' | 'daily_limit' | 'web_filter' | 'school';
  description: string;
  isEnabled: boolean;
  target?: string;
  packageName?: string;
  appName?: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  schedule?: {
    startTime: string;
    endTime: string;
  };
}

export interface NotificationLog {
  id: string;
  childId: string;
  appName: string;
  title: string;
  message: string;
  receivedAt: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: number;
  address?: string;
}

export interface PairingPayload {
  parentId: string;
  parentName: string;
  pairingToken: string;
  timestamp: number;
}

// Navigation Stacks
export type RootStackParamList = {
  RoleSelection: undefined;
  ParentStack: undefined;
  ChildStack: undefined;
};

export type ParentStackParamList = {
  Login: undefined;
  ParentDashboard: undefined;
  ParentLinkQR: undefined;
  ParentRules: { childId: string };
  ParentMonitor: { childId: string };
  ParentAlerts: { childId: string };
  NotificationHistory: { childId?: string };
};

export type ChildStackParamList = {
  ChildDashboard: undefined;
  ChildQRScanner: undefined;
  ChildMonitoringStatus: undefined;
};
