# CI/CD Setup Guide

## 🚀 GitHub Actions CI/CD Pipeline

Dự án đã được cấu hình với GitHub Actions để tự động build, test và deploy.

### 📁 Workflows đã tạo:

#### 1. **`ci-cd.yml`** - Main CI/CD Pipeline
- **Trigger**: Push to master/main branch
- **Jobs**:
  - ✅ Build & Test (Node 18.x, 20.x)
  - ✅ Deploy to Vercel (Production)
  - ✅ Lighthouse Performance Testing

#### 2. **`preview.yml`** - Preview Deployments  
- **Trigger**: Pull Requests
- **Jobs**:
  - ✅ Build application
  - ✅ Deploy preview to Vercel
  - ✅ Comment PR with preview URL

### 🔐 GitHub Secrets cần thiết:

Trong GitHub repository settings > Secrets and variables > Actions, thêm:

```bash
# Required Secrets
GEMINI_API_KEY=your_gemini_api_key
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id

# Optional (for Lighthouse CI)
LHCI_GITHUB_APP_TOKEN=your_lighthouse_token
```

### 📋 Cách lấy Vercel credentials:

#### 1. **VERCEL_TOKEN**:
```bash
# Install Vercel CLI
npm i -g vercel

# Login and get token
vercel login
vercel --help
```
Hoặc tạo token tại: [Vercel Dashboard > Settings > Tokens](https://vercel.com/account/tokens)

#### 2. **VERCEL_ORG_ID & VERCEL_PROJECT_ID**:
```bash
# Link project to Vercel
vercel link

# Check .vercel/project.json for IDs
cat .vercel/project.json
```

### 🛠️ Manual Setup Steps:

1. **Push workflows lên GitHub**:
```bash
git add .github/
git commit -m "Add CI/CD workflows"
git push origin master
```

2. **Setup GitHub Secrets**:
- Go to repository Settings > Secrets and variables > Actions
- Add all required secrets

3. **Link Vercel Project**:
```bash
vercel link
```

4. **Test Pipeline**:
- Make a small change and push
- Check Actions tab in GitHub
- Verify deployment in Vercel dashboard

### 🔄 Workflow Features:

#### **Automatic Triggers**:
- ✅ **Push to master/main**: Full CI/CD pipeline
- ✅ **Pull Requests**: Preview deployments
- ✅ **Matrix builds**: Test on multiple Node versions

#### **Quality Gates**:
- ✅ **Build success**: Must pass before deploy
- ✅ **Performance testing**: Lighthouse CI
- ✅ **Environment validation**: Check API keys

#### **Deployment Strategy**:
- ✅ **Production**: Auto-deploy from master/main
- ✅ **Preview**: Auto-deploy from PRs
- ✅ **Rollback**: Manual via Vercel dashboard

### 🐛 Troubleshooting:

#### **Build Fails**:
```bash
# Check dependencies
npm ci
npm run build
```

#### **Deploy Fails**:
- Verify Vercel tokens in GitHub Secrets
- Check Vercel project is linked correctly
- Ensure environment variables are set

#### **Performance Tests Fail**:
- Adjust Lighthouse thresholds in `lighthouserc.js`
- Check if site is accessible

### 📊 Monitoring:

- **GitHub Actions**: Repository > Actions tab
- **Vercel Deployments**: [Vercel Dashboard](https://vercel.com/dashboard)
- **Performance**: Lighthouse CI reports in Actions

### 🎯 Next Steps:

1. Push workflows to GitHub
2. Setup GitHub Secrets  
3. Link Vercel project
4. Test first deployment
5. Monitor and optimize