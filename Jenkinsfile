/*
 * ============================================================
 * Jenkinsfile — wannasingh-mdm CI/CD Pipeline
 * Author      : wannasingh-mdm
 * Date        : 2026-06-23
 * Task/Jira   : MDM-CICD-001
 * Purpose     : Full CI/CD pipeline running on Control Room VM
 *               (161.118.199.97) and deploying to Apps VM
 *               (64.110.115.33).
 *
 *               Vault Auth: Uses AppRole to dynamically fetch
 *               a short-lived token per pipeline run.
 *
 * Stages:
 *   1. Checkout
 *   2. Install Dependencies
 *   3. Lint & Format Check
 *   4. Unit Tests (Frontend + Backend in parallel)
 *   5. SonarQube Analysis + Quality Gate
 *   6. Security Scan (pip-audit + npm audit + Trivy)
 *   7. Build Docker Images
 *   8. Fetch Vault Token
 *   9. Deploy to Apps VM (SSH + docker compose)
 *  10. Post-Deploy Health Check
 *
 * Required Jenkins Credentials:
 *   - apps-vm-ssh-key   : SSH Private Key for Apps VM
 *   - sonarqube-token   : SonarQube API token (Secret Text)
 *   - vault-role-id     : Vault AppRole Role ID (Secret Text)
 *   - vault-secret-id   : Vault AppRole Secret ID (Secret Text)
 * ============================================================
 */

