---
title: Spelling Garden
description: Spelling bee practice with text-to-speech and spaced repetition to help words stick.
date: 2026-10-18
from: Independent
significance: standard
tags:
  - JavaScript
  - Education
  - Text-to-Speech
  - Spaced-Repetition
---

## Overview

I started Spelling Garden so my younger brother could prepare for his spelling bee competition by hearing words read aloud and practicing recalling their spellings. The idea was to bring the experience of a spelling bee into daily practice, with spaced repetition to support learning and memorization.

## Role and constraints

> [Replace with: what you personally owned, who you worked with, and the practical constraints.]

## Process

The app uses all 400 words from the SBOC 2027 Official Junior Word List, including pronunciations, definitions, example sentences, and accepted alternatives. It pairs typed spelling practice with generated Kokoro audio, with browser speech synthesis available as an option.

Due reviews come before new words. Correct scheduled reviews move through 1, 3, 7, 14, and 30-day intervals; missed words return for a same-session retry and review the next day. Practice can be a short set of 10 distinct words plus retries or an open-ended session.

## Result

The live app saves progress in the browser and includes practice statistics and JSON backups. It is a static JavaScript app with no accounts or backend. Learning hints remain available during typed practice.

## Reflection

> [Replace with: what you learned, what you would change, and what you would test next.]

## Gallery

![Spelling Garden home screen with daily practice and word progress.](/assets/tab-panels/spelling-garden.webp)

## Links

- [Website](https://prajwal.is-a.dev/spelling-garden/)
- [GitHub](https://github.com/Toricane/spelling-garden)
