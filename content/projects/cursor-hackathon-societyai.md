---
title: "SocietyAI"
description: "Multi-agent civic simulation where generated citizens debate policy questions and revise their stances over successive rounds."
when: "2026/05"
from: "Cursor Hackathon Vancouver"
significance: standard
tags:
  - hackathon
  - In-Person
---

## Overview

Eric Chen and I took inspiration from an in-person Vancouver skyline survey. We wanted to make the arguments around a policy question visible through a population of simulated citizens.

## Process

A composer agent researches a prompt through Nia and generates citizens with distinct backgrounds and views. Small groups discuss the issue, then their stances and summaries update. We built the interface with Next.js, Tailwind, and Supabase, using CLōD for model access.

## Reflection

Batching agent responses reduced the number of model calls while preserving individual perspectives. The generated citizens are a way to explore arguments, rather than measured public opinion.

## Gallery

![SocietyAI population view](/assets/tab-panels/societyai.webp)

![SocietyAI research and agent architecture](/assets/tab-panels/societyai-architecture.webp)

## Links

- [Devpost](https://devpost.com/software/societyai)
- [GitHub](https://github.com/Toricane/cursor-hackathon-vancouver)
- [Demo video](https://www.youtube.com/watch?v=ku_AEpiEmW4)
- [Hackathon](https://cursor-hackathon-vancouver.devpost.com/)

<!-- Sources: https://devpost.com/software/societyai; https://github.com/Toricane/cursor-hackathon-vancouver; https://www.youtube.com/watch?v=ku_AEpiEmW4; https://cursor-hackathon-vancouver.devpost.com/ -->
