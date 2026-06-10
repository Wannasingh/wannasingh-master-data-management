pipeline {
    agent any

    environment {
        NODE_ENV = 'development'
        PYTHONUNBUFFERED = '1'
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
                sh 'python3 -m venv venv'
                sh '. venv/bin/activate && pip install -r api/requirements.txt'
            }
        }
        
        stage('Run Tests') {
            steps {
                sh 'npm run test'
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
