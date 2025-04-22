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

        stage('Unit Testing') {
            steps {
                // withCredentials([usernamePassword(credentialsId: 'mongo-db-crds', passwordVariable: 'MONGO_PASSWD', usernameVariable: 'MONGO_USER')]) {
                //     sh 'npm test'
                // }
                sh 'npm test'
                junit allowEmptyResults: true, testResults: 'test-results.xml'
            }
        }
    }
}