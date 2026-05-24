import { SafeAreaProvider } from 'react-native-safe-area-context';

import GameScreen from './src/components/game-screen';

export default function App() {
  return (
    <SafeAreaProvider>
      <GameScreen />
    </SafeAreaProvider>
  );
}
