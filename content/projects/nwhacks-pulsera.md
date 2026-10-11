---
title: "nwHacks – Pulsera"
description: "Webcam-based heart-rate estimation prototype with a conversational voice interface and a dashboard for trends."
when: "2026/01"
from: "nwHacks"
significance: featured
tags:
  - hackathon
  - In-Person
---

## Overview

Eric Chen and I explored combining face-video analysis with a conversation about how a user feels. The goal was to make physiological data easier to interpret without a dedicated wearable.

## Process

The stack combines a Next.js dashboard, Python/FastAPI, MongoDB, an OpenCV rPPG pipeline, Gemini, and ElevenLabs. Tracking a forehead region helps reduce motion noise, while an initial conversation fills the measurement buffer.

## Result

Built a hackathon prototype integrating video, voice, and conversational context. Its repository documents timeouts, model fallbacks, and camera-status handling.

## Gallery

![Pulsera prototype dashboard](/assets/tab-panels/pulsera.webp)

## Links

- [Devpost](https://devpost.com/software/pulsera)
- [GitHub](https://github.com/falldownstairs/nwhacks2026)
- [Hackathon](https://nwhacks-2026.devpost.com/)

<!-- Sources: https://devpost.com/software/pulsera; https://github.com/falldownstairs/nwhacks2026; https://nwhacks-2026.devpost.com/
Review: Devpost makes clinical-grade and prevention claims without validation evidence. Those claims are deliberately not adopted; this is a prototype. -->
