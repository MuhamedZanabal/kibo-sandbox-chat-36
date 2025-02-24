
const adjectives = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Omega", "Zeta", "Nova", "Quantum", "Vivid"
];

const nouns = [
  "Project", "App", "Platform", "System", "Engine", "Suite", "Tool", "Framework", "Hub", "Lab"
];

export const generateProjectName = (userMessage?: string): string => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}`;
};