pipeline {
    agent any

    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        // ── Server Targets ────────────────────────────────────
        APPS_VM_HOST    = '64.110.115.33'
        APPS_VM_USER    = 'ubuntu'
        PROJECT_DIR     = '/home/ubuntu/wannasingh-mdm'
        PROJECT_NAME    = 'wannasingh-mdm'

        // ── Vault ─────────────────────────────────────────────
        VAULT_ADDR      = 'https://vault.wannasingh.dev'

        // ── Build ─────────────────────────────────────────────
        NODE_ENV        = 'production'
        PYTHONUNBUFFERED = '1'
        PYTHONPATH      = '.'

        // ── Docker image tags ─────────────────────────────────
        API_IMAGE       = "wannasingh-mdm-api:${BUILD_NUMBER}"
        WEB_IMAGE       = "wannasingh-mdm-web:${BUILD_NUMBER}"
    }

    stages {

        // ── Stage 1: Checkout ─────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                // Print build metadata for traceability
                sh 'echo "Branch: ${GIT_BRANCH} | Commit: ${GIT_COMMIT} | Build: ${BUILD_NUMBER}"'
            }
        }

        // ── Stage 2: Install Dependencies ─────────────────────
        stage('Install Dependencies') {
            parallel {
                stage('Frontend — npm ci') {
                    steps {
                        sh 'npm ci --prefer-offline'
                    }
                }
                stage('Backend — pip install') {
                    steps {
                        sh '''
                            python3 -m venv venv
                            . venv/bin/activate
                            pip install --upgrade pip --quiet
                            pip install -r api/requirements.txt --quiet
                        '''
                    }
                }
            }
        }

        // ── Stage 3: Lint & Format Check ──────────────────────
        stage('Lint & Format Check') {
            parallel {
                stage('ESLint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('Prettier Check') {
                    steps {
                        sh 'npx prettier --check "src/**/*.{ts,tsx}" || echo "::warning::Prettier formatting issues found"'
                    }
                }
            }
        }

        // ── Stage 4: Unit Tests (parallel) ────────────────────
        stage('Unit Tests') {
            parallel {
                stage('Frontend — Jest') {
                    steps {
                        sh 'npm run test -- --ci --forceExit --reporters=default --reporters=jest-junit'
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'junit.xml'
                            publishHTML(target: [
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'coverage',
                                reportFiles: 'index.html',
                                reportName: 'Frontend Coverage Report'
                            ])
                        }
                    }
                }
                stage('Backend — pytest') {
                    steps {
                        sh '''
                            mkdir -p reports
                            . venv/bin/activate
                            pytest api/tests/ \
                                --junitxml=reports/backend-test.xml \
                                --cov=api \
                                --cov-report=xml:coverage.xml \
                                --cov-report=html:coverage-py \
                                --cov-fail-under=90 \
                                -v
                        '''
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'reports/backend-test.xml'
                            publishHTML(target: [
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'coverage-py',
                                reportFiles: 'index.html',
                                reportName: 'Backend Coverage Report'
                            ])
                        }
                    }
                }
            }
        }

        // ── Stage 5: SonarQube Analysis ───────────────────────
        stage('SonarQube Analysis') {
            steps {
                withCredentials([
                    string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')
                ]) {
                    // SonarQube host URL is defined in sonar-project.properties as http://161.118.199.97:9000
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            sonar-scanner -Dsonar.login=${SONAR_TOKEN}
                        '''
                    }
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ── Stage 6: Security Scan ────────────────────────────
        stage('Security Scan') {
            parallel {
                stage('Python CVE Scan — pip-audit') {
                    steps {
                        sh '''
                            . venv/bin/activate
                            pip install pip-audit --quiet
                            pip-audit --requirement api/requirements.txt \
                                --output json \
                                --output-file reports/pip-audit.json \
                                || (echo "::warning::pip-audit found vulnerabilities — review reports/pip-audit.json" && true)
                        '''
                    }
                }
                stage('NPM Dependency Audit') {
                    steps {
                        sh 'npm audit --audit-level=high --json > reports/npm-audit.json || (echo "::warning::npm audit found high-severity issues" && true)'
                    }
                }
            }
        }

        // ── Stage 7: Build Docker Images ──────────────────────
        stage('Build Docker Images') {
            when {
                branch pattern: 'main|develop|release/.*', comparator: 'REGEXP'
            }
            steps {
                sh "docker build -t ${API_IMAGE} ./api"
                sh "docker build -t ${WEB_IMAGE} ."
                // Trivy image vulnerability scan
                sh """
                    trivy image --exit-code 0 --severity HIGH,CRITICAL \
                        --format json --output reports/trivy-api.json \
                        ${API_IMAGE} \
                        || echo "::warning::Trivy found issues in API image"
                    trivy image --exit-code 0 --severity HIGH,CRITICAL \
                        --format json --output reports/trivy-web.json \
                        ${WEB_IMAGE} \
                        || echo "::warning::Trivy found issues in Web image"
                """
            }
        }

        // ── Stage 8: Fetch Vault Token ────────────────────────
        stage('Fetch Vault Token') {
            when {
                branch pattern: 'main|release/.*', comparator: 'REGEXP'
            }
            steps {
                withCredentials([
                    string(credentialsId: 'vault-role-id', variable: 'VAULT_ROLE_ID'),
                    string(credentialsId: 'vault-secret-id', variable: 'VAULT_SECRET_ID')
                ]) {
                    script {
                        // Request a short-lived token from Vault using AppRole
                        env.VAULT_TOKEN = sh(
                            script: """
                                curl --silent --request POST --data '{"role_id": "'\${VAULT_ROLE_ID}'", "secret_id": "'\${VAULT_SECRET_ID}'"}' \${VAULT_ADDR}/v1/auth/approle/login | jq -r .auth.client_token
                            """,
                            returnStdout: true
                        ).trim()

                        if (!env.VAULT_TOKEN || env.VAULT_TOKEN == "null") {
                            error "Failed to retrieve Vault token. Check AppRole credentials and Vault address."
                        }
                    }
                }
            }
        }

        // ── Stage 9: Deploy to Apps VM ────────────────────────
        stage('Deploy to Apps VM') {
            when {
                branch pattern: 'main|release/.*', comparator: 'REGEXP'
            }
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'apps-vm-ssh-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh """
                        # ── 1. Sync code to Apps VM ────────────────────────
                        rsync -avz --delete \
                            -e "ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -i ${SSH_KEY}" \
                            --exclude='.git' \
                            --exclude='node_modules' \
                            --exclude='venv' \
                            --exclude='.env' \
                            ./ ${APPS_VM_USER}@${APPS_VM_HOST}:${PROJECT_DIR}/

                        # ── 2. Run Alembic migrations ──────────────────────
                        # Runs upgrade head. For the very first manual setup, admin must run 'alembic stamp head' manually.
                        ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} \
                            ${APPS_VM_USER}@${APPS_VM_HOST} \
                            "cd ${PROJECT_DIR} && \
                             VAULT_ADDR=${VAULT_ADDR} VAULT_TOKEN=${VAULT_TOKEN} \
                             docker compose run --rm api \
                             alembic upgrade head"

                        # ── 3. Rolling restart of services ─────────────────
                        ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} \
                            ${APPS_VM_USER}@${APPS_VM_HOST} \
                            "cd ${PROJECT_DIR} && \
                             VAULT_ADDR=${VAULT_ADDR} VAULT_TOKEN=${VAULT_TOKEN} \
                             docker compose up -d --build --remove-orphans"
                    """
                }
            }
        }

        // ── Stage 10: Post-Deploy Health Check ─────────────────
        stage('Post-Deploy Health Check') {
            when {
                branch pattern: 'main|release/.*', comparator: 'REGEXP'
            }
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'apps-vm-ssh-key',
                        keyFileVariable: 'SSH_KEY'
                    )
                ]) {
                    sh """
                        echo "Waiting 15 seconds for services to stabilise..."
                        sleep 15

                        # Health check via the Apps VM's internal network
                        ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} \
                            ${APPS_VM_USER}@${APPS_VM_HOST} \
                            "curl --silent --fail --max-time 10 http://localhost:5328/api/audit-logs | head -c 200"

                        echo ""
                        echo "✅ Health check passed — deployment successful."
                    """
                }
            }
        }
    }

    // ── Post-Pipeline Actions ──────────────────────────────────
    post {
        always {
            // Archive security + coverage reports
            archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true
        }
        failure {
            echo "❌ Pipeline FAILED on branch ${GIT_BRANCH} at build #${BUILD_NUMBER}"
            // Add Slack/email notification here
        }
        success {
            echo "✅ Pipeline PASSED — Build #${BUILD_NUMBER} deployed successfully."
        }
    }
}
