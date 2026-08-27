import medicalDictionary from './medical_dictionary.json';

export const vocabulary = Object.entries(medicalDictionary).map(([word, info]) => ({
  id: info.id,
  word: word,
  display: info.formal || word.replace(/_/g, ' ').replace(/-/g, ' '),
  category: info.category,
  emergency: !!info.emergency,
  tts: info.tts || word,
  formal: info.formal || word
}));
