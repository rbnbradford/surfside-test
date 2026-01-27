import * as fs from 'node:fs';
import path from 'node:path';
import { DockerComposeEnvironment, type StartedDockerComposeEnvironment, Wait } from 'testcontainers';

let environment: StartedDockerComposeEnvironment | undefined;

const findProjectRoot = (startDir: string): string => {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'docker-compose.yml'))) return currentDir;
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find project root (no docker-compose.yml found)');
};

export const setup = async () => {
  const projectRoot = findProjectRoot(__dirname);
  environment = await new DockerComposeEnvironment(projectRoot, [
    'docker-compose.yml',
    'docker-compose.integration-test.yml',
  ])
    .withWaitStrategy('kafka', Wait.forHealthCheck())
    .withWaitStrategy('clickhouse', Wait.forHealthCheck())
    .up(['kafka', 'clickhouse']);
};

export async function teardown() {
  await environment?.down({ removeVolumes: true });
}
