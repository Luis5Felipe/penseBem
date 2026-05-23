import { useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '@/components/game-styles';
import questions from '@/json_com_perguntas/questions.json';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Palette = {
  page: string;
  panel: string;
  panelBorder: string;
  text: string;
  muted: string;
  header: string;
  badge: string;
};

function getPalette(isDarkMode: boolean): Palette {
  if (isDarkMode) {
    return {
      page: '#14162E',
      panel: '#1E2146',
      panelBorder: '#FFD700',
      text: '#FFFFFF',
      muted: '#B7BAE1',
      header: '#1A1D3E',
      badge: 'rgba(255,215,0,0.2)',
    };
  }

  return {
    page: '#F0F2F5',
    panel: '#FFFFFF',
    panelBorder: '#D8DEE6',
    text: '#111827',
    muted: '#4B5563',
    header: '#F9FAFB',
    badge: '#DDEFE1',
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function GameScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStatus, setGameStatus] = useState<'playing' | 'answered' | 'timeout'>('playing');
  const [questionIndex, setQuestionIndex] = useState(0);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isSmall = width < 360;
  const palette = getPalette(isDarkMode);
  const isUrgent = timeLeft <= 10;
  const currentQuestion = questions[questionIndex];
  const isCorrectAnswer = gameStatus === 'answered' && selectedOption === currentQuestion.correctAnswer;

  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameStatus('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus]);

  function toggleDarkMode() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDarkMode((current) => !current);
  }

  function handleSelectOption(id: string) {
    if (gameStatus !== 'playing') return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedOption((prev) => (prev === id ? null : id));
  }

  function handleConfirm() {
    if (!selectedOption || gameStatus !== 'playing') return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setGameStatus('answered');
  }

  function handleRestart() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedOption(null);
    setTimeLeft(30);
    setGameStatus('playing');
  }

  return (
    <View style={[styles.page, { backgroundColor: palette.page }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isWide && styles.scrollContentWide,
            isSmall && styles.scrollContentSmall,
          ]}
          showsVerticalScrollIndicator={false}>
          <View
            style={[styles.brandContainer, { backgroundColor: palette.header, borderColor: palette.panelBorder }]}
            accessibilityRole="header">
            <View>
              <Text style={[styles.brandTitle, { color: isDarkMode ? '#FFD700' : palette.text }]}>Pense Bem</Text>
            </View>

            <Pressable
              onPress={toggleDarkMode}
              style={[
                styles.darkModeToggle,
                isDarkMode && styles.darkModeToggleActive,
                !isDarkMode && {
                  backgroundColor: '#E5E7EB',
                  borderColor: '#C5CDD7',
                },
              ]}
              accessibilityRole="switch"
              accessibilityLabel="Modo escuro"
              accessibilityState={{ checked: isDarkMode }}
              accessibilityHint="Ativa ou desativa o modo escuro">
              <View style={[styles.switchThumb, isDarkMode && styles.switchThumbActive]} />
              <Text
                style={[
                  styles.darkModeLabel,
                  isDarkMode && styles.darkModeLabelActive,
                  !isDarkMode && { color: '#4B5563' },
                ]}>
                Modo escuro
              </Text>
            </Pressable>
          </View>

          <View style={[styles.gameCard, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
            <View style={[styles.roundHeader, { borderBottomColor: palette.panelBorder }]}>
              <Text style={[styles.roundCode, { color: isDarkMode ? '#FFD700' : palette.text }]}>021 - 1</Text>
              <View style={[styles.livePill, { backgroundColor: palette.badge }]}>
                <Text style={[styles.livePillText, { color: isDarkMode ? '#FFD700' : '#1F5D35' }]}>Tentativa 1 de 3</Text>
              </View>
            </View>

            <View style={[styles.questionPanel, { borderColor: palette.panelBorder }]}>
              <Text style={[styles.questionLabel, { color: palette.muted }]}>Pergunta</Text>
              <Text style={[styles.questionText, { color: palette.text }]}>{currentQuestion.question}</Text>
            </View>

            <View style={styles.triesRow}>
              <Text style={[styles.triesText, { color: palette.muted }]}>Tempo restante</Text>
              <Text style={[styles.timerText, { color: isUrgent ? '#EA4235' : palette.text }]}>{formatTime(timeLeft)}</Text>
            </View>

            <View style={[styles.optionsGrid, isWide && styles.optionsGridWide]}>
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option.id;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelectOption(option.id)}
                    style={[
                      styles.optionButton,
                      isWide && styles.optionButtonWide,
                      isSmall && styles.optionButtonSmall,
                      { backgroundColor: option.color },
                      isSelected && styles.optionButtonSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Alternativa ${option.id}: ${option.text}`}
                    accessibilityHint="Toque para escolher esta alternativa"
                    accessibilityState={{ selected: isSelected }}>
                    <Text style={styles.optionLabel}>{option.id}</Text>
                    <Text style={styles.optionText} numberOfLines={2}>{option.text}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.actionRow, isWide && styles.actionRowWide]}>
              <Pressable
                onPress={handleRestart}
                style={[styles.secondaryAction, { borderColor: palette.panelBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Reiniciar jogo"
                accessibilityHint="Limpa o progresso da rodada atual">
                <Text style={[styles.secondaryActionText, { color: palette.text }]}>Reiniciar</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={!selectedOption || gameStatus !== 'playing'}
                style={[
                  styles.primaryAction,
                  (!selectedOption || gameStatus !== 'playing') && styles.primaryActionDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Confirmar resposta"
                accessibilityHint="Confirma a alternativa selecionada">
                <Text style={styles.primaryActionText}>Confirmar resposta</Text>
              </Pressable>
            </View>

            {gameStatus === 'timeout' && (
              <View style={[styles.feedbackBanner, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.feedbackText}>Tempo esgotado!</Text>
              </View>
            )}

            {gameStatus === 'answered' && isCorrectAnswer && (
              <View style={[styles.feedbackBanner, { backgroundColor: '#16A34A' }]}>
                <Text style={styles.feedbackText}>Resposta correta!</Text>
              </View>
            )}

            {gameStatus === 'answered' && !isCorrectAnswer && (
              <View style={[styles.feedbackBanner, { backgroundColor: '#DC2626' }]}>
                <Text style={styles.feedbackText}>Resposta incorreta!</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
