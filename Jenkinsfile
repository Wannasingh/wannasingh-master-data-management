pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
        PYTHONUNBUFFERED = '1'
        PYTHONPATH = '.'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'python3 -m venv --without-pip venv'
                sh 'curl -sS https://bootstrap.pypa.io/get-pip.py | ./venv/bin/python'
                sh '. venv/bin/activate && pip install -r api/requirements.txt'
            }
        }
        
        stage('Run Tests') {
            steps {
                sh 'npm run test'
                sh 'mkdir -p reports'
                sh '. venv/bin/activate && pytest api/tests/test_main.py --junitxml=reports/backend-test.xml --cov=api --cov-report=xml'
            }
        }
        
        stage('Code Quality & Security Scan') {
            steps {
                // Placeholder for ScanCode Toolkit
                sh 'echo "Running ScanCode Toolkit for license compliance..."'
                // sh 'scancode -l -c --json=scancode.json .'
                
                // SonarQube Scanner
                withSonarQubeEnv('SonarQube') {
                    sh 'sonar-scanner'
                }

                // Wait for Quality Gate to succeed
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        
        stage('Deploy') {
            steps {
                sh 'echo "Deploying to Vercel..."'
                // sh 'npx vercel --prod --token $VERCEL_TOKEN'
            }
        }
    }
}
