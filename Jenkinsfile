pipeline {
    agent any

    tools {
        nodejs 'NodeJs-23-9-0'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh '''
                    npm -v
                    node -v
                '''
                //sh 'npm install --no-audit'
            }
        }
    }
}