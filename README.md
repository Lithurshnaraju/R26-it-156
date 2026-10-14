# 🌊 AquaGuard: Integrated Water Safety & Environmental Monitoring

> An academic documentation website for the **AquaGuard** research project: four YOLO-based AI modules that turn camera footage into environmental and public-safety decisions for Sri Lankan water environments.

This repository contains the **research information website** only. It documents the problem, literature review, methodology, architecture, evaluation plan and project documents. It is **not** the AquaGuard product or its dashboard.

---

## 📖 About the Research

Sri Lanka has 103 rivers, and the Kelani River is the most polluted. Recreational waters, tanks and reservoirs also expose visitors to drowning, wildlife encounters and overcrowding. Existing research mostly stops at detection accuracy and gives authorities no way to act on it.

AquaGuard combines four components into one platform that detects hazards and converts detections into decisions: pollution scores, proximity warnings, drowning alerts and crowd alarms.

| # | Component | Researcher | Model | Output |
|---|-----------|------------|-------|--------|
| 1 | Garbage Detection & Weighted Garbage Density Index (GDI) | Lithurshna | YOLOv8-nano | 0-100 pollution score, level, GPS and trend tracking |
| 2 | Human-Wildlife Proximity Detection | Nuzri | YOLOv11-nano | Real-time proximity alert from centroid pixel distance |
| 3 | Drowning Detection | Ithayavelini M A | YOLO (Ultralytics) | Drowning / float / swimmer classification and early alert |
| 4 | Crowd Monitoring & TankBot | Binusha | YOLO11m + ByteTrack, RAG chatbot | Live people count, threshold alarm, safety Q&A |

## ✨ Website Features

- Research overview, objectives and problem statement
- Literature review of 5 papers with a feature comparison table and research gap
- Tabbed methodology for each of the four components (data, training, pipeline, evaluation)
- Combined system architecture and model-selection rationale
- Interactive **GDI calculator** that illustrates the formula (methodology demo, not the live system)
- Research timeline, evaluation metrics and targets
- Downloadable research documents (PDF and Word)
- Expandable viva Q&A
- Animated UI: scroll reveals, counting statistics, animated hero, progress bar, dark mode, responsive layout

## 🗂 Project Structure

```
aquaguard-site/
├── index.html              # Main page (links to css/ and js/)
├── index-standalone.html   # Single-file version with CSS and JS inlined
├── css/
│   └── style.css
├── js/
│   └── script.js
├── docs/
│   ├── AquaGuard_Research.pdf
│   ├── Nuzri_Methodology.docx
│   ├── Ithayavelini_M_A_Methodology.docx
│   └── Binusha_Methodology.docx
└── README.md
```

## 🚀 Getting Started

No build step or dependencies are needed.

1. Clone the repository
   ```bash
   git clone https://github.com/<your-username>/<your-repo>.git
   cd <your-repo>
   ```
2. Open `index.html` in a browser, or run a local server:
   ```bash
   python3 -m http.server 8000
   ```
   then visit `http://localhost:8000`.

> Keep the `css/`, `js/` and `docs/` folders next to `index.html`. If you only want one file, use `index-standalone.html`.

The page loads two Google Fonts (Newsreader, Public Sans). Offline, it falls back to system fonts.

## 🌐 Deploy with GitHub Pages

1. Push the files to your repository (the files should be in the repository root or in `/docs-site`, not nested twice).
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Your site will be available at `https://<your-username>.github.io/<your-repo>/`.

## 🛠 Customising

- **Team names, supervisor, institution:** edit the *Research team* section in `index.html` (replace the `[Add ...]` placeholders).
- **Final results:** add each member's measured precision, recall, F1 and mAP in the *Evaluation* section.
- **Component details:** edit the `modules` array at the top of `js/script.js`.
- **Colours:** change the CSS variables at the top of `css/style.css`.

## 🧰 Built With

HTML5 · CSS3 · Vanilla JavaScript (no frameworks)

Research stack documented on the site: YOLOv8 / YOLOv11 (Ultralytics), ByteTrack, FastAPI, Next.js, SQLite, Roboflow, Google Colab / Kaggle, Pinecone.

## 👥 Research Team

| Name | Component |
|------|-----------|
| Lithurshna | Garbage detection and GDI |
| Nuzri | Human-wildlife proximity |
| Ithayavelini M A | Drowning detection |
| Binusha | Crowd monitoring and TankBot |

**Supervisor:** _add name_  
**Institution:** _add institution_

## 📚 Key References

- Cao et al. (2025), *Scientific Reports*, doi:10.1038/s41598-025-32817-x
- Zhao et al. (2026), *Applied Sciences*, doi:10.3390/app16020651
- Wang et al. (2026), *Frontiers in Computer Science*, doi:10.3389/fcomp.2026.1859574
- Dong et al. (2026), *PLOS ONE*, doi:10.1371/journal.pone.0340822
- *Water* (MDPI, 2024), doi:10.3390/w16101373
- Wijayaweera et al. (2024), *Water*, doi:10.3390/w16192766

## 📄 License

Add a license of your choice (for example MIT) or state that this is an academic submission, all rights reserved.
