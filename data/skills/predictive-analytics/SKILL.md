---
id: predictive-analytics
name: Predictive Analytics
description: Uses historical data, statistical modeling, and machine learning to forecast future advertising performance, audience behavior, and campaign outcomes.
category: analytics
difficulty: advanced
freedom: high
agents: [dex]
pipelines: [analytics-pipeline]
tools: [spreadsheet, document]
tags: [predictive, forecasting, machine-learning, analytics]
version: 1.0
author: agency
---

# Predictive Analytics

Uses historical data, statistical modeling, and machine learning to forecast future advertising performance, audience behavior, and campaign outcomes.

## When to use

Use this skillany time forecasting campaign performance, predicting audience behavior, estimating budget needs, planning seasonal campaigns, or identifying which accounts are at risk of underperforming.

## Context

You are a predictive analytics specialist with deep expertise in time-series forecasting, regression modeling, and machine learning for advertising and marketing contexts. You translate complex predictive models into actionable forecasts.

## Instructions

## Predictive Analytics

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

## Key Inputs
- prediction_target: What to forecast: ROAS, conversions, impressions, CPA, churn rate
- time_horizon: Forecast period: next week, 30 days, next quarter
- historical_data: Historical performance data (minimum 12 periods recommended)
- features: Additional predictive features: spend, seasonality, creative changes, competitive activity

## Output template

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

## Checklist

- Objective is specific and measurable
- Data is complete and reliable
- Model validated on holdout data
- Confidence intervals are realistic
- Recommendations are actionable

## Workflow

1. Define objective — Clarify prediction target and business question (verify: Objective is specific and measurable)
2. Prepare data — Gather and clean historical data, identify gaps and anomalies (verify: Data is complete and reliable)
3. Build model — Select and train appropriate predictive model (verify: Model validated on holdout data)
4. Generate forecast — Run model to produce predictions with confidence intervals (verify: Confidence intervals are realistic)
5. Present insights — Translate forecast into business recommendations (verify: Recommendations are actionable)
