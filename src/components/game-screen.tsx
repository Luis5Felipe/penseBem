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

import gameData from '../json_com_perguntas/pense_bem_sonic_tails.json';
import { styles } from './game-styles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_ATTEMPTS = 3;
const QUESTION_TIME_SECONDS = 30;
const PROGRESS_STORAGE_KEY = 'penseBemProgress';

const DIFFICULTIES = [
  { id: 'easy', label: 'Facil', seconds: 30 },
  { id: 'medium', label: 'Medium', seconds: 15 },
  { id: 'hard', label: 'Dificil', seconds: 10 },
] as const;

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
  setId: string;
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

type GameStatus = 'playing' | 'answered' | 'timeout' | 'finished';
type QuestionSetId = 'all' | string;
type DifficultyId = (typeof DIFFICULTIES)[number]['id'];

type SavedProgress = {
  questionSetId: QuestionSetId;
  difficultyId: DifficultyId;
  questionIndex: number;
  attemptsUsed: number;
  score: number;
  selectedOption: string | null;
  gameStatus: GameStatus;
};

function buildQuestions(): GameQuestion[] {
  return gameData.programas.flatMap((programa) => {
    const code = programa.codigo_acesso.join(' ');

    return programa.secoes.flatMap((secao, sectionIndex) =>
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
          setId: `${programa.id}-${sectionIndex}`,
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

const allQuestionsSet = { id: 'all', label: 'Jogar todos', questionCount: questions.length };

const programSets = gameData.programas.map((programa) => {
  const code = programa.codigo_acesso.join(' ');
  const questionCount = programa.secoes.reduce((total, secao) => total + secao.questoes.length, 0);

  return {
    id: `program-${programa.id}`,
    code,
    label: `Bloco ${code}`,
    questionCount,
  };
});

const sectionSets = gameData.programas.flatMap((programa) => {
  const code = programa.codigo_acesso.join(' ');

  return programa.secoes.map((secao, sectionIndex) => ({
    id: `${programa.id}-${sectionIndex}`,
    label: `${code} - ${secao.titulo}`,
    questionCount: secao.questoes.length,
  }));
});

const questionSets = [allQuestionsSet, ...programSets, ...sectionSets];

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

function calculatePointsForAnswer(isCorrect: boolean, attemptNumber: number): number {
  if (!isCorrect) return 0;

  return Math.max(MAX_ATTEMPTS - attemptNumber + 1, 0);
}

function getStoredProgress(): SavedProgress | null {
  if (typeof localStorage === 'undefined') return null;

  const rawProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!rawProgress) return null;

  try {
    const progress = JSON.parse(rawProgress) as SavedProgress;
    const selectedSet = questionSets.find((set) => set.id === progress.questionSetId);
    const selectedDifficulty = DIFFICULTIES.find((difficulty) => difficulty.id === progress.difficultyId);
    const questionCount = selectedSet?.questionCount ?? 0;

    if (
      !selectedSet ||
      !selectedDifficulty ||
      typeof progress.questionIndex !== 'number' ||
      progress.questionIndex < 0 ||
      progress.questionIndex >= questionCount ||
      !['playing', 'answered', 'timeout', 'finished'].includes(progress.gameStatus)
    ) {
      return null;
    }

    return progress;
  } catch {
    return null;
  }
}

function saveStoredProgress(progress: SavedProgress) {
  if (typeof localStorage === 'undefined') return;

  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

function clearStoredProgress() {
  if (typeof localStorage === 'undefined') return;

  localStorage.removeItem(PROGRESS_STORAGE_KEY);
}

export default function GameScreen() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [screen, setScreen] = useState<'menu' | 'game'>('menu');
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<QuestionSetId>('all');
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<DifficultyId>('easy');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(() => getStoredProgress());
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isSmall = width < 360;
  const palette = getPalette(isDarkMode);
  const selectedDifficulty = DIFFICULTIES.find((difficulty) => difficulty.id === selectedDifficultyId) ?? DIFFICULTIES[0];
  const selectedQuestionSet = questionSets.find((set) => set.id === selectedQuestionSetId) ?? questionSets[0];
  const savedQuestionSet = savedProgress
    ? questionSets.find((set) => set.id === savedProgress.questionSetId)
    : null;
  const activeQuestions =
    selectedQuestionSetId === 'all'
      ? questions
      : selectedQuestionSetId.startsWith('program-')
        ? questions.filter((question) => question.id.startsWith(`${selectedQuestionSetId.replace('program-', '')}-`))
      : questions.filter((question) => question.setId === selectedQuestionSetId);
  const isUrgent = timeLeft <= 10;
  const currentQuestion = activeQuestions[questionIndex] ?? activeQuestions[0];
  const isCorrectAnswer = gameStatus === 'answered' && selectedOption === currentQuestion.correctAnswer;
  const hasMoreQuestions = questionIndex < activeQuestions.length - 1;
  const attemptsRemaining = Math.max(MAX_ATTEMPTS - attemptsUsed, 0);
  const isAnswerLocked = gameStatus !== 'playing' || attemptsRemaining === 0;
  const maxScore = activeQuestions.length * MAX_ATTEMPTS;
  const progressText = `${questionIndex + 1}/${activeQuestions.length}`;

  useEffect(() => {
    if (screen !== 'game') return;
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
  }, [gameStatus, screen]);

  function toggleDarkMode() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDarkMode((current) => !current);
  }

  function handleSelectQuestionSet(id: QuestionSetId) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedQuestionSetId(id);
  }

  function handleSelectDifficulty(id: DifficultyId) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDifficultyId(id);
  }

  function handleSelectOption(id: string) {
    if (isAnswerLocked) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedOption((prev) => (prev === id ? null : id));
  }

  function handleConfirm() {
    if (!selectedOption || isAnswerLocked) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextAttemptsUsed = attemptsUsed + 1;
    const isCorrect = selectedOption === currentQuestion.correctAnswer;

    setAttemptsUsed(nextAttemptsUsed);

    setScore((current) => current + calculatePointsForAnswer(isCorrect, nextAttemptsUsed));

    setGameStatus('answered');
  }

  function createProgressSnapshot(overrides: Partial<SavedProgress> = {}): SavedProgress {
    return {
      questionSetId: selectedQuestionSetId,
      difficultyId: selectedDifficultyId,
      questionIndex,
      attemptsUsed,
      score,
      selectedOption,
      gameStatus,
      ...overrides,
    };
  }

  function resetGameState() {
    setSelectedOption(null);
    setTimeLeft(selectedDifficulty.seconds);
    setAttemptsUsed(0);
    setScore(0);
    setQuestionIndex(0);
    setGameStatus('playing');
  }

  function handleStartNewGame() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    clearStoredProgress();
    setSavedProgress(null);
    resetGameState();
    setScreen('game');
  }

  function handleResumeGame() {
    const progress = savedProgress ?? getStoredProgress();

    if (!progress) {
      handleStartNewGame();
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setQuestionIndex(progress.questionIndex);
    setSelectedQuestionSetId(progress.questionSetId);
    setSelectedDifficultyId(progress.difficultyId);
    setAttemptsUsed(progress.attemptsUsed);
    setScore(progress.score);
    setSelectedOption(progress.selectedOption);
    setGameStatus(progress.gameStatus);
    const progressDifficulty = DIFFICULTIES.find((difficulty) => difficulty.id === progress.difficultyId) ?? DIFFICULTIES[0];

    setTimeLeft(progressDifficulty.seconds);
    setScreen('game');
  }

  function handleBackToMenu() {
    const progress = createProgressSnapshot();

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    saveStoredProgress(progress);
    setSavedProgress(progress);
    setScreen('menu');
  }

  function handleRestart() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    clearStoredProgress();
    setSavedProgress(null);
    resetGameState();
  }

  function handleContinue() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (gameStatus === 'answered' && !isCorrectAnswer && attemptsRemaining > 0) {
      setSelectedOption(null);
      setGameStatus('playing');
      return;
    }

    if (hasMoreQuestions) {
      const nextQuestionIndex = questionIndex + 1;
      const nextProgress = createProgressSnapshot({
        questionIndex: nextQuestionIndex,
        attemptsUsed: 0,
        selectedOption: null,
        gameStatus: 'playing',
      });

      saveStoredProgress(nextProgress);
      setSavedProgress(nextProgress);
      setQuestionIndex(nextQuestionIndex);
      setSelectedOption(null);
      setAttemptsUsed(0);
      setTimeLeft(selectedDifficulty.seconds);
      setGameStatus('playing');
      return;
    }

    const finishedProgress = createProgressSnapshot({ gameStatus: 'finished' });

    saveStoredProgress(finishedProgress);
    setSavedProgress(finishedProgress);
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

          {screen === 'menu' && (
            <View style={[styles.gameCard, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
              <View style={styles.menuHeader}>
                <Text style={[styles.menuTitle, { color: isDarkMode ? '#FFD700' : palette.text }]}>Menu</Text>
                <Text style={[styles.menuText, { color: palette.muted }]}>
                  {savedProgress
                    ? `Progresso salvo: ${savedProgress.questionIndex + 1}/${savedQuestionSet?.questionCount ?? questions.length} | Pontos: ${savedProgress.score}/${(savedQuestionSet?.questionCount ?? questions.length) * MAX_ATTEMPTS}`
                    : `Selecionado: ${selectedQuestionSet.label} | ${selectedQuestionSet.questionCount} perguntas`}
                </Text>
              </View>

              <View style={styles.menuSection}>
                <Text style={[styles.menuSectionTitle, { color: palette.text }]}>Blocos do programa</Text>
                <View style={styles.selectionGrid}>
                  {[allQuestionsSet, ...programSets].map((questionSet) => {
                    const isSelected = selectedQuestionSetId === questionSet.id;

                    return (
                      <Pressable
                        key={questionSet.id}
                        onPress={() => handleSelectQuestionSet(questionSet.id)}
                        style={[
                          styles.selectionButton,
                          { borderColor: palette.panelBorder },
                          isSelected && styles.selectionButtonActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Selecionar ${questionSet.label}`}>
                        <Text
                          style={[
                            styles.selectionButtonText,
                            { color: isSelected ? '#14162E' : palette.text },
                          ]}>
                          {questionSet.label}
                        </Text>
                        <Text
                          style={[
                            styles.selectionButtonMeta,
                            { color: isSelected ? '#14162E' : palette.muted },
                          ]}>
                          {questionSet.questionCount} perguntas
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.menuSection}>
                <Text style={[styles.menuSectionTitle, { color: palette.text }]}>Partes especificas</Text>
                <View style={styles.selectionGrid}>
                  {sectionSets.map((questionSet) => {
                    const isSelected = selectedQuestionSetId === questionSet.id;

                    return (
                      <Pressable
                        key={questionSet.id}
                        onPress={() => handleSelectQuestionSet(questionSet.id)}
                        style={[
                          styles.selectionButton,
                          { borderColor: palette.panelBorder },
                          isSelected && styles.selectionButtonActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Selecionar ${questionSet.label}`}>
                        <Text
                          style={[
                            styles.selectionButtonText,
                            { color: isSelected ? '#14162E' : palette.text },
                          ]}>
                          {questionSet.label}
                        </Text>
                        <Text
                          style={[
                            styles.selectionButtonMeta,
                            { color: isSelected ? '#14162E' : palette.muted },
                          ]}>
                          {questionSet.questionCount} perguntas
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.menuSection}>
                <Text style={[styles.menuSectionTitle, { color: palette.text }]}>Dificuldade</Text>
                <View style={styles.difficultyRow}>
                  {DIFFICULTIES.map((difficulty) => {
                    const isSelected = selectedDifficultyId === difficulty.id;

                    return (
                      <Pressable
                        key={difficulty.id}
                        onPress={() => handleSelectDifficulty(difficulty.id)}
                        style={[
                          styles.difficultyButton,
                          { borderColor: palette.panelBorder },
                          isSelected && styles.selectionButtonActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Selecionar dificuldade ${difficulty.label}`}>
                        <Text
                          style={[
                            styles.selectionButtonText,
                            { color: isSelected ? '#14162E' : palette.text },
                          ]}>
                          {difficulty.label}
                        </Text>
                        <Text
                          style={[
                            styles.selectionButtonMeta,
                            { color: isSelected ? '#14162E' : palette.muted },
                          ]}>
                          {difficulty.seconds}s
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {savedProgress && (
                <Pressable
                  onPress={handleResumeGame}
                  style={[styles.primaryAction, styles.fullWidthAction]}
                  accessibilityRole="button"
                  accessibilityLabel="Continuar jogo salvo">
                  <Text style={styles.primaryActionText}>Continuar jogo</Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleStartNewGame}
                style={[styles.secondaryAction, styles.fullWidthAction, { borderColor: palette.panelBorder }]}
                accessibilityRole="button"
                accessibilityLabel="Iniciar novo jogo">
                <Text style={[styles.secondaryActionText, { color: palette.text }]}>Novo jogo</Text>
              </Pressable>
            </View>
          )}

          {screen === 'game' && (
            <View style={[styles.gameCard, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
            <View style={[styles.roundHeader, { borderBottomColor: palette.panelBorder }]}>
              <View>
                <Text style={[styles.roundCode, { color: isDarkMode ? '#FFD700' : palette.text }]}>
                  {String(currentQuestion.number).padStart(3, '0')}
                </Text>
                <Text style={[styles.progressText, { color: palette.muted }]}>Progresso {progressText}</Text>
              </View>
              <View style={[styles.livePill, { backgroundColor: palette.badge }]}>
                <Text style={[styles.livePillText, { color: isDarkMode ? '#FFD700' : '#1F5D35' }]}>
                  {attemptsRemaining === 1 ? 'Resta 1 tentativa' : `Restam ${attemptsRemaining} tentativas`}
                </Text>
              </View>
            </View>

            <View style={[styles.questionPanel, { borderColor: palette.panelBorder }]}>
              <Text style={[styles.questionLabel, { color: palette.muted }]}>
                {currentQuestion.sectionTitle}
              </Text>
              <Text style={[styles.questionText, { color: palette.text }]}>{currentQuestion.question}</Text>
            </View>

            <View style={styles.triesRow}>
              <Text style={[styles.triesText, { color: palette.muted }]}>Codigo: {currentQuestion.code}</Text>
              <Text style={[styles.triesText, { color: isDarkMode ? '#FFD700' : palette.text }]}>
                Pontos: {score}/{maxScore}
              </Text>
              <Text style={[styles.timerText, { color: isUrgent ? '#EA4235' : palette.text }]}>{formatTime(timeLeft)}</Text>
            </View>

            <View style={[styles.optionsGrid, isWide && styles.optionsGridWide]}>
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option.id;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => handleSelectOption(option.id)}
                    disabled={isAnswerLocked}
                    style={[
                      styles.optionButton,
                      isWide && styles.optionButtonWide,
                      isSmall && styles.optionButtonSmall,
                      { backgroundColor: option.color },
                      isSelected && styles.optionButtonSelected,
                      isAnswerLocked && styles.optionButtonDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Alternativa ${option.id}, ${option.colorName}: ${option.text}`}
                    accessibilityHint="Toque para escolher esta alternativa"
                    accessibilityState={{ disabled: isAnswerLocked, selected: isSelected }}>
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
                disabled={!selectedOption || isAnswerLocked}
                style={[
                  styles.primaryAction,
                  (!selectedOption || isAnswerLocked) && styles.primaryActionDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Confirmar resposta"
                accessibilityHint="Confirma a alternativa selecionada">
                <Text style={styles.primaryActionText}>Confirmar resposta</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleBackToMenu}
              style={[styles.secondaryAction, styles.fullWidthAction, { borderColor: palette.panelBorder }]}
              accessibilityRole="button"
              accessibilityLabel="Voltar ao menu">
              <Text style={[styles.secondaryActionText, { color: palette.text }]}>Voltar ao Menu</Text>
            </Pressable>

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
                  {attemptsRemaining > 0 ? 'Resposta incorreta. Tente novamente!' : `Resposta: ${currentQuestion.answer}`}
                </Text>
              </View>
            )}

            {(gameStatus === 'answered' || gameStatus === 'timeout') && (
              <Pressable
                onPress={handleContinue}
                style={[styles.primaryAction, styles.fullWidthAction]}
                accessibilityRole="button"
                accessibilityLabel={isCorrectAnswer || attemptsRemaining === 0 || gameStatus === 'timeout' ? 'Proxima pergunta' : 'Tentar novamente'}>
                <Text style={styles.primaryActionText}>
                  {isCorrectAnswer || attemptsRemaining === 0 || gameStatus === 'timeout'
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
                  Fim de jogo! Pontuacao: {score} de {maxScore}
                </Text>
              </View>
            )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
