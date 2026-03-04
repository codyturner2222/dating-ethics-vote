# Dating Ethics Voting App

Real-time classroom voting app for online dating ethics scenarios. Teacher selects a scenario, students vote on their devices, teacher reveals class distribution.

## Setup (GitHub + Render)

### 1. Create GitHub Repo

1. Go to [github.com/new](https://github.com/new)
2. Name it `dating-ethics-vote`
3. Set to **Public** (Render free tier requires public repos)
4. **Don't** add README or .gitignore (we already have files)
5. Click **Create repository**

### 2. Push Code

Open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit: dating ethics voting app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dating-ethics-vote.git
git push -u origin main
```

### 3. Deploy on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Web Service**
3. Connect your GitHub repo (`dating-ethics-vote`)
4. Settings:
   - **Name:** `dating-ethics-vote`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
5. Click **Deploy**

Render will give you a URL like `https://dating-ethics-vote.onrender.com`

### 4. In Class

- **You open:** `https://dating-ethics-vote.onrender.com/teacher`
- **Students open:** `https://dating-ethics-vote.onrender.com`
- Project the teacher view on screen
- Share the student URL (or put it on a slide / write it on the board)

## How It Works

**Teacher view:** Dark dashboard with all 21 scenarios in the sidebar. Click to broadcast a scenario. See votes in real time. Hit "Reveal Results" when ready — only then do students see the distribution.

**Student view:** Clean mobile-friendly interface. Students see the scenario, tap their judgment (Clearly Permissible → Clearly Wrong), and wait for you to reveal results.

## Note on Render Free Tier

Free Render services spin down after 15 minutes of inactivity. The first student to connect may see a ~30 second delay while it spins back up. Consider opening the URL a few minutes before class starts to wake it up.
