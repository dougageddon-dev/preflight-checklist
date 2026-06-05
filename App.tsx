import 'react-native-reanimated';
import React, { useState } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { lightTheme, darkTheme } from './src/theme';
import { ChecklistScreen } from './src/screens/ChecklistScreen';

export default function App() {
  const systemScheme = useColorScheme();
  const [manualDark, setManualDark] = useState<boolean | null>(null);
  const isDark = manualDark !== null ? manualDark : systemScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ChecklistScreen
          onToggleTheme={() => setManualDark(d => (d === null ? !isDark : !d))}
          isDark={isDark}
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
