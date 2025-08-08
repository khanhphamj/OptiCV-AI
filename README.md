# OptiCV AI - CV Optimization Tool

This contains everything you need to run your AI-powered CV optimization app locally.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your OpenAI API key:
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a `.env.local` file in the project root
   - Add your API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```
   - Alternatively, you can use `API_KEY=your_openai_api_key_here` for backward compatibility

3. Run the app:
   ```bash
   npm run dev
   ```

## Features

- **CV Analysis**: Upload your CV and job description for AI-powered analysis
- **Smart Coaching**: Get personalized suggestions to improve your CV
- **Real-time Editing**: Apply suggestions and see improvements instantly
- **Progress Tracking**: Monitor your CV improvement over time
- **Course Recommendations**: Get skill gap analysis and learning suggestions

## Technology Stack

- **Frontend**: React with TypeScript
- **AI Model**: OpenAI GPT-4.1-mini
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Animations**: Animate.css + Lottie
