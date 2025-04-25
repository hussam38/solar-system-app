pipeline {
    agent any

    tools {
        nodejs 'NodeJs-23-9-0'
    }

    environment {
        MONGO_URI = 'mongodb+srv://cluster0.iff7ofz.mongodb.net/planets?retryWrites=true&w=majority'
        MONGO_USERNAME = credentials('mongo-db-username')
        MONGO_PASSWD = credentials('mongo-db-passwd')
        EC2_HOST = credentials('ec2-host')
        SSH_USER = 'ubuntu'
        SONAR_SCANNER_HOME = tool 'SonarQubeScanner-710'
        IMAGE_NAME = 'hussam146/solar-system'
        IMAGE_TAG = "${env.GIT_COMMIT}"
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
                timeout(time: 150, unit: 'SECONDS') {
                
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
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Cleaning Old Images'){
            steps {
                sh """
                    docker image ls ${IMAGE_NAME} --format "{{.Repository}}:{{.Tag}} {{.ID}}" | \
                    grep -v ":${IMAGE_TAG}" |\
                    awk '{print \$2}' |\
                    xargs -r docker rmi -f
                """
            }
        }

        stage('Trivy Vulnerability Scanner') {
            steps {
                sh """
                    trivy image ${IMAGE_NAME}:${IMAGE_TAG} \
                        --severity LOW,MEDIUM,HIGH \
                        --exit-code 0 \
                        --format json \
                        --quiet \
                        -o trivy-MEDIUM-report.json

                    trivy image ${IMAGE_NAME}:${IMAGE_TAG} \
                        --severity CRITICAL \
                        --exit-code 1 \
                        --format json \
                        --quiet \
                        -o trivy-CRITICAL-report.json
                """
            }
            post {
                always {
                    sh '''
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            -o trivy-MEDIUM-IMAGE-report.xml trivy-MEDIUM-report.json 
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            -o trivy-CRITICAL-IMAGE-report.xml trivy-CRITICAL-report.json
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            -o trivy-MEDIUM-IMAGE-report.html trivy-MEDIUM-report.json
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            -o trivy-CRITICAL-IMAGE-report.html trivy-CRITICAL-report.json                        
                    '''
                }
            }
        }

        stage('Push Image to Docker Registery'){
            steps {
                withDockerRegistry(credentialsId: 'docker-crds', url: ""){
                    script {
                        docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push()
                    }
                }
            }
        }

        stage('Deploy to AWS'){
            when {
                branch 'feature/*'
            }
            steps {
                script {
                    sshagent(['aws-ec2']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${SSH_USER}@${EC2_HOST} "
                                if ! command -v docker &> /dev/null; then
                                    echo 'Docker could not be found, installing...'
                                    sudo apt-get install -y docker.io
                                    sudo systemctl start docker
                                    sudo usermod -aG docker ${SSH_USER}
                                    echo "Docker installed."
                                else
                                    echo "Docker is already installed."
                                fi
                                echo "Running Docker script..."
                                docker pull ${IMAGE_NAME}:${IMAGE_TAG}
                                if sudo docker ps -a | grep -q 'solar-system'; then
                                    echo "Container already exists, removing..."
                                    sudo docker stop solar-system
                                    sudo docker rm solar-system
                                    echo "Container removed."
                                fi
                                docker run -d --name solar-system \
                                    -e MONGO_URI=${MONGO_URI} \
                                    -e MONGO_USERNAME=${MONGO_USERNAME} \
                                    -e MONGO_PASSWD=${MONGO_PASSWD} \
                                    -p 3000:3000 \
                                    ${IMAGE_NAME}:${IMAGE_TAG}
                            "
                        """
                    }
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

                if(fileExists('trivy-MEDIUM-IMAGE-report.xml')) {
                    junit allowEmptyResults: true, testResults: 'trivy-MEDIUM-IMAGE-report.xml'
                }else {
                    echo "No trivy-MEDIUM-IMAGE-report.xml found, skipping."
                }

                if(fileExists('trivy-CRITICAL-IMAGE-report.xml')) {
                    junit allowEmptyResults: true, testResults: 'trivy-CRITICAL-IMAGE-report.xml'
                }else {
                    echo "No trivy-CRITICAL-IMAGE-report.xml found, skipping."
                }
            }
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'trivy-CRITICAL-IMAGE-report.html', reportName: 'Trivy Image Critical HTML Report', reportTitles: '', useWrapperFileDirectly: true])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'trivy-MEDIUM-IMAGE-report.html', reportName: 'Trivy Image MEDIUM HTML Report', reportTitles: '', useWrapperFileDirectly: true])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: 'coverage/lcov-report', reportFiles: 'index.html', reportName: 'Code Coverage HTML Report', reportTitles: '', useWrapperFileDirectly: true])
        }
    }
}