---
title: "Pack Coordinator"
description: "Conference group-planning prototype with shared-interest views, a day timeline, status screens, and a venue map."
when: "2026/05"
from: "Web Summit Vancouver Hackathon"
significance: standard
tags:
  - hackathon
  - In-Person
aliases:
  - projects/web-summit-schedule-explorer
---

## Overview

Gini Choi and I built a focused companion concept for people attending a large conference together. It helps a group see overlapping session interests and plan a shared day.

## Role and constraints

I developed the initial idea and turned design mockups into the live prototype. Gini collaborated on UI design, the emergency-call concept, and the presentation. The event allowed three hours to build.

## Process

The React, Vite, and TypeScript app uses 515 scraped Web Summit sessions. Its repository stores demo group state in localStorage and uses precomputed recommendation examples, with search and a timeline slot picker.

### Schedule explorer and data collection

Before the hackathon, I built a separate Web Summit Vancouver schedule explorer on May 11–14, 2026. A resumable Playwright scraper collected the official schedule, session descriptions, and speakers into JSON. A vanilla HTML, CSS, and JavaScript interface displayed overlapping sessions in venue lanes, with search and personal schedules that could be saved locally, exported, and imported.

The schedule explorer provided the related data-collection and individual-planning work behind this conference-planning project. It was developed separately from the three-hour hackathon prototype.

## Result

Deployed a working interface prototype. Real-time multiplayer sync and live model-powered matching remain extensions beyond the repository’s implemented version.

## Gallery

![Pack Coordinator prototype screens](/assets/tab-panels/pack-coordinator.webp)

## Links

- [Devpost](https://devpost.com/software/pack-coordinator)
- [GitHub](https://github.com/Toricane/web-summit-hackathon)
- [Website](https://web-summit-pack.vercel.app/)
- [Demo video](https://www.youtube.com/watch?v=7xvEPbMQyto)
- [Presentation](https://www.figma.com/deck/xUl9DaBkruX79ywodYZUe8)
- [Schedule explorer and scraper GitHub](https://github.com/Toricane/browse-web-summit-van)

<!-- Sources: Devpost project and contribution notes; Toricane/web-summit-hackathon README; https://van26-hack.devpost.com/
Review: Devpost mentions Supabase/Claude integration; repository explicitly documents no backend and precomputed matching. Copy follows the code-backed implementation. -->

<!-- Schedule explorer source: https://github.com/Toricane/browse-web-summit-van. May 11–14, 2026 bounds use reviewed implementation commits. -->
