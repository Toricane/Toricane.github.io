---
title: ForgeX Trading
description: Forex and futures backtesting platform with historical-market replay, simulated trades, and incremental market-data ingestion.
date: 2026-05-26
modified: 2026-08-06
from: ForgeX Trading
significance: featured
tags:
  - Python
  - FastAPI
  - React
  - QuestDB
  - FinTech
---

## Overview

ForgeX Trading lets traders practice strategies against historical market data, replaying charts and placing simulated orders before risking real money. I helped build the initial platform with Advay, turning the product vision into a working trading terminal and the data infrastructure behind it.

## Role and constraints

As Founding Full-Stack Engineer, I did most of the initial coding and made the technical architecture decisions. Advay led the product vision, and I helped him contribute to the code through his AI agents. My involvement ran from May through August 2026 and included migration support and developer onboarding to hand off the platform.

## Process

I built the initial application, core buy/sell functionality, and chart-history and replay behavior using Python, FastAPI, and React. Replay improvements included stable chart viewports, weekend context, chart synchronization, and journal refresh behavior.

For historical market data, I implemented QuestDB time-series storage, batched candle ingestion, and incremental synchronization. Gap-filling and recency updates extended the available history without repeatedly loading existing data. I also added database backup, restore, and candle-merging tooling, integrated multiple AI providers, and documented deployment.

## Result

The platform I helped establish now serves more than 150 users, as reported in my October 2026 resume. That adoption reflects the product's continued development after my initial work and handoff.

## Reflection

> [Replace with: what you learned, what you would change, and what you would test next.]

## Gallery

![Market replay with an active simulated trade and stop-loss and take-profit levels.](/assets/tab-panels/forgex-replay.webp)
![Dashboard with account performance, trade distribution, and recent replay sessions.](/assets/tab-panels/forgex-dashboard.webp)
![Trade review with entry and exit chart captures and reflection fields.](/assets/tab-panels/forgex-trade-review.webp)
![Performance analytics with an equity curve and trading statistics.](/assets/tab-panels/forgex-analytics.webp)
![AI coaching report with an edge rating and strategy analysis.](/assets/tab-panels/forgex-ai-coaching.webp)
![Simulated order entry with direction, order type, quantity, and risk controls.](/assets/tab-panels/forgex-order-entry.webp)

## Links

- [Website](https://forgextrading.com/)

<!-- Dates use the first commit and last verified contribution in the local checkout; the resume records May–August 2026. Sources: fx-project Git history, README.md and HANDOFF.md; published resume; user-confirmed role in the resume chat. Screenshots are from the local Finance/screenshots archive. -->
