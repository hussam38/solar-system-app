@Library('shared-libraries@main') _

pipeline {
    agent any

    tools {
        nodejs 'NodeJs-22-15-0'
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
        GITEA_TOKEN = credentials('gitea-api-token') 
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm install --no-audit'
            }
        }

        stage ('Dependency and Audit Scanning'){
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
            when {
                branch 'feature/*'
            }
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
            when {
                anyOf{
                    expression { return env.BRANCH_NAME ==~ /feature\/.*/ }
                    branch 'main'

                }
            }
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        stage('Cleaning Old Images'){
            when {
                anyOf{
                    expression { return env.BRANCH_NAME ==~ /feature\/.*/ }
                    branch 'main'

                }
            }
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
            when {
                anyOf{
                    expression { return env.BRANCH_NAME ==~ /feature\/.*/ }
                    branch 'main'
                }
            }
            steps {
                script {
                   trivyScanScript.vulnerability(imageName: "${IMAGE_NAME}", imageTag: "${IMAGE_TAG}", severity: "LOW", exitCode: "0") 
                   trivyScanScript.vulnerability(imageName: "${IMAGE_NAME}", imageTag: "${IMAGE_TAG}", severity: "MEDIUM", exitCode: "0") 
                   trivyScanScript.vulnerability(imageName: "${IMAGE_NAME}", imageTag: "${IMAGE_TAG}", severity: "HIGH", exitCode: "0") 
                   trivyScanScript.vulnerability(imageName: "${IMAGE_NAME}", imageTag: "${IMAGE_TAG}", severity: "CRITICAL", exitCode: "1") 
                }
            }
            post {
                always {
                    script {
                        trivyScanScript.reportsConverter()
                    }
                    publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'trivy-CRITICAL-IMAGE-report.html', reportName: 'Trivy Image Critical HTML Report', reportTitles: '', useWrapperFileDirectly: true])
                    publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'trivy-MEDIUM-IMAGE-report.html', reportName: 'Trivy Image MEDIUM HTML Report', reportTitles: '', useWrapperFileDirectly: true])
                }
            }
        }

        stage('Push Image to Docker Registery'){
            when {
                branch 'feature/*'
            }
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
                            ssh -o StrictHostKeyChecking=no ${SSH_USER}@${EC2_HOST} '
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
                                sudo docker pull ${IMAGE_NAME}:${IMAGE_TAG}
                                if sudo docker ps -a --format "{{.Names}}" | grep -q "^solar-system\$"; then
                                    echo "Container already exists, removing..."
                                    sudo docker stop solar-system || true
                                    sudo docker rm solar-system || true
                                    echo "Container removed."
                                fi
                                IMAGES_TO_DELETE=\$(sudo docker images ${IMAGE_NAME} --format "{{.Repository}}:{{.Tag}}" | grep -v "${IMAGE_TAG}")
                                if [ -n "\$IMAGES_TO_DELETE" ]; then
                                    for image in \$IMAGES_TO_DELETE; do
                                        sudo docker rmi -f "\$image" || true
                                    done
                                else
                                    echo "No old images to delete."
                                fi
                                sudo docker run -d --name solar-system \\
                                    -e "MONGO_URI=${MONGO_URI}" \\
                                    -e "MONGO_USERNAME=${MONGO_USERNAME}" \\
                                    -e "MONGO_PASSWD=${MONGO_PASSWD}" \\
                                    -p 4000:4000 \\
                                    ${IMAGE_NAME}:${IMAGE_TAG}
                            '
                        """
                    }
                }
                
            }
        }

        stage('Update Kubernetes') {
            when {
                branch 'PR*'
            }
            steps {
                script {
                    sh 'git clone -b main http://localhost:5555/cicd-org/solar-system-gitops'
                    dir('solar-system-gitops/kubernetes') {
                        sh '''
                            git checkout main
                            git checkout -b feature-$BUILD_ID
                            sed -i "s#${IMAGE_NAME}.*#${IMAGE_NAME}:${GIT_COMMIT}#g" deployment.yaml
                            cat deployment.yaml
                            #####################################################################
                            git config --global user.email "hussamnasser38@gmail.com"
                            git remote set-url origin http://$GITEA_TOKEN@192.168.159.135:5555/cicd-org/solar-system-gitops
                            git add .
                            git commit -m "Update deployment.yaml $BUILD_ID"
                            git push -u origin feature-$BUILD_ID
                        '''
                    }
                }
            }   
        }

        stage('Kubernetes - Raise PR'){
            when {
                branch 'PR*'
            }
            steps {
                sh """
                    curl -X 'POST' \
                        'http://192.168.159.135:5555/api/v1/repos/cicd-org/solar-system-gitops/pulls' \\
                        -H 'accept: application/json' \\
                        -H 'Authorization: token $GITEA_TOKEN' \\
                        -H 'Content-Type: application/json' \\
                        -d '{
                            "assignee": "Hussam",
                            "assignees": [
                                "Hussam"
                            ],
                            "base": "main",
                            "body": "Update docker image in deployment.yaml",
                            "head": "feature-$BUILD_ID",
                            "title": "Updated Docker Image"
                        }'
                """
            }
        }

        stage('App Deployed?'){
            when {
                branch 'PR*'
            }
            steps {
                timeout(time: 1, unit: 'DAYS') {
                    input message: 'Is the app deployed and ArgoCD synced successfully?' , ok: 'Yes, App deployed and synced'
                }
            }
        }

        stage('DAST - OWASP ZAP'){
            when {
                branch 'PR*'
            }
            steps {
                script {
                    sh '''
                        chmod 777 $(pwd) 
                        docker run --rm --name zaproxy --network=host \
                            -v $(pwd):/zap/wrk/:rw \
                            ghcr.io/zaproxy/zaproxy zap-api-scan.py \
                            -c zap_ignore_rules \
                            -d \
                            -f openapi \
                            -t http://192.168.49.2:31853/api-docs/ \
                            -r zap_report.html \
                            -J zap_report.json \
                            -x zap_report.xml
                    '''
                }
            }
        }

        stage('S3 - Upload') {
            when {
                branch 'main'
            }
            steps {
                withAWS(credentials: 'aws-crds', region: 'eu-north-1') {
                    sh ''' 
                        echo "Before:"
                        tail -n 6 app.js

                        # Comment out the app.listen block
                        sed -i "/^app\\.listen(4000/ s/^/\\/\\//" app.js

                        # Comment out the original module.exports line
                        sed -i "s/^module.exports = app;/\\/\\/module.exports = app;/g" app.js

                        # Uncomment the serverless handler export if it was previously commented
                        sed -i "s|^//module.exports.handler|module.exports.handler|" app.js

                        echo "After:"
                        tail -n 6 app.js
                    '''

                    sh '''
                        zip -qr solar-system-lambda-$BUILD_ID.zip app* node* package* index.html
                    '''
                    s3Upload(
                        bucket: 'cicd-solar-bucket',
                        file: "solar-system-lambda-${BUILD_ID}.zip")
                }
            }
        }

        stage('Deploy To Production?'){
            when {
                branch 'main'
            }
            steps {
                timeout(time: 1, unit: 'DAYS') {
                    input message: 'Are you Sure that you want to deploy your app' , ok: 'Yes'
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                withAWS(credentials: 'aws-crds', region: 'eu-north-1') {
                    sh """
                        aws lambda update-function-configuration \
                            --function-name solar-system-func \
                            --environment "Variables={MONGO_URI=$MONGO_URI,MONGO_USERNAME=$MONGO_USERNAME,MONGO_PASSWD=$MONGO_PASSWD}"
                    """
                    
                    sh '''
                        aws lambda update-function-code \
                            --function-name solar-system-func \
                            --s3-bucket cicd-solar-bucket \
                            --s3-key solar-system-lambda-$BUILD_ID.zip
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                def status = currentBuild.result ?: 'SUCCESS'
                slackNotification('jenkins',status,'Cyna','jenkins-slack-token')
            }
            
            script {
                if(fileExists('kubernetes')){
                    sh 'rm -rf kubernetes'
                }
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
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: 'zap_reports/', reportFiles: 'zap_report.html', reportName: 'DAST - OWASP ZAP Report', reportTitles: '', useWrapperFileDirectly: true])
        }
    }
}
