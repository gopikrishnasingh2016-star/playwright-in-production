pipeline {
  agent any

  stages {
    stage('Build') {
      steps {
        bat 'docker run --rm -v "%WORKSPACE%":/app -w /app node:24.19.0-alpine3.24 sh -c "npm ci && npm run build"'
      }
    }
    stage('Test') {
      steps {
        bat 'docker run --rm -v "%WORKSPACE%":/app -w /app node:24.19.0-alpine3.24 sh -c "npm test"'
      }
    }
  }
}
