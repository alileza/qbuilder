// Condition operators
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'in'
  | 'notIn'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'isAnswered'
  | 'notAnswered';

// Condition for visibility
export interface Condition {
  questionId: string;
  operator: ConditionOperator;
  value?: unknown;
}

// Visibility condition structure
export interface VisibleIf {
  all?: Condition[];
  any?: Condition[];
}

// Choice option
export interface ChoiceOption {
  value: string;
  label: string;
}

// Base question interface
interface BaseQuestion {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  hidden?: boolean;
  visibleIf?: VisibleIf;
}

// Text question
export interface TextQuestion extends BaseQuestion {
  type: 'text';
  multiline?: boolean;
  maxLength?: number;
}

// Choice question
export interface ChoiceQuestion extends BaseQuestion {
  type: 'choice';
  multiple?: boolean;
  options: ChoiceOption[];
}

// Union type for all questions
export type QuestionDefinition = TextQuestion | ChoiceQuestion;

// Section definition
export interface SectionDefinition {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
}

// Questionnaire definition
export interface QuestionnaireDefinition {
  id: string;
  title: string;
  description?: string;
  sections?: SectionDefinition[];
  questions: QuestionDefinition[];
}

// Answer payload
export type AnswerPayload = Record<string, unknown>;

// Validation error
export interface ValidationError {
  questionId: string;
  message: string;
}

// Example questionnaires for the UI
export const EXAMPLE_QUESTIONNAIRES: Record<string, QuestionnaireDefinition> = {
  'employee-onboarding': {
    id: 'employee-onboarding',
    title: 'Employee Onboarding',
    description: 'New employee onboarding questionnaire',
    questions: [
      {
        id: 'fullName',
        type: 'text',
        label: 'Full Name',
        required: true,
      },
      {
        id: 'email',
        type: 'text',
        label: 'Email Address',
        required: true,
      },
      {
        id: 'hasExperience',
        type: 'choice',
        label: 'Do you have previous work experience?',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
      {
        id: 'yearsOfExperience',
        type: 'text',
        label: 'How many years of experience do you have?',
        required: true,
        visibleIf: {
          all: [{ questionId: 'hasExperience', operator: 'equals', value: 'yes' }],
        },
      },
      {
        id: 'department',
        type: 'choice',
        label: 'Which department will you be joining?',
        required: true,
        options: [
          { value: 'engineering', label: 'Engineering' },
          { value: 'sales', label: 'Sales' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'hr', label: 'Human Resources' },
        ],
      },
      {
        id: 'startDate',
        type: 'text',
        label: 'When would you like to start?',
        required: true,
      },
      {
        id: 'additionalInfo',
        type: 'text',
        label: "Any additional information you'd like to share?",
        multiline: true,
        required: false,
      },
    ],
  },
  'customer-feedback': {
    id: 'customer-feedback',
    title: 'Customer Feedback Survey',
    description: 'Help us improve by sharing your feedback',
    questions: [
      {
        id: 'customerName',
        type: 'text',
        label: 'Your Name',
        required: true,
      },
      {
        id: 'satisfactionRating',
        type: 'choice',
        label: 'How satisfied are you with our service?',
        required: true,
        options: [
          { value: '5', label: 'Very Satisfied' },
          { value: '4', label: 'Satisfied' },
          { value: '3', label: 'Neutral' },
          { value: '2', label: 'Dissatisfied' },
          { value: '1', label: 'Very Dissatisfied' },
        ],
      },
      {
        id: 'improvementSuggestions',
        type: 'text',
        label: 'What could we improve?',
        multiline: true,
        required: true,
        visibleIf: {
          any: [
            { questionId: 'satisfactionRating', operator: 'equals', value: '1' },
            { questionId: 'satisfactionRating', operator: 'equals', value: '2' },
            { questionId: 'satisfactionRating', operator: 'equals', value: '3' },
          ],
        },
      },
      {
        id: 'wouldRecommend',
        type: 'choice',
        label: 'Would you recommend us to others?',
        required: true,
        options: [
          { value: 'yes', label: 'Yes, definitely' },
          { value: 'maybe', label: 'Maybe' },
          { value: 'no', label: 'No' },
        ],
      },
      {
        id: 'additionalComments',
        type: 'text',
        label: 'Additional Comments',
        multiline: true,
        required: false,
      },
    ],
  },
  'product-survey': {
    id: 'product-survey',
    title: 'Product Feature Survey',
    description: 'Tell us about the features you need',
    sections: [
      {
        id: 'basic-info',
        title: 'Basic Information',
        description: 'Tell us about yourself',
        questionIds: ['name', 'role', 'companySize'],
      },
      {
        id: 'features',
        title: 'Feature Preferences',
        description: 'What features are important to you?',
        questionIds: ['priorities', 'currentPain', 'wishlist'],
      },
    ],
    questions: [
      {
        id: 'name',
        type: 'text',
        label: 'Your Name',
        required: true,
      },
      {
        id: 'role',
        type: 'choice',
        label: 'Your Role',
        required: true,
        options: [
          { value: 'developer', label: 'Developer' },
          { value: 'designer', label: 'Designer' },
          { value: 'manager', label: 'Product Manager' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        id: 'companySize',
        type: 'choice',
        label: 'Company Size',
        required: true,
        options: [
          { value: '1-10', label: '1-10 employees' },
          { value: '11-50', label: '11-50 employees' },
          { value: '51-200', label: '51-200 employees' },
          { value: '200+', label: '200+ employees' },
        ],
      },
      {
        id: 'priorities',
        type: 'choice',
        label: 'Select your top priorities',
        required: true,
        multiple: true,
        options: [
          { value: 'speed', label: 'Performance' },
          { value: 'ease', label: 'Ease of Use' },
          { value: 'features', label: 'Rich Features' },
          { value: 'price', label: 'Pricing' },
        ],
      },
      {
        id: 'currentPain',
        type: 'text',
        label: 'What is your biggest pain point with current solutions?',
        multiline: true,
        required: true,
      },
      {
        id: 'wishlist',
        type: 'text',
        label: 'Describe your dream feature',
        multiline: true,
        required: false,
        helpText: 'Be as detailed as you like!',
      },
    ],
  },
};
