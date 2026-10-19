---
title: "UBC Engineering GPA Placement Analysis"
description: "Python analysis comparing historical placement GPA charts across UBC’s 14 engineering specializations."
date: "2026-01-26"
modified: "2026-01-26"
from: "Independent"
significance: featured
tags:
  - Python
  - OpenCV
  - Data-Analysis
  - LaTeX
---

## Overview

I compared placement statistics from the 2020W–2023W and 2022W–2025W reporting periods to explore differences between engineering programs. The charts express historical placement averages as percentages.

## Role and constraints

> [Replace with: what you personally owned, who you worked with, and the practical constraints.]

## Process

OpenCV detects colored annotations on the official charts, then calibrated pixel coordinates are converted to GPA values. A Jupyter analysis produces rankings, heatmaps, and estimated distributions, with a LaTeX report.

## Result

Produced the analysis and report. Values extracted from charts and fitted distributions are estimates; historical placement statistics do not predict admission thresholds.

## Reflection

> [Replace with: what you learned, what you would change, and what you would test next.]

## Gallery

![Historical engineering placement GPA comparison heatmap.](/assets/tab-panels/ubc-engineering-gpa-heatmap.webp)

![Historical engineering program comparison by median placement GPA.](/assets/tab-panels/ubc-engineering-gpa-ranking.webp)

## Links

- [GitHub](https://github.com/Toricane/ubc-engineering-gpa-analysis)
- [Report](https://github.com/Toricane/ubc-engineering-gpa-analysis/blob/main/docs/UBC_Engineering_GPA_Report.pdf)

<!-- Sources: https://github.com/Toricane/ubc-engineering-gpa-analysis; https://github.com/Toricane/ubc-engineering-gpa-analysis/blob/main/docs/UBC_Engineering_GPA_Report.pdf
Review: Dates use the first and last reviewed source commits (or first commit only for maintained work), rather than repository creation/push timestamps.  -->
