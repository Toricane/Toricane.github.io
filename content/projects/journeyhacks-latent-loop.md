---
title: "Latent Loop"
description: "Live voice notes that revise relevant Markdown sections as a conversation returns to earlier topics."
when: "2026/01"
from: "JourneyHacks"
significance: standard
tags:
  - hackathon
  - In-Person
---

## Overview

Eric Chen and I built a note-taking MVP for conversations that evolve through corrections and revisited ideas. It maintains structured notes alongside the transcript.

## Role and constraints

I refined the idea and designed how the frontend and backend should work together. Eric integrated Groq transcription and also worked on UI design.

## Process

Seven-second audio chunks pass through Whisper transcription, ChromaDB/FastEmbed section matching, and Gemini synthesis. A FIFO queue serializes writes to Markdown, and Server-Sent Events update the browser. We adjusted the similarity threshold after an early version created too many new sections.

## Result

Built the integrated note-updating MVP. Direct editing of the rendered notes was left for future work.

## Gallery

<!-- [Replace with: verified project or award images.] -->

## Links

- [Devpost](https://devpost.com/software/latent-loop)
- [GitHub](https://github.com/falldownstairs/Latent-Loop)
- [Hackathon](https://journeyhacks2026.devpost.com/)

<!-- Sources: https://devpost.com/software/latent-loop; https://github.com/falldownstairs/Latent-Loop; https://journeyhacks2026.devpost.com/ -->
