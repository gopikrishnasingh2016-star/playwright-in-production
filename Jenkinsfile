pipeline {
  agent any

  environment {
    PW_IMAGE = 'mcr.microsoft.com/playwright:v1.56.0-noble'
  }

  stages {
    stage('Test') {
      steps {
        bat """
          docker run --rm ^
            -v "%WORKSPACE%":/app ^
            -w /app ^
            -e CI=true ^
            %PW_IMAGE% ^
            sh -c "npm ci && npx playwright test"
        """
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
      archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
    }
  }
}
