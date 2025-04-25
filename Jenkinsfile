pipeline {
    agent any

    tools {
        nodejs 'NodeJs-23-9-0'
    }

    environment {
        MONGO_URI = 'mongodb+srv://cluster0.iff7ofz.mongodb.net/planets?retryWrites=true&w=majority'
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
                timeout(time: 90, unit: 'SECONDS') {
                
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
                        --severity LOW,MEDIUM,HIGH \
                        --exit-code 0 \
                        --format json \
                        --quiet \
                        -o trivy-MEDIUM-report.json

                    trivy image hussam146/solar-system:$GIT_COMMIT \
                        --severity CRITICAL \
                        --exit-code 1 \
                        --format json \
                        --quiet \
                        -o trivy-CRITICAL-report.json
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
            script {
                if(fileExists('test-results.xml')) {
                    junit allowEmptyResults: true, testResults: 'test-results.xml'
                }else {
                    echo "No test-results.xml found, skipping."
                }

                if(fileExists('trivy-MEDIUM-report.xml')) {
                    junit allowEmptyResults: true, testResults: 'trivy-MEDIUM-report.xml'
                }else {
                    echo "No trivy-MEDIUM-report.xml found, skipping."
                }

                if(fileExists('trivy-CRITICAL-report.xml')) {
                    junit allowEmptyResults: true, testResults: 'trivy-CRITICAL-report.xml'
                }else {
                    echo "No trivy-CRITICAL-report.xml found, skipping."
                }
            }
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'trivy-CRITICAL-report.html', reportName: 'Trivy Image Critical HTML Report', reportTitles: '', useWrapperFileDirectly: true])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'trivy-MEDIUM-report.html', reportName: 'Trivy Image MEDIUM HTML Report', reportTitles: '', useWrapperFileDirectly: true])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: 'coverage/lcov-report', reportFiles: 'index.html', reportName: 'Code Coverage HTML Report', reportTitles: '', useWrapperFileDirectly: true])
        }
    }

}