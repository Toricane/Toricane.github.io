---
title: JARVIS for the Visually Impaired
description: "Portable wearable AI assistant (camera, mic, speaker) giving low‑latency scene descriptions & Q/A; core translated to microcontroller (C++ + Edge Impulse)."
date: 2024-01-01
modified: 2024-12-19
from: Independent / TKS
significance: spotlight
tags:
  - AI
  - Edge
  - C++
  - Embedded
---

## Overview

I built JARVIS to explore how a wearable assistant could describe what is in front of a user and answer spoken questions. The first prototype mounted a Raspberry Pi, camera, microphone, earphones, button, and battery on a hat; later work focused on a smaller standalone form factor.

## Role and constraints

I developed the assistant and worked on moving wake-word detection and speech-to-text onto a Seeed Studio XIAO ESP32S3 Sense with C++ and Edge Impulse.

## Process

The first demonstrated version combined Gemini vision, Groq text generation, Azure speech services, and web retrieval. Button and wake-word activation started the interaction. I iterated toward the microcontroller prototype while gathering feedback at Vancouver AI meetups.

## Result

Secured a $1,000 Ingenious+ Regional Award grant, presented at four Vancouver AI Community Meetups, and demonstrated JARVIS at the TKS Showcase. The resume records spoken output beginning in under two seconds.

## Reflection

Live demos exposed microphone transcription problems, search errors, and fragile hardware mounting. I fixed the search behavior, adapted how I used the microphone, and sought connections to organizations serving visually impaired people for further feedback.

## Gallery

![AI Meetup Demo](/assets/tab-panels/vanaimay.webp)

![Ingenious+ Regional Award CAD$1K](/assets/tab-panels/ingenious_plus_photo.webp)

![2nd Prototype](/assets/tab-panels/2nd_prototype.webp)

![2nd Prototype Continued](/assets/tab-panels/2nd_prototype_continued.webp)

## Links

- [Ingenious+ Regional Award CAD$1K](/awards/ingenious-regional-grant-cad-1k)
- [AI Voice Project | 2024/03/03](https://www.linkedin.com/posts/prajwal-prashanth_create-your-own-ai-voice-assistant-for-free-activity-7169593571602362368-Rn7y)
- [Ingenious+ Regional Award CAD$1K | 2024/04/16](https://www.linkedin.com/posts/prajwal-prashanth_last-tuesday-i-had-the-incredible-opportunity-activity-7188737473236160513-mCiZ)
- [1st Demo (500 reactions) | 2024/04/28](https://www.linkedin.com/posts/prajwal-prashanth_demo-video-of-my-jarvis-project-jarvis-activity-7190196909771268096-mV2p)
- [AI Meetup Demo | 2024/05/30](https://www.linkedin.com/posts/prajwal-prashanth_second-demo-video-of-my-jarvis-project-with-activity-7204007352314851329-QSDR)
- [TKS Showcase Demo | 2024/06/09](https://www.linkedin.com/posts/prajwal-prashanth_on-sunday-june-9th-i-demoed-my-jarvis-project-activity-7209208311588528129-9Qt-)
- [BCYDC Spotlight Demo | 2024/06/27](https://www.linkedin.com/posts/bcydc_ai-innovation-tech-activity-7216507096656199680-Gqqm)
- [2nd AI Meetup Demo | 2024/06/27](https://www.linkedin.com/posts/prajwal-prashanth_last-night-at-the-june-future-proof-creatives-activity-7214142470563975170-4g_L)
- [2nd Prototype Demo | 2024/08/29](https://www.linkedin.com/posts/prajwal-prashanth_vancouverai-futureproofcreatives-healthcarerevolution-activity-7236979912601964544-gUnx)
- [TKS Focus Showcase | 2024/12/19](https://tksworld.notion.site/JARVIS-AI-Voice-Assistant-with-Vision-for-the-Visually-Impaired-15cb825036e280a1b04bc4b23943b625)
- [GitHub](https://github.com/Toricane/jarvis)

<!-- Content enrichment sources: resume.md; linkedin_export/projects.md and posts.md; linked repository README and/or Devpost story. -->
