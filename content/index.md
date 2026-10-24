---
title: Prajwal Prashanth
description: Portfolio of Prajwal Prashanth – building AI + systems projects, hackathon wins, research, and leadership.
cssclasses:
  - portfolio-home
---

Hello there! I'm a second-year :ubc: [Engineering Physics student at UBC](https://www.engphys.ubc.ca/). I build AI tools and physical prototypes.

- Co-founded [Buildplate](/projects/buildplate): **83 profiles and 66 published portfolios** during my role.
- Built [JARVIS](/projects/jarvis-for-the-visually-impaired), a wearable AI assistant demoed at **four Vancouver AI meetups**.
- Led [Handy Andy](/projects/handy-andy), a robotic hand connecting **speech to ASL movements**.
- Built systems for a **1,000+ member AI community** and taught chess to **30+ elementary students**.

[Email](mailto:prajwal028@outlook.com) · [GitHub](https://github.com/Toricane) · [LinkedIn](https://linkedin.com/in/prajwal-prashanth)

## From cellular data to a response scenario

Could people get home if a crossing or transit route closed? With [cell-safe](/projects/cell-safe), our team, Five Bars 3G, explored that question around Waterfront Station using synthetic cellular activity. Rogers, UBC, and Databricks hosted the challenge.

### Make the data usable

![The cell-safe dashboard showing activity at Waterfront Station and grouped home origins.](/assets/tab-panels/cell-safe-website.webp)

I designed the database schema and Databricks medallion pipeline, turning **8.06 million synthetic cellular records into 437,760 minute-level activity summaries**. We grouped 36 home origins into four regions and checked that regional counts reconciled to the totals.

### Connect the data to decisions

![Five Bars 3G presenting the emergency-response scenario.](/assets/tab-panels/cell-safe-presentation.webp)

I helped develop the team's disaster-response scenario. We connected the activity summaries with community hubs, road closures, and transit information to explore transport, shelter, and supply needs under different conditions.

### Present the result and its limits

![Five Bars 3G with the hackathon organizers and judges.](/assets/tab-panels/cell-safe-group.webp)

We won **first place and a $3,000 team prize**. The prototype made the scenario easier to inspect, while relying on explicit assumptions: synthetic session counts and home origins alone cannot establish where someone wants to go or what help they need.

[Explore the pipeline and response scenario](/projects/cell-safe)

## From prototype to public demo

Live demonstrations of [JARVIS](/projects/jarvis-for-the-visually-impaired) exposed microphone transcription problems, search errors, and fragile hardware mounting. Taking the wearable AI assistant to four Vancouver AI meetups gave me specific problems to work on, and people to learn from.

### Make the hardware portable

![The camera board and battery used in a compact JARVIS prototype.](/assets/tab-panels/2nd_prototype.webp)

The first version mounted a Raspberry Pi, camera, microphone, earphones, button, and battery on a hat to describe scenes and answer spoken questions. The camera board and battery shown here are from a later, smaller prototype.

### Put it in front of people

![Presenting JARVIS at a Vancouver AI community meetup.](/assets/tab-panels/vanaimay.webp)

I fixed the search behavior, adapted how I used the microphone, and gathered feedback from local AI professionals. Demonstrating the assistant meant working through practical problems as well as the AI pipeline.

### Work toward a smaller form

![A closer look at the JARVIS microcontroller prototype.](/assets/tab-panels/2nd_prototype_continued.webp)

I worked on moving wake-word detection and speech-to-text onto a Seeed Studio XIAO ESP32S3 Sense using C++ and Edge Impulse. A $1,000 Ingenious+ grant helped fund continued development.

[See prototype iterations and demo videos](/projects/jarvis-for-the-visually-impaired)

## More selected work

A few more projects and their results.

## Building with people

![Sharing CalendAI at a Vancouver AI Community Meetup.](/assets/tab-panels/calendai_demo.webp)

### Infrastructure for a community

As Community DevOps Manager and an independent contractor at the [BC + AI Ecosystem](https://vancouver.bc-ai.net/ecosystem) from February to May 2026, I worked on Discord permissions and onboarding for a 1,000+ member community, contribution workflows, and a community project directory.

### Sharing what I learn

Presenting at Vancouver AI meetups gave me practice explaining technical work and listening to feedback. Earlier, I taught chess to more than 30 elementary students through the BC Junior Chess Association and [maintained its website](/projects/bcjca-website).

### The path so far

TKS, 2023–2025 → Langara Engineering Transfer, 2025–2026 → UBC Engineering Physics, 2026–2030 (expected).

I'm interested in taking this mix of software and physical engineering further into robotics and quantum computing.

## A few things I couldn't leave alone

Spelling Garden began with my younger brother's spelling bee. Other small builds explore job listings and Vancouver transit.

### Helping words stick

![Spelling Garden's home screen with daily practice and word progress.](/assets/tab-panels/spelling-garden.webp)

[Spelling Garden](/projects/spelling-garden) started as a way to help my younger brother prepare for his spelling bee. It pairs spoken words with spaced repetition for daily practice.

### A moving view of Vancouver

![Vancouver Transit Tracker, showing transit routes and scheduled vehicle positions.](/assets/tab-panels/vancouver-transit-tracker.webp)

[Vancouver Transit Tracker](/projects/vancouver-transit-tracker) turns transit schedules into an animated map of SkyTrain, buses, and SeaBus. Positions are schedule estimates, rather than live vehicle measurements.

### A clearer view of the job search

![Scoped local job search and saved positions.](/assets/tab-panels/scoped.webp)

[Scoped](/projects/scoped) brings UBC SCOPE listings into a searchable, filterable workspace with saved positions and a globe. Semantic search runs locally in the browser.

## A weekend to try something new

Hackathons give me a reason to cross disciplines, build with friends, and test an idea under a tight deadline. A few experiments beyond the selected work above:

### Sound you can see and feel

![Deaf Leppard accessibility hardware at Hack the North.](/assets/tab-panels/deaf-leppard.webp)

[Deaf Leppard](/projects/hack-the-north-deaf-leppard) · **Hack the North, 2026**. Our team combined speaker-attributed captions in AR glasses with directional haptic alerts, working across computer vision, embedded software, and circuitry.

### From a question to an animation

![The Genimo team at nwHacks.](/assets/tab-panels/nwhacks_hackathon.webp)

[Genimo](/projects/nwhacks-2025-genimo) · **nwHacks, 2025**. Inspired by 3Blue1Brown, we connected Gemini to Manim to turn math and physics questions into educational animations. I worked on prompts and the generation pipeline.

### A photo becomes a playmate

![Pet Maker characters in a generated backyard.](/assets/tab-panels/pet-maker.webp)

[Pet Maker](/projects/stormhacks-pet-maker) · **StormHacks, 2026**. Eric Chen and I turned pet photos into rigged 3D companions that respond to hand tracking, petting, and fetch. Making gestures and contact feel consistent was the interesting challenge.

[Explore all hackathon builds →](/tags/hackathon)

## A few milestones along the way

- [LSU Faculty of Science Award](/awards/lsu-faculty-of-science-award). Recognized for the highest GPA in my program during Fall 2025.
- [Ingenious+ Regional Award](/awards/ingenious-regional-grant-cad-1k). $1,000 to support the development of JARVIS.
- [Class valedictorian](/awards/class-valedictorian). Chosen to deliver MacNeill Secondary's Class of 2025 farewell speech.

[All awards and distinctions](/awards/)

## Let's build something useful

If you're working on AI, software, or hardware, or have a question about something here, I'd like to hear from you.

[Email me](mailto:prajwal028@outlook.com) · [Resume](https://prajwal.is-a.dev/resume/) · [GitHub](https://github.com/Toricane) · [LinkedIn](https://linkedin.com/in/prajwal-prashanth)

Elsewhere: [Substack](https://prajwalprashanth.substack.com/) · [YouTube](https://www.youtube.com/@prajwalp) · [Instagram](https://www.instagram.com/prajwal.__.p/) · [Medium](https://prajwal-prashanth.medium.com/) · [X](https://x.com/PrajwalP028)
