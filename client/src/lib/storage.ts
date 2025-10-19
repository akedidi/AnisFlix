import AsyncStorage from '@react-native-async-storage/async-storage';

// Wrapper pour la compatibilité React Native / Web
export class Storage {
  static async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Web
      return localStorage.getItem(key);
    } else {
      // React Native
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        console.error('Error getting item from AsyncStorage:', error);
        return null;
      }
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Web
      localStorage.setItem(key, value);
    } else {
      // React Native
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        console.error('Error setting item in AsyncStorage:', error);
      }
    }
  }

  static async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Web
      localStorage.removeItem(key);
    } else {
      // React Native
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing item from AsyncStorage:', error);
      }
    }
  }
}
