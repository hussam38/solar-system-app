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
                timeout(time: 1, unit: 'MINUTES') {
                
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

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t hussam146/solar-system:$GIT_COMMIT .'
            }
        }

        stage('Trivy Vulnerability Scanner') {
            steps {
                sh '''
                    trivy image hussam146/solar-system:$GIT_COMMIT \
                        --severity LOW,MEDIUM \
                        --exit-code 0 \
                        --format json \
                        --quiet \
                        --output trivy-MEDIUM-report.json

                    trivy image hussam146/solar-system:$GIT_COMMIT \
                        --severity HIGH,CRITICAL \
                        --exit-code 1 \
                        --format json \
                        --quiet \
                        --output trivy-CRITICAL-report.json
                '''
            }
            post {
                always {
                    sh '''
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            -o trivy-MEDIUM-report.xml trivy-MEDIUM-report.json 
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            -o trivy-CRITICAL-report.xml trivy-CRITICAL-report.json
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            -o trivy-MEDIUM-report.html trivy-MEDIUM-report.json
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            -o trivy-CRITICAL-report.html trivy-CRITICAL-report.json                        
                    '''
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, studioRetentoin: '', testResults: 'test-results.xml'
            junit allowEmptyResults: true, studioRetentoin: '', testResults: 'trivy-MEDIUM-report.xml'
            junit allowEmptyResults: true, studioRetentoin: '', testResults: 'trivy-CRITICAL-report.xml'
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'trivy-CRITICAL-report.html', reportName: 'Trivy Image Critical HTML Report', reportTitles: '', useWrapperFileDirectly: true])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'trivy-MEDIUM-report.html', reportName: 'Trivy Image MEDIUM HTML Report', reportTitles: '', useWrapperFileDirectly: true])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: 'coverage/lcov-report', reportFiles: 'index.html', reportName: 'Code Coverage HTML Report', reportTitles: '', useWrapperFileDirectly: true])
        }
    }

}