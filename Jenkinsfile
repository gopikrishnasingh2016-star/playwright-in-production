pipeline {
    agent { docker { image 'node:24.19.0-alpine3.24' } }
    stages {
        stage('build') {
            steps {
                sh 'node --version'
            }
        }
    }
}
