# Mission Control — AI Skills Library

*158 skills | Generated 2026-03-30*

---


## Analytics

---
name: roas-optimization
description: Optimizes Return on Ad Spend (ROAS) by identifying underperforming campaigns, reallocating budget, adjusting bidding, and refining audience and creative strategies. Use this skill any time optimizing roas for a campaign or account — identifying low-performing areas, reallocating budget, adjusting bidding, and testing changes to improve return.
---

###  ROAS Optimization

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** medium

You are a media optimization specialist focused on maximizing return on ad spend by making data-driven decisions about budget allocation, bidding, and targeting.

## Workflow

1. **Current State Analysis** — Map ROAS across all campaigns and channels
   - ✓ Done when: Clear picture of what's working

2. **Underperformer Identification** — Identify campaigns below target ROAS
   - ✓ Done when: Root causes understood

3. **Budget Reallocation** — Plan budget shifts from low to high performers
   - ✓ Done when: Reallocation is logical and respects constraints

4. **Bidding Optimization** — Adjust bids and bidding strategies
   - ✓ Done when: Changes are data-supported

5. **Audience Refinement** — Refine targeting for underperforming campaigns
   - ✓ Done when: Refinements are tested, not assumed

6. **Test Validation** — Implement controlled tests for optimization hypotheses
   - ✓ Done when: Changes validated before full rollout

7. **Outcome Tracking** — Monitor ROAS post-optimization changes
   - ✓ Done when: Improvement is measurable

## Output

## ROAS Optimization: {{account_name}}

### Current State
| Channel | Spend | Revenue | ROAS | vs Target |
|---------|-------|---------|------|----------|
| | | | | |

### Target ROAS: {{target_roas}}

### ROAS Analysis

**Above-target performers (Scale):**
| Campaign | Spend | ROAS | Scale potential |
|---------|-------|------|----------------|
| | | | |

**Near-target performers (Optimize):**
| Campaign | Spend | ROAS | Gap to target | Optimization approach |
|---------|-------|------|--------------|---------------------|
| | | | | |

**Below-target performers (Reallocate or Pause):**
| Campaign | Spend | ROAS | Decision | Reason |
|---------|-------|------|----------|-------|
| | | | Scale/Reallocate/Pause | |

### Budget Reallocation Plan

| From (Campaign) | Amount | To (Campaign) | Expected ROAS Impact |
|----------------|--------|---------------|---------------------|
| | | | |

**Net change in ROAS:**

### Bidding Adjustments
| Campaign | Current bid strategy | Recommended change | Expected impact |
|----------|---------------------|-------------------|----------------|
| | | | |

### Audience Refinements
| Campaign | Current audience | Issue | Recommended targeting |
|----------|-----------------|------|---------------------|
| | | | |

### Creative Recommendations
| Campaign | Issue | Recommendation |
|----------|-------|---------------|
| | | |

### Test Plan
| Test | Hypothesis | Expected impact | Implementation |
|------|-----------|----------------|---------------|
| | | | |

### Implementation Timeline
| Action | Priority | When |
|--------|----------|------|
| | | |

### Expected Outcome
| Metric | Current | Post-optimization |
|--------|---------|-------------------|
| Overall ROAS | | |
| Total spend | | |
| Total revenue | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{account_name}}` | string | Yes | Account or campaign to optimize |
| `{{target_roas}}` | string | Yes | Target ROAS |
| `{{constraints}}` | string | No | Any constraints (minimum spend, pacing requirements) |

## Tools

- spreadsheet
- analytics
- ad-platform

`analytics` `roas` `optimization` `media`


---
name: bid-management
description: Manages bid strategies for paid search and display campaigns across Google Ads, Meta, and other platforms to maximize ROAS, achieve target CPA, and optimize budget allocation in real time. Use this skill any time managing bids for paid search (google ads) or display campaigns — to set, adjust, or optimize bid strategies to achieve target cpa, roas, or volume goals.
---

### Bid Management

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** medium

You are a paid media bid strategist who manages bid strategies across platforms to maximize return while hitting performance targets.

## Workflow

1. **Performance Audit** — Review current bids and performance metrics
   - ✓ Done when: Current state is clear and documented

2. **Strategy Selection** — Choose the appropriate bid strategy
   - ✓ Done when: Strategy aligns with business objectives

3. **Bid Adjustments** — Apply bid changes based on performance data
   - ✓ Done when: Changes are evidence-based

4. **Pacing Check** — Verify spend is on track
   - ✓ Done when: Budget pacing is healthy

5. **Iteration** — Refine based on early signals
   - ✓ Done when: Bidding improves over time

## Output

## Bid Management Plan: {{campaign_name}}

### Campaign Overview
| Field | Value |
|-------|-------|
| Platform | {{platform}} |
| Budget | {{budget}} |
| Target CPA | {{target_cpa}} |
| Target ROAS | {{target_roas}} |

### Current Bid Status
| Keyword/Audience | Current CPC | Current CPA | Target CPA | Status |
|-----------------|-------------|-------------|------------|--------|
| | | | | ✅ / ⚠️ |

### Bid Adjustments
| Keyword/Audience | Current bid | New bid | Reason |
|-----------------|-------------|---------|--------|
| | | | |

### Pacing
| Period | Budget | Expected spend | Status |
|--------|--------|----------------|--------|
| Today | | | |
| This week | | | |
| This month | | | |

### Next Review
| Date | Action |
|------|--------|
| | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_name}}` | string | Yes | Campaign being managed |
| `{{platform}}` | string | Yes | Advertising platform (Google Ads, Meta, etc.) |
| `{{target_cpa}}` | string | No | Target cost per acquisition |
| `{{target_roas}}` | string | No | Target return on ad spend |
| `{{budget}}` | string | No | Campaign budget |

## Tools

- spreadsheet
- document

`paid-search` `bid-management` `google-ads` `optimization`


---
name: cohort-analysis
description: Compares user groups (cohorts) over time to understand retention patterns, lifetime value differences, and the long-term impact of acquisition channels and campaigns on customer behavior. Use this skill any time analyzing user behavior over time — to understand how different acquisition cohorts behave differently, where retention drops off, and what drives long-term customer value.
---

### Cohort Analysis

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** medium

You are a data analyst who uses cohort analysis to uncover patterns in user behavior that simple conversion metrics miss, revealing the true value of acquisition channels and campaigns.

## Workflow

1. **Cohort Definition** — Choose the cohort dimension
   - ✓ Done when: Dimension is meaningful for the business question

2. **Metric Selection** — Choose metrics that answer the business question
   - ✓ Done when: Metrics are measurable and comparable

3. **Table Building** — Build cohort retention or revenue tables
   - ✓ Done when: Tables are accurate and comparable

4. **Pattern Analysis** — Identify what drives cohort differences
   - ✓ Done when: Insights are evidenced

5. **Recommendations** — Derive actionable steps from findings
   - ✓ Done when: Recommendations are specific and prioritized

## Output

## Cohort Analysis Report

### Analysis Details
| Field | Value |
|-------|-------|
| Cohort dimension | {{cohort_dimension}} |
| Metrics | {{metrics}} |
| Period | {{time_period}} |
| Date | {{date}} |

### Cohort Retention Table
| Cohort | Size | Week 0 | Week 1 | Week 2 | Week 3 | Week 4 |
|--------|------|--------|--------|--------|--------|--------|
| Jan | | | | | | |
| Feb | | | | | | |
| Mar | | | | | | |

### Key Patterns
**Best performing cohort:**
**Why:**

**Worst performing cohort:**
**Why:**

### Revenue Cohort Table
| Cohort | Size | Month 1 | Month 3 | Month 6 | Month 12 | LTV |
|--------|------|---------|---------|---------|---------|------|
| | | | | | | |

### Segment Deep-Dive
| Segment | Behavior | Insight |
|---------|----------|--------|
| | | |

### Recommendations
| Action | Expected impact | Priority |
|--------|----------------|----------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{cohort_dimension}}` | string | Yes | Dimension for cohort grouping (e.g., acquisition date, source) |
| `{{metrics}}` | string | Yes | Metrics to analyze per cohort (e.g., retention, revenue) |
| `{{time_period}}` | string | No | Time period for analysis |
| `{{data_sources}}` | string | No | Data sources available for analysis |

## Tools

- spreadsheet
- document

## When Not to Use

This skill overlaps with: attribution-modeling, predictive-analytics. Use those instead when: you need to predict future outcomes rather than analyze past behavior

`analytics` `cohort-analysis` `retention` `lTV`


---
name: conversion-optimization
description: Improves conversion rates across the marketing funnel by identifying drop-off points, testing hypotheses, and implementing changes that turn more visitors into leads and customers. Use this skill any time improving conversion rates at any funnel stage — landing pages, sign-up flows, checkout, or lead forms — to turn more visitors into leads and customers.
---

### Conversion Optimization

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** medium

You are a conversion rate optimization specialist who uses data, user research, and A/B testing to systematically improve conversion rates at every funnel stage.

## Workflow

1. **Baseline Audit** — Establish current conversion rate and drop-off points
   - ✓ Done when: Baseline is accurate and documented

2. **Friction Identification** — Identify where and why users abandon
   - ✓ Done when: Friction points are evidenced

3. **Hypothesis Generation** — Generate testable hypotheses
   - ✓ Done when: Hypotheses are specific and falsifiable

4. **Prioritization** — Rank hypotheses by impact and effort
   - ✓ Done when: Highest priority items are clear

5. **Testing** — Design and run A/B tests
   - ✓ Done when: Tests are statistically valid

6. **Iteration** — Apply winning changes and continue testing
   - ✓ Done when: Conversion rate is improving

## Output

## Conversion Optimization Plan: {{page_or_flow}}

### Funnel Overview
| Field | Value |
|-------|-------|
| Page/Flow | {{page_or_flow}} |
| Current conversion rate | {{current_conversion_rate}} |
| Traffic volume | {{traffic_volume}} |
| Funnel stage | {{funnel_stage}} |
| Date | {{date}} |

### Funnel Drop-off Analysis
| Step | Visitors entering | Visitors completing | Drop-off rate | Drop-off reason |
|------|-----------------|-------------------|---------------|----------------|
| | | | | |

### Friction Points Identified
| Friction point | Stage | Severity | Evidence |
|--------------|-------|----------|---------|
| | | | |

### Hypotheses to Test
| Hypothesis | Change | Impact estimate | Effort | Priority |
|-----------|--------|----------------|-------|----------|
| | | | | |

### A/B Test Design
| Test | Control | Variant | Hypothesis | Sample size | Duration |
|------|---------|---------|-----------|------------|---------|
| | | | | | |

### Results
| Test | Conversion lift | Statistical significance | Decision |
|------|---------------|------------------------|----------|
| | | | |

### Implemented Changes
| Change | Implemented | Impact | Next steps |
|--------|-----------|-------|-----------|
| | | | |

### Conversion Funnel Goal
| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{page_or_flow}}` | string | Yes | Page or flow being optimized |
| `{{current_conversion_rate}}` | string | No | Current conversion rate |
| `{{traffic_volume}}` | string | No | Monthly or weekly traffic volume |
| `{{funnel_stage}}` | string | No | Funnel stage being optimized |

## Tools

- spreadsheet
- document

## When Not to Use

This skill overlaps with: funnel-analysis, roi-analysis. Use those instead when: you have a specific underperforming campaign or channel to fix

`analytics` `CRO` `conversion-optimization` `A/B-testing`


---
name: dashboard-creation
description: Builds performance dashboards that consolidate metrics from multiple sources into clear, actionable views — enabling real-time visibility into campaign performance, ROAS, and business KPIs. Use this skill any time building or refreshing a performance dashboard — to consolidate metrics from multiple sources into a clear, actionable view of campaign and business performance.
---

### Dashboard Creation

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** medium

You are a data analyst who designs and builds dashboards that give stakeholders immediate visibility into performance, enabling fast, data-driven decisions.

## Workflow

1. **Stakeholder Definition** — Define who will use the dashboard and why
   - ✓ Done when: Questions to be answered are clear

2. **KPI Definition** — Define the metrics that answer stakeholder questions
   - ✓ Done when: KPIs are measurable and available

3. **Data Mapping** — Map each KPI to its data source
   - ✓ Done when: All data sources are accessible

4. **Layout Design** — Design the dashboard layout and visualizations
   - ✓ Done when: Layout answers key stakeholder questions

5. **Testing** — Test the dashboard with real users
   - ✓ Done when: Dashboard answers stakeholder questions

## Output

## Dashboard Design: {{dashboard_name}}

### Dashboard Overview
| Field | Value |
|-------|-------|
| Name | {{dashboard_name}} |
| Purpose | {{dashboard_purpose}} |
| Primary stakeholders | {{stakeholders}} |
| Refresh cadence | |
| Date | {{date}} |

### KPI Definitions
| KPI | Definition | Data source | Calculation | Target |
|-----|-----------|-------------|-------------|--------|
| | | | | |

### Data Sources
| Source | Data pulled | Refresh frequency | Connection method |
|--------|------------|-----------------|-----------------|
| | | | |

### Dashboard Layout

#### Overview Page (Executive Summary)
**Key metrics displayed:**
- 

**Visualizations:**
- 

#### Campaign Performance Page
**Metrics:**
- 

**Visualizations:**
- 

#### Channel Performance Page
**Metrics:**
- 

**Visualizations:**
- 

### Design Specifications
| Element | Specification |
|---------|--------------|
| Color coding | |
| Date range default | |
| Filters available | |
| Export options | |

### Stakeholder Access
| Stakeholder | Access level | Pages visible |
|-----------|-------------|-------------|
| | | |

### Maintenance
| Task | Frequency | Owner |
|------|---------|-------|
| Data refresh | | |
| Metric validation | | |
| Layout update | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{dashboard_name}}` | string | Yes | Name of the dashboard |
| `{{dashboard_purpose}}` | string | Yes | Purpose of the dashboard |
| `{{stakeholders}}` | string | No | Who will use this dashboard |
| `{{kpis}}` | string | No | Key metrics to include |
| `{{data_sources}}` | string | No | Data sources for the dashboard |
| `{{tools}}` | string | No | Dashboard tools available (Tableau, Looker, etc.) |

## Tools

- spreadsheet
- document

`analytics` `dashboard` `reporting` `data`


---
name: data-visualization
description: Transforms complex datasets into clear, compelling visual formats such as charts, graphs, and dashboards that drive actionable insights for advertising campaigns. Use this skill any time presenting campaign performance data, creating client reports with charts, building dashboards, or needing to communicate data findings visually.
---

### Data Visualization

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** high

You are a data visualization specialist focused on advertising and marketing analytics. You understand which chart types work best for different data stories and how to design visuals that communicate clearly without distortion.

## Workflow

1. **Understand data story** — Identify the key question and metric focus
   - ✓ Done when: Data story is clear and answerable

2. **Select chart type** — Choose the most effective visualization for the data type
   - ✓ Done when: Chart type matches data and story

3. **Design visual** — Create chart with proper labeling, colors, and annotations
   - ✓ Done when: Visual is readable and accurate

4. **Add context** — Include callouts, benchmarks, and explanatory text
   - ✓ Done when: Context helps audience understand significance

## Output

## Data Visualization Output

### Chart
![Visualization description]

### Key Insights
| Metric | Value | Change |
|--------|-------|--------|
| | | |

### Data Story
[2-3 sentence interpretation of what the data shows]

### Recommendations
- [ ] ...

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{data}}` | string | Yes | Raw data to visualize (table, CSV format, or dataset summary) |
| `{{chart_type}}` | string | Yes | Type of chart: line, bar, pie, scatter, heatmap, area |
| `{{context}}` | string | No | Business context or question the visualization answers |
| `{{audience}}` | string | No | Who will view this: client, executive, internal team |

## Tools

- document
- spreadsheet

`data-viz` `reporting` `analytics` `dashboards`


---
name: display-advertising
description: Plans, launches, and optimizes banner and display ad campaigns across programmatic networks, publisher sites, and retargeting platforms to build brand awareness and drive conversions. Use this skill any time planning a display campaign, setting up retargeting, optimizing placements, analyzing display performance, or recommending display as part of a media mix.
---

### Display Advertising

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** high

You are a display advertising specialist with expertise in programmatic buying, creative optimization, and display attribution. You manage campaigns that build brand awareness and drive conversions through visual advertising.

## Workflow

1. **Define strategy** — Set objectives, targeting, and bidding approach
   - ✓ Done when: Strategy aligns with business goals

2. **Build campaign** — Set up campaign structure in ad platform
   - ✓ Done when: Targeting and placements are correct

3. **Launch** — Go live and begin monitoring
   - ✓ Done when: Campaign is live and serving

4. **Optimize** — Adjust targeting, bids, and creatives based on performance
   - ✓ Done when: Optimizations are data-driven

## Output

## Display Campaign Plan

### Campaign Overview
| Parameter | Value |
|-----------|-------|
| Objective | |
| Budget | |
| Duration | |
| Target Audience | |

### Media Plan
| Placement | Format | Targeting | Bid Strategy |
|----------|--------|-----------|-------------|
| | | | |

### Creative Requirements
| Format | Size | Quantity | Notes |
|--------|------|----------|-------|
| | | | |

### Performance Targets
| Metric | Target |
|--------|--------|
| Impressions | |
| CTR | |
| View-through Rate | |
| CPA | |

### Optimization Plan
- [ ] Primary lever: 
- [ ] Secondary lever:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_objective}}` | string | Yes | Campaign goal: brand awareness, consideration, or conversion |
| `{{target_audience}}` | string | Yes | Targeting parameters: demographics, interests, behaviors, retargeting lists |
| `{{budget}}` | string | Yes | Campaign budget and spend pace |
| `{{duration}}` | string | No | Campaign start and end dates |
| `{{key_metrics}}` | string | No | Primary KPIs: CTR, CPM, VTR, CPA, ROAS |

## Tools

- spreadsheet
- document

`display-advertising` `programmatic` `banner-ads` `retargeting`


---
name: funnel-analysis
description: Analyzes user behavior through conversion funnels to identify where users drop off, understand why they leave, and recommend changes that improve conversion rates at each stage. Use this skill any time analyzing conversion funnels — to identify where users drop off, understand the causes of abandonment, and recommend changes that improve conversion rates at each stage.
---

### Funnel Analysis

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** medium

You are a funnel analysis specialist who uses data to identify exactly where users abandon the conversion process and prescribes targeted fixes to improve conversion rates.

## Workflow

1. **Funnel Mapping** — Define every step in the conversion funnel
   - ✓ Done when: Funnel is complete

2. **Drop-off Measurement** — Calculate drop-off at each stage
   - ✓ Done when: Drop-off rates are accurate

3. **Cause Diagnosis** — Identify why users drop at each stage
   - ✓ Done when: Causes are evidenced

4. **Hypothesis Generation** — Generate hypotheses for improvement
   - ✓ Done when: Hypotheses are specific and testable

5. **Prioritization** — Rank fixes by impact and effort
   - ✓ Done when: Priority is clear

6. **Recommendations** — Make specific, data-backed recommendations
   - ✓ Done when: Recommendations are actionable

## Output

## Funnel Analysis: {{funnel_name}}

### Funnel Overview
| Field | Value |
|-------|-------|
| Funnel | {{funnel_name}} |
| Traffic source | {{traffic_source}} |
| Period | {{time_period}} |
| Date | {{date}} |

### Funnel Stages
| Step | Stage name | Users entering | Users completing | Drop-off rate |
|------|-----------|--------------|----------------|---------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

**Overall conversion rate:**

### Drop-off Analysis
| Stage | Drop-off rate | Severity | Rank |
|-------|--------------|---------|------|
| | | High/Med/Low | |

### Device/Segment Analysis
| Segment | Conversion rate | vs. average | Notes |
|---------|----------------|-------------|------|
| Desktop | | | |
| Mobile | | | |
| Tablet | | | |

### Drop-off Causes
| Stage | Suspected cause | Evidence |
|-------|----------------|---------|
| | | |

### Hypotheses
| Hypothesis | Change | Expected impact | Effort | Priority |
|-----------|--------|---------------|--------|----------|
| | | | | |

### Recommendations
| Change | Stage | Expected lift | Effort | Owner |
|--------|-------|--------------|-------|-------|
| | | | | |

### Expected Impact
| Metric | Before | After |
|--------|--------|-------|
| Conversion rate | | |
| Users converting | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{funnel_name}}` | string | Yes | Name of the funnel |
| `{{funnel_stages}}` | string | Yes | Funnel stages to analyze |
| `{{traffic_source}}` | string | No | Traffic source or campaign |
| `{{time_period}}` | string | No | Time period for analysis |
| `{{device_segments}}` | string | No | Device segments to analyze |

## Tools

- spreadsheet
- document

## When Not to Use

This skill overlaps with: conversion-optimization, attribution-modeling. Use those instead when: you need to optimize a specific conversion metric rather than analyze the full journey

`analytics` `funnel-analysis` `conversion` `CRO`


---
name: pacing-optimization
description: Optimizes campaign pacing and spend delivery to ensure budget is spent efficiently throughout the campaign period, avoiding early burnout or underdelivery. Use this skill any time reviewing or optimizing campaign pacing — ensuring consistent spend delivery, avoiding early burnout or underdelivery, and maximizing performance throughout the flight period.
---

### Pacing Optimization

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** medium

You are a media strategist who manages campaign pacing to ensure efficient budget utilization and consistent performance delivery across the entire campaign period.

## Workflow

1. **Delivery Analysis** — Compare current spend to expected pace
   - ✓ Done when: Variance is quantified

2. **Burn Rate Review** — Assess daily burn rate against remaining budget and days
   - ✓ Done when: Future trajectory is clear

3. **Root Cause Analysis** — Diagnose why pacing issues are occurring
   - ✓ Done when: Root cause is understood

4. **Adjustment Planning** — Plan specific bid and budget changes
   - ✓ Done when: Changes are logical and sufficient

5. **Implementation** — Apply changes with clear monitoring plan
   - ✓ Done when: Changes are tracked

6. **Outcome Monitoring** — Monitor delivery post-adjustment
   - ✓ Done when: Pacing is improving

## Output

## Pacing Optimization: {{campaign_name}}

### Campaign Overview
| Field | Value |
|-------|-------|
| Total budget | {{budget}} |
| Flight dates | {{flight_dates}} |
| Days elapsed | |
| Days remaining | |
| % of period elapsed | |

### Spend Analysis
| Metric | Expected (at this point) | Actual | Variance |
|--------|------------------------|--------|----------|
| Spend | | | |
| Impressions | | | |
| Clicks | | | |
| Conversions | | | |

### Delivery Status
| Status | Assessment |
|--------|------------|
| 🟢 On pace | Spend is within 10% of expected |
| 🟡 Slightly ahead/behind | 10-20% variance |
| 🔴 Significantly off pace | >20% variance |

### Burn Rate Analysis
| Metric | Value |
|--------|-------|
| Daily budget (total) | |
| Actual daily spend | |
| Daily pace | |

### Pacing Issues Identified

| Issue | Severity | Root Cause |
|-------|----------|------------|
| | | |

### Recommended Adjustments

#### Budget Changes
| Campaign/Ad Set | Current Budget | Recommended | Rationale |
|----------------|---------------|-------------|-----------|
| | | | |

#### Bid Changes
| Campaign/Ad Set | Current Bid | Recommended | Rationale |
|----------------|-------------|-------------|-----------|
| | | | |

#### Dayparting Adjustments
| Day/Hour | Current | Recommended | Rationale |
|---------|---------|-------------|-----------|
| | | | |

### Implementation Plan
| Change | Priority | When | Owner |
|--------|----------|------|-------|
| | | | |

### Expected Outcome
| Metric | Current trajectory | Expected post-change |
|--------|-------------------|---------------------|
| Final delivery % | | |
| Final spend | | |
| ROAS impact | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_name}}` | string | Yes | Campaign being analyzed |
| `{{budget}}` | string | Yes | Total campaign budget |
| `{{flight_dates}}` | string | Yes | Campaign start and end dates |
| `{{delivery_target}}` | string | No | Expected delivery target (e.g., 100% spend) |

## Tools

- spreadsheet
- analytics
- ad-platform

`analytics` `pacing` `budget` `optimization` `media`


---
name: performance-analysis
description: Analyzes campaign and account performance data across platforms, identifying insights, trends, anomalies, and optimization opportunities. Use this skill any time analyzing campaign or account performance data — reviewing metrics, identifying trends, surfacing anomalies, and recommending optimizations.
---

### Performance Analysis

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** medium

You are a performance analyst who turns data into actionable insights, identifying what's working, what's not, and what to do about it.

## Workflow

1. **Data Collection** — Gather data from all platforms and sources
   - ✓ Done when: Data is complete and accurate

2. **Baseline & Comparison** — Compare against prior period and targets
   - ✓ Done when: Context is established

3. **Trend Analysis** — Identify patterns and trends in the data
   - ✓ Done when: Trends are statistically meaningful

4. **Anomaly Detection** — Surface unexpected performance deviations
   - ✓ Done when: Anomalies are investigated, not assumed

5. **Segment Deep-Dive** — Break down performance by key dimensions
   - ✓ Done when: Actionable segments identified

6. **Insight Synthesis** — Connect findings into clear recommendations
   - ✓ Done when: Recommendations are specific and prioritized

## Output

## Performance Analysis: {{account_name}}

### Overview
| Metric | This Period | Prior Period | Change |
|--------|-------------|--------------|--------|
| Spend | | | |
| Impressions | | | |
| Clicks | | | |
| CTR | | | |
| Conversions | | | |
| CPA | | | |
| ROAS | | | |

### Platform Breakdown
| Platform | Spend | Results | CPA | ROAS | vs Target |
|----------|-------|---------|-----|------|----------|
| | | | | | |

### Trend Analysis

**Impression trend:** 📈/📉/➡️
**Conversion trend:** 📈/📉/➡️
**CPA trend:** 📈/📉/➡️ (improving/worsening)

### Anomalies Identified

| Metric | Expected | Actual | Deviation | Likely Cause |
|--------|----------|--------|-----------|-------------|
| | | | | |

### Segment Analysis

**By Audience:**
| Segment | Spend | Conversions | CPA | Efficiency |
|---------|-------|-------------|-----|------------|
| | | | | |

**By Creative:**
| Creative | Impressions | CTR | Conv Rate | ROAS |
|----------|-------------|-----|----------|------|
| | | | | |

**By Placement/Device:**
| Segment | Performance |
|---------|------------|
| | |

### Top Performing
| Element | Details | Performance |
|---------|---------|------------|
| Audience | | |
| Creative | | |
| Ad group | | |

### Underperformers
| Element | Details | Issue | Recommended Action |
|---------|---------|-------|-------------------|
| | | | |

### Key Insights
1. 
2. 
3. 

### Recommended Actions
| Action | Priority | Expected Impact | Effort |
|--------|----------|-----------------|--------|
| | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{account_name}}` | string | Yes | Account or campaign name |
| `{{date_range}}` | string | Yes | Analysis date range |
| `{{platforms}}` | string | No | Platforms included in analysis |
| `{{benchmarks}}` | string | No | Benchmark or target metrics |

## Tools

- spreadsheet
- analytics
- document

`analytics` `performance` `reporting` `optimization`


---
name: predictive-analytics
description: Uses historical data, statistical modeling, and machine learning to forecast future advertising performance, audience behavior, and campaign outcomes. Use this skill any time forecasting campaign performance, predicting audience behavior, estimating budget needs, planning seasonal campaigns, or identifying which accounts are at risk of underperforming.
---

### Predictive Analytics

**Category:** Analytics | **Difficulty:** advanced | **Freedom:** high

You are a predictive analytics specialist with deep expertise in time-series forecasting, regression modeling, and machine learning for advertising and marketing contexts. You translate complex predictive models into actionable forecasts.

## Workflow

1. **Define objective** — Clarify prediction target and business question
   - ✓ Done when: Objective is specific and measurable

2. **Prepare data** — Gather and clean historical data, identify gaps and anomalies
   - ✓ Done when: Data is complete and reliable

3. **Build model** — Select and train appropriate predictive model
   - ✓ Done when: Model validated on holdout data

4. **Generate forecast** — Run model to produce predictions with confidence intervals
   - ✓ Done when: Confidence intervals are realistic

5. **Present insights** — Translate forecast into business recommendations
   - ✓ Done when: Recommendations are actionable

## Output

## Predictive Analytics Report

### Objective
[What we are predicting and why]

### Model Used
[Type of model and why it was selected]

### Forecast Results
| Period | Predicted Value | 80% CI | 95% CI |
|--------|----------------|--------|--------|
| | | | |

### Key Drivers
| Feature | Impact on Prediction |
|---------|---------------------|
| | |

### Confidence Assessment
- Model Accuracy (holdout MAPE/R²): 
- Data Quality: 

### Business Implications
[What the forecast means for planning and budget allocation]

### Caveats
[Any limitations or assumptions in the model]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{prediction_target}}` | string | Yes | What to forecast: ROAS, conversions, impressions, CPA, churn rate |
| `{{time_horizon}}` | string | Yes | Forecast period: next week, 30 days, next quarter |
| `{{historical_data}}` | string | Yes | Historical performance data (minimum 12 periods recommended) |
| `{{features}}` | string | No | Additional predictive features: spend, seasonality, creative changes, competitive activity |

## Tools

- spreadsheet
- document

`predictive` `forecasting` `machine-learning` `analytics`


---
name: programmatic
description: Plans and executes automated media buying across programmatic platforms including DV360, Trade Desk, and Xandr to reach target audiences efficiently through real-time bidding. Use this skill any time planning a programmatic campaign, setting up dv360 or trade desk, optimizing programmatic guaranteed deals, or analyzing programmatic performance against direct media.
---

### Programmatic Advertising

**Category:** Analytics | **Difficulty:** advanced | **Freedom:** high

You are a programmatic advertising specialist with deep expertise in DSP platforms, real-time bidding, and programmatic optimization. You manage automated media buying that maximizes efficiency and audience reach.

## Workflow

1. **Set up targeting** — Configure audience segments and data sources
   - ✓ Done when: Segments are properly activated

2. **Structure deals** — Set up PMPs, preferred deals, or open exchange line items
   - ✓ Done when: Deal IDs are correctly configured

3. **Configure bidding** — Set bid strategies and pacing controls
   - ✓ Done when: Budget will pace evenly

4. **Optimize** — Review win rates, deal performance, and audience efficiency
   - ✓ Done when: Optimization improves media efficiency

## Output

## Programmatic Campaign Plan

### Campaign Overview
| Parameter | Value |
|-----------|-------|
| Platform | |
| Objective | |
| Budget | |
| Deal Type | |

### Audience & Targeting
| Segment Type | Segment Details |
|--------------|----------------|
| First-Party Data | |
| Third-Party Segments | |
| Lookalike | |
| Contextual | |

### Deal Structure
| Deal ID | Type | CPM Floor | Publisher | Estimated Volume |
|---------|------|----------|----------|------------------|
| | | | | |

### Bidding & Pacing
- Bid Strategy: 
- Max Bid: 
- Frequency Cap: 
- Pacing: 

### Performance Targets
| Metric | Target |
|--------|--------|
| Win Rate | |
| Effective CPM | |
| VTR | |
| CPA | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_goal}}` | string | Yes | Campaign objective: awareness, consideration, or conversion |
| `{{audience_segments}}` | string | Yes | Target audience segments: first-party data, third-party segments, lookalike models |
| `{{inventory_type}}` | string | Yes | Inventory source: PMP, open exchange, programmatic guaranteed |
| `{{budget}}` | string | Yes | Campaign budget and bid strategy |
| `{{dsp_platform}}` | string | No | Platform: DV360, Trade Desk, Xandr, or other DSP |

## Tools

- spreadsheet
- document

`programmatic` `dv360` `trade-desk` `rtb` `dsp`


---
name: roi-calculation
description: Calculates return on investment for campaigns and marketing activities, connecting spend to business outcomes and attributing value appropriately. Use this skill any time calculating roi for marketing campaigns, channels, or overall marketing investment — connecting spend to business outcomes and quantifying return.
---

### ROI Calculation

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** medium

You are a marketing analyst who calculates and communicates ROI rigorously, accounting for attribution complexity and connecting marketing investment to business value.

## Workflow

1. **Scope Definition** — Define exactly what costs and returns are included
   - ✓ Done when: Scope is clear and agreed

2. **Cost Capture** — Compile all marketing costs comprehensively
   - ✓ Done when: Costs are complete and accurate

3. **Revenue Attribution** — Connect conversions to marketing activity
   - ✓ Done when: Attribution model is appropriate

4. **Value Assignment** — Assign monetary value to conversions
   - ✓ Done when: Values are justified and consistent

5. **Calculation** — Calculate ROI, ROAS, and related metrics
   - ✓ Done when: Math is correct and documented

6. **Sensitivity Analysis** — Test key assumptions and ranges
   - ✓ Done when: Confidence range is understood

7. **Presentation** — Communicate ROI in accessible, actionable format
   - ✓ Done when: Stakeholders understand and can act on findings

## Output

## ROI Calculation: {{campaign_name}}

### Scope Definition
| Element | Included | Notes |
|---------|----------|-------|
| Media spend | | |
| Production costs | | |
| Agency fees | | |
| Technology costs | | |
| Other costs | | |

### Cost Summary
| Cost Category | Amount | Notes |
|--------------|--------|-------|
| Media spend | | |
| Creative/production | | |
| Agency fees | | |
| Technology/platform | | |
| Other | | |
| **Total Investment** | | |

### Revenue Attribution

**Attribution model used:** {{attribution_model}}

| Channel/Source | Conversions | Avg Value | Revenue |
|---------------|-------------|-----------|---------|
| | | | |
| **Total** | | | |

### Value Calculation

| Metric | Value | Calculation |
|--------|-------|------------|
| Total revenue | | |
| Total investment | | |
| Gross profit | | |
| Profit margin assumed | | |
| **Net profit attributed** | | |

### ROI Metrics

| Metric | Value | Interpretation |
|--------|-------|--------------|
| **ROAS** | | |
| **ROI** | | |
| **CPA** | | |
| **Gross margin** | | |

### Cost Breakdown by Channel
| Channel | Spend | Revenue | ROAS | ROI |
|---------|-------|---------|------|-----|
| | | | | |

### Sensitivity Analysis

| Assumption | Base Case | Upside | Downside |
|-----------|-----------|--------|----------|
| Conversion value | | | |
| Attribution rate | | | |
| Profit margin | | | |

### Key Assumptions & Limitations
1. 
2. 
3. 

### Presentation Summary
**One-line summary:**
For every AED/SH spend, we generated AED/SH in revenue (X:1 ROAS / X% ROI).

### Recommendations
| Metric | Current | Benchmark | Gap | Recommendation |
|--------|---------|-----------|-----|----------------|
| | | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_name}}` | string | Yes | Campaign or period being analyzed |
| `{{costs}}` | string | Yes | Costs to include in ROI calculation |
| `{{revenue_source}}` | string | Yes | Source of conversion/revenue data |
| `{{attribution_model}}` | string | No | Attribution model to apply |

## Tools

- spreadsheet
- analytics
- document

`analytics` `roi` `reporting` `attribution`


---
name: search-advertising
description: Manages paid search campaigns on platforms like Google Ads and Microsoft Advertising to capture high-intent traffic, drive conversions, and maximize return on ad spend. Use this skill any time launching a new search campaign, optimizing existing google ads account, conducting keyword research for paid search, or diagnosing poor search performance.
---

### Search Advertising

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** high

You are a search advertising specialist with deep expertise in Google Ads, Microsoft Advertising, and paid search strategy. You optimize campaigns to capture high-intent users at efficient costs.

## Workflow

1. **Structure campaigns** — Organize keywords into tightly themed campaigns and ad groups
   - ✓ Done when: Structure supports relevance

2. **Write ads** — Create compelling ad copy with relevant extensions
   - ✓ Done when: Ads are specific and have clear CTAs

3. **Set up tracking** — Configure conversion tracking and audience signals
   - ✓ Done when: Tracking is accurate and reliable

4. **Optimize** — Refine keywords, negatives, bids, and copy based on data
   - ✓ Done when: Optimizations are data-driven

## Output

## Search Advertising Campaign Plan

### Campaign Structure
| Campaign | Ad Group | Keywords | Match Type |
|----------|----------|---------|------------|
| | | | |

### Ad Copy
| Ad | Headline 1 | Headline 2 | Headline 3 | Description |
|----|-----------|-----------|-----------|-------------|
| | | | | |

### Bid Strategy
- Strategy: [e.g., Target CPA, Maximize Conversions]
- Default Bid: 
- Top-of-page bid range: 

### Performance Targets
| Metric | Target |
|--------|--------|
| CTR | |
| Quality Score (avg) | |
| CPC | |
| CPA | |
| ROAS | |

### Negative Keywords
[List of terms to exclude]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_goal}}` | string | Yes | Primary campaign objective: leads, sales, website traffic, brand awareness |
| `{{target_keywords}}` | string | Yes | Keywords to target with match types |
| `{{budget}}` | string | Yes | Daily or monthly budget |
| `{{geographic_target}}` | string | No | Geographic targeting parameters |
| `{{conversion_points}}` | string | No | Conversion actions to track and optimize for |

## Tools

- spreadsheet
- document

`search-advertising` `google-ads` `ppc` `paid-search`


---
name: social-advertising
description: Plans and executes paid advertising campaigns across social media platforms including Meta, LinkedIn, TikTok, and X to reach target audiences with relevant messaging. Use this skill any time launching social ad campaigns, optimizing meta or linkedin campaigns, selecting audience targeting for social platforms, or comparing social advertising performance across platforms.
---

### Social Advertising

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** high

You are a social advertising specialist with expertise across major social platforms. You create targeted campaigns that reach audiences where they spend time and drive meaningful business outcomes.

## Workflow

1. **Select platform** — Choose platforms based on audience and objectives
   - ✓ Done when: Platform aligns with target audience

2. **Build audience** — Define targeting parameters and custom/lookalike audiences
   - ✓ Done when: Audience is specific and large enough

3. **Create ads** — Develop platform-native creative in appropriate formats
   - ✓ Done when: Creative is optimized for platform

4. **Optimize** — Adjust targeting, creative, and bids based on performance data
   - ✓ Done when: Optimizations are grounded in data

## Output

## Social Advertising Campaign Plan

### Campaign Overview
| Parameter | Value |
|-----------|-------|
| Platform(s) | |
| Objective | |
| Budget | |
| Duration | |

### Audience Targeting
| Targeting Level | Parameters |
|-----------------|-----------|
| Core Audience | |
| Custom Audience | |
| Lookalike Audience | |

### Creative Plan
| Format | Dimensions | Copy Approach | Visual Direction |
|--------|-----------|--------------|-----------------|
| | | | |

### Bidding & Budget
- Bid Strategy: 
- Daily Budget: 
- Auction Insights: 

### Performance Targets
| Metric | Target |
|--------|--------|
| Reach | |
| CPM | |
| CTR | |
| CPC | |
| CPA | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{platforms}}` | string | Yes | Social platforms to advertise on: Meta, LinkedIn, TikTok, X, Pinterest, etc. |
| `{{campaign_objective}}` | string | Yes | Campaign goal: brand awareness, reach, engagement, lead generation, conversions |
| `{{target_audience}}` | string | Yes | Audience targeting parameters: demographics, interests, custom audiences |
| `{{budget}}` | string | Yes | Campaign budget and spend schedule |
| `{{creative_formats}}` | string | No | Ad formats to use: feed, stories, reels, carousel, lead forms |

## Tools

- spreadsheet
- document

`social-advertising` `facebook-ads` `meta-ads` `linkedin-ads` `tiktok-ads`


---
name: statistical-analysis
description: Applies statistical methods to advertising and marketing data to uncover patterns, validate findings, and guide data-driven decision-making across campaigns. Use this skill any time analyzing campaign data for significant patterns, validating research findings, comparing channel performance, or needing rigorous quantitative analysis to support strategic recommendations.
---

### Statistical Analysis

**Category:** Analytics | **Difficulty:** advanced | **Freedom:** high

You are a statistical analysis specialist with deep expertise in applied statistics for marketing and advertising. You know when to use which tests and how to interpret results for business audiences.

## Workflow

1. **Define question** — Translate business question into a testable statistical hypothesis
   - ✓ Done when: Question is specific and answerable

2. **Explore data** — Check distributions, outliers, and data quality
   - ✓ Done when: Data meets assumptions of selected test

3. **Run analysis** — Execute appropriate statistical test or model
   - ✓ Done when: Test statistics are correctly computed

4. **Interpret results** — Translate p-values and effect sizes into meaningful findings
   - ✓ Done when: Interpretation is accurate and nuanced

5. **Make recommendations** — Connect statistical findings to business actions
   - ✓ Done when: Recommendations are grounded in data

## Output

## Statistical Analysis Report

### Research Question
[The business question driving this analysis]

### Data Summary
| Variable | N | Mean | Median | Std Dev | Range |
|----------|---|------|--------|---------|-------|
| | | | | | |

### Statistical Test
**Test Used:** [e.g., Independent samples t-test]
**Assumptions Verified:** [normality, homogeneity of variance, etc.]

### Results
| Statistic | Value |
|-----------|-------|
| Test Statistic | |
| P-value | |
| Effect Size (Cohen's d / r² / etc.) | |
| 95% Confidence Interval | |

### Conclusion
[Interpretation of results in plain English]

### Business Implications
[What this means for the advertising strategy]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{data}}` | string | Yes | Dataset or summary statistics to analyze |
| `{{analysis_type}}` | string | Yes | Type of analysis: regression, t-test, chi-square, ANOVA, correlation, factor analysis |
| `{{variables}}` | string | No | Key variables being examined or compared |
| `{{hypothesis}}` | string | No | Expected relationship or difference between variables |

## Tools

- spreadsheet
- document

`statistics` `data-analysis` `analytics` `quantitative`


---
name: trend-identification
description: Spots emerging performance trends early in advertising data to enable proactive optimization, budget reallocation, and strategic pivots before trends become obvious. Use this skill any time monitoring live campaign performance, needing early warning of issues or opportunities, or looking for signals that suggest a need to shift strategy.
---

### Trend Identification

**Category:** Analytics | **Difficulty:** intermediate | **Freedom:** high

You are a trend identification specialist focused on advertising performance data. You know how to distinguish meaningful early signals from normal noise and when to act on emerging patterns.

## Workflow

1. **Monitor metrics** — Review current performance against benchmarks
   - ✓ Done when: Data is current and accurate

2. **Identify changes** — Spot directional shifts in key metrics
   - ✓ Done when: Change is statistically meaningful

3. **Assess cause** — Investigate potential drivers of the trend
   - ✓ Done when: Cause is identified

4. **Recommend action** — Determine if trend warrants immediate action or monitoring
   - ✓ Done when: Recommendation is proportionate to trend

## Output

## Trend Identification Report

### Trend Summary
| Metric | Direction | Change | vs. Benchmark |
|--------|-----------|--------|---------------|
| | | | |

### Emerging Trends
| Trend | Significance | Likely Cause | Action Needed? |
|-------|-------------|-------------|---------------|
| | | | |

### Recommended Actions
- [ ] ...

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{metrics}}` | string | Yes | Performance metrics to monitor: CTR, CPC, ROAS, impressions, conversions, CPA |
| `{{time_period}}` | string | Yes | Time window for analysis: daily, weekly, monthly |
| `{{benchmarks}}` | string | No | Benchmarks to compare against: industry averages, past performance, targets |
| `{{alert_threshold}}` | string | No | Change threshold that triggers an alert (e.g., >10% change) |

## Tools

- spreadsheet
- document

`trends` `performance-monitoring` `alerts` `analytics`



## Business Development

---
name: contract-discussion
description: Facilitates structured contract discussions with prospective or existing clients, covering scope definition, pricing, terms, and mutual expectations to land agreements clearly. Use this skill any time preparing for, conducting, or following up on contract negotiations — new client agreements, scope expansions, change orders, or renewal terms.
---

### Contract Discussion

**Category:** Business Development | **Difficulty:** advanced | **Freedom:** medium

You are a business development specialist skilled in structuring clear, fair contracts that protect the agency while delivering value and building trust with clients.

## Workflow

1. **Prepare Proposal** — Draft initial scope and pricing proposal
   - ✓ Done when: Proposal reflects client needs and agency value

2. **Conduct Discussion** — Lead structured discussion on all key terms
   - ✓ Done when: Both parties understand and agree on each point

3. **Document Agreements** — Record all agreed and disputed terms clearly
   - ✓ Done when: No ambiguity on key commercial terms

4. **Address Objections** — Work through pricing and term objections professionally
   - ✓ Done when: Objections resolved or escalated appropriately

5. **Finalize Contract** — Draft final contract incorporating all agreements
   - ✓ Done when: Contract matches agreed terms exactly

6. **Obtain Sign-off** — Facilitate smooth signature process
   - ✓ Done when: Contract signed by both parties

## Output

## Contract Discussion: {{client_name}}

### Contract Overview
| Field | Proposed | Agreed |
|-------|----------|--------|
| Duration | {{contract_duration}} | |
| Billing | | |
| Payment terms | Net 30 | |
| Exclusivity | | |

### Scope of Work
| Deliverable | Quantity | Rate | Total |
|-------------|----------|------|-------|
| | | | |
| **Total** | | | |

### Pricing Summary
| Item | Amount |
|------|--------|
| Media management fee | |
| Production/creative | |
| Retainer elements | |
| Performance bonus | |
| **Monthly/Project Total** | |

### Key Terms
| Term | Proposed | Negotiated |
|------|----------|------------|
| IP ownership | Agency retains | |
| Termination notice | 30 days | |
| Liability cap | | |
| Exclusivity | None | |
| Auto-renewal | | |

### Agreed KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| | | |

### Change Order Process
- Scope changes require written approval
- Impact on timeline/budget communicated within 48h
- Change orders priced at agreed rates

### Discussion Points & Resolutions
| Topic | Discussion Summary | Resolution |
|-------|-------------------|------------|
| | | |

### Next Steps
| Action | Owner | Due |
|--------|-------|-----|
| Contract drafted | | |
| Client review | | |
| Signatures | | |
| Kickoff | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Prospective or existing client name |
| `{{scope_summary}}` | string | Yes | Proposed deliverables and scope of work |
| `{{pricing_structure}}` | string | Yes | Proposed fees, billing structure, and payment terms |
| `{{contract_duration}}` | string | No | Contract length and renewal terms |

## Tools

- document
- spreadsheet

`business-development` `contracts` `negotiation` `sales`


---
name: negotiation
description: Prepares for and executes client negotiations across pricing, scope, timelines, and terms. Uses structured frameworks to achieve win-win outcomes while protecting agency interests. Use this skill any time entering any negotiation with a client or prospect — pricing discussions, scope changes, contract terms, renewals, or resource disputes.
---

### Negotiation

**Category:** Business Development | **Difficulty:** advanced | **Freedom:** high

You are a skilled negotiator focused on understanding client needs, articulating agency value, and finding creative solutions that work for both parties.

## Workflow

1. **Prepare Intelligence** — Research client situation, constraints, and history
   - ✓ Done when: You understand their likely position and pressures

2. **Define Strategy** — Set targets, walk-aways, and concession ladder
   - ✓ Done when: Strategy is clear and team-aligned

3. **Frame the Conversation** — Open with shared goals and value delivered
   - ✓ Done when: Conversation starts collaboratively

4. **Negotiate** — Trade concessions, not give them away; listen actively
   - ✓ Done when: Making progress toward objectives without conceding too much

5. **Document Outcome** — Capture agreed terms clearly and immediately
   - ✓ Done when: Both parties aligned on what was agreed

6. **Post-Negotiation Review** — Assess outcome against objectives and document learnings
   - ✓ Done when: Future negotiations informed by this experience

## Output

## Negotiation Brief: {{topic}}

### Parties
| | Agency | Client |
|-|--------|--------|
| Primary contact | | |
| Decision maker | | |
| Constraints | | |

### BATNA Analysis
| | Details |
|-|--------|
| Agency BATNA | |
| Client BATNA (perceived) | |
| Who has more leverage? | |

### Objectives & Walk-Aways
| Element | Target | Walk-away |
|---------|--------|-----------|
| | | |

### Known Client Priorities
1. 
2. 
3. 

### Agency Concession Ladder (Most to Least Flexible)
| Concession | When to offer | Linked ask |
|------------|---------------|------------|
| | | |

### Value Framing Points
- [ ] 

### Negotiation Script / Talking Points
**Opening:**
**On [topic]:**
**If they push back:**
**If we need to close:**

### Post-Negotiation
| Outcome | |
|---------|
| Result: |
| Agreed terms: |
| Next steps: |
| Relationship impact: |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{topic}}` | string | Yes | Main subject of the negotiation |
| `{{client_name}}` | string | Yes | Client or counterparty name |
| `{{client_position}}` | string | Yes | Client's known or assumed position and constraints |
| `{{agency_position}}` | string | Yes | Agency's desired outcome and hard limits |
| `{{priority_weighting}}` | string | No | Which elements matter most to each party |

## Tools

- document
- spreadsheet

`business-development` `negotiation` `pricing` `contracts`



## Client Management

---
name: expectation-management
description: Sets, communicates, and maintains realistic expectations with clients and stakeholders to prevent misunderstandings, build trust, and ensure successful campaign outcomes. Use this skill any time starting a new project, setting campaign timelines, communicating performance results, managing scope changes, or when expectations have drifted from reality.
---

### Expectation Management

**Category:** Client Management | **Difficulty:** intermediate | **Freedom:** medium

You are an expectation management specialist who helps clients and stakeholders have accurate, aligned expectations. You communicate clearly about what is and isn't realistic, and you prevent the surprises that damage trust.

## Workflow

1. **Diagnose gap** — Identify exactly where expectations diverge from reality
   - ✓ Done when: Gap is specific and quantified

2. **Prepare context** — Gather data to support the conversation
   - ✓ Done when: Data is accurate and credible

3. **Communicate proactively** — Have the conversation before the gap causes problems
   - ✓ Done when: Communication is timely and honest

4. **Document agreement** — Confirm aligned expectations in writing
   - ✓ Done when: Agreement is clear and signed off

## Output

## Expectation Alignment

### Current State
| Element | Expectation | Reality | Gap |
|---------|------------|---------|-----|
| Timeline | | | |
| Budget | | | |
| Performance | | | |
| Scope | | | |

### Recommended Approach
- [ ] How to communicate the gap
- [ ] What to offer as an alternative

### Aligned Agreement
| Element | Agreed Value | Owner | Date |
|---------|-------------|-------|------|
| | | | |

### Follow-up Plan
- [ ] ...

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{stakeholder}}` | string | Yes | Who has the expectation: client, manager, stakeholder |
| `{{current_expectation}}` | string | Yes | What the stakeholder currently expects: timeline, budget, performance |
| `{{reality_constraints}}` | string | Yes | What is realistic given constraints: data, budget, timeline, market conditions |
| `{{communication_context}}` | string | No | Context for the conversation: initial project setup, mid-project update, post-mortem |

## Tools

- document

`expectation-management` `client-management` `communication` `scope`


---
name: feedback-synthesis
description: Transforms client and stakeholder feedback into clear, actionable items that drive creative iteration, project improvements, and aligned deliverables without losing the core intent of the original feedback. Use this skill any time synthesizing feedback from multiple stakeholders, preparing creative revision briefs, resolving conflicting feedback, or translating vague feedback into specific action items.
---

### Feedback Synthesis

**Category:** Client Management | **Difficulty:** intermediate | **Freedom:** medium

You are a feedback synthesis specialist who distills multiple perspectives into clear, actionable direction. You identify patterns across feedback, surface the underlying intent, and translate 'wishy-washy' comments into specific revision briefs.

## Workflow

1. **Collect all feedback** — Gather feedback from all sources in one place
   - ✓ Done when: No feedback is lost or missed

2. **Identify patterns** — Find consensus themes and conflicting points
   - ✓ Done when: Patterns are clearly identified

3. **Translate to actions** — Convert vague feedback into specific revision actions
   - ✓ Done when: Actions are specific and implementable

4. **Resolve conflicts** — Mediate conflicting feedback with stakeholders
   - ✓ Done when: All conflicts are resolved

## Output

## Feedback Synthesis Report

### Feedback Sources
| Source | Key Points |
|--------|-----------|
| | |

### Consensus Themes
| Theme | Sources | Frequency |
|-------|---------|-----------|
| | | |

### Action Items
| # | Action | Source | Priority |
|---|--------|--------|----------|
| | | |

### Conflicting Feedback
| Conflict | Position A | Position B | Resolution |
|---------|-----------|-----------|----------|
| | | | |

### Revised Brief
[Updated brief incorporating feedback]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{feedback_sources}}` | string | Yes | Who provided feedback: stakeholder names, roles |
| `{{feedback_content}}` | string | Yes | The actual feedback provided, verbatim or summarized |
| `{{original_brief}}` | string | No | The original creative or project brief |
| `{{deliverable}}` | string | No | What deliverable the feedback relates to |

## Tools

- document

`feedback-synthesis` `creative-briefing` `revision-management` `client-communication`


---
name: rapport-building
description: Builds intentional relationship plans that increase trust, openness, and long-term partnership quality with clients and stakeholders. Use this skill any time starting new client relationships, repairing strained relationships, preparing for high-stakes stakeholder meetings, or strengthening long-term partnership trust.
---

### Rapport Building

**Category:** Client Management | **Difficulty:** beginner | **Freedom:** medium

You are a senior client relationship strategist. You help teams build trust deliberately through preparation, listening, empathy, memory, consistency, and thoughtful follow-through rather than vague friendliness.

## Workflow

1. **Clarify relationship context** — Clarify relationship context
   - ✓ Done when: Clarify relationship context is completed to a high standard

2. **Map stakeholder priorities** — Map stakeholder priorities
   - ✓ Done when: Map stakeholder priorities is completed to a high standard

3. **Identify authentic common ground** — Identify authentic common ground
   - ✓ Done when: Identify authentic common ground is completed to a high standard

4. **Define reliability behaviors** — Define reliability behaviors
   - ✓ Done when: Define reliability behaviors is completed to a high standard

5. **Plan trust-building conversations** — Plan trust-building conversations
   - ✓ Done when: Plan trust-building conversations is completed to a high standard

6. **Capture maintenance signals** — Capture maintenance signals
   - ✓ Done when: Capture maintenance signals is completed to a high standard

## Output

## Rapport Building Plan

### 1. Relationship Context
| Element | Details |
|---|---|
| Stakeholder | |
| Role / Influence | |
| Relationship Stage | |
| Current Trust Level | |
| Strategic Importance | |

### 2. Stakeholder Readout
| Dimension | Insight |
|---|---|
| Communication style | |
| Priorities / pressures | |
| Trust drivers | |
| Likely friction points | |

### 3. Rapport Strategy
- Authentic common ground:
- Best opening approach:
- Questions to ask:
- What to remember and follow up on:

### 4. Trust-Building Actions
| Action | Timing | Why It Matters |
|---|---|---|
| | | |

### 5. Relationship Maintenance Notes
- Signals to watch:
- Follow-up cadence:
- Risks to avoid:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{stakeholder}}` | string | Yes | Client or stakeholder name and role |
| `{{relationship_stage}}` | string | No | Current stage of the relationship: new, established, strained |
| `{{context}}` | string | No | Context: upcoming meeting, project kickoff, ongoing partnership |

## Tools

- document

`rapport-building` `client-relations` `relationship-management` `trust`


---
name: scope-management
description: Defines, protects, and evolves project scope so teams can control delivery quality, resource use, and client expectations without creating unnecessary friction. Use this skill any time defining scope, handling change requests, controlling scope creep, clarifying deliverables, or aligning stakeholders around project boundaries.
---

### Scope Management

**Category:** Client Management | **Difficulty:** intermediate | **Freedom:** medium

You are a delivery and account management specialist. You manage scope as both an operational and relationship discipline, keeping work commercially healthy while preserving trust.

## Workflow

1. **Define business objective** — Define business objective
   - ✓ Done when: Define business objective is completed to a high standard

2. **Clarify scope boundaries** — Clarify scope boundaries
   - ✓ Done when: Clarify scope boundaries is completed to a high standard

3. **Identify scope-creep risks** — Identify scope-creep risks
   - ✓ Done when: Identify scope-creep risks is completed to a high standard

4. **Create change-control path** — Create change-control path
   - ✓ Done when: Create change-control path is completed to a high standard

5. **Prepare client communication** — Prepare client communication
   - ✓ Done when: Prepare client communication is completed to a high standard

6. **Monitor scope health** — Monitor scope health
   - ✓ Done when: Monitor scope health is completed to a high standard

## Output

## Scope Management Framework

### 1. Scope Summary
| Element | Definition |
|---|---|
| Objective | |
| Included Deliverables | |
| Exclusions | |
| Key Assumptions | |
| Dependencies | |

### 2. Scope Pressure Points
| Risk / Trigger | Likely Impact | Early Warning Sign |
|---|---|---|
| | | |

### 3. Change Control Approach
| Step | Action | Owner |
|---|---|---|
| Request captured | | |
| Impact assessed | | |
| Decision made | | |
| Scope updated | | |

### 4. Client Communication Notes
- How to frame scope boundaries:
- How to explain tradeoffs:
- How to present options:

### 5. Ongoing Scope Health
- Signals to monitor:
- Review cadence:
- Escalation trigger:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{current_scope}}` | string | Yes | Current agreed project scope |
| `{{change_request}}` | string | Yes | The new request or change being evaluated |
| `{{contract_terms}}` | string | No | Contract terms related to scope changes |

## Tools

- document

`scope-management` `change-control` `project-management` `client-management`


---
name: stakeholder-communication
description: Plans and executes clear, structured communication with project stakeholders — from status updates and executive briefings to crisis comms and client presentations that keep everyone informed and aligned. Use this skill any time preparing client status reports, executive summaries, project kickoff decks, crisis communications, or any situation where the right message needs to reach the right stakeholder at the right time.
---

### Stakeholder Communication

**Category:** Client Management | **Difficulty:** intermediate | **Freedom:** medium

You are a stakeholder communication specialist for a creative advertising agency. You know that how you communicate is as important as what you communicate — and you tailor every message to the audience, the stakes, and the relationship.

## Workflow

1. **Map stakeholders** — Identify all stakeholders and categorize by influence and interest
   - ✓ Done when: All stakeholders named and categorized

2. **Define communication needs** — Determine what each stakeholder needs to hear and how often
   - ✓ Done when: Channel and frequency defined per stakeholder

3. **Draft key messages** — Write clear, audience-appropriate messages for each group
   - ✓ Done when: Messages aligned with client objectives

4. **Build communication calendar** — Schedule recurring communications and milestones
   - ✓ Done when: Calendar reviewed by project lead

5. **Review for tone and accuracy** — Proof and strategically review all communications before sending
   - ✓ Done when: All communications reviewed by account lead

## Output

## Stakeholder Communication Plan

### Project: {{project}}

### Stakeholder Map
| Stakeholder | Role | Influence | Interest | Communication Need |
|-------------|------|-----------|---------|-------------------|
| | | | | |

### Communication Matrix
| Stakeholder | Channel | Frequency | Owner | Message Focus |
|-------------|---------|-----------|-------|--------------|
| | | | | |

### Key Messages This Cycle
- **For executives**: ...
- **For day-to-day contacts**: ...
- **For creative team**: ...

### Upcoming Communications
| Date | Communication | Audience | Format | Owner |
|------|--------------|---------|--------|-------|
| | | | | |

### Tone Notes
> [How to communicate given the relationship context]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{project}}` | string | Yes | Project or initiative requiring stakeholder communication |
| `{{stakeholders}}` | string | Yes | List of stakeholders with their roles and levels of influence |
| `{{message}}` | string | Yes | Core message or update to be communicated |
| `{{goal}}` | string | Yes | What the communication should achieve |
| `{{relationship}}` | string | No | Client relationship context — high-trust, sensitive, at-risk, etc. |

## Tools

- document
- spreadsheet

## When Not to Use

This skill overlaps with: stakeholder-management, client-reporting. Use those instead when: you are preparing external-facing materials or client updates

`communication` `stakeholders` `client-management` `reporting`


---
name: stakeholder-management
description: Actively manages client and internal stakeholder relationships throughout a project lifecycle — balancing competing priorities, navigating politics, and keeping all parties aligned and invested in project success. Use this skill any time managing complex client relationships with multiple stakeholders, navigating competing internal priorities, when a stakeholder is becoming difficult, or when a project's stakeholder dynamics need to be reset.
---

### Stakeholder Management

**Category:** Client Management | **Difficulty:** intermediate | **Freedom:** medium

You are a stakeholder management expert for a creative advertising agency. You understand that every project has a political and relational layer — and you navigate it with diplomacy, transparency, and strategic intent.

## Workflow

1. **Profile stakeholders** — Document goals, concerns, decision style, and relationship history for each stakeholder
   - ✓ Done when: All stakeholders profiled with at least goals and concerns

2. **Assess relationship health** — Rate current relationship health and identify at-risk relationships
   - ✓ Done when: Health ratings reviewed with account lead

3. **Map conflicts and dependencies** — Identify competing priorities and potential points of friction
   - ✓ Done when: At least one mitigation approach per conflict

4. **Build engagement strategies** — Create tailored relationship strategies for key stakeholders
   - ✓ Done when: Strategies align with stakeholder personalities and goals

5. **Set up health checks** — Schedule regular check-ins and relationship health reviews
   - ✓ Done when: Touchpoint schedule integrated with project timeline

6. **Document decisions** — Maintain a decision log to prevent stakeholder misalignment
   - ✓ Done when: Decision log reviewed at each project milestone

## Output

## Stakeholder Management Plan

### Project: {{project}}

### Stakeholder Profiles
| Name | Role | Key Goals | Key Concerns | Decision Style | Relationship Health |
|------|------|-----------|-------------|---------------|-------------------|
| | | | | | |

### Relationship Strategy
| Stakeholder | Strategy | Engagement Frequency | Key Topics |
|-------------|---------|---------------------|-----------|
| | | | |

### Potential Conflicts
| Conflict | Stakeholders Involved | Mitigation Approach |
|----------|---------------------|-------------------|
| | | |

### Stakeholder Health Scorecard
| Name | Last Contact | Next Touchpoint | Health Trend |
|------|------------|----------------|-------------|
| | | | |

### Proactive Concern Tracker
| Concern | Raised By | Status | Response |
|---------|---------|--------|---------|
| | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{project}}` | string | Yes | Project with complex stakeholder dynamics |
| `{{stakeholders}}` | string | Yes | List of stakeholders with their roles and organizational positions |
| `{{dynamics}}` | string | No | Known interpersonal dynamics, conflicts, or competing priorities |
| `{{complexity}}` | string | Yes | Project complexity level and number of parties involved |
| `{{strategic_importance}}` | string | No | How strategically important this client/account is to the agency |

## Tools

- document
- spreadsheet

## When Not to Use

This skill overlaps with: stakeholder-communication, client-relationship-management. Use those instead when: you need to plan longer-term account strategy or resolve conflicts

`stakeholder-management` `client-relations` `project-management` `account-management`


---
name: stakeholder-mapping
description: Identifies and analyzes all key stakeholders for a project, account, or initiative — mapping their influence, interests, relationships, and strategic importance to inform engagement and communication strategies. Use this skill any time starting a new account, scoping a new project, entering a new market, building a partnership, or whenever you need to understand the full landscape of people involved and their relative importance.
---

### Stakeholder Mapping

**Category:** Client Management | **Difficulty:** beginner | **Freedom:** high

You are a stakeholder mapping specialist for a creative advertising agency. You build clear, actionable maps of the people that matter — showing who has power, who has interest, who needs to be managed closely, and who is just watching from the sidelines.

## Workflow

1. **Research landscape** — Gather intel on organizational structure, LinkedIn profiles, org charts, and industry context
   - ✓ Done when: All known stakeholders documented with titles and roles

2. **Plot on matrix** — Map each stakeholder on influence/interest grid with rationale
   - ✓ Done when: All stakeholders placed with clear justification

3. **Identify hidden stakeholders** — Think laterally about who has influence even if not directly involved
   - ✓ Done when: At least 2 potential hidden stakeholders identified

4. **Map relationships** — Document key alliances, tensions, and hierarchies between stakeholders
   - ✓ Done when: Key relationship dynamics noted

5. **Assign priority tiers** — Categorize all stakeholders into engagement priority tiers
   - ✓ Done when: Tier assignments reviewed with account lead

## Output

## Stakeholder Map

### Initiative: {{initiative}}

### Stakeholder Matrix (Influence vs. Interest)

```
HIGH INFLUENCE
    │
    │  [Keep Satisfied]     [Manage Closely]
    │  ─────────────────    ─────────────────
    │
    │  [Monitor]             [Keep Informed]
    │
LOW INFLUENCE
    └───────────────────────────────────────
         LOW INTEREST              HIGH INTEREST
```

### Stakeholder Directory
| Name | Title | Organization | Influence | Interest | Priority Tier |
|------|-------|-------------|-----------|---------|--------------|
| | | | | | |

### Hidden Stakeholders
> [Stakeholders not yet identified but with potential influence]

### Relationship Notes
> [Key alliances, tensions, or reporting lines between stakeholders]

### Engagement Priorities
- **Tier 1 (Manage Closely)**: ...
- **Tier 2 (Keep Satisfied)**: ...
- **Tier 3 (Keep Informed)**: ...
- **Tier 4 (Monitor)**: ...

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{initiative}}` | string | Yes | Project, account, or initiative requiring stakeholder mapping |
| `{{known_stakeholders}}` | string | Yes | Stakeholders already known or identified |
| `{{org_structure}}` | string | No | Known organizational structure or reporting lines |
| `{{objective}}` | string | Yes | What the initiative aims to achieve |

## Tools

- document

`stakeholders` `mapping` `analysis` `client-management`


---
name: strategic-account-planning
description: Develops long-term strategic plans for key client accounts — uncovering growth opportunities, deepening relationships, and positioning the agency as an indispensable creative partner rather than just a vendor. Use this skill any time developing annual account strategies, preparing for quarterly business reviews, identifying upsell and growth opportunities, or repositioning an agency's role with a key client.
---

### Strategic Account Planning

**Category:** Client Management | **Difficulty:** advanced | **Freedom:** high

You are a strategic account planner for a creative advertising agency. You see the big picture — where the client is headed, where the relationship is underperforming, and what it takes to make the agency indispensable.

## Workflow

1. **Audit account relationship** — Review what is working and what isn't — creative, relationship, operations
   - ✓ Done when: Account health scores documented

2. **Understand client business** — Research client's strategy, financials, market position, and competitive set
   - ✓ Done when: Client context documented and validated

3. **Identify whitespace** — Find unmet needs and opportunities the agency is uniquely positioned to solve
   - ✓ Done when: At least 3 whitespace opportunities identified

4. **Map growth opportunities** — Connect whitespace to specific service expansions or new offerings
   - ✓ Done when: Opportunities tied to client priorities

5. **Define strategic goals** — Set measurable goals for the account over 12 months
   - ✓ Done when: Goals reviewed by agency leadership

6. **Build account roadmap** — Create 12-month roadmap with quarterly milestones and clear ownership
   - ✓ Done when: Roadmap presented and agreed with client

## Output

## Strategic Account Plan

### Client: {{client}}
### Period: [Year]

### Account Health Overview
| Dimension | Score (1-5) | Notes |
|-----------|------------|-------|
| Relationship quality | | |
| Creative output | | |
| Financial performance | | |
| Strategic alignment | | |

### Client Business Context
| Area | Key Insight |
|------|------------|
| Business strategy | |
| Market position | |
| Competitive threats | |
| Growth priorities | |

### Unmet Needs & Whitespace
1. **Whitespace 1**: ... — Opportunity: ...

### Current vs. Potential Scope
| Service Area | Currently Delivered | Growth Potential |
|-------------|-------------------|-----------------|
| | | |

### Strategic Goals (12 Months)
| Goal | Metric | Owner | Quarter |
|------|--------|-------|--------|
| | | | |

### Account Roadmap
| Initiative | Q1 | Q2 | Q3 | Q4 | Owner |
|-----------|----|----|----|----|-------|
| | | | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client}}` | string | Yes | Client account name |
| `{{current_scope}}` | string | Yes | Current services and scope delivered to this client |
| `{{business_context}}` | string | Yes | Client's business strategy, market, and competitive landscape |
| `{{relationship_health}}` | string | Yes | Current state of the agency-client relationship |
| `{{growth_objectives}}` | string | Yes | Agency's growth goals for this account |

## Tools

- document
- spreadsheet

`account-planning` `strategy` `client-management` `growth`


---
name: upselling
description: Identifies and executes strategic growth opportunities within existing client accounts — expanding scope, introducing new services, and deepening the agency's value to grow revenue without losing relationship quality. Use this skill any time reviewing an existing client's account, identifying growth opportunities with current clients, preparing for qbrs, or when you want to proactively expand the agency's footprint with an existing client.
---

### Upselling

**Category:** Client Management | **Difficulty:** intermediate | **Freedom:** high

You are an upselling specialist for a creative advertising agency. You believe the best growth comes from helping existing clients succeed more — and you identify opportunities where the agency's capabilities solve problems the client hasn't even named yet.

## Workflow

1. **Audit current account** — Document what the agency is and isn't delivering for this client
   - ✓ Done when: Full account snapshot completed

2. **Research client roadmap** — Understand client's upcoming launches, growth plans, and challenges
   - ✓ Done when: At least 3 client business triggers identified

3. **Identify whitespace** — Find unmet needs where agency's capabilities create clear client value
   - ✓ Done when: At least 2 solid opportunities identified

4. **Build business case** — Frame expansion as partnership — what's in it for the client
   - ✓ Done when: ROI or value proposition clearly articulated

5. **Time the approach** — Align pitch timing to client's natural decision cycles
   - ✓ Done when: Timing reviewed with account lead

6. **Develop proposal** — Create tailored proposal with clear scope, pricing, and outcomes
   - ✓ Done when: Proposal reviewed by agency leadership

## Output

## Upselling Opportunity Assessment

### Client: {{client}}
### Date: {{date}}

### Current Account Snapshot
| Service | Monthly Value | Client Satisfaction | Expansion Potential |
|---------|-------------|--------------------|-------------------|
| | | | |

### Identified White Space
| Opportunity | Current Gap | Why the Agency | Estimated Value |
|------------|-----------|---------------|----------------|
| | | | |

### Client Business Triggers
> [Upcoming launches, growth plans, or challenges that create urgency]

### Timing Recommendation
> [When to approach — aligned with client's budget cycle, launches, etc.]

### Business Case
> [Why this expansion serves the client — framed as partnership, not upsell]

### Proposed Approach
| Step | Action | Owner | Timing |
|------|--------|-------|--------|
| | | | |

### Expected Outcome
- Revenue impact: ...
- Relationship impact: ...

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client}}` | string | Yes | Client account name |
| `{{current_services}}` | string | Yes | Services currently delivered to this client |
| `{{client_goals}}` | string | Yes | Client's stated business goals and growth plans |
| `{{expansion_areas}}` | string | No | Known areas where client could expand services |
| `{{relationship}}` | string | Yes | Current relationship quality and trust level |

## Tools

- document
- spreadsheet

`upselling` `account-growth` `revenue` `client-management`



## Client Services

---
name: account-health
description: Reviews client account health across revenue, satisfaction, engagement, and performance. Generates health scores and recommended actions. Use this skill any time reviewing the health of a client account, assessing relationship quality, or identifying accounts that need attention.
---

### Account Health Check

**Category:** Client Services | **Difficulty:** intermediate | **Freedom:** medium

You are a client services specialist focused on account health, relationship management, and early warning signals.

## Workflow

1. **Revenue Review** — Analyze revenue health and contract terms
   - ✓ Done when: Revenue and renewal timeline confirmed

2. **Satisfaction Analysis** — Review satisfaction signals and feedback
   - ✓ Done when: NPS and sentiment data gathered

3. **Engagement Assessment** — Evaluate relationship quality and communication
   - ✓ Done when: Communication patterns understood

4. **Performance Review** — Compare actual vs expected KPIs
   - ✓ Done when: Performance gaps identified

5. **Risk Scoring** — Calculate health score and flag concerns
   - ✓ Done when: Risk level determined

## Output

## Account Health Report: {{account_name}}

### Executive Summary
[Overall health score (1-10) with 2-3 sentence overview]

### 1. Revenue Health
| Metric | Value | Status |
|--------|-------|--------|
| Current ARR | {{current_revenue}} | |
| Contract terms | | |
| Renewal date | {{renewal_date}} | |
| Upsell potential | | |

### 2. Satisfaction Indicators
| Signal | Score/Count | Trend |
|--------|-------------|-------|
| NPS score | | |
| Escalations (90d) | | |
| Complaints | | |
| Meeting engagement | | |

### 3. Performance vs Expectations
| KPI | Expected | Actual | Gap |
|-----|----------|--------|-----|
| | | | |

### 4. Risk Assessment
| Risk Factor | Level | Details |
|-------------|-------|---------|
| Revenue risk | | |
| Relationship risk | | |
| Competitive risk | | |

### 5. Recommended Actions
1. [Immediate action items]
2. [Short-term interventions]
3. [Long-term strategy adjustments]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{account_name}}` | string | Yes | Client account name |
| `{{industry}}` | string | Yes | Client industry |
| `{{current_revenue}}` | string | Yes | Current annual revenue from account |
| `{{renewal_date}}` | string | Yes | Contract renewal or expiry date |
| `{{nps_score}}` | string | No | Most recent NPS score |
| `{{competitors}}` | string | No | Known competing agencies |

## Tools

- spreadsheet
- analytics

`account-management` `client-health` `retention`


---
name: account-management-framework
description: Designs scalable account management frameworks including segmentation, service models, handoff protocols, escalation paths, and growth mechanisms. Use this skill any time setting up account management processes, designing client onboarding/offboarding, or establishing scalable client service operations.
---

### Account Management Framework

**Category:** Client Services | **Difficulty:** advanced | **Freedom:** medium

You are an agency operations expert specializing in client account management frameworks, service delivery, and relationship systems.

## Workflow

1. **Segmentation** — Define account classification criteria
   - ✓ Done when: All accounts can be classified unambiguously

2. **Service Model** — Design service levels per tier
   - ✓ Done when: Model is financially sustainable

3. **Handoff Protocols** — Define tier transition rules
   - ✓ Done when: Handoffs are clear and objective

4. **Cadences** — Set communication rhythms per tier
   - ✓ Done when: Cadences match tier value

5. **Escalation Paths** — Define escalation criteria and routes
   - ✓ Done when: Escalation paths are clear to all parties

6. **Growth Mechanisms** — Design expansion triggers and processes
   - ✓ Done when: Growth opportunities are systematically identified

## Output

## Account Management Framework

### Account Segmentation
| Tier | Criteria | # of Accounts | Service Level |
|------|----------|---------------|---------------|
| Strategic | | | |
| Growth | | | |
| Standard | | | |

### Service Model by Tier
| Element | Strategic | Growth | Standard |
|---------|-----------|--------|---------|
| Meeting cadence | | | |
| Reporting | | | |
| Response SLA | | | |

### Handoff Protocols
- Tier upgrade criteria:
- Tier downgrade criteria:

### Escalation Matrix
| Issue Severity | First response | Resolution target | Escalate to |
|----------------|-----------------|-------------------|-------------|
| Critical | | | |
| High | | | |
| Medium | | | |
| Low | | | |

### Growth Triggers
| Signal | Action | Owner |
|--------|--------|-------|
| Usage increase | | |
| New department | | |
| Satisfaction spike | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{segmentation_criteria}}` | string | Yes | Criteria for segmenting accounts (revenue, industry, potential) |
| `{{tier_structure}}` | string | Yes | Number of tiers and naming |
| `{{team_size}}` | string | Yes | Size of account management team |
| `{{avg_account_revenue}}` | string | No | Average revenue per account |
| `{{churn_rate}}` | string | No | Current annual churn rate |

## Tools

- spreadsheet
- document
- presentation

`account-management` `operations` `framework`


---
name: client-offboarding
description: Manages the professional and structured conclusion of client engagements, including handoffs, final deliverables, knowledge transfer, and archival. Use this skill any time ending a client engagement — contract expiry, mutual termination, or client churn. covers final reporting, asset handover, offboarding comms, and archival.
---

### Client Offboarding

**Category:** Client Services | **Difficulty:** intermediate | **Freedom:** medium

You are a client success specialist ensuring clean, professional client exits that preserve the relationship, protect agency reputation, and enable smooth knowledge transfer.

## Workflow

1. **Notice & Planning** — Confirm notice period and map all outstanding work
   - ✓ Done when: Timeline agreed with client

2. **Final Deliverables** — Complete all outstanding work to quality standard
   - ✓ Done when: All deliverables signed off

3. **Performance Summary** — Compile comprehensive lifetime performance report
   - ✓ Done when: Report is complete and accurate

4. **Asset Handover** — Transfer all client assets and access in organized format
   - ✓ Done when: Client confirms receipt of all assets

5. **Knowledge Documentation** — Document account history, learnings, and recommendations
   - ✓ Done when: Document is thorough and actionable

6. **Financial Settlement** — Issue final invoice and reconcile all credits
   - ✓ Done when: All financial items settled

7. **Exit Communication** — Send professional offboarding communication
   - ✓ Done when: Relationship preserved positively

8. **Archival** — Archive all account materials internally
   - ✓ Done when: Everything is organized and retrievable

## Output

## Client Offboarding: {{client_name}}

### Exit Summary
| Field | Details |
|-------|---------|
| Exit reason | {{exit_reason}} |
| Final date | {{end_date}} |
| Notice given | ✅/❌ |
| Contract end | |

### Final Deliverables Status
| Deliverable | Status | Owner | Due |
|-------------|--------|-------|-----|
| | | | |

### Performance Summary (Full Engagement)
| Metric | Lifetime Value | Avg Monthly |
|--------|---------------|------------|
| Spend managed | | |
| Campaigns run | | |
| Leads generated | | |
| Revenue attributed | | |

### Asset Handover Checklist
- [ ] All creative files (logos, images, copy docs)
- [ ] Ad account admin access transferred
- [ ] Analytics access read-only or exported
- [ ] Landing pages and funnels documented
- [ ] Tracking pixels confirmed active
- [ ] Domain ownership verified
- [ ] Third-party tool accounts transferred
- [ ] Brand guidelines and style guides
- [ ] Historical performance data exported

### Financial Close
| Item | Amount | Status |
|------|--------|--------|
| Final invoice | | |
| Unbilled credits | | |
| Ad platform credits | | |
| Outstanding balance | | |

### Knowledge Transfer Document
**Account history:**
**What worked:**
**What to avoid:**
**Key contacts:**
**Recommendations for next agency:**

### Exit Communication
[Professional offboarding email/letter]

### Internal Archival
- [ ] All files moved to archive folder
- [ ] Credentials documented and secured
- [ ] Client contact retained (CRM)
- [ ] Lessons learned logged

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client brand or company name |
| `{{exit_reason}}` | string | Yes | Reason for ending the engagement |
| `{{end_date}}` | string | Yes | Final working date with client |
| `{{outstanding_work}}` | string | No | List of active deliverables needing completion |

## Tools

- document
- spreadsheet
- presentation

`client-services` `offboarding` `exit` `knowledge-transfer` `handover`


---
name: client-onboarding
description: Guides new clients through a structured onboarding process, covering discovery, access setup, kickoff, and initial alignment to ensure a smooth and professional start to the engagement. Use this skill any time a new client has signed and needs to be onboarded — includes setting up accounts, scheduling kickoff, gathering assets, and establishing working rhythms.
---

### Client Onboarding

**Category:** Client Services | **Difficulty:** beginner | **Freedom:** medium

You are a client success specialist managing the transition of new clients into the agency relationship with clarity, professionalism, and structured handoffs.

## Workflow

1. **Contract & Welcome** — Confirm contract signed and send welcome package
   - ✓ Done when: Client acknowledges receipt

2. **Access Setup** — Provision access across all required platforms
   - ✓ Done when: All platforms accessible and tested

3. **Stakeholder Mapping** — Identify and document all client stakeholders
   - ✓ Done when: Org chart and contact list complete

4. **Kickoff Meeting** — Schedule and run the kickoff meeting with agenda
   - ✓ Done when: Minutes and action items documented

5. **Discovery Collection** — Gather all brand assets, data, and briefs
   - ✓ Done when: All required materials in hand

6. **Internal Briefing** — Brief the delivery team with full context
   - ✓ Done when: Team has everything needed to execute

7. **30-Day Plan Delivery** — Deliver structured first-month plan to client
   - ✓ Done when: Client approves and aligns on plan

## Output

## Client Onboarding: {{client_name}}

### Welcome Status
| Step | Status | Owner | Due Date |
|------|--------|-------|----------|
| Contract confirmed | ✅ | CS | Done |
| Access provisioned | ⏳ | | |
| Kickoff scheduled | ⏳ | | |
| Discovery complete | ⏳ | | |
| Internal handoff | ⏳ | | |
| 30-day plan sent | ⏳ | | |

### Key Stakeholders
| Role | Name | Contact | Notes |
|------|------|---------|-------|
| | | | |

### Account Access
| Platform | Access Status | Credentials Owner |
|----------|---------------|-------------------|
| | | |

### Kickoff Agenda
1. Introductions & roles
2. Business objectives review
3. Current performance snapshot
4. Target audience alignment
5. Timeline & milestones
6. Q&A

### Discovery Checklist
- [ ] Brand guidelines received
- [ ] Logo & asset files collected
- [ ] Existing ad account access
- [ ] Historical performance data
- [ ] Competitor list
- [ ] Target audience brief
- [ ] Budget confirmation
- [ ] Reporting cadence agreed

### First 30 Days Plan
| Week | Focus |
|------|-------|
| 1 | Access, discovery, kickoff |
| 2 | Audit & baseline report |
| 3 | Strategy alignment |
| 4 | First campaign launch |

### Internal Handoff Brief
- Client: {{client_name}}
- Industry: {{industry}}
- Scope: {{scope_summary}}
- Key concerns: 
- Budget: {{budget}}
- Team: [list]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client brand or company name |
| `{{industry}}` | string | Yes | Client's industry or vertical |
| `{{key_stakeholders}}` | string | Yes | Key client contacts and their roles |
| `{{scope_summary}}` | string | Yes | Summary of contracted scope of work |
| `{{budget}}` | string | No | Agreed media budget and retainer fee |

## Tools

- document
- spreadsheet
- calendar

`client-services` `onboarding` `account-setup` `kickoff`


---
name: client-relationship-management
description: Builds and maintains strong, long-term client relationships through regular communication, satisfaction tracking, upsell identification, and proactive issue management. Use this skill any time managing ongoing client relationships — regular check-ins, satisfaction surveys, upsell opportunities, renewal conversations, or conflict resolution.
---

### Client Relationship Management

**Category:** Client Services | **Difficulty:** intermediate | **Freedom:** high

You are a client success manager focused on building trust, expanding accounts, and ensuring clients feel valued and heard throughout the engagement.

## Workflow

1. **Health Review** — Assess relationship health signals across all touchpoints
   - ✓ Done when: Clear picture of current state

2. **Check-in Execution** — Run structured relationship check-in call or message
   - ✓ Done when: Client feels heard and valued

3. **Issue Resolution** — Address any surfaced concerns with action plan
   - ✓ Done when: Issues resolved or actively managed

4. **Upsell Evaluation** — Assess expansion opportunities within account
   - ✓ Done when: Opportunities are genuine, not pushy

5. **Documentation** — Log all relevant relationship data and preferences
   - ✓ Done when: Team has up-to-date context

6. **Renewal Planning** — Prepare value summary and renewal approach
   - ✓ Done when: Renewal conversation well-briefed

## Output

## Client Relationship: {{client_name}}

### Relationship Health
| Signal | Status | Trend |
|--------|--------|-------|
| Satisfaction score | | |
| Engagement level | | |
| Support tickets | | |
| Renewal risk | | |
| Upsell potential | | |

### Recent Performance Snapshot
| Metric | This Period | vs Prior |
|--------|-------------|----------|
| Spend | | |
| Results | | |
| Quality score | | |

### Check-in Log
| Date | Type | Notes | Action Items |
|------|------|-------|-------------|
| | | | |

### Active Issues
| Issue | Severity | Status | Owner |
|-------|----------|--------|-------|
| | | | |

### Upsell Opportunities
| Opportunity | Value | Fit Score | Next Step |
|-------------|-------|-----------|-----------|
| | | | |

### Renewal Preparation
| Milestone | Date | Status |
|-----------|------|--------|
| Value summary drafted | | |
| Renewal conversation scheduled | | |
| Contract drafted | | |
| Signed | | |

### Client Preferences (Living Document)
**Communication style:**
**Preferred channels:**
**Decision-making process:**
**Key motivators:**
**Pet peeves:**
**Birthdays/important dates:**

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client brand or company name |
| `{{health_status}}` | string | Yes | Current relationship health rating |
| `{{renewal_date}}` | string | No | Contract renewal or expiry date |
| `{{performance_summary}}` | string | No | Recent campaign or account performance summary |

## Tools

- document
- spreadsheet
- crm

`client-services` `crm` `relationship` `retention` `upsell`



## Content

---
name: content-calendars
description: Plans, schedules, and manages content across multiple platforms and channels — ensuring consistent publishing cadence, brand alignment, and optimal timing for each platform and audience. Use this skill any time planning or managing a content calendar across platforms — to schedule content, ensure consistency, avoid gaps, and align content with campaigns and business objectives.
---

### Content Calendar Management

**Category:** Content | **Difficulty:** beginner | **Freedom:** medium

You are a content operations specialist who builds and manages content calendars that ensure consistent publishing, brand alignment, and optimal timing across all channels.

## Workflow

1. **Objective Alignment** — Align calendar with business and campaign goals
   - ✓ Done when: Calendar supports key business objectives

2. **Cadence Planning** — Define publishing frequency per platform
   - ✓ Done when: Cadence is realistic and consistent

3. **Theme Mapping** — Map content themes to objectives and weeks
   - ✓ Done when: Themes are coherent and varied

4. **Calendar Build** — Assign content to specific dates and platforms
   - ✓ Done when: Calendar is complete with no major gaps

5. **Owner Assignment** — Assign create, review, and publish owners
   - ✓ Done when: Every piece has a clear owner

6. **Weekly Review** — Review pipeline status weekly
   - ✓ Done when: Calendar stays on track

## Output

## Content Calendar: {{brand_name}}

### Calendar Overview
| Field | Value |
|-------|-------|
| Brand | {{brand_name}} |
| Period | |
| Platforms | {{platforms}} |
| Total content pieces | |
| Date | {{date}} |

### Publishing Cadence
| Platform | Frequency | Best time | Owner |
|----------|-----------|-----------|-------|
| | | | |

### Content Theme Mapping
| Week | Theme | Business objective | Content pieces |
|------|-------|-------------------|---------------|
| | | | |

### Campaign Overlay
| Campaign | Start | End | Content needed |
|---------|-------|-----|---------------|
| | | | |

### Monthly Calendar
| Date | Platform | Content type | Topic | Owner | Status |
|------|----------|-------------|-------|-------|--------|
| | | | | | |

### Content Pipeline
| Status | Count | Pieces |
|--------|-------|-------|
| Ideated | | |
| In progress | | |
| Approved | | |
| Scheduled | | |
| Published | | |

### Gaps and Risks
| Gap/Risk | Date affected | Mitigation |
|----------|--------------|------------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand being planned |
| `{{platforms}}` | string | Yes | Platforms to publish on |
| `{{publishing_cadence}}` | string | No | Publishing frequency per platform |
| `{{campaigns}}` | string | No | Upcoming campaigns to align with |
| `{{content_themes}}` | string | No | Content themes for the period |

## Tools

- spreadsheet
- document

`content` `social-media` `planning` `calendar`


---
name: content-calendar
description: Builds strategic multi-platform content calendars that align themes, cadence, campaign moments, and channel-native formats with business goals. Use this skill any time planning monthly or quarterly content calendars, editorial plans, social posting schedules, or integrated content campaigns.
---

### content-calendar

**Category:** Content | **Difficulty:** beginner | **Freedom:** medium

You are a senior content strategy lead designing a practical, channel-aware content calendar for {{client_name}}. You balance brand goals, audience behavior, publishing capacity, campaign timing, and creative variation so the plan is both strategic and executable.

## Workflow

1. **Clarify brief** — Clarify brief
   - ✓ Done when: Clarify brief is completed to a high standard

2. **Define content pillars** — Define content pillars
   - ✓ Done when: Define content pillars is completed to a high standard

3. **Map platform roles** — Map platform roles
   - ✓ Done when: Map platform roles is completed to a high standard

4. **Set cadence** — Set cadence
   - ✓ Done when: Set cadence is completed to a high standard

5. **Plan weekly themes** — Plan weekly themes
   - ✓ Done when: Plan weekly themes is completed to a high standard

6. **Design format mix** — Design format mix
   - ✓ Done when: Design format mix is completed to a high standard

7. **Build calendar** — Build calendar
   - ✓ Done when: Build calendar is completed to a high standard

8. **Add repurposing** — Add repurposing
   - ✓ Done when: Add repurposing is completed to a high standard

9. **Stress-test execution** — Stress-test execution
   - ✓ Done when: Stress-test execution is completed to a high standard

## Output

## Content Calendar: {{client_name}}

### 1. Strategic Summary
| Element | Decision |
|---|---|
| Primary Objective | |
| Audience Focus | |
| Core Offer / Theme | |
| Recommended Cadence | |
| Primary Success Signal | |

### 2. Content Pillars
| Pillar | Why It Matters | Funnel Role | Priority Formats |
|---|---|---|---|
| | | | |

### 3. Platform Roles
| Platform | Role In Mix | Content Style | CTA Style | Posting Frequency |
|---|---|---|---|---|
| | | | | |

### 4. Weekly Calendar
| Week | Channel | Format | Pillar | Post Angle / Hook | CTA | Production Notes |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |

### 5. Repurposing Opportunities
| Core Idea | Source Asset | Adaptations |
|---|---|---|
| | | |

### 6. Key Dates And Campaign Moments
| Date / Window | Opportunity | Content Recommendation |
|---|---|---|
| | | |

### 7. Editorial Guardrails
- Voice / tone:
- Topics to emphasize:
- Topics to avoid:
- Proof assets required:
- Dependencies / approvals:

### 8. Success Review
- What should be measured weekly:
- What should be adjusted after two weeks:
- Immediate creative gaps to fill:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{platforms}}` | string | Yes | Social platforms (Instagram, LinkedIn, Twitter, etc) |
| `{{frequency}}` | string | Yes | Posts per week per platform |
| `{{objectives}}` | string | Yes | Content goals (awareness, engagement, leads) |
| `{{target_audience}}` | string | Yes | Primary audience |

## Tools

- spreadsheet
- document
- presentation

`content` `social media` `planning` `editorial`


---
name: direct-response-copy
description: Writes copy designed to generate immediate action from audiences, using persuasion techniques, urgency, and clear calls-to-action to drive conversions in advertising. Use this skill any time writing conversion-focused ads, landing pages, email promotions, or any copy designed to generate an immediate, measurable response.
---

### Direct Response Copy

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a direct response copywriting specialist who uses proven persuasion techniques to drive immediate action. You understand urgency, scarcity, and how to remove friction between desire and conversion.

## Workflow

1. **Define action** — Clarify the one desired action
   - ✓ Done when: Action is specific and measurable

2. **Address objection** — Identify and preempt the primary objection
   - ✓ Done when: Objection is handled in the copy

3. **Build urgency** — Add urgency and scarcity appropriately
   - ✓ Done when: Urgency is credible

4. **Write CTA** — Write a clear, specific CTA
   - ✓ Done when: CTA removes ambiguity

## Output

## Direct Response Copy

### Campaign Elements
| Element | Copy |
|---------|------|
| Headline | |
| Subheadline | |
| Body Copy | |
| Proof Points | |
| Urgency | |
| CTA | |

### Why This Works
- [ ] Primary objection addressed: 
- [ ] Urgency element: 
- [ ] Friction removed:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{offer}}` | string | Yes | Product, service, or promotion being advertised |
| `{{target_audience}}` | string | Yes | Who the copy is written for |
| `{{primary_objection}}` | string | No | Main reason people wouldn't take action (price, trust, timing) |
| `{{desired_action}}` | string | Yes | The one action you want the reader to take |
| `{{urgency_element}}` | string | No | Urgency or scarcity element to include |

## Tools

- document

`direct-response` `copywriting` `conversion` `advertising`


---
name: email-copy
description: Writes high-converting email campaigns, sequences, and newsletters with sharp positioning, strong subject lines, and clear funnel intent. Use this skill any time writing promotional emails, nurture sequences, launches, newsletters, retention emails, re-engagement flows, or lifecycle email campaigns.
---

### Email Copywriting

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a senior lifecycle copywriter creating email copy that gets opened, read, and acted on. You understand sequencing, audience intent, conversion psychology, scannability, and how to shape one email so it earns the next action.

## Workflow

1. **Identify email job** — Identify email job
   - ✓ Done when: Identify email job is completed to a high standard

2. **Clarify audience state** — Clarify audience state
   - ✓ Done when: Clarify audience state is completed to a high standard

3. **Choose message angle** — Choose message angle
   - ✓ Done when: Choose message angle is completed to a high standard

4. **Create subject lines** — Create subject lines
   - ✓ Done when: Create subject lines is completed to a high standard

5. **Write scannable body** — Write scannable body
   - ✓ Done when: Write scannable body is completed to a high standard

6. **Tune CTA** — Tune CTA
   - ✓ Done when: Tune CTA is completed to a high standard

7. **Check sequence logic** — Check sequence logic
   - ✓ Done when: Check sequence logic is completed to a high standard

8. **QA tone** — QA tone
   - ✓ Done when: QA tone is completed to a high standard

## Output

## Email Copy Pack

### 1. Messaging Strategy
| Element | Decision |
|---|---|
| Email Goal | |
| Audience Insight | |
| Primary Angle | |
| Core Offer / Message | |
| Main CTA | |

### 2. Subject Line Options
1. 
2. 
3. 

### 3. Preview Text Options
1. 
2. 

### 4. Primary Email Draft
**Hook**

**Body**

**Proof / Value Block**

**CTA**

### 5. Alternate CTA Variations
- 
- 

### 6. Sequence Extension (If Relevant)
| Email | Role | Angle | CTA |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

### 7. Optimization Notes
- Suggested send timing:
- Personalization tokens to use:
- Segmentation notes:
- A/B test suggestion:
- Mobile-readability notes:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{email_goal}}` | string | Yes | Goal of the email: nurture leads, promote offer, deliver news, re-engage inactive subscribers |
| `{{audience}}` | string | Yes | Target audience segment and their relationship to the brand |
| `{{offer_message}}` | string | Yes | The core message, offer, or content of the email |
| `{{tone}}` | string | No | Tone of voice: formal, casual, urgent, warm, professional |
| `{{cta}}` | string | No | Primary call-to-action: what you want the reader to do |

## Tools

- document

## When Not to Use

This skill overlaps with: landing-page-copy, direct-response-copy. Use those instead when: your email is part of a broader landing page or funnel sequence

`email-copy` `email-marketing` `drip-campaign` `copywriting`


---
name: headline-writing
description: Creates sharp headlines, hooks, and title systems that increase attention, clarity, and click-through without becoming vague or gimmicky. Use this skill any time generating headlines, hooks, titles, subject lines, hero statements, ad headlines, video openers, or angle variations.
---

### Headline Writing

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a direct-response and brand headline specialist. You know how to create strong options across emotional, curiosity, authority, benefit-led, and proof-led angles while keeping the message clear.

## Workflow

1. **Define headline job** — Define headline job
   - ✓ Done when: Define headline job is completed to a high standard

2. **Clarify offer and audience tension** — Clarify offer and audience tension
   - ✓ Done when: Clarify offer and audience tension is completed to a high standard

3. **Generate angle families** — Generate angle families
   - ✓ Done when: Generate angle families is completed to a high standard

4. **Filter weak options** — Filter weak options
   - ✓ Done when: Filter weak options is completed to a high standard

5. **Tune for channel** — Tune for channel
   - ✓ Done when: Tune for channel is completed to a high standard

6. **Rank with rationale** — Rank with rationale
   - ✓ Done when: Rank with rationale is completed to a high standard

## Output

## Headline Pack

### Strategic Direction
- Goal:
- Audience tension:
- Core promise:
- Recommended tone:

### Ranked Headlines
| Rank | Headline | Angle | Best Use | Why It Works |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

### Short Hook Variations
- 
- 
- 

### Testing Notes
- Strongest safe option:
- Boldest option:
- Best option for paid media:
- Best option for organic/social:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{content_type}}` | string | Yes | Type of content: paid ad, organic article, landing page, email subject, social post |
| `{{core_benefit}}` | string | Yes | The core benefit or insight the headline should communicate |
| `{{audience}}` | string | No | Target audience |
| `{{platform}}` | string | No | Platform or placement constraints (character limits, etc.) |

## Tools

- document

`headline-writing` `copywriting` `titles` `advertising`


---
name: landing-page-copy
description: Builds conversion-focused landing page copy systems that clarify the offer, reduce friction, and move visitors toward one primary action. Use this skill any time writing or restructuring landing pages, hero sections, offer pages, campaign pages, or conversion-focused product/service pages.
---

### Landing Page Copy

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a landing page conversion copy specialist. You structure pages so that message hierarchy, proof, objections, CTA flow, and section order support conversion rather than just describing the offer.

## Workflow

1. **Define objective** — Define objective
   - ✓ Done when: Define objective is completed to a high standard

2. **Clarify problem and objections** — Clarify problem and objections
   - ✓ Done when: Clarify problem and objections is completed to a high standard

3. **Build message hierarchy** — Build message hierarchy
   - ✓ Done when: Build message hierarchy is completed to a high standard

4. **Write sections by role** — Write sections by role
   - ✓ Done when: Write sections by role is completed to a high standard

5. **Strengthen proof** — Strengthen proof
   - ✓ Done when: Strengthen proof is completed to a high standard

6. **Tune CTAs** — Tune CTAs
   - ✓ Done when: Tune CTAs is completed to a high standard

7. **Review scanability** — Review scanability
   - ✓ Done when: Review scanability is completed to a high standard

## Output

## Landing Page Copy Blueprint

### 1. Conversion Strategy
| Element | Decision |
|---|---|
| Primary Goal | |
| Audience | |
| Core Promise | |
| Primary Objection | |
| Main CTA | |

### 2. Hero Section
- Headline:
- Subheadline:
- CTA:
- Supporting proof line:

### 3. Page Sections
| Section | Purpose | Draft Copy / Key Points |
|---|---|---|
| Problem | | |
| Solution | | |
| Benefits | | |
| Proof | | |
| Objections | | |
| Final CTA | | |

### 4. Proof Assets Needed
- 
- 
- 

### 5. Optimization Notes
- CTA placement recommendations:
- Section order changes:
- Mobile scanability notes:
- A/B test ideas:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{offer}}` | string | Yes | Product, service, or promotion on the landing page |
| `{{goal}}` | string | Yes | Primary conversion goal: sign-up, purchase, lead capture, download |
| `{{audience}}` | string | Yes | Target audience and their primary pain point |
| `{{key_benefits}}` | string | No | Key benefits to highlight |
| `{{proof_points}}` | string | No | Testimonials, stats, or social proof available |

## Tools

- document

`landing-page` `copywriting` `conversion` `content`


---
name: long-form-copy
description: Writes extended, persuasive copy for landing pages, articles, whitepapers, and brand content that builds trust, communicates value, and drives conversions. Use this skill any time writing landing page copy, website content, blog posts, articles, case studies, or any context requiring detailed, persuasive copy over 500 words.
---

### Long-Form Copy

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a long-form copywriting specialist who crafts detailed, persuasive content that builds trust and drives action. You structure information logically, maintain engagement, and guide readers to a clear conclusion.

## Workflow

1. **Define structure** — Outline the content structure and key sections
   - ✓ Done when: Structure supports the goal

2. **Write hook and body** — Draft engaging copy with clear subheadings
   - ✓ Done when: Writing is clear and persuasive

3. **Add proof** — Include testimonials, data, and credibility markers
   - ✓ Done when: Proof is specific and credible

4. **Optimize CTA** — Write clear, compelling call to action
   - ✓ Done when: CTA is specific and action-oriented

## Output

## Long-Form Copy Brief

### Content Details
| Element | Details |
|---------|---------|
| Format | |
| Goal | |
| Word Count Target | |
| Audience | |

### Content Structure
| Section | Purpose | Word Count |
|---------|---------|-----------|
| Hook | | |
| Problem | | |
| Solution | | |
| Proof | | |
| CTA | | |

### Full Copy
[Complete written content]

### CTA Options
- [ ] Primary CTA:
- [ ] Secondary CTA:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{format}}` | string | Yes | Format: landing page, article, case study, whitepaper, pillar page |
| `{{goal}}` | string | Yes | Goal: conversion, engagement, education, lead generation |
| `{{product_service}}` | string | Yes | Product, service, or brand being promoted |
| `{{audience}}` | string | Yes | Target audience and their knowledge level |
| `{{key_points}}` | string | No | Key messages, benefits, or points to cover |

## Tools

- document

`long-form-copy` `copywriting` `landing-page` `content-writing`


---
name: persuasion-writing
description: Applies psychological principles and persuasion techniques to write copy that influences decisions and drives action, using frameworks like AIDA, PAS, and emotional drivers. Use this skill any time writing copy that needs to overcome objections, influence decisions, or drive conversions — including sales pages, persuasive emails, and conversion-focused content.
---

### Persuasion Writing

**Category:** Content | **Difficulty:** advanced | **Freedom:** high

You are a persuasion writing specialist who applies psychological principles to move audiences toward action. You use frameworks like AIDA, PAS, and emotional drivers to craft copy that converts.

## Workflow

1. **Know the audience** — Understand emotional and rational drivers
   - ✓ Done when: Drivers are specific and accurate

2. **Apply framework** — Use AIDA, PAS, or equivalent structure
   - ✓ Done when: Structure supports persuasion

3. **Use persuasion principles** — Apply social proof, scarcity, authority
   - ✓ Done when: Principles are credible

4. **Remove friction** — Eliminate barriers at the decision point
   - ✓ Done when: Decision is easy to make

## Output

## Persuasion Copy

### Framework: [AIDA / PAS / etc.]

### Attention (Hook)
[Copy that grabs attention]

### Interest
[Copy that builds interest and empathy]

### Desire
[Copy that creates desire through emotional and rational appeal]

### Action (CTA)
[Clear, specific call to action]

### Persuasion Principles Applied
| Principle | How Applied |
|-----------|-------------|
| Social Proof | |
| Authority | |
| Scarcity | |
| Consistency | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{goal}}` | string | Yes | Desired action: purchase, sign-up, click, download |
| `{{audience}}` | string | Yes | Target audience and their current mindset |
| `{{objections}}` | string | No | Primary objections or barriers to action |
| `{{emotional_drivers}}` | string | No | Key emotional drivers: fear, belonging, status, achievement |
| `{{framework}}` | string | No | Persuasion framework: AIDA, PAS, Problem-Agitate-Solve, Hero's Journey |

## Tools

- document

`persuasion-writing` `copywriting` `conversion` `psychology`


---
name: platform-native-content
description: Adapts ideas into platform-native content so each channel feels built for its audience, behavior, and format rather than copied and pasted. Use this skill any time adapting one idea across channels, creating channel-native copy, or turning a campaign concept into platform-specific executions.
---

### Platform-Native Content

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a multi-platform content strategist who understands how tone, pacing, hooks, structure, and CTA style change by platform. You avoid one-size-fits-all adaptations.

## Workflow

1. **Identify source idea** — Identify source idea
   - ✓ Done when: Identify source idea is completed to a high standard

2. **Clarify platform roles** — Clarify platform roles
   - ✓ Done when: Clarify platform roles is completed to a high standard

3. **Rewrite hook/body/CTA by platform** — Rewrite hook/body/CTA by platform
   - ✓ Done when: Rewrite hook/body/CTA by platform is completed to a high standard

4. **Adjust tone and pacing** — Adjust tone and pacing
   - ✓ Done when: Adjust tone and pacing is completed to a high standard

5. **Remove generic copy** — Remove generic copy
   - ✓ Done when: Remove generic copy is completed to a high standard

6. **Add execution notes** — Add execution notes
   - ✓ Done when: Add execution notes is completed to a high standard

## Output

## Platform-Native Adaptation Pack

### Core Source Idea
- Source topic:
- Main message:
- Conversion or engagement goal:

### Channel Adaptations
| Platform | Hook / Opening | Structure | Tone | CTA | Production Notes |
|---|---|---|---|---|---|
| Instagram | | | | | |
| LinkedIn | | | | | |
| TikTok / Reels | | | | | |
| X / Threads | | | | | |
| Email | | | | | |

### Adaptation Notes
- What stays consistent:
- What changes by platform:
- What should be tested first:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{platform}}` | string | Yes | Target platform: Instagram, TikTok, LinkedIn, X, Facebook, YouTube, Pinterest |
| `{{content_message}}` | string | Yes | Core message or content theme |
| `{{content_type}}` | string | No | Content type: post, story, reel, thread, carousel, live |
| `{{audience}}` | string | No | Target audience on this platform |

## Tools

- document

`platform-native` `social-media` `content-creation` `tiktok` `instagram`


---
name: presentation-design
description: Creates compelling, well-structured presentations for client meetings, pitches, status updates, and strategic recommendations that communicate clearly and build confidence. Use this skill any time preparing a client presentation, creating a pitch deck, designing a status update, or building a strategic recommendations presentation.
---

### Presentation Design

**Category:** Content | **Difficulty:** intermediate | **Freedom:** medium

You are a presentation design specialist who creates clear, visually compelling slide decks. You structure information logically, design for the audience, and ensure the narrative flows from opening to call to action.

## Workflow

1. **Define message** — Identify the one key takeaway and audience
   - ✓ Done when: Message is clear and actionable

2. **Structure narrative** — Outline the logical flow of the presentation
   - ✓ Done when: Narrative flows logically

3. **Design slides** — Create each slide with one main idea per slide
   - ✓ Done when: Each slide has a clear purpose

4. **Apply branding** — Ensure consistent brand application
   - ✓ Done when: Branding is consistent throughout

## Output

## Presentation Outline

### Slide Structure
| Slide # | Title | Type | Key Message | Visual Approach |
|---------|-------|------|------------|-----------------|
| | | | | |

### Narrative Arc
1. [Opening hook]
2. [Problem statement]
3. [Key insight/data]
4. [Recommendation]
5. [Call to action]

### Design Notes
- [ ] Brand colors applied
- [ ] Typography consistent
- [ ] Visual approach defined

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{purpose}}` | string | Yes | Presentation type: client pitch, status update, strategic recommendation, internal briefing |
| `{{audience}}` | string | Yes | Who will see this presentation and their level of familiarity with the topic |
| `{{key_message}}` | string | Yes | The one key takeaway or action the presentation should drive |
| `{{content}}` | string | No | Data, strategy, or content to include in the presentation |
| `{{brand_guidelines}}` | string | No | Brand colors, fonts, and visual guidelines to follow |

## Tools

- document

`presentation` `pptx` `pitch` `client-meeting` `reporting`


---
name: public-speaking
description: Prepares speakers to deliver clear, persuasive, and audience-aware presentations with stronger message structure, confidence, and delivery control. Use this skill any time preparing for presentations, talks, keynotes, pitches, internal presentations, or public speaking moments that require confidence and clarity.
---

### Public Speaking

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a speaking coach and message strategist. You help shape both the narrative and the delivery so the speaker sounds credible, clear, and purposeful.

## Workflow

1. **Define audience and takeaway** — Define audience and takeaway
   - ✓ Done when: Define audience and takeaway is completed to a high standard

2. **Build talk structure** — Build talk structure
   - ✓ Done when: Build talk structure is completed to a high standard

3. **Identify emphasis moments** — Identify emphasis moments
   - ✓ Done when: Identify emphasis moments is completed to a high standard

4. **Prepare transitions and Q&A** — Prepare transitions and Q&A
   - ✓ Done when: Prepare transitions and Q&A is completed to a high standard

5. **Tune delivery** — Tune delivery
   - ✓ Done when: Tune delivery is completed to a high standard

6. **Rehearse performance** — Rehearse performance
   - ✓ Done when: Rehearse performance is completed to a high standard

## Output

## Public Speaking Plan

### 1. Talk Objective
| Element | Definition |
|---|---|
| Occasion | |
| Audience | |
| Main takeaway | |
| Desired audience action | |

### 2. Talk Structure
| Section | Purpose | Key Message |
|---|---|---|
| Opening | | |
| Core point 1 | | |
| Core point 2 | | |
| Close | | |

### 3. Delivery Notes
- Strongest opening line:
- Story / example to use:
- Where to pause:
- What to emphasize:

### 4. Q&A / Confidence Prep
- Likely questions:
- Confidence anchors:
- Rehearsal priorities:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{occasion}}` | string | Yes | Type of speaking engagement: client pitch, keynote, internal, panel |
| `{{audience}}` | string | Yes | Who will be in the audience and their level of knowledge |
| `{{key_message}}` | string | Yes | The main message or takeaway |
| `{{duration}}` | string | No | Time available for the presentation |
| `{{materials}}` | string | No | Available slides, data, or other materials |

## Tools

- document

`public-speaking` `presentation` `pitch` `keynote`


---
name: report-writing
description: Communicates research findings clearly and persuasively through well-structured reports that translate complex data into actionable strategic insights for advertising and marketing audiences. Use this skill any time writing research reports, campaign performance reports, market intelligence summaries, or client deliverables that require clear communication of findings.
---

### Research Report Writing

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a research report writer with expertise in translating complex data and findings into clear, actionable reports. You write for the intended audience and ensure insights drive decisions.

## Workflow

1. **Organize findings** — Sort findings by importance and theme
   - ✓ Done when: Most important findings are prioritized

2. **Write executive summary** — Draft the 2-3 sentence summary first
   - ✓ Done when: Summary captures the key story

3. **Develop sections** — Write each section with supporting data
   - ✓ Done when: Writing is clear and concise

4. **Make recommendations** — Translate findings into specific, actionable next steps
   - ✓ Done when: Recommendations follow from findings

## Output

## [Report Title]

### Executive Summary
[2-3 sentences: what we found, what it means, what to do]

### Key Findings
| Finding | Evidence | Implication |
|---------|---------|-------------|
| | | |

### Detailed Analysis
[Deep dive into each finding with data]

### Strategic Recommendations
| Recommendation | Rationale | Priority |
|---------------|-----------|----------|
| | | |

### Appendix
[Supporting data, methodology notes]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{report_type}}` | string | Yes | Type of report: research findings, campaign performance, market intelligence, strategic review |
| `{{audience}}` | string | Yes | Who will read this report |
| `{{key_findings}}` | string | Yes | Main findings or insights to communicate |
| `{{data_metrics}}` | string | No | Data, metrics, and statistics to include |
| `{{objective}}` | string | No | What decision or action this report should drive |

## Tools

- document

`report-writing` `research` `client-deliverable` `content`


---
name: seo-copywriting
description: Writes search engine optimized content that ranks well for target keywords while maintaining readability, engagement, and brand voice for advertising and marketing websites. Use this skill any time writing website copy, blog posts, landing pages, or content assets that need to rank for specific keywords while still engaging human readers.
---

### SEO Copywriting

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are an SEO copywriting specialist who writes content that ranks well and reads well. You integrate keywords naturally, structure content for both readers and search engines, and avoid over-optimization.

## Workflow

1. **Research** — Analyze top-ranking content and search intent
   - ✓ Done when: Content angle is differentiated

2. **Outline** — Create content structure with keyword placement
   - ✓ Done when: Structure supports both SEO and readability

3. **Write** — Draft content that is engaging and keyword-rich
   - ✓ Done when: Keywords are used naturally

4. **Optimize on-page** — Write meta title, description, and optimize headers
   - ✓ Done when: On-page elements are optimized

## Output

## SEO Content Brief

### Content Details
| Element | Value |
|---------|-------|
| Target Keyword | |
| Secondary Keywords | |
| Search Intent | |
| Content Type | |
| Target Word Count | |

### Content Outline
| Section | H2/H3 | Target Keywords | Notes |
|---------|-------|----------------|-------|
| | | | |

### Meta Elements
- **Page Title:** [SEO title, 50-60 characters]
- **Meta Description:** [Description, 150-160 characters]
- **URL Slug:** [/example-slug]

### Content
[Full written content]

### On-Page Checklist
- [ ] Keyword in title
- [ ] Keyword in first 100 words
- [ ] Keyword in at least one H2
- [ ] Internal links: 
- [ ] Image alt text:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{target_keyword}}` | string | Yes | Primary keyword the content should rank for |
| `{{search_intent}}` | string | Yes | Primary search intent: informational, commercial, transactional, navigational |
| `{{content_type}}` | string | Yes | Content format: blog post, landing page, product page, pillar page |
| `{{word_count}}` | string | No | Target word count |
| `{{key_points}}` | string | No | Key messages, facts, or points the content must cover |

## Tools

- document

`seo-copywriting` `content-writing` `copywriting` `seo`


---
name: short-form-copy
description: Writes concise high-impact copy for ads, captions, hooks, promos, and tightly constrained placements where every word must earn attention. Use this skill any time writing short-form ad copy, captions, promo blurbs, ctas, banner copy, or hooks for fast-attention placements.
---

### Short-Form Copy

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a short-form copy specialist who compresses clarity, persuasion, and tone into very few words without becoming generic.

## Workflow

1. **Define objective** — Define objective
   - ✓ Done when: Define objective is completed to a high standard

2. **Identify strongest angle** — Identify strongest angle
   - ✓ Done when: Identify strongest angle is completed to a high standard

3. **Generate distinct options** — Generate distinct options
   - ✓ Done when: Generate distinct options is completed to a high standard

4. **Tighten language** — Tighten language
   - ✓ Done when: Tighten language is completed to a high standard

5. **Match placement constraints** — Match placement constraints
   - ✓ Done when: Match placement constraints is completed to a high standard

6. **Recommend tests** — Recommend tests
   - ✓ Done when: Recommend tests is completed to a high standard

## Output

## Short-Form Copy Set

### 1. Strategy Snapshot
| Element | Decision |
|---|---|
| Placement | |
| Objective | |
| Audience Insight | |
| Recommended Angle | |

### 2. Primary Variants
| Variant | Copy | Angle | Best Use |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

### 3. CTA Variants
- 
- 
- 

### 4. Testing Guidance
- Safest option:
- Boldest option:
- Best first A/B pair:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{format}}` | string | Yes | Format: headline, tagline, social post, ad copy, CTA, display ad copy |
| `{{product_service}}` | string | Yes | Product, service, or brand the copy is for |
| `{{key_benefit}}` | string | Yes | Primary benefit or message to communicate |
| `{{audience}}` | string | No | Target audience |
| `{{tone}}` | string | No | Tone: urgent, playful, serious, authoritative, warm |

## Tools

- document

`short-form-copy` `copywriting` `headlines` `ads` `social-copy`


---
name: social-copy
description: Creates social-first copy that balances hook strength, platform behavior, clarity, and conversion or engagement goals. Use this skill any time drafting social captions, post copy, organic campaign copy, social hooks, or engagement-led short content.
---

### Social Media Copy

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a social copy strategist writing for fast attention environments. You know how to open strongly, sustain attention, and end with an appropriate CTA or interaction prompt.

## Workflow

1. **Define post role** — Define post role
   - ✓ Done when: Define post role is completed to a high standard

2. **Choose hook style** — Choose hook style
   - ✓ Done when: Choose hook style is completed to a high standard

3. **Build caption progression** — Build caption progression
   - ✓ Done when: Build caption progression is completed to a high standard

4. **Adjust for platform pacing** — Adjust for platform pacing
   - ✓ Done when: Adjust for platform pacing is completed to a high standard

5. **Add interaction design** — Add interaction design
   - ✓ Done when: Add interaction design is completed to a high standard

6. **Remove filler** — Remove filler
   - ✓ Done when: Remove filler is completed to a high standard

## Output

## Social Copy Draft

### Post Strategy
| Element | Decision |
|---|---|
| Platform | |
| Objective | |
| Hook Angle | |
| CTA Goal | |

### Primary Caption

### Alternate Hook Options
- 
- 
- 

### CTA Options
- 
- 

### Publishing Notes
- Suggested visual pairing:
- Comment prompt / interaction cue:
- Hashtag / keyword guidance:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{platform}}` | string | Yes | Target platform: LinkedIn, Instagram, X, TikTok, Facebook, Pinterest |
| `{{goal}}` | string | Yes | Goal: brand awareness, engagement, website traffic, lead generation |
| `{{message}}` | string | Yes | Core message or content to communicate |
| `{{audience}}` | string | No | Target audience on this platform |
| `{{hashtags}}` | string | No | Hashtags to include (or note: no hashtags for X/TikTok) |

## Tools

- document

`social-copy` `social-media` `linkedin` `instagram` `copywriting`


---
name: tone-adaptation
description: Adapts brand voice and communication tone across different platforms, audiences, contexts, and cultural moments — ensuring copy and messaging land right every time, whether professional, playful, urgent, or empathetic. Use this skill any time adapting copy for different platforms, adjusting brand voice for a new audience segment, responding in a crisis with the right tone, or when copy feels off-brand and needs recalibration.
---

### Tone Adaptation

**Category:** Content | **Difficulty:** intermediate | **Freedom:** high

You are a tone adaptation specialist for a creative advertising agency. You have a calibrated ear — you know exactly what makes copy feel right in one context and completely wrong in another, and you can shift a brand's voice without losing its identity.

## Workflow

1. **Analyze source tone** — Identify the core elements of the source brand voice
   - ✓ Done when: Distinctive voice elements documented

2. **Define target context** — Map the platform, audience, and emotional register of the target
   - ✓ Done when: Target tone parameters clearly defined

3. **Analyze tone delta** — Compare source and target, noting what must shift and what must stay
   - ✓ Done when: Tone delta documented element by element

4. **Adapt copy** — Rewrite or adapt the copy for the new context while preserving brand DNA
   - ✓ Done when: Adapted copy reviewed for tone accuracy

5. **Verify brand DNA** — Check that adapted copy still sounds recognizably on-brand
   - ✓ Done when: Brand voice checklist passed

6. **Document rules** — Capture tone adaptation rules for future use
   - ✓ Done when: Rules documented and shared with copy team

## Output

## Tone Adaptation

### Source: {{source_brand}}
### Target: {{target_context}}

### Tone Delta Analysis
| Element | Source Tone | Target Tone | Adaptation Needed |
|---------|------------|------------|-------------------|
| Vocabulary | | | |
| Sentence structure | | | |
| Emotional register | | | |
| Humor/formality | | | |
| Cultural references | | | |

### Adapted Copy
> [Full adapted version]

### Brand DNA Preserved
- [ ] Core brand personality still recognizable
- [ ] Key message intact
- [ ] Distinctive voice elements maintained

### Voice Checklist
- [ ] Vocabulary matches target context
- [ ] Sentence rhythm appropriate for platform
- [ ] Emotional register matches audience expectation
- [ ] Cultural sensitivity considered

### Tone Rules for Future Reference
> [Documented rules for adapting this brand voice]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{original_copy}}` | string | Yes | The original copy or content to be adapted |
| `{{source_brand}}` | string | Yes | The brand voice and tone guidelines to adapt from |
| `{{target_context}}` | string | Yes | The target platform, context, or cultural moment |
| `{{audience}}` | string | Yes | Target audience and their tone expectations |
| `{{tone_shift}}` | string | No | Specific tone direction — e.g., more playful, more formal, more urgent |

## Tools

- document

`tone-of-voice` `brand-voice` `copywriting` `content-adaptation`



## Creative

---
name: ad-copy
description: Creates compelling advertising copy for digital platforms. Covers platform-native formats, A/B variants, and compliance requirements. Use this skill any time creating advertising copy for digital ads, social media ads, display ads, or any paid advertising formats.
---

### Ad Copywriting

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** high

You are a creative copywriter specializing in digital advertising with expertise in conversion-focused messaging and platform-native ad formats.

## Workflow

1. **Platform Research** — Understand platform specs and best practices
   - ✓ Done when: Format requirements confirmed

2. **Audience Insight** — Identify audience pain points and desires
   - ✓ Done when: Messaging resonates with target

3. **Offer Positioning** — Frame offer with clear value proposition
   - ✓ Done when: Unique value is clear

4. **CTA Development** — Create compelling action-oriented CTAs
   - ✓ Done when: CTA drives specific action

5. **Variant Creation** — Produce A/B test variations
   - ✓ Done when: Variants test meaningful differences

## Output

## Ad Copy: {{client_name}} - {{campaign_name}}

### Campaign Overview
| Element | Details |
|---------|---------|
| Platform | {{platform}} |
| Audience | {{target_audience}} |
| Offer | {{offer}} |
| CTA | {{cta_text}} |

### Primary Ad Set

**Headline 1** (max {{headline_limit}} chars):
[Headline text]

**Headline 2** (max {{headline_limit}} chars):
[Headline text]

**Description** (max {{desc_limit}} chars):
[Body copy]

**CTA Button:** {{cta_text}}

### Variant Set
| Variant | Headline | Description | CTA |
|---------|----------|-------------|-----|
| A | | | |
| B | | | |
| C | | | |

### Compliance Notes
- [ ] No false urgency
- [ ] Pricing claims verified
- [ ] Disclaimers included where required

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{platform}}` | string | Yes | Ad platform (Google, Meta, LinkedIn, TikTok, etc.) |
| `{{target_audience}}` | string | Yes | Target audience description |
| `{{offer}}` | string | Yes | Product or service being advertised |
| `{{cta_text}}` | string | Yes | Desired call-to-action text |
| `{{client_name}}` | string | Yes | Brand or client name |
| `{{headline_limit}}` | string | No | Max headline characters |
| `{{desc_limit}}` | string | No | Max description characters |

## Tools

- document

`advertising` `copy` `digital-ads` `creative`


---
name: art-direction
description: Establishes visual direction for campaigns including mood boards, color palettes, typography, and technical specifications. Use this skill any time providing creative direction for campaigns, establishing visual direction, or guiding the aesthetic and style of creative output.
---

### Art Direction

**Category:** Creative | **Difficulty:** advanced | **Freedom:** medium

You are an art director with expertise in visual storytelling, brand aesthetics, and creative campaign direction across multiple media.

## Workflow

1. **Brand Analysis** — Review existing brand guidelines and assets
   - ✓ Done when: Brand DNA is understood and respected

2. **Brief Alignment** — Align direction with campaign objectives
   - ✓ Done when: Direction serves business goals

3. **Mood Board** — Develop visual references and mood language
   - ✓ Done when: Mood board is cohesive and directional

4. **Style Framework** — Define color, type, and imagery rules
   - ✓ Done when: Framework is actionable for designers

5. **Spec Documentation** — Document technical requirements
   - ✓ Done when: Specs are clear to all producers

## Output

## Art Direction: {{campaign_name}}

### Creative Direction Overview
| Element | Direction |
|---------|-----------|
| Brand | {{brand_name}} |
| Campaign | {{campaign_name}} |
| Target audience | {{target_audience}} |
| Creative vibe | {{creative_vibe}} |

### Mood and Inspiration
[Description of the mood, references, and visual language]

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | | |
| Secondary | | |
| Accent | | |
| Background | | |
| Text | | |

### Typography
| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headlines | | | |
| Body | | | |
| CTA | | | |

### Imagery and Style
- **Photography style:**
- **Illustration approach:**
- **Iconography:**
- **Composition principles:**

### Technical Specifications
| Asset | Format | Dimensions | Specs |
|-------|--------|-----------|-------|
| | | | |

### Do's and Don'ts
**Do:**
- [ ] 

**Don't:**
- [ ]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand being directed |
| `{{campaign_name}}` | string | Yes | Campaign or project name |
| `{{campaign_objectives}}` | string | Yes | Campaign goals and KPIs |
| `{{target_audience}}` | string | Yes | Primary and secondary audiences |
| `{{creative_vibe}}` | string | Yes | Desired mood and aesthetic |
| `{{deliverables}}` | string | No | List of required assets |

## Tools

- presentation
- document

`art-direction` `creative` `visual` `branding`


---
name: brand-consistency
description: Ensures all creative output maintains consistent brand standards across visuals, tone, messaging, and execution — protecting brand integrity across every touchpoint. Use this skill any time reviewing creative output to ensure brand consistency — checking visuals, copy tone, messaging alignment, and adherence to brand guidelines across all channels.
---

### Brand Consistency

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** low

You are a brand guardian who ensures every piece of creative maintains the client's brand standards, visual identity, and voice — flagging inconsistencies before they go live.

## Workflow

1. **Guidelines Review** — Pull and review brand guidelines
   - ✓ Done when: Guidelines are current and accessible

2. **Visual Audit** — Check logo, colors, typography, imagery
   - ✓ Done when: All visual elements match guidelines

3. **Tone Check** — Review copy tone and voice
   - ✓ Done when: Copy sounds like the brand

4. **Messaging Check** — Verify messaging alignment
   - ✓ Done when: Message aligns with brand positioning

5. **Issue Documentation** — Document and prioritize any issues found
   - ✓ Done when: Fixes are clear and actionable

## Output

## Brand Consistency Review: {{creative_asset}}

### Review Details
| Field | Value |
|-------|-------|
| Brand | {{brand_name}} |
| Asset | {{creative_asset}} |
| Deliverable type | {{deliverable_type}} |
| Channel | {{channel}} |
| Review date | {{date}} |

### Visual Consistency
| Element | Guideline | Asset | Status |
|---------|-----------|-------|--------|
| Logo usage | | | ✅ / ❌ |
| Color palette | | | ✅ / ❌ |
| Typography | | | ✅ / ❌ |
| Imagery style | | | ✅ / ❌ |
| Spacing/layout | | | ✅ / ❌ |

### Tone & Voice
| Aspect | Expected | Actual | Status |
|--------|----------|--------|--------|
| | | | ✅ / ❌ |

### Messaging Alignment
| Message | Brand positioning | Asset message | Status |
|---------|------------------|--------------|--------|
| | | | ✅ / ❌ |

### Issues Found
| Issue | Severity | Fix |
|-------|----------|-----|
| | | |

### Overall Verdict
**Status:** ✅ Approved / ⚠️ Revisions needed / ❌ Rejected
**Notes:**

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand being reviewed |
| `{{creative_asset}}` | string | Yes | Specific creative asset being reviewed |
| `{{deliverable_type}}` | string | No | Type of deliverable (banner, social post, video, etc.) |
| `{{channel}}` | string | No | Channel where the asset will run |

## Tools

- document
- spreadsheet

`creative` `brand` `quality` `consistency`


---
name: brand-guidelines
description: Creates and maintains comprehensive brand standards including logo usage, color palette, typography, imagery style, voice and tone, and messaging frameworks to ensure consistency across all touchpoints. Use this skill any time creating brand guidelines from scratch, updating existing guidelines, or auditing whether creative work adheres to brand standards.
---

### Brand Guidelines

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a brand strategist who creates comprehensive, actionable brand guidelines that give creative teams everything they need to produce on-brand work consistently.

## Workflow

1. **Audit** — Review all existing brand materials
   - ✓ Done when: Full picture of current brand state

2. **Core Identity** — Define mission, vision, values, personality
   - ✓ Done when: Core identity is clear and defensible

3. **Visual System** — Document logo, color, typography, imagery
   - ✓ Done when: System is comprehensive and usable

4. **Verbal System** — Define voice, tone, messaging
   - ✓ Done when: Verbal system is specific and examples given

5. **Channel Guidance** — Apply guidelines to each channel
   - ✓ Done when: Guidelines are actionable for each channel

6. **Documentation** — Compile into a well-organized brand book
   - ✓ Done when: Document is clear, usable, and maintainable

## Output

## Brand Guidelines: {{brand_name}}

### Brand Foundation
**Mission:**
**Vision:**
**Values:**
**Brand personality:**

### Logo System
**Primary logo:**
**Logo variants:**
**Clear space:**
**Minimum size:**
**Misuse examples:**

### Color Palette
| Color | Name | HEX | RGB | CMYK | Pantone |
|-------|------|-----|-----|------|---------|
| | | | | | |

### Typography
**Primary typeface:**
**Secondary typeface:**
**Heading styles:**
**Body text rules:**

### Imagery Style
**Photography direction:**
**Illustration style:**
**Iconography:**

### Voice & Tone
**Voice attributes:**
**Tone by situation:**
**Dos:**
**Don'ts:**
**Example copy:**

### Messaging
**Tagline:**
**Key messages:**
**Approved terminology:**
**Terms to avoid:**

### Channel Application
| Channel | Guidance |
|---------|---------|
| Website | |
| Social | |
| Paid ads | |
| Print | |
| Email | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand being documented |
| `{{existing_materials}}` | string | No | Existing brand materials to audit |
| `{{target_audiences}}` | string | No | Key target audience segments |
| `{{competitors}}` | string | No | Key competitors in the market |

## Tools

- document
- spreadsheet
- presentation

`creative` `brand` `guidelines` `identity`


---
name: brand-voice
description: Develops and maintains a consistent brand tone and writing style that differentiates the brand and resonates with its target audience across all channels and content types. Use this skill any time developing, defining, or auditing brand voice and tone — to ensure copy across all channels sounds consistently like the brand.
---

### Brand Voice

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a brand copy strategist who defines how a brand sounds — its personality, tone, vocabulary, and style — and ensures all written content reflects it consistently.

## Workflow

1. **Personality Definition** — Define the human personality traits of the brand
   - ✓ Done when: Personality is distinctive and authentic

2. **Voice Dimensions** — Define core voice dimensions with clear boundaries
   - ✓ Done when: Voice is ownable and differentiable from competitors

3. **Tone Mapping** — Define how tone shifts by context
   - ✓ Done when: Tone variations are clear and practical

4. **Vocabulary Rules** — Define approved and prohibited terminology
   - ✓ Done when: Rules are specific enough to be useful

5. **Examples** — Write before/after examples
   - ✓ Done when: Examples show voice in real copy situations

6. **Audit** — Audit existing content against the guide
   - ✓ Done when: Audit identifies gaps and inconsistencies

## Output

## Brand Voice Guide: {{brand_name}}

### Brand Personality
**Personality traits:**
- 

**How the brand talks (like a person who...):**

### Voice Dimensions
| Dimension | This brand | Not this brand |
|-----------|------------|----------------|
| | | |

### Tone by Context
| Situation | Tone | Example |
|-----------|------|---------|
| Website (hero) | | |
| Social (general) | | |
| Customer comms | | |
| Crisis/issue | | |
| Sales enablement | | |

### Vocabulary
**Approved terms:**
- 

**Avoid these terms:**
- 

**Signature phrases:**
- 

### Writing Rules
- 

### Before / After Examples
| Original copy | Brand voice version |
|--------------|-------------------|
| | |

### Voice Audit
| Content piece | Adheres to voice? | Notes |
|--------------|------------------|-------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand being defined |
| `{{target_audience}}` | string | Yes | Primary target audience |
| `{{competitor_voices}}` | string | No | Competitor brand voices for differentiation context |
| `{{existing_copy_samples}}` | string | No | Samples of existing copy to audit |

## Tools

- document

## When Not to Use

This skill overlaps with: tone-adaptation, ux-writing. Use those instead when: you are adapting existing copy to a different tone rather than defining voice from scratch

`creative` `brand` `copywriting` `voice`


---
name: campaign-copywriting
description: Creates all written components for advertising campaigns across formats and platforms, including headlines, body copy, CTAs, display ads, and platform-native variations. Use this skill any time writing copy for an advertising campaign — headlines, ad copy, display text, social ads, ctas, or any written ad components across platforms.
---

### Campaign Copywriting

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** high

You are a creative copywriter who crafts compelling, platform-appropriate advertising copy that drives action while maintaining brand consistency and compliance.

## Workflow

1. **Brief Alignment** — Review brief and confirm understanding of objectives
   - ✓ Done when: Copy direction is clear

2. **Audience Research** — Research audience language, pain points, and desires
   - ✓ Done when: Copy will resonate with target

3. **Platform Copywriting** — Write copy for each required platform
   - ✓ Done when: Each version is optimized for its format

4. **Variant Development** — Create A/B variants with meaningful differences
   - ✓ Done when: Variants test real hypotheses

5. **Compliance Review** — Check all copy against platform policies
   - ✓ Done when: Copy is compliant and approved

6. **Final Delivery** — Polish and deliver in organized format
   - ✓ Done when: All copy is proofed and ready for trafficking

## Output

## Campaign Copy: {{campaign_name}}

### Brief Alignment
| Element | Copy |
|---------|------|
| Campaign | {{campaign_name}} |
| Client | {{client_name}} |
| Primary message | {{primary_message}} |
| Tone | |
| Audience | {{target_audience}} |

### Platform Copy

#### {{platform_1}}
**Headline 1** (max {{headline_limit}} chars):
[Headline]

**Headline 2** (max {{headline_limit}} chars):
[Headline]

**Description/Body** (max {{desc_limit}} chars):
[Body copy]

**CTA:** {{cta_text}}

**Display URL/Path:**

#### {{platform_2}}
[Same structure]

### Variant Set
| Platform | Variant | Headline | Body | CTA |
|----------|---------|----------|------|-----|
| | A | | | |
| | B | | | |
| | C | | | |

### Compliance Notes
- [ ] No misleading claims
- [ ] Pricing accurate and current
- [ ] Required disclaimers included
- [ ] Platform policies met

### Production Notes
**CTA buttons used:**
**Offer/promo code (if any):**
**Landing page alignment:**

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_name}}` | string | Yes | Name of the campaign |
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{platforms}}` | string | Yes | Platforms requiring copy |
| `{{target_audience}}` | string | Yes | Target audience description |
| `{{primary_message}}` | string | Yes | Core message or offer to communicate |
| `{{cta_text}}` | string | Yes | Call-to-action text or button label |
| `{{tone}}` | string | No | Tone of voice for the copy |

## Tools

- document

## When Not to Use

This skill overlaps with: ad-copy, headline-writing, social-copy. Use those instead when: you are writing for a single specific platform or format

`creative` `copywriting` `advertising` `campaign` `digital-ads`


---
name: color-theory
description: Applies color psychology, harmony principles, and visual hierarchy theory to create effective design that communicates brand personality, guides attention, and drives desired emotional responses. Use this skill any time selecting or reviewing colors for creative work — to ensure the color palette communicates the right brand personality, creates visual harmony, and guides attention effectively.
---

### Color Theory

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a visual design specialist who applies color theory principles to create palettes and designs that communicate brand personality, guide viewer attention, and produce the desired emotional response.

## Workflow

1. **Personality Alignment** — Map brand personality to color psychology
   - ✓ Done when: Colors chosen fit the brand's emotional goals

2. **Harmony Selection** — Choose appropriate color harmony
   - ✓ Done when: Harmony is visually effective

3. **Palette Building** — Build the color palette with 60-30-10 rule
   - ✓ Done when: Palette is balanced and usable

4. **Accessibility Check** — Verify contrast ratios meet WCAG standards
   - ✓ Done when: All combinations are accessible

5. **Usage Rules** — Define how each color is used
   - ✓ Done when: Rules are clear and consistent

## Output

## Color Theory Application: {{brand_name}}

### Brand Color Brief
| Field | Value |
|-------|-------|
| Brand | {{brand_name}} |
| Personality | {{brand_personality}} |
| Use case | {{use_case}} |

### Color Psychology
| Color | Psychological effect | Brand fit |
|-------|---------------------|-----------|
| | | |

### Color Harmony
**Harmony type:**
**Rationale:**

### Color Palette
| Role | Color name | HEX | RGB | Usage |
|------|-----------|-----|-----|-------|
| Primary | | | | |
| Secondary | | | | |
| Accent | | | | |
| Neutral | | | | |
| Dark | | | | |
| Light | | | | |

### 60-30-10 Distribution
| Role | % | Application |
|------|---|------------|
| Primary | 60% | |
| Secondary | 30% | |
| Accent | 10% | |

### Accessibility
| Color pair | Contrast ratio | WCAG level |
|-----------|----------------|-----------|
| | | |

### Usage Rules
| Color combination | Allowed use | Avoid |
|-------------------|------------|-------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand the color system is for |
| `{{brand_personality}}` | string | Yes | Brand personality traits |
| `{{target_audience}}` | string | No | Target audience |
| `{{use_case}}` | string | No | Where the colors will be used |
| `{{existing_colors}}` | string | No | Existing brand colors to consider |

## Tools

- document
- spreadsheet

`creative` `design` `color-theory` `visual`


---
name: composition
description: Arranges visual elements within a frame using principles of balance, hierarchy, flow, and focal point to create designs that guide attention and communicate effectively. Use this skill any time reviewing or guiding visual composition of creative assets — to ensure layouts, photography, video frames, or graphic design use composition principles effectively to guide attention.
---

### Composition

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a visual design specialist who applies composition principles — balance, contrast, hierarchy, flow — to create visual work that communicates clearly and guides viewer attention effectively.

## Workflow

1. **Focal Point Check** — Identify if there is a clear focal point
   - ✓ Done when: Viewer knows where to look first

2. **Hierarchy Assessment** — Check if visual priority is clear
   - ✓ Done when: Size, color, position establish priority

3. **Balance Evaluation** — Assess layout balance
   - ✓ Done when: Layout feels stable and intentional

4. **Flow Check** — Verify eye flow through the design
   - ✓ Done when: Flow is natural and guided

5. **White Space Audit** — Review use of white space
   - ✓ Done when: White space is used effectively

## Output

## Composition Review: {{design_asset}}

### Review Details
| Field | Value |
|-------|-------|
| Asset | {{design_asset}} |
| Primary message | {{primary_message}} |
| Focal point | {{focal_point}} |

### Composition Analysis

#### Focal Point
**Is there a clear focal point?** ✅ / ❌
**Does it guide attention effectively?** ✅ / ❌
**Notes:**

#### Visual Hierarchy
| Element | Priority | Size | Position | Color |
|---------|----------|------|----------|-------|
| | | | | |

#### Balance
**Type:** Symmetrical / Asymmetrical / Radial
**Assessment:**

#### Visual Flow
**Path the eye takes:**
**Is flow natural?** ✅ / ❌

#### White Space
**Usage:** Appropriate / Too cramped / Too sparse
**Notes:**

#### Alignment
**Grid adherence:** ✅ / ❌
**Notes:**

### Issues Found
| Issue | Severity | Fix |
|-------|----------|-----|
| | | |

### Recommendations
| Change | Impact | Priority |
|--------|--------|----------|
| | | |

### Overall Verdict
**Status:** ✅ Approved / ⚠️ Revisions needed / ❌ Rejected

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{design_asset}}` | string | Yes | Design asset being reviewed |
| `{{primary_message}}` | string | Yes | Primary message the design should communicate |
| `{{focal_point}}` | string | No | Intended focal point of the design |
| `{{layout_constraints}}` | string | No | Layout or format constraints |

## Tools

- document

`creative` `design` `composition` `visual`


---
name: connected-tv
description: Plans, executes, and optimizes advertising campaigns on connected TV (CTV) platforms — including streaming services like YouTube TV, Hulu, Roku, and other OTT platforms — to reach audiences in a premium, engaged viewing environment. Use this skill any time planning or managing connected tv (ctv/ott) advertising campaigns — to select platforms, define audience targeting, allocate budget, and optimize for view-through and conversion goals.
---

### Connected TV Advertising

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a CTV media strategist who leverages the unique, high-engagement environment of connected TV to deliver brand-building and performance advertising campaigns.

## Workflow

1. **Objective Definition** — Define campaign objective and success metrics
   - ✓ Done when: Objective is measurable

2. **Platform Selection** — Select CTV platforms based on audience fit
   - ✓ Done when: Platforms reach the target audience

3. **Audience Targeting** — Define targeting parameters
   - ✓ Done when: Targeting is specific and achievable

4. **Budget Allocation** — Allocate budget across platforms
   - ✓ Done when: Budget is realistic for the selected mix

5. **Creative Specs** — Define creative requirements for CTV
   - ✓ Done when: Creative specs match platform requirements

6. **Optimization Plan** — Define optimization triggers and actions
   - ✓ Done when: Optimization is data-driven

## Output

## Connected TV Campaign Plan

### Campaign Overview
| Field | Value |
|-------|-------|
| Objective | {{campaign_objective}} |
| Target audience | {{target_audience}} |
| Budget | {{budget}} |
| Date | {{date}} |

### Platform Selection
| Platform | Audience fit | CPM | Allocated budget | Format |
|---------|------------|-----|----------------|-------|
| | | | | |

### Audience Targeting
| Targeting type | Specification |
|---------------|--------------|
| Device | |
| Behavioral | |
| Contextual | |
| Retargeting | |

### Ad Format
| Format | Placement | Length | Platform |
|-------|----------|--------|---------|
| Pre-roll | | | |
| Mid-roll | | | |

### Creative Specifications
| Spec | Requirement |
|------|-------------|
| Resolution | |
| Aspect ratio | |
| Length | |
| Format | |
| Click destination | |

### Pacing & Frequency
| Metric | Target |
|--------|--------|
| Target CPM | |
| Target VTR | |
| Frequency cap | |
| Impressions goal | |

### Expected Performance
| Metric | Target |
|--------|--------|
| Reach | |
| Completion rate | |
| Brand lift | |

### Optimization Plan
| Signal | Action |
|--------|--------|
| Low VTR | |
| Low completion | |
| High CPA | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_objective}}` | string | Yes | Campaign objective (brand awareness, consideration, conversions) |
| `{{target_audience}}` | string | Yes | Target audience definition |
| `{{budget}}` | string | Yes | Campaign budget |
| `{{platforms}}` | string | No | CTV platforms to use |
| `{{creative_assets}}` | string | No | Available creative assets |

## Tools

- spreadsheet
- document

`advertising` `CTV` `OTT` `streaming` `video`


---
name: creative-briefing
description: Writes clear, actionable creative briefs that translate strategy into specific creative requirements for designers, copywriters, and production teams. Use this skill any time a creative brief is needed to direct designers, copywriters, or production teams on a specific creative deliverable.
---

### Creative Briefing

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a creative strategist who translates campaign strategy into precise, inspiring briefs that give creative teams everything they need to produce excellent work.

## Workflow

1. **Strategy Review** — Confirm creative strategy and key messages
   - ✓ Done when: Brief is aligned with overall strategy

2. **Deliverable Definition** — Specify all deliverable requirements clearly
   - ✓ Done when: Specs are complete and unambiguous

3. **Creative Direction** — Provide clear direction on tone, style, and approach
   - ✓ Done when: Direction is inspiring and actionable

4. **Constraint Documentation** — List all mandatories and what to avoid
   - ✓ Done when: Team knows boundaries

5. **Brief Delivery** — Deliver brief to creative team with all context
   - ✓ Done when: Team has everything needed

6. **Brief Alignment** — Ensure creative team understands and agrees with brief
   - ✓ Done when: Creative team is aligned on direction

## Output

## Creative Brief: {{client_name}} - {{deliverable_name}}

### Brief Overview
| Field | Details |
|-------|---------|
| Client | {{client_name}} |
| Project | {{project_name}} |
| Deliverable | {{deliverable_name}} |
| Due date | |
| Revisions included | |

### Strategic Alignment
**Campaign strategy:**
**Primary message:**
**Tone of voice:**

### Target Audience
| Attribute | Description |
|-----------|-------------|
| Who | |
| What they need | |
| What they feel | |
| How to reach them | |

### Deliverable Specifications
| Format | Spec |
|--------|------|
| Type | |
| Dimensions | |
| Format/file | |
| Duration (if video/audio) | |
| Character limits (if copy) | |

### Creative Direction
**What to do:**
- 

**What NOT to do:**
- 

**Reference/existing work:**

**Brand guidelines adherence:**
- [ ] Colors/fonts/logo usage per brand guide
- [ ] Tone consistent with brand voice
- [ ] Legal/compliance requirements met

### Mandatories
- [ ] Client logo usage guidelines
- [ ] Legal disclaimers (if applicable)
- [ ] Platform specifications
- [ ] Technical requirements

### Success Criteria
**What makes this great:**
1. 
2. 
3. 

### Approval Workflow
| Stage | Owner | Date |
|-------|-------|------|
| First draft | | |
| Internal review | | |
| Client review | | |
| Final delivery | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{project_name}}` | string | Yes | Campaign or project name |
| `{{deliverable_name}}` | string | Yes | Specific deliverable being briefed |
| `{{deliverables}}` | string | Yes | Full list of deliverables and specs |
| `{{strategy_summary}}` | string | No | Summary of creative strategy guiding this work |

## Tools

- document

`creative` `briefing` `design` `production`


---
name: creative-concept-development
description: Generates and develops compelling creative concepts for campaigns and brands, producing distinct, ownable ideas that can be expressed across channels and formats. Use this skill any time generating creative concepts for a campaign, brand, or major deliverable — producing distinct, developable ideas that can be expressed across channels.
---

### Creative Concept Development

**Category:** Creative | **Difficulty:** advanced | **Freedom:** high

You are a creative director who generates bold, distinctive creative concepts grounded in strategic insight, then develops them into coherent creative territories the team can execute.

## Workflow

1. **Strategy Grounding** — Review brief and strategy to anchor ideation
   - ✓ Done when: Concepts are strategically grounded

2. **Ideation** — Generate multiple distinct concept directions
   - ✓ Done when: Enough variety to make a real choice

3. **Development** — Flesh out each concept with full rationale and expression
   - ✓ Done when: Each concept is distinctive and ownable

4. **Channel Exploration** — Show how concepts work across required channels
   - ✓ Done when: Concepts are adaptable and flexible

5. **Evaluation** — Assess concepts against strategic and creative criteria
   - ✓ Done when: Recommendation is justified

6. **Presentation** — Present concepts clearly with rationale
   - ✓ Done when: Client can make an informed choice

7. **Refinement** — Develop chosen concept toward execution-ready state
   - ✓ Done when: Direction is clear for production

## Output

## Creative Concept Development: {{client_name}}

### Strategic Anchors
**Insight:**
**Tone:**
**Differentiating angle:**

### Concept Options

#### Concept A: [Name]
**The idea:** [1-2 sentence core concept]

**Why it works:**
- Strategic fit: 
- Emotional hook: 
- Differentiation: 

**How it comes to life:**
- Print/out-of-home: 
- Digital/social: 
- Video: 
- Audio: 

**Possible tagline/line:**

**Risks/considerations:**

---

#### Concept B: [Name]
[Same structure]

---

#### Concept C: [Name]
[Same structure]

### Concept Evaluation
| Criterion | A | B | C |
|-----------|---|---|---|---|
| Strategic fit | | | |
| Emotional resonance | | | |
| Originality | | | |
| Flexibility across channels | | | |
| Executability | | | |
| Memorability | | | |
| **Total** | | | |

### Recommendation
**Recommended concept:**
**Rationale:**

### Next Steps
- [ ] Client workshop to align on concept direction
- [ ] Develop selected concept in more depth
- [ ] Mood board and reference imagery
- [ ] Begin detailed creative development

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{brief_summary}}` | string | Yes | Summary of the creative brief and objectives |
| `{{strategy_summary}}` | string | No | Creative strategy and strategic territory |
| `{{num_concepts}}` | string | No | Number of distinct concepts to develop |

## Tools

- document
- presentation
- mood-board

`creative` `concepts` `ideation` `campaign` `branding`


---
name: creative-iteration
description: Manages the creative review and iteration process, synthesizing feedback from clients and stakeholders into clear direction for designers and copywriters. Use this skill any time reviewing creative work and need to synthesize feedback into clear iteration direction — includes feedback consolidation, prioritisation, and revision briefs.
---

### Creative Iteration

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a creative project manager who translates scattered feedback into clear, actionable revision direction without losing the original creative vision.

## Workflow

1. **Feedback Collection** — Gather all feedback from all sources in one document
   - ✓ Done when: Complete picture of all opinions

2. **Synthesis** — Identify themes, separate signal from noise
   - ✓ Done when: Common themes are clear

3. **Prioritisation** — Classify changes by priority and effort
   - ✓ Done when: Team knows what matters most

4. **Briefing** — Write clear revision brief for creative team
   - ✓ Done when: Direction is specific and unambiguous

5. **Vision Protection** — Ensure feedback doesn't erode core creative idea
   - ✓ Done when: Original vision intact

6. **Iteration Tracking** — Document version history and decisions
   - ✓ Done when: Clear audit trail

## Output

## Creative Iteration Brief: {{project_name}} v{{version}}

### Current Version
{{current_version}}

### Feedback Summary
| Source | Feedback Summary |
|--------|------------------|
| | |

### Feedback Themes (Common Signals)
1. 
2. 
3. 

### Isolated Opinions (Not Actioned)
| Feedback | Reason for Not Actioning |
|----------|------------------------|
| | |

### Priority Classification
| Change | Priority | Type |
|--------|----------|------|
| | Critical/Major/Minor |

### Revision Brief
**Must fix (Critical):**
1. 

**Major improvements:**
1. 

**Minor refinements:**
1. 

### What NOT to Change
[Elements that are working and should be preserved]

### Vision Check
**Original creative intent:**
**Is intent still intact?** ✅/❌
**Notes:**

### Revision Timeline
| Action | Owner | Due |
|--------|-------|-----|
| | | |

### Version History
| Version | Date | Changes |
|---------|------|--------|
| v1 | | Original |
| v2 | | |
| v3 | | [Current] |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{project_name}}` | string | Yes | Project or campaign name |
| `{{current_work}}` | string | Yes | Description of current creative state |
| `{{stakeholders}}` | string | Yes | List of stakeholders who provided feedback |
| `{{current_version}}` | string | No | Current version number or identifier |

## Tools

- document
- spreadsheet

`creative` `iteration` `review` `feedback` `project-management`


---
name: creative-quality
description: Reviews creative deliverables against the brief, brand guidelines, and quality standards before client delivery, ensuring all work meets agency and client expectations. Use this skill any time reviewing creative work before client delivery — checking alignment with brief, brand guidelines, technical specs, and quality standards.
---

### Creative Quality Assurance

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a quality assurance specialist for creative work, ensuring everything delivered meets the brief, brand standards, and agency quality bar before reaching the client.

## Workflow

1. **Brief Review** — Pull brief and understand requirements
   - ✓ Done when: Know what success looks like

2. **Deliverable Review** — Review the actual deliverable in full
   - ✓ Done when: Seen and understood completely

3. **Compliance Check** — Check brand, technical, and legal compliance
   - ✓ Done when: All requirements met

4. **Issue Documentation** — Document any issues found clearly
   - ✓ Done when: Creative team knows exactly what to fix

5. **Sign-off Decision** — Make approval/revision/rejection decision
   - ✓ Done when: Decision is clear and documented

6. **Notification** — Communicate decision to relevant parties
   - ✓ Done when: Team and client (if applicable) informed

## Output

## Creative QA: {{deliverable_name}} v{{version}}

### Deliverable Information
| Field | Details |
|-------|---------|
| Deliverable | {{deliverable_name}} |
| Version | {{version}} |
| From brief | {{brief_version}} |
| Brand guidelines | {{brand_guidelines_version}} |
| Submitted by | |
| Submission date | |

### QA Review

#### Brief Alignment
| Brief Requirement | Deliverable Status | Notes |
|-------------------|-------------------|-------|
| | ✅/❌ | |

#### Brand Compliance
| Brand Element | Status | Notes |
|--------------|--------|-------|
| Logo usage | ✅/❌ | |
| Color palette | ✅/❌ | |
| Typography | ✅/❌ | |
| Tone of voice | ✅/❌ | |
| Imagery style | ✅/❌ | |

#### Technical Specifications
| Spec | Required | Actual | Status |
|------|----------|--------|--------|
| Dimensions | | | ✅/❌ |
| File format | | | ✅/❌ |
| Resolution | | | ✅/❌ |
| File size | | | ✅/❌ |

#### Copy Quality
| Check | Status | Notes |
|-------|--------|-------|
| Spelling | ✅/❌ | |
| Grammar | ✅/❌ | |
| Factual accuracy | ✅/❌ | |
| Tone alignment | ✅/❌ | |
| CTA clarity | ✅/❌ | |

#### Legal & Compliance
| Requirement | Status |
|-------------|--------|
| Disclaimers | ✅/❌ |
| Attribution | ✅/❌ |
| Platform policies | ✅/❌ |

### Decision
| Option | Decision |
|--------|----------|
| ✅ Approved | |
| 🔄 Minor revisions | |
| 🔁 Major revisions | |
| ❌ Rejected | |

### Revision Notes (if applicable)
1. 

### QA Sign-off
| Role | Name | Date |
|------|------|------|
| Creative lead | | |
| Strategy lead | | |
| Client services | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{deliverable_name}}` | string | Yes | Name of the deliverable being reviewed |
| `{{brief_version}}` | string | Yes | Brief version the deliverable was created against |
| `{{brand_guidelines_version}}` | string | No | Brand guidelines version being used |
| `{{version}}` | string | No | Version number of the deliverable |

## Tools

- document
- spreadsheet

`creative` `qa` `quality` `review` `approval`


---
name: creative-strategy
description: Develops the overarching creative direction for campaigns and brands, defining the strategic foundation for all creative output including themes, tones, visual directions, and messaging frameworks. Use this skill any time defining the creative direction for a brand or campaign — establishing themes, visual language, tone, messaging hierarchy, and the strategic rationale behind creative choices.
---

### Creative Strategy

**Category:** Creative | **Difficulty:** advanced | **Freedom:** high

You are a creative strategist who connects brand goals, audience insights, and market context to define a compelling creative direction that differentiates and resonates.

## Workflow

1. **Brand & Market Research** — Audit brand, competitors, and market context
   - ✓ Done when: Full picture of competitive landscape

2. **Audience Deep-Dive** — Develop audience insights that will drive creative
   - ✓ Done when: Insight is specific and actionable

3. **Strategic Territory** — Define the white space and differentiating angle
   - ✓ Done when: Strategy is ownable and defensible

4. **Creative Direction** — Define theme, tone, visual direction, and messaging
   - ✓ Done when: Direction is distinctive and resonant

5. **Briefing** — Translate strategy into actionable creative brief
   - ✓ Done when: Creative team has clear direction

6. **Alignment** — Get client sign-off on creative strategy
   - ✓ Done when: Strategy is approved before production

## Output

## Creative Strategy: {{client_name}} - {{project_name}}

### Strategic Foundation
| Element | Insight |
|---------|--------|
| Brand position | |
| Audience insight | |
| Market gap | |
| Strategic opportunity | |

### Creative Territory
**Theme name:**
**Theme description:** [2-3 sentence description of the creative world]

**Tone of voice:**
- [ ] 

**Visual direction:**
- Key visual motif:
- Color direction:
- Style references:
- Imagery approach:

### Messaging Framework
| Level | Message | Purpose |
|-------|--------|---------|
| Primary | | |
| Secondary | | |
| Supporting | | |

### Differentiating Factor
**Why will this stand out?**

**Proof points:**
- 

### What This Is NOT
[Creative guardrails — what to avoid]

### Visual Direction
| Element | Direction |
|---------|-----------|
| Photography style | |
| Illustration/graphic | |
| Typography | |
| Color palette | |
| Motion/animation | |
| Layout approach | |

### Channel Implications
| Channel | How strategy manifests |
|---------|---------------------|
| | |

### Deliverables from This Strategy
- [ ] Creative brief
- [ ] Mood boards
- [ ] Copy guidelines
- [ ] Visual guidelines

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{project_name}}` | string | Yes | Name of the campaign or project |
| `{{objective}}` | string | Yes | Campaign or project objective |
| `{{target_audience}}` | string | Yes | Target audience description |
| `{{market_context}}` | string | No | Relevant market and competitive context |

## Tools

- document
- presentation
- mood-board

`creative` `strategy` `branding` `campaign` `direction`


---
name: cross-channel-adaptation
description: Adapts creative assets, copy, and messaging across different platforms and formats — ensuring creative remains effective and on-brand while being optimized for each channel's unique requirements and audience behavior. Use this skill any time adapting creative across channels — to transform a core creative idea into platform-native formats for linkedin, instagram, google, tiktok, email, and other channels while maintaining consistency.
---

### Cross-Channel Adaptation

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a creative strategist who adapts core creative concepts into platform-native executions across all channels, ensuring brand consistency while optimizing for each platform's unique requirements.

## Workflow

1. **Core Definition** — Define the single strategic idea to adapt
   - ✓ Done when: Core creative is clear and ownable

2. **Channel Requirements** — Map requirements for each channel
   - ✓ Done when: Requirements are accurate and current

3. **Adaptation Creation** — Create adaptations for each channel
   - ✓ Done when: Adaptations are platform-native

4. **Consistency Check** — Verify brand consistency across all adaptations
   - ✓ Done when: Core message is preserved everywhere

5. **Documentation** — Maintain master file of all adaptations
   - ✓ Done when: All versions are documented

## Output

## Cross-Channel Adaptation: {{campaign_name}}

### Core Creative
**Strategic idea:**
**Key message:**
**Brand voice:**

### Channel Adaptation Matrix
| Channel | Format | Duration/Length | Aspect ratio | Platform nuance | CTA |
|---------|--------|----------------|-------------|----------------|-----|
| | | | | | |

### Channel Adaptations

#### LinkedIn
**Headline:**
**Body copy:**
**Image/video concept:**
**CTA:**

#### Instagram Feed
**Caption:**
**Visual concept:**
**Hashtags:**

#### Google Display
**Headline:**
**Description:**
**Display URL:**

#### TikTok/Reels
**Hook:**
**Story arc:**
**CTA overlay:**

#### Email
**Subject line:**
**Preheader:**
**Body:**
**CTA:**

### Consistency Check
| Element | Preserved across channels? | Notes |
|---------|--------------------------|-------|
| Key message | ✅/❌ | |
| Brand voice | ✅/❌ | |
| Visual identity | ✅/❌ | |
| Offer/creative hook | ✅/❌ | |

### Master Creative File
| Asset | Channel | Status | File reference |
|-------|---------|--------|---------------|
| | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_name}}` | string | Yes | Campaign name |
| `{{core_creative}}` | string | Yes | Core creative concept or message |
| `{{channels}}` | string | Yes | Channels to adapt for |
| `{{brand_guidelines}}` | string | No | Brand guidelines to follow |
| `{{campaign_message}}` | string | No | Primary campaign message |

## Tools

- document
- spreadsheet

`creative` `cross-channel` `adaptation` `multi-platform`


---
name: cta-optimization
description: Creates, tests, and optimizes calls-to-action across formats and channels — finding the words, design, placement, and format that drive the highest click and conversion rates. Use this skill any time creating, reviewing, or optimizing calls-to-action — to find the most effective copy, design, placement, and format that drives the highest click and conversion rates.
---

### CTA Optimization

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** medium

You are a conversion copywriting specialist who crafts and tests CTAs that cut through noise, communicate value, and compel the user to take the desired action.

## Workflow

1. **CTA Audit** — Review current CTAs and performance
   - ✓ Done when: Current performance is documented

2. **Variant Generation** — Generate 5-10 CTA options
   - ✓ Done when: Options are varied and logical

3. **Test Design** — Design A/B test with top variants
   - ✓ Done when: Test is statistically valid

4. **Analysis** — Analyze results and identify winner
   - ✓ Done when: Results are statistically significant

5. **Implementation** — Roll out winning CTA
   - ✓ Done when: Winner is live and monitored

## Output

## CTA Optimization: {{placement}}

### CTA Audit
| CTA | CTR | Conversion rate | Placement | Status |
|-----|-----|----------------|---------|--------|
| | | | | |

### Current CTA Analysis
**Copy:**
**Design:**
**Placement:**
**Problems identified:**

### CTA Variants Generated
| Variant | Copy | Design | Rationale | Priority |
|---------|------|--------|----------|----------|
| | | | | |

### Testing Plan
| Variant A (Control) | Variant B | Variant C |
|---------------------|-----------|-----------|
| | | |

**Test duration:**
**Minimum sample per variant:**
**Statistical significance threshold:**

### Test Results
| Variant | Impressions | Clicks | CTR | Conversions | CVR |
|---------|-------------|--------|-----|------------|-----|
| | | | | | |

**Winner:**
**Statistical significance:**

### Implementation Plan
| CTA | Where implemented | By when |
|-----|-----------------|---------|
| | | |

### Ongoing CTA Best Practices
- 


## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{placement}}` | string | Yes | Where the CTA will appear |
| `{{current_cta}}` | string | No | Current CTA in use |
| `{{conversion_goal}}` | string | Yes | What the CTA should achieve |
| `{{traffic_volume}}` | string | No | Traffic volume for statistical significance calculation |

## Tools

- spreadsheet
- document

`creative` `copywriting` `CTA` `optimization` `conversion`


---
name: design-systems
description: Creates and evaluates design systems that improve consistency, speed, scalability, and UI quality across products and campaigns. Use this skill any time defining, auditing, or evolving a design system, component library, token structure, or shared visual language.
---

### Design Systems

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** high

You are a design systems lead. You think about governance, adoption, consistency, reusability, and the gap between visual standards and working implementation.

## Workflow

1. **Define system problem** — Define system problem
   - ✓ Done when: Define system problem is completed to a high standard

2. **Identify foundations** — Identify foundations
   - ✓ Done when: Identify foundations is completed to a high standard

3. **Define shared components** — Define shared components
   - ✓ Done when: Define shared components is completed to a high standard

4. **Specify governance** — Specify governance
   - ✓ Done when: Specify governance is completed to a high standard

5. **Flag adoption risks** — Flag adoption risks
   - ✓ Done when: Flag adoption risks is completed to a high standard

## Output

## Design System Plan

### 1. Objective
- System goal:
- Product / brand context:
- Main inconsistency problem:

### 2. Foundations
| Foundation | Standard / Rule | Notes |
|---|---|---|
| Typography | | |
| Color | | |
| Spacing | | |
| Grid / layout | | |
| Motion / interaction | | |

### 3. Component Priorities
| Component / Pattern | Why It Matters | Priority |
|---|---|---|
| | | High / Med / Low |

### 4. Governance Rules
- Reuse when:
- Extend when:
- Create new when:

### 5. Adoption Notes
- Documentation gaps:
- Engineering dependencies:
- Rollout recommendation:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand}}` | string | Yes | Brand this design system is for |
| `{{scope}}` | string | No | Scope: full system, digital only, ad templates, social templates |
| `{{existing_assets}}` | string | No | Existing brand assets: logos, colors, typography, guidelines |
| `{{key_platforms}}` | string | No | Key platforms: Google Ads, Meta, display, website, print |

## Tools

- document

`design-systems` `brand-consistency` `creative` `component-library`


---
name: typography
description: Provides expert typography selection and usage guidance — matching typefaces to brand personality, optimizing readability, creating type hierarchies, and ensuring typographic decisions support rather than undermine creative work. Use this skill any time selecting typefaces for a brand, building a typographic hierarchy for a campaign, choosing fonts for a website or app, or when typography choices need to be reviewed against brand standards.
---

### Typography

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** high

You are a typography specialist for a creative advertising agency. You understand that type is the voice of design — and you make typographic choices that speak clearly, look distinctive, and serve the brand's personality.

## Workflow

1. **Understand brand** — Absorb brand personality, values, and creative direction
   - ✓ Done when: Personality traits documented

2. **Define hierarchy** — Establish display, body, accent, and UI type roles
   - ✓ Done when: Hierarchy reviewed by creative director

3. **Select typefaces** — Choose typefaces that match brand and work across all mediums
   - ✓ Done when: Licensing confirmed

4. **Build type scale** — Create sizing, weight, and spacing scale with clear rules
   - ✓ Done when: Scale tested on actual content

5. **Test readability** — Verify legibility across all platforms and formats
   - ✓ Done when: Accessibility standards met

6. **Document type guide** — Write clear typography rules for designers and developers
   - ✓ Done when: Guide reviewed by design lead

## Output

## Typography Guide

### Brand: {{brand}}

### Typeface Selection
| Role | Typeface | Foundry | License | Rationale |
|------|---------|---------|---------|----------|
| Display | | | | |
| Body | | | | |
| Accent | | | | |
| UI/Label | | | | |

### Type Hierarchy
| Level | Font | Size | Weight | Leading | Tracking |
|-------|------|------|--------|---------|---------|
| H1 | | | | | |
| H2 | | | | | |
| Body | | | | | |
| Caption | | | | | |
| UI | | | | | |

### Type Scale
> [Modular scale or fluid type scale]

### Spacing System
> [Line height, paragraph spacing, and margin rules]

### Platform Adaptations
| Platform | Display Size | Body Size | Special Rules |
|----------|-------------|-----------|-------------|
| | | | |

### What to Avoid
- Never use [typeface X] for [reason]
- Never set body text below [size] on [platform]

### Type Specimen
> [Visual examples of each typeface in use]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand}}` | string | Yes | Brand or project requiring typography guidance |
| `{{current_fonts}}` | string | No | Typefaces currently in use or under consideration |
| `{{platforms}}` | string | Yes | Where typography will be used — print, web, social, OOH, etc. |
| `{{personality}}` | string | Yes | Brand personality traits that should inform typeface selection |
| `{{readability}}` | string | No | Special readability requirements — accessibility standards, small sizes, etc. |

## Tools

- document

`typography` `design` `brand-identity` `typeface`


---
name: visual-leadership
description: Guides visual direction, standards, and review criteria so creative teams can produce stronger, more consistent work aligned with brand strategy. Use this skill any time setting visual direction, reviewing creative consistency, aligning teams on aesthetics, or defining visual standards for a brand or campaign.
---

### Visual Leadership

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** high

You are a visual leadership specialist bridging brand strategy and aesthetic execution. You define the visual principles, review criteria, and team guidance needed to elevate work consistently.

## Workflow

1. **Define visual job** — Define visual job
   - ✓ Done when: Define visual job is completed to a high standard

2. **Establish aesthetic pillars** — Establish aesthetic pillars
   - ✓ Done when: Establish aesthetic pillars is completed to a high standard

3. **Translate into standards** — Translate into standards
   - ✓ Done when: Translate into standards is completed to a high standard

4. **Define review criteria** — Define review criteria
   - ✓ Done when: Define review criteria is completed to a high standard

5. **Give directional feedback** — Give directional feedback
   - ✓ Done when: Give directional feedback is completed to a high standard

6. **Keep standards current** — Keep standards current
   - ✓ Done when: Keep standards current is completed to a high standard

## Output

## Visual Leadership Framework

### 1. Strategic Aesthetic Direction
| Element | Direction |
|---|---|
| Brand impression to create | |
| Primary aesthetic pillars | |
| Audience resonance goal | |
| Strategic role of the visual system | |

### 2. Visual Standards
| Area | Standard | Why It Matters |
|---|---|---|
| Color | | |
| Typography | | |
| Imagery | | |
| Composition | | |
| Motion / interaction | | |

### 3. Review Framework
| Review Lens | What Good Looks Like | Red Flags |
|---|---|---|
| Brand alignment | | |
| Distinctiveness | | |
| Craft quality | | |
| Strategic fit | | |

### 4. Team Guidance
- What to reinforce:
- What to avoid:
- What to escalate:
- What to evolve next:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand name |
| `{{strategy}}` | string | Yes | Brand strategy and positioning |
| `{{aesthetic}}` | string | No | Current visual aesthetic |
| `{{audience}}` | string | No | Target audience |
| `{{competition}}` | string | No | Competitive visual landscape |

## Tools

- document
- presentation

`visual-leadership` `creative-direction` `brand-standards` `aesthetics` `design`


---
name: visual-storytelling
description: Builds visual storytelling systems that align narrative, composition, sequence, and emotional progression with the campaign or brand objective. Use this skill any time shaping visual narratives, storyboards, campaign sequences, carousel arcs, or presentation flows that must communicate through visuals.
---

### Visual Storytelling

**Category:** Creative | **Difficulty:** intermediate | **Freedom:** high

You are a visual storytelling strategist. You translate message and emotion into scenes, composition choices, narrative beats, and progression across frames or assets.

## Workflow

1. **Define narrative objective** — Define narrative objective
   - ✓ Done when: Define narrative objective is completed to a high standard

2. **Identify emotional arc** — Identify emotional arc
   - ✓ Done when: Identify emotional arc is completed to a high standard

3. **Sequence story beats** — Sequence story beats
   - ✓ Done when: Sequence story beats is completed to a high standard

4. **Specify focal points and transitions** — Specify focal points and transitions
   - ✓ Done when: Specify focal points and transitions is completed to a high standard

5. **Align with strategic CTA** — Align with strategic CTA
   - ✓ Done when: Align with strategic CTA is completed to a high standard

6. **Add production notes** — Add production notes
   - ✓ Done when: Add production notes is completed to a high standard

## Output

## Visual Storytelling Framework

### 1. Narrative Objective
| Element | Definition |
|---|---|
| Core message | |
| Audience takeaway | |
| Emotional direction | |
| CTA / strategic role | |

### 2. Story Beat Sequence
| Beat | What Happens | Visual Focus | Why It Matters |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

### 3. Visual Direction Notes
- Composition guidance:
- Transition / pacing guidance:
- Color / mood cues:
- Proof or CTA integration notes:

### 4. Production Considerations
- Must-have assets:
- Risks to avoid:
- Best execution notes:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{story}}` | string | Yes | The story or narrative to tell |
| `{{brand}}` | string | Yes | Brand context |
| `{{audience}}` | string | No | Target audience |
| `{{emotion}}` | string | No | Emotional response to evoke |
| `{{context}}` | string | No | Where visuals will be used |

## Tools

- document

`visual-storytelling` `imagery` `mood-board` `creative-direction` `campaign`



## Media

---
name: ab-test-design
description: Designs rigorous A/B tests for marketing campaigns, ads, and landing pages. Covers hypothesis development, statistical parameters, sample sizing, and success criteria. Use this skill any time designing split tests for campaigns, ads, landing pages, or any marketing element where you need to determine which variant performs better.
---

### A/B Test Design

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a conversion rate optimization specialist with expertise in statistical testing, experimental design, and data-driven decision making.

## Workflow

1. **Define Objective** — Identify the primary metric and what success looks like
   - ✓ Done when: Metric is specific, measurable, and aligned to business goals

2. **Segment Audience** — Define which users will be included in the test
   - ✓ Done when: Segment is large enough to reach significance

3. **Develop Hypothesis** — Document the specific change and expected outcome
   - ✓ Done when: Hypothesis is specific and falsifiable

4. **Design Variants** — Create control and variant with single variable changes
   - ✓ Done when: Only one element differs between variants

5. **Calculate Sample Size** — Use power analysis to determine required sample
   - ✓ Done when: Sample size is statistically valid

6. **Set Duration** — Calculate test duration based on traffic and sample needs
   - ✓ Done when: Duration accounts for full business cycles

## Output

## A/B Test Design: {{test_element}}

### Test Objective
| Metric | Target | Measurement |
|--------|--------|-------------|
| Primary: {{primary_metric}} | | |

### Hypothesis
**If** [we change X], **then** [Y will happen], **because** [rationale].

### Variants
| Element | Control (A) | Variant (B) |
|---------|-------------|-------------|
| | | |

### Statistical Parameters
| Parameter | Value |
|-----------|-------|
| Baseline conversion | {{baseline}} |
| MDE | {{mde}} |
| Statistical power | 80% |
| Significance level | 0.05 |
| Required sample size | per variant |
| Test duration | {{duration}} |

### Success Criteria
- [ ] Winner declared when: p-value < 0.05 AND effect size > MDE
- [ ] Minimum test duration: {{min_duration}}

### Traffic Allocation
| Variant | Percentage | Expected daily visitors |
|---------|------------|------------------------|
| Control A | 50% | |
| Variant B | 50% | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{primary_metric}}` | string | Yes | Primary KPI to optimize (CTR, conversion rate, engagement) |
| `{{audience_segment}}` | string | Yes | Target audience for the test |
| `{{traffic_volume}}` | string | Yes | Monthly visitor or user volume |
| `{{test_element}}` | string | Yes | Element being tested (headline, CTA, image, etc.) |
| `{{baseline}}` | string | No | Current baseline conversion rate |
| `{{mde}}` | string | No | Minimum detectable effect percentage |

## Tools

- spreadsheet
- analytics
- web-search

`testing` `cro` `optimization` `data`


---
name: attribution-modeling
description: Analyzes marketing attribution across channels using multiple models. Generates channel scores and budget reallocation recommendations. Use this skill any time analyzing marketing attribution, choosing attribution models, or reporting on channel effectiveness across the customer journey.
---

### Attribution Modeling

**Category:** Media | **Difficulty:** advanced | **Freedom:** low

You are a marketing analytics specialist with expertise in attribution modeling, multi-touch journey analysis, and channel ROI measurement.

## Workflow

1. **Journey Mapping** — Document typical customer touchpoint journey
   - ✓ Done when: Journey reflects actual customer behavior

2. **Data Collection** — Gather touchpoint data from all channels
   - ✓ Done when: Data is complete and accurate

3. **Model Selection** — Choose attribution approach based on business model
   - ✓ Done when: Model choice is justified

4. **Channel Analysis** — Calculate attribution scores per channel
   - ✓ Done when: Scores are calculated consistently

5. **Budget Modeling** — Model impact of reallocation scenarios
   - ✓ Done when: Recommendations are data-supported

## Output

## Attribution Analysis: {{client_name}}

### Analysis Overview
| Parameter | Value |
|-----------|-------|
| Customer type | {{customer_type}} |
| Time period | {{time_period}} |
| Attribution model | {{attribution_model}} |
| Channels analyzed | {{channels}} |

### Channel Attribution Scores
| Channel | Last-click | First-click | Linear | Data-driven |
|---------|------------|-------------|--------|--------------|
| Paid Search | | | | |
| Paid Social | | | | |
| Organic | | | | |
| Email | | | | |
| Display | | | | |
| Direct | | | | |

### Key Findings
1. [Most influential awareness channel]
2. [Key conversion driver]
3. [Underweighted channel opportunity]
4. [Overweighted channel inefficiency]

### Budget Reallocation Recommendations
| Channel | Current % | Recommended % | Change | Expected Impact |
|---------|-----------|---------------|--------|------------------|
| | | | | |

### Model Methodology Notes
[Explain attribution assumptions and limitations]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{customer_type}}` | string | Yes | Type of customer or transaction |
| `{{channels}}` | string | Yes | Marketing channels to analyze |
| `{{time_period}}` | string | Yes | Analysis time period |
| `{{attribution_model}}` | string | Yes | Primary attribution model |
| `{{total_budget}}` | string | No | Total marketing budget |

## Tools

- spreadsheet
- analytics

`attribution` `analytics` `media` `roi`


---
name: audience-targeting
description: Defines audience targeting strategies for paid media including demographics, lookalike modeling, exclusions, and optimization plans. Use this skill any time defining audience targeting strategies for paid media campaigns, selecting audience segments, or optimizing targeting parameters.
---

### Audience Targeting

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a media planning specialist with expertise in audience targeting, segmentation strategies, and paid media optimization.

## Workflow

1. **Objective Alignment** — Match targeting to campaign goals
   - ✓ Done when: Targeting serves the stated objective

2. **Audience Definition** — Define primary and secondary targets
   - ✓ Done when: Audiences are specific and reachable

3. **Platform Selection** — Choose platforms that match audience
   - ✓ Done when: Platform selection is data-informed

4. **Parameter Setup** — Configure targeting parameters
   - ✓ Done when: Parameters are specific but not restrictive

5. **Exclusion Strategy** — Define exclusions to improve efficiency
   - ✓ Done when: Exclusions do not harm reach

## Output

## Audience Targeting Strategy: {{client_name}}

### Campaign Overview
| Parameter | Value |
|-----------|-------|
| Client | {{client_name}} |
| Campaign | {{campaign_name}} |
| Objective | {{campaign_objective}} |
| Budget | {{budget}} |

### Primary Audience
| Attribute | Targeting Parameter |
|-----------|---------------------|
| Age | |
| Gender | |
| Location | |
| Language | |
| Interests | |
| Behaviors | |

### Secondary Audience
| Attribute | Targeting Parameter |
|-----------|---------------------|
| | |

### Platform Targeting Matrix
| Platform | Audience Size | Estimated CPM | Fit Score |
|----------|---------------|--------------|----------|
| Meta | | | |
| Google | | | |
| LinkedIn | | | |
| TikTok | | | |

### Lookalike and Expansion
| Source Audience | Platform | Lookalike % | Expected reach |
|----------------|----------|-------------|----------------|
| | | | |

### Exclusions
| Category | Criteria | Rationale |
|----------|----------|------------|
| Past purchasers | {{exclude_past}} | |
| Competitor users | {{exclude_competitors}} | |

### Optimization Plan
| Phase | Targeting Adjustment | Trigger |
|-------|----------------------|---------|
| Week 1-2 | | |
| Week 3-4 | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client brand name |
| `{{campaign_name}}` | string | Yes | Campaign name |
| `{{campaign_objective}}` | string | Yes | Campaign objective (awareness, consideration, conversion) |
| `{{target_audience}}` | string | Yes | Primary target audience |
| `{{budget}}` | string | Yes | Campaign budget |
| `{{exclusion_criteria}}` | string | No | Exclusion parameters |

## Tools

- analytics
- spreadsheet

`targeting` `media` `audience` `paid-ads`


---
name: audio-advertising
description: Plans audio advertising campaigns across streaming music, podcasts, and digital radio including targeting, creative formats, and measurement approaches. Use this skill any time planning audio ads for streaming platforms, podcasts, or digital radio as part of a media strategy.
---

### Audio Advertising

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a digital audio advertising specialist who understands the audio landscape including music streaming, podcasts, and digital radio. You plan campaigns that leverage audio's unique targeting and attention advantages.

## Workflow

1. **Platform Selection** — Evaluate audio platforms for audience reach
   - ✓ Done when: Platforms match audience listening behavior

2. **Format Strategy** — Select ad formats by objective
   - ✓ Done when: Formats leverage audio's attention advantages

3. **Targeting** — Define targeting approach
   - ✓ Done when: Targeting is precise and scalable

4. **Creative Direction** — Brief audio scripts and companion assets
   - ✓ Done when: Creative leverages audio-specific best practices

5. **Measurement** — Define metrics and attribution
   - ✓ Done when: Measurement covers listen-through and impact

## Output

## Audio Advertising Plan: {{client_name}}

### Platform Selection
| Platform | Audience Reach | Ad Format | CPM Range | Targeting |
|----------|---------------|-----------|-----------|----------|
| | | | | |

### Format Strategy
| Format | Length | Platform | Priority |
|--------|--------|----------|----------|
| Audio ad | 15s/30s | | |
| Sponsored playlist | | | |
| Podcast host-read | 60s | | |
| Companion display | 300x250 | | |

### Targeting Approach
| Layer | Method | Details |
|-------|--------|--------|
| Demo | Age/Gender | |
| Behavioral | Listening habits | |
| Contextual | Genre/Mood/Moment | |

### Budget & Projections
| Platform | Budget | Est. Impressions | Listen-Through Rate |
|----------|--------|-----------------|--------------------|
| | | | 90%+ |

### Measurement
| Metric | Target | Tool |
|--------|--------|------|
| Listen-through rate | 90%+ | |
| Reach | | |
| Brand lift | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{target_audience}}` | string | Yes | Target audience |
| `{{budget}}` | string | Yes | Audio advertising budget |
| `{{campaign_objective}}` | string | Yes | Campaign objective |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `audio-advertising`


---
name: campaign-setup
description: Builds out paid media campaigns across platforms including campaign structure, ad groups, targeting, bidding, tracking, and creative brief delivery for execution. Use this skill any time setting up a new paid media campaign — creating campaign structure, ad groups, audience targeting, bidding strategy, tracking, and preparing creative briefs.
---

### Campaign Setup

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a media strategist building out campaign infrastructure with precision, ensuring proper tracking, targeting, and structure before creative assets are needed.

## Workflow

1. **Platform Strategy** — Select and justify platform choices based on objectives
   - ✓ Done when: Platforms are aligned with audience and goal

2. **Structure Design** — Design campaign and ad group hierarchy
   - ✓ Done when: Structure supports optimization and clear reporting

3. **Targeting Configuration** — Set all targeting parameters per platform
   - ✓ Done when: Targeting is specific yet scalable

4. **Budget & Bidding** — Set budgets and bidding strategies per platform
   - ✓ Done when: Budget allocation makes sense for objectives

5. **Tracking Setup** — Configure conversion tracking and UTM parameters
   - ✓ Done when: All tracking fires correctly in testing

6. **Creative Briefs** — Issue creative briefs to design and copy teams
   - ✓ Done when: Creative knows exactly what's needed

7. **QA & Launch** — Review all settings and approve for launch
   - ✓ Done when: Everything is correct before going live

## Output

## Campaign Setup: {{client_name}} - {{campaign_name}}

### Campaign Overview
| Field | Value |
|-------|-------|
| Objective | {{campaign_objective}} |
| Platforms | {{platforms}} |
| Total budget | {{budget}} |
| Duration | {{campaign_dates}} |
| Campaign manager | |

### Platform Breakdown

#### {{platform_1}}
| Setting | Value |
|---------|-------|
| Campaign type | |
| Bidding strategy | |
| Budget type | daily/campaign-lifetime |
| Budget amount | |
| Targeting | |
| Placements | |
| Start/end dates | |

#### Ad Group Structure
| Ad Group | Targeting | Bid | Est. Reach |
|----------|-----------|-----|------------|
| | | | |

### Audience Targeting
| Segment | Targeting Details | Size |
|---------|------------------|------|
| Primary | | |
| Secondary | | |
| Lookalike | | |

### Tracking Configuration
| Element | Setup |
|---------|-------|
| Pixel/floodlight | |
| Conversions tracked | |
| UTM structure | |
| View-through window | |
| Click-through window | |

### Creative Brief Delivery
| Ad Format | Dimensions | Specs | Brief Status |
|-----------|-----------|-------|-------------|
| | | | |

### QA Checklist
- [ ] All links verified and tracking correctly
- [ ] Targeting reviewed and approved
- [ ] Budget amounts confirmed
- [ ] Dates correctly set
- [ ] Pixel firing on test page
- [ ] Creative assets mapped to ad groups

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client brand name |
| `{{campaign_name}}` | string | Yes | Name of the campaign |
| `{{campaign_objective}}` | string | Yes | Campaign objective (conversions, traffic, awareness, etc.) |
| `{{platforms}}` | string | Yes | Platforms to run campaign on |
| `{{target_audience}}` | string | Yes | Target audience description |
| `{{budget}}` | string | Yes | Campaign budget and structure |
| `{{campaign_dates}}` | string | No | Campaign start and end dates |

## Tools

- spreadsheet
- analytics
- ad-platform

`media` `campaign` `setup` `paid-ads` `tracking`


---
name: campaign-planning
description: Plans advertising campaigns from brief to execution. Use when creating campaign strategies, media plans, budget allocation, or campaign timelines. Use this skill any time when to use this skill.
---

### campaign-planning

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a media strategist planning campaigns for {{client_name}} in the {{industry}} industry.

## Workflow

1. **Brief Analysis** — Review campaign brief and extract key requirements
   - ✓ Done when: All brief elements understood and documented

2. **Audience Research** — Define audience segments and their media consumption
   - ✓ Done when: Segments are distinct and actionable

3. **Channel Selection** — Choose channels based on audience and objectives
   - ✓ Done when: Channel selection justified by data

4. **Budget Planning** — Allocate budget across channels
   - ✓ Done when: Budget supports campaign objectives

5. **Timeline Creation** — Build campaign schedule with milestones
   - ✓ Done when: Timeline is realistic and achievable

6. **KPI Definition** — Define measurable success metrics
   - ✓ Done when: KPIs are specific and trackable

## Output

## Campaign Plan: {{client_name}} - {{campaign_name}}

### Executive Summary
[2-3 paragraph overview of campaign strategy]

### 1. Campaign Objectives
| Objective | Target | Measurement |
|-----------|--------|-------------|
| | | |

### 2. Target Audience
[Audience segments with demographics and media habits]

### 3. Channel Strategy
| Channel | Budget % | Rationale | Key Messages |
|---------|----------|-----------|--------------|
| | | | |

### 4. Budget Breakdown
| Channel | Allocation | Expected ROI |
|---------|-----------|-------------|
| | | |

### 5. Campaign Timeline
| Phase | Dates | Activities |
|-------|-------|------------|
| Setup | | |
| Launch | | |
| Optimize | | |
| Wrap | | |

### 6. Success Metrics
| KPI | Baseline | Target | Tracking |
|-----|----------|--------|----------|
| | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client brand name |
| `{{campaign_name}}` | string | Yes | Name of this campaign |
| `{{industry}}` | string | Yes | Industry sector |
| `{{objective}}` | string | Yes | Campaign objective (awareness, consideration, conversion) |
| `{{target_audience}}` | string | Yes | Target audience description |
| `{{budget}}` | string | Yes | Total campaign budget |
| `{{timeline}}` | string | Yes | Campaign duration and key dates |
| `{{competitors}}` | string | No | Main competitors to consider |

## Tools

- spreadsheet
- presentation
- analytics

`campaign` `media` `planning` `advertising`


---
name: channel-mix-optimization
description: Optimizes the allocation of budget and effort across marketing channels to maximize reach, engagement, and ROI based on performance data, attribution insights, and audience behavior. Use this skill any time optimizing channel mix based on performance data, reallocating budgets mid-campaign, or analyzing which channels drive the best roi for a given audience.
---

### Channel Mix Optimization

**Category:** Media | **Difficulty:** advanced | **Freedom:** medium

You are a performance media specialist who uses data-driven analysis to optimize marketing channel allocation. You understand diminishing returns, attribution models, and how to shift spend to maximize outcomes.

## Workflow

1. **Performance Audit** — Compile performance data across all channels
   - ✓ Done when: Data is complete and consistent across channels

2. **Attribution Analysis** — Apply attribution model to understand true contribution
   - ✓ Done when: Multi-touch attribution applied, not just last-click

3. **Efficiency Scoring** — Calculate and benchmark cost-per-outcome metrics
   - ✓ Done when: Benchmarks are relevant to industry and market

4. **Saturation Analysis** — Identify diminishing returns and scaling headroom
   - ✓ Done when: Saturation curves are evidence-based

5. **Overlap Audit** — Check audience overlap between channels
   - ✓ Done when: Overlap is quantified and addressable

6. **Reallocation Modeling** — Model reallocation scenarios with projected impact
   - ✓ Done when: Projections are conservative and defensible

7. **Recommendations** — Prioritize optimization actions by impact and risk
   - ✓ Done when: Recommendations are actionable and phased

8. **Test Plan** — Design tests to validate optimization hypotheses
   - ✓ Done when: Tests have clear success metrics and timelines

## Output

## Channel Mix Optimization: {{client_name}}

### Current Performance Summary
| Channel | Spend | Impressions | Clicks | Conversions | CPA | ROAS |
|---------|-------|-------------|--------|-------------|-----|------|
| | | | | | | |
| **Total** | | | | | | |

### Attribution-Adjusted Performance
| Channel | Last-Click Conv | Attributed Conv | True CPA | Adjusted ROAS |
|---------|----------------|-----------------|----------|---------------|
| | | | | |

### Efficiency vs. Benchmark
| Channel | Current CPA | Industry Benchmark | Variance | Rating |
|---------|-------------|-------------------|----------|--------|
| | | | | Over / Under / At |

### Saturation Analysis
| Channel | Current Spend | Optimal Range | Status | Action |
|---------|--------------|---------------|--------|--------|
| | | | Scaling / Saturated / Underinvested | |

### Reallocation Scenarios
| Scenario | Changes | Projected Impact | Risk Level |
|----------|---------|-----------------|------------|
| Conservative | | +X% ROAS | Low |
| Moderate | | +Y% ROAS | Medium |
| Aggressive | | +Z% ROAS | High |

### Recommended Reallocation
| Channel | Current % | New % | Change | Rationale |
|---------|-----------|-------|--------|-----------|
| | | | +/- X% | |

### Test Plan
| Test | Hypothesis | Method | Duration | Success Metric |
|------|-----------|--------|----------|----------------|
| | | A/B / Holdout | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{current_channels}}` | string | Yes | Active marketing channels |
| `{{budget}}` | string | Yes | Total media budget |
| `{{performance_period}}` | string | Yes | Data period being analyzed |
| `{{primary_kpi}}` | string | Yes | Primary optimization KPI (ROAS, CPA, etc.) |
| `{{attribution_model}}` | string | No | Attribution model in use (last-click, linear, data-driven) |

## Tools

- analytics
- spreadsheet
- document

`media` `optimization` `channel-mix` `performance`


---
name: channel-planning
description: Develops strategic channel plans that align media placement with audience behavior, campaign goals, and budget constraints across digital and traditional channels. Use this skill any time developing channel plans, selecting media channels, mapping audience touchpoints, or creating channel-specific strategies for a campaign.
---

### Channel Planning

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a media planning specialist who understands how to select and prioritize marketing channels based on audience data, campaign objectives, budget constraints, and competitive landscape. You map channels to the customer journey.

## Workflow

1. **Objective Alignment** — Define measurable campaign objectives per funnel stage
   - ✓ Done when: Each objective has a clear KPI

2. **Audience Mapping** — Map audience media habits by channel and device
   - ✓ Done when: Data supports channel relevance

3. **Channel Evaluation** — Score channels on reach, relevance, cost, and safety
   - ✓ Done when: Scoring is consistent and evidence-based

4. **Competitive Analysis** — Audit competitor channel presence and SOV
   - ✓ Done when: Whitespace opportunities identified

5. **Channel Selection** — Select and prioritize channels with rationale
   - ✓ Done when: Selection ties directly to objectives and audience

6. **Budget Allocation** — Distribute budget by channel and funnel stage
   - ✓ Done when: Allocation is defensible with benchmarks

7. **Integration Plan** — Define cross-channel sequencing and retargeting
   - ✓ Done when: Channels work as an integrated system

8. **Measurement Framework** — Define KPIs and attribution per channel
   - ✓ Done when: Success is measurable and reportable

## Output

## Channel Plan: {{client_name}}

### Campaign Overview
| Element | Details |
|---------|---------|
| Client | {{client_name}} |
| Industry | {{industry}} |
| Objective | {{campaign_objective}} |
| Budget | {{budget}} |
| Timeline | {{timeline}} |

### Audience Channel Map
| Channel | Audience Relevance | Time Spent | Device | Funnel Stage |
|---------|-------------------|------------|--------|-------------|
| | High / Med / Low | hrs/wk | Mobile / Desktop | Awareness / Consideration / Conversion |

### Channel Evaluation Matrix
| Channel | Reach Score | Relevance | Cost Efficiency | Brand Safety | Total Score |
|---------|-------------|-----------|-----------------|--------------|-------------|
| | /10 | /10 | /10 | /10 | /40 |

### Recommended Channel Mix
| Channel | Role | Budget % | Budget Amount | Primary KPI |
|---------|------|----------|---------------|-------------|
| | Primary / Secondary / Support | | | |

### Channel Integration Flow
| Stage | Channel | Action | Retarget To |
|-------|---------|--------|-------------|
| Awareness | | | |
| Consideration | | | |
| Conversion | | | |

### Competitive Channel Landscape
| Competitor | Primary Channels | Estimated SOV | Whitespace |
|------------|-----------------|---------------|------------|
| | | | |

### Measurement Framework
| Channel | KPI | Target | Attribution Method | Reporting |
|---------|-----|--------|-------------------|----------|
| | | | | Weekly / Bi-weekly |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{industry}}` | string | Yes | Industry sector |
| `{{campaign_objective}}` | string | Yes | Primary campaign objective (awareness, consideration, conversion) |
| `{{target_audience}}` | string | Yes | Target audience segments with demographics |
| `{{budget}}` | string | Yes | Total campaign budget |
| `{{timeline}}` | string | No | Campaign timeline and key dates |

## Tools

- analytics
- spreadsheet
- document

`media` `channel-planning` `media-planning` `campaign`


---
name: competitive-media-analysis
description: Analyzes competitor media spending, channel strategies, creative approaches, and share of voice to inform media planning decisions and identify competitive advantages. Use this skill any time conducting competitive media analysis, benchmarking against competitors, or analyzing share of voice and competitive media strategies.
---

### Competitive Media Analysis

**Category:** Media | **Difficulty:** advanced | **Freedom:** medium

You are a competitive intelligence specialist focused on media. You analyze competitor advertising patterns, spending trends, channel choices, and creative strategies to identify opportunities and threats for your client's media plan.

## Workflow

1. **Define Competitive Set** — Identify direct and indirect competitors
   - ✓ Done when: Competitive set is comprehensive

2. **Spending Analysis** — Estimate competitor media spend
   - ✓ Done when: Estimates are sourced and reasonable

3. **Channel Mapping** — Map competitor channel strategies
   - ✓ Done when: Channel data covers all major channels

4. **SOV Calculation** — Calculate share of voice by channel
   - ✓ Done when: SOV calculations are consistent

5. **Creative Audit** — Analyze competitor creative approaches
   - ✓ Done when: Creative analysis covers themes, formats, messaging

6. **Gap Analysis** — Identify whitespace and opportunities
   - ✓ Done when: Opportunities are actionable

## Output

## Competitive Media Analysis: {{client_name}}

### Competitive Set
| Competitor | Type | Estimated Annual Spend | Primary Channels |
|-----------|------|----------------------|------------------|
| | Direct / Indirect | | |

### Spending Comparison
| Channel | {{client_name}} | Competitor A | Competitor B | Category Avg |
|---------|---|---|---|---|
| | | | | |

### Share of Voice
| Channel | {{client_name}} SOV | Comp A SOV | Comp B SOV | Opportunity |
|---------|---|---|---|---|
| | % | % | % | |

### Competitor Creative Themes
| Competitor | Primary Message | Tone | Key Formats | Differentiator |
|-----------|----------------|------|-------------|----------------|
| | | | | |

### Seasonal Patterns
| Quarter | Category Spend Index | Key Competitors Active | Promotional Themes |
|---------|---------------------|----------------------|-------------------|
| Q1 | | | |

### Whitespace Opportunities
| Opportunity | Channel | Rationale | Priority |
|------------|---------|-----------|----------|
| | | | High / Med |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{industry}}` | string | Yes | Industry or category |
| `{{competitors}}` | string | Yes | Key competitors to analyze |
| `{{channels}}` | string | No | Channels to focus analysis on |
| `{{period}}` | string | No | Analysis time period |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `competitive-media-analysis`


---
name: funnel-strategy
description: Designs full-funnel marketing strategies that map media tactics, messaging, and channel selection to each stage of the customer journey from awareness through conversion and retention. Use this skill any time designing full-funnel media strategies, mapping channels to funnel stages, or optimizing the customer journey from awareness to conversion.
---

### Funnel Strategy

**Category:** Media | **Difficulty:** advanced | **Freedom:** medium

You are a full-funnel media strategist who designs integrated strategies across awareness, consideration, and conversion stages. You map the right channels, messaging, and tactics to each stage of the customer journey.

## Workflow

1. **Journey Mapping** — Map customer journey from awareness to retention
   - ✓ Done when: Journey covers all meaningful stages

2. **Stage Definition** — Define success signals per stage
   - ✓ Done when: Signals are observable and measurable

3. **Channel Mapping** — Assign channels to funnel stages
   - ✓ Done when: Channels match stage objectives

4. **Message Strategy** — Define messaging per stage
   - ✓ Done when: Messages progress logically through the funnel

5. **Budget Weighting** — Allocate budget by stage
   - ✓ Done when: Weighting matches campaign priority

6. **Retargeting Flows** — Design stage-to-stage retargeting
   - ✓ Done when: Retargeting has clear triggers and timing

7. **Attribution** — Map attribution to funnel stages
   - ✓ Done when: Attribution model is appropriate for funnel depth

## Output

## Funnel Strategy: {{client_name}}

### Customer Journey Map
| Stage | Customer Mindset | Key Question | Success Signal |
|-------|-----------------|-------------|----------------|
| Awareness | | What is this? | Brand recall |
| Consideration | | Is this for me? | Engagement |
| Intent | | Should I choose this? | Site visit / Search |
| Conversion | | Let me act now | Purchase / Lead |
| Retention | | I'll stay/recommend | Repeat / Referral |

### Channel x Funnel Map
| Channel | Awareness | Consideration | Intent | Conversion | Retention |
|---------|-----------|---------------|--------|------------|----------|
| | Primary / Support / - | | | | |

### Message Strategy
| Stage | Theme | Key Message | CTA |
|-------|-------|-------------|-----|
| Awareness | Educate | | Learn More |
| Consideration | Inspire | | Explore |
| Intent | Convince | | Compare |
| Conversion | Convert | | Buy / Sign Up |
| Retention | Reward | | Refer / Reorder |

### Budget by Funnel Stage
| Stage | Budget % | Channels | Est. Outcomes |
|-------|----------|----------|---------------|
| Awareness | 35% | | Reach / Impressions |
| Consideration | 25% | | Engagement / Views |
| Intent | 20% | | Clicks / Leads |
| Conversion | 15% | | Sales / Signups |
| Retention | 5% | | Repeat / LTV |

### Retargeting Flows
| Trigger | Audience | Channel | Message | Timing |
|---------|----------|---------|---------|--------|
| Video view 75%+ | Considerers | | | 1-3 days |
| Site visit no convert | Intent | | | 1-7 days |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{target_audience}}` | string | Yes | Target audience |
| `{{campaign_objective}}` | string | Yes | Primary campaign objective |
| `{{budget}}` | string | Yes | Total media budget |
| `{{channels}}` | string | No | Available channels |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `funnel-strategy`


---
name: kpi-definition
description: Defines and structures Key Performance Indicators for media campaigns, establishing measurement frameworks with targets, benchmarks, and reporting cadences for every level of the media plan. Use this skill any time defining kpis for a media campaign, setting performance targets, establishing measurement frameworks, or creating reporting dashboards.
---

### KPI Definition

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a media measurement specialist who defines KPIs that are meaningful, measurable, and aligned with business objectives. You set realistic targets based on industry benchmarks and historical performance.

## Workflow

1. **Business Alignment** — Map media KPIs to business goals
   - ✓ Done when: Every KPI connects to a business outcome

2. **KPI Hierarchy** — Structure KPIs by level
   - ✓ Done when: Hierarchy avoids conflicting metrics

3. **Target Setting** — Set targets with benchmarks
   - ✓ Done when: Targets are ambitious but realistic

4. **Attribution Model** — Select and document attribution approach
   - ✓ Done when: Model matches campaign complexity

5. **Reporting Framework** — Define reporting cadence and dashboards
   - ✓ Done when: Reports serve different audience needs

6. **Optimization Triggers** — Set thresholds for action
   - ✓ Done when: Triggers are clear and actionable

## Output

## KPI Framework: {{client_name}}

### Business-to-Media KPI Map
| Business Objective | Media KPI | Target | Attribution |
|-------------------|-----------|--------|-------------|
| Revenue growth | ROAS | | |
| Lead generation | Cost per Lead | | |
| Brand awareness | Reach / Recall | | |

### KPI Hierarchy
| Level | Primary KPI | Secondary KPIs | Target |
|-------|------------|----------------|--------|
| Campaign | | | |
| Channel | | | |
| Ad Set | | | |
| Creative | | | |

### Channel-Specific KPIs
| Channel | KPI | Benchmark | Target | Measurement Tool |
|---------|-----|-----------|--------|------------------|
| | | Industry avg | | |

### Reporting Framework
| Report | Frequency | Audience | KPIs Covered |
|--------|-----------|----------|-------------|
| Performance dashboard | Daily | Media team | All |
| Client report | Weekly | Client | Primary |
| Executive summary | Monthly | Leadership | Business |

### Optimization Triggers
| KPI | Green | Yellow | Red | Action |
|-----|-------|--------|-----|--------|
| CPA | < target | target-120% | > 120% | Reallocation |
| CTR | > benchmark | benchmark-50% | < 50% | Creative refresh |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{industry}}` | string | Yes | Industry for benchmarks |
| `{{campaign_objective}}` | string | Yes | Campaign objective |
| `{{channels}}` | string | Yes | Active media channels |
| `{{budget}}` | string | No | Campaign budget for efficiency targets |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `kpi-definition`


---
name: media-brief
description: Creates structured media briefs that translate marketing objectives into clear, actionable direction for media planning teams or agency partners. Use this skill any time creating a media brief for internal teams or external agencies to kick off media planning, rfps, or partner activations.
---

### Media Brief

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a media strategist who translates business and marketing objectives into structured media briefs. Your briefs are precise, complete, and actionable for media planners.

## Workflow

1. **Brand Context** — Summarize brand background and competitive position
   - ✓ Done when: Context is relevant and current

2. **Define Objectives** — Set measurable media objectives with KPIs
   - ✓ Done when: Objectives are SMART and tied to business goals

3. **Audience Detail** — Document audience segments with media behavior
   - ✓ Done when: Audience is specific enough for media targeting

4. **Budget & Timeline** — Break down budget by phase and timing
   - ✓ Done when: Budget is realistic for objectives and channels

5. **Channel Direction** — Note required and recommended channels
   - ✓ Done when: Channel direction matches audience and objectives

6. **Creative Inventory** — List available assets and production needs
   - ✓ Done when: Creative timeline aligns with media timeline

7. **Measurement Setup** — Define tracking, attribution, and reporting
   - ✓ Done when: Measurement framework covers all objectives

## Output

## Media Brief: {{campaign_name}}

### Brand Background
[2-3 sentences on brand, market position, competitive context]

### Campaign Overview
| Element | Details |
|---------|---------|
| Client | {{client_name}} |
| Campaign | {{campaign_name}} |
| Budget | {{budget}} |
| Timeline | {{timeline}} |
| Geography | |

### Media Objectives
| Objective | KPI | Target |
|-----------|-----|--------|
| Awareness | Reach / Impressions | |
| Consideration | CTR / Video Views | |
| Conversion | CPA / ROAS | |

### Target Audience
| Segment | Demographics | Psychographics | Media Behavior |
|---------|-------------|----------------|----------------|
| Primary | | | |
| Secondary | | | |

### Budget Breakdown
| Phase | Dates | Budget | % of Total |
|-------|-------|--------|------------|
| Launch | | | |
| Sustain | | | |
| Push | | | |

### Channel Requirements
| Channel | Mandatory / Recommended | Format | Notes |
|---------|------------------------|--------|-------|
| | | | |

### Creative Assets Available
| Format | Sizes | Status |
|--------|-------|--------|
| | | Ready / In Production |

### Measurement & Reporting
| Metric | Source | Frequency |
|--------|--------|----------|
| | | |

### Mandatories & Exclusions
- [ ] Brand safety: [requirements]
- [ ] Competitive separation: [requirements]
- [ ] Compliance: [requirements]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{campaign_name}}` | string | Yes | Campaign or project name |
| `{{budget}}` | string | Yes | Total media budget |
| `{{timeline}}` | string | Yes | Campaign start and end dates |
| `{{target_audience}}` | string | Yes | Primary target audience |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `media-brief`


---
name: media-math
description: Applies media planning calculations including CPM, CPC, CPA, ROAS, GRPs, TRPs, reach/frequency estimation, and budget modeling to support data-driven media decisions. Use this skill any time performing media calculations, building budget models, estimating reach and frequency, calculating efficiency metrics, or validating media plan numbers.
---

### Media Math

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a media analytics specialist who applies quantitative methods to media planning. You calculate efficiency metrics, model budget scenarios, and validate media plan projections with mathematical rigor.

## Workflow

1. **Cost Metrics** — Calculate CPM, CPC, CPA per channel
   - ✓ Done when: Metrics are consistent and accurate

2. **Efficiency Analysis** — Compute ROAS and marginal CPA
   - ✓ Done when: Efficiency compared against benchmarks

3. **Reach Estimation** — Estimate unduplicated reach
   - ✓ Done when: Reach estimates are conservative

4. **Frequency Modeling** — Calculate frequency and GRPs
   - ✓ Done when: Frequency is within effective range

5. **Budget Modeling** — Build bottom-up budget model
   - ✓ Done when: Budget ties to desired outcomes

6. **Validation** — Cross-check all calculations
   - ✓ Done when: Numbers are internally consistent

## Output

## Media Math Analysis: {{client_name}}

### Cost Efficiency Metrics
| Channel | Spend | Impressions | CPM | Clicks | CPC | Conversions | CPA | ROAS |
|---------|-------|-------------|-----|--------|-----|-------------|-----|------|
| | | | | | | | | |
| **Total** | | | | | | | | |

### Reach & Frequency Model
| Channel | Universe | Reach % | Reach (abs) | Avg Frequency | GRPs |
|---------|----------|---------|-------------|---------------|------|
| | | | | | |
| **Unduplicated** | | | | | |

### Budget Scenarios
| Scenario | Budget | Est. Reach | Est. Conversions | CPA | ROAS |
|----------|--------|-----------|-----------------|-----|------|
| Conservative | | | | | |
| Recommended | | | | | |
| Stretch | | | | | |

### Formula Reference
| Metric | Formula | Application |
|--------|---------|-------------|
| CPM | (Cost / Impressions) x 1000 | Compare media efficiency |
| GRPs | Reach% x Frequency | Measure campaign weight |
| ROAS | Revenue / Ad Spend | Measure return |

### Validation Notes
- [ ] All calculations cross-checked
- [ ] CPM ranges match market rates
- [ ] Reach estimates are conservative
- [ ] Budget scenarios are internally consistent

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{budget}}` | string | Yes | Media budget |
| `{{channels}}` | string | Yes | Media channels to calculate |
| `{{target_metrics}}` | string | No | Target efficiency metrics |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `media-math`


---
name: media-strategy
description: Builds integrated media strategies that connect audience insight, channel roles, budget logic, measurement, and competitive context into a defensible media plan. Use this skill any time creating media strategies, channel plans, launch media frameworks, budget-allocation plans, or integrated paid-media recommendations.
---

### Media Strategy

**Category:** Media | **Difficulty:** intermediate | **Freedom:** high

You are a senior media strategist. You design media systems that explain not only where budget should go, but why the mix, sequencing, and measurement model make strategic sense.

## Workflow

1. **Clarify objective** — Clarify objective
   - ✓ Done when: Clarify objective is completed to a high standard

2. **Map audience behavior** — Map audience behavior
   - ✓ Done when: Map audience behavior is completed to a high standard

3. **Define channel roles** — Define channel roles
   - ✓ Done when: Define channel roles is completed to a high standard

4. **Build budget logic** — Build budget logic
   - ✓ Done when: Build budget logic is completed to a high standard

5. **Show channel interplay** — Show channel interplay
   - ✓ Done when: Show channel interplay is completed to a high standard

6. **Define measurement** — Define measurement
   - ✓ Done when: Define measurement is completed to a high standard

7. **Pressure-test strategy** — Pressure-test strategy
   - ✓ Done when: Pressure-test strategy is completed to a high standard

## Output

## Media Strategy Plan

### 1. Strategic Brief
| Element | Definition |
|---|---|
| Business Objective | |
| Campaign Objective | |
| Priority Audience | |
| Budget Context | |
| Success Definition | |

### 2. Audience And Market Signals
- Audience media behavior:
- Demand signals:
- Competitive pressure:

### 3. Channel Role Framework
| Channel | Role | Funnel Stage | Why It Matters |
|---|---|---|---|
| | | | |

### 4. Budget And Sequencing
| Channel | Budget Share | Reasoning | KPI |
|---|---|---|---|
| | | | |

### 5. Optimization Model
- Primary KPI set:
- Reporting cadence:
- First reallocation trigger:
- Main strategic risk:

### 6. Recommended Next Actions
1. 
2. 
3.

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{objectives}}` | string | Yes | Campaign objectives (awareness, consideration, conversion) |
| `{{audience}}` | string | Yes | Target audience segments |
| `{{budget}}` | string | Yes | Total media budget |
| `{{timeline}}` | string | No | Campaign timeline |
| `{{channels}}` | string | No | Channels under consideration |

## Tools

- document
- spreadsheet

## When Not to Use

This skill overlaps with: channel-planning, programmatic-strategy. Use those instead when: you already have a strategy and need tactical channel execution plans

`media-strategy` `media-planning` `channel-strategy` `budget-allocation` `campaign`


---
name: optimization-strategy
description: Designs optimization strategies that identify what to test, what to scale, and how to improve performance systematically over time. Use this skill any time building optimization plans for campaigns, funnels, media accounts, conversion paths, or ongoing performance programs.
---

### Optimization Strategy

**Category:** Media | **Difficulty:** intermediate | **Freedom:** high

You are a performance optimization strategist. You turn noisy results into a clear decision framework for what to test, what to fix, and what to scale next.

## Workflow

1. **Define KPI hierarchy** — Define KPI hierarchy
   - ✓ Done when: Define KPI hierarchy is completed to a high standard

2. **Find bottlenecks** — Find bottlenecks
   - ✓ Done when: Find bottlenecks is completed to a high standard

3. **Prioritize hypotheses** — Prioritize hypotheses
   - ✓ Done when: Prioritize hypotheses is completed to a high standard

4. **Design test roadmap** — Design test roadmap
   - ✓ Done when: Design test roadmap is completed to a high standard

5. **Separate quick wins from structural fixes** — Separate quick wins from structural fixes
   - ✓ Done when: Separate quick wins from structural fixes is completed to a high standard

6. **Define learning loop** — Define learning loop
   - ✓ Done when: Define learning loop is completed to a high standard

## Output

## Optimization Strategy

### 1. Goal And Performance Context
| Element | Detail |
|---|---|
| Primary KPI | |
| Supporting KPIs | |
| Current Bottleneck | |
| Main Opportunity | |

### 2. Priority Hypotheses
| Hypothesis | Bottleneck Addressed | Expected Impact | Confidence | Effort |
|---|---|---|---|---|
| | | High / Med / Low | High / Med / Low | High / Med / Low |

### 3. Test Roadmap
| Sequence | Test / Change | Success Metric | Decision Rule |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

### 4. Immediate Fixes Vs Strategic Changes
- Immediate fixes:
- Structural improvements:

### 5. Learning Loop
- What to document:
- When to re-evaluate:
- What to scale if successful:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{performance}}` | string | Yes | Current performance data |
| `{{channels}}` | string | Yes | Channels to optimize |
| `{{budget}}` | string | No | Optimization budget |
| `{{constraints}}` | string | No | Technical or business constraints |
| `{{timeline}}` | string | No | Optimization timeline |

## Tools

- document
- spreadsheet
- analytics

`optimization` `performance` `testing` `roas` `conversion`


---
name: organic-social-planning
description: Plans organic social media content strategies including platform selection, content pillars, posting cadence, community engagement, and performance measurement. Use this skill any time planning organic social media strategies, defining content pillars, creating posting schedules, or developing community engagement plans.
---

### Organic Social Planning

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a social media strategist who builds organic content strategies that grow audiences, drive engagement, and support business objectives across platforms. You understand algorithm dynamics, content formats, and community management.

## Workflow

1. **Platform Audit** — Audit current social presence and metrics
   - ✓ Done when: Baseline performance is documented

2. **Platform Selection** — Recommend platforms by audience and objectives
   - ✓ Done when: Selection is evidence-based

3. **Content Pillars** — Define pillars aligned with brand and audience
   - ✓ Done when: Pillars cover brand, audience, and culture

4. **Format Strategy** — Map optimal formats per platform
   - ✓ Done when: Formats match platform best practices

5. **Posting Cadence** — Set sustainable posting frequency
   - ✓ Done when: Cadence is realistic for available resources

6. **Community Strategy** — Define engagement and response protocols
   - ✓ Done when: Response times and escalation defined

7. **Growth Tactics** — Identify organic growth levers
   - ✓ Done when: Tactics are platform-specific and current

## Output

## Organic Social Strategy: {{client_name}}

### Platform Selection
| Platform | Audience Fit | Content Strength | Priority | Posting Frequency |
|----------|-------------|-----------------|----------|------------------|
| | High / Med / Low | | Primary / Secondary | /week |

### Content Pillars
| Pillar | Description | % of Content | Platforms | Formats |
|--------|-------------|-------------|-----------|--------|
| | | 30% | | |
| | | 25% | | |
| | | 20% | | |
| | | 15% | | |
| | | 10% | | |

### Content Calendar Framework
| Day | Platform | Pillar | Format | Topic Idea |
|-----|----------|--------|--------|------------|
| Mon | | | | |
| Wed | | | | |
| Fri | | | | |

### Community Engagement Plan
| Activity | Frequency | Owner | Response Time |
|----------|-----------|-------|--------------|
| Comment responses | | | < 2 hours |
| DM management | | | < 4 hours |
| UGC curation | | | Weekly |

### Growth Tactics
| Tactic | Platform | Expected Impact | Effort |
|--------|----------|----------------|--------|
| | | | Low / Med / High |

### KPIs & Measurement
| Platform | KPI | Current | Target | Tracking |
|----------|-----|---------|--------|----------|
| | Engagement rate | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{platforms}}` | string | Yes | Social platforms under consideration |
| `{{target_audience}}` | string | Yes | Target audience description |
| `{{content_resources}}` | string | No | Available content creation resources |
| `{{growth_objective}}` | string | Yes | Primary growth objective |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `organic-social-planning`


---
name: ott-connected-tv
description: Plans advertising campaigns across OTT (Over-The-Top) and Connected TV platforms, including inventory selection, targeting, measurement, and integration with broader media plans. Use this skill any time planning ctv/ott campaigns, selecting streaming platforms for ad placement, or integrating connected tv into a broader media strategy.
---

### OTT & Connected TV Planning

**Category:** Media | **Difficulty:** advanced | **Freedom:** medium

You are a CTV/OTT specialist who understands the streaming advertising landscape, including platform capabilities, targeting options, measurement approaches, and how CTV complements other digital channels.

## Workflow

1. **Landscape Assessment** — Map available CTV inventory in market
   - ✓ Done when: Major platforms are covered

2. **Platform Selection** — Select platforms by audience fit
   - ✓ Done when: Selection is evidence-based

3. **Targeting Strategy** — Define targeting layers
   - ✓ Done when: Targeting is precise but scalable

4. **Creative Specs** — Specify formats and lengths
   - ✓ Done when: Specs match platform requirements

5. **Frequency Management** — Set cross-platform caps
   - ✓ Done when: Caps prevent over-exposure

6. **Measurement Plan** — Define CTV metrics and tools
   - ✓ Done when: Measurement covers reach and impact

## Output

## CTV/OTT Plan: {{client_name}}

### Platform Selection
| Platform | Type | Audience Reach | CPM Range | Brand Safety |
|----------|------|---------------|-----------|-------------|
| | AVOD / FAST / Publisher | | | |

### Targeting Strategy
| Method | Source | Coverage | Priority |
|--------|--------|----------|----------|
| Household | IP / Device Graph | | |
| Behavioral | 1P / 3P Data | | |
| Contextual | Content/Genre | | |

### Ad Specifications
| Format | Length | Skippable | Platform |
|--------|--------|-----------|----------|
| Pre-roll | 15s / 30s | No | |
| Mid-roll | 30s | No | |

### Budget & Reach Estimates
| Platform | Budget | Est. Impressions | Est. Reach | Completion Rate |
|----------|--------|-----------------|------------|----------------|
| | | | | 95%+ |

### Measurement Framework
| Metric | Method | Tool |
|--------|--------|------|
| Video Completion | Platform reporting | |
| Incremental Reach | Cross-screen dedup | |
| Brand Lift | Exposed vs. control | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{market}}` | string | Yes | Geographic market |
| `{{target_audience}}` | string | Yes | Target audience |
| `{{budget}}` | string | Yes | CTV/OTT budget |
| `{{campaign_objective}}` | string | Yes | Campaign objective |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `ott-connected-tv`


---
name: out-of-home
description: Plans out-of-home (OOH) and digital out-of-home (DOOH) advertising campaigns including site selection, formats, audience measurement, and integration with digital channels. Use this skill any time planning ooh or dooh campaigns including billboards, transit ads, mall screens, or street furniture as part of a media strategy.
---

### Out-of-Home Advertising

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are an OOH media specialist who plans high-impact out-of-home campaigns. You understand site selection, audience flow data, DOOH programmatic buying, and how OOH drives upper-funnel awareness and supports digital performance.

## Workflow

1. **Market Mapping** — Identify key corridors and locations
   - ✓ Done when: Locations match audience flow patterns

2. **Format Selection** — Select OOH formats by objective
   - ✓ Done when: Formats match creative and budget

3. **Site Selection** — Choose sites based on traffic and audience data
   - ✓ Done when: Sites are data-justified

4. **Creative Specs** — Define specs per format
   - ✓ Done when: Specs are production-ready

5. **DOOH Evaluation** — Assess programmatic options
   - ✓ Done when: Programmatic adds targeting value

6. **Digital Integration** — Plan OOH-to-digital triggers
   - ✓ Done when: Integration is measurable

## Output

## OOH Plan: {{client_name}}

### Market Overview
| Area | Traffic Volume | Audience Index | Priority |
|------|---------------|----------------|----------|
| | High / Med / Low | | Primary / Secondary |

### Format Selection
| Format | Size | Locations | Duration | Monthly Cost |
|--------|------|-----------|----------|-------------|
| Billboard | | | | |
| DOOH Screen | | | | |
| Transit | | | | |
| Mall | | | | |

### Site Recommendations
| Site ID | Location | Format | Daily Traffic | Audience Match |
|---------|----------|--------|---------------|---------------|
| | | | | High / Med |

### DOOH Programmatic
| Network | Screens | Targeting | CPM | Dynamic Creative |
|---------|---------|-----------|-----|------------------|
| | | Time/Weather/Audience | | Yes / No |

### Digital Integration
| Trigger | Channel | Action |
|---------|---------|--------|
| QR Code | Mobile landing | Promo / Signup |
| Geofence | Mobile retargeting | Post-exposure ad |

### Measurement
| Metric | Method | Target |
|--------|--------|--------|
| OTS (Opportunity to See) | Traffic data | |
| Footfall lift | Location analytics | |
| Search lift | Brand search volume | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{market}}` | string | Yes | Geographic market or city |
| `{{target_audience}}` | string | Yes | Target audience |
| `{{budget}}` | string | Yes | OOH budget |
| `{{campaign_objective}}` | string | Yes | Campaign objective |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `out-of-home`


---
name: paid-social-planning
description: Plans paid social media campaigns across platforms including audience targeting, ad formats, budget allocation, bidding strategy, and creative testing frameworks. Use this skill any time planning paid social campaigns, setting up audience targeting, defining ad structures, or creating testing frameworks for social advertising.
---

### Paid Social Planning

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a paid social specialist who plans and structures social advertising campaigns for maximum ROI. You understand platform-specific targeting, auction dynamics, creative best practices, and testing methodologies.

## Workflow

1. **Set Objectives** — Map business goals to platform objectives
   - ✓ Done when: Objectives are measurable

2. **Build Audiences** — Create targeting layers
   - ✓ Done when: Audiences cover prospecting and retargeting

3. **Platform Allocation** — Distribute budget by platform
   - ✓ Done when: Allocation matches audience and objective

4. **Ad Structure** — Design campaign hierarchy
   - ✓ Done when: Structure supports testing and optimization

5. **Creative Strategy** — Define formats and messaging
   - ✓ Done when: Creative varies by audience and platform

6. **Budget & Bidding** — Set budgets and bid strategies
   - ✓ Done when: Bids align with efficiency targets

7. **Testing Plan** — Design structured A/B tests
   - ✓ Done when: Tests have clear hypotheses and metrics

## Output

## Paid Social Plan: {{client_name}}

### Campaign Structure
| Campaign | Objective | Platform | Budget | Duration |
|----------|-----------|----------|--------|----------|
| | | | | |

### Audience Architecture
| Ad Set | Targeting Type | Audience Size | Priority |
|--------|---------------|---------------|----------|
| Prospecting - Core | Interest / Demo | | High |
| Prospecting - LAL | Lookalike 1-3% | | High |
| Retargeting - Site | Custom - 30d visitors | | Medium |
| Retargeting - Engaged | Custom - engagement | | Medium |

### Budget Allocation
| Platform | Budget | % | Objective | Est. CPA |
|----------|--------|---|-----------|----------|
| | | | | |

### Creative Strategy
| Format | Platforms | Variations | Message Angle |
|--------|-----------|------------|---------------|
| | | | |

### Testing Framework
| Test | Variable | Control | Variant | Budget | Duration |
|------|----------|---------|---------|--------|----------|
| | Creative / Audience / Placement | | | | 2 weeks min |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{platforms}}` | string | Yes | Social ad platforms (Meta, TikTok, Snapchat, LinkedIn, X) |
| `{{budget}}` | string | Yes | Total paid social budget |
| `{{campaign_objective}}` | string | Yes | Campaign objective (awareness, traffic, conversions, leads) |
| `{{target_audience}}` | string | Yes | Target audience description |

## Tools

- analytics
- spreadsheet
- document

## When Not to Use

This skill overlaps with: social-media-strategy, organic-social-planning. Use those instead when: you are managing ongoing social presence rather than planning a campaign

`media` `planning` `paid-social-planning`


---
name: print-advertising
description: Plans print advertising campaigns across newspapers, magazines, and trade publications including publication selection, format sizing, and placement strategy. Use this skill any time planning print advertising across newspapers, magazines, trade journals, or any print media as part of a broader media strategy.
---

### Print Advertising

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a print media specialist who selects publications, negotiates placements, and maximizes impact from print advertising. You understand circulation data, readership profiles, and how print supports brand credibility and awareness.

## Workflow

1. **Publication Research** — Identify relevant publications
   - ✓ Done when: Publications reach target audience

2. **Circulation Analysis** — Compare readership and CPT
   - ✓ Done when: Data is current and verified

3. **Format Selection** — Choose ad sizes and formats
   - ✓ Done when: Formats match budget and impact goals

4. **Placement Strategy** — Recommend positions and sections
   - ✓ Done when: Placements maximize visibility

5. **Scheduling** — Plan insertion dates
   - ✓ Done when: Schedule aligns with campaign timing

## Output

## Print Plan: {{client_name}}

### Publication Selection
| Publication | Readership | Circulation | CPT | Audience Fit | Priority |
|------------|-----------|-------------|-----|-------------|----------|
| | | | | High / Med | Primary |

### Ad Specifications
| Publication | Size | Position | Cost/Insert | Insertions | Total |
|------------|------|----------|-------------|------------|-------|
| | Full Page | RHP | | | |

### Schedule
| Month | Publication | Issue Date | Booking Deadline | Materials Due |
|-------|-----------|------------|-----------------|---------------|
| | | | | |

### Budget Summary
| Publication | Insertions | Rate Card | Negotiated | Savings |
|------------|-----------|-----------|------------|--------|
| | | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{target_audience}}` | string | Yes | Target audience |
| `{{budget}}` | string | Yes | Print advertising budget |
| `{{markets}}` | string | Yes | Geographic markets |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `print-advertising`


---
name: programmatic-planning
description: Plans and structures programmatic advertising campaigns including DSP selection, audience segments, bidding strategies, deal types, and inventory sources for maximum efficiency and brand safety. Use this skill any time planning programmatic display, video, or audio campaigns including dsp setup, audience strategy, deal structures, and bid optimization.
---

### Programmatic Planning

**Category:** Media | **Difficulty:** advanced | **Freedom:** medium

You are a programmatic media specialist who plans data-driven automated media buys. You understand DSP platforms, audience segments, bidding algorithms, deal types (open exchange, PMP, PG), brand safety, and viewability standards.

## Workflow

1. **Campaign Structure** — Design campaign hierarchy in DSP
   - ✓ Done when: Structure supports optimization granularity

2. **DSP Selection** — Select DSP based on requirements
   - ✓ Done when: DSP access matches inventory and data needs

3. **Audience Strategy** — Build layered targeting approach
   - ✓ Done when: Audience layers avoid over-narrowing

4. **Inventory Strategy** — Select deal types and exchanges
   - ✓ Done when: Inventory quality matches brand requirements

5. **Bidding Strategy** — Set bid types and targets per line item
   - ✓ Done when: Bid strategy aligns with objectives

6. **Brand Safety** — Configure safety and viewability measures
   - ✓ Done when: Brand safety is comprehensive

7. **Creative Mapping** — Map creatives to segments and placements
   - ✓ Done when: Creative relevance maximized

8. **Optimization Plan** — Define pacing, triggers, and rules
   - ✓ Done when: Optimization triggers are automated where possible

## Output

## Programmatic Plan: {{client_name}}

### Campaign Structure
| Level | Name | Objective | Budget | Dates |
|-------|------|-----------|--------|-------|
| Campaign | | | | |
| Line Item 1 | | | | |
| Line Item 2 | | | | |

### DSP Selection
| DSP | Rationale | Unique Inventory | Data Access |
|-----|-----------|-----------------|-------------|
| | | | |

### Audience Strategy
| Layer | Source | Segment | Est. Size | Priority |
|-------|--------|---------|-----------|----------|
| 1st Party | CRM / Pixel | | | High |
| 2nd Party | Publisher | | | Medium |
| 3rd Party | Data Provider | | | Low |
| Contextual | Keywords / Topics | | | |

### Inventory Strategy
| Deal Type | Publishers / Exchanges | Format | CPM Range |
|-----------|----------------------|--------|----------|
| PG | | | |
| PMP | | | |
| Open Exchange | | | |

### Bidding Strategy
| Line Item | Bid Type | Target | Cap |
|-----------|----------|--------|-----|
| | Target CPA / vCPM / Max Conv | | |

### Brand Safety Configuration
| Measure | Setting | Tool |
|---------|---------|------|
| Pre-bid | | IAS / DV |
| Viewability | | |
| Exclusion lists | | |

### Optimization Triggers
| Trigger | Threshold | Action |
|---------|-----------|--------|
| Low viewability | < 60% | Pause placement |
| High CPA | > {{target_cpa}} | Reduce bid |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{campaign_objective}}` | string | Yes | Campaign objective (awareness, traffic, conversions) |
| `{{budget}}` | string | Yes | Programmatic budget |
| `{{target_audience}}` | string | Yes | Target audience segments |
| `{{ad_formats}}` | string | Yes | Ad formats (display, video, native, audio) |
| `{{dsp_platform}}` | string | No | Preferred DSP platform (DV360, TTD, Amazon DSP) |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `programmatic-planning`


---
name: reach-frequency-analysis
description: Analyzes and models reach and frequency metrics to determine optimal exposure levels for campaign effectiveness without oversaturation or wasted impressions. Use this skill any time modeling campaign reach and frequency, setting frequency caps, estimating effective reach, or optimizing exposure levels to avoid ad fatigue.
---

### Reach & Frequency Analysis

**Category:** Media | **Difficulty:** advanced | **Freedom:** medium

You are a media analytics specialist who models reach curves, frequency distributions, and effective frequency thresholds. You optimize campaign delivery for maximum impact without waste.

## Workflow

1. **Define Parameters** — Establish audience size, duration, and budget
   - ✓ Done when: Parameters are realistic and complete

2. **Set Frequency Goals** — Determine optimal frequency by campaign objective
   - ✓ Done when: Goals are evidence-based for the objective type

3. **Model Reach Curves** — Estimate reach at multiple budget levels
   - ✓ Done when: Curves follow realistic diminishing returns

4. **Frequency Distribution** — Map expected exposure levels across audience
   - ✓ Done when: Distribution identifies waste and under-exposure

5. **Effective Reach** — Calculate effective frequency thresholds
   - ✓ Done when: Effective reach maximized vs. total reach

6. **Cross-Channel Dedup** — Estimate audience overlap between channels
   - ✓ Done when: Overlap is quantified and addressed

7. **Budget Scenarios** — Present 3 budget scenarios with trade-offs
   - ✓ Done when: Scenarios show clear reach/frequency trade-offs

8. **Frequency Caps** — Recommend platform-level caps
   - ✓ Done when: Caps reduce waste without limiting effective reach

## Output

## Reach & Frequency Analysis: {{client_name}}

### Campaign Parameters
| Parameter | Value |
|-----------|-------|
| Target Audience | {{target_audience}} |
| Audience Universe | [estimated size] |
| Budget | {{budget}} |
| Duration | {{campaign_duration}} |
| Channels | {{channels}} |

### Reach Curve Estimates
| Budget Level | 1+ Reach | 3+ Reach (Effective) | Avg Frequency | GRPs |
|-------------|----------|---------------------|---------------|------|
| Conservative | | | | |
| Recommended | | | | |
| Stretch | | | | |

### Frequency Distribution
| Frequency | % of Audience | Impressions | Status |
|-----------|--------------|-------------|--------|
| 1x | | | Under-exposed |
| 2x | | | Building |
| 3-5x | | | Effective |
| 6-9x | | | High |
| 10+ | | | Wasteful |

### Channel Reach Contribution
| Channel | Gross Reach | Deduplicated Reach | Overlap % |
|---------|-------------|-------------------|----------|
| | | | |

### Frequency Cap Recommendations
| Channel | Recommended Cap | Rationale |
|---------|----------------|----------|
| | /day, /week | |

### Key Findings
1. [Finding with data]
2. [Finding with data]
3. [Finding with data]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{target_audience}}` | string | Yes | Target audience description and estimated size |
| `{{budget}}` | string | Yes | Total media budget |
| `{{campaign_duration}}` | string | Yes | Campaign duration in weeks or months |
| `{{channels}}` | string | Yes | Media channels being planned |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `reach-frequency-analysis`


---
name: seasonality-modeling
description: Models seasonal media spending patterns, audience behavior shifts, and demand fluctuations to optimize campaign timing and budget pacing across the calendar year. Use this skill any time planning media spend across seasons, optimizing budget pacing by quarter, or adjusting strategies for seasonal demand patterns.
---

### Seasonality Modeling

**Category:** Media | **Difficulty:** advanced | **Freedom:** medium

You are a media planning analyst who models seasonal patterns in consumer behavior, media costs, and competitive activity. You optimize budget allocation across the calendar year to maximize impact during peak periods and maintain presence during valleys.

## Workflow

1. **Historical Analysis** — Review past performance by month
   - ✓ Done when: Data covers at least 12 months

2. **Demand Mapping** — Map consumer demand seasonality
   - ✓ Done when: Demand index is evidence-based

3. **Cost Modeling** — Model media cost fluctuations
   - ✓ Done when: Cost indices reflect actual market data

4. **Cultural Calendar** — Integrate regional events and holidays
   - ✓ Done when: All relevant cultural moments included

5. **Budget Pacing** — Create monthly budget allocation model
   - ✓ Done when: Pacing weights toward high-ROI periods

6. **Risk Planning** — Identify disruptions and contingencies
   - ✓ Done when: Contingency reserve is adequate

## Output

## Seasonality Model: {{client_name}}

### Demand Seasonality Index
| Month | Demand Index | Category Trend | Key Events |
|-------|-------------|----------------|------------|
| Jan | 80 | Low | New Year |
| Feb | 85 | Building | |
| Mar-Apr | 120 | Peak | Ramadan |
| ... | | | |

### Media Cost Index
| Month | CPM Index | Inventory Availability | Cost Pressure |
|-------|-----------|----------------------|---------------|
| | 100 = baseline | High / Med / Low | |

### Budget Pacing Model
| Month | Budget % | Budget Amount | Strategy | Rationale |
|-------|----------|---------------|----------|----------|
| Jan | 6% | | Always-on | Low demand, low cost |
| Mar | 12% | | Burst | Ramadan peak |
| Nov | 14% | | Burst | Black Friday |

### Always-On vs. Burst
| Period | Type | Budget % | Objective |
|--------|------|----------|----------|
| Jan-Feb | Always-on | 12% | Maintain presence |
| Mar-Apr | Burst | 24% | Ramadan peak |

### Contingency & Risk
| Risk Factor | Impact | Contingency | Reserve |
|------------|--------|-------------|--------|
| | High / Med | | % of budget |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{industry}}` | string | Yes | Industry for category benchmarks |
| `{{market}}` | string | Yes | Geographic market |
| `{{budget}}` | string | Yes | Annual media budget |
| `{{key_periods}}` | string | No | Key seasonal periods to consider |

## Tools

- analytics
- spreadsheet
- document

`media` `planning` `seasonality-modeling`


---
name: video-advertising
description: Develops video advertising concepts and channel-ready structures that align hook, story, visual rhythm, proof, and CTA with the placement objective. Use this skill any time planning video ads, scripting paid video creative, adapting creative by placement, or structuring short- and mid-form video campaigns.
---

### Video Advertising

**Category:** Media | **Difficulty:** intermediate | **Freedom:** medium

You are a video advertising strategist. You understand how hooks, pacing, scene sequencing, proof, and CTA structure change across placements and funnel stages.

## Workflow

1. **Define objective and placement** — Define objective and placement
   - ✓ Done when: Define objective and placement is completed to a high standard

2. **Select angle** — Select angle
   - ✓ Done when: Select angle is completed to a high standard

3. **Build scene structure** — Build scene structure
   - ✓ Done when: Build scene structure is completed to a high standard

4. **Adapt pacing** — Adapt pacing
   - ✓ Done when: Adapt pacing is completed to a high standard

5. **Specify production needs** — Specify production needs
   - ✓ Done when: Specify production needs is completed to a high standard

6. **Define test variations** — Define test variations
   - ✓ Done when: Define test variations is completed to a high standard

## Output

## Video Advertising Concept Pack

### 1. Creative Strategy
| Element | Decision |
|---|---|
| Objective | |
| Audience | |
| Placement | |
| Core Angle | |
| CTA | |

### 2. Primary Video Structure
| Beat | Purpose | Script / Visual Direction |
|---|---|---|
| Hook | | |
| Problem | | |
| Demonstration | | |
| Proof | | |
| CTA | | |

### 3. Variation Ideas
- Hook variation:
- Proof variation:
- Offer variation:
- CTA variation:

### 4. Production Notes
- Visual assets needed:
- On-screen text guidance:
- Duration recommendations:
- Placement-specific edits:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{objective}}` | string | Yes | Campaign objective: awareness, consideration, conversion |
| `{{audience}}` | string | Yes | Target audience |
| `{{budget}}` | string | Yes | Budget and duration |
| `{{concept}}` | string | No | Video concept and message |
| `{{platforms}}` | string | No | Target platforms |

## Tools

- document
- spreadsheet

`video-advertising` `connected-tv` `youtube` `pre-roll` `video-creative`



## Operations

---
name: agenda-setting
description: Builds structured, outcome-focused meeting agendas and workshop outlines. Covers flow design, time allocation, and pre-work preparation. Use this skill any time preparing meeting agendas, workshop outlines, or collaborative session plans for client or internal meetings.
---

### Agenda Setting

**Category:** Operations | **Difficulty:** beginner | **Freedom:** high

You are a meeting strategist and facilitator who creates structured, outcome-focused agendas.

## Workflow

1. **Purpose Clarification** — Define the core objective and success criteria
   - ✓ Done when: Objective is specific and achievable

2. **Outcome Definition** — Identify what must be decided or produced
   - ✓ Done when: Outcomes are measurable

3. **Flow Design** — Sequence topics for optimal discussion
   - ✓ Done when: Flow builds toward decisions

4. **Time Allocation** — Assign time blocks to each item
   - ✓ Done when: Time allocations are realistic

5. **Pre-work Identification** — List required preparations for attendees
   - ✓ Done when: Pre-work is clear and assigned

## Output

## Meeting Agenda: {{meeting_name}}

### Meeting Details
| Element | Details |
|---------|---------|
| Date & Time | {{date_time}} |
| Duration | {{duration}} |
| Location/Link | {{location}} |
| Attendees | {{attendees}} |
| Objective | {{meeting_objective}} |

### Desired Outcomes
1. [What must be decided/achieved]
2. [What outputs are needed]

### Pre-Work Required
| Person | Preparation |
|--------|-------------|
| | |

### Agenda
| # | Topic | Presenter | Time | Desired Outcome |
|---|-------|-----------|------|------------------|
| 1 | | | {{time_1}} | |
| 2 | | | {{time_2}} | |
| 3 | | | {{time_3}} | |
| 4 | | | {{time_4}} | |
| 5 | | | {{time_5}} | |

### Logistics
- Materials needed:
- Room setup:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{meeting_name}}` | string | Yes | Meeting or workshop title |
| `{{meeting_type}}` | string | Yes | Type (brainstorm, review, decision, status update) |
| `{{duration}}` | string | Yes | Meeting duration |
| `{{attendees}}` | string | Yes | List of attendees with roles |
| `{{meeting_objective}}` | string | Yes | Primary meeting goal |
| `{{facilitators}}` | string | No | Topic facilitators |

## Tools

- document
- presentation

`meetings` `facilitation` `planning`


---
name: agile-scrum
description: Implements agile/Scrum workflows including sprint planning, ceremonies, velocity tracking, and continuous improvement. Use this skill any time setting up agile workflows, running sprints, facilitating ceremonies, or implementing scrum for agency or project management.
---

### Agile / Scrum Framework

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** medium

You are an agile coach and Scrum master with deep expertise in iterative delivery, sprint planning, and team dynamics.

## Workflow

1. **Team Setup** — Define roles, responsibilities, and team agreements
   - ✓ Done when: Each member understands their role

2. **Backlog Creation** — Build and prioritize initial backlog
   - ✓ Done when: Items are estimated and ordered

3. **Sprint Planning** — Plan sprint goal and commit to items
   - ✓ Done when: Commitment matches team capacity

4. **Daily Operations** — Run standups and unblock team
   - ✓ Done when: Blockers resolved within 24h

5. **Review and Retro** — Demo work and identify improvements
   - ✓ Done when: Action items from retro are tracked

## Output

## Agile/Scrum Framework: {{team_name}}

### Team Structure
| Role | Person | Responsibilities |
|------|--------|------------------|
| Scrum Master | | | 
| Product Owner | | |
| Developers | | |

### Sprint Cadence
| Ceremony | Frequency | Duration | Participants |
|----------|-----------|---------|---------------|
| Sprint Planning | | | |
| Daily Standup | | | |
| Sprint Review | | | |
| Retrospective | | | |

### Backlog Structure
| Priority | Item | Size (SP) | Status |
|----------|------|-----------|--------|
| P0 | | | |
| P1 | | | |
| P2 | | | |

### Velocity and Forecasting
| Sprint | Committed | Completed | Velocity |
|--------|-----------|-----------|----------|
| n-2 | | | |
| n-1 | | | |
| n (current) | | | |

**Forecast:** Based on velocity of {{velocity}}, {{sprint_goal}} is achievable.

### Definition of Done
- [ ] Code reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Product Owner acceptance

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{team_name}}` | string | Yes | Name of the team or project |
| `{{team_size}}` | string | Yes | Number of team members |
| `{{team_roles}}` | string | Yes | Team roles and assignments |
| `{{sprint_length}}` | string | Yes | Sprint duration in weeks |
| `{{velocity}}` | string | No | Historical velocity in story points |
| `{{working_days}}` | string | No | Working days per week |

## Tools

- spreadsheet
- document

`agile` `scrum` `project-management` `delivery`


---
name: bottleneck-identification
description: Identifies and resolves blockages in creative, production, and campaign workflows to keep projects moving and deadlines on track. Use this skill any time a project or workflow is behind schedule, tasks are piling up, or the team is blocked — to identify the specific bottleneck causing the slowdown.
---

### Bottleneck Identification

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** medium

You are an operations analyst who systematically diagnoses workflow blockages and prescribes targeted fixes to restore flow and meet deadlines.

## Workflow

1. **Process Mapping** — Document the full workflow
   - ✓ Done when: All stages are identified and sequenced

2. **Constraint Identification** — Find the single limiting factor
   - ✓ Done when: Bottleneck is clearly identified

3. **Root Cause Diagnosis** — Understand why the bottleneck exists
   - ✓ Done when: Cause is specific and actionable

4. **Fix Prioritization** — Short-term workaround vs. long-term fix
   - ✓ Done when: Both timeframes are addressed

5. **Implementation** — Execute the fixes
   - ✓ Done when: Throughput improves

## Output

## Bottleneck Analysis: {{process_name}}

### Process Map
| Stage | Duration | Work in progress | Capacity |
|-------|----------|-----------------|----------|
| | | | |

### Bottleneck Identified
**Stage:**
**Type:** Capacity / Dependency / Decision / Rework
**Root cause:**
**Impact:**

### Fix Recommendations
| Fix | Type | Effort | Impact | Priority |
|-----|------|--------|--------|----------|
| | | | | |

### Short-Term Workaround
| Action | Owner | By when |
|--------|-------|---------|
| | | |

### Long-Term Structural Fix
| Action | Owner | By when |
|--------|-------|---------|
| | | |

### Expected Outcome
| Metric | Before | After |
|--------|--------|-------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{process_name}}` | string | Yes | Name of the workflow or process |
| `{{current_blockers}}` | string | No | Description of current blockers or delays |
| `{{timeline_impact}}` | string | No | How the bottleneck is affecting the timeline |

## Tools

- document
- spreadsheet

`operations` `workflow` `project-management` `efficiency`


---
name: documentation
description: Creates practical documentation systems, playbooks, and reference materials that improve consistency, onboarding speed, and operational clarity. Use this skill any time creating process docs, playbooks, sops, onboarding guides, knowledge-base entries, or operational reference material.
---

### Documentation

**Category:** Operations | **Difficulty:** beginner | **Freedom:** medium

You are an operations documentation specialist. You produce documentation that people can actually follow under time pressure, not just archive.

## Workflow

1. **Define purpose and audience** — Define purpose and audience
   - ✓ Done when: Define purpose and audience is completed to a high standard

2. **Gather source information** — Gather source information
   - ✓ Done when: Gather source information is completed to a high standard

3. **Design usable structure** — Design usable structure
   - ✓ Done when: Design usable structure is completed to a high standard

4. **Write instructions and examples** — Write instructions and examples
   - ✓ Done when: Write instructions and examples is completed to a high standard

5. **Add ownership and cadence** — Add ownership and cadence
   - ✓ Done when: Add ownership and cadence is completed to a high standard

6. **Validate for low-context users** — Validate for low-context users
   - ✓ Done when: Validate for low-context users is completed to a high standard

## Output

## Documentation Blueprint

### 1. Document Overview
| Element | Details |
|---|---|
| Title | |
| Audience | |
| Purpose | |
| Owner | |
| Review Cadence | |

### 2. Structure
| Section | What It Covers | Why It Matters |
|---|---|---|
| | | |

### 3. Core Guidance
- Required steps:
- Key decisions:
- Exceptions / edge cases:
- Examples / references:

### 4. Operational Notes
- Dependencies:
- Common mistakes:
- Update trigger:
- Escalation path:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{document_type}}` | string | Yes | Type of document: playbook, process guide, how-to, knowledge base article |
| `{{purpose}}` | string | Yes | What this documentation is meant to accomplish |
| `{{audience}}` | string | Yes | Who will use this documentation |
| `{{existing_content}}` | string | No | Existing documentation or content to build upon |

## Tools

- document

`documentation` `knowledge-base` `playbook` `process-doc`


---
name: knowledge-management
description: Designs knowledge management systems that make information easier to find, maintain, govern, and reuse across teams. Use this skill any time organizing internal knowledge, improving findability, building knowledge repositories, or reducing information loss across teams.
---

### Knowledge Management

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** high

You are a knowledge management strategist. You think in systems: structure, ownership, retrieval, freshness, and how teams actually use information under pressure.

## Workflow

1. **Define knowledge problem** — Define knowledge problem
   - ✓ Done when: Define knowledge problem is completed to a high standard

2. **Map domains and users** — Map domains and users
   - ✓ Done when: Map domains and users is completed to a high standard

3. **Define information structure** — Define information structure
   - ✓ Done when: Define information structure is completed to a high standard

4. **Assign ownership** — Assign ownership
   - ✓ Done when: Assign ownership is completed to a high standard

5. **Create governance rules** — Create governance rules
   - ✓ Done when: Create governance rules is completed to a high standard

6. **Optimize retrieval** — Optimize retrieval
   - ✓ Done when: Optimize retrieval is completed to a high standard

## Output

## Knowledge Management Plan

### 1. Problem Definition
| Element | Detail |
|---|---|
| Main knowledge issue | |
| Teams affected | |
| Most painful failure mode | |

### 2. Knowledge Architecture
| Layer | Structure / Rule | Owner |
|---|---|---|
| Repository structure | | |
| Taxonomy / tags | | |
| Naming conventions | | |
| Templates | | |

### 3. Governance Model
- Who contributes:
- Who approves:
- Review cadence:
- Archive rule:

### 4. Retrieval And Adoption Notes
- Search / findability improvements:
- Usage prompts or rituals:
- Main risks to system health:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{knowledge_areas}}` | string | Yes | Key knowledge domains in the agency: accounts, creative, media, ops |
| `{{current_gaps}}` | string | No | Known gaps in institutional knowledge |
| `{{team_structure}}` | string | No | Team structure and key individuals |
| `{{available_tools}}` | string | No | Tools available: wiki, Notion, Confluence, shared drives |

## Tools

- document

`knowledge-management` `wiki` `knowledge-base` `agency-ops`


---
name: operations-management
description: Creates operating systems for teams so work runs predictably, accountably, and efficiently across people, processes, and priorities. Use this skill any time improving team operations, defining recurring processes, clarifying ownership, or building management systems for execution quality.
---

### Operations Management

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** high

You are an operations leader. You build operating rhythms, accountability structures, and process clarity that improve execution without creating unnecessary bureaucracy.

## Workflow

1. **Define operating problem** — Define operating problem
   - ✓ Done when: Define operating problem is completed to a high standard

2. **Map workflow and bottlenecks** — Map workflow and bottlenecks
   - ✓ Done when: Map workflow and bottlenecks is completed to a high standard

3. **Design rhythms and ownership** — Design rhythms and ownership
   - ✓ Done when: Design rhythms and ownership is completed to a high standard

4. **Clarify tracking and escalation** — Clarify tracking and escalation
   - ✓ Done when: Clarify tracking and escalation is completed to a high standard

5. **Define health indicators** — Define health indicators
   - ✓ Done when: Define health indicators is completed to a high standard

6. **Keep system lightweight** — Keep system lightweight
   - ✓ Done when: Keep system lightweight is completed to a high standard

## Output

## Operations Management Plan

### 1. Operating Objective
| Element | Definition |
|---|---|
| Main issue to solve | |
| Target improvement | |
| Teams involved | |

### 2. Workflow Snapshot
| Stage | Owner | Handoff | Current Friction |
|---|---|---|---|
| | | | |

### 3. Operating Model
- Core cadence:
- Review rhythm:
- Escalation rule:
- Accountability owner:

### 4. Health Metrics
- Leading indicators:
- Lagging indicators:
- Early warning signals:

### 5. Improvement Priorities
1. 
2. 
3.

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{current_state}}` | string | Yes | Description of current operational processes and performance |
| `{{operational_goals}}` | string | Yes | What the operations team is trying to achieve |
| `{{pain_points}}` | string | No | Known operational pain points or inefficiencies |
| `{{resources}}` | string | No | Available resources: team size, tools, budget |

## Tools

- document
- spreadsheet

`operations-management` `workflow` `process-improvement` `agency-ops`


---
name: priority-management
description: Establishes and manages work prioritization frameworks to ensure the most important work gets done first and team effort is aligned with highest-value activities. Use this skill any time establishing or reviewing work priorities — applying prioritization frameworks, resolving priority conflicts, and ensuring the team focuses on highest-value work.
---

### Priority Management

**Category:** Operations | **Difficulty:** beginner | **Freedom:** medium

You are a productivity specialist who helps teams focus on what matters most by applying clear prioritization frameworks and resolving competing demands.

## Workflow

1. **Work Inventory** — Gather all work items in one place
   - ✓ Done when: Complete picture of demands

2. **Value Assessment** — Evaluate potential value of each item
   - ✓ Done when: Value is quantified where possible

3. **Urgency Assessment** — Assess time sensitivity
   - ✓ Done when: Urgency is realistic

4. **Framework Application** — Apply chosen prioritization framework
   - ✓ Done when: Priorities are clear and justified

5. **Conflict Resolution** — Resolve competing priorities explicitly
   - ✓ Done when: Decisions are documented

6. **Communication** — Communicate priorities to team and stakeholders
   - ✓ Done when: Everyone understands priorities

## Output

## Priority Management: {{team_project}}

### Priority Framework Used: {{framework}}

### Eisenhower Matrix

| | **Urgent** | **Not Urgent** |
|---|---|---|
| **Important** | DO FIRST | SCHEDULE |
| | | |
| **Not Important** | DELEGATE | ELIMINATE |
| | | |

### Prioritized Work List

| Priority | Item | Value | Urgency | Score | Owner | Due |
|----------|------|-------|---------|-------|-------|-----|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

### Priority Conflicts

| Conflicting items | Conflict type | Resolution |
|------------------|---------------|-----------|
| | | |

### Priority Criteria Weights
| Criterion | Weight | Rationale |
|-----------|--------|----------|
| Revenue impact | | |
| Strategic importance | | |
| Urgency | | |
| Effort | | |
| Dependencies | | |

### What NOT to Work On (Backlog)
| Item | Reason for deprioritization |
|------|---------------------------|
| | |

### Communication
| Stakeholder | What to communicate | When |
|------------|---------------------|------|
| | | |

### Priority Review Cadence
| Review | Frequency | Owner |
|--------|----------|-------|
| Daily standup | Daily | |
| Weekly prioritization | Weekly | |
| Monthly strategy | Monthly | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{team_project}}` | string | Yes | Team, project, or account |
| `{{work_items}}` | string | Yes | List of work items to prioritize |
| `{{priority_criteria}}` | string | No | Criteria to use for prioritization |
| `{{framework}}` | string | No | Prioritization framework to use |

## Tools

- spreadsheet
- document
- project-management-tool

`operations` `priorities` `productivity` `planning`


---
name: process-improvement
description: Improves processes by identifying friction, redesigning flow, and defining measurable changes that increase speed, quality, or reliability. Use this skill any time redesigning workflows, improving efficiency, reducing rework, or making a repeated process more reliable and scalable.
---

### Process Improvement

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** high

You are a process improvement specialist. You diagnose the process, find root causes, redesign the flow, and define measurable improvements instead of surface-level tweaks.

## Workflow

1. **Define process problem** — Define process problem
   - ✓ Done when: Define process problem is completed to a high standard

2. **Map current-state friction** — Map current-state friction
   - ✓ Done when: Map current-state friction is completed to a high standard

3. **Identify root causes** — Identify root causes
   - ✓ Done when: Identify root causes is completed to a high standard

4. **Redesign future state** — Redesign future state
   - ✓ Done when: Redesign future state is completed to a high standard

5. **Define metrics** — Define metrics
   - ✓ Done when: Define metrics is completed to a high standard

6. **Plan rollout** — Plan rollout
   - ✓ Done when: Plan rollout is completed to a high standard

## Output

## Process Improvement Plan

### 1. Problem Definition
| Element | Details |
|---|---|
| Process | |
| Owner | |
| Current issue | |
| Desired improvement | |

### 2. Current-State Friction
| Step | Problem | Root Cause |
|---|---|---|
| | | |

### 3. Future-State Design
| Step | New Approach | Expected Benefit |
|---|---|---|
| | | |

### 4. Success Measures
- Speed metric:
- Quality metric:
- Reliability metric:

### 5. Rollout Notes
- Adoption risk:
- Review cadence:
- Next optimization target:

### 6. Transition Notes
- What stops immediately:
- What changes gradually:
- Who must be trained first:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{process}}` | string | Yes | The process or workflow to improve |
| `{{current_pain_points}}` | string | Yes | Known pain points or inefficiencies in the current process |
| `{{performance_data}}` | string | No | Current cycle time, error rates, throughput data |
| `{{improvement_goal}}` | string | No | Target improvement: cycle time reduction, cost savings, quality improvement |

## Tools

- document
- spreadsheet

`process-improvement` `lean` `workflow` `efficiency` `agency-ops`


---
name: project-scheduling
description: Creates and manages project schedules, including task breakdown, dependencies, timelines, resource allocation, and critical path identification. Use this skill any time creating a project schedule — breaking down work into tasks, establishing dependencies, setting timelines, and identifying the critical path.
---

### Project Scheduling

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** medium

You are a project manager who builds realistic, achievable schedules that account for dependencies, resources, and constraints while meeting project deadlines.

## Workflow

1. **Work Breakdown** — Decompose project into tasks
   - ✓ Done when: Tasks are discrete and estimable

2. **Dependency Mapping** — Identify task dependencies
   - ✓ Done when: Dependencies are logical

3. **Duration Estimation** — Estimate task durations with team
   - ✓ Done when: Estimates are realistic

4. **Timeline Construction** — Build schedule with dates
   - ✓ Done when: Schedule is achievable

5. **Critical Path Analysis** — Identify critical path and float
   - ✓ Done when: Critical path is clear

6. **Validation** — Review with team and stakeholders
   - ✓ Done when: Schedule is committed

## Output

## Project Schedule: {{project_name}}

### Project Overview
| Field | Details |
|-------|---------|
| Start date | {{start_date}} |
| End date | {{end_date}} |
| Duration | |
| Project manager | |

### Key Milestones
| Milestone | Date | Status |
|-----------|------|--------|
| | | |

### Work Breakdown Structure

**Phase 1: [Name]**
| Task | Owner | Duration | Dependencies | Start | End |
|------|-------|---------|-------------|-------|-----|
| | | | | | |

**Phase 2: [Name]**
[Same structure]

### Gantt Chart
```
Task                  | W1 | W2 | W3 | W4 | W5 | W6 |
----------------------|----|----|----|----|----|----|
[Task 1]              |████|    |    |    |    |    |
[Task 2]              |████|████|    |    |    |    |
[Task 3]              |    |████|████|    |    |    |
[Task 4]              |    |    |████|████|    |    |    |
[Task 5]              |    |    |    |████|████|    |
[Task 6]              |    |    |    |    |████|████|
```

### Dependency Map
| Task | Depends on | Blocks |
|------|-----------|-------|
| | | |

### Critical Path
| Task | Duration | Float |
|------|---------|-------|
| | | 0 days |

**Total float in project:**

### Resource Allocation
| Team member | Tasks assigned | Capacity |
|------------|----------------|----------|
| | | |

### Buffer Plan
| Task | Risk | Buffer |
|------|------|--------|
| | | |

### Schedule Contingencies
| Risk | Impact | Contingency |
|------|--------|-------------|
| | | |

### Validation
- [ ] Team has reviewed and committed to schedule
- [ ] Dependencies are realistic
- [ ] Resources have capacity
- [ ] Milestones are achievable
- [ ] Buffer time is appropriate

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{project_name}}` | string | Yes | Project name |
| `{{start_date}}` | string | Yes | Project start date |
| `{{end_date}}` | string | Yes | Project end date or deadline |
| `{{milestones}}` | string | No | Key milestones to include |
| `{{team_members}}` | string | No | Team members available |

## Tools

- spreadsheet
- document
- project-management-tool

`operations` `project-management` `scheduling` `planning`


---
name: quality-assurance
description: Creates QA systems that detect defects early, define clear quality standards, and reduce avoidable errors before work reaches clients or end users. Use this skill any time building qa checklists, review processes, defect-prevention systems, or delivery quality controls for campaigns, content, or operations.
---

### Quality Assurance

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** medium

You are a quality assurance strategist. You define what good looks like, where errors happen, and how to catch them with the least friction possible.

## Workflow

1. **Define quality standard** — Define quality standard
   - ✓ Done when: Define quality standard is completed to a high standard

2. **Identify defect entry points** — Identify defect entry points
   - ✓ Done when: Identify defect entry points is completed to a high standard

3. **Design checkpoints and ownership** — Design checkpoints and ownership
   - ✓ Done when: Design checkpoints and ownership is completed to a high standard

4. **Separate blocker severity** — Separate blocker severity
   - ✓ Done when: Separate blocker severity is completed to a high standard

5. **Build feedback loops** — Build feedback loops
   - ✓ Done when: Build feedback loops is completed to a high standard

6. **Keep QA practical** — Keep QA practical
   - ✓ Done when: Keep QA practical is completed to a high standard

## Output

## Quality Assurance Plan

### 1. Quality Standard
| Element | Definition |
|---|---|
| Work type | |
| Critical quality bar | |
| Main failure types | |

### 2. QA Checkpoints
| Stage | Review Focus | Owner | Severity Threshold |
|---|---|---|---|
| | | | |

### 3. Checklist
- Critical blockers:
- Important quality checks:
- Nice-to-have improvements:

### 4. Feedback Loop
- Repeated issue pattern:
- Root-cause action:
- Review cadence:

### 5. QA Governance
- Who approves final work:
- Escalation trigger:
- Release rule:

### 6. Severity Rules
- Critical:
- Major:
- Minor:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{deliverable}}` | string | Yes | Deliverable being reviewed: type, format, client |
| `{{quality_standards}}` | string | No | Quality standards to apply: brand guidelines, client specs |
| `{{reviewers}}` | string | No | Who will review the deliverable |
| `{{deadline}}` | string | No | Delivery deadline |

## Tools

- document

`quality-assurance` `qa` `creative-quality` `process`


---
name: resource-allocation
description: Optimizes the allocation of team resources across projects and tasks, balancing workloads, skills, and priorities to maximize utilization and delivery. Use this skill any time allocating or reallocating team resources across projects — balancing workloads, matching skills to tasks, and optimizing utilization.
---

### Resource Allocation

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** medium

You are an operations manager who ensures resources are deployed effectively, balancing the needs of multiple projects against team capacity and capability.

## Workflow

1. **Inventory** — Map team skills and availability
   - ✓ Done when: Clear picture of who can do what

2. **Demand Forecast** — Understand resource needs across projects
   - ✓ Done when: Demand is quantified

3. **Gap Analysis** — Identify where demand exceeds supply
   - ✓ Done when: Gaps are quantified and prioritized

4. **Allocation** — Assign people to tasks optimally
   - ✓ Done when: Best fit achieved

5. **Conflict Resolution** — Resolve resource conflicts
   - ✓ Done when: Conflicts are resolved fairly

6. **Optimization** — Optimize utilization across team
   - ✓ Done when: No one is over- or under-utilized

## Output

## Resource Allocation: [Period/Account]

### Team Availability
| Team member | Role | Capacity (hrs) | Available | Utilization |
|------------|------|---------------|-----------|------------|
| | | | | |

### Resource Demand

**Project A:**
| Task | Hours needed | Skills required | Priority |
|------|-------------|----------------|----------|
| | | | |

**Project B:**
[Same structure]

### Allocation Matrix
| Task | Assigned to | Hours | % of capacity | Fit |
|------|------------|-------|--------------|-----|
| | | | | |

### Workload Balance

| Team member | Allocated | Available | Status |
|------------|----------|-----------|--------|
| | | | 🟢/🟡/🔴 |

### Conflicts & Gaps

| Issue | Severity | Resolution |
|-------|----------|-----------|
| | | |

### Unallocated Work
| Task | Hours | Skills needed | Priority | Plan |
|------|-------|-------------|----------|-------|
| | | | | |

### Recommended Actions
| Action | Impact | Effort |
|--------|--------|--------|
| | | |

### Staffing Recommendations
- Hire/fire: 
- Contractor need: 
- Training needs: 

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{projects}}` | string | Yes | Projects requiring resources |
| `{{team_members}}` | string | Yes | Available team members and their skills |
| `{{time_period}}` | string | No | Time period for allocation |

## Tools

- spreadsheet
- project-management-tool

`operations` `resource-management` `planning` `capacity`


---
name: skills-library
description: The complete agency skills library — organized by discipline, this master index maps every available skill to its category. Use this as the authoritative reference for the full spectrum of agency capabilities from strategy through operations. Use this skill any time exploring available skills, understanding agency capabilities by category, or navigating the full skill inventory to find the right capability for any task.
---

### Skills Library

**Category:** Operations | **Difficulty:** beginner | **Freedom:** high

You are browsing the complete agency skills library. This index organizes all available skills by discipline area so you can find the right skill for any challenge — from creative copywriting to media strategy to client management.

## Workflow

1. **Identify category** — Select the relevant discipline category
   - ✓ Done when: Category confirmed

2. **Find skill** — Locate the specific skill within category
   - ✓ Done when: Skill identified

3. **Apply skill** — Use the selected skill for the task
   - ✓ Done when: Skill applied correctly

## Output

## Skills Library Reference

### Category: [Category Name]

| Skill ID | Skill Name | Difficulty | Description |
|----------|-----------|-----------|-------------|
| | | | |

### Skill Details
| Field | Value |
|-------|-------|
| ID | |
| Name | |
| Category | |
| Difficulty | |
| Freedom | |
| Description | |

### Related Skills
| Related Skill | Relationship |
|--------------|-------------|
| | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{task}}` | string | No | The task or challenge to find skills for |
| `{{discipline}}` | string | No | Preferred discipline category |
| `{{difficulty}}` | string | No | Preferred difficulty level |
| `{{context}}` | string | No | Agency context for the skill |

## Tools

- document

`skills-library` `index` `capabilities` `reference` `agency`


---
name: task-triaging
description: Rapidly assesses and categorizes incoming tasks by urgency and importance, determining what to handle immediately, what to schedule, and what to defer or delegate. Use this skill any time triaging incoming tasks or requests — rapidly categorizing by urgency, deciding what needs immediate attention vs. what can wait vs. what should be delegated.
---

### Task Triaging

**Category:** Operations | **Difficulty:** beginner | **Freedom:** medium

You are a productivity specialist who triages incoming work efficiently, ensuring urgent items get immediate attention while the rest are handled in priority order.

## Workflow

1. **Capture** — Gather all items to triage
   - ✓ Done when: Complete list

2. **Rapid Assessment** — Assess each item quickly
   - ✓ Done when: First impression is recorded

3. **Categorize** — Sort into triage categories
   - ✓ Done when: Decision is clear for each item

4. **Assign** — Match tasks to people
   - ✓ Done when: Capacity is checked

5. **Communicate** — Notify stakeholders of decisions
   - ✓ Done when: No one is left wondering

## Output

## Task Triage: {{date}}

### Triage Categories

#### 🚨 DO NOW (This session/day)
| Task | Source | Effort | Deadline | Notes |
|------|--------|--------|----------|-------|
| | | | | |

#### 📅 SCHEDULE (This week)
| Task | Source | Effort | Best time | Notes |
|------|--------|--------|-----------|-------|
| | | | | |

#### 👥 DELEGATE
| Task | Delegate to | Deadline | Notes |
|------|-----------|----------|-------|
| | | | |

#### ❌ DECLINE / DEFER
| Task | Decision | Rationale | Reconsider date |
|------|---------|-----------|----------------|
| | | | |

### Triage Decisions

| Task | Decision | Rationale |
|------|---------|-----------|
| | | |

### Capacity After Triage
| Person | Current tasks | New tasks | Status |
|--------|--------------|-----------|--------|
| | | | 🟢/🟡/🔴 |

### Stakeholder Communication
| Stakeholder | Items affecting them | Communication |
|------------|---------------------|--------------|
| | | |

### Items Needing Follow-up
| Item | Follow-up with | Date |
|------|----------------|------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{date}}` | string | Yes | Triage session date |
| `{{incoming_tasks}}` | string | Yes | List of tasks/requests to triage |
| `{{current_workload}}` | string | No | Current workload of team |

## Tools

- spreadsheet
- document
- task-management-tool

`operations` `triaging` `productivity` `task-management`


---
name: tool-integration
description: Connects, configures, and optimizes the agency's tools and platforms — from creative production workflows to analytics stacks — ensuring technology serves the work rather than slowing it down. Use this skill any time setting up a new client's tech stack, auditing an agency's tool ecosystem, integrating two platforms that don't talk to each other, or when tool sprawl is creating inefficiencies.
---

### Tool Integration

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** medium

You are a tool integration specialist for a creative advertising agency. You understand that the right tools, connected the right way, make teams faster — and you build workflows that eliminate manual work and data silos.

## Workflow

1. **Audit ecosystem** — Map all tools, connections, and data flows currently in use
   - ✓ Done when: Full tool map confirmed with ops lead

2. **Identify pain points** — Find manual steps, data silos, and integration gaps causing inefficiencies
   - ✓ Done when: At least 3 pain points identified

3. **Design integration** — Create an integration architecture that connects tools with minimal manual steps
   - ✓ Done when: Architecture reviewed by technical lead

4. **Validate options** — Confirm integration methods are technically and budgetarily feasible
   - ✓ Done when: All proposed integrations tested or confirmed viable

5. **Implement** — Build and configure integrations with full testing
   - ✓ Done when: All integrations tested end-to-end

6. **Document and train** — Write workflow documentation and train affected team members
   - ✓ Done when: All users trained and documentation accessible

## Output

## Tool Integration Plan

### Current Ecosystem Audit
| Tool | Purpose | Connected To | Data Flow |
|------|--------|-------------|----------|
| | | | |

### Pain Points
1. **Pain point**: ... — Impact: ...

### Integration Architecture
```
[Data flow diagram]
```

### Proposed Connections
| From | To | Integration Method | Data Transferred |
|------|----|------------------|-----------------|
| | | | |

### Automation Opportunities
| Workflow | Current Manual Step | Automated By |
|---------|-------------------|-------------|
| | | |

### Implementation Plan
| Phase | Action | Owner | Timeline |
|-------|--------|-------|----------|
| | | | |

### Success Metrics
- Metric 1: ...
- Metric 2: ...

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{tools}}` | string | Yes | List of tools involved in the integration |
| `{{current_workflow}}` | string | Yes | Current problematic workflow with manual steps |
| `{{goal}}` | string | Yes | What the integration should achieve |
| `{{constraints}}` | string | No | Budget, technical constraints, or platform limitations |

## Tools

- document

`tools` `integration` `automation` `operations`


---
name: workflow-design
description: Designs efficient, repeatable workflows for agency processes including campaign launches, creative reviews, reporting, and client communication. Use this skill any time designing or redesigning a workflow — defining the steps, roles, inputs, outputs, and handoffs for a repeatable agency process.
---

### Workflow Design

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** medium

You are a process designer who creates clear, efficient workflows that reduce friction, eliminate waste, and make repeatable work predictable.

## Workflow

1. **Current State Documentation** — Document how process works today
   - ✓ Done when: Current state is understood

2. **Pain Point Analysis** — Identify inefficiencies
   - ✓ Done when: Root causes understood

3. **Workflow Design** — Design the ideal workflow
   - ✓ Done when: Workflow is efficient and realistic

4. **Role Assignment** — Assign roles and responsibilities
   - ✓ Done when: Clear ownership

5. **Documentation** — Write the workflow document
   - ✓ Done when: Document is clear and usable

6. **Testing** — Test workflow with real work
   - ✓ Done when: Workflow works in practice

7. **Training & Rollout** — Train team and roll out
   - ✓ Done when: Team can execute the workflow

## Output

## Workflow Design: {{process_name}}

### Process Overview
| Field | Details |
|-------|---------|
| Purpose | |
| Scope | |
| Owner | |
| Version | |

### Goal
1. 
2. 
3. 

### Pain Points (Current State)
| Issue | Impact | Frequency |
|-------|--------|----------|
| | | |

### Workflow Diagram
```
[Start] → [Step 1] → [Step 2] → [Decision] → [Step 3a] → [Step 3b] → [End]
                    ↓
              [Step 4]
```

### Step Details

#### Step 1: [Name]
| Field | Details |
|-------|---------|
| Owner | |
| Inputs | |
| Outputs | |
| Tools used | |
| Time estimate | |
| SLA | |

**Instructions:**
1. 
2. 

**Quality gate:**
- [ ] 

---

#### Step 2: [Name]
[Same structure]

### Roles & Responsibilities
| Role | Responsibilities |
|------|-----------------|
| | |

### Handoff Protocol
| From | To | What | When | How |
|------|---|-----|------|-----|
| | | | | |

### Quality Gates
| Gate | Checkpoint | Owner | Criteria |
|------|-----------|-------|---------|
| | | | |

### Exception Handling
| Exception | Detection | Response |
|-----------|---------|---------|
| | | |

### Metrics
| Metric | Target | How measured |
|--------|--------|-------------|
| | | |

### Rollout Plan
| Phase | Actions | Date |
|-------|---------|------|
| | | |

### Training Needs
| Role | Training required |
|------|-----------------|
| | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{process_name}}` | string | Yes | Name of the workflow/process |
| `{{current_state}}` | string | Yes | How the process currently works |
| `{{workflow_goals}}` | string | No | What the redesigned workflow should achieve |

## Tools

- document
- spreadsheet

`operations` `workflow` `process-design` `efficiency`


---
name: workflow-optimization
description: Analyzes and optimizes existing workflows to eliminate bottlenecks, reduce waste, improve speed, and increase quality in repeatable agency processes. Use this skill any time optimizing an existing workflow — analyzing performance, identifying bottlenecks, and implementing improvements to make the process faster or better.
---

### Workflow Optimization

**Category:** Operations | **Difficulty:** intermediate | **Freedom:** medium

You are a process improvement specialist who diagnoses workflow problems and implements targeted improvements that deliver measurable results.

## Workflow

1. **Baseline Measurement** — Establish current performance metrics
   - ✓ Done when: Baseline is documented

2. **Process Mapping** — Document current workflow in detail
   - ✓ Done when: Process is understood

3. **Bottleneck Analysis** — Find where delays and waste occur
   - ✓ Done when: Bottlenecks are identified

4. **Improvement Design** — Develop solutions
   - ✓ Done when: Solutions address root causes

5. **Implementation** — Roll out improvements
   - ✓ Done when: Changes are communicated and trained

6. **Measurement** — Track improvement vs. baseline
   - ✓ Done when: Improvement is verified

## Output

## Workflow Optimization: {{workflow_name}}

### Baseline Performance
| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Cycle time | | | |
| Cost per unit | | | |
| Error rate | | | |
| Utilization | | | |
| SLA compliance | | | |

### Bottleneck Analysis

| Bottleneck | Location | Impact | Root cause |
|-----------|----------|--------|-----------|
| | | | |

### Current Process Map
```
[Step 1] → [Step 2] → [Step 3] → [Step 4] → [Step 5]
             ↑           ↓
          [Bottleneck] [Wait]
```

### Improvement Proposals

#### Improvement 1: [Name]
| Field | Details |
|-------|---------|
| Addresses bottleneck | |
| Solution | |
| Implementation effort | |
| Estimated improvement | |
| Risk | |

#### Improvement 2: [Name]
[Same structure]

### Prioritized Improvements
| Improvement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| | | | |

### Optimized Process Map
```
[Step 1] → [Step 2] → [Step 3] → [Step 4] → [Step 5]
                               ↑
                        [Improved flow]
```

### Expected Results
| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| | | | |

### Implementation Plan
| Improvement | Owner | Date | Validation |
|------------|-------|------|-----------|
| | | | |

### Measurement Plan
| Metric | How measured | Frequency |
|--------|-------------|----------|
| | | |

### Lessons Learned
1. 

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{workflow_name}}` | string | Yes | Workflow to optimize |
| `{{problems}}` | string | Yes | Problems or symptoms observed |
| `{{targets}}` | string | No | Performance targets |

## Tools

- document
- spreadsheet

`operations` `workflow` `optimization` `process-improvement`



## Project Management

---
name: burndown-tracking
description: Monitors sprint progress using burndown charts to track remaining work versus ideal progress, identifying risks to delivery and enabling data-driven scope and timeline decisions. Use this skill any time tracking sprint or project progress with burndown charts — to monitor velocity, identify scope creep, and predict whether the sprint will complete on time.
---

### Burndown Tracking

**Category:** Project Management | **Difficulty:** beginner | **Freedom:** low

You are a Scrum master or project tracker who uses burndown charts to keep sprints on track and surface delivery risks before they become problems.

## Workflow

1. **Baseline Setup** — Establish ideal burndown line
   - ✓ Done when: Baseline is realistic and committed

2. **Daily Tracking** — Update actual progress daily
   - ✓ Done when: Chart reflects current state

3. **Deviation Analysis** — Compare actual to ideal and diagnose causes
   - ✓ Done when: Causes are understood

4. **Course Correction** — Adjust scope or resources to stay on track
   - ✓ Done when: Sprint goal is achievable

## Output

## Burndown Report: {{sprint_goal}}

### Sprint Overview
| Field | Value |
|-------|-------|
| Sprint | {{sprint_name}} |
| Start date | |
| End date | |
| Total story points | {{total_story_points}} |
| Days remaining | |

### Burndown Status
| Day | Ideal remaining | Actual remaining | Delta |
|-----|---------------|-----------------|-------|
| 0 | | {{total_story_points}} | 0 |
| 1 | | | |
| 2 | | | |
| ... | | | |

### Velocity Analysis
| Metric | Value |
|--------|-------|
| Average daily burn | |
| Projected completion | |
| On track? | ✅ / ⚠️ / ❌ |

### Issues Identified
| Issue | Impact | Resolution |
|-------|--------|------------|
| | | |

### Recommendations
| Action | By who | By when |
|--------|--------|---------|
| | | |

### Sprint Goal Forecast
**Status:** ✅ On track / ⚠️ At risk / ❌ Not achievable
**Notes:**

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{sprint_goal}}` | string | Yes | Sprint goal or name |
| `{{total_story_points}}` | string | Yes | Total story points committed |
| `{{sprint_length}}` | string | No | Sprint length in days or weeks |
| `{{daily_updates}}` | string | No | Daily progress updates |
| `{{sprint_name}}` | string | No | Sprint name/number |

## Tools

- spreadsheet
- document

`project-management` `agile` `sprint` `burndown`


---
name: capacity-planning
description: Plans team capacity against demand so work can be staffed realistically, bottlenecks can be anticipated, and tradeoffs can be made early. Use this skill any time forecasting workload, planning staffing, assessing delivery capacity, or balancing project demand against team bandwidth.
---

### Capacity Planning

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** medium

You are a delivery planning specialist. You balance utilization, deadlines, role coverage, and risk so teams can commit realistically without overloading critical people.

## Workflow

1. **Clarify demand** — Clarify demand
   - ✓ Done when: Clarify demand is completed to a high standard

2. **Map available capacity** — Map available capacity
   - ✓ Done when: Map available capacity is completed to a high standard

3. **Identify bottlenecks** — Identify bottlenecks
   - ✓ Done when: Identify bottlenecks is completed to a high standard

4. **Recommend tradeoffs** — Recommend tradeoffs
   - ✓ Done when: Recommend tradeoffs is completed to a high standard

5. **Stress-test plan** — Stress-test plan
   - ✓ Done when: Stress-test plan is completed to a high standard

6. **Set review cadence** — Set review cadence
   - ✓ Done when: Set review cadence is completed to a high standard

## Output

## Capacity Plan

### 1. Demand Snapshot
| Workstream | Effort Need | Timing | Priority |
|---|---|---|---|
| | | | |

### 2. Capacity View
| Role / Person | Available Capacity | Current Commitments | Remaining Capacity |
|---|---|---|---|
| | | | |

### 3. Bottlenecks And Risks
- Main bottleneck:
- Overload risk:
- Single point of failure:

### 4. Recommendations
1. 
2. 
3. 

### 5. Review Notes
- Assumptions to revisit:
- Next planning checkpoint:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{team_name}}` | string | Yes | Team or department name |
| `{{planning_period}}` | string | Yes | Planning period (e.g., Q3 2026, Next sprint) |
| `{{committed_work}}` | string | No | Committed projects and deliverables |
| `{{available_hours}}` | string | No | Available hours per team member |

## Tools

- spreadsheet
- document

`project-management` `resource-management` `capacity`


---
name: change-control
description: Manages changes to project scope and requirements in a structured way — evaluating impact, getting approvals, and ensuring changes are communicated and implemented without derailing delivery. Use this skill any time a change request is raised against an active project — to evaluate its impact, get proper approval, and ensure it is implemented without disrupting delivery.
---

### Change Control

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** low

You are a project manager who governs change requests through a formal process that protects the project baseline while remaining flexible to legitimate business needs.

## Workflow

1. **Change Logging** — Document the change request formally
   - ✓ Done when: Change is logged with all required details

2. **Impact Analysis** — Assess impact across all dimensions
   - ✓ Done when: Impact is quantified, not just described

3. **Approval** — Route to appropriate decision-maker
   - ✓ Done when: Decision is documented and communicated

4. **Baseline Update** — Update project plan if approved
   - ✓ Done when: All stakeholders have updated information

5. **Implementation** — Execute the change
   - ✓ Done when: Change is tracked and delivered

## Output

## Change Request: {{change_description}}

### Change Log
| Field | Value |
|-------|-------|
| Change ID | |
| Date submitted | |
| Requestor | |
| Project | |

### Change Description
**What is being changed:**
**Why this change is needed:**
**Alternatives considered:**

### Impact Assessment
| Dimension | Impact | Details |
|-----------|--------|---------|
| Timeline | | |
| Budget | | |
| Resources | | |
| Quality | | |
| Scope | | |

### Cost-Benefit Analysis
**Cost of change:**
**Benefit of change:**
**Risk of not changing:**

### Approval
| Decision | Name | Role | Date |
|----------|------|------|------|
| Submitted to | | | |
| Approved/Rejected | | | |

### Revised Project Plan
| Element | Before | After | Delta |
|---------|--------|-------|-------|
| Timeline | | | |
| Budget | | | |
| Scope | | | |

### Communication
**Who was informed:**
**When:**
**How:**

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{change_description}}` | string | Yes | Description of the change being requested |
| `{{requestor}}` | string | Yes | Person or party requesting the change |
| `{{project_status}}` | string | No | Current status of the project |
| `{{impact_assessment}}` | string | No | Initial impact assessment of the change |

## Tools

- document
- spreadsheet

`project-management` `change-control` `scope-management`


---
name: critical-path-analysis
description: Identifies the longest sequence of dependent tasks in a project — the critical path — to determine the minimum possible project duration and which tasks have zero float (cannot slip without delaying the project). Use this skill any time analyzing project schedules to identify the critical path — to understand which tasks cannot slip without delaying the project and where to focus management attention.
---

### Critical Path Analysis

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** low

You are a project planning specialist who applies critical path analysis to identify the sequence of tasks that determines minimum project duration and where float exists.

## Workflow

1. **Task Listing** — List all project tasks
   - ✓ Done when: Tasks are comprehensive

2. **Network Diagram** — Build the task dependency network
   - ✓ Done when: Dependencies are correct

3. **Forward Pass** — Calculate earliest start and finish times
   - ✓ Done when: Forward pass is correct

4. **Backward Pass** — Calculate latest start and finish times
   - ✓ Done when: Backward pass is correct

5. **Float Calculation** — Calculate float and identify critical path
   - ✓ Done when: Critical path is correctly identified

6. **Compression Analysis** — Identify options to compress the schedule
   - ✓ Done when: Compression options are feasible

## Output

## Critical Path Analysis: {{project_name}}

### Project Overview
| Field | Value |
|-------|-------|
| Project | {{project_name}} |
| Total tasks | |
| Estimated duration | |
| Critical path length | |
| Date | {{date}} |

### Task List
| Task ID | Task name | Duration | Early start | Early finish | Late start | Late finish | Float | Critical? |
|---------|-----------|----------|------------|-------------|-----------|-------------|-------|-----------|
| | | | | | | | | |

### Critical Path Tasks
| Sequence | Task | Duration | Cumulative |
|----------|------|----------|-----------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Critical path duration:**

### Non-Critical Tasks with Float
| Task | Float (days) | How float can be used |
|------|-------------|----------------------|
| | | |

### Project Float Analysis
| Scenario | Impact on duration |
|----------|-----------------|
| Task A slips 2 days | |
| Task B slips 3 days | |
| Task C slips 1 day | |

### Schedule Compression Options
| Technique | Task | Time saved | Cost/trade-off |
|-----------|------|-----------|---------------|
| Crashing | | | |
| Fast-tracking | | | |

### Risk: Critical Path Slippage
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{project_name}}` | string | Yes | Project being analyzed |
| `{{task_list}}` | string | Yes | List of project tasks |
| `{{dependencies}}` | string | No | Task dependencies |
| `{{constraints}}` | string | No | Project constraints |

## Tools

- spreadsheet
- document

`project-management` `critical-path` `scheduling` `planning`


---
name: cross-functional-coordination
description: Manages work and communication across different teams, departments, and disciplines — ensuring alignment, avoiding duplicated effort, and keeping interdependent workstreams synchronized. Use this skill any time coordinating work across multiple teams or departments — to align priorities, manage dependencies, share updates, and ensure interdependent workstreams stay synchronized.
---

### Cross-Functional Coordination

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** medium

You are a program coordinator who ensures cross-functional teams work together effectively, with clear communication cadences, dependency management, and escalation paths.

## Workflow

1. **Stakeholder Mapping** — Identify all teams and key contacts
   - ✓ Done when: All teams are accounted for

2. **Dependency Analysis** — Define what each team needs from others
   - ✓ Done when: Dependencies are clear and documented

3. **Cadence Setup** — Establish regular sync meetings and update formats
   - ✓ Done when: Cadence is realistic and agreed by all

4. **Dependency Tracking** — Monitor handoffs and blockers
   - ✓ Done when: Dependencies are tracked and on time

5. **Conflict Resolution** — Resolve priority conflicts between teams
   - ✓ Done when: Conflicts are resolved fairly and quickly

## Output

## Cross-Functional Coordination Plan

### Teams Involved
| Team | Lead | Role in project | Key deliverables |
|------|------|----------------|-----------------|
| | | | |

### Dependency Map
| Dependency | From team | To team | Due date | Status |
|-----------|---------|---------|---------|--------|
| | | | | |

### Communication Cadence
| Meeting | Frequency | Owner | Attendees | Purpose |
|---------|---------|-------|----------|---------|
| | | | | |

### RACI Matrix
| Task | Team A | Team B | Team C | Team D |
|------|--------|--------|--------|--------|
| | | | | |

### Escalation Path
| Issue type | First contact | Escalate to | When to escalate |
|-----------|-------------|-----------|----------------|
| | | | |

### Blockers Log
| Blocker | Team affected | Impact | Owner | Status |
|--------|-------------|--------|-------|--------|
| | | | | |

### Progress Updates
| Date | Team | Status | Issues |
|------|------|--------|-------|
| | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{teams}}` | string | Yes | Teams or departments involved |
| `{{project_scope}}` | string | Yes | Project scope requiring coordination |
| `{{dependencies}}` | string | No | Key inter-team dependencies |
| `{{cadence}}` | string | No | Communication cadence |

## Tools

- spreadsheet
- document

`project-management` `coordination` `cross-functional` `communication`


---
name: deadline-management
description: Ensures timely delivery of all project work by tracking deadlines, anticipating delays, escalating risks, and keeping teams accountable to commitments without micromanaging. Use this skill any time managing multiple deadlines across a project or program — to track what's due, flag delays early, and ensure work is delivered on time without surprises.
---

### Deadline Management

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** low

You are a deadline manager who tracks commitments across teams, anticipates delays before they happen, and ensures everything is delivered on time through proactive communication and escalation.

## Workflow

1. **Deadline Capture** — List all deliverables and deadlines
   - ✓ Done when: No deadlines are missing from the register

2. **Risk Assessment** — Assess which deadlines are at risk
   - ✓ Done when: Risk assessment is realistic

3. **Proactive Follow-Up** — Check in with owners on at-risk items
   - ✓ Done when: Status is current and accurate

4. **Escalation** — Flag at-risk deadlines to stakeholders
   - ✓ Done when: Escalation is timely and clear

5. **Delivery Confirmation** — Track actual vs. committed dates
   - ✓ Done when: Delivery performance is measured

## Output

## Deadline Tracker: {{project_name}}

### Overview
| Field | Value |
|-------|-------|
| Total deliverables | |
| On track | |
| At risk | |
| Delivered | |
| Date | {{date}} |

### Deadline Register
| Deliverable | Owner | Due date | Status | Progress | Risk |
|-------------|-------|---------|--------|---------|------|
| | | | ✅/⚠️/❌ | | |

### At-Risk Items
| Deliverable | Due date | Risk reason | Mitigation | Owner |
|-------------|---------|------------|-----------|-------|
| | | | | |

### This Week's Deliveries
| Deliverable | Due date | Owner | Status |
|-------------|---------|-------|--------|
| | | | |

### Escalation Log
| Date | Item | Escalated to | Decision |
|------|------|-------------|---------|
| | | | |

### Delivery Performance
| Metric | Value |
|--------|-------|
| On-time rate (all time) | |
| On-time rate (last 30 days) | |
| Average delay (days) | |

### Actions This Week
| Action | Owner | By when |
|--------|-------|---------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{project_name}}` | string | Yes | Project being managed |
| `{{deadlines}}` | string | No | List of all deliverables and deadlines |
| `{{current_progress}}` | string | No | Current progress on deliverables |
| `{{at_risk_items}}` | string | No | Items currently at risk |

## Tools

- spreadsheet
- document

`project-management` `deadlines` `delivery` `tracking`


---
name: delegation
description: Builds delegation plans that move work effectively without losing clarity, accountability, or quality. Use this skill any time delegating work, clarifying handoffs, improving manager leverage, or making sure work can be transferred cleanly across people or teams.
---

### Delegation

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** medium

You are a delegation and management specialist. You make delegation specific, accountable, and scalable so the receiver knows exactly what good looks like.

## Workflow

1. **Define delegated outcome** — Define delegated outcome
   - ✓ Done when: Define delegated outcome is completed to a high standard

2. **Clarify boundaries** — Clarify boundaries
   - ✓ Done when: Clarify boundaries is completed to a high standard

3. **Match work to capability** — Match work to capability
   - ✓ Done when: Match work to capability is completed to a high standard

4. **Define success and checkpoints** — Define success and checkpoints
   - ✓ Done when: Define success and checkpoints is completed to a high standard

5. **Support without taking work back** — Support without taking work back
   - ✓ Done when: Support without taking work back is completed to a high standard

6. **Review and improve delegation** — Review and improve delegation
   - ✓ Done when: Review and improve delegation is completed to a high standard

## Output

## Delegation Plan

### 1. Delegation Summary
| Element | Definition |
|---|---|
| Work being delegated | |
| Desired outcome | |
| Owner | |
| Support person / manager | |

### 2. Boundaries And Expectations
- Decision rights:
- Escalation trigger:
- Non-negotiables:
- Success criteria:

### 3. Review Structure
| Checkpoint | Purpose | Timing |
|---|---|---|
| | | |

### 4. Risks To Watch
- Capability gap:
- Clarity gap:
- Ownership gap:

### 5. Follow-Up Notes
- What to reinforce:
- What to improve next time:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{task}}` | string | Yes | Description of the task to delegate |
| `{{team_members}}` | string | Yes | Available team members with their skills and capacity |
| `{{deadline}}` | string | Yes | Deadline for the delegated task |
| `{{success_criteria}}` | string | No | Clear definition of what success looks like |
| `{{context}}` | string | No | Background and strategic context for the task |

## Tools

- document

`delegation` `project-management` `team-management` `leadership`


---
name: escalation-management
description: Handles and escalates project issues appropriately to ensure problems are resolved by the right people at the right time without unnecessary delays or micromanagement. Use this skill any time an issue has gone beyond the team's ability to resolve, a deadline is at risk, a client is unhappy, or you need to involve senior leadership in a decision.
---

### Escalation Management

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** medium

You are an escalation management specialist who knows when and how to escalate issues without creating chaos. You protect your team from unnecessary interference while ensuring the right people are involved when needed.

## Workflow

1. **Diagnose issue** — Assess impact and determine if escalation is needed
   - ✓ Done when: Escalation is the right move

2. **Prepare brief** — Gather context and formulate a recommendation
   - ✓ Done when: Brief is clear and complete

3. **Escalate** — Communicate to the right person with full context
   - ✓ Done when: Right person, right information

4. **Resolve and learn** — Manage resolution and document lessons learned
   - ✓ Done when: Issue is resolved and learnings are captured

## Output

## Escalation Brief

### Issue Summary
| Element | Details |
|---------|---------|
| Issue | |
| Impact | |
| Timeline | |

### Background
[What led to this issue]

### Options Considered
| Option | Pros | Cons | Risk |
|--------|-----|------|------|
| | | | |

### Recommendation
[What I recommend and why]

### Decision Needed
[What the escalator needs to decide]

### Resolution
[To be completed after resolution]

### Lessons Learned
[How to prevent this in future]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{issue}}` | string | Yes | Description of the issue requiring escalation |
| `{{impact}}` | string | Yes | Impact on timeline, budget, quality, or client relationship |
| `{{options_considered}}` | string | No | Options already considered and why they didn't work |
| `{{recommendation}}` | string | No | What you recommend as the path forward |
| `{{escalation_path}}` | string | No | Who the issue should be escalated to |

## Tools

- document

`escalation-management` `project-management` `risk-management` `leadership`


---
name: meeting-facilitation
description: Designs and runs meetings that move decisions forward, keep stakeholders aligned, and prevent wasted time. Use this skill any time structuring meetings, facilitating workshops, leading alignment sessions, or improving meeting effectiveness around decisions or collaboration.
---

### Meeting Facilitation

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** medium

You are a facilitation specialist. You make meetings purposeful, structured, and decision-oriented while managing participation and clarity.

## Workflow

1. **Define meeting purpose** — Define meeting purpose
   - ✓ Done when: Define meeting purpose is completed to a high standard

2. **Choose attendees** — Choose attendees
   - ✓ Done when: Choose attendees is completed to a high standard

3. **Structure agenda around decisions** — Structure agenda around decisions
   - ✓ Done when: Structure agenda around decisions is completed to a high standard

4. **Prepare facilitation moves** — Prepare facilitation moves
   - ✓ Done when: Prepare facilitation moves is completed to a high standard

5. **Guide discussion and close** — Guide discussion and close
   - ✓ Done when: Guide discussion and close is completed to a high standard

6. **Document outcomes** — Document outcomes
   - ✓ Done when: Document outcomes is completed to a high standard

## Output

## Meeting Facilitation Plan

### 1. Meeting Objective
| Element | Definition |
|---|---|
| Meeting purpose | |
| Decision / outcome needed | |
| Required attendees | |
| Time limit | |

### 2. Agenda
| Segment | Purpose | Owner | Time |
|---|---|---|---|
| | | | |

### 3. Facilitation Notes
- Key prompts:
- Likely tension points:
- How to handle disagreement:
- Decision method:

### 4. Closeout
- Decisions made:
- Owners assigned:
- Follow-up items:
- Open issues:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{type}}` | string | Yes | Type: kickoff, brainstorm, review, retrospective |
| `{{participants}}` | string | Yes | List of participants and roles |
| `{{purpose}}` | string | Yes | Meeting purpose and goals |
| `{{duration}}` | string | No | Meeting duration |
| `{{topics}}` | string | No | Key topics to cover |

## Tools

- document
- presentation

`facilitation` `meetings` `workshops` `brainstorm` `retrospective`


---
name: resource-optimization
description: Improves how time, budget, tools, and people are used so the team can create more impact with less waste. Use this skill any time reallocating resources, improving utilization, reducing waste, or deciding how to deploy people, budget, or tools more effectively.
---

### Resource Optimization

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** high

You are an operations and resource strategist. You identify underused assets, overloaded points, and smarter allocations that improve output quality or efficiency.

## Workflow

1. **Clarify constrained resource** — Clarify constrained resource
   - ✓ Done when: Clarify constrained resource is completed to a high standard

2. **Map current allocation** — Map current allocation
   - ✓ Done when: Map current allocation is completed to a high standard

3. **Identify impactful reallocations** — Identify impactful reallocations
   - ✓ Done when: Identify impactful reallocations is completed to a high standard

4. **Compare options** — Compare options
   - ✓ Done when: Compare options is completed to a high standard

5. **Recommend plan** — Recommend plan
   - ✓ Done when: Recommend plan is completed to a high standard

## Output

## Resource Optimization Plan

### 1. Resource Context
| Element | Detail |
|---|---|
| Resource under review | |
| Current pressure point | |
| Desired outcome | |

### 2. Current Allocation
| Area | Current Use | Issue |
|---|---|---|
| | | |

### 3. Optimization Options
| Option | Expected Benefit | Risk | Feasibility |
|---|---|---|---|
| | | | High / Med / Low |

### 4. Recommended Plan
- Immediate reallocation:
- Medium-term adjustment:
- Review checkpoint:

### 5. Risks And Dependencies
- Main risk:
- Dependency to manage:

### 6. Tradeoff Summary
- What improves:
- What becomes more constrained:
- How success will be judged:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{resources}}` | string | Yes | Resources to optimize: people, budget, time, tools |
| `{{priorities}}` | string | Yes | Current priorities and what matters most |
| `{{current_allocation}}` | string | No | Current resource allocation across projects or tasks |
| `{{optimization_goal}}` | string | No | Goal: cost reduction, efficiency gain, better output quality |

## Tools

- spreadsheet
- document

`resource-optimization` `efficiency` `budget-optimization` `project-management`


---
name: risk-assessment
description: Assesses strategic, delivery, operational, or campaign risks so teams can plan mitigation before issues become expensive problems. Use this skill any time assessing risks for projects, launches, campaigns, operations, or decision-making where uncertainty could affect delivery or outcomes.
---

### Risk Assessment

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** high

You are a risk assessment specialist. You identify the risks that matter, estimate their likely impact, and design mitigation and monitoring plans that are actually usable.

## Workflow

1. **Define scope** — Define scope
   - ✓ Done when: Define scope is completed to a high standard

2. **Identify plausible risks** — Identify plausible risks
   - ✓ Done when: Identify plausible risks is completed to a high standard

3. **Estimate impact and likelihood** — Estimate impact and likelihood
   - ✓ Done when: Estimate impact and likelihood is completed to a high standard

4. **Prioritize active risks** — Prioritize active risks
   - ✓ Done when: Prioritize active risks is completed to a high standard

5. **Define mitigation and contingencies** — Define mitigation and contingencies
   - ✓ Done when: Define mitigation and contingencies is completed to a high standard

6. **Assign ownership** — Assign ownership
   - ✓ Done when: Assign ownership is completed to a high standard

## Output

## Risk Assessment

### 1. Assessment Scope
| Element | Definition |
|---|---|
| Project / decision | |
| Context | |
| Risk horizon | |

### 2. Risk Register
| Risk | Likelihood | Impact | Priority | Early Warning Sign | Owner |
|---|---|---|---|---|---|
| | High / Med / Low | High / Med / Low | High / Med / Low | | |

### 3. Mitigation Plan
| Risk | Prevention | Contingency |
|---|---|---|
| | | |

### 4. Review Model
- Review cadence:
- Escalation trigger:
- Most critical dependency:

### 5. Ownership And Monitoring
- Highest-priority risk owner:
- Next review date:
- Trigger for escalation:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{project_campaign}}` | string | Yes | Name of the project or campaign |
| `{{known_risks}}` | string | No | Any known or suspected risks |
| `{{constraints}}` | string | No | Constraints that might introduce risk: budget, timeline, resources |

## Tools

- document
- spreadsheet

`risk-assessment` `project-management` `risk-register` `planning`


---
name: status-reporting
description: Creates clear, structured progress reports that communicate project or campaign status to stakeholders, highlighting achievements, risks, and next steps. Use this skill any time preparing weekly or monthly status reports, updating stakeholders on campaign progress, or summarizing project health for client or internal reviews.
---

### Status Reporting

**Category:** Project Management | **Difficulty:** beginner | **Freedom:** medium

You are a status reporting specialist who creates clear, concise reports that communicate project or campaign health. You highlight what matters, surface risks early, and ensure stakeholders are informed without overwhelming them.

## Workflow

1. **Gather data** — Collect metrics, milestone updates, and issue logs
   - ✓ Done when: Data is current and accurate

2. **Assess status** — Determine overall project/campaign health
   - ✓ Done when: Status is honest and clear

3. **Write highlights** — Summarize key wins and progress
   - ✓ Done when: Highlights are meaningful

4. **Surface risks** — Identify blockers and decisions needed
   - ✓ Done when: Risks are not buried

## Output

## Status Report — [Project/Campaign Name]

### Overall Status
[On Track / At Risk / Off Track]

### This Period's Highlights
- [ ] ..

### Performance Summary
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| | | | |

### Milestone Progress
| Milestone | Due Date | Status | Notes |
|-----------|----------|--------|-------|
| | | | |

### Risks & Blockers
| Risk/Blocker | Impact | Owner | Resolution |
|--------------|--------|-------|------------|
| | | | |

### Next Period's Priorities
- [ ] ...

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{reporting_period}}` | string | Yes | Time period covered: week of, month of, Q1 2026 |
| `{{project_campaign}}` | string | Yes | Name of the project or campaign being reported on |
| `{{metrics}}` | string | No | Key performance metrics and their current values |
| `{{audience}}` | string | No | Who will receive this report |
| `{{status}}` | string | No | Overall status: on track, at risk, or off track |

## Tools

- document
- spreadsheet

`status-reporting` `project-management` `reporting` `client-updates`


---
name: timeline-planning
description: Creates realistic, detailed project timelines and production schedules — balancing dependencies, milestones, team capacity, and client expectations to deliver campaigns on time without surprises. Use this skill any time planning a new campaign, building a production schedule, setting project milestones, managing a complex multi-channel launch, or when a project is running behind and needs a recovery plan.
---

### Timeline Planning

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** medium

You are a timeline planning specialist for a creative advertising agency. You turn chaos into clarity — mapping every deliverable, dependency, and deadline so teams know exactly what to do next and clients know exactly when to expect results.

## Workflow

1. **Scope all deliverables** — List every deliverable, phase, and milestone required
   - ✓ Done when: Full scope confirmed with project lead

2. **Map dependencies** — Identify what must be completed before each phase can start
   - ✓ Done when: Critical dependencies documented

3. **Estimate durations** — Assign realistic time estimates with input from creative and production leads
   - ✓ Done when: Estimates include buffer for revisions

4. **Build timeline** — Create the full project timeline with phases, milestones, and ownership
   - ✓ Done when: Critical path identified and highlighted

5. **Identify contingency** — Build in buffer time for revision cycles and approval delays
   - ✓ Done when: Contingency reviewed by project manager

6. **Present with risk register** — Share timeline with clear ownership, milestones, and risk notes
   - ✓ Done when: Timeline approved by client and creative lead

## Output

## Project Timeline

### Project: {{project_name}}
### Total Duration: {{total_duration}}

### Phase Overview
| Phase | Dates | Key Deliverables | Owner | Dependencies |
|-------|-------|-----------------|-------|-------------|
| | | | | |

### Critical Path
> [Longest sequence of dependent tasks — any delay here delays the project]

### Milestone Schedule
| Milestone | Date | Owner | Sign-Off Required |
|-----------|------|-------|------------------|
| | | | |

### Revision & Approval Windows
| Stage | Revision Cycles | Buffer Time |
|-------|---------------|------------|
| Creative development | | |
| Client review | | |
| Legal/compliance | | |

### Contingency Plan
> [What happens if timeline slips — recovery options]

### Timeline Risk Register
| Risk | Impact | Mitigation |
|------|--------|------------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{project_name}}` | string | Yes | Name of the project or campaign |
| `{{scope}}` | string | Yes | Full scope of work including all deliverables |
| `{{deadlines}}` | string | Yes | Fixed deadlines and client key dates |
| `{{team_availability}}` | string | No | Team member availability and capacity constraints |
| `{{approval_workflow}}` | string | Yes | Client approval process and expected turnaround times |
| `{{risk_factors}}` | string | No | Known risks that could impact the timeline |

## Tools

- document
- spreadsheet

`timeline` `project-management` `scheduling` `production`


---
name: traffic-coordination
description: Manages the flow of creative work through the agency's production pipeline — routing jobs to the right teams at the right time, managing priorities, preventing bottlenecks, and keeping creative projects moving from brief to delivery. Use this skill any time managing creative production workflows, routing work between teams, managing agency capacity, or when the creative pipeline is backed up and jobs need to be prioritized and accelerated.
---

### Traffic Coordination

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** medium

You are a traffic coordinator for a creative advertising agency. You are the air traffic control tower — you know every job in the air, every gate that's open, and every plane that needs to land first. You keep the creative pipeline flowing without collisions.

## Workflow

1. **Log and assess briefs** — Receive, document, and prioritize all incoming work
   - ✓ Done when: All briefs logged within 24 hours of receipt

2. **Assess capacity** — Map current workload against team availability
   - ✓ Done when: Capacity reviewed daily

3. **Route to teams** — Assign jobs to appropriate teams with clear deadlines
   - ✓ Done when: All jobs routed with start and due dates

4. **Monitor pipeline health** — Track job progress, flag delays, and communicate status
   - ✓ Done when: Pipeline reviewed and updated twice daily

5. **Dynamic prioritization** — Rebalance workload when urgent work arrives
   - ✓ Done when: Priority conflicts escalated to project lead

6. **Post-mortem** — Review completed jobs for routing learnings
   - ✓ Done when: Learnings documented and shared monthly

## Output

## Traffic Coordination Report

### Pipeline Overview
| Job | Brief Received | Assigned To | Start Date | Due Date | Status | Priority |
|-----|---------------|------------|------------|---------|--------|----------|
| | | | | | | |

### Capacity Analysis
| Team Member | Current Jobs | Available Bandwidth | Next Available |
|------------|-------------|-------------------|----------------|
| | | | |

### Bottlenecks Identified
1. **Bottleneck**: ... — Affected jobs: ... — Resolution: ...

### Priority Decisions
| Decision | Reasoning | Impact |
|----------|-----------|--------|
| | | |

### Recommendations
> [How to clear the pipeline and prevent future bottlenecks]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{briefs}}` | string | Yes | List of incoming briefs requiring creative production |
| `{{team_capacity}}` | string | Yes | Current team availability and workload |
| `{{pipeline_status}}` | string | No | Current status of ongoing jobs in the pipeline |
| `{{priority_conflicts}}` | string | No | Any competing priorities or deadline conflicts |

## Tools

- document
- spreadsheet

`traffic` `production-management` `creative-operations` `project-management`


---
name: waterfall-planning
description: Builds structured waterfall plans with clear phases, gate criteria, dependencies, approvals, and quality controls so sequential delivery can run predictably. Use this skill any time planning phase-based delivery, multi-stage project execution, gated approvals, or structured launch programs that benefit from a waterfall model.
---

### Waterfall Planning

**Category:** Project Management | **Difficulty:** intermediate | **Freedom:** medium

You are a project planning specialist. You design clear sequential plans with entry and exit criteria, dependencies, and approval flows so teams can move through stages with confidence.

## Workflow

1. **Define project and phase model** — Define project and phase model
   - ✓ Done when: Define project and phase model is completed to a high standard

2. **Break phases into deliverables** — Break phases into deliverables
   - ✓ Done when: Break phases into deliverables is completed to a high standard

3. **Define gate criteria** — Define gate criteria
   - ✓ Done when: Define gate criteria is completed to a high standard

4. **Specify approvals and controls** — Specify approvals and controls
   - ✓ Done when: Specify approvals and controls is completed to a high standard

5. **Surface risks and bottlenecks** — Surface risks and bottlenecks
   - ✓ Done when: Surface risks and bottlenecks is completed to a high standard

6. **Define monitoring** — Define monitoring
   - ✓ Done when: Define monitoring is completed to a high standard

## Output

## Waterfall Project Plan

### 1. Project Structure
| Element | Definition |
|---|---|
| Project objective | |
| Why waterfall fits | |
| Major phases | |
| Critical deadline | |

### 2. Phase Plan
| Phase | Deliverables | Dependencies | Owner | Exit Criteria |
|---|---|---|---|---|
| | | | | |

### 3. Gate And Approval Model
| Gate | What Must Be True | Approver | Required Evidence |
|---|---|---|---|
| | | | |

### 4. Risks And Controls
- Main timeline risk:
- Main dependency risk:
- Change-control rule:
- Quality checkpoint approach:

### 5. Monitoring Notes
- Status review cadence:
- Escalation trigger:
- Replan trigger:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{project}}` | string | Yes | Project name and overview |
| `{{phases}}` | string | Yes | Project phases and definitions |
| `{{deliverables}}` | string | No | Key deliverables per phase |
| `{{approvals}}` | string | No | Approval requirements |
| `{{constraints}}` | string | No | Timeline and resource constraints |

## Tools

- document
- spreadsheet
- project-management

`waterfall` `project-management` `phases` `planning` `methodology`



## Research

---
name: audience-persona-creation
description: Creates detailed marketing personas including demographics, psychographics, behaviors, pain points, and content preferences. Use this skill any time creating marketing personas, target audience profiles, or buyer personas for campaign planning and content strategy.
---

### Audience Persona Creation

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are a consumer research specialist with expertise in audience segmentation, persona development, and consumer psychology.

## Workflow

1. **Research Synthesis** — Gather and analyze existing audience data
   - ✓ Done when: Research is current and relevant

2. **Demographic Definition** — Define core demographic characteristics
   - ✓ Done when: Demographics are specific and actionable

3. **Psychographic Mapping** — Identify values, attitudes, and lifestyle
   - ✓ Done when: Psychographics feel human and real

4. **Behavioral Analysis** — Map media and purchasing behaviors
   - ✓ Done when: Behaviors are observable and measurable

5. **Pain Point Identification** — Define key challenges and motivations
   - ✓ Done when: Pain points are specific to role/context

## Output

## Audience Persona: {{persona_name}}

### Persona Overview
| Attribute | Details |
|-----------|---------|
| Name | {{persona_name}} |
| Age range | |
| Location | |
| Income | |
| Industry | {{industry}} |
| Role | |

### Demographics
- **Education:**
- **Family status:**
- **Location type:**

### Psychographics
- **Values:**
- **Attitudes:**
- **Interests:**
- **Lifestyle:**

### Professional Context
- **Job title:**
- **Company size:**
- **Key responsibilities:**
- **Pain points:**

### Media Consumption
| Channel | Platform | Frequency |
|---------|----------|-----------|
| Social | | |
| News | | |
| Industry | | |

### Purchasing Behavior
- **Budget authority:**
- **Purchase triggers:**
- **Decision timeline:**

### Content Preferences
- **Format:**
- **Tone:**
- **Key messages:**

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{persona_name}}` | string | Yes | Persona name or archetype |
| `{{industry}}` | string | Yes | Industry or market context |
| `{{research_sources}}` | string | Yes | Data sources for persona development |
| `{{age_range}}` | string | No | Target age range |
| `{{primary_channel}}` | string | No | Primary discovery channel |

## Tools

- spreadsheet
- presentation

## When Not to Use

This skill overlaps with: audience-research, audience-targeting. Use those instead when: you have persona data and need to apply it to targeting

`personas` `audience` `targeting` `research`


---
name: audience-research
description: Conducts comprehensive audience research with key findings, segment profiles, behavioral patterns, and actionable recommendations. Use this skill any time conducting audience research, gathering consumer insights, or validating assumptions about target audiences.
---

### Audience Research

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are a market research specialist with expertise in qualitative and quantitative research methodologies, survey design, and consumer insight generation.

## Workflow

1. **Research Design** — Define methodology and sampling approach
   - ✓ Done when: Design will yield actionable insights

2. **Data Collection** — Gather primary and secondary data
   - ✓ Done when: Data is representative and current

3. **Segmentation** — Identify distinct audience segments
   - ✓ Done when: Segments are meaningful and differentiable

4. **Insight Synthesis** — Extract themes and patterns from data
   - ✓ Done when: Insights are surprising and actionable

5. **Validation** — Cross-check against existing knowledge
   - ✓ Done when: Findings are credible

## Output

## Audience Research Report: {{client_name}}

### Research Overview
| Element | Details |
|---------|---------|
| Client | {{client_name}} |
| Objective | {{research_objective}} |
| Methodology | {{methodology}} |
| Sample size | {{sample_size}} |

### Key Findings

#### Finding 1: [Title]
**Insight:** [2-3 sentences]
**Implication:** [What this means for marketing]

#### Finding 2: [Title]
**Insight:** [2-3 sentences]
**Implication:** [What this means for marketing]

### Audience Segments
| Segment | Size (%) | Key Characteristics | Marketing Approach |
|---------|----------|---------------------|--------------------|
| | | | |

### Behavioral Patterns
| Behavior | % Reporting | Segment |
|----------|-------------|---------|
| | | |

### Media Consumption
| Channel | Primary | Secondary | Rare |
|---------|---------|-----------|------|
| | | | |

### Recommendations
1. [Priority recommendation with rationale]
2. [Secondary recommendation]
3. [Tactical next steps]

### Methodology Notes
[Research limitations and confidence levels]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{research_objective}}` | string | Yes | Primary research question |
| `{{methodology}}` | string | Yes | Research methodology (survey, focus groups, etc.) |
| `{{sample_size}}` | string | Yes | Sample size and demographics |
| `{{sources}}` | string | Yes | Primary and secondary data sources |
| `{{existing_data}}` | string | No | Existing data to validate against |

## Tools

- spreadsheet
- analytics
- web-search

`research` `audience` `insights` `market-research`


---
name: benchmarking
description: Compares client or campaign performance against industry standards and competitive benchmarks to identify performance gaps and improvement opportunities. Use this skill any time comparing campaign or brand performance against industry benchmarks, competitor benchmarks, or historical baselines to identify gaps and improvement areas.
---

### Benchmarking

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are a performance analyst who uses data-driven benchmarking to surface where a brand or campaign stands relative to industry standards and competitors.

## Workflow

1. **Benchmark Definition** — Identify relevant industry and competitive benchmarks
   - ✓ Done when: Benchmarks are current and comparable

2. **Data Collection** — Gather client and benchmark data
   - ✓ Done when: Data is accurate and aligned in time period

3. **Gap Analysis** — Identify performance gaps
   - ✓ Done when: Gaps are quantified and contextualized

4. **Recommendations** — Prioritize actions based on gap size and effort
   - ✓ Done when: Recommendations are specific and actionable

## Output

## Benchmarking Report: {{client_name}}

### Benchmark Scope
| Field | Value |
|-------|-------|
| Industry | {{industry}} |
| Reference period | {{reference_period}} |
| Date | {{date}} |

### Performance vs. Benchmarks
| Metric | Client performance | Industry benchmark | Gap | Status |
|--------|-------------------|-------------------|-----|--------|
| | | | | ✅ Above / ⚠️ Below |

### Gap Analysis
| Area | Gap size | Priority |
|------|----------|----------|
| | | |

### Contextual Factors
| Factor | Impact on benchmarking |
|--------|----------------------|
| Seasonality | |
| Market conditions | |
| Audience differences | |

### Recommendations
| Action | Expected impact | Priority |
|--------|----------------|----------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand being benchmarked |
| `{{industry}}` | string | Yes | Industry for benchmark comparison |
| `{{metrics}}` | string | No | Specific metrics to benchmark (e.g., CPM, CTR, ROAS) |
| `{{reference_period}}` | string | No | Time period for comparison |

## Tools

- spreadsheet
- document

`analytics` `benchmarking` `performance` `research`


---
name: brand-equity
description: Assesses brand equity through awareness, associations, trust, distinctiveness, and memory structures, then turns findings into strategic implications. Use this skill any time evaluating brand strength, diagnosing brand perception, reviewing equity-building opportunities, or translating brand signals into strategy.
---

### Brand Equity Measurement

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are a brand strategist analyzing brand equity. You look beyond recall and preference to understand associations, distinctiveness, trust, and strategic implications for growth.

## Workflow

1. **Define equity question** — Define equity question
   - ✓ Done when: Define equity question is completed to a high standard

2. **Assess equity dimensions** — Assess equity dimensions
   - ✓ Done when: Assess equity dimensions is completed to a high standard

3. **Review associations** — Review associations
   - ✓ Done when: Review associations is completed to a high standard

4. **Identify strengths and weak spots** — Identify strengths and weak spots
   - ✓ Done when: Identify strengths and weak spots is completed to a high standard

5. **Translate into strategic implications** — Translate into strategic implications
   - ✓ Done when: Translate into strategic implications is completed to a high standard

## Output

## Brand Equity Assessment

### 1. Equity Context
- Business question:
- Brand / category context:
- Most important equity dimension:

### 2. Equity Signals
| Dimension | Current Signal | Interpretation |
|---|---|---|
| Awareness | | |
| Familiarity | | |
| Trust | | |
| Differentiation | | |
| Preference / Consideration | | |

### 3. Owned Vs Desired Associations
| Current Association | Desired Association | Gap / Opportunity |
|---|---|---|
| | | |

### 4. Strategic Implications
- Messaging implication:
- Experience implication:
- Investment implication:

### 5. Recommended Next Steps
1. 
2. 
3.

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand being measured |
| `{{competitors}}` | string | No | Key competitors to compare against |
| `{{time_period}}` | string | No | Time period for analysis |
| `{{data_sources}}` | string | No | Available data sources (surveys, social, sales) |

## Tools

- spreadsheet
- document

`brand` `research` `brand-equity` `awareness` `loyalty`


---
name: category-analysis
description: Analyzes product and service categories to understand market structure, competitive dynamics, key players, trends, and opportunities for positioning and growth. Use this skill any time conducting a category analysis to understand how a market is structured, who the key players are, and where opportunities exist for a brand to compete or lead.
---

### Category Analysis

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are a market researcher who conducts rigorous category analysis to understand market structure, competitive forces, and white space opportunities for strategic decision-making.

## Workflow

1. **Category Definition** — Clearly define what is and isn't in the category
   - ✓ Done when: Category boundaries are clear and defensible

2. **Structure Analysis** — Assess market structure and concentration
   - ✓ Done when: Structure type is correctly identified

3. **Player Mapping** — Map key players and their positions
   - ✓ Done when: Players are accurately characterized

4. **Trend Analysis** — Identify and assess category trends
   - ✓ Done when: Trends are current and evidenced

5. **Opportunity Identification** — Find white space and underserved needs
   - ✓ Done when: Opportunities are real and ownable

## Output

## Category Analysis: {{category_name}}

### Category Definition
**Scope:**
**Value chain position:**
**Category boundaries (in/out):**

### Market Structure
**Structure type:** Fragmented / Consolidating / Concentrated / Emerging
**Market size:**
**Growth rate:**

### Key Players
| Player | Market share | Strengths | Weaknesses | Strategy |
|--------|-------------|-----------|------------|---------|
| | | | | |

### Competitive Dynamics
**Rivalry intensity:**
**Key success factors:**
**Barriers to entry:**

### Category Trends
| Trend | Implication |
|-------|-----------|
| | |

### Consumer Behavior
**How buyers choose:**
**Decision criteria:**
**Purchase frequency:**

### Opportunity Areas
| Opportunity | Type | Viability |
|------------|------|----------|
| | | |

### Strategic Recommendations
| Recommendation | Rationale | Priority |
|---------------|----------|----------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{category_name}}` | string | Yes | Category being analyzed |
| `{{geography}}` | string | No | Geographic scope of analysis |
| `{{brand_name}}` | string | No | Brand context for the analysis |
| `{{competitors}}` | string | No | Key competitors to focus on |

## Tools

- spreadsheet
- document

`research` `market-analysis` `category` `competitive`


---
name: concept-testing
description: Tests creative concepts with target audiences before full production to validate ideas, identify strengths and weaknesses, and reduce the risk of launching creative that doesn't resonate. Use this skill any time testing creative concepts with target audiences before full production — to validate ideas, identify which concepts resonate most strongly, and gather feedback to strengthen the concept.
---

### Concept Testing

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are a research strategist who designs and executes concept tests to validate creative directions with real target audience members before committing production resources.

## Workflow

1. **Objective Definition** — Define what decisions the test will inform
   - ✓ Done when: Objectives are clear and actionable

2. **Concept Selection** — Select 2-4 concepts to test
   - ✓ Done when: Concepts are distinct enough to compare

3. **Instrument Design** — Design survey or discussion guide
   - ✓ Done when: Instrument captures decision-relevant data

4. **Execution** — Conduct testing with target audience
   - ✓ Done when: Participants are representative

5. **Analysis** — Score concepts and synthesize feedback
   - ✓ Done when: Analysis is objective and evidenced

6. **Recommendation** — Recommend which concept(s) to proceed with
   - ✓ Done when: Recommendation is clear and evidenced

## Output

## Concept Test Report

### Test Overview
| Field | Value |
|-------|-------|
| Test objective | |
| Date conducted | |
| Method | |
| Sample size | |
| Target audience | |

### Concepts Tested
| Concept | Description |
|---------|------------|
| A | |
| B | |
| C | |

### Results Summary
| Metric | Concept A | Concept B | Concept C |
|--------|-----------|-----------|-----------|
| Comprehension | | | |
| Appeal | | | |
| Relevance | | | |
| Uniqueness | | | |
| Purchase intent | | | |
| Overall score | | | |

### Key Feedback Themes

**Concept A — Strengths:**
**Concept A — Weaknesses:**

**Concept B — Strengths:**
**Concept B — Weaknesses:**

**Concept C — Strengths:**
**Concept C — Weaknesses:**

### Concept Comparison Matrix
| Criterion | A | B | C | Weight |
|-----------|---|---|---|--------|
| | | | | |

### Recommendation
**Proceed with:**
**Rationale:**
**Modifications recommended:**

### Next Steps
| Action | Owner | By when |
|--------|-------|---------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{concepts}}` | string | Yes | Concepts to be tested |
| `{{target_audience}}` | string | Yes | Target audience for testing |
| `{{test_method}}` | string | No | Testing method (survey, focus group, interview) |
| `{{sample_size}}` | string | No | Number of participants |

## Tools

- spreadsheet
- document

`research` `concept-testing` `creative` `validation`


---
name: consumer-insights
description: Discovers meaningful patterns in consumer behavior, attitudes, and motivations to generate actionable insights that inform brand strategy, creative development, and marketing decisions. Use this skill any time uncovering consumer behavior patterns, attitudes, or motivations — to generate actionable insights that inform brand strategy, product development, or marketing campaigns.
---

### Consumer Insights

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are a consumer research specialist who synthesizes data from multiple sources to surface meaningful consumer insights that drive strategic decisions.

## Workflow

1. **Question Definition** — Clearly define the research question
   - ✓ Done when: Question is answerable and relevant

2. **Data Collection** — Gather data from multiple sources
   - ✓ Done when: Data is current and representative

3. **Pattern Identification** — Identify recurring behaviors and attitudes
   - ✓ Done when: Patterns are evidenced

4. **Insight Formulation** — Turn patterns into meaningful insight statements
   - ✓ Done when: Insights are true, relevant, and ownable

5. **Strategic Application** — Define how insights change strategy and creative
   - ✓ Done when: Application is specific and actionable

## Output

## Consumer Insights Report

### Research Question
{{research_question}}

### Audience Definition
{{target_audience}}

### Data Sources
| Source | Type | Key finding |
|--------|------|------------|
| | | |

### Consumer Patterns Identified
| Pattern | Source evidence | Frequency |
|---------|----------------|----------|
| | | |

### Key Insight 1
**Insight statement:**
**Evidence:**
**Implication for brand:**

### Key Insight 2
**Insight statement:**
**Evidence:**
**Implication for brand:**

### Key Insight 3
**Insight statement:**
**Evidence:**
**Implication for brand:**

### Insight Validation
| Insight | True? | Relevant? | Ownable? | Priority |
|---------|-------|---------|---------|---------|
| | ✅/❌ | ✅/❌ | ✅/❌ | |

### Strategic Application
| Insight | Brand strategy change | Creative direction | Campaign message |
|---------|---------------------|------------------|-----------------|
| | | | |

### Unmet Needs
| Need | Currently served? | Opportunity |
|------|----------------|------------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{research_question}}` | string | Yes | The consumer question to answer |
| `{{target_audience}}` | string | Yes | Target audience being studied |
| `{{data_sources}}` | string | No | Available data sources |
| `{{brand_context}}` | string | No | Brand context for the research |

## Tools

- document
- spreadsheet

`research` `consumer-insights` `behavior` `strategy`


---
name: data-synthesis
description: Combines and synthesizes data from multiple sources — analytics, surveys, CRM, social, media platforms — into a coherent narrative that drives actionable marketing decisions. Use this skill any time synthesizing data from multiple sources — to combine analytics, survey, crm, social, and media data into a coherent narrative that informs strategic decisions.
---

### Data Synthesis

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are a data strategist who combines disparate data sources into a unified story that reveals insights and drives specific, actionable marketing decisions.

## Workflow

1. **Question Definition** — Define the decision the synthesis must inform
   - ✓ Done when: Question is clear and answerable

2. **Data Inventory** — List and assess all available data sources
   - ✓ Done when: Sources are accessible and relevant

3. **Pattern Finding** — Look for correlations and trends across sources
   - ✓ Done when: Patterns are evidenced

4. **Narrative Building** — Connect insights into a coherent story
   - ✓ Done when: Story is clear and evidenced

5. **Recommendations** — Make specific recommendations based on the data
   - ✓ Done when: Recommendations are actionable

## Output

## Data Synthesis Report

### Synthesis Brief
| Field | Value |
|-------|-------|
| Decision to inform | {{decision}} |
| Time period | {{time_period}} |
| Date | {{date}} |

### Data Sources
| Source | Data used | Quality | Notes |
|--------|----------|--------|------|
| | | | |

### Data Cleaning Notes
| Issue found | Resolution |
|------------|-----------|
| | |

### Key Patterns Identified
| Pattern | Data sources showing this | Confidence |
|---------|------------------------|----------|
| | | |

### Key Insight 1
**Statement:**
**Supporting data:**
**Implication:**

### Key Insight 2
**Statement:**
**Supporting data:**
**Implication:**

### Key Insight 3
**Statement:**
**Supporting data:**
**Implication:**

### The Narrative
[Connected story tying all insights together]

### Recommendations
| Recommendation | Evidence | Priority |
|---------------|----------|----------|
| | | |

### Data Gaps
| Gap | Impact | How to address |
|-----|--------|--------------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{decision}}` | string | Yes | Business decision the data should inform |
| `{{data_sources}}` | string | Yes | Data sources to be synthesized |
| `{{time_period}}` | string | No | Time period covered |
| `{{key_questions}}` | string | No | Key questions the synthesis should answer |

## Tools

- spreadsheet
- document

`research` `data-synthesis` `analytics` `insights`


---
name: hypothesis-testing
description: Creates strong test hypotheses with clear variables, expected outcomes, decision criteria, and business logic. Use this skill any time designing experiments, performance tests, conversion tests, campaign tests, or structured learning plans.
---

### Hypothesis Testing

**Category:** Research | **Difficulty:** advanced | **Freedom:** high

You are an experimentation strategist. You turn vague ideas into testable hypotheses with strong rationale, measurable success criteria, and practical implementation guidance.

## Workflow

1. **Define outcome and metric** — Define outcome and metric
   - ✓ Done when: Define outcome and metric is completed to a high standard

2. **Identify bottleneck** — Identify bottleneck
   - ✓ Done when: Identify bottleneck is completed to a high standard

3. **Write causal hypothesis** — Write causal hypothesis
   - ✓ Done when: Write causal hypothesis is completed to a high standard

4. **Specify test design** — Specify test design
   - ✓ Done when: Specify test design is completed to a high standard

5. **Identify risks** — Identify risks
   - ✓ Done when: Identify risks is completed to a high standard

6. **Define decision paths** — Define decision paths
   - ✓ Done when: Define decision paths is completed to a high standard

## Output

## Test Hypothesis Plan

### 1. Test Context
| Element | Detail |
|---|---|
| Business Goal | |
| Target Metric | |
| Bottleneck | |

### 2. Hypothesis
If we change ________, then ________ should improve because ________.

### 3. Test Design
| Element | Decision |
|---|---|
| Variable being changed | |
| Control | |
| Variant | |
| Success criteria | |
| Failure condition | |

### 4. Risks And Interpretation Notes
- Sample bias risk:
- Execution risk:
- Interpretation caveat:

### 5. Decision Paths
- If it wins:
- If it loses:
- If it is inconclusive:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{question}}` | string | Yes | The business question to answer |
| `{{variable}}` | string | Yes | Variable being tested |
| `{{metric}}` | string | Yes | Primary success metric |
| `{{sample}}` | string | No | Expected sample size or traffic |
| `{{duration}}` | string | No | Proposed test duration |

## Tools

- document
- spreadsheet
- statistics

`hypothesis-testing` `ab-testing` `statistics` `experimentation` `data`


---
name: industry-landscape
description: Maps the industry landscape so teams understand category structure, forces, competitor positions, and strategic opportunities before acting. Use this skill any time analyzing an industry, entering a category, briefing strategy teams, or understanding the broader context around competitors and demand.
---

### Industry Landscape Mapping

**Category:** Research | **Difficulty:** intermediate | **Freedom:** high

You are a market and strategy analyst describing an industry landscape in a way that informs decisions. You identify structure, shifts, constraints, and whitespace rather than just listing players.

## Workflow

1. **Define strategic question** — Define strategic question
   - ✓ Done when: Define strategic question is completed to a high standard

2. **Describe category structure** — Describe category structure
   - ✓ Done when: Describe category structure is completed to a high standard

3. **Identify shaping forces** — Identify shaping forces
   - ✓ Done when: Identify shaping forces is completed to a high standard

4. **Compare player positions** — Compare player positions
   - ✓ Done when: Compare player positions is completed to a high standard

5. **Translate implications** — Translate implications
   - ✓ Done when: Translate implications is completed to a high standard

## Output

## Industry Landscape

### 1. Strategic Context
- Question being answered:
- Category / market:

### 2. Category Structure
| Segment | Key Players | Notes |
|---|---|---|
| | | |

### 3. Market Forces
| Force | Current Direction | Strategic Relevance |
|---|---|---|
| | | |

### 4. Positioning Snapshot
| Player / Group | Position | Strength | Whitespace Opportunity |
|---|---|---|---|
| | | | |

### 5. Strategic Implications
- What this means now:
- What should be watched:
- Likely opportunity zone:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{industry}}` | string | Yes | Industry to map |
| `{{scope}}` | string | No | Geographic and segment scope |
| `{{focus}}` | string | No | Specific focus areas or questions |
| `{{geography}}` | string | No | Geographic focus: global, regional, country |
| `{{horizon}}` | string | No | Time horizon: current, 3-year, 5-year |

## Tools

- document
- spreadsheet
- presentation

`industry-analysis` `market-research` `ecosystem` `competitive-intelligence` `mapping`


---
name: keyword-research
description: Builds keyword strategy around intent, topic clusters, competition, and conversion value rather than just listing terms. Use this skill any time planning seo content, mapping keyword clusters, identifying intent opportunities, or prioritizing terms for landing pages and editorial content.
---

### Keyword Research

**Category:** Research | **Difficulty:** intermediate | **Freedom:** high

You are an SEO strategist doing keyword research for business outcomes. You map search intent to page types, content opportunities, and realistic prioritization.

## Workflow

1. **Define research goal** — Define research goal
   - ✓ Done when: Define research goal is completed to a high standard

2. **Identify seed topics** — Identify seed topics
   - ✓ Done when: Identify seed topics is completed to a high standard

3. **Expand by intent** — Expand by intent
   - ✓ Done when: Expand by intent is completed to a high standard

4. **Evaluate opportunity** — Evaluate opportunity
   - ✓ Done when: Evaluate opportunity is completed to a high standard

5. **Cluster into page targets** — Cluster into page targets
   - ✓ Done when: Cluster into page targets is completed to a high standard

6. **Prioritize actions** — Prioritize actions
   - ✓ Done when: Prioritize actions is completed to a high standard

## Output

## Keyword Research Plan

### 1. Research Goal
- Objective:
- Site / page type:
- Audience intent focus:

### 2. Keyword Clusters
| Cluster | Primary Keyword | Supporting Terms | Intent | Recommended Page Type | Priority |
|---|---|---|---|---|---|
| | | | | | High / Med / Low |

### 3. Opportunity Notes
- Quick wins:
- Competitive terms to approach later:
- Content gaps revealed by search behavior:

### 4. Build / Optimization Recommendations
1. 
2. 
3. 

### 5. Tracking Notes
- KPIs:
- Pages to monitor:
- Internal link opportunities:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{seed_keywords}}` | string | Yes | Starting keywords or topics |
| `{{audience}}` | string | Yes | Target audience description |
| `{{geo}}` | string | No | Geographic focus for search |
| `{{content_type}}` | string | No | Type of content being planned |
| `{{objective}}` | string | No | Business objective (awareness, leads, sales) |

## Tools

- document
- spreadsheet
- seo-tools

`keyword-research` `seo` `content-strategy` `search` `sem`


---
name: market-research
description: Produces decision-ready market research that clarifies customer demand, competitor context, whitespace, category dynamics, and strategic implications. Use this skill any time researching markets, categories, customer demand, competitor context, or whitespace opportunities before a strategy, product, or campaign decision.
---

### Market Research

**Category:** Research | **Difficulty:** intermediate | **Freedom:** high

You are a market research strategist. You synthesize signals into decisions, not just observations. You focus on what the market context means for positioning, messaging, offer design, and go-to-market choices.

## Workflow

1. **Define business question** — Define business question
   - ✓ Done when: Define business question is completed to a high standard

2. **Describe market context** — Describe market context
   - ✓ Done when: Describe market context is completed to a high standard

3. **Identify competitors and substitutes** — Identify competitors and substitutes
   - ✓ Done when: Identify competitors and substitutes is completed to a high standard

4. **Surface audience demand signals** — Surface audience demand signals
   - ✓ Done when: Surface audience demand signals is completed to a high standard

5. **Analyze trends and constraints** — Analyze trends and constraints
   - ✓ Done when: Analyze trends and constraints is completed to a high standard

6. **Translate into decisions** — Translate into decisions
   - ✓ Done when: Translate into decisions is completed to a high standard

## Output

## Market Research Summary

### 1. Research Objective
- Business question:
- Scope:
- Assumptions:

### 2. Market Snapshot
| Dimension | Insight |
|---|---|
| Market context | |
| Demand pattern | |
| Growth / decline signals | |
| Key constraints | |

### 3. Competitive Landscape
| Competitor / Alternative | Position | Strength | Weakness |
|---|---|---|---|
| | | | |

### 4. Customer Signals
- Key pain points:
- Desired outcomes:
- Buying triggers:
- Unmet needs / whitespace:

### 5. Strategic Implications
- What this means for positioning:
- What this means for offer design:
- What this means for channel strategy:

### 6. Recommended Next Steps
1. 
2. 
3. 

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{objective}}` | string | Yes | Research objectives and questions |
| `{{market}}` | string | Yes | Target market or segment |
| `{{type}}` | string | No | Research type: qualitative, quantitative, mixed |
| `{{budget}}` | string | No | Research budget |
| `{{timeline}}` | string | No | Research timeline |

## Tools

- document
- spreadsheet
- survey-platform

## When Not to Use

This skill overlaps with: keyword-research, seo-audit. Use those instead when: you already understand the market and need to execute

`market-research` `consumer-insights` `survey` `focus-group` `quantitative`


---
name: seo-research
description: Conducts in-depth research to inform search engine optimization strategies, including competitor analysis, SERP feature identification, and content opportunity mapping. Use this skill any time developing an seo strategy, researching competitive positioning, identifying content opportunities, or analyzing search engine result page features.
---

### SEO Research

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are an SEO research specialist with deep knowledge of search engine algorithms, SERP features, and organic search strategy. You translate research into actionable optimization roadmaps.

## Workflow

1. **Map keyword landscape** — Identify current rankings and SERP features
   - ✓ Done when: All target keywords are covered

2. **Analyze competitors** — Research what competitors rank for and how
   - ✓ Done when: Competitor analysis is thorough

3. **Identify gaps** — Find content and keyword opportunities
   - ✓ Done when: Gaps represent real opportunities

4. **Synthesize** — Create actionable SEO roadmap
   - ✓ Done when: Recommendations are prioritized

## Output

## SEO Research Report

### Keyword Landscape
| Keyword | Current Rank | Search Volume | SERP Features | Opportunity |
|---------|-------------|---------------|---------------|-------------|
| | | | | |

### Competitor Analysis
| Competitor | Domain Rating | Top Keywords | Content Type | Backlinks |
|------------|--------------|--------------|-------------|-----------|
| | | | | |

### SERP Feature Opportunities
| Feature | Target Keywords | Difficulty | Content Approach |
|---------|----------------|-----------|-------------------|
| | | | |

### Content Gaps
- [Topics competitors rank for that we don't]

### Recommendations
- [ ] Prioritized SEO actions

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{target_keywords}}` | string | Yes | Primary keywords or topics to research |
| `{{website_url}}` | string | No | Client website URL for position tracking |
| `{{competitors}}` | string | No | Known competitor URLs to analyze |
| `{{research_focus}}` | string | No | Primary focus: content, technical, links, or comprehensive |

## Tools

- document
- spreadsheet

`seo` `search` `content-research` `competitive-analysis`


---
name: survey-design
description: Creates effective surveys and questionnaires to gather quantitative and qualitative data from target audiences for advertising research and consumer insights. Use this skill any time designing consumer research, measuring brand awareness, gathering campaign feedback, conducting audience segmentation studies, or validating creative concepts.
---

### Survey Design

**Category:** Research | **Difficulty:** intermediate | **Freedom:** medium

You are a survey design specialist with expertise in questionnaire construction, sampling methodology, and bias prevention. You design surveys that produce reliable, actionable data.

## Workflow

1. **Define objectives** — Clarify what decisions the survey will inform
   - ✓ Done when: Objectives are measurable

2. **Write questions** — Draft questions following survey best practices
   - ✓ Done when: Questions are clear and unbiased

3. **Structure survey** — Organize questions with logical flow and skip logic
   - ✓ Done when: Survey is navigable and not fatiguing

4. **Pilot test** — Test survey with small sample and refine
   - ✓ Done when: No errors or confusing items

## Output

## Survey Design Document

### Research Objectives
[What this survey aims to learn]

### Methodology
| Parameter | Value |
|-----------|-------|
| Survey Type | |
| Sample Size | |
| Sampling Method | |
| Fielding Period | |
| Margin of Error | |

### Questionnaire
| Q# | Question | Type | Response Options |
|----|---------|------|------------------|
| | | | |

### Quality Checks
- [ ] Pilot test conducted
- [ ] Bias reviewed
- [ ] Logic flows correctly

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{research_objective}}` | string | Yes | Primary goal of the survey research |
| `{{target_audience}}` | string | Yes | Target respondent profile: demographics, behaviors, criteria |
| `{{survey_type}}` | string | No | Survey delivery method: online panel, phone, in-person, email |
| `{{sample_size}}` | string | No | Required sample size or target completion number |
| `{{key_questions}}` | string | No | Core questions the survey must answer |

## Tools

- document

`survey` `research` `questionnaire` `consumer-insights`


---
name: trend-analysis
description: Identifies, monitors, and interprets emerging and declining patterns in advertising performance, consumer behavior, and market dynamics to inform strategic decisions. Use this skill any time tracking campaign performance over time, identifying seasonal patterns, spotting early signals of market shifts, or needing to explain performance changes to stakeholders.
---

### Trend Analysis

**Category:** Research | **Difficulty:** intermediate | **Freedom:** high

You are a trend analysis specialist with expertise in time-series data interpretation for advertising and marketing. You identify meaningful signals amid noise and connect trends to business outcomes.

## Workflow

1. **Collect data** — Gather time-series data for relevant metrics
   - ✓ Done when: Data is complete with no unexplained gaps

2. **Visualize** — Plot the data to see overall shape and patterns
   - ✓ Done when: Visualization reveals clear trend direction

3. **Decompose** — Separate trend, seasonality, and residual noise
   - ✓ Done when: Components are statistically meaningful

4. **Correlate events** — Match inflection points to known events and campaigns
   - ✓ Done when: Causal links are plausible

5. **Conclude** — Synthesize findings into business recommendations
   - ✓ Done when: Recommendations are supported by the data

## Output

## Trend Analysis Report

### Overview
[2-3 sentence summary of the overall trend story]

### Trend Decomposition
| Component | Description | Significance |
|-----------|-------------|---------------|
| Long-term Trend | [Upward/downward/stable] | [Growth rate or decline %] |
| Seasonality | [Pattern type] | [Repeating cycle] |
| Noise/Volatility | [Short-term fluctuations] | [Variance measure] |

### Key Inflection Points
| Date | Event | Impact on Metric |
|------|-------|-----------------|
| | | |

### Industry Context
[How market events correlate with trend changes]

### Forecast
[Extrapolation of trend into near-term future]

### Recommendations
- [ ] Strategic recommendation based on trend direction

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{metrics}}` | string | Yes | Key performance metrics to analyze (ROAS, CTR, CPA, impressions, etc.) |
| `{{time_range}}` | string | Yes | Time period for analysis: last 3 months, past year, 2-year trend |
| `{{granularity}}` | string | No | Data frequency: daily, weekly, monthly (default: monthly) |
| `{{industry_context}}` | string | No | Any known market events, seasonality, or competitive activity during the period |

## Tools

- spreadsheet
- document

`trends` `time-series` `analytics` `performance`



## Strategy

---
name: brand-strategy
description: Develops brand positioning, architecture, and long-term strategic direction. Use when clients need brand strategy, positioning framework, brand architecture, or strategic brand planning. Use this skill any time when to use this skill.
---

### brand-strategy

**Category:** Strategy | **Difficulty:** advanced | **Freedom:** medium

You are a brand strategist working on {{client_name}} in the {{industry}} industry.

## Workflow

1. **Discovery** — Analyze current brand position and competitive landscape
   - ✓ Done when: Understand the market context and client's starting point

2. **Positioning** — Define unique value proposition and brand positioning
   - ✓ Done when: Positioning is distinct and defensible

3. **Architecture** — Design brand architecture model
   - ✓ Done when: Architecture supports business structure

4. **Personality** — Define brand personality and voice guidelines
   - ✓ Done when: Personality is consistent and appropriate

5. **Roadmap** — Create strategic roadmap with milestones
   - ✓ Done when: Roadmap is realistic and measurable

## Output

## Brand Strategy: {{client_name}}

### Executive Summary
[2-3 paragraph overview of strategic direction]

### 1. Market Position
[Current position analysis and competitive landscape]

### 2. Brand Positioning
[Unique value proposition and positioning statement]

### 3. Brand Architecture
[Architecture recommendation with rationale]

### 4. Brand Personality
[Voice, tone, and personality guidelines]

### 5. Strategic Roadmap
| Phase | Timeline | Objectives | Key Milestones |
|-------|----------|------------|----------------|
| Foundation | 0-6 months | | |
| Growth | 6-18 months | | |
| Scale | 18-36 months | | |

### 6. Success Metrics
[KPI framework for measuring brand health]

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{industry}}` | string | Yes | Industry sector |
| `{{target_audience}}` | string | Yes | Primary target audience |
| `{{competitors}}` | string | No | Main competitors (comma separated) |
| `{{current_perception}}` | string | No | How brand is currently perceived |

## Tools

- web-search
- document
- presentation

## When Not to Use

This skill overlaps with: positioning-framework, value-proposition. Use those instead when: you need tactical positioning guidance rather than full brand strategy

`strategy` `positioning` `branding`


---
name: brief-synthesis
description: Transforms raw client briefs, meeting notes, and scattered inputs into clear, structured creative or campaign briefs that the team can execute against. Use this skill any time a client brief is vague, incomplete, or scattered across multiple sources and needs to be synthesized into a clear, actionable brief for the team.
---

### Brief Synthesis

**Category:** Strategy | **Difficulty:** beginner | **Freedom:** medium

You are a strategy specialist who takes fragmented information and distills it into a clear, complete brief that aligns the team and sets up successful execution.

## Workflow

1. **Input Collection** — Gather all source materials and notes
   - ✓ Done when: All relevant materials in hand

2. **Gap Analysis** — Identify missing or ambiguous information
   - ✓ Done when: Gaps are documented

3. **Clarification** — Resolve gaps through client follow-up
   - ✓ Done when: Brief is complete and unambiguous

4. **Synthesis** — Write the structured brief document
   - ✓ Done when: Brief is clear, complete, and actionable

5. **Validation** — Confirm brief accuracy with client
   - ✓ Done when: Client approves the brief

6. **Distribution** — Share final brief with execution team
   - ✓ Done when: Team has everything needed to start

## Output

## Brief Synthesis: {{client_name}} - {{deliverable_type}}

### Brief Status
| Field | Value |
|-------|-------|
| Status | Synthesized |
| Client | {{client_name}} |
| Deliverable | {{deliverable_type}} |
| Timeline | {{timeline}} |
| Synthesized by | |
| Date | {{date}} |

### Source Materials
| Source | Date | Key Points |
|--------|------|------------|
| | | |

### Information Gaps (and Resolutions)
| Gap | Resolution |
|-----|------------|
| | |

### Objectives
**Primary objective:**
**Secondary objectives:**

### Target Audience
| Attribute | Description |
|-----------|-------------|
| Demographics | |
| Psychographics | |
| Behavioral signals | |
| Pain points | |

### Key Message / Offer
**Primary message:**
**Supporting evidence:**
**Proof points:**

### Mandatories
- [ ] Budget: 
- [ ] Timeline: 
- [ ] Platforms/channels: 
- [ ] Compliance requirements: 
- [ ] Stakeholder approvals: 

### Success Metrics
| Metric | Target |
|--------|--------|
| | |

### Team & Roles
| Role | Owner |
|------|-------|
| | |

### Approval
| Milestone | Date |
|-----------|------|
| Brief approved | |
| Work begins | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{client_name}}` | string | Yes | Client or brand name |
| `{{deliverable_type}}` | string | Yes | Type of deliverable (campaign, creative, content, etc.) |
| `{{raw_inputs}}` | string | Yes | Summary of all raw inputs to synthesize |
| `{{timeline}}` | string | No | Project timeline and key dates |

## Tools

- document
- spreadsheet

`strategy` `briefing` `planning` `client-services`


---
name: budget-allocation
description: Strategically distributes marketing and media budgets across channels, campaigns, and time periods to maximize reach, frequency, and ROI goals within given constraints. Use this skill any time allocating or reallocating a marketing budget across channels, campaigns, or audience segments — to maximize roi and meet business objectives.
---

### Budget Allocation

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** medium

You are a media strategy specialist who allocates budgets based on historical performance, channel effectiveness, and business objectives to maximize return within constraints.

## Workflow

1. **Objective Definition** — Clarify what the budget must achieve
   - ✓ Done when: Objectives are specific and measurable

2. **Historical Audit** — Review past channel performance
   - ✓ Done when: Historical data informs allocation decisions

3. **Channel Assessment** — Evaluate expected performance per channel
   - ✓ Done when: Expectations are realistic and evidenced

4. **Allocation** — Distribute budget across channels
   - ✓ Done when: Allocation aligns with objectives

5. **Pacing and Reserve** — Set pacing curve and contingency reserve
   - ✓ Done when: Reserve allows for optimization

## Output

## Budget Allocation Plan

### Campaign Brief
| Field | Value |
|-------|-------|
| Total budget | {{total_budget}} |
| Objectives | {{objectives}} |
| Period | {{time_period}} |
| Date | {{date}} |

### Historical Performance
| Channel | Previous spend | ROAS | CPA | Effectiveness |
|---------|---------------|------|-----|---------------|
| | | | | |

### Proposed Allocation
| Channel | Allocation | % of budget | Expected CPM | Expected CPA | ROAS target |
|---------|-----------|-------------|-------------|-------------|------------|
| | | | | | |
| **Total** | | **100%** | | | |

### Allocation Rationale
| Channel | Rationale |
|---------|----------|
| | |

### Pacing Plan
| Period | Planned spend | % of budget |
|--------|--------------|-------------|
| Week 1 | | |
| Week 2 | | |
| Week 3 | | |
| Week 4 | | |

### Contingency Reserve
| Amount | Purpose |
|--------|---------|
| | |

### Review Points
| Date | Action |
|------|--------|
| | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{total_budget}}` | string | Yes | Total budget to allocate |
| `{{objectives}}` | string | Yes | Campaign objectives (reach, conversions, brand awareness) |
| `{{time_period}}` | string | No | Campaign time period |
| `{{historical_data}}` | string | No | Historical channel performance data |
| `{{channels}}` | string | No | Channels to consider for allocation |

## Tools

- spreadsheet
- document

## When Not to Use

This skill overlaps with: media-mix, roas-optimization. Use those instead when: you are optimizing an existing mix rather than making initial allocations

`media` `budget` `strategy` `allocation`


---
name: category-design
description: Creates or reshapes product categories to establish market leadership, differentiate from competitors, and command category-defining positioning that makes competing within it inherently advantageous. Use this skill any time a brand wants to create a new category, redefine an existing one, or become the defining player in an emerging space — to build category leadership rather than competing within someone else's rules.
---

### Category Design

**Category:** Strategy | **Difficulty:** advanced | **Freedom:** high

You are a category strategist who helps brands create or reshape categories to achieve first-mover advantage and become the default choice within a newly defined space.

## Workflow

1. **Opportunity Identification** — Find underserved or poorly defined space
   - ✓ Done when: Opportunity is real and sized

2. **Category Definition** — Name and define the new category
   - ✓ Done when: Category is clear and ownable

3. **Brand-Category Bond** — Build the brand as synonymous with the category
   - ✓ Done when: Brand is positioned as category leader

4. **Market Education** — Create demand for the category itself
   - ✓ Done when: Market understands the category value

5. **Defense Planning** — Build moats against competitors
   - ✓ Done when: Category is defensible

## Output

## Category Design: {{brand_name}}

### Category Opportunity
**Current state:**
**Opportunity identified:**
**Why now:**

### Proposed Category
**Category name:**
**Category definition:**
**What it replaces/substitutes:**
**Scope:**

### Category Architecture
**Category promise:**
**Category rules:**
**Success criteria for category:**

### Brand-Category Bond
**Brand's role in category:**
**How to own category mental availability:**
**Category creator vs. fast follower risk:**

### Market Education Strategy
| Tactic | Audience | Message |
|--------|----------|--------|
| | | |

### Competitive Response Plan
**How competitors might respond:**
**Defensive moves:**

### Category Growth Roadmap
| Phase | Timeframe | Goal |
|-------|-----------|------|
| Creation | | |
| Adoption | | |
| Leadership | | |
| Defense | | |

### Success Metrics
| Metric | Target |
|--------|--------|
| Category awareness | |
| Category market share | |
| Category revenue | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand seeking category leadership |
| `{{current_market}}` | string | Yes | Current market context |
| `{{category_opportunity}}` | string | Yes | The category opportunity being pursued |
| `{{target_audience}}` | string | No | Primary target audience for category |

## Tools

- document
- spreadsheet
- presentation

`strategy` `category-design` `positioning` `innovation`


---
name: channel-selection
description: Chooses the optimal mix of marketing and media channels based on audience behavior, campaign objectives, budget, and channel effectiveness — building the foundation for media strategy. Use this skill any time selecting or evaluating marketing channels for a campaign — to choose the right mix of channels that will reach the target audience effectively within budget.
---

### Channel Selection

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** medium

You are a media strategist who selects channels based on audience behavior data, channel effectiveness benchmarks, and campaign objectives to build an optimal channel mix.

## Workflow

1. **Audience Profiling** — Understand where the audience spends time
   - ✓ Done when: Channel habits are understood

2. **Channel Assessment** — Evaluate each channel against criteria
   - ✓ Done when: Assessment is evidence-based

3. **Mix Building** — Build the channel mix with primary and supporting roles
   - ✓ Done when: Mix is coherent and achievable

4. **Attribution Planning** — Plan how performance will be measured
   - ✓ Done when: Attribution approach is clear

## Output

## Channel Selection: {{campaign_name}}

### Selection Criteria
| Criterion | Weight | Notes |
|-----------|--------|-------|
| Audience reach | | |
| Audience relevance | | |
| Cost efficiency | | |
| Conversion potential | | |
| Brand fit | | |

### Audience Channel Habits
| Channel | Audience usage | Relevance score |
|---------|---------------|----------------|
| | | |

### Channel Evaluation
| Channel | Selected? | Rationale | Expected CPM/CPA |
|---------|-----------|----------|----------------|
| | | | |

### Recommended Channel Mix
| Channel | Role | Budget allocation | Expected contribution |
|---------|------|-----------------|--------------------|
| | Primary | | |
| | Secondary | | |
| | Supporting | | |

### Attribution Approach
**How performance will be tracked:**
**Cross-touchpoint visibility:**

### Channels Rejected
| Channel | Reason for rejection |
|---------|-------------------|
| | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_name}}` | string | Yes | Campaign or initiative name |
| `{{target_audience}}` | string | Yes | Target audience definition |
| `{{objectives}}` | string | Yes | Campaign objectives |
| `{{budget}}` | string | No | Available budget |
| `{{time_period}}` | string | No | Campaign time period |
| `{{available_channels}}` | string | No | Channels being considered |

## Tools

- spreadsheet
- document

`media` `channel-selection` `strategy` `planning`


---
name: competitive-analysis
description: Analyzes competitors' strategies, positioning, products, pricing, and marketing to inform strategic decisions and identify opportunities for differentiation. Use this skill any time conducting a competitive analysis for a brand, product, or market — identifying competitor strategies, strengths, weaknesses, and opportunities.
---

### Competitive Analysis

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** medium

You are a strategic analyst who systematically examines competitors to surface actionable insights that inform positioning, messaging, and go-to-market decisions.

## Workflow

1. **Competitor Identification** — Define the full competitive set
   - ✓ Done when: Set is comprehensive but focused

2. **Information Gathering** — Collect data across all touchpoints
   - ✓ Done when: Data is current and reliable

3. **Strategy Analysis** — Map each competitor's core strategy
   - ✓ Done when: Strategy is understood, not just surface-level

4. **Messaging Audit** — Analyze competitor communications
   - ✓ Done when: Positioning themes are clear

5. **Gap Analysis** — Identify white space and opportunities
   - ✓ Done when: Opportunities are real and actionable

6. **Synthesis** — Distill findings into strategic recommendations
   - ✓ Done when: Recommendations are specific and prioritized

## Output

## Competitive Analysis: {{brand_name}} — {{market}}

### Competitive Set

| Competitor | Type | Relevance |
|------------|------|----------|
| | Direct | |
| | Indirect | |
| | Aspirational | |

### Competitor Profiles

#### [Competitor A]

**Overview:**
- Founded:
- Market share (est.):
- Key products:
- Target customers:
- Geographic focus:

**Strategy:**
- Positioning:
- Core value proposition:
- Pricing model:
- Distribution:

**Strengths:**
- 

**Weaknesses:**
- 

**Marketing & Messaging:**
- Brand tagline:
- Key messages:
- Content themes:
- Social presence:

**Digital Performance (est.):**
- Website traffic rank:
- Social following:
- Ad spend visibility:

---

#### [Competitor B]
[Same structure]

### Messaging Landscape

| Theme | Competitor A | Competitor B | Competitor C | White Space? |
|-------|--------------|--------------|--------------|--------------|
| Price/value | | | | |
| Innovation | | | | |
| Ease of use | | | | |
| Trust/reliability | | | | |
| Support | | | | |

### Competitive Positioning Map

[Y-axis label: ]
[X-axis label: ]
[Map competitors visually]

### SWOT Analysis (by competitor)

#### Competitor A
| | |
|-|---|
| **Strengths** | **Weaknesses** |
| | |
| **Opportunities** | **Threats** |
| | |

### Strategic Implications for {{brand_name}}

**Opportunities:**
1. 
2. 
3. 

**Threats to monitor:**
1. 
2. 

**Recommended differentiation angles:**
1. 
2. 

### Key Findings Summary
1. 
2. 
3. 

### Recommended Actions
| Action | Priority | Timeline |
|--------|----------|----------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Your brand or client name |
| `{{market}}` | string | Yes | Market or category being analyzed |
| `{{competitors}}` | string | Yes | Competitors to analyze |
| `{{analysis_objective}}` | string | No | Specific objective of this analysis |

## Tools

- document
- spreadsheet
- web-search

`strategy` `competitive-analysis` `market-research` `positioning`


---
name: competitive-intelligence
description: Systematically monitors and analyzes competitor activities, market shifts, and industry developments to keep the agency and clients informed and ahead of competitive threats. Use this skill any time setting up ongoing competitive intelligence monitoring or conducting deep-dive intelligence research on a specific competitor or market development.
---

### Competitive Intelligence

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** medium

You are a competitive intelligence specialist who systematically gathers, analyzes, and reports on competitor activities to keep stakeholders informed and proactive.

## Workflow

1. **Program Design** — Define competitors, sources, monitoring tools, and cadence
   - ✓ Done when: Program is sustainable and targeted

2. **Source Setup** — Configure monitoring across platforms
   - ✓ Done when: All key sources covered

3. **Data Collection** — Gather competitor signals on an ongoing basis
   - ✓ Done when: Data is captured consistently

4. **Signal Analysis** — Distinguish meaningful developments from noise
   - ✓ Done when: Analysis is objective and evidence-based

5. **Reporting** — Deliver clear, actionable intelligence reports
   - ✓ Done when: Report is timely and decision-relevant

6. **Strategic Integration** — Connect CI insights to planning and decisions
   - ✓ Done when: Intelligence drives action

## Output

## Competitive Intelligence Report: {{brand_name}}

### Report Period
{{start_date}} — {{end_date}}

### Competitor Activity Summary

| Competitor | Key Activity | Signal Type | Impact |
|------------|-------------|-------------|--------|
| | | |

### Significant Developments

#### 🔴 High Priority
**[Competitor]: [Development]**
**What happened:**
**Source:**
**Strategic implication for {{brand_name}}:**
**Recommended response:**

#### 🟡 Medium Priority
**[Competitor]: [Development]**
**What happened:**
**Source:**
**Implication:**

#### 🟢 Low Priority (Monitor)
**[Development]**

### Market Signals

**New entrants:**

**Product launches:**

**Pricing changes:**

**Partnerships/acquisitions:**

**Marketing campaigns:**

### Ad Intelligence

| Competitor | Platforms Active | Est. Spend | Creative Themes |
|------------|-----------------|------------|-----------------|
| | | | |

### Social & Content Intelligence

| Competitor | Key Content Themes | Engagement | Notable Posts |
|------------|------------------|------------|---------------|
| | | | |

### Intelligence Gaps
| Unknown Area | Priority to Fill | Suggested Approach |
|-------------|-----------------|-------------------|
| | | |

### Looking Ahead

**Expected competitor moves:**

**Upcoming events to monitor:**

**Recommendations:**

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Your brand or client name |
| `{{competitors}}` | string | Yes | Competitors to monitor |
| `{{scope}}` | string | No | Scope of intelligence (all channels, specific markets, etc.) |
| `{{cadence}}` | string | No | Reporting frequency |

## Tools

- document
- spreadsheet
- web-search
- social-monitoring

## When Not to Use

This skill overlaps with: competitive-analysis, competitive-media-analysis. Use those instead when: you need real-time monitoring rather than strategic analysis

`competitive-intelligence` `monitoring` `strategy` `market-research`


---
name: consumer-journey-mapping
description: Maps the complete customer decision journey from initial awareness through purchase and loyalty — identifying touchpoints, barriers, moments of truth, and opportunities to influence the decision. Use this skill any time mapping or refreshing the customer decision journey for a brand — to understand how customers move from awareness to purchase, where barriers exist, and where marketing can influence the decision.
---

### Consumer Journey Mapping

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** medium

You are a customer experience strategist who maps end-to-end customer journeys to identify friction points, opportunities, and the moments that matter most in the decision process.

## Workflow

1. **Scope Definition** — Define journey boundaries and stages
   - ✓ Done when: Stages are comprehensive and logical

2. **Touchpoint Mapping** — Document all touchpoints per stage
   - ✓ Done when: Touchpoints are complete

3. **Emotion and Barrier Analysis** — Track emotions and identify barriers
   - ✓ Done when: Barriers are evidenced

4. **Moment of Truth Identification** — Identify high-impact moments
   - ✓ Done when: Moments are correctly prioritized

5. **Opportunity Mapping** — Identify marketing intervention points
   - ✓ Done when: Opportunities are specific and actionable

## Output

## Consumer Journey Map: {{brand_name}}

### Journey Overview
| Field | Value |
|-------|-------|
| Brand | {{brand_name}} |
| Audience | {{target_audience}} |
| Scope | {{journey_scope}} |
| Date | {{date}} |

### Journey Stages
| Stage | Description | Duration |
|-------|-------------|---------|
| Awareness | | |
| Consideration | | |
| Decision | | |
| Purchase | | |
| Retention | | |
| Advocacy | | |

### Stage-by-Stage Map

#### Awareness
**Touchpoints:**
**Customer actions:**
**Customer emotions:** ⬜ ⬜ ⬜ ⬜ ⬜
**Pain points:**
**Opportunities:**

#### Consideration
**Touchpoints:**
**Customer actions:**
**Customer emotions:** ⬜ ⬜ ⬜ ⬜ ⬜
**Pain points:**
**Opportunities:**

#### Decision
**Touchpoints:**
**Customer actions:**
**Customer emotions:** ⬜ ⬜ ⬜ ⬜ ⬜
**Pain points:**
**Opportunities:**

#### Purchase
**Touchpoints:**
**Customer actions:**
**Customer emotions:** ⬜ ⬜ ⬜ ⬜ ⬜
**Pain points:**
**Opportunities:**

#### Retention
**Touchpoints:**
**Customer actions:**
**Customer emotions:** ⬜ ⬜ ⬜ ⬜ ⬜
**Pain points:**
**Opportunities:**

#### Advocacy
**Touchpoints:**
**Customer actions:**
**Customer emotions:** ⬜ ⬜ ⬜ ⬜ ⬜
**Pain points:**
**Opportunities:**

### Moments of Truth
| Moment | Stage | Why it matters | Brand action |
|--------|-------|---------------|-------------|
| | | | |

### Drop-off Points
| Stage | Drop-off rate | Why | Intervention |
|-------|-------------|-----|-------------|
| | | | |

### Touchpoint Ownership
| Touchpoint | Owner | Channel |
|-----------|-------|--------|
| | | |

### Key Opportunities
| Opportunity | Stage | Expected impact | Priority |
|-------------|-------|----------------|----------|
| | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand being mapped |
| `{{target_audience}}` | string | Yes | Target audience segment |
| `{{journey_scope}}` | string | No | Scope of the journey (e.g., awareness to purchase) |
| `{{existing_research}}` | string | No | Existing journey or customer research |

## Tools

- document
- spreadsheet

## When Not to Use

This skill overlaps with: funnel-strategy, consumer-insights. Use those instead when: you need to map a specific funnel stage rather than the full journey

`strategy` `customer-journey` `cx` `mapping`


---
name: cross-channel
description: Coordinates messaging, creative strategy, and media tactics across multiple marketing channels to create a unified, synergistic campaign that reinforces the brand message at every touchpoint. Use this skill any time planning or reviewing a cross-channel campaign — to ensure messaging, timing, and creative are coordinated across all channels and create a unified customer experience.
---

### Cross-Channel Planning

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** medium

You are an integrated media strategist who ensures all channels work together harmoniously to reinforce the campaign message and maximize cumulative impact across the customer journey.

## Workflow

1. **Objective Definition** — Define the single most important campaign outcome
   - ✓ Done when: Objective is clear and measurable

2. **Channel Role Mapping** — Assign a clear role to each channel
   - ✓ Done when: Each channel has a defined job

3. **Message Coordination** — Ensure the strategic idea is consistent across all channels
   - ✓ Done when: Core message is unified

4. **Timing and Sequencing** — Plan campaign phasing and channel sequencing
   - ✓ Done when: Channels reinforce each other over time

5. **Attribution Planning** — Plan how cross-channel contribution is measured
   - ✓ Done when: Attribution approach is agreed

## Output

## Cross-Channel Plan: {{campaign_name}}

### Campaign Overview
| Field | Value |
|-------|-------|
| Objective | {{campaign_objective}} |
| Audience | {{target_audience}} |
| Timeline | {{timeline}} |
| Budget | {{budget}} |
| Date | {{date}} |

### Channel Roles
| Channel | Role | Objective | KPIs |
|---------|------|----------|-----|
| | Awareness | | |
| | Consideration | | |
| | Conversion | | |
| | Retention | | |

### Channel Coordination Matrix
| Touchpoint | Channel | Message | CTA | Customer action |
|-----------|---------|--------|-----|---------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### Message Consistency Plan
**Core strategic idea:**

| Channel | How the idea is expressed |
|---------|--------------------------|
| | |

### Timing and Sequencing
| Phase | Date range | Channels active | Objective |
|-------|-----------|----------------|----------|
| Launch | | | |
| Sustain | | | |
| Intensify | | | |

### Cross-Channel Attribution
**How cross-channel contribution is measured:**
**Attribution model:**

### Cross-Channel KPIs
| KPI | Target | Owner |
|-----|--------|-------|
| | | |

### Risks
| Risk | Channels affected | Mitigation |
|------|-----------------|------------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{campaign_name}}` | string | Yes | Campaign name |
| `{{campaign_objective}}` | string | Yes | Primary campaign objective |
| `{{channels}}` | string | Yes | Channels involved in the campaign |
| `{{target_audience}}` | string | No | Target audience |
| `{{timeline}}` | string | No | Campaign timeline |
| `{{budget}}` | string | No | Campaign budget |

## Tools

- spreadsheet
- document

`strategy` `cross-channel` `integrated-marketing` `planning`


---
name: differentiation-strategy
description: Develops a unique, ownable market position that creates competitive advantage — identifying what makes a brand meaningfully different and communicating it consistently across all touchpoints. Use this skill any time developing or refreshing a differentiation strategy — to identify what makes a brand meaningfully different from competitors and create a compelling, ownable competitive position.
---

### Differentiation Strategy

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** medium

You are a brand strategist who helps brands find and own a distinctive competitive position that resonates with target audiences and is difficult for competitors to replicate.

## Workflow

1. **Category Analysis** — Understand how differentiation currently works
   - ✓ Done when: Category dynamics are clear

2. **Competitive Mapping** — Map existing competitor positions
   - ✓ Done when: Owned positions are identified

3. **Self-Analysis** — Identify genuine brand differentiators
   - ✓ Done when: Differentiators are authentic and credible

4. **White Space Finding** — Find ownable differentiation territory
   - ✓ Done when: White space is real and defensible

5. **Position Building** — Build the differentiation statement
   - ✓ Done when: Position is clear, ownable, and credible

6. **Proof Points** — Gather evidence supporting the position
   - ✓ Done when: Claims can be substantiated

7. **Integration** — Integrate into all brand communications
   - ✓ Done when: Differentiation is consistent across touchpoints

## Output

## Differentiation Strategy: {{brand_name}}

### Category Context
**How differentiation currently works in {{category}}:**

### Competitive Differentiation Map
| Competitor | Position | Ownable? |
|------------|---------|----------|
| | | |

### Self-Assessment
**Genuine brand strengths:**

**Authentic differentiators:**

**Credible but harder to own:**

### Audience Insights
**What audiences value most:**

**Current dissatisfaction:**

**Unmet needs:**

### White Space Analysis
**Available, ownable territory:**

**Why competitors can't easily copy it:**

### Differentiation Statement
**For** [target audience]
**Who** [audience need]
**{{brand_name}}** is the [category]
**that** [key differentiator]
**because** [reason to believe]

### What We Are NOT
[Clear boundaries — what we don't claim]

### Proof Points
| Claim | Evidence |
|-------|----------|
| | |

### Communication Priorities
| Channel | Differentiation message | How |
|---------|----------------------|------|
| | | |

### Competitive Response Plan
**If competitors try to copy this position:**

**How we stay ahead:**

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand being differentiated |
| `{{category}}` | string | Yes | Competitive category |
| `{{target_audience}}` | string | Yes | Primary target audience |
| `{{competitors}}` | string | No | Key competitors |

## Tools

- document
- spreadsheet

`strategy` `differentiation` `positioning` `competitive`


---
name: go-to-market-strategy
description: Builds go-to-market strategies that connect audience, positioning, offer, channels, sales motion, and rollout sequencing into one practical launch plan. Use this skill any time planning a launch, market entry, product rollout, offer introduction, or gtm strategy for a new service, campaign, or product.
---

### Go-to-Market Strategy

**Category:** Strategy | **Difficulty:** advanced | **Freedom:** high

You are a go-to-market strategist building a launch system, not just a messaging summary. You align audience, offer, positioning, acquisition channels, internal readiness, and performance measurement.

## Workflow

1. **Define offer and objective** — Define offer and objective
   - ✓ Done when: Define offer and objective is completed to a high standard

2. **Segment audience** — Segment audience
   - ✓ Done when: Segment audience is completed to a high standard

3. **Clarify positioning** — Clarify positioning
   - ✓ Done when: Clarify positioning is completed to a high standard

4. **Build messaging hierarchy** — Build messaging hierarchy
   - ✓ Done when: Build messaging hierarchy is completed to a high standard

5. **Design channel and sales motion** — Design channel and sales motion
   - ✓ Done when: Design channel and sales motion is completed to a high standard

6. **Sequence rollout** — Sequence rollout
   - ✓ Done when: Sequence rollout is completed to a high standard

7. **Define metrics and risks** — Define metrics and risks
   - ✓ Done when: Define metrics and risks is completed to a high standard

## Output

## Go-To-Market Strategy

### 1. Launch Objective
| Element | Decision |
|---|---|
| Offer | |
| Revenue / Pipeline Goal | |
| Launch Window | |
| Priority Audience | |

### 2. Audience And Positioning
| Segment | Core Need | Buying Trigger | Positioning Angle |
|---|---|---|---|
| | | | |

### 3. Messaging Framework
- Core message:
- Proof points:
- Objections to handle:
- Differentiation statement:

### 4. Channel And Sales Motion
| Channel / Motion | Role | Priority | Notes |
|---|---|---|---|
| | | High / Med / Low | |

### 5. Rollout Plan
| Phase | Goal | Actions | Owner |
|---|---|---|---|
| Pre-launch | | | |
| Launch | | | |
| Optimization | | | |

### 6. Metrics, Risks, And Next Moves
- KPIs:
- Main risks:
- Dependencies:
- First 30-day optimization focus:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{product_service}}` | string | Yes | Product or service being brought to market |
| `{{industry}}` | string | Yes | Target industry or market |
| `{{target_markets}}` | string | No | Geographic or segment markets to prioritize |
| `{{competitive_context}}` | string | No | Key competitors and competitive dynamics |
| `{{launch_timeline}}` | string | No | Expected launch date and key milestones |

## Tools

- document
- spreadsheet

`go-to-market` `gtm` `market-entry` `launch` `strategy`


---
name: insight-mining
description: Extracts strategic insights from qualitative or quantitative inputs by separating observations, patterns, tensions, and implications. Use this skill any time synthesizing interviews, feedback, research notes, surveys, analytics patterns, or mixed evidence into decision-ready insights.
---

### Insight Mining

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** high

You are a strategy analyst who turns raw information into insights leaders can act on. You distinguish between data points, recurring patterns, meaningful tensions, and strategic implications.

## Workflow

1. **Define decision context** — Define decision context
   - ✓ Done when: Define decision context is completed to a high standard

2. **Sort raw inputs** — Sort raw inputs
   - ✓ Done when: Sort raw inputs is completed to a high standard

3. **Separate observations from insights** — Separate observations from insights
   - ✓ Done when: Separate observations from insights is completed to a high standard

4. **Surface tensions** — Surface tensions
   - ✓ Done when: Surface tensions is completed to a high standard

5. **Translate implications** — Translate implications
   - ✓ Done when: Translate implications is completed to a high standard

6. **Recommend actions** — Recommend actions
   - ✓ Done when: Recommend actions is completed to a high standard

## Output

## Insight Mining Summary

### 1. Decision Context
- Question being answered:
- Source material used:

### 2. Key Observations
- 
- 
- 

### 3. Core Insights
| Insight | Why It Matters | Strategic Implication |
|---|---|---|
| | | |

### 4. Tensions And Contradictions
- 
- 

### 5. Recommended Actions
1. 
2. 
3. 

### 6. Open Questions
- 
- 

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{sources}}` | string | Yes | Data and research sources to analyze |
| `{{question}}` | string | Yes | Primary research question |
| `{{brand_name}}` | string | Yes | Brand or client context |
| `{{audience}}` | string | No | Target audience for insights |
| `{{objective}}` | string | No | Business objective driving this analysis |

## Tools

- document
- spreadsheet

`insights` `research` `synthesis` `strategy` `data`


---
name: market-segmentation
description: Builds practical market segmentation frameworks that help teams prioritize the right audiences, offers, and go-to-market motions. Use this skill any time segmenting a market, prioritizing audiences, clarifying buyer groups, or aligning messaging/offers to different customer types.
---

### Market Segmentation

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** high

You are a growth strategist creating segmentation that supports real decisions. You focus on which segments matter, why they differ, and how strategy should change by segment.

## Workflow

1. **Define segmentation goal** — Define segmentation goal
   - ✓ Done when: Define segmentation goal is completed to a high standard

2. **Identify segment dimensions** — Identify segment dimensions
   - ✓ Done when: Identify segment dimensions is completed to a high standard

3. **Build segment profiles** — Build segment profiles
   - ✓ Done when: Build segment profiles is completed to a high standard

4. **Compare segment value** — Compare segment value
   - ✓ Done when: Compare segment value is completed to a high standard

5. **Prioritize segments** — Prioritize segments
   - ✓ Done when: Prioritize segments is completed to a high standard

6. **Explain strategic shifts** — Explain strategic shifts
   - ✓ Done when: Explain strategic shifts is completed to a high standard

## Output

## Market Segmentation Framework

### 1. Segmentation Goal
- Decision to support:
- Market / offer context:

### 2. Segment Profiles
| Segment | Core Need | Buying Trigger | Value Potential | Strategic Notes |
|---|---|---|---|---|
| | | | | |

### 3. Priority Assessment
| Segment | Attractiveness | Accessibility | Fit | Priority |
|---|---|---|---|---|
| | High / Med / Low | High / Med / Low | High / Med / Low | High / Med / Low |

### 4. Go-To-Market Implications
- Segment-specific message shifts:
- Offer / packaging shifts:
- Channel / sales motion shifts:

### 5. Recommendation
- First segment to prioritize:
- Why now:
- What to test next:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{industry}}` | string | Yes | Industry or market being segmented |
| `{{objective}}` | string | Yes | Business objective driving segmentation |
| `{{data}}` | string | No | Available customer data and research |
| `{{geo}}` | string | No | Geographic scope |
| `{{customer_type}}` | string | No | B2B, B2C, or both |

## Tools

- document
- spreadsheet

`segmentation` `targeting` `market-strategy` `audience` `personas`


---
name: porter-five-forces
description: Applies Porter's Five Forces framework to analyze industry structure and profitability, identifying the forces that shape competitive rivalry and market attractiveness. Use this skill any time conducting a porter's five forces analysis to understand industry structure and profitability — useful for market entry, investment, or strategic planning decisions.
---

### Porter's Five Forces Analysis

**Category:** Strategy | **Difficulty:** advanced | **Freedom:** medium

You are a strategic analyst who applies Porter's Five Forces rigorously to assess industry attractiveness and competitive intensity, informing market entry and investment decisions.

## Workflow

1. **Industry Definition** — Clearly define industry scope and boundaries
   - ✓ Done when: Scope is clear and defensible

2. **Rivalry Analysis** — Assess competitive intensity
   - ✓ Done when: Analysis is evidence-based

3. **Entrant Analysis** — Evaluate barriers and entrant threat
   - ✓ Done when: Barriers are current and accurate

4. **Supplier/Buyer Analysis** — Assess power dynamics in the value chain
   - ✓ Done when: Power dynamics are well-evidenced

5. **Substitute Analysis** — Evaluate substitute threats
   - ✓ Done when: Substitutes are correctly identified

6. **Synthesis** — Assess overall industry attractiveness
   - ✓ Done when: Assessment is balanced and logical

7. **Implications** — Derive strategic implications for the client
   - ✓ Done when: Recommendations are specific and actionable

## Output

## Porter's Five Forces: {{industry_name}}

### Industry Definition
**Scope:**
**Geographic boundaries:**
**Value chain position:**

### Force 1: Competitive Rivalry

**Intensity assessment:** ⬜ ⬜ ⬜ ⬜ ⬜ (Low ←————————→ High)

**Key factors:**
- Number of competitors:
- Industry concentration:
- Growth rate:
- Product differentiation:
- Exit barriers:
- Strategic stakes:

**Analysis:**

### Force 2: Threat of New Entrants

**Threat assessment:** ⬜ ⬜ ⬜ ⬜ ⬜ (Low ←————————→ High)

**Entry barriers:**
| Barrier | Strength | Implication |
|---------|----------|-------------|
| Economies of scale | | |
| Brand loyalty | | |
| Capital requirements | | |
| Access to distribution | | |
| Regulatory barriers | | |
| Switching costs | | |
| Access to technology | | |

**Analysis:**

### Force 3: Supplier Power

**Power assessment:** ⬜ ⬜ ⬜ ⬜ ⬜ (Low ←————————→ High)

**Key factors:**
- Number of suppliers:
- Supplier concentration:
- Uniqueness of supplier services:
- Switching costs for buyers:
- Threat of forward integration:

**Key suppliers:**
| Supplier | Power | Alternatives available? |
|----------|-------|------------------------|
| | | |

**Analysis:**

### Force 4: Buyer Power

**Power assessment:** ⬜ ⬜ ⬜ ⬜ ⬜ (Low ←————————→ High)

**Key factors:**
- Number of buyers:
- Buyer concentration:
- Buyer switching costs:
- Price sensitivity:
- Threat of backward integration:
- Ability to substitute:

**Key buyer segments:**
| Segment | Power | Price sensitivity |
|---------|-------|------------------|
| | | |

**Analysis:**

### Force 5: Threat of Substitutes

**Threat assessment:** ⬜ ⬜ ⬜ ⬜ ⬜ (Low ←————————→ High)

**Substitute products:**
| Substitute | Quality vs. industry | Switch cost | Availability |
|------------|---------------------|-------------|---------------|
| | | | |

**Analysis:**

### Industry Attractiveness Summary

| Force | Score | Trend |
|-------|-------|-------|
| Competitive rivalry | | |
| Threat of new entrants | | |
| Supplier power | | |
| Buyer power | | |
| Threat of substitutes | | |

**Overall attractiveness:** ⬜ ⬜ ⬜ ⬜ ⬜ (Low ←————————→ High)

**Key drivers of profitability:**

### Strategic Implications

| Force | Recommended Response |
|-------|---------------------|
| Competitive rivalry | |
| New entrants | |
| Supplier power | |
| Buyer power | |
| Substitutes | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{industry_name}}` | string | Yes | Industry being analyzed |
| `{{market_segment}}` | string | No | Specific market segment focus |
| `{{geography}}` | string | No | Geographic scope of analysis |

## Tools

- document
- spreadsheet

`strategy` `porter-five-forces` `industry-analysis` `market-research`


---
name: positioning-framework
description: Develops the strategic positioning for a brand or product using established frameworks, defining what the brand stands for, who it serves, and how it differentiates. Use this skill any time developing or refreshing brand positioning — defining the strategic foundation for how a brand should be perceived relative to competitors.
---

### Positioning Framework

**Category:** Strategy | **Difficulty:** advanced | **Freedom:** high

You are a brand strategist who uses rigorous frameworks to develop a clear, ownable, and differentiated brand position that resonates with target audiences.

## Workflow

1. **Market & Competitive Analysis** — Map competitive landscape and category norms
   - ✓ Done when: Full picture of positioning battlefield

2. **Audience Deep-Dive** — Develop deep understanding of audience needs
   - ✓ Done when: Insight is specific and actionable

3. **White Space Analysis** — Identify unoccupied or underserved territory
   - ✓ Done when: Opportunity is real and ownable

4. **Positioning Statement** — Craft clear positioning statement
   - ✓ Done when: Position is specific, ownable, and credible

5. **Proof Points** — Identify evidence that supports the position
   - ✓ Done when: Brand can substantiate the claim

6. **Messaging Hierarchy** — Translate position into organized messaging
   - ✓ Done when: All channels can express the position

7. **Validation** — Test positioning with audience and stakeholders
   - ✓ Done when: Position resonates and is approved

## Output

## Positioning Framework: {{brand_name}}

### Category Context
**Category definition:**
**Category entry barriers:**
**Category trends:**

### Competitive Landscape
| Competitor | Positioning | Strength | Weakness |
|------------|-------------|----------|----------|
| | | | |
| | | | |

**Competitive positioning map:**
[Y-axis: ]
[X-axis: ]
[Map competitors]

### Target Audience

**Primary audience:**
- Demographics:
- Psychographics:
- Key needs:
- Decision journey:

**Audience frustrations with current options:**
- 

### Self-Assessment

**Brand strengths:**
- 

**Brand weaknesses:**
- 

### White Space Analysis

**Unoccupied territory:**
**Why it matters to audience:**
**Can we credibly own it?**

### Positioning Statement

**For** [target audience]
**Who** [audience need/category need]
**{{brand_name}}** is the [category/frame of reference]
**that** [key differentiator]
**because** [reason to believe]

### Brand Promise
**Core promise:**

**Emotional promise:**

**Functional promise:**

### Reason to Believe / Proof Points
1. 
2. 
3. 

### Messaging Hierarchy

**Elevator pitch:**
[1-2 sentences]

**Primary message:**

**Supporting message 1:**

**Supporting message 2:**

**Supporting message 3:**

### What This Positioning Is NOT
[Clear boundaries to avoid confusion]

### Positioning Test
| Test | Result |
|------|--------|
| Is it ownable? | |
| Is it meaningful to audience? | |
| Is it distinctive? | |
| Is it credible? | |
| Is it sustainable? | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand or product name |
| `{{category}}` | string | Yes | Competitive category |
| `{{target_audience}}` | string | Yes | Primary target audience |
| `{{competitors}}` | string | No | Key competitors to analyze |

## Tools

- document
- spreadsheet
- presentation

`strategy` `positioning` `branding` `competitive-analysis`


---
name: strategic-planning
description: Develops comprehensive long-term strategies for brands and businesses — connecting brand positioning, market dynamics, audience insights, and business objectives into coherent plans that guide all marketing and creative decisions. Use this skill any time building a brand strategy from scratch, refreshing an existing brand's positioning, planning annual marketing strategies, or when a client needs a coherent plan that connects creative work to business outcomes.
---

### Strategic Planning

**Category:** Strategy | **Difficulty:** advanced | **Freedom:** high

You are a strategic planner for a creative advertising agency. You are the connective tissue between what a brand wants to achieve and how it gets there — and you build strategies that are bold enough to inspire creatives and rigorous enough to convince CFOs.

## Workflow

1. **Situation diagnosis** — Analyze brand health data, market position, and competitive landscape
   - ✓ Done when: Diagnosis validated with available data

2. **Define strategic challenge** — Articulate the core strategic problem the brand must solve
   - ✓ Done when: Challenge statement approved by brand lead

3. **Develop positioning** — Build a clear, ownable, differentiated brand positioning
   - ✓ Done when: Positioning tested against competitive set

4. **Define audience profiles** — Create insight-driven target audience profiles with unmet needs
   - ✓ Done when: Audiences grounded in real insights

5. **Build brand framework** — Define purpose, values, personality, and territory
   - ✓ Done when: Framework resonates with creative and strategic teams

6. **Translate to strategic imperatives** — Convert positioning into actionable strategic priorities
   - ✓ Done when: Imperatives are specific and measurable

7. **Define success metrics** — Tie metrics to business outcomes and brand goals
   - ✓ Done when: Metrics approved by client

## Output

## Strategic Plan

### Brand: {{brand_name}}
### Developed: {{date}}

### Situation Analysis
| Area | Key Finding |
|------|------------|
| Brand health | |
| Market position | |
| Competitive landscape | |
| Audience insight | |

### The Strategic Challenge
> [One clear sentence defining the core problem to solve]

### Strategic Ambition
> [Where the brand wants to be in 3-5 years]

### Brand Positioning
| Element | Statement |
|---------|----------|
| Target audience | |
| Category | |
| Brand promise | |
| Reason to believe | |
| Point of difference | |

### Brand Framework
| Element | Description |
|---------|-------------|
| Purpose | |
| Values | |
| Personality | |
| Brand territory | |

### Strategic Imperatives
1. ...
2. ...
3. ...

### Success Metrics
| Metric | Baseline | Target | Timeline |
|--------|---------|--------|----------|
| | | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand or company name |
| `{{business_objective}}` | string | Yes | The overarching business objective the strategy must support |
| `{{market_context}}` | string | Yes | Current market conditions, category trends, and market dynamics |
| `{{competitive_landscape}}` | string | Yes | Key competitors, their positioning, and market shares |
| `{{timeline}}` | string | No | Planning horizon — 1 year, 3 years, 5 years |

## Tools

- document
- spreadsheet

`strategy` `brand-planning` `positioning` `marketing-strategy`


---
name: swot-analysis
description: Conducts structured SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis to inform strategic planning, brand reviews, and business decisions. Use this skill any time conducting a swot analysis for a brand, product, business unit, or strategic decision — to inform planning, positioning, or competitive response.
---

### SWOT Analysis

**Category:** Strategy | **Difficulty:** beginner | **Freedom:** medium

You are a strategic analyst who conducts rigorous, evidence-based SWOT analyses that go beyond surface-level observations to surface actionable strategic insights.

## Workflow

1. **Scope Definition** — Define what the SWOT covers and from what viewpoint
   - ✓ Done when: Scope is clear and bounded

2. **Internal Analysis** — Identify strengths and weaknesses honestly
   - ✓ Done when: Analysis is evidence-based, not assumed

3. **External Analysis** — Identify opportunities and threats from market signals
   - ✓ Done when: External factors are current and relevant

4. **Cross-Analysis** — Map S-O, S-T, W-O, W-T combinations
   - ✓ Done when: Insights go beyond the quadrant labels

5. **Strategic Synthesis** — Distill findings into clear priorities
   - ✓ Done when: Priorities are specific and actionable

## Output

## SWOT Analysis: {{subject_name}}

### Scope & Context
| Field | Details |
|-------|---------|
| Subject | {{subject_name}} |
| Scope | {{analysis_scope}} |
| Perspective | {{perspective}} |
| Date | {{date}} |

### Strengths (Internal, Positive)

**Ownable advantages:**
| Strength | Evidence | Competitive advantage level |
|----------|----------|---------------------------|
| | | High/Med/Low |

**Brand strengths:**
- 

**Operational strengths:**
- 

**Market position strengths:**
- 

### Weaknesses (Internal, Negative)

**Vulnerabilities:**
| Weakness | Impact | Fixable? |
|----------|--------|----------|
| | | Yes/No/Partial |

**Brand weaknesses:**
- 

**Operational weaknesses:**
- 

**Market position weaknesses:**
- 

### Opportunities (External, Positive)

**Market opportunities:**
| Opportunity | Size | Timing | Resource needed |
|-------------|------|--------|----------------|
| | | | |

**Emerging trends to exploit:**
- 

**Underserved segments:**
- 

### Threats (External, Negative)

**Threat landscape:**
| Threat | Likelihood | Impact | Prepared? |
|--------|-----------|--------|-----------|
| | High/Med/Low | High/Med/Low | Yes/Partial/No |

**Competitive threats:**
- 

**Market threats:**
- 

**Regulatory/technological threats:**
- 

### Cross-Analysis (SO/ST/WO/WT)

#### S-O Strategies (Use strengths to capture opportunities)
1. 

#### S-T Strategies (Use strengths to counter threats)
1. 

#### W-O Strategies (Address weaknesses to capture opportunities)
1. 

#### W-T Strategies (Minimize weaknesses to avoid threats)
1. 

### Strategic Priority Matrix

| Priority | Initiative | Type |
|----------|------------|------|
| 1 | | |
| 2 | | |
| 3 | | |

### Key Findings
1. 
2. 
3. 

### Recommended Actions
| Action | SWOT Basis | Priority |
|--------|-----------|----------|
| | | |

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{subject_name}}` | string | Yes | Brand, product, or business being analyzed |
| `{{analysis_scope}}` | string | Yes | Scope and time horizon of the analysis |
| `{{perspective}}` | string | No | Whose viewpoint this represents |

## Tools

- document
- spreadsheet

`strategy` `swot` `planning` `analysis`


---
name: value-proposition
description: Develops clear value propositions that connect audience pain, differentiated benefit, proof, and offer logic into a message people can understand quickly. Use this skill any time defining or refining value propositions, offer messaging, differentiators, homepage messaging, or campaign positioning.
---

### Value Proposition Development

**Category:** Strategy | **Difficulty:** intermediate | **Freedom:** high

You are a positioning strategist writing value propositions that are specific, defensible, and audience-relevant. You avoid generic claims and tie value to real outcomes and proof.

## Workflow

1. **Define audience problem** — Define audience problem
   - ✓ Done when: Define audience problem is completed to a high standard

2. **Clarify offer and outcome** — Clarify offer and outcome
   - ✓ Done when: Clarify offer and outcome is completed to a high standard

3. **Identify differentiators** — Identify differentiators
   - ✓ Done when: Identify differentiators is completed to a high standard

4. **Write proposition and support points** — Write proposition and support points
   - ✓ Done when: Write proposition and support points is completed to a high standard

5. **Pressure-test clarity** — Pressure-test clarity
   - ✓ Done when: Pressure-test clarity is completed to a high standard

6. **Provide variants** — Provide variants
   - ✓ Done when: Provide variants is completed to a high standard

## Output

## Value Proposition Framework

### 1. Strategy Basis
| Element | Definition |
|---|---|
| Audience | |
| Core Problem / Desire | |
| Offer | |
| Primary Outcome | |
| Differentiator | |

### 2. Primary Value Proposition

### 3. Supporting Proof Points
- 
- 
- 

### 4. Alternate Variations
- Homepage version:
- Paid campaign version:
- Short-form version:

### 5. Messaging Risks To Avoid
- 
- 

### 6. Recommended Usage Notes
- Best placement:
- Supporting assets needed:
- Testing angle:

## Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `{{brand_name}}` | string | Yes | Brand name |
| `{{audience}}` | string | Yes | Target audience |
| `{{alternatives}}` | string | No | Key competitors or alternatives |
| `{{offering}}` | string | No | Product or service |
| `{{context}}` | string | No | Market context |

## Tools

- document
- presentation

`value-proposition` `positioning` `differentiation` `brand-strategy` `messaging`



## General

---
name: seo-audit
description: Runs a structured SEO audit covering technical issues, on-page quality, content gaps, internal linking, authority signals, and prioritized next actions. Use this skill any time auditing a site or page for seo performance, diagnosing ranking issues, reviewing content/indexation problems, or building an seo action plan.
---

### seo-audit

**Category:** General | **Difficulty:** intermediate | **Freedom:** medium

You are an SEO strategist performing a practical audit. You identify issues by impact, separate critical blockers from secondary improvements, and produce an action plan a marketer or developer can execute.

## Workflow

1. **Define audit scope** — Define audit scope
   - ✓ Done when: Define audit scope is completed to a high standard

2. **Review technical health** — Review technical health
   - ✓ Done when: Review technical health is completed to a high standard

3. **Review on-page optimization** — Review on-page optimization
   - ✓ Done when: Review on-page optimization is completed to a high standard

4. **Review content quality** — Review content quality
   - ✓ Done when: Review content quality is completed to a high standard

5. **Review authority/discoverability** — Review authority/discoverability
   - ✓ Done when: Review authority/discoverability is completed to a high standard

6. **Prioritize action plan** — Prioritize action plan
   - ✓ Done when: Prioritize action plan is completed to a high standard

## Output

## SEO Audit Report

### 1. Audit Scope
| Element | Details |
|---|---|
| Site / Page | |
| Goal | |
| Main Search Intent | |

### 2. Executive Summary
- Overall health:
- Largest ranking blocker:
- Quickest win:
- Highest-value strategic opportunity:

### 3. Findings
| Area | Issue | Impact | Priority | Recommended Fix | Owner |
|---|---|---|---|---|---|
| Technical | | | High / Med / Low | | Dev / SEO / Content |
| On-page | | | | | |
| Content | | | | | |
| Internal Linking | | | | | |
| Authority | | | | | |

### 4. Priority Action Plan
| Timeline | Action | Expected Outcome |
|---|---|---|
| Now | | |
| Next | | |
| Later | | |

### 5. Measurement Notes
- KPIs to watch:
- Pages / templates to recheck:
- Risks / dependencies:

## When Not to Use

This skill overlaps with: keyword-research, seo-research. Use those instead when: you need to diagnose technical SEO issues on a specific page or site


