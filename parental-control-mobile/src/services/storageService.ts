import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole, ChildProfile, Rule } from '../types';

const STORAGE_KEYS = {
  USER_ROLE: '@parental_app_role',
  PARENT_ID: '@parental_app_parent_id',
  CHILD_ID: '@parental_app_child_id',
  CHILDREN_PROFILES: '@parental_app_children_profiles',
  RULES: '@parental_app_rules',
  PAIRING_TOKEN: '@parental_app_pairing_token',
  IS_APP_ICON_HIDDEN: '@parental_app_icon_hidden',
};

export const storageService = {
  async saveUserRole(role: UserRole): Promise<void> {
    try {
      if (role) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE);
      }
    } catch (error) {
      console.error('Error saving user role:', error);
    }
  },

  async getUserRole(): Promise<UserRole> {
    try {
      const role = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
      return (role as UserRole) || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  },

  async saveChildrenProfiles(children: ChildProfile[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHILDREN_PROFILES, JSON.stringify(children));
    } catch (error) {
      console.error('Error saving children profiles:', error);
    }
  },

  async getChildrenProfiles(): Promise<ChildProfile[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CHILDREN_PROFILES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting children profiles:', error);
      return [];
    }
  },

  async saveRules(rules: Rule[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
    } catch (error) {
      console.error('Error saving rules:', error);
    }
  },

  async getRules(): Promise<Rule[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RULES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting rules:', error);
      return [];
    }
  },

  async saveParentId(parentId: string | null): Promise<void> {
    try {
      if (parentId) {
        await AsyncStorage.setItem(STORAGE_KEYS.PARENT_ID, parentId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.PARENT_ID);
      }
    } catch (error) {
      console.error('Error saving parent ID:', error);
    }
  },

  async getParentId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.PARENT_ID);
    } catch (error) {
      console.error('Error getting parent ID:', error);
      return null;
    }
  },

  async saveChildId(childId: string | null): Promise<void> {
    try {
      if (childId) {
        await AsyncStorage.setItem(STORAGE_KEYS.CHILD_ID, childId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.CHILD_ID);
      }
    } catch (error) {
      console.error('Error saving child ID:', error);
    }
  },

  async getChildId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.CHILD_ID);
    } catch (error) {
      console.error('Error getting child ID:', error);
      return null;
    }
  },

  async saveAppIconHidden(hidden: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.IS_APP_ICON_HIDDEN, JSON.stringify(hidden));
    } catch (error) {
      console.error('Error saving app icon hidden state:', error);
    }
  },

  async getAppIconHidden(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.IS_APP_ICON_HIDDEN);
      return data ? JSON.parse(data) : false;
    } catch (error) {
      console.error('Error getting app icon hidden state:', error);
      return false;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
