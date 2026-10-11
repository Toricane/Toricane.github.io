---
title: "Vancouver Transit Tracker"
description: "Interactive transit map animating scheduled SkyTrain, RapidBus, 99 B-Line, and SeaBus positions from TransLink GTFS."
date: "2025-07-24"
modified: "2025-08-05"
from: "Independent"
significance: featured
tags:
  - Python
  - JavaScript
  - Maps
  - Transit
---

## Overview

The tracker turns a static transit schedule into a moving map with route overlays, stations, and arrival countdowns. It supports a mobile-friendly PWA interface.

## Role and constraints

> [Replace with: what you personally owned, who you worked with, and the practical constraints.]

## Process

A Python build downloads TransLink GTFS, generates compact data for the Vancouver service date, and packages the browser assets. GitHub Actions refreshes daily service data and reuses a weekly feed cache.

## Result

Published schedule-based vehicle animation and route exploration. Positions and countdowns are schedule estimates, not measurements from a live vehicle feed.

## Reflection

> [Replace with: what you learned, what you would change, and what you would test next.]

## Gallery

<!-- [Replace with: verified project or award images.] -->

## Links

- [GitHub](https://github.com/Toricane/vancouver-transit-tracker)
- [Website](https://prajwal.is-a.dev/vancouver-transit-tracker/)

<!-- Sources: https://github.com/Toricane/vancouver-transit-tracker
Review: Original development ran July–August 2025, with the final feature commit 519706b (moving vehicles; August 5 in Vancouver, August 6 UTC). End date follows the user's August 5 clarification. October 2026 deployment/cache changes 8a18a02 and a44eeb2 are maintenance and do not extend the project range. -->
