# Pre-Flight Checklist

Multi-camera pre-flight checklist for Sony A7S III (A & B Cam) + DJI Ronin.  
Built with Expo (web), React Native Paper (Material 3), and Reanimated.

## Stack

- **Expo** ~51 (web-only output)
- **React Native Paper** v5 — Material 3 components
- **React Native Reanimated** v3 — smooth check animations
- **AsyncStorage** — persists checks & settings across sessions
- **Vercel** — deployment

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run web
```

Open [http://localhost:8081](http://localhost:8081) in your browser.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git remote add origin https://github.com/dougageddon-dev/preflight-checklist.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `preflight-checklist` repo from `dougageddon-dev`
3. Vercel will auto-detect the settings from `vercel.json`:
   - **Build Command:** `npm run build:web`
   - **Output Directory:** `dist`
4. Click **Deploy**

Every push to `main` auto-deploys.

---

## Project Structure

```
preflight-checklist/
├── App.tsx                  # Root — theme & providers
├── app.json                 # Expo config
├── vercel.json              # Vercel deploy config
├── src/
│   ├── data/
│   │   └── checklist.ts     # All checklist data & types
│   ├── theme/
│   │   └── index.ts         # Material 3 light & dark themes
│   ├── components/
│   │   ├── CamCheckbox.tsx      # Animated per-camera checkbox
│   │   ├── SimpleCheckbox.tsx   # Animated simple checkbox
│   │   ├── CamSectionCard.tsx   # Camera checks section
│   │   ├── SimpleSectionCard.tsx # Audio / talent / take sections
│   │   ├── ProgressBar.tsx      # Animated progress bar
│   │   └── SettingsFields.tsx   # Project settings inputs
│   └── screens/
│       └── ChecklistScreen.tsx  # Main screen
```

---

## Adding Items

Edit `src/data/checklist.ts` — add items to any section's `items` array:

```ts
{ id: 'new_item', label: 'My New Check', type: 'simple' }
```

For camera checks use `type: 'cam'` in the `camera` section.
