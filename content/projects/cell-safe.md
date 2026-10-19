---
title: "cell-safe (1st Place)"
description: "Emergency-response scenario prototype using synthetic cellular activity to explore transport, shelter, and supply needs at Waterfront Station."
when: "2026/09"
from: "Data Intelligence for Smarter Communities"
significance: spotlight
tags:
  - hackathon
  - In-Person
  - Winner
---

## Overview

Our team, Five Bars 3G, explored how a disruption around Waterfront Station could affect people from different home origins. The prototype lets an operator compare crossing availability, support locations, and conditional resource needs.

## Role and constraints

I designed the medallion pipeline and database schema and helped develop the emergency-response scenario. Rogers, UBC, and Databricks supplied synthetic cellular records for the challenge.

## Process

Using Spark, SQL, Delta Lake, and Databricks, I transformed 8,060,012 attachment records into 437,760 minute-level activity rows. We mapped 36 home origins into four geographic buckets and validated that bucket counts reconciled to totals.

## Result

Won first place and a $3,000 team prize. The prototype uses historical synthetic session counts and explicit scenario assumptions; a recorded home origin alone does not establish a person’s destination or assistance needs.

## Gallery

![Five Bars 3G with hackathon organizers and judges.](/assets/tab-panels/cell-safe-group.webp)

![Five Bars 3G presenting Cell Safe.](/assets/tab-panels/cell-safe-presentation.webp)

![Cell Safe situation dashboard showing Waterfront Station activity and home regions.](/assets/tab-panels/cell-safe-website.webp)

## Links

- [Website](https://cell-safe.vercel.app/)
- [GitHub](https://github.com/Toricane/ubc-rogers-databricks-hackathon-team-1)
- [Presentation](https://canva.link/deq07x3voksq7o3)
- [First-place award](/awards/data-intelligence-hackathon-first-place)

<!-- Sources: resume.md; linkedin_export/posts.md, 2026-10-01; repository README and pipeline validation. Hackathon occurred in September; October is the post date. -->
