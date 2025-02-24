
const adjectives = [
  "Dynamic", "Robust", "Agile", "Swift", "Smart", "Clever", "Rapid", "Nimble",
  "Bright", "Sharp", "Quick", "Precise", "Modern", "Fresh", "Sleek"
];

const nouns = [
  "Engine", "Module", "Platform", "System", "Framework", "Core", "Service",
  "Stack", "Portal", "Hub", "Suite", "Studio", "Lab", "Space", "Forge"
];

export const generateProjectName = (): string => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}`;
};
