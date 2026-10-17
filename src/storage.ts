import AsyncStorage from '@react-native-async-storage/async-storage';
import { Deadline } from './types';

const KEY = 'crampo:deadlines';

export async function loadDeadlines(): Promise<Deadline[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Deadline[]) : [];
  } catch {
    return [];
  }
}

export async function saveDeadlines(list: Deadline[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore for now, we will handle errors later
  }
}