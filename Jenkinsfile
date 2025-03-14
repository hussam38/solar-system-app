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
            parallel {
                stage('NPM Dependency Audit') {
                    steps {
                        sh '''
                            npm audit --audit-level=critical
                            echo $?
                        '''
                    }
                }

                stage('OWASP Dependency CHECK') {
                    steps {
                        dependencyCheck additionalArguments: '''--scan \'./\'
                            --out \'./\'
                            --format \'ALL\'
                            --prettyPrint''',
                            // nvdCredentialsId: 'NVD_API_KEY',
                            odcInstallation: 'OWASP-DEPENDENCY-10'
                    }
                }
            }
        }
    }
}