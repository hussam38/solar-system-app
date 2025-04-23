pipeline {
    agent any

    tools {
        nodejs 'NodeJs-23-9-0'
    }

    environment {
        MONGO_URI = 'mongodb+srv://cluster0.vi2k4tr.mongodb.net/planets?retryWrites=true&w=majority'
        MONGO_USERNAME = credentials('mongo-db-username')
        MONGO_PASSWD = credentials('mongo-db-passwd')
        SONAR_SCANNER_HOME = tool 'SonarQubeScanner-710'
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
                sh 'npm test'
            }
        }

        stage('Code Coverage') {
            steps {
                catchError(buildResult: 'SUCCESS', message: 'Oooops!!!This Problem will solved in future releases', stageResult: 'UNSTABLE') {
                    sh 'npm run coverage'
                }
            }
        }

        stage('SAST - SonarQube'){
            steps {
                timeout(time: 60, unit: 'SECONDS') {
                
                    withSonarQubeEnv('sonar-qube-server') {
                        sh '''
                            $SONAR_SCANNER_HOME/bin/sonar-scanner \
                                -Dsonar.projectKey=Solar-System \
                                -Dsonar.sources=app.js \
                                -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info 
                        '''
                    }
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'test-results.xml'
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: 'coverage/lcov-report', reportFiles: 'index.html', reportName: 'Code Coverage HTML Report', reportTitles: '', useWrapperFileDirectly: true])
        }
    }

}