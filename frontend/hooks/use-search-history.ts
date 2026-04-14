import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSearchHistory(){
  const [history, setHistory] = useState<any[]>([]);

  async function addEntry(newEntry: any) {
    const getId = (entry: any) => entry.data.username ?? entry.data.id;
    const deduplicated = history.filter(entry =>
      !(entry.type === newEntry.type && getId(entry) === getId(newEntry))
    );
const updated = [newEntry, ...deduplicated];
    const limited = updated.slice(0, 20);
    await AsyncStorage.setItem('search_history', JSON.stringify(limited));
    setHistory(limited);
  }
  async function clearHistory(  ) {
    await AsyncStorage.removeItem('search_history');
    setHistory([]); 

  }
  async function   loadHistory() {
    const search_history_raw =  await AsyncStorage.getItem('search_history');
    if ( search_history_raw != null ){
        const search_history_value = JSON.parse(search_history_raw);
        setHistory( search_history_value)
    }
  }

  useEffect(() => {
      loadHistory()
  }, [])
  return { history, addEntry, clearHistory }


}

