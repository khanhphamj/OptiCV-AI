# Hướng dẫn Deploy lên Vercel

## Các bước deploy dự án OptiCV-AI lên Vercel qua GitHub:

### 1. Chuẩn bị GitHub Repository
```bash
# Thêm tất cả files vào git
git add .

# Commit changes
git commit -m "Add Vercel configuration for deployment"

# Push lên GitHub
git push origin main
```

### 2. Environment Variables cần thiết
Trong Vercel Dashboard, thêm environment variable:
- **Key**: `GEMINI_API_KEY`
- **Value**: Your Google Gemini API key
- **Scope**: Production, Preview, Development

### 3. Cấu hình Vercel
File `vercel.json` đã được tạo với các cấu hình:
- ✅ Build command: `npm run build`
- ✅ Output directory: `dist`
- ✅ Framework: Vite
- ✅ SPA routing support
- ✅ Static file caching
- ✅ Environment variables

### 4. Deploy Steps
1. Truy cập [vercel.com](https://vercel.com)
2. Đăng nhập bằng GitHub account
3. Click "New Project"
4. Import GitHub repository `OptiCV-AI`
5. Vercel sẽ tự động detect Vite framework
6. Thêm Environment Variable: `GEMINI_API_KEY`
7. Click "Deploy"

### 5. Lấy Google Gemini API Key
1. Truy cập [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Tạo API key mới
3. Copy API key và paste vào Vercel environment variables

### 6. Kiểm tra Deploy
- URL sẽ có dạng: `https://your-project-name.vercel.app`
- Kiểm tra console để đảm bảo không có lỗi
- Test upload CV và JD để verify API hoạt động

### Troubleshooting
- **Build fails**: Kiểm tra dependencies trong package.json
- **API errors**: Kiểm tra GEMINI_API_KEY đã được set chưa
- **404 errors**: File vercel.json đã có SPA routing config
- **CORS errors**: Gemini API không yêu cầu CORS setup

### Auto-deploy
Mỗi khi push code mới lên GitHub, Vercel sẽ tự động deploy lại ứng dụng.