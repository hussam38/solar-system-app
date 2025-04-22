pipeline {
    agent any

    tools {
        nodejs 'NodeJs-23-9-0'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm install --no-audit'
            }
        }

        stage ('Dependency Scanning'){
            steps {
                    sh '''
                        npm audit --audit-level=critical
                        echo $?
                    '''
            }
        }
    }
}