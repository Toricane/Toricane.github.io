---
title: "What’s Next for Canada?"
description: "Interactive 3D semantic maps of 1,000 Canadians’ survey responses, using embeddings, t-SNE, and clustered themes."
when: "2025/06"
from: "Vancouver AI Data Storytelling Hackathon"
significance: standard
tags:
  - hackathon
parent: "student-survey-analysis"
---

## Overview

Round 2 asked participants to turn a survey about Canada’s present and future into an engaging data story. I explored the relationships between open-ended answers in a space users could rotate, zoom, and inspect.

## Process

I generated OpenAI text embeddings, reduced them to three dimensions with t-SNE, and selected K-Means cluster counts using silhouette scores. Identical responses were aggregated; cube-root marker sizing made marker volume reflect frequency. Plotly supplies interactive maps and hover text.

## Reflection

This extended my earlier student-survey maps. Iterating on clustering, sizing, and presentation made the responses easier to explore, while the geometry remains an exploratory representation of the data.

## Gallery

<!-- [Replace with: verified project or award images.] -->

## Links

- [GitHub](https://github.com/Toricane/van_ai_data_storytelling_hackathon_round_2)
- [Website](https://prajwal.is-a.dev/van_ai_data_storytelling_hackathon_round_2/)
- [Demo video](https://www.youtube.com/watch?v=a6kd128q9Bg)
- [Competition](/projects/vancouver-ai-data-storytelling)

<!-- Sources: Repository README and June 2025 commits; resume.md. -->
