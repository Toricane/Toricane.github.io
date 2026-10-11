---
title: "Pet Maker"
description: "Turns a pet photo into a rigged 3D companion that responds to webcam-tracked hands, petting, and a game of fetch."
when: "2026/10"
from: "StormHacks"
significance: standard
tags:
  - hackathon
  - In-Person
---

## Overview

Eric Chen and I built Pet Maker for the Fetching Reality challenge. The experience combines generated characters with a backyard environment reconstructed from a photograph.

## Process

TypeScript and Three.js handle rendering and interaction. Next.js supports image-to-3D generation through fal.ai and rigging through Tripo. MediaPipe tracks both hands; smoothed landmarks and estimated reach connect gestures to virtual contact. A World Labs environment mesh provides the shared space for the character and ball.

## Reflection

Hand tracking, camera perspective, contact detection, and character rigs all had to agree for petting and fetch to feel consistent. Different bone names and proportions also made reusable animation difficult.

## Gallery

![Pet Maker characters and generated backyard](/assets/tab-panels/pet-maker.webp)

![Pet Maker asset-generation architecture](/assets/tab-panels/pet-maker-architecture.webp)

## Links

- [Devpost](https://devpost.com/software/prairic-project)
- [GitHub](https://github.com/Toricane/stormhacks26)
- [Demo video](https://www.youtube.com/watch?v=j8Cc7gpfl6Y)
- [Hackathon](https://stormhacks2026.devpost.com/)

<!-- Sources: https://devpost.com/software/prairic-project; https://github.com/Toricane/stormhacks26; https://www.youtube.com/watch?v=j8Cc7gpfl6Y; https://stormhacks2026.devpost.com/ -->
