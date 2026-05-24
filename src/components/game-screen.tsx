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
import gameData from '@/json_com_perguntas/pense_bem_sonic_tails.json';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_ATTEMPTS = 3;
const QUESTION_TIME_SECONDS = 30;

const OPTION_BY_COLOR = {
  vermelho: { id: 'A', color: '#EA4235' },
  amarelo: { id: 'B', color: '#F1C40F' },
  azul: { id: 'C', color: '#2E6BE6' },
  verde: { id: 'D', color: '#21A366' },
} as const;

type OptionColorName = keyof typeof OPTION_BY_COLOR;

type RawQuestion = {
  numero: number;
  enunciado: string;
  tipo?: string;
  opcoes: Record<OptionColorName, string>;
  resposta_correta: OptionColorName;
  resposta: string;
};

type GameQuestion = {
  id: string;
  code: string;
  sectionTitle: string;
  sectionDescription: string;
  number: number;
  question: string;
  answer: string;
  correctAnswer: string;
  options: {
    id: string;
    color: string;
    colorName: OptionColorName;
    text: string;
  }[];
};

function buildQuestions(): GameQuestion[] {
  return gameData.programas.flatMap((programa) => {
    const code = programa.codigo_acesso.join(' ');

    return programa.secoes.flatMap((secao) =>
      secao.questoes.map((rawQuestao) => {
        const questao = rawQuestao as RawQuestion;

        if (!(questao.resposta_correta in OPTION_BY_COLOR)) {
          throw new Error(`Resposta correta invalida na questao ${questao.numero}: ${questao.resposta_correta}`);
        }

        const options = (Object.entries(questao.opcoes) as [OptionColorName, string][]).map(([colorName, text]) => ({
          ...OPTION_BY_COLOR[colorName],
          colorName,
          text,
        }));

        return {
          id: `${programa.id}-${questao.numero}`,
          code,
          sectionTitle: secao.titulo,
          sectionDescription: secao.descricao,
          number: questao.numero,
          question: questao.enunciado,
          answer: questao.resposta,
          correctAnswer: OPTION_BY_COLOR[questao.resposta_correta].id,
          options,
        };
      })
    );
  });
}

const questions = buildQuestions();

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
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const [gameStatus, setGameStatus] = useState<'playing' | 'answered' | 'timeout' | 'finished'>('playing');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isSmall = width < 360;
  const palette = getPalette(isDarkMode);
  const isUrgent = timeLeft <= 10;
  const currentQuestion = questions[questionIndex];
  const isCorrectAnswer = gameStatus === 'answered' && selectedOption === currentQuestion.correctAnswer;
  const hasMoreQuestions = questionIndex < questions.length - 1;
  const attemptNumber = Math.min(attemptsUsed + 1, MAX_ATTEMPTS);

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
    if (selectedOption === currentQuestion.correctAnswer) {
      setScore((current) => current + 1);
    } else {
      setAttemptsUsed((current) => current + 1);
    }
    setGameStatus('answered');
  }

  function handleRestart() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedOption(null);
    setTimeLeft(QUESTION_TIME_SECONDS);
    setAttemptsUsed(0);
    setScore(0);
    setQuestionIndex(0);
    setGameStatus('playing');
  }

  function handleContinue() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (gameStatus === 'answered' && !isCorrectAnswer && attemptsUsed < MAX_ATTEMPTS) {
      setSelectedOption(null);
      setGameStatus('playing');
      return;
    }

    if (hasMoreQuestions) {
      setQuestionIndex((current) => current + 1);
      setSelectedOption(null);
      setAttemptsUsed(0);
      setTimeLeft(QUESTION_TIME_SECONDS);
      setGameStatus('playing');
      return;
    }

    setGameStatus('finished');
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
              <Text style={[styles.roundCode, { color: isDarkMode ? '#FFD700' : palette.text }]}>
                {String(currentQuestion.number).padStart(3, '0')}
              </Text>
              <View style={[styles.livePill, { backgroundColor: palette.badge }]}>
                <Text style={[styles.livePillText, { color: isDarkMode ? '#FFD700' : '#1F5D35' }]}>
                  Tentativa {attemptNumber} de {MAX_ATTEMPTS}
                </Text>
              </View>
            </View>

            <View style={[styles.questionPanel, { borderColor: palette.panelBorder }]}>
              <Text style={[styles.questionLabel, { color: palette.muted }]}>
                {currentQuestion.sectionTitle} | {questionIndex + 1} de {questions.length}
              </Text>
              <Text style={[styles.questionText, { color: palette.text }]}>{currentQuestion.question}</Text>
            </View>

            <View style={styles.triesRow}>
              <Text style={[styles.triesText, { color: palette.muted }]}>Codigo: {currentQuestion.code}</Text>
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
                    accessibilityLabel={`Alternativa ${option.id}, ${option.colorName}: ${option.text}`}
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
                <Text style={styles.feedbackText}>
                  {attemptsUsed < MAX_ATTEMPTS ? 'Resposta incorreta. Tente novamente!' : `Resposta: ${currentQuestion.answer}`}
                </Text>
              </View>
            )}

            {(gameStatus === 'answered' || gameStatus === 'timeout') && (
              <Pressable
                onPress={handleContinue}
                style={styles.primaryAction}
                accessibilityRole="button"
                accessibilityLabel={isCorrectAnswer || attemptsUsed >= MAX_ATTEMPTS || gameStatus === 'timeout' ? 'Proxima pergunta' : 'Tentar novamente'}>
                <Text style={styles.primaryActionText}>
                  {isCorrectAnswer || attemptsUsed >= MAX_ATTEMPTS || gameStatus === 'timeout'
                    ? hasMoreQuestions
                      ? 'Proxima pergunta'
                      : 'Ver resultado'
                    : 'Tentar novamente'}
                </Text>
              </Pressable>
            )}

            {gameStatus === 'finished' && (
              <View style={[styles.feedbackBanner, { backgroundColor: '#16A34A' }]}>
                <Text style={styles.feedbackText}>
                  Fim de jogo! Pontuacao: {score} de {questions.length}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
