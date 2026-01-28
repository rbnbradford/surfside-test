export const findProjectRoot = (rootDirName: string): string => {
  const currentDir = __dirname;
  if (!currentDir.includes(rootDirName)) throw Error(`root dir ${rootDirName} not found`);
  return currentDir.slice(0, currentDir.indexOf(rootDirName) + rootDirName.length);
};
