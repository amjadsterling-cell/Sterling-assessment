export type ChoiceQuestion = {
  id: string;
  label: string;
  type: "choice";
  options: string[];
};

export type SliderQuestion = {
  id: string;
  label: string;
  type: "slider";
  min: number;
  max: number;
};

export type TextQuestion = {
  id: string;
  label: string;
  type: "text";
};

export type ProfileQuestion = ChoiceQuestion | SliderQuestion | TextQuestion;

export type QuizOption = { key: string; text: string };

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correct: string;
  tests: string;
  advanced: boolean;
};

export type Passage = {
  id: string;
  text: string;
  targetWords: { word: string }[];
};

export type Course = {
  name: string;
  sessions: number;
  fee: number;
};

export type AssessmentContent = {
  profileQuestions: ProfileQuestion[];
  quiz: QuizQuestion[];
  passages: Passage[];
  speakingPrompts: string[];
  goalsQuestions: ProfileQuestion[];
  courses: Course[];
};
