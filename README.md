# Sabbath School & Live Poll Multi-Screen Presentation System

A live polling and presentation system designed for church Sabbath School, Bible studies, interactive sermons, and events.

---

## 🌟 Key Features

1. **Multi-Screen / Dual-Screen Presentation Architecture**:
   - 📺 **Projector Screen (`projector.html`)**: Beautiful 16:9 full-screen presentation view for TV or hall projector with dynamic header banner, large question fonts, live animated voting charts, attendee count, response QR code, and big 15s timer.
   - 📱 **Presenter Phone Remote (`remote.html`)**: Designed specifically for the presenter's smartphone. Large thumb-friendly buttons to start the 15-second timer, navigate questions, reveal biblical answers, and monitor live vote counts from anywhere in the room.
   - 👥 **Audience Mobile View (`audience.html`)**: Fast, mobile-first participant screen. Audience joins by scanning the QR code or typing the 6-digit session response code, casts votes (A, B, C, D or custom write-in), watches the 15-second timer bar, and sees the revealed answers and explanations.
   - ⚙️ **Admin Dashboard & Question Studio (`admin.html`)**: Manage sessions, generate unique response codes, customize header images & topic titles, create/edit questions, options, correct answers, explanations, and bulk import/export JSON.
   - 🏠 **Portal Hub (`index.html`)**: Quick access launchpad connecting all screens.

2. **⏱️ 15-Second Response Timer & Sound Synthesizer**:
   - Default countdown: **strictly 15 seconds**.
   - Admin triggers the timer with **▶ Start 15s Timer** on their phone remote or projector.
   - **Audio Effects (Zero external file dependencies via Web Audio API)**:
     - **Last 5 Seconds (5s, 4s, 3s, 2s, 1s)**: Emits sharp audible **tick-tick countdown sounds** each second while pulsing with amber/red visual alerts.
     - **0 Seconds**: Emits a loud **retro game-show buzzer sound** when time is up, vibrating and locking the vote options.
     - Audio Mute/Unmute toggle included on all presenter screens.

3. **Unique Response Code & Session Management**:
   - Each poll has a unique response code (e.g. `482915` or custom text like `SABBATH-1`).
   - Generates instant QR codes for audience participants and phone remotes.

4. **Dynamic Header Branding**:
   - Live editable Lesson Topic Title (e.g. `Share HIM - Lesson 13`).
   - Customizable Header Banner Image URL with 1-click presets (Sabbath School lesson cover, Bible Study, Church Sunrise) and live preview. Synchronizes in real time to all connected screens.

5. **Real-time Engine (Cloud WebSocket Relay + Supabase + Local Sync)**:
   - **🌐 Cloud WebSocket Relay (Zero-Config Cross-Device Web Sync)**: Works instantly on **GitHub Pages** across any phone, laptop, TV, or projector anywhere in the world with zero database setup.
   - **🗄️ Supabase Cloud Database**: Stores persistent questions, sessions, and response histories in PostgreSQL when active.
   - **⚡ Local Browser Channel**: Ensures ultra-fast instant sync across browser tabs on the same computer.

---

## 🚀 GitHub Pages & Web Deployment (Cross-Device Sync)

When hosting on **GitHub Pages**, **Vercel**, or **Netlify**:
1. Push all files to your GitHub repository.
2. In GitHub, go to **Settings &rarr; Pages &rarr; Source &rarr; Deploy from branch (`main` / `/root`)**.
3. Open `admin.html` on your computer or phone.
4. **Built-in Cloud WebSocket Sync** is active by default:
   - When you update questions, title, or banner in the Admin Dashboard, the changes are broadcast immediately to all phones, projectors, and remotes via Cloud WebSocket Relay.
   - When audience members vote, votes appear live on the Projector and Phone Remote.
   - When you start the 15-second timer on your remote, all audience phones and the projector countdown together!

### 🗄️ Supabase Setup (For Permanent Cloud Database Storage)
> **Note:** On Supabase's free tier, projects pause automatically after 7 days of inactivity. If your project was paused:
1. Log into your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. If your project `cevgqeqijfdfvuxsaudy` is paused, click **"Restore project"**.
3. If creating a new project:
   - Go to the **SQL Editor**, paste the contents of `supabase_schema.sql`, and click **Run**.
   - In `admin.html`, click **⚙️ Database Settings** and paste your new Project URL and Anon Key.
4. Even while Supabase is paused or unconfigured, the **Cloud WebSocket Relay** keeps all live devices synchronized across the web in real-time!
