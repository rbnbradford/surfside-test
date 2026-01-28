import { findProjectRoot } from '@surfside/lib';
import { DockerComposeEnvironment, type StartedDockerComposeEnvironment, Wait } from 'testcontainers';

let environment: StartedDockerComposeEnvironment | undefined;

export const setup = async () => {
  const projectRoot = findProjectRoot('surfside-test');
  environment = await new DockerComposeEnvironment(projectRoot, [
    'docker-compose.yml',
    'docker-compose.integration-test.yml',
  ])
    .withWaitStrategy('kafka', Wait.forHealthCheck())
    .withWaitStrategy('clickhouse', Wait.forHealthCheck())
    .up(['kafka', 'clickhouse']);
};

export const teardown = async () => {
  await environment?.down({ removeVolumes: true });
};
